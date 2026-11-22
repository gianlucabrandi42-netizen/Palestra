"""Regole dei kg suggeriti, del recupero e dei calcoli (advise, setsTrend, parseRest, need, durWords, isLong…)."""
import asyncio
from common import App, Check

JS = r"""
(() => {
const out = [], ck = (name, got, exp) => out.push({ name, ok: JSON.stringify(got) === JSON.stringify(exp), got, exp });
// ---- parseRest
for (const [i, e] of [["90''", 90], ['90"', 90], ["1'30''", 90], ["2'", 120], ["1:30", 90], ["90", 90], ["75 sec", 75], ["1’30’’", 90], ["45s", 45]]) ck("parseRest " + i, parseRest(i), e);
// ---- advise / suggestKg  (t = 10, step 2.5)
const A = (r, pl, t, st, f, n) => { const a = advise(r, pl, t, st, f ?? 1, n ?? 1); return a && [a.kg, a.reps, a.mode || ""]; };
ck("pulita a target → +1 salto", A({ kg: 40, reps: 10 }, null, 10, 2.5), [42.5, 10, ""]);
ck("oltre target → +1 salto", A({ kg: 40, reps: 12 }, null, 10, 2.5), [42.5, 10, ""]);
ck("pulita sotto target → stesso", A({ kg: 40, reps: 8 }, null, 10, 2.5), [40, 10, ""]);
ck("sporca a target → stesso", A({ kg: 40, reps: 10, dirty: true }, null, 10, 2.5), [40, 10, ""]);
ck("sporca sotto target → un salto giù", A({ kg: 40, reps: 8, dirty: true }, null, 10, 2.5), [37.5, 10, ""]);
ck("al limite a target → stesso", A({ kg: 40, reps: 10, eff: "hard" }, null, 10, 2.5), [40, 10, ""]);
ck("facile 2 volte (n=2) → +2 salti", A({ kg: 40, reps: 10, eff: "easy" }, null, 10, 2.5, 1, 2), [45, 10, ""]);
ck("aiutata → stesso", A({ kg: 40, reps: 10, help: true }, null, 10, 2.5), [40, 10, "help"]);
ck("recupero lungo → stesso", A({ kg: 40, reps: 10, lr: 200 }, null, 10, 2.5), [40, 10, "rest"]);
ck("recupero lungo ma 'non ha influito' → +1", A({ kg: 40, reps: 10, lr: 200, lrOk: true }, null, 10, 2.5), [42.5, 10, ""]);
ck("salto pesante 14→16: +1 rep", A({ kg: 14, reps: 10 }, null, 10, 2), [14, 11, "reps"]);
ck("salto pesante a target+2 → sali", A({ kg: 14, reps: 12 }, null, 10, 2), [16, 10, "jump"]);
ck("peso nuovo <60% → torna indietro con reps", A({ kg: 16, reps: 5 }, { kg: 14, reps: 11 }, 10, 2), [14, 12, "reps"]);
ck("ricostruzione: +1 rep", A({ kg: 40, reps: 10 }, { kg: 42.5, reps: 5 }, 10, 2.5), [40, 11, "reps"]);
ck("ricostruzione a target+2 → riprova il peso di prima", A({ kg: 40, reps: 12 }, { kg: 42.5, reps: 5 }, 10, 2.5), [42.5, 10, "jump"]);
ck("ricostruzione senza salto noto → riprova il peso di prima", A({ kg: 40, reps: 12 }, { kg: 42.5, reps: 5 }, 10, null), [42.5, 10, "jump"]);
ck("stanco −10% a target: niente aumento, giù al salto", A({ kg: 40, reps: 10 }, null, 10, 2.5, 0.9), [35, 10, ""]);
ck("scarico −35%", A({ kg: 40, reps: 10 }, null, 10, 2.5, 0.65), [25, 10, ""]);
ck("senza salto noto: +2,5% min +1 kg", A({ kg: 40, reps: 10 }, null, 10, null), [41, 10, ""]);
ck("senza salto noto, 100 kg: +2,5%", A({ kg: 100, reps: 10 }, null, 10, null), [102.5, 10, ""]);
ck("1 sporca, pulite a target (11 con 1 sporca) → +1", A({ kg: 40, reps: 11, dirty: 1 }, null, 10, 2.5), [42.5, 10, ""]);
ck("1 sporca, 9 pulite → stesso", A({ kg: 40, reps: 10, dirty: 1 }, null, 10, 2.5), [40, 10, ""]);
ck("2 sporche a target → stesso", A({ kg: 40, reps: 10, dirty: 2 }, null, 10, 2.5), [40, 10, ""]);
ck("3+ sporche → giù", A({ kg: 40, reps: 10, dirty: 3 }, null, 10, 2.5), [37.5, 10, ""]);
ck("vecchia sporca (true) a target+1 → +1", A({ kg: 40, reps: 11, dirty: true }, null, 10, 2.5), [42.5, 10, ""]);
const J = (kg, reps, t, dirty) => { const a = document.createElement("input"), b = document.createElement("input"), f = document.createElement("div"); a.value = kg; b.value = reps; judge(a, b, f, t, null, { f: 1, step: 2.5 }, dirty, undefined, null); return f.textContent; };
ck("msg 1 sporca su 11", J("40", "11", 10, 1), "Hai spinto: 10 pulite, prossima volta si sale 🔥");
ck("msg 1 sporca su 10", J("40", "10", 10, 1), "1 sporca, 9 pulite: prossima volta stesso carico");
ck("msg 2 sporche", J("40", "10", 10, 2), "2 sporche: stesso carico, falla più pulita");
ck("msg 3 sporche", J("40", "10", 10, 3), "7 pulite su 10: prossima volta 37,5 kg qui");
ck("record: 1 sporca conta con le pulite", bestSet([{ kg: 50, reps: 9, dirty: 1 }], false).v.toFixed(2), (50 * (1 + 8 / 30)).toFixed(2));
ck("record: 2 sporche non conta", bestSet([{ kg: 50, reps: 9, dirty: 2 }], false), null);
// ---- setsTrend (panca 10-8-8)
const ex = dayObj().ex[0], T = sets => { const r = setsTrend(ex, sets, current()); return r && r.kind; };
ck("piramide 40×10 45×8 45×8", T([{ kg: 40, reps: 10 }, { kg: 45, reps: 8 }, { kg: 45, reps: 8 }]), "pyr");
ck("S1 leggera 30×10 45×8 47,5×8", T([{ kg: 30, reps: 10 }, { kg: 45, reps: 8 }, { kg: 47.5, reps: 8 }]), "light");
ck("NON leggera se la serie forte è sotto target 40×10 50×6 50×6", T([{ kg: 40, reps: 10 }, { kg: 50, reps: 6 }, { kg: 50, reps: 6 }]) !== "light", true);
ck("−2 reps col peso nuovo: NON salita troppo", T([{ kg: 40, reps: 10 }, { kg: 45, reps: 8 }, { kg: 50, reps: 6 }]) !== "climb", true);
ck("−3 reps: salita troppo", T([{ kg: 40, reps: 10 }, { kg: 45, reps: 8 }, { kg: 50, reps: 5 }]), "climb");
ck("stesso peso 40: 10,9,8 tenuta", T([{ kg: 40, reps: 10 }, { kg: 40, reps: 9 }, { kg: 40, reps: 8 }]), "ok");
ck("stesso peso 40: 10,8,6 calo forte", T([{ kg: 40, reps: 10 }, { kg: 40, reps: 8 }, { kg: 40, reps: 6 }]), "drop");
ck("stesso peso 40: 10,8,7 calo medio", T([{ kg: 40, reps: 10 }, { kg: 40, reps: 8 }, { kg: 40, reps: 7 }]), "mid");
// ---- need() scarico
const s0 = { date: todayISO() }, wk = weekStart(todayISO());
ck("need normale", need(ex, s0), 3);
D.prefs.deloads = [wk]; ck("need scarico 3→2", need(ex, s0), 2);
ck("need scarico 4→3", need({ sets: [1, 2, 3, 4] }, s0), 3);
ck("scarico: condition f", condition(s0).f, 0.65);
D.prefs.deloads = [];
// ---- durWords
ck("durWords 34", durWords(34), "34 minuti"); ck("durWords 60", durWords(60), "1 ora"); ck("durWords 72", durWords(72), "1 ora e 12 minuti"); ck("durWords 121", durWords(121), "2 ore e 1 minuto");
// ---- isLong
ck("recupero 2:10 su 1:30 non lungo", isLong(130, 90, false), false); ck("2:20 su 1:30 lungo", isLong(140, 90, false), true); ck("in 2: 2:50 non lungo", isLong(170, 90, true), false); ck("in 2: 3:10 lungo", isLong(190, 90, true), true);
return out;
})()
"""

async def main():
    c = Check("Regole")
    async with App() as a:
        res = await a.js(JS)
        for r in res: c.ok(r["ok"], f'{r["name"]}: ottenuto {r["got"]}, atteso {r["exp"]}')
        c.done(a.errs)
asyncio.run(main())
