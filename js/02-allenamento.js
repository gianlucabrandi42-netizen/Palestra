/* Palestra — Schermata Allenamento: barra in alto, unità del giorno, Questa settimana, archivio foto (IndexedDB), riquadro Info ed esecuzione.
   Parte di app.js diviso il 22/11/2026: i file js/01…09 si caricano in ordine (index.html) e condividono le stesse funzioni globali. */
"use strict";
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
// Le miniature non si ricaricano a ogni serie scritta (19/11/2026: "le immagini diventano un attimo bianche"): prima di
// ricostruire un contenitore teniamo da parte le <img> già caricate e le rimettiamo al posto di quelle nuove con lo stesso src.
function keepImgs(el) { const m = new Map(); if (el) el.querySelectorAll("img").forEach(i => { const k = i.getAttribute("src"); if (k && !m.has(k)) m.set(k, i); }); return m; }
function reuseImgs(el, m) { if (!el || !m.size) return; el.querySelectorAll("img").forEach(n => { const o = m.get(n.getAttribute("src")); if (o && o !== n && o.complete && o.naturalWidth) { [...o.attributes].forEach(t => { if (!n.hasAttribute(t.name)) o.removeAttribute(t.name); }); [...n.attributes].forEach(t => { if (t.name !== "src") o.setAttribute(t.name, t.value); }); n.replaceWith(o); m.delete(n.getAttribute("src")); } }); }
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
  const oldImgs = keepImgs(strip); strip.innerHTML = units.map(u => { const f = (t => t ? { src: t } : null)(u.circ ? (execFrames(u.ex)[0] || {}).src : thumbOf(u.ex, s)), c = u === cur;
    return `<button class="schip${u.done ? " d" : ""}${c ? " c" : ""}${u.started && !u.done ? " p" : ""}" data-k="${u.keys[0]}" aria-label="${esc(u.name)}${u.done ? ", fatto" : ""}">${f ? `<img src="${f.src}" alt="" loading="lazy">` : ""}<span>${u.done ? "✓ " : ""}${u.n}${c ? " " + esc(shortName(u.name)) : ""}</span></button>`; }).join(""); reuseImgs(strip, oldImgs);
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
// ---------- 📷 ARCHIVIO FOTO (20/11/2026) ----------
// Le foto (macchine e piatti) stavano dentro i dati in localStorage, che su iPhone ha ~5 MB: con qualche decina di foto si
// riempiva e l'app non salvava più nemmeno le serie. Ora stanno in IndexedDB ("palestra-foto", chiavi "mach:<gym>:<nome>",
// "food:<ricetta>"); nei dati resta solo il segno 1. In memoria (PICM) per disegnarle subito. Backup (file e online) le porta
// a parte, nel campo "pics" accanto a "data". Le foto vecchie (dataURL nei dati) vengono spostate all'avvio (migratePics).
const PICM = new Map(); let picDb = null;
const idb = () => picDb || (picDb = new Promise((ok, ko) => { const r = indexedDB.open("palestra-foto", 1); r.onupgradeneeded = () => r.result.createObjectStore("p"); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); }));
const idbDo = (mode, fn) => idb().then(db => new Promise((ok, ko) => { const t = db.transaction("p", mode), st = t.objectStore("p"), res = fn(st); t.oncomplete = () => ok(res); t.onerror = t.onabort = () => ko(t.error); }));
async function picPut(k, v) { await idbDo("readwrite", st => st.put(v, k)); PICM.set(k, v); }
async function picDel(k) { PICM.delete(k); try { await idbDo("readwrite", st => st.delete(k)); } catch (e) {} }
async function picLoadAll() { const r = await idbDo("readonly", st => ({ k: st.getAllKeys(), v: st.getAll() })); r.k.result.forEach((k, i) => PICM.set(k, r.v.result[i])); }
const picOf = (k, legacy) => PICM.get(k) || (typeof legacy === "string" && legacy.startsWith("data:") ? legacy : "");
async function migratePics() {
  let moved = 0;
  const F = (D.food && D.food.pics) || {};
  for (const [id, v] of Object.entries(F)) if (typeof v === "string" && v.startsWith("data:")) { await picPut("food:" + id, v); F[id] = 1; moved++; }
  for (const [g, m] of Object.entries(D.machines || {})) for (const [n, v] of Object.entries(m || {})) if (typeof v === "string" && v.startsWith("data:")) { await picPut(`mach:${g}:${n}`, v); m[n] = 1; moved++; }
  if (moved) save(true);
  return moved;
}
async function restorePics(j) { for (const [k, v] of Object.entries((j && j.pics) || {})) if (!PICM.has(k) && typeof v === "string") { try { await picPut(k, v); } catch (e) {} } try { await migratePics(); } catch (e) {} }
const picsSig = () => { let n = 0; for (const v of PICM.values()) n += v.length; return PICM.size + "/" + n; };
// Foto delle macchine scattate dall'utente (D.machines[gym][nome minuscolo] = 1, la foto in "mach:<gym>:<nome>")
const machinePic = n => { const k = (n || "").trim().toLowerCase(); return picOf(`mach:${S.gym}:${k}`, ((D.machines || {})[S.gym] || {})[k]); };
function saveMachinePic(n, file) {
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => { const k = 480 / Math.max(img.width, img.height), c = document.createElement("canvas"); c.width = Math.round(img.width * Math.min(1, k)); c.height = Math.round(img.height * Math.min(1, k));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    const mk = n.trim().toLowerCase(), g = S.gym;
    picPut(`mach:${g}:${mk}`, c.toDataURL("image/jpeg", 0.72)).then(() => { D.machines = D.machines || {}; D.machines[g] = { ...(D.machines[g] || {}), [mk]: 1 }; save(); toast("Foto salvata"); renderLog(); })
      .catch(() => toast("Foto non salvata: memoria del telefono piena?")); };
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
  if (pbody && !pbody.firstChild) fillPanel(pbody, exView(ex));
  const body = sh.querySelector(".is-c"); body.textContent = ""; panel.hidden = false; body.appendChild(panel); sh._card = card;
  sh.querySelector(".is-h").innerHTML = `<b>${esc(subOf(current(), key) || ex.name)}</b>${rxLine(ex)}`;
  const was = !sh.hidden || S.sheet === key && sh.classList.contains("on"); S.sheet = key;
  sh.hidden = false; document.documentElement.classList.add("noscroll");
  if (!sh.classList.contains("on")) body.scrollTop = 0; // aperto da chiuso (o mentre si chiudeva): sempre dall'inizio, prima restava a metà, anche di un altro esercizio
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
    // 22/11/2026 ("quando trascino per chiudere lagga"): prima a ogni movimento del dito leggeva l'altezza (ricalcolo della pagina)
    // e ridisegnava; ora l'altezza si legge una volta e si aggiorna un solo fotogramma alla volta, su un livello a parte
    if (!sh._raf) { box.style.transition = "none"; bg.style.transition = "none"; sh.classList.add("drag"); sh._h = box.offsetHeight || 600; }
    cancelAnimationFrame(sh._raf); sh._raf = requestAnimationFrame(() => { box.style.transform = `translate3d(0,${dy}px,0)`; bg.style.opacity = String(Math.max(0.15, 1 - dy / sh._h)); });
  };
  const end = () => { if (y0 == null) return; cancelAnimationFrame(sh._raf); sh._raf = 0; sh.classList.remove("drag"); const h = sh._h || box.offsetHeight || 600;
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
