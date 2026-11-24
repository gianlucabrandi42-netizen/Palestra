// Test del Cibo: valori degli alimenti, caselle dei pasti, somma del giorno, lettura del testo, risposte dell'IA, ricette.
const D0 = "2030-03-04", D1 = "2030-03-05", D2 = "2030-03-06"; // giorni di prova lontani dai dati veri
const kc = L => valOfQ(L)[0];

T("Alimenti: kcal coerenti con proteine, carboidrati e grassi", () => {
  const SKIP = /vino|birra|spritz|cocktail|amaro|alcol|liquor|grappa|whisky|vodka|gin|rum|prosecco|aceto|balsam/i;
  for (const [id, f] of Object.entries(CB.foods)) {
    if (!f || !f.v || /^(p_|ai_|st_)/.test(id)) continue;
    const [k, p, c, g] = f.v, at = 4 * p + 4 * c + 9 * g;
    check([k, p, c, g].every(x => typeof x === "number" && x >= 0), `${id}: valori non validi ${f.v}`);
    check(p + c + g <= 101, `${id}: più di 100 g di nutrienti per 100 g`);
    if (k >= 30 && !SKIP.test(f.n + " " + id)) check(Math.abs(at - k) / k <= 0.2, `${id} (${f.n}): ${k} kcal ma 4P+4C+9G = ${Math.round(at)}`);
    check(f.g > 0 || f.u === "g" || f.u === "ml", `${id}: grammi per unità mancanti`);
  }
});

T("Obiettivi del giorno coerenti", () => {
  for (const [k, v] of Object.entries(CB.target)) { const at = 4 * v[1] + 4 * v[2] + 9 * v[3]; check(Math.abs(at - v[0]) / v[0] < 0.06, `target ${k}: ${v[0]} kcal vs ${at}`); }
});

T("Ogni casella di ogni pasto ha quantità e kcal sensate (giorni con e senza palestra, 80/40/0)", () => {
  const R = { col: [200, 700], s1: [60, 550], pr: [250, 1150], s2: [60, 650], ce: [250, 1150], dc: [30, 400] };
  setFDay(D0, x => { x.gym = true; }); setFDay(D1, x => { x.gym = false; }); setFDay(D2, x => { x.gym = false; });
  for (const d of [D0, D1, D2]) for (const m of CB.meals) {
    const opts = [...(m.opts || []), ...(isGym(d) ? m.gym || [] : m.rest || [])];
    for (const o of opts) {
      if (["skip", "libero", "x", "mensa", "rist", "sala"].includes(o.id) || o.free) continue;
      const L = baseQ(m.id, o.id, d);
      if (!L) { check(false, `${d} ${m.id}.${o.id}: nessuna quantità (usa i vecchi valori di riserva)`); continue; }
      check(L.every(([f, q]) => FO(f) && q >= 0), `${m.id}.${o.id}: alimento sconosciuto o quantità negativa ${JSON.stringify(L)}`);
      const v = valOfQ(L), [lo, hi] = R[m.id] || [0, 2000];
      check(v[0] >= lo && v[0] <= hi, `${d} ${m.id}.${o.id} (${o.t}): ${v[0]} kcal fuori da ${lo}-${hi}`);
    }
  }
});

T("Scala del pranzo 80 / 40 / 0", () => {
  setFDay(D0, x => { x.gym = true; }); setFDay(D1, x => { x.gym = false; }); setFDay(D2, x => { x.gym = false; });
  eq([lunchLvl(D0), lunchLvl(D1), lunchLvl(D2)], [80, 40, 0], "livelli");
  const k = d => kc(baseQ("pr", "teriyaki", d) || []);
  ok(k(D0) > k(D1) && k(D1) > k(D2), `kcal pranzo non decrescenti: ${k(D0)} / ${k(D1)} / ${k(D2)}`);
});

