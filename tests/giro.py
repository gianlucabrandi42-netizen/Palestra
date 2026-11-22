"""Giro completo dell'app con dati finti: tutte le sezioni, i giorni, le due palestre, il riquadro Info di ogni esercizio,
il tastierino, una seduta completa con recap, Progressi e le 4 sezioni del Cibo. Fallisce se la pagina dà un errore."""
import asyncio
from common import App, Check

SEED = r"""
(() => {
  const p = plan(), day = (iso, n) => { const d = new Date(iso); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
  const today = todayISO(); let t = Date.now() - 864e5 * 20;
  [["PA", 0, 14], ["PB", 0, 10], ["PA", 1, 9], ["PA", 0, 7], ["PB", 2, 6], ["PA", 0, 3], ["PA", 1, 2]].forEach(([g, di, ago], k) => {
    const d = p.days[di], date = day(today, ago), s = { id: `${g}_${p.id}_${di}_${date}`, gym: g, plan: p.id, day: di, date, ex: {}, note: "", updatedAt: t };
    d.ex.forEach(e => { if (e.nolog) { s.circ = s.circ || {}; s.circ[e.circ] = 3; return; }
      s.ex[e.key] = e.sets.map((x, i) => ({ kg: e.bw ? null : 20 + k * 2.5 + i * 2.5, reps: (parseInt(x.t) || 10) - (i === 2 && k % 2 ? 2 : 0), at: (t += 120000), ...(i === 1 && k === 3 ? { dirty: 1 } : {}), ...(i === 0 && k === 5 ? { eff: "easy" } : {}) })); });
    s.t0 = t - 3600e3; s.t1 = t; D.sessions[s.id] = s; t += 864e5;
  });
  D.body = [{ date: day(today, 20), w: 80.4, waist: 86 }, { date: day(today, 10), w: 79.9 }, { date: day(today, 2), w: 79.5, waist: 85 }];
  save(); return Object.keys(D.sessions).length;
})()
"""

async def main():
    c = Check("Giro dell'app")
    async with App() as a:
        c.ok(await a.js(SEED) == 7, "dati finti caricati")
        for g in ["PA", "PB"]:
            ndays = await a.js("plan().days.length")
            for di in range(ndays):
                await a.js(f"S.gym='{g}'; S.day={di}; S.view='log'; render()"); await a.wait(150)
                keys = await a.js("[...document.querySelectorAll('#list .ex[data-ex], #list .exmini[data-mini]')].map(e => e.dataset.ex || e.dataset.mini).filter(k => dayObj().ex.some(x => x.key === k && !x.nolog))")
                c.ok(len(keys) > 0, f"{g} G{di+1}: esercizi in lista")
                for k in keys:
                    await a.js(f"S.exOpen.add('{k}'); renderLog()"); await a.wait(60)
                    opened = await a.js(f"(() => {{ const b = document.querySelector('.ex[data-ex=\"{k}\"] [data-more]'); if (!b) return null; b.click(); return document.getElementById('isheet').classList.contains('on'); }})()")
                    c.ok(opened is True, f"{g} G{di+1} {k}: Info si apre ({opened})")
                    await a.js("closeSheet()"); await a.wait(240)
        # una seduta di oggi compilata col tastierino
        await a.js("S.gym='PA'; S.day=0; S.date=todayISO(); S.view='log'; render()"); await a.wait(200)
        k = await a.js("dayObj().ex.find(e => !e.nolog).key")
        await a.pg.tap(f"#kg-{k}-0"); await a.wait(300)
        c.ok(await a.js("!document.getElementById('pad').hidden"), "tastierino aperto sui kg")
        for key in ["4", "2", "next", "1", "0"]:
            sel = f"#pad [data-p='{key}'] input" if await a.js(f"!!document.querySelector(\"#pad [data-p='{key}'] input\")") else f"#pad [data-p='{key}']"
            await a.pg.click(sel); await a.wait(120)
        await a.wait(1500)
        c.ok(await a.js(f"(current().ex['{k}']||[])[0]?.kg") == 42, "kg scritti col tastierino")
        c.ok(await a.js(f"(current().ex['{k}']||[])[0]?.reps") == 10, "reps scritte col tastierino")
        # completa il giorno e controlla il recap
        await a.js("""(() => { const s = JSON.parse(JSON.stringify(current())); let t = Date.now() - 3600e3;
          dayObj().ex.forEach(e => { if (e.nolog) { s.circ = s.circ || {}; s.circ[e.circ] = 3; return; } s.ex[e.key] = e.sets.map((x, i) => ({ kg: e.bw ? null : 30, reps: parseInt(x.t) || 10, at: (t += 130000) })); });
          s.t0 = Date.now() - 3600e3; s.t1 = Date.now(); s.updatedAt = Date.now(); D.sessions[s.id] = s; save(); renderLog(); })()"""); await a.wait(300)
        c.ok(await a.js("!!document.querySelector('#list .recap')"), "recap di fine allenamento")
        for v in ["prog", "plan", "more", "cibo", "log"]:
            await a.js(f"S.view='{v}'; render()"); await a.wait(250)
            c.ok(await a.js(f"!document.getElementById('v-{v}').hidden"), f"sezione {v} visibile")
        await a.js("S.view='prog'; render()"); await a.wait(250)
        c.ok(await a.js("!!document.getElementById('bodyCard') || document.querySelector('#v-prog').innerText.includes('Corpo')"), "Progressi: sezione Corpo")
        await a.js("openReport()"); await a.wait(400)
        c.ok(await a.js("document.querySelector('#isheet pre')?.innerText.includes('REPORT')"), "report per il PT")
        await a.js("closeSheet()"); await a.wait(250)
        await a.js("S.view='cibo'; render()"); await a.wait(200)
        for t in ["oggi", "ricette", "scambi", "spesa"]:
            await a.js(f"document.querySelector('#cseg [data-ct=\"{t}\"]').click()"); await a.wait(250)
            c.ok(await a.js("document.getElementById('v-cibo').innerText.length > 200"), f"Cibo · {t}")
        c.done(a.errs)
asyncio.run(main())
