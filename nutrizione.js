/* Sezione CIBO (20/11/2026) — contenuti del piano alimentare, separati dal codice come schede.js.
   Fonte: piano del PT adattato (documenti del progetto NUTRIZIONE_*.md e doc "Piano alimentare completo").
   Gusti: niente frutta, frutta secca solo noci, tonno solo sott'olio sgocciolato e solo nella pasta, pasta quando vuole.
   L'utente si dichiara principiante in cucina: ogni passaggio dice COSA fare, con che fuoco/temperatura, quanto tempo
   ("min"), COME CAPISCI CHE È PRONTO ("ok") e l'errore da evitare ("tip"). Ricette vere, non ingredienti accostati.
   Regole anti-ossessione: niente grammi da scrivere, niente punteggi, niente rosso, niente serie di giorni.

   "p" = ingredienti del disegno (li disegna cibo.js: niente foto prese da internet). Ingredienti disponibili:
   riso pasta cous farro patate pdolci pane piadina pizza pollo cotoletta manzo polpette pesce salmone gamberi tonno
   uova strapazzate frittata toast pancake gnocchi ceci piselli mozzarella bresaola verdure spinaci rucola insalata
   pomodorini sugo yogurt cornflakes gallette pizzetta noci fiocchi shaker torta proteine
   "box" = contenitore del disegno: piatto (predefinito), ciotola, tazza, vetro.
   Strumenti dei passaggi: ciotola friggitrice padella pentola microonde contenitore bollitore cuociriso tagliere piatto.
   Ricetta: lvl 1 = facile, 2 = nuova da imparare; for = { pasto: id della casella } per "Mangiato a…" (pranzo/cena: main). */
