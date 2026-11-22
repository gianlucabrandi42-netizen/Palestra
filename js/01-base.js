/* Palestra — Utilità, archivio locale, scheda attiva, forma del giorno e rientro, esercizi fuori ordine, salto pesi, immagini, mappa muscoli.
   Parte di app.js diviso il 22/11/2026: i file js/01…10 si caricano in ordine (index.html) e condividono le stesse funzioni globali. */
"use strict";
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const num = v => { if (v === "" || v == null) return null; const n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : null; };
const fmt = n => n == null ? "" : (Math.round(n * 100) / 100).toString().replace(".", ",");
// La "giornata di allenamento" cambia alle 4 del mattino, non a mezzanotte: un allenamento serale che va oltre
// la mezzanotte (o riaprire l'app subito dopo) resta nella seduta della sera.
const DAY_START_H = 4;
const isoLocal = t => { const d = new Date(t - DAY_START_H * 3600e3); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const todayISO = () => isoLocal(Date.now());
const fmtDate = iso => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y.slice(2)}`; };
const daysSince = iso => iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 864e5) : null;

const MNAME = {CHEST:"Petto",FRONT_DELTOIDS:"Deltoidi anteriori",BACK_DELTOIDS:"Deltoidi posteriori",TRICEPS:"Tricipiti",BICEPS:"Bicipiti",FOREARM:"Avambracci",ABS:"Addome",OBLIQUES:"Obliqui",TRAPEZIUS:"Trapezio",UPPER_BACK:"Dorsali",LOWER_BACK:"Lombari",GLUTEAL:"Glutei",HAMSTRING:"Femorali",QUADRICEPS:"Quadricipiti",CALVES:"Polpacci",LEFT_SOLEUS:"Soleo",RIGHT_SOLEUS:"Soleo",ABDUCTORS:"Adduttori",ABDUCTOR:"Abduttori",NECK:"Collo",TRAPEZIUS_:"Trapezio"};
const TYPES = {std:{n:"",c:"--t-std"},ced:{n:"Cedimento",c:"--t-ced"},strip:{n:"Stripping",c:"--t-strip"},alte:{n:"Alte reps",c:"--t-alte"},pausa:{n:"Pausa",c:"--t-pausa"},super:{n:"Superserie",c:"--t-super"},risc:{n:"Riscaldamento",c:"--t-risc"}};
const CAP = {f1:"Foto · inizio", f2:"Foto · fine", d1:"Disegno · inizio", d2:"Disegno · fine"};

// ---------- archivio locale ----------
const KEY = "palestra-v1";
const PIC = new Map(); // pausa per data (pauseInfo), svuotata a ogni salvataggio
let D = load();
function load() {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
  d = d || {};
  d.sessions = d.sessions || {}; d.setup = d.setup || {}; d.prefs = d.prefs || {};
  if (!d.prefs.nightFix) { mergeNightSessions(d); d.prefs.nightFix = 1; try { localStorage.setItem("palestra-v1", JSON.stringify(d)); } catch (e) {} }
  return d;
}
// Correzione una tantum: le sedute nate tra mezzanotte e le 4 (prima di questa regola) tornano nella seduta del giorno prima.
// Si riempiono solo i campi vuoti della seduta della sera; nulla di già scritto viene sovrascritto.
function mergeNightSessions(d) {
  for (const [id, s] of Object.entries(d.sessions)) {
    if (!s || !s.date || !s.updatedAt) continue;
    const real = isoLocal(s.updatedAt); if (real >= s.date) continue; // ultima modifica dopo le 4 di quel giorno: seduta vera
    const tid = `${s.gym}_${s.plan}_${s.day}_${real}`, t = d.sessions[tid] || { ...s, id: tid, date: real, ex: {}, circ: {}, note: "" };
    for (const [k, arr] of Object.entries(s.ex || {})) {
      const ta = t.ex[k] = t.ex[k] || [];
      (arr || []).forEach((r, i) => { if (!r) return; const tr = ta[i] || { kg: null, reps: null }; ta[i] = { kg: tr.kg ?? r.kg ?? null, reps: tr.reps ?? r.reps ?? null }; });
    }
    for (const [c, n] of Object.entries(s.circ || {})) { t.circ = t.circ || {}; t.circ[c] = Math.max(t.circ[c] || 0, n || 0); }
    if ((s.note || "").trim() && !(t.note || "").includes(s.note.trim())) t.note = [t.note, s.note].filter(x => (x || "").trim()).join("\n");
    t.updatedAt = Math.max(t.updatedAt || 0, s.updatedAt); d.sessions[tid] = t; delete d.sessions[id];
  }
}
let saveT;
function save(now) {
  clearTimeout(saveT); PIC.clear();
  const w = () => { try { localStorage.setItem(KEY, JSON.stringify(D)); } catch (e) { toast("Memoria piena o bloccata: fai subito un backup"); } };
  if (now) w(); else saveT = setTimeout(w, 250);
  if (typeof cloudSoon === "function") cloudSoon();
}
window.addEventListener("pagehide", () => save(true));
document.addEventListener("visibilitychange", () => { if (document.hidden) save(true); });
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

// ---------- scheda ----------
const GYMS = window.PALESTRE;
const plans = window.SCHEDE;
const activePlan = () => plans.find(p => p.id === window.SCHEDA_ATTIVA) || plans[plans.length - 1];
const S = { view: "log", gym: D.prefs.gym || GYMS[0].id, day: D.prefs.day, date: todayISO(), open: new Set(), exOpen: new Set(), pday: null };
function plan() { return activePlan(); }
function dayObj() { const p = plan(); let d = p.days.find(x => x.id === S.day); if (!d) { d = p.days[0]; S.day = d.id; } return d; }
const sid = () => `${S.gym}_${plan().id}_${S.day}_${S.date}`;
function current() { return D.sessions[sid()] || { id: sid(), gym: S.gym, plan: plan().id, day: S.day, date: S.date, ex: {}, note: "", updatedAt: 0 }; }
const gymSessions = g => Object.values(D.sessions).filter(s => s.gym === g && hasData(s)).sort((a, b) => a.date < b.date ? -1 : 1);
function hasData(s) { return Object.values(s.ex || {}).some(a => (a || []).some(r => r && (r.kg != null || r.reps != null))) || Object.values(s.circ || {}).some(n => n > 0) || (s.note || "").trim() !== ""; }
// circuiti "senza registrazione" (esercizi con circ + nolog): una sola scheda, si contano solo i giri (sessione.circ[nome] = giri fatti)
const circCount = (s, c) => (s && s.circ && s.circ[c]) || 0;
function isCircNoLog(d, idx) { const g = circGroup(d, idx); return g && d.ex[idx].nolog ? g : null; }
function dayUnits(d, s) {
  let tot = 0, done = 0, nEx = 0;
  d.ex.forEach((e, idx) => {
    const g = isCircNoLog(d, idx);
    if (g) { if (idx === g.start) { tot += e.sets.length; done += Math.min(e.sets.length, circCount(s, e.circ)); nEx++; } return; }
    tot += need(e, s); done += s ? Math.min(need(e, s), doneSets(s, e)) : 0; nEx++;
  });
  return { tot, done, nEx };
}
const exSets = (s, k) => (s.ex && s.ex[k]) || [];
// Esercizio sostituito (sessione.sub[key] = nome dell'esercizio fatto davvero): lo storico dell'originale non lo vede;
// il sostituto ha il suo storico (stesse sedute con lo stesso nome). exHas(s, k, sub) confronta il sostituto.
const subOf = (s, k) => ((s && s.sub) || {})[k] || "";
const sameSub = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
// Riparti da zero (18/11/2026): D.resets[key] = data. Le sedute prima di quella data restano nello storico sedute e nel CSV,
// ma non contano più per "Ultima", kg suggeriti, record, stallo, recap, report, progressi e andamento (entrambe le palestre).
const resetOf = k => (D.resets || {})[k] || null;
const ddmm = iso => new Date(iso + "T12:00").toLocaleDateString("it-IT", { day: "numeric", month: "numeric" });
const preReset = (s, k) => { const r = resetOf(k); return !!(r && s.date < r); };
const exHas = (s, k, sub = "") => !preReset(s, k) && sameSub(subOf(s, k), sub) && exSets(s, k).some(r => r && (r.kg != null || r.reps != null));
const isSkip = (s, k) => !!((s && s.skip) || {})[k];
const isLater = (s, k) => !!((s && s.later) || {})[k]; // macchina occupata: lo fai dopo
const hasPain = (s, k) => !!((s && s.pain) || {})[k];
const isBuddy = s => !!(s && s.buddy);
// "Altra sede" (sessione.site, stringa = nome della sede; occasioni rare): macchine diverse → la seduta non fa da riferimento
// per ultima volta/kg suggeriti/salto pesi e non entra in progressi e andamento. Conta nella settimana e nello storico.
const isAway = s => !!s && s.site != null, home = s => !isAway(s);
function lastBefore(k) { const sb = subOf(current(), k), l = gymSessions(S.gym).filter(s => s.date < S.date && exHas(s, k, sb) && home(s)); return l[l.length - 1] || null; }
const tnum = t => { const n = parseFloat(String(t)); return isFinite(n) ? n : null; };
function allHit(sets, ex) { return ex.sets.every((st, i) => { const tn = tnum(st.t); if (tn == null) return true; return sets[i] && sets[i].reps != null && sets[i].reps >= tn; }); }
function index(sets) { const k = sets.some(r => r && r.kg != null); let t = 0; for (const r of sets) { if (!r) continue; t += k ? (r.kg || 0) * (r.reps || 0) : (r.reps || 0); } return t; }
// ---------- forma del giorno e rientro dopo una pausa ----------
// Stanco −10%. Rientro dopo una pausa (≥10 gg, 17/11/2026, scelta dell'utente): NIENTE riduzione, si rifanno i carichi
// dell'ultima volta senza aumenti (hold); se una serie viene ≥3 reps sotto il target, l'app dice di scendere di un salto.
const READY = { top: { n: "Al top", f: 1 }, ok: { n: "Normale", f: 1 }, low: { n: "Stanco / giù", f: 0.9 } };
function lastWorkoutBefore(date) { const l = Object.values(D.sessions).filter(s => s.date < date && hasData(s)).sort((a, b) => a.date < b.date ? -1 : 1); return l[l.length - 1] || null; }
function pauseInfo(date) { if (PIC.has(date)) return PIC.get(date); const v = pauseInfo0(date); PIC.set(date, v); return v; }
function pauseInfo0(date) { const l = lastWorkoutBefore(date); if (!l) return { days: null, f: 1 }; const days = Math.round((new Date(date) - new Date(l.date)) / 864e5); return { days, f: 1, back: days >= 10 }; }
function condition(s) {
  const r = READY[s.readiness || "ok"] || READY.ok, p = s.ignorePause ? { days: null, f: 1 } : pauseInfo(s.date);
  const dl = typeof isDeload === "function" && isDeload(s);
  const why = [r.f < 1 ? "giornata no" : "", p.back ? `rientro dopo ${p.days} giorni` : "", dl ? "settimana di scarico" : ""].filter(Boolean).join(" + ");
  return { r, p, f: r.f * (dl ? DELOAD_F : 1), hold: !!p.back && !dl, deload: dl, why };
}
const isOffDay = s => { const c = condition(s); return c.f < 1 || c.hold; };
// Settimana di scarico (17/11/2026): D.prefs.deload = lunedì della settimana scelta → carichi −35%, 2 serie consigliate; esclusa dai progressi.
const DELOAD_F = 0.65;
const deloadWeeks = () => new Set([...((D.prefs && D.prefs.deloads) || []), D.prefs && D.prefs.deload].filter(Boolean));
const isDeload = s => !!(s && D.prefs && deloadWeeks().has(weekStart(s.date)));
// scarico pianificato in anticipo dal punto della settimana (22/11/2026): quando arriva quella settimana diventa lo scarico in corso
function applyPlannedDeload() {
  const P = D.prefs, wk = weekStart(todayISO()); if (!P || !P.deloadPlan || P.deloadPlan > wk) return false;
  if (P.deloadPlan === wk) { P.deload = wk; P.deloads = [...new Set([...(P.deloads || []), wk])]; }
  delete P.deloadPlan; return true;
}
// serie da fare: in scarico una serie in meno ogni 3 (3 → 2, 4 → 3); circuiti invariati
const need = (e, s) => isDeload(s) && !e.circ && !e.nolog ? e.sets.length - Math.floor(e.sets.length / 3) : e.sets.length;
// Stallo: sedute normali (palestra, sede abituale, niente giornate no/fuori ordine/sostituzioni) in cui la serie migliore
// (forza stimata) non supera la migliore di prima: "fermo da N sedute" se N ≥ 2 sedute dopo l'ultimo record (= 3 sedute piatte).
function stallInfo(ex, gym, before, sub = "") {
  const ss = gymSessions(gym).filter(s => (!before || s.date < before) && home(s) && !isOffDay(s) && !oooOff(s, ex.key) && exHas(s, ex.key, sub));
  let best = 0, since = 0;
  for (const s of ss) { const b = bestSet(exSets(s, ex.key), ex.bw); if (!b) continue; if (b.v > best * 1.005) { best = b.v; since = 0; } else since++; }
  return since >= 2 ? { n: since + 1 } : null;
}
// seduta normale precedente a "rs" per questo esercizio (per l'aumento serve 2 volte di fila a target e pulite)
// Riferimento (18/11/2026): si saltano solo le sedute a carico ridotto (giornata no, scarico). Il rientro dopo una pausa NON si
// salta più: dal 17/11 si fa a carichi pieni, quindi è la misura più recente di quanto riesci a fare.
const reduced = s => condition(s).f < 1;
function prevRef(k, rs) { const l = gymSessions(S.gym).filter(s => s.date < rs.date && exHas(s, k, subOf(rs, k)) && home(s) && !reduced(s) && !oooOff(s, k)); return l[l.length - 1] || null; }
// Riferimento per i suggerimenti: l'ultima seduta "normale" (salta fino a 2 giornate no o di rientro).
function lastRef(k) { const sb = subOf(current(), k), l = gymSessions(S.gym).filter(s => s.date < S.date && exHas(s, k, sb) && home(s)); for (let i = l.length - 1; i >= Math.max(0, l.length - 3); i--) if (!reduced(l[i]) && !oooOff(l[i], k)) return l[i]; return l[l.length - 1] || null; }
// ---------- esercizi fatti fuori ordine (macchina occupata) ----------
// sessione.ord = ordine in cui hai iniziato gli esercizi (prima serie compilata). Un esercizio è "fuori ordine" se prima
// di lui hai iniziato un esercizio che nella scheda viene dopo. Quel giorno, per quell'esercizio: valutazione tollerante,
// non è base dei kg suggeriti, escluso da andamento e progressi. sessione.orderOk[key] = "non ha influito" (conta normale).
function planDay(s) { const p = plans.find(x => x.id === s.plan); return p ? p.days.find(x => x.id === s.day) : null; }
function oooInfo(s, key, prospective) {
  const d = planDay(s); if (!d || !s) return null;
  const pos = k => d.ex.findIndex(e => e.key === k);
  const unit = k => { const i = pos(k); if (i < 0) return k; const g = isCircNoLog(d, i); return g ? d.ex[g.start].key : k; };
  const ord = [...new Set((s.ord || []).map(unit))]; key = unit(key);
  let idx = ord.indexOf(key);
  if (idx < 0) { if (!prospective || !ord.length) return null; ord.push(key); idx = ord.length - 1; }
  const me = pos(key); if (me < 0) return null;
  const later = ord.slice(0, idx).filter(k => pos(k) > me).map(k => d.ex[pos(k)]);
  if (!later.length) return null;
  const ex = d.ex[me], mine = new Set([...((ex.m && ex.m.p) || []), ...((ex.m && ex.m.s) || [])]);
  const tired = later.filter(e => ((e.m && e.m.p) || []).some(m => mine.has(m)));
  const muscles = [...new Set(tired.flatMap(e => e.m.p.filter(m => mine.has(m)).map(m => MNAME[m] || m)))];
  return { key, later, tired, muscles, started: idx < (s.ord || []).length && (s.ord || []).map(unit).includes(key), off: !(s.orderOk && s.orderOk[key]) };
}
const oooOff = (s, key) => { const o = oooInfo(s, key); return !!(o && o.off); };
const listIt = a => a.length < 2 ? a.join("") : a.slice(0, -1).join(", ") + " e " + a[a.length - 1];
function oooBox(o, prospective) {
  const names = listIt(o.later.map(e => e.name));
  const why = o.tired.length ? `${listIt(o.muscles)} già lavorat${o.muscles.length > 1 ? "i" : "o"} da ${listIt(o.tired.map(e => e.name))}: se serve scendi del 5%.` : `Fatto dopo ${names}.`;
  return `<div class="ooo${o.off ? "" : " ok"}"><div><b>↕ ${prospective ? "Se lo fai adesso: fuori ordine" : "Fatto fuori ordine"}</b>
    <p>${esc(why)} ${o.off ? "Oggi non pesa sulla progressione." : "Conta come seduta normale."}</p></div>
    ${prospective ? "" : `<button class="btn sm" data-ooo>${o.off ? "Non ha influito" : "Annulla"}</button>`}</div>`;
}
function toggleOrderOk(key) { const s = JSON.parse(JSON.stringify(current())); s.orderOk = { ...(s.orderOk || {}) }; if (s.orderOk[key]) delete s.orderOk[key]; else s.orderOk[key] = true; s.updatedAt = Date.now(); D.sessions[s.id] = s; save(); renderLog(); }
const roundKg = x => Math.round(x * 2) / 2;
const r2 = x => Math.round(x * 100) / 100; // con un salto noto (anche 1,25 o 4,5) si tiene il peso esatto
// Serie "sporca": vedi dN()/cleanR() qui sotto (graduata dal 18/11/2026).
const allClean = sets => !sets.some(r => r && r.dirty);
// Kg suggeriti = un peso che puoi caricare davvero: ultimo carico ± salti interi (step, per esercizio e palestra).
// Aumento = un salto (scelta dell'utente: si sale subito e si accettano 1-2 reps in meno). Riduzioni (giornata no,
// rientro, serie sporca sotto target −5%) = peso disponibile più vicino VERSO IL BASSO. Senza salto noto: +2,5% / 0,5 kg.
// Regola dell'utente (17/11/2026): OGNI serie fatta pulita e a target (o oltre) sale di un salto già la volta dopo.
// Sensazione della serie (17/11/2026): r.eff = "easy" (Facile, 2+ reps in canna) | "hard" (Al limite, pulita ma 0 in canna) | assente = Giusta.
// Al limite a target → stesso carico (consolidi). Facile a target due volte di fila → due salti.
// Serie sporca graduata (18/11/2026, richiesta dell'utente: "bisogna osare ogni tanto"): r.dirty = 1 · 2 · 3 reps sporche
// (le vecchie "sporche" senza numero = 1). Contano le reps pulite (reps − sporche):
// 1 sporca con pulite ≥ target → si sale lo stesso; 1 sporca con 1-2 pulite in meno o 2 sporche → stesso carico;
// 3+ sporche o pulite 3+ sotto il target → un salto in giù. Record e progressi: serie con 1 sporca valgono con le sole pulite.
const dN = r => !r || !r.dirty ? 0 : r.dirty === true ? 1 : Math.min(3, Math.max(1, +r.dirty || 1));
const cleanR = r => r && r.reps != null ? Math.max(0, r.reps - dN(r)) : null;
const okRec = r => !!r && !r.help && dN(r) <= 1;          // vale per record, progressi, confronti
const recR = r => r && dN(r) ? { ...r, reps: cleanR(r), dirty: undefined } : r;
function setUp(ls, t) { return !!ls && ls.kg != null && t != null && ls.reps != null && dN(ls) <= 1 && cleanR(ls) >= t && !ls.help && ls.eff !== "hard" && !lrOn(ls); }
const atLimit = (ls, t) => !!ls && !ls.dirty && ls.eff === "hard" && t != null && ls.reps != null && ls.reps >= t;
const easy2 = (ls, pl, t) => setUp(ls, t) && ls.eff === "easy" && setUp(pl, t) && pl.eff === "easy";
function suggestKg(ls, hit, f, t, step, n = 1) {
  if (!ls || ls.kg == null) return null; const b = ls.kg; let k = b;
  if (ls.dirty && t != null && ls.reps != null && (dN(ls) >= 3 || cleanR(ls) <= t - 3)) k = b * 0.95; // molto sporca o troppo corta: un salto giù
  else if (setUp(ls, t) && f >= 1) k = step ? b + step * n : Math.max(b * (1 + 0.025 * n), b + n);
  k *= f;
  if (!step) return roundKg(k);
  if (k >= b - 1e-9) return r2(b + Math.round((k - b) / step) * step);
  const d = r2(b - Math.ceil((b - k) / step - 1e-9) * step); return d > 0 ? d : b;
}
// Doppia progressione (17/11/2026): quando il salto è troppo pesante (≥10% del carico, es. manubri 14→16) o
// l'ultimo tentativo col peso nuovo è finito sotto il 60% delle reps, si resta (o si torna) al peso di prima e si
// aggiungono reps (+1 a seduta, fino a target+2); a target+2 pulite si riprova il salto. Restituisce { kg, reps, why }.
function advise(r, pl, t, step, f, n = 1) {
  if (!r || r.kg == null) return null;
  if (f >= 1 && t != null && r.reps != null) {
    if (pl && pl.kg != null && pl.kg < r.kg && r.reps < t * 0.6)
      return { kg: pl.kg, reps: Math.min(t + 2, Math.max(t, pl.reps || t) + 1), why: "Il peso nuovo era troppo: torna a quello di prima e aggiungi reps", mode: "reps" };
    if (r.help && dN(r) <= 1 && cleanR(r) >= t) return { kg: r.kg, reps: t, why: "Serie aiutata l'ultima volta: stesso carico, falla da solo", mode: "help" };
    if (lrOn(r) && dN(r) <= 1 && cleanR(r) >= t) return { kg: r.kg, reps: t, why: "Recupero troppo lungo l'ultima volta: stesso carico, rifallo col recupero giusto", mode: "rest" };
    const rebuild = !!pl && pl.kg != null && pl.kg > r.kg && pl.reps != null && pl.reps < t * 0.6, big = !!step && step / r.kg >= 0.1;
    if ((big || rebuild) && dN(r) <= 1 && cleanR(r) >= t) {
      if (cleanR(r) >= t + 2 && r.eff !== "hard") return { kg: rebuild ? pl.kg : r2(r.kg + step), reps: t, why: "Reps in più fatte: prova il peso nuovo", mode: "jump" };
      return { kg: r.kg, reps: Math.min(t + 2, cleanR(r) + 1), why: big ? "Salto pesante: aggiungi una rep a seduta, con 2 in più pulite sali" : "Prima più reps, poi riprova il peso nuovo", mode: "reps" };
    }
  }
  return { kg: suggestKg(r, null, f, t, step, n), reps: t };
}
// ---------- salto dei pesi ----------
const STEPS = [1, 2, 2.5, 5, 10];
// stimato dai pesi già usati in questa palestra: la differenza più piccola tra due carichi diversi, agganciata ai salti tipici
const stepK = (key, sub) => sub ? `${key}@${sub.trim().toLowerCase()}` : key; // salto pesi del sostituto: suo, per macchina
function stepAuto(key, gym, sub = "") {
  const ks = [...new Set(gymSessions(gym).filter(s => home(s) && sameSub(subOf(s, key), sub)).flatMap(s => exSets(s, key).map(r => r && r.kg).filter(v => v != null && v > 0)))].sort((a, b) => a - b);
  let m = null; for (let i = 1; i < ks.length; i++) { const d = ks[i] - ks[i - 1]; if (d >= 0.9 && (m == null || d < m)) m = d; }
  if (m == null) return null; const near = STEPS.find(x => Math.abs(x - m) <= 0.15); return near || Math.round(m * 4) / 4;
}
function stepFor(key, sub = "") { const v = ((D.steps || {})[S.gym] || {})[stepK(key, sub)]; return v ? { v, auto: false } : { v: stepAuto(key, S.gym, sub), auto: true }; }
function setStep(key, v) { D.steps = D.steps || {}; D.steps[S.gym] = { ...(D.steps[S.gym] || {}) }; if (v == null) delete D.steps[S.gym][key]; else D.steps[S.gym][key] = v; save(); renderLog(); }
const e1rm = (kg, reps) => kg * (1 + reps / 30);
const maxKg = sets => { const k = sets.filter(r => r && r.kg != null).map(r => r.kg); return k.length ? Math.max(...k) : null; };
const doneSets = (s, ex) => ex.sets.filter((_, i) => { const r = exSets(s, ex.key)[i]; return r && r.reps != null; }).length;

// ---------- immagini ----------
function imgs(ex) { const a = (ex.img && ex.img.local || []).map(f => ({ src: "img/" + f, cap: CAP[f.split("-").pop().slice(0, 2)] || "", draw: /-d\d/.test(f) })); return ex._pic ? [{ src: ex._pic, cap: "La tua foto", own: true }, ...a] : a; }
function execFrames(ex) { const a = imgs(ex).filter(x => !x.own); const f = a.filter(x => !x.draw); return (f.length >= 2 ? f : a).slice(0, 2); }

// ---------- mappa muscoli ----------
function bodySVG(m) {
  const P = new Set(m.p || []), Sd = new Set(m.s || []);
  const poly = (arr, dx) => arr.map(([mu, pts]) => { const c = P.has(mu) ? "p" : Sd.has(mu) ? "s" : "m"; return pts.map(p => `<polygon class="${c}" points="${p}" transform="translate(${dx} 0)"/>`).join(""); }).join("");
  return `<svg class="bm" viewBox="0 0 205 200" role="img" aria-label="Muscoli">${poly(window.BODY.a, 0)}${poly(window.BODY.p, 105)}</svg>`;
}
const mnames = l => [...new Set((l || []).map(x => MNAME[x] || x))].join(" · ");
