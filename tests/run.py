#!/usr/bin/env python3
"""Test automatici dell'app Palestra.

Apre l'app in Chrome (senza service worker), carica tests/lib.js e i file tests/*.test.js e li esegue.
Poi fa il giro di tutte le schermate con dati finti e controlla che non compaiano errori.
Uso: python3 tests/run.py  (esce con codice 1 se qualcosa non va); parte anche con sh tools/check.sh insieme alle altre prove.
Serve: pip install playwright  (usa Chrome di sistema: variabile CHROME o /usr/bin/google-chrome)
"""
import functools, glob, http.server, json, os, socket, sys, threading

from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def serve():
    class Q(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    s = socket.socket(); s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]; s.close()
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(Q, directory=ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return port


def chrome():
    for p in [os.environ.get("CHROME"), "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium"]:
        if p and os.path.exists(p):
            return p
    return None


IGN = ("fonts.g", "ERR_", "Failed to load resource", "workers.dev", "net::")


def page(b, url, errs):
    ctx = b.new_context(viewport={"width": 390, "height": 844}, service_workers="block", locale="it-IT", timezone_id="Europe/Rome")
    # niente rete esterna durante i test (servizio notifiche/IA, font): risposte vuote
    ctx.route("**/*", lambda r: r.continue_() if r.request.url.startswith(url.rsplit("/", 1)[0]) else r.fulfill(status=503, body=""))
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errs.append("ERRORE: " + str(e).split("\n")[0]))
    pg.on("console", lambda m: errs.append("console.error: " + m.text) if m.type == "error" and not any(x in m.text for x in IGN) else None)
    pg.goto(url); pg.wait_for_timeout(900)
    return ctx, pg


# giro delle schermate: (nome, codice da eseguire nella pagina)
TOUR = [
    ("Allenamento", "document.querySelector('[data-view=log]').click()"),
    ("Allenamento G2", "S.day='G2'; render()"),
    ("Allenamento G3 Sparta", "S.gym='PB'; S.day='G3'; render()"),
    ("Info ed esecuzione", "const b=document.querySelector('.infobtn'); b&&b.click()"),
    ("Progressi", "closeSheet&&closeSheet(); document.querySelector('[data-view=prog]').click()"),
    ("Report per il PT", "typeof openReport==='function'&&openReport()"),
    ("Punto della settimana", "openReview()"),
    ("Scheda", "document.querySelector('[data-view=plan]').click()"),
    ("Cibo · Oggi", "document.querySelector('[data-view=cibo]').click()"),
    ("Cibo · Ricette", "const b=[...document.querySelectorAll('#cseg button')][1]; b&&b.click()"),
    ("Cibo · Scambi", "const b=[...document.querySelectorAll('#cseg button')][2]; b&&b.click()"),
    ("Cibo · Spesa", "const b=[...document.querySelectorAll('#cseg button')][3]; b&&b.click()"),
    ("Impostazioni", "document.querySelector('[data-view=more]').click()"),
]


def main():
    port = serve(); url = f"http://127.0.0.1:{port}/index.html"
    tests = sorted(glob.glob(os.path.join(ROOT, "tests", "*.test.js")))
    bad = 0; out = []
    with sync_playwright() as p:
        ex = chrome()
        b = p.chromium.launch(executable_path=ex, args=["--no-sandbox"]) if ex else p.chromium.launch()
        # 1. test delle regole, un file alla volta su una pagina pulita
        for f in tests:
            errs = []; ctx, pg = page(b, url, errs)
            # in un blocco { }: i nomi dei test (T, ok, eq…) non si scontrano con quelli dell'app
            src = open(os.path.join(ROOT, "tests", "lib.js")).read() + "\n" + open(f).read()
            pg.add_script_tag(content="{\n" + src + "\n}")
            res = pg.evaluate("__run()")
            out.append(f"\n== {os.path.basename(f)}")
            for r in res:
                out.append(("  ✓ " if r["ok"] else "  ✗ ") + r["n"] + ("" if r["ok"] else "\n      " + r["e"].replace("\n", "\n      ")))
                bad += 0 if r["ok"] else 1
            for e in errs:
                out.append("  ✗ " + e); bad += 1
            ctx.close()
        # 2. giro delle schermate, prima senza dati e poi con 5 settimane di dati finti
        for label, seed in (("senza dati", False), ("con dati finti", True)):
            errs = []; ctx, pg = page(b, url, errs)
            if seed:
                pg.add_script_tag(content="{\n" + open(os.path.join(ROOT, "tests", "lib.js")).read() + "\n}"); pg.evaluate("__seed()")
                pg.reload(); pg.wait_for_timeout(900)
            out.append(f"\n== giro delle schermate ({label})")
            for name, js in TOUR:
                n0 = len(errs)
                try:
                    pg.evaluate("() => { " + js + " }"); pg.wait_for_timeout(250)
                except Exception as e:
                    errs.append("ERRORE: " + str(e).split("\n")[0])
                new = errs[n0:]
                out.append(("  ✓ " if not new else "  ✗ ") + name + ("" if not new else "\n      " + "\n      ".join(new)))
                bad += 1 if new else 0
            ctx.close()
        b.close()
    print("\n".join(out))
    print(f"\n{'TUTTO OK' if not bad else str(bad) + ' PROBLEMI'}")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
