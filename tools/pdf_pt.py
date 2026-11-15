"""Genera il PDF di controllo veloce per il personal trainer dalla scheda attiva in schede.js.

Uso (dalla cartella del repository):
    python3 tools/pdf_pt.py "Scheda_dicembre_2026_per_PT.pdf"

Richiede: Pillow, Node + Playwright (Chromium). Le immagini vengono ridotte a JPEG ~360 px per stare sotto ~1 MB.
Modifica DUBBI qui sotto con le domande da fare al PT per la nuova scheda (lista vuota = nessun riquadro).
Niente spunte né caselle: deve essere un'occhiata veloce.
"""
import html, json, os, subprocess, sys, tempfile
from PIL import Image

DUBBI = [
    # es. "<b>Recupero tra le serie</b>: non indicato nella scheda. Quanto?",
]

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else "Scheda_per_PT.pdf")
src = open(os.path.join(ROOT, "schede.js"), encoding="utf-8").read()
schede = json.loads(src.split("window.SCHEDE = ", 1)[1].strip().rstrip(";"))
attiva = src.split('window.SCHEDA_ATTIVA = "', 1)[1].split('"', 1)[0]
plan = next(p for p in schede if p["id"] == attiva)
e = html.escape
tmp = tempfile.mkdtemp()

def thumb(f):
    im = Image.open(os.path.join(ROOT, "img", f)).convert("RGB"); im.thumbnail((360, 360))
    out = os.path.join(tmp, f.rsplit(".", 1)[0] + ".jpg"); im.save(out, "JPEG", quality=68, optimize=True); return out

def pics(ex):
    l = [f for f in ex.get("img", {}).get("local", []) if "-f" in f][:2] or ex.get("img", {}).get("local", [])[:2]
    return '<div class="pics">' + '<span class="ar">→</span>'.join(f'<img src="file://{thumb(f)}">' for f in l) + "</div>"

def sets_txt(ex):
    t = [s["t"] for s in ex["sets"]]
    return f"{len(t)}×{t[0]}" if len(set(t)) == 1 else "-".join(t)

first_day_keys = {x["key"]: d["id"] for d in plan["days"] for x in d["ex"]}
rows = ""
for d in plan["days"]:
    rows += f'<h2>{e(d["id"])} — {e(d["name"])}</h2><table><thead><tr><th class="n">#</th><th>Esercizio e serie</th><th class="ph">Esecuzione (inizio → fine)</th><th>Consigli che vedo in palestra</th><th>Errori da evitare</th></tr></thead><tbody>'
    rip = []
    for i, ex in enumerate(d["ex"], 1):
        if first_day_keys.get(ex["key"]) != d["id"]:  # esercizio già mostrato in un giorno precedente
            rip.append((i, ex)); continue
        rows += (f'<tr><td class="n">{i}</td><td><b>{e(ex["name"])}</b><div class="s">{e(sets_txt(ex))} · {e(ex.get("tec",""))}</div></td>'
                 f'<td class="ph">{pics(ex)}</td><td><ul>{"".join(f"<li>{e(x)}</li>" for x in ex.get("flash", []))}</ul></td>'
                 f'<td class="err">{" · ".join(e(x) for x in ex.get("errors", []))}</td></tr>')
    if rip:
        rows += f'<tr><td class="n">{rip[0][0]}–{rip[-1][0]}</td><td colspan="4"><b>{e(", ".join(x["name"] for _, x in rip))}</b> — come nel giorno precedente</td></tr>'
    rows += "</tbody></table>"

box = f'<div class="box"><b>{len(DUBBI)} dubbi da confermare</b><ol>' + "".join(f"<li>{x}</li>" for x in DUBBI) + "</ol></div>" if DUBBI else ""
doc = f'''<!doctype html><html lang="it"><head><meta charset="utf-8"><style>
body{{font-family:Arial,Helvetica,sans-serif;font-size:9pt;color:#111;line-height:1.25}}
h1{{font-size:16pt;margin:0}} .sub{{color:#444;margin:3px 0 10px}}
.box{{border:1.5px solid #2350E6;border-radius:6px;padding:8px 10px;margin-bottom:10px;background:#F2F5FE}}
.box b{{color:#2350E6}} .box ol{{margin:4px 0 0;padding-left:18px}}
h2{{font-size:11.5pt;margin:12px 0 4px;color:#2350E6;text-transform:uppercase}}
table{{width:100%;border-collapse:collapse}} tr{{page-break-inside:avoid}}
th{{background:#1F2937;color:#fff;font-size:8.5pt;text-align:left;padding:4px 6px}}
th:nth-child(2){{width:22%}} th.ph{{width:30%}} th:nth-child(4){{width:21%}}
td{{border-bottom:1px solid #D5D9DF;padding:3px 6px;vertical-align:top}}
td.n,th.n{{width:18px;text-align:center;color:#666}}
.s{{color:#444;font-size:8.5pt;margin-top:1px}} ul{{margin:0;padding-left:12px}} .err{{color:#8A1C14;font-size:8.5pt}}
.pics{{display:flex;align-items:center;gap:3px}} .pics img{{width:46%;aspect-ratio:4/3;object-fit:cover;border-radius:3px;border:1px solid #ccc}} .ar{{color:#2350E6;font-weight:700}}
</style></head><body>
<h1>{e(plan["name"])} — controllo rapido</h1>
<div class="sub">Ho messo la scheda in un'app sul telefono. Ti chiedo solo un'occhiata veloce: esercizi, foto e consigli ti sembrano giusti? Se qualcosa non va, basta dirmelo.</div>
{box}{rows}</body></html>'''
page = os.path.join(tmp, "pt.html"); open(page, "w", encoding="utf-8").write(doc)
js = ("const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();"
      f"await p.goto('file://{page}');await p.waitForTimeout(500);await p.pdf({{path:{json.dumps(OUT)},format:'A4',printBackground:true,"
      "margin:{top:'12mm',bottom:'12mm',left:'12mm',right:'12mm'}});await b.close()})()")
subprocess.run(["node", "-e", js], check=True)
print("PDF creato:", OUT)