T("Somma del giorno = somma dei pasti (sgarri fuori conto, caffè dentro)", () => {
  setFDay(D0, x => { x.gym = true; x.m = { col: "B", s1: "bgn", pr: "teriyaki", s2: "A2", ce: "teriyaki", dc: "rot" };
    x.x = [{ id: "a", meal: "fuori", t: "cappuccino", bar: 1, it: [["cappuccino", 1]] }, { id: "b", meal: "s1", t: "2 biscotti" }, { id: "c", meal: "fuori", t: "rustici", lib: 1, it: [["rustico", 4]] }]; });
  const s = [0, 0, 0, 0];
  for (const k of ["col", "s1", "pr", "s2", "ce", "dc"]) { const v = optVal(k, fDay(D0).m[k], D0); ok(v, `pasto ${k} senza valori`); v.forEach((n, i) => s[i] += n); }
  for (const e of fDay(D0).x) if (!e.lib) xVal(e).forEach((n, i) => s[i] += n);
  const dv = dayVals(D0);
  eq(dv.t.map(Math.round), s.map(Math.round), "totale");
  eq(dv.free, 1, "sgarri contati a parte");
  near(libKcal(D0)[0], kc([["rustico", 4]]), 1, "kcal dello sgarro");
});

T("Modifica delle quantità di un pasto segnato: il totale si aggiorna", () => {
  setFDay(D1, x => { x.m = { col: "B" }; x.x = []; });
  const b = dayVals(D1).t[0]; qeInit(D1, "col", "B");
  const i = CS.qe.L.findIndex(r => r[0] === "noce"); ok(i >= 0, "la colazione B non ha noci");
  CS.qe.L[i][1] += 2; qPersist();
  near(dayVals(D1).t[0] - b, kc([["noce", 2]]), 2, "+2 noci");
});

T("Lettura del testo scritto", () => {
  const C = [
    ["3 noci", { noce: 3 }],
    ["2 uova e 2 fette di pane di segale", { uovo: 2, segale: 2 }],
    ["petto di pollo 200 g con riso 80 g", { pollo: 200, riso: 80 }],
    ["piadina con 50 g di bresaola", { piadina: 1, bresaola: 50 }],
    ["90 secondi in microonde 3 gallette", { galletta: 3 }],
    ["3 gallette o 1 yogurt", { galletta: 3 }],
    ["Totale circa 550 kcal", {}],
    ["pollo 150 g (circa 250 kcal)", { pollo: 150 }],
    ["2 tranci di pizza", { pizzatag: 2 }],
    ["4 rustici", { rustico: 4 }],
    ["shaker con 30 g di proteine", null],
  ];
  for (const [t, exp] of C) {
    let r; try { r = readFood(t, "n"); } catch (e) { check(false, `«${t}»: errore ${e.message}`); continue; }
    const got = {}; r.items.forEach(i => got[i.f] = +(+i.q).toFixed(2));
    if (exp) check(JSON.stringify(got) === JSON.stringify(exp), `«${t}»: atteso ${JSON.stringify(exp)}, letto ${JSON.stringify(got)}`);
    else check(r.items.length === 1, `«${t}»: atteso un solo alimento, letto ${JSON.stringify(got)}`);
  }
  const R = [["pasta alla carbonara", 450, 750], ["80 g di pasta al pomodoro", 280, 420], ["cappuccino", 60, 130], ["una birra media", 120, 230], ["2 tranci di pizza", 450, 800]];
  for (const [t, lo, hi] of R) { const v = readFood(t, "n").t[0]; check(v >= lo && v <= hi, `«${t}»: ${v} kcal fuori da ${lo}-${hi}`); }
});

T("Lettura del testo: errori di battitura e cose non capite", () => {
  const r = readFood("carbonra", "n"); ok(r.items.length && r.items[0].f === "carbonara", "carbonra → carbonara: " + JSON.stringify(r.items));
  const m = readFood("xyzqw blabla", "n"); ok(!m.items.length && m.miss.length, "testo senza senso deve finire tra i non capiti");
});

T("Risposta dell'IA incollata (alimento grammi per riga, totale a parte)", () => {
  const r = readClaudeList("- Petto di pollo 150 g (~250 kcal)\n- Riso 80 g\n- Olio 10 g\n\nTotale circa 600 kcal · proteine 45 g · carboidrati 65 g · grassi 15 g");
  const f = r.items.map(i => i[0]);
  ok(f.includes("pollo") && f.includes("riso") && f.includes("olio"), "alimenti: " + JSON.stringify(r.items));
  ok(!f.includes("torta"), "«Totale» letto come torta");
  eq(r.items.length, 3, "righe");
  near(r.tot && (r.tot.k ?? r.tot[0]), 600, 1, "totale");
});

