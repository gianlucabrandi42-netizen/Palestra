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
  clearTimeout(saveT);
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
    tot += e.sets.length; done += s ? doneSets(s, e) : 0; nEx++;
  });
  return { tot, done, nEx };
}
const exSets = (s, k) => (s.ex && s.ex[k]) || [];
const exHas = (s, k) => exSets(s, k).some(r => r && (r.kg != null || r.reps != null));
function lastBefore(k) { const l = gymSessions(S.gym).filter(s => s.date < S.date && exHas(s, k)); return l[l.length - 1] || null; }
const tnum = t => { const n = parseFloat(String(t)); return isFinite(n) ? n : null; };
function allHit(sets, ex) { return ex.sets.every((st, i) => { const tn = tnum(st.t); if (tn == null) return true; return sets[i] && sets[i].reps != null && sets[i].reps >= tn; }); }
function index(sets) { const k = sets.some(r => r && r.kg != null); let t = 0; for (const r of sets) { if (!r) continue; t += k ? (r.kg || 0) * (r.reps || 0) : (r.reps || 0); } return t; }
// ---------- forma del giorno e rientro dopo una pausa ----------
// Fattori prudenziali (stime, non regole fisse): stanco −10%; pausa 10-20 gg −10%, 21-34 gg −15%, 35+ gg −25%.
const READY = { top: { n: "Al top", f: 1 }, ok: { n: "Normale", f: 1 }, low: { n: "Stanco / giù", f: 0.9 } };
function lastWorkoutBefore(date) { const l = Object.values(D.sessions).filter(s => s.date < date && hasData(s)).sort((a, b) => a.date < b.date ? -1 : 1); return l[l.length - 1] || null; }
function pauseInfo(date) { const l = lastWorkoutBefore(date); if (!l) return { days: null, f: 1 }; const days = Math.round((new Date(date) - new Date(l.date)) / 864e5); return { days, f: days >= 35 ? 0.75 : days >= 21 ? 0.85 : days >= 10 ? 0.9 : 1 }; }
function condition(s) {
  const r = READY[s.readiness || "ok"] || READY.ok, p = s.ignorePause ? { days: null, f: 1 } : pauseInfo(s.date);
  const why = [r.f < 1 ? "giornata no" : "", p.f < 1 ? `rientro dopo ${p.days} giorni` : ""].filter(Boolean).join(" + ");
  return { r, p, f: r.f * p.f, why };
}
const isOffDay = s => condition(s).f < 1;
// seduta normale precedente a "rs" per questo esercizio (per l'aumento serve 2 volte di fila a target e pulite)
function prevRef(k, rs) { const l = gymSessions(S.gym).filter(s => s.date < rs.date && exHas(s, k) && !isOffDay(s) && !oooOff(s, k)); return l[l.length - 1] || null; }
// Riferimento per i suggerimenti: l'ultima seduta "normale" (salta fino a 2 giornate no o di rientro).
function lastRef(k) { const l = gymSessions(S.gym).filter(s => s.date < S.date && exHas(s, k)); for (let i = l.length - 1; i >= Math.max(0, l.length - 3); i--) if (!isOffDay(l[i]) && !oooOff(l[i], k)) return l[i]; return l[l.length - 1] || null; }
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
// Serie "sporca" (ultime reps fatte male / carico troppo alto): niente aumento; se era anche sotto target, −5% su quella serie.
const allClean = sets => !sets.some(r => r && r.dirty);
// Kg suggeriti = un peso che puoi caricare davvero: ultimo carico ± salti interi (step, per esercizio e palestra).
// Aumento = un salto (scelta dell'utente: si sale subito e si accettano 1-2 reps in meno). Riduzioni (giornata no,
// rientro, serie sporca sotto target −5%) = peso disponibile più vicino VERSO IL BASSO. Senza salto noto: +2,5% / 0,5 kg.
// Regola dell'utente (17/11/2026): OGNI serie fatta pulita e a target (o oltre) sale di un salto già la volta dopo.
function setUp(ls, t) { return !!ls && ls.kg != null && t != null && ls.reps != null && ls.reps >= t && !ls.dirty; }
function suggestKg(ls, hit, f, t, step) {
  if (!ls || ls.kg == null) return null; const b = ls.kg; let k = b;
  if (ls.dirty && t != null && ls.reps != null && ls.reps < t) k = b * 0.95;
  else if (setUp(ls, t) && f >= 1) k = step ? b + step : Math.max(b * 1.025, b + 1);
  k *= f;
  if (!step) return roundKg(k);
  if (k >= b - 1e-9) return roundKg(b + Math.round((k - b) / step) * step);
  const d = roundKg(b - Math.ceil((b - k) / step - 1e-9) * step); return d > 0 ? d : b;
}
// ---------- salto dei pesi ----------
const STEPS = [1, 2, 2.5, 5, 10];
// stimato dai pesi già usati in questa palestra: la differenza più piccola tra due carichi diversi, agganciata ai salti tipici
function stepAuto(key, gym) {
  const ks = [...new Set(gymSessions(gym).flatMap(s => exSets(s, key).map(r => r && r.kg).filter(v => v != null && v > 0)))].sort((a, b) => a - b);
  let m = null; for (let i = 1; i < ks.length; i++) { const d = ks[i] - ks[i - 1]; if (d >= 0.9 && (m == null || d < m)) m = d; }
  return m == null ? null : STEPS.reduce((best, x) => Math.abs(x - m) < Math.abs(best - m) ? x : best, STEPS[0]);
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
  $("days").innerHTML = p.days.map(d => `<button data-d="${d.id}" aria-pressed="${d.id === S.day}"><b>${esc(d.id)}</b><small>${esc(d.name)}</small></button>`).join("");
  $("days").querySelectorAll("button").forEach(b => b.onclick = () => { S.day = b.dataset.d; S.open.clear(); S.exOpen.clear(); togglePanel(false); persistPrefs(); render(); scrollTo(0, 0); });
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
    const n = doneSets(s, e);
    u.push({ idx, ex: e, keys: [e.key], name: e.name, done: n === e.sets.length, started: n > 0 });
  });
  u.forEach((x, i) => x.n = i + 1);
  return u;
}
// esercizio "adesso": quello della prossima serie da fare dopo l'ultima compilata; altrimenti il primo non finito
function currentUnit(d, s, units) {
  let L = null; try { L = JSON.parse(localStorage.getItem(LKEY)); } catch (e) {}
  if (L && L.date === S.date && L.gym === S.gym && L.day === S.day) {
    const idx = d.ex.findIndex(e => e.key === L.key);
    if (idx >= 0) { const t = nextSet(d, idx, L.i), u = units.find(x => x.keys.includes(t.k)); if (u && !u.done) return u; }
  }
  return units.find(x => !x.done) || null;
}
const unitOpen = (u, cur) => u === cur || u.keys.some(k => S.exOpen.has(k));
const shortName = n => n.length > 14 ? n.slice(0, 13).trim() + "." : n;
function drawHeader(d, s, units, cur) {
  const tot = units.length, done = units.filter(x => x.done).length, left = tot - done, C = 2 * Math.PI * 18;
  $("ring").innerHTML = `<svg viewBox="0 0 44 44"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="s1"/><stop offset="1" class="s2"/></linearGradient></defs><circle cx="22" cy="22" r="18" class="rb"/><circle cx="22" cy="22" r="18" class="rf" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - (tot ? done / tot : 0))).toFixed(1)}"/></svg><b>${left ? left : "✓"}</b>`;
  $("ring").classList.toggle("all", !left && tot > 0);
  // va a capo solo DOPO un "·" (mai una riga che inizia con "·"): spazio non separabile prima di ogni puntino
  $("dtitle").textContent = `${d.id} · ${d.name}`.replace(/ · /g, "\u202F·\u2009"); // spazi sottili: compatto e simmetrico
  const r = s.readiness || "ok", when = S.date === todayISO() ? "oggi" : new Date(S.date + "T12:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" });
  $("dsub").textContent = `${left ? (left === 1 ? "manca 1 esercizio" : `mancano ${left} esercizi`) : "allenamento completato"} · ${when}${r !== "ok" ? " · " + READY[r].n : ""} ▾`;
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

