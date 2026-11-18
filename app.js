/* Palestra — app di allenamento. Dati salvati solo sul telefono (localStorage) con backup su file. */
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
// serie da fare: in scarico una serie in meno ogni 3 (3 → 2, 4 → 3); circuiti invariati
const need = (e, s) => isDeload(s) && !e.circ && !e.nolog ? e.sets.length - Math.floor(e.sets.length / 3) : e.sets.length;
// Stallo: sedute normali (palestra, sede abituale, niente giornate no/fuori ordine/sostituzioni) in cui la serie migliore
// (forza stimata) non supera la migliore di prima: "fermo da N sedute" se N ≥ 2 sedute dopo l'ultimo record (= 3 sedute piatte).
function stallInfo(ex, gym, before) {
  const ss = gymSessions(gym).filter(s => (!before || s.date < before) && home(s) && !isOffDay(s) && !oooOff(s, ex.key) && exHas(s, ex.key, ""));
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
function stepAuto(key, gym) {
  const ks = [...new Set(gymSessions(gym).filter(s => home(s) && !subOf(s, key)).flatMap(s => exSets(s, key).map(r => r && r.kg).filter(v => v != null && v > 0)))].sort((a, b) => a - b);
  let m = null; for (let i = 1; i < ks.length; i++) { const d = ks[i] - ks[i - 1]; if (d >= 0.9 && (m == null || d < m)) m = d; }
  if (m == null) return null; const near = STEPS.find(x => Math.abs(x - m) <= 0.15); return near || Math.round(m * 4) / 4;
}
function stepFor(key) { const v = ((D.steps || {})[S.gym] || {})[key]; return v ? { v, auto: false } : { v: stepAuto(key, S.gym), auto: true }; }
function setStep(key, v) { D.steps = D.steps || {}; D.steps[S.gym] = { ...(D.steps[S.gym] || {}) }; if (v == null) delete D.steps[S.gym][key]; else D.steps[S.gym][key] = v; save(); renderLog(); }
const e1rm = (kg, reps) => kg * (1 + reps / 30);
const maxKg = sets => { const k = sets.filter(r => r && r.kg != null).map(r => r.kg); return k.length ? Math.max(...k) : null; };
const doneSets = (s, ex) => ex.sets.filter((_, i) => { const r = exSets(s, ex.key)[i]; return r && r.reps != null; }).length;

// ---------- immagini ----------
function imgs(ex) { return (ex.img && ex.img.local || []).map(f => ({ src: "img/" + f, cap: CAP[f.split("-").pop().slice(0, 2)] || "", draw: /-d\d/.test(f) })); }
function execFrames(ex) { const a = imgs(ex); const f = a.filter(x => !x.draw); return (f.length >= 2 ? f : a).slice(0, 2); }

// ---------- mappa muscoli ----------
function bodySVG(m) {
  const P = new Set(m.p || []), Sd = new Set(m.s || []);
  const poly = (arr, dx) => arr.map(([mu, pts]) => { const c = P.has(mu) ? "p" : Sd.has(mu) ? "s" : "m"; return pts.map(p => `<polygon class="${c}" points="${p}" transform="translate(${dx} 0)"/>`).join(""); }).join("");
  return `<svg class="bm" viewBox="0 0 205 200" role="img" aria-label="Muscoli">${poly(window.BODY.a, 0)}${poly(window.BODY.p, 105)}</svg>`;
}
const mnames = l => [...new Set((l || []).map(x => MNAME[x] || x))].join(" · ");

// ---------- render: allenamento ----------
function renderConsole() {
  const gi = GYMS.findIndex(g => g.id === S.gym);
  document.body.classList.toggle("g1", gi === 1); setTheme();
  $("gyms").innerHTML = GYMS.map(g => `<button data-g="${g.id}" aria-pressed="${g.id === S.gym}" aria-label="${esc(g.name)}">${esc(g.short || g.name.split(" ")[0])}</button>`).join("");
  $("gyms").querySelectorAll("button").forEach(b => b.onclick = () => { S.gym = b.dataset.g; persistPrefs(); render(); });
  const p = plan(); dayObj();
  if ($("days")) $("days").innerHTML = p.days.map(d => `<button data-d="${d.id}" aria-pressed="${d.id === S.day}"><b>${esc(d.id)}</b><small>${esc(d.name)}</small></button>`).join("");
  if ($("days")) $("days").querySelectorAll("button").forEach(b => b.onclick = () => { S.day = b.dataset.d; S.open.clear(); S.exOpen.clear(); togglePanel(false); persistPrefs(); render(); scrollTo(0, 0); });
  $("date").value = S.date;
  const list = gymSessions(S.gym).filter(s => s.plan === p.id && s.day === S.day).slice(-12).reverse();
  const box = $("sessions"); box.textContent = "";
  const today = todayISO();
  if (!list.some(s => s.date === today)) box.appendChild(chip("Oggi", today));
  list.forEach(s => box.appendChild(chip(s.date === today ? "Oggi" : fmtDate(s.date), s.date)));
}
function chip(label, date) { const b = document.createElement("button"); b.className = "chip"; b.textContent = label; b.setAttribute("aria-pressed", S.date === date); b.onclick = () => { S.date = date; S.exOpen.clear(); togglePanel(false); render(); }; return b; }
function togglePanel(open) { const o = open ?? $("cpanel").hidden; $("cpanel").hidden = !o; $("dsel").setAttribute("aria-expanded", o); }
$("dsel").onclick = () => togglePanel();

// ---------- esercizi del giorno come "unità" (un esercizio, o un circuito senza registrazione) ----------
// Tutto è calcolato da schede.js: con una scheda nuova contatori, cerchio, striscia e schede si aggiornano da soli.
function dayUnitsList(d, s) {
  const u = [];
  d.ex.forEach((e, idx) => {
    const g = isCircNoLog(d, idx);
    if (g) { if (idx !== g.start) return; const mem = d.ex.slice(g.start, g.end + 1), c = circCount(s, e.circ);
      u.push({ circ: g, ex: e, keys: mem.map(x => x.key), name: `Circuito ${e.circ}`, done: c >= e.sets.length, started: c > 0 }); return; }
    const n = doneSets(s, e), sk = isSkip(s, e.key);
    u.push({ idx, ex: e, keys: [e.key], name: subOf(s, e.key) || e.name, done: n >= need(e, s) || sk, skip: sk && n < need(e, s), started: n > 0 });
  });
  u.forEach((x, i) => x.n = i + 1);
  return u;
}
// esercizio "adesso": quello della prossima serie da fare dopo l'ultima compilata; altrimenti il primo non finito
function currentUnit(d, s, units) {
  let L = null; try { L = JSON.parse(localStorage.getItem(LKEY)); } catch (e) {}
  if (L && L.date === S.date && L.gym === S.gym && L.day === S.day) {
    const idx = d.ex.findIndex(e => e.key === L.key);
    if (idx >= 0) { const t = nextSet(d, idx, L.i), u = units.find(x => x.keys.includes(t.k)); if (u && !u.done && !isLater(s, u.keys[0])) return u; }
  }
  return units.find(x => !x.done && !isLater(s, x.keys[0])) || units.find(x => !x.done) || null;
}
const unitOpen = (u, cur) => u === cur || u.keys.some(k => S.exOpen.has(k) || S.hold === k);
const shortName = n => n.length > 14 ? n.slice(0, 13).trim() + "." : n;
function drawHeader(d, s, units, cur) {
  const tot = units.length, done = units.filter(x => x.done).length, left = tot - done, C = 2 * Math.PI * 18;
  $("ring").innerHTML = `<svg viewBox="0 0 44 44"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="s1"/><stop offset="1" class="s2"/></linearGradient></defs><circle cx="22" cy="22" r="18" class="rb"/><circle cx="22" cy="22" r="18" class="rf" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - (tot ? done / tot : 0))).toFixed(1)}"/></svg><b>${left ? left : "✓"}</b>`;
  $("ring").classList.toggle("all", !left && tot > 0);
  // va a capo solo DOPO un "·" (mai una riga che inizia con "·"): spazio non separabile prima di ogni puntino
  $("dtitle").textContent = `${d.id} · ${d.name}`.replace(/ · /g, "\u202F·\u2009"); // spazi sottili: compatto e simmetrico
  const r = s.readiness || "ok", when = S.date === todayISO() ? "oggi" : new Date(S.date + "T12:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
  const dt = durTxt(s, !left);
  $("dsub").innerHTML = `${dt ? `<span class="dlive">⏱ ${dt}</span> · ` : ""}${left ? (left === 1 ? "manca 1 esercizio" : `mancano ${left} esercizi`) : "completato"}${dt && when === "oggi" ? "" : " · " + when}${r !== "ok" ? " · " + READY[r].n : ""}${isBuddy(s) ? " · 👥 in 2" : ""}${isAway(current()) ? " · 📍 " + esc(current().site || "altra sede") : ""} ▾`;
  const strip = $("strip");
  strip.innerHTML = units.map(u => { const f = execFrames(u.circ ? u.ex : u.ex)[0], c = u === cur;
    return `<button class="schip${u.done ? " d" : ""}${c ? " c" : ""}${u.started && !u.done ? " p" : ""}" data-k="${u.keys[0]}" aria-label="${esc(u.name)}${u.done ? ", fatto" : ""}">${f ? `<img src="${f.src}" alt="" loading="lazy">` : ""}<span>${u.done ? "✓ " : ""}${u.n}${c ? " " + esc(shortName(u.name)) : ""}</span></button>`; }).join("");
  strip.querySelectorAll("[data-k]").forEach(b => b.onclick = () => openUnit(b.dataset.k));
  const c = strip.querySelector(".c"); if (c) strip.scrollLeft = Math.max(0, c.offsetLeft - strip.clientWidth / 2 + c.offsetWidth / 2);
}
// apre (se chiuso) e mostra l'esercizio subito sotto la barra in alto
function openUnit(k) {
  const d = dayObj(), units = dayUnitsList(d, current()), cur = currentUnit(d, current(), units), u = units.find(x => x.keys.includes(k)); if (!u) return;
  if (!unitOpen(u, cur)) { S.exOpen.add(u.keys[0]); renderLog(); }
  const card = document.querySelector(`.ex[data-ex="${u.keys[0]}"], .circ-card[data-keys~="${u.keys[0]}"]`); if (!card) return;
  scrollTo({ top: Math.max(0, card.getBoundingClientRect().top + scrollY - $("console").getBoundingClientRect().bottom - 8), behavior: "smooth" });
}
// la riga indicata è in un esercizio chiuso? lo apre (serve a timer, ripresa e serie dimenticate)
function ensureRow(k, i) { let row = rowEl(k, i); if (row && row.classList.contains("exmini")) { S.exOpen.add(k); renderLog(); row = rowEl(k, i); } return row; }
function persistPrefs() { D.prefs.gym = S.gym; D.prefs.day = S.day; save(); }

function updateProgress() { renderWeek();
  const d = dayObj(), s = current();
  const units = dayUnitsList(d, s); drawHeader(d, s, units, currentUnit(d, s, units));
  d.ex.forEach(e => { const c = document.querySelector(`[data-ex="${e.key}"]`); if (c) c.classList.toggle("done", doneSets(s, e) >= need(e, s)); });
  document.querySelectorAll(".circ-card").forEach(c => { const e = d.ex.find(x => x.circ === c.dataset.circ); if (e) c.classList.toggle("done", circCount(s, e.circ) >= e.sets.length); });
  checkMissing();
}

// ---------- questa settimana: quali giorni della scheda hai fatto (tutte e due le palestre) e quali mancano ----------
const WD = ["dom", "lun", "mar", "mer", "gio", "ven", "sab"];
function weekStart(iso) { const t = new Date(iso + "T12:00"); t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return t.toISOString().slice(0, 10); }
function weekStatus() {
  const p = plan(), today = todayISO(), mon = weekStart(today), sun = (() => { const t = new Date(mon + "T12:00"); t.setDate(t.getDate() + 6); return t.toISOString().slice(0, 10); })();
  const ss = Object.values(D.sessions).filter(s => s.plan === p.id && s.date >= mon && s.date <= sun && hasData(s));
  return p.days.map(d => {
    let best = null;
    for (const s of ss.filter(s => s.day === d.id)) {
      const us = dayUnitsList(d, s), f = us.length ? us.filter(u => u.done).length / us.length : 0;
      if (!best || f > best.f || (f === best.f && s.date > best.s.date)) best = { s, f };
    }
    const g = best && GYMS.find(x => x.id === best.s.gym);
    return { d, done: !!best && best.f >= 0.75, part: !!best && best.f < 0.75, when: best ? (best.s.date === today ? "oggi" : WD[new Date(best.s.date + "T12:00").getDay()]) : "", gym: g ? (g.short || g.name.split(" ")[0]) : "" };
  });
}
// da quanto tempo fai la scheda attiva: cerchio che si riempie in 4 settimane (il PT la cambia circa ogni mese)
const PLAN_DAYS = 28;
function planAge() {
  const p = plan(); if (!p || !p.from) return "";
  const n = Math.max(1, Math.round((new Date(todayISO() + "T12:00") - new Date(p.from + "T12:00")) / 864e5) + 1), wk = Math.ceil(n / 7), over = n > PLAN_DAYS;
  const C = 2 * Math.PI * 16, f = Math.min(1, n / PLAN_DAYS);
  return `<div class="pl-age${over ? " over" : ""}" aria-label="Scheda in uso da ${n} giorni">
    <svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" class="tr"/><circle cx="20" cy="20" r="16" class="pg" stroke-dasharray="${(C * f).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 20 20)"/><text x="20" y="24.5" text-anchor="middle">${n}</text></svg>
    <div><span>Scheda da ${n === 1 ? "1 giorno" : n + " giorni"}</span><small>${over ? "4 settimane passate: chiedi la nuova al PT" : `settimana ${wk} di ${PLAN_DAYS / 7}`}</small>${n >= 21 ? `<button type="button" class="chip rep-go" data-report>📋 Report per il PT</button>` : ""}</div></div>`;
}
function renderWeek() {
  const box = $("week"); if (!box) return;
  const w = weekStatus(), left = w.filter(x => !x.done).length;
  box.innerHTML = `<div class="wk-h">${planAge()}<div class="wk-s"><span>Questa settimana</span><b>${left ? `${left === 1 ? "manca" : "mancano"} ${left}` : "completa ✓"}</b>${(st => st.n >= 2 ? `<small class="streak">🔥 ${st.n} settimane di fila</small>` : "")(streakInfo())}</div></div>
    <div class="wk-r" role="group" aria-label="Giorno">${w.map(x => `<button class="wk ${x.done ? "done" : x.part ? "part" : ""}${x.d.id === S.day ? " sel" : ""}" data-d="${x.d.id}" aria-pressed="${x.d.id === S.day}">
      <span class="wk-i">${x.done ? "✓" : x.part ? "◐" : ""}</span><b>${esc(x.d.id)}</b>
      <em>${esc(x.d.name)}</em>
      <small>${x.done || x.part ? `${x.when} · ${esc(x.gym)}` : "da fare"}</small></button>`).join("")}</div>`;
  box.querySelectorAll("[data-d]").forEach(b => b.onclick = () => { if (b.dataset.d === S.day) return; S.day = b.dataset.d; S.open.clear(); S.exOpen.clear(); persistPrefs(); render(); scrollTo(0, 0); });
  { const rb = box.querySelector("[data-report]"); if (rb) rb.onclick = openReport; }
  { const mon = weekStart(todayISO()); if (!left && D.prefs.weekCel !== mon && weekFull(mon)) { D.prefs.weekCel = mon; save(); const st = streakInfo(); celebrate("🔥 Settimana completa!", st.n >= 2 ? `${st.n} settimane di fila` : "Tutti i giorni della scheda fatti"); } }
}
function renderSite() {
  const box = $("site"); if (!box) return; const s = current();
  const bud = `<div class="seg buddy" role="group" aria-label="Con chi"><button data-b="0" aria-pressed="${!isBuddy(s)}">👤 Solo</button><button data-b="1" aria-pressed="${isBuddy(s)}">👥 In 2</button></div>`;
  box.innerHTML = bud + (isAway(s)
    ? `<label class="sitein"><span>📍</span><input id="siteName" autocomplete="off" placeholder="Nome della sede (es. Green Theory Firenze)" value="${esc(s.site || "")}"></label><button class="chip" id="siteOff">Sede abituale</button>`
    : `<button class="chip" id="siteOn">📍 Altra sede</button><span class="sitehint">solo per allenamenti in un'altra sede della catena</span>`);
  box.querySelectorAll("[data-b]").forEach(b => b.onclick = () => { const x = JSON.parse(JSON.stringify(current())); if (b.dataset.b === "1") x.buddy = true; else delete x.buddy; x.updatedAt = Date.now(); D.sessions[x.id] = x; save(); renderLog(); });
  const on = $("siteOn"), off = $("siteOff"), nm = $("siteName");
  if (on) on.onclick = () => { setSess({ site: "" }); setTimeout(() => { const i = $("siteName"); if (i) i.focus(); }, 50); };
  if (off) off.onclick = () => { const x = JSON.parse(JSON.stringify(current())); delete x.site; x.updatedAt = Date.now(); D.sessions[x.id] = x; save(); renderLog(); };
  if (nm) nm.oninput = () => { const x = JSON.parse(JSON.stringify(current())); x.site = nm.value.trim(); x.updatedAt = Date.now(); D.sessions[x.id] = x; save(); renderConsole(); };
}
// Foto delle macchine scattate dall'utente (D.machines[gym][nome minuscolo] = JPEG ridotto), nel backup
const machinePic = n => (((D.machines || {})[S.gym] || {})[(n || "").trim().toLowerCase()]) || "";
function saveMachinePic(n, file) {
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => { const k = 480 / Math.max(img.width, img.height), c = document.createElement("canvas"); c.width = Math.round(img.width * Math.min(1, k)); c.height = Math.round(img.height * Math.min(1, k));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    D.machines = D.machines || {}; D.machines[S.gym] = { ...(D.machines[S.gym] || {}), [n.trim().toLowerCase()]: c.toDataURL("image/jpeg", 0.72) };
    try { save(); toast("Foto salvata"); } catch (e) { toast("Spazio pieno: foto non salvata"); } renderLog(); };
  img.src = url;
}
// ---------- Info ed esecuzione in un riquadro che sale dal basso (17/11/2026) ----------
// Il pannello .panel della scheda viene spostato dentro #isheet; si chiude toccando fuori, con ✕ o trascinando giù.
function openSheet(key) {
  const card = document.querySelector(`.ex[data-ex="${key}"]`), sh = $("isheet"); if (!card || !sh) return;
  clearTimeout(sh._closeT); // riaperto mentre si stava chiudendo: il pannello è ancora nel riquadro
  { const prev = sh.querySelector(".is-c .panel"); if (prev && sh._card && sh._card !== card && document.contains(sh._card)) { prev.hidden = true; sh._card.appendChild(prev); } }
  const ex = dayObj().ex.find(e => e.key === key), panel = card.querySelector(".panel") || (sh._card === card ? sh.querySelector(".is-c .panel") : null);
  if (!panel || !ex) return; const pbody = panel.querySelector(".pbody");
  if (pbody && !pbody.firstChild) fillPanel(pbody, ex);
  const body = sh.querySelector(".is-c"); body.textContent = ""; panel.hidden = false; body.appendChild(panel); sh._card = card;
  sh.querySelector(".is-h").innerHTML = `<b>${esc(subOf(current(), key) || ex.name)}</b>${rxLine(ex)}`;
  const was = !sh.hidden || S.sheet === key && sh.classList.contains("on"); S.sheet = key;
  sh.hidden = false; document.documentElement.classList.add("noscroll");
  if (!was) { sh.classList.remove("on"); void sh.offsetWidth; } sh.classList.add("on");
}
function closeSheet(keep) {
  const sh = $("isheet"); if (!sh || sh.hidden) { if (!keep) S.sheet = null; return; }
  if (!keep) S.sheet = null; const box = sh.querySelector(".is-box"); box.style.transform = "";
  sh.classList.remove("on"); document.documentElement.classList.remove("noscroll");
  const b = document.activeElement; if (b && sh.contains(b)) b.blur();
  // il pannello torna nella sua scheda, così il tasto si può riaprire
  const back = () => { if (S.setupDirty) { S.setupDirty = false; sh.querySelector(".is-c").textContent = ""; sh._card = null; renderLog(); return; } const p = sh.querySelector(".is-c .panel"), c = sh._card; if (p && c && document.contains(c)) { p.hidden = true; c.appendChild(p); } sh.querySelector(".is-c").textContent = ""; sh._card = null; };
  clearTimeout(sh._closeT); sh._closeT = setTimeout(() => { if (!sh.classList.contains("on")) { sh.hidden = true; back(); } }, 220);
}
(() => { // chiusura: tocco fuori, ✕, trascinamento verso il basso dalla barretta/intestazione
  const sh = $("isheet"); if (!sh) return;
  const box = sh.querySelector(".is-box");
  sh.querySelector(".is-bg").onclick = () => closeSheet();
  sh.querySelector(".is-x").onclick = () => closeSheet();
  sh.querySelector(".is-close").onclick = () => closeSheet();
  // Trascina giù per chiudere (rifatto il 18/11/2026: "non si trascina bene"). Funziona da qualsiasi punto del riquadro,
  // anche partendo dalle foto (prima la galleria era esclusa, ed è proprio la parte in alto): direzione decisa ai primi
  // 8 px (orizzontale = sfogli le foto, verticale = trascini); a contenuto in cima il rimbalzo di iOS viene bloccato
  // (touchmove non passivo) così il riquadro segue il dito; si chiude oltre 1/4 di altezza o con uno scatto veloce.
  const cont = sh.querySelector(".is-c"), bg = sh.querySelector(".is-bg"), grab = sh.querySelector(".is-top");
  let y0 = null, x0 = 0, dy = 0, lock = null, t0 = 0, fromTop = false, lastY = 0, lastT = 0, vel = 0;
  const start = (e, top) => { const t = e.touches[0]; if (e.target.closest && e.target.closest("input, textarea")) { y0 = null; return; }
    fromTop = top; y0 = t.clientY; x0 = t.clientX; dy = 0; lock = top ? "y" : null; t0 = lastT = Date.now(); lastY = y0; vel = 0; };
  const move = e => { if (y0 == null) return; const t = e.touches[0];
    if (!lock) { const ax = Math.abs(t.clientX - x0), ay = Math.abs(t.clientY - y0);
      // iOS decide lo scorrimento al primo movimento: verso il basso a contenuto in cima lo blocchiamo subito
      if (t.clientY > y0 && ay >= ax && cont.scrollTop <= 0 && e.cancelable) e.preventDefault();
      if (ax < 8 && ay < 8) return;
      lock = ax > ay ? "x" : (t.clientY > y0 && cont.scrollTop <= 0 ? "y" : "scroll"); }
    if (lock !== "y") return;
    dy = Math.max(0, t.clientY - y0); const now = Date.now(); vel = (t.clientY - lastY) / Math.max(1, now - lastT); lastY = t.clientY; lastT = now;
    if (e.cancelable) e.preventDefault();
    box.style.transition = "none"; box.style.transform = `translateY(${dy}px)`; bg.style.transition = "none"; bg.style.opacity = String(Math.max(0.15, 1 - dy / (box.offsetHeight || 600)));
  };
  const end = () => { if (y0 == null) return; const h = box.offsetHeight || 600;
    box.style.transition = ""; bg.style.transition = ""; bg.style.opacity = "";
    const avg = dy / Math.max(1, Date.now() - t0); // scatto: veloce nell'ultimo tratto o in media
    if (lock === "y" && (dy > h * 0.25 || (dy > 40 && Math.max(vel, avg) > 0.5))) closeSheet(); else box.style.transform = "";
    y0 = null; lock = null; };
  cont.addEventListener("touchstart", e => start(e, false), { passive: true });
  cont.addEventListener("touchmove", move, { passive: false });
  cont.addEventListener("touchend", end); cont.addEventListener("touchcancel", end);
  grab.addEventListener("touchstart", e => start(e, true), { passive: true });
  grab.addEventListener("touchmove", move, { passive: false });
  grab.addEventListener("touchend", end); grab.addEventListener("touchcancel", end);
})();
// ---------- Confronto tra le serie dello stesso esercizio nella stessa seduta (18/11/2026) ----------
// Forza stimata (Epley) di ogni serie valida (pulita, non aiutata, con kg e reps). Casi: "light" (S1 leggera: le serie dopo
// valgono >8% in più e la S1 era a target o facile), "climb" (salito troppo: ultima serie più pesante della precedente,
// ≥2 reps sotto target e calo >15%), "drop" (stesso peso e calo >15%), "pyr" (piramide giusta), "ok" (calo ≤12%), "mid".
// Adattamento in seduta (18/11/2026, richiesta dell'utente): i kg (e se serve le reps) delle serie ancora da fare si
// aggiornano appena scrivi una serie. Si parte dal suggerimento della serie (storico) e si guarda l'ultima serie fatta oggi:
// · kg diversi da quelli suggeriti → le serie dopo si spostano della stessa differenza (tieni la struttura della piramide);
// · 3+ reps sotto il target, o sporca e sotto target → −1 salto (−2 se a metà target o meno);
// · pulita e 2+ reps oltre il target, o "Facile" a target → +1 salto (se il salto è pesante, ≥10%, +1 rep invece del peso);
//   mai in giornata no, scarico, rientro, fastidio, serie aiutata o dopo un recupero lungo; al massimo +2 salti sul suggerito.
// Senza storico: dopo la S1 la serie dopo parte da quei kg (+1 salto se è una piramide con meno reps e la S1 era a target pulita).
// 1-2 reps in meno non cambiano nulla (stessa tolleranza dell'opzione B e di "salita troppo").
function liveAdj(i, sets, P, st0, canUp) {
  let j = -1; for (let k = i - 1; k >= 0; k--) { const r = sets[k]; if (r && r.kg != null && r.reps != null) { j = k; break; } }
  if (j < 0 || !P[i] || !P[j]) return null;
  const rj = sets[j], tj = P[j].tn, ti = P[i].tn, pj = P[j].plan, pi = P[i].plan, st = st0 || (rj.kg >= 20 ? 2.5 : 1);
  let out = 0;
  if (tj != null) {
    if (cleanR(rj) <= Math.floor(tj * 0.5)) out = -2;
    else if (cleanR(rj) <= tj - CLIMB_MISS || dN(rj) >= 3) out = -1;
    else if (canUp && !rj.dirty && !rj.help && !lrOn(rj) && rj.eff !== "hard" && (rj.reps >= tj + 2 || (rj.eff === "easy" && rj.reps >= tj))) out = 1;
  }
  const dev = pi != null && pj != null ? r2(rj.kg - pj) : 0;
  const pyr = pi == null && ti != null && tj != null && ti < tj && out === 0 && dN(rj) <= 1 && cleanR(rj) >= tj && canUp;
  const base = pi != null ? pi + dev : rj.kg + (pyr ? st : 0);
  const big = st / Math.max(1, base) >= 0.1;
  let kg = base, reps = P[i].goal || null;
  if (out > 0 && big) reps = Math.max(reps || 0, (ti || 0) + 1); else kg = base + out * st;
  kg = Math.max(st, kg); const cap = (pi != null ? pi : base) + 2 * st; if (kg > cap) kg = cap; kg = r2(kg);
  return { kg, reps, out, j, dev, base: pi, noPlan: pi == null };
}
const CLIMB_MISS = 3; // "salita troppo" da 3 reps sotto il target: 1-2 in meno col peso nuovo sono accettate (opzione B)
function setsTrend(ex, sets, s) {
  if (!ex || ex.bw || ex.nolog) return null;
  const v = (sets || []).map((r, i) => ({ r, i, t: tnum(ex.sets[i] && ex.sets[i].t) })).filter(x => x.r && x.r.reps != null && x.r.kg != null && okRec(x.r)).map(x => ({ ...x, r: recR(x.r) }));
  if (v.length < 2 || !(sets[ex.sets.length - 1] && sets[ex.sets.length - 1].reps != null)) return null;
  const e = v.map(x => e1rm(x.r.kg, x.r.reps)), f = v[0], l = v[v.length - 1], p = v[v.length - 2];
  const drop = Math.round((e[e.length - 1] / e[0] - 1) * 1000) / 10, later = Math.max(...e.slice(1)), pc = x => `${x > 0 ? "+" : "−"}${Math.abs(x).toFixed(0)}%`;
  const kgs = v.map(x => x.r.kg), same = kgs.every(k => k === kgs[0]), up = kgs.every((k, i) => !i || k >= kgs[i - 1]) && !same;
  const pushed = v.slice(1).filter(x => x.t != null && x.r.reps >= x.t + 2).map(x => "S" + (x.i + 1));
  // 1) salito troppo: una serie più pesante della precedente chiusa 2+ reps sotto il target (con l'Epley a poche reps non si vede)
  const cl = v.slice(1).map((x, j) => ({ x, p: v[j] })).filter(o => o.x.r.kg > o.p.r.kg && o.x.t != null && o.x.r.reps <= o.x.t - CLIMB_MISS).pop();
  if (cl) return { kind: "climb", cls: "near", pct: drop, last: cl.x.i, keep: cl.p.r.kg, msg: `Salita troppo: la S${cl.x.i + 1} a ${fmt(cl.x.r.kg)} kg si è fermata a ${cl.x.r.reps} su ${cl.x.t}. Prossima volta tieni ${fmt(cl.p.r.kg)} kg.` };
  // 2) prima serie leggera
  const top = v[e.indexOf(later)];
  if (later > e[0] * 1.08 && (f.t == null || f.r.reps >= f.t || f.r.eff === "easy") && (top.t == null || top.r.reps >= top.t))
    return { kind: "light", cls: "up", pct: drop, msg: `S1 leggera: ${pushed.length ? `hai spinto dopo (${listIt(pushed)} oltre il target)` : "le serie dopo valgono di più"}. Prossima volta parti più pesante.` };
  // 3) stesso peso: conta il calo di reps (10 → 9 → 8 normale, 10 → 8 → 6 forte)
  if (same) {
    const rd = Math.round((l.r.reps / f.r.reps - 1) * 1000) / 10, rr = `${f.r.reps} → ${l.r.reps} reps`;
    if (rd >= -20) return { kind: "ok", cls: "ok", pct: rd, msg: `Tenuta buona con lo stesso peso (${rr}).` };
    if (rd < -30) { const short = s && v.slice(1).some(x => { const g = restGap(sets[x.i - 1], x.r, ex, x.i); return g != null && g < restFor(ex) * 0.8; });
      return { kind: "drop", cls: "near", pct: rd, msg: `Calo forte con lo stesso peso (${rr}): ${short ? "recupero più corto del previsto" : "carico alto o recupero corto"}. Se si ripete, scendi di un salto.` }; }
    return { kind: "mid", cls: "", pct: rd, msg: `Un po' di calo con lo stesso peso (${rr}): normale verso la fine.` };
  }
  // 4) pesi diversi: forza stimata
  if (drop >= -12) return up ? { kind: "pyr", cls: "ok", pct: drop, msg: `Piramide ben impostata (${pc(drop)}).` } : { kind: "ok", cls: "ok", pct: drop, msg: `Tra le serie ${pc(drop)}: tenuta buona.` };
  if (drop < -20) return { kind: "drop", cls: "near", pct: drop, msg: `Calo forte tra le serie (${pc(drop)}): carico alto o recupero corto.` };
  return { kind: "mid", cls: "", pct: drop, msg: `Tra le serie ${pc(drop)}: un po' di calo, normale verso la fine.` };
}
// ---------- Gratificazioni (18/11/2026): record, settimane complete di fila, traguardi ----------
function weekFull(mon) {
  const sun = (() => { const t = new Date(mon + "T12:00"); t.setDate(t.getDate() + 6); return t.toISOString().slice(0, 10); })();
  const ss = Object.values(D.sessions).filter(s => s.date >= mon && s.date <= sun && hasData(s)), byPlan = {};
  ss.forEach(s => { const p = SCHEDE.find(x => x.id === s.plan), d = p && p.days.find(x => x.id === s.day); if (!d) return; const us = dayUnitsList(d, s);
    if (us.length && us.filter(u => u.done).length / us.length >= 0.75) { byPlan[p.id] = byPlan[p.id] || new Set(); byPlan[p.id].add(d.id); } });
  return Object.entries(byPlan).some(([id, set]) => set.size >= SCHEDE.find(x => x.id === id).days.length);
}
const prevMon = mon => { const t = new Date(mon + "T12:00"); t.setDate(t.getDate() - 7); return t.toISOString().slice(0, 10); };
function streakInfo() {
  const cur = weekStart(todayISO()); let n = weekFull(cur) ? 1 : 0, w = prevMon(cur), k = 0;
  while (k++ < 156 && weekFull(w)) { n++; w = prevMon(w); }
  const first = Object.values(D.sessions).filter(hasData).map(s => s.date).sort()[0]; let best = 0, run = 0;
  if (first) for (let m = weekStart(first), g = 0; m <= cur && g < 400; g++) { const t = new Date(m + "T12:00"); if (weekFull(m)) best = Math.max(best, ++run); else if (m !== cur) run = 0; t.setDate(t.getDate() + 7); m = t.toISOString().slice(0, 10); }
  return { n, best: Math.max(best, n) };
}
function celebrate(title, sub) {
  let el = $("cel"); if (!el) { el = document.createElement("div"); el.id = "cel"; el.className = "cel"; document.body.appendChild(el); el.onclick = () => el.classList.remove("on"); }
  el.innerHTML = `<b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ""}`; el.classList.remove("on"); void el.offsetWidth; el.classList.add("on");
  try { navigator.vibrate && navigator.vibrate([30, 40, 30]); } catch (e) {} clearTimeout(el._t); el._t = setTimeout(() => el.classList.remove("on"), 2600);
}
const MILESTONES = [5, 10, 25, 50, 75, 100, 150, 200, 300, 500];
// ---------- Report per il PT a fine scheda (17/11/2026): testo da mandare (WhatsApp/mail) prima della scheda nuova ----------
function ptReport() {
  const p = plan(), all = Object.values(D.sessions).filter(s => s.plan === p.id && hasData(s)).sort((a, b) => a.date < b.date ? -1 : 1);
  const gn = g => (GYMS.find(x => x.id === g) || {}).name || g, short = g => gn(g).split(" ")[0];
  const dd = iso => new Date(iso + "T12:00").toLocaleDateString("it-IT", { day: "numeric", month: "numeric" });
  const n = all.length, days = p.from ? Math.max(1, Math.round((new Date(todayISO()) - new Date(p.from)) / 864e5) + 1) : null;
  const perGym = GYMS.map(g => `${short(g.id)} ${all.filter(s => s.gym === g.id).length}`).join(" · ");
  const L = [`📋 REPORT ${p.name.toUpperCase()}`, `Dal ${dd(p.from || (all[0] || {}).date || todayISO())} al ${dd(todayISO())}${days ? ` · ${Math.ceil(days / 7)} ${Math.ceil(days / 7) === 1 ? "settimana" : "settimane"}` : ""} · ${n} sedute (${perGym})`];
  const subs = {}, skips = {}, pains = {}; let rN = 0, rS = 0, rP = 0, buddy = 0, backs = 0;
  for (const d of p.days) {
    const ds = all.filter(s => s.day === d.id); L.push("", `${d.id} · ${d.name} (${ds.length} ${ds.length === 1 ? "volta" : "volte"})`);
    for (const ex of d.ex) {
      if (ex.nolog) continue;
      const parts = [];
      for (const g of GYMS) {
        const ss = ds.filter(s => s.gym === g.id && home(s) && !isOffDay(s) && !oooOff(s, ex.key) && exHas(s, ex.key, ""));
        const bs = ss.map(s => bestSet(exSets(s, ex.key), ex.bw)).filter(Boolean); if (!bs.length) continue;
        const a = bs[0], b = bs[bs.length - 1], pc = a.v ? (b.v / a.v - 1) * 100 : 0;
        const f = r => r.kg != null ? `${fmt(r.kg)}×${r.reps}` : `${r.reps} reps`;
        parts.push(`${short(g.id)} ${bs.length > 1 ? `${f(a.r)} → ${f(b.r)} (${pc >= 0 ? "+" : "−"}${Math.abs(pc).toFixed(0)}%)` : f(a.r)}${!ex.bw && stallInfo(ex, g.id) ? " ⏸ fermo" : ""}`);
      }
      let done = 0, clean = 0, hard = 0, easy = 0;
      for (const s of ds) { if (subOf(s, ex.key)) { const k = subOf(s, ex.key); subs[`${ex.name} → ${k}`] = (subs[`${ex.name} → ${k}`] || 0) + 1; continue; }
        if (isSkip(s, ex.key)) skips[ex.name] = (skips[ex.name] || 0) + 1; if (hasPain(s, ex.key)) pains[ex.name] = (pains[ex.name] || 0) + 1;
        exSets(s, ex.key).forEach((r, i) => { if (!r || r.reps == null) return; done++; if (!r.dirty) clean++; if (r.eff === "hard") hard++; if (r.eff === "easy") easy++;
          if (i > 0) { const gp = restGap(exSets(s, ex.key)[i - 1], r, ex, i); if (gp != null) { rN++; rS += gp; rP += restFor(ex); } } }); }
      if (!done && !parts.length) { L.push(`• ${ex.name}: non fatto`); continue; }
      const tk = {}; ds.filter(s => home(s) && !isOffDay(s) && !subOf(s, ex.key)).forEach(s => { const tr = setsTrend(ex, exSets(s, ex.key), s); if (tr && ["climb", "drop", "light"].includes(tr.kind)) tk[tr.kind] = (tk[tr.kind] || 0) + 1; });
      const notes = [done ? `pulite ${Math.round(clean / done * 100)}%` : "", tk.climb ? `ultima serie crolla dopo la salita ${tk.climb}×` : "", tk.drop ? `calo forte tra le serie ${tk.drop}×` : "", tk.light ? `S1 leggera ${tk.light}×` : "", hard ? `al limite ${hard}` : "", easy ? `facili ${easy}` : "", pains[ex.name] ? `⚠ fastidio ${pains[ex.name]}×` : ""].filter(Boolean).join(", ");
      L.push(`• ${ex.name}: ${parts.join(" · ") || "—"}${notes ? `\n   ${notes}` : ""}`);
    }
  }
  all.forEach(s => { if (isBuddy(s)) buddy++; if (condition(s).hold) backs++; });
  const extra = [
    Object.keys(subs).length ? `Sostituiti: ${Object.entries(subs).map(([k, v]) => `${k} (${v})`).join("; ")}` : "",
    Object.keys(skips).length ? `Non fatti: ${Object.entries(skips).map(([k, v]) => `${k} (${v})`).join("; ")}` : "",
    Object.keys(pains).length ? `Fastidi: ${Object.entries(pains).map(([k, v]) => `${k} (${v})`).join("; ")}` : "",
    (() => { const r = Object.entries(D.resets || {}).filter(([k]) => p.days.some(d => d.ex.some(e => e.key === k))); return r.length ? `Ripartito da zero (esecuzione corretta, carichi abbassati): ${r.map(([k, v]) => `${(p.days.flatMap(d => d.ex).find(e => e.key === k) || {}).name || k} dal ${dd(v)}`).join("; ")}` : ""; })(),
    rN ? `Recupero medio tra le serie: ~${fmtSec(Math.round(rS / rN / 5) * 5)} (previsto ~${fmtSec(Math.round(rP / rN / 5) * 5)})` : "",
    buddy ? `Sedute in 2: ${buddy}` : "", backs ? `Rientri dopo pause: ${backs}` : "",
    (() => { const w = [...deloadWeeks()].filter(x => x >= weekStart(p.from || x)).sort(); return w.length ? `Settimana di scarico dal ${w.map(dd).join(", dal ")}` : ""; })()
  ].filter(Boolean);
  if (extra.length) L.push("", "Note", ...extra.map(x => "• " + x));
  L.push("", "Legenda: kg×reps della serie migliore pulita, prima → ultima seduta; % = forza stimata. ⏸ = nessun miglioramento nelle ultime 3 sedute.");
  return L.join("\n");
}
function openReport() {
  const sh = $("isheet"), txt = ptReport(); closeSheet(); S.sheet = null;
  setTimeout(() => {
    sh.querySelector(".is-h").innerHTML = `<b>Report per il PT</b><div class="rx"><span>da mandargli prima della scheda nuova</span></div>`;
    sh.querySelector(".is-c").innerHTML = `<div class="rep"><div class="rep-b"><button type="button" class="btn primary" id="repShare">Condividi</button><button type="button" class="btn" id="repCopy">Copia</button></div><pre>${esc(txt)}</pre></div>`;
    sh.hidden = false; document.documentElement.classList.add("noscroll"); sh.classList.remove("on"); void sh.offsetWidth; sh.classList.add("on");
    $("repShare").onclick = async () => { try { if (navigator.share) { await navigator.share({ title: "Report scheda", text: txt }); return; } } catch (e) { if (e && e.name === "AbortError") return; } copyText(txt); };
    $("repCopy").onclick = () => copyText(txt);
  }, 230);
}
function copyText(t) { (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast("Report copiato"), () => { const a = document.createElement("textarea"); a.value = t; document.body.appendChild(a); a.select(); try { document.execCommand("copy"); toast("Report copiato"); } catch (e) {} a.remove(); }); }
// ---------- Oggi: sostituisci / fastidio / salta (per esercizio, per seduta) ----------
function setExMap(field, key, val) { const x = JSON.parse(JSON.stringify(current())); x[field] = { ...(x[field] || {}) }; if (val == null || val === false) delete x[field][key]; else x[field][key] = val; x.updatedAt = Date.now(); D.sessions[x.id] = x; save(); renderLog(); }
function exAct(ex, a, undo) {
  const s = current(); closeSheet();
  if (a === "subx") { S.subEdit = null; return renderLog(); }
  if (a === "sub") { S.subEdit = null; if (undo || subOf(s, ex.key)) return setExMap("sub", ex.key, null); S.subEdit = ex.key; return renderLog(); }
  if (a === "later") { setExMap("later", ex.key, undo ? null : !isLater(s, ex.key));
    if (!undo && isLater(current(), ex.key)) { S.exOpen.delete(ex.key); const d = dayObj(), n = nextOpenUnit(d, d.ex.findIndex(e => e.key === ex.key));
      renderLog(); if (n && n.k !== ex.key) { openUnit(n.k); toast(`Occupato: ${ex.name} lo fai dopo`); } else toast("È l'ultimo rimasto: fallo adesso"); } return; }
  if (a === "pain") return setExMap("pain", ex.key, undo ? null : !hasPain(s, ex.key));
  if (a === "skip") { setExMap("skip", ex.key, undo ? null : !isSkip(s, ex.key));
    if (!undo && isSkip(current(), ex.key)) { // saltato: si chiude e si passa al prossimo esercizio da fare
      S.exOpen.delete(ex.key); S.open.delete(ex.key); const d = dayObj(), n = nextOpenUnit(d, d.ex.findIndex(e => e.key === ex.key));
      renderLog(); if (n) { openUnit(n.k); toast(`Saltato: ${ex.name}`); } else toast("Saltato: allenamento completato"); } }
}
function todayBanners(s, ex, painRef, rs) {
  const out = [];
  if (S.subEdit === ex.key && !subOf(s, ex.key)) {
    const used = [...new Set(gymSessions(S.gym).map(x => subOf(x, ex.key)).filter(Boolean))].reverse();
    const cat = ((window.MACCHINE || {})[ex.key] || []).filter(m => !m.gym || m.gym.includes(S.gym) ).filter(m => !used.some(u => sameSub(u, m.n)));
    out.push(`<div class="xb sub col"><label class="subin">↔ <input autocomplete="off" placeholder="Scrivi il nome della macchina o scegli sotto"></label>
      ${used.length ? `<div class="alts"><span class="altk">Già usate qui</span>${used.map(n => `<div class="alt"><button type="button" class="altn" data-alt="${esc(n)}">${machinePic(n) ? `<img src="${machinePic(n)}" alt="">` : ""}<b>${esc(n)}</b></button></div>`).join("")}</div>` : ""}
      ${cat.length ? `<div class="alts"><span class="altk">Macchine che allenano gli stessi muscoli</span>${cat.map(m => `<div class="alt"><button type="button" class="altn" data-alt="${esc(m.n)}"><b>${esc(m.n)}</b><small>${esc(m.d)}</small></button><a class="altq" href="https://www.google.com/search?tbm=isch&q=${encodeURIComponent("Panatta " + m.n)}" target="_blank" rel="noopener">Com'è fatta ↗</a></div>`).join("")}</div>` : ""}
      <button class="chip" data-undo="subx">Annulla</button></div>`);
  }
  if (subOf(s, ex.key)) { const pic = machinePic(subOf(s, ex.key));
    out.push(`<div class="xb sub"><p>↔ Oggi fai <b>${esc(subOf(s, ex.key))}</b>: ha il suo storico, quello di ${esc(ex.name)} non cambia.</p><div class="xbb"><label class="chip pic">📷 ${pic ? "Cambia foto" : "Foto macchina"}<input type="file" accept="image/*" capture="environment" hidden data-pic></label><button class="chip" data-undo="sub">Torna all'originale</button></div></div>`); }
  if (hasPain(s, ex.key)) out.push(`<div class="xb pain"><p>⚠ Fastidio segnato: la prossima volta il carico resta fermo. Se continua, dillo al PT.</p><button class="chip" data-undo="pain">Togli</button></div>`);
  else if (painRef) out.push(`<div class="xb pain"><p>⚠ Fastidio l'ultima volta (${fmtDate(rs.date).slice(0, 5)}): carico fermo. Se oggi va bene, non segnare niente e la prossima volta si riparte.</p></div>`);
  if (isLater(s, ex.key) && !exSets(s, ex.key).some(r => r && r.reps != null)) out.push(`<div class="xb"><p>⏳ Macchina occupata: lo fai dopo gli altri. Quando lo inizi, l'app tiene conto dei muscoli già stanchi.</p><button class="chip" data-undo="later">Annulla</button></div>`);
  if (isSkip(s, ex.key)) out.push(`<div class="xb skip"><p>⤼ Saltato oggi: non conta come serie dimenticate.</p><button class="chip" data-undo="skip">Annulla</button></div>`);
  return out.join("");
}
// Prescrizione del PT, sempre in evidenza sotto il nome: "3 × 10 reps" o "3 serie: 10 · 8 · 8 reps" + recupero
function rxLine(ex) {
  const ts = ex.sets.map(st => st.t + (st.type === "ced" ? " RP" : st.type === "strip" ? " strip" : "")), same = ts.every(t => t === ts[0]);
  // il recupero compare solo se il PT l'ha indicato nella scheda (campo "rest" in schede.js)
  return `<div class="rx"><b>${same ? `${ts.length} × ${esc(ts[0])}` : `${ts.length} serie: ${ts.map(esc).join(" · ")}`}</b>${hasRest(ex) ? `<span>recupero ${fmtSec(restFor(ex))}</span>` : ""}</div>`;
}
// ---------- sensazione della serie: striscia "Com'era?" sopra il timer ----------
const FEEL = { easy: { n: "Facile", b: 1 }, ok: { n: "Giusta", b: 2 }, hard: { n: "Al limite", b: 3 }, dirty: { n: "Sporca" }, help: { n: "Aiutata" } };
const feelOf = r => !r ? "ok" : r.dirty ? "dirty" : r.help ? "help" : r.eff === "easy" ? "easy" : r.eff === "hard" ? "hard" : "ok";
const feelIcon = f => f === "help" ? `<svg viewBox="0 0 18 14" class="fi"><circle cx="6" cy="4" r="2.4" fill="currentColor"/><circle cx="12.5" cy="4" r="2.4" fill="currentColor" opacity=".6"/><path d="M1.5 13c0-2.8 2-4.4 4.5-4.4s4.5 1.6 4.5 4.4z" fill="currentColor"/><path d="M8.6 13c.2-2.6 1.6-4.4 3.9-4.4 2.5 0 4 1.6 4 4.4z" fill="currentColor" opacity=".6"/></svg>` : f === "dirty" ? `<svg viewBox="0 0 18 14" class="fi"><path d="M2 8.5c2-3.4 4.2-3.4 7 0s5 3.4 7 0" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`
  : `<svg viewBox="0 0 18 14" class="fi">${[0, 1, 2].map(j => `<rect x="${1 + j * 6}" y="${10 - j * 4}" width="4" height="${4 + j * 4}" rx="1.2" fill="currentColor" opacity="${j < FEEL[f].b ? 1 : .22}"/>`).join("")}</svg>`;
let FE = null, lastField = null;
document.addEventListener("focusin", e => { if (e.target.matches && e.target.matches(".set input")) lastField = e.target; });
function openFeel(ex, i, label) {
  const box = $("feel"); if (!box || S.view !== "log") return;
  FE = { key: ex.key, i };
  const f = feelOf(exSets(current(), ex.key)[i]);
  box.innerHTML = `<div class="fq"><span>${esc(label)} · ${esc(ex.name)}</span><b>Com'era?</b></div>
    <div class="fopts${isBuddy(current()) ? " five" : ""}" role="radiogroup">${["easy", "ok", "hard", "dirty", ...(isBuddy(current()) || f === "help" ? ["help"] : [])].map(v => `<button type="button" role="radio" data-v="${v}" aria-checked="${v === f}">${feelIcon(v)}<span>${FEEL[v].n}</span></button>`).join("")}</div>`;
  box.hidden = false; box.classList.remove("in"); void box.offsetWidth; box.classList.add("in");
  // tocco affidabile anche con la tastiera aperta (touchend + preventDefault: niente "click fantasma" sotto la striscia)
  const tap = (b, fn) => { b.onmousedown = e => e.preventDefault(); let fired = 0, tx = 0, ty = 0; const fire = () => { if (Date.now() - fired < 500) return; fired = Date.now(); fn(); };
    b.addEventListener("touchstart", e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
    b.addEventListener("touchend", e => { const t = e.changedTouches[0]; if (Math.abs(t.clientX - tx) > 12 || Math.abs(t.clientY - ty) > 12) return; if (e.cancelable) e.preventDefault(); fire(); }, { passive: false }); b.onclick = fire; };
  const write = mut => { const s2 = JSON.parse(JSON.stringify(current())); s2.ex[ex.key] = s2.ex[ex.key] || [];
    while (s2.ex[ex.key].length < ex.sets.length) s2.ex[ex.key].push({ kg: null, reps: null });
    const r = { ...s2.ex[ex.key][i] }; mut(r); s2.ex[ex.key][i] = r; s2.updatedAt = Date.now(); D.sessions[s2.id] = s2; save();
    const row = $(`rp-${ex.key}-${i}`); if (row && row.closest(".set")._upd) row.closest(".set")._upd(); };
  const done = () => { const ae = document.activeElement, keep = lastField && document.contains(lastField) ? lastField : null; closeFeel();
    if (keep && ae !== keep && document.body.classList.contains("kb")) keep.focus({ preventScroll: true }); };
  // "Sporca" → subito 1 rep sporca, poi la domanda "quante?" (1 · 2 · 3+) sulla stessa striscia (18/11/2026)
  const askCount = () => { const n = dN(exSets(current(), ex.key)[i]) || 1;
    box.querySelector(".fopts").outerHTML = `<div class="fopts fcount" role="radiogroup" aria-label="Quante reps sporche?"><span class="fc-q">Quante reps<br>sporche?</span>${[1, 2, 3].map(k => `<button type="button" role="radio" data-n="${k}" aria-checked="${k === n}"><b>${k === 3 ? "3+" : k}</b><span>${k === 1 ? "l'ultima" : k === 2 ? "le ultime 2" : "3 o più"}</span></button>`).join("")}</div>`;
    box.querySelectorAll("[data-n]").forEach(b => tap(b, () => { write(r => { r.dirty = +b.dataset.n; }); done(); })); placeTimer(); };
  box.querySelectorAll("[data-v]").forEach(b => tap(b, () => { const v = b.dataset.v;
    write(r => { const was = dN(r); delete r.dirty; delete r.eff; delete r.help; if (v === "dirty") r.dirty = was || 1; else if (v === "help") r.help = true; else if (v !== "ok") r.eff = v; });
    if (v === "dirty") askCount(); else done(); }));
  placeTimer();
}
function closeFeel() { FE = null; const box = $("feel"); if (box && !box.hidden) { box.hidden = true; placeTimer(); } }
// ---------- recupero reale tra le serie (17/11/2026) ----------
// r.at = quando hai scritto le reps; recupero ≈ tempo tra le reps di due serie consecutive − SET_SEC (durata della serie).
// Recupero lungo (> 1,5× il previsto e > +30"): r.lr = secondi; le reps di quella serie non contano per salire.
// "Non ha influito" → r.lrOk.
// durata stimata della serie: ~4" a rep (target del PT, o le reps fatte se di più), il doppio se "per gamba"/"per braccio"; tra 20" e 90"
const SEC_REP = 4;
function setSec(ex, i, r) {
  if (ex && (D.setDur || {})[ex.key]) return D.setDur[ex.key]; // impostata a mano nei dettagli
  const t = ex && ex.sets[i] ? tnum(ex.sets[i].t) : null, n = Math.max(t || 0, (r && r.reps) || 0) || 10;
  const uni = ex && /per (gamba|braccio|lato)/i.test((ex.tec || "") + " " + (ex.sets[i] && ex.sets[i].note || ""));
  return Math.min(90, Math.max(20, n * (uni ? 2 : 1) * SEC_REP));
}
const restGap = (a, b, ex, i) => a && b && a.at && b.at && b.at > a.at ? Math.max(0, Math.round((b.at - a.at) / 1000) - setSec(ex, i, b)) : null;
const isLong = (sec, plan, buddy) => sec != null && sec > plan * (buddy ? 2 : 1.5) && sec > plan + 30;
const lrOn = r => !!(r && r.lr && !r.lrOk);
// ---------- durata dell'allenamento: dal primo inserimento all'ultimo (sessione.t0 / t1), tasti Inizia / Fine (tEnd) ----------
function stampTime(s) { if (s.date !== todayISO()) return; const n = Date.now(); if (!s.t0) s.t0 = n; s.t1 = n; }
const fmtDur = ms => { const m = Math.max(1, Math.round(ms / 60000)); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`; };
const live = s => s.t0 && !s.tEnd && s.date === todayISO() && Date.now() - (s.t1 || s.t0) < 45 * 60000;
function durTxt(s, done) { if (!s || !s.t0) return ""; const end = s.tEnd || (live(s) && !done ? Date.now() : (s.t1 || s.t0)); return fmtDur(end - s.t0); }
const hhmm = t => new Date(t).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
// Cancella una seduta iniziata per sbaglio: due tocchi (il secondo entro 4"), poi "Annulla" per 8" nel messaggio
let delArm = 0, delUndo = null;
function delButton() {
  const s = current(); if (!D.sessions[s.id] || !(hasData(s) || s.t0)) return "";
  return `<button class="chip del${Date.now() - delArm < 4000 ? " arm" : ""}" id="sessDel">${Date.now() - delArm < 4000 ? "Tocca di nuovo per cancellare" : "🗑 Cancella seduta"}</button>`;
}
function delSession() {
  const s = current();
  if (Date.now() - delArm > 4000) { delArm = Date.now(); renderDur(); setTimeout(() => { if (Date.now() - delArm >= 4000) renderDur(); }, 4100); return; }
  delArm = 0; delUndo = JSON.parse(JSON.stringify(D.sessions[s.id])); delete D.sessions[s.id]; save();
  try { const L = JSON.parse(localStorage.getItem(LKEY)); if (L && L.date === s.date && L.gym === s.gym && L.day === s.day) localStorage.removeItem(LKEY); } catch (e) {}
  if (running() || T.left != null) stopRest();
  closeFeel(); togglePanel(false); renderLog(); scrollTo({ top: 0 });
  const el = $("toast"); el.innerHTML = `Seduta cancellata <button type="button" id="undoDel">Annulla</button>`; el.hidden = false; clearTimeout(toastT);
  $("undoDel").onclick = () => { if (delUndo) { D.sessions[delUndo.id] = delUndo; delUndo = null; save(); renderLog(); } el.hidden = true; };
  toastT = setTimeout(() => { el.hidden = true; delUndo = null; }, 8000);
}
function renderDur() {
  const box = $("dur"); if (!box) return; const s = current(), today = S.date === todayISO();
  box.innerHTML = s.t0
    ? `<span class="durv">⏱ <b>${durTxt(s)}</b> · dalle ${hhmm(s.t0)}${s.tEnd ? ` alle ${hhmm(s.tEnd)}` : s.t1 && !live(s) ? ` alle ${hhmm(s.t1)}` : ""}</span>${s.tEnd ? `<button class="chip" id="durGo">Riprendi</button>` : today ? `<button class="chip" id="durEnd">🏁 Fine allenamento</button>` : ""}`
    : today ? `<span class="durv">⏱ parte da solo alla prima serie</span><button class="chip" id="durStart">▶ Inizia ora</button>` : "";
  box.insertAdjacentHTML("beforeend", delButton()); const dl = $("sessDel"); if (dl) dl.onclick = delSession;
  const st = $("durStart"), en = $("durEnd"), go = $("durGo");
  if (st) st.onclick = () => setSess({ t0: Date.now() });
  if (en) en.onclick = () => { setSess({ tEnd: Date.now(), t1: Date.now() }); togglePanel(false); scrollTo({ top: 0, behavior: "smooth" }); };
  if (go) go.onclick = () => { const x = JSON.parse(JSON.stringify(current())); delete x.tEnd; D.sessions[x.id] = x; save(); renderLog(); };
}
setInterval(() => { const s = current && current(); if (s && live(s) && S.view !== "prog") { renderConsole(); renderDur(); } }, 30000);
// ---------- recap a fine allenamento (tutti gli esercizi fatti, oppure "Fine allenamento") ----------
const e1 = (r, bw) => !r || r.reps == null ? 0 : bw || !r.kg ? r.reps : r.kg * (1 + r.reps / 30);
const durWords = m => { m = Math.max(1, m || 0); const h = Math.floor(m / 60), r = m % 60, hs = `${h} ${h === 1 ? "ora" : "ore"}`, rs = `${r} ${r === 1 ? "minuto" : "minuti"}`; return !h ? rs : !r ? hs : `${hs} e ${rs}`; };
function recapCard(d, s, units) {
  const done = units.filter(u => u.done).length;
  if (!hasData(s) || (done < units.length && !s.tEnd)) return null;
  let nSet = 0, nDone = 0, clean = 0, vol = 0, volPrev = 0, nE = 0, nH = 0, nA = 0, nEx = 0; const upEx = [], better = [], worse = [], recs = [], rests = [], painEx = [], skipEx = [];
  const ok1 = okRec, bud = isBuddy(s); let push1 = 0, dirty2 = 0, dirty3 = 0; // serie con 1 sporca = "hai spinto"; 2+ = da sistemare
  const prevDay = gymSessions(S.gym).filter(x => x.day === s.day && x.date < s.date && home(x) && hasData(x)).pop();
  d.ex.forEach((ex, idx) => {
    if (isCircNoLog(d, idx)) return;
    const cur = exSets(s, ex.key), sk = isSkip(s, ex.key), sb = subOf(s, ex.key), nm = sb || ex.name;
    if (sk) skipEx.push(nm); if (hasPain(s, ex.key)) painEx.push(nm);
    if (sk && !cur.some(r => r && r.reps != null)) return;
    nEx++;
    ex.sets.forEach((st, i) => { const r = cur[i]; if ((sk || i >= need(ex, s)) && !(r && r.reps != null)) return; nSet++; if (r && r.reps != null) { nDone++; const dn = dN(r); if (dn === 1) push1++; else if (dn === 2) dirty2++; else if (dn >= 3) dirty3++; if (!r.dirty) { clean++; if (r.help) nA++; else if (r.eff === "easy") nE++; else if (r.eff === "hard") nH++; } vol += (r.kg || 0) * r.reps; }
      if (i > 0 && !circGroup(d, idx)) { const g = restGap(cur[i - 1], r, ex, i); if (g != null) rests.push({ g, p: restFor(ex), long: lrOn(r) }); } });
    if (!cur.some(r => r && r.reps != null)) return;
    if (!ex.bw && !hasPain(s, ex.key)) { const stv = sb ? null : stepFor(ex.key).v, pv = gymSessions(S.gym).filter(x => x.date < s.date && home(x) && exHas(x, ex.key, sb)).pop(), ps = pv ? exSets(pv, ex.key) : [];
      if (ex.sets.some((st, i) => { const r = cur[i], a = r && r.reps != null ? advise(r, ps[i], tnum(st.t), stv, 1) : null; return a && a.kg > r.kg; })) upEx.push(nm); }
    if (prevDay) exSets(prevDay, ex.key).forEach(r => { if (r && r.reps != null) volPrev += (r.kg || 0) * r.reps; });
    const best = Math.max(0, ...cur.filter(ok1).map(r => e1(recR(r), ex.bw)));
    const before = gymSessions(S.gym).filter(x => x.date < s.date && home(x) && exHas(x, ex.key, sb));
    const last = before[before.length - 1], lb = last ? Math.max(0, ...exSets(last, ex.key).filter(ok1).map(r => e1(recR(r), ex.bw))) : 0;
    const allBest = Math.max(0, ...before.flatMap(x => exSets(x, ex.key).filter(ok1).map(r => e1(recR(r), ex.bw))));
    if (best && lb) { const pc = (best / lb - 1) * 100; if (pc >= 0.5) better.push({ n: nm, pc }); else if (pc <= -0.5) worse.push({ n: nm, pc }); }
    if (best && allBest && best > allBest + 1e-9) recs.push(nm);
  });
  const pcs = x => `${x.pc > 0 ? "+" : "−"}${Math.abs(x.pc).toFixed(Math.abs(x.pc) < 10 ? 1 : 0).replace(".", ",")}%`;
  const vd = prevDay && volPrev ? (vol / volPrev - 1) * 100 : null, dirty = nDone - clean, cp = nDone ? clean / nDone : 1, miss = nSet - nDone;
  const nLong = rests.filter(x => x.long).length, avgR = rests.length ? rests.reduce((a, x) => a + x.g, 0) / rests.length : null, avgP = rests.length ? rests.reduce((a, x) => a + x.p, 0) / rests.length : null;
  const durMin = s.t0 ? Math.round(((s.tEnd || s.t1 || s.t0) - s.t0) / 60000) : null;
  const pastD = gymSessions(S.gym).filter(x => x.day === s.day && x.date < s.date && x.t0 && x.t1 && isBuddy(x) === bud).slice(-5).map(x => ((x.tEnd || x.t1) - x.t0) / 60000);
  const usual = pastD.length >= 2 ? pastD.reduce((a, b) => a + b, 0) / pastD.length : null, special = isOffDay(s) || isAway(s);
  // ---- il verdetto: incoraggia o cazzia, con i motivi concreti ----
  let sc = 0; const good = [], bad = [];
  if (recs.length) { sc += Math.min(4, recs.length * 2); good.push(`${recs.length === 1 ? "Un record" : recs.length + " record"}: ${listIt(recs)}`); }
  if (better.length && better.length >= Math.ceil(nEx / 2)) { sc += 2; good.push(`Meglio dell'ultima volta in ${better.length} esercizi su ${nEx}`); }
  const heavy = dirty2 + dirty3; // serie sporche davvero (2+ reps): quelle con 1 sola sono una spinta, non un errore
  if (nDone && (nDone - heavy) / nDone >= 0.9 && !dirty3) { sc += 1; good.push(push1 ? `Hai spinto in ${push1} ${push1 === 1 ? "serie" : "serie"} (1 rep sporca): così si cresce` : `Esecuzione pulita: ${Math.round(cp * 100)}% delle serie`); }
  if (rests.length >= 4 && !nLong) { sc += 1; good.push(bud ? "Recuperi rispettati anche in 2" : "Recuperi rispettati"); }
  if (!miss) sc += 1;
  { const tot = Object.values(D.sessions).filter(x => hasData(x) && x.date <= s.date).length; if (MILESTONES.includes(tot)) good.unshift(`🎖 ${tot}ª seduta registrata: costanza da campione`); }
  if (heavy >= 3 || dirty3) { sc -= 2; bad.push(dirty3 ? `${dirty3 === 1 ? "Una serie" : dirty3 + " serie"} con 3+ reps sporche${dirty2 ? ` e ${dirty2} con 2` : ""}: lì il carico era troppo. Prima la tecnica, poi il peso.` : `${heavy} serie con 2 reps sporche: stai caricando più di quello che controlli. Prima la tecnica, poi il peso.`); }
  if (bud && nLong) bad.push(`In 2: ${nLong === 1 ? "una serie" : nLong + " serie"} con recupero oltre il doppio (media ${fmtSec(Math.round(avgR))}). Quelle reps non contano per salire.`);
  else if (nLong >= 3 || (rests.length >= 4 && nLong / rests.length >= 0.25)) { sc -= 2; bad.push(`Hai riposato troppo in ${nLong} serie (media ${fmtSec(Math.round(avgR))} invece di ${fmtSec(Math.round(avgP))}). Rispetta il timer: le reps devono venire dal muscolo, non dalla pausa.`); }
  else if (nLong) bad.push(`${nLong === 1 ? "Una serie" : nLong + " serie"} con recupero lungo: quelle reps non contano per salire.`);
  if (miss >= 2) { sc -= 2; bad.push(`${miss} serie non fatte: la scheda va chiusa tutta.`); }
  if (worse.length >= 2 && !special) { sc -= worse.length >= 3 ? 2 : 1; bad.push(`Sotto l'ultima volta in ${worse.length} esercizi. Se eri stanco segnalo in "Come stai oggi": l'app abbassa i carichi e non ti penalizza.`); }
  if (nDone >= 6 && nE / nDone >= 0.4) { sc -= 1; bad.push(`${nE} serie facili: ti stai risparmiando. La prossima volta spingi, i carichi salgono.`); }
  if (nDone >= 6 && (nH + heavy) / nDone > 0.7) { sc -= 1; bad.push("Quasi tutte le serie al limite o sporche: carichi troppo alti per oggi, consolida prima di salire."); }
  if (painEx.length) bad.push(`Fastidio a ${listIt(painEx)}: carico fermo la prossima volta. Se continua, dillo al PT.`);
  if (nA) good.push(`${nA === 1 ? "Una serie aiutata" : nA + " serie aiutate"}: valgono per il volume, non per salire`);
  if (!bud && usual && durMin && durMin > usual * 1.25 && durMin - usual >= 10) bad.push(`${Math.round(durMin - usual)} minuti più del solito: occhio alle pause tra un esercizio e l'altro.`);
  const head = special ? ["🙂", "Giornata particolare", "conta esserci stato: i dati di oggi non pesano sui progressi."]
    : sc >= 4 && bad.length < 2 && heavy < 3 && dirty3 < 2 ? ["🔥", "Allenamento da applausi", "così si cresce. Continua così."]
    : sc >= 1 ? ["👍", "Buon allenamento", bad.length ? "ma c'è margine: guarda sotto." : "solido, avanti così."]
    : sc >= -2 ? ["⚠️", "Oggi si poteva fare meglio", "niente drammi, ma sistema questo:"]
    : ["😤", "Così non cresci", "serve più testa in sala:"];
  const el = document.createElement("section"); el.className = "recap" + (sc <= 0 && !special ? " meh" : "");
  el.innerHTML = `<div class="rc-h"><span class="rc-k">Recap · ${esc(d.id)}${bud ? " · 👥 in 2" : ""}${isAway(s) ? " · 📍 " + esc(s.site || "altra sede") : ""}</span><b>🏁 Allenamento completato</b>${s.t0 ? `<small>Durata <b class="rc-dur">${durWords(durMin)}</b> · dalle ${hhmm(s.t0)} alle ${hhmm(s.tEnd || s.t1)}</small>` : ""}</div>
    <div class="rc-v"><p><span>${head[0]}</span><b>${head[1]}</b> ${head[2]}</p>
      ${good.slice(0, 2).map(x => `<p class="g">✓ ${esc(x)}</p>`).join("")}${bad.slice(0, 3).map(x => `<p class="b">! ${esc(x)}</p>`).join("")}</div>
    <div class="rc-g">
      <div><span>Durata</span><b>${durMin != null ? (durMin < 60 ? `${Math.max(1, durMin)}<i> min</i>` : `${Math.floor(durMin / 60)}<i> h </i>${String(durMin % 60).padStart(2, "0")}<i> min</i>`) : "—"}</b>${usual && durMin ? `<small class="${durMin <= usual ? "up" : "dn"}">${durMin <= usual ? "−" : "+"}${Math.abs(Math.round(durMin - usual))} min vs solito</small>` : ""}</div>
      <div><span>Serie</span><b>${nDone}<i>/${nSet}</i></b>${avgR != null ? `<small>recupero ~${fmtSec(Math.round(avgR / 5) * 5)}</small>` : ""}</div>
      <div><span>Pulite</span><b>${Math.round(cp * 100)}<i>%</i></b></div>
      <div><span>Volume</span><b>${Math.round(vol).toLocaleString("it-IT")}<i> kg</i></b>${vd != null ? `<small class="${vd >= 0 ? "up" : "dn"}">${vd >= 0 ? "+" : "−"}${Math.abs(vd).toFixed(0)}% vs ${new Date(prevDay.date + "T12:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" })}</small>` : ""}</div>
    </div>
    ${better.length ? `<p class="rc-l up">↑ <b>Meglio dell'ultima volta:</b> ${better.sort((a, b) => b.pc - a.pc).map(x => `${esc(x.n)} ${pcs(x)}`).join(" · ")}</p>` : ""}
    ${(() => { if (special) return ""; const k = d.ex.map(e => ({ e, tr: subOf(s, e.key) ? null : setsTrend(e, exSets(s, e.key), s) })).filter(x => x.tr && ["climb", "drop", "light"].includes(x.tr.kind));
      return k.length ? `<p class="rc-l">↕ <b>Tra le serie:</b> ${k.map(x => `${esc(x.e.name)}: ${{ climb: "salita troppo", drop: "calo forte", light: "S1 leggera" }[x.tr.kind]}`).join(" · ")}</p>` : ""; })()}
    ${worse.length ? `<p class="rc-l dn">↓ <b>Sotto l'ultima volta:</b> ${worse.map(x => `${esc(x.n)} ${pcs(x)}`).join(" · ")}${special ? " (giornata particolare, non conta)" : ""}</p>` : ""}
    ${skipEx.length ? `<p class="rc-l">⤼ <b>Saltati oggi:</b> ${esc(listIt(skipEx))}</p>` : ""}
    <div class="rc-feel" aria-label="Com'erano le serie">${["easy", "ok", "hard", "dirty", "help"].map(f => { const n = f === "easy" ? nE : f === "hard" ? nH : f === "dirty" ? dirty : f === "help" ? nA : clean - nE - nH - nA; return n ? `<span data-f="${f}"><i>${feelIcon(f)}</i>${n} ${FEEL[f].n.toLowerCase()}</span>` : ""; }).join("")}</div>
    ${needBackup() ? `<button type="button" class="rc-bk" data-bk>💾 Salva il backup <small>File → iCloud Drive · i dati sono solo su questo telefono</small></button>` : ""}
    <p class="rc-l nx">→ <b>Prossima volta:</b> ${reduced(s) ? "si riparte dai carichi dell'ultima seduta normale" : !upEx.length ? "stessi carichi, punta alle reps piene" : upEx.length <= 3 ? `carico su in ${esc(listIt(upEx))}` : `carico su in ${upEx.length} esercizi`}.</p>`;
  return el;
}
function renderLog() {
  if (S.sheet || $("isheet")._card) { $("isheet").querySelector(".is-c").textContent = ""; $("isheet")._card = null; }
  renderLog0();
  if (S.sheet) { if (document.querySelector(`.ex[data-ex="${S.sheet}"]`)) openSheet(S.sheet); else closeSheet(); }
}
function renderLog0() {
  PIC.clear(); renderConsole(); renderWeek(); renderSite(); renderDur();
  const p = plan(), d = dayObj(), sess = current();
  // forma del giorno
  const cond = condition(sess);
  $("ready").innerHTML = Object.entries(READY).map(([k, v]) => `<button data-r="${k}" aria-pressed="${(sess.readiness || "ok") === k}">${v.n}</button>`).join("");
  $("ready").querySelectorAll("button").forEach(b => b.onclick = () => { setSess({ readiness: b.dataset.r }); togglePanel(false); });
  const pi = pauseInfo(S.date);
  $("pauseNag").innerHTML = pi.back && !sess.ignorePause
    ? `<div class="nag info"><span><b>Rientro dopo ${pi.days} giorni.</b> Oggi rifai i carichi dell'ultima volta, senza aumenti. Se una serie viene 3 reps o più sotto il target, scendi di un salto nella serie dopo.${pi.days >= 35 ? " Dopo più di 5 settimane usa la prima serie come prova." : ""} Non conta per i progressi.</span><button class="btn sm" id="noPause">Non è un rientro</button></div>`
    : sess.ignorePause && pi.back ? `<div class="nag info"><span>Pausa di ${pi.days} giorni ignorata.</span><button class="btn sm" id="noPause">Riattiva</button></div>` : "";
  if ($("noPause")) $("noPause").onclick = () => setSess({ ignorePause: !sess.ignorePause });
  { const wk = weekStart(todayISO()), stalls = plan().days.flatMap(dd => dd.ex.filter(e => !e.nolog && stallInfo(e, S.gym)).map(e => e.name));
    let h = "";
    if (D.prefs.deload === wk) h = `<div class="nag info"><span><b>Settimana di scarico.</b> Carichi −35% e una serie in meno per esercizio (2 invece di 3). Non conta per i progressi: serve a recuperare e ripartire più forte.</span><button class="btn sm" id="dlOff">Annulla</button></div>`;
    else if (stalls.length >= 3 && D.prefs.deloadAsk !== wk && ![...deloadWeeks()].some(w => w < wk && (new Date(wk) - new Date(w)) / 864e5 <= 28)) h = `<div class="nag"><span>⏸ <b>${stalls.length} esercizi fermi da 3 sedute.</b> Valuta una settimana di scarico (meglio sentire il PT).</span><button class="btn sm" id="dlOn">Scarico</button><button class="btn sm ghost" id="dlNo">Non ora</button></div>`;
    $("pauseNag").insertAdjacentHTML("beforeend", h);
    if ($("dlOff")) $("dlOff").onclick = () => { delete D.prefs.deload; D.prefs.deloads = (D.prefs.deloads || []).filter(w => w !== wk); save(); renderLog(); };
    if ($("dlOn")) $("dlOn").onclick = () => { D.prefs.deload = wk; D.prefs.deloads = [...new Set([...(D.prefs.deloads || []), wk])]; save(); renderLog(); toast("Settimana di scarico attiva"); };
    if ($("dlNo")) $("dlNo").onclick = () => { D.prefs.deloadAsk = wk; save(); renderLog(); }; }
  // promemoria backup
  const ds = daysSince(D.prefs.lastBackup), nSess = Object.keys(D.sessions).length, since = sessSinceBackup();
  $("backupNag").innerHTML = nSess >= 1 && needBackup() ? `<div class="nag"><span>💾 ${ds == null ? "Non hai ancora un backup." : `Ultimo backup ${ds} ${ds === 1 ? "giorno" : "giorni"} fa`}${since ? ` · ${since} ${since === 1 ? "seduta nuova" : "sedute nuove"}` : ""}. I dati stanno solo su questo telefono: salvalo in File → iCloud Drive.</span><button class="btn sm" id="nagBk">Salva</button></div>` : "";
  if ($("nagBk")) $("nagBk").onclick = exportBackup;

  const list = $("list"); list.textContent = "";
  { const rc = recapCard(d, sess, dayUnitsList(d, sess)); if (rc) { list.appendChild(rc); const bk = rc.querySelector("[data-bk]"); if (bk) bk.onclick = exportBackup; } }
  const units = dayUnitsList(d, sess), curU = currentUnit(d, sess, units);
  S.sig = units.filter(u => unitOpen(u, curU)).map(u => u.keys[0]).join(",") + "|" + (curU ? curU.keys[0] : "");
  let exN = 0;
  d.ex.forEach((ex, idx) => {
    const u = units.find(x => x.keys[0] === ex.key);
    if (!u) return; // membro di circuito già mostrato
    exN = u.n;
    if (!unitOpen(u, curU)) { list.appendChild(miniCard(u, sess)); return; }
    const cg0 = isCircNoLog(d, idx);
    if (cg0) { list.appendChild(circCard(d, cg0, exN, u === curU)); return; }
    const last = lastBefore(ex.key), lastSets = last ? exSets(last, ex.key) : [];
    const rs = lastRef(ex.key), refSets = rs ? exSets(rs, ex.key) : [], hit1 = rs ? allHit(refSets, ex) && allClean(refSets) : false, pr = hit1 ? prevRef(ex.key, rs) : null,
      hit = hit1 && !!pr && allHit(exSets(pr, ex.key), ex) && allClean(exSets(pr, ex.key)), cond = condition(sess), sbN = subOf(sess, ex.key), stp = ex.bw || sbN ? { v: null } : stepFor(ex.key);
    const pr2 = rs ? prevRef(ex.key, rs) : null, prSets = pr2 ? exSets(pr2, ex.key) : [], nUp = i => easy2(refSets[i], prSets[i], tnum(ex.sets[i].t)) ? 2 : 1;
    const painRef = rs && hasPain(rs, ex.key);
    const trRef = rs && !subOf(rs, ex.key) ? setsTrend(ex, exSets(rs, ex.key), rs) : null;
    const advise2 = (r, pl, t, step, f, n) => { let a = advise(r, pl, t, step, f, n);
      if (a && r && trRef && f >= 1 && !cond.hold) { const i = refSets.indexOf(r);
        if (trRef.kind === "light" && i === 0 && a.kg > r.kg && step && !a.mode && a.kg < r.kg + 2 * step - 1e-9) a = { ...a, kg: r2(r.kg + 2 * step), why: "S1 leggera l'ultima volta: un salto in più" };
        if (trRef.kind === "climb" && i === trRef.last && a.kg > trRef.keep) a = { ...a, kg: trRef.keep, why: "Salita troppo l'ultima volta: tieni il carico della serie prima" }; }
      if (a && cond.hold && r && r.kg != null && (a.kg > r.kg || (t != null && a.reps > t))) return { kg: Math.min(a.kg, r.kg), reps: t, why: "Rientro: stessi carichi dell'ultima volta", mode: "back" };
      return a && painRef && r && a.kg > r.kg ? { kg: r.kg, reps: t, why: "Fastidio l'ultima volta: carico fermo finché non passa", mode: "pain" } : a; };
    const ref = sbN || resetOf(ex.key) ? null : ex.ref && ex.ref[S.gym];
    const stl = ex.bw ? null : stallInfo(ex, S.gym, S.date);
    const trendToday = sbN ? null : setsTrend(ex, exSets(sess, ex.key), sess);
    // record di sempre per questo esercizio in questa palestra (serie pulite, non aiutate, sedute normali precedenti)
    const prBest = ex.bw ? 0 : Math.max(0, ...gymSessions(S.gym).filter(x => x.date < S.date && home(x) && exHas(x, ex.key, sbN)).flatMap(x => exSets(x, ex.key).filter(r => okRec(r) && r.kg != null && r.reps != null).map(r => e1rm(r.kg, r.reps))));
    const isPR = r => prBest > 0 && okRec(r) && r.kg != null && r.reps != null && e1rm(r.kg, cleanR(r)) > prBest * 1.001 && !isOffDay(sess) && home(sess);
    // riscaldamento: primo esercizio del giorno o primo che lavora muscoli nuovi; 50%×10 · 70%×5 · 85%×2 del carico di S1, al salto disponibile
    const warm = (() => {
      if (ex.bw || sbN || isCircNoLog(d, idx)) return "";
      const before = d.ex.slice(0, idx).filter(e => !e.nolog), seen = new Set(before.flatMap(e => (e.m && e.m.p) || []));
      if (before.length && ((ex.m && ex.m.p) || []).some(m => seen.has(m))) return "";
      const a0 = refSets[0] ? advise2(refSets[0], prSets[0], tnum(ex.sets[0].t), stp.v, cond.f, nUp(0)) : null, base = a0 && a0.kg;
      if (!base || base < 15) return "";
      const st = stp.v || 2.5, out = []; for (const [p, r] of [[0.5, 10], [0.7, 5], [0.85, 2]]) { const k = Math.floor(base * p / st) * st; if (k > 0 && !out.some(o => o.k === k)) out.push({ k, r }); }
      return out.map(o => `<em><b>${fmt(o.k)}</b> kg × ${o.r}</em>`).join("");
    })();
    // riga "CARICO" del blocco info: cosa fare oggi con il peso e perché
    let pills = "", load = null;
    if (rs && cond.f < 1) load = { c: "near", t: `↓ Oggi −${Math.round((1 - cond.f) * 100)}%: ${esc(cond.why)}` };
    else if (rs && cond.hold) load = { c: "", t: `= Rientro dopo ${cond.p.days} giorni: stessi carichi dell'ultima volta, niente aumenti oggi.` };
    else if (rs) {
      const lab = i => { let n = 0, out = ""; ex.sets.forEach((st, j) => { if (!st.type || ["std", "alte", "pausa", "risc"].includes(st.type)) n++; if (j === i) out = st.type === "ced" ? "RP" : st.type === "strip" ? "ST" : st.type === "super" ? "SS" : "S" + n; }); return out; };
      const ix = f => ex.sets.map((st, i) => f(refSets[i], tnum(st.t)) ? i : -1).filter(i => i >= 0), names = a => listIt(a.map(lab));
      const up = ix(setUp), dirty = ix((r, t) => r && r.dirty && !setUp(r, t)), hard = ix(atLimit), dbl = up.filter(i => nUp(i) === 2), all = up.length === ex.sets.length, inc = ex.bw ? "aumenta" : stp.v ? `+${fmt(stp.v)} kg` : "sali un po'";
      // serie per serie: S1 +5 kg (facile 2 volte) · S2 stesso carico (al limite) · S3 +2,5 kg
      const advs = ex.sets.map((st, i) => ex.bw ? null : advise2(refSets[i], prSets[i], tnum(st.t), stp.v, 1, nUp(i))), special = advs.some(a => a && a.why);
      // serie con lo stesso esito raggruppate ("S1 e S2: +2,5 kg · S3: stesso carico"), poi i motivi una volta sola
      const what = i => { const r = refSets[i], t = tnum(ex.sets[i].t), a = advs[i], dk = a && a.kg != null && r && r.kg != null ? r2(a.kg - r.kg) : null;
        return ex.bw ? (setUp(r, t) ? "aumenta" : "stesse reps") : dk == null ? "—" : (dk > 0 ? `+${fmt(dk)} kg` : dk < 0 ? `−${fmt(-dk)} kg` : "stesso carico") + (a && t != null && a.reps > t ? `, ${a.reps} reps` : ""); };
      const perSet = () => { const g = new Map(); ex.sets.forEach((_, i) => { const w = what(i); g.set(w, [...(g.get(w) || []), i]); });
        const head = g.size === 1 ? `Tutte le serie: ${[...g.keys()][0]}` : [...g].map(([w, a]) => `${names(a)}: ${w}`).join(" · ");
        const why = [...new Set(advs.map(a => a && a.why).filter(Boolean))];
        const own = (f, txt) => { const a = ex.sets.map((_, i) => !(advs[i] && advs[i].why) && f(i) ? i : -1).filter(i => i >= 0); if (a.length) why.push(`${names(a)} ${txt}`); };
        own(i => nUp(i) === 2, "facile due volte di fila: doppio salto"); own(i => atLimit(refSets[i], tnum(ex.sets[i].t)), "al limite: consolida"); own(i => refSets[i] && refSets[i].dirty && !setUp(refSets[i], tnum(ex.sets[i].t)), "sporca: falla più pulita");
        return `${head}. ${why.join(". ")}${why.length ? "." : ""}`; };
      const upK = advs.some((a, i) => a && refSets[i] && a.kg > refSets[i].kg);
      if (up.length && all && !dbl.length && !special) load = { c: "up", t: `↑ Tutte le serie a target e pulite: ${inc}.${stp.v ? " Ok anche 1-2 reps in meno." : ""}` };
      else if (up.length || special) load = { c: upK ? "up" : "", t: `${upK ? "↑" : "="} ${perSet()}${stp.v && upK ? " Col peso nuovo ok anche 1-2 reps in meno." : ""}` };
      else if (hard.length) load = { c: "", t: `= Stesso carico: a target ma al limite, consolida prima di salire.${dirty.length ? ` ${names(dirty)} sporc${dirty.length > 1 ? "he: falle pulite" : "a: falla pulita"}.` : ""}` };
      else if (dirty.length) load = { c: "near", t: "~ Serie sporche l'ultima volta: stesso carico, falle pulite." };
      else load = { c: "", t: "= Stesso carico: l'ultima volta nessuna serie a target." };
    }
    else if (resetOf(ex.key) && !sbN) load = { c: "", t: `↺ Ripartito da zero il ${ddmm(resetOf(ex.key))}: scegli carichi con cui lo senti bene, da qui l'app riparte` };
    else if (ref) load = { c: "", t: `Scheda precedente: ${fmt(ref)} kg${cond.f < 1 ? ` · oggi ${fmt(roundKg(ref * cond.f))} kg (${esc(cond.why)})` : ""}` };
    const cg = circGroup(d, idx);
    if (cg) pills += cg.last ? `<span class="pill circ">Circuito · recupero ${fmtSec(restFor(ex))} a fine giro</span>` : `<span class="pill circ">Circuito · subito il prossimo</span>`;
    const isCur = u === curU, manual = !isCur;
    const oi = oooInfo(sess, ex.key, S.date === todayISO()), prosp = oi && !oi.started;
    let jc = oi && oi.off && !prosp ? { ...cond, ooo: true, why: [cond.why, "fuori ordine"].filter(Boolean).join(" + ") } : cond;
    if (isAway(sess)) { jc = { ...jc, ooo: true, why: [jc.why, "altra sede"].filter(Boolean).join(" + ") }; load = { c: "near", t: `📍 Altra sede: kg della tua palestra solo indicativi, macchine diverse. Non conta per i progressi.` }; }
    const fr = sbN ? [] : execFrames(ex), mpic = sbN ? machinePic(sbN) : "";
    const card = document.createElement("article"); card.className = "ex" + (isCur ? " cur" : ""); card.dataset.ex = ex.key;
    const open = S.open.has(ex.key);
    card.innerHTML = `
      <div class="exh">
        ${fr.length ? `<button class="exec thumb" data-zoom aria-label="Ingrandisci le immagini di ${esc(ex.name)}">
          ${fr.map(f => `<img src="${f.src}" alt="${esc(ex.name)} — ${esc(f.cap)}" class="${f.draw ? "draw" : ""}" loading="lazy">`).join("")}
          <span class="zoom"><svg viewBox="0 0 24 24"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg></span></button>` : mpic ? `<span class="exec thumb mpic"><img src="${mpic}" alt="${esc(sbN)}"></span>` : ""}
        <div class="t"><div class="exk">${exNum(exN)}${isCur ? " · Adesso" : ""}</div>
          <h3 class="exname">${esc(sbN || ex.name)}</h3>${sbN ? `<div class="subof">↔ al posto di ${esc(ex.name)}</div>` : ""}${rxLine(ex)}</div>
      </div>
      ${todayBanners(sess, ex, painRef, rs)}
      ${(ex.flash || []).length && !sbN ? `<p class="tipline" aria-label="Da ricordare">${ex.flash.map(x => `<span>${esc(x)}</span>`).join("")}</p>` : ""}
      ${pills ? `<div class="pills">${pills}</div>` : ""}
      ${oi ? oooBox(oi, prosp) : ""}
      ${((D.setup[S.gym] || {})[ex.key]) ? `<div class="exinfo top">
        <div class="ir"><span class="il">Regolazioni</span><button type="button" class="iv setv" data-editsetup>${esc(D.setup[S.gym][ex.key])}</button></div>
      </div>` : ""}
      ${warm ? `<p class="warm"><span>🔥 Riscaldamento <i>· non si registra</i></span>${warm}</p>` : ""}
      <div class="sets"><div class="sh"><span>Serie</span><span>Ultima</span><span>${ex.bw ? "kg (opz.)" : "kg"}</span><span>Reps</span><span></span></div></div>
      ${load ? `<p class="advice ${load.c}"><span>Consiglio</span>${load.t}</p>` : ""}
      ${trendToday && !isOffDay(sess) ? `<p class="advice trend ${trendToday.cls}"><span>Tra le serie</span>${trendToday.msg}</p>` : ""}
      ${stl && !sbN && !cond.deload ? `<p class="advice stall"><span>Fermo</span>⏸ Nessun miglioramento da ${stl.n} sedute. Prova: salto più piccolo o una rep in più invece del peso, recuperi pieni, tecnica pulita. Se continua, dillo al PT.</p>` : ""}
      <div class="exfoot${manual ? " two" : ""}">
        ${manual ? `<button class="more" data-close>Chiudi</button>` : ""}
        <button class="infobtn" data-more aria-haspopup="dialog"><svg viewBox="0 0 24 24" class="ib-i"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.01"/></svg><span><b>Info ed esecuzione</b><small>foto · muscoli · regolazioni</small></span><svg viewBox="0 0 24 24" class="ib-c"><path d="M9 6l6 6-6 6"/></svg></button></div>
      <div class="panel" hidden><div class="exinfo">
        ${ex.setup === false ? "" : `<div class="ir setup"${((D.setup[S.gym] || {})[ex.key]) ? "" : " hidden"}><label class="il" for="su-${ex.key}">Regolazioni</label><div class="iv"><input id="su-${ex.key}" autocomplete="off" placeholder="es. sedile 4, schienale 2"></div></div>`}
        ${ex.tec ? `<div class="ir"><span class="il">Schema</span><div class="iv tecv">${esc(ex.tec)}</div></div>` : ""}
        ${ex.nolog ? "" : (() => { const own = (D.setDur || {})[ex.key], est = setSec({ ...ex, key: "__" }, 0, null);
          return `<div class="ir"><span class="il">Durata serie<i>${own ? "impostata da te" : "stimata"}</i></span><div class="iv durset"><button type="button" data-sd="-5" aria-label="Meno 5 secondi">−5"</button><b>${own || est}"</b><button type="button" data-sd="5" aria-label="Più 5 secondi">+5"</button>${own ? `<button type="button" class="sd-reset" data-sd="0">stimata</button>` : ""}</div></div>`; })()}
        <div class="ir"><span class="il">Recupero${hasRest(ex) ? "" : "<i>non indicato</i>"}</span><div class="iv restsel" role="group" aria-label="Recupero tra le serie">${S.restEdit === ex.key
          ? `<input class="stepin" id="rsin-${ex.key}" inputmode="text" autocomplete="off" placeholder="es. 1:45" value="${hasRest(ex) && !REST_QUICK.includes(restFor(ex)) ? fmtSec(restFor(ex)) : ""}"><button type="button" data-restok>OK</button><button type="button" data-restx aria-label="Annulla">✕</button>`
          : REST_QUICK.map(v => `<button type="button" data-rest-set="${v}" aria-pressed="${hasRest(ex) && restFor(ex) === v}">${fmtSec(v)}</button>`).join("") + (() => { const cu = hasRest(ex) && !REST_QUICK.includes(restFor(ex)); return `<button type="button" data-restc aria-pressed="${cu}" class="cust">${cu ? fmtSec(restFor(ex)) : "altro"}</button>`; })()}</div></div>
        ${ex.bw ? "" : `<div class="ir"><span class="il">Salto pesi${stp.auto && stp.v ? "<i>stimato</i>" : ""}</span><div class="iv stepsel" role="group" aria-label="Salto dei pesi">${S.stepEdit === ex.key
          ? `<input class="stepin" id="stin-${ex.key}" inputmode="decimal" autocomplete="off" placeholder="kg, es. 1,25" value="${stp.v && !STEPS.includes(stp.v) ? fmt(stp.v) : ""}"><button type="button" data-stepok>OK</button><button type="button" data-stepx aria-label="Annulla">✕</button>`
          : STEPS.map(v => `<button type="button" data-step="${v}" aria-pressed="${stp.v === v}" class="${stp.v === v && stp.auto ? "auto" : ""}">${fmt(v)}</button>`).join("") + (() => { const cu = stp.v && !STEPS.includes(stp.v); return `<button type="button" data-stepc aria-pressed="${!!cu}" class="cust${cu && stp.auto ? " auto" : ""}">${cu ? fmt(stp.v) : "altro"}</button>`; })()}</div></div>`}
        ${ex.setup === false || ((D.setup[S.gym] || {})[ex.key]) ? "" : `<button type="button" class="addsetup" data-addsetup>⚙ Aggiungi regolazioni della macchina</button>`}
        ${ex.bw ? "" : `<div class="ir"><span class="il">Kg suggeriti</span><div class="iv"><button type="button" class="chip" data-copy>⚡ Scrivili nelle serie</button></div></div>`}
      </div>
      ${ex.nolog ? "" : `<div class="reset0${resetOf(ex.key) ? " on" : ""}">${resetOf(ex.key)
        ? `<p><b>↺ Progressi azzerati dal ${ddmm(resetOf(ex.key))}</b><small>Le sedute prima non contano per carichi, record e progressi (restano nello storico).</small></p><button type="button" data-reset0="undo">Annulla</button>`
        : `<p><b>Riparti da zero</b><small>Stavi sbagliando esecuzione e hai abbassato i carichi? Da oggi l'app ignora le sedute vecchie di questo esercizio (in tutte e due le palestre). Lo storico resta.</small></p><button type="button" data-reset0="go">↺ Azzera</button>`}</div>`}
      <div class="today3"><span class="t3k">Solo per oggi</span><div class="acts3" role="group" aria-label="Solo per oggi">
        <button type="button" data-act="sub" aria-pressed="${!!sbN}"><svg viewBox="0 0 24 24"><path d="M4 8h14l-4-4M20 16H6l4 4"/></svg><span>Sostituisci</span></button>
        <button type="button" data-act="later" aria-pressed="${isLater(sess, ex.key)}"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg><span>Occupato</span></button>
        <button type="button" data-act="pain" aria-pressed="${hasPain(sess, ex.key)}"><svg viewBox="0 0 24 24"><path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 10v4.2M12 17v.01"/></svg><span>Fastidio</span></button>
        <button type="button" data-act="skip" aria-pressed="${isSkip(sess, ex.key)}"><svg viewBox="0 0 24 24"><path d="M5 6l8 6-8 6zM16 6v12"/></svg><span>Non lo faccio</span></button></div></div>
      <div class="pbody"></div></div>`;
    const setsEl = card.querySelector(".sets"), cur = exSets(sess, ex.key), P = [];
    let sn = 0;
    ex.sets.forEach((st, i) => {
      const ty = TYPES[st.type] || TYPES.std; if (!st.type || st.type === "std" || st.type === "alte" || st.type === "pausa" || st.type === "risc") sn++;
      const label = st.type === "ced" ? "RP" : st.type === "strip" ? "ST" : st.type === "super" ? "SS" : "S" + sn;
      const r = cur[i] || {}, lr = lastSets[i], tn = tnum(st.t), rr = refSets[i];
      const adv = ex.bw ? null : advise2(rr, prSets[i], tn, stp.v, cond.f, nUp(i)), sug = adv ? adv.kg : null, goal = adv && adv.reps != null && tn != null && adv.reps > tn ? adv.reps : null, lk = lr && lr.kg != null ? lr.kg : null;
      const dir = sug == null || lk == null ? "" : sug > lk + 1e-9 ? "up" : sug < lk - 1e-9 ? "dn" : "eq";
      const row = document.createElement("div"); row.className = "set" + (i >= need(ex, sess) ? " xset" : "");
      row.innerHTML = `<div class="sn" style="--tc:var(${ty.c})">${label}<small>×${esc(st.t)}</small>${ty.n || st.note ? `<em>${esc([ty.n, st.note].filter(Boolean).join(" · "))}</em>` : ""}</div>
        <div class="prev">${lr && (lr.kg != null || lr.reps != null) ? `<b class="lv${lr.dirty ? " dirty" : ""}"${lr.dirty ? ' title="Sporca l\'ultima volta"' : ""}>${lr.kg != null ? fmt(lr.kg) + " × " : ""}${lr.reps ?? "–"}${lr.dirty ? `<i>~${dN(lr) > 1 ? dN(lr) : ""}</i>` : ""}</b>` : `<b class="lv none">—</b>`}${sug != null ? `<span class="sug ${dir}">${{ up: "↑", dn: "↓", eq: "=" }[dir] || "oggi"} ${goal ? `${fmt(sug)} × ${goal}` : `${fmt(sug)} kg`}</span>` : ""}</div>
        <input id="kg-${ex.key}-${i}" inputmode="decimal" enterkeyhint="next" autocomplete="off" aria-label="${esc(ex.name)} serie ${i + 1} kg" placeholder="${sug != null ? fmt(sug) : lr && lr.kg != null ? fmt(lr.kg) : ref ? fmt(roundKg(ref * cond.f)) : "kg"}">
        <input id="rp-${ex.key}-${i}" inputmode="numeric" enterkeyhint="next" autocomplete="off" aria-label="${esc(ex.name)} serie ${i + 1} ripetizioni" placeholder="${tn != null ? tn : "max"}">
        <button type="button" class="dq" aria-label="Com'era la serie?"></button><div class="fb"></div>`;
      const [kg, rp] = row.querySelectorAll("input"); kg.value = fmt(r.kg); rp.value = r.reps ?? "";
      const fb = row.querySelector(".fb"), dq = row.querySelector(".dq");
      const isDirty = () => dN(exSets(current(), ex.key)[i]);
      const upd = () => {
        if (row._gap) { const all = exSets(current(), ex.key), g = restGap(all[i - 1], all[i], ex, i), pl = restFor(ex);
          row._gap.hidden = g == null; if (g != null) { const lg = lrOn(all[i]); row._gap.className = "rgap" + (lg ? " long" : g < pl * 0.8 ? " short" : "");
            row._gap.innerHTML = `<span>⏱ recupero ${fmtSec(Math.round(g / 5) * 5)}</span><small>previsto ${fmtSec(pl)} · serie ~${setSec(ex, i, all[i])}"</small>`; } }
        const cr = exSets(current(), ex.key)[i] || {}, fv = feelOf(cr);
        judge(kg, rp, fb, tn, rr, { ...jc, step: stp.v, last: i >= need(ex, current()) - 1 }, isDirty(), cr.eff, goal);
        { const pv = i > 0 ? exSets(current(), ex.key)[i - 1] : null, k = num(kg.value), rv = num(rp.value);
          if (pv && pv.kg != null && k != null && rv != null && tn != null && k > pv.kg && rv <= tn - CLIMB_MISS && !cr.dirty && !cond.hold) { fb.className = "fb near"; fb.hidden = false;
            fb.textContent = `Salita troppo: prossima volta ${fmt(pv.kg)} kg qui`; } }
        if (cond.hold && num(rp.value) != null && tn != null && num(rp.value) <= tn - 3 && i < ex.sets.length - 1 && num(kg.value) != null) {
          const st = stp.v || 2.5, low = Math.max(0, num(kg.value) - st); fb.className = "fb near"; fb.hidden = false;
          fb.textContent = `Rientro: prossima serie ${fmt(low)} kg`; }
        if (isPR(cr) && !cr.help) { fb.className = "fb ok"; fb.hidden = false; fb.textContent = `🏆 Nuovo record: ${fmt(cr.kg)}×${cr.reps}!`; }
        if (cr.help && num(rp.value) != null && !cr.dirty) { fb.className = "fb prog"; fb.hidden = false; fb.textContent = "🤝 Aiutata: prossima volta da solo"; }
        if (lrOn(cr) && num(rp.value) != null && !cr.dirty) {
          fb.className = "fb prog"; fb.hidden = false;
          fb.innerHTML = `<span>⏱ Pausa ~${fmtSec(cr.lr)}: non conta per salire</span><button type="button" class="lrok">Non ha influito</button>`;
          const b = fb.querySelector(".lrok"); b.onmousedown = e => e.preventDefault();
          b.onclick = () => { const s2 = JSON.parse(JSON.stringify(current())); s2.ex[ex.key][i] = { ...s2.ex[ex.key][i], lrOk: true }; s2.updatedAt = Date.now(); D.sessions[s2.id] = s2; save(); upd(); };
        }
        const has = num(rp.value) != null;
        dq.classList.toggle("off", !has); dq.disabled = !has; dq.dataset.f = fv; dq.innerHTML = feelIcon(fv);
        dq.setAttribute("aria-label", `Serie ${FEEL[fv].n.toLowerCase()}: tocca per cambiare`);
        if (card._live) card._live();
      };
      row._upd = upd; row._i = i; row._kg = kg; row._rp = rp; row._fb = fb;
      P[i] = { plan: sug, goal, tn, lk, label, ph: kg.placeholder, rph: rp.placeholder, sugHTML: (row.querySelector(".sug") || {}).outerHTML || "" };
      dq.onclick = () => openFeel(ex, i, label);
      kg.oninput = e => { edit(ex, i, "kg", kg.value); upd(); autoKg(e, kg, rp); };
      rp.oninput = e => { edit(ex, i, "reps", rp.value); upd(); autoReps(e, rp); };
      // serie completata (reps inserite e campo lasciato) → parte il recupero
      rp.addEventListener("change", () => {
        if (num(rp.value) != null) openFeel(ex, i, label);
        { const cr = exSets(current(), ex.key)[i]; S.cel = S.cel || new Set(); const ck = `${current().id}|${ex.key}|${i}`;
          if (isPR(cr) && !S.cel.has(ck)) { S.cel.add(ck); celebrate(`🏆 Nuovo record`, `${sbN || ex.name} · ${fmt(cr.kg)}×${cr.reps}`); } }
        if (num(rp.value) == null || S.date !== todayISO() || !tPrefs().auto) return;
        const g = circGroup(d, idx);
        if (g && !g.last) { toast(`Subito: ${d.ex[idx + 1].name}`); return; } // circuito: niente recupero tra gli esercizi
        // ultima serie (o ultimo giro): tra un esercizio e l'altro il recupero NON parte (scelta dell'utente, 17/11/2026);
        // riparte dopo la prima serie dell'esercizio successivo
        if (i >= need(ex, current()) - 1) { { const n = nextOpenUnit(d, idx); S.between = { next: n ? (d.ex.find(e => e.key === n.k) || {}).name : "" }; } if (running() || T.left != null) stopRest(); else drawTimer(); return; } // niente avviso a fine esercizio (18/11/2026, l'utente non lo vuole): bastano la barra del timer e "Tra le serie" nella scheda
        if (g) { startRest(restFor(ex), `Giro ${i + 1} finito · poi giro ${i + 2}`, tKey(ex)); return; }
        startRest(restFor(ex), `${ex.name} · poi serie ${i + 2}`, tKey(ex));
      });
      if (i > 0 && !circGroup(d, idx)) { const gp = document.createElement("div"); gp.className = "rgap"; gp.hidden = true; setsEl.appendChild(gp); row._gap = gp; }
      upd(); setsEl.appendChild(row);
    });
    // adattamento in tempo reale delle serie ancora da fare (vedi liveAdj)
    card._live = () => {
      if (ex.bw || circGroup(d, idx)) return;
      const sets = exSets(current(), ex.key), stv = stepFor(ex.key).v, canUp = cond.f >= 1 && !cond.hold && !hasPain(current(), ex.key);
      let first = true;
      setsEl.querySelectorAll(".set").forEach(row => { if (row._i == null) return;
        const i = row._i, r = sets[i] || {}, p = P[i], filled = r.kg != null || r.reps != null, kgTyped = row._kg.value.trim() !== "";
        const a = filled || kgTyped ? null : liveAdj(i, sets, P, stv, canUp);
        const changed = a && (a.noPlan ? true : Math.abs(a.kg - p.plan) > 1e-9 || (a.reps || null) !== (p.goal || null));
        const pv = row.querySelector(".prev"); let sg = pv.querySelector(".sug");
        if (!changed) { // torna al suggerimento di partenza
          row._kg.placeholder = p.ph; row._rp.placeholder = p.rph; row.classList.remove("live");
          if (sg && sg.classList.contains("live")) { if (p.sugHTML) sg.outerHTML = p.sugHTML; else sg.remove(); }
          if (row._fb.dataset.live) { row._fb.textContent = ""; row._fb.hidden = true; delete row._fb.dataset.live; }
          if (!filled) first = false; return; }
        const dir = p.lk == null ? "" : a.kg > p.lk + 1e-9 ? "up" : a.kg < p.lk - 1e-9 ? "dn" : "eq", rp2 = a.reps && p.tn != null && a.reps > p.tn ? a.reps : null;
        row._kg.placeholder = fmt(a.kg); row._rp.placeholder = rp2 != null ? rp2 : p.rph; row.classList.add("live");
        if (!sg) { sg = document.createElement("span"); pv.appendChild(sg); }
        sg.className = `sug ${dir} live`; sg.textContent = `${{ up: "↑", dn: "↓", eq: "=" }[dir] || "oggi"} ${rp2 != null ? `${fmt(a.kg)} × ${rp2}` : `${fmt(a.kg)} kg`}`;
        if (first) { const lj = P[a.j].label, rj = sets[a.j], tj = P[a.j].tn;
          const why = a.out < 0 ? (dN(rj) ? `${lj} ${cleanR(rj)} pulite su ${tj}` : `${lj} ${rj.reps} su ${tj}`) : a.out > 0 ? `${lj} ${rj.eff === "easy" ? "facile" : `+${rj.reps - tj} reps`}` : a.dev ? `${lj} a ${fmt(rj.kg)} kg` : a.noPlan ? `da ${lj}` : "";
          const what = rp2 != null && a.out > 0 ? `qui ${fmt(a.kg)} × ${rp2}` : `qui ${fmt(a.kg)} kg`;
          if (why) { row._fb.className = "fb live"; row._fb.hidden = false; row._fb.dataset.live = "1"; row._fb.textContent = `⟳ ${why}: ${what}`; } }
        first = false;
      });
    };
    card._live();
    const su = card.querySelector(".setup input");
    if (su) {
      su.value = ((D.setup[S.gym] || {})[ex.key]) || ""; su.oninput = () => { D.setup[S.gym] = D.setup[S.gym] || {}; D.setup[S.gym][ex.key] = su.value.trim(); save(); S.setupDirty = true; const t = card.querySelector("[data-editsetup]"); if (t) t.textContent = su.value.trim() || "—"; };
    }
    card.querySelectorAll("[data-act]").forEach(b => b.onclick = () => exAct(ex, b.dataset.act));
    card.querySelectorAll("[data-reset0]").forEach(b => b.onclick = () => {
      if (b.dataset.reset0 === "undo") { D.resets = { ...(D.resets || {}) }; delete D.resets[ex.key]; save(); renderLog(); toast(`Progressi di ${ex.name} ripristinati`); return; }
      if (!b.classList.contains("arm")) { b.classList.add("arm"); b.textContent = "Tocca di nuovo"; clearTimeout(b._t); b._t = setTimeout(() => { b.classList.remove("arm"); b.textContent = "↺ Azzera"; }, 4000); return; }
      D.resets = { ...(D.resets || {}), [ex.key]: S.date }; save(); renderLog(); toast(`${ex.name}: si riparte da zero da oggi`);
    });
    card.querySelectorAll("[data-sd]").forEach(b => b.onclick = () => { const d = +b.dataset.sd, cur = (D.setDur || {})[ex.key] || setSec({ ...ex, key: "__" }, 0, null);
      D.setDur = { ...(D.setDur || {}) }; if (!d) delete D.setDur[ex.key]; else D.setDur[ex.key] = Math.max(10, Math.min(180, cur + d)); save(); renderLog(); });
    card.querySelectorAll("[data-restc]").forEach(b => b.onclick = () => { S.restEdit = ex.key; renderLog(); setTimeout(() => { const i = $(`rsin-${ex.key}`); if (i) { i.focus(); i.select(); } }, 60); });
    { const ri = card.querySelector(`#rsin-${CSS.escape(ex.key)}`); if (ri) {
      const ok = () => { const v = parseRest(ri.value.trim()); S.restEdit = null; if (v && v >= 10 && v <= 600) { setRest(ex.key, v); toast(`Recupero ${ex.name}: ${fmtSec(v)}`); } else renderLog(); };
      ri.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); ok(); } };
      const bo = card.querySelector("[data-restok]"), bx = card.querySelector("[data-restx]");
      if (bo) { bo.onmousedown = e => e.preventDefault(); bo.onclick = ok; }
      if (bx) { bx.onmousedown = e => e.preventDefault(); bx.onclick = () => { S.restEdit = null; renderLog(); }; } } }
    card.querySelectorAll("[data-rest-set]").forEach(b => b.onclick = () => { const v = +b.dataset.restSet; setRest(ex.key, (D.rest || {})[ex.key] === v ? null : v); toast((D.rest || {})[ex.key] ? `Recupero ${ex.name}: ${fmtSec(v)}` : "Recupero tolto: torna quello di base"); });
    card.querySelectorAll("[data-addsetup]").forEach(b => b.onclick = () => { const r = b.parentNode.querySelector(".ir.setup"); if (r) { r.hidden = false; b.remove(); const i = r.querySelector("input"); i.focus(); i.scrollIntoView({ block: "center", behavior: "smooth" }); } });
    card.querySelectorAll("[data-undo]").forEach(b => b.onclick = () => exAct(ex, b.dataset.undo, true));
    card.querySelectorAll("[data-alt]").forEach(b => b.onclick = () => { S.subEdit = null; setExMap("sub", ex.key, b.dataset.alt); });
    const pin = card.querySelector("[data-pic]"); if (pin) pin.onchange = () => { if (pin.files[0]) saveMachinePic(subOf(current(), ex.key), pin.files[0]); };
    const sbi = card.querySelector(".subin input"); if (sbi) { sbi.onkeydown = e => { if (e.key === "Enter") sbi.blur(); }; sbi.onchange = () => { S.subEdit = null; setExMap("sub", ex.key, sbi.value.trim() || null); }; setTimeout(() => sbi.focus(), 60); }
    const cp = card.querySelector("[data-copy]") || { set hidden(v) {} };
    if (ex.bw || !rs || !refSets.some(r => r && r.kg != null)) { const row = cp.closest && cp.closest(".ir"); if (row) row.remove(); }
    cp.onclick = () => (closeSheet(), ex.sets).forEach((_, i) => { const el0 = $(`kg-${ex.key}-${i}`), a = advise2(refSets[i], prSets[i], tnum(ex.sets[i].t), stp.v, cond.f, nUp(i)), k = el0 && el0.value === "" && /\d/.test(el0.placeholder) ? num(el0.placeholder) : a && a.kg; if (k != null) { const el = $(`kg-${ex.key}-${i}`); el.value = fmt(k); edit(ex, i, "kg", el.value); el.dispatchEvent(new Event("input")); } });
    const panel = card.querySelector(".panel"), pbody = panel.querySelector(".pbody"); if (open) fillPanel(pbody, ex);
    const openInfo = () => openSheet(ex.key);
    card.querySelectorAll("[data-more]").forEach(b => b.onclick = () => {
      openInfo();
    });
    const es = card.querySelector("[data-editsetup]"); if (es) es.onclick = () => { openInfo(); const i = $("isheet").querySelector(".setup input"); if (i) { i.focus(); i.scrollIntoView({ block: "center", behavior: "smooth" }); } };
    const z = card.querySelector("[data-zoom]"); if (z) z.onclick = () => openLB(ex, -1);
    // Chiudi: la riga chiusa resta dove stavi guardando (o subito sotto la barra in alto se la scheda iniziava più su)
    card.querySelectorAll("[data-step]").forEach(b => b.onclick = () => { const v = +b.dataset.step; setStep(ex.key, stp.v === v && !stp.auto ? null : v); });
    card.querySelectorAll("[data-stepc]").forEach(b => b.onclick = () => { S.stepEdit = ex.key; renderLog(); setTimeout(() => { const i = $(`stin-${ex.key}`); if (i) { i.focus(); i.select(); } }, 60); });
    { const si = card.querySelector(".stepin"); if (si) {
      const ok = () => { const v = num(si.value); S.stepEdit = null; if (v != null && v > 0 && v <= 50) { setStep(ex.key, Math.round(v * 100) / 100); toast(`Salto pesi: ${fmt(Math.round(v * 100) / 100)} kg`); } else renderLog(); };
      si.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); ok(); } };
      const bo = card.querySelector("[data-stepok]"), bx = card.querySelector("[data-stepx]");
      if (bo) { bo.onmousedown = e => e.preventDefault(); bo.onclick = ok; }
      if (bx) { bx.onmousedown = e => e.preventDefault(); bx.onclick = () => { S.stepEdit = null; renderLog(); }; } } }
    const ob = card.querySelector("[data-ooo]"); if (ob) ob.onclick = () => toggleOrderOk(oi.key);
    const cl = card.querySelector("[data-close]"); if (cl) cl.onclick = () => { if (S.hold === ex.key && S.moveGo) return S.moveGo();
      const top = card.getBoundingClientRect().top, hb = $("console").getBoundingClientRect().bottom + 8;
      const nx = card.nextElementSibling, nsel = nx ? (nx.dataset.mini ? `.exmini[data-mini="${nx.dataset.mini}"]` : nx.dataset.ex ? `.ex[data-ex="${nx.dataset.ex}"]` : nx.dataset.circ ? `[data-circ="${nx.dataset.circ}"]` : null) : null;
      const nt = nsel ? nx.getBoundingClientRect().top : null;
      S.exOpen.delete(ex.key); renderLog();
      const m = document.querySelector(`.exmini[data-mini="${ex.key}"]`) || rowEl(ex.key, 0), n2 = nsel && document.querySelector(nsel);
      if (n2 && nt != null && nt < innerHeight) {
        let dy = n2.getBoundingClientRect().top - nt;                       // ciò che stava sotto resta dov'era
        if (m) { const mt = m.getBoundingClientRect().top - dy; if (mt < hb) dy -= hb - mt; } // e la riga chiusa resta visibile
        scrollTo({ top: Math.max(0, scrollY + dy) });
      } else if (m) scrollTo({ top: Math.max(0, m.getBoundingClientRect().top + scrollY - Math.max(top, hb)) });
    };
    list.appendChild(card);
  });
  markNext();
  $("note").value = sess.note || "";
  updateProgress();
}
// ---------- campi dimenticati ----------
// Se hai già compilato una serie più avanti nella giornata, le serie precedenti senza reps (o con reps ma senza kg)
// sono "da completare": righe segnate in arancione + avviso sopra il timer che porta alla prima.
// Serie dimenticate: (1) reps scritte senza kg; (2) in un esercizio già iniziato, serie vuote prima di una compilata
// o quando sei già passato a un altro esercizio. Gli esercizi mai iniziati non contano (li mostra il cerchio "mancano").
function missingSlots(d, s) {
  const units = dayUnitsList(d, s), miss = [];
  const touched = units.map(u => u.circ ? circCount(s, u.ex.circ) > 0 : exSets(s, u.ex.key).some(r => r && (r.kg != null || r.reps != null)));
  const lastIdx = touched.lastIndexOf(true);
  let L = null; try { L = JSON.parse(localStorage.getItem(LKEY)); } catch (e) {}
  const lastUnit = L && L.date === S.date && L.gym === S.gym && L.day === S.day ? units.findIndex(u => u.keys.includes(L.key)) : lastIdx;
  units.forEach((u, j) => {
    if (!touched[j] || u.skip) return;
    const movedOn = units.some((v, k) => k !== j && touched[k] && (k > j || k === lastUnit)) && lastUnit !== j;
    if (u.circ) { if (movedOn && circCount(s, u.ex.circ) < u.ex.sets.length) miss.push({ k: u.keys[0], i: 0, what: "giri" }); return; }
    const sets = exSets(s, u.ex.key), lastFilled = u.ex.sets.reduce((a, _, i) => sets[i] && (sets[i].kg != null || sets[i].reps != null) ? i : a, -1);
    u.ex.sets.forEach((_, i) => {
      const r = sets[i]; if (i >= need(u.ex, s) && !(r && (r.kg != null || r.reps != null))) return;
      if ((!r || r.reps == null) && (i < lastFilled || movedOn)) miss.push({ k: u.ex.key, i, what: "reps" });
      else if (r && r.reps != null && r.kg == null && !u.ex.bw) miss.push({ k: u.ex.key, i, what: "kg" });
    });
  });
  return miss;
}
let missT;
function checkMissing() { clearTimeout(missT); missT = setTimeout(drawMissing, 150); }
function drawMissing() {
  const chip = $("miss"); document.querySelectorAll(".miss").forEach(x => x.classList.remove("miss"));
  if (S.view !== "log") { chip.hidden = true; return; }
  const s = current(), act = document.activeElement;
  const miss = s.ignoreMiss ? [] : missingSlots(dayObj(), s).filter(m => { const row = rowEl(m.k, m.i); return row && !(act && row.contains(act)); });
  miss.forEach(m => rowEl(m.k, m.i).classList.add("miss"));
  chip.hidden = !miss.length;
  if (!miss.length) return;
  const n = miss.length, kgOnly = miss.every(m => m.what === "kg");
  $("missGo").textContent = `⚠ ${n} ${n === 1 ? "serie" : "serie"} da completare${kgOnly ? " (kg)" : ""}`;
  $("missGo").onclick = () => { const m = missingSlots(dayObj(), current())[0]; if (!m) return drawMissing(); const row = ensureRow(m.k, m.i);
    row.scrollIntoView({ block: "center", behavior: "smooth" }); row.classList.remove("here"); void row.offsetWidth; row.classList.add("here"); setTimeout(() => row.classList.remove("here"), 2600); };
  $("missX").onclick = () => { const s2 = JSON.parse(JSON.stringify(current())); s2.ignoreMiss = true; s2.updatedAt = Date.now(); D.sessions[s2.id] = s2; save(); drawMissing(); toast("Avviso nascosto per questa seduta"); };
}
document.addEventListener("focusin", e => { if (e.target.matches && e.target.matches(".set input")) checkMissing(); });
// scheda chiusa (esercizio fatto o da fare): una riga, tocco = apre
function miniCard(u, s) {
  const e = u.ex, f = execFrames(e)[0], b = document.createElement("button");
  b.className = "exmini" + (u.done ? " done" : ""); b.dataset.keys = u.keys.join(" "); b.dataset.mini = u.keys[0];
  let sub;
  if (u.circ) { const c = circCount(s, e.circ); sub = u.done ? `${c}/${e.sets.length} giri` : `${e.sets.length} giri · ${e.sets[0].t} reps · recupero ${fmtSec(restFor(u.circ ? d_last(u) : e))}`; }
  else if (u.skip && !u.started) sub = "⤼ saltato oggi";
  else if (isLater(s, e.key) && !u.started) sub = "⏳ occupato · lo fai dopo";
  else if (u.started || u.done) sub = (u.done && !u.skip && !isOffDay(s) && (tr => tr ? { light: "S1 leggera · ", climb: "salita troppo · ", drop: "calo forte · " }[tr.kind] || "" : "")(setsTrend(e, exSets(s, e.key), s))) + (u.skip ? "⤼ " : "") + (subOf(s, e.key) ? "↔ " : "") + (oooOff(s, e.key) ? "↕ " : "") + exSets(s, e.key).filter(r => r && (r.kg != null || r.reps != null)).map(r => `${r.kg != null ? fmt(r.kg) + "×" : ""}${r.reps ?? "–"}${r.dirty ? "~" + (dN(r) > 1 ? dN(r) : "") : r.help ? "🤝" : ""}`).join(" · ");
  else { const l = lastBefore(e.key), mk = l ? maxKg(exSets(l, e.key)) : null; sub = `${e.sets.length} serie · ${e.sets.map(x => x.t).join("-")}${mk != null ? ` · ultima ${fmt(mk)} kg` : ""}`; }
  b.innerHTML = `<span class="mk">${u.done ? "✓" : exNum(u.n)}</span>${f ? `<img src="${f.src}" alt="" loading="lazy">` : ""}
    <span class="t"><b>${u.done ? exNum(u.n) + " · " : ""}${esc(u.name)}</b><small>${esc(sub)}</small></span><span class="chev">›</span>`;
  b.onclick = () => openUnit(u.keys[0]);
  return b;
}
const d_last = u => dayObj().ex.slice(u.circ.start, u.circ.end + 1).pop();
// evidenzia la prossima serie da fare nell'esercizio aperto "adesso"
function markNext() {
  document.querySelectorAll(".set.next").forEach(x => x.classList.remove("next"));
  const d = dayObj(), s = current(), units = dayUnitsList(d, s), cur = currentUnit(d, s, units); if (!cur || cur.circ) return;
  const i = cur.ex.sets.findIndex((_, j) => { const r = exSets(s, cur.ex.key)[j]; return !r || r.reps == null; });
  const el = i >= 0 && $(`rp-${cur.ex.key}-${i}`); if (el) el.closest(".set").classList.add("next");
}
// scheda unica del circuito senza registrazione: esercizi + "▶ Giro fatto" + "⏱ recupero"
function circCard(d, g, n, isCur) {
  const mem = d.ex.slice(g.start, g.end + 1), c = mem[0].circ, giri = mem[0].sets.length, t = mem[0].sets[0].t;
  const rest = restFor(mem[mem.length - 1]), cnt = circCount(current(), c);
  const mu = { p: [...new Set(mem.flatMap(e => (e.m && e.m.p) || []))], s: [...new Set(mem.flatMap(e => (e.m && e.m.s) || []))] };
  const card = document.createElement("article"); card.className = "ex circ-card" + (cnt >= giri ? " done" : ""); card.dataset.circ = c; card.dataset.keys = mem.map(e => e.key).join(" ");
  card.innerHTML = `
    <div class="exhead"><div class="num">${exNum(n)}</div>
      <div>${isCur ? `<div class="exk">Adesso</div>` : ""}<h3 class="exname">Circuito ${esc(c)}</h3><div class="tec">${giri} giri: ${mem.map(e => esc(e.name)).join(" → ")}, ${esc(t)} reps ciascuno senza pausa. ${fmtSec(rest)} di recupero dopo ogni giro.</div></div>
      <div class="mini" aria-hidden="true">${bodySVG(mu)}</div></div>
    <ol class="circlist">${mem.map((e, i) => { const f = execFrames(e)[0]; return `<li>
      <div class="crow">${f ? `<button class="cthumb" data-z="${i}" aria-label="Immagini di ${esc(e.name)}"><img src="${f.src}" alt="" loading="lazy"></button>` : ""}
        <div class="t"><b>${i + 1}. ${esc(e.name)}</b><small>${esc(t)} reps</small><span class="cf">${(e.flash || []).map(esc).join(" · ")}</span></div>
        <button class="more" data-m="${i}" aria-expanded="${S.open.has(e.key)}">Dettagli<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button></div>
      <div class="panel" ${S.open.has(e.key) ? "" : "hidden"}></div></li>`; }).join("")}</ol>
    <div class="giri"><span>Giri</span>${Array.from({ length: giri }, (_, k) => `<button class="giro ${k < cnt ? "on" : ""}" data-g="${k + 1}" aria-label="Giro ${k + 1}">${k + 1}</button>`).join("")}</div>
    <div class="circbtns"><button class="btn primary" data-play ${cnt >= giri ? "disabled" : ""}>${cnt >= giri ? "✓ Circuito completato" : `▶ Giro fatto <small>${cnt + 1}/${giri}</small>`}</button>
      <button class="btn" data-rest>⏱ ${fmtSec(rest)}</button></div>`;
  card.querySelectorAll("[data-z]").forEach(b => b.onclick = () => openLB(mem[+b.dataset.z], -1));
  card.querySelectorAll("[data-m]").forEach(b => { const e = mem[+b.dataset.m], panel = b.closest("li").querySelector(".panel"); if (!panel.hidden) fillPanel(panel, e);
    b.onclick = () => { const open = panel.hidden; panel.hidden = !open; b.setAttribute("aria-expanded", open); if (open) { S.open.add(e.key); if (!panel.firstChild) fillPanel(panel, e); } else S.open.delete(e.key); }; });
  const setCirc = k => {
    const s2 = JSON.parse(JSON.stringify(current())); s2.circ = { ...(s2.circ || {}), [c]: Math.max(0, Math.min(giri, k)) }; s2.updatedAt = Date.now();
    if (k > 0 && !(s2.ord || []).includes(mem[0].key)) s2.ord = [...(s2.ord || []), mem[0].key];
    if (k > 0) stampTime(s2);
    D.sessions[s2.id] = s2; save();
    if (S.date === todayISO()) try { localStorage.setItem(LKEY, JSON.stringify({ gym: S.gym, day: S.day, date: S.date, key: mem[0].key, i: 0 })); } catch (e) {}
    const was = cnt >= giri, now = Math.max(0, Math.min(giri, k)) >= giri;
    if (was !== now) { // completato (o riaperto): la lista si riorganizza; se completato, resta aperto FINISH_HOLD con "Vai ora"
      if (now) { S.exOpen.delete(mem[0].key); clearTimeout(S.moveT); clearInterval(S.moveI);
        if (T.key === tKey(mem[0]) && (running() || T.left != null)) stopRest(); // circuito finito: niente recupero
        const nx = nextOpenUnit(d, g.start); S.between = { next: nx ? (d.ex.find(e => e.key === nx.k) || {}).name : "" };
        S.hold = mem[0].key; S.moveAt = Date.now() + FINISH_HOLD;
        S.moveGo = () => { clearTimeout(S.moveT); clearInterval(S.moveI); S.hold = null; S.moveAt = null; S.moveGo = null; renderLog(); drawTimer(); };
        S.moveT = setTimeout(S.moveGo, FINISH_HOLD); S.moveI = setInterval(() => drawTimer(), 1000); }
      renderLog(); drawTimer(); return; }
    card.replaceWith(circCard(d, g, n, isCur)); updateProgress();
  };
  // "Giro fatto" fa partire subito il recupero del circuito (18/11/2026, richiesta dell'utente), tranne dopo l'ultimo giro
  card.querySelector("[data-play]").onclick = () => { const k = cnt + 1; setCirc(k);
    if (k < giri && S.date === todayISO()) startRest(rest, `Giro ${k} fatto · poi giro ${k + 1}`, tKey(mem[0])); };
  card.querySelectorAll("[data-g]").forEach(b => b.onclick = () => { const k = +b.dataset.g; setCirc(cnt === k ? k - 1 : k); });
  card.querySelector("[data-rest]").onclick = () => startRest(rest, cnt >= giri ? "Circuito finito" : cnt ? `Giro ${cnt} fatto · poi giro ${cnt + 1}` : `Recupero ${c}`);
  return card;
}
// elemento da mostrare per la serie k/i: la riga della serie, o i tasti del circuito se l'esercizio è in un circuito senza registrazione
function rowEl(k, i) {
  const el = $(`rp-${k}-${i}`); if (el) return el.closest(".set");
  const c = document.querySelector(`.circ-card[data-keys~="${k}"]`); if (c) return c.querySelector(".circbtns");
  return document.querySelector(`.exmini[data-keys~="${k}"]`);
}
// Compilazione veloce: dopo i kg il cursore passa da solo alle reps; dopo le reps la serie si conferma da sola
// (tastiera giù → parte il timer e si scorre alla serie dopo). Solo per ciò che scrivi tu, non per "Usa kg suggeriti".
// Correzioni: mentre cancelli non scatta nulla; quando riscrivi, si aspetta un po' di più (el._fix fino all'uscita dal campo).
const isDel = e => /^delete/.test(e.inputType || "");
function autoKg(e, kg, rp) {
  if (!e || !e.isTrusted) return; clearTimeout(kg._t);
  if (isDel(e)) { kg._fix = true; return; }
  const v = kg.value.trim(); if (!v || /[.,]$/.test(v) || num(v) == null) return;
  // dopo i kg: 1" senza scrivere → reps della stessa serie (scelta dell'utente del 17/11/2026)
  kg._t = setTimeout(() => { if (document.activeElement === kg && rp.value === "") rp.focus(); }, kg._fix ? 1200 : 1000);
}
function autoReps(e, rp) {
  if (!e || !e.isTrusted) return; clearTimeout(rp._t);
  if (isDel(e)) { rp._fix = true; return; }
  const v = rp.value.trim(); if (num(v) == null) return;
  // ultima serie dell'esercizio: 1,5" prima di passare all'esercizio dopo (scelta dell'utente, 17/11/2026)
  const m = rp.id.match(/^rp-(.+)-(\d+)$/), d = dayObj(), idx = m ? d.ex.findIndex(x => x.key === m[1]) : -1, nx = idx >= 0 ? nextSet(d, idx, +m[2]) : null, last = !nx || nx.k !== m[1];
  rp._t = setTimeout(() => { if (document.activeElement === rp) toNextSet(rp); }, last ? 1500 : rp._fix ? 1200 : v.replace(/\D/g, "").length >= 2 ? 300 : 700);
}
// Dopo le reps: se la prossima serie è dello stesso esercizio, il cursore va ai suoi kg (tastiera aperta; il recupero
// parte comunque con l'evento "change"); se mancano già i kg ma non le reps, alle reps. Esercizio finito → tastiera giù.
function toNextSet(rp) {
  const m = rp.id.match(/^rp-(.+)-(\d+)$/), d = dayObj(), idx = m ? d.ex.findIndex(x => x.key === m[1]) : -1;
  if (idx < 0) return rp.blur();
  const t = nextSet(d, idx, +m[2]);
  const nk = t.k === m[1] && t.i !== +m[2] ? $(`kg-${t.k}-${t.i}`) : null, nr = nk && $(`rp-${t.k}-${t.i}`);
  const tgt = !nk ? null : nk.value === "" ? nk : nr && nr.value === "" ? nr : null;
  if (!tgt) return rp.blur();
  tgt.focus(); markNext();
  const row = tgt.closest(".set"); if (row) row.scrollIntoView({ block: "center", behavior: "smooth" });
}
// Tastiera aperta (qualsiasi campo di testo): via il menu in basso, timer compatto appena sopra la tastiera.
const isField = el => el && el.matches && el.matches("input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=date]), textarea");
document.addEventListener("focusin", e => { if (isField(e.target)) { document.body.classList.add("kb"); placeTimer(); setTimeout(placeTimer, 350); } });
document.addEventListener("focusout", () => setTimeout(() => { if (!isField(document.activeElement)) { document.body.classList.remove("kb"); placeTimer(); } }, 80));
// Su iPhone la tastiera copre il fondo dello schermo (i "fixed" in basso finiscono dietro): con la tastiera aperta il timer
// si aggancia al bordo alto dell'area visibile sopra la tastiera (visualViewport) e si riposiziona a ogni scorrimento.
function placeTimer() {
  const tm = $("timer"), vv = window.visualViewport; if (!tm) return;
  if (!document.body.classList.contains("kb") || !vv) { tm.style.top = ""; tm.style.bottom = ""; return; }
  tm.style.bottom = "auto"; tm.style.top = Math.max(0, vv.offsetTop + vv.height - tm.offsetHeight) + "px";
}
if (window.visualViewport) { visualViewport.addEventListener("resize", placeTimer); visualViewport.addEventListener("scroll", placeTimer); }
// la barra cambia altezza (riga delle fasi, "Com'era?", avvisi): si riaggancia subito sopra la tastiera, altrimenti il fondo finisce tagliato (18/11/2026)
if (window.ResizeObserver && $("timer")) new ResizeObserver(() => placeTimer()).observe($("timer"));
addEventListener("scroll", () => { if (document.body.classList.contains("kb")) placeTimer(); }, { passive: true });
// Tocco su un campo già compilato: il numero si seleziona tutto, così scrivi direttamente quello nuovo.
document.addEventListener("focusin", e => {
  const el = e.target; if (!el.matches || !el.matches(".set input")) return;
  el._fix = false; if (!el.value) return;
  setTimeout(() => { if (document.activeElement === el) try { el.setSelectionRange(0, el.value.length); } catch (x) { el.select(); } }, 30);
});
document.addEventListener("focusout", e => { const el = e.target; if (el.matches && el.matches(".set input")) { clearTimeout(el._t); el._fix = false; } });
// Valutazione della serie: non solo "target sì/no", ma quanto ti sei avvicinato e se hai alzato il carico.
// Forza stimata (formula di Epley): kg × (1 + reps/30), confrontata con la stessa serie dell'ultima volta.
const repsTxt = n => n === 1 ? "manca 1 rep" : `mancano ${n} reps`;
function judge(kgEl, rpEl, fb, t, lr, cond, dirty, eff, goal) {
  const kg = num(kgEl.value), reps = num(rpEl.value), f = cond ? cond.f : 1, off = f < 1 || !!(cond && (cond.ooo || cond.hold));
  let cls = "", msg = "";
  if (reps != null && t != null) {
    const miss = t - reps, pct = reps / t, missTxt = miss === 1 ? "1 rep" : miss + " reps", cheer = ["Target centrato 💪", "Pulita e a target ✓", "Perfetta così 👌", "Ottima serie 💪"][(reps + Math.round(kg || 0)) % 4];
    const hasLast = lr && lr.kg != null && lr.reps != null && kg != null;
    const up = hasLast ? kg - lr.kg : 0;
    // forza attesa oggi = forza dell'ultima volta × fattore di forma/rientro
    const e1 = hasLast ? e1rm(kg, reps) : 0, exp = hasLast ? e1rm(lr.kg, lr.reps) * f : 0;
    if (reps >= t) { cls = "ok"; msg = reps > t ? `+${reps - t} oltre il target 🔥` : off ? "Target pieno anche oggi 💪" : cheer; }
    else if (hasLast && e1 >= exp * 0.99 && (up > 0 || off) && (off || miss < CLIMB_MISS)) { cls = "prog"; msg = off ? `${missTxt} in meno, ma ci sei 👍` : `−${missTxt} ma +${fmt(up)} kg: più forte 💪`; }
    else if (hasLast && up > 0 && pct < 0.6 && !off) { cls = "prog"; msg = `Peso nuovo troppo: prossima volta ${fmt(lr.kg)} kg e più reps`; }
    else if (!off && miss >= CLIMB_MISS && !(cond && cond.last)) { cls = "prog"; msg = `${reps} su ${t}: la prossima serie scende ⟳`; } // coerente con l'adattamento in seduta
    else if (hasLast && up > 0) { cls = "prog"; msg = `+${fmt(up)} kg: ci sta perdere qualche rep`; }
    else if (pct >= 0.6 || off) { cls = "prog"; msg = !off && miss >= CLIMB_MISS ? `${reps} su ${t}: prossima volta stesso carico` : `Pulita, −${missTxt}: carico giusto 👍`; }
    else { cls = "prog"; msg = `${reps} su ${t}: se si ripete, scendi un po'`; }
  }
  if (!dirty && goal && reps != null && t != null && reps >= t) { cls = "ok"; msg = reps >= goal ? (reps >= t + 2 ? `${reps} reps: prossima volta il salto 🚀` : `Obiettivo ${goal} preso, quasi al salto ✓`) : `Target pieno · obiettivo ${goal}`; }
  else if (!dirty && reps != null && t != null && reps >= t && eff === "hard") { cls = "ok"; msg = "A target ma al limite: consolida 💪"; }
  else if (!dirty && reps != null && t != null && reps >= t && eff === "easy") { cls = "ok"; msg = "Facile: prossima volta si sale 🚀"; }
  if (dirty && reps != null) { // serie sporca: mai verde; dice cosa succede la prossima volta, in base alle reps pulite
    const dn = +dirty || 1, cr = Math.max(0, reps - dn);
    if (t == null) { cls = "near"; msg = `${dn} ${dn === 1 ? "sporca" : "sporche"}: la prossima falla più pulita`; }
    else if (dn === 1 && cr >= t) { cls = "prog"; msg = `Hai spinto: ${cr} pulite, prossima volta si sale 🔥`; }
    else if (dn >= 3 || cr <= t - 3) { cls = "near"; const nk = kg != null ? suggestKg({ kg, reps, dirty: dn }, null, 1, t, cond && cond.step) : null; msg = nk != null && nk < kg ? `${cr} pulite su ${t}: prossima volta ${fmt(nk)} kg qui` : `${cr} pulite su ${t}: prossima volta un po' meno`; }
    else { cls = "near"; msg = dn === 1 ? `1 sporca, ${cr} pulite: prossima volta stesso carico` : `2 sporche: stesso carico, falla più pulita`; }
  }
  for (const c of ["ok", "prog", "near", "ko"]) rpEl.classList.toggle(c, c === cls);
  fb.textContent = msg; fb.className = "fb " + cls; fb.hidden = !msg;
}
function fillPanel(panel, ex) {
  const a = imgs(ex);
  panel.innerHTML = `
    ${a.length ? `<div class="gallery">${a.map((f, i) => `<button class="shot ${f.draw ? "draw" : ""}" data-i="${i}" aria-label="Ingrandisci ${esc(f.cap)}"><img src="${f.src}" alt="${esc(ex.name)} — ${esc(f.cap)}" loading="lazy"><span>${esc(f.cap)}</span></button>`).join("")}</div>` : ""}
    ${ex.imgNote ? `<p class="note" style="padding:0 14px">${esc(ex.imgNote)}</p>` : ""}
    ${ex.m ? `<div class="muscles">${bodySVG(ex.m)}<div class="legend">
      <div class="p"><i></i><div><small>Principali</small>${esc(ex.ml || mnames(ex.m.p))}</div></div>
      ${(ex.m.s || []).length ? `<div class="s"><i></i><div><small>Secondari</small>${esc(mnames(ex.m.s))}</div></div>` : ""}</div></div>` : ""}
    <div class="cues">${(ex.cues || []).length ? `<h4>Esecuzione</h4><ol>${ex.cues.map(x => `<li>${esc(x)}</li>`).join("")}</ol>` : ""}
      ${(ex.errors || []).length ? `<h4>Errori da evitare</h4><ul>${ex.errors.map(x => `<li><span>${esc(x)}</span></li>`).join("")}</ul>` : ""}</div>`;
  panel.querySelectorAll(".shot").forEach(b => b.onclick = () => openLB(ex, +b.dataset.i));
  const gal = panel.querySelector(".gallery"), n = a.length;
  if (gal && n > 1) { const dots = document.createElement("div"); dots.className = "gdots"; dots.innerHTML = a.map((_, i) => `<i${i ? "" : ' class="on"'}></i>`).join(""); gal.after(dots);
    gal.addEventListener("scroll", () => { const sh = [...gal.children], c = gal.scrollLeft + gal.clientWidth / 2; let k = 0, best = 1e9; sh.forEach((el, i) => { const d = Math.abs(el.offsetLeft + el.offsetWidth / 2 - c); if (d < best) { best = d; k = i; } }); dots.querySelectorAll("i").forEach((d, i) => d.classList.toggle("on", i === k)); }, { passive: true }); }
}

