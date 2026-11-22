"""Il punto della settimana: giorni fatti, record, esercizi fermi, fatica → scarico proposto e pianificato, avviso e puntino,
commento dell'allenatore (servizio finto)."""
import asyncio, json
from common import App, Check

# 4 settimane di G1 nella palestra PA con la panca e la lat ferme; la settimana scorsa: G1 e G3 fatti, G2 no, energia bassa
SEED = r"""
(() => {
  const p = plan(), mon = prevMon(weekStart(todayISO())), add = (iso, n) => { const t = new Date(iso + "T12:00"); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); };
  let t = Date.now() - 864e5 * 40;
  const mk = (gym, di, date, fn) => { const d = p.days[di], s = { id: `${gym}_${p.id}_${d.id}_${date}`, gym, plan: p.id, day: d.id, date, ex: {}, note: "", updatedAt: t };
    d.ex.forEach((e, ei) => { if (e.nolog) { s.circ = { ...(s.circ || {}), [e.circ]: 3 }; return; } s.ex[e.key] = e.sets.map((x, i) => fn(e, ei, i, parseInt(x.t) || 10)); });
    D.sessions[s.id] = s; };
  [-21, -14, -7, 0].forEach((off, w) => {
    mk("PA", 0, add(mon, off), (e, ei, i, tr) => ({ kg: ei === 0 ? 40 : 20 + w * 2.5, reps: tr, at: (t += 120000), ...(w === 3 && i === 2 ? { dirty: 2 } : {}), ...(w === 3 && i === 0 ? { eff: "hard" } : {}) }));
    if (w === 3) mk("PA", 2, add(mon, 2), (e, ei, i, tr) => ({ kg: 30, reps: tr, at: (t += 120000), eff: "hard" }));
    t += 864e5 * 7;
  });
  D.food = D.food || { days: {}, pics: {}, shop: {}, week: {} }; D.food.week = { [mon]: { energia: 0, sonno: 0, fame: 1 } };
  save(); return mon;
})()
"""

async def main():
    c = Check("Punto della settimana")
    async with App() as a:
        mon = await a.js(SEED)
        R = await a.js(f"(() => {{ const R = weekReview('{mon}'); return {{ days: R.days.filter(d => d.done).length, missing: R.missing.map(d => d.id), score: R.score, prop: R.proposeDeload, stalls: R.stalls.length, prs: R.prs.length, act: reviewActions(R).map(x => x[1]) }}; }})()")
        c.ok(R["days"] == 2 and R["missing"] == [await a.js("plan().days[1].id")], f"giorni fatti 2, manca G2 ({R})")
        c.ok(R["stalls"] >= 1, f"esercizi fermi trovati ({R['stalls']})")
        c.ok(R["prop"] is True, f"scarico proposto (fatica {R['score']})")
        c.ok(any("scarico" in x for x in R["act"]), "tra le azioni c'è lo scarico")
        await a.js("S.view='log'; render()"); await a.wait(250)
        c.ok(await a.js("!!document.querySelector('#pauseNag .rv-nag')"), "avviso in Allenamento")
        c.ok(await a.js("document.querySelector('.tabbar button[data-view=\"prog\"]').classList.contains('dot')"), "puntino su Progressi")
        await a.js("document.getElementById('rvGo').click()"); await a.wait(400)
        c.ok(await a.js("!document.getElementById('review').hidden && document.getElementById('review').textContent.includes('Cosa fare')"), "riquadro in Progressi")
        c.ok(not await a.js("document.querySelector('.tabbar button[data-view=\"prog\"]').classList.contains('dot')"), "puntino sparito dopo averlo visto")
        await a.pg.screenshot(path="/tmp/settimana.png", full_page=False)
        await a.js("document.querySelector('#review [data-rv=\"dl\"]').click()"); await a.wait(250)
        c.ok(await a.js("D.prefs.deload === weekStart(todayISO())"), "scarico attivo da questa settimana")
        c.ok(await a.js("document.getElementById('review').textContent.includes('Scarico attivo dal')"), "scritta scarico attivo")
        await a.js("document.querySelector('#review [data-rv=\"undl\"]').click()"); await a.wait(250)
        c.ok(await a.js("!D.prefs.deload && !D.prefs.deloadPlan"), "annulla toglie lo scarico")
        # pianificato per una settimana futura: si attiva quando arriva
        await a.js("D.prefs.deloadPlan = weekStart(todayISO()); applyPlannedDeload()")
        c.ok(await a.js("D.prefs.deload === weekStart(todayISO()) && !D.prefs.deloadPlan"), "scarico pianificato si attiva nella sua settimana")
        await a.js("delete D.prefs.deload; D.prefs.deloads = []; save()")
        # commento dell'allenatore con servizio finto
        await a.pg.route("**/coach", lambda r: r.fulfill(status=200, content_type="application/json", headers={"Access-Control-Allow-Origin": "*"}, body=json.dumps({"commento": "Bella settimana sulla panca. Ora recupera.", "via": "prova"})))
        await a.js("S.view='prog'; render()"); await a.wait(250)
        await a.js("document.querySelector('#review [data-rv=\"ai\"]').click()"); await a.wait(800)
        c.ok(await a.js("document.getElementById('review').textContent.includes('Bella settimana sulla panca')"), "commento dell'allenatore mostrato e salvato")
        # settimane avanti e indietro
        await a.js("document.querySelector('#review [data-rw=\"-7\"]').click()"); await a.wait(200)
        c.ok(await a.js("document.getElementById('review').textContent.includes('Settimana del')"), "settimana prima")
        c.done(a.errs)
asyncio.run(main())
