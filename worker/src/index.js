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
//   POST /food/photo {code, img, mime, mode, meal?, note?}  (21/11/2026) foto del cibo analizzata da Claude (API Anthropic):
//        → { piatto, items:[{n, g, cotto, kcal, p, c, f}], note, sicurezza, used }  — serve il codice dell'app (segreto FOTO_CODICE)
//   POST /food/status {code}  → { ok, configured, needCode, via, today, month }
// 22/11/2026: di base GRATIS con Cloudflare Workers AI (binding AI in wrangler.toml), nessun codice richiesto.
// Segreti facoltativi (messi dal workflow se presenti nel repository): GEMINI_API_KEY (gratis, più precisa), ANTHROPIC_API_KEY (a pagamento), FOTO_CODICE (se c'è, l'app deve mandarlo).
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
  // contatore delle analisi foto (per giorno e per mese) con tetto: anche se il codice finisse in mani sbagliate,
  // la spesa resta limitata (FOTO_MAX_DAY al giorno, FOTO_MAX_MONTH al mese)
  async useFoto(day, month, maxDay, maxMonth, peek) {
    const d = (await this.ctx.storage.get("d:" + day)) || 0, m = (await this.ctx.storage.get("m:" + month)) || 0;
    if (peek) return { today: d, month: m };
    if (d >= maxDay || m >= maxMonth) return { ok: false, today: d, month: m };
    await this.ctx.storage.put({ ["d:" + day]: d + 1, ["m:" + month]: m + 1 });
    return { ok: true, today: d + 1, month: m + 1 };
  }
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

