// =====================================================================================
//  MACCHINE ALTERNATIVE — suggerimenti per "Sostituisci" (pannello Info di ogni esercizio)
//  Per ogni esercizio (stessa "key" di schede.js): macchine che allenano gli stessi muscoli
//  con un movimento simile. I nomi sono quelli che di solito si leggono sulla targhetta delle
//  macchine Panatta (in inglese). "q" = ricerca immagini per vedere com'è fatta.
//  Quando l'utente manda le foto delle macchine di Green Theory, si può aggiungere "gym": ["PA"]
//  per mostrarle solo in quella palestra, e correggere i nomi con quelli veri.
// =====================================================================================
window.MACCHINE = {
  // ---- G1 petto, tricipiti, spalle ----
  "panca-inclinata-multipower": [
    { n: "Inclined Chest Press", d: "panca inclinata a macchina, movimento convergente: sedile + schienale inclinato, maniglie che si avvicinano" },
    { n: "Inclined Chest Press circolare", d: "leve indipendenti: puoi spingere un braccio alla volta, ottima per sentire il petto alto" },
    { n: "Multipurpose Press", d: "schienale regolabile: mettilo inclinato a 30-45°" }
  ],
  "panca-inclinata-manubri": [
    { n: "Inclined Chest Press circolare", d: "leve indipendenti come i manubri, ma guidate: più facile sentire il petto" },
    { n: "Inclined Chest Press", d: "panca inclinata a macchina, movimento convergente" }
  ],
  "croci-inclinata-manubri": [
    { n: "Pectoral Machine", d: "pec deck / butterfly: seduto, braccia aperte che si chiudono davanti al petto" },
    { n: "Cable Crossover", d: "croci ai cavi dal basso verso l'alto per il petto alto" }
  ],
  "spinte-in-basso-al-cavo-corda": [
    { n: "Triceps Machine", d: "seduto, gomiti appoggiati, spingi le maniglie in basso/avanti" },
    { n: "Dips Press", d: "dip seduto a macchina: spingi in basso le maniglie ai lati" }
  ],
  "french-press-bilanciere": [
    { n: "Triceps Machine", d: "estensione dei tricipiti con gomiti appoggiati sul cuscino" }
  ],
  "alzate-laterali": [
    { n: "Lateral Deltoids", d: "alzate laterali a macchina: braccia contro i cuscinetti, sali di lato fino alle spalle" }
  ],
  "shoulder-press-macchina": [
    { n: "Deltoid Press", d: "lento avanti a macchina, spinta verticale da seduto" },
    { n: "Shoulder Press convergente", d: "come la deltoid press, ma le maniglie si avvicinano in alto" }
  ],
  // ---- addominali (oggi sono un circuito senza registrazione) ----
  "crunch": [
    { n: "Abdominal Crunch", d: "seduto, petto contro i cuscinetti, ti chiudi in avanti" },
    { n: "Total Core Crunch", d: "crunch a macchina che lavora anche la parte bassa" }
  ],
  "crunch-inverso": [
    { n: "Total Core Crunch", d: "versione per gli addominali bassi: sollevi il bacino" }
  ],
  "lombari-hyperextension": [
    { n: "Lower Back", d: "seduto, schiena contro il rullo, ti estendi all'indietro" },
    { n: "Dual Abdominal | Lower Back", d: "2 in 1: crunch e lombari sulla stessa macchina" }
  ],
  // ---- G2 dorso, bicipiti, posteriori ----
  "rematore-bilanciere": [
    { n: "Rowing Machine", d: "rematore seduto con petto appoggiato: niente schiena da tenere" },
    { n: "Low Row", d: "rematore basso a macchina, maniglie che tiri verso la pancia" }
  ],
  "pulley-basso": [
    { n: "Horizontal Pull", d: "tirata orizzontale da seduto, petto appoggiato" },
    { n: "Rowing Machine", d: "rematore convergente a macchina" }
  ],
  "lat-machine-avanti": [
    { n: "Lat Pulldown convergente", d: "lat machine con leve: tiri verso il petto, le maniglie si avvicinano" },
    { n: "Lat Pulldown circolare", d: "leve indipendenti, un braccio alla volta se vuoi" }
  ],
  "curl-bilanciere": [
    { n: "Biceps Machine", d: "curl seduto con braccia appoggiate sul cuscino (tipo panca Scott)" }
  ],
  "curl-martello-manubri": [
    { n: "Biceps Machine", d: "curl a macchina; se ha le maniglie verticali, presa a martello" }
  ],
  "peck-back-deltoidi-posteriori": [
    { n: "Rear Delt / Reverse Fly", d: "pec deck al contrario: petto allo schienale, apri le braccia indietro" }
  ],
  "face-pull-corda-cavo-alto": [
    { n: "Rear Delt / Reverse Fly", d: "lavora gli stessi deltoidi posteriori, più guidato" }
  ],
  // ---- G3 gambe ----
  "hack-squat": [
    { n: "Hack Squat", d: "schiena appoggiata su schienale inclinato, spalle sotto i cuscini" },
    { n: "Inclined Leg Press", d: "leg press a 45°, piedi a metà pedana" }
  ],
  "leg-press": [
    { n: "Inclined Leg Press", d: "leg press inclinata a 45°" },
    { n: "Leg Press orizzontale", d: "seduto, spingi in avanti la pedana" }
  ],
  "affondi-in-camminata": [
    { n: "Gluteus Machine", d: "spinta di una gamba all'indietro, in piedi o in ginocchio" },
    { n: "Smith Machine", d: "affondi fermi con il bilanciere guidato" }
  ],
  "leg-curl-sdraiato": [
    { n: "Leg Curling", d: "leg curl seduto: gambe tese sopra il rullo, le pieghi sotto" },
    { n: "Standing Leg Curling", d: "leg curl in piedi, una gamba alla volta" }
  ],
  "stacchi-rumeni": [
    { n: "Gluteus Machine", d: "glutei e femorali senza carico sulla schiena" },
    { n: "Lower Back", d: "estensione della schiena a macchina (più lombari che femorali)" }
  ],
  "hip-thrust": [
    { n: "Hip Thrust Machine", d: "seduto/sdraiato con la cintura sul bacino, spingi in alto" },
    { n: "Gluteus Machine", d: "spinta della gamba all'indietro" }
  ],
  "calf-in-piedi": [
    { n: "Standing Calf", d: "calf in piedi con spalle sotto i cuscini" },
    { n: "Seated Calf", d: "calf da seduto con ginocchia sotto il rullo (più soleo)" }
  ]
};
