/* Palestra — Timer di recupero, suoni, notifiche push, impostazioni del timer.
   Parte di app.js diviso il 22/11/2026: i file js/01…09 si caricano in ordine (index.html) e condividono le stesse funzioni globali. */
"use strict";
// ---------- timer di recupero ----------
// Recupero di base 1:30 (regolabile); se l'esercizio ha "rest" nella scheda, vale quello.
// A fine recupero: vibrazione (Android), suono e tocco aptico (iPhone, dove possibile). Lo schermo resta acceso mentre conta.
const TKEY = "palestra-timer";
if (D.prefs && !D.prefs.rest90) { D.prefs.timer = { ...(D.prefs.timer || {}), sec: 90 }; D.prefs.rest90 = true; try { localStorage.setItem("palestra-v1", JSON.stringify(D)); } catch (e) {} } // 18/11/2026: predefinito 1:30 per tutti
// Notifiche push: legate a QUESTO telefono (19/11/2026). Stanno in un archivio separato ("palestra-push"), mai nel backup né
// nei dati condivisi; l'id è nuovo per ogni telefono e l'abbonamento viene ricontrollato a ogni avvio con quello vero del telefono.
// (Un amico riceveva le notifiche di fine recupero dell'utente.)
const PUSHK = "palestra-push", PUSHF = ["push", "pushSub", "pushId"];
const devPush = () => { try { return JSON.parse(localStorage.getItem(PUSHK)) || {}; } catch (e) { return {}; } };
const setDevPush = o => { try { localStorage.setItem(PUSHK, JSON.stringify({ ...devPush(), ...o })); } catch (e) {} };
{ const t = (D.prefs && D.prefs.timer) || {}; if (PUSHF.some(k => k in t)) { if (!localStorage.getItem(PUSHK)) setDevPush({ push: !!t.push, pushSub: null, pushId: "" }); PUSHF.forEach(k => delete t[k]); try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) {} } }
const tPrefs = () => { const t = D.prefs.timer = D.prefs.timer || {}, dp = devPush(); return { sec: t.sec ?? 90, auto: t.auto ?? true, vib: t.vib ?? true, snd: t.snd ?? true, warn: t.warn ?? true, push: dp.push ?? false, pushSub: dp.pushSub || null, pushId: dp.pushId || "", lockNote: t.lockNote ?? false, pad: t.pad ?? true }; };
const setTPref = (k, v) => { if (PUSHF.includes(k)) return setDevPush({ [k]: v }); D.prefs.timer = D.prefs.timer || {}; D.prefs.timer[k] = v; save(); };
const fmtSec = s => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
function parseRest(r) {
  if (r == null || r === "") return null; if (typeof r === "number") return r;
  const s = String(r).trim(); let m;
  if ((m = s.match(/^(\d+)\s*(''|’’|"|″|”|s\b|sec)/i))) return +m[1];                    // 90'' · 90" · 90″ · 90 sec = secondi
  if ((m = s.match(/^(\d+)\s*[:'’′]\s*(\d{1,2})?/))) return +m[1] * 60 + (+m[2] || 0); // 1:30 · 1'30 · 1'30'' · 2'
  if ((m = s.match(/^(\d+)/))) return +m[1];                                         // 90" · 90
  return null;
}
// recupero: quello impostato dall'utente nei dettagli (D.rest[key], quando il PT glielo dice) > quello in schede.js > base
const restFor = ex => (ex && (D.rest || {})[ex.key]) || parseRest(ex && ex.rest) || tPrefs().sec;
const hasRest = ex => !!(ex && ((D.rest || {})[ex.key] || ex.rest));
const REST_OPT = [45, 60, 75, 90, 120, 150, 180];
const REST_QUICK = [45, 60, 90, 120, 180]; // una riga sola (18/11/2026); gli altri tempi con "altro"
function setRest(key, v) { D.rest = { ...(D.rest || {}) }; if (v == null) delete D.rest[key]; else D.rest[key] = v; save(); renderLog(); }
// circuito: esercizi consecutivi con lo stesso "circ" → {start, end, last}
function circGroup(d, idx) {
  const c = d.ex[idx] && d.ex[idx].circ; if (!c) return null;
  let a = idx, b = idx; while (a > 0 && d.ex[a - 1].circ === c) a--; while (b < d.ex.length - 1 && d.ex[b + 1].circ === c) b++;
  return { start: a, end: b, last: idx === b };
}
let T = (() => { try { return JSON.parse(localStorage.getItem(TKEY)) || {}; } catch (e) { return {}; } })(); // {end, dur, left (se in pausa), label}
if (T.end && T.end < Date.now() - 60000) T = {}; // scaduto da tempo: ignora
let tIv = null, tDone = 0, tWarned = false, wake = null;
const tSave = () => { try { localStorage.setItem(TKEY, JSON.stringify(T)); } catch (e) {} };
const running = () => !!T.end && T.left == null;
const remaining = () => T.left != null ? T.left : T.end ? (T.end - Date.now()) / 1000 : 0;

const tKey = ex => ex.circ ? "c:" + ex.circ : ex.key;
function startRest(sec, label, key) {
  unlockAudio(); S.between = null;
  T = { end: Date.now() + sec * 1000, dur: sec, label: label || "Recupero", key: key || null }; tDone = 0; tWarned = sec <= 6; tSave();
  notifSchedule(); keepAwake(true); audioKeep(true); tickLoop(); drawTimer();
}
function stopRest() { notifCancel(); T = {}; tSave(); keepAwake(false); audioKeep(false); clearInterval(tIv); tIv = null; drawTimer(); }
function tickLoop() { clearInterval(tIv); tIv = setInterval(tick, 250); tick(); }
function tick() {
  if (!running()) { clearInterval(tIv); tIv = null; return; }
  const r = remaining();
  if (r <= 5 && !tWarned && tPrefs().warn) { tWarned = true; alarm(true); }
  if (r <= 0) { T = {}; tSave(); clearInterval(tIv); tIv = null; keepAwake(false); tDone = Date.now(); alarm(false); setTimeout(() => { if (!running()) audioKeep(false); }, 3000); drawTimer(); setTimeout(drawTimer, 6100); return; }
  drawTimer();
}
// Fase del timer (18/11/2026): riga sopra la barra con cosa sta succedendo e il recupero previsto modificabile (✎)
function phaseKey() {
  if (T.key && !String(T.key).startsWith("c:")) return T.key;
  const d = dayObj(); if (!d) return null; const s = current(), u = currentUnit(d, s, dayUnitsList(d, s)); return u && u.ex && !u.ex.nolog ? u.ex.key : null;
}
function drawPhase(run, paused, done) {
  const ph = $("tPhase"); if (!ph || S.phaseEdit) return; ph.classList.toggle("keep", !!S.moveAt || !!S.between); /* col tastierino si vede solo "Finito / cambio esercizio" */ const k = phaseKey(), ex = k ? dayObj().ex.find(e => e.key === k) : null, pl = ex ? fmtSec(restFor(ex)) : fmtSec(tPrefs().sec);
  const edit = ex ? `<button type="button" class="tp-ed" id="tpEd">previsto ${pl} ✎</button>` : "";
  let h; const m = /^(.*) · poi serie (\d+)$/.exec(T.label || ""), lb = m ? `S${m[2] - 1} → S${m[2]} · ${m[1]}` : (T.label || "");
  if (run) h = `<span class="tp-k run">● Recupero</span><span class="tp-t">${esc(lb)}</span>${edit}`;
  else if (paused) h = `<span class="tp-k pau">⏸ In pausa</span><span class="tp-t">${esc(lb)}</span>${edit}`;
  else if (done) h = `<span class="tp-k ok">✓ Recupero finito</span><span class="tp-t">tocca il tempo per la prossima serie</span>`;
  else if (S.moveAt) { const n = Math.max(0, Math.ceil((S.moveAt - Date.now()) / 1000)); h = `<span class="tp-k ok">✓ Finito</span><span class="tp-t">chiudo tra ${n}"${S.between && S.between.next ? ` · poi ${esc(S.between.next)}` : ""}</span><button type="button" class="tp-ed" id="tpGo">Vai ora</button>`; }
  else if (S.between) h = `<span class="tp-k chg">↪ Cambio esercizio</span><span class="tp-t">recupero in pausa${S.between.next ? ` · poi ${esc(S.between.next)}` : ""}</span>`;
  else h = `<span class="tp-k">▶ Pronto</span><span class="tp-t">${ex ? esc(subOf(current(), ex.key) || ex.name) : "recupero di base"}</span>${edit}`;
  ph.innerHTML = h;
  const b = $("tpEd"); if (b) { b.onmousedown = e => e.preventDefault(); b.onclick = () => openPhaseEdit(ex); }
  const g = $("tpGo"); if (g) { g.onmousedown = e => e.preventDefault(); g.onclick = () => S.moveGo && S.moveGo(); }
}
function openPhaseEdit(ex) {
  const ph = $("tPhase"); S.phaseEdit = true; ph.classList.add("edit"); const cur = restFor(ex);
  ph.innerHTML = `<span class="tp-k">Recupero previsto · <b>${esc(ex.name)}</b></span><div class="tp-opts">${REST_QUICK.map(v => `<button type="button" data-tv="${v}" aria-pressed="${hasRest(ex) && cur === v}">${fmtSec(v)}</button>`).join("")}<button type="button" data-tv="0">base</button><button type="button" data-tv="x" aria-label="Chiudi">✕</button></div>`;
  ph.querySelectorAll("[data-tv]").forEach(b => { b.onmousedown = e => e.preventDefault(); b.onclick = () => {
    const v = b.dataset.tv; S.phaseEdit = false; ph.classList.remove("edit");
    if (v !== "x") { const n = v === "0" ? null : +v; D.rest = { ...(D.rest || {}) }; if (n == null) delete D.rest[ex.key]; else D.rest[ex.key] = n; save();
      const nd = restFor(ex);
      if (T.key === ex.key && (running() || T.left != null)) { if (running()) { const start = T.end - T.dur * 1000; T.end = Math.max(Date.now() + 1000, start + nd * 1000); if (remaining() > 5) tWarned = false; notifSchedule(); } else T.left = Math.max(1, T.left + nd - T.dur); T.dur = nd; tSave(); }
      toast(`Recupero ${ex.name}: ${fmtSec(nd)}${n == null ? " (base)" : ""}`); if (S.view === "log") renderLog(); }
    drawTimer(); placeTimer(); }; });
  placeTimer();
}
function drawTimer() {
  const box = $("timer"), tb = $("tbox");
  const run = running(), paused = T.left != null, done = Date.now() - tDone < 6000;
  box.hidden = !(run || paused || done || S.view === "log");
  tb.classList.toggle("run", run); tb.classList.toggle("paused", paused); tb.classList.toggle("done", done && !run && !paused);
  $("tStop").hidden = !(run || paused);
  drawPhase(run, paused, done);
  $("tPause").innerHTML = run ? `<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>` : `<svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z"/></svg>`;
  $("tPause").setAttribute("aria-label", run ? "Pausa" : paused ? "Riprendi" : "Avvia il recupero");
  $("tPause").classList.toggle("go", !run);
  if (run || paused) {
    const r = remaining();
    $("tTime").textContent = fmtSec(r);
    $("tLabel").textContent = `su ${fmtSec(T.dur || 0)}`;
    $("tFill").style.width = Math.max(0, Math.min(100, (1 - r / (T.dur || 1)) * 100)) + "%";
    tb.classList.toggle("last", run && r <= 5);
  } else {
    tb.classList.remove("last");
    $("tTime").textContent = done ? "VIA!" : fmtSec(tPrefs().sec);
    $("tLabel").textContent = done ? "Recupero finito" : "Avvia recupero";
    $("tFill").style.width = "0";
  }
}
// tocco sul tempo: porta alla serie da fare (se il timer è fermo e non c'è una seduta in corso oggi, lo avvia)
$("tMain").onclick = () => {
  if (running() || T.left != null || Date.now() - tDone < 6000) { if (!resumeLast(true)) toast("Nessuna serie registrata oggi"); }
  else { tDone = 0; startRest(tPrefs().sec, "Recupero"); }
};
$("tPause").onclick = () => {
  unlockAudio();
  if (running()) { notifCancel(); T.left = remaining(); T.end = null; tSave(); clearInterval(tIv); keepAwake(false); audioKeep(false); }
  else if (T.left != null) { T.end = Date.now() + T.left * 1000; delete T.left; tSave(); notifSchedule(); keepAwake(true); audioKeep(true); tickLoop(); }
  else { tDone = 0; startRest(tPrefs().sec, "Recupero"); return; }
  drawTimer();
};
let nudgeT;
const nudge = d => {
  if (running()) { T.end = Math.max(Date.now() + 1000, T.end + d * 1000); T.dur = Math.max(T.dur + d, remaining()); if (remaining() > 5) tWarned = false; tSave(); clearTimeout(nudgeT); nudgeT = setTimeout(notifSchedule, 700); }
  else if (T.left != null) { T.left = Math.max(1, T.left + d); T.dur = Math.max(T.dur + d, T.left); tSave(); }
  else { toast(`Recupero predefinito ${fmtSec(tPrefs().sec)}: si cambia in Impostazioni → Timer`); return; }
  drawTimer();
};
$("tMinus").onclick = () => nudge(-15);
$("tPlus").onclick = () => nudge(15);
$("tStop").onclick = stopRest;

// avvisi: vibrazione, suono, tocco aptico
let AC = null;
function unlockAudio() {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state !== "running") AC.resume();
    const b = AC.createBuffer(1, 1, 22050), s = AC.createBufferSource(); s.buffer = b; s.connect(AC.destination); s.start(0);
  } catch (e) {}
}
["pointerdown", "touchend", "keydown"].forEach(ev => document.addEventListener(ev, () => { if (!AC || AC.state !== "running") unlockAudio(); if (running()) audioKeep(true); }, { passive: true }));
// iPhone sospende l'audio di un'app web che resta in silenzio: durante il recupero tiene acceso un tono inudibile,
// così a fine timer i bip suonano anche senza toccare lo schermo.
let keep = null;
function audioKeep(on) {
  try {
    if (on && AC && !keep) { const o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = 40; g.gain.value = 0.0006; o.connect(g); g.connect(AC.destination); o.start(); keep = { o, g }; }
    else if (!on && keep) { keep.o.stop(); keep.o.disconnect(); keep.g.disconnect(); keep = null; }
  } catch (e) { keep = null; }
}
function beep(at, freq, len, vol) {
  const o = AC.createOscillator(), g = AC.createGain(); o.type = "sine"; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(g); g.connect(AC.destination); o.start(at); o.stop(at + len + 0.05);
}
function iosTap() { // iPhone: Safari non ha la vibrazione per le app web; un interruttore nativo dà un piccolo tocco aptico (iOS 18+)
  try { const l = document.createElement("label"), i = document.createElement("input"); i.type = "checkbox"; i.setAttribute("switch", ""); l.appendChild(i); l.style.cssText = "position:fixed;opacity:0;pointer-events:none"; document.body.appendChild(l); l.click(); setTimeout(() => l.remove(), 50); } catch (e) {}
}
// A fine recupero con l'app aperta: lampo verde a tutto schermo con "VIA!" e la serie da fare
// (su iPhone le app web non possono vibrare e iOS non mostra le notifiche dell'app che hai davanti).
function flashGo() {
  if (document.visibilityState !== "visible") return;
  let f = $("goflash");
  if (!f) { f = document.createElement("div"); f.id = "goflash"; f.setAttribute("role", "alert"); document.body.appendChild(f); f.onclick = () => f.classList.remove("on"); }
  const n = nextInfo();
  f.innerHTML = `<b>VIA!</b>${n && !n.done ? `<span>${esc(n.name)}</span><small>${esc(n.set)} · ${esc(n.what)}</small>` : n && n.done ? `<span>Allenamento completato 🏁</span>` : ""}`;
  f.classList.remove("on"); void f.offsetWidth; f.classList.add("on");
  clearTimeout(f._t); f._t = setTimeout(() => f.classList.remove("on"), 3200);
}
function alarm(soft) {
  if (!soft) flashGo();
  const p = tPrefs();
  if (p.vib) {
    if (navigator.vibrate) navigator.vibrate(soft ? 150 : [500, 200, 500, 200, 700]);
    else { iosTap(); if (!soft) { setTimeout(iosTap, 250); setTimeout(iosTap, 500); setTimeout(iosTap, 750); } }
  }
  if (p.snd && AC) {
    const play = () => { try { const t = AC.currentTime + 0.03;
      if (soft) beep(t, 660, 0.15, 0.25); else { beep(t, 880, 0.22, 0.5); beep(t + 0.3, 880, 0.22, 0.5); beep(t + 0.6, 1175, 0.45, 0.6); } } catch (e) {} };
    if (AC.state === "running") play(); else { try { AC.resume().then(play, play); } catch (e) { play(); } }
  }
}
// ---------- notifiche push (anche a telefono bloccato o in un'altra app) ----------
// Servizio su Cloudflare (cartella worker/): l'app gli chiede di inviare una notifica all'ora di fine recupero.
// Le notifiche push su iPhone funzionano solo con l'app aperta dall'icona sulla Home (iOS 16.4+).
const PUSH_URL = "https://palestra-push.gianluca-brandi42.workers.dev";
// Registro errori (22/11/2026): manda al serviziogli errori raccolti da index.html (coda "palestra-err"), una volta sola ciascuno
const APP_VER = ((document.querySelector('script[src*="?v="]') || {}).src || "").split("v=")[1] || "?";
const errQ = () => { try { return JSON.parse(localStorage.getItem("palestra-err") || "[]"); } catch (e) { return []; } };
window.errFlush = async function () {
  const Q = errQ(), todo = Q.filter(e => !e.sent); if (!todo.length || !navigator.onLine) return;
  const ua = (navigator.userAgent.match(/(iPhone OS|Android) [\d_.]+/) || [navigator.platform || ""])[0].replace(/_/g, ".");
  try {
    const r = await fetch(PUSH_URL + "/errors", { method: "POST", keepalive: true, headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ e: todo.map(({ sig, msg, f, line, col, st, n, t }) => ({ sig, msg, f, line, col, st, n, t })), v: APP_VER, view: (typeof S !== "undefined" && S.view) || "", ua, standalone: !!navigator.standalone }) });
    if (r.ok) { const sent = new Set(todo.map(e => e.sig)), N = errQ(); N.forEach(e => { if (sent.has(e.sig)) e.sent = 1; }); localStorage.setItem("palestra-err", JSON.stringify(N)); }
  } catch (e) {}
};
const pushReady = () => !!PUSH_URL;
const newPushId = () => "p" + Array.from(crypto.getRandomValues(new Uint8Array(12)), b => (b % 36).toString(36)).join("");
const b64uToU8 = s => { const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)); return Uint8Array.from(b, c => c.charCodeAt(0)); };
const u8ToB64u = u => btoa(String.fromCharCode(...new Uint8Array(u))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function pushPost(path, body) {
  return fetch(PUSH_URL + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true })
    .then(r => r.json().catch(() => ({})).then(j => { if (!r.ok) throw new Error(j.error || j.detail || r.status); return j; }));
}
const pushOn = () => { const p = tPrefs(); return pushReady() && p.push && p.pushSub && p.pushId; };
// Cosa c'è dopo il recupero: esercizio, serie, reps previste e kg (scritti o suggeriti) della prossima serie da fare
function nextInfo() {
  let L = null; try { L = JSON.parse(localStorage.getItem(LKEY)); } catch (e) {}
  if (!L || L.date !== S.date || L.gym !== S.gym || L.day !== S.day) return null;
  const d = dayObj(), idx = d.ex.findIndex(e => e.key === L.key); if (idx < 0) return null;
  const { k, i } = nextSet(d, idx, L.i), ei = d.ex.findIndex(e => e.key === k), ex = d.ex[ei]; if (!ex) return null;
  const cg = isCircNoLog(d, ei);
  if (cg) { const c = circCount(current(), ex.circ), n = ex.sets.length; if (c >= n) return { done: true };
    return { name: `Circuito ${ex.circ}`, set: `Giro ${c + 1} di ${n}`, what: `${ex.sets[0].t} reps per esercizio` }; }
  const r = exSets(current(), k)[i]; if (r && r.reps != null) return { done: true };
  const kgEl = $(`kg-${k}-${i}`), kg = kgEl ? (kgEl.value || (/\d/.test(kgEl.placeholder) ? kgEl.placeholder : "")) : "";
  return { name: subOf(current(), ex.key) || ex.name, set: `Serie ${i + 1} di ${need(ex, current())}`, what: [`${ex.sets[i].t} reps`, kg && !ex.bw ? `${kg} kg` : ""].filter(Boolean).join(" · ") };
}
function endMsg() {
  const n = nextInfo();
  if (n && n.done) return { title: "🏁 Allenamento completato", body: "Tutte le serie di oggi sono fatte. Ottimo lavoro!" };
  // iPhone mette sempre "from Palestra" tra titolo e testo: l'essenziale va nel titolo
  return n ? { title: `💪 Via! ${n.name}`, body: `${n.set} · ${n.what}` } : { title: "💪 Via! Recupero finito", body: T.label || "Tocca a te" };
}
function notifSchedule() {
  if (!pushOn() || !running()) return; const p = tPrefs();
  T.sid = 1; tSave();
  const m = endMsg();
  pushPost("/schedule", { id: p.pushId, seq: Date.now(), sub: p.pushSub, at: Math.round(T.end), title: m.title, body: m.body }).catch(() => {});
}
function notifCancel() {
  if (!T.sid) return; delete T.sid; tSave();
  if (pushOn()) pushPost("/cancel", { id: tPrefs().pushId, seq: Date.now() }).catch(() => {});
}
async function pushEnable() {
  if (!pushReady()) throw new Error("Servizio notifiche non ancora attivo.");
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
    throw new Error("Notifiche non disponibili qui: su iPhone apri l'app dall'icona sulla Home (serve iOS 16.4 o successivo).");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Permesso negato: abilitalo in Impostazioni → Notifiche → Palestra.");
  const reg = await navigator.serviceWorker.ready;
  const key = (await (await fetch(PUSH_URL + "/vapid")).json()).key;
  let sub = await reg.pushManager.getSubscription();
  if (sub && sub.options && sub.options.applicationServerKey && u8ToB64u(sub.options.applicationServerKey) !== key) { await sub.unsubscribe(); sub = null; }
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToU8(key) });
  setTPref("pushSub", sub.toJSON()); if (!tPrefs().pushId) setTPref("pushId", newPushId());
  setTPref("push", true); setTPref("snd", false); // niente suono dall'app: la notifica vibra (iPhone in silenzioso)
}
// A ogni avvio: l'abbonamento salvato deve essere quello vero di questo telefono e con la chiave attuale del servizio.
// Se manca o è vecchio (chiavi cambiate il 19/11/2026) si rifà da solo; se non si può, le notifiche si spengono con un avviso.
async function pushVerify() {
  const dp = devPush(); if (!dp.push || !pushReady() || !("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready, key = (await (await fetch(PUSH_URL + "/vapid", { cache: "no-store" })).json()).key;
    let sub = await reg.pushManager.getSubscription();
    if (sub && sub.options && sub.options.applicationServerKey && u8ToB64u(sub.options.applicationServerKey) !== key) { await sub.unsubscribe(); sub = null; }
    if (!sub && window.Notification && Notification.permission === "granted") sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToU8(key) }).catch(() => null);
    if (!sub) { setDevPush({ push: false, pushSub: null }); toast("Notifiche di fine recupero da riattivare: Impostazioni → Timer"); return; }
    setDevPush({ pushSub: sub.toJSON(), pushId: dp.pushId || newPushId() });
  } catch (e) {}
}
setTimeout(pushVerify, 1500);
// Uscendo dall'app durante il recupero: notifica con l'ora in cui riprendere (sostituita da "VIA!" a fine recupero)
document.addEventListener("visibilitychange", () => {
  if (!pushOn() || !tPrefs().lockNote || !("serviceWorker" in navigator) || !window.Notification || Notification.permission !== "granted") return;
  navigator.serviceWorker.ready.then(reg => {
    if (document.visibilityState === "hidden" && running()) {
      const h = new Date(T.end).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      const n = nextInfo();
      reg.showNotification(`⏱ Recupero · riparti alle ${h}`, { body: n ? (n.done ? "Hai finito le serie di oggi 🏁" : `Poi: ${n.name}\n${n.set} · ${n.what}`) : (T.label || ""), tag: "rest", icon: "icons/icon-192.png", silent: true });
    } else if (document.visibilityState === "visible" && reg.getNotifications) reg.getNotifications({ tag: "rest" }).then(ns => ns.forEach(n => n.close()));
  }).catch(() => {});
});
// schermo acceso mentre il timer conta (a schermo bloccato il telefono sospende l'app)
async function keepAwake(on) {
  try {
    if (on && "wakeLock" in navigator && !wake && document.visibilityState === "visible") { wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => { wake = null; }); }
    else if (!on && wake) { await wake.release(); wake = null; }
  } catch (e) { wake = null; }
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState !== "visible") return;
  if (running()) { keepAwake(true); if (AC && AC.state !== "running") AC.resume().catch(() => {}); tick(); if (!tIv && running()) tickLoop(); }
});
if (running()) { keepAwake(true); tickLoop(); }
// tornando nell'app dopo un po' (anche senza ricaricarla) col giorno già completato: si riparte dall'alto (18/11/2026)
let hidAt = 0;
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") { hidAt = Date.now(); return; }
  // solo se l'allenamento è chiuso, non mentre sei in sessione (richiesta dell'utente): niente timer/chiusura in corso e "Fine allenamento" o ultimo inserimento da più di 30'
  const cs = current(), over = cs && (cs.tEnd || (cs.t1 && Date.now() - cs.t1 > 30 * 60000));
  if (hidAt && Date.now() - hidAt > 60000 && S.view === "log" && sessDone(cs) && over && !running() && !S.hold && !document.activeElement?.matches("input,textarea")) window.scrollTo({ top: 0 });
});