// ---------- 📷 analisi delle foto del cibo (21/11/2026) ----------
const FOTO_MODEL = "claude-sonnet-5-5", FOTO_MAX_DAY = 40, FOTO_MAX_MONTH = 1000; // 40 foto ≈ 5.000 neuroni: sempre dentro i 10.000 gratuiti
const FOTO_PROMPT = {
  piatto: `Sei un nutrizionista esperto di cucina italiana. Guarda la foto e stima cosa c'è nel piatto o nel pasto.
Per ogni alimento dai il peso in grammi COME SI VEDE (pasta, riso, carne e verdure già cotti se sono cotti) e i valori di quella quantità.
Includi sempre i condimenti nascosti che si intuiscono (olio, burro, sughi, formaggio grattugiato, panature): l'olio come voce "olio" a parte.
Usa nomi semplici in italiano (es. "pasta cotta", "petto di pollo", "patate al forno", "zucchine", "parmigiano", "olio").
Se ci sono una forchetta, un piatto o una mano, usali per capire le dimensioni.`,
  testo: `Sei un nutrizionista esperto di cucina italiana. Una persona ha scritto cosa ha mangiato, a parole sue (anche con nomi regionali, marche o errori di battitura).
Capisci di che piatto o cibo si tratta e scomponilo in alimenti con grammi e valori. Se non dice la quantità usa una porzione normale italiana.
Includi i condimenti tipici di quel piatto (olio, burro, sughi, formaggio) come voci a parte se non sono già nel nome.`,
  frigo: `Guarda la foto di un frigorifero, di una dispensa o di una spesa ed elenca gli alimenti che riconosci con sicurezza, anche nelle confezioni (leggi le etichette se si vedono).
Nomi semplici e generici in italiano, uno per alimento (es. "petto di pollo", "uova", "yogurt", "mozzarella", "bresaola", "zucchine", "insalata", "latte", "pasta", "riso", "passata").
Per ognuno una stima dei grammi presenti (0 se non si capisce). Non inventare: se non sei sicuro non scriverlo. Ignora bibite, salse e condimenti. Massimo 20 alimenti.`,
  congelatore: `Guarda la foto del congelatore o della spesa da congelare ed elenca gli alimenti che riconosci.
Per ogni alimento il peso in grammi (usa quello scritto sulla confezione se si legge, altrimenti una stima) e i valori di quella quantità.
Nomi semplici in italiano (es. "petto di pollo", "merluzzo", "verdure miste", "pane di segale"). Niente condimenti.`,
};
const FOTO_REF = `Riferimenti per i pesi (porzioni italiane): un piatto di pasta o riso ≈ 220-250 g cotti (80-100 g crudi): scrivi il peso da cotto e "cotto":true;
un petto di pollo ≈ 150-200 g; una fetta di pane ≈ 30-40 g; un uovo ≈ 55 g; una pizza intera ≈ 330 g; un cucchiaio d'olio ≈ 10 g; una porzione di verdure ≈ 150-200 g.
Valori indicativi per 100 g: pasta cotta 150 kcal, riso cotto 130, pollo cotto 150, pane 270, olio 900, parmigiano 390, patate al forno 130.`;
const FOTO_NOFOOD = `IMPORTANTE: descrivi solo quello che vedi davvero nella foto. Se nella foto non c'è cibo, rispondi {"piatto":"","items":[],"note":"nella foto non vedo cibo","sicurezza":"bassa"}. I riferimenti sopra servono solo per stimare i pesi: non sono il contenuto della foto.`;
const FOTO_FORMAT = `Rispondi SOLO con un oggetto JSON valido, senza testo prima o dopo, in questo formato:
{"piatto":"nome breve del piatto","items":[{"n":"alimento","g":grammi,"cotto":true,"kcal":0,"p":0,"c":0,"f":0}],"note":"una frase su cosa è incerto","sicurezza":"alta|media|bassa"}
p, c, f = grammi di proteine, carboidrati, grassi della quantità indicata. Massimo 12 alimenti.`;
// 22/11/2026: l'utente non vuole pagare → di base l'analisi gira GRATIS su Cloudflare Workers AI (10.000 "neuroni" al giorno
// inclusi nell'account, niente carta; col tetto di foto al giorno qui sotto non si arriva mai a pagamento). Se un giorno ci sono
// i segreti, prima Gemini (chiave gratuita di Google AI Studio, più precisa) o Anthropic (a pagamento).
const CF_MODELS = ["@cf/meta/llama-4-scout-17b-16e-instruct", "@cf/mistralai/mistral-small-3.1-24b-instruct", "@cf/google/gemma-3-12b-it"];
const provider = env => env.ANTHROPIC_API_KEY ? "claude" : env.GEMINI_API_KEY ? "gemini" : env.AI ? "cloudflare" : "";
async function askClaude(env, text, b) {
  const content = b.img ? [{ type: "image", source: { type: "base64", media_type: b.mime, data: b.img } }, { type: "text", text }] : [{ type: "text", text }];
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" }, body: JSON.stringify({ model: FOTO_MODEL, max_tokens: 1200, messages: [{ role: "user", content }] }) });
  const out = await r.json().catch(() => null);
  if (!r.ok || !out) throw new Error((out && out.error && out.error.message) || "errore " + r.status);
  return (out.content || []).filter(x => x.type === "text").map(x => x.text).join("");
}
async function askGemini(env, text, b) {
  const parts = b.img ? [{ inline_data: { mime_type: b.mime, data: b.img } }, { text }] : [{ text }];
  let last = "";
  for (const m of ["gemini-flash-latest", "gemini-flash-lite-latest"]) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: "application/json", temperature: 0.2 } }) });
    const out = await r.json().catch(() => null);
    if (r.ok && out) return ((((out.candidates || [])[0] || {}).content || {}).parts || []).map(x => x.text || "").join("");
    last = (out && out.error && out.error.message) || "errore " + r.status; console.log("gemini", m, last);
  }
  throw new Error(last);
}
async function askCloudflare(env, text, b) {
  const content = b.img ? [{ type: "text", text }, { type: "image_url", image_url: { url: `data:${b.mime};base64,${b.img}` } }] : text;
  let last = "";
  for (const m of CF_MODELS) {
    try {
      const out = await env.AI.run(m, { messages: [{ role: "system", content: "Rispondi solo con JSON valido." }, { role: "user", content }], max_tokens: 900, temperature: 0.2 });
      const t = out && (typeof out.response === "string" ? out.response : out.response ? JSON.stringify(out.response) : ((out.choices || [])[0] || {}).message?.content || "");
      if (t && t.includes("{")) return t;
      last = "risposta vuota";
    } catch (e) { last = String(e && e.message || e); console.log("workers-ai", m, last); }
  }
  throw new Error(last);
}
async function fotoAnalyze(env, b) {
  const mode = ["congelatore", "testo", "frigo"].includes(b.mode) ? b.mode : "piatto";
  const text = FOTO_PROMPT[mode] + (b.meal ? `\nPasto: ${clip(b.meal, 40)}.` : "") + (mode === "testo" ? `\nHa scritto: «${clip(b.text, 500)}»` : b.note ? `\nNota di chi mangia: ${clip(b.note, 300)}` : "") + "\n\n" + (mode === "congelatore" || mode === "frigo" ? "" : FOTO_REF + "\n\n") + (mode === "testo" ? "" : FOTO_NOFOOD + "\n\n") + FOTO_FORMAT;
  const img = mode === "testo" ? null : b.img, pv = provider(env);
  let t;
  try { t = pv === "claude" ? await askClaude(env, text, { ...b, img }) : pv === "gemini" ? await askGemini(env, text, { ...b, img }) : await askCloudflare(env, text, { ...b, img }); }
  catch (e) { return { error: String(e && e.message || e).slice(0, 200) }; }
  t = (t || "").trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  let j; try { j = JSON.parse(t.slice(t.indexOf("{"), t.lastIndexOf("}") + 1)); } catch (_) { return { error: "risposta non leggibile", raw: clip(t, 500) }; }
  const num = x => { const v = Number(String(x).replace(",", ".")); return isFinite(v) && v >= 0 ? Math.round(v * 10) / 10 : 0; };
  // controllo dei conti: se le kcal non tornano con proteine, carboidrati e grassi (4/4/9) si usano quelle calcolate
  const fix = x => { const at = 4 * x.p + 4 * x.c + 9 * x.f; if (at > 0 && (!x.kcal || Math.abs(x.kcal - at) / at > 0.2)) x.kcal = Math.round(at); return x; };
  const items = (Array.isArray(j.items) ? j.items : []).slice(0, mode === "frigo" ? 20 : 12).map(x => fix({ n: clip(x.n || x.nome, 60), g: num(x.g ?? x.grammi), cotto: !!x.cotto, kcal: num(x.kcal), p: num(x.p), c: num(x.c), f: num(x.f) })).filter(x => x.n && (x.g > 0 || mode === "frigo"));
  if (!items.length) return { error: "nessun alimento riconosciuto: riprova con più luce o scrivilo" };
  return { piatto: clip(j.piatto, 60), items, note: clip(j.note, 300), sicurezza: ["alta", "media", "bassa"].includes(j.sicurezza) ? j.sicurezza : "media", via: pv };
}
const sameCode = (a, b) => typeof a === "string" && typeof b === "string" && a.length > 5 && a.trim().toUpperCase() === b.trim().toUpperCase();

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
      if (url.pathname === "/food/status" || url.pathname === "/food/photo") {
        const pv = provider(env), needCode = !!env.FOTO_CODICE;
        if (!pv) return json({ ok: false, configured: false, error: "analisi non configurata" }, 503);
        if (needCode && !sameCode(b.code, env.FOTO_CODICE)) return json({ ok: false, configured: true, needCode, error: "codice sbagliato" }, 403);
        const now = new Date(), day = now.toISOString().slice(0, 10), month = day.slice(0, 7), ks = env.KEYS.get(env.KEYS.idFromName("foto-uso"));
        if (url.pathname === "/food/status") return json({ ok: true, configured: true, needCode, via: pv, ...(await ks.useFoto(day, month, FOTO_MAX_DAY, FOTO_MAX_MONTH, true)), maxDay: FOTO_MAX_DAY, maxMonth: FOTO_MAX_MONTH });
        if (b.mode === "testo") { if (typeof b.text !== "string" || !b.text.trim() || b.text.length > 600) return json({ error: "testo non valido" }, 400); }
        else if (typeof b.img !== "string" || b.img.length < 100 || b.img.length > 7 * 1024 * 1024 || !/^image\/(jpeg|png|webp)$/.test(b.mime || "")) return json({ error: "foto non valida" }, 400);
        const u = await ks.useFoto(day, month, FOTO_MAX_DAY, FOTO_MAX_MONTH);
        if (!u.ok) return json({ error: `limite raggiunto (${FOTO_MAX_DAY} foto al giorno, ${FOTO_MAX_MONTH} al mese)` }, 429);
        const res = await fotoAnalyze(env, b);
        return json({ ...res, used: { today: u.today, month: u.month } }, res.error ? 502 : 200);
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
