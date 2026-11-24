/* Palestra — Il punto della settimana (22/11/2026): allenatore che ragiona sulla settimana intera, non sulla singola serie.
   Mette insieme allenamento (giorni fatti, record, miglioramenti, esercizi fermi, serie pulite/sporche/facili/al limite,
   recuperi, fastidi, forma), cibo (giorni segnati, proteine, pasti liberi, fame/energia/sonno) e corpo (peso medio);
   ne ricava al massimo 4 cose da fare e, se la fatica si accumula, propone lo SCARICO IN ANTICIPO (D.prefs.deloadPlan).
   Facoltativo: "✨ Commento dell'allenatore" dall'IA gratuita del servizio (worker /coach), salvato in D.prefs.coach[lunedì]. */
"use strict";
const addD = (iso, n) => { const t = new Date(iso + "T12:00"); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); };
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
// fase della scheda (blocco di 4 settimane): cosa conta in quella settimana
const PHASES = [
  [1, "Prendi le misure", "carichi giusti e tecnica pulita: niente fretta di salire"],
  [2, "Spingi", "segui gli aumenti proposti, ok 1-2 reps in meno sul peso nuovo"],
  [3, "Spingi", "ultima settimana piena: cerca i record sulle serie pulite"],
  [4, "Consolida", "tieni i carichi, rifinisci la tecnica e manda il report al PT"]];
function phaseOf(w) { return w > 4 ? [w, "Scheda scaduta", "chiedi la nuova al PT e mandagli il report"] : (PHASES.find(x => x[0] === w) || PHASES[0]); }

