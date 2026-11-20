/* Palestra — sezione CIBO (20/11/2026). Contenuti in nutrizione.js (window.CIBO).
   Gioco leggero: tocchi la casella di cosa hai mangiato, il piatto del giorno si colora. Niente grammi da scrivere,
   niente punteggi, niente rosso, niente serie di giorni (regole anti-ossessione dell'utente).
   Dati: D.food = { days: { "AAAA-MM-GG": { m: { col: "B", s1: "skip", pr: "pollo", ... }, gym: true|false, x: [cibi extra], cel, at } },
                    pics: { idRicetta: JPEG }, shop: { voce: 1 }, week: { lunedì: { fame, energia, sonno } } } — nel backup.
   Disegni: tutti generati qui (originali); le foto vere sono solo quelle scattate dall'utente. */
"use strict";
const CB = window.CIBO;
const FOOD = () => (D.food = D.food || { days: {}, pics: {}, shop: {}, week: {} }, D.food.days = D.food.days || {}, D.food.pics = D.food.pics || {}, D.food.shop = D.food.shop || {}, D.food.week = D.food.week || {}, D.food);
const CS = { tab: "oggi", day: null, rf: "all", q: "", xform: null, recipe: null };
const recipeById = id => CB.recipes.find(r => r.id === id);
const mainRecipes = () => CB.recipes.filter(r => r.main);
const mealDef = id => CB.meals.find(m => m.id === id);
const cDay = () => CS.day || todayISO();
const fDay = d => FOOD().days[d] || { m: {} };
function setFDay(d, fn) { const f = FOOD(); const x = JSON.parse(JSON.stringify(f.days[d] || { m: {} })); x.m = x.m || {}; fn(x); x.at = Date.now(); f.days[d] = x; save(); }
const gymAuto = d => Object.values(D.sessions).some(s => s.date === d && hasData(s));
const isGym = d => { const g = fDay(d).gym; return g === true || g === false ? g : gymAuto(d); };
// scala 80/40/0 del PT adattata: palestra oggi = 80, palestra ieri = 40, altrimenti 0
const lunchLvl = d => isGym(d) ? 80 : isGym(addDays(d, -1)) ? 40 : 0;
const optsFor = (m, d) => m.main ? [...mainRecipes().map(r => ({ id: r.id, t: r.s || r.name, d: r.one ? r.p1 : `Pasto 1: ${r.p1} · Pasto 2: ${r.p2}`, p: r.p, r: r.id, box: r.box, go: r.go, porta: r.porta })), ...CB.mainExtra.filter(e => !e.only || e.only === m.id)] : (m.gym && isGym(d) ? m.gym : m.opts);
const shiftOf = d => CB.shifts.find(x => x.id === fDay(d).turno) || null;
const whereOf = (d, mid) => { const sh = shiftOf(d); return sh ? sh.where[mid] || "casa" : "casa"; };
const fits = (o, w) => w === "zero" ? !o.go || o.go === "p" : w === "micro" ? !o.go || o.go !== "c" : true;
const WHERE = { zero: "🎒 al lavoro · niente attrezzi", micro: "🎒 al lavoro · solo microonde", mensa: "🍽 in mensa", casa: "" };
const optOf = (m, id, d) => optsFor(m, d).find(o => o.id === id) || (m.gym || []).concat(m.opts || []).find(o => o.id === id) || null;

