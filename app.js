/* Palestra — app di allenamento. Dati salvati solo sul telefono (localStorage) con backup su file. */
"use strict";
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const num = v => { if (v === "" || v == null) return null; const n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : null; };
const fmt = n => n == null ? "" : (Math.round(n * 100) / 100).toString().replace(".", ",");
const todayISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
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
  return d;
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
const S = { view: "log", gym: D.prefs.gym || GYMS[0].id, day: D.prefs.day, date: todayISO(), open: new Set(), pday: null };
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
// Riferimento per i suggerimenti: l'ultima seduta "normale" (salta fino a 2 giornate no o di rientro).
function lastRef(k) { const l = gymSessions(S.gym).filter(s => s.date < S.date && exHas(s, k)); for (let i = l.length - 1; i >= Math.max(0, l.length - 3); i--) if (!isOffDay(l[i])) return l[i]; return l[l.length - 1] || null; }
const roundKg = x => Math.round(x * 2) / 2;
function suggestKg(ls, hit, f) { if (!ls || ls.kg == null) return null; let k = ls.kg; if (hit && f >= 1) k = Math.max(k * 1.025, k + 1); return roundKg(k * f); }
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
  document.body.classList.toggle("g1", gi === 1);
  $("gyms").innerHTML = GYMS.map(g => `<button data-g="${g.id}" aria-pressed="${g.id === S.gym}">${esc(g.name)}</button>`).join("");
  $("gyms").querySelectorAll("button").forEach(b => b.onclick = () => { S.gym = b.dataset.g; persistPrefs(); render(); });
  const p = plan(); dayObj();
  $("days").innerHTML = p.days.map(d => `<button data-d="${d.id}" aria-pressed="${d.id === S.day}"><b>${esc(d.id)}</b><small>${esc(d.name)}</small></button>`).join("");
  $("days").querySelectorAll("button").forEach(b => b.onclick = () => { S.day = b.dataset.d; S.open.clear(); persistPrefs(); render(); scrollTo(0, 0); });
  $("date").value = S.date;
  const list = gymSessions(S.gym).filter(s => s.plan === p.id && s.day === S.day).slice(-12).reverse();
  const box = $("sessions"); box.textContent = "";
  const today = todayISO();
  if (!list.some(s => s.date === today)) box.appendChild(chip("Oggi", today));
  list.forEach(s => box.appendChild(chip(s.date === today ? "Oggi" : fmtDate(s.date), s.date)));
}
function chip(label, date) { const b = document.createElement("button"); b.className = "chip"; b.textContent = label; b.setAttribute("aria-pressed", S.date === date); b.onclick = () => { S.date = date; render(); }; return b; }
function persistPrefs() { D.prefs.gym = S.gym; D.prefs.day = S.day; save(); }

function updateProgress() {
  const d = dayObj(), s = current();
  const { tot, done } = dayUnits(d, s);
  $("barfill").style.width = (tot ? done / tot * 100 : 0) + "%"; $("bartxt").textContent = `${done}/${tot} serie`;
  d.ex.forEach(e => { const c = document.querySelector(`[data-ex="${e.key}"]`); if (c) c.classList.toggle("done", doneSets(s, e) === e.sets.length); });
  document.querySelectorAll(".circ-card").forEach(c => { const e = d.ex.find(x => x.circ === c.dataset.circ); if (e) c.classList.toggle("done", circCount(s, e.circ) >= e.sets.length); });
  checkMissing();
}

