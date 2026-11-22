// Test di sistema: i file caricati dalla pagina devono essere nel service worker, "rete prima" e nello script delle versioni
// (guasto del 20/11/2026: cibo.js mancava dall'elenco "rete prima" e il telefono usava il codice vecchio).
T("File della pagina: service worker e versioni", async () => {
  const html = await (await fetch("index.html")).text(), sw = await (await fetch("sw.js")).text(), vs = await (await fetch("tools/versione.sh")).text();
  const files = [...html.matchAll(/(?:src|href)="([^"?]+\.(?:js|css))(?:\?v=([^"]*))?"/g)].filter(m => !/^https?:|vendor\//.test(m[1]));
  const ver = (sw.match(/const VERSION = "([^"]+)"/) || [])[1], FILES = (sw.match(/FILES\s*=\s*\[([\s\S]*?)\]/) || [, ""])[1];
  const net = new RegExp(sw.match(/if \(\/(.+)\/\.test\(url\.pathname\)\)/)[1]);
  for (const [, f, v] of files) {
    check(FILES.includes(`"${f}"`), `${f} manca dall'elenco FILES di sw.js`);
    check(net.test("/Palestra/" + f), `${f} non è "rete prima" in sw.js`);
    check(v === ver, `${f}?v=${v} diverso dalla versione del service worker (${ver}): usa tools/versione.sh`);
    if (/\.js$/.test(f)) check(vs.includes(f.replace(/\.js$/, "")) || (/^js\//.test(f) && vs.includes("js\\/[0-9a-z-]+")), `${f} non è in tools/versione.sh`);
  }
});
T("Nessun segreto nel sito pubblico", async () => {
  const html = await (await fetch("index.html")).text();
  for (const f of ["index.html", ...[...html.matchAll(/src="([^"?]+\.js)/g)].map(m => m[1]).filter(f => !/^https?:/.test(f))]) {
    const s = await (await fetch(f)).text();
    check(!/sk-ant-[a-z0-9-]{10,}|AIza[0-9A-Za-z_-]{30,}/.test(s), `${f}: sembra contenere una chiave API`);
  }
});
T("Registro errori: un errore finisce nella coda, una volta sola con contatore", () => {
  localStorage.removeItem("palestra-err");
  const ev = () => window.dispatchEvent(new ErrorEvent("error", { message: "prova di errore", filename: "https://x/app.js?v=1", lineno: 12, colno: 3 }));
  ev(); ev(); const Q = JSON.parse(localStorage.getItem("palestra-err") || "[]");
  eq(Q.length, 1, "righe"); eq([Q[0].f, Q[0].line, Q[0].n], ["app.js", 12, 2]);
  localStorage.removeItem("palestra-err");
});
