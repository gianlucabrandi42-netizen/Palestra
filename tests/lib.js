// Mini libreria di test: si carica nella pagina dell'app (dopo app.js e cibo.js) e usa le loro funzioni globali.
window.__T = [];
const T = (name, fn) => __T.push({ name, fn });
class Fail extends Error {}
const fail = m => { throw new Fail(m); };
const ok = (v, m) => { if (!v) fail(m || "atteso vero"); };
const eq = (a, b, m) => { const A = JSON.stringify(a), B = JSON.stringify(b); if (A !== B) fail(`${m ? m + ": " : ""}atteso ${B}, ottenuto ${A}`); };
const near = (a, b, tol, m) => { if (a == null || Math.abs(a - b) > tol) fail(`${m ? m + ": " : ""}atteso ${b} ±${tol}, ottenuto ${a}`); };
const between = (a, lo, hi, m) => { if (a == null || a < lo || a > hi) fail(`${m ? m + ": " : ""}atteso tra ${lo} e ${hi}, ottenuto ${a}`); };
// errori raccolti (non fermano gli altri controlli dello stesso test)
const soft = [];
const check = (v, m) => { if (!v) soft.push(m); };
window.__run = async () => {
  const res = [];
  for (const t of __T) {
    soft.length = 0; const t0 = performance.now();
    try { await t.fn(); if (soft.length) res.push({ n: t.name, ok: false, e: soft.slice(0, 15).join("\n") + (soft.length > 15 ? `\n… e altri ${soft.length - 15}` : "") });
      else res.push({ n: t.name, ok: true }); }
    catch (e) { res.push({ n: t.name, ok: false, e: e instanceof Fail ? e.message : (e && e.stack || String(e)).split("\n").slice(0, 4).join("\n") }); }
    res[res.length - 1].ms = Math.round(performance.now() - t0);
  }
  return res;
};
// dati finti: 5 settimane di allenamento nelle 2 palestre, pesate, giorni di cibo
window.__seed = (opt = {}) => {
  const P = SCHEDE.find(p => p.id === SCHEDA_ATTIVA), days = P.days;
  const today = new Date(); today.setHours(12); const iso = t => t.toISOString().slice(0, 10);
  let n = 0;
  for (let w = 5; w >= 0; w--) for (let di = 0; di < days.length; di++) {
    const t = new Date(today); t.setDate(t.getDate() - w * 7 - (days.length - di) * 2); const date = iso(t); if (date >= iso(today)) continue;
    const gym = (w + di) % 2 ? "PB" : "PA", day = days[di].id || di, id = `${gym}_${P.id}_${day}_${date}`, ex = {}; let at = t.getTime();
    for (const e of days[di].ex || days[di].exercises || []) {
      if (e.nolog) continue;
      ex[e.key] = e.sets.map((s, i) => { const tg = parseInt(s.t) || 10, kg = e.bw ? null : 20 + (5 - w) * 2.5 + i * 2.5; at += 120000;
        return { kg, reps: tg - (i === 2 && w % 2 ? 2 : 0), at, ...(w === 3 && i === 2 ? { dirty: 1 } : {}) }; });
    }
    D.sessions[id] = { id, gym, plan: P.id, day, date, ex, circ: {}, note: "", updatedAt: at, t0: t.getTime(), t1: at };
    n++;
  }
  D.body = []; for (let i = 35; i >= 0; i -= 3) { const t = new Date(today); t.setDate(t.getDate() - i); D.body.push({ id: "b" + i, date: iso(t), w: 80 - (35 - i) * 0.03 + (i % 2) * 0.3 }); }
  save(); return n;
};