// ---------- scrittura ----------
function edit(ex, i, field, val) {
  const s = JSON.parse(JSON.stringify(current()));
  s.ex[ex.key] = s.ex[ex.key] || [];
  while (s.ex[ex.key].length < ex.sets.length) s.ex[ex.key].push({ kg: null, reps: null });
  const v = field === "dirty" ? (val ? (+val || 1) : undefined) : field === "eff" ? (val || undefined) : num(val);
  s.ex[ex.key][i] = { ...s.ex[ex.key][i], [field]: v };
  if (field === "reps") { const r = s.ex[ex.key][i], d = dayObj(), idx = d.ex.findIndex(e => e.key === ex.key);
    if (v == null) { delete r.at; delete r.lr; delete r.lrOk; }
    else if (!r.at && s.date === todayISO()) { r.at = Date.now();
      const g = i > 0 && !circGroup(d, idx) ? restGap(s.ex[ex.key][i - 1], r, ex, i) : null; if (isLong(g, restFor(ex), s.buddy)) r.lr = g; } }
  if (v != null && !["dirty", "eff"].includes(field) && !(s.ord || []).includes(ex.key)) s.ord = [...(s.ord || []), ex.key]; // ordine reale di esecuzione
  if (v != null && !["dirty", "eff"].includes(field)) { stampTime(s); if (field === "reps") S.repsAt = Date.now(); if (S.between && field === "kg") { S.between = null; setTimeout(drawTimer, 0); } if (s.later && s.later[ex.key]) delete s.later[ex.key]; }
  if (field === "kg" && FE && (FE.key !== ex.key || FE.i !== i)) closeFeel();
  if (v != null && !["dirty", "eff"].includes(field) && T.key && T.key !== tKey(ex) && (running() || T.left != null)) stopRest(); // altro esercizio: il recupero si ferma // passi alla serie dopo: la domanda sparisce
  s.updatedAt = Date.now(); D.sessions[s.id] = s; save(); updateProgress();
  if (field === "reps") try { localStorage.setItem(LKEY, JSON.stringify({ gym: S.gym, day: S.day, date: S.date, key: ex.key, i })); } catch (e) {}
}
// prossima serie da fare dopo (esercizio idx, serie i): la stessa se mancano le reps, altrimenti la successiva
// (nel circuito segue l'ordine del giro; dopo l'ultima serie passa al primo set dell'esercizio dopo)
function nextSet(d, idx, i) {
  const ex = d.ex[idx], r = exSets(current(), ex.key)[i], g = circGroup(d, idx);
  let k = ex.key;
  if (r && r.reps != null) {
    if (g) { if (!g.last) k = d.ex[idx + 1].key; else { k = d.ex[g.start].key; i++; } if (!$(`rp-${k}-${i}`)) { k = (d.ex[g.end + 1] || ex).key; i = 0; } }
    else if (i < need(ex, current()) - 1) i++;
    else { const n = nextOpenUnit(d, idx); if (n) ({ k, i } = n); else if (d.ex[idx + 1]) { k = d.ex[idx + 1].key; i = 0; } }
  }
  return { k, i };
}
// primo esercizio non finito dopo idx (poi dall'inizio): serve quando cambi ordine (es. macchina occupata)
function nextOpenUnit(d, idx) {
  const s = current(), all = dayUnitsList(d, s).filter(u => !u.done), now = all.filter(u => !isLater(s, u.keys[0])), us = now.length ? now : all; if (!us.length) return null;
  const pos = u => d.ex.findIndex(e => e.key === u.keys[0]);
  const u = us.find(x => pos(x) > idx) || us[0];
  if (u.circ) return { k: u.keys[0], i: 0 };
  const sets = exSets(s, u.ex.key), j = u.ex.sets.findIndex((_, n) => !sets[n] || sets[n].reps == null);
  return { k: u.ex.key, i: Math.max(0, j) };
}
// Dopo ✓ (tastiera chiusa) iPhone riposiziona la pagina: aspettiamo che la tastiera sia giù e portiamo
// con uno scorrimento fluido alla prossima serie da fare (se l'esercizio cambia, mostriamo la sua scheda dall'inizio).
document.addEventListener("focusout", e => {
  const inp = e.target; if (!inp.matches || !inp.matches(".set input")) return;
  checkMissing();
  if (e.relatedTarget && e.relatedTarget.matches("input, textarea, select")) return; // passa a un altro campo: tastiera resta su
  const m = inp.id.match(/^(kg|rp)-(.+)-(\d+)$/); if (!m) return;
  const d = dayObj(), idx = d.ex.findIndex(x => x.key === m[2]); if (idx < 0) return;
  const t = m[1] === "rp" ? nextSet(d, idx, +m[3]) : { k: m[2], i: +m[3] };
  let done = false;
  const go = () => {
    if (done) return; done = true; const held = S.hold === m[2]; clearTimeout(S.moveT); clearInterval(S.moveI); S.hold = null; S.moveAt = null; S.moveGo = null; if (held) drawTimer();
    if (document.activeElement && document.activeElement.matches("input, textarea")) return; // l'utente ha già toccato un altro campo
    const dd = dayObj(), uu = dayUnitsList(dd, current()), cu = currentUnit(dd, current(), uu);
    const ue = uu.find(x => x.keys.includes(m[2])); if (ue && ue.done) S.exOpen.delete(ue.keys[0]); // finito: si chiude
    if (uu.filter(x => unitOpen(x, cu)).map(x => x.keys[0]).join(",") + "|" + (cu ? cu.keys[0] : "") !== S.sig) renderLog(); else { markNext(); updateProgress(); }
    const row = ensureRow(t.k, t.i); if (!row) return;
    const card = row.closest(".ex"), con = document.querySelector(".console");
    const rb = row.getBoundingClientRect(), tm = $("timer"), barTop = tm && !tm.hidden ? $("tbox").getBoundingClientRect().top : innerHeight - 70;
    // esercizio nuovo: mostra la scheda dall'alto, ma la serie da fare deve restare sopra la barra del timer
    const top = t.k !== m[2] && card
      ? Math.max(card.getBoundingClientRect().top + scrollY - (con ? con.getBoundingClientRect().bottom : 0) - 10, rb.bottom + scrollY - (barTop - 12))
      : rb.top + scrollY - (innerHeight - row.offsetHeight) / 2;
    scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    if (t.k !== m[2] || t.i !== +m[3]) { row.classList.remove("here"); void row.offsetWidth; row.classList.add("here"); setTimeout(() => row.classList.remove("here"), 2600); }
  };
  // esercizio appena finito: resta aperto FINISH_HOLD dall'ultima serie, poi si chiude e si passa al prossimo ("Vai ora" per non aspettare)
  const ue0 = dayUnitsList(d, current()).find(x => x.keys.includes(m[2]));
  if (m[1] === "rp" && t.k !== m[2] && ue0 && ue0.done && !ue0.skip) {
    clearTimeout(S.moveT); clearInterval(S.moveI);
    S.hold = m[2]; S.moveAt = Math.max(Date.now() + 1000, (S.repsAt || Date.now()) + FINISH_HOLD); S.moveGo = go;
    S.moveT = setTimeout(go, S.moveAt - Date.now()); S.moveI = setInterval(() => drawTimer(), 1000); drawTimer();
    return;
  }
  const vv = window.visualViewport;
  if (vv) vv.addEventListener("resize", () => setTimeout(go, 60), { once: true });
  setTimeout(go, 450);
});
const FINISH_HOLD = 5000; // 5" dopo l'ultima serie (o l'ultimo giro) prima di chiudere l'esercizio (scelta dell'utente del 18/11/2026; prima 10")
// ---------- ripresa: all'apertura torna all'ultima serie compilata oggi ----------
const LKEY = "palestra-last";
function resumeLast(force) {
  let L = null; try { L = JSON.parse(localStorage.getItem(LKEY)); } catch (e) {}
  if (!L || L.date !== todayISO()) return false;
  if (S.view !== "log") { if (!force) return false; S.view = "log"; render(); }
  if (L.gym !== S.gym || L.day !== S.day || S.date !== L.date) { if (!GYMS.some(g => g.id === L.gym) || !plan().days.some(d => d.id === L.day)) return; S.gym = L.gym; S.day = L.day; S.date = L.date; render(); }
  const d = dayObj(), idx = d.ex.findIndex(e => e.key === L.key); if (idx < 0) return;
  // prossima serie da fare: la stessa se mancano le reps, altrimenti la successiva (nel circuito segue l'ordine del giro)
  const { k, i } = nextSet(d, idx, L.i);
  const row = ensureRow(k, i); if (!row) return false;
  const go = () => row.scrollIntoView({ block: "center", behavior: force ? "smooth" : "auto" });
  go(); if (!force) setTimeout(go, 350);
  row.classList.remove("here"); void row.offsetWidth; row.classList.add("here"); setTimeout(() => row.classList.remove("here"), 2600);
  return true;
}
function setSess(patch) { const s = JSON.parse(JSON.stringify(current())); Object.assign(s, patch); s.updatedAt = Date.now(); D.sessions[s.id] = s; save(); renderLog(); }
let noteT;
$("note").oninput = e => { clearTimeout(noteT); const v = e.target.value; noteT = setTimeout(() => { const s = JSON.parse(JSON.stringify(current())); s.note = v; s.updatedAt = Date.now(); D.sessions[s.id] = s; save(); }, 300); };
$("date").onchange = e => { if (e.target.value) { S.date = e.target.value; S.exOpen.clear(); render(); } };
document.addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.matches(".set input")) {
    // circuito: dalle reps passa all'esercizio successivo del giro (o al giro dopo dal primo esercizio)
    const m = e.target.id.match(/^rp-(.+)-(\d+)$/), d = dayObj(), idx = m ? d.ex.findIndex(x => x.key === m[1]) : -1, g = idx >= 0 ? circGroup(d, idx) : null;
    if (g) { const i = +m[2], tgt = !g.last ? $(`rp-${d.ex[idx + 1].key}-${i}`) : $(`rp-${d.ex[g.start].key}-${i + 1}`);
      if (tgt) { e.preventDefault(); tgt.focus(); tgt.scrollIntoView({ block: "center", behavior: "smooth" }); return; } }
  }
  if (e.key === "Enter" && e.target.matches(".set input")) { e.preventDefault(); const all = [...document.querySelectorAll(".set input")]; const n = all[all.indexOf(e.target) + 1]; if (n) n.focus(); else e.target.blur(); }
  if (e.key === "Escape" && !$("lb").hidden) closeLB();
});

