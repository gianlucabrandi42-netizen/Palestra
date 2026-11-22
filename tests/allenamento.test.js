// Test delle regole dell'allenamento (kg suggeriti, serie sporche, doppia progressione, recupero, scarico, adattamento in seduta).
const R = (kg, reps, x = {}) => ({ kg, reps, ...x });

T("Serie pulita a target: si sale di un salto", () => {
  eq(advise(R(40, 10), null, 10, 2.5, 1).kg, 42.5);
  eq(advise(R(40, 12), null, 10, 5, 1).kg, 45, "oltre il target");
});

T("Serie pulita sotto target: stesso carico", () => { eq(advise(R(40, 8), null, 10, 2.5, 1).kg, 40); });

T("Serie sporca graduata", () => {
  eq(advise(R(40, 11, { dirty: 1 }), null, 10, 2.5, 1).kg, 42.5, "1 sporca, 10 pulite: si sale");
  eq(advise(R(40, 10, { dirty: 1 }), null, 10, 2.5, 1).kg, 40, "1 sporca, 9 pulite: stesso");
  eq(advise(R(40, 10, { dirty: 2 }), null, 10, 2.5, 1).kg, 40, "2 sporche: stesso");
  eq(advise(R(40, 10, { dirty: 3 }), null, 10, 2.5, 1).kg, 37.5, "3+ sporche: un salto giù");
  eq(advise(R(40, 8, { dirty: 1 }), null, 10, 2.5, 1).kg, 37.5, "pulite 3 sotto: un salto giù");
  eq(advise(R(40, 10, { dirty: true }), null, 10, 2.5, 1).kg, 40, "vecchio formato true = 1 sporca");
});

T("Sensazione: al limite resta, aiutata resta, recupero lungo resta", () => {
  eq(advise(R(40, 10, { eff: "hard" }), null, 10, 2.5, 1).kg, 40, "al limite");
  eq(advise(R(40, 10, { help: 1 }), null, 10, 2.5, 1).kg, 40, "aiutata");
  eq(advise(R(40, 10, { lr: 200 }), null, 10, 2.5, 1).kg, 40, "recupero lungo");
  eq(advise(R(40, 10, { lr: 200, lrOk: 1 }), null, 10, 2.5, 1).kg, 42.5, "recupero lungo ma «non ha influito»");
});

T("Facile due volte di fila: doppio salto", () => {
  const ls = R(40, 10, { eff: "easy" }), pl = R(37.5, 10, { eff: "easy" });
  ok(easy2(ls, pl, 10), "easy2");
  eq(advise(ls, pl, 10, 2.5, 1, 2).kg, 45);
});

T("Doppia progressione con salto pesante (≥10%)", () => {
  const a = advise(R(14, 10), null, 10, 2, 1); eq([a.kg, a.reps, a.mode], [14, 11, "reps"], "aggiungi una rep");
  const b = advise(R(14, 12), null, 10, 2, 1); eq([b.kg, b.reps, b.mode], [16, 10, "jump"], "a target+2 si sale");
  const c = advise(R(16, 5), R(14, 12), 10, 2, 1); eq([c.kg, c.mode], [14, "reps"], "peso nuovo troppo: si torna indietro");
});

T("Giornata no e scarico abbassano al peso disponibile", () => {
  eq(advise(R(40, 10), null, 10, 2.5, 0.9).kg, 35, "−10% con salto 2,5 → 36 → peso disponibile sotto = 35");
  eq(advise(R(40, 10), null, 10, 2.5, DELOAD_F).kg, 25, "scarico −35%");
});

T("Senza salto noto: +2,5% arrotondato", () => { eq(advise(R(40, 10), null, 10, null, 1).kg, 41); });

T("Salto pesi esatto ai centesimi", () => { eq(advise(R(40, 10), null, 10, 1.25, 1).kg, 41.25); });