function weekReview(mon) {
  const sun = addD(mon, 6), next = addD(mon, 7), p = plan();
  const ss = Object.values(D.sessions).filter(s => s.date >= mon && s.date <= sun && hasData(s)).sort((a, b) => a.date < b.date ? -1 : 1);
  const R = { mon, sun, sessions: ss.length, gyms: {}, days: [], missing: [], sets: 0, clean: 0, d1: 0, d2: 0, easy: 0, hard: 0, help: 0, longR: 0,
    restS: 0, restP: 0, restN: 0, low: 0, pain: new Set(), skip: new Set(), dur: [], prs: [], up: [], down: [], stalls: [], deload: deloadWeeks().has(mon) };
  // giorni della scheda attiva fatti (≥75% degli esercizi), tutte e due le palestre
  const done = new Set();
  for (const s of ss) {
    R.gyms[s.gym] = (R.gyms[s.gym] || 0) + 1; if (s.readiness === "low") R.low++; if (s.t0 && s.t1 && s.t1 > s.t0) R.dur.push(s.t1 - s.t0);
    const pp = SCHEDE.find(x => x.id === s.plan), d = pp && pp.days.find(x => x.id === s.day); if (!d) continue;
    const us = dayUnitsList(d, s); if (s.plan === p.id && us.length && us.filter(u => u.done).length / us.length >= 0.75) done.add(d.id);
    d.ex.forEach((e, idx) => {
      if (e.nolog) return; if (hasPain(s, e.key)) R.pain.add(subOf(s, e.key) || e.name); if (isSkip(s, e.key)) R.skip.add(e.name);
      const arr = exSets(s, e.key);
      arr.forEach((r, i) => { if (!r || r.reps == null) return; R.sets++; const n = dN(r); if (!n) R.clean++; else if (n === 1) R.d1++; else R.d2++;
        if (r.eff === "easy") R.easy++; if (r.eff === "hard") R.hard++; if (r.help) R.help++; if (lrOn(r)) R.longR++;
        if (i > 0 && !circGroup(d, idx)) { const g = restGap(arr[i - 1], r, e, i); if (g != null) { R.restN++; R.restS += g; R.restP += restFor(e); } } });
    });
  }
  R.days = p.days.map(d => ({ id: d.id, name: d.name, done: done.has(d.id) }));
  R.missing = R.days.filter(d => !d.done);
  // esercizio per esercizio e per palestra: serie migliore pulita della settimana contro l'ultima volta prima (record = meglio di sempre)
  const exs = []; p.days.forEach(d => d.ex.forEach(e => { if (!e.nolog && !exs.some(x => x.key === e.key)) exs.push(e); }));
  for (const g of GYMS.map(x => x.id)) for (const e of exs) {
    const ok = s => home(s) && !isOffDay(s) && !isDeload(s) && !oooOff(s, e.key) && exHas(s, e.key, "");
    const all = gymSessions(g).filter(ok), wk = all.filter(s => s.date >= mon && s.date <= sun), before = all.filter(s => s.date < mon);
    const bestOf = L => L.reduce((m, s) => { const b = bestSet(exSets(s, e.key), e.bw); return b && b.v > m ? b.v : m; }, 0);
    const now = bestOf(wk); if (!now || !before.length) continue;
    const ever = bestOf(before), last = bestOf(before.slice(-1)), gn = (GYMS.find(x => x.id === g) || {}).name || g, tag = `${e.name} (${gn.split(" ")[0]})`;
    if (now > ever * 1.005) R.prs.push(tag);
    const dl = last ? (now - last) / last : 0; if (dl > 0.01) R.up.push(tag); else if (dl < -0.03) R.down.push(tag);
    if (wk.length && stallInfo(e, g, next)) R.stalls.push(tag);
  }
  // cibo (sezione Cibo): giorni segnati, proteine rispetto al piano nei giorni completi, pasti liberi, fame/energia/sonno
  R.food = null;
  if (typeof dayVals === "function" && typeof CB !== "undefined") {
    let logged = 0, full = 0, protOk = 0;
    for (let i = 0; i < 7; i++) { const d = addD(mon, i); if (d > todayISO()) break; const v = dayVals(d); if (!v.any && !v.free) continue; logged++;
      if (dayDone(d) && !v.free) { full++; const T = dayTarget(d); if (v.t[1] >= T[1] * 0.85) protOk++; } }
    R.food = { logged, full, protOk, free: freeInWeek(mon), check: (FOOD().week || {})[mon] || {} };
  }
  // corpo: peso medio delle 2 settimane che finiscono domenica contro le 2 prima
  { const w = bodyList().filter(b => b.w != null), avg = (a, z) => { const v = w.filter(b => b.date >= a && b.date <= z).map(b => b.w); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; };
    R.w = avg(addD(sun, -13), sun); R.w0 = avg(addD(sun, -27), addD(sun, -14)); }
  // fatica accumulata → scarico consigliato in anticipo
  const ck = (R.food && R.food.check) || {};
  R.fatigue = [
    [R.stalls.length >= 3 ? 2 : R.stalls.length === 2 ? 1 : 0, `${R.stalls.length} esercizi fermi`],
    [ck.energia === 0 ? 1 : 0, "energia bassa"], [ck.sonno === 0 ? 1 : 0, "sonno scarso"],
    [R.sets >= 10 && R.d2 / R.sets > 0.2 ? 1 : 0, "molte serie sporche"],
    [R.sets >= 10 && R.hard / R.sets > 0.5 ? 1 : 0, "tante serie al limite"],
    [R.low >= 2 ? 1 : 0, `${R.low} sedute da stanco`],
    [R.pain.size >= 2 ? 1 : 0, "fastidi"],
    [R.down.length >= 3 && R.down.length > R.up.length ? 1 : 0, "forza in calo"]].filter(x => x[0]);
  R.score = R.fatigue.reduce((t, x) => t + x[0], 0);
  const recentDl = [...deloadWeeks()].some(w => w <= next && (new Date(next) - new Date(w)) / 864e5 <= 28);
  R.proposeDeload = !R.deload && R.score >= 3 && !recentDl && D.prefs.deloadPlan !== next && D.prefs.deloadNo !== next && !deloadWeeks().has(next);
  // settimana della scheda contata come nel cerchio "Scheda da N giorni" (planAge): oggi se la settimana dopo è quella in corso
  { const at = next === weekStart(todayISO()) ? todayISO() : next, n = p.from ? Math.max(1, Math.round((new Date(at + "T12:00") - new Date(p.from + "T12:00")) / 864e5) + 1) : 1;
    R.phase = phaseOf(Math.ceil(n / 7)); }
  R.next = next;
  return R;
}
// cosa fare la settimana dopo: al massimo 4 punti, i più importanti prima
function reviewActions(R) {
  const A = [], two = L => L.slice(0, 2).join(" e ") + (L.length > 2 ? ` (+${L.length - 2})` : "");
  if (R.deload) return [["🔋", "Scarico fatto: questa settimana si riparte dai carichi pieni dell'ultima volta."]];
  if (R.proposeDeload) A.push(["🔋", `Fatica accumulata (${R.fatigue.map(x => x[1]).join(", ")}): settimana di scarico, poi riparti più forte.`]);
  if (R.pain.size) A.push(["⚠️", `Fastidio a ${two([...R.pain])}: niente aumenti lì, e dillo al PT.`]);
  if (R.stalls.length && !R.proposeDeload) A.push(["⏸", `${two(R.stalls)} ${R.stalls.length === 1 ? "è fermo" : "sono fermi"}: salto più piccolo o una rep in più, recuperi pieni.`]);
  if (R.missing.length && R.sessions) A.push(["📅", `Mancava ${listIt(R.missing.map(d => d.id))}: questa settimana punta a ${R.days.length === 3 ? "tutti e 3 i giorni" : "tutti i giorni"}.`]);
  if (!R.sessions) A.push(["📅", "Nessuna seduta: riparti con i carichi dell'ultima volta, senza recuperare tutto in un giorno."]);
  if (R.sets >= 10 && R.d2 / R.sets > 0.15) A.push(["〰️", `Serie sporche al ${pct(R.d2, R.sets)}%: dove succede scendi di un salto e falle pulite.`]);
  if (R.longR >= 3) A.push(["⏱", `${R.longR} recuperi lunghi: usa il timer, le serie aiutate dalla pausa non fanno salire.`]);
  if (R.sets >= 10 && R.easy / R.sets > 0.3) A.push(["🚀", `${pct(R.easy, R.sets)}% di serie facili: quando l'app propone di salire, sali.`]);
  if (R.food && R.food.full >= 2 && R.food.protOk / R.food.full < 0.5) A.push(["🥩", `Proteine sotto il piano in ${R.food.full - R.food.protOk} giorni su ${R.food.full}: shaker o yogurt allo spuntino.`]);
  if (R.food && R.food.check.sonno === 0) A.push(["😴", "Sonno scarso: è lì che si recupera. Prova ad anticipare di mezz'ora."]);
  if (R.phase[0] >= 4) A.push(["📋", R.phase[0] > 4 ? "Scheda scaduta: manda il report al PT e chiedi la nuova." : "Ultima settimana della scheda: manda il report al PT."]);
  return A.slice(0, 4);
}
function reviewGood(R) {
  const G = [];
  if (R.prs.length) G.push(`🏆 ${R.prs.length} ${R.prs.length === 1 ? "record" : "record"}: ${R.prs.slice(0, 3).join(", ")}${R.prs.length > 3 ? "…" : ""}`);
  if (R.sessions && !R.missing.length) G.push("✅ Tutti i giorni della scheda fatti");
  if (R.sets >= 10 && R.clean / R.sets >= 0.85) G.push(`✨ Serie pulite al ${pct(R.clean, R.sets)}%`);
  if (R.up.length > R.down.length && R.up.length >= 2) G.push(`📈 Più forte in ${R.up.length} esercizi`);
  return G.slice(0, 3);
}
function reviewTitle(R) {
  if (!R.sessions) return ["😶", "Settimana senza allenamenti"];
  if (R.deload) return ["🔋", "Settimana di scarico"];
  if (R.proposeDeload) return ["🔋", "Settimana pesante: è ora di recuperare"];
  if (!R.missing.length && R.sets && R.clean / R.sets >= 0.8) return ["💪", R.prs.length ? "Settimana da record" : "Settimana solida"];
  if (R.missing.length) return ["👍", "Settimana a metà"];
  return ["👍", "Buona settimana"];
}
const reviewMon = () => prevMon(weekStart(todayISO())); // la settimana appena finita
function reviewHTML(R) {
  const [ic, title] = reviewTitle(R), A = reviewActions(R), G = reviewGood(R), f = R.food, ck = f ? f.check : {};
  const restAvg = R.restN ? Math.round(R.restS / R.restN / 5) * 5 : null, restPl = R.restN ? Math.round(R.restP / R.restN / 5) * 5 : null;
  const durAvg = R.dur.length ? R.dur.reduce((a, b) => a + b, 0) / R.dur.length : null;
  const ckTxt = [["energia", ["bassa", "ok", "alta"]], ["sonno", ["male", "ok", "bene"]], ["fame", ["poca", "giusta", "tanta"]]].filter(([k]) => ck[k] != null).map(([k, o]) => `${k} ${o[ck[k]]}`).join(" · ");
  const nextTxt = R.next === weekStart(todayISO()) ? "questa settimana" : "la settimana prossima";
  const ai = (D.prefs.coach || {})[R.mon];
  return `<div class="rv-h"><span class="rv-ic">${ic}</span><div><small>Il punto della settimana · ${fmtDate(R.mon).slice(0, 5)}–${fmtDate(R.sun).slice(0, 5)}</small><b>${title}</b></div></div>
    <div class="rv-k">
      <div><b>${R.days.filter(d => d.done).length}/${R.days.length}</b><span>giorni</span></div>
      <div><b>${R.sets ? pct(R.clean, R.sets) + "%" : "—"}</b><span>serie pulite</span></div>
      <div><b>${R.prs.length}</b><span>record</span></div>
      <div><b>${restAvg != null ? fmtSec(restAvg) : "—"}</b><span>recupero${restPl ? ` · prev. ${fmtSec(restPl)}` : ""}</span></div></div>
    ${G.length ? `<ul class="rv-good">${G.map(g => `<li>${esc(g)}</li>`).join("")}</ul>` : ""}
    ${A.length ? `<p class="rv-l">Cosa fare ${nextTxt}</p><ul class="rv-do">${A.map(([i, t]) => `<li><i>${i}</i><span>${esc(t)}</span></li>`).join("")}</ul>` : ""}
    ${typeof foodDecBox === "function" ? foodDecBox(R) : ""}
    ${R.proposeDeload ? `<div class="rv-dl"><span>🔋 Scarico ${nextTxt}: carichi −35% e una serie in meno, poi si riparte.</span><button class="btn sm primary" data-rv="dl">Sì, pianificalo</button><button class="btn sm ghost" data-rv="nodl">No</button></div>` : ""}
    ${!R.deload && (D.prefs.deloadPlan === R.next || deloadWeeks().has(R.next)) ? `<p class="rv-note">🔋 Scarico ${D.prefs.deloadPlan === R.next ? "pianificato" : "attivo"} dal ${fmtDate(R.next).slice(0, 5)} <button class="lnk sm" data-rv="undl">Annulla</button></p>` : ""}
    <p class="rv-l">Settimana in breve</p>
    <p class="rv-s">${R.sessions} ${R.sessions === 1 ? "seduta" : "sedute"}${Object.keys(R.gyms).length ? " (" + Object.entries(R.gyms).map(([g, n]) => `${(GYMS.find(x => x.id === g) || {}).name?.split(" ")[0] || g} ${n}`).join(" · ") + ")" : ""}${durAvg ? ` · ~${Math.round(durAvg / 60000)} min l'una` : ""}${R.sets ? ` · ${R.sets} serie: ${R.d1} con 1 rep sporca, ${R.d2} sporche, ${R.easy} facili, ${R.hard} al limite` : ""}${R.longR ? ` · ${R.longR} recuperi lunghi` : ""}.
      ${R.up.length || R.down.length ? `<br>↑ ${R.up.length} esercizi meglio dell'ultima volta${R.down.length ? ` · ↓ ${R.down.length} sotto (${esc(R.down.slice(0, 2).join(", "))})` : ""}.` : ""}
      ${f && (f.logged || f.free) ? `<br>🍽 Cibo segnato ${f.logged} giorni su 7${f.full ? ` · proteine in linea ${f.protOk}/${f.full}` : ""} · pasti liberi ${f.free} di 2${ckTxt ? ` · ${ckTxt}` : ""}.` : ""}
      ${R.w != null ? `<br>⚖️ Peso medio 2 settimane ${fmt(Math.round(R.w * 10) / 10)} kg${R.w0 != null ? ` (${R.w - R.w0 >= 0 ? "+" : "−"}${fmt(Math.abs(Math.round((R.w - R.w0) * 10) / 10))} sulle 2 prima)` : ""}.` : ""}</p>
    <p class="rv-ph"><b>Scheda · settimana ${R.phase[0]}${R.phase[0] <= 4 ? " di 4" : ""}: ${esc(R.phase[1])}</b> — ${esc(R.phase[2])}.</p>
    ${R.sessions ? `<div class="rv-ai">${ai ? `<p class="rv-ait"><b>✨ L'allenatore</b> ${esc(ai)}</p>` : `<button class="btn sm" data-rv="ai">✨ Commento dell'allenatore</button><small>scritto dall'IA gratuita del servizio dell'app, coi numeri qui sopra</small>`}</div>` : ""}`;
}
let RV_MON = null; // settimana mostrata (null = quella appena finita)
function renderReview() {
  let box = $("review"); if (!box) { box = document.createElement("div"); box.id = "review"; box.className = "card review"; const hero = document.querySelector("#v-prog .hero"); hero.after(box); }
  const cur = weekStart(todayISO()), mon = RV_MON || reviewMon(), R = weekReview(mon);
  const has = Object.values(D.sessions).some(s => hasData(s) && s.date < addD(mon, 7));
  if (!has) { box.hidden = true; return; } box.hidden = false;
  box.innerHTML = `<div class="rv-w"><button data-rw="-7" aria-label="Settimana prima">‹</button><span>${mon === reviewMon() ? "Settimana scorsa" : mon === cur ? "Questa settimana (finora)" : "Settimana del " + fmtDate(mon).slice(0, 5)}</span><button data-rw="7" aria-label="Settimana dopo"${mon >= cur ? " disabled" : ""}>›</button></div>` + reviewHTML(R);
  box.querySelectorAll("[data-rw]").forEach(b => b.onclick = () => { RV_MON = addD(mon, +b.dataset.rw); if (RV_MON > cur) RV_MON = cur; renderReview(); });
  box.querySelectorAll("[data-rv]").forEach(b => b.onclick = () => reviewAct(b.dataset.rv, R, b));
  if (mon === reviewMon() && D.prefs.reviewSeen !== mon) { D.prefs.reviewSeen = mon; save(); markReviewDot(); }
}
function reviewAct(a, R, btn) {
  if (a === "dl") { D.prefs.deloadPlan = R.next; applyPlannedDeload(); save(); toast(R.next === weekStart(todayISO()) ? "Settimana di scarico attiva" : "Scarico pianificato"); }
  if (a === "nodl") { D.prefs.deloadNo = R.next; save(); }
  if (a === "undl") { if (D.prefs.deload === R.next) { delete D.prefs.deload; D.prefs.deloads = (D.prefs.deloads || []).filter(w => w !== R.next); } delete D.prefs.deloadPlan; save(); }
  if (a === "ai") return coachAsk(R, btn);
  renderReview();
}
// commento dell'IA: solo numeri e nomi degli esercizi, niente dati personali; una volta per settimana (poi resta salvato)
async function coachAsk(R, btn) {
  btn.disabled = true; btn.textContent = "Ci penso…";
  const f = R.food, data = { settimana: `${R.mon}…${R.sun}`, fase: `${R.phase[0]} · ${R.phase[1]}`, giorni: `${R.days.filter(d => d.done).length}/${R.days.length}`, mancanti: R.missing.map(d => d.name),
    sedute: R.sessions, serie: R.sets, pulite_pct: pct(R.clean, R.sets), sporche: R.d2, facili: R.easy, al_limite: R.hard, recuperi_lunghi: R.longR,
    recupero_medio_s: R.restN ? Math.round(R.restS / R.restN) : null, record: R.prs, migliorati: R.up, peggiorati: R.down, fermi: R.stalls, fastidi: [...R.pain],
    sedute_da_stanco: R.low, cibo: f ? { giorni_segnati: f.logged, proteine_ok: `${f.protOk}/${f.full}`, pasti_liberi: f.free, energia: ["bassa", "ok", "alta"][f.check.energia], sonno: ["male", "ok", "bene"][f.check.sonno] } : null,
    peso_medio: R.w ? Math.round(R.w * 10) / 10 : null, peso_prima: R.w0 ? Math.round(R.w0 * 10) / 10 : null, scarico_proposto: R.proposeDeload, azioni_app: reviewActions(R).map(x => x[1]) };
  try {
    const r = await fetch(PUSH_URL + "/coach", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: (typeof aiCfg === "function" ? aiCfg().code : undefined), data }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.commento) throw new Error(j.error || "errore " + r.status);
    D.prefs.coach = { ...(D.prefs.coach || {}), [R.mon]: String(j.commento).slice(0, 700) }; save(); renderReview();
  } catch (e) { btn.disabled = false; btn.textContent = "✨ Commento dell'allenatore"; toast("Commento non disponibile: " + (e.message || e)); }
}
// puntino su Progressi e avviso in Allenamento quando il punto della settimana appena finita è pronto e non l'hai ancora visto
function reviewReady() { const mon = reviewMon(); return D.prefs.reviewSeen !== mon && Object.values(D.sessions).some(s => hasData(s) && s.date >= mon && s.date < addD(mon, 7)); }
function markReviewDot() { const b = document.querySelector('.tabbar button[data-view="prog"]'); if (b) b.classList.toggle("dot", reviewReady()); }
let RVC = null; // calcolo tenuto da parte per l'avviso (renderLog gira a ogni serie scritta)
function reviewNag() {
  if (!reviewReady()) return "";
  const mon = reviewMon(), key = mon + "|" + Object.values(D.sessions).reduce((m, s) => Math.max(m, s.updatedAt || 0), 0) + "|" + Object.keys(D.sessions).length + "|" + [...deloadWeeks()].join() + D.prefs.deloadPlan + D.prefs.deloadNo;
  if (!RVC || RVC.key !== key) RVC = { key, R: weekReview(mon) };
  const R = RVC.R, [ic, t] = reviewTitle(R);
  return `<div class="nag info rv-nag"><span>${ic} <b>Il punto della settimana è pronto:</b> ${esc(t.toLowerCase())}${R.proposeDeload ? " · scarico consigliato" : ""}.</span><button class="btn sm" id="rvGo">Apri</button></div>`;
}
function openReview() { RV_MON = null; S.view = "prog"; render(); setTimeout(() => { const b = $("review"); if (b) b.scrollIntoView({ block: "start", behavior: "smooth" }); }, 60); }