function updateProgress() {
  const d = dayObj(), s = current();
  const units = dayUnitsList(d, s); drawHeader(d, s, units, currentUnit(d, s, units));
  d.ex.forEach(e => { const c = document.querySelector(`[data-ex="${e.key}"]`); if (c) c.classList.toggle("done", doneSets(s, e) === e.sets.length); });
  document.querySelectorAll(".circ-card").forEach(c => { const e = d.ex.find(x => x.circ === c.dataset.circ); if (e) c.classList.toggle("done", circCount(s, e.circ) >= e.sets.length); });
  checkMissing();
}

function renderLog() {
  renderConsole();
  const p = plan(), d = dayObj(), sess = current();
  // forma del giorno
  const cond = condition(sess);
  $("ready").innerHTML = Object.entries(READY).map(([k, v]) => `<button data-r="${k}" aria-pressed="${(sess.readiness || "ok") === k}">${v.n}</button>`).join("");
  $("ready").querySelectorAll("button").forEach(b => b.onclick = () => { setSess({ readiness: b.dataset.r }); togglePanel(false); });
  const pi = pauseInfo(S.date);
  $("pauseNag").innerHTML = pi.f < 1 && !sess.ignorePause
    ? `<div class="nag info"><span><b>Rientro dopo ${pi.days} giorni.</b> Carichi suggeriti ridotti del ${Math.round((1 - pi.f) * 100)}%: riprendi gradualmente.</span><button class="btn sm" id="noPause">Non è un rientro</button></div>`
    : sess.ignorePause && pi.f < 1 ? `<div class="nag info"><span>Pausa di ${pi.days} giorni ignorata.</span><button class="btn sm" id="noPause">Riattiva</button></div>` : "";
  if ($("noPause")) $("noPause").onclick = () => setSess({ ignorePause: !sess.ignorePause });
  // promemoria backup
  const ds = daysSince(D.prefs.lastBackup), nSess = Object.keys(D.sessions).length;
  $("backupNag").innerHTML = nSess >= 3 && (ds == null || ds >= 14) ? `<div class="nag"><span>${ds == null ? "Non hai ancora fatto un backup." : `Ultimo backup ${ds} giorni fa.`}</span><button class="btn sm" id="nagBk">Backup</button></div>` : "";
  if ($("nagBk")) $("nagBk").onclick = exportBackup;

  const list = $("list"); list.textContent = "";
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
      hit = hit1 && !!pr && allHit(exSets(pr, ex.key), ex) && allClean(exSets(pr, ex.key)), cond = condition(sess), stp = ex.bw ? { v: null } : stepFor(ex.key);
    const ref = ex.ref && ex.ref[S.gym];
    // riga "CARICO" del blocco info: cosa fare oggi con il peso e perché
    let pills = "", load = null;
    if (rs && cond.f < 1) load = { c: "near", t: `↓ Oggi −${Math.round((1 - cond.f) * 100)}%: ${esc(cond.why)}` };
    else if (rs) {
      const lab = i => { let n = 0, out = ""; ex.sets.forEach((st, j) => { if (!st.type || ["std", "alte", "pausa", "risc"].includes(st.type)) n++; if (j === i) out = st.type === "ced" ? "RP" : st.type === "strip" ? "ST" : st.type === "super" ? "SS" : "S" + n; }); return out; };
      const ix = f => ex.sets.map((st, i) => f(refSets[i], tnum(st.t)) ? i : -1).filter(i => i >= 0), names = a => listIt(a.map(lab));
      const up = ix(setUp), dirty = ix(r => r && r.dirty), all = up.length === ex.sets.length, inc = ex.bw ? "aumenta" : stp.v ? `+${fmt(stp.v)} kg` : "sali un po'";
      if (up.length) load = { c: "up", t: `↑ ${all ? "Tutte le serie" : names(up)} a target e pulit${all || up.length > 1 ? "e" : "a"}: ${inc}${all ? "" : `; ${up.length === ex.sets.length - 1 ? "l'altra" : "le altre"} stesso carico`}.${stp.v ? " Ok anche 1-2 reps in meno." : ""}${dirty.length ? ` ${names(dirty)} sporc${dirty.length > 1 ? "he: falle pulite" : "a: falla pulita"}.` : ""}` };
      else if (dirty.length) load = { c: "near", t: "~ Serie sporche l'ultima volta: stesso carico, falle pulite." };
      else load = { c: "", t: "= Stesso carico: l'ultima volta nessuna serie a target." };
    }
    else if (ref) load = { c: "", t: `Scheda precedente: ${fmt(ref)} kg` };
    const cg = circGroup(d, idx);
    if (cg) pills += cg.last ? `<span class="pill circ">Circuito · recupero ${fmtSec(restFor(ex))} a fine giro</span>` : `<span class="pill circ">Circuito · subito il prossimo</span>`;
    const isCur = u === curU, manual = !isCur;
    const oi = oooInfo(sess, ex.key, S.date === todayISO()), prosp = oi && !oi.started;
    const jc = oi && oi.off && !prosp ? { ...cond, ooo: true, why: [cond.why, "fuori ordine"].filter(Boolean).join(" + ") } : cond;
    const fr = execFrames(ex);
    const card = document.createElement("article"); card.className = "ex" + (isCur ? " cur" : ""); card.dataset.ex = ex.key;
    const open = S.open.has(ex.key);
    card.innerHTML = `
      <div class="exh">
        ${fr.length ? `<button class="exec thumb" data-zoom aria-label="Ingrandisci le immagini di ${esc(ex.name)}">
          ${fr.map(f => `<img src="${f.src}" alt="${esc(ex.name)} — ${esc(f.cap)}" class="${f.draw ? "draw" : ""}" loading="lazy">`).join("")}
          <span class="zoom"><svg viewBox="0 0 24 24"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg></span></button>` : ""}
        <div class="t"><div class="exk">${exNum(exN)}${isCur ? " · Adesso" : ""} · Recupero ${fmtSec(restFor(ex))}</div>
          <h3 class="exname">${esc(ex.name)}</h3></div>
      </div>
      ${pills ? `<div class="pills">${pills}</div>` : ""}
      ${oi ? oooBox(oi, prosp) : ""}
      <div class="exinfo">
        ${ex.m && ((ex.m.p || []).length || ex.ml) ? `<div class="ir"><span class="il">Muscoli</span><div class="iv musv"><b>${esc(ex.ml || mnames(ex.m.p))}</b>${(ex.m.s || []).length ? `<small>anche ${esc(mnames(ex.m.s).toLowerCase())}</small>` : ""}</div></div>` : ""}
        ${ex.tec ? `<div class="ir"><span class="il">Schema</span><div class="iv tecv">${esc(ex.tec)}</div></div>` : ""}
        ${load ? `<div class="ir"><span class="il">Carico</span><div class="iv load ${load.c}">${load.t}</div></div>` : ""}
        ${(ex.flash || []).length ? `<div class="ir"><span class="il">Consigli</span><ul class="iv tipl" aria-label="Da ricordare">${ex.flash.map(x => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}
        ${ex.setup === false ? "" : `<div class="ir setup"><label class="il" for="su-${ex.key}">Regolazioni</label><div class="iv"><input id="su-${ex.key}" autocomplete="off" placeholder="+ aggiungi (es. sedile 4)"></div></div>`}
        ${ex.bw ? "" : `<div class="ir"><span class="il">Salto pesi${stp.auto && stp.v ? "<i>stimato</i>" : ""}</span><div class="iv stepsel" role="group" aria-label="Salto dei pesi">${STEPS.map(v => `<button type="button" data-step="${v}" aria-pressed="${stp.v === v}" class="${stp.v === v && stp.auto ? "auto" : ""}">${fmt(v)}</button>`).join("")}</div></div>`}
      </div>
      <div class="sets"><div class="sh"><span>Serie</span><span>Ultima</span><span>${ex.bw ? "kg (opz.)" : "kg"}</span><span>Reps</span><span></span></div></div>
      <div class="exfoot"><button class="btn sm" data-copy>⚡ Usa kg suggeriti</button>
        ${manual ? `<button class="more" data-close>Chiudi</button>` : ""}
        <button class="more" data-more aria-expanded="${open}">Esecuzione<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button></div>
      <div class="panel" ${open ? "" : "hidden"}></div>`;
    const setsEl = card.querySelector(".sets"), cur = exSets(sess, ex.key);
    let sn = 0;
    ex.sets.forEach((st, i) => {
      const ty = TYPES[st.type] || TYPES.std; if (!st.type || st.type === "std" || st.type === "alte" || st.type === "pausa" || st.type === "risc") sn++;
      const label = st.type === "ced" ? "RP" : st.type === "strip" ? "ST" : st.type === "super" ? "SS" : "S" + sn;
      const r = cur[i] || {}, lr = lastSets[i], tn = tnum(st.t), rr = refSets[i];
      const sug = ex.bw ? null : suggestKg(rr, hit, cond.f, tn, stp.v), lk = lr && lr.kg != null ? lr.kg : null;
      const dir = sug == null || lk == null ? "" : sug > lk + 1e-9 ? "up" : sug < lk - 1e-9 ? "dn" : "eq";
      const row = document.createElement("div"); row.className = "set";
      row.innerHTML = `<div class="sn" style="--tc:var(${ty.c})">${label}<small>${esc(st.t)}${ex.bw && tn != null ? "" : ""} reps</small>${ty.n || st.note ? `<em>${esc([ty.n, st.note].filter(Boolean).join(" · "))}</em>` : ""}</div>
        <div class="prev">${lr && (lr.kg != null || lr.reps != null) ? `<b class="lv${lr.dirty ? " dirty" : ""}"${lr.dirty ? ' title="Sporca l\'ultima volta"' : ""}>${lr.kg != null ? fmt(lr.kg) + " × " : ""}${lr.reps ?? "–"}${lr.dirty ? "<i>~</i>" : ""}</b>` : `<b class="lv none">—</b>`}${sug != null ? `<span class="sug ${dir}">${{ up: "↑", dn: "↓", eq: "=" }[dir] || "oggi"} ${fmt(sug)} kg</span>` : ""}</div>
        <input id="kg-${ex.key}-${i}" inputmode="decimal" enterkeyhint="next" autocomplete="off" aria-label="${esc(ex.name)} serie ${i + 1} kg" placeholder="${sug != null ? fmt(sug) : lr && lr.kg != null ? fmt(lr.kg) : ref ? fmt(ref) : "kg"}">
        <input id="rp-${ex.key}-${i}" inputmode="numeric" enterkeyhint="next" autocomplete="off" aria-label="${esc(ex.name)} serie ${i + 1} ripetizioni" placeholder="${tn != null ? tn : "max"}">
        <button type="button" class="dq">~</button><div class="fb"></div>`;
      const [kg, rp] = row.querySelectorAll("input"); kg.value = fmt(r.kg); rp.value = r.reps ?? "";
      const fb = row.querySelector(".fb"), dq = row.querySelector(".dq");
      const isDirty = () => !!(exSets(current(), ex.key)[i] || {}).dirty;
      const upd = () => {
        judge(kg, rp, fb, tn, rr, jc, isDirty());
        const has = num(rp.value) != null, dirty = isDirty();
        dq.classList.toggle("off", !has); dq.disabled = !has; dq.classList.toggle("on", dirty);
        dq.setAttribute("aria-label", dirty ? "Serie sporca: tocca per segnarla pulita" : "Serie pulita: tocca se l'hai sporcata");
      };
      dq.onclick = () => { edit(ex, i, "dirty", !isDirty()); upd(); };
      kg.oninput = e => { edit(ex, i, "kg", kg.value); upd(); autoKg(e, kg, rp); };
      rp.oninput = e => { edit(ex, i, "reps", rp.value); upd(); autoReps(e, rp); };
      // serie completata (reps inserite e campo lasciato) → parte il recupero
      rp.addEventListener("change", () => {
        if (num(rp.value) == null || S.date !== todayISO() || !tPrefs().auto) return;
        const g = circGroup(d, idx);
        if (g && !g.last) { toast(`Subito: ${d.ex[idx + 1].name}`); return; } // circuito: niente recupero tra gli esercizi
        if (g) { const after = d.ex[g.end + 1]; startRest(restFor(ex), i < ex.sets.length - 1 ? `Giro ${i + 1} finito · poi giro ${i + 2}` : after ? `Circuito finito · poi ${after.name}` : "Circuito finito"); return; }
        const nx =i < ex.sets.length - 1 ? `${ex.name} · poi serie ${i + 2}` : (() => { const n = nextOpenUnit(d, idx); if (!n) return "Ultima serie del giorno"; const ni = d.ex.findIndex(e => e.key === n.k), g2 = isCircNoLog(d, ni); return `Poi: ${g2 ? "Circuito " + d.ex[ni].circ : d.ex[ni].name}`; })();
        startRest(restFor(ex), nx);
      });
      upd(); setsEl.appendChild(row);
    });
    const su = card.querySelector(".setup input");
    if (su) {
      su.value = ((D.setup[S.gym] || {})[ex.key]) || ""; su.oninput = () => { D.setup[S.gym] = D.setup[S.gym] || {}; D.setup[S.gym][ex.key] = su.value.trim(); save(); };
    }
    const cp = card.querySelector("[data-copy]");
    if (ex.bw || !rs || !refSets.some(r => r && r.kg != null)) cp.hidden = true;
    cp.onclick = () => ex.sets.forEach((_, i) => { const k = suggestKg(refSets[i], hit, cond.f, tnum(ex.sets[i].t), stp.v); if (k != null) { const el = $(`kg-${ex.key}-${i}`); el.value = fmt(k); edit(ex, i, "kg", el.value); el.dispatchEvent(new Event("input")); } });
    const panel = card.querySelector(".panel"); if (open) fillPanel(panel, ex);
    card.querySelectorAll("[data-more]").forEach(b => b.onclick = () => {
      const isOpen = !panel.hidden; panel.hidden = isOpen; card.querySelector(".more").setAttribute("aria-expanded", !isOpen);
      if (isOpen) S.open.delete(ex.key); else { S.open.add(ex.key); if (!panel.firstChild) fillPanel(panel, ex); }
    });
    const z = card.querySelector("[data-zoom]"); if (z) z.onclick = () => openLB(ex, -1);
    // Chiudi: la riga chiusa resta dove stavi guardando (o subito sotto la barra in alto se la scheda iniziava più su)
    card.querySelectorAll("[data-step]").forEach(b => b.onclick = () => { const v = +b.dataset.step; setStep(ex.key, stp.v === v && !stp.auto ? null : v); });
    const ob = card.querySelector("[data-ooo]"); if (ob) ob.onclick = () => toggleOrderOk(oi.key);
    const cl = card.querySelector("[data-close]"); if (cl) cl.onclick = () => {
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
    if (!touched[j]) return;
    const movedOn = units.some((v, k) => k !== j && touched[k] && (k > j || k === lastUnit)) && lastUnit !== j;
    if (u.circ) { if (movedOn && circCount(s, u.ex.circ) < u.ex.sets.length) miss.push({ k: u.keys[0], i: 0, what: "giri" }); return; }
    const sets = exSets(s, u.ex.key), lastFilled = u.ex.sets.reduce((a, _, i) => sets[i] && (sets[i].kg != null || sets[i].reps != null) ? i : a, -1);
    u.ex.sets.forEach((_, i) => {
      const r = sets[i];
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
  else if (u.started || u.done) sub = (oooOff(s, e.key) ? "↕ " : "") + exSets(s, e.key).filter(r => r && (r.kg != null || r.reps != null)).map(r => `${r.kg != null ? fmt(r.kg) + "×" : ""}${r.reps ?? "–"}${r.dirty ? "~" : ""}`).join(" · ");
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
    D.sessions[s2.id] = s2; save();
    if (S.date === todayISO()) try { localStorage.setItem(LKEY, JSON.stringify({ gym: S.gym, day: S.day, date: S.date, key: mem[0].key, i: 0 })); } catch (e) {}
    const was = cnt >= giri, now = Math.max(0, Math.min(giri, k)) >= giri;
    if (was !== now) { if (now) S.exOpen.delete(mem[0].key); renderLog(); return; } // completato (o riaperto): la lista si riorganizza
    card.replaceWith(circCard(d, g, n, isCur)); updateProgress();
  };
  card.querySelector("[data-play]").onclick = () => setCirc(cnt + 1);
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
  rp._t = setTimeout(() => { if (document.activeElement === rp) toNextSet(rp); }, rp._fix ? 1200 : v.replace(/\D/g, "").length >= 2 ? 300 : 700);
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
function judge(kgEl, rpEl, fb, t, lr, cond, dirty) {
  const kg = num(kgEl.value), reps = num(rpEl.value), f = cond ? cond.f : 1, off = f < 1 || !!(cond && cond.ooo);
  let cls = "", msg = "";
  if (reps != null && t != null) {
    const miss = t - reps, pct = reps / t, missTxt = miss === 1 ? "1 rep" : miss + " reps";
    const hasLast = lr && lr.kg != null && lr.reps != null && kg != null;
    const up = hasLast ? kg - lr.kg : 0;
    // forza attesa oggi = forza dell'ultima volta × fattore di forma/rientro
    const e1 = hasLast ? e1rm(kg, reps) : 0, exp = hasLast ? e1rm(lr.kg, lr.reps) * f : 0;
    if (reps >= t) { cls = "ok"; msg = reps > t ? `Target superato di ${reps - t}` : (off ? (cond && cond.ooo && cond.f >= 1 ? "Target pieno anche fuori ordine" : "Target pieno anche in una giornata difficile") : ""); }
    else if (hasLast && e1 >= exp * 0.99 && (up > 0 || off)) { cls = "prog"; msg = off ? `${missTxt} in meno, ma forza in linea con oggi (${cond.why}): va bene così` : `${missTxt} in meno ma +${fmt(up)} kg: forza pari o superiore all'ultima volta`; }
    else if (hasLast && up > 0) { cls = "prog"; msg = `Carico salito di ${fmt(up)} kg: normale perdere qualche rep (${repsTxt(miss)})`; }
    else if (pct >= 0.6 || off) { cls = "prog"; msg = `Pulita, ${repsTxt(miss)}: carico giusto per oggi` + (off ? " · " + cond.why : ""); }
    else { cls = "prog"; msg = `Pulita, ${reps} su ${t}: se succede ancora, scendi un po' di carico`; }
  }
  if (dirty && reps != null) { // serie sporca: mai verde; dice cosa succede la prossima volta
    if (t == null || reps >= t) { cls = "near"; msg = "Sporca: meglio una rep in meno ma pulita. La prossima volta stesso carico"; }
    else { cls = "near"; msg = "Sporca: la prossima volta −5% su questa serie, per farla pulita"; }
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
}

// ---------- scrittura ----------
function edit(ex, i, field, val) {
  const s = JSON.parse(JSON.stringify(current()));
  s.ex[ex.key] = s.ex[ex.key] || [];
  while (s.ex[ex.key].length < ex.sets.length) s.ex[ex.key].push({ kg: null, reps: null });
  const v = field === "dirty" ? (val ? true : undefined) : num(val);
  s.ex[ex.key][i] = { ...s.ex[ex.key][i], [field]: v };
  if (v != null && field !== "dirty" && !(s.ord || []).includes(ex.key)) s.ord = [...(s.ord || []), ex.key]; // ordine reale di esecuzione
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
    else if (i < ex.sets.length - 1) i++;
    else { const n = nextOpenUnit(d, idx); if (n) ({ k, i } = n); else if (d.ex[idx + 1]) { k = d.ex[idx + 1].key; i = 0; } }
  }
  return { k, i };
}
// primo esercizio non finito dopo idx (poi dall'inizio): serve quando cambi ordine (es. macchina occupata)
function nextOpenUnit(d, idx) {
  const s = current(), us = dayUnitsList(d, s).filter(u => !u.done); if (!us.length) return null;
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
    if (done) return; done = true;
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
  const vv = window.visualViewport;
  if (vv) vv.addEventListener("resize", () => setTimeout(go, 60), { once: true });
  setTimeout(go, 450);
});
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
function closeLB() { $("lb").hidden = true; document.body.style.overflow = ""; $("lbtrack").classList.remove("zoomed"); }
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
    const all = ss.filter(s => exHas(s, ex.key)).map(s => ({ i: index(exSets(s, ex.key)), m: maxKg(exSets(s, ex.key)), hit: allHit(exSets(s, ex.key), ex), dirty: exSets(s, ex.key).filter(r => r && r.dirty).length, off: isOffDay(s) || oooOff(s, ex.key) }));
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
    if (!r || r.dirty || r.reps == null || (!bw && r.kg == null)) continue;
    const v = bw && r.kg == null ? r.reps : e1rm(r.kg, r.reps);
    if (!best || v > best.v) best = { v, r };
  }
  return best;
}
function trendData(p, d, gym) {
  const ss = gymSessions(gym).filter(s => s.plan === p.id && s.day === d.id && !isOffDay(s));
  const weeks = [...new Set(ss.map(s => weekOf(p, s.date)))].filter(w => w >= 1).sort((a, b) => a - b);
  const exs = d.ex.filter((e, idx) => !isCircNoLog(d, idx)).map(e => {
    const byW = {};
    for (const s of ss) { if (oooOff(s, e.key)) continue; const w = weekOf(p, s.date), b = bestSet(exSets(s, e.key), e.bw); if (b && (!byW[w] || b.v > byW[w].v)) byW[w] = b; }
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
    const info = [u ? `${u.done}/${u.tot} serie` : "", dirty ? `${dirty} ${dirty === 1 ? "sporca" : "sporche"}` : "", isOffDay(s) ? "giornata no" : "", p && p.id !== act.id ? p.name : ""].filter(Boolean).join(" · ");
    const rows = d ? d.ex.map((e, idx) => {
      const g = isCircNoLog(d, idx); if (g) return idx === g.start && circCount(s, e.circ) ? `<li><b>Circuito ${esc(e.circ)}</b><span>${circCount(s, e.circ)}/${e.sets.length} giri</span></li>` : "";
      const sets = exSets(s, e.key).filter(r => r && (r.kg != null || r.reps != null)); if (!sets.length) return "";
      return `<li><b>${esc(e.name)}${oooOff(s, e.key) ? " ↕" : ""}</b><span>${sets.map(r => `${r.kg != null ? fmt(r.kg) + "×" : ""}${r.reps ?? "–"}${r.dirty ? "~" : ""}`).join(" · ")}</span></li>`;
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
    save(true); $("bkMsg").textContent = `Ripristino fatto: ${added} sedute importate o aggiornate.`; toast("Backup ripristinato"); render();
  } catch (err) { $("bkMsg").textContent = "Questo file non è un backup dell'app Palestra."; }
  e.target.value = "";
};
$("csv").onclick = () => {
  const names = {}; plans.forEach(p => p.days.forEach(d => d.ex.forEach(ex => names[ex.key] = ex.name)));
  const rows = [["data", "palestra", "scheda", "giorno", "esercizio", "serie", "kg", "reps", "sporca"]];
  Object.values(D.sessions).sort((a, b) => a.date < b.date ? -1 : 1).forEach(s => {
    const pn = (plans.find(p => p.id === s.plan) || {}).name || s.plan, gn = (GYMS.find(g => g.id === s.gym) || {}).name || s.gym;
    Object.entries(s.circ || {}).forEach(([c, n]) => { if (n > 0) rows.push([s.date, gn, pn, s.day, "Circuito " + c, "giri", "", n]); });
    Object.entries(s.ex || {}).forEach(([k, arr]) => (arr || []).forEach((r, i) => { if (r && (r.kg != null || r.reps != null)) rows.push([s.date, gn, pn, s.day, names[k] || k, i + 1, fmt(r.kg), r.reps ?? "", r.dirty ? "sì" : ""]); }));
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
  if ((m = s.match(/^(\d+)\s*[:'’]\s*(\d{1,2})?/))) return +m[1] * 60 + (+m[2] || 0); // 1:30 · 1'30 · 2'
  if ((m = s.match(/^(\d+)/))) return +m[1];                                         // 90" · 90
  return null;
}
const restFor = ex => parseRest(ex && ex.rest) || tPrefs().sec;
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

function startRest(sec, label) {
  unlockAudio();
  T = { end: Date.now() + sec * 1000, dur: sec, label: label || "Recupero" }; tDone = 0; tWarned = sec <= 6; tSave();
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
function drawTimer() {
  const box = $("timer"), tb = $("tbox");
  const run = running(), paused = T.left != null, done = Date.now() - tDone < 6000;
  box.hidden = !(run || paused || done || S.view === "log");
  tb.classList.toggle("run", run); tb.classList.toggle("paused", paused); tb.classList.toggle("done", done && !run && !paused);
  $("tStop").hidden = !(run || paused);
  $("tPause").innerHTML = run ? `<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>` : `<svg viewBox="0 0 24 24"><path d="M7 5l12 7-12 7z"/></svg>`;
  $("tPause").setAttribute("aria-label", run ? "Pausa" : paused ? "Riprendi" : "Avvia il recupero");
  $("tPause").classList.toggle("go", !run);
  if (run || paused) {
    const r = remaining();
    $("tTime").textContent = fmtSec(r);
    $("tLabel").textContent = paused ? "In pausa" : T.label;
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
  return { name: ex.name, set: `Serie ${i + 1} di ${ex.sets.length}`, what: [`${ex.sets[i].t} reps`, kg && !ex.bw ? `${kg} kg` : ""].filter(Boolean).join(" · ") };
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
