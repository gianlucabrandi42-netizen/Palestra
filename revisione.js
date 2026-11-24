// 🍽 DECISIONE SUL CIBO nel "Punto della settimana" (22/11/2026; il punto della settimana è in js/09-settimana.js).
// Applica le regole del piano (NUTRIZIONE_PIANO.md, sezione 9 "Controllo del peso"), obiettivo ricomposizione:
//  - peso circa stabile (±0,5 kg tra le medie di 2 settimane) e forza in salita → si continua così;
//  - peso giù più di 0,5 kg (o forza ferma con fame / poca energia) → un gradino in più di carboidrati a pranzo;
//  - peso su più di 0,5 kg senza che la forza salga → un gradino in meno;
//  - un solo cambio alla volta, almeno 2 settimane tra un cambio e l'altro.
// Il gradino vale dalla data in cui lo applichi (FOOD().adj, adjAt/lunchLvl/dayTarget in cibo.js): i giorni passati restano coi conti di allora.
// Tutto con prefisso fd: i nomi del punto della settimana (renderReview, openReview…) sono di js/09-settimana.js.
const FD_LV = { "-1": "pranzo a 0 anche il giorno dopo la palestra", 0: "piano normale (pranzo 80 · 40 · 0)", 1: "pranzo da 40 anche nei giorni da 0", 2: "pranzo da 80 il giorno dopo la palestra, 40 gli altri" };
const fdAdd = (iso, n) => { const t = new Date(iso + "T12:00"); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); };
const fdDay = iso => new Date(iso + "T12:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" });
const fdMed = a => { if (!a.length) return null; const b = a.slice().sort((x, y) => x - y), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };
// forza: per palestra ed esercizio la serie migliore (forza stimata) nelle 2 settimane fino a "end" contro le 2 prima
function fdStrength(end) {
  const bw = {}; for (const P of SCHEDE) for (const d of P.days) for (const e of d.ex) bw[e.key] = !!e.bw;
  const A0 = fdAdd(end, -27), B0 = fdAdd(end, -13), best = {};
  for (const s of Object.values(D.sessions)) {
    if (!s || !s.date || s.date < A0 || s.date > end || !hasData(s) || !home(s) || isOffDay(s) || isDeload(s)) continue;
    const w = s.date >= B0 ? "B" : "A";
    for (const [k, arr] of Object.entries(s.ex || {})) {
      if (subOf(s, k) || preReset(s, k)) continue;
      for (const r of arr || []) { if (!okRec(r) || r.reps == null) continue; const v = bw[k] || !r.kg ? cleanR(r) : e1rm(r.kg, cleanR(r));
        const id = `${s.gym}|${k}`; best[id] = best[id] || {}; best[id][w] = Math.max(best[id][w] || 0, v); }
    }
  }
  const ch = Object.values(best).filter(x => x.A && x.B).map(x => (x.B / x.A - 1) * 100);
  return { med: ch.length >= 3 ? fdMed(ch) : null, n: ch.length };
}
function fdData(mon) {
  const end = fdAdd(mon, 6), L = (D.body || []).filter(b => b.w != null);
  const avg = (a, b) => { const v = L.filter(x => x.date >= a && x.date <= b).map(x => x.w); return v.length >= 2 ? v.reduce((x, y) => x + y, 0) / v.length : null; };
  const wB = avg(fdAdd(end, -13), end), wA = avg(fdAdd(end, -27), fdAdd(end, -14)), wk = (FOOD().week || {})[mon] || {};
  return { mon, end, dw: wB != null && wA != null ? wB - wA : null, nB: L.filter(x => x.date >= fdAdd(end, -13) && x.date <= end).length, str: fdStrength(end), fame: wk.fame, energia: wk.energia };
}
function fdDecide(R, skipFrom) {
  // skipFrom: dopo "Applica" la decisione si mostra com'era prima del cambio appena fatto (non "Aspetta ancora")
  const A = (FOOD().adj || []).filter(a => !skipFrom || a.from < skipFrom), k = A.filter(a => a.from <= R.end).reduce((x, a) => a.k, 0), last = A.length ? A[A.length - 1] : null;
  const wait = last && (new Date(R.end + "T12:00") - new Date(last.from + "T12:00")) / 864e5 < 14;
  const med = R.str.med, dw = R.dw == null ? null : Math.round(R.dw * 10) / 10, strUp = med != null && med > 1, strDown = med != null && med <= 0;
  const kg = x => (x > 0 ? "+" : "−") + Math.abs(x).toFixed(1).replace(".", ",") + " kg";
  const up = why => k >= 2 ? { t: "Continua così", why: why + " Sei già al gradino più alto: se continua, parlane col PT.", act: null } : { t: "Più carboidrati a pranzo", why, act: k + 1 };
  const down = why => k <= -1 ? { t: "Continua così", why: why + " Sei già al gradino più basso: niente tagli in più, conta la costanza.", act: null } : { t: "Un po' meno carboidrati a pranzo", why, act: k - 1 };
  let d;
  if (dw != null && dw < -0.5) d = up(`Peso medio ${kg(dw)} in 2 settimane: per la ricomposizione deve restare circa stabile, stai mangiando troppo poco.`);
  else if (dw != null && dw > 0.5 && !strUp) d = down(`Peso medio ${kg(dw)} in 2 settimane senza che la forza salga: stai mangiando un po' più del necessario.`);
  else if (strDown && (R.fame === 2 || R.energia === 0)) d = up(`Forza ferma e ${R.fame === 2 ? "fame" : "poca energia"}: al corpo manca benzina.`);
  else if (dw == null) d = { t: "Nessun cambio", why: R.nB < 2 ? "Per decidere servono almeno 2 pesate in ognuna delle ultime 2 settimane (al mattino, Progressi → Corpo)." : "Serve ancora una settimana di pesate per confrontare le medie.", act: null };
  else if (!strDown || Math.abs(dw) <= 0.5) d = { t: "Continua così", why: `Peso stabile (${Math.abs(dw) < 0.05 ? "invariato" : kg(dw)})${med != null ? ` e forza ${med > 0 ? "+" : ""}${med.toFixed(1).replace(".", ",")}%` : ""}: è la ricomposizione che cerchiamo.`, act: null };
  else d = { t: "Nessun cambio", why: "Nessun segnale chiaro dal peso: segui il piano così com'è.", act: null };
  if (d.act != null && wait) d = { t: "Aspetta ancora", why: `${d.why} L'ultimo cambio è del ${fdDay(last.from)}: uno alla volta, se ne riparla dal ${fdDay(fdAdd(last.from, 14))}.`, act: null };
  return { ...d, k };
}
const fdState = mon => ((FOOD().rev || {})[mon]) || {};
function fdSet(mon, patch) { const f = FOOD(); f.rev = { ...(f.rev || {}) }; f.rev[mon] = { ...fdState(mon), ...patch, at: Date.now() }; save(); }
// riquadro dentro il punto della settimana (reviewHTML in js/09-settimana.js)
function foodDecBox(R0) {
  const st = fdState(R0.mon), applied = st.applied != null;
  let R, x; try { R = fdData(R0.mon); x = fdDecide(R, applied ? st.appliedOn : null); } catch (e) { return ""; }
  return `<div class="fdbox${x.act != null && !applied && !st.skip ? " act" : ""}"><small>🍽 Piano del cibo · regole del controllo del peso</small><b>${esc(x.t)}</b><p>${esc(x.why)}</p>
    ${x.act != null && !applied && !st.skip ? `<p class="fdnow">Da oggi: <b>${esc(FD_LV[x.act])}</b><br><span>ora: ${esc(FD_LV[x.k])}</span></p>
      <div class="fdb"><button type="button" class="btn sm primary" data-fd="apply" data-fdm="${R0.mon}" data-fdk="${x.act}">Applica</button><button type="button" class="btn sm ghost" data-fd="skip" data-fdm="${R0.mon}">Non ora</button></div>` : ""}
    ${applied ? `<p class="fdnow">✓ Applicato il ${fdDay(st.appliedOn)}: ${esc(FD_LV[st.applied])} <button type="button" class="lnk sm" data-fd="undo" data-fdm="${R0.mon}">Annulla</button></p>` : ""}
    ${!applied && x.k ? `<p class="fdnow"><span>In uso: ${esc(FD_LV[x.k])}</span></p>` : ""}</div>`;
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-fd]"); if (!b) return; const mon = b.dataset.fdm, F = FOOD(), t = todayISO();
  if (b.dataset.fd === "apply") { const k = +b.dataset.fdk; F.adj = [...(F.adj || []).filter(a => a.from !== t), { from: t, k }]; F.adjT = Date.now(); fdSet(mon, { applied: k, appliedOn: t, skip: 0 }); toast("Fatto: " + FD_LV[k]); }
  else if (b.dataset.fd === "skip") fdSet(mon, { skip: 1 });
  else if (b.dataset.fd === "undo") { const st = fdState(mon); F.adj = (F.adj || []).filter(a => a.from !== st.appliedOn); F.adjT = Date.now(); fdSet(mon, { applied: null, appliedOn: null }); toast("Cambio annullato"); }
  if (typeof renderReview === "function" && S.view === "prog") renderReview(); else if (typeof render === "function") render();
});

