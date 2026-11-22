/* Palestra — Confronto tra le serie, gratificazioni, report per il PT, Solo per oggi (sostituisci/occupato/fastidio/salta), database macchinari, scheda del sostituto, Com'era?, recupero reale, durata.
   Parte di app.js diviso il 22/11/2026: i file js/01…09 si caricano in ordine (index.html) e condividono le stesse funzioni globali. */
"use strict";
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
  { const bs = bodySummary(bodyList().filter(b => !p.from || b.date >= p.from)); // corpo nel periodo della scheda
    if (bs.length) L.push("", "Corpo", ...bs.map(x => `• ${x.n}: ${fmt(Math.round(x.a * 10) / 10)} → ${fmt(Math.round(x.b * 10) / 10)} ${x.u}${x.k === "w" ? " (medie di 2 settimane)" : ""}`)); }
  if (extra.length) L.push("", "Note", ...extra.map(x => "• " + x));
  L.push("", "Legenda: kg×reps della serie migliore pulita, prima → ultima seduta; % = forza stimata. ⏸ = nessun miglioramento nelle ultime 3 sedute.");
  if (typeof foodReport === "function") L.push(...foodReport(p.from || (all[0] || {}).date || todayISO())); // sezione Cibo (20/11/2026)
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
  if (a === "subx") { S.subEdit = null; S.subPic = null; return renderLog(); }
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
// ---------- database macchinari: ricerca mentre scrivi in "Sostituisci" (18/11/2026) ----------
// Ogni parola scritta deve trovarsi in marca/linea/modello o essere una parola italiana del movimento (petto, dorso…).
// Prima le macchine che sostituiscono davvero l'esercizio (stessa categoria), poi le altre. Nome salvato = "Marca Linea Modello".
const dbNorm = t => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9+]+/g, " ").trim();
const DB_IT = { petto: ["cp", "ip", "fly", "dp", "multi"], panca: ["cp", "ip", "dp"], inclinata: ["ip"], inclinato: ["ip"], declinata: ["dp"], croci: ["fly"], pectoral: ["fly"], spalle: ["sp", "lat", "rd"], lento: ["sp"], laterali: ["lat"], alzate: ["lat"], posteriori: ["rd"], dorso: ["pd", "row", "hrow", "tbar", "po"], schiena: ["pd", "row", "hrow", "tbar", "lb"], trazioni: ["pd"], rematore: ["row", "tbar", "hrow"], bicipiti: ["bic"], curl: ["bic", "lc", "lcs", "lck"], tricipiti: ["tri", "dip"], braccia: ["bic", "tri", "arm"], addominali: ["abs", "rot"], obliqui: ["rot"], lombari: ["lb"], gambe: ["lp", "hack", "sq", "le", "lc", "lcs", "lck", "lunge"], quadricipiti: ["le", "lp", "hack", "sq"], squat: ["hack", "sq", "belt", "smith"], pressa: ["lp"], affondi: ["lunge"], femorali: ["lc", "lcs", "lck", "ham"], glutei: ["glute", "abd", "ham"], polpacci: ["calf", "calfs"], cavi: ["cable"], cavo: ["cable"], multipower: ["smith"], trapezio: ["shrug"] };
function dbSearch(q, exKey) {
  const DB = window.MACCHINE_DB; if (!DB) return []; const toks = dbNorm(q).split(" ").filter(t => t.length > 1 || /\d/.test(t)); if (!toks.length) return [];
  const out = [];
  for (const m of DB.list) { const hay = " " + dbNorm(`${m.b} ${m.l} ${m.n}`) + " ", cat = DB.CAT[m.c];
    let ok = true, sc = 0;
    for (const t of toks) { if (hay.includes(" " + t + " ")) sc += 4; else if (hay.includes(" " + t)) sc += 3; else if (hay.includes(t)) sc += 1; else if ((DB_IT[t] || []).includes(m.c)) sc += 2; else { ok = false; break; } }
    if (!ok) continue; if (cat.k.includes(exKey)) sc += 5; if (m.b === "Panatta") sc += 1; else if (m.b === "Technogym") sc += 0.5; out.push({ m, sc }); } // le palestre dell'utente sono Panatta
  return out.sort((a, b) => b.sc - a.sc || a.m.b.localeCompare(b.m.b)).slice(0, 14).map(x => x.m);
}
// Sostituti già usati in questa palestra (22/11/2026, richiesta dell'utente: "mettimi per primi quelli che ho già aggiunto"):
// per questo esercizio, dal più recente; poi quelli usati per altri esercizi con lo stesso movimento.
function usedSubs(ex) {
  const last = new Map(); gymSessions(S.gym).forEach(x => { const n = subOf(x, ex.key); if (n && (!last.has(n) || x.date > last.get(n))) last.set(n, x.date); });
  return [...last.entries()].sort((a, b) => a[1] < b[1] ? 1 : -1).map(e => e[0]);
}
function usedSubsOther(ex, mine) {
  const c0 = subCat(ex.name, ex.key), seen = new Set(mine.map(dbNorm)), out = [];
  gymSessions(S.gym).slice().reverse().forEach(x => Object.entries(x.sub || {}).forEach(([k, n]) => { if (!n || k === ex.key || seen.has(dbNorm(n))) return;
    const d = dbFind(n), c = d ? d.c : subCat(n, k); if (c && c0 && (c === c0 || (window.MACCHINE_DB.CAT[c].k || []).includes(ex.key))) { seen.add(dbNorm(n)); out.push(n); } }));
  return out.slice(0, 8);
}
function usedWhen(key, n) { const ss = gymSessions(S.gym).filter(x => subOf(x, key) && sameSub(subOf(x, key), n)); if (!ss.length) return ""; const d = ss.map(x => x.date).sort().pop();
  return `${ss.length} ${ss.length === 1 ? "volta" : "volte"} · ultima ${new Date(d + "T12:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" })}`; }