function renderTimerSet() {
  const p = tPrefs(), canVib = !!navigator.vibrate;
  const tg = (k, label, sub) => `<label class="tgl"><span><b>${label}</b>${sub ? `<small>${sub}</small>` : ""}</span><input type="checkbox" data-k="${k}" ${p[k] ? "checked" : ""}></label>`;
  $("timerSet").innerHTML = `
    <div class="row tdur"><span>Recupero di base</span><button class="btn sm" data-d="-15">−15"</button><b>${fmtSec(p.sec)}</b><button class="btn sm" data-d="15">+15"</button></div>
    <p class="note">Vale per tutti gli esercizi, tranne quelli per cui la scheda indica un recupero diverso. Durante il recupero puoi aggiungere o togliere 15" dalla barra in basso.</p>
    ${tg("auto", "Parte da solo", "quando inserisci le ripetizioni di una serie")}
    ${tg("pad", "Tastierino compatto dell'app", "per kg e ripetizioni, al posto della tastiera dell'iPhone: più basso, col timer attaccato")}
    ${tg("vib", "Vibrazione", canVib ? "" : "su iPhone le app web non possono vibrare: solo un leggero tocco, dove supportato")}
    ${tg("snd", "Suono", "con il telefono in silenzioso potrebbe non sentirsi")}
    ${tg("warn", "Avviso 5 secondi prima", "una vibrazione/bip breve")}
    <div class="row"><button class="btn" id="tTest">Prova l'avviso</button></div>
    <p class="note">Con l'app aperta lo schermo resta acceso da solo durante il recupero.</p>
    ${tg("push", "Notifica a fine recupero", pushReady() ? "arriva anche a telefono bloccato o in un'altra app; per la sola vibrazione tieni l'iPhone in silenzioso" : "servizio in attivazione: presto disponibile")}
    ${p.push ? `<div class="ntfy stack">
      ${tg("lockNote", "Notifica anche all'inizio del recupero", "se blocchi il telefono mentre conta: ora in cui ripartire e serie dopo (spenta di base)")}
      <div class="row"><button class="btn" id="puNow">Prova subito</button><button class="btn" id="puLock">Prova a telefono bloccato (20")</button></div>
      <p class="note" id="puMsg">Il suono dell'app è spento: a fine recupero ti avvisa la notifica.</p>
    </div>` : ""}`;
  $("timerSet").querySelectorAll("[data-d]").forEach(b => b.onclick = () => { setTPref("sec", Math.max(15, Math.min(600, p.sec + +b.dataset.d))); renderTimerSet(); drawTimer(); });
  $("timerSet").querySelectorAll("input[data-k]").forEach(i => i.onchange = () => {
    if (i.dataset.k === "push") {
      if (!i.checked) { notifCancel(); setTPref("push", false); renderTimerSet(); return; }
      if (!pushReady()) { i.checked = false; toast("Servizio notifiche non ancora attivo"); return; }
      i.disabled = true;
      pushEnable().then(() => { renderTimerSet(); if (running()) notifSchedule(); toast("Notifiche attive"); },
        e => { i.checked = false; i.disabled = false; setTPref("push", false); toast(e.message || "Attivazione non riuscita"); });
      return;
    }
    setTPref(i.dataset.k, i.checked); if (i.dataset.k === "pad") renderLog();
  });
  if (p.push) {
    const msg = t => { $("puMsg").textContent = t; }, err = e => msg("Non riuscito: " + (e.message || e) + ". Riprova o riattiva l'interruttore.");
    $("puNow").onclick = () => pushPost("/test", { sub: tPrefs().pushSub, title: "Prova Palestra 💪", body: "Le notifiche funzionano" }).then(() => msg("Inviata: deve arrivare in pochi secondi."), err);
    $("puLock").onclick = () => pushPost("/schedule", { id: tPrefs().pushId, seq: Date.now(), sub: tPrefs().pushSub, at: Date.now() + 20000, title: "Prova a telefono bloccato 💪", body: "Se la vedi, funziona anche a schermo spento" })
      .then(() => msg("Programmata tra 20 secondi: blocca il telefono adesso."), err);
  }
  $("tTest").onclick = () => { unlockAudio(); setTimeout(() => alarm(false), 60); };
}
let toastT;
function toast(t) { const el = $("toast"); el.textContent = t; el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => el.hidden = true, 2200); }
