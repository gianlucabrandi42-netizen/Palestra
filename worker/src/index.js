// Servizio push dell'app Palestra (Cloudflare Worker + Durable Objects).
// L'app, quando parte un recupero, chiede qui di inviare una notifica push all'ora di fine;
// un Durable Object per telefono tiene la notifica in sospeso con un "alarm" preciso al secondo.
//
//   GET  /vapid               → { key }   chiave pubblica VAPID per iscriversi alle push
//   POST /schedule {id, seq, sub, at, title, body}   programma (o sostituisce) la notifica
//   POST /cancel   {id, seq}  annulla la notifica in sospeso
//   POST /test     {sub, title?, body?}   invia subito una notifica di prova
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