// ---------- visore con zoom ----------
let LB = null;
function openLB(ex, i) {
  const a = imgs(ex); if (!a.length) return;
  $("lbt").textContent = ex.name;
  const tr = $("lbtrack");
  const fr = execFrames(ex), anim = fr.length >= 2;
  tr.innerHTML = (anim ? `<figure class="anim"><div class="av zt">${fr.map(f => `<img src="${f.src}" alt="${esc(ex.name)} — movimento" class="${f.draw ? "draw" : ""}" draggable="false">`).join("")}</div></figure>` : "")
    + a.map(f => `<figure><img class="zt" src="${f.src}" alt="${esc(ex.name)} — ${esc(f.cap)}" draggable="false"></figure>`).join("");
  i = i < 0 ? 0 : i + (anim ? 1 : 0); // -1 = parti dall'animazione (miniatura); n = n-esima immagine della galleria
  $("lb").hidden = false; document.body.style.overflow = "hidden";
  requestAnimationFrame(() => { tr.scrollLeft = tr.clientWidth * i; });
  tr.querySelectorAll(".zt").forEach(setupZoom);
  $("lbclose").focus();
}
// chiusura del visore: tasto "Chiudi" in basso e trascinamento verso il basso (se non è ingrandito)
(() => {
  const lb = $("lb"), tr = $("lbtrack"); if (!lb || !tr) return;
  $("lbclose2").onclick = () => closeLB();
  let y0 = null, x0 = 0, dy = 0, lock = null;
  tr.addEventListener("touchstart", e => { if (e.touches.length !== 1 || tr.classList.contains("zoomed")) { y0 = null; return; } y0 = e.touches[0].clientY; x0 = e.touches[0].clientX; dy = 0; lock = null; }, { passive: true });
  tr.addEventListener("touchmove", e => { if (y0 == null || e.touches.length !== 1 || tr.classList.contains("zoomed")) { y0 = null; tr.style.transform = ""; lb.style.background = ""; return; }
    const t = e.touches[0]; if (!lock) { const ax = Math.abs(t.clientX - x0), ay = Math.abs(t.clientY - y0); if (ax < 6 && ay < 6) return; lock = ay > ax ? "y" : "x"; }
    if (lock !== "y") return; dy = Math.max(0, t.clientY - y0); tr.style.transition = "none"; tr.style.transform = `translateY(${dy}px)`; lb.style.background = `rgba(5,7,9,${Math.max(0.35, 0.97 - dy / 500)})`; }, { passive: true });
  tr.addEventListener("touchend", () => { if (y0 == null) return; tr.style.transition = ""; if (lock === "y" && dy > 110) closeLB(); tr.style.transform = ""; lb.style.background = ""; y0 = null; });
})();
function closeLB() { $("lbtrack").style.transform = ""; $("lb").style.background = ""; $("lb").hidden = true; document.body.style.overflow = ""; $("lbtrack").classList.remove("zoomed"); }
$("lbclose").onclick = closeLB;
function setupZoom(img) {
  const tr = $("lbtrack");
  let sc = 1, tx = 0, ty = 0, pts = new Map(), start = null, lastTap = 0;
  const apply = () => { img.style.transform = `translate(${tx}px,${ty}px) scale(${sc})`; tr.classList.toggle("zoomed", sc > 1.01); };
  const clamp = () => { const w = img.offsetWidth, h = img.offsetHeight; const minX = w - w * sc, minY = h - h * sc; tx = Math.min(0, Math.max(minX, tx)); ty = Math.min(0, Math.max(minY, ty)); if (sc <= 1.01) { sc = 1; tx = 0; ty = 0; } };
  const local = (x, y) => { const r = img.getBoundingClientRect(); return { x: x - r.left + tx * 0, y: y - r.top + ty * 0, r }; };
  const zoomAt = (cx, cy, ns) => { const r = img.getBoundingClientRect(); const px = (cx - r.left) / sc, py = (cy - r.top) / sc; ns = Math.max(1, Math.min(5, ns)); tx = tx + (px * sc - px * ns); ty = ty + (py * sc - py * ns); sc = ns; clamp(); apply(); };
  img.addEventListener("pointerdown", e => {
    img.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2) { const [a, b] = [...pts.values()]; start = { d: Math.hypot(a.x - b.x, a.y - b.y), sc, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; }
    else if (pts.size === 1) {
      const now = Date.now();
      if (now - lastTap < 300) { zoomAt(e.clientX, e.clientY, sc > 1.01 ? 1 : 2.5); lastTap = 0; } else lastTap = now;
      start = { x: e.clientX, y: e.clientY, tx, ty, pan: true };
    }
  });
  img.addEventListener("pointermove", e => {
    if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2 && start && start.d) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); zoomAt(start.cx, start.cy, start.sc * d / start.d); start.sc = sc; start.d = d; }
    else if (pts.size === 1 && start && start.pan && sc > 1.01) { tx = start.tx + (e.clientX - start.x); ty = start.ty + (e.clientY - start.y); clamp(); apply(); }
  });
  const end = e => { pts.delete(e.pointerId); if (pts.size < 2 && start && start.d) start = null; if (pts.size === 0) start = null; };
  img.addEventListener("pointerup", end); img.addEventListener("pointercancel", end);
  img.addEventListener("wheel", e => { e.preventDefault(); zoomAt(e.clientX, e.clientY, sc * (e.deltaY < 0 ? 1.2 : 1 / 1.2)); }, { passive: false });
}