T("Foto analizzata: alimenti dell'app coi loro valori, sconosciuti come alimenti dell'IA", () => {
  const r = aiRows([{ n: "pasta cotta", g: 235, cotto: true, kcal: 352, p: 12, c: 70, f: 2 }, { n: "zzyzx misterioso", g: 20, kcal: 60, p: 0, c: 5, f: 4 }, { n: "petto di pollo", g: 150, kcal: 999, p: 1, c: 1, f: 1 }]);
  const f = r.L.map(x => x[0]);
  ok(f.includes("polloc"), "pollo pesato cotto → valori da cotto: " + JSON.stringify(r.L));
  ok(f.some(x => /^ai_/.test(x)), "alimento sconosciuto non creato");
  between(kc(r.L), 600, 900, "kcal totali della foto");
  // dopo un alimento dell'IA la lettura del testo deve continuare a funzionare (guasto del 22/11)
  readFood("pollo e riso", "n"); readFood("zzyzx misterioso 30 g", "n");
});

T("Prodotti di marca a pezzi", () => {
  FOOD().prods = { t1: { n: "Gallette di riso", b: "Prova", v: [380, 8, 82, 2.5], of: "galletta", sub: "galletta", pu: 1, at: 1 } }; syncProds();
  const pf = CB.foods.p_t1; eq(pf.d, CB.foods.galletta.d, "porzione in pezzi");
  const L = applySubs([["galletta", 3], ["pollo", 200]]); eq(L[0], ["p_t1", 3], "sostituzione");
  FOOD().prods = { t2: { n: "Pane segale", b: "Prova", v: [190, 5, 38, 1.2], of: "segale", sub: "segale", pu: 1, at: 1 } }; syncProds();
  between(compGrams("p_t2", "pr", D0, []), 0.5, 4, "fette di segale di marca in Componi");
  FOOD().prods = {}; syncProds();
});

T("Ricetta incollata fuori formato", () => {
  const x = parseRecipe("## Pollo al limone veloce\n**Ingredienti**\n- Petto di pollo – 200 g\n- Olio 1 cucchiaio\n- mezzo limone\n- sale q.b.\n\n**Procedimento**\n1. Taglia il pollo a straccetti.\n2. Cuoci in padella 8 minuti.\n3. Spremi il limone.");
  ok(x, "ricetta non letta"); eq(x.steps.length, 3, "passi"); ok(x.q.some(([f]) => f === "pollo"), "pollo tra gli ingredienti");
  eq(x.steps[1].min, 8, "minuti del passo 2");
});

T("Congelatore: scala e annulla", () => {
  FOOD().frz = [{ id: "z1", f: "pollo", q: 400, d: "2030-01-01", th: "2030-03-04T10:00", at: 1 }];
  frUse(D0, "pr", [["pollo", 200], ["riso", 80]]); const q1 = FOOD().frz[0] && FOOD().frz[0].q;
  frUse(D0, "pr", null, true); const q2 = FOOD().frz[0] && FOOD().frz[0].q;
  ok(q1 < 400, "non scalato: " + q1); eq(q2, 400, "annulla");
  FOOD().frz = [];
});

T("Spesa della settimana", () => {
  FOOD().wplan = { teriyaki: 2 }; const L = weekList(); ok(Array.isArray(L) && L.length, "lista vuota");
  ok(!JSON.stringify(L).includes("NaN"), "NaN nella lista"); FOOD().wplan = {};
});

T("Sostituzioni: grammi equivalenti della tabella del PT", () => {
  const a = swapAlts("pollo", 200); ok(a && a.length, "nessuna alternativa al pollo");
  const m = a.find(x => x[0] === "merluzzo"); if (m) near(m[1], 250, 1, "merluzzo al posto di 200 g di pollo");
});