// 📊 COSA USI DAVVERO (22/11/2026): conta i tocchi per funzione, SOLO sul telefono (localStorage "palestra-uso", fuori dal backup).
// Dopo 3-4 settimane si guarda cosa serve davvero: quello che usi resta in primo piano, il resto si nasconde o si toglie.
const USO_K = "palestra-uso";
const usoGet = () => { try { return JSON.parse(localStorage.getItem(USO_K) || "{}"); } catch (e) { return {}; } };
let usoBuf = null, usoT = 0;
function usoKey(el) {
  if (el.closest("#pad")) return "allenamento · tastierino";
  if (el.dataset && el.dataset.view) return "menu · " + el.dataset.view;
  const ds = el.dataset || {}, k = Object.keys(ds).find(x => !/^(id|i|k|n|v|idx|key|mid|oid|rec|d|date)$/.test(x));
  const base = el.id ? "#" + el.id.replace(/\d+/g, "") : k ? k + (ds[k] && ds[k].length <= 14 && !/\d{2}/.test(ds[k]) ? "=" + ds[k] : "") : (el.textContent || "").trim().replace(/\s+/g, " ").replace(/\d+[.,]?\d*/g, "#").slice(0, 26);
  return base ? `${S.view || "?"}${typeof CS !== "undefined" && S.view === "cibo" ? "/" + CS.tab : ""} · ${base}` : null;
}
document.addEventListener("click", e => {
  const el = e.target.closest && e.target.closest("button, a, label, [role=button], [data-view], .chip"); if (!el) return;
  const k = usoKey(el); if (!k) return;
  usoBuf = usoBuf || usoGet(); const x = usoBuf[k] || (usoBuf[k] = { n: 0, f: Date.now() }); x.n++; x.l = Date.now();
  if (!usoBuf._from) usoBuf._from = Date.now();
  clearTimeout(usoT); usoT = setTimeout(() => { try { localStorage.setItem(USO_K, JSON.stringify(usoBuf)); } catch (e) {} }, 1500);
}, true);
function usoText() {
  const U = usoBuf || usoGet(), from = U._from, L = Object.entries(U).filter(([k]) => k !== "_from").sort((a, b) => b[1].n - a[1].n);
  const days = from ? Math.max(1, Math.round((Date.now() - from) / 864e5)) : 0;
  return [`📊 Uso dell'app Palestra · ${days} ${days === 1 ? "giorno" : "giorni"}`, ...L.map(([k, x]) => `${x.n}× ${k}`)].join("\n");
}
function renderUso() {
  const box = $("usoSet"); if (!box) return; const U = usoBuf || usoGet(), L = Object.entries(U).filter(([k]) => k !== "_from").sort((a, b) => b[1].n - a[1].n);
  const days = U._from ? Math.max(1, Math.round((Date.now() - U._from) / 864e5)) : 0;
  box.innerHTML = `<p class="note">L'app conta quali pulsanti usi, solo su questo telefono. Dopo 3-4 settimane manda l'elenco a Claude: quello che usi resta in primo piano, il resto si semplifica.</p>
    ${L.length ? `<p class="note">${days} ${days === 1 ? "giorno" : "giorni"} · ${L.length} funzioni usate · le più usate: ${L.slice(0, 5).map(([k, x]) => esc(k.split(" · ")[1]) + " " + x.n + "×").join(", ")}</p>` : `<p class="note">Ancora nessun dato.</p>`}
    <div class="rvb"><button type="button" class="btn" id="usoCopy">📋 Copia per Claude</button><button type="button" class="btn" id="usoZero">Azzera</button></div>`;
  $("usoCopy").onclick = () => copyText(usoText());
  $("usoZero").onclick = () => { if (S.usoZ) { usoBuf = {}; localStorage.removeItem(USO_K); S.usoZ = 0; renderUso(); toast("Contatori azzerati"); } else { S.usoZ = 1; $("usoZero").textContent = "Tocca di nuovo"; setTimeout(() => { S.usoZ = 0; }, 4000); } };
}
