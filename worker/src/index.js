// Servizio push dell'app Palestra (Cloudflare Worker + Durable Objects).
// L'app, quando parte un recupero, chiede qui di inviare una notifica push all'ora di fine;
// un Durable Object per telefono tiene la notifica in sospeso con un "alarm" preciso al secondo.
//
//   GET  /vapid               → { key }   chiave pubblica VAPID per iscriversi alle push
//   POST /schedule {id, seq, sub, at, title, body}   programma (o sostituisce) la notifica
//   POST /cancel   {id, seq}  annulla la notifica in sospeso
//   POST /test     {sub, title?, body?}   invia subito una notifica di prova
//   POST /vault/put {id, data, at}   backup automatico CIFRATO dal telefono (19/11/2026): il servizio non può leggerlo,
//                                    la chiave nasce dal codice di recupero che ha solo l'utente; tiene l'ultimo e il precedente
//   POST /vault/get {id, prev?}      → { data, at }
//
// Le chiavi VAPID si generano da sole al primo uso e restano salvate nel Durable Object "Keys".
import { DurableObject } from "cloudflare:workers";
import { newVapidKeys, sendPush } from "./webpush.js";

const SUBJECT = "https://gianlucabrandi42-netizen.github.io/Palestra/";
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" };
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", ...CORS } });
const validSub = s => s && typeof s.endpoint === "string" && /^https:\/\//.test(s.endpoint) && s.keys && typeof s.keys.p256dh === "string" && typeof s.keys.auth === "string";
const validId = id => typeof id === "string" && /^[a-z0-9-]{8,64}$/i.test(id);
const clip = (s, n) => String(s || "").slice(0, n);

async function getKeys(env) {
  // chiavi cambiate il 19/11/2026: tutti gli abbonamenti vecchi smettono di funzionare (un altro telefono riceveva le
  // notifiche dell'utente); il telefono dell'utente si riabbona da solo all'avvio dell'app (pushVerify in app.js)
  const stub = env.KEYS.get(env.KEYS.idFromName("vapid-2026-11-19"));
  return stub.keys();
}

export class Keys extends DurableObject {
  async keys() {
    let k = await this.ctx.storage.get("vapid");
    if (!k) { k = await newVapidKeys(); await this.ctx.storage.put("vapid", k); }
    return k;
  }
}

// Backup cifrati: un Durable Object per codice di recupero (id = SHA-256 del codice). Due posti, "a" e "b": si scrive
// sempre in quello libero e solo alla fine si sposta il segno, così un caricamento interrotto non rovina il backup buono.
const CH = 500000, MAXLEN = 12 * 1024 * 1024;
export class Vault extends DurableObject {
  async put(data, at) {
    const meta = (await this.ctx.storage.get("meta")) || null, slot = meta && meta.slot === "a" ? "b" : "a";
    const n = Math.ceil(data.length / CH) || 1, chunks = {};
    for (let i = 0; i < n; i++) chunks[`${slot}${i}`] = data.slice(i * CH, (i + 1) * CH);
    const keys = Object.keys(chunks);
    for (let i = 0; i < keys.length; i += 100) { const part = {}; keys.slice(i, i + 100).forEach(k => part[k] = chunks[k]); await this.ctx.storage.put(part); }
    await this.ctx.storage.put("meta", { slot, n, at, size: data.length, prev: meta ? { slot: meta.slot, n: meta.n, at: meta.at } : null });
    return { at, size: data.length };
  }
  async get(prev) {
    const meta = await this.ctx.storage.get("meta"); if (!meta) return null;
    const m = prev ? meta.prev : meta; if (!m) return null;
    const keys = Array.from({ length: m.n }, (_, i) => `${m.slot}${i}`), got = await this.ctx.storage.get(keys);
    return { data: keys.map(k => got.get(k) || "").join(""), at: m.at };
  }
}