T("Punto della settimana: decisioni secondo le regole del piano", () => {
  const F = FOOD(), keepAdj = F.adj, keepBody = D.body; F.adj = [];
  const mon = "2030-03-04", end = "2030-03-10", mk = (dB, dA) => { D.body = [];
    for (const [d, w] of [["2030-02-12", 61 + dA], ["2030-02-20", 61 + dA], ["2030-02-27", 61 + dB], ["2030-03-08", 61 + dB]]) D.body.push({ id: d, date: d, w }); };
  mk(-0.8, 0); let x = fdDecide(fdData(mon)); eq([x.act, x.t], [1, "Più carboidrati a pranzo"], "peso giù");
  mk(0.9, 0); x = fdDecide(fdData(mon)); eq(x.act, -1, "peso su senza forza in salita");
  mk(0.2, 0); x = fdDecide(fdData(mon)); eq(x.act, null, "peso stabile: nessun cambio");
  F.adj = [{ from: "2030-03-05", k: 1 }]; mk(-0.8, 0); x = fdDecide(fdData(mon)); eq([x.act, x.t], [null, "Aspetta ancora"], "un cambio alla volta");
  // il gradino cambia davvero il pranzo dei giorni senza palestra
  setFDay("2030-03-12", d => { d.gym = false; }); setFDay("2030-03-13", d => { d.gym = false; }); setFDay("2030-03-14", d => { d.gym = false; });
  F.adj = [{ from: "2030-03-13", k: 1 }];
  eq([lunchLvl("2030-03-12"), lunchLvl("2030-03-14")], [0, 40], "gradino 1 dal 13: prima 0, dopo 40");
  ok(dayTarget("2030-03-14")[0] > dayTarget("2030-03-12")[0], "obiettivo del giorno più alto col gradino");
  ok(/Applica|Aspetta|Continua|Nessun/.test(foodDecBox({ mon })), "riquadro nel punto della settimana");
  F.adj = keepAdj; D.body = keepBody;
});

T("Pasto del PT: obiettivi del giorno = somma dei pasti del PT", () => {
  const s = (...k) => k.reduce((a, x) => a.map((v, i) => v + CB.pt[x].c[i]), [0, 0, 0, 0]);
  eq(CB.target.gym, s("col", "s1", "pr80", "s2g", "ce"), "palestra");
  eq(CB.target.rest, s("col", "s1", "pr40", "s2r", "ce"), "giorno dopo");
  eq(CB.target.rest0, s("col", "s1", "pr0", "s2r", "ce"), "2° senza palestra");
  for (const [k, p] of Object.entries(CB.pt)) { const at = 4 * p.c[1] + 4 * p.c[2] + 9 * p.c[3]; check(Math.abs(at - p.c[0]) / p.c[0] < 0.08, `${k}: ${p.c[0]} kcal vs 4P+4C+9G ${at}`); }
});

T("Pasto del PT: confronto e verdetto", () => {
  const C = ptCmp([606, 55, 71, 12], "pr80"); ok(C.every(r => r.st === "ok"), "il pasto del PT è in linea con se stesso");
  eq(ptVerdict(C, "pr80"), "In linea col pasto del PT ✓");
  const H = ptCmp([830, 55, 71, 28], "pr80"); eq([H[0].st, H[3].st], ["hi2", "hi2"], "kcal e grassi molto sopra");
  ok(/grassi \+16 g \(≈ 2 cucchiai d'olio/.test(ptVerdict(H, "pr80")), ptVerdict(H, "pr80"));
  eq(ptCmp([606, 80, 71, 12], "pr80")[1].st, "up", "proteine in più non sono un errore");
  ok(/proteine/.test(ptVerdict(ptCmp([600, 30, 80, 14], "pr80"), "pr80")), "proteine basse segnalate");
  // il PT dice: colazione A, B e C sono tutte del piano
  for (const o of ["A2", "B"]) { const v = valOfQ(baseQ("col", o, D0)); ok(!ptBad(ptCmp(v, "col")), `colazione ${o} del PT fuori dalla fascia: ${v}`); }
  const Cc = ptCmp(valOfQ(baseQ("col", "C", D0)), "col"); eq(Cc.map(r => r.st), ["ok", "lo", "ok", "ok"], "colazione C del PT: solo le proteine basse");
});

T("Simula: giornata del PT in linea e dati veri intatti", () => {
  const before = JSON.stringify(FOOD().days); CS.sim = { t: "g", pick: {} };
  const box = document.createElement("div"); renderSimula(box);
  ok(/In linea col piano del PT/.test(box.textContent), "giornata del PT non in linea");
  eq(JSON.stringify(FOOD().days), before, "il simulatore ha cambiato i giorni salvati");
  for (const t of ["a", "r"]) { CS.sim.t = t; renderSimula(box); ok(box.querySelectorAll(".simall").length >= 5, "tabella delle idee"); ok(!/NaN|undefined/.test(box.innerHTML), "NaN/undefined nel simulatore"); }
});
