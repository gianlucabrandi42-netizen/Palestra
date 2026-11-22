"""Prove automatiche dell'app (22/11/2026). Avviano un piccolo server sulla cartella del repository e aprono l'app in Chromium
(Playwright). Uso: python3 tests/<prova>.py  — oppure tutte: sh tools/check.sh. Variabile CHROME = percorso di un Chrome già installato."""
import functools, http.server, os, socket, sys, threading
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def serve():
    with socket.socket() as s: s.bind(("127.0.0.1", 0)); port = s.getsockname()[1]
    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    h = functools.partial(Quiet, directory=ROOT)
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", port), h)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{port}/index.html"

class App:
    """Apre l'app con un telefono finto da 390×844 e raccoglie gli errori della pagina."""
    async def __aenter__(self):
        self.p = await async_playwright().start()
        exe = os.environ.get("CHROME") or (os.path.exists("/usr/bin/google-chrome") and "/usr/bin/google-chrome") or None
        self.b = await self.p.chromium.launch(**({"executable_path": exe} if exe else {}))
        self.ctx = await self.b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, has_touch=True, service_workers="block")
        self.pg = await self.ctx.new_page(); self.errs = []
        self.pg.on("pageerror", lambda e: self.errs.append(f"{e}\n{(e.stack or '')[:600]}"))
        await self.pg.add_init_script("if(!sessionStorage.s){localStorage.clear();sessionStorage.s=1}")
        await self.pg.goto(serve()); await self.pg.wait_for_timeout(900)
        return self
    async def __aexit__(self, *a):
        await self.b.close(); await self.p.stop()
    async def js(self, code): return await self.pg.evaluate(code)
    async def wait(self, ms=250): await self.pg.wait_for_timeout(ms)

class Check:
    def __init__(self, name): self.name, self.bad, self.n = name, [], 0
    def ok(self, cond, what):
        self.n += 1
        if not cond: self.bad.append(what)
    def done(self, errs=()):
        failed = len(self.bad)
        for e in errs: self.bad.append("errore nella pagina: " + e)
        print(f"{self.name}: {self.n - failed}/{self.n} ok" + (f" · {len(errs)} errori nella pagina" if errs else ""))
        for b in self.bad: print("  ✗", b)
        sys.exit(1 if self.bad else 0)