window.CIBO = {
  // pasti della giornata, in ordine. skip = si può saltare. extra = facoltativo. r = ricetta collegata.
  meals: [
    { id: "col", name: "Colazione", color: "#F2C14E", opts: [
      { id: "paneuovo", t: "Pane all'uovo", d: "3 uova + 1 fetta di pane di segale, croccante in friggitrice · 3 noci a parte", p: ["toast", "noci"], r: "paneuovo", go: "c", porta: "Va mangiato appena fatto: è la colazione dei giorni a casa." },
      { id: "pancake", t: "Pancake proteici", d: "50 g di crema di riso + 30 g di proteine + 1 albume · con 3 gallette o 1 cucchiaio di yogurt", p: ["pancake"], r: "pancake", go: "p", porta: "Falli la sera prima: freddi sono buoni. Yogurt in un vasetto a parte." },
      { id: "A", t: "Torta in tazza", d: "50 g di crema di riso + 30 g di proteine + 1 albume al microonde · 3 gallette", p: ["torta", "gallette"], box: "tazza", r: "torta", go: "m", porta: "Serve il microonde. Prepara la tazza a casa con gli ingredienti secchi; al lavoro aggiungi albume e latte e 90 secondi." },
      { id: "C", t: "Yogurt crunch", d: "Yogurt intero 150 g + 60-70 g di cornflakes + cacao amaro e cannella", p: ["yogurt", "cornflakes"], box: "ciotola", r: "yogurtcrunch", go: "p", porta: "Yogurt col cacao in un barattolo, cornflakes in un sacchetto a parte: li unisci al momento." },
      { id: "A2", t: "Shaker e cornflakes", d: "Shaker con 30 g di proteine · 65 g di cornflakes (o 8 gallette, o 120 g di pane)", p: ["shaker", "cornflakes"], box: "ciotola", go: "p", porta: "Polvere già nello shaker, acqua o latte al momento. Cornflakes in un barattolo." },
      { id: "B", t: "Uova sode e segale", d: "3 uova sode · 1 fetta di pane di segale · 3 noci", p: ["uova", "pane", "noci"], r: "uova", go: "p", porta: "Uova sode sgusciate la sera prima nel contenitore, pane in un sacchetto, noci in tasca." },
    ] },
    { id: "s1", name: "Spuntino 1", color: "#8CC152", skip: true, opts: [
      { id: "pizzette", t: "Pizzette di galletta", d: "2 gallette + passata + mezza mozzarella light, 5 minuti in friggitrice", p: ["pizzetta"], r: "pizzette", go: "c", porta: "Solo a casa: dopo 10 minuti la galletta diventa molle." },
      { id: "involtini", t: "Involtini di bresaola", d: "60 g di bresaola + 2 cucchiai di fiocchi di latte + rucola · 1 galletta", p: ["bresaola", "fiocchi", "rucola"], r: "involtini", go: "p", porta: "Preparali la sera prima, in frigo; poi in borsa termica." },
      { id: "uovaripiene", t: "Uova ripiene", d: "2 uova sode ripiene di tuorlo, yogurt e paprika", p: ["uova"], r: "uovaripiene", go: "p", porta: "Preparale la sera prima, contenitore in borsa termica." },
      { id: "yog", t: "Yogurt e noci", d: "Yogurt intero 150 g + 3 noci", p: ["yogurt", "noci"], box: "ciotola", go: "p", porta: "Vasetto in borsa termica, noci in tasca." },
      { id: "bre", t: "Bresaola e gallette", d: "60 g di bresaola + 2 gallette", p: ["bresaola", "gallette"], go: "p", porta: "Bresaola in borsa termica, gallette nel sacchetto." },
      { id: "fio", t: "Fiocchi di latte", d: "1 vasetto di fiocchi di latte", p: ["fiocchi"], box: "ciotola", go: "p", porta: "Vasetto in borsa termica." },
      { id: "uov", t: "2 uova sode", d: "2 uova sode", p: ["uova"], r: "uova", go: "p", porta: "Uova sode sgusciate la sera prima, contenitore." },
      { id: "moz", t: "Mozzarella e gallette", d: "Mezza mozzarella light + 2 gallette", p: ["mozzarella", "gallette"], go: "p", porta: "Mozzarella nel suo sacchetto in borsa termica, gallette a parte." },
    ] },
    { id: "pr", name: "Pranzo", color: "#6D95FF", main: true },
    { id: "s2", name: "Spuntino 2", color: "#E8833A", skip: true,
      gym: [ // giorni di palestra: dopo l'allenamento, non si salta
        { id: "pancake", t: "Pancake + noci", d: "Pancake proteici (50 g di crema di riso + 30 g di proteine + 1 albume) + 3 gallette + 3 noci", p: ["pancake", "noci"], r: "pancake", go: "p", porta: "Falli la sera prima: freddi sono buoni." },
        { id: "A", t: "Torta in tazza + noci", d: "Torta in tazza + 3 gallette + 3 noci", p: ["torta", "gallette", "noci"], box: "tazza", r: "torta", go: "m", porta: "Serve il microonde: tazza con gli ingredienti secchi preparata a casa." },
        { id: "A2", t: "Shaker e cornflakes", d: "Shaker con 30 g di proteine + 65 g di cornflakes (o 8 gallette) + 3 noci", p: ["shaker", "cornflakes", "noci"], box: "ciotola", go: "p", porta: "Polvere già nello shaker, cornflakes in un barattolo." },
        { id: "pan", t: "Panino con bresaola", d: "110 g di pane + 60 g di bresaola + 3 noci", p: ["pane", "bresaola", "noci"], go: "p", porta: "Panino fatto a casa, in borsa termica." },
      ],
      opts: [ // giorni senza palestra
        { id: "fio", t: "Toast fiocchi e pomodorini", d: "1 fetta di segale tostata + 1 vasetto di fiocchi di latte + pomodorini e origano", p: ["toast", "fiocchi", "pomodorini"], r: "toastfiocchi", go: "p", porta: "Pane in un sacchetto, fiocchi nel vasetto e pomodorini a parte: componi al momento." },
        { id: "yog", t: "Yogurt e cornflakes", d: "Yogurt intero 150 g + 30 g di cornflakes", p: ["yogurt", "cornflakes"], box: "ciotola", go: "p", porta: "Vasetto in borsa termica, cornflakes in un sacchetto." },
        { id: "pan", t: "Pane e bresaola", d: "50 g di pane + 50 g di bresaola", p: ["pane", "bresaola"], go: "p", porta: "Panino fatto a casa, in borsa termica." },
      ] },
    { id: "ce", name: "Cena", color: "#B57EDC", main: true },
    { id: "dc", name: "Dopo cena", color: "#9AA5B1", extra: true, opts: [
      { id: "yog", t: "Yogurt e noci", d: "Yogurt intero 150 g + 3 noci", p: ["yogurt", "noci"], box: "ciotola" },
      { id: "fio", t: "Fiocchi di latte", d: "1 vasetto di fiocchi di latte", p: ["fiocchi"], box: "ciotola" },
    ] },
  ],
  // turni (20/11/2026): dove si mangia ogni pasto. casa = tutto · micro = al lavoro, solo microonde · zero = al lavoro/fuori, nessun attrezzo · mensa
  shifts: [
    { id: "mat", t: "Mattina", d: "7-15", where: { col: "zero", s1: "zero", pr: "mensa", s2: "casa", ce: "casa", dc: "casa" }, prep: "Stasera prepara la borsa per domattina: al lavoro non hai attrezzi." },
    { id: "pom", t: "Pomeriggio", d: "13-22", where: { col: "casa", s1: "casa", pr: "casa", s2: "micro", ce: "micro", dc: "casa" }, prep: "A pranzo cucina anche la cena: al lavoro hai solo il microonde." },
    { id: "rip", t: "Riposo", d: "a casa", where: { col: "casa", s1: "casa", pr: "casa", s2: "casa", ce: "casa", dc: "casa" } },
    { id: "not", t: "Notte", d: "", where: { col: "casa", s1: "casa", pr: "micro", s2: "micro", ce: "casa", dc: "casa" }, prep: "Porta il pasto e lo spuntino: al lavoro hai solo il microonde." },
  ],
  bagNote: "Yogurt, fiocchi di latte, mozzarella, bresaola e piatti cotti: borsa termica con un siberino se restano fuori dal frigo più di 2 ore.",
  // VALORI STIMATI (20/11/2026, tabelle CREA/USDA ed etichette tipiche, ±10%): [kcal, proteine, carboidrati, grassi] in g.
  // Colazioni e spuntini: per casella ("s2g" = spuntino 2 nei giorni di palestra).
  vals: {
    "col.paneuovo": [395, 26, 19, 24], "col.pancake": [437, 34, 64, 5], "col.A": [424, 33, 63, 5], "col.C": [363, 11, 62, 7], "col.A2": [360, 28, 56, 2], "col.B": [395, 26, 19, 24],
    "s1.pizzette": [164, 14, 15, 6], "s1.involtini": [161, 25, 8, 4], "s1.uovaripiene": [153, 14, 1, 10], "s1.yog": [191, 8, 7, 15], "s1.bre": [151, 20, 13, 2], "s1.fio": [150, 18, 4, 7], "s1.uov": [141, 14, 0, 10], "s1.moz": [157, 13, 13, 6],
    "s2g.pancake": [529, 36, 65, 14], "s2g.A": [516, 35, 64, 14], "s2g.A2": [451, 30, 57, 11], "s2g.pan": [479, 30, 61, 12],
    "s2.fio": [242, 21, 22, 7], "s2.yog": [212, 8, 32, 6], "s2.pan": [210, 20, 28, 2],
    "dc.yog": [191, 8, 7, 15], "dc.fio": [150, 18, 4, 7],
  },
  // Pranzo e cena: parte "proteina + verdure + olio" della ricetta per un pasto, a cui si somma il carboidrato del momento (carbCtx).
  mainVals: { pollo: [340, 50, 7, 12], pollocrock: [250, 51, 3, 4], pesce: [296, 44, 4, 12], manzo: [360, 46, 7, 16], polpette: [345, 43, 6, 16], gamberi: [315, 44, 4, 13], gnocchi: [270, 44, 4, 8], salmone: [293, 31, 2, 17], curry: [446, 48, 30, 13], risosaltato: [323, 34, 10, 15], pizzapiadina: [365, 58, 3, 14], pastatonno: [306, 38, 3, 15], frittatapasta: [328, 31, 5, 20], frittata: [328, 31, 5, 20], farro: [348, 54, 3, 13], frigo: [260, 18, 4, 20], mensa: [330, 40, 6, 14], altro: [340, 50, 7, 12] },
  carbCtx: { prG: [266, 5, 64, 0], pr: [133, 3, 32, 0], pr0: [0, 0, 0, 0], ce: [231, 6, 52, 0] },
  // Scala del PT 80 / 40 / 0 g di riso a pranzo, adattata ai turni (20/11/2026): non segue i giorni della settimana ma la palestra.
  // 80 = giorno di palestra · 40 = giorno dopo la palestra · 0 = secondo giorno di fila (o più) senza palestra.
  lunch: { 80: { t: "giorno di palestra", d: "riso 80 g · pasta 75 g" }, 40: { t: "giorno dopo la palestra", d: "riso 40 g · pasta 40 g" }, 0: { t: "2° giorno senza palestra", d: "niente carboidrato · doppia verdura" } },
  // Totale del piano per la giornata (Fase 2): con e senza palestra.
  target: { gym: [2180, 175, 255, 50], rest: [1830, 165, 190, 46], rest0: [1700, 162, 158, 46] },
  // caselle in più per pranzo e cena, oltre alle ricette
  mainExtra: [
    { id: "mensa", t: "Mensa", d: "Un secondo normale + verdure a volontà. Primo: porzione normale nei giorni di palestra, mezza il giorno dopo, niente primo (doppio contorno) dal 2° giorno senza palestra. Niente fritti, panna o pane in più.", p: ["pasta", "pollo", "verdure"], only: "pr" },
    { id: "libero", t: "Pasto libero", d: "Fa parte del piano: 2 a settimana (la pizza del sabato + uno a scelta). Non si compensa.", free: true },
    { id: "altro", t: "Altro piatto", d: "Un carboidrato + una proteina + verdure + 1 cucchiaio d'olio, dalle tabelle degli scambi.", p: ["riso", "pollo", "insalata"] },
  ],

  recipes: [
    // ---------- PRANZO E CENA ----------
    { id: "pollo", go: "m", porta: "Il pasto 2 nel contenitore di vetro: al lavoro 2-3 minuti al microonde, coperto.", s: "Pollo 2 gusti", name: "Pollo in friggitrice, due gusti", min: 20, lvl: 1, tools: "friggitrice + ciotola", main: true, p: ["pollo", "verdure", "riso"],
      ingr: ["400 g di petto di pollo (meglio già a bocconcini)", "400 g di verdure grigliate surgelate", "1 limone, origano, aglio in polvere", "Paprika affumicata, peperoncino, cipolla in polvere", "Sale, olio in spruzzino, carta forno"],
      steps: [
        { tool: "friggitrice", t: "Accendi la friggitrice a 200 °C, vuota, per 3 minuti: si scalda e il pollo viene più dorato.", min: 3 },
        { tool: "tagliere", p: ["pollo"], t: "Se il petto è intero: taglialo a cubetti grandi come una noce, tutti più o meno uguali.", tip: "Pezzi uguali cuociono insieme: se ne fai alcuni grossi, restano crudi dentro." },
        { tool: "ciotola", p: ["pollo"], t: "Metà pollo nella ciotola: un pizzico di sale (quanto prendi con 3 dita), succo di mezzo limone, 1 cucchiaino di origano, mezzo di aglio. Mescola con un cucchiaio e mettilo su metà della carta forno." },
        { tool: "ciotola", p: ["pollo"], t: "Stessa ciotola, l'altra metà: sale, 1 cucchiaino di paprika affumicata, un pizzico di peperoncino e di cipolla. Mescola e mettilo sull'altra metà della carta." },
        { tool: "friggitrice", p: ["pollo", "verdure"], t: "Aggiungi le verdure surgelate (senza scongelarle), 5-6 spruzzate d'olio su tutto. 200 °C per 16-18 minuti; a metà apri e mescola o scuoti il cestello.", min: 17, ok: "Taglia il pezzo più grosso: dentro è tutto bianco, niente rosa, e il sugo che esce è trasparente.", tip: "Non riempire troppo il cestello: se i pezzi sono uno sopra l'altro bollono invece di dorarsi." },
        { tool: "contenitore", p: ["pollo", "verdure"], t: "Dividi nei 2 contenitori, un gusto per pasto. Quello per dopo va in frigo appena è tiepido (entro un'ora)." },
      ],
      p1: "Pollo al limone + riso del cuociriso", p2: "Pollo alla paprika + patate al microonde (cubetti coperti, 8-10 min)", olio: "1 cucchiaio a pasto in tutto" },
    { id: "pollocrock", go: "m", porta: "Il pasto 2 nel contenitore: al microonde 2 minuti (perde un po' di croccantezza, resta buono).", s: "Pollo croccante", name: "Pollo croccante ai cornflakes", min: 20, lvl: 2, tools: "friggitrice + 2 piatti fondi", main: true, p: ["cotoletta", "insalata", "patate"],
      ingr: ["400 g di petto di pollo a fettine", "2 albumi (o 1 uovo intero)", "60 g di cornflakes", "Paprika, sale, pepe, aglio in polvere", "Olio in spruzzino, carta forno"],
      steps: [
        { tool: "friggitrice", t: "Accendi la friggitrice a 200 °C per 3 minuti.", min: 3 },
        { tool: "ciotola", p: ["cornflakes"], t: "Metti i cornflakes in un sacchetto di plastica, chiudilo e schiacciali col palmo o con un bicchiere: devono diventare briciole, non polvere. Versali in un piatto fondo con 1 cucchiaino di paprika, sale e un pizzico d'aglio." },
        { tool: "ciotola", p: ["uova"], t: "In un altro piatto fondo sbatti gli albumi con una forchetta per 20 secondi, con un pizzico di sale." },
        { tool: "tagliere", p: ["cotoletta"], t: "Una fettina alla volta: passala nell'albume (bagnata da tutte e due le parti), poi nei cornflakes premendo con la mano perché si attacchino bene.", tip: "Usa una mano per l'albume e l'altra per i cornflakes: così non ti si impastano le dita." },
        { tool: "friggitrice", p: ["cotoletta"], t: "Fettine sulla carta forno senza sovrapporle, spruzza olio sopra. 200 °C per 12-14 minuti, girale a metà e spruzza ancora un po'.", min: 13, ok: "Fuori dorate e croccanti; tagliando la parte più spessa, dentro è bianca." },
      ],
      p1: "Con insalata. La panatura vale metà del carboidrato: nei giorni di palestra aggiungi 175 g di patate (o 40 g di riso), negli altri niente", p2: "A cena: con 150 g di patate al microonde e insalata", olio: "solo lo spruzzino" },
    { id: "pesce", go: "m", porta: "Pasto 2: wrap già arrotolato nella carta forno, si mangia anche freddo; oppure pesce e cous cous nel contenitore, 2 minuti al microonde.", s: "Pesce bianco", name: "Pesce bianco mediterraneo e messicano", min: 20, lvl: 1, tools: "friggitrice + bollitore", main: true, p: ["pesce", "pomodorini", "cous"],
      ingr: ["500 g di filetti di merluzzo o platessa surgelati", "250 g di pomodorini", "1 cucchiaio di capperi, origano, 1 limone", "Paprika, cumino, aglio in polvere, 1 lime", "Pasto 1: cous cous · Pasto 2: 1 piadina, insalata in busta, 2 cucchiai di yogurt"],
      steps: [
        { tool: "friggitrice", t: "Friggitrice a 190 °C per 3 minuti.", min: 3 },
        { tool: "friggitrice", p: ["pesce", "pomodorini"], t: "Filetti ancora surgelati sulla carta forno. Su metà: pomodorini tagliati a metà, capperi sciacquati, origano, sale e qualche goccia di limone.", tip: "Non serve scongelarli: scongelati perdono acqua e si sfaldano." },
        { tool: "friggitrice", p: ["pesce"], t: "Sull'altra metà: un pizzico di sale, paprika, cumino, aglio e succo di lime. Spruzzata d'olio su tutto, 190 °C per 15-18 minuti.", min: 16, ok: "Il pesce è bianco opaco (non più trasparente) e si sfalda se lo tocchi con la forchetta." },
        { tool: "bollitore", p: ["cous"], t: "Pasto 1: cous cous in una ciotola, sale, acqua bollente appena sopra il livello del cous cous. Copri con un piatto per 5 minuti, poi sgrana con la forchetta.", min: 5, tip: "Poca acqua: se lo affoghi diventa una pappa." },
        { tool: "ciotola", p: ["yogurt"], t: "Pasto 2: salsa con 2 cucchiai di yogurt, succo di mezzo lime, sale e peperoncino. Scalda la piadina 1 minuto in padella, mettici insalata, pesce e salsa, e arrotolala." },
      ],
      p1: "Pesce alla mediterranea + cous cous", p2: "Wrap di pesce messicano con insalata e salsa allo yogurt", olio: "pasto 1: 1 cucchiaio · pasto 2: niente (la piadina basta)" },
    { id: "manzo", go: "m", porta: "Fajitas col riso nel contenitore: 2 minuti al microonde. La tagliata è buona anche fredda.", s: "Straccetti di manzo", name: "Straccetti di manzo: tagliata e fajitas", min: 12, lvl: 2, tools: "una padella", main: true, p: ["manzo", "rucola", "pomodorini"],
      ingr: ["400 g di straccetti di manzo", "Rucola e pomodorini", "200 g di peperoni surgelati a strisce", "Paprika, cumino, peperoncino", "Aceto balsamico, sale, pepe"],
      steps: [
        { tool: "tagliere", p: ["manzo"], t: "Asciuga gli straccetti con carta da cucina, tamponando.", tip: "Se sono bagnati non si rosolano: bollono e diventano grigi e duri." },
        { tool: "padella", t: "Padella vuota sul fuoco alto per 2 minuti, poi 1 cucchiaino d'olio steso con carta da cucina.", min: 2, ok: "Una goccia d'acqua sulla padella sfrigola e salta subito." },
        { tool: "padella", p: ["manzo"], t: "Metà straccetti in un solo strato. Non toccarli per 1 minuto e mezzo, poi girali e lasciali un altro minuto. Sale e pepe solo alla fine.", min: 3, ok: "Fuori marrone, dentro ancora rosato.", tip: "La carne a straccetti cuoce in 2-3 minuti: di più diventa una suola." },
        { tool: "piatto", p: ["manzo", "rucola", "pomodorini"], t: "Pasto 1: mettili su rucola e pomodorini, con un filo di aceto balsamico." },
        { tool: "padella", p: ["verdure", "manzo"], t: "Stessa padella, fuoco medio: peperoni con paprika, cumino e peperoncino per 5 minuti mescolando. Poi l'altra metà degli straccetti per 2 minuti.", min: 7 },
      ],
      p1: "Tagliata su rucola e pomodorini + pane", p2: "Fajitas con peperoni + riso, o arrotolate nella piadina (senza olio)", olio: "1 cucchiaio a pasto in tutto" },
    { id: "polpette", go: "m", porta: "Polpette al sugo nel contenitore: 2-3 minuti al microonde, coperte.", s: "Polpette", name: "Polpette in friggitrice, due sughi", min: 20, lvl: 1, tools: "ciotola + friggitrice", main: true, p: ["polpette", "insalata", "patate"],
      ingr: ["400 g di macinato magro (5-7% di grassi)", "1 albume", "1 spicchio d'aglio o aglio in polvere, prezzemolo o origano, sale", "Facoltativo: 1 cucchiaio di pangrattato", "Pasto 2: 150 g di passata, origano, peperoncino"],
      steps: [
        { tool: "friggitrice", t: "Friggitrice a 190 °C per 3 minuti.", min: 3 },
        { tool: "ciotola", p: ["polpette"], t: "Nella ciotola macinato, albume, sale (mezzo cucchiaino), aglio ed erbe. Impasta con le mani per 1 minuto finché è tutto unito.", tip: "Mani bagnate d'acqua: l'impasto non si attacca." },
        { tool: "tagliere", p: ["polpette"], t: "Forma 10-12 palline grandi come una noce grossa, schiacciale appena." },
        { tool: "friggitrice", p: ["polpette"], t: "Sulla carta forno, distanziate. 190 °C per 12 minuti, girale a metà.", min: 12, ok: "Spezzane una: dentro niente rosso, solo marrone." },
        { tool: "microonde", p: ["polpette", "sugo"], t: "Pasto 2: polpette nel contenitore di vetro con la passata, origano, sale e peperoncino. Coperte, 3 minuti al microonde.", min: 3 },
      ],
      p1: "Polpette con insalata e limone + patate o pane", p2: "Polpette al sugo piccante + riso o pasta", olio: "mezzo cucchiaio a crudo per pasto" },
    { id: "gamberi", go: "m", porta: "Gamberi e cous cous nel contenitore: 1-2 minuti al microonde (di più diventano gommosi).", s: "Gamberi", name: "Gamberi: pasta e paprika", min: 15, lvl: 1, tools: "pentola + padella", main: true, p: ["pasta", "gamberi", "verdure"],
      ingr: ["500 g di gamberi sgusciati surgelati", "1 zucchina (o 200 g di zucchine surgelate)", "Aglio, peperoncino, prezzemolo, paprika", "Pasta per il pasto 1"],
      steps: [
        { tool: "contenitore", p: ["gamberi"], t: "La sera prima metti i gamberi in frigo a scongelare. Se te lo dimentichi: in un colino sotto l'acqua fredda per 5 minuti." },
        { tool: "pentola", p: ["pasta"], t: "Pentola con 1 litro d'acqua: quando bolle forte, 1 cucchiaino di sale e la pasta. Mescola subito.", ok: "Assaggiala 1 minuto prima del tempo scritto sulla confezione: morbida ma non molle." },
        { tool: "padella", p: ["verdure", "gamberi"], t: "Intanto: padella a fuoco medio, 1 cucchiaino d'olio, aglio e peperoncino 30 secondi, zucchine a rondelle sottili 4 minuti. Poi i gamberi asciugati, 3 minuti.", min: 7, ok: "I gamberi da grigi diventano rosa-arancio e si piegano a C.", tip: "Se si chiudono a O sono troppo cotti e diventano gommosi." },
        { tool: "contenitore", p: ["gamberi"], t: "Metti da parte metà dei gamberi con 1 cucchiaino di paprika: pasto 2." },
        { tool: "piatto", p: ["pasta", "gamberi", "verdure"], t: "Scola la pasta e versala in padella col resto: mescola 30 secondi a fuoco acceso, prezzemolo sopra." },
      ],
      p1: "Pasta gamberi, zucchine e peperoncino", p2: "Gamberi alla paprika + cous cous o patate", olio: "1 cucchiaio a pasto in tutto" },
    { id: "gnocchi", go: "c", porta: "Da mangiare appena fatti: riscaldati perdono la croccantezza.", s: "Gnocchi croccanti", name: "Gnocchi croccanti con gamberi", min: 18, lvl: 2, tools: "friggitrice", main: true, one: true, p: ["gnocchi", "gamberi", "verdure"],
      ingr: ["Gnocchi di patate da frigo: 200 g nei giorni di palestra, 100 g negli altri, 150 g a cena", "250 g di gamberi sgusciati (scongelati)", "1 zucchina a rondelle", "1 cucchiaino d'olio, paprika, sale, prezzemolo"],
      steps: [
        { tool: "friggitrice", t: "Friggitrice a 200 °C per 3 minuti.", min: 3 },
        { tool: "ciotola", p: ["gnocchi"], t: "Gnocchi crudi (non vanno bolliti!) in una ciotola con 1 cucchiaino d'olio e un pizzico di sale: mescola bene.", tip: "È questo il trucco: in friggitrice da crudi diventano croccanti fuori e morbidi dentro." },
        { tool: "friggitrice", p: ["gnocchi"], t: "Gnocchi nel cestello su carta forno, 200 °C per 10 minuti; scuoti il cestello a metà.", min: 10 },
        { tool: "friggitrice", p: ["gnocchi", "gamberi", "verdure"], t: "Aggiungi gamberi asciugati e zucchine con paprika e sale, mescola, altri 6-7 minuti.", min: 7, ok: "Gnocchi dorati e gamberi rosa piegati a C." },
      ],
      p1: "Un pasto completo: gnocchi croccanti, gamberi e zucchine", olio: "solo il cucchiaino degli gnocchi" },
    { id: "salmone", go: "m", porta: "Salmone e patate dolci nel contenitore: 2 minuti al microonde.", s: "Salmone", name: "Salmone e patate dolci", min: 22, lvl: 1, tools: "friggitrice", main: true, p: ["salmone", "pdolci", "insalata"],
      ingr: ["2 tranci di salmone da 150 g", "500-550 g di patate dolci", "1 limone, erbe (prezzemolo o erbe di Provenza)", "Paprika, aglio, cipolla in polvere, peperoncino (cajun)"],
      steps: [
        { tool: "tagliere", p: ["pdolci"], t: "Sbuccia le patate dolci col pelapatate e tagliale a cubetti di 2 cm, tutti uguali." },
        { tool: "friggitrice", p: ["pdolci"], t: "Cubetti sulla carta forno con sale e 4-5 spruzzate d'olio, 200 °C per 8 minuti.", min: 8 },
        { tool: "friggitrice", p: ["pdolci", "salmone"], t: "Aggiungi i tranci con la pelle in giù: uno con sale, limone ed erbe, l'altro con paprika, aglio, cipolla e peperoncino. Altri 10-12 minuti.", min: 11, ok: "Il salmone si stacca a scaglie e al centro è rosa chiaro, non più lucido; le patate si infilzano senza sforzo." },
      ],
      p1: "Salmone al limone + patate dolci + insalata", p2: "Salmone cajun + patate dolci + insalata", olio: "niente: il salmone ha già i suoi grassi" },
    { id: "curry", go: "m", porta: "Nel contenitore di vetro: 2-3 minuti al microonde, mescola a metà.", s: "Curry ceci e pollo", name: "Curry di ceci e pollo", min: 15, lvl: 2, tools: "una padella", main: true, p: ["ceci", "pollo", "spinaci", "riso"],
      ingr: ["300 g di pollo a cubetti (200 g nei giorni di palestra)", "300 g di ceci sgocciolati (200 g nei giorni di palestra)", "200 g di passata", "150 g di spinaci surgelati", "1 cucchiaino di curry, mezzo di paprika, peperoncino, sale"],
      steps: [
        { tool: "padella", p: ["pollo"], t: "Padella a fuoco medio-alto con 1 cucchiaino d'olio. Pollo con un pizzico di sale per 5 minuti, mescolando ogni tanto.", min: 5, ok: "I cubetti sono bianchi fuori su tutti i lati." },
        { tool: "padella", p: ["pollo", "ceci", "spinaci", "sugo"], t: "Aggiungi ceci sciacquati, passata, spinaci surgelati, curry, paprika e peperoncino. Fuoco medio, 7 minuti mescolando.", min: 7, ok: "Il sugo si è un po' addensato e gli spinaci sono sciolti.", tip: "Se si attacca, aggiungi mezzo bicchiere d'acqua." },
        { tool: "contenitore", p: ["ceci", "pollo"], t: "Dividi in 2: il pasto 1 col riso; il pasto 2 con la pasta, diventa una pasta e ceci col pollo." },
      ],
      p1: "Curry + 40 g di riso (80 nei giorni di palestra)", p2: "Pasta e ceci col pollo (40 g di pasta) o con 50 g di pane", olio: "1 cucchiaio a pasto in tutto" },
    { id: "risosaltato", go: "m", porta: "Nel contenitore: 2 minuti al microonde con un cucchiaio d'acqua sopra.", s: "Riso saltato", name: "Riso saltato con uova e verdure", min: 12, lvl: 2, tools: "una padella", main: true, one: true, p: ["riso", "strapazzate", "piselli"],
      ingr: ["1 porzione di riso già cotto e freddo (dal cuociriso: da 80 g o 40 g crudi)", "2 uova + 150 g di albume", "150 g di verdure surgelate miste (piselli, carote)", "1 cucchiaio di salsa di soia, 1 cucchiaino d'olio, pepe"],
      steps: [
        { tool: "padella", p: ["verdure"], t: "Padella a fuoco medio-alto con 1 cucchiaino d'olio: verdure surgelate per 4 minuti.", min: 4 },
        { tool: "padella", p: ["strapazzate"], t: "Spostale da un lato. Dall'altro versa uova e albume sbattuti: mescola piano con la paletta finché si rapprendono a pezzetti (1-2 minuti).", min: 2 },
        { tool: "padella", p: ["riso", "strapazzate", "piselli"], t: "Aggiungi il riso freddo sgranato con le mani e la salsa di soia. Mescola tutto 3 minuti a fuoco alto.", min: 3, ok: "Il riso è caldo e qualche chicco è appena tostato.", tip: "Il riso del giorno prima è il segreto: quello appena cotto diventa una colla." },
      ],
      p1: "Un pasto completo, ottimo per finire il riso del cuociriso", olio: "il cucchiaino in padella; la soia non aggiunge grassi" },
    { id: "pizzapiadina", go: "c", porta: "Da mangiare appena fatta: riscaldata diventa molle.", s: "Pizza di piadina", name: "Pizza di piadina in friggitrice", min: 8, lvl: 2, tools: "friggitrice", main: true, one: true, p: ["pizza"],
      ingr: ["1 piadina (a cena: ¾, togli una striscia)", "3 cucchiai di passata", "1 mozzarella light (125 g)", "100 g di bresaola (dopo la cottura) o di pollo avanzato", "Origano, rucola, sale"],
      steps: [
        { tool: "tagliere", p: ["mozzarella"], t: "Mozzarella a cubetti e lasciala su un foglio di carta da cucina 5 minuti: perde l'acqua.", tip: "Senza questo passaggio la piadina diventa molle." },
        { tool: "piatto", p: ["piadina", "sugo"], t: "Piadina sulla carta forno: passata stesa col dorso del cucchiaio fino a 1 cm dal bordo, sale e origano." },
        { tool: "friggitrice", p: ["pizza"], t: "Aggiungi la mozzarella (e il pollo, se usi quello). 200 °C per 5-6 minuti.", min: 6, ok: "Mozzarella sciolta e bordi della piadina dorati e croccanti." },
        { tool: "piatto", p: ["pizza", "bresaola", "rucola"], t: "Fuori dalla friggitrice: bresaola e rucola sopra, a crudo." },
      ],
      p1: "Una pizza vera dentro il piano: piadina + mozzarella light + bresaola", olio: "niente: piadina e mozzarella hanno già i grassi" },
    { id: "pastatonno", go: "p", porta: "Versione fredda: perfetta da portare, non serve niente.", s: "Pasta al tonno", name: "Pasta al tonno, calda o fredda", min: 12, lvl: 1, tools: "una pentola", main: true, p: ["pasta", "tonno", "pomodorini"],
      ingr: ["Pasta: 75 g nei giorni di palestra, 40 negli altri, 65 a cena", "150 g di tonno sott'olio ben sgocciolato (circa 2 scatolette da 80 g)", "Pomodorini, 1 cucchiaio di capperi, peperoncino", "Versione fredda: rucola e origano"],
      steps: [
        { tool: "pentola", p: ["pasta"], t: "1 litro d'acqua ogni 100 g di pasta. Quando bolle forte, 1 cucchiaino di sale, poi la pasta. Mescola nel primo minuto così non si attacca.", ok: "Assaggia 1 minuto prima del tempo della confezione: morbida ma con un cuore ancora consistente." },
        { tool: "contenitore", p: ["tonno", "pomodorini"], t: "Intanto: tonno sgocciolato schiacciando il coperchio sulla scatoletta, pomodorini a metà, capperi sciacquati, peperoncino. Tutto nel contenitore." },
        { tool: "piatto", p: ["pasta", "tonno", "pomodorini"], t: "Calda: scola e mescola subito col condimento. Fredda: scolala, passala 10 secondi sotto l'acqua fredda, poi aggiungi tonno, pomodorini, rucola e origano." },
      ],
      p1: "Pasta al tonno calda", p2: "Pasta al tonno fredda con rucola, da portare", olio: "niente: basta quello del tonno" },
    { id: "frittatapasta", go: "p", porta: "Buona anche fredda: tagliata a spicchi nel contenitore.", s: "Frittata di pasta", name: "Frittata di pasta in friggitrice", min: 18, lvl: 2, tools: "ciotola + friggitrice", main: true, one: true, p: ["frittata", "pasta", "pomodorini"],
      ingr: ["1 porzione di pasta già cotta (anche avanzata dal giorno prima)", "2 uova + 150 g di albume", "Pomodorini, origano o paprika, sale, pepe", "Uno stampo da forno piccolo o la carta forno a vaschetta"],
      steps: [
        { tool: "ciotola", p: ["uova"], t: "Sbatti uova e albume con sale, pepe e origano per 30 secondi." },
        { tool: "ciotola", p: ["pasta"], t: "Aggiungi la pasta e mescola finché è tutta bagnata d'uovo." },
        { tool: "friggitrice", p: ["frittata", "pomodorini"], t: "Versa nello stampo o nella carta forno piegata a vaschetta, pomodorini sopra. 180 °C per 14-16 minuti.", min: 15, ok: "Muovi lo stampo: il centro non trema più ed è dorato sopra.", tip: "Se sopra si colora troppo e dentro è ancora molle, copri con un pezzo di carta forno." },
      ],
      p1: "Buona calda e fredda: perfetta da portare al lavoro", olio: "1 cucchiaio a crudo con l'insalata" },
    { id: "frittata", go: "p", porta: "Buona anche fredda: nel contenitore con il pane a parte.", s: "Frittata", name: "Frittata di verdure in friggitrice", min: 15, lvl: 1, tools: "ciotola + friggitrice", main: true, one: true, p: ["frittata", "pane", "insalata"],
      ingr: ["2 uova + 150 g di albume", "150 g di verdure surgelate (spinaci, zucchine o peperoni)", "Sale, pepe, origano o paprika"],
      steps: [
        { tool: "microonde", p: ["spinaci"], t: "Verdure surgelate nel contenitore, 3 minuti al microonde. Poi strizzale col cucchiaio e butta l'acqua.", min: 3, tip: "Se non le strizzi, la frittata viene acquosa." },
        { tool: "ciotola", p: ["uova", "spinaci"], t: "Sbatti uova, albume, sale e spezie, aggiungi le verdure." },
        { tool: "friggitrice", p: ["frittata"], t: "Versa in uno stampino o nella carta forno a vaschetta. 180 °C per 10-12 minuti.", min: 11, ok: "Il centro non trema e i bordi sono dorati." },
      ],
      p1: "Frittata + pane o patate + insalata (anche fredda da portare)", olio: "1 cucchiaio" },
    { id: "farro", go: "p", porta: "Pronta da mangiare fredda, in borsa termica.", s: "Farro freddo", name: "Insalata fredda di farro", min: 5, lvl: 1, tools: "un contenitore", main: true, one: true, p: ["farro", "mozzarella", "pomodorini", "rucola"],
      ingr: ["170 g di farro o orzo precotto in busta (85 g nei giorni senza palestra)", "1 mozzarella light", "100 g di pollo avanzato o di bresaola", "Pomodorini, rucola, origano, sale"],
      steps: [
        { tool: "contenitore", p: ["farro", "mozzarella", "pomodorini", "rucola"], t: "Apri la busta e sgrana il farro con la forchetta nel contenitore. Aggiungi mozzarella a cubetti, pollo o bresaola a striscioline, pomodorini a metà, rucola, origano e un pizzico di sale. Mescola." },
      ],
      p1: "Vale un pranzo da 80. Si tiene in frigo fino al giorno dopo", olio: "niente o mezzo cucchiaio: la mozzarella ha già grassi" },
    { id: "frigo", go: "p", porta: "Si compone nel contenitore la sera prima, in borsa termica.", s: "Frigo vuoto", name: "Piatto frigo vuoto", min: 5, lvl: 1, tools: "un contenitore", main: true, one: true, p: ["riso", "uova", "insalata"],
      ingr: ["1 porzione di carboidrati già pronta (riso del cuociriso, busta precotta o pane)", "2 uova sode + 1 albume, oppure 100 g di bresaola + 1 vasetto di fiocchi di latte", "Verdure in busta"],
      steps: [
        { tool: "contenitore", p: ["riso", "uova", "insalata"], t: "Componi il piatto con quello che hai già pronto: carboidrato, proteina, verdure, 1 cucchiaio d'olio." },
      ],
      p1: "Per i giorni in cui non hai cucinato niente", olio: "1 cucchiaio" },

    // ---------- COLAZIONE ----------
    { id: "paneuovo", go: "c", porta: "Va mangiato appena fatto: è la colazione dei giorni a casa.", s: "Pane all'uovo", name: "Pane di segale all'uovo croccante", min: 12, lvl: 1, tools: "piatto fondo + friggitrice", for: { col: "paneuovo" }, cat: "col", p: ["toast", "noci"],
      ingr: ["3 uova", "1 fetta di pane di segale", "Sale, pepe, paprika o origano", "Olio in spruzzino, carta forno", "3 noci a parte"],
      steps: [
        { tool: "friggitrice", t: "Friggitrice a 180 °C per 3 minuti.", min: 3 },
        { tool: "ciotola", p: ["uova"], t: "In un piatto fondo sbatti le 3 uova con un pizzico di sale e pepe per 20 secondi." },
        { tool: "ciotola", p: ["toast", "uova"], t: "Taglia la fetta in 2-3 strisce e appoggiale nell'uovo: 30 secondi per lato, finché il pane ha assorbito.", tip: "Il pane di segale è compatto: lascialo un po' di più, deve diventare morbido." },
        { tool: "friggitrice", p: ["toast"], t: "Piega la carta forno a vaschetta (bordi alzati), metti il pane e versaci sopra l'uovo rimasto. Paprika sopra, 2 spruzzate d'olio. 180 °C per 8-10 minuti, girando dopo 5.", min: 9, ok: "Crosticina dorata e l'uovo non è più lucido." },
      ],
      p1: "Ricetta tua: colazione B in versione croccante. Con 3 noci a parte" },
    { id: "pancake", go: "p", porta: "Falli la sera prima: freddi sono buoni. Yogurt in un vasetto a parte.", s: "Pancake", name: "Pancake proteici in padella", min: 10, lvl: 2, tools: "ciotola + padella", for: { col: "pancake", s2: "pancake" }, cat: "col", p: ["pancake"],
      ingr: ["50 g di crema di riso", "30 g di proteine in polvere", "1 albume (30 g)", "Mezzo cucchiaino di lievito per dolci", "60-80 ml di latte o acqua, cannella", "Sopra: 1 cucchiaio di yogurt e un pizzico di cacao amaro"],
      steps: [
        { tool: "ciotola", p: ["proteine"], t: "Nella ciotola crema di riso, proteine, lievito e cannella. Aggiungi l'albume e il latte poco alla volta, mescolando con la forchetta.", ok: "La pastella cola lenta dal cucchiaio, come uno yogurt.", tip: "Troppo densa: un goccio di latte. Troppo liquida: un cucchiaino di crema di riso." },
        { tool: "padella", t: "Padella antiaderente a fuoco medio-basso per 2 minuti, una goccia d'olio stesa con carta da cucina.", min: 2 },
        { tool: "padella", p: ["pancake"], t: "2 cucchiai di pastella per pancake (ne vengono 4-5). Aspetta che in superficie compaiano le bollicine, poi gira con la paletta.", min: 2, ok: "Bollicine sopra e bordi asciutti = è ora di girare. L'altro lato: 1 minuto." },
        { tool: "piatto", p: ["pancake"], t: "Impilali, sopra yogurt e cacao." },
      ],
      p1: "Colazione: con 3 gallette o 1 cucchiaio di yogurt · Dopo la palestra: + 3 gallette + 3 noci" },
    { id: "torta", go: "m", porta: "Serve il microonde: tazza con gli ingredienti secchi preparata a casa, al lavoro aggiungi albume e latte.", s: "Torta in tazza", name: "Torta in tazza", min: 3, lvl: 1, tools: "tazza grande + microonde", for: { col: "A", s2: "A" }, cat: "col", box: "tazza", p: ["torta"],
      ingr: ["50 g di crema di riso", "30 g di proteine in polvere", "1 albume (30 g)", "Mezzo cucchiaino di lievito per dolci", "Latte o acqua quanto basta", "Cannella o 1 cucchiaino di cacao amaro"],
      steps: [
        { tool: "ciotola", p: ["torta"], t: "Nella tazza grande (deve restare vuota per metà: la torta cresce): crema di riso, proteine, lievito e cannella. Poi albume e latte un po' alla volta, mescolando.", ok: "Pastella densa, che scende lenta dal cucchiaio." },
        { tool: "microonde", p: ["torta"], t: "Microonde a piena potenza per 90 secondi. Se il centro è ancora bagnato, altri 20 secondi.", min: 2, ok: "Si è gonfiata e uno stuzzicadenti esce quasi asciutto.", tip: "Non andare oltre: troppo cotta diventa gommosa." },
      ],
      p1: "Se non ti piace: shaker con 65 g di cornflakes al posto della crema di riso" },
    { id: "yogurtcrunch", go: "p", porta: "Yogurt col cacao in un barattolo, cornflakes in un sacchetto: li unisci al momento.", s: "Yogurt crunch", name: "Yogurt crunch al cacao", min: 2, lvl: 1, tools: "un barattolo", for: { col: "C" }, cat: "col", box: "ciotola", p: ["yogurt", "cornflakes"],
      ingr: ["Yogurt intero bianco 150 g", "60-70 g di cornflakes", "1 cucchiaino di cacao amaro, cannella"],
      steps: [
        { tool: "ciotola", p: ["yogurt"], t: "Mescola lo yogurt con cacao e cannella: diventa una crema al cioccolato senza zucchero aggiunto." },
        { tool: "contenitore", p: ["cornflakes"], t: "Se lo porti al lavoro: cornflakes in un sacchetto o barattolo a parte, e li versi sopra solo al momento.", tip: "Messi insieme la sera prima diventano molli." },
      ],
      p1: "Colazione C, in 2 minuti" },

    // ---------- SPUNTINI ----------
    { id: "pizzette", go: "c", porta: "Solo a casa: dopo 10 minuti la galletta diventa molle.", s: "Pizzette", name: "Pizzette di galletta", min: 7, lvl: 2, tools: "friggitrice", for: { s1: "pizzette" }, cat: "sp", p: ["pizzetta"],
      ingr: ["2 gallette di riso", "2 cucchiai di passata", "Mezza mozzarella light", "Origano, sale"],
      steps: [
        { tool: "tagliere", p: ["mozzarella"], t: "Mozzarella a cubetti piccoli, asciugata con carta da cucina." },
        { tool: "piatto", p: ["gallette", "sugo"], t: "Su ogni galletta 1 cucchiaio di passata (sottile, non deve colare), sale e origano, poi la mozzarella." },
        { tool: "friggitrice", p: ["gallette", "mozzarella"], t: "Sulla carta forno, 180 °C per 4-5 minuti.", min: 5, ok: "Mozzarella sciolta e bordi delle gallette appena dorati.", tip: "Mangiale subito: dopo 10 minuti la galletta si ammorbidisce." },
      ],
      p1: "Spuntino da 160 kcal circa che sembra una pizza" },
    { id: "involtini", go: "p", porta: "Preparali la sera prima, in frigo; poi in borsa termica.", s: "Involtini", name: "Involtini di bresaola", min: 5, lvl: 1, tools: "un piatto", for: { s1: "involtini" }, cat: "sp", p: ["bresaola", "fiocchi", "rucola"],
      ingr: ["60 g di bresaola (5-6 fette)", "2 cucchiai di fiocchi di latte", "Un pugno di rucola", "Limone, pepe", "1 galletta a parte"],
      steps: [
        { tool: "ciotola", p: ["fiocchi"], t: "Fiocchi di latte con qualche goccia di limone e pepe." },
        { tool: "piatto", p: ["bresaola", "fiocchi", "rucola"], t: "Su ogni fetta di bresaola: mezzo cucchiaino di fiocchi e 3-4 foglie di rucola vicino al bordo. Arrotola stretto.", tip: "Poco ripieno per fetta, altrimenti si apre." },
      ],
      p1: "Si prepara anche la sera prima: in frigo nel contenitore" },
    { id: "uovaripiene", go: "p", porta: "Preparale la sera prima, contenitore in borsa termica.", s: "Uova ripiene", name: "Uova ripiene alla paprika", min: 5, lvl: 2, tools: "una ciotolina", for: { s1: "uovaripiene" }, cat: "sp", p: ["uova"],
      ingr: ["2 uova sode (dal lotto della settimana)", "1 cucchiaio di yogurt intero", "Mezzo cucchiaino di senape, sale, paprika"],
      steps: [
        { tool: "tagliere", p: ["uova"], t: "Sguscia le uova e tagliale a metà per il lungo. Togli i tuorli con un cucchiaino." },
        { tool: "ciotola", p: ["uova"], t: "Schiaccia i tuorli con la forchetta insieme a yogurt, senape e sale: deve venire una crema liscia." },
        { tool: "piatto", p: ["uova"], t: "Rimetti la crema nei bianchi con il cucchiaino, paprika sopra." },
      ],
      p1: "Sembrano un antipasto da festa, sono uno spuntino da 150 kcal" },
    { id: "toastfiocchi", go: "p", porta: "Pane in un sacchetto, fiocchi e pomodorini a parte: componi al momento.", s: "Toast fiocchi", name: "Toast di segale con fiocchi e pomodorini", min: 5, lvl: 1, tools: "friggitrice o tostapane", for: { s2: "fio" }, cat: "sp", p: ["toast", "fiocchi", "pomodorini"],
      ingr: ["1 fetta di pane di segale", "1 vasetto di fiocchi di latte", "4-5 pomodorini, origano, pepe, sale"],
      steps: [
        { tool: "friggitrice", p: ["pane"], t: "Fetta di segale in friggitrice a 200 °C per 3 minuti (o nel tostapane).", min: 3, ok: "Croccante ai bordi." },
        { tool: "piatto", p: ["toast", "fiocchi", "pomodorini"], t: "Sopra: fiocchi di latte, pomodorini a spicchi, sale, pepe e origano." },
      ],
      p1: "Spuntino 2 dei giorni senza palestra" },

    // ---------- LE BASI ----------
    { id: "uova", go: "p", porta: "Sgusciale la sera prima e mettile nel contenitore.", s: "Uova sode", name: "Uova sode a lotti", min: 15, lvl: 1, tools: "una pentola", for: { col: "B", s1: "uov" }, cat: "base", p: ["uova"],
      ingr: ["6 uova"],
      steps: [
        { tool: "pentola", p: ["uova"], t: "Uova nella pentola, coperte d'acqua fredda (2 dita sopra le uova). Fuoco alto.", tip: "Uova appena tolte dal frigo nell'acqua già bollente si crepano: parti sempre da fredda." },
        { tool: "pentola", p: ["uova"], t: "Quando l'acqua bolle, abbassa a fuoco medio e conta 9 minuti.", min: 9 },
        { tool: "ciotola", p: ["uova"], t: "Toglile col cucchiaio e mettile in una ciotola d'acqua fredda per 5 minuti.", ok: "Fredde si sgusciano facilmente. In frigo col guscio durano 4-5 giorni." },
      ] },
    { id: "riso", go: "m", porta: "Le porzioni nei contenitori sono già pronte da portare: 2 minuti al microonde.", s: "Riso a lotti", name: "Riso a lotti col cuociriso", min: 25, lvl: 1, tools: "cuociriso", cat: "base", p: ["riso"],
      ingr: ["Riso crudo per 2-3 giorni (es. 3 porzioni da 80 g = 240 g)", "Acqua secondo le tacche del cuociriso"],
      steps: [
        { tool: "ciotola", p: ["riso"], t: "Pesa il riso crudo. Sciacqualo in un colino sotto l'acqua fredda finché l'acqua esce quasi trasparente.", tip: "Sciacquato non si attacca e i chicchi restano separati." },
        { tool: "cuociriso", p: ["riso"], t: "Nel cuociriso con l'acqua fino alla tacca giusta (o 1 tazza e mezza d'acqua per tazza di riso basmati) e un pizzico di sale. Accendi e aspetta che scatti." },
        { tool: "contenitore", p: ["riso"], t: "Dividi a occhio in contenitori uguali (mezzo contenitore = porzione da 40). Lascia intiepidire aperti 15-20 minuti, poi in frigo entro un'ora." },
        { tool: "microonde", p: ["riso"], t: "Mangialo entro 2-3 giorni, il resto in freezer. Per scaldarlo: 1 cucchiaio d'acqua sopra, coperto, 2 minuti al microonde, una volta sola.", min: 2 },
      ] },
    { id: "basepasta", go: "c", s: "Pasta perfetta", name: "Le basi: la pasta perfetta", min: 15, lvl: 1, tools: "una pentola", cat: "base", p: ["pasta"],
      ingr: ["1 litro d'acqua ogni 100 g di pasta (minimo 1 litro)", "1 cucchiaino abbondante di sale per litro"],
      steps: [
        { tool: "pentola", t: "Acqua fredda nella pentola, coperchio, fuoco alto. Bolle in 8-10 minuti.", min: 9, ok: "Bolle grosse che salgono veloci in tutta la pentola." },
        { tool: "pentola", p: ["pasta"], t: "Sale, poi la pasta. Mescola subito per 30 secondi, poi ogni tanto. Senza coperchio.", tip: "Il primo minuto è quello in cui si attacca: mescola." },
        { tool: "pentola", p: ["pasta"], t: "Assaggia 1 minuto prima del tempo scritto sulla confezione.", ok: "Morbida fuori, con un cuore appena consistente (al dente)." },
        { tool: "piatto", p: ["pasta"], t: "Prima di scolare tieni da parte mezzo bicchiere d'acqua di cottura: se il condimento è asciutto, un goccio lo rende cremoso." },
      ] },
    { id: "basefrigg", go: "c", s: "Friggitrice", name: "Le basi: la friggitrice ad aria", min: 5, lvl: 1, tools: "friggitrice", cat: "base", p: ["pollo", "patate"],
      ingr: ["Carta forno (meglio quella forata o tagliata alla misura del cestello)", "Spruzzino ricaricabile con olio extravergine"],
      steps: [
        { tool: "friggitrice", t: "Scaldala vuota 3 minuti alla temperatura della ricetta: il cibo diventa dorato invece di bollito.", min: 3 },
        { tool: "friggitrice", p: ["patate"], t: "Un solo strato, pezzi non sovrapposti. Se è troppo, fai 2 giri.", tip: "Cestello troppo pieno = niente croccantezza." },
        { tool: "friggitrice", p: ["patate", "pollo"], t: "Scuoti il cestello o gira i pezzi a metà cottura. Spruzza l'olio sul cibo, non sul cestello." },
        { tool: "ciotola", t: "Pulizia: con la carta forno basta passare il cestello con acqua calda e sapone. Mai spugne abrasive: rovinano l'antiaderente." },
      ] },
    { id: "basepadella", go: "c", s: "Padella", name: "Le basi: la padella che non attacca", min: 5, lvl: 1, tools: "padella", cat: "base", p: ["manzo"],
      ingr: ["Padella antiaderente non graffiata", "1 cucchiaino d'olio", "Carta da cucina"],
      steps: [
        { tool: "padella", t: "Scalda la padella vuota 2 minuti a fuoco medio-alto, poi 1 cucchiaino d'olio steso con la carta da cucina.", min: 2, ok: "Una goccia d'acqua sfrigola e salta." },
        { tool: "tagliere", p: ["pollo"], t: "Asciuga carne o pesce con carta da cucina prima di metterli." },
        { tool: "padella", p: ["pollo"], t: "Non girarli subito: dopo 2-3 minuti si staccano da soli. Se tirando resta attaccato, non è pronto.", tip: "Se il fondo si attacca: 2 cucchiai d'acqua e mescola, diventa sughetto." },
        { tool: "padella", t: "In alternativa per pollo, pesce e uova: un foglio di carta forno bagnato e strizzato steso in padella, fuoco medio. Zero olio e non attacca." },
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
    { cat: "Carboidrati", items: ["Riso", "Pasta", "Cous cous", "Farro o orzo precotto", "Riso precotto (emergenze)", "Gnocchi", "Patate", "Patate dolci", "Pane di segale", "Piadine", "Cornflakes", "Gallette", "Crema di riso"] },
    { cat: "Verdure", items: ["Verdure grigliate surgelate", "Verdure miste surgelate (piselli, carote)", "Spinaci surgelati", "Insalata in busta", "Pomodorini", "Zucchine", "Rucola", "Limoni o lime"] },
    { cat: "Altro", items: ["Olio extravergine", "Spruzzino per l'olio", "Noci", "Proteine in polvere", "Passata", "Capperi", "Salsa di soia", "Senape", "Aceto balsamico", "Spezie", "Cannella e cacao amaro", "Carta forno", "Lievito per dolci"] },
  ],
};