// numero dell'esercizio: a Sparta in numeri romani (I, II, III…), altrove 01, 02…
const ROM = [["X", 10], ["IX", 9], ["V", 5], ["IV", 4], ["I", 1]];
function exNum(n) { if (document.documentElement.dataset.theme !== "sparta") return String(n).padStart(2, "0"); let r = ""; for (const [k, v] of ROM) while (n >= v) { r += k; n -= v; } return r; }
// grafica della palestra scelta (PALESTRE[].theme in schede.js → html[data-theme] in style.css)
function setTheme() {
  const t = (GYMS.find(g => g.id === S.gym) || {}).theme || ""; if (document.documentElement.dataset.theme === t) return;
  document.documentElement.dataset.theme = t;
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#0B0E12";
}
// ---------- progressi ----------
function renderProg() {
  const p = plan(); S.pday = S.pday || S.day;
  { // traguardi
    const st = streakInfo(), all = Object.values(D.sessions).filter(hasData), p0 = plan();
    let recs = 0; const ps = gymSessions(S.gym).filter(x => home(x) && !isOffDay(x));
    for (const dd of p0.days) for (const e of dd.ex) { if (e.nolog || e.bw) continue; let best = 0;
      for (const x of ps.filter(x => exHas(x, e.key, ""))) { const b = bestSet(exSets(x, e.key), false); if (!b) continue; if (best && b.v > best * 1.001 && x.plan === p0.id) recs++; best = Math.max(best, b.v); } }
    const sets = all.filter(x => x.plan === p0.id).flatMap(x => Object.values(x.ex || {}).flat()).filter(r => r && r.reps != null), cl = sets.length ? Math.round(sets.filter(r => !r.dirty).length / sets.length * 100) : null;
    let box = $("goals"); if (!box) { box = document.createElement("div"); box.id = "goals"; box.className = "goals"; const h = $("pdays").parentNode.querySelector("h2"); (h || $("pdays")).before(box); }
    box.innerHTML = `<div><b>🔥 ${st.n}</b><span>settimane complete di fila</span><small>record ${st.best}</small></div>
      <div><b>🏆 ${recs}</b><span>record in questa scheda</span><small>${esc(GYMS.find(g => g.id === S.gym).name.split(" ")[0])}</small></div>
      <div><b>💪 ${all.length}</b><span>sedute registrate</span><small>${(n => n ? `prossimo traguardo ${n}` : "")(MILESTONES.find(m => m > all.length))}</small></div>
      <div><b>✨ ${cl == null ? "—" : cl + "%"}</b><span>serie pulite</span><small>in questa scheda</small></div>`;
  }
  if (!$("progReport")) { ($("goals") || $("pdays")).insertAdjacentHTML("afterend", `<button type="button" class="infobtn rep-btn" id="progReport"><span><b>📋 Report per il PT</b><small>progressi, fastidi e sostituzioni della scheda, da mandargli</small></span><svg viewBox="0 0 24 24" class="ib-c"><path d="M9 6l6 6-6 6"/></svg></button>`); $("progReport").onclick = openReport; }
  const d = p.days.find(x => x.id === S.pday) || p.days[0];
  document.body.classList.toggle("g1", GYMS.findIndex(g => g.id === S.gym) === 1); setTheme();
  $("pk").textContent = `${GYMS.find(g => g.id === S.gym).name} · ${p.name}`;
  $("pdays").innerHTML = p.days.map(x => `<button data-d="${x.id}" aria-pressed="${x.id === d.id}"><b>${esc(x.id)}</b><small>${esc(x.name)}</small></button>`).join("");
  $("pdays").querySelectorAll("button").forEach(b => b.onclick = () => { S.pday = b.dataset.d; renderProg(); });
  renderHist();
  renderTrend(p, d);
  const box = $("prog"); box.textContent = "";
  const ss = gymSessions(S.gym);
  if (!ss.length) { box.innerHTML = `<div class="empty">Ancora nessuna seduta registrata in questa palestra. Compila un allenamento e qui compaiono i grafici.</div>`; return; }
  d.ex.forEach((ex, idx) => {
    const cg = isCircNoLog(d, idx);
    if (cg) { if (idx !== cg.start) return;
      const done = ss.filter(s => circCount(s, ex.circ) > 0), l = done[done.length - 1], row = document.createElement("div"); row.className = "pr";
      row.innerHTML = `<div><div class="n">Circuito ${esc(ex.circ)}</div><div class="s">${done.length ? `${done.length} sedute · ultima ${fmtDate(l.date)}: ${circCount(l, ex.circ)}/${ex.sets.length} giri` : "Nessun dato"}</div></div>`;
      box.appendChild(row); return; }
    const all = ss.filter(s => exHas(s, ex.key)).map(s => ({ i: index(exSets(s, ex.key)), m: maxKg(exSets(s, ex.key)), hit: allHit(exSets(s, ex.key), ex), dirty: exSets(s, ex.key).filter(r => r && r.dirty).length, off: isOffDay(s) || oooOff(s, ex.key) || isAway(s) }));
    const pts = all.filter(x => !x.off), nOff = all.length - pts.length;
    let stat = "Nessun dato", pill = "";
    if (pts.length) {
      const a = pts[0], z = pts[pts.length - 1], q = pts[pts.length - 2];
      const dP = q && q.i ? (z.i - q.i) / q.i : null, dF = a.i ? (z.i - a.i) / a.i : null;
      stat = `${pts.length} sedute${nOff ? ` (+${nOff} escluse dal trend: giornate no o fuori ordine)` : ""} · ${z.m != null ? "max " + fmt(z.m) + " kg · " : ""}indice ${Math.round(z.i)}${dF != null && pts.length > 1 ? ` (${dF >= 0 ? "+" : ""}${(dF * 100).toFixed(1).replace(".", ",")}% dalla 1ª)` : ""}`;
      if (dP != null) pill = dP > 0.03 ? `<span class="pill up">↑ in crescita</span>` : dP < -0.03 ? `<span class="pill down">↓ in calo</span>` : `<span class="pill">→ stabile</span>`;
      if (z.dirty) pill += ` <span class="pill near">ultima volta ${z.dirty} ${z.dirty === 1 ? "serie sporca" : "serie sporche"}</span>`;
      else if (z.hit) pill += ` <span class="pill up">prossima: aumenta</span>`;
    }
    const row = document.createElement("div"); row.className = "pr";
    row.innerHTML = `<div><div class="n">${esc(ex.name)}</div><div class="s">${stat}</div>${pill ? `<div class="pills">${pill}</div>` : ""}</div>${spark(pts.map(x => x.i))}`;
    box.appendChild(row);
  });
}
// ---------- andamento della scheda, settimana per settimana ----------
// Per il giorno scelto e la palestra scelta: per ogni esercizio la serie migliore di ogni settimana della scheda
// (forza stimata = kg × (1 + reps/30); a corpo libero = reps). Escluse giornate no, rientri e serie sporche.
// Il miglioramento del giorno = media delle variazioni degli esercizi rispetto alla loro prima settimana.
function weekOf(p, date) { const from = p.from || date; return Math.floor((new Date(date + "T12:00") - new Date(from + "T12:00")) / (7 * 864e5)) + 1; }
function bestSet(sets, bw) {
  let best = null;
  for (const r of sets || []) {
    if (!okRec(r) || r.reps == null || (!bw && r.kg == null)) continue;
    const v = bw && r.kg == null ? cleanR(r) : e1rm(r.kg, cleanR(r));
    if (!best || v > best.v) best = { v, r };
  }
  return best;
}
function trendData(p, d, gym) {
  const ss = gymSessions(gym).filter(s => s.plan === p.id && s.day === d.id && !isOffDay(s));
  const weeks = [...new Set(ss.map(s => weekOf(p, s.date)))].filter(w => w >= 1).sort((a, b) => a - b);
  const exs = d.ex.filter((e, idx) => !isCircNoLog(d, idx)).map(e => {
    const byW = {};
    for (const s of ss) { if (oooOff(s, e.key) || isAway(s) || subOf(s, e.key) || preReset(s, e.key)) continue; const w = weekOf(p, s.date), b = bestSet(exSets(s, e.key), e.bw); if (b && (!byW[w] || b.v > byW[w].v)) byW[w] = b; }
    const w0 = weeks.find(w => byW[w]);
    return { e, byW, base: w0 ? byW[w0].v : null };
  });
  const dayPct = weeks.map(w => { const r = exs.filter(x => x.base && x.byW[w]).map(x => x.byW[w].v / x.base - 1); return r.length ? r.reduce((a, b) => a + b, 0) / r.length : null; });
  return { weeks, exs, dayPct };
}
const pctTxt = v => v == null ? "—" : `${v > 0.0005 ? "+" : v < -0.0005 ? "−" : ""}${Math.abs(v * 100).toFixed(1).replace(".", ",").replace(",0", "")}%`;
function trendChart(weeks, pcts) {
  const W = 340, H = 150, L = 34, R = 30, T = 22, B = 26, pts = weeks.map((w, i) => ({ w, v: pcts[i] })).filter(x => x.v != null);
  if (!pts.length) return "";
  const vs = pts.map(x => x.v), mn = Math.min(0, ...vs), mx = Math.max(0.02, ...vs), span = mx - mn || 1;
  const X = i => L + (weeks.length > 1 ? i * (W - L - R) / (weeks.length - 1) : (W - L - R) / 2), Y = v => T + (mx - v) / span * (H - T - B);
  const idx = w => weeks.indexOf(w);
  const path = pts.map((x, k) => `${k ? "L" : "M"}${X(idx(x.w)).toFixed(1)},${Y(x.v).toFixed(1)}`).join("");
  const area = pts.length > 1 ? `${path}L${X(idx(pts[pts.length - 1].w)).toFixed(1)},${(H - B).toFixed(1)}L${X(idx(pts[0].w)).toFixed(1)},${(H - B).toFixed(1)}Z` : "";
  return `<svg class="tchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Miglioramento per settimana">
    <defs><linearGradient id="ta" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="a1"/><stop offset="1" class="a2"/></linearGradient></defs>
    ${area ? `<path class="ar" d="${area}"/>` : ""}
    <line class="z" x1="${L}" x2="${W - R}" y1="${Y(0)}" y2="${Y(0)}"/><text class="ax" x="${L - 6}" y="${Y(0) + 4}" text-anchor="end">0%</text>
    ${weeks.map((w, i) => `<text class="ax" x="${X(i)}" y="${H - 8}" text-anchor="middle">S${w}</text>`).join("")}
    ${pts.length > 1 ? `<path class="l" d="${path}"/>` : ""}
    ${pts.map(x => `<circle cx="${X(idx(x.w))}" cy="${Y(x.v)}" r="4"/><text class="lb${x.v < -0.0005 ? " dn" : ""}" x="${X(idx(x.w))}" y="${Y(x.v) - 9}" text-anchor="middle">${pctTxt(x.v)}</text>`).join("")}
  </svg>`;
}
function renderTrend(p, d) {
  const box = $("trend"), { weeks, exs, dayPct } = trendData(p, d, S.gym);
  if (!weeks.length) { box.innerHTML = `<div class="empty">Nessuna seduta di ${esc(d.id)} in questa scheda (palestra ${esc(GYMS.find(g => g.id === S.gym).name)}).</div>`; return; }
  const last = dayPct[dayPct.length - 1], wk = weeks.length;
  // serie pulite: tutte le serie registrate del giorno in questa scheda (giornate no comprese: l'esecuzione conta sempre)
  const cl = (ss) => { let n = 0, c = 0; for (const s of ss) d.ex.forEach((e, idx) => { if (isCircNoLog(d, idx)) return; exSets(s, e.key).forEach(r => { if (r && r.reps != null) { n++; if (!r.dirty) c++; } }); }); return n ? c / n : null; };
  const dss = gymSessions(S.gym).filter(s => s.plan === p.id && s.day === d.id), lastW = dss.length ? weekOf(p, dss[dss.length - 1].date) : null;
  const clAll = cl(dss), clW = lastW != null ? cl(dss.filter(s => weekOf(p, s.date) === lastW)) : null, pc0 = x => Math.round(x * 100) + "%";
  const from = w => { const t = new Date((p.from || todayISO()) + "T12:00"); t.setDate(t.getDate() + (w - 1) * 7); return fmtDate(t.toISOString().slice(0, 10)).slice(0, 5); };
  const cell = (x, w, i) => {
    const b = x.byW[w]; if (!b) return `<td class="na">—</td>`;
    const r = b.r, set = `${r.kg != null ? fmt(r.kg) + "×" : ""}${r.reps}`, pc = x.base ? b.v / x.base - 1 : null;
    const prevW = weeks.slice(0, i).reverse().find(v => x.byW[v]), dir = prevW ? (b.v > x.byW[prevW].v * 1.001 ? "up" : b.v < x.byW[prevW].v * 0.999 ? "dn" : "eq") : "";
    return `<td><b>${set}</b><small class="${dir}">${prevW ? pctTxt(pc) : "base"}</small></td>`;
  };
  box.innerHTML = `
    <div class="tsum card"><div><span>Miglioramento ${esc(d.id)}</span><b class="${last > 0.0005 ? "up" : last < -0.0005 ? "dn" : ""}">${wk > 1 ? pctTxt(last) : "—"}</b></div>
      <p class="note">${wk > 1 ? `dalla 1ª alla ${wk}ª settimana di dati della scheda, media degli esercizi` : "Serve almeno un'altra settimana per vedere il miglioramento."}</p>
      ${trendChart(weeks, dayPct)}
      ${clAll != null ? `<div class="tclean"><span>Serie pulite</span><b class="${clAll >= 0.9 ? "up" : ""}">${pc0(clAll)}</b></div>
      <p class="note">${wk > 1 && clW != null ? `ultima settimana ${pc0(clW)} · ` : ""}conta quanto la forza: meglio un carico un po' più basso fatto bene</p>` : ""}</div>
    <div class="ttab"><table><thead><tr><th>Esercizio</th>${weeks.map(w => `<th>S${w}<small>${from(w)}</small></th>`).join("")}<th>Tot.</th></tr></thead>
      <tbody>${exs.filter(x => x.base).map(x => { const lw = [...weeks].reverse().find(w => x.byW[w]), tot = x.base && lw ? x.byW[lw].v / x.base - 1 : null, first = weeks.find(w => x.byW[w]);
        return `<tr><th>${esc(x.e.name)}</th>${weeks.map((w, i) => cell(x, w, i)).join("")}<td class="tot ${tot > 0.0005 && lw !== first ? "up" : tot < -0.0005 ? "dn" : ""}">${lw && lw !== first ? pctTxt(tot) : "—"}</td></tr>`; }).join("")}</tbody></table></div>
    <p class="note">Serie migliore della settimana (kg × reps). La % è la forza stimata rispetto alla prima settimana: kg × (1 + reps/30). Escluse giornate no, rientri, serie sporche ed esercizi fatti fuori ordine.</p>`;
}
// Storico sedute della palestra: dalla più recente; tocco = dettaglio serie per serie; "Apri" = la riapre in Allenamento
function renderHist() {
  const box = $("hist"), act = plan(), all = gymSessions(S.gym).slice().reverse();
  if (!all.length) { box.innerHTML = `<div class="empty">Nessuna seduta ancora.</div>`; return; }
  const list = S.histAll ? all : all.slice(0, 6);
  box.innerHTML = list.map((s, n) => {
    const p = plans.find(x => x.id === s.plan), d = p && p.days.find(x => x.id === s.day), u = d ? dayUnits(d, s) : null;
    const dirty = Object.values(s.ex || {}).reduce((a, arr) => a + (arr || []).filter(r => r && r.dirty).length, 0);
    const wd = new Date(s.date + "T12:00").toLocaleDateString("it-IT", { weekday: "short", day: "2-digit", month: "2-digit" });
    const info = [u ? `${u.done}/${u.tot} serie` : "", dirty ? `${dirty} ${dirty === 1 ? "sporca" : "sporche"}` : "", isOffDay(s) ? "giornata no" : "", isAway(s) ? "📍 " + (s.site || "altra sede") : "", isBuddy(s) ? "👥 in 2" : "", s.t0 ? "⏱ " + durTxt(s, true) : "", p && p.id !== act.id ? p.name : ""].filter(Boolean).join(" · ");
    const rows = d ? d.ex.map((e, idx) => {
      const g = isCircNoLog(d, idx); if (g) return idx === g.start && circCount(s, e.circ) ? `<li><b>Circuito ${esc(e.circ)}</b><span>${circCount(s, e.circ)}/${e.sets.length} giri</span></li>` : "";
      const sets = exSets(s, e.key).filter(r => r && (r.kg != null || r.reps != null)); if (!sets.length) return "";
      return `<li><b>${esc(subOf(s, e.key) ? subOf(s, e.key) + " ↔" : e.name)}${hasPain(s, e.key) ? " ⚠" : ""}${oooOff(s, e.key) ? " ↕" : ""}</b><span>${sets.map(r => `${r.kg != null ? fmt(r.kg) + "×" : ""}${r.reps ?? "–"}${r.dirty ? "~" + (dN(r) > 1 ? dN(r) : "") : r.help ? "🤝" : ""}`).join(" · ")}</span></li>`;
    }).join("") : "";
    return `<div class="hitem"><button class="hrow" data-h="${n}"><b>${esc(wd)}</b><span>${esc(s.day)}${d ? " · " + esc(d.name) : ""}</span><small>${esc(info)}</small></button>
      <div class="hdet" hidden><ul>${rows}</ul>${(s.note || "").trim() ? `<p class="note">📝 ${esc(s.note)}</p>` : ""}
      ${p && p.id === act.id ? `<button class="btn sm" data-open="${n}">Apri nell'allenamento</button>` : ""}</div></div>`;
  }).join("") + (all.length > list.length ? `<button class="btn sm hmore" id="histAll">Mostra tutte (${all.length})</button>` : "");
  box.querySelectorAll("[data-h]").forEach(b => b.onclick = () => { const det = b.nextElementSibling; det.hidden = !det.hidden; b.classList.toggle("open", !det.hidden); });
  box.querySelectorAll("[data-open]").forEach(b => b.onclick = () => { const s = list[+b.dataset.open]; S.view = "log"; S.gym = s.gym; S.day = s.day; S.date = s.date; S.open.clear(); S.exOpen.clear(); render(); scrollTo(0, 0); });
  if ($("histAll")) $("histAll").onclick = () => { S.histAll = true; renderHist(); };
}
function spark(v) {
  if (v.length < 2) return `<svg class="spark" viewBox="0 0 104 40" aria-hidden="true"><line x1="4" y1="36" x2="100" y2="36"/></svg>`;
  const mn = Math.min(...v), mx = Math.max(...v), r = mx - mn || 1, X = i => 4 + i * (96 / (v.length - 1)), Y = x => 34 - (x - mn) / r * 28;
  const d = v.map((x, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(x).toFixed(1)}`).join("");
  return `<svg class="spark" viewBox="0 0 104 40" aria-label="andamento"><line x1="4" y1="36" x2="100" y2="36"/><path class="a" d="${d}L${X(v.length - 1)},36L4,36Z"/><path class="l" d="${d}"/><circle cx="${X(v.length - 1)}" cy="${Y(v[v.length - 1])}" r="3.2"/></svg>`;
}

