/* Palestra — Serie dimenticate, circuiti, tastierino compatto, scrittura di kg e reps.
   Parte di app.js diviso il 22/11/2026: i file js/01…09 si caricano in ordine (index.html) e condividono le stesse funzioni globali. */
"use strict";
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
  const e = u.ex, f = (t => t ? { src: t } : null)(u.circ ? (execFrames(e)[0] || {}).src : thumbOf(e, s)), b = document.createElement("button");
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
        const nx = nextOpenUnit(d, g.start); S.between = { next: nx ? (subOf(current(), nx.k) || (d.ex.find(e => e.key === nx.k) || {}).name) : "" };
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
const padAdj = e => e && e._pad && e.inputType === "insertReplacementText"; // −/+ del tastierino: niente passaggio automatico
function autoKg(e, kg, rp) {
  if (!e || !(e.isTrusted || e._pad)) return; clearTimeout(kg._t); if (padAdj(e)) return;
  if (isDel(e)) { kg._fix = true; return; }
  const v = kg.value.trim(); if (!v || /[.,]$/.test(v) || num(v) == null) return;
  // dopo i kg: 1" senza scrivere → reps della stessa serie (scelta dell'utente del 17/11/2026)
  kg._t = setTimeout(() => { if (document.activeElement === kg && rp.value === "") rp.focus(); }, kg._fix ? 1200 : 1000);
}
function autoReps(e, rp) {
  if (!e || !(e.isTrusted || e._pad)) return; clearTimeout(rp._t); if (padAdj(e)) return;
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
// ---------- Tastierino compatto dell'app (19/11/2026, richiesta dell'utente) ----------
// Per kg e reps l'iPhone non apre la sua tastiera (inputmode="none"): in basso compare un tastierino basso, nei colori della
// palestra, col timer attaccato sopra. −/+ = un salto pesi (kg) o una rep, partendo da quanto scritto o dal suggerito;
// → = campo dopo (kg → reps → serie dopo); ⌄ = chiude. I tasti non tolgono il cursore dal campo.
const isPadField = el => !!(el && el.matches && el.matches(".set input") && tPrefs().pad);
const PADK = ["1", "2", "3", "del", "4", "5", "6", "minus", "7", "8", "9", "plus", ",", "0", "hide", "next"];
function padStep(el) { const m = el.id.match(/^kg-(.+)-(\d+)$/); return m ? stepFor(m[1], subOf(current(), m[1])).v || 2.5 : 2.5; }
function padLabels() {
  const p = $("pad"), el = document.activeElement; if (!p || !isPadField(el)) return; const isKg = el.id.startsWith("kg-");
  p.classList.toggle("kg", isKg); const st = isKg ? fmt(padStep(el)) : "1";
  p.querySelector('[data-p="minus"] .pkl').innerHTML = `−${st}`; p.querySelector('[data-p="plus"] .pkl').innerHTML = `+${st}`;
  p.querySelector('[data-p="next"] .pkl').innerHTML = isKg ? `reps <span>→</span>` : `<span>→</span>`;
}
function padKey(k, real) {
  const el = document.activeElement; if (!isPadField(el)) return; const isKg = el.id.startsWith("kg-");
  if (k === "hide") return el.blur();
  if (k === "next") { clearTimeout(el._t); if (isKg) { const r = $(el.id.replace(/^kg-/, "rp-")); if (r) r.focus(); } else toNextSet(el); return; }
  let v = el._repl ? "" : el.value, type = "insertText"; if (k !== "minus" && k !== "plus") el._repl = false;
  if (k === ",") { if (!isKg || /[.,]/.test(v)) return; v = (v || "0") + ","; }
  else if (k === "del") { v = el._repl ? "" : v.slice(0, -1); el._repl = false; type = "deleteContentBackward"; } // numero selezionato: ⌫ lo cancella tutto
  else if (k === "minus" || k === "plus") { const st = isKg ? padStep(el) : 1, base = num(el.value) ?? num(el.placeholder) ?? 0;
    const n = Math.max(0, r2(base + (k === "plus" ? st : -st))); v = isKg ? fmt(n) : String(Math.round(n)); el._repl = false; type = "insertReplacementText"; }
  else { if (v.replace(/\D/g, "").length >= (isKg ? 5 : 3)) return; v += k; }
  el.value = v; el._padEd = true; if (!el._repl) el.classList.remove("repl");
  const ev = new InputEvent("input", { bubbles: true, inputType: type, data: k }); ev._pad = true; el.dispatchEvent(ev);
  if (!real || !/iP(hone|ad|od)/.test(navigator.userAgent)) padHaptic(); // su iPhone il clic aptico lo dà già l'interruttore toccato
}
// tocco aptico a ogni tasto, come la tastiera dell'iPhone (19/11/2026): su iPhone le app web non vibrano, ma un interruttore
// nativo nascosto (iOS 18+) dà il piccolo "clic"; altrove vibrazione breve
let HAP = null, HAPLOCK = false;
// se il clic sull'interruttore sposta il cursore (in alcuni browser), quel giro di blur/focus non deve far scattare nulla
// (passaggio automatico, "change", selezione): lo fermiamo qui, prima di tutti gli altri ascoltatori
["focus", "blur", "focusin", "focusout"].forEach(t => window.addEventListener(t, e => { if (HAPLOCK) e.stopImmediatePropagation(); }, true));
function padHaptic() {
  try {
    if (navigator.vibrate && !/iP(hone|ad|od)/.test(navigator.userAgent)) { navigator.vibrate(6); return; }
    HAP = document.createElement("label"); const i = document.createElement("input"); i.type = "checkbox"; i.setAttribute("switch", ""); i.tabIndex = -1; HAP.appendChild(i); HAP.setAttribute("aria-hidden", "true"); HAP.style.display = "none"; document.head.appendChild(HAP);
    const a = document.activeElement; HAPLOCK = true; HAP.click(); HAP.remove(); if (a && document.activeElement !== a) a.focus({ preventScroll: true });
  } catch (e) {} finally { HAPLOCK = false; }
}
(function buildPad() {
  const p = $("pad"); if (!p) return;
  const lab = { del: `<svg viewBox="0 0 24 24"><path d="M9 6h11v12H9l-6-6z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/></svg>`, hide: `<svg viewBox="0 0 24 24"><path d="M6 10l6 6 6-6"/></svg>`, next: "→", minus: "−", plus: "+" };
  // Ogni tasto è un'etichetta con dentro un interruttore nativo invisibile grande quanto il tasto (19/11/2026): il dito tocca
  // davvero l'interruttore e l'iPhone dà il suo clic aptico (il clic "simulato" da codice su iPhone non bastava)
  p.innerHTML = PADK.map(k => `<label class="pk k-${k === "," ? "comma" : k}" data-p="${k}" role="button" aria-label="${{ del: "Cancella", hide: "Chiudi il tastierino", next: "Avanti", minus: "Meno", plus: "Più", ",": "Virgola" }[k] || k}"><span class="pkl">${lab[k] || k}</span><input type="checkbox" switch class="hsw" tabindex="-1" aria-hidden="true"></label>`).join("");
  // Tasti sul "click" (19/11/2026): il tocco aptico dell'iPhone (interruttore nativo) scatta solo dentro un click vero;
  // prima rispondevano al touchend con preventDefault e il clic aptico non arrivava. Il campo resta attivo grazie al
  // preventDefault sul mousedown (su iPhone arriva subito prima del click); se il cursore si perde lo rimettiamo.
  const fire = b => { b.classList.add("on"); setTimeout(() => b.classList.remove("on"), 110);
    if (!isPadField(document.activeElement) && S.padEl && document.contains(S.padEl)) { HAPLOCK = true; try { S.padEl.focus({ preventScroll: true }); } finally { HAPLOCK = false; } }
    padKey(b.dataset.p, true); padLabels(); const sw = b.querySelector("input"); if (sw) sw.checked = false; };
  p.addEventListener("touchstart", () => {}, { passive: true }); // abilita lo stato :active dei tasti su iPhone
  p.addEventListener("mousedown", e => e.preventDefault());
  p.addEventListener("pointerdown", e => { if (e.pointerType !== "touch") e.preventDefault(); });
  // il clic sull'interruttore arriva una volta sola (sull'input); quello sull'etichetta, se arriva, lo ignoriamo
  p.addEventListener("click", e => { const b = e.target.closest("[data-p]"); if (!b) return; if (e.target.tagName !== "INPUT") { const i = b.querySelector("input"); if (i) return; } fire(b); });
})();
function padShow(on) {
  const p = $("pad"); if (!p) return; p.hidden = !on; document.body.classList.toggle("padon", on);
  if (on) { padLabels(); document.documentElement.style.setProperty("--padh", p.offsetHeight + "px"); }
  placeTimer();
}
document.addEventListener("focusin", e => {
  if (!isPadField(e.target)) return; const el = e.target; S.padEl = el; el._repl = !!el.value; padShow(true);
  // la riga che stai scrivendo resta visibile sopra tastierino e timer
  setTimeout(() => { const row = el.closest(".set"); if (!row || document.activeElement !== el) return; const r = row.getBoundingClientRect(), tm = $("timer"),
    lim = innerHeight - ($("pad").offsetHeight || 0) - (tm && !tm.hidden ? tm.offsetHeight : 0) - 14, top = ($("console") ? $("console").getBoundingClientRect().bottom : 0) + 10;
    if (r.bottom > lim) scrollBy({ top: r.bottom - lim, behavior: "smooth" }); else if (r.top < top) scrollBy({ top: r.top - top, behavior: "smooth" }); }, 60);
});
document.addEventListener("focusout", e => {
  const el = e.target;
  // i valori scritti col tastierino non generano il "change" del browser: lo mandiamo noi (fa partire il recupero, "Com'era?")
  if (el && el._padEd) { el._padEd = false; el.dispatchEvent(new Event("change", { bubbles: true })); }
  setTimeout(() => { if (!isPadField(document.activeElement)) padShow(false); }, 80);
});
// tocco fuori (non su un campo, il tastierino o la barra del timer): chiude il tastierino
document.addEventListener("pointerdown", e => {
  const el = document.activeElement; if (!isPadField(el)) return;
  if (e.target.closest("#pad, #timer, .set input, #isheet, .feel")) return; el.blur();
}, true);
// Tastiera aperta (qualsiasi campo di testo): via il menu in basso, timer compatto appena sopra la tastiera.
const isField = el => el && el.matches && el.matches("input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=date]), textarea");
document.addEventListener("focusin", e => { if (isField(e.target)) { document.body.classList.add("kb"); placeTimer(); setTimeout(placeTimer, 350); } });
document.addEventListener("focusout", () => setTimeout(() => { if (!isField(document.activeElement)) { document.body.classList.remove("kb"); placeTimer(); } }, 80));
// Su iPhone la tastiera copre il fondo dello schermo (i "fixed" in basso finiscono dietro): con la tastiera aperta il timer
// si aggancia al bordo alto dell'area visibile sopra la tastiera (visualViewport) e si riposiziona a ogni scorrimento.
function placeTimer() {
  const tm = $("timer"), vv = window.visualViewport; if (!tm) return;
  if (document.body.classList.contains("padon")) { tm.style.top = ""; tm.style.bottom = ($("pad").offsetHeight || 0) + "px"; return; }
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
  if (isPadField(el)) el.classList.add("repl"); // tastierino: numero selezionato (evidenziato), il primo tasto lo sostituisce e ⌫ lo cancella tutto
  setTimeout(() => { if (document.activeElement === el) try { el.setSelectionRange(0, el.value.length); } catch (x) { el.select(); } }, 30);
});
document.addEventListener("focusout", e => { const el = e.target; if (el.matches && el.matches(".set input")) { clearTimeout(el._t); el._fix = false; el.classList.remove("repl"); } });
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