function renderLog() {
  renderConsole();
  const p = plan(), d = dayObj(), sess = current();
  const gname = GYMS.find(g => g.id === S.gym).name;
  $("herok").textContent = `${d.id} · ${gname} · ${S.date === todayISO() ? "oggi" : fmtDate(S.date)}`;
  $("heroh").textContent = d.name;
  const past = gymSessions(S.gym).filter(s => s.plan === p.id && s.day === S.day && s.date < S.date);
  const { tot, nEx } = dayUnits(d, null);
  $("herostats").innerHTML = `<span><b>${nEx}</b> esercizi</span><span><b>${tot}</b> serie</span><span>Ultima volta <b>${past.length ? fmtDate(past[past.length - 1].date) : "—"}</b></span>`;
  // forma del giorno
  const cond = condition(sess);
  $("ready").innerHTML = `<span>Come stai oggi?</span>` + Object.entries(READY).map(([k, v]) => `<button data-r="${k}" aria-pressed="${(sess.readiness || "ok") === k}">${v.n}</button>`).join("");
  $("ready").querySelectorAll("button").forEach(b => b.onclick = () => setSess({ readiness: b.dataset.r }));
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
  let exN = 0;
  d.ex.forEach((ex, idx) => {
    const cg0 = isCircNoLog(d, idx);
    if (cg0) { if (idx === cg0.start) list.appendChild(circCard(d, cg0, ++exN)); return; }
    exN++;
    const last = lastBefore(ex.key), lastSets = last ? exSets(last, ex.key) : [];
    const rs = lastRef(ex.key), refSets = rs ? exSets(rs, ex.key) : [], hit = rs ? allHit(refSets, ex) : false, cond = condition(sess);
    const ref = ex.ref && ex.ref[S.gym];
    let pills = "";
    if (rs && cond.f < 1) pills += `<span class="pill near">Oggi −${Math.round((1 - cond.f) * 100)}% · ${esc(cond.why)}</span>`;
    else if (rs) pills += hit ? `<span class="pill up">↑ Aumenta${ex.bw ? "" : " carico"}</span>` : `<span class="pill">= Stesso carico</span>`;
    else if (ref) pills += `<span class="pill">Rif. scheda prec. ${fmt(ref)} kg</span>`;
    const cg = circGroup(d, idx);
    if (cg) pills += cg.last ? `<span class="pill circ">Circuito · recupero ${fmtSec(restFor(ex))} a fine giro</span>` : `<span class="pill circ">Circuito · subito il prossimo</span>`;
    else pills += `<span class="pill">Recupero ${fmtSec(restFor(ex))}</span>`;
    if (last) pills += `<span class="pill">ultima ${fmtDate(last.date)}</span>`;
    const fr = execFrames(ex);
    const card = document.createElement("article"); card.className = "ex"; card.dataset.ex = ex.key;
    const open = S.open.has(ex.key);
    card.innerHTML = `
      ${fr.length ? `<button class="exec" data-zoom aria-label="Ingrandisci le immagini di ${esc(ex.name)}">
        ${fr.map(f => `<img src="${f.src}" alt="${esc(ex.name)} — ${esc(f.cap)}" class="${f.draw ? "draw" : ""}" loading="lazy">`).join("")}
        <span class="lbl"><i></i>Esecuzione</span><span class="zoom"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4M11 8v6M8 11h6"/></svg></span></button>` : ""}
      <div class="exhead">
        <div class="num">${String(exN).padStart(2, "0")}</div>
        <div><h3 class="exname">${esc(ex.name)}</h3><div class="tec">${esc(ex.tec || "")}</div>${pills ? `<div class="pills">${pills}</div>` : ""}</div>
        <button class="mini" data-more aria-label="Muscoli di ${esc(ex.name)}">${bodySVG(ex.m || {})}</button>
      </div>
      ${(ex.flash || []).length ? `<ul class="flash" aria-label="Da ricordare">${ex.flash.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      ${ex.setup === false ? "" : `<div class="setup"><label for="su-${ex.key}">Regolazioni</label><input id="su-${ex.key}" autocomplete="off" placeholder="es. sedile 4 · schienale 2"></div>`}
      <div class="sets"><div class="sh"><span>Serie</span><span>Ultima volta</span><span>${ex.bw ? "kg (opz.)" : "kg"}</span><span>Reps</span></div></div>
      <div class="exfoot"><button class="btn sm" data-copy>Usa kg suggeriti</button>
        <button class="more" data-more aria-expanded="${open}">Dettagli<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button></div>
      <div class="panel" ${open ? "" : "hidden"}></div>`;
    const setsEl = card.querySelector(".sets"), cur = exSets(sess, ex.key);
    let sn = 0;
    ex.sets.forEach((st, i) => {
      const ty = TYPES[st.type] || TYPES.std; if (!st.type || st.type === "std" || st.type === "alte" || st.type === "pausa" || st.type === "risc") sn++;
      const label = st.type === "ced" ? "RP" : st.type === "strip" ? "ST" : st.type === "super" ? "SS" : "S" + sn;
      const r = cur[i] || {}, lr = lastSets[i], tn = tnum(st.t), rr = refSets[i];
      const sug = ex.bw ? null : suggestKg(rr, hit, cond.f);
      const row = document.createElement("div"); row.className = "set";
      row.innerHTML = `<div class="sn" style="--tc:var(${ty.c})">${label}<small>${esc(st.t)}${ex.bw && tn != null ? "" : ""} reps</small>${ty.n || st.note ? `<em>${esc([ty.n, st.note].filter(Boolean).join(" · "))}</em>` : ""}</div>
        <div class="prev">${lr && (lr.kg != null || lr.reps != null) ? `${lr.kg != null ? fmt(lr.kg) + " × " : ""}${lr.reps ?? "–"}` : "—"}${sug != null ? `<b class="sug">oggi ${fmt(sug)} kg</b>` : ""}</div>
        <input id="kg-${ex.key}-${i}" inputmode="decimal" enterkeyhint="next" autocomplete="off" aria-label="${esc(ex.name)} serie ${i + 1} kg" placeholder="${sug != null ? fmt(sug) : lr && lr.kg != null ? fmt(lr.kg) : "kg"}">
        <input id="rp-${ex.key}-${i}" inputmode="numeric" enterkeyhint="next" autocomplete="off" aria-label="${esc(ex.name)} serie ${i + 1} ripetizioni" placeholder="${tn != null ? tn : "max"}">`;
      const [kg, rp] = row.querySelectorAll("input"); kg.value = fmt(r.kg); rp.value = r.reps ?? "";
      const fb = document.createElement("div"); fb.className = "fb"; row.appendChild(fb);
      const upd = () => judge(kg, rp, fb, tn, rr, cond);
      kg.oninput = e => { edit(ex, i, "kg", kg.value); upd(); autoKg(e, kg, rp); };
      rp.oninput = e => { edit(ex, i, "reps", rp.value); upd(); autoReps(e, rp); };
      // serie completata (reps inserite e campo lasciato) → parte il recupero
      rp.addEventListener("change", () => {
        if (num(rp.value) == null || S.date !== todayISO() || !tPrefs().auto) return;
        const g = circGroup(d, idx);
        if (g && !g.last) { toast(`Subito: ${d.ex[idx + 1].name}`); return; } // circuito: niente recupero tra gli esercizi
        if (g) { const after = d.ex[g.end + 1]; startRest(restFor(ex), i < ex.sets.length - 1 ? `Giro ${i + 1} finito · poi giro ${i + 2}` : after ? `Circuito finito · poi ${after.name}` : "Circuito finito"); return; }
        const nx =i < ex.sets.length - 1 ? `${ex.name} · poi serie ${i + 2}` : (d.ex[idx + 1] ? `Poi: ${d.ex[idx + 1].name}` : "Ultima serie del giorno");
        startRest(restFor(ex), nx);
      });
      upd(); setsEl.appendChild(row);
    });
    const su = card.querySelector(".setup input");
    if (su) { su.value = ((D.setup[S.gym] || {})[ex.key]) || ""; su.oninput = () => { D.setup[S.gym] = D.setup[S.gym] || {}; D.setup[S.gym][ex.key] = su.value.trim(); save(); }; }
    const cp = card.querySelector("[data-copy]");
    if (ex.bw || !rs || !refSets.some(r => r && r.kg != null)) cp.hidden = true;
    cp.onclick = () => ex.sets.forEach((_, i) => { const k = suggestKg(refSets[i], hit, cond.f); if (k != null) { const el = $(`kg-${ex.key}-${i}`); el.value = fmt(k); edit(ex, i, "kg", el.value); el.dispatchEvent(new Event("input")); } });
    const panel = card.querySelector(".panel"); if (open) fillPanel(panel, ex);
    card.querySelectorAll("[data-more]").forEach(b => b.onclick = () => {
      const isOpen = !panel.hidden; panel.hidden = isOpen; card.querySelector(".more").setAttribute("aria-expanded", !isOpen);
      if (isOpen) S.open.delete(ex.key); else { S.open.add(ex.key); if (!panel.firstChild) fillPanel(panel, ex); }
    });
    const z = card.querySelector("[data-zoom]"); if (z) z.onclick = () => openLB(ex, 0);
    list.appendChild(card);
  });
  $("note").value = sess.note || "";
  updateProgress();
}
// ---------- campi dimenticati ----------
// Se hai già compilato una serie più avanti nella giornata, le serie precedenti senza reps (o con reps ma senza kg)
// sono "da completare": righe segnate in arancione + avviso sopra il timer che porta alla prima.
function missingSlots(d, s) {
  const slots = [];
  d.ex.forEach((e, idx) => { const g = isCircNoLog(d, idx); if (g) { if (idx === g.start) slots.push({ circ: e.circ, giri: e.sets.length, k: e.key }); return; } e.sets.forEach((_, i) => slots.push({ e, i, k: e.key })); });
  const rOf = sl => exSets(s, sl.e.key)[sl.i];
  const filled = sl => sl.circ ? circCount(s, sl.circ) > 0 : (r => r && (r.kg != null || r.reps != null))(rOf(sl));
  let last = -1; slots.forEach((sl, j) => { if (filled(sl)) last = j; });
  const miss = [];
  slots.forEach((sl, j) => {
    if (j > last) return;
    if (sl.circ) { if (j < last && circCount(s, sl.circ) < sl.giri) miss.push({ k: sl.k, i: 0, what: "giri" }); return; }
    const r = rOf(sl);
    if (j < last && (!r || r.reps == null)) miss.push({ k: sl.k, i: sl.i, what: "reps" });
    else if (r && r.reps != null && r.kg == null && !sl.e.bw) miss.push({ k: sl.k, i: sl.i, what: "kg" });
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
  $("missGo").onclick = () => { const m = missingSlots(dayObj(), current())[0]; if (!m) return drawMissing(); const row = rowEl(m.k, m.i);
    row.scrollIntoView({ block: "center", behavior: "smooth" }); row.classList.remove("here"); void row.offsetWidth; row.classList.add("here"); setTimeout(() => row.classList.remove("here"), 2600); };
  $("missX").onclick = () => { const s2 = JSON.parse(JSON.stringify(current())); s2.ignoreMiss = true; s2.updatedAt = Date.now(); D.sessions[s2.id] = s2; save(); drawMissing(); toast("Avviso nascosto per questa seduta"); };
}
document.addEventListener("focusin", e => { if (e.target.matches && e.target.matches(".set input")) checkMissing(); });
// scheda unica del circuito senza registrazione: esercizi + "▶ Giro fatto" + "⏱ recupero"
function circCard(d, g, n) {
  const mem = d.ex.slice(g.start, g.end + 1), c = mem[0].circ, giri = mem[0].sets.length, t = mem[0].sets[0].t;
  const rest = restFor(mem[mem.length - 1]), cnt = circCount(current(), c);
  const mu = { p: [...new Set(mem.flatMap(e => (e.m && e.m.p) || []))], s: [...new Set(mem.flatMap(e => (e.m && e.m.s) || []))] };
  const card = document.createElement("article"); card.className = "ex circ-card" + (cnt >= giri ? " done" : ""); card.dataset.circ = c; card.dataset.keys = mem.map(e => e.key).join(" ");
  card.innerHTML = `
    <div class="exhead"><div class="num">${String(n).padStart(2, "0")}</div>
      <div><h3 class="exname">Circuito ${esc(c)}</h3><div class="tec">${giri} giri: ${mem.map(e => esc(e.name)).join(" → ")}, ${esc(t)} reps ciascuno senza pausa. ${fmtSec(rest)} di recupero dopo ogni giro.</div></div>
      <div class="mini" aria-hidden="true">${bodySVG(mu)}</div></div>
    <ol class="circlist">${mem.map((e, i) => { const f = execFrames(e)[0]; return `<li>
      <div class="crow">${f ? `<button class="cthumb" data-z="${i}" aria-label="Immagini di ${esc(e.name)}"><img src="${f.src}" alt="" loading="lazy"></button>` : ""}
        <div class="t"><b>${i + 1}. ${esc(e.name)}</b><small>${esc(t)} reps</small><span class="cf">${(e.flash || []).map(esc).join(" · ")}</span></div>
        <button class="more" data-m="${i}" aria-expanded="${S.open.has(e.key)}">Dettagli<svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button></div>
      <div class="panel" ${S.open.has(e.key) ? "" : "hidden"}></div></li>`; }).join("")}</ol>
    <div class="giri"><span>Giri</span>${Array.from({ length: giri }, (_, k) => `<button class="giro ${k < cnt ? "on" : ""}" data-g="${k + 1}" aria-label="Giro ${k + 1}">${k + 1}</button>`).join("")}</div>
    <div class="circbtns"><button class="btn primary" data-play ${cnt >= giri ? "disabled" : ""}>${cnt >= giri ? "✓ Circuito completato" : `▶ Giro fatto <small>${cnt + 1}/${giri}</small>`}</button>
      <button class="btn" data-rest>⏱ ${fmtSec(rest)}</button></div>`;
  card.querySelectorAll("[data-z]").forEach(b => b.onclick = () => openLB(mem[+b.dataset.z], 0));
  card.querySelectorAll("[data-m]").forEach(b => { const e = mem[+b.dataset.m], panel = b.closest("li").querySelector(".panel"); if (!panel.hidden) fillPanel(panel, e);
    b.onclick = () => { const open = panel.hidden; panel.hidden = !open; b.setAttribute("aria-expanded", open); if (open) { S.open.add(e.key); if (!panel.firstChild) fillPanel(panel, e); } else S.open.delete(e.key); }; });
  const setCirc = k => {
    const s2 = JSON.parse(JSON.stringify(current())); s2.circ = { ...(s2.circ || {}), [c]: Math.max(0, Math.min(giri, k)) }; s2.updatedAt = Date.now(); D.sessions[s2.id] = s2; save();
    if (S.date === todayISO()) try { localStorage.setItem(LKEY, JSON.stringify({ gym: S.gym, day: S.day, date: S.date, key: mem[0].key, i: 0 })); } catch (e) {}
    card.replaceWith(circCard(d, g, n)); updateProgress();
  };
  card.querySelector("[data-play]").onclick = () => setCirc(cnt + 1);
  card.querySelectorAll("[data-g]").forEach(b => b.onclick = () => { const k = +b.dataset.g; setCirc(cnt === k ? k - 1 : k); });
  card.querySelector("[data-rest]").onclick = () => startRest(rest, cnt >= giri ? "Circuito finito" : cnt ? `Giro ${cnt} fatto · poi giro ${cnt + 1}` : `Recupero ${c}`);
  return card;
}
// elemento da mostrare per la serie k/i: la riga della serie, o i tasti del circuito se l'esercizio è in un circuito senza registrazione
function rowEl(k, i) { const el = $(`rp-${k}-${i}`); if (el) return el.closest(".set"); const c = document.querySelector(`.circ-card[data-keys~="${k}"]`); return c ? c.querySelector(".circbtns") : null; }
// Compilazione veloce: dopo i kg il cursore passa da solo alle reps; dopo le reps la serie si conferma da sola
// (tastiera giù → parte il timer e si scorre alla serie dopo). Solo per ciò che scrivi tu, non per "Usa kg suggeriti".
function autoKg(e, kg, rp) {
  if (!e || !e.isTrusted) return; clearTimeout(kg._t);
  const v = kg.value.trim(); if (!v || /[.,]$/.test(v) || num(v) == null) return;
  kg._t = setTimeout(() => { if (document.activeElement === kg && rp.value === "") rp.focus(); }, 1100);
}
function autoReps(e, rp) {
  if (!e || !e.isTrusted) return; clearTimeout(rp._t);
  const v = rp.value.trim(); if (num(v) == null) return;
  rp._t = setTimeout(() => { if (document.activeElement === rp) rp.blur(); }, v.replace(/\D/g, "").length >= 2 ? 400 : 1100);
}
// Valutazione della serie: non solo "target sì/no", ma quanto ti sei avvicinato e se hai alzato il carico.
// Forza stimata (formula di Epley): kg × (1 + reps/30), confrontata con la stessa serie dell'ultima volta.
const repsTxt = n => n === 1 ? "manca 1 rep" : `mancano ${n} reps`;
function judge(kgEl, rpEl, fb, t, lr, cond) {
  const kg = num(kgEl.value), reps = num(rpEl.value), f = cond ? cond.f : 1, off = f < 1;
  let cls = "", msg = "";
  if (reps != null && t != null) {
    const miss = t - reps, pct = reps / t, missTxt = miss === 1 ? "1 rep" : miss + " reps";
    const hasLast = lr && lr.kg != null && lr.reps != null && kg != null;
    const up = hasLast ? kg - lr.kg : 0;
    // forza attesa oggi = forza dell'ultima volta × fattore di forma/rientro
    const e1 = hasLast ? e1rm(kg, reps) : 0, exp = hasLast ? e1rm(lr.kg, lr.reps) * f : 0;
    if (reps >= t) { cls = "ok"; msg = reps > t ? `Target superato di ${reps - t}` : (off ? "Target pieno anche in una giornata difficile" : ""); }
    else if (hasLast && e1 >= exp * 0.99 && (up > 0 || off)) { cls = "prog"; msg = off ? `${missTxt} in meno, ma forza in linea con oggi (${cond.why}): va bene così` : `${missTxt} in meno ma +${fmt(up)} kg: forza pari o superiore all'ultima volta`; }
    else if (hasLast && up > 0 && pct >= 0.6) { cls = "near"; msg = `Carico salito di ${fmt(up)} kg: normale perdere qualche rep (${repsTxt(miss)})`; }
    else if (pct >= (off ? 0.6 : 0.8)) { cls = "near"; msg = `Quasi: ${repsTxt(miss)} (${Math.round(pct * 100)}% del target)` + (off ? " · oggi: " + cond.why : ""); }
    else { cls = "ko"; msg = `Sotto target: ${reps} su ${t}.` + (off ? " Oggi non conta per la progressione." : hasLast && up >= 0 ? " Se si ripete, scendi un po' di carico." : ""); }
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
  s.ex[ex.key][i] = { ...s.ex[ex.key][i], [field]: num(val) };
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
    else if (d.ex[idx + 1]) { k = d.ex[idx + 1].key; i = 0; }
  }
  return { k, i };
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
    const row = rowEl(t.k, t.i); if (!row) return;
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
  const row = rowEl(k, i); if (!row) return false;
  const go = () => row.scrollIntoView({ block: "center", behavior: force ? "smooth" : "auto" });
  go(); if (!force) setTimeout(go, 350);
  row.classList.remove("here"); void row.offsetWidth; row.classList.add("here"); setTimeout(() => row.classList.remove("here"), 2600);
  return true;
}
function setSess(patch) { const s = JSON.parse(JSON.stringify(current())); Object.assign(s, patch); s.updatedAt = Date.now(); D.sessions[s.id] = s; save(); renderLog(); }
let noteT;
$("note").oninput = e => { clearTimeout(noteT); const v = e.target.value; noteT = setTimeout(() => { const s = JSON.parse(JSON.stringify(current())); s.note = v; s.updatedAt = Date.now(); D.sessions[s.id] = s; save(); }, 300); };
$("date").onchange = e => { if (e.target.value) { S.date = e.target.value; render(); } };
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
  tr.innerHTML = a.map(f => `<figure><img src="${f.src}" alt="${esc(ex.name)} — ${esc(f.cap)}" draggable="false"></figure>`).join("");
  $("lb").hidden = false; document.body.style.overflow = "hidden";
  requestAnimationFrame(() => { tr.scrollLeft = tr.clientWidth * i; });
  tr.querySelectorAll("img").forEach(setupZoom);
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

// ---------- progressi ----------
function renderProg() {
  const p = plan(); S.pday = S.pday || S.day;
  const d = p.days.find(x => x.id === S.pday) || p.days[0];
  document.body.classList.toggle("g1", GYMS.findIndex(g => g.id === S.gym) === 1);
  $("pk").textContent = `${GYMS.find(g => g.id === S.gym).name} · ${p.name}`;
  $("pdays").innerHTML = p.days.map(x => `<button data-d="${x.id}" aria-pressed="${x.id === d.id}"><b>${esc(x.id)}</b><small>${esc(x.name)}</small></button>`).join("");
  $("pdays").querySelectorAll("button").forEach(b => b.onclick = () => { S.pday = b.dataset.d; renderProg(); });
  const box = $("prog"); box.textContent = "";
  const ss = gymSessions(S.gym);
  if (!ss.length) { box.innerHTML = `<div class="empty">Ancora nessuna seduta registrata in questa palestra. Compila un allenamento e qui compaiono i grafici.</div>`; return; }
  d.ex.forEach((ex, idx) => {
    const cg = isCircNoLog(d, idx);
    if (cg) { if (idx !== cg.start) return;
      const done = ss.filter(s => circCount(s, ex.circ) > 0), l = done[done.length - 1], row = document.createElement("div"); row.className = "pr";
      row.innerHTML = `<div><div class="n">Circuito ${esc(ex.circ)}</div><div class="s">${done.length ? `${done.length} sedute · ultima ${fmtDate(l.date)}: ${circCount(l, ex.circ)}/${ex.sets.length} giri` : "Nessun dato"}</div></div>`;
      box.appendChild(row); return; }
    const all = ss.filter(s => exHas(s, ex.key)).map(s => ({ i: index(exSets(s, ex.key)), m: maxKg(exSets(s, ex.key)), hit: allHit(exSets(s, ex.key), ex), off: isOffDay(s) }));
    const pts = all.filter(x => !x.off), nOff = all.length - pts.length;
    let stat = "Nessun dato", pill = "";
    if (pts.length) {
      const a = pts[0], z = pts[pts.length - 1], q = pts[pts.length - 2];
      const dP = q && q.i ? (z.i - q.i) / q.i : null, dF = a.i ? (z.i - a.i) / a.i : null;
      stat = `${pts.length} sedute${nOff ? ` (+${nOff} giornate no escluse dal trend)` : ""} · ${z.m != null ? "max " + fmt(z.m) + " kg · " : ""}indice ${Math.round(z.i)}${dF != null && pts.length > 1 ? ` (${dF >= 0 ? "+" : ""}${(dF * 100).toFixed(1).replace(".", ",")}% dalla 1ª)` : ""}`;
      if (dP != null) pill = dP > 0.03 ? `<span class="pill up">↑ in crescita</span>` : dP < -0.03 ? `<span class="pill down">↓ in calo</span>` : `<span class="pill">→ stabile</span>`;
      if (z.hit) pill += ` <span class="pill up">prossima: aumenta</span>`;
    }
    const row = document.createElement("div"); row.className = "pr";
    row.innerHTML = `<div><div class="n">${esc(ex.name)}</div><div class="s">${stat}</div>${pill ? `<div class="pills">${pill}</div>` : ""}</div>${spark(pts.map(x => x.i))}`;
    box.appendChild(row);
  });
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
    save(true); $("bkMsg").textContent = `Ripristino fatto: ${added} sedute importate o aggiornate.`; toast("Backup ripristinato"); render();
  } catch (err) { $("bkMsg").textContent = "Questo file non è un backup dell'app Palestra."; }
  e.target.value = "";
};
$("csv").onclick = () => {
  const names = {}; plans.forEach(p => p.days.forEach(d => d.ex.forEach(ex => names[ex.key] = ex.name)));
  const rows = [["data", "palestra", "scheda", "giorno", "esercizio", "serie", "kg", "reps"]];
  Object.values(D.sessions).sort((a, b) => a.date < b.date ? -1 : 1).forEach(s => {
    const pn = (plans.find(p => p.id === s.plan) || {}).name || s.plan, gn = (GYMS.find(g => g.id === s.gym) || {}).name || s.gym;
    Object.entries(s.circ || {}).forEach(([c, n]) => { if (n > 0) rows.push([s.date, gn, pn, s.day, "Circuito " + c, "giri", "", n]); });
    Object.entries(s.ex || {}).forEach(([k, arr]) => (arr || []).forEach((r, i) => { if (r && (r.kg != null || r.reps != null)) rows.push([s.date, gn, pn, s.day, names[k] || k, i + 1, fmt(r.kg), r.reps ?? ""]); }));
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
  if (S.view === "log") renderLog(); else if (S.view === "prog") renderProg(); else if (S.view === "plan") renderPlans(); else renderMore();
  drawTimer(); drawMissing();
}

// ---------- timer di recupero ----------
// Recupero di base 1:30 (regolabile); se l'esercizio ha "rest" nella scheda, vale quello.
// A fine recupero: vibrazione (Android), suono e tocco aptico (iPhone, dove possibile). Lo schermo resta acceso mentre conta.
const TKEY = "palestra-timer";
const tPrefs = () => { const t = D.prefs.timer = D.prefs.timer || {}; return { sec: t.sec ?? 90, auto: t.auto ?? true, vib: t.vib ?? true, snd: t.snd ?? true, warn: t.warn ?? true, push: t.push ?? false, pushSub: t.pushSub || null, pushId: t.pushId || "", lockNote: t.lockNote ?? true }; };
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
function alarm(soft) {
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
const PUSH_URL = "";
const pushReady = () => !!PUSH_URL;
const newPushId = () => "p" + Array.from(crypto.getRandomValues(new Uint8Array(12)), b => (b % 36).toString(36)).join("");
const b64uToU8 = s => { const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)); return Uint8Array.from(b, c => c.charCodeAt(0)); };
const u8ToB64u = u => btoa(String.fromCharCode(...new Uint8Array(u))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
function pushPost(path, body) {
  return fetch(PUSH_URL + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), keepalive: true })
    .then(r => r.json().catch(() => ({})).then(j => { if (!r.ok) throw new Error(j.error || j.detail || r.status); return j; }));
}
const pushOn = () => { const p = tPrefs(); return pushReady() && p.push && p.pushSub && p.pushId; };
function notifSchedule() {
  if (!pushOn() || !running()) return; const p = tPrefs();
  T.sid = 1; tSave();
  pushPost("/schedule", { id: p.pushId, seq: Date.now(), sub: p.pushSub, at: Math.round(T.end), title: "VIA! 💪 Recupero finito", body: T.label ? "Tocca a te · " + T.label : "Tocca a te" }).catch(() => {});
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
      reg.showNotification(`Recupero · riprendi alle ${h}`, { body: T.label || "", tag: "rest", icon: "icons/icon-192.png", silent: true });
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
      ${tg("lockNote", "Ora di ripresa quando esci dall'app", "se blocchi il telefono durante il recupero, compare l'ora in cui riprendere")}
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
