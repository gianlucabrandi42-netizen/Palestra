/* Palestra — sezione CIBO (20/11/2026). Contenuti in nutrizione.js (window.CIBO).
   Gioco leggero: tocchi la casella di cosa hai mangiato, il piatto del giorno si colora. Niente grammi da scrivere,
   niente punteggi, niente rosso, niente serie di giorni (regole anti-ossessione dell'utente).
   Dati: D.food = { days: { "AAAA-MM-GG": { m: { col: "B", s1: "skip", pr: "pollo", ... }, gym: true|false, x: [cibi extra], cel, at } },
                    pics: { idRicetta: JPEG }, shop: { voce: 1 }, week: { lunedì: { fame, energia, sonno } } } — nel backup.
   Disegni: tutti generati qui (originali); le foto vere sono solo quelle scattate dall'utente. */
"use strict";
const CB = window.CIBO;
const FOOD = () => (D.food = D.food || { days: {}, pics: {}, shop: {}, week: {} }, D.food.days = D.food.days || {}, D.food.pics = D.food.pics || {}, D.food.shop = D.food.shop || {}, D.food.week = D.food.week || {}, D.food);
const CS = { tab: "oggi", day: null, rf: "easy", q: "", xform: null, recipe: null };
const foodPic = id => picOf("food:" + id, FOOD().pics[id]);
const recipeById = id => CB.recipes.find(r => r.id === id);
const mainRecipes = () => CB.recipes.filter(r => r.main);
const mealDef = id => CB.meals.find(m => m.id === id);
const cDay = () => CS.day || todayISO();
const fDay = d => FOOD().days[d] || { m: {} };
function setFDay(d, fn) { const f = FOOD(); const x = JSON.parse(JSON.stringify(f.days[d] || { m: {} })); x.m = x.m || {}; fn(x); x.at = Date.now(); f.days[d] = x; save(); }
const gymAuto = d => Object.values(D.sessions).some(s => s.date === d && hasData(s));
// 20/11/2026: le sedute registrate vincono sempre (anche su un "No" detto la mattina); prima della seduta conta la risposta a "Oggi ti alleni?"
const isGym = d => gymAuto(d) || fDay(d).gym === true;
// scala 80/40/0 del PT adattata: palestra oggi = 80, palestra ieri = 40, altrimenti 0
// 22/11/2026: aggiustamento del piano deciso col Punto della settimana (revisione.js), salvato con la data da cui vale (FOOD().adj),
// così i giorni passati restano coi conti di allora. k = −1 anche il giorno dopo la palestra a 0 · 0 piano normale 80/40/0 ·
// 1 il pranzo da 0 diventa da 40 · 2 anche quello da 40 diventa da 80 (regole del NUTRIZIONE_PIANO, sezione 9)
const adjAt = d => { let k = 0; for (const a of FOOD().adj || []) if (a.from <= d) k = a.k; return k; };
const lunchLvl = d => { if (isGym(d)) return 80; const after = isGym(addDays(d, -1)), k = adjAt(d);
  return k <= -1 ? 0 : k === 1 ? 40 : k >= 2 ? (after ? 80 : 40) : after ? 40 : 0; };
// obiettivo del giorno: palestra / pranzo da 80 senza palestra (piano aggiustato) / da 40 / da 0
const dayTarget = d => isGym(d) ? CB.target.gym : lunchLvl(d) === 80 ? CB.target.rest.map((v, i) => v + [133, 2, 32, 0][i]) : CB.target[lunchLvl(d) === 40 ? "rest" : "rest0"];
// ---------- 📏 IL PASTO DEL PT (24/11/2026) ----------
// Richiesta dell'utente: "per ogni pasto ben scritte le calorie e tutto quello che mi serve in rapporto a quello che ha scritto il PT".
// CB.pt (nutrizione.js) = il pasto del PT per ogni pasto e tipo di giorno; qui il confronto: tabellina nel pasto di Oggi, riquadro
// "Rispetto al piano del PT" nelle idee e nelle ricette (si aggiorna mentre cambi le quantità), pallino di colore sulle caselle.
const ptKey = (mid, d) => mid === "pr" ? "pr" + lunchLvl(d) : mid === "s2" ? (isGym(d) ? "s2g" : "s2r") : mid;
function ptRef(k) {
  const p = CB.pt && CB.pt[k]; if (!p) return null; if (p._r) return p;
  const c = p.c, w = (x, f, m) => [Math.max(0, Math.round(x - Math.max(m, x * f))), Math.round(x + Math.max(m, x * f))];
  p._r = { k: [Math.round(c[0] * .9), Math.round(c[0] * 1.1)], p: [Math.round(c[1] * .85), Math.round(c[1] * 1.3)], c: w(c[2], .2, 8), g: w(c[3], 0, 5), ...(p.r || {}) };
  return p;
}
const PTN = [["k", "Calorie", "kcal", "kcal"], ["p", "Proteine", "g", "prot."], ["c", "Carboidrati", "g", "carbo"], ["g", "Grassi", "g", "grassi"]];
// stato di ogni valore: ok in linea · hi sopra · hi2 molto sopra · lo sotto · up proteine in più (va bene)
function ptCmp(v, k) {
  const p = ptRef(k); if (!p || !v) return null;
  return PTN.map(([n, l, u, s], i) => { const [lo, hi] = p._r[n], x = Math.round(v[i] || 0), far = n === "k" ? Math.max(100, p.c[0] * .25) : Math.max(6, p.c[i] * .3);
    const st = x > hi ? (n === "p" ? "up" : x > hi + far ? "hi2" : "hi") : x < lo ? "lo" : "ok"; return { n, l, u, s, x, lo, hi, c: p.c[i], st }; });
}
const ptBad = C => C && C.some(r => r.st === "hi" || r.st === "hi2" || (r.st === "lo" && (r.n === "p" || r.n === "k")));
const ptTone = C => !C ? "" : C.some(r => r.st === "hi2") ? "hi2" : C.some(r => r.st === "hi" && (r.n === "k" || r.n === "g" || r.n === "c")) ? "hi" : C.some(r => r.st === "lo" && (r.n === "k" || r.n === "p")) ? "lo" : "ok";
const sgn = n => (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(Math.round(n));
// in parole, coi gesti di cucina: 10 g di grassi ≈ 1 cucchiaio d'olio, 8 g di carboidrati ≈ 10 g di riso crudo
function ptVerdict(C, k) {
  if (!C) return ""; const by = Object.fromEntries(C.map(r => [r.n, r])), out = [];
  const K = by.k, G = by.g, Cc = by.c, P = by.p;
  if (K.st === "hi" || K.st === "hi2") out.push(`${sgn(K.x - K.c)} kcal rispetto al PT`);
  if (G.st === "hi" || G.st === "hi2") { const d = G.x - G.c; out.push(`grassi ${sgn(d)} g (≈ ${d >= 14 ? Math.round(d / 10) + " cucchiai" : d >= 7 ? "1 cucchiaio" : "mezzo cucchiaio"} d'olio in più)`); }
  if (Cc.st === "hi" || Cc.st === "hi2") { const d = Cc.x - Cc.c; out.push(`carboidrati ${sgn(d)} g (≈ ${Math.round(d * 1.27 / 5) * 5} g di riso crudo in più)`); }
  if (P.st === "lo") out.push(`proteine ${sgn(P.x - P.c)} g: aggiungi una fonte proteica (es. 30 g di bresaola o 1 uovo)`);
  if (K.st === "lo") out.push(`${sgn(K.x - K.c)} kcal: più leggero del PT${k === "s1" || k === "s2r" || k === "dc" ? ", va bene" : ", aggiungi un po' di carboidrato o non saltare lo spuntino"}`);
  if (Cc.st === "lo" && K.st !== "lo" && !/pr0/.test(k)) out.push(`carboidrati ${sgn(Cc.x - Cc.c)} g sotto il PT`);
  if (G.st === "lo" && K.st !== "lo") out.push(`grassi ${sgn(G.x - G.c)} g: un filo d'olio in più non guasta`);
  return out.length ? out.join(" · ") : "In linea col pasto del PT ✓";
}
// riquadro completo (idee, ricette, quanto ne hai mangiato, simulatore)
function ptBox(v, mid, d, kk) {
  const k = kk || ptKey(mid, d), p = ptRef(k), C = ptCmp(v, k); if (!C) return "";
  const tone = ptTone(C), row = r => { const span = Math.max(r.hi * 1.35, r.x * 1.05, 1), L = r.lo / span * 100, W = (r.hi - r.lo) / span * 100, X = Math.min(100, r.x / span * 100);
    return `<div class="ptr ${r.st}"><span>${r.l}</span><b>${fmt(r.x)}<small>${r.u}</small></b><em>PT ${fmt(r.c)}${r.x !== r.c ? ` · <i>${sgn(r.x - r.c)}</i>` : ""}</em><div class="ptbar"><s style="left:${L}%;width:${W}%"></s><u style="left:${X}%"></u></div></div>`; };
  return `<div class="ptbox ${tone}"><div class="pth"><b>📏 Rispetto al piano del PT</b><small>${esc(p.t)}</small></div>
    <p class="ptsrc"><b>Il PT:</b> ${esc(p.src)}</p>${C.map(row).join("")}
    <p class="ptv">${esc(ptVerdict(C, k))}</p><p class="ptleg"><s></s> fascia in linea (±10% sulle kcal) · <u></u> questo pasto</p></div>`;
}
// 🍱 i due pasti di una ricetta da 2 (24/11/2026): grammi di ognuno e confronto col pasto del PT, pranzo del giorno e cena
function twoMeals(r, d) {
  const box = (mid, lab, sub) => { const L = baseQ(mid, r.id, d); if (!L) return ""; const v = valOfQ(L), k = ptKey(mid, d), C = ptCmp(v, k), tone = ptTone(C);
    const it = L.filter(([f, q]) => q && !["sale", "erbe"].includes(f)).map(([f, q]) => esc(qText(f, q)));
    return `<div class="twom ${tone}"><div class="twh"><b>${lab}</b><i>${tone === "ok" ? "✓ in linea col PT" : tone === "lo" ? "un po' sotto il PT" : "sopra il PT"}</i></div>
      ${sub ? `<p class="twsub">${esc(sub)}</p>` : ""}<p class="twi">${it.join(" · ")}</p><p class="twv">${C.map(x => `<span class="${x.st}">${x.n === "k" ? fmt(x.x) + " kcal" : x.s + " " + x.x + " g"}</span>`).join("")}</p>
      ${tone !== "ok" ? `<p class="twn">${esc(ptVerdict(C, k))}</p>` : `<p class="twn">PT: ${fmt(ptRef(k).c[0])} kcal · P ${ptRef(k).c[1]} · C ${ptRef(k).c[2]} · G ${ptRef(k).c[3]}</p>`}</div>`; };
  const lv = lunchLvl(d);
  return `<div class="twobox"><h3>🍱 Pranzo e cena con una cottura</h3><p class="note">Le dosi di un pasto: cucini tutto insieme e dividi. Il carboidrato cambia col giorno (oggi pranzo da ${lv}).</p>
    ${box("pr", `Pranzo · da ${lv}`, r.p1)}${box("ce", "Cena", r.p2)}</div>`;
}
// ---------- 🍳 COSA CUCINO OGGI · 🎨 SAPORE DI OGGI · 😮‍💨 SONO STANCO (24/11/2026) ----------
// L'utente odia cucinare, si annoia e quando è stanco mangia a caso, ma vuole seguire il piano. Regola decisa con lui:
// riposo / pomeriggio (e notte) = UNA cucinata per pranzo e cena (ricette 🍱 batch); turno di mattina = a pranzo la mensa e la sera
// una cena veloce (⚡ quick: max 15 minuti, verdure pronte). Niente decisioni: l'app propone UNA ricetta (la meno usata nelle ultime
// 4 settimane, a rotazione), "Un'altra" se non va. La varietà la dà il sapore di oggi (CB.sapori), non ricette nuove.
// "Sono stanco": 3 pasti del piano dal più rapido (avanzo della cucinata, piatto freddo zero cottura, cene da 10 minuti), con un tocco.
const dayNum = d => Math.floor(new Date(d + "T12:00") / 864e5);
const rot = (n, len) => ((n % len) + len) % len;
function pickRot(list, d, mid, off) { // la meno usata nelle ultime 4 settimane; a parità, una diversa ogni giorno; off = "Un'altra"
  const used = useCounts(mid, d), hs = id => [...(id + dayNum(d))].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7);
  const L = list.slice().sort((a, b) => (used[a.id] || 0) - (used[b.id] || 0) || hs(a.id) - hs(b.id));
  return L.length ? L[rot(off || 0, L.length)] : null; }
const sapOf = d => CB.sapori[rot(dayNum(d) + (CS.sapOff || 0), CB.sapori.length)];
const ptOk = (r, mid, d) => { const L = baseQ(mid, r.id, d); if (!L) return null; return ptTone(ptCmp(valOfQ(L), ptKey(mid, d))); };
function todayPlan(d, compact) {
  if (!CB.sapori || d < todayISO()) return "";
  if (compact && !shiftOf(d)) return "";
  const day = fDay(d), m = day.m || {}, sh = (shiftOf(d) || {}).id, sap = sapOf(d), isB = id => (recipeById(id) || {}).batch;
  const sapRow = `<div class="tpsap"><span>🎨</span><div><small>Sapore di ${d === todayISO() ? "oggi" : "domani"}</small><b>${esc(sap.n)}</b><p>${esc(sap.how)}</p><em>su ${esc(sap.su)} · ~${sap.k} kcal</em></div><button class="lnk sm" data-tp="sap"><i>🎲</i>Un altro</button></div>`;
  const tired = `<button class="tptired" data-tp="tired"><span>😮‍💨</span><div><b>Sono stanco</b><small>3 pasti del piano, il più veloce in 4 minuti</small></div><i>›</i></button>`;
  // 🥫 25/11/2026: propone solo quello che puoi fare con quello che hai (o adattato); se non sa cosa hai, te lo chiede
  const H = haveNow(), choose = (prim, sec, mid, off) => { if (!H.known) return { r: pickRot(prim, d, mid, off) };
    const okP = prim.filter(r => canMake(r, H).ok); if (okP.length) return { r: pickRot(okP, d, mid, off) };
    const okS = (sec || []).filter(r => canMake(r, H).ok); if (okS.length) return { r: pickRot(okS, d, mid, off), alt: true };
    return { r: pickRot(prim, d, mid, off), none: true }; };
  const recBox = (r, mid, lab, sub) => { const t = ptOk(r, mid, d), t2 = r.batch ? ptOk(r, "ce", d) : null, ok = t === "ok" && (!t2 || t2 === "ok"), c = H.known ? canMake(r, H) : null;
    const hv = !c ? "" : c.ok ? (c.use ? `<em class="adk">🔄 con ${esc(qText(c.use.to, c.use.q))} che hai, al posto di ${esc(pname(c.use.from))}</em>` : `<em class="ok">🥫 hai tutto quello che serve</em>`)
      : `<em class="miss">Ti manca: ${esc(c.miss.map(pname).join(", "))}${c.frz ? ` · 🧊 hai ${esc(pname(c.frz))} nel congelatore: tiralo fuori stasera` : ""}</em>`;
    return `<div class="tprec"><button class="tpimg" data-tp="see" data-r="${r.id}" data-m="${mid}">${dishSVG(r.p, r.box, r.id, "dish")}</button><div class="tptx"><small>${lab}</small><b>${esc(r.name)}</b><p>${r.min} min · ${esc(r.tools)}${sub ? " · " + sub : ""}</p>${hv}${ok ? `<em class="ok">✓ in linea col PT${r.batch ? " a pranzo e a cena" : ""}</em>` : ""}</div></div>
      <div class="tpbtn"><button class="btn primary" data-tp="cook" data-r="${r.id}" data-m="${mid}">▶ Cucina passo passo</button><button class="lnk" data-tp="see" data-r="${r.id}" data-m="${mid}"><i>📖</i>Vedi</button><button class="lnk" data-tp="next" data-k="${r.batch ? "tpB" : "tpQ"}"><i>🔄</i>Un'altra</button></div>`; };
  let main = "";
  if (!sh) main = `<p class="tpask">Dimmi il turno qui sopra e ti dico cosa cucinare: una cucinata per pranzo e cena nei giorni di riposo o pomeriggio, una cena veloce dopo il turno di mattina.</p>`;
  else if (sh === "mat") {
    if (m.ce) main = `<p class="tpdone">✓ Cena segnata: stasera sei a posto.</p>`;
    else { const C = choose(CB.recipes.filter(x => x.quick), null, "ce", CS.tpQ), r = C.r; main = r ? recBox(r, "ce", "⚡ Stasera cena veloce · a pranzo c'è la mensa", "") + (C.none ? noneNote() : "") : ""; }
  } else if (isB(m.pr)) { const r = recipeById(m.pr);
    const a = adOf(d, r.id), pf = a ? a.to : (mainProt(r) || [])[0], fin = pf && pantry()[pf] ? `<button class="lnk sm" data-fin="${pf}"><i>🥫</i>Ho finito ${esc(pname(pf))}</button>` : "";
    main = `<p class="tpdone">✓ Oggi hai cucinato <b>${esc(r.s || r.name)}</b>.${m.ce ? " Pranzo e cena fatti 👌" : sh === "pom" ? " La seconda porzione è la cena da portare al lavoro: 2 minuti al microonde." : " La seconda porzione è la cena: scaldala 2 minuti."}</p><div class="tpbtn">${m.ce ? "" : `<button class="btn primary" data-tp="ce" data-r="${r.id}">✓ Segna la cena (${esc(r.s || "pasto 2")})</button>`}${fin}</div>`;
  } else { const C = choose(CB.recipes.filter(x => x.batch), CB.recipes.filter(x => x.quick), "pr", CS.tpB), r = C.r;
    main = r ? recBox(r, "pr", C.alt ? "⚡ Con quello che hai: un pranzo veloce (la cena la scegli dopo)" : "🍱 Oggi una cucinata: pranzo e cena", C.alt ? "" : sh === "pom" ? "la cena la porti al lavoro" : "") + (C.none ? noneNote() : "") : ""; }
  // cosa hai in frigo: se non lo so te lo chiedo; altrimenti un pulsante per aggiornarlo
  const pk = !H.known ? `<div class="tpask2"><p>🥫 <b>Cosa hai in frigo?</b> Dimmelo una volta e ti propongo solo ricette che puoi fare davvero.</p>${CS.pkOpen === false ? `<button class="lnk sm" data-pkopen><i>🥫</i>Dimmelo</button>` : pkBox(true)}</div>` : CS.pkOpen ? pkBox() : "";
  // vista semplice (24/11/2026): sapore e "Sono stanco" in due pulsanti piccoli; il sapore si apre al tocco
  if (compact) return `<div class="card tplan sm"><h3>🍳 Cosa cucino ${d === todayISO() ? "oggi" : "domani"}</h3>${main}
    ${pk}<div class="tpmini">${H.known ? `<button class="lnk${CS.pkOpen ? " on" : ""}" data-pkopen><i>🥫</i>Cosa ho</button>` : ""}<button class="lnk" data-tp="sapo"><i>🎨</i>${esc(sap.n)}</button><button class="lnk" data-tp="tired"><i>😮‍💨</i>Sono stanco</button></div>${CS.sapOpen ? sapRow : ""}</div>`;
  return `<div class="card tplan"><h3>🍳 Cosa cucino ${d === todayISO() ? "oggi" : "domani"}</h3>${main}${pk}${H.known ? `<button class="lnk sm" data-pkopen><i>🥫</i>${CS.pkOpen ? "Chiudi «cosa ho»" : "Cosa ho in frigo"}</button>` : ""}${sapRow}${tired}</div>`;
}
function openTired(d) {
  const sh = $("fsheet"); if (!sh) return; const h = new Date().getHours(), m = fDay(d).m || {};
  const mid = h < 15.5 && !m.pr ? "pr" : "ce", cards = [];
  if (mid === "ce" && m.pr && (recipeById(m.pr) || {}).batch) { const r = recipeById(m.pr); cards.push({ r, lab: "🍱 Ce l'hai già: la seconda porzione della cucinata", how: "Scaldala 2 minuti al microonde, coperta." }); }
  const H = haveNow(), Q0 = CB.recipes.filter(x => x.quick).sort((a, b) => a.min - b.min), Qok = H.known ? Q0.filter(r => canMake(r, H).ok) : Q0, Q = Qok.length ? Qok : Q0;
  for (const r of Q) { if (cards.length >= 3) break; if (cards.some(c => c.r.id === r.id)) continue; if (mid === "pr" && STRICT.has(r.id) && lunchLvl(d) === 0) continue;
    const cu = H.known && canMake(r, H).use; cards.push({ r, lab: r.cold ? "❄️ Zero cottura · " + r.min + " minuti" : "⚡ " + r.min + " minuti", how: cu ? `🔄 con ${qText(cu.to, cu.q)} che hai, al posto di ${pname(cu.from)}` : r.ingr.slice(0, 3).join(" · ") }); }
  sh.querySelector(".is-h").innerHTML = `<b>😮‍💨 Sono stanco</b><span class="rmeta">${mid === "pr" ? "pranzo" : "cena"} · resta nel piano, col minimo sforzo</span>`;
  sh.querySelector(".is-c").innerHTML = `<p class="note">Stanco non vuol dire pasto libero: questi sono pasti del piano del PT, fatti con ingredienti veri (niente piatti pronti), col minimo sforzo. Scegline uno e non pensarci più.</p>
    ${cards.map(({ r, lab, how }) => { const L = baseQ(mid, r.id, d), v = L && valOfQ(L), C = v && ptCmp(v, ptKey(mid, d));
      return `<div class="tired"><div class="tprec"><div class="tpimg">${dishSVG(r.p, r.box, r.id, "dish")}</div><div class="tptx"><small>${esc(lab)}</small><b>${esc(r.name)}</b><p>${esc(how)}</p>${v ? `<em class="${ptTone(C)}">${fmt(v[0])} kcal · P ${v[1]} · C ${v[2]} · G ${v[3]}${ptTone(C) === "ok" ? " · ✓ in linea col PT" : ""}</em>` : ""}</div></div>
        <div class="tpbtn"><button class="btn primary" data-tp="eat" data-r="${r.id}" data-m="${mid}">✓ L'ho mangiato</button>${r.steps.length > 1 ? `<button class="lnk" data-tp="cook" data-r="${r.id}" data-m="${mid}"><i>▶</i>Fallo con me</button>` : ""}</div></div>`; }).join("")}
    <p class="note">Per non restare mai senza: il <b>😮‍💨 Kit anti-stanchezza</b> in cima a Cibo → Spesa (ingredienti semplici da cucinare, non piatti pronti).</p>`;
  if (sh.hidden) showSheet(sh); else sh.querySelector(".is-c").scrollTop = 0;
}
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-tp]"); if (!b) return; const a = b.dataset.tp, d = cDay(), r = b.dataset.r, mid = b.dataset.m;
  if (r && ["cook", "see", "eat", "ce"].includes(a) && recipeById(r) && !adOf(d, r)) { const c = canMake(recipeById(r)); if (c.use) setAd(d, r, c.use); }
  if (a === "sap") { CS.sapOff = (CS.sapOff || 0) + 1; renderCibo(); }
  else if (a === "sapo") { CS.sapOpen = !CS.sapOpen; renderCibo(); }
  else if (a === "next") { CS[b.dataset.k] = (CS[b.dataset.k] || 0) + 1; renderCibo(); }
  else if (a === "cook") { closeRecipe(); cook(r, { mid, oid: r }); }
  else if (a === "see") openRecipe(r, { mid, oid: r });
  else if (a === "tired") openTired(d);
  else if (a === "ce") logMeal(d, "ce", r);
  else if (a === "eat") { closeRecipe(); logMeal(d, mid, r); }
});
// tabellina nel pasto di Oggi: PT e (se segnato) il tuo pasto
function ptStrip(mid, d, v) {
  const k = ptKey(mid, d), p = ptRef(k); if (!p) return ""; const C = v ? ptCmp(v, k) : null;
  const cell = (r, i) => `<b class="${r ? r.st : ""}">${fmt(r ? r.x : p.c[i])}</b>`;
  return `<div class="ptstrip${C ? " " + ptTone(C) : ""}"><span></span>${PTN.map(([, , , s]) => `<small>${s}</small>`).join("")}
    <em>PT</em>${p.c.map(x => `<i>${fmt(x)}</i>`).join("")}${C ? `<em>Tu</em>${C.map((r, i) => cell(r, i)).join("")}` : ""}</div>${C && ptTone(C) !== "ok" ? `<p class="ptsv">${esc(ptVerdict(C, k))}</p>` : ""}`;
}
// valori di una casella per il pallino (solo se calcolabili dalle quantità)
function tilePt(md, o, d) {
  if (o.free || ["skip", "x", "mensa", "sala", "rist"].includes(o.id)) return "";
  const L = !o.dish && baseQ(md.id, o.id, d); if (!L) return ""; const v = valOfQ(L), C = ptCmp(v, ptKey(md.id, d)); if (!C) return "";
  return `<i class="tk ${ptTone(C)}">${r10(v[0])} kcal</i>`;
}
const r10 = n => Math.round(n / 10) * 10;

// ---------- 🧪 SIMULA (24/11/2026) ----------
// "Simulazioni per ogni tipo di pasto e ricetta: a quanto arriverei di grassi, carboidrati…". Tipo di giorno (palestra / giorno dopo /
// riposo), una scelta per pasto, totali contro gli obiettivi; sotto, TUTTE le caselle e ricette di ogni pasto confrontate col pasto del PT.
// I conti usano 3 giorni finti (2099) creati solo in memoria e tolti subito: niente finisce nei tuoi dati.
const SIMD = { g: "2099-03-02", a: "2099-03-03", r: "2099-03-04" };
function simRun(fn) {
  const F = FOOD(), keep = {}; for (const x of ["2099-03-01", ...Object.values(SIMD)]) keep[x] = F.days[x];
  F.days["2099-03-01"] = { gym: false, m: {} }; F.days[SIMD.g] = { gym: true, m: {} }; F.days[SIMD.a] = { gym: false, m: {} }; F.days[SIMD.r] = { gym: false, m: {} };
  try { return fn(); } finally { for (const [x, v] of Object.entries(keep)) { if (v === undefined) delete F.days[x]; else F.days[x] = v; } }
}
const SIMT = [["g", "🏋️ Palestra"], ["a", "Giorno dopo"], ["r", "2° senza palestra"]];
const SIMDEF = { col: "A2", s1: "yog", pr: "pollo", s2g: "A2", s2r: "fio", ce: "pollo", dc: "" };
function simOpts(mid, d) {
  const md = mealDef(mid);
  return optsFor(md, d).filter(o => !o.free && !o.fr && !["skip", "x", "mensa", "sala", "rist", "libero"].includes(o.id)).map(o => {
    const L = baseQ(mid, o.id, d); if (!L) return null; const v = valOfQ(L), C = ptCmp(v, ptKey(mid, d));
    return { o, v, C, tone: ptTone(C), dist: C ? C.reduce((a, r) => a + Math.abs(r.x - r.c) / Math.max(r.c, r.n === "k" ? 100 : 8), 0) : 9 };
  }).filter(Boolean);
}
function simState() { CS.sim = CS.sim || { t: "g", pick: {} }; return CS.sim; }
function simPickOf(mid, t) { const s = simState(), k = mid === "s2" ? (t === "g" ? "s2g" : "s2r") : mid; return k in s.pick ? s.pick[k] : SIMDEF[k] || ""; }
function renderSimula(box) {
  const s = simState(), d = SIMD[s.t], meals = CB.meals.filter(m => !m.extra || m.id === "dc");
  const html = simRun(() => {
    const lv = lunchLvl(d), T = s.t === "g" ? CB.target.gym : lv === 80 ? CB.target.rest.map((v, i) => v + [133, 2, 32, 0][i]) : CB.target[lv === 40 ? "rest" : "rest0"];
    const tot = [0, 0, 0, 0], ptTot = [0, 0, 0, 0], rows = [], all = [];
    for (const md of meals) {
      const L = simOpts(md.id, d), id = simPickOf(md.id, s.t), sel = L.find(x => x.o.id === id), p = ptRef(ptKey(md.id, d));
      if (md.id !== "dc") p.c.forEach((x, i) => ptTot[i] += x);
      if (sel) sel.v.forEach((x, i) => tot[i] += x);
      rows.push(`<button class="simrow ${sel ? sel.tone : "none"}" data-simm="${md.id}" style="--c:${md.color}"><i></i><div><small>${esc(md.name)}</small><b>${sel ? esc(sel.o.t) : md.id === "dc" ? "niente (facoltativo)" : md.skip ? "saltato" : "scegli"}</b>${sel ? `<span>${fmt(sel.v[0])} kcal · P ${sel.v[1]} · C ${sel.v[2]} · G ${sel.v[3]}</span>` : `<span>PT ${fmt(p.c[0])} kcal</span>`}</div><em>cambia ›</em></button>`);
      const ok = L.filter(x => x.tone === "ok").length;
      all.push(`<details class="simall" style="--c:${md.color}"><summary><b>${esc(md.name)}</b><span>${ok} su ${L.length} in linea col PT</span></summary>
        <p class="ptsrc"><b>${esc(p.t)}:</b> ${fmt(p.c[0])} kcal · P ${p.c[1]} · C ${p.c[2]} · G ${p.c[3]} — ${esc(p.src)}</p>
        <div class="simtab"><span>Idea</span><span>kcal</span><span>P</span><span>C</span><span>G</span>${L.slice().sort((a, b) => a.dist - b.dist).map(x => `<button data-simp="${md.id}|${x.o.id}">${esc(x.o.t)}${x.o.r ? " 📖" : ""}</button>${x.C.map(r => `<b class="${r.st}">${fmt(r.x)}</b>`).join("")}`).join("")}</div>
        <p class="ptleg">verde = in linea · arancio/rosso = sopra il PT · azzurro = sotto · tocca un nome per metterlo nella giornata simulata</p></details>`);
    }
    const bar = (i, n) => { const x = tot[i], t = T[i], pc = t ? x / t : 0, cls = i === 1 ? (pc < .85 ? " lo" : "") : pc > 1.25 ? " hi2" : pc > 1.1 ? " hi" : pc < .85 ? " lo" : "";
      return `<div class="simb${cls}"><span>${n}</span><b>${fmt(x)}<small>/${fmt(t)}${i ? " g" : ""}</small></b><div class="ptbar"><s style="left:${90 / 1.4}%;width:${20 / 1.4}%"></s><u style="left:${Math.min(100, pc / 1.4 * 100)}%"></u></div><em>${sgn(x - t)}${i ? " g" : ""}</em></div>`; };
    const dk = tot[0] - T[0], verdict = Math.abs(dk) <= T[0] * .1 && tot[1] >= T[1] * .85 && tot[3] <= T[3] * 1.1 ? "In linea col piano del PT ✓" : [dk > T[0] * .1 ? `${sgn(dk)} kcal sopra il piano` : dk < -T[0] * .1 ? `${sgn(dk)} kcal sotto il piano` : "", tot[3] > T[3] * 1.1 ? `grassi ${sgn(tot[3] - T[3])} g (≈ ${Math.max(1, Math.round((tot[3] - T[3]) / 10))} cucchiai d'olio)` : "", tot[2] > T[2] * 1.1 ? `carboidrati ${sgn(tot[2] - T[2])} g` : "", tot[1] < T[1] * .85 ? `proteine ${sgn(tot[1] - T[1])} g` : ""].filter(Boolean).join(" · ");
    return `<div class="card sim"><h3>🧪 Simula una giornata</h3><p class="note">Scegli il tipo di giorno e un'idea per ogni pasto: vedi subito a quanto arrivi di calorie, proteine, carboidrati e grassi rispetto al piano del PT. È solo una prova: non segna niente.</p>
      <div class="seg3 simt">${SIMT.map(([k, n]) => `<button data-simt="${k}" aria-pressed="${s.t === k}">${n}</button>`).join("")}</div>
      <p class="simlv">Pranzo da ${lv} · obiettivo del giorno ${fmt(T[0])} kcal · P ${T[1]} · C ${T[2]} · G ${T[3]}</p>
      <div class="simrows">${rows.join("")}</div>
      <div class="simtot"><h4>Totale della giornata</h4>${bar(0, "Calorie")}${bar(1, "Proteine")}${bar(2, "Carboidrati")}${bar(3, "Grassi")}<p class="ptv">${esc(verdict)}</p></div>
      <div class="simact"><button class="lnk" data-simx="pt"><i>📋</i>Giornata del PT</button><button class="lnk" data-simx="rnd"><i>🎲</i>Combinazione a caso</button><button class="lnk" data-simx="best"><i>🎯</i>La più vicina al PT</button></div></div>
      <h3 class="simh">Tutte le idee, pasto per pasto</h3><p class="note">Ogni casella e ricetta confrontata col pasto del PT per questo tipo di giorno, dalla più vicina alla più lontana.</p>${all.join("")}`;
  });
  box.innerHTML = html;
  box.querySelectorAll("[data-simt]").forEach(b => b.onclick = () => { s.t = b.dataset.simt; renderSimula(box); });
  box.querySelectorAll("[data-simm]").forEach(b => b.onclick = () => simPicker(b.dataset.simm, box));
  box.querySelectorAll("[data-simp]").forEach(b => b.onclick = () => { const [m, o] = b.dataset.simp.split("|"); simSet(m, o); renderSimula(box); toast("Nella giornata simulata: " + b.textContent.replace(" 📖", "")); });
  box.querySelectorAll("[data-simx]").forEach(b => b.onclick = () => { const x = b.dataset.simx; simRun(() => { for (const md of meals) { const L = simOpts(md.id, d); if (!L.length) continue;
    if (x === "pt") simSet(md.id, null); else if (x === "rnd") simSet(md.id, md.id === "dc" ? (Math.random() < .5 ? "" : L[Math.floor(Math.random() * L.length)].o.id) : L[Math.floor(Math.random() * L.length)].o.id);
    else if (md.id !== "dc") simSet(md.id, L.slice().sort((a, b) => a.dist - b.dist)[0].o.id); else simSet("dc", ""); } }); renderSimula(box); });
}
function simSet(mid, oid) { const s = simState(), k = mid === "s2" ? (s.t === "g" ? "s2g" : "s2r") : mid; if (oid === null) delete s.pick[k]; else s.pick[k] = oid; }
function simPicker(mid, box) {
  const s = simState(), d = SIMD[s.t], md = mealDef(mid), sh = $("fsheet"), cur = simPickOf(mid, s.t);
  const body = simRun(() => { const L = simOpts(mid, d).sort((a, b) => a.dist - b.dist), k = ptKey(mid, d), p = ptRef(k);
    return `<p class="ptsrc"><b>${esc(p.t)}:</b> ${fmt(p.c[0])} kcal · P ${p.c[1]} · C ${p.c[2]} · G ${p.c[3]}</p>
      ${md.skip || mid === "dc" ? `<button class="simopt${!cur ? " on" : ""}" data-sp=""><div><b>${mid === "dc" ? "Niente dopo cena" : "Lo salto"}</b><span>0 kcal</span></div></button>` : ""}
      ${L.map(x => `<button class="simopt ${x.tone}${x.o.id === cur ? " on" : ""}" data-sp="${x.o.id}"><div><b>${esc(x.o.t)}${x.o.r ? " · ricetta" : ""}</b><span>${x.C.map(r => `<i class="${r.st}">${r.n === "k" ? fmt(r.x) + " kcal" : r.s + " " + r.x}</i>`).join(" ")}</span><small>${esc(ptVerdict(x.C, k))}</small></div></button>`).join("")}`; });
  sh.querySelector(".is-h").innerHTML = `<b>${esc(md.name)} · simulazione</b><span class="rmeta">dalla più vicina al PT</span>`;
  sh.querySelector(".is-c").innerHTML = body;
  if (sh.hidden) showSheet(sh); else sh.querySelector(".is-c").scrollTop = 0;
  sh.querySelectorAll("[data-sp]").forEach(b => b.onclick = () => { simSet(mid, b.dataset.sp); closeRecipe(); renderSimula(box); });
}

  // ☕ caffè e cappuccino, fatti a casa o al lavoro (20/11/2026): cappuccino, macchiato, caffè con un tocco; contano nelle kcal ma non segnano un pasto
function barCard(day) {
  const B = (day.x || []).filter(x => x.bar), su = !!FOOD().barSugar;
  return `<div class="card barc"><div class="barh"><b>☕ Caffè e cappuccino</b>${B.length ? `<span>${B.map(x => esc(x.t)).join(" · ")} · ~${B.reduce((a, x) => a + ((xVal(x) || [0])[0]), 0)} kcal</span>` : `<span>a casa o al lavoro</span>`}</div>
      <div class="barb">${CB.bar.map(([f, n]) => `<button class="chip" data-bar="${f}">+ ${n}${(() => { const c = B.filter(x => x.bar === f).length; return c ? ` <i>×${c}</i>` : ""; })()}</button>`).join("")}<button class="chip" data-bsug aria-pressed="${su}">${su ? "✓ con zucchero" : "senza zucchero"}</button>${B.length ? `<button class="lnk no" data-bundo><i>↶</i>Togli l'ultimo</button>` : ""}</div></div>`;
}
// 🥤 shaker dopo l'allenamento (20/11/2026): dal riepilogo dell'allenamento con un tocco; va nello spuntino 2 (versione palestra)
// se è libero, altrimenti nel dopo cena. Se c'è già uno shaker segnato oggi, non lo rimette.
function shakeDone(d) { const m = fDay(d).m || {}; return ["A2", "shg", "shn"].includes(m.s2) || m.dc === "shn" || m.s1 === "shn"; }
function logShake(d) {
  d = d || todayISO(); if (shakeDone(d)) return toast("Shaker già segnato oggi 👍");
  const m = fDay(d).m || {}; if (!m.s2 || m.s2 === "skip") logMeal(d, "s2", "A2"); else logMeal(d, "dc", "shn");
  toast("🥤 Shaker segnato: lo trovi nel Cibo");
}
// ✎ I MIEI PIATTI (20/11/2026: "quando scrivo cosa ho mangiato devi creare la sua icona"): quello che scrivi (o componi) diventa
// un piatto tuo col suo disegno, D.food.mydish[id] = { t, it [[alimento, quantità]], meal, n usi, last, at }; compare tra le caselle di quel pasto.
const myDish = () => { const f = FOOD(); return (f.mydish = f.mydish || {}); };
const dishOpts = mid => Object.entries(myDish()).filter(([, x]) => x.meal === mid && x.it && x.it.length).map(([id, x]) => ({ id: "d_" + id, t: x.t, d: "Il tuo piatto", p: drawOf(x.it), dish: 1 }));
// nome del piatto dal testo: senza quantità né condimenti ("pasta al pomodoro 90 g, parmigiano, 2 giri d'olio" → "Pasta al pomodoro, parmigiano")
function dishName(t) {
  const parts = String(t || "").replace(/^Il mio piatto:\s*/i, "").replace(/^\s*(oggi\s+)?(ho\s+)?(mangiato|preso|bevuto|fatto)\s+(solo\s+|anche\s+)?/i, "").replace(/^\s*solo\s+/i, "").split(/,|;|\+|\n/).map(x => x.replace(/\b\d+([.,]\d+)?\s*(kg|g|gr|grammi|ml|cl|l)?\b/gi, "").replace(/\b(un|una|uno|mezz[oa]|due|tre|quattro|cinque|giri?|cucchia(io|i|ino|ini)|pizzico)\b/gi, " ").replace(/\s+/g, " ").trim().replace(/^(di|d')\s*/i, ""))
    .filter(x => x && !/^(olio|sale|soia|salsa di soia|pepe|spruzzat\w*|aceto|olio extravergine)( .*)?$/i.test(x) && !/^(l')?olio$/i.test(x));
  let n = parts.join(", "); if (!n) n = String(t || "Il mio piatto").slice(0, 32);
  if (n.length > 42) n = n.slice(0, 42).replace(/,?\s*\S*$/, "") || n.slice(0, 42);
  return n.charAt(0).toUpperCase() + n.slice(1);
}
function rememberDish(meal, t, it) {
  if (!it || !it.length || !meal || meal === "fuori") return null; t = dishName(t); const M = myDish(), key = normT(t);
  let id = Object.keys(M).find(k => M[k].meal === meal && normT(M[k].t) === key);
  if (id) { M[id].it = it.map(r => [...r]); M[id].at = Date.now(); }
  else { id = Date.now().toString(36); M[id] = { t, it: it.map(r => [...r]), meal, n: 0, at: Date.now() };
    const ks = Object.keys(M).filter(k => M[k].meal === meal); if (ks.length > 30) { const old = ks.sort((a, b) => (M[a].n || 0) - (M[b].n || 0) || (M[a].at || 0) - (M[b].at || 0))[0]; delete M[old]; } }
  save(); return id;
}
const optsFor = (m, d) => m.main ? [...frOpts(d), ...mainRecipes().map(r => ({ id: r.id, t: r.s || r.name, d: r.one ? r.p1 : `Pasto 1: ${r.p1} · Pasto 2: ${r.p2}`, p: r.p, r: r.id, box: r.box, go: r.go, porta: r.porta })), ...dishOpts(m.id), ...CB.mainExtra.filter(e => !e.only || e.only === m.id)] : [...(m.gym && isGym(d) ? m.gym : m.opts), ...dishOpts(m.id), ...CB.recipes.filter(r => r.mine && r.for && r.for[m.id]).map(r => ({ id: r.id, t: r.s, d: "La tua ricetta", p: r.p, r: r.id, go: r.go, porta: r.porta }))];
const shiftOf = d => CB.shifts.find(x => x.id === fDay(d).turno) || null;
const whereOf = (d, mid) => { const sh = shiftOf(d); return sh ? sh.where[mid] || "casa" : "casa"; };
const fits = (o, w) => w === "zero" ? !o.go || o.go === "p" : w === "micro" ? !o.go || o.go !== "c" : true;
const WHERE = { zero: "🎒 al lavoro · niente attrezzi", micro: "🎒 al lavoro · solo microonde", mensa: "🍽 in mensa", casa: "" };
const optOf = (m, id, d) => optsFor(m, d).find(o => o.id === id) || (/^d_/.test(id || "") && d && (fDay(d).dn || {})[m.id] ? { id, t: fDay(d).dn[m.id], d: "Il tuo piatto", p: drawOf((fDay(d).q || {})[m.id] || []), dish: 1 } : null) || (m.gym || []).concat(m.opts || []).find(o => o.id === id) || null;

// ---------- QUANTITÀ PER INGREDIENTE (20/11/2026: "invece di 3 noci ne ho mangiate 5: voglio segnarlo e le kcal si ricalcolano") ----------
// Ogni casella/ricetta = lista [alimento, quantità] (CB.comp, CB.mq + carboidrato del momento). Le modifiche dell'utente
// stanno in D.food.days[d].q[pasto] = lista completa, solo se diversa da quella di base.
const FO = id => CB.foods[id];
const isW = o => o.u === "g" || o.u === "ml";
const parseQ = s => (s || "").split(",").map(x => x.trim().split(/\s+/)).filter(([f]) => FO(f)).map(([f, n]) => [f, +n]);
const gramsOf = (f, q) => { const o = FO(f); return isW(o) ? q : q * o.g; };
const valOfQ = L => { const t = [0, 0, 0, 0]; for (const [f, q] of L || []) { const o = FO(f); if (!o) continue; const g = gramsOf(f, q); o.v.forEach((x, i) => t[i] += x * g / 100); } return t.map(x => Math.round(x)); };
const fq = q => q === .5 ? "½" : q === .25 ? "¼" : q === .75 ? "¾" : fmt(q);
const qLabel = (f, q) => { const o = FO(f); if (isW(o)) return `${fmt(q)} ${o.u}`; const [a, b] = o.u.split("|"); return `${fq(q)} ${q <= 1 ? a : b || a}`; };
const qText = (f, q) => { const o = FO(f), n = o.n.replace(/ \(.*\)$/, "").toLowerCase(); return !isW(o) && n.includes(o.u.split("|")[0].slice(0, 3)) ? qLabel(f, q) : `${qLabel(f, q)} di ${n}`; };
const sameQ = (a, b) => JSON.stringify(a || null) === JSON.stringify(b || null);
const CONDF = ["olio", "spruzz", "sale", "soia", "balsamico"];
// carboidrato del momento: scala 80/40/0 a pranzo, porzione fissa a cena (dalle tabelle degli scambi)
function carbQ(name, mid, d, half, col) {
  const row = CB.carbs.find(c => c[0] === name), f = CB.carbFood[name]; if (!row || !f) return null;
  const L = col || (mid === "ce" ? 3 : { 80: 1, 40: 2, 0: 0 }[lunchLvl(d)]); if (!L) return [f, 0];
  const s = row[L], o = FO(f); let n;
  if (/½/.test(s)) n = .5; else if (/¾/.test(s)) n = .75; else { const m = s.match(/(\d+)(?:-(\d+))?/); n = m ? (m[2] ? (+m[1] + +m[2]) / 2 : +m[1]) : 0; }
  if (/ g/.test(s) && !isW(o)) n = Math.round(n / o.g * 2) / 2;
  if (half) n = isW(o) ? Math.round(n / 2 / 5) * 5 : n / 2;
  return [f, n];
}
// 🧊 dal ristorante del lavoro (20/11/2026): proteina già cotta portata a casa, da finire nei giorni dopo
const frList = () => { const f = FOOD(); return (f.fridge = f.fridge || []); };
const dDiff = (a, b) => Math.round((new Date(b + "T12:00") - new Date(a + "T12:00")) / 864e5);
const FDP = { polloc: "pollo", pollo: "pollo", carnec: "manzo", manzo: "manzo", pescec: "pesce", merluzzo: "pesce", salmone: "salmone", gamberi: "gamberi", fritto: "cotoletta", macinato: "polpette" };
const frOpt = x => ({ id: "fr_" + x.id, t: "🧊 " + x.t, d: "Dal ristorante: completa con il carboidrato del momento e le verdure.", p: [FDP[x.f] || "pollo", "verdure", "riso"], go: "m", porta: "Già cotto: 2 minuti al microonde, coperto. In frigo si tiene 3 giorni.", fr: x.id });
function frOpts(d) { const out = frList().filter(x => x.d <= d && dDiff(x.d, d) <= 3).map(frOpt); for (const [k, x] of Object.entries(fDay(d).fr || {})) if (!out.some(o => o.id === k)) out.push(frOpt(x)); return out; }
const frItem = (d, oid) => /^fr_/.test(oid || "") ? (fDay(d).fr || {})[oid] || frList().find(x => "fr_" + x.id === oid) || null : null;
function baseQ(mid, oid, d) {
  if (!oid || oid === "skip" || oid === "libero" || oid === "x") return null;
  const ur = recipeById(oid); if (ur && ur.mine) return applySubs(ur.q.map(r => [...r]));
  if (/^d_/.test(oid)) { const x = myDish()[oid.slice(2)]; return x ? applySubs(x.it.map(r => [...r])) : null; }
  if (mid === "pr" || mid === "ce") {
    const fr = frItem(d, oid), key = fr ? "rist" : /^fr_/.test(oid) ? null : oid; if (!key) return null;
    const r = recipeById(key), spec = CB.mq[key]; if (!spec) return null;
    const p2 = mid === "ce" && r && !r.one;
    // legumi (curry): scala del PT 80 = 80 + 100 legumi + 100 pollo · 40 = 40 + 150 + 150 · 0 = 200 + 200; a cena la versione da 40
    const lv = mid === "pr" ? lunchLvl(d) : 40;
    const L = parseQ(typeof spec === "string" ? spec : spec.leg ? (lv === 80 ? spec.gym : lv === 0 ? spec.l0 : spec.q) : (isGym(d) && spec.gym) || (p2 && spec.p2) || spec.q);
    if (fr) L[0] = [fr.f, fr.g];
    else { const ad = ((fDay(d).ad || {})[key]); if (ad) { const i = L.findIndex(([f]) => f === ad.from || EQ[f] === ad.from); if (i >= 0) { const was = L[i]; L[i] = [ad.to, ad.q];
      // 🥫 adattata a quello che hai; se la proteina nuova è più grassa, meno olio di altrettanto (come dice la tabella scambi del PT)
      const df = (FO(ad.to).v[3] * gramsOf(ad.to, ad.q) - FO(was[0]).v[3] * gramsOf(was[0], was[1])) / 100, j = L.findIndex(([f]) => f === "olio");
      if (df > 1 && j >= 0) { const og = gramsOf("olio", L[j][1]), ng = Math.max(0, og - df), st = FO("olio").s || .5; L[j] = ["olio", Math.max(0, Math.round(ng / FO("olio").g / st) * st)]; } } } }
    let c = null;
    if (key === "mensa") c = ["mpri", { 80: .8, 40: .4, 0: 0 }[lunchLvl(d)]]; // primo della mensa: 0,8 porzione ≈ 200 g cotti ≈ 80 g crudi + condimento
    else { const cn = r ? r.cb[p2 && r.cb.p2 ? "p2" : "p1"] || r.cb.p1 : CB.mcarb[key]; c = cn && carbQ(cn, mid, d, r && r.cb.half, spec.leg && mid === "ce" ? 2 : 0); }
    if (c) { const i = L.findIndex(([f]) => CONDF.includes(f)); L.splice(i < 0 ? L.length : i, 0, c); }
    return applySubs(L);
  }
  const k = mid === "s2" && isGym(d) && CB.comp["s2g." + oid] ? "s2g." + oid : mid + "." + oid;
  const s = CB.comp[k] || CB.comp["s2g." + oid]; return s ? applySubs(parseQ(s)) : null;
}
function curQ(d, mid, oid) { const day = fDay(d); if ((day.m || {})[mid] === oid && day.q && day.q[mid]) return day.q[mid]; return baseQ(mid, oid, d); }

// ✎ testo scritto a mano → alimenti (20/11/2026: "se scrivo dei messaggi devi estrapolare quello che ho scritto e integrarlo").
// "2 biscotti e una birra", "80 g di pasta col tonno", "mezza pizza", "un pugno di noci". Quello che non capisce lo dice.
const FILL = new Set("di da in un uno una al allo ai agli il lo la le gli piatto piatti porzione porzioni pezzo pezzi po ho abbiamo mangiato mangiata mangiati bevuto bevuta preso presa fatto fatta oggi ieri stasera stamattina pranzo cena colazione merenda spuntino della delle dello degli dei del alla alle allo agli poco poca tanto tanta normale piccolo piccola grande anche altro altra per dopo prima casa lavoro bar croccante croccanti friggitrice forno padella microonde piastra griglia cottura cotte crudi piccante piccanti arrotolata arrotolato arrotolati ripieno ripiena ripieni salato salati salata salate dolce gradi minuti secondi tostato tostata tostati sbattuti sbattute bagnate bagnati scaldato scaldata riscaldato condito condita fresco fresca freddo fredda caldo calda tiepido light magro magra intero intera".split(" "));
const NUMW = { po: .6, tot: 5, parecchi: 6, parecchie: 6, diversi: 4, diverse: 4, alcuni: 3, alcune: 3, pochi: 2, poche: 2, tanti: 6, tante: 6, un: 1, uno: 1, una: 1, mezzo: .5, mezza: .5, due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10, paio: 2, qualche: 3, dozzina: 12 };
const normT = t => (t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/’/g, "'");
let KW = null;
function kwList() {
  if (KW) return KW; KW = [];
  // 21/11/2026: gli spazi delle parole chiave valgono anche come "_" (frasi protette, vedi readFood) e l'ultima vocale può
  // cambiare a fine parola (zucchina/zucchine, polpetta/polpette, biscotto/biscotti)
  const esc_ = t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "[ _]");
  for (const [id, o] of Object.entries(CB.foods)) for (const k of String(o.k || "").split(",")) { const n = normT(k.trim()); if (n.length < 3) continue; const pr = n.length + (o.mine ? 1000 : 0);
    KW.push([new RegExp("(^|[^a-z])" + esc_(n)), id, pr, n]);
    if (n.length >= 4 && /[aeio]$/.test(n)) KW.push([new RegExp("(^|[^a-z])" + esc_(n.slice(0, -1)) + "[aeio](?![a-z])"), id, pr - 1.5, n]); }
  KW.sort((a, b) => b[2] - a[2]);
  STEMS = [...new Map(KW.filter(k => !/ /.test(k[3]) && k[3].length >= 5).map(k => [k[3], k[1]])).entries()];
  return KW;
}
const COOKED = { pasta: "pastac", pastai: "pastac", riso: "risoc" };
let STEMS = [];
const UNITW = new Set("fetta fette fettina fettine pezzo pezzi piatto piatti porzione porzioni tazza tazzina bicchiere bottiglia lattina vasetto confezione busta pacchetto cucchiaio cucchiaino manciata grammi etto etti litro litri".split(" "));
// 21/11/2026: in una frase con un piatto pronto ("fusilli al pesto", "tortellini al ragù") pasta, riso e sughi sono già dentro il piatto;
// nei piatti "contenitore" (insalatona, poke, piadina, panino, burrito) quello che scrivi dopo ("con pollo e mozzarella") è il ripieno:
// il piatto vale solo la sua base, così non si conta due volte
const PASTA_DISH = new Set("carbonara amatriciana ppesto ppomodoro paglio pragu ptonno ppanna cacio pmare pfagioli pverdure pfredda".split(" "));
const DISH_IN = new Set("pasta pastai pastac riso risoc rprec gnocchi cous farro quinoa ragu sugo passata pestosalsa panna burro".split(" "));
const DISH_BASE = { insalatona: .35, poke: .55, piadinaf: .55, paninof: .5, burrito: .55, tramezzino: .45, wrap: 1, piadina: 1 };
function dishFix(items, from) {
  const cl = items.slice(from), isDish = f => /^(piatto|porzione|trancio|ciotola|bowl)/.test((FO(f) || {}).u || "") && !DISH_BASE[f];
  if (cl.some(i => isDish(i.f))) for (let i = items.length - 1; i >= from; i--) if (DISH_IN.has(items[i].f) && !isDish(items[i].f)) items.splice(i, 1);
  const c = items.slice(from).find(i => DISH_BASE[i.f] && DISH_BASE[i.f] < 1);
  if (c && items.length - from > 1 && items.slice(from).some(i => i !== c && !["erbe", "olio", "sale"].includes(i.f))) {
    // piadina farcita col ripieno scritto = 1 piadina semplice (prima 0,55 × 725 kcal ≈ 400 kcal per la sola piadina)
    if (c.f === "piadinaf" && FO("piadina")) { c.f = "piadina"; } else c.q = Math.round(c.q * DISH_BASE[c.f] * 100) / 100; }
}
// distanza tra due parole (errori di battitura): "carbonra" ≈ "carbonara", "zuchine" ≈ "zucchine"
function lev(a, b) { const m = a.length, n = b.length; if (Math.abs(m - n) > 2) return 9; let pr = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) { const cu = [i]; for (let j = 1; j <= n; j++) cu[j] = Math.min(pr[j] + 1, cu[j - 1] + 1, pr[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); pr = cu; } return pr[n]; }
function fuzzyHit(p) {
  kwList(); let best = null;
  // prudente: una parola sbagliata è meglio di un alimento sbagliato (prima lettera uguale, niente misure né contenitori)
  for (const w of p.split(/[^a-z]+/)) { if (w.length < 5 || FILL.has(w) || NUMW[w] != null || CB.cont[w] || UNITW.has(w)) continue;
    for (const [n, id] of STEMS) { if (n[0] !== w[0]) continue; const tol = n.length >= 7 && w.length >= 7 ? 2 : 1, d = Math.min(lev(w, n), lev(w.slice(0, n.length), n), lev(w.slice(0, n.length + 1), n), lev(w.slice(0, n.length - 1), n));
      if (d <= tol && (!best || d < best.d || (d === best.d && n.length > best.n.length))) best = { d, n, id }; } }
  return best && best.id;
}
function readFood(txt, size, oneEach, noFuzzy) {
  const fac = size === "p" ? .7 : size === "t" ? 1.4 : 1, items = [], miss = [];
  // 21/11/2026: i nomi dei piatti con "e"/"con" dentro ("pasta e fagioli", "cacio e pepe", "piadina con…") non si spezzano
  // 22/11/2026: tolti tempi e temperature ("90 secondi al microonde", "200 gradi"), le alternative ("3 gallette o 1 yogurt",
  // "(o 8 gallette)": vale la prima) e gli aggettivi di preparazione ("avena frullata" non è un frullato)
  txt = normT(txt).replace(/\((?:o|oppure)\b[^)]*\)/g, " ").replace(/\b(?:o|oppure|altrimenti)\b[^,;+\n.()]*/g, " ")
    .replace(/\d+(?:[.,]\d+)?\s*(?:secondi|second|sec|minuti|minuto|min|ore|ora|gradi|°c?)\b/g, " ").replace(/\d+\s*°/g, " ")
    // 22/11/2026 (test automatici): kcal scritte e "totale" non sono alimenti ("totale 550 kcal" diventava 550 torte)
    .replace(/[~≈]?\s*\d+(?:[.,]\d+)?\s*k?cal(?:orie)?\b/g, " ").replace(/\b(?:totale|tot|in tutto|circa)\b/g, " ")
    .replace(/([a-z])\s+(?:frullat|tritat|sbriciolat|grattugiat|sminuzzat)[aeio]\b/g, "$1");
  let src = normT(txt).replace(/(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)/g, (m, a, b) => String((parseFloat(a.replace(",", ".")) + parseFloat(b.replace(",", "."))) / 2)).replace(/\bfettin([ae])\b/g, "fett$1").replace(/\bun (tot|po|paio)\b/g, "$1"); for (const k of kwList()) if (/ /.test(k[3]) && src.includes(k[3])) src = src.split(k[3]).join(k[3].replace(/ /g, "_"));
  for (const clause of src.split(/,|;|\+|\n|\.(?!\d)/)) { const c0 = items.length;
  for (let p of clause.split(/\be\b|\bed\b|\bcon\b|\bcol\b|\bpiu\b|\bpoi\b|\banche\b/)) {
    p = p.replace(/\bun'/g, "un ").trim(); if (!p) continue;
    // tutti gli alimenti del pezzo ("pasta al sugo" = pasta + sugo); la quantità scritta vale per il primo
    const hits = []; let rest = p;
    for (;;) { const k = kwList().find(([re]) => re.test(rest)); if (!k) break; const m = rest.match(k[0]), at = m.index + m[1].length;
      const end = rest.slice(at).search(/[^a-z]|$/); if (!hits.some(h => h[0] === k[1])) hits.push([k[1], at, Math.max(k[2], end)]); rest = rest.slice(0, at) + " ".repeat(Math.max(k[2], end)) + rest.slice(at + Math.max(k[2], end)); }
    if (!hits.length && !noFuzzy) { const fz = fuzzyHit(p); if (fz) hits.push([fz, 0, 0]); }
    if (!hits.length) { const left = p.replace(/[^a-z ]/g, " ").split(/\s+/).filter(w => w.length > 2 && !FILL.has(w)); if (left.length) miss.push(p.replace(/_/g, " ")); continue; }
    hits.sort((a, b) => a[1] - b[1]); if (oneEach) hits.length = 1;
    // 22/11/2026: ogni numero va all'alimento giusto. "50 g di bresaola" → bresaola (c'è "di"); "pollo 200 g" → pollo (subito dopo);
    // altrimenti al primo alimento che segue ("2 fette di pane bagnate in 1 uovo" = 2 fette + 1 uovo). Prima valeva solo per il primo.
    const asg = hits.map(() => null), toks = [...p.matchAll(/(\d+(?:[.,]\d+)?)|\b([a-z]+)\b/g)].filter(t => t[1] || NUMW[t[2]] != null);
    for (const t of toks) { const i0 = t.index, e0 = i0 + t[0].length, nx = hits.findIndex(h => h[1] >= e0), pv = (() => { let r = -1; hits.forEach((h, k) => { if (h[1] + h[2] <= i0) r = k; }); return r; })();
      if (pv < 0 && nx < 0) continue; let to;
      const between = nx >= 0 ? p.slice(e0, hits[nx][1]) : null;
      if (nx >= 0 && /^\s*(?:(?:kg|g|gr|grammi|grammo|ml|cl|l|lt|litri|litro)\s*)?(?:[a-z]+\s+){0,2}(?:di|d)\s*$/.test(between)) to = nx;
      else if (pv >= 0 && /^\s*$/.test(p.slice(hits[pv][1] + hits[pv][2], i0)) && !/_con$|_col$/.test(p.slice(hits[pv][1], hits[pv][1] + hits[pv][2]))) to = pv;
      else to = nx >= 0 ? nx : pv;
      if (asg[to] == null) asg[to] = t; }
    hits.forEach(([hit, at], hi) => {
    const o = FO(hit), t = asg[hi], segA = t ? p.slice(t.index, t.index + 40) : p, words = segA.split(/[^a-z]+/);  // "_" separa le parole come lo spazio
    let n = t ? (t[1] ? parseFloat(t[1].replace(",", ".")) : NUMW[t[2]]) : null;
    const um = t && t[1] ? p.slice(t.index).match(/^\d+(?:[.,]\d+)?\s*(kg|g|gr|grammi|grammo|ml|cl|l|lt|litr[oi])\b/) : null;
    const cwin = t ? p.slice(t.index + t[0].length, Math.max(at, t.index + t[0].length + 1)).split(/[^a-z]+/) : words, own = isW(o) ? [] : o.u.split("|"), cw = (t ? p.slice(t.index + t[0].length, t.index + t[0].length + 25).split(/[^a-z]+/).slice(0, 3) : words).concat(cwin).find(w => w && !own.includes(w) && ((o.cg && o.cg[w]) || CB.cont[w]));
    let g;
    // "80 g di pasta al tonno": i grammi sotto i 150 nei piatti di pasta sono della pasta cruda (piatto ≈ 3,3 volte)
    if (um && PASTA_DISH.has(hit)) { const u = um[1], gg = n * (u === "kg" ? 1000 : 1); if (gg < 150) { items.push({ f: hit, q: Math.round(gg * 3.3 / o.g * 100) / 100, t: p }); return; } }
    if (um) { const u = um[1]; g = n * (u === "kg" ? 1000 : u === "cl" ? 10 : /^l/.test(u) ? 1000 : 1); }
    else if (cw) g = (n ?? 1) * ((o.cg && o.cg[cw]) || CB.cont[cw]);
    else if (isW(o)) g = n != null && n > 12 ? n : (n ?? fac) * o.d;
    else g = (n ?? o.d * fac) * o.g;
    // pasta e riso: "cotta/cotto" (o un piatto oltre 160 g senza "crudo") = peso da cotto
    if (COOKED[hit] && !/\bcrud/.test(p) && (/\bcott[aoie]\b/.test(p) || (um && g >= 160))) { const c = COOKED[hit]; items.push({ f: c, q: Math.round(g), t: p }); return; }
    items.push({ f: hit, q: isW(o) ? Math.round(g) : Math.round(g / o.g * 100) / 100, t: p });
    });
  }
  // stesso alimento due volte nella stessa frase ("shaker con 30 g di proteine"): vale quello con la quantità scritta
  for (let i = items.length - 1; i >= c0; i--) { const dup = items.some((x, k) => k >= c0 && k !== i && x.f === items[i].f && /\d/.test(x.t));
    if (dup && !/\d/.test(items[i].t)) items.splice(i, 1); }
  dishFix(items, c0);
  }
  // i prodotti scansionati prendono il posto di quelli generici anche qui
  const sub = applySubs(items.map(i => [i.f, i.q])); items.forEach((it, i) => { it.f = sub[i][0]; it.q = sub[i][1]; });
  return { items, miss, t: valOfQ(items.map(i => [i.f, i.q])) };
}
// un pasto conta come fatto anche se l'utente l'ha solo scritto a mano
const mealV = (day, k) => (day.m || {})[k] || ((day.x || []).some(x => x.meal === k) ? "x" : "");

// ---------- disegni dei piatti e dei passaggi (SVG generati, nessuna foto da internet) ----------
function rng(seed) { let h = 2166136261; for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// [quanti pezzi, raggio minimo libero, funzione che disegna un pezzo in x,y]
const FD = {
  sugo: [1, 0, (x, y, r) => `<path d="M${x - 15},${y} q2,-13 15,-14 q14,1 15,12 q0,13 -15,14 q-15,0 -15,-12z" fill="#C0392B" opacity=".88"/>`],
  yogurt: [1, 0, (x, y) => `<circle cx="${x}" cy="${y}" r="17" fill="#FCFBF7"/><path d="M${x - 9},${y - 3} q9,-7 18,0 q-9,8 -18,0" fill="none" stroke="#E7E1D3" stroke-width="1.4"/>`],
  riso: [70, 0, (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="1.9" ry=".95" transform="rotate(${r() * 180} ${x} ${y})" fill="#FFFDF7" stroke="#D3C9B6" stroke-width=".35"/>`],
  cous: [90, 0, (x, y) => `<circle cx="${x}" cy="${y}" r="1" fill="${["#E9C980", "#DDB866", "#F0D597"][Math.floor(x * 7) % 3]}"/>`],
  farro: [55, 0, (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="1.9" ry="1.15" transform="rotate(${r() * 180} ${x} ${y})" fill="#B88B52" stroke="#8C6634" stroke-width=".3"/>`],
  pasta: [16, 2, (x, y, r) => { const a = r() * 180; return `<g transform="rotate(${a} ${x} ${y})"><rect x="${x - 4}" y="${y - 1.5}" width="8" height="3" rx="1.2" fill="#EDC46B" stroke="#C4943A" stroke-width=".4"/><path d="M${x - 2},${y - 1.5}v3M${x},${y - 1.5}v3M${x + 2},${y - 1.5}v3" stroke="#D5A84D" stroke-width=".35"/></g>`; }],
  patate: [11, 3, (x, y, r, c) => `<rect x="${x - 3.4}" y="${y - 3.4}" width="6.8" height="6.8" rx="1.8" transform="rotate(${r() * 90} ${x} ${y})" fill="${c || "#EDC86E"}" stroke="${c ? "#C2621E" : "#C59A3E"}" stroke-width=".55"/>`],
  pdolci: [11, 3, (x, y, r) => FD.patate[2](x, y, r, "#EE8B3E")],
  pane: [2, 7, (x, y, r) => `<g transform="rotate(${(r() - .5) * 40} ${x} ${y})"><path d="M${x - 8},${y + 7} v-9 q0,-6 8,-6 q8,0 8,6 v9z" fill="#E6B877" stroke="#A86A2E" stroke-width="1.5"/><path d="M${x - 4},${y - 1}h2M${x + 1},${y + 2}h2M${x - 3},${y + 4}h1.5" stroke="#C99252" stroke-width=".7"/></g>`],
  piadina: [1, 10, (x, y) => `<path d="M${x - 17},${y + 4} a17,17 0 0 1 34,0z" fill="#EFD9A2" stroke="#C9A866" stroke-width="1"/><circle cx="${x - 6}" cy="${y - 4}" r="1.3" fill="#C6964B"/><circle cx="${x + 5}" cy="${y - 7}" r="1.1" fill="#C6964B"/><circle cx="${x + 9}" cy="${y}" r="1.2" fill="#C6964B"/>`],
  pollo: [9, 3, (x, y, r) => { const a = r() * 180; return `<g transform="rotate(${a} ${x} ${y})"><rect x="${x - 4}" y="${y - 2.9}" width="8" height="5.8" rx="2.3" fill="#DBA569" stroke="#A86E36" stroke-width=".55"/><path d="M${x - 2.4},${y - 2.6}l1.4,5.2M${x + .6},${y - 2.6}l1.4,5.2" stroke="#9C6029" stroke-width=".8" opacity=".75"/></g>`; }],
  manzo: [9, 3, (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="6.3" ry="1.9" transform="rotate(${r() * 180} ${x} ${y})" fill="#8A4A2E" stroke="#5B2E1B" stroke-width=".5"/>`],
  polpette: [7, 3.5, (x, y) => `<circle cx="${x}" cy="${y}" r="3.9" fill="#7C4027" stroke="#4E2716" stroke-width=".5"/><circle cx="${x - 1.3}" cy="${y - 1.4}" r="1" fill="#A8664A"/>`],
  pesce: [2, 9, (x, y, r) => `<g transform="rotate(${(r() - .5) * 60} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="12.5" ry="5.8" fill="#F6F1E6" stroke="#D2C5AE" stroke-width=".7"/><path d="M${x - 6},${y - 4.5}q2,4.5 0,9M${x},${y - 5.5}q2,5.5 0,11M${x + 6},${y - 4.5}q2,4.5 0,9" fill="none" stroke="#E0D3BC" stroke-width=".7"/></g>`],
  salmone: [1, 10, (x, y, r) => `<g transform="rotate(${(r() - .5) * 40} ${x} ${y})"><rect x="${x - 10}" y="${y - 6.5}" width="20" height="13" rx="3.5" fill="#F0875A" stroke="#C25F37" stroke-width=".7"/><path d="M${x - 6},${y - 6}l-3,12M${x - 1},${y - 6.5}l-3,13M${x + 4},${y - 6.5}l-3,13M${x + 9},${y - 5}l-2.5,10" stroke="#F9C2A2" stroke-width="1"/></g>`],
  gamberi: [8, 3.5, (x, y, r) => { const a = r() * 360; return `<g transform="rotate(${a} ${x} ${y})"><path d="M${x - 3},${y + 2} a3.6,3.6 0 1 1 6,-1.5" fill="none" stroke="#F2834F" stroke-width="2.8" stroke-linecap="round"/><path d="M${x + 3},${y - 1.5} l2.4,1.2 l-.4,-2.6z" fill="#E5673A"/></g>`; }],
  tonno: [14, 2, (x, y, r) => `<path d="M${x - 2.4},${y - 1} l2,-1.8 l2.6,1 l.2,2.3 l-2.5,1.4 l-2.4,-.8z" transform="rotate(${r() * 180} ${x} ${y})" fill="#C9A27A" stroke="#A67F57" stroke-width=".4"/>`],
  uova: [3, 5, (x, y, r) => `<g transform="rotate(${r() * 180} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="5.4" ry="4.2" fill="#FFFFFF" stroke="#D9D4CA" stroke-width=".6"/><circle cx="${x}" cy="${y}" r="2.3" fill="#F5B921"/></g>`],
  frittata: [1, 0, (x, y) => `<circle cx="${x}" cy="${y}" r="19" fill="#F2C94C" stroke="#D3A527" stroke-width="1"/><path d="M${x},${y}L${x + 19},${y}" stroke="#D3A527" stroke-width=".8"/><circle cx="${x - 7}" cy="${y - 6}" r="1.8" fill="#3D8B3D"/><circle cx="${x + 5}" cy="${y + 8}" r="1.6" fill="#3D8B3D"/><circle cx="${x - 9}" cy="${y + 6}" r="1.4" fill="#C0392B"/><circle cx="${x + 9}" cy="${y - 8}" r="1.5" fill="#3D8B3D"/>`],
  ceci: [20, 2, (x, y) => `<circle cx="${x}" cy="${y}" r="2.1" fill="#E3C48E" stroke="#B79560" stroke-width=".45"/>`],
  mozzarella: [8, 3, (x, y, r) => `<rect x="${x - 2.4}" y="${y - 2.4}" width="4.8" height="4.8" rx="1.3" transform="rotate(${r() * 90} ${x} ${y})" fill="#FFFFFF" stroke="#DADADA" stroke-width=".5"/>`],
  bresaola: [4, 6, (x, y) => `<circle cx="${x}" cy="${y}" r="6.2" fill="#8E2B2B" stroke="#651B1B" stroke-width=".6"/><path d="M${x - 4},${y + 2} q4,2 8,-1" fill="none" stroke="#C97A7A" stroke-width=".8"/>`],
  verdure: [11, 3, (x, y, r) => { const c = [["#5BAA4A", "#3C7C2E"], ["#D9534F", "#A33532"], ["#F2C14E", "#C79524"]][Math.floor(r() * 3)]; return `<g transform="rotate(${r() * 180} ${x} ${y})"><rect x="${x - 4.5}" y="${y - 1.7}" width="9" height="3.4" rx="1.5" fill="${c[0]}" stroke="${c[1]}" stroke-width=".4"/><path d="M${x - 2},${y - 1.6}v3.2M${x + 1.5},${y - 1.6}v3.2" stroke="${c[1]}" stroke-width=".7"/></g>`; }],
  spinaci: [10, 3, (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="3.8" ry="2.6" transform="rotate(${r() * 180} ${x} ${y})" fill="#2F7D32" stroke="#1E5A22" stroke-width=".4"/>`],
  rucola: [11, 3, (x, y, r) => `<path d="M${x - 4.5},${y} l1.5,-1.6 l1,1 l1.2,-1.8 l1,1.2 l1.3,-1.4 l1.4,1.4 l-1,1.6 l-6.4,.6z" transform="rotate(${r() * 360} ${x} ${y})" fill="#5E9E3E" stroke="#3F7426" stroke-width=".35"/>`],
  insalata: [8, 4, (x, y, r) => `<g transform="rotate(${r() * 180} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="5.4" ry="3.2" fill="#8CC152" stroke="#6A9F38" stroke-width=".5"/><path d="M${x - 4.5},${y}h9" stroke="#C6E59A" stroke-width=".6"/></g>`],
  pomodorini: [6, 3.5, (x, y) => `<circle cx="${x}" cy="${y}" r="3.4" fill="#E2453C" stroke="#A82A23" stroke-width=".5"/><circle cx="${x - 1.1}" cy="${y - 1.2}" r=".9" fill="#F5A79F"/>`],
  cornflakes: [17, 2.5, (x, y, r) => `<path d="M${x - 2.8},${y} l1.2,-2.4 l3,-.4 l1.6,2.2 l-1.4,2.4 l-3,.2z" transform="rotate(${r() * 360} ${x} ${y})" fill="#F0B848" stroke="#C88A22" stroke-width=".4"/>`],
  gallette: [2, 8, (x, y) => `<circle cx="${x}" cy="${y}" r="8.2" fill="#F1E2BE" stroke="#CDB68A" stroke-width=".9"/><circle cx="${x - 3}" cy="${y - 2}" r=".8" fill="#CDB68A"/><circle cx="${x + 2.5}" cy="${y - 3}" r=".8" fill="#CDB68A"/><circle cx="${x}" cy="${y + 2.5}" r=".8" fill="#CDB68A"/><circle cx="${x + 4}" cy="${y + 2}" r=".8" fill="#CDB68A"/>`],
  noci: [3, 3.5, (x, y) => `<path d="M${x - 3.6},${y} q0,-3.4 3.6,-3.4 q3.6,0 3.6,3.4 q0,3.4 -3.6,3.4 q-3.6,0 -3.6,-3.4z" fill="#A9703D" stroke="#6E4422" stroke-width=".6"/><path d="M${x},${y - 3.2}v6.4M${x - 2.3},${y - 1.5}q1.2,1.5 0,3M${x + 2.3},${y - 1.5}q-1.2,1.5 0,3" stroke="#6E4422" stroke-width=".5" fill="none"/>`],
  fiocchi: [24, 1.5, (x, y) => `<circle cx="${x}" cy="${y}" r="1.7" fill="#FFFFFF" stroke="#E2E2E2" stroke-width=".35"/>`],
  shaker: [1, 8, (x, y) => `<rect x="${x - 6}" y="${y - 12}" width="12" height="24" rx="3" fill="#6D95FF" opacity=".9"/><rect x="${x - 6.6}" y="${y - 14.5}" width="13.2" height="5" rx="1.5" fill="#3B4A63"/><rect x="${x - 4}" y="${y - 5}" width="8" height="12" rx="1.5" fill="#E9EEF7" opacity=".85"/>`],
  torta: [1, 10, (x, y) => `<path d="M${x - 13},${y + 3} q0,-15 13,-15 q13,0 13,15z" fill="#8B5A2B" stroke="#5E3B1B" stroke-width=".8"/><circle cx="${x - 5}" cy="${y - 5}" r="1.3" fill="#B07A45"/><circle cx="${x + 4}" cy="${y - 7}" r="1.1" fill="#B07A45"/><rect x="${x - 14}" y="${y + 2}" width="28" height="9" rx="2" fill="#E9EEF2" stroke="#B8C3CC" stroke-width=".7"/>`],
  toast: [2, 7, (x, y, r) => `<g transform="rotate(${(r() - .5) * 40} ${x} ${y})"><rect x="${x - 8}" y="${y - 6.5}" width="16" height="13" rx="3" fill="#D9A15A" stroke="#8E5A26" stroke-width="1.2"/><path d="M${x - 6},${y - 3} q3,-2 6,0 q3,2 5,-1 M${x - 5},${y + 2} q4,2 8,0" fill="none" stroke="#F4C542" stroke-width="2.2" stroke-linecap="round"/><circle cx="${x + 3}" cy="${y + 3.5}" r="1.4" fill="#C0392B" opacity=".7"/></g>`],
  pancake: [1, 10, (x, y) => [5, 1, -3].map(d => `<ellipse cx="${x}" cy="${y + d}" rx="15" ry="6" fill="#DDA157" stroke="#93602A" stroke-width=".8"/>`).join("") + `<ellipse cx="${x}" cy="${y - 3}" rx="12" ry="4" fill="#E9B46A"/><path d="M${x - 5},${y - 4} q5,-5 10,0 q-5,3 -10,0" fill="#FBF8F1"/><circle cx="${x - 1}" cy="${y - 4.5}" r=".8" fill="#6B3E1E"/><circle cx="${x + 2}" cy="${y - 3.8}" r=".7" fill="#6B3E1E"/>`],
  pizzetta: [2, 8, (x, y) => `<circle cx="${x}" cy="${y}" r="8.4" fill="#F1E2BE" stroke="#CDB68A" stroke-width=".9"/><circle cx="${x}" cy="${y}" r="6.2" fill="#C8412F"/><circle cx="${x - 2}" cy="${y - 1.5}" r="1.8" fill="#FFFDF5"/><circle cx="${x + 2.4}" cy="${y + 1}" r="1.7" fill="#FFFDF5"/><circle cx="${x - .5}" cy="${y + 3}" r="1.5" fill="#FFFDF5"/><circle cx="${x + 2}" cy="${y - 3}" r=".9" fill="#4E8F31"/>`],
  gnocchi: [14, 2.5, (x, y, r) => `<g transform="rotate(${r() * 180} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="3.4" ry="2.4" fill="${r() < .5 ? "#E8C47A" : "#F1DCA0"}" stroke="#C49A4C" stroke-width=".45"/><path d="M${x - 1.6},${y - 2}v4M${x},${y - 2.3}v4.6M${x + 1.6},${y - 2}v4" stroke="#C49A4C" stroke-width=".35"/></g>`],
  cotoletta: [2, 8, (x, y, r) => `<g transform="rotate(${(r() - .5) * 60} ${x} ${y})"><path d="M${x - 12},${y} q1,-7 10,-7 q11,0 13,5 q2,8 -9,9 q-13,1 -14,-7z" fill="#D99A3E" stroke="#9C6420" stroke-width=".9"/>${[[-6, -2], [-1, 2], [4, -3], [7, 2], [-3, -5], [1, -1]].map(([a, b]) => `<circle cx="${x + a}" cy="${y + b}" r=".9" fill="#F3C978"/>`).join("")}</g>`],
  strapazzate: [9, 3, (x, y, r) => `<path d="M${x - 3.4},${y} q.5,-3 3.4,-2.8 q3.2,.3 3,2.9 q-.6,3 -3.2,2.7 q-3.2,-.2 -3.2,-2.8z" transform="rotate(${r() * 180} ${x} ${y})" fill="#F6CF4E" stroke="#D8A825" stroke-width=".45"/>`],
  piselli: [16, 1.5, (x, y, r) => r() < .7 ? `<circle cx="${x}" cy="${y}" r="1.7" fill="#6DB33F" stroke="#4A8A28" stroke-width=".35"/>` : `<rect x="${x - 1.5}" y="${y - 1.5}" width="3" height="3" rx=".6" fill="#F08A2C"/>`],
  pizza: [1, 0, (x, y) => `<circle cx="${x}" cy="${y}" r="27" fill="#E9C98A" stroke="#B98B44" stroke-width="1.2"/><circle cx="${x}" cy="${y}" r="22" fill="#C8412F"/>${[[-9, -7], [7, -10], [11, 5], [-4, 9], [-12, 4], [2, 0], [5, 12]].map(([a, b]) => `<ellipse cx="${x + a}" cy="${y + b}" rx="3.6" ry="3" fill="#FFFDF5"/>`).join("")}${[[-2, -12], [-8, 13], [12, -3], [0, 7], [-14, -4]].map(([a, b], i) => `<path d="M${x + a - 2.5},${y + b} l1,-1.2 l.8,.8 l1,-1.3 l.9,1 l1.1,-1 l1,1 -1,1.2z" transform="rotate(${i * 70} ${x + a} ${y + b})" fill="#4E8F31"/>`).join("")}`],
  proteine: [1, 6, (x, y) => `<path d="M${x - 8},${y + 4} q8,-12 16,0z" fill="#EFE6D2" stroke="#CFC3A8" stroke-width=".6"/>`],
};
const ORDER = ["pizza", "sugo", "yogurt", "frittata", "pancake", "piadina", "pesce", "salmone", "cotoletta", "gallette", "pane", "toast", "bresaola", "torta", "shaker"];
// sparge gli ingredienti in un cerchio (cx, cy, R): uno spicchio per ingrediente
function scatter(parts, cx, cy, R, k, seed) {
  const r = rng(seed + parts.join()), ps = parts.filter(p => FD[p]), n = ps.length || 1, out = [];
  const oi = p => { const k = ORDER.indexOf(p); return k < 0 ? 99 : k; };
  const sorted = ps.map((p, i) => ({ p, i })).sort((a, b) => oi(a.p) - oi(b.p));
  for (const { p, i } of sorted) {
    const [cnt, pad, draw] = FD[p], a0 = i / n * 2 * Math.PI - Math.PI / 2, a1 = (i + 1) / n * 2 * Math.PI - Math.PI / 2;
    const many = cnt === 1 ? 1 : Math.max(1, Math.round(cnt * (n === 1 ? 1.4 : 1) * k * k));
    for (let j = 0; j < many; j++) {
      const big = cnt <= 2, ang = n === 1 && big ? (j / many) * 2 * Math.PI : a0 + (a1 - a0) * (.15 + .7 * r());
      const rad = big && n === 1 && many === 1 ? 0 : Math.max(0, (R - pad * k) * (big ? .5 : Math.sqrt(.12 + .88 * r())));
      const x = +(cx + Math.cos(ang) * rad).toFixed(1), y = +(cy + Math.sin(ang) * rad).toFixed(1);
      const g = draw(x, y, r);
      out.push(k === 1 ? g : `<g transform="translate(${(x * (1 - k)).toFixed(2)} ${(y * (1 - k)).toFixed(2)}) scale(${k})">${g}</g>`);
    }
  }
  return out.join("");
}
function dishSVG(parts, box, seed, cls) {
  parts = parts || []; let bg = "", fg = "", cx = 50, cy = 50, R = 30;
  if (box === "ciotola") { bg = `<circle cx="50" cy="50" r="46" fill="#C9DCE8"/><circle cx="50" cy="50" r="39" fill="#F6F2EA" stroke="#A9C1D1" stroke-width="1.2"/>`; R = 26; }
  else if (box === "vetro") { bg = `<rect x="7" y="16" width="86" height="68" rx="12" fill="#DDEBF3" opacity=".35" stroke="#A9C6D8" stroke-width="2"/><rect x="12" y="21" width="76" height="58" rx="9" fill="#F3EFE6"/>`; R = 24; }
  else if (box === "tazza") { // tazza vista di lato con la torta, il resto accanto
    const rest = parts.filter(p => p !== "torta");
    bg = `<path d="M16,40 h44 v34 q0,12 -12,12 h-20 q-12,0 -12,-12z" fill="#E9EEF2" stroke="#9FB0BE" stroke-width="1.4"/><path d="M60,48 q12,0 12,10 q0,10 -12,10" fill="none" stroke="#9FB0BE" stroke-width="4"/><path d="M16,41 q0,-17 22,-17 q22,0 22,17z" fill="#8B5A2B" stroke="#5E3B1B" stroke-width="1"/><circle cx="31" cy="32" r="1.6" fill="#B07A45"/><circle cx="43" cy="29" r="1.4" fill="#B07A45"/><circle cx="50" cy="35" r="1.3" fill="#B07A45"/>`;
    fg = rest.length ? scatter(rest, 82, 78, 11, .62, seed) : ""; return wrapSVG(bg + fg, cls);
  }
  else if (box === "bicchiere") { bg = FD.shaker[2](50, 52) ; return wrapSVG(bg, cls); }
  else bg = `<circle cx="50" cy="50" r="47" fill="#E7DFD2"/><circle cx="50" cy="50" r="39" fill="#F7F3EC" stroke="#D8CCB8" stroke-width=".9"/>`;
  fg = scatter(parts, cx, cy, R, box === "ciotola" ? 1.2 : box === "vetro" ? 1.15 : 1.3, seed || "x");
  return wrapSVG(bg + fg, cls);
}
const wrapSVG = (inner, cls) => `<svg class="${cls || "dish"}" viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;
// strumenti dei passaggi, con dentro gli ingredienti
function toolSVG(tool, parts, seed) {
  let s = "", f = "";
  const P = (cx, cy, R, k) => scatter(parts || [], cx, cy, R, k * 1.45, seed);
  switch (tool) {
    case "friggitrice": s = `<rect x="10" y="12" width="80" height="78" rx="16" fill="#2B323C" stroke="#56616F" stroke-width="2"/><rect x="20" y="22" width="60" height="58" rx="9" fill="#F3EEE4"/><rect x="20" y="22" width="60" height="58" rx="9" fill="none" stroke="#C9BFAD" stroke-dasharray="1.5 3" stroke-width="1.2"/>`; f = P(50, 51, 21, .8); break;
    case "padella": s = `<rect x="78" y="45" width="22" height="9" rx="4" fill="#2B323C"/><circle cx="44" cy="50" r="38" fill="#2B323C" stroke="#56616F" stroke-width="2"/><circle cx="44" cy="50" r="31" fill="#3A424D"/>`; f = P(44, 50, 22, .85); break;
    case "pentola": s = `<rect x="2" y="44" width="12" height="11" rx="3" fill="#7D8995"/><rect x="86" y="44" width="12" height="11" rx="3" fill="#7D8995"/><circle cx="50" cy="50" r="38" fill="#9AA5B1"/><circle cx="50" cy="50" r="33" fill="#6F9CC4" opacity=".75"/>`; f = P(50, 50, 22, .85); break;
    case "ciotola": s = `<circle cx="50" cy="50" r="42" fill="#C9DCE8"/><circle cx="50" cy="50" r="35" fill="#F6F2EA" stroke="#A9C1D1" stroke-width="1.2"/>`; f = P(50, 50, 23, .85); break;
    case "microonde": s = `<rect x="6" y="18" width="88" height="64" rx="8" fill="#2B323C" stroke="#56616F" stroke-width="2"/><rect x="13" y="25" width="56" height="50" rx="5" fill="#E9DDB8" opacity=".9"/><circle cx="82" cy="34" r="4" fill="#8A96A4"/><circle cx="82" cy="47" r="4" fill="#8A96A4"/><rect x="77" y="58" width="10" height="10" rx="2" fill="#6D95FF"/>`; f = P(41, 51, 17, .62); break;
    case "contenitore": s = `<rect x="7" y="16" width="86" height="68" rx="12" fill="#DDEBF3" opacity=".35" stroke="#A9C6D8" stroke-width="2"/><rect x="12" y="21" width="76" height="58" rx="9" fill="#F3EFE6"/>`; f = P(50, 50, 22, .82); break;
    case "bollitore": s = `<path d="M24,84 h44 q6,0 6,-6 l-4,-40 q-1,-8 -9,-8 h-30 q-8,0 -9,8 l-4,40 q0,6 6,6z" fill="#56616F"/><path d="M70,40 q14,2 16,-12" fill="none" stroke="#56616F" stroke-width="5" stroke-linecap="round"/><rect x="36" y="22" width="20" height="8" rx="3" fill="#2B323C"/><path d="M80,16 q4,-5 0,-10M88,18 q4,-5 0,-10" stroke="#A9C6D8" stroke-width="2" fill="none" stroke-linecap="round"/>`; break;
    case "cuociriso": s = `<rect x="16" y="34" width="68" height="52" rx="16" fill="#E9EEF2" stroke="#9FB0BE" stroke-width="2"/><path d="M16,42 q34,-26 68,0z" fill="#CBD5DD" stroke="#9FB0BE" stroke-width="2"/><rect x="44" y="20" width="12" height="7" rx="3" fill="#56616F"/><rect x="40" y="58" width="20" height="10" rx="3" fill="#2B323C"/><circle cx="50" cy="63" r="2" fill="#7FD6AA"/>`; break;
    case "tagliere": s = `<rect x="8" y="22" width="74" height="60" rx="10" fill="#C99A62" stroke="#9B7041" stroke-width="2"/><circle cx="74" cy="30" r="3" fill="#9B7041"/><path d="M86,20 l8,-8 l3,3 l-26,40 l-4,-3z" fill="#B8C3CC" stroke="#7D8995"/>`; f = P(42, 54, 20, .85); break;
    default: return dishSVG(parts, "piatto", seed, "tool");
  }
  return wrapSVG(s + f, "tool");
}
const TOOLN = { friggitrice: "Friggitrice ad aria", padella: "Padella", pentola: "Pentola", ciotola: "Ciotola", microonde: "Microonde", contenitore: "Contenitore", bollitore: "Bollitore", cuociriso: "Cuociriso", tagliere: "Tagliere", piatto: "Nel piatto" };

// ---------- piatto del giorno (5 spicchi che si colorano) ----------
const RING = ["col", "s1", "pr", "s2", "ce"];
function plateSVG(d, size) {
  const day = fDay(d), m = day.m || {}, n = RING.length, R = 46, r0 = 22;
  const arc = (i, rr) => { const a0 = (i / n) * 2 * Math.PI - Math.PI / 2 + .035, a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2 - .035, p = (a, q) => `${(50 + Math.cos(a) * q).toFixed(2)},${(50 + Math.sin(a) * q).toFixed(2)}`;
    return `M${p(a0, rr)} A${rr},${rr} 0 0 1 ${p(a1, rr)} L${p(a1, r0)} A${r0},${r0} 0 0 0 ${p(a0, r0)}Z`; };
  const seg = RING.map((id, i) => { const v = mealV(day, id), md = mealDef(id), st = v === "skip" ? "skip" : v ? "on" : "";
    return `<path class="pseg ${st}" style="--c:${md.color}" d="${arc(i, R)}"/>`; }).join("");
  return `<svg class="plate${size ? " " + size : ""}" viewBox="0 0 100 100" aria-hidden="true"><defs><pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0,0v4" stroke="rgba(255,255,255,.18)" stroke-width="1.6"/></pattern></defs><circle cx="50" cy="50" r="49" class="rim"/>${seg}<circle cx="50" cy="50" r="${r0 - 2}" class="mid"/></svg>`;
}
const dayDone = d => { const day = fDay(d), v = k => mealV(day, k); return ["col", "pr", "ce"].every(k => v(k) && v(k) !== "skip") && (!isGym(d) || (v("s2") && v("s2") !== "skip")); };
const nextMeal = d => { const day = fDay(d); const id = RING.find(k => !mealV(day, k)); return id ? mealDef(id).name : null; };

// ---------- vista ----------
function renderCibo() {
  FOOD(); syncProds(); syncAif(); syncRecipes(); const box = $("cbody"); if (!box) return;
  document.querySelectorAll("#cseg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.ct === CS.tab));
  if (CS.tab === "oggi") renderOggi(box); else if (CS.tab === "ricette") renderRicette(box); else if (CS.tab === "simula") renderSimula(box); else if (CS.tab === "scambi") renderScambi(box); else renderSpesa(box);
}
document.querySelectorAll("#cseg button").forEach(b => b.onclick = () => { CS.tab = b.dataset.ct; CS.xform = null; renderCibo(); scrollTo(0, 0); });

const ddShort = iso => { const t = new Date(iso + "T12:00"); return { w: t.toLocaleDateString("it-IT", { weekday: "short" }).replace(".", ""), n: t.getDate() }; };
const addDays = (iso, n) => { const t = new Date(iso + "T12:00"); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); };
const CHEER = { col: ["Colazione fatta 👌", "Si parte bene ☀️", "Colazione ok 💪"], s1: ["Spuntino ok 👍", "Benzina nel motore ⛽"], pr: ["Pranzo segnato 🍽", "Pranzo fatto 💪", "Ottima scelta 👌"], s2: ["Spuntino fatto 👍", "Recupero servito 💪"], ce: ["Cena segnata 🌙", "Cena fatta 👌"], dc: ["Dopo cena ok 🌙"] };

function renderOggi(box) {
  const d = cDay(), today = todayISO(), day = fDay(d), gym = isGym(d), auto = gymAuto(d), m = day.m || {};
  const days = [...Array(7)].map((_, i) => addDays(today, i - 5));
  const nm = nextMeal(d), done = dayDone(d);
  let h = `<div class="cdays">${days.map(x => { const s = ddShort(x); return `<button data-cd="${x}" aria-pressed="${x === d}"><small>${x === today ? "oggi" : x > today ? "domani" : s.w}</small>${plateSVG(x, "pmini")}<b>${s.n}</b></button>`; }).join("")}</div>`;
  if (!FOOD().full) { h += oggiSemplice(d); box.innerHTML = h; afterOggi(box, d); return; }
  h += `<button class="lnk wide vsw" data-vfull="0"><i>✨</i>Vista semplice</button>`;
  // 🏋️ la mattina (o la sera prima, per domani): se ti alleni più tardi, il pranzo deve già saperlo (scala 80/40/0)
  if (d >= today && day.gym == null && !auto) h += `<div class="card gask"><div><b>🏋️ ${d === today ? "Oggi" : "Domani"} ti alleni?</b><small>Decide il pranzo: 80 g di carboidrato se sì, ${isGym(addDays(d, -1)) ? "40" : "niente"} se no. Quando registri l'allenamento lo sa da solo.</small></div><div class="seg2"><button data-gym="1">Sì</button><button data-gym="0">No</button></div></div>`;
  h += `<div class="cplate"><div class="pwrap">${plateSVG(d)}<div class="pmid">${done ? `<b>✓</b><small>tutto<br>fatto</small>` : nm ? `<small>prossimo</small><b>${esc(nm)}</b>` : `<b>👌</b>`}</div></div>
    <div class="pside"><div class="pgym"><span>Palestra ${d === today ? "oggi" : "quel giorno"}</span><div class="seg2"><button data-gym="1" aria-pressed="${gym}">Sì</button><button data-gym="0" aria-pressed="${!gym}">No</button></div>${auto && day.gym == null ? `<small>dall'allenamento</small>` : ""}</div>
    <div class="pgym"><span>Turno</span><div class="seg4">${CB.shifts.map(x => `<button data-sh="${x.id}" aria-pressed="${day.turno === x.id}">${esc(x.t)}</button>`).join("")}</div></div>
    <p class="phint">${esc(dayHint(d))}</p></div></div>`;
  h += todayPlan(d) + shotBtn() + balanceCard(d) + bagCard(d);
  h += barCard(day) + frzCard(d);
  // 20/11/2026 ("ci sono tanti piatti da scegliere, migliora il layout"): per ogni pasto le 3 idee più adatte (già segnata, frigo,
  // pasto 2 della ricetta del pranzo, compatibili col turno, quelle che usi di più, i tuoi piatti) + "Altre idee" con ricerca;
  // un pasto già segnato si chiude in una riga (tocco = dettagli, "Cambia" = di nuovo le idee).
  for (const md of CB.meals) h += mealCard(md, d);
  const loose = (day.x || []).filter(x => (!x.meal || x.meal === "fuori") && !x.bar);
  h += `<div class="meal extra"><div class="mh"><i></i><b>Fuori pasto</b><span>quello che non è nelle caselle</span></div>${loose.map(x => xRow(x)).join("")}${CS.xform && CS.xform.meal === "fuori" ? xForm() : `<button class="cmore" data-xadd="fuori">+ Aggiungi un cibo</button>`}</div>`;
  h += weekCard(d);
  box.innerHTML = h; afterOggi(box, d);
}
// ---------- ✨ VISTA SEMPLICE di Oggi (24/11/2026, "molte scelte: rendila più easy per una persona pigra, senza eliminare funzioni") ----------
// In cima solo quello che serve adesso: com'è la giornata (una riga), quanto hai mangiato (una riga), il pasto di ADESSO aperto,
// cosa cucinare, 3 azioni rapide. Gli altri pasti sono righe (tocco = si aprono), la settimana è una riga. Tutto il resto è dove era,
// a un tocco. "Vista completa" in fondo rimette la schermata di prima (FOOD().full).
function heroMeal(d) {
  const day = fDay(d), free = k => !mealV(day, k);
  if (d !== todayISO()) return RING.find(free) || null;
  const t = new Date(), hr = t.getHours() + t.getMinutes() / 60, i0 = hr < 10.5 ? 0 : hr < 12 ? 1 : hr < 15.5 ? 2 : hr < 18.5 ? 3 : 4;
  return RING.slice(i0).find(free) || RING.find(free) || null;
}
function mealRow(md, d) {
  const day = fDay(d), m = day.m || {}, v = m[md.id], xs = (day.x || []).filter(x => x.meal === md.id), sel = v && v !== "skip" ? optOf(md, v, d) : null;
  let kc = sel ? (optVal(md.id, v, d) || [0])[0] : 0; kc += xs.reduce((a, x) => a + ((xVal(x) || [0])[0]), 0);
  const st = v === "skip" ? "saltato" : sel ? sel.t : xs.length ? xs.map(x => x.t).join(", ") : md.extra ? "facoltativo" : "da segnare";
  return `<button class="mrow${v || xs.length ? " done" : ""}${v === "skip" ? " skipped" : ""}" style="--c:${md.color}" data-mrow="${md.id}"><i></i><b>${esc(md.name)}</b><span>${v && v !== "skip" || xs.length ? "✓ " : ""}${esc(st)}</span>${kc && !(sel && sel.free) ? `<em>${r50(kc)} kcal</em>` : ""}<u>›</u></button>`;
}
function oggiSemplice(d) {
  const today = todayISO(), day = fDay(d), m = day.m || {}, gym = isGym(d), auto = gymAuto(d), sh = shiftOf(d), done = dayDone(d), T = dayTarget(d), { t, free } = dayVals(d);
  let h = "";
  // 1 · com'è la giornata: si chiede una volta (palestra + turno), poi diventa una riga
  const ask = d >= today && ((day.gym == null && !auto) || !day.turno);
  if (ask || CS.setOpen) h += `<div class="card dset"><h3>${d === today ? "Com'è oggi?" : d > today ? "Com'è domani?" : "Com'era quel giorno?"}</h3>
    <div class="pgym"><span>🏋️ Palestra</span><div class="seg2"><button data-gym="1" aria-pressed="${day.gym === true || (day.gym == null && auto)}">Sì</button><button data-gym="0" aria-pressed="${day.gym === false}">No</button></div>${auto && day.gym == null ? `<small>dall'allenamento</small>` : ""}</div>
    <div class="pgym"><span>🕐 Turno</span><div class="seg4">${CB.shifts.map(x => `<button data-sh="${x.id}" aria-pressed="${day.turno === x.id}">${esc(x.t)}</button>`).join("")}</div></div>
    ${!ask ? `<button class="btn sm primary" data-setok>Fatto</button>` : `<p class="note">Lo chiedo una volta: decide quanta pasta a pranzo e cosa cucinare.</p>`}</div>`;
  else h += `<button class="dline" data-setopen><span>${gym ? "🏋️ Palestra" : "🛋 Niente palestra"}${sh ? ` · ${esc(sh.t)}` : ""} · pranzo da ${lunchLvl(d)}</span><i>✎</i></button>`;
  // 2 · quanto hai mangiato, in una riga (tocco = dettaglio con proteine, carboidrati, grassi)
  const pc = t[0] / T[0], ov = pc > 1.25 ? " hi2" : pc > 1.1 ? " hi" : "";
  h += `<button class="kline${ov}" data-bal>${plateSVG(d, "pmini")}<div><b>${done ? "✓ Giornata completa · " : ""}~${fmt(r50(t[0]))} <small>/ ${fmt(T[0])} kcal</small></b><span class="bbar s${ov}"><i style="width:${Math.min(100, pc * 100).toFixed(0)}%"></i></span></div><u>${CS.balOpen ? "⌃" : "›"}</u></button>`;
  if (CS.balOpen) h += balanceCard(d) || `<p class="note">Segna il primo pasto e qui vedi proteine, carboidrati e grassi del giorno.</p>`;
  if (free) h += `<p class="note">🍕 Pasto libero oggi: i conti non contano, domani normale.</p>`;
  // 3 · il pasto di ADESSO, aperto; cosa cucinare subito sopra se è pranzo o cena
  const hid = heroMeal(d), plan = todayPlan(d, true);
  if (hid && (hid === "pr" || hid === "ce")) h += plan;
  if (hid) h += mealCard(mealDef(hid), d, { hero: true });
  if (!(hid && (hid === "pr" || hid === "ce"))) h += plan;
  // 4 · azioni rapide
  const B = (day.x || []).filter(x => x.bar), loose = (day.x || []).filter(x => (!x.meal || x.meal === "fuori") && !x.bar);
  h += `<div class="qacts"><label class="qa" for="shotIn"><span>📷</span><b>Foto del piatto</b></label><input type="file" id="shotIn" accept="image/*" capture="environment" hidden>
    <button class="qa${CS.barOpen ? " on" : ""}" data-qa="bar"><span>☕</span><b>Caffè${B.length ? ` ×${B.length}` : ""}</b></button>
    <button class="qa${CS.xform && CS.xform.meal === "fuori" ? " on" : ""}" data-xadd="fuori"><span>✎</span><b>Fuori pasto${loose.length ? ` ×${loose.length}` : ""}</b></button></div>`;
  if (CS.barOpen) h += barCard(day);
  if (loose.length || (CS.xform && CS.xform.meal === "fuori")) h += `<div class="meal extra"><div class="mh"><i></i><b>Fuori pasto</b><span>quello che non è nelle caselle</span></div>${loose.map(x => xRow(x)).join("")}${CS.xform && CS.xform.meal === "fuori" ? xForm() : ""}</div>`;
  h += frzCard(d);
  const bag = bagCard(d); if (bag) h += CS.bagOpen ? bag : `<button class="dline" data-bag><span>🎒 Da portare al lavoro</span><i>›</i></button>`;
  // 5 · gli altri pasti: una riga ciascuno, tocco = si apre (si apre da solo se ci stai scrivendo o lo stai cambiando)
  const others = CB.meals.filter(md => md.id !== hid);
  h += `<h2 class="mh2">${hid ? "Gli altri pasti" : "I pasti di oggi"}</h2>`;
  for (const md of others) {
    const open = (CS.mopen || {})[md.id] || (CS.xform && CS.xform.meal === md.id) || (CS.mexp || {})[md.id];
    h += open ? mealCard(md, d, { fold: true, force: true }) : mealRow(md, d);
  }
  // 6 · la settimana, in una riga
  h += CS.wkOpen ? weekCard(d) + `<button class="lnk wide" data-wk><i>⌃</i>Chiudi la settimana</button>` : `<button class="dline dwk" data-wk><span>📅 Questa settimana · pasti liberi ${freeInWeek(d)} di 2 · fame, energia, sonno</span><i>›</i></button>`;
  h += `<button class="lnk wide vsw" data-vfull="1"><i>☰</i>Vista completa (tutto aperto)</button>`;
  return h;
}
function afterOggi(box, d) {
  box.querySelectorAll(".tiles").forEach(t => { const x = t.querySelector(".tile.on"), on = x && (x.closest(".tilew") || x); if (on && on.offsetLeft + on.offsetWidth > t.clientWidth) t.scrollLeft = on.offsetLeft - 14; });
  bindOggi(box, d); frzBind(box); shotBind();
}
// un pasto di Oggi (scheda completa con idee, tabellina del PT, scritti a mano). o.hero = "Adesso", o.fold = si può richiudere in una riga
function mealCard(md, d, o) {
  o = o || {}; const day = fDay(d), m = day.m || {};
    const v = m[md.id];
    if (!o.force && md.extra && !v && !(m.s1 === "skip" && m.s2 === "skip") && !CS.showDc) return `<button class="cmore" data-dc="1">+ Dopo cena (facoltativo)</button>`;
    const opts = optsFor(md, d), sel = v && v !== "skip" ? optOf(md, v, d) : null, w = whereOf(d, md.id);
    const xs = (day.x || []).filter(x => x.meal === md.id), xk = xs.reduce((a, x) => a + ((xVal(x) || [0])[0]), 0);
    const kc = (sel && optVal(md.id, v, d) ? optVal(md.id, v, d)[0] : 0) + xk, bq = sel && !sel.dish ? baseQ(md.id, v, d) : null, kp = bq ? valOfQ(bq)[0] : 0, kov = kp && kc > kp * 1.25 ? " hi2" : kp && kc > kp * 1.1 ? " hi" : "";
    const open = !(sel || v === "skip") || (CS.mexp || {})[md.id];
    let h = "";
    // 📏 valori del pasto (casella + scritti a mano) per il confronto col PT
    let mv = null; if (v !== "skip" && (sel || xs.length)) { const a = sel ? optVal(md.id, v, d) : null; mv = [0, 0, 0, 0]; if (a) a.forEach((x, i) => mv[i] += x); for (const x of xs) { const t = xVal(x); if (t) t.forEach((y, i) => mv[i] += y || 0); } if (sel && sel.free) mv = null; }
    h += `<div class="meal${v || xs.length ? " done" : ""}${v === "skip" ? " skipped" : ""}${o.hero ? " hero" : ""}" style="--c:${md.color}" data-mid="${md.id}">${o.hero ? `<p class="mhero">Adesso</p>` : ""}<div class="mh"><i></i><b>${esc(md.name)}</b><span>${v === "skip" ? "saltato" : sel ? "" : xs.length ? "scritto da te" : esc(mealSub(md, d))}</span>${kc ? `<em class="mk${kov}">~${r50(kc)} kcal${kov ? ` · +${r50(kc - kp)}` : ""}</em>` : ""}${o.fold ? `<button class="mfold" data-mfold="${md.id}" aria-label="Chiudi">⌃</button>` : ""}</div>${v === "skip" ? "" : ptStrip(md.id, d, mv)}${WHERE[w] && open ? `<p class="mwhere">${WHERE[w]}</p>` : ""}`;
    if (sel && !open) {
      const pic = (sel.r || sel.dish) && foodPic(sel.r || sel.id), img = sel.free ? `<span class="ti">🍕</span>` : pic ? `<img src="${pic}" alt="">` : dishSVG(sel.p || [], sel.box, sel.id, "dish");
      h += `<div class="msel"><button class="mselb" data-m="${md.id}" data-o="${sel.id}">${img}<div><b>${esc(sel.t)}</b><small>${sel.free && (day.lib || {})[md.id] ? "🎉 " + esc(((day.lib[md.id].t || "") || day.lib[md.id].it.map(([f]) => shortN(f)).join(", ")).slice(0, 50)) + (day.lib[md.id].it.length ? ` · ~${r50(valOfQ(day.lib[md.id].it)[0])} kcal fuori conto` : "") : (day.note || {})[md.id] ? "✎ " + esc((day.note || {})[md.id].split("\n")[0].slice(0, 60)) : esc(detOf(md, sel, m))}${day.q && day.q[md.id] && !sel.dish ? " · modificato" : ""}</small></div><span class="chev">›</span></button>
        <div class="mselx"><button class="lnk" data-mexp="${md.id}"><i>🔄</i>Cambia</button>${sel.r ? `<button class="lnk" data-rec="${sel.r}"><i>📖</i>Ricetta</button>` : ""}<button class="lnk no" data-qm="${md.id}" data-qo="${sel.id}"><i>✕</i>Togli</button></div></div>
        ${w !== "casa" && w !== "mensa" && sel.porta ? `<p class="mdet porta">🎒 ${esc(sel.porta)}</p>` : ""}`;
    } else if (v === "skip" && !open) {
      h += `<div class="mselx"><button class="lnk" data-mexp="${md.id}"><i>🔄</i>Cambia</button></div>`;
    } else {
      const top = rankOpts(md, d, opts), show = top.length <= 4 ? top : top.slice(0, 3), more = top.length - show.length;
      h += `<div class="tiles4">${show.map(o => tile(md, o, v === o.id, md.id === "ce" && o.id === m.pr && !!recipeById(o.id) && !recipeById(o.id).one, !fits(o, w))).join("")}${more ? `<button class="tile moret" data-more="${md.id}"><span class="ti">＋</span><b>Altre idee</b><i class="tw">${more}</i></button>` : ""}</div>
        <div class="mselx"><button class="lnk" data-xadd="${md.id}"><i>✎</i>Scrivo io</button>${md.skip ? `<button class="lnk" data-skip="${md.id}">${v === "skip" ? "<i>↩</i>Non l'ho saltato" : "<i>⤼</i>L'ho saltato"}</button>` : ""}${(CS.mexp || {})[md.id] ? `<button class="lnk" data-mclose="${md.id}"><i>⌃</i>Chiudi</button>` : ""}</div>`;
    }
    h += `${xs.map(x => xRow(x)).join("")}${CS.xform && CS.xform.meal === md.id ? xForm() : ""}</div>`;
    return h;
}
// quante volte hai scelto ogni casella di quel pasto nelle ultime 4 settimane
function useCounts(mid, d) { const c = {}; for (let i = 1; i <= 28; i++) { const v = (fDay(addDays(d, -i)).m || {})[mid]; if (v) c[v] = (c[v] || 0) + 1; } return c; }
function rankOpts(md, d, opts) {
  const m = fDay(d).m || {}, w = whereOf(d, md.id), use = useCounts(md.id, d), r2 = recipeById(m.pr);
  const sc = o => (o.id === m[md.id] ? 1e4 : 0) + (o.fr ? 5000 : 0) + (md.id === "ce" && o.id === m.pr && r2 && !r2.one ? 3000 : 0) + (w === "mensa" && o.id === "mensa" ? 2000 : 0) + (o.id === "sala" && md.id === "pr" && (shiftOf(d) || {}).id === "mat" && new Date(d + "T12:00").getDay() === 6 ? 2500 : 0)
    + (fits(o, w) ? 0 : -1000) + (w !== "casa" && o.easy ? 80 : 0) + (use[o.id] || 0) * 60 + (o.dish ? 25 + (myDish()[o.id.slice(2)] || {}).n * 10 : 0) + (o.free || o.id === "altro" || o.id === "rist" || o.id === "mensa" || o.id === "sala" ? -300 : 0);
  // 22/11/2026: nei giorni "0" a pranzo niente carboidrato → pasta al tonno, gnocchi, pizza di piadina… restano in fondo
  const z = o => md.id === "pr" && lunchLvl(d) === 0 && STRICT.has(o.r || o.id) && o.id !== m.pr ? -700 : 0;
  return opts.map((o, i) => [o, sc(o) + z(o) - i * 0.01]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
}
// tutte le idee di un pasto, con ricerca e filtri
function openPicker(mid) {
  const md = mealDef(mid), d = cDay(), sh = $("fsheet"), w = whereOf(d, mid), m = fDay(d).m || {}; CS.pick = CS.pick && CS.pick.mid === mid ? CS.pick : { mid, q: "", f: "all" };
  const P = CS.pick, all = rankOpts(md, d, optsFor(md, d));
  const F = [["all", "Tutte"], ...(w !== "casa" ? [["work", "Per il lavoro"]] : []), ["fast", "Veloci"], ["mine", "Le mie"], ...(md.main ? [["rec", "Ricette"]] : [])];
  const ok = o => (!P.q || normT(o.t + " " + (o.d || "")).includes(normT(P.q))) && (P.f === "all" || (P.f === "work" && fits(o, w)) || (P.f === "fast" && (o.easy || (o.r && (recipeById(o.r) || {}).min <= 12))) || (P.f === "mine" && (o.dish || (o.r && (recipeById(o.r) || {}).mine) || o.fr)) || (P.f === "rec" && o.r));
  const L = all.filter(ok);
  sh.querySelector(".is-h").innerHTML = `<b>${esc(md.name)} · tutte le idee</b><span class="rmeta">${all.length} idee${WHERE[w] ? " · " + WHERE[w] : ""}</span>`;
  sh.querySelector(".is-c").innerHTML = `<input id="pkQ" class="pkq" placeholder="Cerca (es. pollo, pasta, uova)" value="${esc(P.q)}" autocomplete="off">
    <div class="rfil">${F.map(([k, n]) => `<button class="chip" data-pf="${k}" aria-pressed="${P.f === k}">${n}</button>`).join("")}</div>
    <div class="pkgrid">${L.map(o => tile(md, o, m[mid] === o.id, mid === "ce" && o.id === m.pr && !!recipeById(o.id) && !recipeById(o.id).one, !fits(o, w))).join("") || `<p class="note">Niente con questo nome: prova "✎ Scrivo io".</p>`}</div>`;
  if (sh.hidden) showSheet(sh);
  const bindG = () => { sh.querySelectorAll(".pkgrid .tile[data-m]").forEach(b => b.onclick = () => openOpt(b.dataset.m, b.dataset.o));
    sh.querySelectorAll(".pkgrid [data-qm]").forEach(b => b.onclick = () => { const was = (fDay(d).m || {})[b.dataset.qm] === b.dataset.qo; logMeal(d, b.dataset.qm, b.dataset.qo, was); closeRecipe(); delete (CS.mexp || {})[mid]; renderCibo(); }); };
  bindG();
  sh.querySelectorAll("[data-pf]").forEach(b => b.onclick = () => { P.f = b.dataset.pf; openPicker(mid); });
  const q = $("pkQ"); q.oninput = () => { P.q = q.value; const g = sh.querySelector(".pkgrid"); g.innerHTML = all.filter(ok).map(o => tile(md, o, m[mid] === o.id, false, !fits(o, w))).join("") || `<p class="note">Niente con questo nome: prova "✎ Scrivo io".</p>`; bindG(); };
}
function detOf(md, o, m) { // pranzo = pasto 1 della ricetta, cena con la stessa ricetta = pasto 2
  const r = o.r && md.main && recipeById(o.r); if (!r || r.one) return o.d || "";
  if (md.id === "ce" && m.pr === r.id) return "Pasto 2: " + r.p2;
  if (md.id === "pr") return "Pasto 1: " + r.p1 + ". Il pasto 2 è per la cena (o per domani).";
  return o.d || "";
}
// 🎒 Borsa per il lavoro (20/11/2026): al lavoro la mattina non ha attrezzi, il pomeriggio solo il microonde
// ---------- stima di kcal e nutrienti (20/11/2026, richiesta dell'utente: "mi fa piacere saperlo", senza ossessione) ----------
// Valori già calcolati per ogni casella; i cibi scritti a mano contano se hanno le kcal (anche dalla risposta di Claude).
function optVal(mid, oid, d) {
  if (!oid || oid === "skip" || oid === "libero") return null;
  const L = curQ(d, mid, oid); if (L) return valOfQ(L);
  if (mid === "pr" || mid === "ce") { const b = CB.mainVals[oid]; if (!b) return null; const L = lunchLvl(d), c = CB.carbCtx[mid === "ce" ? "ce" : L === 80 ? "prG" : L === 40 ? "pr" : "pr0"]; return b.map((x, i) => x + c[i]); }
  const k = (mid === "s2" && isGym(d) && CB.vals["s2g." + oid]) ? "s2g." + oid : mid + "." + oid;
  return CB.vals[k] || CB.vals["s2g." + oid] || null;
}
function dayVals(d) {
  const day = fDay(d), m = day.m || {}, t = [0, 0, 0, 0]; let free = 0, nox = 0, any = 0;
  for (const mid of [...RING, "dc"]) { const v = m[mid]; if (v === "libero") { free++; continue; } const x = optVal(mid, v, d); if (x) { any++; x.forEach((n, i) => t[i] += n); } }
  for (const e of day.x || []) { if (e.lib) { free++; continue; } const v = xVal(e); if (v) { any++; v.forEach((n, i) => t[i] += n); } else if (!e.bar) nox++; }
  return { t, free, nox, any };
}
// valori di un cibo scritto a mano: kcal scritte o di Claude, altrimenti letti dal testo
function xVal(e) { if (e.k) return [e.k, e.p || 0, e.c || 0, e.f || 0]; if (e.it && e.it.length) return valOfQ(e.it); const r = readFood(e.t, e.s); return r.items.length ? r.t : null; }
const r50 = n => Math.round(n / 50) * 50;
function balanceCard(d) {
  const { t, free, nox, any } = dayVals(d); if (!any && !free) return "";
  const T = dayTarget(d), done = dayDone(d), m = fDay(d).m || {};
  const pc = t[0] / T[0], N = [["Proteine", 1], ["Carboidrati", 2], ["Grassi", 3]];
  let msg;
  if (free) { const lk = libKcal(d)[0]; msg = `Con un pasto libero oggi${lk ? ` (~${r50(lk)} kcal, fuori conto)` : ""} i conti non contano: domani si riparte normale, senza compensare.`; }
  else if (!done) { const left = RING.filter(k => !mealV(fDay(d), k)).map(k => mealDef(k).name.toLowerCase()); msg = left.length ? `Mancano ancora: ${left.join(", ")}.` : "Quasi fatto."; }
  else if (pc > 1.12) msg = `Oggi un po' sopra al piano (circa +${r50(t[0] - T[0])} kcal). Va bene così: domani normale, senza compensare.`;
  else if (pc < .85) msg = "Oggi un po' sotto al piano: se hai fame, il dopo cena è lì apposta.";
  else msg = "In linea col piano 👌";
  if (done && !free && t[1] < 120) msg += " Proteine un po' basse oggi: domani scegli spuntini con bresaola, fiocchi o uova.";
  // 20/11/2026 (richiesta dell'utente): sopra al piano le barre si colorano (arancio oltre +10%, rosso oltre +25%); le proteine in più vanno bene
  const over = r => r > 1.25 ? " hi2" : r > 1.1 ? " hi" : "";
  return `<div class="card bal"><div class="bh${over(pc)}"><b>~${fmt(r50(t[0]))} kcal</b><span>stima di oggi · piano ~${fmt(T[0])}${pc > 1.1 ? ` · <i class="ovr">+${fmt(r50(t[0] - T[0]))}</i>` : ""}</span></div>
    <div class="bbar${over(pc)}"><i style="width:${Math.min(100, pc * 100).toFixed(0)}%"></i></div>
    <div class="bmac">${N.map(([n, i]) => { const r = t[i] / T[i], o = i === 1 ? "" : over(r); return `<div class="${o}"><small>${n}</small><b>${Math.round(t[i])} g${o ? ` <i class="ovr">+${Math.round(t[i] - T[i])}</i>` : ""}</b><span class="bbar s${o}"><i style="width:${Math.min(100, r * 100).toFixed(0)}%"></i></span><em>su ~${T[i]}</em></div>`; }).join("")}</div>
    <p class="note">${esc(msg)}${nox ? ` · ${nox} cib${nox > 1 ? "i" : "o"} scritt${nox > 1 ? "i" : "o"} che non ho capito: non contat${nox > 1 ? "i" : "o"}.` : ""}</p></div>`;
}
function bagCard(d) {
  const sh = shiftOf(d); if (!sh || !sh.prep) return "";
  const m = fDay(d).m || {}, rows = [];
  for (const md of CB.meals) { const w = whereOf(d, md.id); if (w !== "zero" && w !== "micro") continue;
    const v = m[md.id], sel = v && v !== "skip" ? optOf(md, v, d) : null;
    const sug = optsFor(md, d).filter(o => fits(o, w) && !o.free && o.id !== "altro").slice(0, 3).map(o => o.t);
    rows.push(`<li><b>${esc(md.name)}</b> <small>${w === "zero" ? "niente attrezzi" : "microonde"}</small><br>${sel ? `${esc(sel.t)}${sel.porta ? ` — ${esc(sel.porta)}` : ""}` : v === "skip" ? "saltato" : `<span class="mut">da scegliere: ${esc(sug.join(" · "))}</span>`}</li>`); }
  if (!rows.length) return "";
  return `<div class="card bag"><h3>🎒 Da portare al lavoro</h3><p class="note">${esc(sh.prep)}</p><ul>${rows.join("")}</ul><p class="note">${esc(CB.bagNote)}</p></div>`;
}
function mealSub(md, d) {
  const g = isGym(d);
  if (md.id === "pr") { const L = CB.lunch[lunchLvl(d)]; return `${L.t}: ${L.d}`; }
  if (md.id === "ce") return "patate 300 g · pane 100 g · pasta 65 g";
  if (md.id === "s2") return g ? "dopo la palestra · non si salta" : "si può saltare";
  if (md.id === "s1") return "si può saltare";
  if (md.id === "dc") return "solo se hai saltato i 2 spuntini o hai fame";
  return "scegli una casella";
}
function dayHint(d) {
  const m = fDay(d).m || {}, g = isGym(d);
  if (m.s1 === "skip" && m.s2 === "skip" && !m.dc) return "Hai saltato i 2 spuntini: stasera fai il dopo cena.";
  if (dayDone(d)) return "Tutto segnato. Domani si ricomincia, senza recuperare niente.";
  if (g && !m.s2) return "Giorno di palestra: pranzo da 80 e spuntino 2 dopo l'allenamento.";
  if (!g && !m.pr) return lunchLvl(d) === 40 ? "Giorno dopo la palestra: pranzo da 40. Uno spuntino si può saltare." : "2° giorno senza palestra: pranzo senza carboidrato, con doppia verdura. Cena normale.";
  const fr = freeInWeek(d); if (fr >= 2) return "Hai già i 2 pasti liberi della settimana: il resto come da piano.";
  return "Tocca la casella di quello che hai mangiato.";
}
function tile(md, o, on, p2, off) {
  const pic = (o.r || o.dish) && foodPic(o.r || o.id);
  const img = o.free ? `<span class="ti">🍕</span>` : pic ? `<img src="${pic}" alt="">` : o.p ? dishSVG(o.p, o.box, o.id, "dish") : `<span class="ti">🍽</span>`;
  return `<div class="tilew"><button class="tile${on ? " on" : ""}${o.free ? " free" : ""}${off && !on ? " off" : ""}" data-m="${md.id}" data-o="${o.id}">${img}<b>${esc(o.t)}</b>${p2 ? `<em>pasto 2</em>` : ""}${off ? `<i class="tw">${o.go === "m" ? "serve microonde" : "a casa"}</i>` : o.easy ? `<i class="tw ez">pronto · 2 cose</i>` : o.r ? `<i class="tw">ricetta</i>` : ""}${tilePt(md, o, cDay())}</button><button class="qk${on ? " on" : ""}" data-qm="${md.id}" data-qo="${o.id}" aria-label="${on ? "Togli" : "Segna come mangiato"}">✓</button></div>`;
}
const SIZES = { p: "poco", n: "normale", t: "tanto" };
const xRow = x => { const r = !x.k && !x.it && readFood(x.t, x.s), v = xVal(x);
  const what = x.it && x.it.length ? x.it.filter(([, q]) => q).map(([f, q]) => qText(f, q)).join(" · ") : "";
  const pp = drawOf(x.it || (r ? r.items.map(i => [i.f, i.q]) : []));
  return `<div class="xrow">${pp.length ? dishSVG(pp, null, x.id, "xico") : `<span>✎</span>`}<div><b>${esc(x.t)}</b>${what ? `<small>${esc(what)}</small>` : ""}<small>${x.lib ? "🎉 sgarro · fuori conto · " : ""}${x.it ? "" : (SIZES[x.s] || "") + " · "}${v ? `~${v[0]} kcal${x.k && x.p != null ? ` · P ${x.p} · C ${x.c} · G ${x.f}` : x.k ? "" : x.it ? "" : " (letto dal testo)"}` : "non ho capito: kcal non contate"}</small>${r && r.miss.length && r.items.length ? `<small class="xmiss">Non ho capito: «${esc(r.miss.join("», «"))}»</small>` : ""}</div><button class="bx" data-xdel="${x.id}" aria-label="Elimina">✕</button></div>`; };
// cosa ha capito l'app (dal testo o dalla risposta di Claude): righe modificabili come nelle ricette
function xParse(f) {
  if (!f) return "";
  let miss = f.cmiss || [];
  if (!f.ed) { const r = readFood(f.t || "", f.s); f.it = r.items.map(i => [i.f, i.q]); miss = r.miss; }
  const t = valOfQ(f.it);
  return `${f.it && f.it.length ? `<p class="plab">Ho capito · se è diverso tocca − / + o il numero</p><div class="xrows">${rowsHTML(f.it)}</div><p class="qtot"><b>~${fmt(t[0])} kcal</b><span>proteine ${t[1]} g · carboidrati ${t[2]} g · grassi ${t[3]} g</span></p>` : ""}${f.cl ? `<p class="note">Claude aveva stimato ~${f.cl.k} kcal in tutto.</p>` : ""}${miss.length ? `<p class="xpno">Non ho capito: «${esc(miss.join("», «"))}». ${aiOn() ? "" : ` Scrivilo più semplice (es. "80 g di pasta", "2 biscotti") o chiedi a Claude con 📷.`}</p>${aiOn() ? `<button class="btn sm primary" id="xAi">✨ Fallo capire all'IA</button>` : ""}${stimaBox()}` : ""}${f.ed && (f.t || "").trim() ? `<button class="lnk" id="xReread"><i>↺</i>Rileggi dal testo</button>` : ""}`;
}
function xForm() {
  const f = CS.xform, d = cDay(), sv = f.meal && f.meal !== "fuori" ? (fDay(d).m || {})[f.meal] : null, so = sv && sv !== "skip" ? optOf(mealDef(f.meal), sv, d) : null;
  // 20/11/2026: scrivere in un pasto già segnato SOSTITUISCE la casella (prima la sommava: colazione contata due volte)
  if (so && f.rep == null) f.rep = true;
  return `<div class="xform">${so ? `<div class="seg2 xrep"><button data-xrep="1" aria-pressed="${!!f.rep}">Al posto di «${esc(so.t)}»</button><button data-xrep="0" aria-pressed="${!f.rep}">In più</button></div>` : ""}<input id="xT" placeholder="Cosa hai mangiato? (es. 2 biscotti e una birra)" value="${esc(f.t || "")}" autocomplete="off">
    <div class="seg3">${Object.entries(SIZES).map(([k, n]) => `<button data-xs="${k}" aria-pressed="${f.s === k}">${n}</button>`).join("")}</div>
    <button class="chip xlib" id="xLib" aria-pressed="${!!f.lib}">🎉 È uno sgarro · fuori conto</button>
    <div class="xparse">${xParse(f)}</div>
    ${scaleGuide()}
    <p class="note">Scrivi cosa e quanto ("mezza pizza", "4 noci", "80 g di pasta"). Se non sai quanto o com'era condito: 📷 foto a Claude, poi incolla qui sotto la risposta e le righe si riempiono da sole.</p>
    <div class="row"><label class="btn sm" for="xPic">📷 Foto a Claude</label><input type="file" id="xPic" accept="image/*" capture="environment" hidden><input id="xK" inputmode="numeric" placeholder="kcal se le sai" value="${f.k || ""}"></div>
    <textarea id="xR" rows="2" placeholder="Incolla qui la risposta di Claude">${esc(f.r || "")}</textarea>
    <div class="row"><button class="btn primary" id="xSave">Aggiungi</button><button class="btn" id="xNo">Annulla</button></div></div>`;
}
function weekCard(d) {
  const mon = weekStart(d), days = [...Array(7)].map((_, i) => addDays(mon, i)), names = ["L", "M", "M", "G", "V", "S", "D"];
  const fr = freeInWeek(d), wk = FOOD().week[mon] || {};
  const wv = typeof bodyList === "function" ? bodyList().filter(b => b.w != null) : [], avg = wv.length ? bodyAvg(wv, "w", 0, 13) : null;
  const Q = [["fame", "Fame", ["poca", "giusta", "tanta"]], ["energia", "Energia", ["bassa", "ok", "alta"]], ["sonno", "Sonno", ["male", "ok", "bene"]]];
  return `<h2>Questa settimana</h2><div class="card wkc">
    <div class="wkdays">${days.map((x, i) => `<button data-cd="${x}" aria-pressed="${x === d}"${x > todayISO() ? " disabled" : ""}>${plateSVG(x, "pmini")}<small>${names[i]}</small></button>`).join("")}</div>
    <p class="wkfree">🍕 Pasti liberi: <b>${fr} di 2</b>${fr > 2 ? " · va bene, si riparte dal prossimo pasto" : ""}</p>
    <div class="wkq">${Q.map(([k, n, o]) => `<div><span>${n}</span><div class="seg3">${o.map((t, i) => `<button data-wq="${k}" data-wv="${i}" aria-pressed="${wk[k] === i}">${t}</button>`).join("")}</div></div>`).join("")}</div>
    <p class="note">${avg != null ? `Peso medio (2 settimane): <b>${fmt(Math.round(avg * 10) / 10)} kg</b>. Ricomposizione: stabile mentre i carichi salgono.` : "Il peso si segna in Progressi → Corpo, 1-2 volte a settimana."}</p></div>`;
}
function freeInWeek(d) { const mon = weekStart(d); let n = 0; for (let i = 0; i < 7; i++) { const day = fDay(addDays(mon, i)), m = day.m || {}; for (const k of ["pr", "ce"]) if (m[k] === "libero") n++; n += (day.x || []).filter(e => e.lib).length; } return n; }

function bindOggi(box, d) {
  box.querySelectorAll("[data-cd]").forEach(b => b.onclick = () => { CS.day = b.dataset.cd === todayISO() ? null : b.dataset.cd; CS.xform = null; renderCibo(); });
  box.querySelectorAll("[data-gym]").forEach(b => b.onclick = () => { const v = b.dataset.gym === "1"; setFDay(d, x => { x.gym = v; if (v && gymAuto(d)) delete x.gym; }); renderCibo(); });
  box.querySelectorAll(".tile[data-m], .mselb").forEach(b => b.onclick = () => openOpt(b.dataset.m, b.dataset.o));
  box.querySelectorAll("[data-qm]").forEach(b => b.onclick = () => { const was = (fDay(d).m || {})[b.dataset.qm] === b.dataset.qo; const tw = b.closest(".tilew"); if (tw) tw.querySelector(".tile").classList.add("pop"); logMeal(d, b.dataset.qm, b.dataset.qo, was); setTimeout(renderCibo, was ? 0 : 160); });
  box.querySelectorAll("[data-skip]").forEach(b => b.onclick = () => { const mid = b.dataset.skip, was = (fDay(d).m || {})[mid] === "skip"; logMeal(d, mid, "skip", was); renderCibo(); });
  box.querySelectorAll("[data-dc]").forEach(b => b.onclick = () => { CS.showDc = true; renderCibo(); });
  // vista semplice
  const tg = (k, f) => box.querySelectorAll(`[${k}]`).forEach(b => b.onclick = () => { f(b); renderCibo(); });
  tg("data-vfull", b => { FOOD().full = b.dataset.vfull === "1" ? 1 : 0; save(); scrollTo(0, 0); });
  tg("data-setopen", () => CS.setOpen = true); tg("data-setok", () => CS.setOpen = false);
  tg("data-bal", () => CS.balOpen = !CS.balOpen); tg("data-bag", () => CS.bagOpen = true); tg("data-wk", () => CS.wkOpen = !CS.wkOpen);
  tg("data-qa", () => CS.barOpen = !CS.barOpen);
  tg("data-mrow", b => { CS.mopen = { ...(CS.mopen || {}), [b.dataset.mrow]: 1 }; if (b.dataset.mrow === "dc") CS.showDc = true; });
  tg("data-mfold", b => { const k = b.dataset.mfold; delete (CS.mopen || {})[k]; delete (CS.mexp || {})[k]; if (CS.xform && CS.xform.meal === k) CS.xform = null; });
  box.querySelectorAll("[data-more]").forEach(b => b.onclick = () => openPicker(b.dataset.more));
  box.querySelectorAll("[data-bar]").forEach(b => b.onclick = () => { const f = b.dataset.bar, n = (CB.bar.find(x => x[0] === f) || [0, f])[1], su = !!FOOD().barSugar;
    const it = [[f, 1], ...(su ? [["zucchero", 1]] : [])], hh = new Date().toTimeString().slice(0, 5);
    setFDay(d, x => x.x = [...(x.x || []), { id: "x" + Date.now().toString(36), meal: "fuori", bar: f, t: n + (su ? " zuccherato" : ""), it, s: "n", at: Date.now(), hh }]); try { iosTap(); } catch (_) {} toast(`☕ ${n} · ~${valOfQ(it)[0]} kcal`); renderCibo(); });
  box.querySelectorAll("[data-bsug]").forEach(b => b.onclick = () => { FOOD().barSugar = !FOOD().barSugar; save(); renderCibo(); });
  box.querySelectorAll("[data-bundo]").forEach(b => b.onclick = () => { setFDay(d, x => { const i = (x.x || []).map(y => !!y.bar).lastIndexOf(true); if (i >= 0) x.x.splice(i, 1); }); renderCibo(); });
  box.querySelectorAll("[data-mexp]").forEach(b => b.onclick = () => { CS.mexp = { ...(CS.mexp || {}), [b.dataset.mexp]: 1 }; renderCibo(); });
  box.querySelectorAll("[data-mclose]").forEach(b => b.onclick = () => { delete (CS.mexp || {})[b.dataset.mclose]; renderCibo(); });
  box.querySelectorAll("[data-sh]").forEach(b => b.onclick = () => { const v = b.dataset.sh; setFDay(d, x => { if (x.turno === v) delete x.turno; else x.turno = v; }); renderCibo(); });
  box.querySelectorAll("[data-rec]").forEach(b => b.onclick = () => openRecipe(b.dataset.rec));
  box.querySelectorAll("[data-xadd]").forEach(b => b.onclick = () => { CS.xform = { meal: b.dataset.xadd, s: "n" }; renderCibo(); setTimeout(() => { const i = $("xT"); if (i) i.focus(); }, 60); });
  box.querySelectorAll("[data-xdel]").forEach(b => b.onclick = () => { setFDay(d, x => x.x = (x.x || []).filter(e => e.id !== b.dataset.xdel)); renderCibo(); });
  box.querySelectorAll("[data-wq]").forEach(b => b.onclick = () => { const f = FOOD(), mon = weekStart(d), k = b.dataset.wq, v = +b.dataset.wv; f.week[mon] = { ...(f.week[mon] || {}) }; if (f.week[mon][k] === v) delete f.week[mon][k]; else f.week[mon][k] = v; f.week[mon].at = Date.now(); save(); renderCibo(); });
  if (CS.xform) {
    const t = $("xT"), k = $("xK"), f = CS.xform;
    const xp = () => { const z = box.querySelector(".xparse"); if (!z) return; z.innerHTML = xParse(f); bindRows(z, f.it || [], () => { f.ed = true; xp(); });
      const rr = $("xReread"); if (rr) rr.onclick = () => { f.ed = false; f.cl = null; f.cmiss = null; xp(); };
      stimaBind(z, row => { f.it = [...(f.it || []), row]; f.ed = true; f.cmiss = []; xp(); }, xp);
      const ai = $("xAi"); if (ai) ai.onclick = async () => { ai.disabled = true; ai.textContent = "Sto leggendo…";
        try { const j = await aiPost("/food/photo", { mode: "testo", text: (f.t || "").trim(), meal: (SHOTM().find(([k]) => k === f.meal) || [0, ""])[1] }); const r = aiRows(j.items);
          if (!r.L.length) { toast("Neanche Claude ha capito: scrivilo diversamente"); ai.disabled = false; ai.textContent = "✨ Riprova"; return; }
          f.it = r.L; f.ed = true; f.cmiss = r.miss; if (j.piatto && !(f.t || "").trim()) f.t = j.piatto; xp(); toast(`✓ ${j.piatto || "Capito"} · ~${valOfQ(f.it)[0]} kcal`); }
        catch (e) { toast("⚠️ " + (e.message || e)); ai.disabled = false; ai.textContent = "✨ Fallo capire all'IA"; } }; };
    xp();
    t.oninput = () => { f.t = t.value; if (!f.ed) xp(); };
    const xl = $("xLib"); if (xl) xl.onclick = () => { f.lib = !f.lib; xl.setAttribute("aria-pressed", f.lib); }; k.oninput = () => f.k = k.value.replace(/\D/g, "");
    $("xR").oninput = ev => { f.r = ev.target.value; const r = readClaudeList(f.r);
      if (r.items.length) { f.it = r.items; f.ed = true; f.cl = r.tot; f.cmiss = r.miss; xp(); toast(`Letto: ${r.items.length} alimenti, ~${valOfQ(f.it)[0]} kcal`); }
      else if (r.tot) { f.k = String(r.tot.k); f.p = r.tot.p; f.c = r.tot.c; f.f = r.tot.f; k.value = f.k; toast(`Letto: ${r.tot.k} kcal`); } };
    box.querySelectorAll("[data-xs]").forEach(b => b.onclick = () => { f.s = b.dataset.xs; box.querySelectorAll("[data-xs]").forEach(x => x.setAttribute("aria-pressed", x === b)); if (!f.ed) xp(); });
    box.querySelectorAll("[data-xrep]").forEach(b => b.onclick = () => { f.rep = b.dataset.xrep === "1"; box.querySelectorAll("[data-xrep]").forEach(x => x.setAttribute("aria-pressed", x === b)); });
    $("xNo").onclick = () => { CS.xform = null; renderCibo(); };
    $("xSave").onclick = () => {
      const it = (f.it || []).filter(([, q]) => q), txt = (f.t || "").trim() || it.slice(0, 3).map(([x]) => FO(x).n.replace(/ \(.*\)$/, "")).join(", ");
      if (!txt) return toast("Scrivi cosa hai mangiato");
      const e = { id: "x" + Date.now().toString(36), meal: f.meal, t: txt.slice(0, 80), s: f.s, at: Date.now() }; if (f.lib) e.lib = 1;
      if (+f.k > 0) { e.k = Math.min(5000, +f.k); if (f.p != null) { e.p = f.p; e.c = f.c; e.f = f.f; } } else if (it.length) e.it = it.map(r => [...r]);
      CS.xform = null;
      if (f.rep && f.meal !== "fuori") setFDay(d, x => { if (x.m) delete x.m[f.meal]; if (x.q) delete x.q[f.meal]; if (x.dn) delete x.dn[f.meal]; });
      if (e.it && !e.lib && f.meal !== "fuori" && !(fDay(d).m || {})[f.meal]) { const id = rememberDish(f.meal, txt, e.it); logMeal(d, f.meal, "d_" + id, false, e.it); toast(`✓ ${dishName(txt)} · ~${valOfQ(e.it)[0]} kcal · lo ritrovi tra le caselle`); renderCibo(); return; }
      setFDay(d, x => x.x = [...(x.x || []), e]); if (e.it && !e.lib) rememberDish(f.meal, txt, e.it);
      if (e.lib) { const v = xVal(e); toast(`🎉 Segnato come sgarro${v ? ` · ~${v[0]} kcal fuori conto` : ""}`); renderCibo(); return; }
      const v = xVal(e); toast(v ? `Aggiunto: ~${v[0]} kcal` : "Aggiunto, ma non ho capito le kcal: scrivilo diversamente o chiedi a Claude"); renderCibo(); };
    $("xPic").onchange = e => { const file = e.target.files[0]; e.target.value = ""; if (!file) return; if (aiOn()) { const meal = f.meal, note = (f.t || "").trim(); CS.xform = null; renderCibo(); openShot(file, { d, meal, note }); } else askClaude(file, (f.t || "").trim(), SIZES[f.s], ""); };
  }
}
// segna (o toglie) un pasto: frase incoraggiante e festa a giornata completa
function logMeal(d, mid, oid, undo, L) {
  const before = dayDone(d), fr = !undo && frItem(d, oid); if (CS.mexp) delete CS.mexp[mid]; if (CS.mopen) delete CS.mopen[mid]; if (CS.qdraft) delete CS.qdraft[`${d}|${mid}|${oid}`];
  if (undo || (fDay(d).m || {})[mid]) frUse(d, mid, null, true);
  setFDay(d, x => { if (x.q) delete x.q[mid]; if (undo) { delete x.m[mid]; return; } x.m[mid] = oid; if (fr) x.fr = { ...(x.fr || {}), [oid]: { ...fr } }; });
  if (!undo && /^d_/.test(oid)) { const L2 = L || baseQ(mid, oid, d), x0 = myDish()[oid.slice(2)]; if (L2) setFDay(d, x => { x.q = { ...(x.q || {}), [mid]: L2.map(r => [...r]) }; x.dn = { ...(x.dn || {}), [mid]: x0 ? x0.t : "Il mio piatto" }; }); if (x0) { x0.n = (x0.n || 0) + 1; x0.last = d; save(); } }
  else if (!undo && L && !sameQ(L, baseQ(mid, oid, d))) setFDay(d, x => x.q = { ...(x.q || {}), [mid]: L.map(r => [...r]) });
  if (fr && !CS.frKeep) { const f = FOOD(); f.fridge = frList().filter(x => "fr_" + x.id !== oid); save(); }
  CS.frKeep = false;
  if (undo) return;
  try { frUse(d, mid, curQ(d, mid, oid) || L || baseQ(mid, oid, d)); } catch (_) {}
  if (oid !== "skip") { const c = CHEER[mid] || ["Fatto 👌"]; toast(c[Math.floor(Math.random() * c.length)]); }
  if (!before && dayDone(d) && !fDay(d).cel) { setFDay(d, x => x.cel = 1); setTimeout(() => celebrate("🍽 Giornata completa", "Domani si ricomincia, senza recuperare niente"), 250); }
}
// tocco su una casella: apre l'idea (o la ricetta) con "✓ Fatto" in fondo (20/11/2026: "vedere cosa posso farmi, seguire la ricetta e poi confermarla")
function openOpt(mid, oid, keep) {
  const d = cDay(), md = mealDef(mid), o = optOf(md, oid, d); if (!o) return;
  if (o.r && recipeById(o.r)) return openRecipe(o.r, { mid, oid });
  if (oid === "altro") { CS.xform = { meal: mid, s: "n" }; renderCibo(); setTimeout(() => { const i = $("xT"); if (i) { i.scrollIntoView({ block: "center" }); i.focus(); } }, 60); return; }
  if (!keep || !CS.qe || CS.qe.oid !== oid || CS.qe.mid !== mid) { qeInit(d, mid, oid); CS.frKeep = false; }
  const sh = $("fsheet"), on = (fDay(d).m || {})[mid] === oid, w = whereOf(d, mid), rist = oid === "rist" || /^fr_/.test(oid), y = keep && !sh.hidden ? sh.querySelector(".is-c").scrollTop : 0;
  sh.querySelector(".is-h").innerHTML = `<b>${esc(o.t)}</b><span class="rmeta">${esc(md.name)}</span>`;
  sh.querySelector(".is-c").innerHTML = `<div class="rhero">${o.free ? `<div class="bigemo">🍕</div>` : dishSVG(rist && CS.qe ? [FDP[CS.qe.L[0][0]] || "pollo", "verdure", "riso"] : o.p || [], o.box, o.id, "dish big")}</div>
    <p class="idea">${esc(o.d || "")}</p>
    ${o.porta ? `<p class="rgo ${o.go}">${o.go === "p" ? "🎒 Si porta al lavoro, niente attrezzi" : o.go === "m" ? "🎒 Al lavoro col microonde" : "🏠 Solo a casa"}<small>${esc(o.porta)}</small></p>` : ""}
    ${w !== "casa" && !fits(o, w) ? `<p class="note">Oggi questo pasto lo fai ${w === "zero" ? "al lavoro senza attrezzi" : w === "micro" ? "al lavoro col solo microonde" : "in mensa"}: questa idea va meglio a casa.</p>` : ""}
    ${rist ? ristBox(oid) : ""}${oid === "sala" ? salaBox() : ""}${rist || oid === "mensa" || oid === "sala" ? estBox(oid) : ""}${qBox()}${condBox(rist ? "rist" : oid === "mensa" || oid === "sala" ? oid : "")}
    ${o.free ? libBox(d, mid) : ""}
    ${o.dish ? `<div class="rlog"><button class="btn" id="dishDel">🗑 Togli dai miei piatti</button></div>` : ""}
    <div class="rlog"><button class="btn ${on ? "" : "primary"}" id="ideaOk">${on ? "Togli: non l'ho mangiato" : `✓ Fatto: mangiato ${MEALN[mid] || ""}`}</button></div>`;
  if (sh.hidden || !keep) showSheet(sh); else sh.querySelector(".is-c").scrollTop = y;
  qBind(sh); if (rist) ristBind(sh, oid); estBind(sh, mid, oid);
  sh.querySelectorAll("[data-sala]").forEach(b => b.onclick = () => { const v = CB.sala[+b.dataset.sala]; CS.qe.L = parseQ(v[1]); CS.qe.sv = +b.dataset.sala; qPersist(); openOpt(mid, oid, true); });
  const dd = $("dishDel"); if (dd) dd.onclick = () => { if (!dd.dataset.sure) { dd.dataset.sure = 1; dd.textContent = "Tocca di nuovo per toglierlo"; return; } delete myDish()[oid.slice(2)]; save(); closeRecipe(); renderCibo(); toast("Tolto dai tuoi piatti"); };
  $("ideaOk").onclick = () => { if (o.free) { if (on) setFDay(d, x => { if (x.lib) delete x.lib[mid]; }); else libSave(); CS.lib = null; } logMeal(d, mid, oid, on, CS.qe && CS.qe.L); closeRecipe(); renderCibo(); };
  if (o.free) libBind(sh, mid, oid);
}
// 🍽 Il tuo piatto: grammi per UN pasto, col carboidrato giusto per quel pasto (scala 80/40/0 a pranzo, cena fissa)

// ---------- 🏷 I MIEI PRODOTTI (20/11/2026: "ci sono differenze fra le marche") ----------
// Valori veri della confezione: codice a barre → Open Food Facts (banca dati libera, niente chiavi) oppure i 4 numeri
// dell'etichetta. D.food.prods[id] = { n, b marca, v [kcal,P,C,G per 100 g], code, sub = alimento generico che sostituisce, d porzione g }.
// Diventano alimenti "p_<id>" (anche per leggere il testo scritto) e, con sub, prendono il posto di quello generico nelle caselle.
const prods = () => { const f = FOOD(); return (f.prods = f.prods || {}); };
function syncProds() {
  for (const k of Object.keys(CB.foods)) if (k.startsWith("p_")) delete CB.foods[k];
  for (const [id, p] of Object.entries(prods())) { if (!p.v || p.v[0] == null) continue; const sf = (p.of || p.sub) && CB.foods[p.of || p.sub];
    const pu = p.pu && sf && !isW(sf) ? { u: sf.u, g: sf.g, s: sf.s } : { u: "g", s: 10 };
    CB.foods["p_" + id] = { n: p.n + (p.b ? " · " + p.b : ""), ...pu, of: p.of || p.sub, b: p.b, v: p.v.map(x => +x || 0), k: [p.n, p.b && `${p.b} ${p.n}`].filter(Boolean).map(x => x.replace(/,/g, " ")).join(","), d: p.d || (sf ? (p.pu && !isW(sf) ? sf.d : Math.round(sf.d * (isW(sf) ? 1 : sf.g))) : 100), mine: 1 }; } // 22/11: a pezzi la quantità di base resta in pezzi (prima 2 gallette diventavano 16)
  KW = null;
}
function applySubs(L) {
  const S = {}; for (const [id, p] of Object.entries(prods())) if (p.sub && CB.foods["p_" + id]) S[p.sub] = "p_" + id;
  return L.map(([f, q]) => S[f] ? [S[f], convQ(f, q, S[f])] : [f, q]);
}
// quantità di un alimento espressa nell'unità di un altro (pezzi se tutti e due a pezzi, altrimenti grammi)
function convQ(f, q, to) { const a = FO(f), b = FO(to); if (!isW(a) && !isW(b) && a.g === b.g) return q; return isW(b) ? Math.round(gramsOf(f, q)) : Math.round(gramsOf(f, q) / b.g * 100) / 100; }

// 🏷 MARCHE MAN MANO (20/11/2026, richiesta dell'utente: "mentre compilo gli ingredienti chiedimi la marca delle cose
// confezionate: man mano si crea il database"). Accanto agli ingredienti confezionati c'è "🏷 marca?": scegli o scrivi la marca,
// diventa un tuo prodotto (D.food.prods, of = alimento del piano) e da lì in poi è quello usato al suo posto (sub).
// Senza codice a barre i valori restano quelli standard dell'alimento (std) finché non scansioni la confezione.
const PACK = new Set("yogurt cornflakes galletta bresaola fiocchi prot mozz mozzn tonno segale piadina pasta pastai riso cous farro quinoa rprec farrop gnocchi crema albumeg latte pcotto pcrudo ceci passata vgrill vmiste parmigiano formaggio cracker grissino biscotto pane".split(" "));
const BRANDS = { segale: "Mestemacher, Pema", piadina: "Loriana, Mulino Bianco", yogurt: "Vipiteno, Müller, Yomo", fiocchi: "Jocca, Granarolo", mozz: "Santa Lucia, Granarolo", bresaola: "Rigamonti", tonno: "Rio Mare, Mareblu", rprec: "Riso Scotti, Ben's Original", galletta: "Riso Scotti, Gallo", cornflakes: "Kellogg's", pasta: "Barilla, De Cecco, Rummo", riso: "Gallo, Scotti", gnocchi: "Rana, Giovanni Rana", latte: "Granarolo, Parmalat", albumeg: "Eurovo, Naturelle", passata: "Mutti, Cirio", ceci: "Valfrutta, Cirio" };
const ofFood = f => { const o = FO(f); return o && o.mine ? o.of || null : PACK.has(f) ? f : null; };
const nobrand = () => { const f = FOOD(); return (f.nobrand = f.nobrand || {}); };
function brandUse(id) { // questo prodotto diventa quello usato al posto dell'alimento generico
  const P = prods(), p = P[id], of = p.of || p.sub; if (!of) return;
  for (const x of Object.values(P)) if ((x.of || x.sub) === of && x !== p && x.sub) { x.of = x.of || x.sub; delete x.sub; x.at = Date.now(); }
  p.of = of; p.sub = of; p.at = Date.now(); save(); syncProds();
}
function brandPick(f0, done) {
  const of = ofFood(f0); if (!of) return; const base = FO(of), P = prods();
  const mine = Object.entries(P).filter(([, p]) => (p.of || p.sub) === of).sort((a, b) => (b[1].at || 0) - (a[1].at || 0));
  const sug = [...new Set([...mine.map(([, p]) => p.b).filter(Boolean), ...(BRANDS[of] || "").split(",").map(x => x.trim()).filter(Boolean), "marca del supermercato"])];
  const ov = panel(); CS.scanSub = of;
  ov.innerHTML = `<div class="sc-top"><b>🏷 Che marca è?</b><button class="is-x" id="scX" aria-label="Chiudi">✕</button></div>
    <p class="note sc-msg">${esc(base.n)}: la marca scelta resta per le prossime volte (la cambi da qui quando vuoi).</p>
    ${mine.length ? `<p class="plab">Le tue</p><div class="bpick">${mine.map(([id, p]) => `<button class="chip${FO(f0).mine && f0 === "p_" + id ? " on" : ""}" data-bu="${id}">${esc(p.b || p.n)}${p.std ? "" : " ✓"}</button>`).join("")}</div>` : ""}
    <p class="plab">${mine.length ? "Un'altra marca" : "Marca"}</p>
    <div class="bpick">${sug.filter(b => !mine.some(([, p]) => p.b === b)).map(b => `<button class="chip" data-bs="${esc(b)}">${esc(b)}</button>`).join("")}</div>
    <div class="row"><input id="bN" placeholder="scrivi la marca" autocomplete="off"><button class="btn primary" id="bOk">Salva</button></div>
    <p class="note">Senza codice a barre uso i valori standard di «${esc(base.n)}». Per quelli esatti della tua confezione:</p>
    <button class="btn" id="bScan">📷 Scansiona il codice a barre</button>
    <div class="row bfoot">${FO(f0).mine ? `<button class="lnk" id="bGen"><i>↺</i>Torna a «${esc(base.n)}» generico</button>` : ""}<button class="lnk" id="bNo"><i>🚫</i>Non è confezionato: non chiedere più</button></div>`;
  $("scX").onclick = panelClose;
  const fin = id => { brandUse(id); panelClose(); toast("🏷 " + (prods()[id].b || prods()[id].n)); done("p_" + id); };
  const add = b => { b = (b || "").trim(); if (!b) return toast("Scrivi la marca");
    const old = mine.find(([, p]) => normT(p.b || "") === normT(b)); if (old) return fin(old[0]);
    const id = Date.now().toString(36); P[id] = { n: base.n.replace(/ \(.*\)$/, ""), b, v: [...base.v], of, sub: of, pu: isW(base) ? undefined : 1, std: 1, at: Date.now() }; fin(id); };
  ov.querySelectorAll("[data-bu]").forEach(x => x.onclick = () => fin(x.dataset.bu));
  ov.querySelectorAll("[data-bs]").forEach(x => x.onclick = () => add(x.dataset.bs));
  $("bOk").onclick = () => add($("bN").value); $("bN").onkeydown = e => { if (e.key === "Enter") add($("bN").value); };
  $("bScan").onclick = () => scanOpen(f => { const p = prods()[f.slice(2)]; if (p) { p.of = of; if (!p.pu && !isW(base) && !p.d) p.pu = 1; delete p.std; brandUse(f.slice(2)); } done(f); });
  const g = $("bGen"); if (g) g.onclick = () => { for (const x of Object.values(P)) if ((x.of || x.sub) === of && x.sub) { x.of = of; delete x.sub; x.at = Date.now(); } save(); syncProds(); panelClose(); done(of); };
  $("bNo").onclick = () => { nobrand()[of] = 1; save(); panelClose(); done(null); };
}
const GENERIC = () => Object.entries(CB.foods).filter(([k, o]) => !o.mine && !["msec", "mpri", "acqua", "sale", "zero"].includes(k)).sort((a, b) => a[1].n.localeCompare(b[1].n, "it"));
function guessSub(name) { const r = readFood(name || "", "n").items.find(i => !FO(i.f).mine); return r ? r.f : ""; }

// lettore del codice a barre (libreria html5-qrcode, Apache 2.0, in vendor/: si carica solo quando serve)
const loadScan = () => window.__Html5QrcodeLibrary__ ? Promise.resolve() : new Promise((ok, ko) => { const x = document.createElement("script"); x.src = "vendor/html5-qrcode.min.js"; x.onload = ok; x.onerror = ko; document.head.appendChild(x); });
function panel() { let ov = $("scan"); if (!ov) { ov = document.createElement("div"); ov.id = "scan"; document.body.appendChild(ov); } ov.hidden = false; document.documentElement.classList.add("noscroll"); return ov; }
async function scanStop() { const sc = CS.scanner; CS.scanner = null; if (sc) { try { if (sc.isScanning) await sc.stop(); sc.clear(); } catch (_) {} } }
function panelClose() { scanStop(); CS.scanSub = null; const ov = $("scan"); if (ov) { ov.hidden = true; ov.innerHTML = ""; } if ($("fsheet").hidden) document.documentElement.classList.remove("noscroll"); }
async function scanOpen(cb) {
  CS.scanCb = cb; const ov = panel();
  ov.innerHTML = `<div class="sc-top"><b>Codice a barre</b><button class="is-x" id="scX" aria-label="Chiudi">✕</button></div>
    <div id="scv"></div><p class="note sc-msg" id="scMsg">Inquadra il codice a barre della confezione, dritto e con buona luce.</p>
    <div class="sc-alt"><label class="btn" for="scF">📷 Fai una foto al codice</label><input type="file" id="scF" accept="image/*" capture="environment" hidden>
      <div class="row"><input id="scN" inputmode="numeric" placeholder="oppure scrivi il numero del codice" autocomplete="off"><button class="btn" id="scOk">Cerca</button></div>
      <button class="lnk wide" id="scMan"><i>✎</i>Non ha il codice: scrivo i valori dell'etichetta</button></div>`;
  const msg = t => { const m = $("scMsg"); if (m) m.textContent = t; };
  $("scX").onclick = panelClose;
  $("scMan").onclick = () => { scanStop(); prodForm({}); };
  $("scOk").onclick = () => { const c = ($("scN").value || "").replace(/\D/g, ""); if (c.length < 8) return msg("Il codice ha 8 o 13 cifre."); scanGot(c); };
  $("scF").onchange = async e => { const file = e.target.files[0]; if (!file) return; msg("Leggo la foto…");
    try { await loadScan(); await scanStop(); const sc = new window.__Html5QrcodeLibrary__.Html5Qrcode("scv"); const c = await sc.scanFile(file, false); try { sc.clear(); } catch (_) {} scanGot(c); }
    catch (_) { msg("Non riesco a leggere il codice in questa foto: avvicinati, dritto e senza riflessi, o scrivi il numero."); } };
  try { await loadScan(); const L = window.__Html5QrcodeLibrary__, F = L.Html5QrcodeSupportedFormats;
    if (!$("scv")) return;
    CS.scanner = new L.Html5Qrcode("scv", { formatsToSupport: [F.EAN_13, F.EAN_8, F.UPC_A, F.UPC_E], verbose: false });
    await CS.scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: (w) => ({ width: Math.round(Math.min(320, w * .85)), height: 130 }) }, c => scanGot(c), () => {});
  } catch (e) { msg("Fotocamera non disponibile qui: fai una foto al codice o scrivi il numero."); }
}
async function scanGot(code) {
  if (CS.scanBusy) return; CS.scanBusy = true; await scanStop();
  const m = $("scMsg"); if (m) m.textContent = `Cerco ${code}…`;
  const old = Object.entries(prods()).find(([, p]) => p.code === code);
  if (old) { CS.scanBusy = false; return prodForm({ ...old[1], id: old[0] }, "Ce l'hai già: puoi correggerlo."); }
  let p = null, note = "";
  try { p = await offGet(code); } catch (_) { note = "Senza connessione non posso cercarlo: scrivi i valori dell'etichetta (per 100 g)."; }
  CS.scanBusy = false;
  if (p && p.v.every(x => x != null)) prodForm(p, "Trovato su Open Food Facts: controlla con l'etichetta e salva.");
  else prodForm(p || { code }, note || (p ? "Trovato, ma mancano dei valori: completali dall'etichetta (per 100 g)." : "Non è nella banca dati: scrivi i valori dell'etichetta (per 100 g)."));
}
async function offGet(code) {
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_it,brands,nutriments,serving_quantity`);
  if (!r.ok) return null; const j = await r.json(); if (j.status !== 1 || !j.product) return null;
  const P = j.product, n = P.nutriments || {}, num = x => x == null || x === "" || isNaN(+x) ? null : Math.round(+x * 10) / 10;
  const kc = n["energy-kcal_100g"] != null ? n["energy-kcal_100g"] : n.energy_100g != null ? n.energy_100g / 4.184 : null;
  return { n: (P.product_name_it || P.product_name || "").trim(), b: (P.brands || "").split(",")[0].trim(), v: [kc, n.proteins_100g, n.carbohydrates_100g, n.fat_100g].map(num), code, d: num(P.serving_quantity) };
}
function prodForm(p, note) {
  const ov = panel(), v = p.v || [], sub = p.sub != null ? p.sub : CS.scanSub || guessSub(p.n);
  ov.innerHTML = `<div class="sc-top"><b>${p.id ? "Il mio prodotto" : "Nuovo prodotto"}</b><button class="is-x" id="scX" aria-label="Chiudi">✕</button></div>
    ${note ? `<p class="note sc-msg">${esc(note)}</p>` : ""}
    <div class="pform"><label>Nome<input id="pN" value="${esc(p.n || "")}" placeholder="es. Pane di segale integrale" autocomplete="off"></label>
      <label>Marca<input id="pB" value="${esc(p.b || "")}" placeholder="es. Mestemacher" autocomplete="off"></label>
      <p class="plab">Valori per 100 g (dall'etichetta)</p>
      <div class="pgrid">${[["kcal", 0], ["proteine", 1], ["carboidrati", 2], ["grassi", 3]].map(([n, i]) => `<label>${n}<input id="pV${i}" inputmode="decimal" value="${v[i] != null ? String(v[i]).replace(".", ",") : ""}"></label>`).join("")}</div>
      <label>Porzione abituale (g, facoltativa)<input id="pD" inputmode="decimal" value="${p.d || ""}" placeholder="es. una fetta = 45"></label>
      <label>Usalo al posto di<select id="pS"><option value="">— nessuno (lo aggiungo io quando serve)</option>${GENERIC().map(([k, o]) => `<option value="${k}"${k === sub ? " selected" : ""}>${esc(o.n)}</option>`).join("")}</select></label>
      <p class="note">Con "al posto di", le caselle e le ricette del piano usano questo prodotto: le kcal diventano quelle della tua confezione.</p>
      ${p.code ? `<p class="note">Codice ${esc(p.code)}</p>` : ""}
      <div class="row"><button class="btn primary" id="pOk">Salva</button>${p.id ? `<button class="btn" id="pDel">Elimina</button>` : ""}</div></div>`;
  $("scX").onclick = panelClose;
  $("pOk").onclick = () => {
    const n = $("pN").value.trim(), V = [0, 1, 2, 3].map(i => { const x = parseFloat(($("pV" + i).value || "").replace(",", ".")); return isNaN(x) ? null : x; });
    if (!n) return toast("Scrivi il nome"); if (V.some(x => x == null)) return toast("Servono kcal, proteine, carboidrati e grassi per 100 g");
    // 22/11/2026: controllo dell'etichetta (kcal ≈ 4·P + 4·C + 9·G): un numero scritto male falserebbe tutti i conti
    const at = 4 * V[1] + 4 * V[2] + 9 * V[3]; if (V[0] > 30 && Math.abs(V[0] - at) / Math.max(V[0], at) > .3 && !$("pOk").dataset.ok) { $("pOk").dataset.ok = 1; $("pOk").textContent = "Salva lo stesso"; return toast(`⚠️ Controlla: con questi valori le kcal dovrebbero essere circa ${Math.round(at)}`); }
    if (V.some(x => x > 900) || V[1] + V[2] + V[3] > 101) return toast("⚠️ Valori impossibili per 100 g: controlla l'etichetta");
    const id = p.id || Date.now().toString(36), d = parseFloat(($("pD").value || "").replace(",", "."));
    const sv = $("pS").value || undefined; prods()[id] = { ...(p.id ? prods()[p.id] : {}), n, b: $("pB").value.trim(), v: V, code: p.code || undefined, sub: sv, of: sv, d: d > 0 && !(p.id && (prods()[p.id] || {}).pu) ? d : undefined, at: Date.now() }; delete prods()[id].std; CS.scanSub = null;
    save(); syncProds(); const cb = CS.scanCb; CS.scanCb = null; panelClose(); toast("🏷 Salvato: " + n); if (cb) cb("p_" + id); else renderCibo(); };
  const del = $("pDel"); if (del) del.onclick = () => { if (!del.dataset.sure) { del.dataset.sure = 1; del.textContent = "Tocca di nuovo per eliminare"; return; } delete prods()[p.id]; save(); syncProds(); panelClose(); renderCibo(); };
}

// ✎ righe modificabili (quantità per ingrediente): − / +, tocco sul numero = scrivi i grammi
function rowsHTML(L, base) {
  const B = base ? new Map(base.map(([f, q]) => [f, q])) : null;
  return L.map(([f, q], i) => { const o = FO(f); if (!o) return ""; const v = valOfQ([[f, q]])[0];
    // sopra la quantità del piano (oltre +10%) o ingrediente aggiunto: riga colorata (20/11/2026)
    const b0 = B ? B.get(f) : undefined, up = B && q && (b0 == null ? !CONDF.includes(f) || q > 0 : q > b0 * 1.1 + 1e-9) ? (b0 == null ? " add" : (q > b0 * 1.25 ? " up2" : " up")) : "";
    const diff = up && b0 != null ? `<small class="qdiff">piano ${qLabel(f, b0)} · +${valOfQ([[f, q - b0]])[0]} kcal</small>` : up ? `<small class="qdiff">aggiunto</small>` : "";
    const of = ofFood(f), bt = of && !(nobrand()[of] && !o.mine) ? `<button class="qbr${o.mine ? " on" : ""}" data-qb="${i}">🏷 ${o.mine ? esc(o.b || "marca") : "marca?"}</button>` : "";
    const nm = o.mine && of ? FO(of).n : o.n;
    return `<div class="qrow${q ? "" : " zero"}${up}"><span>${esc(nm)}${o.mine && !of ? ` <i class="mine">mio</i>` : ""}${bt}${diff}</span><div class="qctl"><button data-qd="${i}" aria-label="Meno">−</button><b data-qg="${i}">${qLabel(f, q)}</b><button data-qu="${i}" aria-label="Più">+</button></div><em>${q ? `${v} kcal` : "niente"}</em></div>`; }).join("");
}
function bindRows(box, L, changed) {
  const step = (i, k) => { const [f, q] = L[i], o = FO(f); L[i][1] = Math.max(0, Math.round((q + k * o.s) * 100) / 100); try { iosTap(); } catch (_) {} changed(); };
  box.querySelectorAll("[data-qd]").forEach(b => b.onclick = () => step(+b.dataset.qd, -1));
  box.querySelectorAll("[data-qu]").forEach(b => b.onclick = () => step(+b.dataset.qu, 1));
  box.querySelectorAll("[data-qb]").forEach(b => b.onclick = e => { e.stopPropagation(); const i = +b.dataset.qb, [f, q] = L[i];
    brandPick(f, to => { if (to && to !== f && L[i]) L[i] = [to, convQ(f, q, to)]; changed(); }); });
  box.querySelectorAll("[data-qg]").forEach(b => b.onclick = () => {
    const i = +b.dataset.qg, [f, q] = L[i], o = FO(f), g = Math.round(gramsOf(f, q));
    b.outerHTML = `<span class="qinw"><input class="qin" inputmode="decimal" data-qi="${i}" value="${g || ""}" placeholder="0">${o.u === "ml" ? "ml" : "g"}</span>`;
    const inp = box.querySelector(`[data-qi="${i}"]`); inp.focus(); inp.select();
    let done = false; const fin = () => { if (done) return; done = true; const n = parseFloat((inp.value || "").replace(",", ".")); if (!isNaN(n) && n >= 0) L[i][1] = isW(o) ? Math.round(n) : Math.round(n / o.g * 100) / 100; changed(); };
    inp.onblur = fin; inp.onkeydown = e => { if (e.key === "Enter") inp.blur(); };
  });
}
// ✋ senza bilancia: cucchiai, cucchiaini, mani, pezzi, confezioni (CB.misure)
const scaleGuide = (open) => `<details class="occhio"${open ? " open" : ""}><summary>✋ Senza bilancia: come misurare</summary><ul>${CB.misure.map(([a, b]) => `<li><b>${esc(a)}</b><br>${esc(b)}</li>`).join("")}</ul><p class="note">Puoi anche scriverlo così: "2 cucchiai di yogurt", "una tazza di cornflakes", "un mestolo di riso": l'app lo capisce.</p></details>`;
// 🍽 grammi di un pasto in sola lettura (cucina passo passo) + condimento consigliato
function plateBox(r, mid, d) {
  const m = mid || (r.main ? "pr" : Object.keys(r.for || {})[0]), oid = r.main ? r.id : (r.for || {})[m], L = m && oid && baseQ(m, oid, d);
  if (!L) return condBox(r.id);
  const L0 = r.main && m === "pr" ? CB.lunch[lunchLvl(d)] : null;
  return `<div class="plate1"><h3>🍽 Il tuo piatto · ${m === "ce" ? "cena" : m === "pr" ? "pranzo" : "1 porzione"}</h3>${L0 ? `<p class="note">Pranzo da ${esc(L0.t)}.</p>` : ""}${m === "pr" && lunchLvl(d) === 0 && STRICT.has(r.id) ? `<p class="note warnc">Oggi a pranzo il piano è senza carboidrato: questo piatto senza la sua pasta non ha senso, tienilo per cena o per un giorno di palestra.</p>` : ""}<ul>${L.filter(([, q]) => q).map(([f, q]) => `<li>${esc(qText(f, q))}</li>`).join("")}</ul></div>${condBox(r.id)}`;
}
function condBox(key) {
  const t = CB.ct[key]; if (!t) return "";
  return `<details class="cond"><summary><b>🧂 Condimento consigliato</b><span>${esc(t)}</span></summary><ul>${CB.condRules.map(x => `<li>${esc(x)}</li>`).join("")}</ul></details>`;
}
// ✎ Quanto ne hai mangiato: − / + per ogni ingrediente, kcal ricalcolate subito
// modifiche a un pasto non ancora segnato: restano in memoria chiudendo il riquadro (CS.qdraft), così riaprendo non si perdono
function qeInit(d, mid, oid) { const dk = `${d}|${mid}|${oid}`, on = (fDay(d).m || {})[mid] === oid, L = (!on && CS.qdraft && CS.qdraft[dk]) || curQ(d, mid, oid); CS.qe = L ? { d, mid, oid, L: L.map(r => [...r]) } : null; CS.qAdd = false; CS.qAddT = ""; }
const QPOP = ["noce", "olio", "soia", "parmigiano", "pane", "galletta", "yogurt", "insalata", "uovo", "cornflakes", "pomodorini", "mozzn"];
function foodHits(t) {
  t = normT(t).trim(); const mine = Object.keys(CB.foods).filter(k => FO(k).mine);
  if (!t) return [...mine.slice(0, 6), ...QPOP];
  const hit = k => { const o = FO(k); return normT(o.n).includes(t) || normT(String(o.k || "")).split(",").some(w => (w = w.trim()) && (w.startsWith(t) || (t.startsWith(w) && w.length > 2))); };
  return [...mine.filter(hit), ...Object.keys(CB.foods).filter(k => !FO(k).mine && hit(k))].slice(0, 14);
}
const hitBtns = t => foodHits(t).map(f => `<button class="chip${FO(f).mine ? " mine" : ""}" data-qa="${f}">${esc(FO(f).n)}</button>`).join("") + `<button class="chip scanc" data-qscan="1">📷 Scansiona un prodotto</button>`;
// salva le quantità se il pasto è già segnato
function qPersist() { const e = CS.qe; if (!e) return; if ((fDay(e.d).m || {})[e.mid] !== e.oid) { CS.qdraft = { ...(CS.qdraft || {}), [`${e.d}|${e.mid}|${e.oid}`]: e.L.map(r => [...r]) }; return; } const b = baseQ(e.mid, e.oid, e.d); setFDay(e.d, x => { x.q = x.q || {}; if (sameQ(e.L, b)) delete x.q[e.mid]; else x.q[e.mid] = e.L.map(r => [...r]); }); renderCibo(); }
function qBox() {
  const e = CS.qe; if (!e) return "";
  const t = valOfQ(e.L), base = baseQ(e.mid, e.oid, e.d), on = (fDay(e.d).m || {})[e.mid] === e.oid;
  return `<div class="qbox"><h3>Quanto ne hai mangiato${e.mid ? ` · ${esc(mealDef(e.mid).name.toLowerCase())}` : ""}</h3><p class="note">Le quantità sono quelle del piano. Se è diverso tocca − o +, oppure tocca il numero e scrivi i grammi: le kcal si ricalcolano${on ? " e si salvano subito" : ""}.</p>
    ${rowsHTML(e.L, base)}
    ${swapBox(e.L)}
    <div class="qadd">${CS.qAdd ? `<input id="qAddI" placeholder="Cerca (es. parmigiano, noci, pane)" autocomplete="off" value="${esc(CS.qAddT || "")}"><div class="qhits">${hitBtns(CS.qAddT)}</div>` : `<button class="lnk" id="qAddB"><i>＋</i>Aggiungi un ingrediente</button>`}${!sameQ(e.L, base) ? `<button class="lnk" id="qReset"><i>↺</i>Come da piano</button>` : ""}</div>
    ${scaleGuide()}<p class="qbrand">🏷 Tocca «marca?» accanto a un ingrediente confezionato: la marca resta per le prossime volte. Per i valori esatti <button class="lnk in" data-qscan="1">scansiona la confezione</button>.</p>
    <p class="qtot${base && t[0] > valOfQ(base)[0] * 1.1 ? (t[0] > valOfQ(base)[0] * 1.25 ? " hi2" : " hi") : ""}"><b>~${fmt(t[0])} kcal${base && t[0] > valOfQ(base)[0] * 1.1 ? ` <i class="ovr">+${t[0] - valOfQ(base)[0]} sul piano</i>` : ""}</b><span>proteine ${t[1]} g · carboidrati ${t[2]} g · grassi ${t[3]} g</span></p>${e.mid ? ptBox(t, e.mid, e.d) : ""}</div>`;
}
function qBind(sh) {
  const box = sh.querySelector(".qbox"); if (!box || !CS.qe) return; const e = CS.qe;
  const redraw = (focus) => { const c = sh.querySelector(".is-c"), y = c ? c.scrollTop : 0; box.outerHTML = qBox(); qBind(sh); if (c) c.scrollTop = y; if (focus) { const i = $("qAddI"); if (i) { i.focus(); i.setSelectionRange(i.value.length, i.value.length); } } };
  bindRows(box, e.L, () => { qPersist(); redraw(); });
  const add = f => { const o = FO(f), i = e.L.findIndex(r => r[0] === f);
    if (i >= 0) e.L[i][1] = Math.round((e.L[i][1] + (isW(o) ? o.d : 1)) * 100) / 100; else e.L.push([f, o.d]);
    CS.qAdd = false; CS.qAddT = ""; qPersist(); redraw(); toast(`+ ${o.n}`); };
  const ab = $("qAddB"); if (ab) ab.onclick = () => { CS.qAdd = true; redraw(true); };
  // prodotto scansionato: se prende il posto di un ingrediente della lista, lo sostituisce (stessi grammi); altrimenti si aggiunge
  const bindAdd = () => box.querySelectorAll("[data-qa]").forEach(b => b.onclick = () => add(b.dataset.qa));
  box.querySelectorAll("[data-qscan]").forEach(b => b.onclick = () => scanOpen(f => { if (CS.qe !== e) return; const p = prods()[f.slice(2)], i = p && p.sub ? e.L.findIndex(([x]) => x === p.sub) : -1;
    if (i >= 0) { e.L[i] = [f, Math.round(gramsOf(e.L[i][0], e.L[i][1]))]; qPersist(); redraw(); toast("🏷 Ora usa " + FO(f).n); } else add(f); }));
  const ai = $("qAddI"); if (ai) ai.oninput = () => { CS.qAddT = ai.value; box.querySelector(".qhits").innerHTML = hitBtns(ai.value); bindAdd(); box.querySelectorAll(".qhits [data-qscan]").forEach(b => b.onclick = () => scanOpen(f => { if (CS.qe === e) add(f); })); };
  bindAdd();
  const rs = $("qReset"); if (rs) rs.onclick = () => { e.L = baseQ(e.mid, e.oid, e.d).map(r => [...r]); qPersist(); redraw(); };
  const st = box.querySelector("[data-swt]"); if (st) st.onclick = () => { CS.qSw = !CS.qSw; redraw(); };
  box.querySelectorAll("[data-sw]").forEach(b => b.onclick = () => { const [i, f, q] = b.dataset.sw.split("|"), old = e.L[+i]; if (!old) return;
    e.L[+i] = [f, +q]; qPersist(); redraw(); toast(`🔄 ${FO(old[0]).n} → ${FO(f).n}`); });
}
// 🔄 SOSTITUZIONI EQUIVALENTI (22/11/2026): pollo 200 g = merluzzo ~270 g (stesse proteine), riso 80 g = pane ~110 g (stesse kcal),
// verdure stessi grammi. I gruppi stanno in CB.swaps (nutrizione.js).
function swapAlts(f, q) {
  const ids0 = g => Array.isArray(g[2]) ? g[2] : Object.keys(g[2]);
  const grp = (CB.swaps || []).find(g => ids0(g).includes(f)); if (!grp || !q) return [];
  const mode = grp[0], ids = ids0(grp), o = FO(f), G = gramsOf(f, q), ref = mode === "p" ? 1 : mode === "k" ? 0 : -1;
  return ids.filter(x => x !== f && CB.foods[x]).map(x => { const ox = FO(x); let g2 = G;
    if (mode === "t") g2 = G * grp[2][x] / grp[2][f];
    else if (ref >= 0) { const a = o.v[ref], b = ox.v[ref]; if (!a || !b) return null; g2 = G * a / b; }
    let qq; if (isW(ox)) qq = Math.round(g2 / (g2 > 100 ? 10 : 5)) * (g2 > 100 ? 10 : 5); else { const st = ox.s && ox.s < 1 ? ox.s : 0.5; qq = Math.max(st, Math.round(g2 / ox.g / st) * st); }
    return qq > 0 ? [x, qq] : null; }).filter(Boolean).slice(0, 7);
}
function swapBox(L) {
  const rows = L.map(([f, q], i) => [i, f, q, swapAlts(f, q)]).filter(r => r[3].length); if (!rows.length) return "";
  return `<div class="swp"><button class="lnk wide" data-swt="1"><i>🔄</i>${CS.qSw ? "Chiudi le sostituzioni" : "Sostituisci un ingrediente (grammi già calcolati)"}</button>
    ${CS.qSw ? rows.map(([i, f, q, al]) => `<div class="swrow"><p><b>${esc(qText(f, q))}</b> → </p><div class="rchips">${al.map(([x, qq]) => `<button class="chip" data-sw="${i}|${x}|${qq}">${esc(qText(x, qq))}</button>`).join("")}</div></div>`).join("") + `<p class="note">Carne e pesce: tabella scambi del PT (col macinato e l'orata metà olio, col salmone niente olio) · affettati e latticini: stesse proteine · pane, pasta, riso: stesse kcal · verdure: stessi grammi.</p>` : ""}</div>`;
}
// 🍳 varianti di gusto per ricetta (CB.vars)
function varBox(id) { const v = (CB.vars || {})[id]; if (!v || !v.length) return "";
  return `<details class="vars"><summary><b>✨ Varianti</b><span>${v.length} modi per cambiare gusto con la stessa ricetta</span></summary><ul>${v.map(x => `<li>${esc(x)}</li>`).join("")}</ul><p class="note">Per cambiare un ingrediente con i grammi giusti: «🔄 Sostituisci un ingrediente» nel riquadro delle quantità.</p></details>`; }
// 🧊 ristorante: scegli la proteina, completa il piatto, porta a casa per dopo
const RPROT = [["polloc", "Pollo alla griglia"], ["carnec", "Carne alla griglia"], ["pescec", "Pesce cotto"], ["fritto", "Impanato o fritto"]];
function ristBox(oid) {
  const e = CS.qe; if (!e) return ""; const f0 = e.L[0] && e.L[0][0], c = e.L.find(([f]) => CB.carbs.some(r => CB.carbFood[r[0]] === f) || f === "mpri");
  return `<div class="rist"><h3>Cosa ti ha dato il ristorante?</h3><div class="rchips">${RPROT.map(([f, n]) => `<button class="chip" data-rp="${f}" aria-pressed="${f0 === f}">${n}</button>`).join("")}</div>
    <p class="note">Completa il piatto con quello che manca: ${c && c[1] ? `${esc(qText(c[0], c[1]))} (oppure pane, patate, quello che hai: lo cambi qui sotto)` : "oggi niente carboidrato, doppia verdura"} e verdure (insalata in busta o verdure surgelate al microonde). Se una cosa non c'era, portala a «niente» con −.</p>
    ${/^fr_/.test(oid) ? `<button class="btn sm" id="frKeep" aria-pressed="${!!CS.frKeep}">${CS.frKeep ? "✓ " : ""}Ne resta ancora in frigo</button>` : `<button class="btn sm" id="frAdd">🧊 Ne porto a casa per un altro pasto</button>`}</div>`;
}
function ristBind(sh, oid) {
  sh.querySelectorAll("[data-rp]").forEach(b => b.onclick = () => { CS.qe.L[0] = [b.dataset.rp, CS.qe.L[0][1]]; openOpt(CS.qe.mid, oid, true); });
  const fa = $("frAdd"); if (fa) fa.onclick = () => { const [f, g] = CS.qe.L[0]; frList().push({ id: Date.now().toString(36), f, g: g || 150, t: FO(f).n.replace(/ \(.*\)$/, ""), d: CS.qe.d }); save(); renderCibo();
    toast("🧊 In frigo: lo trovi tra pranzo e cena per 3 giorni"); fa.textContent = "✓ Messo in frigo"; fa.disabled = true; };
  const fk = $("frKeep"); if (fk) fk.onclick = () => { CS.frKeep = !CS.frKeep; fk.setAttribute("aria-pressed", CS.frKeep); fk.textContent = (CS.frKeep ? "✓ " : "") + "Ne resta ancora in frigo"; };
}
function showSheet(sh) { sh.hidden = false; document.documentElement.classList.add("noscroll"); sh.classList.remove("on"); void sh.offsetWidth; sh.classList.add("on"); sh.querySelector(".is-c").scrollTop = 0; }
// Stima con Claude: la foto + la descrizione vanno a Claude col menu Condividi del telefono (l'app non ha un servizio di IA:
// costerebbe e servirebbe una chiave segreta, impossibile in un sito pubblico).
// Legge i numeri dalla risposta di Claude: "kcal 450 · proteine 30 g · carboidrati 40 g · grassi 18 g" (anche con altre parole intorno).
function readClaude(txt) {
  const T = (txt || "").toLowerCase().replace(/(\d)[.,](\d{3})\b/g, "$1$2"), g = re => { const m = T.match(re); return m ? Math.round(parseFloat(m[1].replace(",", "."))) : null; };
  // il totale: la riga con "totale" (o l'ultima con kcal e proteine), non la prima kcal che capita
  const lines = T.split(/\n/), tl = lines.filter(l => /\btot(ale)?\b|in tutto|complessiv/.test(l) && /cal/.test(l)).pop() || lines.filter(l => /cal/.test(l) && /prot/.test(l)).pop();
  if (tl && !/prot/.test(tl)) { const i = lines.indexOf(tl); const near = lines.slice(i, i + 4).join(" "); if (/prot/.test(near)) return readClaude(near); }
  if (tl && tl !== T && /prot/.test(tl)) return readClaude(tl);
  const k = g(/(\d+(?:[.,]\d+)?)\s*(?:k?cal|kilocalorie|calorie)/) ?? g(/(?:kcal|calorie)\D{0,12}(\d+(?:[.,]\d+)?)/);
  const p = g(/prot\w*\D{0,12}(\d+(?:[.,]\d+)?)/) ?? g(/(\d+(?:[.,]\d+)?)\s*g\s*(?:di\s*)?prot/);
  const c = g(/carbo\w*\D{0,12}(\d+(?:[.,]\d+)?)/) ?? g(/(\d+(?:[.,]\d+)?)\s*g\s*(?:di\s*)?carbo/);
  const f = g(/grass\w*\D{0,12}(\d+(?:[.,]\d+)?)/) ?? g(/(\d+(?:[.,]\d+)?)\s*g\s*(?:di\s*)?grass/);
  return k != null && p != null && c != null && f != null ? { k, p, c, f } : null;
}
// 20/11/2026: Claude risponde con una riga per alimento (grammi da cotto, condimenti nascosti compresi) che l'app legge
// e trasforma in righe modificabili; l'ultima riga ha i totali.
function claudeText(what, size, ctx) {
  return `Guarda la foto e stima cosa c'è nel piatto e quanti grammi.${ctx ? ` È ${ctx}: di solito più condito di quello fatto in casa.` : ""}${what ? ` Io ho scritto: ${what}.` : ""}${size ? ` Porzione: ${size}.` : ""}
Conta anche i condimenti che non si vedono (olio di cottura, burro, sugo, formaggio grattugiato, salse).
Rispondi SOLO con una riga per alimento, peso in grammi da cotto, nomi semplici, così:
pollo alla griglia 150 g
riso cotto 180 g
verdure 120 g
olio 15 g
Ultima riga: kcal X · proteine X g · carboidrati X g · grassi X g`;
}
// 21/11/2026: Claude in chat scrive anche "Pollo: 150 g (~250 kcal)" e "Totale circa 550 kcal" → "totale" era letto come "torta 550" (193.000 kcal)
function readClaudeList(txt) {
  const body = (txt || "").replace(/\*\*|__/g, "").split(/\n/)
    .filter(l => !/\btot(ale)?\b|\bin tutto\b|\bcomplessiv/i.test(l) && !/^[\s\-•*·]*(proteine|carboidrati|grassi|fibre|zuccheri|kcal|calorie|energia|valori)\b/i.test(l) && !(/kcal|calorie/i.test(l) && /prot|carbo|grass/i.test(l)))
    .map(l => l.replace(/[(\[]?\s*[~≈±]?\s*(circa\s*)?\d+(?:[.,]\d+)?\s*(?:-\s*\d+\s*)?k?cal(?:orie)?\s*[)\]]?/gi, "").replace(/\s[–—-]\s*$/, ""))
    .filter(l => /\d/.test(l)).map(l => l.replace(/^[\s\-•*·\d.)]+(?=[a-zà-ù])/i, "").replace(/\s*[:–—]\s*(?=[~≈]?\s*\d)/, " ").replace(/[~≈]/g, "")).join("\n");
  const r = readFood(body, "n", true); return { items: r.items.map(i => [i.f, i.q]), miss: r.miss, tot: readClaude(txt) };
}
async function askClaude(file, what, size, ctx) {
  const txt = claudeText(what, size, ctx);
  try { const f = new File([file], "piatto.jpg", { type: file.type || "image/jpeg" });
    if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], text: txt }); return; } }
  catch (e) { if (e && e.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(txt); toast("Testo copiato: apri Claude, incolla e allega la foto"); } catch (e) { toast("Apri Claude e mandagli la foto con la descrizione"); }
}
// mensa e ristorante: foto a Claude, quanto era condito, come stimare a occhio
// 🍳 sala colazione: cosa hanno preparato oggi (varianti stimate in CB.sala)
function salaBox() {
  const e = CS.qe; if (!e) return ""; const cur = CB.sala.findIndex(v => sameQ(parseQ(v[1]).filter(([f]) => f !== "olio"), e.L.filter(([f]) => f !== "olio")));
  return `<div class="rist"><h3>Cosa hanno fatto oggi?</h3><div class="rchips">${CB.sala.map(([n], i) => `<button class="chip" data-sala="${i}" aria-pressed="${i === cur}">${esc(n)}</button>`).join("")}</div>
    <p class="note">${cur >= 0 ? esc(CB.sala[cur][2]) + ". " : ""}Sono stime: correggi con − / + o scrivi qui sotto cosa c'era davvero.</p></div>`;
}
// 20/11/2026: nel riquadro di mensa/ristorante l'utente aveva SCRITTO cosa aveva preso, ma il campo leggeva solo la risposta di Claude
// coi grammi: il testo veniva ignorato e si perdeva chiudendo. Ora qualsiasi testo (descrizione o risposta di Claude) diventa righe,
// "✓ Metti nel piatto" le mette nella lista e segna il pasto; il testo resta salvato nel giorno (day.note) e si rivede riaprendo.
function estRead(txt) {
  const claude = (txt || "").split(/\n/).filter(l => /\d/.test(l)).length >= 2 || /kcal/i.test(txt || "");
  if (claude) { const r = readClaudeList(txt); if (r.items.length) return r; }
  const r = readFood(txt || "", "n"); return { items: r.items.map(i => [i.f, i.q]), miss: r.miss };
}
function estBox(oid) {
  const e = CS.qe; if (!e) return ""; const ol = (e.L.find(([f]) => f === "olio") || [0, 0])[1], note = ((fDay(e.d).note || {})[e.mid]) || "";
  return `<div class="est"><h3>Cosa hai preso?</h3>
    <p class="note">Scrivilo come lo diresti ("pasta al ragù, cotoletta e patate", "un mestolo di riso e pollo") oppure incolla la risposta di Claude. Poi tocca <b>✓ Metti nel piatto</b>: diventa la lista qui sotto, correggibile con − / +.</p>
    <textarea id="oR" rows="2" placeholder="Cosa c'era nel piatto? (o la risposta di Claude)">${esc(note)}</textarea>
    <div class="oprev" id="oP"></div>
    <div class="row"><button class="btn primary sm" id="oUse" hidden>✓ Metti nel piatto</button><label class="btn sm" for="oPic">📷 Non sai quanto? Foto a Claude</label><input type="file" id="oPic" accept="image/*" capture="environment" hidden></div>
    <p class="plab">Quanto era condito?</p>
    <div class="unto">${CB.unto.map(([n, g, d]) => `<button data-unto="${g}" aria-pressed="${ol === g}"><b>${n}</b><small>${esc(d)}</small></button>`).join("")}</div>
    ${scaleGuide()}</div>`;
}
function estBind(sh, mid, oid) {
  const e = CS.qe; if (!e || !$("oR")) return; const ctx = oid === "mensa" ? "un piatto della mensa del lavoro" : "un piatto del ristorante";
  const ta = $("oR"), pv = $("oP"), use = $("oUse");
  $("oPic").onchange = ev => { const f = ev.target.files[0]; ev.target.value = ""; if (!f) return; if (aiOn()) aiInto(f, e, mid, oid); else askClaude(f, ta.value.trim(), "", ctx); };
  const show = () => { const t = ta.value.trim(); setFDay(e.d, x => { x.note = { ...(x.note || {}) }; if (t) x.note[mid] = t; else delete x.note[mid]; });
    if (!t) { pv.innerHTML = ""; use.hidden = true; return; }
    const r = estRead(t);
    pv.innerHTML = (r.items.length ? `<p class="xpok">Ho capito: ${r.items.map(([f, q]) => `<b>${esc(qText(f, q))}</b>`).join(" · ")} → <b>~${valOfQ(r.items)[0]} kcal</b></p>` : "")
      + (r.miss.length ? `<p class="xpno">Non ho capito: «${esc(r.miss.join("», «"))}».${aiOn() ? "" : " Prova con parole più semplici o con la foto a Claude."}</p>${aiOn() ? `<button class="btn sm primary" id="oAi">✨ Fallo capire all'IA</button>` : ""}` : "");
    const oa = $("oAi"); if (oa) oa.onclick = async () => { oa.disabled = true; oa.textContent = "Sto leggendo…";
      try { const j = await aiPost("/food/photo", { mode: "testo", text: ta.value.trim(), meal: oid === "mensa" ? "pranzo in mensa" : "piatto del ristorante" }); const rr = aiRows(j.items); if (!rr.L.length) throw new Error("non ho riconosciuto alimenti");
        const oil = e.L.find(([f]) => f === "olio"), keep = !rr.L.some(([f]) => f === "olio");
        e.L = [...rr.L, ...(keep && oil ? [[...oil]] : [])]; const on = (fDay(e.d).m || {})[mid] === oid; if (on) qPersist(); else logMeal(e.d, mid, oid, false, e.L);
        renderCibo(); openOpt(mid, oid, true); toast(`✓ Nel piatto: ~${valOfQ(e.L)[0]} kcal`); }
      catch (err) { toast("⚠️ " + (err.message || err)); oa.disabled = false; oa.textContent = "✨ Fallo capire all'IA"; } };
    use.hidden = !r.items.length; };
  let tmo; ta.oninput = () => { clearTimeout(tmo); tmo = setTimeout(show, 250); };
  show();
  use.onclick = () => { const r = estRead(ta.value); if (!r.items.length) return;
    // al posto delle righe generiche della mensa/ristorante; l'olio resta quello scelto (a meno che il testo lo dica)
    const keepOil = !r.items.some(([f]) => f === "olio" || f === "spruzz"), oil = e.L.find(([f]) => f === "olio");
    e.L = [...r.items.map(x => [...x]), ...(keepOil && oil ? [[...oil]] : [])];
    const on = (fDay(e.d).m || {})[mid] === oid; if (on) qPersist(); else logMeal(e.d, mid, oid, false, e.L);
    renderCibo(); openOpt(mid, oid, true); toast(`✓ Nel piatto: ~${valOfQ(e.L)[0]} kcal${r.miss.length ? ` · non ho capito «${r.miss[0]}»` : ""}`); };
  sh.querySelectorAll("[data-unto]").forEach(b => b.onclick = () => { const g = +b.dataset.unto, i = e.L.findIndex(([f]) => f === "olio");
    if (i >= 0) e.L[i][1] = g; else e.L.push(["olio", g]); qPersist(); openOpt(mid, oid, true); });
}


// ---------- 🧺 COSA HO IN CASA + ricette nuove di Claude (20/11/2026: "comporre ricette partendo da quali e quanti ingredienti ho, anche con una foto") ----------
// 1) l'app confronta quello che hai con le ricette che conosce (cosa puoi fare subito, cosa manca);
// 2) Claude inventa una ricetta nuova rispettando il piano e risponde in un formato fisso che l'app importa tra "Le mie" ricette
//    (D.food.myrec[id] = { name, min, tools, pasti, meal, q [[alimento, quantità] per 1 pasto], steps [{t, min}], extra [righe non capite], at }).
const myRec = () => { const f = FOOD(); return (f.myrec = f.myrec || {}); };
const FDK = { pollo: "pollo", polloc: "pollo", carnec: "manzo", manzo: "manzo", hamb: "manzo", macinato: "polpette", ragu: "sugo", merluzzo: "pesce", pescec: "pesce", salmone: "salmone", gamberi: "gamberi", tonno: "tonno", uovo: "uova", albume: "uova", albumeg: "uova", mozz: "mozzarella", mozzn: "mozzarella", bresaola: "bresaola", fiocchi: "fiocchi", yogurt: "yogurt", riso: "riso", risoc: "riso", rprec: "riso", pasta: "pasta", pastac: "pasta", pastai: "pasta", cous: "cous", farro: "farro", farrop: "farro", quinoa: "farro", gnocchi: "gnocchi", patate: "patate", patatec: "patate", pdolci: "pdolci", pane: "pane", panino: "pane", segale: "pane", piadina: "piadina", cornflakes: "cornflakes", galletta: "gallette", vgrill: "verdure", vmiste: "verdure", verdure: "verdure", zucchine: "verdure", peperoni: "verdure", spinaci: "spinaci", insalata: "insalata", rucola: "rucola", pomodorini: "pomodorini", passata: "sugo", noce: "noci", ceci: "ceci", prot: "proteine", fritto: "cotoletta", pizza: "pizza" };
const fdOf = f => { const o = FO(f); if (o && o.mine) { const p = prods()[f.slice(2)]; return p && p.sub ? FDK[p.sub] : null; } return FDK[f]; };
const drawOf = L => [...new Set(L.filter(([, q]) => q).map(([f]) => fdOf(f)).filter(Boolean))].slice(0, 4);
const STOOL = [[/friggitrice/i, "friggitrice"], [/microonde/i, "microonde"], [/cuociriso/i, "cuociriso"], [/padella/i, "padella"], [/pentola|bollent|bolle|lessa|scola/i, "pentola"], [/forno/i, "forno"], [/tagli|trita|affetta/i, "tagliere"], [/contenitor|frigo/i, "contenitore"], [/ciotola|mescola|sbatti|condisci/i, "ciotola"]];
function syncRecipes() {
  CB.recipes = CB.recipes.filter(r => !r.mine);
  for (const [id, x] of Object.entries(myRec())) {
    const main = x.meal === "pr" || x.meal === "ce", n = Math.max(1, x.pasti || 1);
    CB.recipes.push({ id: "u_" + id, mine: 1, name: x.name, s: x.name.length > 22 ? x.name.slice(0, 21) + "…" : x.name, min: x.min || 20, lvl: 1, tools: x.tools || "", q: x.q,
      main, one: n === 1, for: main ? undefined : { [x.meal]: "u_" + id }, cat: main ? undefined : x.meal === "col" ? "col" : "sp", cb: {}, go: "c", p: drawOf(x.q),
      p1: n > 1 ? "metà subito" : "", p2: n > 1 ? "l'altra metà in un contenitore, in frigo" : "",
      ingr: [...x.q.filter(([, q]) => q).map(([f, q]) => qText(f, Math.round(q * n * 100) / 100)), ...(x.extra || [])],
      steps: x.steps.map(st => { const tl = (STOOL.find(([re]) => re.test(st.t)) || [0, "ciotola"])[1]; return { tool: tl, t: st.t, min: st.min || undefined, p: drawOf(readFood(st.t, "n").items.map(i => [i.f, 1])).slice(0, 3) }; }) });
  }
}
// 🥫 IN CASA (20/11/2026: "anche senza scrivere: le caselle degli ingredienti che spesso ho in casa, così compongo il piatto")
// D.food.pantry = { alimento: 1 } = ce l'ho; resta ricordato. Le caselle: quelle del piano + i tuoi prodotti + quello che scrivi.
const PGRID = [["Proteine", ["pollo", "manzo", "macinato", "merluzzo", "salmone", "gamberi", "uovo", "albumeg", "tonno", "bresaola", "mozz", "fiocchi", "yogurt", "ceci", "prot"]],
  ["Carboidrati", ["riso", "rprec", "pasta", "cous", "farro", "gnocchi", "patate", "pdolci", "pane", "segale", "piadina", "cornflakes", "galletta"]],
  ["Verdure", ["vgrill", "vmiste", "zucchine", "peperoni", "spinaci", "insalata", "rucola", "pomodorini", "passata"]],
  ["Altro", ["noce", "parmigiano", "latte", "mozzn"]]];
const pantry = () => { const f = FOOD(); return (f.pantry = f.pantry || {}); };
const pantryOn = () => Object.keys(pantry()).filter(f => FO(f));
const shortN = f => FO(f).n.replace(/ \(.*\)$/, "").replace(/ · .*/, "");
function pantryTiles(cls = "pt", sel) {
  const P = pantry(), grid = new Set(PGRID.flatMap(([, L]) => L)), extra = [...Object.keys(CB.foods).filter(f => FO(f).mine), ...pantryOn()].filter((f, i, a) => !grid.has(f) && a.indexOf(f) === i);
  const t = f => `<button class="ptile${(sel ? sel(f) : P[f]) ? " on" : ""}" data-${cls}="${f}">${fdOf(f) ? dishSVG([fdOf(f)], null, f, "pico") : `<i class="pnone">${FO(f).mine ? "🏷" : "•"}</i>`}<span>${esc(shortN(f))}</span></button>`;
  return [...PGRID, ...(extra.length ? [["Tuoi e scritti da te", extra]] : [])].map(([n, L]) => `<p class="psub">${n}</p><div class="ptiles">${L.filter(f => FO(f)).map(t).join("")}</div>`).join("");
}
// 🍽 COMPONI IL TUO PIATTO: tocchi gli ingredienti, l'app mette i grammi del piano, tu correggi; poi lo segni o chiedi a Claude come cucinarlo
const PROTG = { pollo: 200, manzo: 200, macinato: 200, merluzzo: 250, pescec: 200, salmone: 150, gamberi: 250, tonno: 150, uovo: 2, albumeg: 150, albume: 2, bresaola: 100, mozz: 1, mozzn: 125, fiocchi: 150, ceci: 150, polloc: 150, carnec: 150, hamb: 1 };
function compGrams(f, meal, d, L) {
  const o = FO(f), main = meal === "pr" || meal === "ce"; let base = f;
  if (o.mine) { const p = prods()[f.slice(2)]; if (p && p.sub) base = p.sub; }
  // 22/11/2026: per un prodotto di marca la quantità del piano si calcola sull'alimento base e poi si converte nella sua unità
  // (prima un pane di segale di marca "a fette" riceveva 120 fette: i grammi finivano nel campo dei pezzi)
  const out = q => o.mine && base !== f ? convQ(base, q, f) : q;
  if (!main) return o.mine ? (prods()[f.slice(2)] || {}).d || o.d : o.d;
  if (PROTG[base] != null) return out(PROTG[base]);
  const cn = Object.keys(CB.carbFood).find(k => CB.carbFood[k] === base);
  if (cn) { let c = carbQ(cn, meal, d); if (!c || !c[1]) { const row = CB.carbs.find(r => r[0] === cn); const m = row && row[2].match(/(\d+)/); c = [base, m ? +m[1] : FO(base).d]; if (row && /½|¾/.test(row[2])) c[1] = /½/.test(row[2]) ? .5 : .75; if (row && / g/.test(row[2]) && !isW(FO(base))) c[1] = Math.round(c[1] / FO(base).g * 2) / 2; } return out(c[1]); }
  if (VEG.has(base)) return out(L.some(([x]) => VEG.has(x)) ? 150 : 200);
  return o.d;
}
function openCompose(keep) {
  const sh = $("fsheet"), d = cDay(), C = CS.cp = (keep && CS.cp) || { meal: (CS.hv && CS.hv.meal) || "pr", L: [] }, y = keep && !sh.hidden ? sh.querySelector(".is-c").scrollTop : 0;
  const inPlate = f => C.L.some(([x]) => x === f), t = valOfQ(C.L), L0 = C.meal === "pr" ? lunchLvl(d) : null;
  sh.querySelector(".is-h").innerHTML = `<b>🍽 Componi il tuo piatto</b><span class="rmeta">tocca gli ingredienti, poi correggi i grammi</span>`;
  sh.querySelector(".is-c").innerHTML = `<div class="qfor"><span>Per</span>${[...HVM, ["s2", "Spuntino 2"]].map(([k, n]) => `<button class="chip" data-cm="${k}" aria-pressed="${C.meal === k}">${n}</button>`).join("")}</div>
    ${L0 === 0 ? `<p class="note">Oggi a pranzo, secondo la scala 80/40/0, niente carboidrato. Se lo metti, l'app propone la porzione piccola.</p>` : ""}
    <div class="rhero">${C.L.length ? dishSVG(drawOf(C.L), null, "cp" + C.L.length, "dish big") : `<div class="cpempty">Il piatto è vuoto:<br>tocca qui sotto quello che ci metti</div>`}</div>
    ${C.L.length ? `<div class="qbox cpbox">${rowsHTML(C.L)}<p class="qtot"><b>~${fmt(t[0])} kcal</b><span>proteine ${t[1]} g · carboidrati ${t[2]} g · grassi ${t[3]} g</span></p></div>
      <div class="rlog"><button class="btn primary" id="cpLog">✓ Mangiato ${MEALN[C.meal] || "a " + (mealDef(C.meal) || { name: "" }).name.toLowerCase()}</button><button class="btn" id="cpAsk">📷 Come lo cucino? Chiedi a Claude</button></div>` : ""}
    <p class="plab">Nel piatto · tocca per mettere o togliere</p><div class="pgridt">${pantryTiles("cp", inPlate)}</div>
    <div class="qadd"><input id="cpI" placeholder="Altro? Cerca (es. parmigiano)" autocomplete="off"><div class="qhits" id="cpH"></div></div>
    ${condBox("altro")}
    ${C.L.length ? `<div class="cpbar"><span>🍽 ${C.L.filter(([f, q]) => q && !CONDF.includes(f)).length} ingredienti · <b>~${fmt(t[0])} kcal</b></span><button class="btn sm" id="cpTop">Vedi il piatto ↑</button></div>` : ""}`;
  const tp = () => { const b = $("cpTop"); if (b) b.onclick = () => sh.querySelector(".is-c").scrollTo({ top: 0, behavior: "smooth" }); };
  if (sh.hidden || !keep) showSheet(sh); else sh.querySelector(".is-c").scrollTop = y;
  const toggle = f => { const i = C.L.findIndex(([x]) => x === f); if (i >= 0) C.L.splice(i, 1); else { C.L.push([f, compGrams(f, C.meal, d, C.L)]); if ((C.meal === "pr" || C.meal === "ce") && !C.L.some(([x]) => x === "olio")) C.L.push(["olio", 2]); } try { iosTap(); } catch (_) {} openCompose(true); };
  sh.querySelectorAll("[data-cp]").forEach(b => b.onclick = () => toggle(b.dataset.cp));
  sh.querySelectorAll("[data-cm]").forEach(b => b.onclick = () => { C.meal = b.dataset.cm; C.L = C.L.map(([f, q]) => [f, f === "olio" ? q : compGrams(f, C.meal, d, [])]); openCompose(true); });
  tp(); const box = sh.querySelector(".cpbox"); if (box) bindRows(box, C.L, () => openCompose(true));
  const ci = $("cpI"), ch = $("cpH"); ci.oninput = () => { ch.innerHTML = ci.value.trim() ? foodHits(ci.value).map(f => `<button class="chip" data-cpa="${f}">${esc(FO(f).n)}</button>`).join("") : ""; ch.querySelectorAll("[data-cpa]").forEach(b => b.onclick = () => { pantry()[b.dataset.cpa] = 1; save(); toggle(b.dataset.cpa); }); };
  const lg = $("cpLog"); if (lg) lg.onclick = () => { const it = C.L.filter(([, q]) => q);
    const e = { id: "x" + Date.now().toString(36), meal: C.meal, t: ("Il mio piatto: " + it.filter(([f]) => !CONDF.includes(f)).map(([f]) => shortN(f).toLowerCase()).join(", ")).slice(0, 80), s: "n", it: it.map(r => [...r]), at: Date.now() };
    CS.cp = null; closeRecipe(); CS.tab = "oggi";
    if (C.meal && !(fDay(d).m || {})[C.meal]) { const id = rememberDish(C.meal, e.t, e.it); logMeal(d, C.meal, "d_" + id, false, e.it); }
    else { setFDay(d, x => x.x = [...(x.x || []), e]); rememberDish(C.meal, e.t, e.it); }
    renderCibo(); toast(`Segnato: ~${valOfQ(e.it)[0]} kcal · lo ritrovi tra le caselle`); };
  const ak = $("cpAsk"); if (ak) ak.onclick = async () => { const H = CS.hv = CS.hv || { open: false, meal: C.meal, r: "" }; H.meal = C.meal; H.t = C.L.filter(([, q]) => q).map(([f, q]) => qText(f, q)).join(", ");
    const txt = hvPrompt().replace("con quello che ho in casa", "con esattamente questi ingredienti e queste quantità");
    try { if (navigator.share) { await navigator.share({ text: txt }); } else throw 0; } catch (e) { if (e && e.name === "AbortError") return; try { await navigator.clipboard.writeText(txt); toast("Richiesta copiata: apri Claude e incollala"); } catch (_) {} }
    toast("Quando Claude risponde: Ricette → 🧺 → incolla la ricetta per salvarla"); };
}
// quello che ti serve per una ricetta, a gruppi (una verdura vale l'altra; il carboidrato si può cambiare, tranne dove è il piatto)
const VEG = new Set(["vgrill", "vmiste", "verdure", "zucchine", "peperoni", "spinaci", "insalata", "rucola", "pomodorini"]);
const CARBS = new Set(["riso", "risoc", "rprec", "pasta", "pastac", "pastai", "cous", "farro", "farrop", "quinoa", "gnocchi", "patate", "patatec", "pdolci", "pane", "panino", "piadina"]);
const PANTRY = new Set([...CONDF, "cacao", "passata"]);
const EQ = { polloc: "pollo", pastac: "pasta", pastai: "pasta", risoc: "riso", rprec: "riso", farrop: "farro", albume: "albumeg", mozzn: "mozz", pescec: "merluzzo", patatec: "patate" };
const STRICT = new Set(["wrappollo", "pastatonno", "frittatapasta", "pizzapiadina", "gnocchi", "risosaltato", "farro", "pastapollo", "pastagamberi", "pastaragu"]);
function grpOf(f, flexCarb) { if (FO(f) && FO(f).mine) { const p = prods()[f.slice(2)]; f = p && p.sub || f; } if (VEG.has(f)) return "veg"; if (flexCarb && CARBS.has(f)) return "carb"; return EQ[f] || f; }
function needOf(r, meal, d) {
  const mid = r.main ? (meal === "ce" ? "ce" : "pr") : Object.keys(r.for || {})[0], oid = r.main ? r.id : (r.for || {})[mid];
  const L = mid && oid ? baseQ(mid, oid, d) : null; if (!L) return null;
  const flex = r.main && !STRICT.has(r.id); const need = new Map();
  for (const [f, q] of L) { if (!q || PANTRY.has(f)) continue; const g = grpOf(f, flex); if (!need.has(g)) need.set(g, { f, g: gramsOf(f, q) }); }
  return need;
}
function hvMatch(text, meal, d) {
  const items = readFood(text || "", "n").items; for (const f of pantryOn()) if (!items.some(i => i.f === f) && FO(f)) items.push({ f, q: FO(f).d, t: "" });
  if (!items.length) return { items, list: [] };
  const have = new Map(); for (const i of items) { const exp = /\d/.test(i.t); for (const flex of [true, false]) { const g = grpOf(i.f, flex); const h = have.get(g) || { g: 0, exp: true }; have.set(g, { g: h.g + gramsOf(i.f, i.q), exp: h.exp && exp }); } }
  const want = meal === "pr" || meal === "ce" ? r => r.main : meal === "col" ? r => r.cat === "col" || (r.for && r.for.col) : r => r.cat === "sp" || (r.for && (r.for.s1 || r.for.s2));
  const list = [];
  for (const r of CB.recipes.filter(want)) { const need = needOf(r, meal, d); if (!need || !need.size) continue;
    const miss = [], low = []; let ok = 0;
    for (const [g, n] of need) { const h = have.get(g); if (!h) miss.push(g === "veg" ? "verdure" : g === "carb" ? "un carboidrato" : FO(n.f).n.replace(/ \(.*\)$/, "").toLowerCase()); else { ok++; if (h.exp && h.g < n.g * .6) low.push(FO(n.f).n.replace(/ \(.*\)$/, "").toLowerCase()); } }
    if (ok / need.size >= .5) list.push({ r, miss, low, sc: miss.length * 10 - ok });
  }
  return { items, list: list.sort((a, b) => a.sc - b.sc).slice(0, 6) };
}
const HVM = [["pr", "Pranzo"], ["ce", "Cena"], ["col", "Colazione"], ["s1", "Spuntino"]];
// ---------- 🥫 CON QUELLO CHE HAI (25/11/2026) ----------
// L'utente: "le ricette includono ingredienti che non ho e questo mi scoccia il trovare la ricetta che posso fare".
// Regola: decide solo l'ingrediente PRINCIPALE (la proteina). Verdure: una vale l'altra (anche surgelate). Carboidrati secchi
// (riso, pasta, cous cous, farro, pane, patate) e dispensa (olio, spezie, aglio, cipolla, passata, aceto, miele, erbe) si danno per
// scontati; contorni (olive, carote, parmigiano, yogurt, fagioli…) sono facoltativi. Servono davvero solo piadina e gnocchi quando
// sono il piatto. Se manca la proteina ma ne hai un'altra della stessa famiglia, la ricetta si ADATTA con i grammi della tabella
// scambi del PT, e tutti i conti la seguono (day.ad[ricetta] = {from, to, q}, letto da baseQ).
const PFAM = [["pollo", "manzo"], ["merluzzo", "orata", "gamberi", "salmone", "calamari"], ["macinato"], ["uovo", "albumeg"], ["bresaola", "tacchinoaff"], ["tonno"], ["mozz"]];
const PROTS = new Set(PFAM.flat());
const PKEEP = { piadina: 1, gnocchi: 1 }; // carboidrati che servono davvero (quando la ricetta è in STRICT)
const canonF = f => { if (FO(f) && FO(f).mine) { const p = prods()[f.slice(2)]; f = (p && (p.sub || p.of)) || f; } return EQ[f] || f; };
function haveNow() { // in casa + scongelato pronto; a parte quello ancora congelato
  const P = pantry(), have = new Set(Object.keys(P).filter(f => P[f]).map(canonF)), frozen = new Set();
  for (const x of frz()) { if (!(x.q > 0)) continue; const st = frState(x).s, f = canonF(x.f); if (st === "ready") have.add(f); else if (st === "frz" || st === "thaw") frozen.add(f); }
  return { have, frozen, known: Object.keys(P).some(f => P[f]) };
}
function mainProt(r) {
  const spec = CB.mq[r.id], L = r.mine ? r.q : spec ? parseQ(typeof spec === "string" ? spec : spec.q) : (r.for && baseQ(Object.keys(r.for)[0], Object.values(r.for)[0], todayISO())) || [];
  const x = L.find(([f]) => PROTS.has(canonF(f))); return x ? [canonF(x[0]), x[1]] : null;
}
// si può fare con quello che hai? { ok, prot, use (adattamento), frz (proteina in congelatore), miss [] }
function canMake(r, H) {
  H = H || haveNow(); const mp = mainProt(r), miss = [];
  for (const f of Object.keys(PKEEP)) if (STRICT.has(r.id) && (CB.mq[r.id] ? JSON.stringify(CB.mq[r.id]) : "").includes(f) && !H.have.has(f)) miss.push(f);
  if (!mp) return { ok: !miss.length, miss };
  const [pf, pq] = mp; if (H.have.has(pf)) return { ok: !miss.length, prot: pf, miss };
  const fam = (PFAM.find(g => g.includes(pf)) || [pf]).filter(x => x !== pf), alt = fam.find(x => H.have.has(x));
  if (alt) { const sw = swapAlts(pf, pq).find(([x]) => x === alt), q = sw ? sw[1] : PROTG[alt] || pq; return { ok: !miss.length, prot: pf, use: { from: pf, to: alt, q }, miss }; }
  const fz = [pf, ...fam].find(x => H.frozen.has(x));
  return { ok: false, prot: pf, frz: fz || null, miss: [pf, ...miss] };
}
const pname = f => shortN(f).toLowerCase();
const adOf = (d, rid) => ((fDay(d).ad || {})[rid]) || null;
function setAd(d, rid, use) { setFDay(d, x => { x.ad = { ...(x.ad || {}) }; if (use) x.ad[rid] = use; else delete x.ad[rid]; }); }
// caselle rapide "cosa hai in frigo": proteine e verdure (il resto si dà per scontato)
const PKQ = [["Carne e pesce", ["pollo", "manzo", "macinato", "merluzzo", "salmone", "gamberi"]], ["Altre proteine", ["uovo", "albumeg", "bresaola", "tacchinoaff", "tonno", "mozz"]],
  ["Verdure (anche surgelate)", ["vgrill", "insalata", "zucchine", "peperoni", "spinaci", "pomodorini", "broccoli"]], ["Se le hai", ["piadina", "gnocchi"]]];
function pkBox(compact) {
  const P = pantry(), H = haveNow(), t = f => FO(f) ? `<button class="ptile${P[f] ? " on" : ""}" data-pk="${f}">${fdOf(f) ? dishSVG([fdOf(f)], null, f, "pico") : "<i class=\"pnone\">•</i>"}<span>${esc(shortN(f))}</span></button>` : "";
  const fz = [...H.frozen].filter(f => FO(f));
  return `<div class="pkbox">${compact ? "" : `<p class="note">Tocca quello che hai in frigo: ti propongo solo ricette che puoi fare. Riso, pasta, pane, olio e spezie li do per scontati.</p>`}
    ${PKQ.map(([n, L]) => `<p class="psub">${n}</p><div class="ptiles">${L.map(t).join("")}</div>`).join("")}
    ${fz.length ? `<p class="note">🧊 Nel congelatore: ${esc(fz.map(pname).join(", "))} (lo conto quando lo tiri fuori)</p>` : ""}
    <div class="pkbtn"><label class="lnk" for="hvFrigo"><i>📷</i>Fai una foto al frigo</label><input type="file" id="hvFrigo" accept="image/*" capture="environment" hidden><button class="btn sm primary" data-pkok>Fatto</button></div>${frigoBox()}</div>`;
}
document.addEventListener("click", e => {
  const b = e.target.closest && e.target.closest("[data-pk],[data-pkok],[data-pkopen],[data-adoff],[data-fin]"); if (!b) return;
  if (b.dataset.pk) { const P = pantry(), f = b.dataset.pk; if (P[f]) delete P[f]; else P[f] = 1; FOOD().pantryAt = Date.now(); save(); try { iosTap(); } catch (_) {} renderCibo(); }
  else if (b.hasAttribute("data-pkok")) { CS.pkOpen = false; CS.frigo = null; renderCibo(); }
  else if (b.hasAttribute("data-pkopen")) { CS.pkOpen = !CS.pkOpen; renderCibo(); }
  else if (b.dataset.adoff) { setAd(cDay(), b.dataset.adoff, null); if (CS.recipe) openRecipe(CS.recipe, CS.recCtx, true); renderCibo(); }
  else if (b.dataset.fin) { delete pantry()[b.dataset.fin]; save(); toast(`Tolto da «in casa»: ${pname(b.dataset.fin)}`); renderCibo(); }
});
function noneNote() { const H = haveNow(), fz = [...H.frozen].filter(f => PROTS.has(f) && FO(f));
  return `<p class="tpnone">Con quello che hai in frigo non c'è una ricetta del piano.${fz.length ? ` 🧊 Nel congelatore hai ${esc(fz.map(pname).join(", "))}: tiralo fuori stasera.` : ""} Oggi prova <b>😮‍💨 Sono stanco</b>, oppure aggiorna «Cosa ho» se hai comprato qualcosa.</p>`; }
// riga nella ricetta: hai tutto / adattata / cosa manca
function hvRecLine(r, d) {
  if (adOf(d, r.id)) return adBanner(r.id, d);
  const H = haveNow(); if (!H.known) return ""; const c = canMake(r, H);
  if (c.use) return `<p class="adban">🥫 Non hai ${esc(pname(c.use.from))}, ma hai ${esc(pname(c.use.to))}: va benissimo. <button class="lnk sm" data-aduse="${r.id}"><i>🔄</i>Usa ${esc(qText(c.use.to, c.use.q))}</button></p>`;
  if (c.ok) return mainProt(r) ? `<p class="adok">🥫 Hai tutto quello che serve. Verdure: va bene quella che hai.</p>` : "";
  return `<p class="admiss">🥫 Ti manca: ${esc(c.miss.map(pname).join(", "))}${c.frz ? ` · 🧊 hai ${esc(pname(c.frz))} nel congelatore` : ""}.</p>`;
}
document.addEventListener("click", e => { const b = e.target.closest && e.target.closest("[data-aduse]"); if (!b) return; const r = recipeById(b.dataset.aduse), c = r && canMake(r);
  if (c && c.use) { setAd(cDay(), r.id, c.use); if (CS.qe && CS.qe.oid === r.id) qeInit(CS.qe.d, CS.qe.mid, CS.qe.oid); openRecipe(r.id, CS.recCtx, true); renderCibo(); toast(`🔄 ${shortN(c.use.to)} al posto di ${pname(c.use.from)}`); } });
// riga "adattata" in cima a ricetta e cucina passo passo
function adBanner(rid, d) { const a = adOf(d, rid); return a ? `<p class="adban">🔄 Oggi con <b>${esc(qText(a.to, a.q))}</b> al posto di ${esc(pname(a.from))}: grammi e kcal già ricalcolati. <button class="lnk sm" data-adoff="${rid}"><i>↩</i>Usa ${esc(pname(a.from))}</button></p>` : ""; }

// 📷 FOTO DEL FRIGO (22/11/2026, richiesta dell'utente: "faccio una foto al frigo e capisci da solo cosa ho e cosa no").
// L'IA elenca gli alimenti visti → diventano "in casa"; gli alimenti freschi che erano "in casa" ma non si vedono più
// vengono proposti come finiti (un tocco li toglie). Più foto (frigo + dispensa) si sommano. Le ricette sotto si aggiornano.
const FRIDGE = new Set(["pollo", "manzo", "macinato", "merluzzo", "salmone", "gamberi", "uovo", "albumeg", "bresaola", "mozz", "mozzn", "fiocchi", "yogurt", "latte", "parmigiano", "zucchine", "peperoni", "spinaci", "insalata", "rucola", "pomodorini", "polloc", "tacchinoaff", "pcotto", "ricotta"]);
function frigoBox() {
  const F = CS.frigo; if (!F) return "";
  if (F.run) return `<div class="shotrun"><i class="spin"></i><b>Sto guardando la foto…</b><small>di solito 10-15 secondi</small></div>`;
  const nm = f => esc(shortN(f));
  return `<div class="frres">${F.seen.length ? `<p><b>Vedo ${F.seen.length} cose</b>${F.added.length ? ` · ${F.added.length} aggiunte a «in casa»` : ""}: ${F.seen.map(nm).join(", ")}${F.unk.length ? ` · non so cosa sia: ${esc(F.unk.join(", "))}` : ""}</p>` : "<p>Non ho riconosciuto alimenti: prova più da vicino o con più luce.</p>"}
    ${F.gone.length ? `<p class="plab">Non li vedo più · finiti? Tocca quelli che non hai</p><div class="rchips">${F.gone.map(f => `<button class="chip" data-fg="${f}" aria-pressed="${!pantry()[f]}">${pantry()[f] ? "" : "✕ "}${nm(f)}</button>`).join("")}</div><button class="lnk no" id="frAllOff"><i>✕</i>Non ho più nessuno di questi</button>` : ""}
    <p class="note">Altra foto (es. la dispensa)? Si aggiunge a questa. Quello che l'IA non vede lo tocchi tu qui sotto.</p></div>`;
}
function frigoBind(box) {
  const inp = $("hvFrigo"); if (inp) inp.onchange = async e => { const file = e.target.files[0]; e.target.value = ""; if (!file) return;
    if (!aiOn()) await aiProbe(true); if (!aiOn()) return toast("Analisi delle foto non disponibile ora: tocca tu quello che hai");
    let p; try { p = await shrinkPic(file, 1280); } catch (_) { return toast("Foto non leggibile"); }
    const prev = CS.frigo && !CS.frigo.run ? CS.frigo : null; CS.frigo = { ...(prev || { seen: [], added: [], gone: [], unk: [] }), run: true }; renderCibo();
    try { const j = await aiPost("/food/photo", { img: p.b64, mime: p.mime, mode: "frigo" }); const P = pantry(), F = CS.frigo;
      for (const it of j.items || []) { const r = readFood(it.n, "n", true, true), f = r.items[0] && r.items[0].f;
        if (!f) { if (!F.unk.includes(it.n)) F.unk.push(it.n); continue; } const g = { polloc: "pollo", pastac: "pasta", risoc: "riso", pcotto: "pcotto" }[f] || f;
        if (!F.seen.includes(g)) F.seen.push(g); if (!P[g]) { P[g] = 1; if (!F.added.includes(g)) F.added.push(g); } }
      // freschi che erano in casa ma non si vedono in nessuna delle foto
      F.gone = Object.keys(P).filter(f => P[f] && FRIDGE.has(f) && !F.seen.includes(f)).concat(F.gone.filter(f => !F.seen.includes(f))).filter((f, i, a) => a.indexOf(f) === i);
      F.run = false; save(); renderCibo(); toast(F.seen.length ? `📷 ${F.seen.length} alimenti riconosciuti` : "Nessun alimento riconosciuto");
    } catch (err) { CS.frigo = prev; renderCibo(); toast("⚠️ " + (err.message || err)); } };
  box.querySelectorAll("[data-fg]").forEach(b => b.onclick = () => { const P = pantry(), f = b.dataset.fg; if (P[f]) delete P[f]; else P[f] = 1; save(); renderCibo(); });
  const all = $("frAllOff"); if (all) all.onclick = () => { const P = pantry(); for (const f of CS.frigo.gone) delete P[f]; save(); renderCibo(); toast("Tolti da «in casa»"); };
}
function hvCard() {
  const H = CS.hv = CS.hv || { open: false, t: "", meal: "pr", r: "" };
  if (!H.open) return `<button class="card hvopen" id="hvOpen"><b>🧺 Cosa cucino con quello che ho?</b><span>Fotografa il frigo o scrivi cosa hai: ti dico cosa puoi fare subito, oppure Claude inventa una ricetta nuova per il tuo piano.</span></button>`;
  return `<div class="card hv"><div class="hvh"><b>🧺 Cosa hai in casa?</b><button class="btn sm" id="hvX">Chiudi</button></div>
    <div class="frigo"><label class="btn primary cookb" for="hvFrigo">📷 Fotografa frigo o dispensa: capisco io cosa hai</label><input type="file" id="hvFrigo" accept="image/*" capture="environment" hidden>${frigoBox()}</div>
    <p class="plab">In casa · tocca quello che hai (l'app se lo ricorda)</p>
    <div class="pgridt">${pantryTiles()}</div>
    <textarea id="hvT" rows="2" placeholder="Altro? Scrivilo: es. pollo 300 g, 4 uova, mozzarella" autocomplete="off">${esc(H.t)}</textarea>
    <button class="btn primary cookb" id="cpOpen">🍽 Componi il tuo piatto</button>
    <div class="qfor"><span>Per</span>${HVM.map(([k, n]) => `<button class="chip" data-hm="${k}" aria-pressed="${H.meal === k}">${n}</button>`).join("")}</div>
    <div class="hvres">${hvRes()}</div>
    <div class="hvnew"><h3>✨ Una ricetta nuova</h3><p class="note">Claude la inventa con questi ingredienti, rispettando il piano: grammi di oggi, gusti, attrezzi, massimo 20-25 minuti e spiegata passo passo. Se vuoi aggiungi una foto di frigo o dispensa.</p>
      <div class="row"><label class="btn sm" for="hvPic">📷 ${H.pic ? "Foto pronta ✓" : "Foto (facoltativa)"}</label><input type="file" id="hvPic" accept="image/*" capture="environment" hidden><button class="btn primary sm" id="hvAsk">Chiedi a Claude</button></div>
      <textarea id="hvR" rows="3" placeholder="Incolla qui la ricetta di Claude">${esc(H.r)}</textarea><div class="hvprev">${hvPrev()}</div></div></div>`;
}
function hvRes() {
  const H = CS.hv; if (!(H.t || "").trim() && !pantryOn().length) return `<p class="note">Tocca le caselle di quello che hai, o scrivilo (con le quantità se le sai): l'app cerca tra le ricette.</p>`;
  const m = hvMatch(H.t, H.meal, cDay());
  if (!m.items.length) return `<p class="xpno">Non ho riconosciuto gli ingredienti: scrivili separati da virgole (es. "pollo, zucchine, riso").</p>`;
  return `<p class="plab">Hai: ${m.items.map(i => esc(FO(i.f).n.replace(/ \(.*\)$/, "").toLowerCase())).join(" · ")}</p>
    ${m.list.length ? m.list.map(({ r, miss, low }) => `<button class="hvr" data-rec="${r.id}">${dishSVG(r.p, r.box, r.id, "dish")}<div><b>${esc(r.s || r.name)}</b><small>${miss.length ? `ti manca: ${esc(miss.join(", "))}` : "✓ hai tutto"}${low.length ? ` · poco ${esc(low.join(", "))}` : ""} · ${r.min} min</small></div></button>`).join("")
      : `<p class="note">Con questi ingredienti nessuna ricetta del piano torna: chiedi a Claude una ricetta nuova qui sotto.</p>`}`;
}
function hvGrams(meal, d) {
  if (meal === "col") return "una colazione da ~400 kcal con almeno 25 g di proteine";
  if (meal === "s1") return "uno spuntino da 150-250 kcal con un po' di proteine";
  const c = carbQ("Riso", meal, d), L = lunchLvl(d);
  return `1 pasto = proteina ~200 g da cruda (pollo, pesce, manzo magro) oppure 2 uova + 150 g di albume, verdure ~200 g, ${c && c[1] ? `carboidrato ${c[1]} g da crudo (riso o pasta; patate 3-4 volte tanto)` : "niente carboidrato oggi (doppia verdura)"}, condimento 1 cucchiaio d'olio in tutto${meal === "pr" && L === 0 ? "" : ""}`;
}
function hvPrompt() {
  const H = CS.hv, d = cDay(), mn = { pr: "pranzo", ce: "cena", col: "colazione", s1: "uno spuntino" }[H.meal], w = whereOf(d, H.meal === "s1" ? "s1" : H.meal);
  const have = [(H.t || "").trim(), pantryOn().map(f => (FO(f).n || shortN(f)).toLowerCase()).join(", ")].filter(Boolean).join("; ");
  return `Inventami una ricetta per ${mn} con quello che ho in casa: ${have || "guarda la foto"}.${H.pic ? " Nella foto vedi frigo o dispensa." : ""}
Vincoli:
- So cucinare solo cose base ma voglio imparare: passaggi semplici e spiegati (fuoco, temperatura, tempi, come capire quando è pronto), massimo 20-25 minuti, sporcare poco.
- Attrezzi: padella antiaderente, pentola, friggitrice ad aria, forno, microonde, cuociriso.${w === "zero" ? " Lo porto al lavoro e lì non ho attrezzi: deve essere buono freddo." : w === "micro" ? " Lo porto al lavoro e lì ho solo il microonde." : ""}
- Quantità: ${hvGrams(H.meal, d)}.
- Non mangio frutta; frutta secca solo noci; niente yogurt greco, crema di riso o burro d'arachidi; il tonno solo sott'olio e solo nella pasta.
- Condisco con olio a giri (1 giro = 5 g), un po' di salsa di soia e sale: dimmi quale usare e quanto. Il gusto deve essere buono e bilanciato.
Rispondi ESATTAMENTE in questo formato (l'app lo legge):
RICETTA: nome
TEMPO: 15 min
ATTREZZI: padella
PASTI: 1
INGREDIENTI (per 1 pasto):
pollo 200 g
riso 80 g
zucchine 150 g
olio 10 g
salsa di soia 5 g
PASSI:
1. cosa fare (5 min)
2. cosa fare`;
}
// 21/11/2026 ("non funziona la creazione di nuove ricette"): leggeva solo il formato esatto; Claude in chat scrive spesso con
// titoli markdown (## Ingredienti), grassetti (**1.**), elenchi puntati, "Passo 1:", "Procedimento", "Nome – 100 g", "mezzo avocado".
function parseRecipe(txt) {
  const clean = l => l.replace(/^#{1,6}\s*/, "").replace(/\*\*|__|`/g, "").replace(/^\s*[-•*·–—]\s+/, "").trim();
  const lines = (txt || "").split(/\n/).map(clean), T = lines.join("\n"), g = re => { const m = T.match(re); return m ? m[1].trim() : ""; };
  const head = (l, re) => re.test(l.replace(/[:：].*$/, "").replace(/\(.*\)/, "").trim());
  const ING = /^(ingredienti|ingredients|cosa serve|occorrente)\b/i, STEP = /^(passi|passaggi|procedimento|preparazione|istruzioni|come si fa|metodo|steps)\b/i;
  const iI = lines.findIndex(l => head(l, ING)), iP = lines.findIndex((l, i) => i > iI && head(l, STEP));
  let name = g(/^(?:ricetta|nome)\s*[:：]\s*(.+)$/im) || (lines.find(l => l && !/^(ecco|certo|ok|perfetto)\b/i.test(l) && !/[:：]\s*\S/.test(l) && !head(l, ING) && !head(l, STEP)) || "");
  name = name.replace(/^ricetta\s*[:：]?\s*/i, "").replace(/[!.]+$/, "").trim();
  if (!name || iI < 0) return null;
  const end = iP > iI ? iP : lines.findIndex((l, i) => i > iI && /^\s*$/.test(l) && i > iI + 1);
  const ing = lines.slice(iI + 1, end > iI ? end : undefined).map(l => l.replace(/^\d+[.)]\s+/, "").trim()).filter(l => l && !head(l, STEP) && !/^(tempo|attrezzi|pasti)\b/i.test(l));
  const q = [], extra = [];
  for (const l of ing) { const r = readFood(l.replace(/\s[–—-]\s/g, " "), "n", true);
    if (r.items.length) { const it = r.items[0], i = q.findIndex(([f]) => f === it.f); if (i >= 0) q[i][1] += it.q; else q.push([it.f, it.q]); if (r.items.length > 1 && r.miss.length) extra.push(l); }
    else extra.push(l); }
  const stepLines = iP > 0 ? lines.slice(iP + 1).filter(Boolean).filter(l => !/^(buon appetito|valori|kcal|note?\b|consiglio)/i.test(l)) : [];
  const steps = stepLines.map(l => { const t = l.replace(/^(passo|step)\s*\d+\s*[:.)-]?\s*/i, "").replace(/^\d+\s*[.):-]\s*/, "").trim(), m = t.match(/(\d+)\s*(?:-\s*\d+\s*)?(?:min|minuti|′|')/i); return { t, min: m ? +m[1] : undefined }; }).filter(x => x.t.length > 2).slice(0, 15);
  if (!q.length || !steps.length) return null;
  return { name: name.slice(0, 60), min: +(g(/tempo\s*[:：]?\s*(?:circa\s*)?(\d+)/i)) || 20, tools: g(/attrezzi\s*[:：]\s*([^·|\n]+)/i).slice(0, 40), pasti: Math.min(4, +(g(/pasti\s*[:：]?\s*(\d)/i)) || 1), q, steps, extra };
}
function hvPrev() {
  const H = CS.hv; if (!(H.r || "").trim()) return "";
  const x = parseRecipe(H.r); if (!x) return `<p class="xpno">Non riesco a leggerla: servono il nome, una parte "Ingredienti" con le quantità e una parte "Passi" (o "Procedimento"). Se manca qualcosa, chiedi a Claude di riscriverla con quei titoli.</p>`;
  const v = valOfQ(x.q);
  return `<div class="hvok"><b>✓ ${esc(x.name)}</b><small>${x.min} min · ${x.steps.length} passi · ~${v[0]} kcal a pasto · P ${v[1]} · C ${v[2]} · G ${v[3]}</small>${x.extra.length ? `<small class="xmiss">Non contati: ${esc(x.extra.join(", "))}</small>` : ""}<button class="btn primary" id="hvSave">Salva tra le mie ricette</button></div>`;
}
function hvBind(box) {
  const H = CS.hv; const o = $("hvOpen"); if (o) o.onclick = () => { H.open = true; renderCibo(); setTimeout(() => { const t = $("hvT"); if (t) t.focus(); }, 60); };
  if (!H.open || !$("hvT")) return;
  const res = () => { const z = box.querySelector(".hvres"); z.innerHTML = hvRes(); z.querySelectorAll("[data-rec]").forEach(b => b.onclick = () => openRecipe(b.dataset.rec)); };
  res();
  frigoBind(box);
  $("hvX").onclick = () => { H.open = false; renderCibo(); };
  $("hvT").oninput = e => { H.t = e.target.value; res(); };
  // quello che scrivi diventa una casella "in casa"
  $("hvT").onchange = e => { const it = readFood(e.target.value, "n").items; if (!it.length) return; const P = pantry(); let n = 0; for (const i of it) if (!P[i.f]) { P[i.f] = 1; n++; } if (n) { save(); const g = box.querySelector(".pgridt"); g.innerHTML = pantryTiles(); bindPT(); res(); } };
  const bindPT = () => box.querySelectorAll("[data-pt]").forEach(b => b.onclick = () => { const P = pantry(), f = b.dataset.pt; if (P[f]) delete P[f]; else P[f] = 1; save(); b.classList.toggle("on", !!P[f]); try { iosTap(); } catch (_) {} res(); });
  bindPT();
  $("cpOpen").onclick = () => openCompose();
  box.querySelectorAll("[data-hm]").forEach(b => b.onclick = () => { H.meal = b.dataset.hm; box.querySelectorAll("[data-hm]").forEach(x => x.setAttribute("aria-pressed", x === b)); res(); });
  $("hvPic").onchange = e => { H.pic = e.target.files[0] || null; e.target.value = ""; renderCibo(); };
  $("hvAsk").onclick = async () => { if (!(H.t || "").trim() && !H.pic && !pantryOn().length) return toast("Tocca quello che hai, scrivilo o fai una foto");
    const txt = hvPrompt();
    try { if (H.pic) { const f = new File([H.pic], "ingredienti.jpg", { type: H.pic.type || "image/jpeg" }); if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], text: txt }); return; } }
      else if (navigator.share) { await navigator.share({ text: txt }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(txt); toast("Richiesta copiata: apri Claude e incollala" + (H.pic ? " con la foto" : "")); } catch (_) { toast("Apri Claude e scrivigli cosa hai"); } };
  const prev = () => { const z = box.querySelector(".hvprev"); z.innerHTML = hvPrev(); const sv = $("hvSave"); if (sv) sv.onclick = () => { const x = parseRecipe(H.r); if (!x) return;
    const id = Date.now().toString(36); myRec()[id] = { ...x, meal: H.meal, at: Date.now() }; save(); syncRecipes(); H.r = ""; H.open = false; CS.rf = "mine"; renderCibo(); openRecipe("u_" + id); toast("📗 Salvata tra le tue ricette"); }; };
  prev();
  $("hvR").oninput = e => { H.r = e.target.value; prev(); };
}
// ---------- ricette ----------
const CATN = { col: "Colazione", sp: "Spuntino", base: "Le basi" };
const MEALN = { col: "a colazione", s1: "allo spuntino 1", s2: "allo spuntino 2", pr: "a pranzo", ce: "a cena" };
function renderRicette(box) {
  const H = haveNow(), cm = r => H.known ? canMake(r, H) : null;
  const F = [...(H.known ? [["can", "🥫 Puoi farle"]] : []), ["all", "Tutte"], ...(CB.recipes.some(r => r.mine) ? [["mine", "Le mie"]] : []), ["easy", "⭐ Facili"], ["quick", "⚡ Cene veloci"], ["batch", "🍱 Una cottura, 2 pasti"], ["main", "Pranzo e cena"], ["col", "Colazione"], ["sp", "Spuntini"], ["new", "Da imparare"], ["fast", "Veloci (≤ 12′)"], ["base", "Le basi"]];
  if (CS.rf === "can" && !H.known) CS.rf = "easy"; if (H.known && !CS.rfSet && CS.rf === "easy") CS.rf = "can";
  const ok = r => CS.rf === "all" || (CS.rf === "can" && cm(r).ok && (r.main || mainProt(r))) || (CS.rf === "mine" && r.mine) || (CS.rf === "main" && r.main) || (CS.rf === "batch" && r.batch) || (CS.rf === "quick" && r.quick) || (CS.rf === "easy" && (r.batch || r.quick)) || (CS.rf === r.cat) || (CS.rf === "new" && r.lvl === 2) || (CS.rf === "fast" && r.min <= 12);
  // 🥫 25/11/2026: prima quelle che puoi fare con quello che hai
  const L = CB.recipes.filter(ok).map((r, i) => [r, i, cm(r)]).sort((a, b) => (a[2] && !a[2].ok) - (b[2] && !b[2].ok) || a[1] - b[1]);
  const badge = c => !c ? "" : c.ok ? (c.use ? `<i class="rhv ad">🔄 con ${esc(pname(c.use.to))}</i>` : `<i class="rhv ok">🥫 puoi farla</i>`) : `<i class="rhv no">manca ${esc(c.miss.map(pname).join(", "))}</i>`;
  box.innerHTML = `${hvCard()}${!H.known ? `<div class="card tpask2"><p>🥫 <b>Cosa hai in frigo?</b> Dimmelo e metto prima le ricette che puoi fare.</p>${pkBox(true)}</div>` : CS.pkOpen ? `<div class="card">${pkBox()}</div>` : ""}<div class="rfil">${F.map(([k, n]) => `<button class="chip" data-rf="${k}" aria-pressed="${CS.rf === k}">${n}</button>`).join("")}</div>
    ${CS.rf === "all" ? `<p class="note rtip">Nuovo in cucina? Parti da <button class="lnk in" data-rf="base">Le basi</button>: friggitrice, padella e pasta spiegate passo passo.</p>` : ""}
    ${H.known ? `<button class="lnk sm rpk" data-pkopen><i>🥫</i>${CS.pkOpen ? "Chiudi «cosa ho»" : "Cosa ho in frigo"}</button>` : ""}
    ${CS.rf === "can" && !L.length ? `<p class="note">Con quello che hai segnato non c'è una ricetta: aggiorna «Cosa ho in frigo» o prova 🧺 qui sopra.</p>` : ""}
    <div class="rgrid">${L.map(([r, , c]) => { const pic = foodPic(r.id); return `<button class="rcard${c && !c.ok ? " rno" : ""}" data-rec="${r.id}">${pic ? `<img src="${pic}" alt="">` : dishSVG(r.p, r.box, r.id, "dish")}<b>${esc(r.name)}</b><small>${r.min} min · ${esc(r.tools)}</small><em>${r.mine ? "la tua · " : ""}${r.quick ? (r.cold ? "❄️ zero cottura" : "⚡ " + r.min + " min") : r.batch ? "🍱 pranzo + cena" : r.main ? (r.one ? "1 pasto" : "2 pasti") : esc(CATN[r.cat] || "")}</em>${r.lvl === 2 ? `<i class="rnew">da imparare</i>` : ""}${badge(c)}</button>`; }).join("")}</div>`;
  box.querySelectorAll("[data-rf]").forEach(b => b.onclick = () => { CS.rf = b.dataset.rf; CS.rfSet = 1; renderCibo(); });
  hvBind(box);
  box.querySelectorAll("[data-rec]").forEach(b => b.onclick = () => openRecipe(b.dataset.rec));
}
function openRecipe(id, ctx, keep) {
  const r = recipeById(id), sh = $("fsheet"); if (!r || !sh) return; if (CS.recipe !== id) CS.recMid = null; CS.recipe = id; CS.recCtx = ctx;
  const pic = foodPic(id), d = cDay(), all = ctx ? [ctx.mid] : r.main ? ["pr", "ce"] : Object.keys(r.for || {});
  const qm = all.includes(CS.recMid) ? CS.recMid : all[0], qo = qm && (ctx && ctx.mid === qm ? ctx.oid : r.main ? id : (r.for || {})[qm]), logs = qm ? [qm] : [];
  if (qm && (!keep || !CS.qe || CS.qe.mid !== qm || CS.qe.oid !== qo || CS.qe.d !== d)) qeInit(d, qm, qo); else if (!qm) CS.qe = null;
  const y = keep && !sh.hidden ? sh.querySelector(".is-c").scrollTop : 0;
  const isOn = m => { const v = (fDay(d).m || {})[m]; return v && v === (ctx && ctx.mid === m ? ctx.oid : r.main ? id : (r.for || {})[m]); };
  sh.querySelector(".is-h").innerHTML = `<b>${esc(r.name)}</b><span class="rmeta">${r.min} min · ${esc(r.tools)}${r.main ? ` · ${r.one ? "1 pasto" : "2 pasti"}` : ""} · ${r.lvl === 2 ? "da imparare" : "facile"}</span>`;
  sh.querySelector(".is-c").innerHTML = `<div class="rhero">${pic ? `<img src="${pic}" alt="Il mio piatto">` : dishSVG(r.p, r.box, r.id, "dish big")}</div>
    ${hvRecLine(r, d)}<div class="rpic"><label class="btn sm" for="rPic">📷 ${pic ? "Cambia la foto" : "Foto del mio piatto"}</label><input type="file" id="rPic" accept="image/*" capture="environment" hidden>${pic ? `<button class="btn sm" id="rPicDel">Torna al disegno</button>` : ""}</div>
    <div class="rlog"><button class="btn primary cookb" id="cookGo">▶ Cucina passo passo</button></div>
    ${all.length > 1 ? `<div class="qfor"><span>È per</span>${all.map(m => `<button class="chip" data-qf="${m}" aria-pressed="${m === qm}">${esc(mealDef(m).name)}</button>`).join("")}</div>` : ""}${qBox()}
    ${logs.length ? `<div class="rlog">${logs.map(m => isOn(m) ? `<button class="btn" data-rl="${m}" data-un="1">Togli: non l'ho mangiato ${MEALN[m]}</button>` : `<button class="btn${ctx ? " primary" : ""}" data-rl="${m}">✓ Fatto: mangiato ${MEALN[m]}</button>`).join("")}</div><p class="note rlday">${d === todayISO() ? "Si segna su oggi" : "Si segna sul " + fmtDate(d)}</p>` : ""}
    ${condBox(id)}${varBox(id)}
    ${r.porta ? `<p class="rgo ${r.go}">${r.go === "p" ? "🎒 Si porta al lavoro, niente attrezzi" : r.go === "m" ? "🎒 Al lavoro col microonde" : "🏠 Solo a casa"}<small>${esc(r.porta)}</small></p>` : ""}
    ${r.main && !r.one ? twoMeals(r, cDay()) : ""}
    <h3>Ingredienti${r.main && !r.one ? " (per 2 pasti)" : ""}</h3><ul class="ringr">${r.ingr.map(i => `<li>${esc(i)}</li>`).join("")}</ul>
    <h3>Passo passo</h3><ol class="rsteps">${r.steps.map((st, i) => `<li>${toolSVG(st.tool, st.p, r.id + i)}<div><small>${i + 1} · ${esc(TOOLN[st.tool] || st.tool)}</small><p>${esc(st.t)}</p>
      ${st.ok ? `<p class="sok">✓ <b>Pronto quando:</b> ${esc(st.ok)}</p>` : ""}${st.tip ? `<p class="stip">💡 ${esc(st.tip)}</p>` : ""}
      ${st.min ? `<button class="btn sm kt" data-kt="${st.min}" data-kl="${esc(r.s || r.name)} · passo ${i + 1}">⏱ Timer ${st.min} min</button>` : ""}</div></li>`).join("")}</ol>
    ${r.p1 ? `<h3>${r.p2 ? "I due pasti" : "Come si mangia"}</h3><div class="rp"><p><b>${r.p2 ? "Pasto 1" : "✓"}</b> ${esc(r.p1)}</p>${r.p2 ? `<p><b>Pasto 2</b> ${esc(r.p2)}</p>` : ""}</div>` : ""}
    ${r.olio ? `<p class="note">Olio: ${esc(r.olio)}. Quello per cuocere è compreso.</p>` : ""}
    <p class="note">I disegni mostrano come dovrebbe venire. Con 📷 metti la foto del tuo piatto: diventa la copertina della ricetta.</p>
    ${r.mine ? `<div class="rlog"><button class="btn" id="myDel">🗑 Elimina questa ricetta</button></div>` : ""}`;
  const md = $("myDel"); if (md) md.onclick = () => { if (!md.dataset.sure) { md.dataset.sure = 1; md.textContent = "Tocca di nuovo per eliminarla"; return; } delete myRec()[id.slice(2)]; save(); syncRecipes(); closeRecipe(); renderCibo(); toast("Ricetta eliminata"); };
  if (sh.hidden || !keep) showSheet(sh); else sh.querySelector(".is-c").scrollTop = y;
  qBind(sh); sh.querySelectorAll("[data-qf]").forEach(b => b.onclick = () => { CS.recMid = b.dataset.qf; openRecipe(id, ctx, true); });
  $("cookGo").onclick = () => { if (r.main && !adOf(d, id)) { const c = canMake(r); if (c.use) setAd(d, id, c.use); } closeRecipe(); cook(id, ctx); };
  $("rPic").onchange = e => { const f = e.target.files[0]; if (f) saveFoodPic(id, f); e.target.value = ""; };
  const del = $("rPicDel"); if (del) del.onclick = () => { delete FOOD().pics[id]; picDel("food:" + id); save(); openRecipe(id, ctx, true); renderCibo(); };
  sh.querySelectorAll("[data-kt]").forEach(b => b.onclick = () => kStart(+b.dataset.kt, b.dataset.kl));
  sh.querySelectorAll("[data-rl]").forEach(b => b.onclick = () => { const mid = b.dataset.rl, oid = ctx && ctx.mid === mid ? ctx.oid : r.main ? id : r.for[mid];
    logMeal(cDay(), mid, oid, !!b.dataset.un, CS.qe && CS.qe.mid === mid ? CS.qe.L : null); closeRecipe(); CS.tab = "oggi"; renderCibo(); });
}
// ▶ CUCINA PASSO PASSO (20/11/2026): schermata intera, un passaggio alla volta (prima gli ingredienti), schermo sempre acceso,
// alla fine "✓ L'ho mangiato" sul pasto da cui sei partito.
let cookWake = null;
async function cookAwake(on) { try { if (on && "wakeLock" in navigator && !cookWake) cookWake = await navigator.wakeLock.request("screen"); else if (!on && cookWake) { await cookWake.release(); cookWake = null; } } catch (e) { cookWake = null; } }
function cook(id, ctx, i) {
  const r = recipeById(id); if (!r) return; i = i || 0; const N = r.steps.length;
  let el = $("cook"); if (!el) { el = document.createElement("div"); el.id = "cook"; el.className = "cook"; document.body.appendChild(el); }
  document.documentElement.classList.add("noscroll"); cookAwake(true); CS.cook = { id, ctx, i };
  const st = r.steps[i - 1], bar = `<div class="cbar">${[...Array(N + 2)].map((_, k) => `<i class="${k <= i ? "on" : ""}"></i>`).join("")}</div>`;
  let body;
  if (i === 0) { const got = CS.cookGot || {};
    body = `<div class="cpic">${dishSVG(r.p, r.box, r.id, "dish")}</div><h2>${esc(r.name)}</h2><p class="cmeta">${r.min} min · ${esc(r.tools)}</p>${adBanner(r.id, cDay())}
      ${plateBox(r, ctx ? ctx.mid : CS.qe && CS.qe.mid, cDay())}<h3>Prima di iniziare, prepara${r.main && !r.one ? " (per 2 pasti)" : ""}</h3><div class="cing">${r.ingr.map((x, k) => `<button data-ci="${k}" class="${got[k] ? "on" : ""}"><i>${got[k] ? "✓" : ""}</i>${esc(x)}</button>`).join("")}</div>`; }
  else if (i <= N) body = `<p class="cstep">Passo ${i} di ${N} · ${esc(TOOLN[st.tool] || st.tool)}</p><div class="cpic">${toolSVG(st.tool, st.p, r.id + (i - 1))}</div><p class="ctext">${esc(st.t)}</p>
      ${st.ok ? `<p class="sok">✓ <b>Pronto quando:</b> ${esc(st.ok)}</p>` : ""}${st.tip ? `<p class="stip">💡 ${esc(st.tip)}</p>` : ""}
      ${st.min ? `<button class="btn kt" data-kt="${st.min}">⏱ Avvia timer ${st.min} min</button>` : ""}`;
  else { const pic = foodPic(id), logs = ctx ? [ctx.mid] : CS.qe && CS.qe.mid ? [CS.qe.mid] : r.main ? ["pr", "ce"] : Object.keys(r.for || {});
    body = `<div class="cpic">${pic ? `<img src="${pic}" alt="">` : dishSVG(r.p, r.box, r.id, "dish")}</div><h2>Fatto! 👨‍🍳</h2>
      ${r.p1 ? `<p class="ctext">${r.p2 ? `<b>Ora:</b> ${esc(r.p1)}<br><b>Per dopo:</b> ${esc(r.p2)}` : esc(r.p1)}</p>` : ""}${r.porta && r.p2 ? `<p class="stip">🎒 ${esc(r.porta)}</p>` : ""}
      <div class="rlog">${logs.map(m => `<button class="btn primary" data-cl="${m}">✓ L'ho mangiato ${MEALN[m]}</button>`).join("")}</div>
      <div class="rpic"><label class="btn sm" for="cPic">📷 Foto del mio piatto</label><input type="file" id="cPic" accept="image/*" capture="environment" hidden></div>`; }
  el.innerHTML = `<div class="chead"><button class="cx" aria-label="Chiudi">✕</button><b>${esc(r.s || r.name)}</b></div>${bar}<div class="cbody">${body}</div>
    <div class="cfoot">${i > 0 ? `<button class="btn" id="cPrev">‹ Indietro</button>` : `<span></span>`}${i <= N ? `<button class="btn primary" id="cNext">${i === 0 ? "Inizia ›" : i === N ? "Finito ›" : "Avanti ›"}</button>` : `<button class="btn" id="cEnd">Chiudi</button>`}</div>`;
  el.querySelector(".cbody").scrollTop = 0;
  const close = () => { el.remove(); CS.cook = null; CS.cookGot = null; document.documentElement.classList.remove("noscroll"); cookAwake(false); renderCibo(); };
  el.querySelector(".cx").onclick = close; const e = $("cEnd"); if (e) e.onclick = close;
  const nx = $("cNext"); if (nx) nx.onclick = () => cook(id, ctx, i + 1);
  const pv = $("cPrev"); if (pv) pv.onclick = () => cook(id, ctx, i - 1);
  el.querySelectorAll("[data-ci]").forEach(b => b.onclick = () => { CS.cookGot = CS.cookGot || {}; CS.cookGot[b.dataset.ci] = !CS.cookGot[b.dataset.ci]; cook(id, ctx, 0); });
  el.querySelectorAll("[data-kt]").forEach(b => b.onclick = () => kStart(+b.dataset.kt, `${r.s || r.name} · passo ${i}`));
  el.querySelectorAll("[data-cl]").forEach(b => b.onclick = () => { const mid = b.dataset.cl, oid = ctx && ctx.mid === mid ? ctx.oid : r.main ? id : r.for[mid];
    logMeal(cDay(), mid, oid, false, CS.qe && CS.qe.mid === mid && CS.qe.oid === oid ? CS.qe.L : null); close(); CS.tab = "oggi"; renderCibo(); });
  const cp = $("cPic"); if (cp) cp.onchange = ev => { const f = ev.target.files[0]; if (f) saveFoodPic(id, f); ev.target.value = ""; };
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && CS.cook) cookAwake(true); });
// Timer di cucina (20/11/2026): l'utente è alle prime armi, ogni passaggio con un tempo ha il suo timer.
// A fine tempo: bip (se l'audio è sbloccato), tocco aptico su iPhone, vibrazione su Android, festa a schermo.
function kStart(min, label) {
  CS.kt = { end: Date.now() + min * 60000, label }; try { if (typeof unlockAudio === "function") unlockAudio(); } catch (e) {}
  toast(`⏱ Timer ${min} min avviato`); kTick();
}
function kTick() {
  let el = $("ktimer"); const k = CS.kt;
  if (!k) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement("div"); el.id = "ktimer"; el.className = "ktimer"; document.body.appendChild(el); }
  const left = Math.max(0, Math.round((k.end - Date.now()) / 1000));
  el.innerHTML = `<span>⏱ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}</span><small>${esc(k.label)}</small><button aria-label="Ferma il timer">✕</button>`;
  el.querySelector("button").onclick = () => { CS.kt = null; clearTimeout(CS.ktT); kTick(); };
  if (left <= 0) { CS.kt = null; el.remove();
    try { if (typeof AC !== "undefined" && AC) { const t = AC.currentTime; [0, .35, .7].forEach(d => beep(t + d, 880, .25, .5)); } } catch (e) {}
    try { iosTap(); navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {}
    celebrate("⏰ Tempo!", k.label); return; }
  clearTimeout(CS.ktT); CS.ktT = setTimeout(kTick, 1000);
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && CS.kt) kTick(); });
function closeRecipe() { const sh = $("fsheet"); if (!sh || sh.hidden) return; sh.classList.remove("on"); document.documentElement.classList.remove("noscroll"); CS.recipe = null; setTimeout(() => { if (!sh.classList.contains("on")) sh.hidden = true; }, 220); }
// trascina giù per chiudere (20/11/2026, "come per l'allenamento"): da qualsiasi punto quando il contenuto è in cima,
// direzione decisa ai primi 8 px (orizzontale = scorri le caselle), chiude oltre 1/4 di altezza o con uno scatto veloce.
(() => { const sh = $("fsheet"); if (!sh) return; sh.querySelector(".is-bg").onclick = closeRecipe; sh.querySelector(".is-x").onclick = closeRecipe; sh.querySelector(".is-close").onclick = closeRecipe;
  const box = sh.querySelector(".is-box"), cont = sh.querySelector(".is-c"), bg = sh.querySelector(".is-bg"), grab = sh.querySelector(".is-top");
  let y0 = null, x0 = 0, dy = 0, lock = null, t0 = 0, lastY = 0, lastT = 0, vel = 0, raf = 0, h0 = 0;
  const start = (e, top) => { const t = e.touches[0]; if (e.target.closest && e.target.closest("input, textarea, select")) { y0 = null; return; }
    y0 = t.clientY; x0 = t.clientX; dy = 0; lock = top ? "y" : null; t0 = lastT = Date.now(); lastY = y0; vel = 0; };
  const move = e => { if (y0 == null) return; const t = e.touches[0];
    if (!lock) { const ax = Math.abs(t.clientX - x0), ay = Math.abs(t.clientY - y0);
      if (t.clientY > y0 && ay >= ax && cont.scrollTop <= 0 && e.cancelable) e.preventDefault();
      if (ax < 8 && ay < 8) return;
      lock = ax > ay ? "x" : (t.clientY > y0 && cont.scrollTop <= 0 ? "y" : "scroll"); }
    if (lock !== "y") return;
    dy = Math.max(0, t.clientY - y0); const now = Date.now(); vel = (t.clientY - lastY) / Math.max(1, now - lastT); lastY = t.clientY; lastT = now;
    if (e.cancelable) e.preventDefault();
    // un solo aggiornamento per fotogramma: prima ogni movimento del dito ridisegnava tutto e il riquadro "laggava"
    if (!raf) { box.style.transition = "none"; bg.style.transition = "none"; sh.classList.add("drag"); h0 = box.offsetHeight || 600; }
    cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { box.style.transform = `translate3d(0,${dy}px,0)`; bg.style.opacity = String(Math.max(0.15, 1 - dy / h0)); }); };
  const end = () => { if (y0 == null) return; cancelAnimationFrame(raf); raf = 0; sh.classList.remove("drag"); const h = h0 || box.offsetHeight || 600; box.style.transition = ""; bg.style.transition = ""; bg.style.opacity = "";
    const avg = dy / Math.max(1, Date.now() - t0);
    if (lock === "y" && (dy > h * 0.25 || (dy > 40 && Math.max(vel, avg) > 0.5))) { closeRecipe(); setTimeout(() => { box.style.transform = ""; }, 260); } else box.style.transform = "";
    y0 = null; lock = null; };
  for (const [el, top] of [[cont, false], [grab, true]]) { el.addEventListener("touchstart", e => start(e, top), { passive: true }); el.addEventListener("touchmove", move, { passive: false }); el.addEventListener("touchend", end); el.addEventListener("touchcancel", end); }
})();
function saveFoodPic(id, file) {
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => { const k = 560 / Math.max(img.width, img.height), c = document.createElement("canvas"); c.width = Math.round(img.width * Math.min(1, k)); c.height = Math.round(img.height * Math.min(1, k));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    picPut("food:" + id, c.toDataURL("image/jpeg", .7)).then(() => { FOOD().pics[id] = 1; save(); toast("Foto salvata 📷"); if (CS.cook) cook(CS.cook.id, CS.cook.ctx, CS.cook.i); else openRecipe(id, CS.recCtx, true); renderCibo(); })
      .catch(() => toast("Foto non salvata: memoria del telefono piena?")); };
  img.src = url;
}

// ---------- scambi ----------
function renderScambi(box) {
  const q = CS.q.toLowerCase().trim(), hit = r => !q || r[0].toLowerCase().includes(q);
  const C = CB.carbs.filter(hit), P = CB.prots.filter(hit);
  box.innerHTML = `<div class="card">${scaleGuide()}</div><input class="sq" id="sq" placeholder="Cerca un alimento (es. pasta, salmone)" value="${esc(CS.q)}" autocomplete="off">
    <p class="note">Al posto di un alimento del piano scegli una riga: le quantità sono già equivalenti, ±10% va benissimo. Pesi da crudi; con le confezioni arrotonda alla confezione.</p>
    ${C.length ? `<h2>Carboidrati</h2><div class="card tbl"><table><thead><tr><th>Alimento</th><th>Palestra</th><th>Senza</th><th>Cena</th></tr></thead><tbody>${C.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td></tr>`).join("")}</tbody></table></div>` : ""}
    ${P.length ? `<h2>Proteine (pranzo e cena)</h2><div class="card tbl"><table><thead><tr><th>Alimento</th><th>Quantità</th><th>Olio</th></tr></thead><tbody>${P.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join("")}</tbody></table></div>` : ""}
    ${!q || "grassi noci olio burro".includes(q) ? `<h2>Grassi</h2><div class="card"><p>${esc(CB.fats)}</p></div>` : ""}
    ${!C.length && !P.length && q ? `<p class="note">Niente con "${esc(CS.q)}". Se manca, chiedilo a Claude e lo aggiungiamo.</p>` : ""}`;
  const i = $("sq"); i.oninput = () => { CS.q = i.value; const pos = i.selectionStart; renderCibo(); const j = $("sq"); j.focus(); j.setSelectionRange(pos, pos); };
}

// ---------- spesa ----------
// 🗓 SPESA DELLA SETTIMANA (20/11/2026): scegli cosa cucini e quante volte, l'app somma gli ingredienti (porzioni del piano)
// e toglie i condimenti; quello che hai "in casa" resta in fondo da controllare. D.food.wplan = { ricetta: pasti }.
function weekList() {
  const P = FOOD().wplan = FOOD().wplan || {}, need = new Map(), d = todayISO();
  for (const [id, n] of Object.entries(P)) { const r = recipeById(id); if (!r || !n) continue;
    const mid = r.main ? "ce" : Object.keys(r.for || {})[0], oid = r.main ? id : (r.for || {})[mid], L = mid && oid ? baseQ(mid, oid, d) : null;
    for (const [f, q] of L || []) if (q && !PANTRY.has(f) && FO(f)) need.set(f, (need.get(f) || 0) + q * n); }
  const ord = PGRID.flatMap(([, L]) => L), pos = f => { const i = ord.indexOf(grpOf(f, false)); return i < 0 ? 999 : i; };
  return [...need].map(([f, q]) => { const o = FO(f); const r = isW(o) ? (q >= 100 ? Math.ceil(q / 50) * 50 : Math.ceil(q / 10) * 10) : Math.ceil(q); return [f, r]; }).sort((a, b) => pos(a[0]) - pos(b[0]));
}
function planCard() {
  const P = FOOD().wplan = FOOD().wplan || {}, S0 = FOOD().shop, chosen = Object.keys(P).filter(id => recipeById(id) && P[id]);
  const R = CB.recipes.filter(r => (r.main || r.cat === "col" || r.cat === "sp") && !chosen.includes(r.id)), list = weekList(), PA = pantry();
  const buy = list.filter(([f]) => !PA[f]), have = list.filter(([f]) => PA[f]);
  const row = ([f, q], h) => { const k = "auto:" + f; return `<button class="sitem${S0[k] ? " on" : ""}${h ? " have" : ""}" data-it="${k}"><i>${S0[k] ? "✓" : ""}</i>${esc(qText(f, q))}${h ? ` <small>· in casa: controlla</small>` : ""}</button>`; };
  return `<h2>🗓 La spesa della settimana</h2><div class="card wplan">
    <p class="note">Scegli cosa cucini e per quanti pasti: l'app somma gli ingredienti con le porzioni del piano. Olio, sale e soia non li conta.</p>
    ${chosen.length ? `<div class="wpsel">${chosen.map(id => { const r = recipeById(id); return `<div class="wprow"><span>${esc(r.s || r.name)}</span><div class="qctl"><button data-wpm="${id}" aria-label="Meno">−</button><b>${P[id]} ${P[id] === 1 ? "pasto" : "pasti"}</b><button data-wpp="${id}" aria-label="Più">+</button></div></div>`; }).join("")}</div>` : ""}
    <details class="wpadd" id="wpAdd"${!chosen.length || CS.wpOpen ? " open" : ""}><summary>+ Aggiungi ricette</summary><div class="rfil">${R.map(r => `<button class="chip" data-wp="${r.id}">${esc(r.s || r.name)}</button>`).join("")}</div></details>
    ${list.length ? `<p class="plab">Da comprare</p><div class="shop">${buy.map(x => row(x)).join("") || `<p class="note">Hai già tutto in casa 👌</p>`}${have.map(x => row(x, true)).join("")}</div>
      <div class="row"><button class="btn" id="wpNew">Nuova settimana</button></div>` : ""}</div>`;
}

// ---------- 🧊 CONGELATORE (20/11/2026, richiesta dell'utente: "segna quanta roba ho nel congelatore, quando scongelare e cosa;
// con le foto scansiona gli ingredienti e crea la loro scheda"). D.food.frz = [{ id, f alimento, q quantità (unità dell'alimento),
// d congelato il, th tirato fuori il (ISO con ora) | null, pic 1 = foto in IndexedDB "frz:<id>", at }].
// L'app non riconosce le foto da sola (servirebbe un servizio di IA a pagamento): la foto si salva nella scheda e,
// per tante cose insieme, va a Claude che risponde "alimento grammi" per riga; la risposta incollata diventa l'elenco.
const frz = () => { const f = FOOD(); return (f.frz = f.frz || []); };
const FRCAT = { pollo: "carne", manzo: "carne", hamb: "macinato", macinato: "macinato", merluzzo: "pesce", pescec: "pesce", salmone: "pescegr", gamberi: "gamberi",
  pane: "pane", segale: "pane", piadina: "pane", panino: "pane", focaccia: "pane", pizza: "cotto", verdure: "verdure", vgrill: "verdure", vmiste: "verdure", spinaci: "verdure", zucchine: "verdure", peperoni: "verdure",
  risoc: "cotto", pastac: "cotto", ragu: "cotto", polloc: "cotto", carnec: "cotto", gnocchi: "verdure", lasagna: "cotto", fritto: "cotto", patatec: "cotto" };
// tempi indicativi (linee guida USDA/EFSA): mesi in congelatore per la qualità, ore per scongelare in frigo, giorni entro cui consumarlo dopo
const FRULE = {
  carne: { m: 9, h: 20, dd: 2, how: "In frigo dalla sera prima, in un piatto (mai sul lavello a temperatura ambiente). Fettine o straccetti: bastano 8-10 ore." },
  macinato: { m: 3, h: 20, dd: 1, how: "In frigo dalla sera prima. Una volta scongelato, cuocilo entro il giorno dopo." },
  pesce: { m: 6, h: 10, dd: 1, how: "In frigo 8-12 ore. Se hai fretta: busta ben chiusa in una ciotola di acqua fredda, 30-60 minuti." },
  pescegr: { m: 3, h: 10, dd: 1, how: "In frigo 8-12 ore, poi cuocilo entro il giorno dopo." },
  gamberi: { m: 6, h: 0.5, dd: 1, how: "In un colino sotto l'acqua fredda per 10-15 minuti, oppure qualche ora in frigo." },
  pane: { m: 3, h: 1, dd: 2, how: "Fuori dal congelatore 30-60 minuti, oppure direttamente da congelato nel tostapane o in friggitrice (3-4 minuti)." },
  verdure: { m: 9, h: 0, dd: 0, how: "Non serve scongelarle: cuocile ancora surgelate in padella, al microonde o in friggitrice." },
  cotto: { m: 3, h: 12, dd: 1, how: "In frigo dalla sera prima, oppure al microonde in modalità scongelamento; poi scaldalo bene fino al centro." },
  altro: { m: 6, h: 12, dd: 1, how: "In frigo dalla sera prima." } };
const frCat = f => { const o = FO(f) || {}; return FRCAT[o.of || f] || "altro"; };
const frRule = f => FRULE[frCat(f)];
const PROTF = new Set(["carne", "macinato", "pesce", "pescegr", "gamberi"]);
const frName = x => FO(x.f) ? FO(x.f).n.replace(/ \(.*\)$/, "") : x.f;
const frPic = x => x.pic ? picOf("frz:" + x.id) : "";
const dIt = iso => new Date(iso.length > 10 ? iso : iso + "T12:00").toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" }).replace(".", "");
const hIt = t => new Date(t).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });
const addMonths = (iso, n) => { const t = new Date(iso + "T12:00"); t.setMonth(t.getMonth() + n); return t.toISOString().slice(0, 10); };
function frState(x, now = Date.now()) { // in congelatore / si scongela / pronto / scongelato da troppo
  const R = frRule(x.f), exp = addMonths(x.d, R.m);
  if (!x.th) return { s: "frz", exp, soon: exp <= addDays(todayISO(), 30) };
  const t0 = new Date(x.th).getTime(), ready = t0 + R.h * 36e5, by = ready + Math.max(1, R.dd) * 864e5;
  return { s: now < ready ? "thaw" : now < by ? "ready" : "late", ready, by };
}
const frIdeas = f => { const k = FO(f).of || f; return mainRecipes().filter(r => { const m = CB.mq[r.id]; return m && parseQ(typeof m === "string" ? m : m.q).some(([x]) => x === k); }).slice(0, 4); };
const frIco = (x, cls) => { const p = frPic(x), dr = drawOf([[x.f, 1]]); return p ? `<img class="${cls}" src="${p}" alt="">` : dishSVG(dr.length ? dr : ["pollo"], "", x.id, cls); };
function frTake(id, q) { // tira fuori una parte: diventa un pezzo "in scongelamento"
  const L = frz(), x = L.find(y => y.id === id); if (!x) return; q = Math.min(q || x.q, x.q);
  const nx = { ...x, id: Date.now().toString(36), q, th: new Date().toISOString(), at: Date.now() };
  if (x.pic && PICM.has("frz:" + x.id)) picPut("frz:" + nx.id, PICM.get("frz:" + x.id)).catch(() => {}); else delete nx.pic;
  x.q = Math.round((x.q - q) * 100) / 100; x.at = Date.now(); if (x.q <= 0) { L.splice(L.indexOf(x), 1); if (x.pic) picDel("frz:" + x.id); }
  L.push(nx); save(); const R = frRule(nx.f);
  toast(R.h ? `🧊 ${frName(nx)} in frigo: pronto ${R.h >= 6 ? "tra " + R.h + " ore circa" : "tra " + (R.h < 1 ? Math.round(R.h * 60) + " minuti" : R.h + " ore")}` : `🧊 ${frName(nx)}: cuocilo da surgelato`);
}
function frPortions(x) { // 1 pasto, 2 pasti (pranzo e cena), tutto
  const k = FO(x.f).of || x.f, p1 = PROTG[k] ? convQ(k, PROTG[k], x.f) : (isW(FO(x.f)) ? FO(x.f).d : 1) || x.q;
  return [[p1, "1 pasto"], [Math.round(p1 * 200) / 100, "2 pasti"], [x.q, "tutto"]].filter(([q], i, a) => q > 0 && q <= x.q && a.findIndex(([q2]) => q2 === q) === i);
}
// usato in un pasto: scala dal pezzo tirato fuori (pollo del pranzo → −200 g); torna indietro se il pasto si toglie
function frUse(d, mid, L, undo) {
  if (undo) { const U = ((fDay(d).frzU || {})[mid]) || []; if (!U.length) return;
    for (const [id, q, snap] of U) { const x = frz().find(y => y.id === id); if (x) x.q = Math.round((x.q + q) * 100) / 100; else if (snap) frz().push({ ...snap, q }); }
    setFDay(d, x => { delete x.frzU[mid]; }); save(); return; }
  const U = []; for (const [f, q] of L || []) { if (!q || !FO(f)) continue; const k = FO(f).of || f;
    const x = frz().filter(y => y.th && y.q > 0 && (y.f === f || ((FO(y.f) || {}).of || y.f) === k)).sort((a, b) => a.th < b.th ? -1 : 1)[0]; if (!x) continue;
    const use = Math.min(x.q, convQ(f, q, x.f)); x.q = Math.round((x.q - use) * 100) / 100; U.push([x.id, use, x.q <= 0 ? { ...x } : null]); if (x.q <= 0) frz().splice(frz().indexOf(x), 1); }
  if (U.length) { setFDay(d, x => x.frzU = { ...(x.frzU || {}), [mid]: U }); save(); const t = U.map(([, q, sn], i) => qText((sn || frz().find(y => y.id === U[i][0]) || {}).f || L[0][0], q)).join(", "); setTimeout(() => toast(`🧊 Scalato dal frigo: ${t}`), 1100); }
}
// in Oggi: cosa si scongela, cosa è pronto, cosa tirare fuori stasera per domani, cosa usare presto
function frzCard(d) {
  if (d !== todayISO()) return ""; const L = frz().filter(x => x.q > 0); if (!L.length) return "";
  const out = L.filter(x => x.th).map(x => [x, frState(x)]).sort((a, b) => a[1].ready - b[1].ready);
  const hr = new Date().getHours(), proteins = L.filter(x => !x.th && PROTF.has(frCat(x.f)) && frRule(x.f).h >= 6).sort((a, b) => a.d < b.d ? -1 : 1);
  const tomorrowOk = out.some(([x, st]) => PROTF.has(frCat(x.f)) && st.s !== "late");
  const soon = L.filter(x => !x.th && frState(x).soon);
  const today = new Date().toDateString();
  let rows = out.map(([x, st]) => `<div class="fzrow ${st.s}">${frIco(x, "fzi")}<div><b>${esc(qText(x.f, x.q))}</b><small>${st.s === "thaw" ? `⏳ si scongela · pronto ${new Date(st.ready).toDateString() === today ? "oggi" : dIt(new Date(st.ready).toISOString())} verso le ${hIt(st.ready)}` : st.s === "ready" ? `✓ pronto in frigo · usalo entro ${dIt(new Date(st.by).toISOString())}` : `⚠️ scongelato da troppo: se ha un odore strano, buttalo`}</small>
      ${st.s !== "thaw" && frIdeas(x.f).length ? `<span class="fzid">${frIdeas(x.f).map(r => `<button class="chip" data-fzr="${r.id}">${esc(r.s || r.name)}</button>`).join("")}</span>` : ""}</div><button class="lnk in" data-fzo="${x.id}">›</button></div>`).join("");
  if (hr >= 16 && !tomorrowOk && proteins.length) rows += `<div class="fzask"><b>🌙 Stasera tira fuori per domani?</b>${proteins.slice(0, 3).map(x => `<div class="fzrow">${frIco(x, "fzi")}<div><b>${esc(frName(x))}</b><small>ne hai ${esc(qLabel(x.f, x.q))}</small></div><span class="fzp">${frPortions(x).slice(0, 2).map(([q, n]) => `<button class="chip" data-fzt="${x.id}" data-q="${q}">${esc(qLabel(x.f, q))}<small>${n}</small></button>`).join("")}</span></div>`).join("")}<small class="note">Mettilo in frigo in un piatto: domani a pranzo è pronto.</small></div>`;
  if (soon.length) rows += `<p class="fzsoon">⏰ Da usare presto: ${soon.map(x => `${esc(frName(x))} (entro ${dIt(frState(x).exp)})`).join(", ")}</p>`;
  if (!rows) return "";
  return `<div class="card fzc"><div class="fzh"><b>🧊 Congelatore</b><button class="lnk in" data-fzall="1">tutto il congelatore ›</button></div>${rows}</div>`;
}
function frzBind(box) {
  box.querySelectorAll("[data-fzt]").forEach(b => b.onclick = () => { frTake(b.dataset.fzt, +b.dataset.q); renderCibo(); });
  box.querySelectorAll("[data-fzr]").forEach(b => b.onclick = () => openRecipe(b.dataset.fzr));
  box.querySelectorAll("[data-fzo],[data-fze]").forEach(b => b.onclick = () => openFrz(b.dataset.fzo || b.dataset.fze));
  box.querySelectorAll("[data-fzall]").forEach(b => b.onclick = () => { CS.tab = "spesa"; renderCibo(); setTimeout(() => { const c = $("fzList"); if (c) c.scrollIntoView({ block: "start" }); }, 50); });
  const a = $("fzAdd"); if (a) a.onclick = () => openFrzAdd();
}
function frzSection() { // in Spesa: l'inventario
  const L = frz().filter(x => x.q > 0).sort((a, b) => (!!b.th - !!a.th) || (a.d < b.d ? -1 : 1));
  return `<h2 id="fzList">🧊 Congelatore</h2><div class="card fzinv">
    ${L.length ? L.map(x => { const st = frState(x); return `<button class="fzrow" data-fze="${x.id}">${frIco(x, "fzi")}<div><b>${esc(frName(x))} · ${esc(qLabel(x.f, x.q))}</b><small>${x.th ? (st.s === "thaw" ? "⏳ si scongela in frigo" : st.s === "ready" ? "✓ scongelato, in frigo" : "⚠️ scongelato da troppo") : `congelato il ${dIt(x.d)} · meglio entro ${dIt(st.exp)}${st.soon ? " ⏰" : ""}`}</small></div><i>›</i></button>`; }).join("")
      : `<p class="note">Vuoto. Aggiungi quello che metti in congelatore: l'app ti dice quando tirarlo fuori e quanto ci mette a scongelarsi, e lo scala quando lo mangi.</p>`}
    <div class="row"><button class="btn primary" id="fzAdd">+ Aggiungi al congelatore</button></div></div>`;
}
function openFrz(id) { // scheda di un pezzo
  const x = frz().find(y => y.id === id); if (!x) return renderCibo(); const sh = $("fsheet"), st = frState(x), R = frRule(x.f), o = FO(x.f), v = o.v || [0, 0, 0, 0], ideas = frIdeas(x.f);
  sh.querySelector(".is-h").innerHTML = `<b>${esc(frName(x))}</b><span class="rmeta">🧊 ${x.th ? "tirato fuori " + dIt(x.th) + " alle " + hIt(x.th) : "in congelatore dal " + dIt(x.d)}</span>`;
  sh.querySelector(".is-c").innerHTML = `<div class="rhero">${frPic(x) ? `<img class="fzbig" src="${frPic(x)}" alt="">` : dishSVG(drawOf([[x.f, 1]]), "", x.id, "dish big")}</div>
    <div class="qbox"><h3>Quanto ne hai</h3>${rowsHTML([[x.f, x.q]])}</div>
    <div class="fzinfo"><p><b>${x.th ? (st.s === "thaw" ? "⏳ Pronto " + dIt(new Date(st.ready).toISOString()) + " verso le " + hIt(st.ready) : st.s === "ready" ? "✓ Pronto: usalo entro " + dIt(new Date(st.by).toISOString()) : "⚠️ Scongelato da troppo tempo") : `Qualità migliore entro ${dIt(st.exp)}`}</b></p>
      <p><b>Come scongelarlo</b><br>${esc(R.how)}</p><p class="note">Scongelato da crudo non si ricongela; una volta cotto sì (in un contenitore, entro 2 giorni).</p>
      <p class="note">${fmt(v[0])} kcal · proteine ${fmt(v[1])} g · carboidrati ${fmt(v[2])} g · grassi ${fmt(v[3])} g per 100 g${o.mine && o.b ? ` · ${esc(o.b)}` : ""}</p></div>
    ${ideas.length ? `<p class="plab">Cosa ci fai</p><div class="fzid">${ideas.map(r => `<button class="chip" data-fzr="${r.id}">${esc(r.s || r.name)}</button>`).join("")}</div>` : ""}
    ${!x.th ? `<p class="plab">Tira fuori</p><div class="fzp">${frPortions(x).map(([q, n]) => `<button class="chip" data-fzt="${x.id}" data-q="${q}">${esc(qLabel(x.f, q))}<small>${n}</small></button>`).join("")}</div>` : `<div class="row"><button class="btn" id="fzBack">↶ Non l'ho tirato fuori</button></div>`}
    <div class="row"><label class="btn" for="fzPic1">📷 ${x.pic ? "Cambia foto" : "Foto"}</label><input type="file" id="fzPic1" accept="image/*" capture="environment" hidden><button class="btn" id="fzDel">🗑 Finito / togli</button></div>`;
  if (sh.hidden) showSheet(sh);
  const box = sh.querySelector(".qbox"), L = [[x.f, x.q]];
  bindRows(box, L, () => { const [f, q] = L[0]; x.f = f; x.q = q; x.at = Date.now(); if (q <= 0) { frz().splice(frz().indexOf(x), 1); save(); closeRecipe(); renderCibo(); return; } save(); openFrz(id); renderCibo(); });
  sh.querySelectorAll("[data-fzt]").forEach(b => b.onclick = () => { frTake(b.dataset.fzt, +b.dataset.q); closeRecipe(); renderCibo(); });
  sh.querySelectorAll("[data-fzr]").forEach(b => b.onclick = () => openRecipe(b.dataset.fzr));
  const bk = $("fzBack"); if (bk) bk.onclick = () => { delete x.th; x.at = Date.now(); save(); openFrz(id); renderCibo(); };
  $("fzPic1").onchange = e => { const f = e.target.files[0]; if (f) frzPhoto(f, [x], () => openFrz(id)); };
  const dl = $("fzDel"); dl.onclick = () => { if (!dl.dataset.sure) { dl.dataset.sure = 1; dl.textContent = "Tocca di nuovo per togliere"; return; } frz().splice(frz().indexOf(x), 1); if (x.pic) picDel("frz:" + x.id); save(); closeRecipe(); renderCibo(); };
}
function frzPhoto(file, items, done) {
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => { const k = 480 / Math.max(img.width, img.height), c = document.createElement("canvas"); c.width = Math.round(img.width * Math.min(1, k)); c.height = Math.round(img.height * Math.min(1, k));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); const data = c.toDataURL("image/jpeg", .7);
    Promise.all(items.map(x => picPut("frz:" + x.id, data).then(() => { x.pic = 1; }))).then(() => { save(); toast("Foto salvata 📷"); if (done) done(data); renderCibo(); }).catch(() => toast("Foto non salvata: memoria piena?")); };
  img.src = url;
}
const FZQUICK = ["pollo", "macinato", "manzo", "merluzzo", "salmone", "gamberi", "hamb", "vmiste", "spinaci", "segale", "piadina", "pane", "risoc", "ragu"];
const frzPrompt = () => `Guarda la foto del mio congelatore (o della spesa da congelare) ed elenca cosa vedi.
Rispondi SOLO con una riga per alimento, peso in grammi (o numero di pezzi), nomi semplici, così:
petto di pollo 800 g
merluzzo 400 g
verdure miste 450 g
pane di segale 6 fette
Se non sei sicuro del peso, usa quello scritto sulla confezione o una stima.`;
function openFrzAdd(keep) {
  const A = CS.fza = keep && CS.fza ? CS.fza : { L: [], d: todayISO(), t: "", pic: null }, sh = $("fsheet");
  // "4 petti di pollo 800 g": se ci sono pezzi e grammi, contano i grammi
  const r = A.t.trim() ? estRead(A.t.replace(/(^|[,;\n])\s*\d+\s+([^,;\n\d]+?)\s+(\d+(?:[.,]\d+)?\s*(?:kg|g|gr|grammi)\b)/gi, "$1 $2 $3")) : { items: [], miss: [] };
  sh.querySelector(".is-h").innerHTML = `<b>🧊 Aggiungi al congelatore</b><span class="rmeta">l'app lo scala quando lo mangi</span>`;
  sh.querySelector(".is-c").innerHTML = `<div class="fzadd">
    <p class="plab">Tocca cosa metti</p><div class="fzq">${FZQUICK.map(f => `<button class="chip" data-fq="${f}">${esc(FO(f).n.replace(/ \(.*\)$/, ""))}</button>`).join("")}<button class="chip scanc" id="fzScan">🏷 Codice a barre</button></div>
    <p class="plab">…oppure scrivilo</p><textarea id="fzT" rows="2" placeholder="es. 4 petti di pollo 800 g, 2 filetti di merluzzo, 6 fette di pane di segale">${esc(A.t)}</textarea>
    <div class="oprev">${r.items.length ? `<p class="xpok">Ho capito: ${r.items.map(([f, q]) => `<b>${esc(qText(f, q))}</b>`).join(" · ")}</p><button class="btn sm primary" id="fzUse">+ Metti in elenco</button>` : ""}${r.miss.length ? `<p class="xpno">Non ho capito: «${esc(r.miss.join("», «"))}»</p>` : ""}</div>
    <div class="row"><label class="btn sm" for="fzPic">📷 ${A.pic ? "✓ Foto fatta" : "Foto (va nella scheda)"}</label><input type="file" id="fzPic" accept="image/*" capture="environment" hidden>
      <label class="btn sm" for="fzCl">✨ Tante cose? Foto a Claude</label><input type="file" id="fzCl" accept="image/*" capture="environment" hidden></div>
    <p class="note">Claude risponde con un elenco "alimento grammi": copialo e incollalo nel campo qui sopra.</p>
    ${A.L.length ? `<div class="qbox"><h3>Da mettere in congelatore</h3>${rowsHTML(A.L)}</div>` : ""}
    <label class="plab fzdl">Congelato il <input type="date" id="fzD" value="${A.d}" max="${todayISO()}"></label>
    <div class="rlog"><button class="btn primary" id="fzOk"${A.L.length ? "" : " disabled"}>✓ Salva${A.L.length ? ` (${A.L.length})` : ""}</button></div></div>`;
  if (sh.hidden) showSheet(sh);
  const add = (f, q) => { const i = A.L.findIndex(([x]) => x === f); if (i >= 0) A.L[i][1] = Math.round((A.L[i][1] + q) * 100) / 100; else A.L.push([f, q]); };
  const redraw = () => { const y = sh.querySelector(".is-c").scrollTop; openFrzAdd(true); sh.querySelector(".is-c").scrollTop = y; };
  sh.querySelectorAll("[data-fq]").forEach(b => b.onclick = () => { const f = b.dataset.fq, o = FO(f); add(f, PROTG[f] ? PROTG[f] * 2 : isW(o) ? o.d * 2 : 4); redraw(); });
  const q = sh.querySelector(".fzadd .qbox"); if (q) bindRows(q, A.L, () => { A.L = A.L.filter(([, n]) => n > 0); redraw(); });
  let tmo; $("fzT").oninput = e => { A.t = e.target.value; clearTimeout(tmo); tmo = setTimeout(() => { redraw(); const t = $("fzT"); t.focus(); t.setSelectionRange(t.value.length, t.value.length); }, 800); };
  const u = $("fzUse"); if (u) u.onclick = () => { for (const [f, n] of r.items) add(f, n); A.t = ""; redraw(); };
  $("fzD").onchange = e => { A.d = e.target.value || todayISO(); };
  $("fzPic").onchange = e => { A.pic = e.target.files[0] || null; redraw(); };
  $("fzCl").onchange = async e => { const f = e.target.files[0]; if (!f) return; A.pic = A.pic || f; e.target.value = "";
    if (aiOn()) return aiFreezer(f, add, redraw);
    try { const fl = new File([f], "congelatore.jpg", { type: f.type || "image/jpeg" }); if (navigator.canShare && navigator.canShare({ files: [fl] })) { await navigator.share({ files: [fl], text: frzPrompt() }); return; } } catch (err) { if (err && err.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(frzPrompt()); toast("Testo copiato: apri Claude, incolla e allega la foto"); } catch (_) { toast("Apri Claude e mandagli la foto"); } };
  $("fzScan").onclick = () => scanOpen(f => { const o = FO(f); add(f, o.d || 400); redraw(); });
  $("fzOk").onclick = () => { if (!A.L.length) return; const now = Date.now(), items = A.L.map(([f, n], i) => ({ id: (now + i).toString(36), f, q: n, d: A.d, at: now }));
    frz().push(...items); save(); const pic = A.pic; CS.fza = null; closeRecipe(); renderCibo(); toast(`🧊 In congelatore: ${items.length === 1 ? qText(items[0].f, items[0].q) : items.length + " cose"}`);
    if (pic) frzPhoto(pic, items); };
}


// ---------- 📷 FOTO DEL PIATTO ANALIZZATA DA CLAUDE (21/11/2026, richiesta dell'utente: "un bel pulsante per scattare foto
// che Claude analizza e stima ingredienti e kcal; quando non so cosa sto mangiando o mi è più comodo, crea la sua scheda pasto").
// La foto (ridotta a 1280 px) va al servizio worker/ (/food/photo), che la manda all'API di Anthropic con la chiave segreta
// (ANTHROPIC_API_KEY, mai nel sito). Per usarlo serve il codice dell'app (FOTO_CODICE), scritto una volta in Impostazioni e
// tenuto solo sul telefono (localStorage "palestra-ai", mai nel backup). Gli alimenti che l'app conosce usano i suoi valori;
// gli altri diventano alimenti "di Claude" (D.food.aif, nel backup) coi valori stimati per 100 g.
const AIK = "palestra-ai";
const aiCfg = () => { try { return JSON.parse(localStorage.getItem(AIK) || "{}"); } catch (_) { return {}; } };
const aiSet = o => { try { localStorage.setItem(AIK, JSON.stringify({ ...aiCfg(), ...o })); } catch (_) {} };
// 22/11/2026: di base l'analisi è GRATIS (Cloudflare Workers AI) e senza codice: l'app lo scopre chiedendo /food/status
const aiOn = () => { const c = aiCfg(); return !!c.code || (!!c.free && c.ok !== false); };
async function aiProbe(force) { const c = aiCfg(); if (!force && c.chk && Date.now() - c.chk < 6 * 3600e3) return;
  try { const j = await aiPost("/food/status", {}); aiSet({ chk: Date.now(), free: !j.needCode, ok: true, via: j.via, today: j.today, month: j.month }); }
  catch (e) { aiSet({ chk: Date.now(), ok: e.status === 403 ? false : c.ok, free: e.status === 403 ? false : c.free }); }
  try { if (typeof renderCibo === "function" && S.view === "cibo") renderCibo(); } catch (_) {} }
setTimeout(() => aiProbe(), 1500);
async function aiPost(path, body) {
  const r = await fetch(PUSH_URL + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: aiCfg().code, ...body }) });
  const j = await r.json().catch(() => ({ error: "risposta non valida" }));
  if (!r.ok) { const e = new Error(r.status === 403 ? "codice dell'app sbagliato (Impostazioni → Foto del cibo)" : r.status === 503 ? "analisi non ancora attiva sul servizio" : j.error || "errore " + r.status); e.status = r.status; throw e; }
  return j;
}
function shrinkPic(file, max = 1024, q = .8) {
  return new Promise((ok, ko) => { const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); const data = c.toDataURL("image/jpeg", q); ok({ data, b64: data.split(",")[1], mime: "image/jpeg" }); };
    img.onerror = () => { URL.revokeObjectURL(url); ko(new Error("foto non leggibile")); }; img.src = url; });
}
const aif = () => { const f = FOOD(); return (f.aif = f.aif || {}); };
function syncAif() { for (const [k, x] of Object.entries(aif())) CB.foods["ai_" + k] = { n: x.n, u: "g", s: 10, d: 100, v: x.v, k: "", ai: 1 }; } // 22/11: k era [] e mandava in errore la lettura del testo
// dagli alimenti di Claude alle righe dell'app
const AI_COOK = { pollo: "polloc", manzo: "carnec", macinato: "carnec", merluzzo: "pescec", orata: "pescec", patate: "patatec" };
function aiRows(items) {
  const L = [], miss = [];
  for (const it of items || []) {
    const cot = it.cotto && /\b(pasta|riso|cous|farro|orzo|quinoa)\b/i.test(it.n) && !/cott|crud/i.test(it.n) ? " cotta" : "";
    const r = readFood(`${it.n}${cot} ${Math.round(it.g)} g`, "n", false, true); let one = r.items.length === 1 && !r.miss.length ? [r.items[0].f, r.items[0].q] : null;
    // 22/11/2026: l'IA pesa carne, pesce e patate COTTI (si vede il piatto): valori da cotto, non da crudo
    if (one && it.cotto !== false && AI_COOK[one[0]] && !/crud/i.test(it.n)) one = [AI_COOK[one[0]], Math.round(gramsOf(one[0], one[1]))];
    let row = null;
    // 22/11/2026: se l'app conosce l'alimento usa SEMPRE i suoi valori (tabelle verificate): dall'IA prende solo cosa c'è e quanto.
    // Il modello gratuito sbaglia spesso le kcal (pasta 80 g = 88 kcal), molto meno i grammi.
    if (one) row = one;
    if (!row && it.kcal > 0) { const slug = normT(it.n).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 30) || "cibo", per = x => Math.round(x / it.g * 1000) / 10;
      aif()[slug] = { n: it.n.charAt(0).toUpperCase() + it.n.slice(1), v: [per(it.kcal), per(it.p), per(it.c), per(it.f)], at: Date.now() }; syncAif(); row = ["ai_" + slug, Math.round(it.g)]; }
    if (!row && one) row = one;
    if (!row) { miss.push(it.n); continue; }
    const i = L.findIndex(([f]) => f === row[0]); if (i >= 0) L[i][1] = Math.round((L[i][1] + row[1]) * 100) / 100; else L.push(row);
  }
  save(); return { L, miss };
}
const mealNow = () => { const h = new Date().getHours() + new Date().getMinutes() / 60; return h < 10.5 ? "col" : h < 12 ? "s1" : h < 15.5 ? "pr" : h < 18.5 ? "s2" : h < 22 ? "ce" : "dc"; };
const SHOTM = () => [...CB.meals.map(m => [m.id, m.name]), ["fuori", "Fuori pasto"]];
async function aiRun() {
  const S = CS.shot; if (!S) return; S.st = "run"; S.err = ""; drawShot();
  try { const j = await aiPost("/food/photo", { img: S.b64, mime: S.mime, mode: "piatto", meal: (SHOTM().find(([k]) => k === S.meal) || [0, ""])[1], note: S.note || "" });
    if (CS.shot !== S) return; const r = aiRows(j.items); S.res = j; S.L = r.L; S.miss = r.miss; S.name = j.piatto || "Il mio piatto"; S.st = r.L.length ? "ok" : "err"; if (!r.L.length) S.err = "Non ho riconosciuto alimenti: prova una foto più vicina o aggiungi un dettaglio.";
    aiSet({ today: j.used && j.used.today, month: j.used && j.used.month, last: Date.now() });
  } catch (e) { if (CS.shot !== S) return; S.st = "err"; S.err = String(e.message || e); }
  if (CS.shot === S) drawShot();
}
async function openShot(file, o = {}) {
  let p; try { p = await shrinkPic(file); } catch (e) { return toast("Foto non leggibile"); }
  if (!aiOn()) await aiProbe(true); // il servizio gratuito potrebbe essere appena diventato attivo
  const d = o.d || cDay(); CS.shot = { d, meal: o.meal || (d === todayISO() ? mealNow() : "pr"), note: o.note || "", data: p.data, b64: p.b64, mime: p.mime, file, st: aiOn() ? "run" : "off", L: [], rep: true };
  const sh = $("fsheet"); drawShot(); if (sh.hidden) showSheet(sh); if (aiOn()) aiRun();
}
function drawShot() {
  const S = CS.shot, sh = $("fsheet"); if (!S) return; const day = fDay(S.d), cv = S.meal !== "fuori" && (day.m || {})[S.meal], cur = cv && cv !== "skip" ? cv : null, co = cur && optOf(mealDef(S.meal), cur, S.d), curT = co ? co.t : cur ? "quello segnato" : "";
  const tot = valOfQ(S.L), mn = (SHOTM().find(([k]) => k === S.meal) || [0, ""])[1];
  sh.querySelector(".is-h").innerHTML = `<b>📷 Il tuo piatto</b><span class="rmeta">${S.st === "off" ? "analisi automatica da attivare" : "analisi automatica · stima ±20%"}</span>`;
  sh.querySelector(".is-c").innerHTML = `<div class="aishot"><img class="shotimg" src="${S.data}" alt="">
    ${S.st === "run" ? `<div class="shotrun"><i class="spin"></i><b>Sto guardando il piatto…</b><small>di solito 5-10 secondi</small></div>` : ""}
    ${S.st === "off" ? `<div class="card shotoff"><b>L'analisi automatica non è ancora attiva su questo telefono.</b><p class="note">Intanto fai così: <b>1.</b> «Manda a Claude» (foto + richiesta già scritta) · <b>2.</b> copia la sua risposta · <b>3.</b> incollala qui sotto e segna il pasto.</p><div class="row"><button class="btn primary" id="shChat">1 · Manda a Claude</button><button class="btn" id="shSet">Attiva l'analisi automatica</button></div><textarea id="shPaste" rows="3" placeholder="3 · Incolla qui la risposta di Claude">${esc(S.paste || "")}</textarea>${S.pasteErr ? `<p class="xpno">${esc(S.pasteErr)}</p>` : ""}</div>` : ""}
    ${S.st === "err" ? `<div class="card shotoff"><b>⚠️ ${esc(S.err)}</b><div class="row"><button class="btn primary" id="shRetry">↻ Riprova</button><button class="btn" id="shChat">Manda a Claude in chat</button></div></div>` : ""}
    ${S.st === "ok" ? `<label class="plab">Nome del piatto<input id="shN" value="${esc(S.name)}" autocomplete="off"></label>
      ${S.res && S.res.note ? `<p class="note shnote">🤖 ${esc(S.res.note)}${S.res.sicurezza === "bassa" ? " · <b>stima incerta</b>: controlla le quantità" : ""}</p>` : ""}
      <div class="qbox"><h3>Cosa c'è · correggi se serve</h3>${rowsHTML(S.L)}<p class="qtot"><b>~${fmt(tot[0])} kcal</b> · proteine ${fmt(tot[1])} g · carboidrati ${fmt(tot[2])} g · grassi ${fmt(tot[3])} g</p></div>
      ${S.miss && S.miss.length ? `<p class="xpno">Non conteggiato: ${esc(S.miss.join(", "))}</p>` : ""}` : ""}
    ${S.st !== "off" ? `<details class="shre"${S.note ? " open" : ""}><summary>✎ Aggiungi un dettaglio e rianalizza</summary><textarea id="shNote" rows="2" placeholder="es. era pasta integrale; il condimento era pesto; ne ho mangiato metà">${esc(S.note)}</textarea><button class="btn sm" id="shAgain">↻ Rianalizza</button></details>` : ""}
    ${S.st === "ok" ? `<p class="plab">Quando l'hai mangiato?</p><div class="shmeal">${SHOTM().map(([k, t]) => `<button class="chip" data-shm="${k}" aria-pressed="${S.meal === k}">${esc(t)}</button>`).join("")}</div>
      <button class="chip xlib" id="shLib" aria-pressed="${!!S.lib}">🎉 È uno sgarro · fuori conto</button>
      ${cur ? `<div class="seg2 xrep"><button data-shr="1" aria-pressed="${!!S.rep}">Al posto di «${esc(curT)}»</button><button data-shr="0" aria-pressed="${!S.rep}">In più</button></div>` : ""}
      <div class="rlog"><button class="btn primary" id="shOk">✓ Segna ${S.meal === "fuori" ? "fuori pasto" : esc(MEALN[S.meal] || "a " + mn.toLowerCase())}</button></div>
      <p class="note">Diventa un tuo piatto con questa foto: la prossima volta lo ritrovi tra le caselle di ${esc(mn.toLowerCase())}.</p>` : ""}</div>`;
  const q = sh.querySelector(".aishot .qbox"); if (q) bindRows(q, S.L, () => { S.L = S.L.filter(([, n]) => n > 0); drawShot(); });
  const n = $("shN"); if (n) n.oninput = e => { S.name = e.target.value; };
  sh.querySelectorAll("[data-shm]").forEach(b => b.onclick = () => { S.meal = b.dataset.shm; drawShot(); });
  sh.querySelectorAll("[data-shr]").forEach(b => b.onclick = () => { S.rep = b.dataset.shr === "1"; drawShot(); });
  const nt = $("shNote"); if (nt) nt.oninput = e => { S.note = e.target.value; };
  const ag = $("shAgain"); if (ag) ag.onclick = () => { if (!aiOn()) return; aiRun(); };
  const rt = $("shRetry"); if (rt) rt.onclick = () => aiRun();
  const pz = $("shPaste"); if (pz) pz.oninput = e => { S.paste = e.target.value; const r = readClaudeList(S.paste); if (!r.items.length) { S.pasteErr = S.paste.trim().length > 15 ? "Non riesco a leggerla: servono righe tipo «pollo 150 g»." : ""; const z = sh.querySelector(".shotoff .xpno"); if (z) z.textContent = S.pasteErr; return; }
    const L = []; for (const row of r.items) { const i = L.findIndex(([f]) => f === row[0]); if (i >= 0) L[i][1] += row[1]; else L.push([row[0], row[1]]); }
    S.L = L; S.miss = r.miss; S.name = S.name || "Il mio piatto"; S.res = { note: "Stima di Claude in chat" }; S.st = "ok"; S.pasteErr = ""; drawShot(); };
  const ch = $("shChat"); if (ch) ch.onclick = () => askClaude(S.file, S.note || "", "", S.meal === "pr" || S.meal === "ce" ? "un piatto" : "");
  const st = $("shSet"); if (st) st.onclick = () => { closeRecipe(); CS.shot = null; const b = document.querySelector('[data-view="backup"],[data-view="imp"],[data-view="set"]'); if (b) b.click(); setTimeout(() => { const c = $("aiSet"); if (c) c.scrollIntoView({ block: "start" }); }, 120); };
  const ok = $("shOk"); if (ok) ok.onclick = () => shotSave();
  const sl = $("shLib"); if (sl) sl.onclick = () => { S.lib = !S.lib; drawShot(); };
}
function shotSave() {
  const S = CS.shot; if (!S || !S.L.length) return; const d = S.d, L = S.L.map(r => [...r]), name = (S.name || "Il mio piatto").trim().slice(0, 60), day = fDay(d);
  if (S.lib) { // sgarro: pranzo/cena = pasto libero descritto; altrimenti voce fuori conto
    const cv = (day.m || {})[S.meal];
    if ((S.meal === "pr" || S.meal === "ce") && (!cv || S.rep)) { setFDay(d, x => { if (x.q) delete x.q[S.meal]; if (x.dn) delete x.dn[S.meal]; x.lib = { ...(x.lib || {}), [S.meal]: { t: name, it: L } }; if (cv) delete x.m[S.meal]; }); logMeal(d, S.meal, "libero", false); }
    else setFDay(d, x => x.x = [...(x.x || []), { id: "x" + Date.now().toString(36), meal: S.meal, t: name, s: "n", it: L, ai: 1, lib: 1, at: Date.now() }]);
    toast(`🎉 ${name} · ~${valOfQ(L)[0]} kcal fuori conto`); CS.shot = null; closeRecipe(); renderCibo(); return;
  }
  if (S.meal === "fuori" || ((day.m || {})[S.meal] && !S.rep)) { // fuori pasto o "in più": una voce scritta con le sue righe
    const e = { id: "x" + Date.now().toString(36), meal: S.meal, t: name, s: "n", it: L, ai: 1, at: Date.now() };
    setFDay(d, x => x.x = [...(x.x || []), e]); if (S.meal !== "fuori") { const id = rememberDish(S.meal, name, L); if (id) picPut("food:d_" + id, S.data).catch(() => {}); }
    toast(`✓ ${name} · ~${valOfQ(L)[0]} kcal`);
  } else {
    if ((day.m || {})[S.meal]) setFDay(d, x => { if (x.m) delete x.m[S.meal]; if (x.q) delete x.q[S.meal]; if (x.dn) delete x.dn[S.meal]; });
    const id = rememberDish(S.meal, name, L); picPut("food:d_" + id, S.data).catch(() => {}); logMeal(d, S.meal, "d_" + id, false, L);
    toast(`✓ ${name} · ~${valOfQ(L)[0]} kcal · lo ritrovi tra le caselle`);
  }
  CS.shot = null; closeRecipe(); renderCibo();
}
// pulsante grande in Oggi
const shotBtn = () => `<label class="shotbtn" for="shotIn"><span class="shic">📷</span><span><b>Fotografa il piatto</b><small>${aiOn() ? "Claude riconosce ingredienti, grammi e kcal" : "Claude stima ingredienti e kcal · da attivare"}</small></span><i>›</i></label><input type="file" id="shotIn" accept="image/*" capture="environment" hidden>`;
function shotBind() { const i = $("shotIn"); if (i) i.onchange = e => { const f = e.target.files[0]; e.target.value = ""; if (f) openShot(f); }; }
// stessa analisi per mensa, ristorante e sala colazione: le righe del piatto si sostituiscono con quelle stimate
async function aiInto(file, e, mid, oid) {
  let p; try { p = await shrinkPic(file); } catch (_) { return toast("Foto non leggibile"); }
  toast("📷 Sto guardando il piatto…");
  try { const j = await aiPost("/food/photo", { img: p.b64, mime: p.mime, mode: "piatto", meal: oid === "mensa" ? "pranzo in mensa" : oid === "sala" ? "pranzo della sala colazione" : "piatto del ristorante" });
    const r = aiRows(j.items); if (!r.L.length) return toast("Non ho riconosciuto alimenti: riprova più vicino");
    if (CS.qe !== e) return; e.L = r.L; qPersist(); openOpt(mid, oid, true); toast(`✓ ${j.piatto || "Piatto"} · ~${valOfQ(e.L)[0]} kcal${j.note ? " · " + j.note : ""}`);
  } catch (err) { toast("⚠️ " + (err.message || err)); }
}
// congelatore: la foto diventa l'elenco
async function aiFreezer(file, add, done) {
  let p; try { p = await shrinkPic(file); } catch (_) { return toast("Foto non leggibile"); }
  toast("📷 Sto guardando la foto…");
  try { const j = await aiPost("/food/photo", { img: p.b64, mime: p.mime, mode: "congelatore" }); const r = aiRows(j.items);
    for (const [f, q] of r.L) add(f, q); done(); toast(r.L.length ? `✓ ${r.L.length} cose riconosciute: controlla le quantità` : "Non ho riconosciuto alimenti");
  } catch (err) { toast("⚠️ " + (err.message || err)); }
}
// Impostazioni → Foto del cibo
function aiSettings() {
  const box = $("aiSet"); if (!box) return; const c = aiCfg(), via = { cloudflare: "Cloudflare Workers AI (gratis)", gemini: "Google Gemini (chiave gratuita)", claude: "Claude (a pagamento)" }[c.via] || "";
  box.innerHTML = `<p>Fotografi il piatto e l'IA stima ingredienti, grammi e kcal; poi puoi correggere tutto. <b>Gratis</b>: gira sul tuo account Cloudflare (quello delle notifiche), massimo 40 foto al giorno.</p>
    <p class="note" id="aiMsg">${aiOn() ? `<b class="okc">● Attivo</b>${via ? " · " + via : ""}${c.today != null ? ` · oggi ${c.today} foto` : ""}` : c.ok === false && !c.free ? "Serve il codice dell'app." : "Controllo il servizio…"}</p>
    ${c.free ? "" : `<label class="plab">Codice dell'app (solo se richiesto)<input id="aiCode" value="${esc(c.code || "")}" placeholder="FOTO-XXXX-XXXX-XXXX" autocomplete="off" autocapitalize="characters"></label>`}
    <div class="row"><button class="btn primary" id="aiSave">${c.free ? "Ricontrolla" : "Salva e prova"}</button></div>`;
  $("aiSave").onclick = async () => { const ce = $("aiCode"), code = ce ? ce.value.trim().toUpperCase() : ""; if (ce) aiSet({ code }); $("aiMsg").textContent = "Provo il collegamento…"; await aiProbe(true); aiSettings(); };
  if (!c.chk) aiProbe().then(aiSettings);
}


// ---------- 🎉 SGARRI (PASTI LIBERI) E STIMA A OCCHIO (21/11/2026, richiesta dell'utente: "ho mangiato rustici a un evento,
// non li ha riconosciuti; ci sono migliaia di combinazioni; è uno sgarro ma voglio segnarlo"). Il pasto libero ora si descrive
// (testo, foto, stima a occhio): le kcal si vedono ma restano FUORI dal conto del giorno (regola del piano: non si compensa).
// Dati: day.lib[pasto] = { t, it } per pranzo/cena "libero"; le voci scritte con lib: 1 sono sgarri fuori pasto o in più.
function libKcal(d) { const day = fDay(d), t = [0, 0, 0, 0];
  for (const [k, v] of Object.entries(day.lib || {})) if ((day.m || {})[k] === "libero" && v.it && v.it.length) valOfQ(v.it).forEach((n, i) => t[i] += n);
  for (const e of day.x || []) if (e.lib) { const v = xVal(e); if (v) v.forEach((n, i) => t[i] += n); }
  return t; }
function stimaBox() {
  const s = CS.stima || {}, T = CB.stima.tipi;
  return `<div class="stima"><p class="plab">✋ Stima a occhio · che tipo era?</p><div class="rchips">${T.map(([id, n]) => `<button class="chip" data-stt="${id}" aria-pressed="${s.t === id}">${esc(n)}</button>`).join("")}</div>
    ${s.t ? `<p class="plab">Quanto?</p><div class="rchips">${CB.stima.quanti.map(([k, n]) => `<button class="chip" data-sta="${k}">${esc(n)} <small>~${Math.round(valOfQ([["st_" + s.t, k]])[0] / 10) * 10} kcal</small></button>`).join("")}</div>` : ""}</div>`;
}
function stimaBind(box, add, redraw) {
  box.querySelectorAll("[data-stt]").forEach(b => b.onclick = () => { CS.stima = { t: b.dataset.stt }; redraw(); });
  box.querySelectorAll("[data-sta]").forEach(b => b.onclick = () => { const t = CS.stima && CS.stima.t; CS.stima = null; if (t) add(["st_" + t, +b.dataset.sta]); });
}
// riquadro "Cosa hai mangiato?" del pasto libero (pranzo o cena)
function libBox(d, mid) {
  const f = CS.lib && CS.lib.d === d && CS.lib.mid === mid ? CS.lib : (CS.lib = { d, mid, ...JSON.parse(JSON.stringify((fDay(d).lib || {})[mid] || { t: "", it: [] })), ed: !!((fDay(d).lib || {})[mid] || {}).it });
  let miss = f.miss || []; if (!f.ed) { const r = readFood(f.t || "", "n"); f.it = r.items.map(i => [i.f, i.q]); miss = r.miss; }
  const t = valOfQ(f.it || []);
  return `<div class="libbox"><h3>🎉 Cosa hai mangiato? <small>facoltativo · fuori conto</small></h3>
    <textarea id="lbT" rows="2" placeholder="es. 6 rustici e 2 pizzette al buffet">${esc(f.t || "")}</textarea>
    <div id="lbP">${f.it && f.it.length ? `<div class="qbox">${rowsHTML(f.it)}<p class="qtot"><b>~${fmt(t[0])} kcal</b> · fuori dal conto del giorno</p></div>` : ""}
    ${miss.length ? `<p class="xpno">Non ho capito: «${esc(miss.join("», «"))}»</p>${aiOn() ? `<button class="btn sm primary" id="lbAi">✨ Fallo capire all'IA</button>` : ""}` : ""}
    ${stimaBox()}</div>
    <div class="row"><label class="btn sm" for="lbPic">📷 ${aiOn() ? "Foto: stima Claude" : "Foto a Claude"}</label><input type="file" id="lbPic" accept="image/*" capture="environment" hidden>${f.ed && (f.t || "").trim() ? `<button class="lnk" id="lbRe"><i>↺</i>Rileggi dal testo</button>` : ""}</div>
    <p class="note">Fa parte del piano (2 a settimana): le kcal le vedi ma non entrano nel conto e non si compensano.</p></div>`;
}
function libSave() { const f = CS.lib; if (!f) return; setFDay(f.d, x => { x.lib = { ...(x.lib || {}) }; if ((f.t || "").trim() || (f.it || []).length) x.lib[f.mid] = { t: (f.t || "").trim(), it: (f.it || []).map(r => [...r]) }; else delete x.lib[f.mid]; }); }
function libBind(sh, mid, oid) {
  const f = CS.lib, box = sh.querySelector(".libbox"); if (!f || !box) return;
  const on = (fDay(f.d).m || {})[mid] === "libero", redraw = () => { if (on) libSave(); const y = sh.querySelector(".is-c").scrollTop; openOpt(mid, oid, true); sh.querySelector(".is-c").scrollTop = y; };
  let tmo; $("lbT").oninput = e => { f.t = e.target.value; clearTimeout(tmo); tmo = setTimeout(() => { if (!f.ed) { f.miss = null; redraw(); const t = $("lbT"); t.focus(); t.setSelectionRange(t.value.length, t.value.length); } else if (on) libSave(); }, 700); };
  const q = box.querySelector(".qbox"); if (q) bindRows(q, f.it, () => { f.ed = true; f.it = f.it.filter(([, n]) => n > 0); redraw(); });
  stimaBind(box, row => { f.it = [...(f.it || []), row]; f.ed = true; f.miss = []; redraw(); }, redraw);
  const re = $("lbRe"); if (re) re.onclick = () => { f.ed = false; f.miss = null; redraw(); };
  const ai = $("lbAi"); if (ai) ai.onclick = async () => { ai.disabled = true; ai.textContent = "Sto leggendo…";
    try { const j = await aiPost("/food/photo", { mode: "testo", text: (f.t || "").trim(), meal: "pasto libero" }); const r = aiRows(j.items); if (!r.L.length) throw new Error("non ho riconosciuto alimenti");
      f.it = r.L; f.ed = true; f.miss = r.miss; redraw(); toast(`✓ ~${valOfQ(f.it)[0]} kcal (fuori conto)`); } catch (e) { toast("⚠️ " + (e.message || e)); ai.disabled = false; ai.textContent = "✨ Fallo capire all'IA"; } };
  $("lbPic").onchange = async e => { const file = e.target.files[0]; e.target.value = ""; if (!file) return;
    if (!aiOn()) return askClaude(file, (f.t || "").trim(), "", "");
    let p; try { p = await shrinkPic(file); } catch (_) { return toast("Foto non leggibile"); } toast("📷 Sto guardando la foto…");
    try { const j = await aiPost("/food/photo", { img: p.b64, mime: p.mime, mode: "piatto", meal: "pasto libero", note: (f.t || "").trim() }); const r = aiRows(j.items); if (!r.L.length) throw new Error("non ho riconosciuto alimenti");
      f.it = r.L; f.ed = true; f.miss = r.miss; if (!(f.t || "").trim()) f.t = j.piatto || ""; redraw(); toast(`✓ ${j.piatto || "Fatto"} · ~${valOfQ(f.it)[0]} kcal (fuori conto)`); } catch (err) { toast("⚠️ " + (err.message || err)); } };
}

function renderSpesa(box) {
  const S0 = FOOD().shop, n = Object.keys(S0).length;
  const P = Object.entries(prods()).sort((a, b) => (b[1].at || 0) - (a[1].at || 0));
  box.innerHTML = frzSection() + `<h2>🏷 I miei prodotti</h2><div class="card myp">
      <p class="note">Le marche cambiano le kcal: scansiona il codice a barre di quello che compri e l'app usa i valori della tua confezione.</p>
      ${P.map(([id, p]) => `<button class="pitem" data-pe="${id}"><b>${esc(p.n)}${p.b ? ` <span>· ${esc(p.b)}</span>` : ""}</b><small>${fmt(p.v[0])} kcal · P ${fmt(p.v[1])} · C ${fmt(p.v[2])} · G ${fmt(p.v[3])} per 100 g${p.sub && CB.foods[p.sub] ? ` · al posto di ${esc(CB.foods[p.sub].n.toLowerCase())}` : ""}</small></button>`).join("")}
      <div class="row"><button class="btn primary" id="pScan">📷 Scansiona un prodotto</button><button class="btn" id="pMan">✎ Scrivo l'etichetta</button></div></div>
    <details class="card brands"><summary><b>Cosa comprare</b><span>marche facili da trovare e cosa guardare</span></summary>${CB.brands.map(([a, b, c]) => `<div class="brow"><b>${esc(a)}</b><span>${esc(b)}</span><small>${esc(c)}</small></div>`).join("")}<p class="note">Poi scansiona quella che prendi: i numeri giusti sono quelli della tua confezione.</p></details>
    ${planCard()}
    <h2>Lista base</h2><p class="note">Tocca quello che hai già preso. Le proteine: prendi quelle delle ricette della settimana.</p>
    ${CB.shop.map(c => `<h2>${esc(c.cat)}</h2><div class="shop">${c.items.map(it => `<button class="sitem${S0[it] ? " on" : ""}" data-it="${esc(it)}"><i>${S0[it] ? "✓" : ""}</i>${esc(it)}</button>`).join("")}</div>`).join("")}
    ${n ? `<div class="row"><button class="btn" id="shopReset">Ricomincia la lista (${n} presi)</button></div>` : ""}`;
  box.querySelectorAll("[data-it]").forEach(b => b.onclick = () => { const k = b.dataset.it, f = FOOD(); if (f.shop[k]) delete f.shop[k]; else f.shop[k] = 1; save(); renderCibo(); });
  const r = $("shopReset"); if (r) r.onclick = () => { FOOD().shop = {}; save(); renderCibo(); };
  const wa = $("wpAdd"); if (wa) wa.ontoggle = () => { CS.wpOpen = wa.open; };
  box.querySelectorAll("[data-wp]").forEach(b => b.onclick = () => { CS.wpOpen = true; const r = recipeById(b.dataset.wp), P = FOOD().wplan; P[b.dataset.wp] = r.main ? (r.one ? 1 : 2) : 3; save(); renderCibo(); });
  box.querySelectorAll("[data-wpm],[data-wpp]").forEach(b => b.onclick = () => { const id = b.dataset.wpm || b.dataset.wpp, P = FOOD().wplan; P[id] = Math.max(0, (P[id] || 0) + (b.dataset.wpm ? -1 : 1)); if (!P[id]) delete P[id]; save(); renderCibo(); });
  const wn = $("wpNew"); if (wn) wn.onclick = () => { if (!wn.dataset.sure) { wn.dataset.sure = 1; wn.textContent = "Tocca di nuovo: svuoto la settimana"; return; } const f = FOOD(); f.wplan = {}; for (const k of Object.keys(f.shop)) if (k.startsWith("auto:")) delete f.shop[k]; save(); renderCibo(); };
  $("pScan").onclick = () => scanOpen(); $("pMan").onclick = () => prodForm({}); frzBind(box);
  box.querySelectorAll("[data-pe]").forEach(b => b.onclick = () => prodForm({ ...prods()[b.dataset.pe], id: b.dataset.pe }));
}

// ---------- backup: unione dei dati del cibo (giorni più recenti vincono) ----------
function mergeFood(inc) {
  if (!inc || !inc.food) return; const f = FOOD(), g = inc.food;
  for (const [d, x] of Object.entries(g.days || {})) { const l = f.days[d]; if (!l || (x.at || 0) > (l.at || 0)) f.days[d] = x; }
  f.pics = { ...(g.pics || {}), ...f.pics }; f.shop = { ...(g.shop || {}), ...f.shop };
  if (g.myrec) { const R = myRec(); for (const [id, x] of Object.entries(g.myrec)) if (!R[id] || (x.at || 0) > (R[id].at || 0)) R[id] = x; syncRecipes(); }
  if (g.prods) { const P = prods(); for (const [id, x] of Object.entries(g.prods)) if (!P[id] || (x.at || 0) > (P[id].at || 0)) P[id] = x; syncProds(); }
  if (g.frz) { const L = frz(), M = new Map(L.map(x => [x.id, x])); for (const x of g.frz) { const l = M.get(x.id); if (!l) L.push(x); else if ((x.at || 0) > (l.at || 0)) Object.assign(l, x); } }
  if (g.aif) { const A = aif(); for (const [k, x] of Object.entries(g.aif)) if (!A[k] || (x.at || 0) > (A[k].at || 0)) A[k] = x; syncAif(); }
  if (g.nobrand) f.nobrand = { ...g.nobrand, ...(f.nobrand || {}) };
  if (g.fridge) { const have = new Set(frList().map(x => x.id)); for (const x of g.fridge) if (!have.has(x.id)) f.fridge.push(x); }
  for (const [w, x] of Object.entries(g.week || {})) { const l = f.week[w]; if (!l || (x.at || 0) > (l.at || 0)) f.week[w] = x; }
  if (g.adj && (g.adjT || 0) > (f.adjT || 0)) { f.adj = g.adj; f.adjT = g.adjT; }
  for (const [w, x] of Object.entries(g.rev || {})) { f.rev = f.rev || {}; const l = f.rev[w]; if (!l || (x.at || 0) > (l.at || 0)) f.rev[w] = x; }
}
// per il report al PT
function foodReport(from) {
  const f = FOOD(), ds = Object.keys(f.days).filter(d => d >= from && Object.keys((f.days[d] || {}).m || {}).length).sort(); if (!ds.length) return [];
  let lib = 0, x = 0; for (const d of ds) { const m = f.days[d].m; for (const k of ["pr", "ce"]) if (m[k] === "libero") lib++; x += (f.days[d].x || []).length; }
  return ["", "🍽 ALIMENTAZIONE", `Giorni segnati: ${ds.length} · pasti liberi: ${lib}${x ? ` · cibi extra scritti: ${x}` : ""}`];
}

// app aperta direttamente sul Cibo: js/10-avvio.js disegna prima che questo file sia caricato
if (typeof S !== "undefined" && S.view === "cibo") renderCibo();