// ---------- schede (attiva + archivio, sola lettura) ----------
function renderPlans() {
  const act = plan();
  const box = $("plans"); box.textContent = "";
  [...plans].reverse().forEach(p => {
    const n = Object.values(D.sessions).filter(s => s.plan === p.id && hasData(s)).length;
    const el = document.createElement("div"); el.className = "plan" + (p.id === act.id ? " active" : "");
    el.innerHTML = `<div class="row"><h3>${esc(p.name)}</h3>${p.id === act.id ? `<span class="badge">In uso</span>` : `<span class="pill">Archivio</span>`}</div>
      <p class="note">${p.from ? "Dal " + fmtDate(p.from) : ""}${p.to ? " al " + fmtDate(p.to) : ""} · ${n} sedute registrate</p>
      ${p.days.map(d => `<div class="lrow"><div class="t"><b>${esc(d.id)} — ${esc(d.name)}</b><small>${d.ex.map(e => esc(e.name)).join(" · ")}</small></div></div>`).join("")}`;
    box.appendChild(el);
  });
}

// ---------- backup ----------
function backupData() { return JSON.stringify({ app: "palestra", v: 1, exportedAt: new Date().toISOString(), data: D }, null, 1); }
// Promemoria backup (17/11/2026): dopo 3 sedute nuove o 7 giorni dall'ultimo; anche nel recap. Il telefono non deve cancellare i dati da solo.
const sessSinceBackup = () => { const t = D.prefs.lastBackup ? Date.parse(D.prefs.lastBackup) : 0; return Object.values(D.sessions).filter(s => hasData(s) && (s.updatedAt || 0) > t && s.date >= (D.prefs.lastBackup || "").slice(0, 10)).length; };
const needBackup = () => { const ds = daysSince(D.prefs.lastBackup); return Object.values(D.sessions).some(hasData) && (ds == null || ds >= 7 || sessSinceBackup() >= 3); };
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
async function exportBackup() {
  const name = `palestra-backup-${todayISO()}.json`, blob = new Blob([backupData()], { type: "application/json" });
  let ok = false;
  try {
    const file = new File([blob], name, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: "Backup Palestra" }); ok = true; }
  } catch (e) { if (e && e.name === "AbortError") return; }
  if (!ok) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
  D.prefs.lastBackup = new Date().toISOString(); save(true); toast("Backup creato"); render();
}
$("bkExport").onclick = exportBackup;
$("bkFile").onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const j = JSON.parse(await f.text()); if (!j || j.app !== "palestra" || !j.data) throw 0;
    const inc = j.data; let added = 0;
    for (const [id, s] of Object.entries(inc.sessions || {})) { const l = D.sessions[id]; if (!l || (s.updatedAt || 0) > (l.updatedAt || 0)) { D.sessions[id] = s; added++; } }
    for (const g of Object.keys(inc.setup || {})) D.setup[g] = { ...(inc.setup[g] || {}), ...(D.setup[g] || {}) };
    for (const g of Object.keys(inc.steps || {})) { D.steps = D.steps || {}; D.steps[g] = { ...(inc.steps[g] || {}), ...(D.steps[g] || {}) }; }
    D.rest = { ...(inc.rest || {}), ...(D.rest || {}) }; D.setDur = { ...(inc.setDur || {}), ...(D.setDur || {}) }; D.resets = { ...(inc.resets || {}), ...(D.resets || {}) };
    for (const g of Object.keys(inc.machines || {})) { D.machines = D.machines || {}; D.machines[g] = { ...(inc.machines[g] || {}), ...(D.machines[g] || {}) }; }
    save(true); $("bkMsg").textContent = `Ripristino fatto: ${added} sedute importate o aggiornate.`; toast("Backup ripristinato"); render();
  } catch (err) { $("bkMsg").textContent = "Questo file non è un backup dell'app Palestra."; }
  e.target.value = "";
};
$("csv").onclick = () => {
  const names = {}; plans.forEach(p => p.days.forEach(d => d.ex.forEach(ex => names[ex.key] = ex.name)));
  const rows = [["data", "palestra", "scheda", "giorno", "esercizio", "serie", "kg", "reps", "reps sporche", "sensazione"]];
  Object.values(D.sessions).sort((a, b) => a.date < b.date ? -1 : 1).forEach(s => {
    const pn = (plans.find(p => p.id === s.plan) || {}).name || s.plan, gn = (GYMS.find(g => g.id === s.gym) || {}).name || s.gym;
    Object.entries(s.circ || {}).forEach(([c, n]) => { if (n > 0) rows.push([s.date, gn, pn, s.day, "Circuito " + c, "giri", "", n]); });
    Object.entries(s.ex || {}).forEach(([k, arr]) => (arr || []).forEach((r, i) => { if (r && (r.kg != null || r.reps != null)) rows.push([s.date, gn, pn, s.day, subOf(s, k) ? `${subOf(s, k)} (al posto di ${names[k] || k})` : names[k] || k, i + 1, fmt(r.kg), r.reps ?? "", r.dirty ? dN(r) : "", r.dirty ? "" : r.help ? "aiutata" : r.eff === "easy" ? "facile" : r.eff === "hard" ? "al limite" : "giusta"]); }));
  });
  const csv = "﻿" + rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(";")).join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `palestra-${todayISO()}.csv`; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 1000);
};
function renderMore() {
  const ds = daysSince(D.prefs.lastBackup);
  $("backupInfo").textContent = `${Object.values(D.sessions).filter(hasData).length} sedute salvate · ultimo backup: ${ds == null ? "mai" : ds === 0 ? "oggi" : ds + " giorni fa"}`;
  renderTimerSet();
  $("gymEdit").innerHTML =GYMS.map(g => `<div class="lrow"><div class="t"><b>${esc(g.name)}</b><small>${gymSessions(g.id).length} sedute · carichi e regolazioni separati</small></div></div>`).join("");
}