const dbName = m => `${m.b} ${m.l} ${m.n}`;
const dbFind = n => { const DB = window.MACCHINE_DB, k = dbNorm(n); return DB ? DB.list.find(m => dbNorm(dbName(m)) === k) || null : null; };
// ---------- scheda completa del sostituto (18/11/2026, richiesta dell'utente) ----------
// Tipo di movimento: dal database (nome esatto), poi dalla ricerca sul nome scritto, altrimenti il movimento dell'esercizio sostituito.
function subCat(name, exKey) {
  const DB = window.MACCHINE_DB; if (!DB || !name) return null; const m = dbFind(name); if (m) return m.c;
  const r = dbSearch(name, exKey); if (r.length) return r[0].c;
  const c = Object.keys(DB.CAT).find(k => DB.CAT[k].k.includes(exKey)); return c || null;
}
// Esercizio "come lo vedi oggi": col sostituto prende nome, muscoli, consigli, esecuzione, errori e foto del suo tipo di macchina
// (macchine-schede.js) + la tua foto; serie, schema e recupero restano quelli del PT.
function subEx(ex, name) {
  if (!name || !ex) return ex;
  const c = subCat(name, ex.key), T = c && (window.MACCHINE_SCHEDE || {})[c];
  const img = T ? (T.imgs || (T.img ? [T.img + "-f1.webp", T.img + "-f2.webp"] : [])) : [];
  return { ...ex, name, flash: T ? T.f : [], cues: T ? T.c : [], errors: T ? T.e : [], m: T ? { p: T.p, s: T.s } : ex.m, ml: T ? T.ml : ex.ml,
    img: { local: img }, imgNote: T && T.note || "", ref: null, _sub: name, _cat: c, _pic: machinePic(name) || "" };
}
const exView = (ex, s = current()) => subEx(ex, s && ex ? subOf(s, ex.key) : "");
// miniatura: la tua foto della macchina, altrimenti la prima foto del movimento
const thumbOf = (ex, s) => { const v = exView(ex, s); if (v._pic) return v._pic; const f = execFrames(v)[0]; return f ? f.src : ""; };
const imgQ = q => `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`;
// ricerca precisa: marca + linea + nome del modello tra virgolette (frase esatta), così escono le foto di quel modello e non di macchine simili (18/11/2026)
const mQ = m => imgQ(`${m.b} ${m.l} "${m.n}"`);
function todayBanners(s, ex, painRef, rs) {
  const out = [];
  { const used = usedSubs(ex).filter(n => gymSessions(S.gym).some(x => x.id !== s.id && subOf(x, ex.key) && sameSub(subOf(x, ex.key), n))); // dalla più recente
    const started = exSets(s, ex.key).some(r => r && (r.kg != null || r.reps != null));
    if (used.length && !subOf(s, ex.key) && !started && !((s.machOk || {})[ex.key]) && S.subEdit !== ex.key && !isSkip(s, ex.key))
      out.push(`<div class="xb ask col"><p class="askq">🏋️ Che macchina usi oggi?</p><div class="alts">
        <div class="alt"><button type="button" class="altn" data-mach="orig"><b>${esc(ex.name)}</b><small>quella della scheda</small></button></div>
        ${used.map(n => `<div class="alt"><button type="button" class="altn" data-alt="${esc(n)}">${machinePic(n) ? `<img src="${machinePic(n)}" alt="">` : ""}<b>${esc(n)}</b></button></div>`).join("")}
        <div class="alt"><button type="button" class="altn" data-mach="other"><b>Un'altra…</b><small>scrivi il nome o fai una foto</small></button></div></div></div>`); }
  if (S.subEdit === ex.key && !subOf(s, ex.key)) {
    const used = usedSubs(ex), usedOther = usedSubsOther(ex, used);
    const cat = ((window.MACCHINE || {})[ex.key] || []).filter(m => !m.gym || m.gym.includes(S.gym) ).filter(m => !used.some(u => sameSub(u, m.n)));
    const pp = S.subPic && S.subPic.key === ex.key ? S.subPic.url : "";
    out.push(`<div class="xb sub col"><div class="subrow"><label class="subin">↔ <input autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${pp ? "Marca e nome sulla targhetta" : "Marca e nome (es. panatta inclined)"}"></label><label class="subcam${pp ? " on" : ""}" aria-label="Scatta una foto alla macchina">${pp ? `<img src="${pp}" alt="">` : `<svg viewBox="0 0 24 24"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.6"/></svg>`}<input type="file" accept="image/*" capture="environment" hidden data-subpic></label></div>
      ${pp ? `<p class="subhint">📷 Foto pronta: scrivi marca e nome che leggi sulla targhetta (o scegli sotto) e la salvo con la macchina.</p>` : ""}
      ${used.length ? `<div class="alts used"><span class="altk">⭐ Già usate per questo esercizio</span>${used.map(n => `<div class="alt" data-un="${esc(dbNorm(n))}"><button type="button" class="altn" data-alt="${esc(n)}">${machinePic(n) ? `<img src="${machinePic(n)}" alt="">` : ""}<b>${esc(n)}</b><small>${esc(usedWhen(ex.key, n))}</small></button></div>`).join("")}</div>` : ""}
      ${usedOther.length ? `<div class="alts used"><span class="altk">Già usate qui per altri esercizi (stesso movimento)</span>${usedOther.map(n => `<div class="alt" data-un="${esc(dbNorm(n))}"><button type="button" class="altn" data-alt="${esc(n)}">${machinePic(n) ? `<img src="${machinePic(n)}" alt="">` : ""}<b>${esc(n)}</b></button></div>`).join("")}</div>` : ""}
      <div class="dbres" hidden></div>
      ${cat.length ? `<div class="alts"><span class="altk">Macchine che allenano gli stessi muscoli</span>${cat.map(m => `<div class="alt"><button type="button" class="altn" data-alt="${esc(m.n)}"><b>${esc(m.n)}</b><small>${esc(m.d)}</small></button><a class="altq" href="https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`Panatta "${m.n}"`)}" target="_blank" rel="noopener">Com'è fatta ↗</a></div>`).join("")}</div>` : ""}
      <button class="chip" data-undo="subx">Annulla</button></div>`);
  }
  if (subOf(s, ex.key)) { const pic = machinePic(subOf(s, ex.key));
    const dm = dbFind(subOf(s, ex.key)), dmc = dm && window.MACCHINE_DB.CAT[dm.c];
    out.push(`<div class="xb sub"><p>↔ Oggi fai <b>${esc(subOf(s, ex.key))}</b>${dmc ? ` <span class="subml">· ${esc(dmc.ml)}</span>` : ""}: ha il suo storico, quello di ${esc(ex.name)} non cambia.${dm ? ` <a class="altq" href="${mQ(dm)}" target="_blank" rel="noopener">Foto vere ↗</a>` : ""}</p><div class="xbb"><label class="chip pic">📷 ${pic ? "Cambia foto" : "Foto macchina"}<input type="file" accept="image/*" capture="environment" hidden data-pic></label><button class="chip" data-undo="sub">Torna all'originale</button></div></div>`); }
  if (hasPain(s, ex.key)) out.push(`<div class="xb pain"><p>⚠ Fastidio segnato: la prossima volta il carico resta fermo. Se continua, dillo al PT.</p><button class="chip" data-undo="pain">Togli</button></div>`);
  else if (painRef) out.push(`<div class="xb pain"><p>⚠ Fastidio l'ultima volta (${fmtDate(rs.date).slice(0, 5)}): carico fermo. Se oggi va bene, non segnare niente e la prossima volta si riparte.</p></div>`);
  if (isLater(s, ex.key) && !exSets(s, ex.key).some(r => r && r.reps != null)) out.push(`<div class="xb"><p>⏳ Macchina occupata: lo fai dopo gli altri. Quando lo inizi, l'app tiene conto dei muscoli già stanchi.</p><button class="chip" data-undo="later">Annulla</button></div>`);
  if (isSkip(s, ex.key)) out.push(`<div class="xb skip"><p>⤼ Saltato oggi: non conta come serie dimenticate.</p><button class="chip" data-undo="skip">Annulla</button></div>`);
  return out.join("");
}
// Prescrizione del PT, sempre in evidenza sotto il nome: "3 × 10 reps" o "3 serie: 10 · 8 · 8 reps" + recupero
function rxLine(ex) {
  const ts = ex.sets.map(st => st.t + (st.type === "ced" ? " RP" : st.type === "strip" ? " strip" : "")), same = ts.every(t => t === ts[0]);
  // recupero sempre visibile: quello dell'esercizio o il predefinito 1:30 (richiesta dell'utente del 18/11/2026)
  return `<div class="rx"><b>${same ? `${ts.length} × ${esc(ts[0])}` : `${ts.length} serie: ${ts.map(esc).join(" · ")}`}</b><span>recupero ${fmtSec(restFor(ex))}</span></div>`;
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
// 22/11/2026 (richiesta dell'utente): 5" per posizionarsi prima della serie e 5" per levarsi dall'esercizio dopo,
// tolti dal recupero misurato, così non risultano come recupero in più
const SETUP_SEC = 10;
const restGap = (a, b, ex, i) => a && b && a.at && b.at && b.at > a.at ? Math.max(0, Math.round((b.at - a.at) / 1000) - setSec(ex, i, b) - SETUP_SEC) : null;
const isLong = (sec, plan, buddy) => sec != null && sec > plan * (buddy ? 2 : 1.5) && sec > plan + 30;
const lrOn = r => !!(r && r.lr && !r.lrOk);
// ---------- durata dell'allenamento: dal primo inserimento all'ultimo (sessione.t0 / t1), tasti Inizia / Fine (tEnd) ----------
function stampTime(s) { if (s.date !== todayISO()) return; const n = Date.now(); if (!s.t0) s.t0 = n; s.t1 = n; }
const fmtDur = ms => { const m = Math.max(1, Math.round(ms / 60000)); return m < 60 ? `${m} min` : `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} min`; };
// in corso solo se oggi, non chiusa a mano, ultimo inserimento < 45' fa e non ancora finita (18/11/2026: a scheda completata il tempo si ferma all'ultima serie)
const sessDone = s => { const p = SCHEDE.find(x => x.id === s.plan), d = p && p.days.find(x => x.id === s.day); if (!d) return false; const u = dayUnitsList(d, s); return u.length > 0 && u.every(x => x.done); };
const live = s => s.t0 && !s.tEnd && s.date === todayISO() && Date.now() - (s.t1 || s.t0) < 45 * 60000 && !sessDone(s);
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
