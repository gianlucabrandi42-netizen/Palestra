"""Riquadro "Info ed esecuzione": i pulsanti non lo riportano in cima né ricaricano le foto (22/11/2026);
si chiude trascinando giù dalle foto, dal testo e dalla barretta; di lato sfoglia le foto."""
import asyncio
from common import App, Check

async def main():
    c = Check("Info ed esecuzione")
    async with App() as a:
        await a.js("S.view='log'; S.day=plan().days[0].id; render()"); await a.wait(200)
        k = await a.js("dayObj().ex[3].key")
        await a.js(f"S.exOpen.add('{k}'); renderLog()"); await a.wait(200)
        await a.js(f"document.querySelector('.ex[data-ex=\"{k}\"] [data-more]').click()"); await a.wait(450)
        await a.js("window._imgs=[...document.querySelectorAll('#isheet img')]; document.querySelector('#isheet .is-c').scrollTop=500"); await a.wait(100)
        top0 = await a.js("document.querySelector('#isheet .is-c').scrollTop")
        for sel in ["[data-rest-set='120']", "[data-step='5']"]:
            await a.js(f"document.querySelector(\"#isheet {sel}\").click()"); await a.wait(350)
            c.ok(abs(await a.js("document.querySelector('#isheet .is-c').scrollTop") - top0) < 2, f"{sel}: il riquadro resta dove era")
            c.ok(await a.js("[...document.querySelectorAll('#isheet img')].every(i => _imgs.includes(i))"), f"{sel}: foto non ricaricate")
        cdp = await a.ctx.new_cdp_session(a.pg)
        async def drag(x, y, dx, dy, steps=12):
            await cdp.send("Input.dispatchTouchEvent", {"type": "touchStart", "touchPoints": [{"x": x, "y": y}]})
            for i in range(1, steps + 1):
                await cdp.send("Input.dispatchTouchEvent", {"type": "touchMove", "touchPoints": [{"x": x + dx * i / steps, "y": y + dy * i / steps}]}); await a.wait(16)
            await cdp.send("Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}); await a.wait(400)
        opened = lambda: a.js("document.getElementById('isheet').classList.contains('on')")
        async def reopen(): await a.js(f"closeSheet(); openSheet('{k}')"); await a.wait(450)
        async def ctr(sel): return await a.js(f"(()=>{{const r=document.querySelector('{sel}').getBoundingClientRect();return [r.left+r.width/2,r.top+Math.min(r.height/2,60)]}})()")
        for sel, what in [("#isheet .gallery", "dalle foto"), ("#isheet .exinfo", "dal testo"), ("#isheet .is-top", "dalla barretta")]:
            await reopen(); x, y = await ctr(sel); await drag(x, y, 0, 320)
            c.ok(not await opened(), f"trascinando giù {what} si chiude")
        await reopen(); x, y = await ctr("#isheet .gallery"); await drag(x, y, -200, 10)
        c.ok(await opened(), "di lato sulle foto resta aperto")
        c.done(a.errs)
asyncio.run(main())