// ---------- disegni dei piatti e dei passaggi (SVG generati, nessuna foto da internet) ----------
function rng(seed) { let h = 2166136261; for (const c of String(seed)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// [quanti pezzi, raggio minimo libero, funzione che disegna un pezzo in x,y]
const FD = {
  sugo: [1, 0, (x, y, r) => `<path d="M${x - 15},${y} q2,-13 15,-14 q14,1 15,12 q0,13 -15,14 q-15,0 -15,-12z" fill="#C0392B" opacity=".88"/>`],
  yogurt: [1, 0, (x, y) => `<circle cx="${x}" cy="${y}" r="17" fill="#FCFBF7"/><path d="M${x - 9},${y - 3} q9,-7 18,0 q-9,8 -18,0" fill="none" stroke="#E7E1D3" stroke-width="1.4"/>`],
  riso: [70, 0, (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="1.9" ry=".95" transform="rotate(${r() * 180} ${x} ${y})" fill="#FFFDF7" stroke="#D3C9B6" stroke-width=".35"/>`],
  cous: [90, 0, (x, y) => `<circle cx="${x}" cy="${y}" r="1" fill="${["#E9C980", "#DDB866", "#F0D597"][Math.floor(x * 7) % 3]}"/>`],
  farro: [55, 0, (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="1.9" ry="1.15" transform="rotate(${r() * 180} ${x} ${y})" fill="#B88B52" stroke="#8C6634" stroke-width=".3"/>`],
  pasta: [16, 2, (x, y, r) => { const a = r() * 180; return `<g transform="rotate(${a} ${x} ${y})"><rect x="${x - 4}" y="${y - 1.5}" width="8" height="3" rx="1.2" fill="#EDC46B" stroke="#C4943A" stroke-width=".4"/><path d="M${x - 2},${y - 1.5}v3M${x},${y - 1.5}v3M${x + 2},${y - 1.5}v3" stroke="#D5A84D" stroke-width=".35"/></g>`; }],
  patate: [11, 3, (x, y, r, c) => `<rect x="${x - 3.4}" y="${y - 3.4}" width="6.8" height="6.8" rx="1.8" transform="rotate(${r() * 90} ${x} ${y})" fill="${c || "#EDC86E"}" stroke="${c ? "#C2621E" : "#C59A3E"}" stroke-width=".55"/>`],
  pdolci: [11, 3, (x, y, r) => FD.patate[2](x, y, r, "#EE8B3E")],
  pane: [2, 7, (x, y, r) => `<g transform="rotate(${(r() - .5) * 40} ${x} ${y})"><path d="M${x - 8},${y + 7} v-9 q0,-6 8,-6 q8,0 8,6 v9z" fill="#E6B877" stroke="#A86A2E" stroke-width="1.5"/><path d="M${x - 4},${y - 1}h2M${x + 1},${y + 2}h2M${x - 3},${y + 4}h1.5" stroke="#C99252" stroke-width=".7"/></g>`],
  piadina: [1, 10, (x, y) => `<path d="M${x - 17},${y + 4} a17,17 0 0 1 34,0z" fill="#EFD9A2" stroke="#C9A866" stroke-width="1"/><circle cx="${x - 6}" cy="${y - 4}" r="1.3" fill="#C6964B"/><circle cx="${x + 5}" cy="${y - 7}" r="1.1" fill="#C6964B"/><circle cx="${x + 9}" cy="${y}" r="1.2" fill="#C6964B"/>`],
  pollo: [9, 3, (x, y, r) => { const a = r() * 180; return `<g transform="rotate(${a} ${x} ${y})"><rect x="${x - 4}" y="${y - 2.9}" width="8" height="5.8" rx="2.3" fill="#DBA569" stroke="#A86E36" stroke-width=".55"/><path d="M${x - 2.4},${y - 2.6}l1.4,5.2M${x + .6},${y - 2.6}l1.4,5.2" stroke="#9C6029" stroke-width=".8" opacity=".75"/></g>`; }],
  manzo: [9, 3, (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="6.3" ry="1.9" transform="rotate(${r() * 180} ${x} ${y})" fill="#8A4A2E" stroke="#5B2E1B" stroke-width=".5"/>`],
  polpette: [7, 3.5, (x, y) => `<circle cx="${x}" cy="${y}" r="3.9" fill="#7C4027" stroke="#4E2716" stroke-width=".5"/><circle cx="${x - 1.3}" cy="${y - 1.4}" r="1" fill="#A8664A"/>`],
  pesce: [2, 9, (x, y, r) => `<g transform="rotate(${(r() - .5) * 60} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="12.5" ry="5.8" fill="#F6F1E6" stroke="#D2C5AE" stroke-width=".7"/><path d="M${x - 6},${y - 4.5}q2,4.5 0,9M${x},${y - 5.5}q2,5.5 0,11M${x + 6},${y - 4.5}q2,4.5 0,9" fill="none" stroke="#E0D3BC" stroke-width=".7"/></g>`],
  salmone: [1, 10, (x, y, r) => `<g transform="rotate(${(r() - .5) * 40} ${x} ${y})"><rect x="${x - 10}" y="${y - 6.5}" width="20" height="13" rx="3.5" fill="#F0875A" stroke="#C25F37" stroke-width=".7"/><path d="M${x - 6},${y - 6}l-3,12M${x - 1},${y - 6.5}l-3,13M${x + 4},${y - 6.5}l-3,13M${x + 9},${y - 5}l-2.5,10" stroke="#F9C2A2" stroke-width="1"/></g>`],
  gamberi: [8, 3.5, (x, y, r) => { const a = r() * 360; return `<g transform="rotate(${a} ${x} ${y})"><path d="M${x - 3},${y + 2} a3.6,3.6 0 1 1 6,-1.5" fill="none" stroke="#F2834F" stroke-width="2.8" stroke-linecap="round"/><path d="M${x + 3},${y - 1.5} l2.4,1.2 l-.4,-2.6z" fill="#E5673A"/></g>`; }],
  tonno: [14, 2, (x, y, r) => `<path d="M${x - 2.4},${y - 1} l2,-1.8 l2.6,1 l.2,2.3 l-2.5,1.4 l-2.4,-.8z" transform="rotate(${r() * 180} ${x} ${y})" fill="#C9A27A" stroke="#A67F57" stroke-width=".4"/>`],
  uova: [3, 5, (x, y, r) => `<g transform="rotate(${r() * 180} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="5.4" ry="4.2" fill="#FFFFFF" stroke="#D9D4CA" stroke-width=".6"/><circle cx="${x}" cy="${y}" r="2.3" fill="#F5B921"/></g>`],
  frittata: [1, 0, (x, y) => `<circle cx="${x}" cy="${y}" r="19" fill="#F2C94C" stroke="#D3A527" stroke-width="1"/><path d="M${x},${y}L${x + 19},${y}" stroke="#D3A527" stroke-width=".8"/><circle cx="${x - 7}" cy="${y - 6}" r="1.8" fill="#3D8B3D"/><circle cx="${x + 5}" cy="${y + 8}" r="1.6" fill="#3D8B3D"/><circle cx="${x - 9}" cy="${y + 6}" r="1.4" fill="#C0392B"/><circle cx="${x + 9}" cy="${y - 8}" r="1.5" fill="#3D8B3D"/>`],
  ceci: [20, 2, (x, y) => `<circle cx="${x}" cy="${y}" r="2.1" fill="#E3C48E" stroke="#B79560" stroke-width=".45"/>`],
  mozzarella: [8, 3, (x, y, r) => `<rect x="${x - 2.4}" y="${y - 2.4}" width="4.8" height="4.8" rx="1.3" transform="rotate(${r() * 90} ${x} ${y})" fill="#FFFFFF" stroke="#DADADA" stroke-width=".5"/>`],
  bresaola: [4, 6, (x, y) => `<circle cx="${x}" cy="${y}" r="6.2" fill="#8E2B2B" stroke="#651B1B" stroke-width=".6"/><path d="M${x - 4},${y + 2} q4,2 8,-1" fill="none" stroke="#C97A7A" stroke-width=".8"/>`],
  verdure: [11, 3, (x, y, r) => { const c = [["#5BAA4A", "#3C7C2E"], ["#D9534F", "#A33532"], ["#F2C14E", "#C79524"]][Math.floor(r() * 3)]; return `<g transform="rotate(${r() * 180} ${x} ${y})"><rect x="${x - 4.5}" y="${y - 1.7}" width="9" height="3.4" rx="1.5" fill="${c[0]}" stroke="${c[1]}" stroke-width=".4"/><path d="M${x - 2},${y - 1.6}v3.2M${x + 1.5},${y - 1.6}v3.2" stroke="${c[1]}" stroke-width=".7"/></g>`; }],
  spinaci: [10, 3, (x, y, r) => `<ellipse cx="${x}" cy="${y}" rx="3.8" ry="2.6" transform="rotate(${r() * 180} ${x} ${y})" fill="#2F7D32" stroke="#1E5A22" stroke-width=".4"/>`],
  rucola: [11, 3, (x, y, r) => `<path d="M${x - 4.5},${y} l1.5,-1.6 l1,1 l1.2,-1.8 l1,1.2 l1.3,-1.4 l1.4,1.4 l-1,1.6 l-6.4,.6z" transform="rotate(${r() * 360} ${x} ${y})" fill="#5E9E3E" stroke="#3F7426" stroke-width=".35"/>`],
  insalata: [8, 4, (x, y, r) => `<g transform="rotate(${r() * 180} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="5.4" ry="3.2" fill="#8CC152" stroke="#6A9F38" stroke-width=".5"/><path d="M${x - 4.5},${y}h9" stroke="#C6E59A" stroke-width=".6"/></g>`],
  pomodorini: [6, 3.5, (x, y) => `<circle cx="${x}" cy="${y}" r="3.4" fill="#E2453C" stroke="#A82A23" stroke-width=".5"/><circle cx="${x - 1.1}" cy="${y - 1.2}" r=".9" fill="#F5A79F"/>`],
  cornflakes: [17, 2.5, (x, y, r) => `<path d="M${x - 2.8},${y} l1.2,-2.4 l3,-.4 l1.6,2.2 l-1.4,2.4 l-3,.2z" transform="rotate(${r() * 360} ${x} ${y})" fill="#F0B848" stroke="#C88A22" stroke-width=".4"/>`],
  gallette: [2, 8, (x, y) => `<circle cx="${x}" cy="${y}" r="8.2" fill="#F1E2BE" stroke="#CDB68A" stroke-width=".9"/><circle cx="${x - 3}" cy="${y - 2}" r=".8" fill="#CDB68A"/><circle cx="${x + 2.5}" cy="${y - 3}" r=".8" fill="#CDB68A"/><circle cx="${x}" cy="${y + 2.5}" r=".8" fill="#CDB68A"/><circle cx="${x + 4}" cy="${y + 2}" r=".8" fill="#CDB68A"/>`],
  noci: [3, 3.5, (x, y) => `<path d="M${x - 3.6},${y} q0,-3.4 3.6,-3.4 q3.6,0 3.6,3.4 q0,3.4 -3.6,3.4 q-3.6,0 -3.6,-3.4z" fill="#A9703D" stroke="#6E4422" stroke-width=".6"/><path d="M${x},${y - 3.2}v6.4M${x - 2.3},${y - 1.5}q1.2,1.5 0,3M${x + 2.3},${y - 1.5}q-1.2,1.5 0,3" stroke="#6E4422" stroke-width=".5" fill="none"/>`],
  fiocchi: [24, 1.5, (x, y) => `<circle cx="${x}" cy="${y}" r="1.7" fill="#FFFFFF" stroke="#E2E2E2" stroke-width=".35"/>`],
  shaker: [1, 8, (x, y) => `<rect x="${x - 6}" y="${y - 12}" width="12" height="24" rx="3" fill="#6D95FF" opacity=".9"/><rect x="${x - 6.6}" y="${y - 14.5}" width="13.2" height="5" rx="1.5" fill="#3B4A63"/><rect x="${x - 4}" y="${y - 5}" width="8" height="12" rx="1.5" fill="#E9EEF7" opacity=".85"/>`],
  torta: [1, 10, (x, y) => `<path d="M${x - 13},${y + 3} q0,-15 13,-15 q13,0 13,15z" fill="#8B5A2B" stroke="#5E3B1B" stroke-width=".8"/><circle cx="${x - 5}" cy="${y - 5}" r="1.3" fill="#B07A45"/><circle cx="${x + 4}" cy="${y - 7}" r="1.1" fill="#B07A45"/><rect x="${x - 14}" y="${y + 2}" width="28" height="9" rx="2" fill="#E9EEF2" stroke="#B8C3CC" stroke-width=".7"/>`],
  toast: [2, 7, (x, y, r) => `<g transform="rotate(${(r() - .5) * 40} ${x} ${y})"><rect x="${x - 8}" y="${y - 6.5}" width="16" height="13" rx="3" fill="#D9A15A" stroke="#8E5A26" stroke-width="1.2"/><path d="M${x - 6},${y - 3} q3,-2 6,0 q3,2 5,-1 M${x - 5},${y + 2} q4,2 8,0" fill="none" stroke="#F4C542" stroke-width="2.2" stroke-linecap="round"/><circle cx="${x + 3}" cy="${y + 3.5}" r="1.4" fill="#C0392B" opacity=".7"/></g>`],
  pancake: [1, 10, (x, y) => [5, 1, -3].map(d => `<ellipse cx="${x}" cy="${y + d}" rx="15" ry="6" fill="#DDA157" stroke="#93602A" stroke-width=".8"/>`).join("") + `<ellipse cx="${x}" cy="${y - 3}" rx="12" ry="4" fill="#E9B46A"/><path d="M${x - 5},${y - 4} q5,-5 10,0 q-5,3 -10,0" fill="#FBF8F1"/><circle cx="${x - 1}" cy="${y - 4.5}" r=".8" fill="#6B3E1E"/><circle cx="${x + 2}" cy="${y - 3.8}" r=".7" fill="#6B3E1E"/>`],
  pizzetta: [2, 8, (x, y) => `<circle cx="${x}" cy="${y}" r="8.4" fill="#F1E2BE" stroke="#CDB68A" stroke-width=".9"/><circle cx="${x}" cy="${y}" r="6.2" fill="#C8412F"/><circle cx="${x - 2}" cy="${y - 1.5}" r="1.8" fill="#FFFDF5"/><circle cx="${x + 2.4}" cy="${y + 1}" r="1.7" fill="#FFFDF5"/><circle cx="${x - .5}" cy="${y + 3}" r="1.5" fill="#FFFDF5"/><circle cx="${x + 2}" cy="${y - 3}" r=".9" fill="#4E8F31"/>`],
  gnocchi: [14, 2.5, (x, y, r) => `<g transform="rotate(${r() * 180} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="3.4" ry="2.4" fill="${r() < .5 ? "#E8C47A" : "#F1DCA0"}" stroke="#C49A4C" stroke-width=".45"/><path d="M${x - 1.6},${y - 2}v4M${x},${y - 2.3}v4.6M${x + 1.6},${y - 2}v4" stroke="#C49A4C" stroke-width=".35"/></g>`],
  cotoletta: [2, 8, (x, y, r) => `<g transform="rotate(${(r() - .5) * 60} ${x} ${y})"><path d="M${x - 12},${y} q1,-7 10,-7 q11,0 13,5 q2,8 -9,9 q-13,1 -14,-7z" fill="#D99A3E" stroke="#9C6420" stroke-width=".9"/>${[[-6, -2], [-1, 2], [4, -3], [7, 2], [-3, -5], [1, -1]].map(([a, b]) => `<circle cx="${x + a}" cy="${y + b}" r=".9" fill="#F3C978"/>`).join("")}</g>`],
  strapazzate: [9, 3, (x, y, r) => `<path d="M${x - 3.4},${y} q.5,-3 3.4,-2.8 q3.2,.3 3,2.9 q-.6,3 -3.2,2.7 q-3.2,-.2 -3.2,-2.8z" transform="rotate(${r() * 180} ${x} ${y})" fill="#F6CF4E" stroke="#D8A825" stroke-width=".45"/>`],
  piselli: [16, 1.5, (x, y, r) => r() < .7 ? `<circle cx="${x}" cy="${y}" r="1.7" fill="#6DB33F" stroke="#4A8A28" stroke-width=".35"/>` : `<rect x="${x - 1.5}" y="${y - 1.5}" width="3" height="3" rx=".6" fill="#F08A2C"/>`],
  pizza: [1, 0, (x, y) => `<circle cx="${x}" cy="${y}" r="27" fill="#E9C98A" stroke="#B98B44" stroke-width="1.2"/><circle cx="${x}" cy="${y}" r="22" fill="#C8412F"/>${[[-9, -7], [7, -10], [11, 5], [-4, 9], [-12, 4], [2, 0], [5, 12]].map(([a, b]) => `<ellipse cx="${x + a}" cy="${y + b}" rx="3.6" ry="3" fill="#FFFDF5"/>`).join("")}${[[-2, -12], [-8, 13], [12, -3], [0, 7], [-14, -4]].map(([a, b], i) => `<path d="M${x + a - 2.5},${y + b} l1,-1.2 l.8,.8 l1,-1.3 l.9,1 l1.1,-1 l1,1 -1,1.2z" transform="rotate(${i * 70} ${x + a} ${y + b})" fill="#4E8F31"/>`).join("")}`],
  proteine: [1, 6, (x, y) => `<path d="M${x - 8},${y + 4} q8,-12 16,0z" fill="#EFE6D2" stroke="#CFC3A8" stroke-width=".6"/>`],
};
const ORDER = ["pizza", "sugo", "yogurt", "frittata", "pancake", "piadina", "pesce", "salmone", "cotoletta", "gallette", "pane", "toast", "bresaola", "torta", "shaker"];
// sparge gli ingredienti in un cerchio (cx, cy, R): uno spicchio per ingrediente
function scatter(parts, cx, cy, R, k, seed) {
  const r = rng(seed + parts.join()), ps = parts.filter(p => FD[p]), n = ps.length || 1, out = [];
  const oi = p => { const k = ORDER.indexOf(p); return k < 0 ? 99 : k; };
  const sorted = ps.map((p, i) => ({ p, i })).sort((a, b) => oi(a.p) - oi(b.p));
  for (const { p, i } of sorted) {
    const [cnt, pad, draw] = FD[p], a0 = i / n * 2 * Math.PI - Math.PI / 2, a1 = (i + 1) / n * 2 * Math.PI - Math.PI / 2;
    const many = cnt === 1 ? 1 : Math.max(1, Math.round(cnt * (n === 1 ? 1.4 : 1) * k * k));
    for (let j = 0; j < many; j++) {
      const big = cnt <= 2, ang = n === 1 && big ? (j / many) * 2 * Math.PI : a0 + (a1 - a0) * (.15 + .7 * r());
      const rad = big && n === 1 && many === 1 ? 0 : Math.max(0, (R - pad * k) * (big ? .5 : Math.sqrt(.12 + .88 * r())));
      const x = +(cx + Math.cos(ang) * rad).toFixed(1), y = +(cy + Math.sin(ang) * rad).toFixed(1);
      const g = draw(x, y, r);
      out.push(k === 1 ? g : `<g transform="translate(${(x * (1 - k)).toFixed(2)} ${(y * (1 - k)).toFixed(2)}) scale(${k})">${g}</g>`);
    }
  }
  return out.join("");
}
function dishSVG(parts, box, seed, cls) {
  parts = parts || []; let bg = "", fg = "", cx = 50, cy = 50, R = 30;
  if (box === "ciotola") { bg = `<circle cx="50" cy="50" r="46" fill="#C9DCE8"/><circle cx="50" cy="50" r="39" fill="#F6F2EA" stroke="#A9C1D1" stroke-width="1.2"/>`; R = 26; }
  else if (box === "vetro") { bg = `<rect x="7" y="16" width="86" height="68" rx="12" fill="#DDEBF3" opacity=".35" stroke="#A9C6D8" stroke-width="2"/><rect x="12" y="21" width="76" height="58" rx="9" fill="#F3EFE6"/>`; R = 24; }
  else if (box === "tazza") { // tazza vista di lato con la torta, il resto accanto
    const rest = parts.filter(p => p !== "torta");
    bg = `<path d="M16,40 h44 v34 q0,12 -12,12 h-20 q-12,0 -12,-12z" fill="#E9EEF2" stroke="#9FB0BE" stroke-width="1.4"/><path d="M60,48 q12,0 12,10 q0,10 -12,10" fill="none" stroke="#9FB0BE" stroke-width="4"/><path d="M16,41 q0,-17 22,-17 q22,0 22,17z" fill="#8B5A2B" stroke="#5E3B1B" stroke-width="1"/><circle cx="31" cy="32" r="1.6" fill="#B07A45"/><circle cx="43" cy="29" r="1.4" fill="#B07A45"/><circle cx="50" cy="35" r="1.3" fill="#B07A45"/>`;
    fg = rest.length ? scatter(rest, 82, 78, 11, .62, seed) : ""; return wrapSVG(bg + fg, cls);
  }
  else if (box === "bicchiere") { bg = FD.shaker[2](50, 52) ; return wrapSVG(bg, cls); }
  else bg = `<circle cx="50" cy="50" r="47" fill="#E7DFD2"/><circle cx="50" cy="50" r="39" fill="#F7F3EC" stroke="#D8CCB8" stroke-width=".9"/>`;
  fg = scatter(parts, cx, cy, R, box === "ciotola" ? 1.2 : box === "vetro" ? 1.15 : 1.3, seed || "x");
  return wrapSVG(bg + fg, cls);
}
const wrapSVG = (inner, cls) => `<svg class="${cls || "dish"}" viewBox="0 0 100 100" aria-hidden="true">${inner}</svg>`;
// strumenti dei passaggi, con dentro gli ingredienti
function toolSVG(tool, parts, seed) {
  let s = "", f = "";
  const P = (cx, cy, R, k) => scatter(parts || [], cx, cy, R, k * 1.45, seed);
  switch (tool) {
    case "friggitrice": s = `<rect x="10" y="12" width="80" height="78" rx="16" fill="#2B323C" stroke="#56616F" stroke-width="2"/><rect x="20" y="22" width="60" height="58" rx="9" fill="#F3EEE4"/><rect x="20" y="22" width="60" height="58" rx="9" fill="none" stroke="#C9BFAD" stroke-dasharray="1.5 3" stroke-width="1.2"/>`; f = P(50, 51, 21, .8); break;
    case "padella": s = `<rect x="78" y="45" width="22" height="9" rx="4" fill="#2B323C"/><circle cx="44" cy="50" r="38" fill="#2B323C" stroke="#56616F" stroke-width="2"/><circle cx="44" cy="50" r="31" fill="#3A424D"/>`; f = P(44, 50, 22, .85); break;
    case "pentola": s = `<rect x="2" y="44" width="12" height="11" rx="3" fill="#7D8995"/><rect x="86" y="44" width="12" height="11" rx="3" fill="#7D8995"/><circle cx="50" cy="50" r="38" fill="#9AA5B1"/><circle cx="50" cy="50" r="33" fill="#6F9CC4" opacity=".75"/>`; f = P(50, 50, 22, .85); break;
    case "ciotola": s = `<circle cx="50" cy="50" r="42" fill="#C9DCE8"/><circle cx="50" cy="50" r="35" fill="#F6F2EA" stroke="#A9C1D1" stroke-width="1.2"/>`; f = P(50, 50, 23, .85); break;
    case "microonde": s = `<rect x="6" y="18" width="88" height="64" rx="8" fill="#2B323C" stroke="#56616F" stroke-width="2"/><rect x="13" y="25" width="56" height="50" rx="5" fill="#E9DDB8" opacity=".9"/><circle cx="82" cy="34" r="4" fill="#8A96A4"/><circle cx="82" cy="47" r="4" fill="#8A96A4"/><rect x="77" y="58" width="10" height="10" rx="2" fill="#6D95FF"/>`; f = P(41, 51, 17, .62); break;
    case "contenitore": s = `<rect x="7" y="16" width="86" height="68" rx="12" fill="#DDEBF3" opacity=".35" stroke="#A9C6D8" stroke-width="2"/><rect x="12" y="21" width="76" height="58" rx="9" fill="#F3EFE6"/>`; f = P(50, 50, 22, .82); break;
    case "bollitore": s = `<path d="M24,84 h44 q6,0 6,-6 l-4,-40 q-1,-8 -9,-8 h-30 q-8,0 -9,8 l-4,40 q0,6 6,6z" fill="#56616F"/><path d="M70,40 q14,2 16,-12" fill="none" stroke="#56616F" stroke-width="5" stroke-linecap="round"/><rect x="36" y="22" width="20" height="8" rx="3" fill="#2B323C"/><path d="M80,16 q4,-5 0,-10M88,18 q4,-5 0,-10" stroke="#A9C6D8" stroke-width="2" fill="none" stroke-linecap="round"/>`; break;
    case "cuociriso": s = `<rect x="16" y="34" width="68" height="52" rx="16" fill="#E9EEF2" stroke="#9FB0BE" stroke-width="2"/><path d="M16,42 q34,-26 68,0z" fill="#CBD5DD" stroke="#9FB0BE" stroke-width="2"/><rect x="44" y="20" width="12" height="7" rx="3" fill="#56616F"/><rect x="40" y="58" width="20" height="10" rx="3" fill="#2B323C"/><circle cx="50" cy="63" r="2" fill="#7FD6AA"/>`; break;
    case "tagliere": s = `<rect x="8" y="22" width="74" height="60" rx="10" fill="#C99A62" stroke="#9B7041" stroke-width="2"/><circle cx="74" cy="30" r="3" fill="#9B7041"/><path d="M86,20 l8,-8 l3,3 l-26,40 l-4,-3z" fill="#B8C3CC" stroke="#7D8995"/>`; f = P(42, 54, 20, .85); break;
    default: return dishSVG(parts, "piatto", seed, "tool");
  }
  return wrapSVG(s + f, "tool");
}
const TOOLN = { friggitrice: "Friggitrice ad aria", padella: "Padella", pentola: "Pentola", ciotola: "Ciotola", microonde: "Microonde", contenitore: "Contenitore", bollitore: "Bollitore", cuociriso: "Cuociriso", tagliere: "Tagliere", piatto: "Nel piatto" };

// ---------- piatto del giorno (5 spicchi che si colorano) ----------
const RING = ["col", "s1", "pr", "s2", "ce"];
function plateSVG(d, size) {
  const day = fDay(d), m = day.m || {}, n = RING.length, R = 46, r0 = 22;
  const arc = (i, rr) => { const a0 = (i / n) * 2 * Math.PI - Math.PI / 2 + .035, a1 = ((i + 1) / n) * 2 * Math.PI - Math.PI / 2 - .035, p = (a, q) => `${(50 + Math.cos(a) * q).toFixed(2)},${(50 + Math.sin(a) * q).toFixed(2)}`;
    return `M${p(a0, rr)} A${rr},${rr} 0 0 1 ${p(a1, rr)} L${p(a1, r0)} A${r0},${r0} 0 0 0 ${p(a0, r0)}Z`; };
  const seg = RING.map((id, i) => { const v = m[id], md = mealDef(id), st = v === "skip" ? "skip" : v ? "on" : "";
    return `<path class="pseg ${st}" style="--c:${md.color}" d="${arc(i, R)}"/>`; }).join("");
  return `<svg class="plate${size ? " " + size : ""}" viewBox="0 0 100 100" aria-hidden="true"><defs><pattern id="hatch" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0,0v4" stroke="rgba(255,255,255,.18)" stroke-width="1.6"/></pattern></defs><circle cx="50" cy="50" r="49" class="rim"/>${seg}<circle cx="50" cy="50" r="${r0 - 2}" class="mid"/></svg>`;
}
const dayDone = d => { const m = fDay(d).m || {}; return ["col", "pr", "ce"].every(k => m[k] && m[k] !== "skip") && (!isGym(d) || (m.s2 && m.s2 !== "skip")); };
const nextMeal = d => { const m = fDay(d).m || {}; const id = RING.find(k => !m[k]); return id ? mealDef(id).name : null; };

// ---------- vista ----------
function renderCibo() {
  FOOD(); const box = $("cbody"); if (!box) return;
  document.querySelectorAll("#cseg button").forEach(b => b.setAttribute("aria-pressed", b.dataset.ct === CS.tab));
  if (CS.tab === "oggi") renderOggi(box); else if (CS.tab === "ricette") renderRicette(box); else if (CS.tab === "scambi") renderScambi(box); else renderSpesa(box);
}
document.querySelectorAll("#cseg button").forEach(b => b.onclick = () => { CS.tab = b.dataset.ct; CS.xform = null; renderCibo(); scrollTo(0, 0); });

const ddShort = iso => { const t = new Date(iso + "T12:00"); return { w: t.toLocaleDateString("it-IT", { weekday: "short" }).replace(".", ""), n: t.getDate() }; };
const addDays = (iso, n) => { const t = new Date(iso + "T12:00"); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); };
const CHEER = { col: ["Colazione fatta 👌", "Si parte bene ☀️", "Colazione ok 💪"], s1: ["Spuntino ok 👍", "Benzina nel motore ⛽"], pr: ["Pranzo segnato 🍽", "Pranzo fatto 💪", "Ottima scelta 👌"], s2: ["Spuntino fatto 👍", "Recupero servito 💪"], ce: ["Cena segnata 🌙", "Cena fatta 👌"], dc: ["Dopo cena ok 🌙"] };

function renderOggi(box) {
  const d = cDay(), today = todayISO(), day = fDay(d), gym = isGym(d), auto = gymAuto(d), m = day.m || {};
  const days = [...Array(7)].map((_, i) => addDays(today, i - 5));
  const nm = nextMeal(d), done = dayDone(d);
  let h = `<div class="cdays">${days.map(x => { const s = ddShort(x); return `<button data-cd="${x}" aria-pressed="${x === d}"><small>${x === today ? "oggi" : x > today ? "domani" : s.w}</small>${plateSVG(x, "pmini")}<b>${s.n}</b></button>`; }).join("")}</div>`;
  h += `<div class="cplate"><div class="pwrap">${plateSVG(d)}<div class="pmid">${done ? `<b>✓</b><small>giornata fatta</small>` : nm ? `<small>prossimo</small><b>${esc(nm)}</b>` : `<b>👌</b>`}</div></div>
    <div class="pside"><div class="pgym"><span>Palestra ${d === today ? "oggi" : "quel giorno"}</span><div class="seg2"><button data-gym="1" aria-pressed="${gym}">Sì</button><button data-gym="0" aria-pressed="${!gym}">No</button></div>${auto && day.gym == null ? `<small>dall'allenamento</small>` : ""}</div>
    <div class="pgym"><span>Turno</span><div class="seg4">${CB.shifts.map(x => `<button data-sh="${x.id}" aria-pressed="${day.turno === x.id}">${esc(x.t)}</button>`).join("")}</div></div>
    <p class="phint">${esc(dayHint(d))}</p></div></div>`;
  h += balanceCard(d) + bagCard(d);
  for (const md of CB.meals) {
    const v = m[md.id];
    if (md.extra && !v && !(m.s1 === "skip" && m.s2 === "skip") && !CS.showDc) { h += `<button class="cmore" data-dc="1">+ Dopo cena (facoltativo)</button>`; continue; }
    const opts = optsFor(md, d), sel = v && v !== "skip" ? optOf(md, v, d) : null;
    let order = opts;
    if (md.id === "ce" && m.pr && recipeById(m.pr) && !recipeById(m.pr).one) order = [opts.find(o => o.id === m.pr), ...opts.filter(o => o.id !== m.pr)].filter(Boolean);
    const w = whereOf(d, md.id);
    if (w !== "casa") order = [...(w === "mensa" ? order.filter(o => o.id === "mensa") : []), ...order.filter(o => fits(o, w) && !(w === "mensa" && o.id === "mensa")), ...order.filter(o => !fits(o, w))];
    const xs = (day.x || []).filter(x => x.meal === md.id);
    h += `<div class="meal${v ? " done" : ""}${v === "skip" ? " skipped" : ""}" style="--c:${md.color}"><div class="mh"><i></i><b>${esc(md.name)}</b><span>${v === "skip" ? "saltato" : sel ? esc(sel.t) : esc(mealSub(md, d))}</span>${sel && optVal(md.id, v, d) ? `<em class="mk">~${r50(optVal(md.id, v, d)[0])} kcal</em>` : ""}</div>${WHERE[w] ? `<p class="mwhere">${WHERE[w]}</p>` : ""}
      <div class="tiles">${order.map(o => tile(md, o, v === o.id, md.id === "ce" && o.id === m.pr && !!recipeById(o.id), !fits(o, w))).join("")}${md.skip ? `<button class="tile skipt${v === "skip" ? " on" : ""}" data-m="${md.id}" data-o="skip"><span class="ti">⤼</span><b>Saltato</b></button>` : ""}<button class="tile addt" data-xadd="${md.id}"><span class="ti">✎</span><b>Scrivo io</b></button></div>
      ${sel ? `<p class="mdet">${esc(detOf(md, sel, m))}${sel.r ? ` <button class="lnk" data-rec="${sel.r}">Ricetta ›</button>` : ""}</p>${w !== "casa" && w !== "mensa" && sel.porta ? `<p class="mdet porta">🎒 ${esc(sel.porta)}</p>` : ""}` : ""}
      ${xs.map(x => xRow(x)).join("")}
      ${CS.xform && CS.xform.meal === md.id ? xForm() : ""}</div>`;
  }
  const loose = (day.x || []).filter(x => !x.meal || x.meal === "fuori");
  h += `<div class="meal extra"><div class="mh"><i></i><b>Fuori pasto</b><span>quello che non è nelle caselle</span></div>${loose.map(x => xRow(x)).join("")}${CS.xform && CS.xform.meal === "fuori" ? xForm() : `<button class="cmore" data-xadd="fuori">+ Aggiungi un cibo</button>`}</div>`;
  h += weekCard(d);
  box.innerHTML = h;
  box.querySelectorAll(".tiles").forEach(t => { const on = t.querySelector(".tile.on"); if (on && on.offsetLeft + on.offsetWidth > t.clientWidth) t.scrollLeft = on.offsetLeft - 14; });
  bindOggi(box, d);
}
function detOf(md, o, m) { // pranzo = pasto 1 della ricetta, cena con la stessa ricetta = pasto 2
  const r = o.r && md.main && recipeById(o.r); if (!r || r.one) return o.d || "";
  if (md.id === "ce" && m.pr === r.id) return "Pasto 2: " + r.p2;
  if (md.id === "pr") return "Pasto 1: " + r.p1 + ". Il pasto 2 è per la cena (o per domani).";
  return o.d || "";
}
// 🎒 Borsa per il lavoro (20/11/2026): al lavoro la mattina non ha attrezzi, il pomeriggio solo il microonde
// ---------- stima di kcal e nutrienti (20/11/2026, richiesta dell'utente: "mi fa piacere saperlo", senza ossessione) ----------
// Valori già calcolati per ogni casella; i cibi scritti a mano contano se hanno le kcal (anche dalla risposta di Claude).
function optVal(mid, oid, d) {
  if (!oid || oid === "skip" || oid === "libero") return null;
  if (mid === "pr" || mid === "ce") { const b = CB.mainVals[oid]; if (!b) return null; const L = lunchLvl(d), c = CB.carbCtx[mid === "ce" ? "ce" : L === 80 ? "prG" : L === 40 ? "pr" : "pr0"]; return b.map((x, i) => x + c[i]); }
  const k = (mid === "s2" && isGym(d) && CB.vals["s2g." + oid]) ? "s2g." + oid : mid + "." + oid;
  return CB.vals[k] || CB.vals["s2g." + oid] || null;
}
function dayVals(d) {
  const day = fDay(d), m = day.m || {}, t = [0, 0, 0, 0]; let free = 0, nox = 0, any = 0;
  for (const mid of [...RING, "dc"]) { const v = m[mid]; if (v === "libero") { free++; continue; } const x = optVal(mid, v, d); if (x) { any++; x.forEach((n, i) => t[i] += n); } }
  for (const e of day.x || []) { if (e.k) { any++; t[0] += e.k; t[1] += e.p || 0; t[2] += e.c || 0; t[3] += e.f || 0; } else nox++; }
  return { t, free, nox, any };
}
const r50 = n => Math.round(n / 50) * 50;
function balanceCard(d) {
  const { t, free, nox, any } = dayVals(d); if (!any && !free) return "";
  const T = CB.target[isGym(d) ? "gym" : lunchLvl(d) === 40 ? "rest" : "rest0"], done = dayDone(d), m = fDay(d).m || {};
  const pc = t[0] / T[0], N = [["Proteine", 1], ["Carboidrati", 2], ["Grassi", 3]];
  let msg;
  if (free) msg = "Con un pasto libero oggi i conti non contano: domani si riparte normale.";
  else if (!done) { const left = RING.filter(k => !m[k]).map(k => mealDef(k).name.toLowerCase()); msg = left.length ? `Mancano ancora: ${left.join(", ")}.` : "Quasi fatto."; }
  else if (pc > 1.12) msg = `Oggi un po' sopra al piano (circa +${r50(t[0] - T[0])} kcal). Va bene così: domani normale, senza compensare.`;
  else if (pc < .85) msg = "Oggi un po' sotto al piano: se hai fame, il dopo cena è lì apposta.";
  else msg = "In linea col piano 👌";
  if (done && !free && t[1] < 120) msg += " Proteine un po' basse oggi: domani scegli spuntini con bresaola, fiocchi o uova.";
  return `<div class="card bal"><div class="bh"><b>~${fmt(r50(t[0]))} kcal</b><span>stima di oggi · piano ~${fmt(T[0])}</span></div>
    <div class="bbar"><i style="width:${Math.min(100, pc * 100).toFixed(0)}%"></i></div>
    <div class="bmac">${N.map(([n, i]) => `<div><small>${n}</small><b>${Math.round(t[i])} g</b><span class="bbar s"><i style="width:${Math.min(100, t[i] / T[i] * 100).toFixed(0)}%"></i></span><em>su ~${T[i]}</em></div>`).join("")}</div>
    <p class="note">${esc(msg)}${nox ? ` · ${nox} cib${nox > 1 ? "i" : "o"} scritt${nox > 1 ? "i" : "o"} senza kcal non contat${nox > 1 ? "i" : "o"}.` : ""}</p></div>`;
}
function bagCard(d) {
  const sh = shiftOf(d); if (!sh || !sh.prep) return "";
  const m = fDay(d).m || {}, rows = [];
  for (const md of CB.meals) { const w = whereOf(d, md.id); if (w !== "zero" && w !== "micro") continue;
    const v = m[md.id], sel = v && v !== "skip" ? optOf(md, v, d) : null;
    const sug = optsFor(md, d).filter(o => fits(o, w) && !o.free && o.id !== "altro").slice(0, 3).map(o => o.t);
    rows.push(`<li><b>${esc(md.name)}</b> <small>${w === "zero" ? "niente attrezzi" : "microonde"}</small><br>${sel ? `${esc(sel.t)}${sel.porta ? ` — ${esc(sel.porta)}` : ""}` : v === "skip" ? "saltato" : `<span class="mut">da scegliere: ${esc(sug.join(" · "))}</span>`}</li>`); }
  if (!rows.length) return "";
  return `<div class="card bag"><h3>🎒 Da portare al lavoro</h3><p class="note">${esc(sh.prep)}</p><ul>${rows.join("")}</ul><p class="note">${esc(CB.bagNote)}</p></div>`;
}
function mealSub(md, d) {
  const g = isGym(d);
  if (md.id === "pr") { const L = CB.lunch[lunchLvl(d)]; return `${L.t}: ${L.d}`; }
  if (md.id === "ce") return "patate 300 g · pane 100 g · pasta 65 g";
  if (md.id === "s2") return g ? "dopo la palestra · non si salta" : "si può saltare";
  if (md.id === "s1") return "si può saltare";
  if (md.id === "dc") return "solo se hai saltato i 2 spuntini o hai fame";
  return "scegli una casella";
}
function dayHint(d) {
  const m = fDay(d).m || {}, g = isGym(d);
  if (m.s1 === "skip" && m.s2 === "skip" && !m.dc) return "Hai saltato i 2 spuntini: stasera fai il dopo cena.";
  if (dayDone(d)) return "Tutto segnato. Domani si ricomincia, senza recuperare niente.";
  if (g && !m.s2) return "Giorno di palestra: pranzo da 80 e spuntino 2 dopo l'allenamento.";
  if (!g && !m.pr) return lunchLvl(d) === 40 ? "Giorno dopo la palestra: pranzo da 40. Uno spuntino si può saltare." : "2° giorno senza palestra: pranzo senza carboidrato, con doppia verdura. Cena normale.";
  const fr = freeInWeek(d); if (fr >= 2) return "Hai già i 2 pasti liberi della settimana: il resto come da piano.";
  return "Tocca la casella di quello che hai mangiato.";
}
function tile(md, o, on, p2, off) {
  const pic = o.r && FOOD().pics[o.r];
  const img = o.free ? `<span class="ti">🍕</span>` : pic ? `<img src="${pic}" alt="">` : o.p ? dishSVG(o.p, o.box, o.id, "dish") : `<span class="ti">🍽</span>`;
  return `<button class="tile${on ? " on" : ""}${o.free ? " free" : ""}${off && !on ? " off" : ""}" data-m="${md.id}" data-o="${o.id}">${img}<b>${esc(o.t)}</b>${p2 ? `<em>pasto 2</em>` : ""}${on ? `<u>✓</u>` : ""}${off ? `<i class="tw">${o.go === "m" ? "serve microonde" : "a casa"}</i>` : ""}</button>`;
}
const SIZES = { p: "poco", n: "normale", t: "tanto" };
const xRow = x => `<div class="xrow"><span>✎</span><div><b>${esc(x.t)}</b><small>${SIZES[x.s] || ""}${x.k ? ` · ~${x.k} kcal` : ""}${x.p != null ? ` · P ${x.p} · C ${x.c} · G ${x.f}` : ""}</small></div><button class="bx" data-xdel="${x.id}" aria-label="Elimina">✕</button></div>`;
function xForm() {
  const f = CS.xform;
  return `<div class="xform"><input id="xT" placeholder="Cosa hai mangiato? (es. 2 biscotti, 1 birra)" value="${esc(f.t || "")}" autocomplete="off">
    <div class="seg3">${Object.entries(SIZES).map(([k, n]) => `<button data-xs="${k}" aria-pressed="${f.s === k}">${n}</button>`).join("")}</div>
    <div class="row"><input id="xK" inputmode="numeric" placeholder="kcal (facoltativo)" value="${f.k || ""}"><label class="btn sm" for="xPic">📷 Chiedi a Claude</label><input type="file" id="xPic" accept="image/*" capture="environment" hidden></div>
    <p class="note">Per sapere kcal e nutrienti: scrivi cosa c'è, tocca 📷, fai la foto e mandala a Claude. Poi copia la sua risposta e incollala qui sotto: l'app legge i numeri da sola.</p>
    <textarea id="xR" rows="2" placeholder="Incolla qui la risposta di Claude">${esc(f.r || "")}</textarea>${f.p != null ? `<p class="note xok">✓ Letto: ${f.k} kcal · P ${f.p} g · C ${f.c} g · G ${f.f} g</p>` : ""}
    <div class="row"><button class="btn primary" id="xSave">Aggiungi</button><button class="btn" id="xNo">Annulla</button></div></div>`;
}
function weekCard(d) {
  const mon = weekStart(d), days = [...Array(7)].map((_, i) => addDays(mon, i)), names = ["L", "M", "M", "G", "V", "S", "D"];
  const fr = freeInWeek(d), wk = FOOD().week[mon] || {};
  const wv = typeof bodyList === "function" ? bodyList().filter(b => b.w != null) : [], avg = wv.length ? bodyAvg(wv, "w", 0, 13) : null;
  const Q = [["fame", "Fame", ["poca", "giusta", "tanta"]], ["energia", "Energia", ["bassa", "ok", "alta"]], ["sonno", "Sonno", ["male", "ok", "bene"]]];
  return `<h2>Questa settimana</h2><div class="card wkc">
    <div class="wkdays">${days.map((x, i) => `<button data-cd="${x}" aria-pressed="${x === d}"${x > todayISO() ? " disabled" : ""}>${plateSVG(x, "pmini")}<small>${names[i]}</small></button>`).join("")}</div>
    <p class="wkfree">🍕 Pasti liberi: <b>${fr} di 2</b>${fr > 2 ? " · va bene, si riparte dal prossimo pasto" : ""}</p>
    <div class="wkq">${Q.map(([k, n, o]) => `<div><span>${n}</span><div class="seg3">${o.map((t, i) => `<button data-wq="${k}" data-wv="${i}" aria-pressed="${wk[k] === i}">${t}</button>`).join("")}</div></div>`).join("")}</div>
    <p class="note">${avg != null ? `Peso medio (2 settimane): <b>${fmt(Math.round(avg * 10) / 10)} kg</b>. Ricomposizione: stabile mentre i carichi salgono.` : "Il peso si segna in Progressi → Corpo, 1-2 volte a settimana."}</p></div>`;
}
function freeInWeek(d) { const mon = weekStart(d); let n = 0; for (let i = 0; i < 7; i++) { const m = fDay(addDays(mon, i)).m || {}; for (const k of ["pr", "ce"]) if (m[k] === "libero") n++; } return n; }

function bindOggi(box, d) {
  box.querySelectorAll("[data-cd]").forEach(b => b.onclick = () => { CS.day = b.dataset.cd === todayISO() ? null : b.dataset.cd; CS.xform = null; renderCibo(); });
  box.querySelectorAll("[data-gym]").forEach(b => b.onclick = () => { const v = b.dataset.gym === "1"; setFDay(d, x => { x.gym = v === gymAuto(d) ? undefined : v; if (x.gym === undefined) delete x.gym; }); renderCibo(); });
  box.querySelectorAll(".tile[data-m]").forEach(b => b.onclick = () => {
    const mid = b.dataset.m, o = b.dataset.o, was = (fDay(d).m || {})[mid] === o, before = dayDone(d);
    setFDay(d, x => { if (was) delete x.m[mid]; else x.m[mid] = o; });
    if (!was) { b.classList.add("pop"); if (o !== "skip") { const c = CHEER[mid] || ["Fatto 👌"]; toast(c[Math.floor(Math.random() * c.length)]); }
      if (!before && dayDone(d) && !fDay(d).cel) { setFDay(d, x => x.cel = 1); setTimeout(() => celebrate("🍽 Giornata completa", "Domani si ricomincia, senza recuperare niente"), 250); } }
    setTimeout(renderCibo, was ? 0 : 160);
  });
  box.querySelectorAll("[data-dc]").forEach(b => b.onclick = () => { CS.showDc = true; renderCibo(); });
  box.querySelectorAll("[data-sh]").forEach(b => b.onclick = () => { const v = b.dataset.sh; setFDay(d, x => { if (x.turno === v) delete x.turno; else x.turno = v; }); renderCibo(); });
  box.querySelectorAll("[data-rec]").forEach(b => b.onclick = () => openRecipe(b.dataset.rec));
  box.querySelectorAll("[data-xadd]").forEach(b => b.onclick = () => { CS.xform = { meal: b.dataset.xadd, s: "n" }; renderCibo(); setTimeout(() => { const i = $("xT"); if (i) i.focus(); }, 60); });
  box.querySelectorAll("[data-xdel]").forEach(b => b.onclick = () => { setFDay(d, x => x.x = (x.x || []).filter(e => e.id !== b.dataset.xdel)); renderCibo(); });
  box.querySelectorAll("[data-wq]").forEach(b => b.onclick = () => { const f = FOOD(), mon = weekStart(d), k = b.dataset.wq, v = +b.dataset.wv; f.week[mon] = { ...(f.week[mon] || {}) }; if (f.week[mon][k] === v) delete f.week[mon][k]; else f.week[mon][k] = v; f.week[mon].at = Date.now(); save(); renderCibo(); });
  if (CS.xform) {
    const t = $("xT"), k = $("xK");
    t.oninput = () => CS.xform.t = t.value; k.oninput = () => CS.xform.k = k.value.replace(/\D/g, "");
    const rr = $("xR"); rr.oninput = () => { CS.xform.r = rr.value; const n = readClaude(rr.value); if (n) { Object.assign(CS.xform, n); k.value = n.k; const ok = box.querySelector(".xok"); if (!ok) { renderCibo(); const z = $("xR"); if (z) { z.focus(); z.setSelectionRange(z.value.length, z.value.length); } } } };
    box.querySelectorAll("[data-xs]").forEach(b => b.onclick = () => { CS.xform.s = b.dataset.xs; box.querySelectorAll("[data-xs]").forEach(x => x.setAttribute("aria-pressed", x === b)); });
    $("xNo").onclick = () => { CS.xform = null; renderCibo(); };
    $("xSave").onclick = () => { const f = CS.xform; if (!(f.t || "").trim()) return toast("Scrivi cosa hai mangiato");
      const e = { id: "x" + Date.now().toString(36), meal: f.meal, t: f.t.trim().slice(0, 80), s: f.s, at: Date.now() }; if (+f.k > 0) e.k = Math.min(5000, +f.k); if (f.p != null) { e.p = f.p; e.c = f.c; e.f = f.f; }
      setFDay(d, x => x.x = [...(x.x || []), e]); CS.xform = null; toast("Aggiunto ✎"); renderCibo(); };
    $("xPic").onchange = e => { const file = e.target.files[0]; if (file) askClaude(file, (CS.xform.t || "").trim(), SIZES[CS.xform.s]); e.target.value = ""; };
  }
}
// Stima con Claude: la foto + la descrizione vanno a Claude col menu Condividi del telefono (l'app non ha un servizio di IA:
// costerebbe e servirebbe una chiave segreta, impossibile in un sito pubblico).
// Legge i numeri dalla risposta di Claude: "kcal 450 · proteine 30 g · carboidrati 40 g · grassi 18 g" (anche con altre parole intorno).
function readClaude(txt) {
  const T = (txt || "").toLowerCase().replace(/(\d)[.,](\d{3})\b/g, "$1$2"), g = re => { const m = T.match(re); return m ? Math.round(parseFloat(m[1].replace(",", "."))) : null; };
  const k = g(/(\d+(?:[.,]\d+)?)\s*(?:k?cal|kilocalorie|calorie)/) ?? g(/(?:kcal|calorie)\D{0,12}(\d+(?:[.,]\d+)?)/);
  const p = g(/prot\w*\D{0,12}(\d+(?:[.,]\d+)?)/) ?? g(/(\d+(?:[.,]\d+)?)\s*g\s*(?:di\s*)?prot/);
  const c = g(/carbo\w*\D{0,12}(\d+(?:[.,]\d+)?)/) ?? g(/(\d+(?:[.,]\d+)?)\s*g\s*(?:di\s*)?carbo/);
  const f = g(/grass\w*\D{0,12}(\d+(?:[.,]\d+)?)/) ?? g(/(\d+(?:[.,]\d+)?)\s*g\s*(?:di\s*)?grass/);
  return k != null && p != null && c != null && f != null ? { k, p, c, f } : null;
}
async function askClaude(file, what, size) {
  const txt = `Stima kcal, proteine, carboidrati e grassi di quello che ho mangiato (foto allegata).${what ? ` Era: ${what}` : ""}${size ? ` · porzione ${size}` : ""}. Rispondi SOLO con questa riga, numeri arrotondati: kcal X · proteine X g · carboidrati X g · grassi X g`;
  try { const f = new File([file], "cibo.jpg", { type: file.type || "image/jpeg" });
    if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], text: txt }); return; } }
  catch (e) { if (e && e.name === "AbortError") return; }
  try { await navigator.clipboard.writeText(txt); toast("Testo copiato: apri Claude, incolla e allega la foto"); } catch (e) { toast("Apri Claude e mandagli la foto con la descrizione"); }
}

// ---------- ricette ----------
const CATN = { col: "Colazione", sp: "Spuntino", base: "Le basi" };
const MEALN = { col: "a colazione", s1: "allo spuntino 1", s2: "allo spuntino 2", pr: "a pranzo", ce: "a cena" };
function renderRicette(box) {
  const F = [["all", "Tutte"], ["main", "Pranzo e cena"], ["col", "Colazione"], ["sp", "Spuntini"], ["new", "Da imparare"], ["fast", "Veloci (≤ 12′)"], ["base", "Le basi"]];
  const ok = r => CS.rf === "all" || (CS.rf === "main" && r.main) || (CS.rf === r.cat) || (CS.rf === "new" && r.lvl === 2) || (CS.rf === "fast" && r.min <= 12);
  const L = CB.recipes.filter(ok);
  box.innerHTML = `<div class="rfil">${F.map(([k, n]) => `<button class="chip" data-rf="${k}" aria-pressed="${CS.rf === k}">${n}</button>`).join("")}</div>
    ${CS.rf === "all" ? `<p class="note rtip">Nuovo in cucina? Parti da <button class="lnk" data-rf="base">Le basi</button>: friggitrice, padella e pasta spiegate passo passo.</p>` : ""}
    <div class="rgrid">${L.map(r => { const pic = FOOD().pics[r.id]; return `<button class="rcard" data-rec="${r.id}">${pic ? `<img src="${pic}" alt="">` : dishSVG(r.p, r.box, r.id, "dish")}<b>${esc(r.name)}</b><small>${r.min} min · ${esc(r.tools)}</small><em>${r.main ? (r.one ? "1 pasto" : "2 pasti") : esc(CATN[r.cat] || "")}</em>${r.lvl === 2 ? `<i class="rnew">da imparare</i>` : ""}</button>`; }).join("")}</div>`;
  box.querySelectorAll("[data-rf]").forEach(b => b.onclick = () => { CS.rf = b.dataset.rf; renderCibo(); });
  box.querySelectorAll("[data-rec]").forEach(b => b.onclick = () => openRecipe(b.dataset.rec));
}
function openRecipe(id) {
  const r = recipeById(id), sh = $("fsheet"); if (!r || !sh) return; CS.recipe = id;
  const pic = FOOD().pics[id], d = cDay(), logs = r.main ? ["pr", "ce"] : Object.keys(r.for || {});
  sh.querySelector(".is-h").innerHTML = `<b>${esc(r.name)}</b><span class="rmeta">${r.min} min · ${esc(r.tools)}${r.main ? ` · ${r.one ? "1 pasto" : "2 pasti"}` : ""} · ${r.lvl === 2 ? "da imparare" : "facile"}</span>`;
  sh.querySelector(".is-c").innerHTML = `<div class="rhero">${pic ? `<img src="${pic}" alt="Il mio piatto">` : dishSVG(r.p, r.box, r.id, "dish big")}</div>
    <div class="rpic"><label class="btn sm" for="rPic">📷 ${pic ? "Cambia la foto" : "Foto del mio piatto"}</label><input type="file" id="rPic" accept="image/*" capture="environment" hidden>${pic ? `<button class="btn sm" id="rPicDel">Torna al disegno</button>` : ""}</div>
    ${logs.length ? `<div class="rlog">${logs.map(m => `<button class="btn primary" data-rl="${m}">✓ Mangiato ${MEALN[m]}</button>`).join("")}</div><p class="note rlday">${d === todayISO() ? "Si segna su oggi" : "Si segna sul " + fmtDate(d)}</p>` : ""}
    ${r.porta ? `<p class="rgo ${r.go}">${r.go === "p" ? "🎒 Si porta al lavoro, niente attrezzi" : r.go === "m" ? "🎒 Al lavoro col microonde" : "🏠 Solo a casa"}<small>${esc(r.porta)}</small></p>` : ""}
    <h3>Ingredienti${r.main && !r.one ? " (per 2 pasti)" : ""}</h3><ul class="ringr">${r.ingr.map(i => `<li>${esc(i)}</li>`).join("")}</ul>
    <h3>Passo passo</h3><ol class="rsteps">${r.steps.map((st, i) => `<li>${toolSVG(st.tool, st.p, r.id + i)}<div><small>${i + 1} · ${esc(TOOLN[st.tool] || st.tool)}</small><p>${esc(st.t)}</p>
      ${st.ok ? `<p class="sok">✓ <b>Pronto quando:</b> ${esc(st.ok)}</p>` : ""}${st.tip ? `<p class="stip">💡 ${esc(st.tip)}</p>` : ""}
      ${st.min ? `<button class="btn sm kt" data-kt="${st.min}" data-kl="${esc(r.s || r.name)} · passo ${i + 1}">⏱ Timer ${st.min} min</button>` : ""}</div></li>`).join("")}</ol>
    ${r.p1 ? `<h3>${r.p2 ? "I due pasti" : "Come si mangia"}</h3><div class="rp"><p><b>${r.p2 ? "Pasto 1" : "✓"}</b> ${esc(r.p1)}</p>${r.p2 ? `<p><b>Pasto 2</b> ${esc(r.p2)}</p>` : ""}</div>` : ""}
    ${r.olio ? `<p class="note">Olio: ${esc(r.olio)}. Quello per cuocere è compreso.</p>` : ""}
    <p class="note">I disegni mostrano come dovrebbe venire. Con 📷 metti la foto del tuo piatto: diventa la copertina della ricetta.</p>`;
  sh.hidden = false; document.documentElement.classList.add("noscroll"); sh.classList.remove("on"); void sh.offsetWidth; sh.classList.add("on");
  sh.querySelector(".is-c").scrollTop = 0;
  $("rPic").onchange = e => { const f = e.target.files[0]; if (f) saveFoodPic(id, f); e.target.value = ""; };
  const del = $("rPicDel"); if (del) del.onclick = () => { delete FOOD().pics[id]; save(); openRecipe(id); renderCibo(); };
  sh.querySelectorAll("[data-kt]").forEach(b => b.onclick = () => kStart(+b.dataset.kt, b.dataset.kl));
  sh.querySelectorAll("[data-rl]").forEach(b => b.onclick = () => { const mid = b.dataset.rl, oid = r.main ? id : r.for[mid]; setFDay(cDay(), x => x.m[mid] = oid);
    const c = CHEER[mid] || ["Segnato 👌"]; toast(c[Math.floor(Math.random() * c.length)]); closeRecipe(); CS.tab = "oggi"; renderCibo(); });
}
// Timer di cucina (20/11/2026): l'utente è alle prime armi, ogni passaggio con un tempo ha il suo timer.
// A fine tempo: bip (se l'audio è sbloccato), tocco aptico su iPhone, vibrazione su Android, festa a schermo.
function kStart(min, label) {
  CS.kt = { end: Date.now() + min * 60000, label }; try { if (typeof unlockAudio === "function") unlockAudio(); } catch (e) {}
  toast(`⏱ Timer ${min} min avviato`); kTick();
}
function kTick() {
  let el = $("ktimer"); const k = CS.kt;
  if (!k) { if (el) el.remove(); return; }
  if (!el) { el = document.createElement("div"); el.id = "ktimer"; el.className = "ktimer"; document.body.appendChild(el); }
  const left = Math.max(0, Math.round((k.end - Date.now()) / 1000));
  el.innerHTML = `<span>⏱ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}</span><small>${esc(k.label)}</small><button aria-label="Ferma il timer">✕</button>`;
  el.querySelector("button").onclick = () => { CS.kt = null; clearTimeout(CS.ktT); kTick(); };
  if (left <= 0) { CS.kt = null; el.remove();
    try { if (typeof AC !== "undefined" && AC) { const t = AC.currentTime; [0, .35, .7].forEach(d => beep(t + d, 880, .25, .5)); } } catch (e) {}
    try { iosTap(); navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {}
    celebrate("⏰ Tempo!", k.label); return; }
  clearTimeout(CS.ktT); CS.ktT = setTimeout(kTick, 1000);
}
document.addEventListener("visibilitychange", () => { if (!document.hidden && CS.kt) kTick(); });
function closeRecipe() { const sh = $("fsheet"); if (!sh || sh.hidden) return; sh.classList.remove("on"); document.documentElement.classList.remove("noscroll"); CS.recipe = null; setTimeout(() => { if (!sh.classList.contains("on")) sh.hidden = true; }, 220); }
(() => { const sh = $("fsheet"); if (!sh) return; sh.querySelector(".is-bg").onclick = closeRecipe; sh.querySelector(".is-x").onclick = closeRecipe; sh.querySelector(".is-close").onclick = closeRecipe;
  let y0 = null; const top = sh.querySelector(".is-top"), bx = sh.querySelector(".is-box");
  top.addEventListener("touchstart", e => { y0 = e.touches[0].clientY; }, { passive: true });
  top.addEventListener("touchmove", e => { if (y0 == null) return; const dy = Math.max(0, e.touches[0].clientY - y0); bx.style.transform = `translateY(${dy}px)`; }, { passive: true });
  top.addEventListener("touchend", e => { const dy = (e.changedTouches[0].clientY - (y0 || 0)); bx.style.transform = ""; y0 = null; if (dy > 90) closeRecipe(); }); })();
function saveFoodPic(id, file) {
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => { const k = 560 / Math.max(img.width, img.height), c = document.createElement("canvas"); c.width = Math.round(img.width * Math.min(1, k)); c.height = Math.round(img.height * Math.min(1, k));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
    FOOD().pics[id] = c.toDataURL("image/jpeg", .7); try { save(); toast("Foto salvata 📷"); } catch (e) { toast("Spazio pieno: foto non salvata"); } openRecipe(id); renderCibo(); };
  img.src = url;
}

// ---------- scambi ----------
function renderScambi(box) {
  const q = CS.q.toLowerCase().trim(), hit = r => !q || r[0].toLowerCase().includes(q);
  const C = CB.carbs.filter(hit), P = CB.prots.filter(hit);
  box.innerHTML = `<input class="sq" id="sq" placeholder="Cerca un alimento (es. pasta, salmone)" value="${esc(CS.q)}" autocomplete="off">
    <p class="note">Al posto di un alimento del piano scegli una riga: le quantità sono già equivalenti, ±10% va benissimo. Pesi da crudi; con le confezioni arrotonda alla confezione.</p>
    ${C.length ? `<h2>Carboidrati</h2><div class="card tbl"><table><thead><tr><th>Alimento</th><th>Palestra</th><th>Senza</th><th>Cena</th></tr></thead><tbody>${C.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${esc(r[3])}</td></tr>`).join("")}</tbody></table></div>` : ""}
    ${P.length ? `<h2>Proteine (pranzo e cena)</h2><div class="card tbl"><table><thead><tr><th>Alimento</th><th>Quantità</th><th>Olio</th></tr></thead><tbody>${P.map(r => `<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join("")}</tbody></table></div>` : ""}
    ${!q || "grassi noci olio burro".includes(q) ? `<h2>Grassi</h2><div class="card"><p>${esc(CB.fats)}</p></div>` : ""}
    ${!C.length && !P.length && q ? `<p class="note">Niente con "${esc(CS.q)}". Se manca, chiedilo a Claude e lo aggiungiamo.</p>` : ""}`;
  const i = $("sq"); i.oninput = () => { CS.q = i.value; const pos = i.selectionStart; renderCibo(); const j = $("sq"); j.focus(); j.setSelectionRange(pos, pos); };
}

// ---------- spesa ----------
function renderSpesa(box) {
  const S0 = FOOD().shop, n = Object.keys(S0).length;
  box.innerHTML = `<p class="note">Tocca quello che hai già preso. Le proteine: prendi quelle delle ricette della settimana.</p>
    ${CB.shop.map(c => `<h2>${esc(c.cat)}</h2><div class="shop">${c.items.map(it => `<button class="sitem${S0[it] ? " on" : ""}" data-it="${esc(it)}"><i>${S0[it] ? "✓" : ""}</i>${esc(it)}</button>`).join("")}</div>`).join("")}
    ${n ? `<div class="row"><button class="btn" id="shopReset">Ricomincia la lista (${n} presi)</button></div>` : ""}`;
  box.querySelectorAll("[data-it]").forEach(b => b.onclick = () => { const k = b.dataset.it, f = FOOD(); if (f.shop[k]) delete f.shop[k]; else f.shop[k] = 1; save(); renderCibo(); });
  const r = $("shopReset"); if (r) r.onclick = () => { FOOD().shop = {}; save(); renderCibo(); };
}

// ---------- backup: unione dei dati del cibo (giorni più recenti vincono) ----------
function mergeFood(inc) {
  if (!inc || !inc.food) return; const f = FOOD(), g = inc.food;
  for (const [d, x] of Object.entries(g.days || {})) { const l = f.days[d]; if (!l || (x.at || 0) > (l.at || 0)) f.days[d] = x; }
  f.pics = { ...(g.pics || {}), ...f.pics }; f.shop = { ...(g.shop || {}), ...f.shop };
  for (const [w, x] of Object.entries(g.week || {})) { const l = f.week[w]; if (!l || (x.at || 0) > (l.at || 0)) f.week[w] = x; }
}
// per il report al PT
function foodReport(from) {
  const f = FOOD(), ds = Object.keys(f.days).filter(d => d >= from && Object.keys((f.days[d] || {}).m || {}).length).sort(); if (!ds.length) return [];
  let lib = 0, x = 0; for (const d of ds) { const m = f.days[d].m; for (const k of ["pr", "ce"]) if (m[k] === "libero") lib++; x += (f.days[d].x || []).length; }
  return ["", "🍽 ALIMENTAZIONE", `Giorni segnati: ${ds.length} · pasti liberi: ${lib}${x ? ` · cibi extra scritti: ${x}` : ""}`];
}