// seq = istante in cui l'app ha fatto l'azione: se due richieste arrivano in ordine invertito, vale la più recente
export class Timer extends DurableObject {
  async fresh(seq) {
    const last = (await this.ctx.storage.get("seq")) || 0;
    if (seq && seq < last) return false;
    if (seq) await this.ctx.storage.put("seq", seq);
    return true;
  }
  async schedule(job, seq) {
    if (!(await this.fresh(seq))) return false;
    await this.ctx.storage.put("job", job);
    await this.ctx.storage.setAlarm(job.at);
    return true;
  }
  async cancel(seq) {
    if (!(await this.fresh(seq))) return false;
    await this.ctx.storage.deleteAlarm();
    await this.ctx.storage.delete("job");
    return true;
  }
  async alarm() {
    const job = await this.ctx.storage.get("job");
    await this.ctx.storage.delete("job");
    if (!job) return;
    try {
      const keys = await getKeys(this.env);
      const r = await sendPush(job.sub, { title: job.title, body: job.body, tag: "rest", at: job.at }, keys, SUBJECT, { ttl: 120, topic: "rest" });
      if (r.status >= 400) console.log("push", r.status, r.text);
    } catch (e) { console.log("push error", String(e)); } // niente nuovi tentativi: una notifica in ritardo non serve
  }
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    try {
      if (req.method === "GET" && url.pathname === "/vapid") return json({ key: (await getKeys(env)).publicKey });
      if (req.method === "GET" && url.pathname === "/") return json({ ok: true, service: "palestra-push" });
      if (req.method !== "POST") return json({ error: "not found" }, 404);
      const b = await req.json().catch(() => null);
      if (!b) return json({ error: "bad json" }, 400);
      if (url.pathname === "/schedule") {
        if (!validId(b.id) || !validSub(b.sub)) return json({ error: "bad request" }, 400);
        const at = Number(b.at), now = Date.now();
        if (!(at > now - 5000 && at < now + 3600 * 1000)) return json({ error: "bad time" }, 400);
        await env.TIMER.get(env.TIMER.idFromName(b.id)).schedule({ sub: b.sub, at: Math.max(at, now), title: clip(b.title, 80), body: clip(b.body, 160) }, Number(b.seq) || 0);
        return json({ ok: true });
      }
      if (url.pathname === "/cancel") {
        if (!validId(b.id)) return json({ error: "bad request" }, 400);
        await env.TIMER.get(env.TIMER.idFromName(b.id)).cancel(Number(b.seq) || 0);
        return json({ ok: true });
      }
      if (url.pathname === "/vault/put" || url.pathname === "/vault/get") {
        if (typeof b.id !== "string" || !/^[a-f0-9]{64}$/.test(b.id)) return json({ error: "bad request" }, 400);
        const v = env.VAULT.get(env.VAULT.idFromName(b.id));
        if (url.pathname === "/vault/get") { const r = await v.get(!!b.prev); return r ? json(r) : json({ error: "not found" }, 404); }
        if (typeof b.data !== "string" || !b.data.length || b.data.length > MAXLEN || !/^[\x20-\x7e]+$/.test(b.data.slice(0, 200))) return json({ error: "bad data" }, 400);
        return json({ ok: true, ...(await v.put(b.data, Number(b.at) || Date.now())) });
      }
      if (url.pathname === "/test") {
        if (!validSub(b.sub)) return json({ error: "bad request" }, 400);
        const r = await sendPush(b.sub, { title: clip(b.title, 80) || "Prova Palestra", body: clip(b.body, 160) || "Le notifiche funzionano", tag: "test" }, await getKeys(env), SUBJECT, { ttl: 60 });
        return json({ ok: r.status < 300, status: r.status, detail: r.text }, r.status < 300 ? 200 : 502);
      }
      return json({ error: "not found" }, 404);
    } catch (e) {
      return json({ error: String(e) }, 500);
    }
  },
};