T("Adattamento in seduta", () => {
  const P = [{ tn: 10, plan: 40 }, { tn: 8, plan: 45 }];
  eq(liveAdj(1, [R(40, 6)], P, 2.5, true).kg, 42.5, "3+ reps sotto: −1 salto");
  eq(liveAdj(1, [R(40, 4)], P, 2.5, true).kg, 40, "a metà target: −2 salti");
  eq(liveAdj(1, [R(42.5, 10)], P, 2.5, true).kg, 47.5, "kg più alti del suggerito: la piramide si sposta");
  eq(liveAdj(1, [R(40, 12)], P, 2.5, true).kg, 47.5, "2 oltre il target: +1 salto");
  eq(liveAdj(1, [R(40, 12)], P, 2.5, false).kg, 45, "niente aumenti in giornata no");
  eq(liveAdj(1, [R(40, 9)], P, 2.5, true).kg, 45, "1 rep in meno non cambia nulla");
});

T("Recupero scritto dal PT", () => {
  const C = [['90"', 90], ["90''", 90], ["90″", 90], ["90 sec", 90], ["1'30", 90], ["1'30''", 90], ["1:30", 90], ["2'", 120], ["45", 45], ["", null]];
  for (const [s, v] of C) check(parseRest(s) === v, `«${s}» → ${parseRest(s)} invece di ${v}`);
});

T("Recupero lungo", () => {
  ok(isLong(200, 90, false), "200\" su 90\""); ok(!isLong(120, 90, false), "120\" su 90\" non è lungo (+30\" massimo)");
  ok(!isLong(170, 90, true), "in 2 serve il doppio"); ok(isLong(200, 90, true));
});

T("Scarico: una serie in meno ogni 3", () => {
  const prev = JSON.stringify(D.prefs); const s = { date: "2030-03-06" };
  D.prefs.deload = weekStart(s.date);
  eq([need({ sets: [1, 2, 3] }, s), need({ sets: [1, 2, 3, 4] }, s), need({ sets: [1, 2, 3], circ: "x" }, s)], [2, 3, 3]);
  D.prefs = JSON.parse(prev);
});

T("Durata in parole", () => {
  eq([durWords(34), durWords(60), durWords(72), durWords(121)], ["34 minuti", "1 ora", "1 ora e 12 minuti", "2 ore e 1 minuto"]);
});

T("Ogni esercizio della scheda è completo", () => {
  const MUS = new Set("CHEST FRONT_DELTOIDS BACK_DELTOIDS TRICEPS BICEPS FOREARM ABS OBLIQUES TRAPEZIUS UPPER_BACK LOWER_BACK GLUTEAL HAMSTRING QUADRICEPS CALVES LEFT_SOLEUS RIGHT_SOLEUS ABDUCTORS ABDUCTOR NECK".split(" "));
  const keys = new Set();
  for (const P of SCHEDE) for (const d of P.days) for (const e of d.ex) {
    const w = `${P.id} ${d.id} ${e.name}`;
    check(e.key && /^[a-z0-9-]+$/.test(e.key), `${w}: key non valida`);
    if (P.id === SCHEDA_ATTIVA) { check(!keys.has(d.id + e.key), `${w}: key ripetuta nello stesso giorno`); keys.add(d.id + e.key); }
    check(Array.isArray(e.sets) && e.sets.length, `${w}: senza serie`);
    check(e.m && (e.m.p || []).every(m => MUS.has(m)) && (e.m.s || []).every(m => MUS.has(m)), `${w}: muscolo sconosciuto`);
    if (e.rest != null) check(parseRest(e.rest) != null, `${w}: recupero illeggibile «${e.rest}»`);
  }
});

T("Immagini della scheda attiva presenti", async () => {
  const P = SCHEDE.find(p => p.id === SCHEDA_ATTIVA), files = new Set();
  for (const d of P.days) for (const e of d.ex) for (const f of (e.img && e.img.local) || []) files.add(f);
  for (const f of files) { const r = await fetch("img/" + f, { method: "HEAD" }); check(r.ok, `img/${f} mancante`); }
});

T("Service worker: tutti i file dell'elenco esistono", async () => {
  const src = await (await fetch("sw.js")).text(), m = src.match(/FILES\s*=\s*\[([\s\S]*?)\]/);
  ok(m, "elenco FILES non trovato");
  const L = [...m[1].matchAll(/["']([^"']+)["']/g)].map(x => x[1]).filter(f => f !== "./" && !/^https?:/.test(f));
  for (const f of L) { const r = await fetch(f.replace(/^\.\//, ""), { method: "HEAD" }); check(r.ok, `${f} nell'elenco del service worker ma non esiste: l'aggiornamento non si installerebbe`); }
});