// ---------- navigazione ----------
document.querySelectorAll(".tabbar button").forEach(b => b.onclick = () => { S.view = b.dataset.view; render(); scrollTo(0, 0); });
function render() {
  if (S.view !== "log") closeSheet();
  if (S.view !== "log" || (FE && !dayObj().ex.some(e => e.key === FE.key))) closeFeel();
  document.querySelectorAll(".tabbar button").forEach(b => b.toggleAttribute("aria-current", b.dataset.view === S.view));
  document.querySelectorAll(".tabbar button[aria-current]").forEach(b => b.setAttribute("aria-current", "page"));
  for (const v of ["log", "prog", "plan", "more"]) $("v-" + v).hidden = S.view !== v;
  $("console").hidden = S.view !== "log"; if (S.view !== "log") togglePanel(false);
  if (S.view === "log") renderLog(); else if (S.view === "prog") renderProg(); else if (S.view === "plan") renderPlans(); else renderMore();
  drawTimer(); drawMissing();
}

// ---------- timer di recupero ----------
// Recupero di base 1:30 (regolabile); se l'esercizio ha "rest" nella scheda, vale quello.
// A fine recupero: vibrazione (Android), suono e tocco aptico (iPhone, dove possibile). Lo schermo resta acceso mentre conta.
const TKEY = "palestra-timer";
const tPrefs = () => { const t = D.prefs.timer = D.prefs.timer || {}; return { sec: t.sec ?? 90, auto: t.auto ?? true, vib: t.vib ?? true, snd: t.snd ?? true, warn: t.warn ?? true, push: t.push ?? false, pushSub: t.pushSub || null, pushId: t.pushId || "", lockNote: t.lockNote ?? false }; };
const setTPref = (k, v) => { D.prefs.timer = D.prefs.timer || {}; D.prefs.timer[k] = v; save(); };
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
  const ph = $("tPhase"); if (!ph || S.phaseEdit) return; const k = phaseKey(), ex = k ? dayObj().ex.find(e => e.key === k) : null, pl = ex ? fmtSec(restFor(ex)) : fmtSec(tPrefs().sec);
  const edit = ex ? `<button type="button" class="tp-ed" id="tpEd">previsto ${pl} ✎</button>` : "";
  let h; const m = /^(.*) · poi serie (\d+)$/.exec(T.label || ""), lb = m ? `S${m[2] - 1} → S${m[2]} · ${m[1]}` : (T.label || "");
  if (run) h = `<span class="tp-k run">● Recupero</span><span class="tp-t">${esc(lb)}</span>${edit}`;
  else if (paused) h = `<span class="tp-k pau">⏸ In pausa</span><span class="tp-t">${esc(lb)}</span>${edit}`;
  else if (done) h = `<span class="tp-k ok">✓ Recupero finito</span><span class="tp-t">tocca il tempo per la prossima serie</span>`;
  else if (S.moveAt) { const n = Math.max(0, Math.ceil((S.moveAt - Date.now()) / 1000)); h = `<span class="tp-k ok">✓ Finito</span><span class="tp-t">chiudo tra ${n}"${S.between && S.between.next ? ` · poi ${esc(S.between.next)}` : ""}</span><button type="button" class="tp-ed" id="tpGo">Vai ora</button>`; }
  else if (S.between) h = `<span class="tp-k chg">↪ Cambio esercizio</span><span class="tp-t">recupero in pausa${S.between.next ? ` · poi ${esc(S.between.next)}` : ""}</span>`;
  else h = `<span class="tp-k">▶ Pronto</span><span class="tp-t">${ex ? esc(ex.name) : "recupero di base"}</span>${edit}`;
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
  else { setTPref("sec", Math.max(15, Math.min(600, tPrefs().sec + d))); tDone = 0; if (S.view === "more") renderMore(); }
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
  return { name: ex.name, set: `Serie ${i + 1} di ${need(ex, current())}`, what: [`${ex.sets[i].t} reps`, kg && !ex.bw ? `${kg} kg` : ""].filter(Boolean).join(" · ") };
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

function renderTimerSet() {
  const p = tPrefs(), canVib = !!navigator.vibrate;
  const tg = (k, label, sub) => `<label class="tgl"><span><b>${label}</b>${sub ? `<small>${sub}</small>` : ""}</span><input type="checkbox" data-k="${k}" ${p[k] ? "checked" : ""}></label>`;
  $("timerSet").innerHTML = `
    <div class="row tdur"><span>Recupero di base</span><button class="btn sm" data-d="-15">−15"</button><b>${fmtSec(p.sec)}</b><button class="btn sm" data-d="15">+15"</button></div>
    <p class="note">Vale per tutti gli esercizi, tranne quelli per cui la scheda indica un recupero diverso. Durante il recupero puoi aggiungere o togliere 15" dalla barra in basso.</p>
    ${tg("auto", "Parte da solo", "quando inserisci le ripetizioni di una serie")}
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
    setTPref(i.dataset.k, i.checked);
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

if ("scrollRestoration" in history) history.scrollRestoration = "manual";
render();
resumeLast();
if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
