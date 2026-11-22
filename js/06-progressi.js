/* Palestra — Ripresa all'apertura, visore foto, Progressi, Corpo, andamento della scheda, schede.
   Parte di app.js diviso il 22/11/2026: i file js/01…10 si caricano in ordine (index.html) e condividono le stesse funzioni globali. */
"use strict";
// ---------- ripresa: all'apertura torna all'ultima serie compilata oggi ----------
const LKEY = "palestra-last";
function resumeLast(force) {
  let L = null; try { L = JSON.parse(localStorage.getItem(LKEY)); } catch (e) {}
  if (!L || L.date !== todayISO()) return false;
  if (S.view !== "log") { if (!force) return false; S.view = "log"; render(); }
  if (L.gym !== S.gym || L.day !== S.day || S.date !== L.date) { if (!GYMS.some(g => g.id === L.gym) || !plan().days.some(d => d.id === L.day)) return; S.gym = L.gym; S.day = L.day; S.date = L.date; render(); }
  // giorno già completato: niente da riprendere, si riparte dall'alto (recap in cima) (18/11/2026)
  if (sessDone(current())) { const top = () => window.scrollTo({ top: 0, behavior: force ? "smooth" : "auto" }); top(); if (!force) setTimeout(top, 350); return true; }
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
    if (lock !== "y") return; dy = Math.max(0, t.clientY - y0); tr.style.transition = "none";
    cancelAnimationFrame(tr._raf); tr._raf = requestAnimationFrame(() => { tr.style.transform = `translate3d(0,${dy}px,0)`; lb.style.background = `rgba(5,7,9,${Math.max(0.35, 0.97 - dy / 500)})`; }); }, { passive: true });
  tr.addEventListener("touchend", () => { if (y0 == null) return; cancelAnimationFrame(tr._raf); tr.style.transition = ""; if (lock === "y" && dy > 110) closeLB(); tr.style.transform = ""; lb.style.background = ""; y0 = null; });
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
// ---------- Corpo: peso e misure (19/11/2026, richiesta dell'utente) ----------
// D.body = [{id, date, w, waist, hips, chest, arm, thigh, note}] (nel backup). Pensato per non diventare un'ossessione:
// niente promemoria giornalieri né colori "bene/male" (dipende dall'obiettivo); conta la media, non il singolo giorno.
const BODYF = [["w", "Peso", "kg"], ["waist", "Vita", "cm"], ["hips", "Fianchi", "cm"], ["chest", "Petto", "cm"], ["arm", "Braccio", "cm"], ["thigh", "Coscia", "cm"]];
const bodyList = () => (D.body || []).slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : (a.at || 0) - (b.at || 0));
const dAgo = iso => Math.round((new Date(todayISO() + "T12:00") - new Date(iso + "T12:00")) / 864e5);
// media dei valori di un campo in una finestra di giorni fa [da, a]
function bodyAvg(L, k, from, to) { const v = L.filter(b => b[k] != null && dAgo(b.date) >= from && dAgo(b.date) <= to).map(b => b[k]); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; }
function bodySummary(L) { // per il report e il riquadro: primo e ultimo valore di ogni campo (peso: medie di 2 settimane)
  const out = []; for (const [k, n, u] of BODYF) { const v = L.filter(b => b[k] != null); if (v.length < 2) continue;
    const a = k === "w" ? (bodyAvg(v, k, dAgo(v[0].date) - 13, dAgo(v[0].date)) ?? v[0][k]) : v[0][k], b = k === "w" ? (bodyAvg(v, k, 0, 13) ?? v[v.length - 1][k]) : v[v.length - 1][k];
    out.push({ k, n, u, a, b, from: v[0].date }); } return out;
}
function renderBody() {
  let box = $("bodyBox"); if (!box) { box = document.createElement("div"); box.id = "bodyBox"; box.className = "card bodyc"; $("goals").after(box); }
  const L = bodyList(), last = L[L.length - 1], dd = iso => new Date(iso + "T12:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  const nf = v => v == null ? "—" : fmt(Math.round(v * 10) / 10), sg = v => (v > 0 ? "+" : v < 0 ? "−" : "±") + fmt(Math.abs(Math.round(v * 10) / 10));
  let h = `<div class="bh"><h3>Corpo</h3><button class="btn" data-body="add">${S.bodyForm ? "Chiudi" : "+ Registra"}</button></div>`;
  if (S.bodyForm) {
    const f = S.bodyForm;
    h += `<div class="bform"><label class="bd"><span>Data</span><input type="date" data-bf="date" value="${f.date}" max="${todayISO()}"></label>
      ${BODYF.map(([k, n, u]) => `<label><span>${n}</span><input inputmode="decimal" data-bf="${k}" placeholder="${u}" value="${f[k] != null ? fmt(f[k]) : ""}"></label>`).join("")}
      <label class="bn"><span>Nota</span><input data-bf="note" placeholder="facoltativa (es. dopo vacanza)" value="${esc(f.note || "")}"></label>
      <div class="row"><button class="btn primary" data-body="save">Salva</button></div>
      <p class="note">Peso: 1-2 volte a settimana, al mattino a digiuno, prima di mangiare. Misure: ogni 2-4 settimane, sempre nello stesso punto. Scrivi solo quello che hai.</p></div>`;
  }
  if (!L.length) h += `<p class="note">Qui tieni peso e misure. Conta l'andamento nelle settimane, non il singolo giorno: il peso oscilla anche di 1 kg da un giorno all'altro (acqua, sale, carboidrati).</p>`;
  else {
    const wv = L.filter(b => b.w != null);
    if (wv.length) {
      const now = bodyAvg(wv, "w", 0, 13), ago = bodyAvg(wv, "w", 21, 41);
      h += `<div class="bw"><div><b>${nf(wv[wv.length - 1].w)}<small> kg</small></b><span>ultimo · ${dd(wv[wv.length - 1].date)}</span></div>
        <div><b>${nf(now)}<small> kg</small></b><span>media 2 settimane</span></div>
        <div><b>${now != null && ago != null ? sg(now - ago) : "—"}<small>${now != null && ago != null ? " kg" : ""}</small></b><span>vs un mese fa</span></div></div>`;
      const pts = wv.filter(b => dAgo(b.date) <= 120);
      if (pts.length >= 2) { const xs = pts.map(b => -dAgo(b.date)), ys = pts.map(b => b.w), x0 = Math.min(...xs), x1 = Math.max(...xs) || 1, y0 = Math.min(...ys) - 0.5, y1 = Math.max(...ys) + 0.5;
        const X = x => 8 + (x - x0) / Math.max(1, x1 - x0) * 304, Y = y => 70 - (y - y0) / (y1 - y0) * 60;
        const avg = pts.map(b => ({ x: -dAgo(b.date), y: bodyAvg(wv, "w", dAgo(b.date), dAgo(b.date) + 13) }));
        h += `<svg class="bchart" viewBox="0 0 320 78" preserveAspectRatio="none" aria-label="Andamento del peso"><polyline class="bl" points="${avg.map(p => `${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ")}"/>${pts.map((b, i) => `<circle cx="${X(xs[i]).toFixed(1)}" cy="${Y(ys[i]).toFixed(1)}" r="2.6"/>`).join("")}</svg><p class="note bleg">puntini = pesate · linea = media di 2 settimane</p>`; }
    }
    const ms = BODYF.slice(1).map(([k, n, u]) => { const v = L.filter(b => b[k] != null); if (!v.length) return ""; const l = v[v.length - 1][k], f0 = v[0][k];
      return `<div><span>${n}</span><b>${nf(l)}<small> ${u}</small></b>${v.length > 1 ? `<i>${sg(l - f0)} dal ${dd(v[0].date)}</i>` : `<i>${dd(v[0].date)}</i>`}</div>`; }).join("");
    if (ms) h += `<div class="bms">${ms}</div>`;
    h += `<details class="bhist"><summary>Storico (${L.length})</summary>${L.slice().reverse().slice(0, 30).map(b => `<div class="bhr"><b>${dd(b.date)}</b><span>${BODYF.filter(([k]) => b[k] != null).map(([k, n, u]) => `${n.toLowerCase()} ${nf(b[k])}`).join(" · ")}${b.note ? ` · <i>${esc(b.note)}</i>` : ""}</span><button class="bx${S.bodyDel === b.id ? " sure" : ""}" data-bdel="${b.id}" aria-label="Elimina">${S.bodyDel === b.id ? "Sicuro?" : "✕"}</button></div>`).join("")}</details>`;
  }
  box.innerHTML = h;
  box.querySelectorAll("[data-bf]").forEach(i => i.oninput = () => { const k = i.dataset.bf; S.bodyForm[k] = k === "date" || k === "note" ? i.value : num(i.value); });
  box.querySelectorAll("[data-body]").forEach(b => b.onclick = () => {
    if (b.dataset.body === "add") { S.bodyForm = S.bodyForm ? null : { date: todayISO() }; return renderBody(); }
    const f = S.bodyForm; if (!f || !BODYF.some(([k]) => f[k] != null)) return toast("Scrivi almeno un valore");
    const e = { id: "b" + Date.now().toString(36), date: f.date || todayISO(), at: Date.now() }; BODYF.forEach(([k]) => { if (f[k] != null && f[k] > 0) e[k] = Math.round(f[k] * 10) / 10; }); if (f.note) e.note = f.note.trim().slice(0, 80);
    D.body = [...(D.body || []), e]; save(); S.bodyForm = null; toast("Salvato"); renderBody();
  });
  box.querySelectorAll("[data-bdel]").forEach(b => b.onclick = () => { const id = b.dataset.bdel;
    if (S.bodyDel !== id) { S.bodyDel = id; clearTimeout(S.bodyDelT); S.bodyDelT = setTimeout(() => { S.bodyDel = null; renderBody(); }, 4000); return renderBody(); }
    D.body = (D.body || []).filter(x => x.id !== id); S.bodyDel = null; save(); renderBody(); });
}
function renderProg() {
  const p = plan(); S.pday = S.pday || S.day;
  renderReview(); // il punto della settimana, in cima (22/11/2026)
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
  renderBody();
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
