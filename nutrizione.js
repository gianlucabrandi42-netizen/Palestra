/* Sezione CIBO (20/11/2026) — contenuti del piano alimentare, separati dal codice come schede.js.
   Fonte: piano del PT adattato (documenti del progetto NUTRIZIONE_*.md e doc "Piano alimentare completo").
   Gusti: niente frutta, frutta secca solo noci, tonno solo sott'olio sgocciolato e solo nella pasta, pasta quando vuole.
   Regole anti-ossessione: niente grammi da scrivere, niente punteggi, niente rosso, niente serie di giorni.

   "p" = ingredienti del disegno (li disegna app.js: niente foto prese da internet). Ingredienti disponibili:
   riso pasta cous farro patate pdolci pane piadina pollo manzo polpette pesce salmone gamberi tonno uova frittata
   ceci mozzarella bresaola verdure spinaci rucola insalata pomodorini sugo yogurt cornflakes gallette noci shaker
   torta fiocchi proteine albume
   "box" = contenitore del disegno: piatto (predefinito), ciotola, bicchiere, tazza, vetro.
   Strumenti dei passaggi: ciotola friggitrice padella pentola microonde contenitore bollitore cuociriso tagliere. */
window.CIBO = {
  // pasti della giornata, in ordine. skip = si può saltare. extra = facoltativo.
  meals: [
    { id: "col", name: "Colazione", color: "#F2C14E", opts: [
      { id: "A", t: "Proteine e crema di riso", d: "30 g di proteine · 50 g di crema di riso o torta in tazza · 3 gallette", p: ["torta", "gallette"], box: "tazza", r: "torta" },
      { id: "A2", t: "Shaker e cornflakes", d: "Shaker con 30 g di proteine · 65 g di cornflakes (o 8 gallette, o 120 g di pane)", p: ["shaker", "cornflakes"], box: "ciotola" },
      { id: "B", t: "Uova e segale", d: "3 uova sode · 1 fetta di pane di segale · 3 noci (o 1 cucchiaino di burro di arachidi)", p: ["uova", "pane", "noci"], r: "uova" },
      { id: "C", t: "Yogurt e cornflakes", d: "Yogurt intero 150 g · 60-70 g di cornflakes", p: ["yogurt", "cornflakes"], box: "ciotola" },
    ] },
    { id: "s1", name: "Spuntino 1", color: "#8CC152", skip: true, opts: [
      { id: "yog", t: "Yogurt e noci", d: "Yogurt intero 150 g + 3 noci", p: ["yogurt", "noci"], box: "ciotola" },
      { id: "bre", t: "Bresaola e gallette", d: "60 g di bresaola + 2 gallette", p: ["bresaola", "gallette"] },
      { id: "fio", t: "Fiocchi di latte", d: "1 vasetto di fiocchi di latte", p: ["fiocchi"], box: "ciotola" },
      { id: "uov", t: "2 uova sode", d: "2 uova sode", p: ["uova"] },
      { id: "moz", t: "Mozzarella e gallette", d: "Mezza mozzarella light + 2 gallette", p: ["mozzarella", "gallette"] },
    ] },
    { id: "pr", name: "Pranzo", color: "#6D95FF", main: true },
    { id: "s2", name: "Spuntino 2", color: "#E8833A", skip: true,
      gym: [ // giorni di palestra: dopo l'allenamento, non si salta
        { id: "A", t: "Proteine e crema di riso", d: "30 g di proteine + 50 g di crema di riso (o torta in tazza) + 3 gallette + 3 noci", p: ["torta", "gallette", "noci"], box: "tazza", r: "torta" },
        { id: "A2", t: "Shaker e cornflakes", d: "Shaker con 30 g di proteine + 65 g di cornflakes (o 8 gallette) + 3 noci", p: ["shaker", "cornflakes", "noci"], box: "ciotola" },
        { id: "pan", t: "Panino con bresaola", d: "110 g di pane + 60 g di bresaola + 3 noci", p: ["pane", "bresaola", "noci"] },
      ],
      opts: [ // giorni senza palestra
        { id: "fio", t: "Fiocchi di latte e segale", d: "1 vasetto di fiocchi di latte + 1 fetta di pane di segale", p: ["fiocchi", "pane"], box: "ciotola" },
        { id: "yog", t: "Yogurt e cornflakes", d: "Yogurt intero 150 g + 30 g di cornflakes", p: ["yogurt", "cornflakes"], box: "ciotola" },
        { id: "pan", t: "Pane e bresaola", d: "50 g di pane + 50 g di bresaola", p: ["pane", "bresaola"] },
      ] },
    { id: "ce", name: "Cena", color: "#B57EDC", main: true },
    { id: "dc", name: "Dopo cena", color: "#9AA5B1", extra: true, opts: [
      { id: "yog", t: "Yogurt e noci", d: "Yogurt intero 150 g + 3 noci", p: ["yogurt", "noci"], box: "ciotola" },
      { id: "fio", t: "Fiocchi di latte", d: "1 vasetto di fiocchi di latte", p: ["fiocchi"], box: "ciotola" },
    ] },
  ],
  // caselle in più per pranzo e cena, oltre alle ricette
  mainExtra: [
    { id: "mensa", t: "Mensa", d: "Un secondo normale + verdure a volontà. Primo: porzione normale nei giorni di palestra, mezza negli altri. Niente fritti, panna o pane in più.", p: ["pasta", "pollo", "verdure"], only: "pr" },
    { id: "libero", t: "Pasto libero", d: "Fa parte del piano: 2 a settimana (la pizza del sabato + uno a scelta). Non si compensa.", free: true },
    { id: "altro", t: "Altro piatto", d: "Un carboidrato + una proteina + verdure + 1 cucchiaio d'olio, dalle tabelle degli scambi.", p: ["riso", "pollo", "insalata"] },
  ],

  recipes: [
    { id: "pollo", s: "Pollo 2 gusti", name: "Pollo in friggitrice, due gusti", min: 18, tools: "cestello + ciotola", main: true, p: ["pollo", "verdure", "riso"],
      ingr: ["400 g di petto di pollo a bocconcini", "400 g di verdure grigliate surgelate (peperoni, zucchine, melanzane)", "Limone, origano, aglio in polvere", "Paprika affumicata, peperoncino, cipolla in polvere", "Olio in spruzzino"],
      steps: [
        { tool: "tagliere", p: ["pollo"], t: "Taglia il pollo a bocconcini (o compralo già a cubetti)." },
        { tool: "ciotola", p: ["pollo"], t: "Metà pollo nella ciotola con limone, origano e aglio. Mettilo su metà della carta forno." },
        { tool: "ciotola", p: ["pollo"], t: "Stessa ciotola, l'altra metà con paprika affumicata, peperoncino e cipolla. Sull'altra metà della carta forno." },
        { tool: "friggitrice", p: ["pollo", "verdure"], t: "Aggiungi le verdure surgelate, qualche spruzzata d'olio. 200 °C per 15-18 minuti, gira a metà." },
        { tool: "contenitore", p: ["pollo", "verdure"], t: "Dividi nei 2 contenitori: un gusto per pasto." },
      ],
      p1: "Pollo al limone + riso del cuociriso", p2: "Pollo alla paprika + patate al microonde (cubetti coperti, 8-10 min)", olio: "1 cucchiaio a pasto in tutto" },
    { id: "pesce", s: "Pesce bianco", name: "Pesce bianco mediterraneo e messicano", min: 18, tools: "cestello + ciotolina", main: true, p: ["pesce", "pomodorini", "cous"],
      ingr: ["500 g di filetti di merluzzo o platessa surgelati", "250 g di pomodorini", "Capperi, origano, limone", "Paprika, cumino, aglio, lime", "1 piadina e insalata in busta (pasto 2)", "2 cucchiai di yogurt intero per la salsa"],
      steps: [
        { tool: "friggitrice", p: ["pesce", "pomodorini"], t: "Filetti ancora surgelati su carta forno. Su metà: pomodorini tagliati, capperi, origano." },
        { tool: "friggitrice", p: ["pesce"], t: "Sull'altra metà: paprika, cumino, aglio e lime. 190 °C per 15-18 minuti." },
        { tool: "bollitore", p: ["cous"], t: "Pasto 1: cous cous coperto con acqua bollente, 5 minuti, poi sgrana con la forchetta." },
        { tool: "ciotola", p: ["yogurt"], t: "Pasto 2: salsa con 2 cucchiai di yogurt, lime e peperoncino. Pesce in piadina con insalata: niente olio." },
      ],
      p1: "Pesce alla mediterranea + cous cous", p2: "Pesce messicano in piadina con insalata e salsa allo yogurt", olio: "pasto 1: 1 cucchiaio · pasto 2: niente (la piadina basta)" },
    { id: "manzo", s: "Straccetti di manzo", name: "Straccetti di manzo: tagliata e fajitas", min: 10, tools: "una padella", main: true, p: ["manzo", "rucola", "pomodorini"],
      ingr: ["400 g di straccetti di manzo", "Rucola e pomodorini", "200 g di peperoni surgelati", "Paprika, cumino, peperoncino", "Aceto balsamico"],
      steps: [
        { tool: "padella", p: ["manzo"], t: "Padella vuota sul fuoco 2 minuti, poi 1 cucchiaino d'olio. Straccetti asciutti, 2-3 minuti per lato senza girarli subito." },
        { tool: "piatto", p: ["manzo", "rucola", "pomodorini"], t: "Metà su rucola e pomodorini, con aceto balsamico: pasto 1." },
        { tool: "padella", p: ["verdure", "manzo"], t: "Stessa padella: peperoni con paprika, cumino e peperoncino, poi l'altra metà degli straccetti per 2 minuti." },
      ],
      p1: "Tagliata su rucola e pomodorini + pane", p2: "Fajitas con peperoni + riso (o in piadina, senza olio)", olio: "1 cucchiaio a pasto in tutto" },
    { id: "polpette", s: "Polpette", name: "Polpette in friggitrice", min: 15, tools: "ciotola + cestello", main: true, p: ["polpette", "insalata", "patate"],
      ingr: ["400 g di macinato magro (5-7% di grassi)", "1 albume", "Aglio, prezzemolo o origano, sale", "150 g di passata, peperoncino (pasto 2)"],
      steps: [
        { tool: "ciotola", p: ["polpette"], t: "Impasta macinato, albume, aglio, erbe e sale. Forma 10-12 polpette." },
        { tool: "friggitrice", p: ["polpette"], t: "Su carta forno, 190 °C per 12 minuti." },
        { tool: "microonde", p: ["polpette", "sugo"], t: "Pasto 2: polpette nel contenitore di vetro con passata, origano e peperoncino, 3 minuti." },
      ],
      p1: "Polpette con insalata e limone + patate o pane", p2: "Polpette al sugo piccante + riso o pasta", olio: "mezzo cucchiaio a crudo per pasto" },
    { id: "gamberi", s: "Gamberi", name: "Gamberi: pasta e paprika", min: 15, tools: "pentola + padella", main: true, p: ["pasta", "gamberi", "verdure"],
      ingr: ["500 g di gamberi sgusciati surgelati", "1 zucchina (o 200 g surgelate)", "Aglio, peperoncino, prezzemolo, paprika", "Pasta per il pasto 1"],
      steps: [
        { tool: "pentola", p: ["pasta"], t: "Metti a cuocere la pasta." },
        { tool: "padella", p: ["verdure", "gamberi"], t: "Intanto: 1 cucchiaino d'olio, aglio e peperoncino, zucchine 4 minuti, poi gamberi 3-4 minuti." },
        { tool: "contenitore", p: ["gamberi"], t: "Metti da parte metà dei gamberi con la paprika: pasto 2." },
        { tool: "piatto", p: ["pasta", "gamberi", "verdure"], t: "Scola la pasta e saltala con il resto." },
      ],
      p1: "Pasta gamberi, zucchine e peperoncino", p2: "Gamberi alla paprika + cous cous o patate", olio: "1 cucchiaio a pasto in tutto" },
    { id: "salmone", s: "Salmone", name: "Salmone e patate dolci", min: 20, tools: "cestello", main: true, p: ["salmone", "pdolci", "insalata"],
      ingr: ["2 tranci di salmone da 150 g", "500-550 g di patate dolci", "Limone ed erbe", "Paprika, aglio, cipolla, peperoncino (cajun)"],
      steps: [
        { tool: "tagliere", p: ["pdolci"], t: "Patate dolci a cubetti piccoli." },
        { tool: "friggitrice", p: ["pdolci"], t: "Cubetti su carta forno a 200 °C per 8 minuti." },
        { tool: "friggitrice", p: ["pdolci", "salmone"], t: "Aggiungi i tranci: uno con limone ed erbe, uno cajun. Altri 10-12 minuti." },
      ],
      p1: "Salmone al limone + patate dolci + insalata", p2: "Salmone cajun + patate dolci + insalata", olio: "niente: il salmone ha già i suoi grassi" },
    { id: "curry", s: "Curry ceci e pollo", name: "Curry di ceci e pollo", min: 12, tools: "una padella", main: true, p: ["ceci", "pollo", "spinaci", "riso"],
      ingr: ["300 g di pollo a cubetti (200 g nei giorni di palestra)", "300 g di ceci sgocciolati (200 g nei giorni di palestra)", "200 g di passata", "150 g di spinaci surgelati", "Curry, paprika, peperoncino"],
      steps: [
        { tool: "padella", p: ["pollo"], t: "Pollo con 1 cucchiaino d'olio, 5 minuti." },
        { tool: "padella", p: ["pollo", "ceci", "spinaci", "sugo"], t: "Aggiungi ceci, passata, spinaci e spezie: 6-7 minuti." },
        { tool: "contenitore", p: ["ceci", "pollo"], t: "Dividi in 2: pasto 1 col riso, pasto 2 con la pasta (diventa pasta e ceci)." },
      ],
      p1: "Curry + 40 g di riso (80 nei giorni di palestra)", p2: "Pasta e ceci col pollo (40 g di pasta) o con 50 g di pane", olio: "1 cucchiaio a pasto in tutto" },
    { id: "pastatonno", s: "Pasta al tonno", name: "Pasta al tonno, calda o fredda", min: 12, tools: "una pentola", main: true, p: ["pasta", "tonno", "pomodorini"],
      ingr: ["Pasta: 75 g nei giorni di palestra, 40 negli altri, 65 a cena", "150 g di tonno sott'olio ben sgocciolato (circa 2 scatolette da 80 g)", "Pomodorini, capperi, peperoncino", "Rucola e origano per la versione fredda"],
      steps: [
        { tool: "pentola", p: ["pasta"], t: "Cuoci la pasta." },
        { tool: "contenitore", p: ["tonno", "pomodorini"], t: "Intanto nel contenitore: tonno sgocciolato, pomodorini tagliati, capperi, peperoncino." },
        { tool: "piatto", p: ["pasta", "tonno", "pomodorini"], t: "Calda: scola e mescola. Fredda: lasciala raffreddare e aggiungi rucola e origano." },
      ],
      p1: "Pasta al tonno calda", p2: "Pasta al tonno fredda con rucola, da portare", olio: "niente: basta quello del tonno" },
    { id: "frittata", s: "Frittata", name: "Frittata in friggitrice", min: 12, tools: "ciotola + cestello", main: true, one: true, p: ["frittata", "pane", "insalata"],
      ingr: ["2 uova + 150 g di albume", "150 g di verdure surgelate (spinaci, zucchine o peperoni)", "Sale, pepe, origano o paprika"],
      steps: [
        { tool: "ciotola", p: ["uova", "spinaci"], t: "Sbatti uova, albume, verdure e spezie." },
        { tool: "friggitrice", p: ["frittata"], t: "Su carta forno in uno stampino o nel cestello, 180 °C per 10-12 minuti." },
      ],
      p1: "Frittata + pane o patate + insalata (anche fredda da portare)", olio: "1 cucchiaio" },
    { id: "farro", s: "Farro freddo", name: "Insalata fredda di farro", min: 5, tools: "un contenitore", main: true, one: true, p: ["farro", "mozzarella", "pomodorini", "rucola"],
      ingr: ["170 g di farro o orzo precotto in busta (85 g nei giorni senza palestra)", "1 mozzarella light", "100 g di pollo avanzato o di bresaola", "Pomodorini, rucola, origano"],
      steps: [
        { tool: "contenitore", p: ["farro", "mozzarella", "pomodorini", "rucola"], t: "Tutto nel contenitore e mescola. Zero cottura." },
      ],
      p1: "Vale un pranzo da 80", olio: "niente o mezzo cucchiaio: la mozzarella ha già grassi" },
    { id: "frigo", s: "Frigo vuoto", name: "Piatto frigo vuoto", min: 5, tools: "un contenitore", main: true, one: true, p: ["riso", "uova", "insalata"],
      ingr: ["1 porzione di carboidrati già pronta (riso del cuociriso, busta precotta o pane)", "2 uova sode + 1 albume, oppure 100 g di bresaola + 1 vasetto di fiocchi di latte", "Verdure in busta"],
      steps: [
        { tool: "contenitore", p: ["riso", "uova", "insalata"], t: "Componi il piatto con quello che hai già pronto." },
      ],
      p1: "Per i giorni in cui non hai cucinato niente", olio: "1 cucchiaio" },
    { id: "torta", name: "Torta in tazza", min: 3, tools: "una tazza", prep: "Colazione e spuntino 2", box: "tazza", p: ["torta"],
      ingr: ["50 g di crema di riso", "30 g di proteine in polvere", "1 albume (30 g)", "Mezzo cucchiaino di lievito per dolci", "Latte o acqua quanto basta", "Cannella o 1 cucchiaino di cacao amaro"],
      steps: [
        { tool: "ciotola", p: ["torta"], t: "Nella tazza grande: crema di riso, proteine, albume, lievito e cannella. Latte o acqua fino a una pastella densa." },
        { tool: "microonde", p: ["torta"], t: "90-120 secondi a piena potenza: deve gonfiarsi e restare morbida dentro." },
      ],
      p1: "Se non ti piace: shaker con 65 g di cornflakes al posto della crema di riso" },
    { id: "uova", name: "Uova sode a lotti", min: 12, tools: "una pentola", prep: "Colazione e spuntini", p: ["uova"],
      ingr: ["6 uova"],
      steps: [
        { tool: "pentola", p: ["uova"], t: "Uova in acqua fredda. Dal bollore: 9 minuti." },
        { tool: "ciotola", p: ["uova"], t: "Acqua fredda per fermare la cottura. In frigo col guscio durano 4-5 giorni." },
      ] },
    { id: "riso", name: "Riso a lotti col cuociriso", min: 20, tools: "cuociriso", prep: "Base per 2-3 giorni", p: ["riso"],
      ingr: ["Riso crudo per 2-3 giorni (es. 3 porzioni da 80 g = 240 g)"],
      steps: [
        { tool: "cuociriso", p: ["riso"], t: "Pesa il riso crudo e cuoci." },
        { tool: "contenitore", p: ["riso"], t: "Dividi a occhio in contenitori uguali (mezzo contenitore = porzione da 40). In frigo entro un'ora." },
        { tool: "microonde", p: ["riso"], t: "Mangialo entro 2-3 giorni, il resto in freezer. Riscaldalo bene, una volta sola." },
      ] },
  ],

  // scambi: [alimento, giorno di palestra, giorno senza palestra, cena]
  carbs: [["Riso", "80 g", "40 g", "50-70 g"], ["Pasta", "75 g", "40 g", "65 g"], ["Pasta integrale", "80 g", "40 g", "70 g"], ["Cous cous", "70 g", "35 g", "60 g"], ["Farro o orzo", "80 g", "40 g", "70 g"], ["Quinoa", "70 g", "35 g", "60 g"], ["Riso precotto in busta", "180 g", "90 g", "150 g"], ["Farro o orzo precotti in busta", "170 g", "85 g", "150 g"], ["Gnocchi", "200 g", "100 g", "150 g"], ["Patate", "350 g", "175 g", "300 g"], ["Patate dolci", "300 g", "150 g", "270 g"], ["Pane", "100 g", "50 g", "85-100 g"], ["Pane di segale", "115 g", "60 g", "100 g"], ["Piadina (niente olio)", "1", "½", "¾"], ["Cornflakes o gallette", "70 g", "35 g", "60 g"]],
  // [alimento, quantità, olio nel pasto]
  prots: [["Petto di pollo", "200 g", "1 cucchiaio"], ["Manzo magro", "200 g", "1 cucchiaio"], ["Macinato magro", "200 g", "mezzo"], ["Merluzzo, nasello, platessa", "250 g", "1 cucchiaio"], ["Orata o branzino", "200 g", "mezzo"], ["Gamberi", "250 g", "1 cucchiaio"], ["Salmone", "150 g", "niente"], ["Tonno sott'olio sgocciolato (nella pasta)", "150 g", "niente"], ["Uova", "2 uova + 150 g di albume", "1 cucchiaio"], ["Mozzarella light + pollo o bresaola", "1 + 100 g", "niente"], ["Legumi + pollo", "palestra 100+100 g · senza 150+150 g", "1 cucchiaio"]],
  fats: "3 noci = 1 cucchiaino di burro di arachidi = 50 g di avocado = 2 cucchiaini d'olio. Olio: 1 cucchiaio a pranzo e 1 a cena, compreso quello per cuocere.",

  shop: [
    { cat: "Proteine", items: ["Petto di pollo", "Pesce bianco surgelato", "Straccetti di manzo", "Macinato magro", "Gamberi surgelati", "Salmone", "Uova (12)", "Albume in brick", "Tonno sott'olio", "Ceci", "Bresaola"] },
    { cat: "Latticini", items: ["Yogurt intero bianco", "Fiocchi di latte", "Mozzarella light", "Latte"] },
    { cat: "Carboidrati", items: ["Riso", "Pasta", "Cous cous", "Farro o orzo precotto", "Riso precotto (emergenze)", "Patate", "Patate dolci", "Pane di segale", "Piadine", "Cornflakes", "Gallette", "Crema di riso"] },
    { cat: "Verdure", items: ["Verdure grigliate surgelate", "Spinaci surgelati", "Insalata in busta", "Pomodorini", "Zucchine", "Rucola", "Limoni o lime"] },
    { cat: "Altro", items: ["Olio extravergine", "Noci", "Proteine in polvere", "Passata", "Capperi", "Aceto balsamico", "Spezie", "Cannella o cacao amaro", "Carta forno", "Lievito per dolci"] },
  ],
};
