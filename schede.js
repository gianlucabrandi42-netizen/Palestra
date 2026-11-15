// =====================================================================
//  SCHEDE DI ALLENAMENTO
//  Questo è l'unico file da modificare quando il PT manda una nuova scheda.
//  - SCHEDA_ATTIVA: id della scheda in uso.
//  - SCHEDE: elenco di tutte le schede (le vecchie restano come archivio).
//  Ogni esercizio:
//    key    = identificativo fisso: se resta uguale tra due schede, lo storico
//             dei carichi continua (anche se cambia il nome).
//    name   = nome mostrato    tec = "tecnica esatta" (come nella scheda Excel)
//    flash  = 2-3 consigli brevissimi mostrati subito sotto il nome
//    sets   = serie: t = ripetizioni previste ("10", "15-20", "max")
//             type (facoltativo): "ced" cedimento/rest-pause, "strip" stripping,
//             "alte" alte ripetizioni, "pausa" pausa programmata,
//             "super" superserie, "risc" riscaldamento. Senza type = normale.
//             note (facoltativo): es. 'dopo 15"'
//    rest   = recupero (facoltativo), es. '90"'
//    m      = muscoli {p: principali, s: secondari}
//    cues / errors = esecuzione / errori da evitare
//    img    = {local: [file in img/]}  (f1,f2 = foto; d1,d2 = disegni)
//    ref    = kg di riferimento della scheda precedente (facoltativo)
//    setup  = false per nascondere il campo "Regolazioni"
// =====================================================================
window.PALESTRE = [{"id": "PA", "name": "Green Theory"}, {"id": "PB", "name": "Sparta 2.0"}];

window.SCHEDA_ATTIVA = "p2026-11";

window.SCHEDE = [
 {
  "id": "p2026-11",
  "name": "Scheda novembre 2026",
  "created": "2026-11-15",
  "days": [
   {
    "id": "G1",
    "name": "Petto · Tricipiti · Spalle",
    "ex": [
     {
      "name": "Panca inclinata Multipower",
      "tec": "3 serie piramidali: 10 reps, poi 8, poi 8. Aumenta il carico quando scendono le reps.",
      "flash": [
       "Scapole strette",
       "Sbarra al petto alto",
       "Gomiti a 60°"
      ],
      "sets": [
       {
        "t": "10"
       },
       {
        "t": "8"
       },
       {
        "t": "8"
       }
      ],
      "bw": false,
      "m": {
       "p": [
        "CHEST",
        "FRONT_DELTOIDS"
       ],
       "s": [
        "TRICEPS"
       ]
      },
      "ml": "Petto alto · Deltoidi anteriori",
      "cues": [
       "Panca a 30–45°: da sdraiato la sbarra cade sopra la parte alta del petto.",
       "Scapole strette e basse, piedi ben piantati, glutei sulla panca.",
       "Scendi controllato fino a sfiorare il petto alto, gomiti a circa 60° dal busto.",
       "Spingi in alto senza bloccare del tutto i gomiti."
      ],
      "errors": [
       "Gomiti aperti a 90° (sovraccarica le spalle)",
       "Glutei che si staccano dalla panca"
      ],
      "img": {
       "local": [
        "panca_incl-f1.webp",
        "panca_incl-f2.webp",
        "panca_incl-d1.webp",
        "panca_incl-d2.webp"
       ]
      },
      "ref": {
       "PA": 10.0
      },
      "setup": true,
      "key": "panca-inclinata-multipower"
     },
     {
      "name": "Panca inclinata manubri",
      "tec": "3 serie da 8 reps, stesso carico su tutte.",
      "flash": [
       "Polsi sopra i gomiti",
       "Scendi fino all'allungamento",
       "Non sbattere i manubri"
      ],
      "sets": [
       {
        "t": "8"
       },
       {
        "t": "8"
       },
       {
        "t": "8"
       }
      ],
      "bw": false,
      "m": {
       "p": [
        "CHEST",
        "FRONT_DELTOIDS"
       ],
       "s": [
        "TRICEPS"
       ]
      },
      "ml": "Petto alto · Deltoidi anteriori",
      "cues": [
       "Panca a 30°: porta su i manubri aiutandoti con le ginocchia.",
       "Scapole strette, polsi sempre sopra i gomiti.",
       "Scendi finché i manubri sono ai lati del petto alto e senti l'allungamento.",
       "Spingi in alto convergendo leggermente."
      ],
      "errors": [
       "Scendere troppo poco",
       "Far sbattere i manubri in alto"
      ],
      "img": {
       "local": [
        "manubri_incl-f1.webp",
        "manubri_incl-f2.webp",
        "manubri_incl-d1.webp",
        "manubri_incl-d2.webp"
       ]
      },
      "ref": {},
      "setup": true,
      "key": "panca-inclinata-manubri"
     },
     {
      "name": "Croci inclinata manubri",
      "tec": "3 serie da 10 reps, stesso carico su tutte.",
      "flash": [
       "Gomiti fissi, appena piegati",
       "Apri ad arco",
       "Chiudi come un abbraccio"
      ],
      "sets": [
       {
        "t": "10"
       },
       {
        "t": "10"
       },
       {
        "t": "10"
       }
      ],
      "bw": false,
      "m": {
       "p": [
        "CHEST"
       ],
       "s": [
        "FRONT_DELTOIDS"
       ]
      },
      "ml": "Petto alto",
      "cues": [
       "Panca a 30°, manubri sopra il petto con i palmi rivolti tra loro.",
       "Gomiti leggermente piegati e fissi per tutta la serie.",
       "Apri ad arco finché i manubri arrivano circa all'altezza del petto.",
       "Richiudi come se abbracciassi un albero."
      ],
      "errors": [
       "Piegare e stendere i gomiti (diventa una distensione)",
       "Scendere troppo e stressare la spalla"
      ],
      "img": {
       "local": [
        "croci_incl-f1.webp",
        "croci_incl-f2.webp",
        "croci_incl-d1.webp",
        "croci_incl-d2.webp"
       ]
      },
      "ref": {},
      "setup": true,
      "key": "croci-inclinata-manubri"
     },
     {
      "name": "Spinte in basso al cavo (corda)",
      "tec": "3 serie piramidali: 10 reps, poi 8, poi 8. Aumenta il carico quando scendono le reps.",
      "flash": [
       "Gomiti incollati ai fianchi",
       "Apri la corda in basso",
       "Risali lento"
      ],
      "sets": [
       {
        "t": "10"
       },
       {
        "t": "8"
       },
       {
        "t": "8"
       }
      ],
      "bw": false,
      "m": {
       "p": [
        "TRICEPS"
       ],
       "s": [
        "FOREARM"
       ]
      },
      "ml": "",
      "cues": [
       "In piedi vicino al cavo, busto appena inclinato in avanti.",
       "Gomiti incollati ai fianchi e fermi.",
       "Spingi in basso fino a braccia tese e apri la corda alla fine.",
       "Risali lento fino a circa 90° al gomito."
      ],
      "errors": [
       "Gomiti che vanno avanti",
       "Spingere col peso del corpo"
      ],
      "img": {
       "local": [
        "pushdown-f1.webp",
        "pushdown-f2.webp",
        "pushdown-d1.webp",
        "pushdown-d2.webp"
       ]
      },
      "ref": {
       "PA": 25.0
      },
      "setup": true,
      "key": "spinte-in-basso-al-cavo-corda"
     },
     {
      "name": "French press bilanciere",
      "tec": "3 serie da 10 reps, stesso carico su tutte.",
      "flash": [
       "Gomiti fermi e stretti",
       "Muovi solo gli avambracci",
       "Scendi verso la fronte"
      ],
      "sets": [
       {
        "t": "10"
       },
       {
        "t": "10"
       },
       {
        "t": "10"
       }
      ],
      "bw": false,
      "m": {
       "p": [
        "TRICEPS"
       ],
       "s": []
      },
      "ml": "",
      "cues": [
       "Sdraiato su panca piana, bilanciere (meglio EZ) a braccia tese sopra il petto.",
       "Braccia leggermente inclinate verso la testa.",
       "Piega solo i gomiti e porta il bilanciere verso la fronte.",
       "Estendi senza muovere le spalle."
      ],
      "errors": [
       "Gomiti che si aprono",
       "Muovere le braccia dalle spalle"
      ],
      "img": {
       "local": [
        "french-f1.webp",
        "french-f2.webp",
        "french-d1.webp",
        "french-d2.webp"
       ]
      },
      "ref": {
       "PA": 25.0
      },
      "setup": true,
      "key": "french-press-bilanciere"
     },
     {
      "name": "Alzate laterali",
      "tec": "3 serie da 10 reps, stesso carico su tutte.",
      "flash": [
       "Su fino alle spalle",
       "Guida col gomito",
       "Niente slancio"
      ],
      "sets": [
       {
        "t": "10"
       },
       {
        "t": "10"
       },
       {
        "t": "10"
       }
      ],
      "bw": false,
      "m": {
       "p": [
        "FRONT_DELTOIDS",
        "BACK_DELTOIDS"
       ],
       "s": [
        "TRAPEZIUS"
       ]
      },
      "ml": "Deltoidi laterali (la mappa colora tutta la spalla)",
      "cues": [
       "In piedi, manubri ai fianchi, busto appena inclinato in avanti.",
       "Gomiti leggermente piegati: sali di lato fino all'altezza delle spalle.",
       "Guida il movimento col gomito.",
       "Scendi in circa 2 secondi."
      ],
      "errors": [
       "Slancio col busto",
       "Spalle che salgono verso le orecchie"
      ],
      "img": {
       "local": [
        "alzate_lat-f1.webp",
        "alzate_lat-f2.webp",
        "alzate_lat-d1.webp",
        "alzate_lat-d2.webp"
       ]
      },
      "ref": {
       "PB": 7.0
      },
      "setup": true,
      "key": "alzate-laterali"
     },
     {
      "name": "Shoulder press macchina",
      "tec": "3 serie piramidali: 10 reps, poi 8, poi 8. Aumenta il carico quando scendono le reps.",
      "flash": [
       "Schiena incollata",
       "Non bloccare i gomiti",
       "Scendi fino alle spalle"
      ],
      "sets": [
       {
        "t": "10"
       },
       {
        "t": "8"
       },
       {
        "t": "8"
       }
      ],
      "bw": false,
      "m": {
       "p": [
        "FRONT_DELTOIDS"
       ],
       "s": [
        "TRICEPS",
        "TRAPEZIUS"
       ]
      },
      "ml": "",
      "cues": [
       "Regola il sedile: maniglie all'altezza delle spalle o poco sotto.",
       "Schiena ben appoggiata, piedi a terra.",
       "Spingi in alto senza bloccare i gomiti.",
       "Scendi controllato fino all'altezza delle spalle."
      ],
      "errors": [
       "Staccare la schiena e inarcarsi",
       "Fare mezze ripetizioni"
      ],
      "img": {
       "local": [
        "shoulder-f1.webp",
        "shoulder-f2.webp",
        "shoulder-d1.webp",
        "shoulder-d2.webp"
       ]
      },
      "ref": {
       "PB": 19.0
      },
      "setup": true,
      "key": "shoulder-press-macchina"
     },
     {
      "name": "Crunch",
      "tec": "3 serie da 15–20 reps a corpo libero. Quando arrivi a 20 su tutte, rendilo più difficile.",
      "flash": [
       "Lombari a terra",
       "Espira salendo",
       "Non tirare il collo"
      ],
      "sets": [
       {
        "t": "15-20"
       },
       {
        "t": "15-20"
       },
       {
        "t": "15-20"
       }
      ],
      "bw": true,
      "m": {
       "p": [
        "ABS"
       ],
       "s": [
        "OBLIQUES"
       ]
      },
      "ml": "",
      "cues": [
       "Supino, ginocchia piegate, piedi a terra, mani leggere dietro la testa o sul petto.",
       "Espira e solleva le scapole arrotolando il busto.",
       "La zona lombare resta a terra.",
       "Scendi lento senza appoggiare del tutto la testa."
      ],
      "errors": [
       "Tirare il collo con le mani",
       "Usare lo slancio"
      ],
      "img": {
       "local": [
        "crunch-f1.webp",
        "crunch-f2.webp"
       ]
      },
      "ref": {},
      "setup": false,
      "key": "crunch"
     },
     {
      "name": "Crunch inverso",
      "tec": "3 serie da 15–20 reps a corpo libero. Quando arrivi a 20 su tutte, rendilo più difficile.",
      "flash": [
       "Stacca il bacino",
       "Niente slancio",
       "Scendi lento"
      ],
      "sets": [
       {
        "t": "15-20"
       },
       {
        "t": "15-20"
       },
       {
        "t": "15-20"
       }
      ],
      "bw": true,
      "m": {
       "p": [
        "ABS"
       ],
       "s": [
        "OBLIQUES"
       ]
      },
      "ml": "",
      "cues": [
       "Supino, mani lungo i fianchi o a tenere la panca dietro la testa.",
       "Gambe piegate a 90°.",
       "Porta le ginocchia verso il petto staccando il bacino da terra.",
       "Scendi lento senza appoggiare i piedi."
      ],
      "errors": [
       "Slancio con le gambe",
       "Muovere solo le gambe senza staccare il bacino"
      ],
      "img": {
       "local": [
        "inverso-f1.webp",
        "inverso-f2.webp",
        "inverso-d1.webp",
        "inverso-d2.webp"
       ]
      },
      "ref": {},
      "setup": false,
      "key": "crunch-inverso"
     },
     {
      "name": "Lombari (hyperextension)",
      "tec": "3 serie da 15–20 reps a corpo libero. Quando arrivi a 20 su tutte, rendilo più difficile.",
      "flash": [
       "Piega dalle anche",
       "Sali fino in linea",
       "Non inarcarti oltre"
      ],
      "sets": [
       {
        "t": "15-20"
       },
       {
        "t": "15-20"
       },
       {
        "t": "15-20"
       }
      ],
      "bw": true,
      "m": {
       "p": [
        "LOWER_BACK"
       ],
       "s": [
        "GLUTEAL",
        "HAMSTRING"
       ]
      },
      "ml": "",
      "cues": [
       "Regola il cuscinetto appena sotto le anche: il bacino deve potersi piegare.",
       "Braccia incrociate sul petto, schiena dritta.",
       "Scendi piegandoti dalle anche.",
       "Risali finché busto e gambe sono in linea."
      ],
      "errors": [
       "Salire oltre la linea inarcando la schiena",
       "Usare lo slancio"
      ],
      "img": {
       "local": [
        "lombari-f1.webp",
        "lombari-f2.webp",
        "lombari-d1.webp",
        "lombari-d2.webp"
       ]
      },
      "ref": {},
      "setup": true,
      "key": "lombari-hyperextension"
     }
    ]
   },
   {
    "id": "G2",
    "name": "Dorso · Bicipiti · Posteriori",
    "ex": [
     {
      "name": "Rematore bilanciere",
      "tec": "3 serie piramidali: 10 reps, poi 8, poi 8. Aumenta il carico quando scendono le reps.",
      "flash": [
       "Schiena dritta a 45°",
       "Tira all'ombelico",
       "Stringi le scapole"
      ],
      "sets": [
       {
        "t": "10"
       },
       {
        "t": "8"
       },
       {
        "t": "8"
       }
      ],
      "bw": false,
      "m": {
       "p": [
        "UPPER_BACK"
       ],
       "s": [
        "BACK_DELTOIDS",
        "TRAPEZIUS",
        "BICEPS",
        "LOWER_BACK"
       ]
      },
      "ml": "",
      "cues": [
       "Presa poco più larga delle spalle, ginocchia leggermente piegate.",
       "Busto inclinato a circa 45°, schiena dritta, addome contratto.",
       "Tira il bilanciere verso l'ombelico portando i gomiti indietro.",
       "Stringi le scapole in alto, poi scendi controllato."
      ],
      "errors": [
       "Schiena curva",
       "Raddrizzare il busto per tirare su il peso"
      ],
      "img": {
       "local": [
        "rematore-f1.webp",
        "rematore-f2.webp"
       ]
      },
      "ref": {},
      "setup": true,
      "key": "rematore-bilanciere"
     },
     {
      "name": "Pulley basso",
      "tec": "3 serie: 8, 8, poi 6 reps. Aumenta il carico nell'ultima serie.",
      "flash": [
       "Petto in fuori",
       "Busto fermo",
       "Gomiti vicini al corpo"
      ],
      "sets": [
       {
        "t": "8"
       },
       {
        "t": "8"
       },
       {
        "t": "6"
       }
      ],
      "bw": false,
      "m": {
       "p": [
        "UPPER_BACK"
       ],
       "s": [
        "TRAPEZIUS",
        "BACK_DELTOIDS",
        "BICEPS"
       ]
      },
      "ml": "",
      "cues": [
       "Piedi sulla pedana, ginocchia leggermente piegate.",
       "Busto dritto, petto in fuori.",
       "Tira la maniglia verso l'addome, gomiti vicini al corpo, stringi le scapole.",
       "Torna allungando le braccia senza piegare la schiena in avanti."
      ],
      "errors": [
       "Dondolare il busto avanti e indietro",
       "Spalle che salgono"
      ],
      "img": {
       "local": [
        "pulley-f1.webp",
        "pulley-f2.webp",
        "pulley-d1.webp",
        "pulley-d2.webp"
       ]
      },
      "ref": {},
      "setup": true,
      "key": "pulley-basso"
     },
     {
      "name": "Lat machine avanti",
      "tec": "3 serie da 10 reps, stesso carico su tutte.",
      "flash": [
       "Tira al petto alto",
       "Gomiti giù e indietro",
       "Niente dondolio"
      ],
      "sets": [
       {
        "t": "10"
       },
       {
        "t": "10"
       },
       {
        "t": "10"
       }
      ],
      "bw": false,
      "m": {
       "p": [
        "UPPER_BACK"
       ],
       "s": [
        "BICEPS",
        "BACK_DELTOIDS"
       ]
      },
      "ml": "",
      "cues": [
       "Regola il cuscinetto in modo da bloccare le cosce.",
       "Presa larga, petto in fuori, busto appena inclinato indietro.",
       "Tira la sbarra al petto alto portando i gomiti in basso e indietro.",
       "Risali controllato fino a braccia quasi tese."
      ],
      "errors": [
       "Tirare dietro la nuca",
       "Dondolarsi per tirare giù il peso"
      ],
      "img": {
       "local": [
        "lat-f1.webp",
        "lat-f2.webp"
       ]
      },
      "ref": {},
      "setup": true,
      "key": "lat-machine-avanti"
     },
     {
      "name": "Curl bilanciere",
      "tec": "3 serie piramidali: 10 reps, poi 8, poi 8. Aumenta il carico quando scendono le reps.",
      "flash": [
       "Gomiti fermi",
       "Niente slancio",
       "Scendi in 2 secondi"
      ],
      "sets": [
       {
        "t": "10"
       },
       {
        "t": "8"
       },
       {
        "t": "8"
       }
      ],
      "bw": false,
      "m": {
       "p": [
        "BICEPS"
       ],
       "s": [
        "FOREARM"
       ]
      },
      "ml": "",
      "cues": [
       "In piedi, presa larga quanto le spalle, palmi in avanti.",
       "Gomiti fermi ai fianchi.",
       "Sali fino alla contrazione completa.",
       "Scendi in circa 2 secondi fino a braccia tese."
      ],
      "errors": [
       "Slancio con la schiena",
       "Gomiti che vanno avanti"
      ],
      "img": {
       "local": [
        "curl_bil-f1.webp",
        "curl_bil-f2.webp",
        "curl_bil-d1.webp",
        "curl_bil-d2.webp"
       ]
      },
      "ref": {},
      "setup": true,
      "key": "curl-bilanciere"
     },
     {
      "name": "Curl martello manubri",
      "tec": "3 serie da 10 reps, stesso carico su tutte.",
      "flash": [
       "Palmi verso le cosce",
       "Polso fermo",
       "Gomiti fermi"
      ],
      "sets": [
       {
        "t": "10"
       },
       {
        "t": "10"
       },
       {
        "t": "10"
       }
      ],
      "bw": false,
      "m": {
       "p": [
        "BICEPS",
        "FOREARM"
       ],
       "s": []
      },
      "ml": "Bicipiti · Brachiale · Avambracci",
      "cues": [
       "In piedi, manubri ai fianchi con i palmi verso le cosce.",
       "Gomiti fermi ai fianchi.",
       "Sali senza ruotare il polso (insieme o alternato).",
       "Scendi controllato."
      ],
      "errors": [
       "Slancio con la schiena",
       "Gomiti che vanno avanti"
      ],
      "img": {
       "local": [
        "martello-f1.webp",
        "martello-f2.webp",
        "martello-d1.webp",
        "martello-d2.webp"
       ]
      },
      "ref": {},
      "setup": true,
      "key": "curl-martello-manubri"
     },
     {
      "name": "Peck back (deltoidi posteriori)",
      "tec": "3 serie da 10 reps, stesso carico su tutte.",
      "flash": [
       "Braccia quasi tese",
       "Apri fino in linea",
       "Spalle basse"
      ],
      "sets": [
       {
        "t": "10"
       },
       {
        "t": "10"
       },
       {
        "t": "10"
       }
      ],
      "bw": false,
      "m": {
       "p": [
        "BACK_DELTOIDS"
       ],
       "s": [
        "TRAPEZIUS",
        "UPPER_BACK"
       ]
      },
      "ml": "",
      "cues": [
       "Regola il sedile: maniglie all'altezza delle spalle, petto contro lo schienale.",
       "Braccia quasi tese.",
       "Apri le braccia all'indietro fino in linea col corpo.",
       "Torna controllato."
      ],
      "errors": [
       "Stringere le scapole e lavorare col trapezio",
       "Piegare troppo i gomiti"
      ],
      "img": {
       "local": [
        "peck_back-f1.webp",
        "peck_back-f2.webp"
       ]
      },
      "ref": {
       "PA": 41.0
      },
      "setup": true,
      "key": "peck-back-deltoidi-posteriori"
     },
     {
      "name": "Face pull (corda cavo alto)",
      "tec": "3 serie da 12 reps, stesso carico su tutte.",
      "flash": [
       "Tira verso la fronte",
       "Gomiti alti",
       "Apri la corda, 1\" fermo"
      ],
      "sets": [
       {
        "t": "12"
       },
       {
        "t": "12"
       },
       {
        "t": "12"
       }
      ],
      "bw": false,
      "m": {
       "p": [
        "BACK_DELTOIDS"
       ],
       "s": [
        "TRAPEZIUS",
        "UPPER_BACK"
       ]
      },
      "ml": "",
      "cues": [
       "Cavo all'altezza degli occhi o poco sopra, con la corda.",
       "Presa coi pollici verso di te, fai un passo indietro.",
       "Tira verso la fronte aprendo la corda, gomiti alti e larghi.",
       "Tieni 1 secondo, poi torna lento."
      ],
      "errors": [
       "Tirare verso il collo con i gomiti bassi",
       "Usare la schiena per tirare"
      ],
      "img": {
       "local": [
        "face_pull-f1.webp",
        "face_pull-f2.webp"
       ]
      },
      "ref": {},
      "setup": true,
      "key": "face-pull-corda-cavo-alto"
     },
     {
      "name": "Crunch",
      "tec": "3 serie da 15–20 reps a corpo libero. Quando arrivi a 20 su tutte, rendilo più difficile.",
      "flash": [
       "Lombari a terra",
       "Espira salendo",
       "Non tirare il collo"
      ],
      "sets": [
       {
        "t": "15-20"
       },
       {
        "t": "15-20"
       },
       {
        "t": "15-20"
       }
      ],
      "bw": true,
      "m": {
       "p": [
        "ABS"
       ],
       "s": [
        "OBLIQUES"
       ]
      },
      "ml": "",
      "cues": [
       "Supino, ginocchia piegate, piedi a terra, mani leggere dietro la testa o sul petto.",
       "Espira e solleva le scapole arrotolando il busto.",
       "La zona lombare resta a terra.",
       "Scendi lento senza appoggiare del tutto la testa."
      ],
      "errors": [
       "Tirare il collo con le mani",
       "Usare lo slancio"
      ],
      "img": {
       "local": [
        "crunch-f1.webp",
        "crunch-f2.webp"
       ]
      },
      "ref": {},
      "setup": false,
      "key": "crunch"
     },
     {
      "name": "Crunch inverso",
      "tec": "3 serie da 15–20 reps a corpo libero. Quando arrivi a 20 su tutte, rendilo più difficile.",
      "flash": [
       "Stacca il bacino",
       "Niente slancio",
       "Scendi lento"
      ],
      "sets": [
       {
        "t": "15-20"
       },
       {
        "t": "15-20"
       },
       {
        "t": "15-20"
       }
      ],
      "bw": true,
      "m": {
       "p": [
        "ABS"
       ],
       "s": [
        "OBLIQUES"
       ]
      },
      "ml": "",
      "cues": [
       "Supino, mani lungo i fianchi o a tenere la panca dietro la testa.",
       "Gambe piegate a 90°.",
       "Porta le ginocchia verso il petto staccando il bacino da terra.",
       "Scendi lento senza appoggiare i piedi."
      ],
      "errors": [
       "Slancio con le gambe",
       "Muovere solo le gambe senza staccare il bacino"
      ],
      "img": {
       "local": [
        "inverso-f1.webp",
        "inverso-f2.webp",
        "inverso-d1.webp",
        "inverso-d2.webp"
       ]
      },
      "ref": {},
      "setup": false,
      "key": "crunch-inverso"
     },
     {
      "name": "Lombari (hyperextension)",
      "tec": "3 serie da 15–20 reps a corpo libero. Quando arrivi a 20 su tutte, rendilo più difficile.",
      "flash": [
       "Piega dalle anche",
       "Sali fino in linea",
       "Non inarcarti oltre"
      ],
      "sets": [
       {
        "t": "15-20"
       },
       {
        "t": "15-20"
       },
       {
        "t": "15-20"
       }
      ],
      "bw": true,
      "m": {
       "p": [
        "LOWER_BACK"
       ],
       "s": [
        "GLUTEAL",
        "HAMSTRING"
       ]
      },
      "ml": "",
      "cues": [
       "Regola il cuscinetto appena sotto le anche: il bacino deve potersi piegare.",
       "Braccia incrociate sul petto, schiena dritta.",
       "Scendi piegandoti dalle anche.",
       "Risali finché busto e gambe sono in linea."
      ],
      "errors": [
       "Salire oltre la linea inarcando la schiena",
       "Usare lo slancio"
      ],
      "img": {
       "local": [
        "lombari-f1.webp",
        "lombari-f2.webp",
        "lombari-d1.webp",
        "lombari-d2.webp"
       ]
      },
      "ref": {},
      "setup": true,
      "key": "lombari-hyperextension"
     }
    ]
   },
   {
    "id": "G3",
    "name": "Gambe",
    "ex": [
     {
      "name": "Hack squat",
      "tec": "3 serie da 8 reps, stesso carico su tutte.",
      "flash": [
       "Schiena incollata",
       "Scendi almeno a 90°",
       "Ginocchia sulle punte"
      ],
      "sets": [
       {
        "t": "8"
       },
       {
        "t": "8"
       },
       {
        "t": "8"
       }
      ],
      "bw": false,
      "m": {
       "p": [
        "QUADRICEPS"
       ],
       "s": [
        "GLUTEAL"
       ]
      },
      "ml": "",
      "cues": [
       "Schiena e spalle ben appoggiate, piedi larghi quanto le spalle al centro della pedana.",
       "Togli la sicura e scendi controllato almeno a 90° al ginocchio.",
       "Ginocchia in linea con le punte dei piedi.",
       "Spingi con tutto il piede senza bloccare le ginocchia."
      ],
      "errors": [
       "Talloni che si alzano",
       "Ginocchia che vanno verso l'interno"
      ],
      "img": {
       "local": [
        "hack-f1.webp",
        "hack-f2.webp"
       ]
      },
      "ref": {},
      "setup": true,
      "key": "hack-squat"
     },
     {
      "name": "Leg press",
      "tec": "3 serie da 10 reps, stesso carico su tutte.",
      "flash": [
       "Bacino incollato",
       "Piedi a metà pedana",
       "Non bloccare le ginocchia"
      ],
      "sets": [
       {
        "t": "10"
       },
       {
        "t": "10"
       },
       {
        "t": "10"
       }
      ],
      "bw": false,
      "m": {
       "p": [
        "QUADRICEPS"
       ],
       "s": [
        "GLUTEAL",
        "HAMSTRING"
       ]
      },
      "ml": "",
      "cues": [
       "Schiena e bacino ben appoggiati.",
       "Piedi larghi quanto le spalle al centro della pedana.",
       "Scendi finché le ginocchia vanno verso il petto senza che il bacino si stacchi.",
       "Spingi senza bloccare le ginocchia."
      ],
      "errors": [
       "Bacino che si arrotola e si stacca",
       "Ginocchia che vanno verso l'interno"
      ],
      "img": {
       "local": [
        "leg_press-f1.webp",
        "leg_press-f2.webp",
        "leg_press-d1.webp",
        "leg_press-d2.webp"
       ]
      },
      "ref": {
       "PA": 72.0
      },
      "setup": true,
      "key": "leg-press"
     },
     {
      "name": "Leg extension",
      "tec": "4 serie: 10, 10, poi 8, 8 reps. Aumenta il carico sulle serie da 8.",
      "flash": [
       "Ginocchio sul perno",
       "1\" fermo in alto",
       "Scendi lento"
      ],
      "sets": [
       {
        "t": "10"
       },
       {
        "t": "10"
       },
       {
        "t": "8"
       },
       {
        "t": "8"
       }
      ],
      "bw": false,
      "m": {
       "p": [
        "QUADRICEPS"
       ],
       "s": []
      },
      "ml": "",
      "cues": [
       "Regola lo schienale: ginocchio allineato al perno della macchina.",
       "Rullo appena sopra la caviglia, mani sulle maniglie.",
       "Estendi del tutto e tieni 1 secondo in alto.",
       "Scendi lento."
      ],
      "errors": [
       "Slancio",
       "Sollevare il bacino dal sedile"
      ],
      "img": {
       "local": [
        "leg_ext-f1.webp",
        "leg_ext-f2.webp",
        "leg_ext-d1.webp",
        "leg_ext-d2.webp"
       ]
      },
      "ref": {
       "PA": 59.0
      },
      "setup": true,
      "key": "leg-extension"
     },
     {
      "name": "Affondi in camminata",
      "tec": "3 serie da 10 reps per gamba, stesso carico su tutte.",
      "flash": [
       "Busto dritto",
       "Ginocchio sfiora terra",
       "10 per gamba"
      ],
      "sets": [
       {
        "t": "10"
       },
       {
        "t": "10"
       },
       {
        "t": "10"
       }
      ],
      "bw": false,
      "m": {
       "p": [
        "QUADRICEPS",
        "GLUTEAL"
       ],
       "s": [
        "HAMSTRING",
        "CALVES"
       ]
      },
      "ml": "",
      "cues": [
       "Manubri ai fianchi, busto dritto.",
       "Passo lungo in avanti: scendi finché il ginocchio dietro sfiora il pavimento.",
       "Ginocchio davanti sopra il piede, non verso l'interno.",
       "Spingi col tallone davanti e avanza con l'altra gamba. 10 per gamba."
      ],
      "errors": [
       "Passo troppo corto",
       "Busto che cade in avanti"
      ],
      "img": {
       "local": [
        "affondi-f1.webp",
        "affondi-f2.webp",
        "affondi-d1.webp",
        "affondi-d2.webp"
       ]
      },
      "ref": {},
      "setup": true,
      "key": "affondi-in-camminata"
     },
     {
      "name": "Leg curl sdraiato",
      "tec": "3 serie piramidali: 10 reps, poi 8, poi 8. Aumenta il carico quando scendono le reps.",
      "flash": [
       "Bacino schiacciato",
       "Piega fino in fondo",
       "Scendi in 2 secondi"
      ],
      "sets": [
       {
        "t": "10"
       },
       {
        "t": "8"
       },
       {
        "t": "8"
       }
      ],
      "bw": false,
      "m": {
       "p": [
        "HAMSTRING"
       ],
       "s": [
        "CALVES"
       ]
      },
      "ml": "",
      "cues": [
       "Regola il rullo appena sopra i talloni, ginocchia appena fuori dalla panca.",
       "Bacino schiacciato sulla panca.",
       "Piega fino in fondo.",
       "Scendi in circa 2 secondi."
      ],
      "errors": [
       "Sollevare il bacino",
       "Lasciar cadere il peso"
      ],
      "img": {
       "local": [
        "leg_curl-f1.webp",
        "leg_curl-f2.webp",
        "leg_curl-d1.webp",
        "leg_curl-d2.webp"
       ]
      },
      "ref": {
       "PA": 45.0
      },
      "setup": true,
      "key": "leg-curl-sdraiato"
     },
     {
      "name": "Stacchi rumeni",
      "tec": "3 serie da 10 reps, stesso carico su tutte.",
      "flash": [
       "Bacino indietro",
       "Bilanciere radente alle gambe",
       "Schiena neutra"
      ],
      "sets": [
       {
        "t": "10"
       },
       {
        "t": "10"
       },
       {
        "t": "10"
       }
      ],
      "bw": false,
      "m": {
       "p": [
        "HAMSTRING",
        "GLUTEAL"
       ],
       "s": [
        "LOWER_BACK"
       ]
      },
      "ml": "",
      "cues": [
       "In piedi col bilanciere, presa larga quanto le spalle, ginocchia leggermente piegate e ferme.",
       "Spingi il bacino indietro e scendi col bilanciere radente alle gambe.",
       "Schiena dritta: scendi fino a metà tibia o finché senti tirare dietro le cosce.",
       "Risali spingendo il bacino in avanti."
      ],
      "errors": [
       "Schiena curva",
       "Piegare troppo le ginocchia (diventa uno stacco normale)"
      ],
      "img": {
       "local": [
        "rumeno-f1.webp",
        "rumeno-f2.webp",
        "rumeno-d1.webp",
        "rumeno-d2.webp"
       ]
      },
      "ref": {},
      "setup": true,
      "key": "stacchi-rumeni"
     },
     {
      "name": "Hip thrust",
      "tec": "3 serie da 10 reps, stesso carico su tutte.",
      "flash": [
       "Mento al petto",
       "Spingi coi talloni",
       "Stringi i glutei 1\""
      ],
      "sets": [
       {
        "t": "10"
       },
       {
        "t": "10"
       },
       {
        "t": "10"
       }
      ],
      "bw": false,
      "m": {
       "p": [
        "GLUTEAL"
       ],
       "s": [
        "HAMSTRING"
       ]
      },
      "ml": "",
      "cues": [
       "Parte alta della schiena sulla panca, bilanciere sulle anche con un cuscinetto.",
       "Piedi larghi quanto le spalle: in alto le tibie devono essere verticali.",
       "Mento verso il petto, spingi coi talloni finché busto e cosce sono in linea.",
       "Contrai i glutei 1 secondo in alto."
      ],
      "errors": [
       "Inarcare la zona lombare",
       "Piedi troppo lontani"
      ],
      "img": {
       "local": [
        "hip_thrust-f1.webp",
        "hip_thrust-f2.webp"
       ]
      },
      "ref": {},
      "setup": true,
      "key": "hip-thrust"
     },
     {
      "name": "Calf in piedi",
      "tec": "3 serie da 12 reps, stesso carico su tutte.",
      "flash": [
       "Discesa completa",
       "Pausa in allungamento",
       "Ginocchia ferme"
      ],
      "sets": [
       {
        "t": "12"
       },
       {
        "t": "12"
       },
       {
        "t": "12"
       }
      ],
      "bw": false,
      "m": {
       "p": [
        "CALVES"
       ],
       "s": [
        "LEFT_SOLEUS",
        "RIGHT_SOLEUS"
       ]
      },
      "ml": "Polpacci (gastrocnemio) · Soleo",
      "cues": [
       "Spalle sotto i cuscinetti, punta del piede sul bordo.",
       "Ginocchia quasi tese e ferme.",
       "Scendi del tutto col tallone e tieni 1 secondo in allungamento.",
       "Sali al massimo sulle punte."
      ],
      "errors": [
       "Rimbalzare in basso",
       "Piegare le ginocchia"
      ],
      "img": {
       "local": [
        "calf-f1.webp",
        "calf-f2.webp",
        "calf-d1.webp",
        "calf-d2.webp"
       ]
      },
      "ref": {
       "PA": 16.0
      },
      "setup": true,
      "key": "calf-in-piedi"
     },
     {
      "name": "Crunch",
      "tec": "3 serie da 15–20 reps a corpo libero. Quando arrivi a 20 su tutte, rendilo più difficile.",
      "flash": [
       "Lombari a terra",
       "Espira salendo",
       "Non tirare il collo"
      ],
      "sets": [
       {
        "t": "15-20"
       },
       {
        "t": "15-20"
       },
       {
        "t": "15-20"
       }
      ],
      "bw": true,
      "m": {
       "p": [
        "ABS"
       ],
       "s": [
        "OBLIQUES"
       ]
      },
      "ml": "",
      "cues": [
       "Supino, ginocchia piegate, piedi a terra, mani leggere dietro la testa o sul petto.",
       "Espira e solleva le scapole arrotolando il busto.",
       "La zona lombare resta a terra.",
       "Scendi lento senza appoggiare del tutto la testa."
      ],
      "errors": [
       "Tirare il collo con le mani",
       "Usare lo slancio"
      ],
      "img": {
       "local": [
        "crunch-f1.webp",
        "crunch-f2.webp"
       ]
      },
      "ref": {},
      "setup": false,
      "key": "crunch"
     },
     {
      "name": "Crunch inverso",
      "tec": "3 serie da 15–20 reps a corpo libero. Quando arrivi a 20 su tutte, rendilo più difficile.",
      "flash": [
       "Stacca il bacino",
       "Niente slancio",
       "Scendi lento"
      ],
      "sets": [
       {
        "t": "15-20"
       },
       {
        "t": "15-20"
       },
       {
        "t": "15-20"
       }
      ],
      "bw": true,
      "m": {
       "p": [
        "ABS"
       ],
       "s": [
        "OBLIQUES"
       ]
      },
      "ml": "",
      "cues": [
       "Supino, mani lungo i fianchi o a tenere la panca dietro la testa.",
       "Gambe piegate a 90°.",
       "Porta le ginocchia verso il petto staccando il bacino da terra.",
       "Scendi lento senza appoggiare i piedi."
      ],
      "errors": [
       "Slancio con le gambe",
       "Muovere solo le gambe senza staccare il bacino"
      ],
      "img": {
       "local": [
        "inverso-f1.webp",
        "inverso-f2.webp",
        "inverso-d1.webp",
        "inverso-d2.webp"
       ]
      },
      "ref": {},
      "setup": false,
      "key": "crunch-inverso"
     },
     {
      "name": "Lombari (hyperextension)",
      "tec": "3 serie da 15–20 reps a corpo libero. Quando arrivi a 20 su tutte, rendilo più difficile.",
      "flash": [
       "Piega dalle anche",
       "Sali fino in linea",
       "Non inarcarti oltre"
      ],
      "sets": [
       {
        "t": "15-20"
       },
       {
        "t": "15-20"
       },
       {
        "t": "15-20"
       }
      ],
      "bw": true,
      "m": {
       "p": [
        "LOWER_BACK"
       ],
       "s": [
        "GLUTEAL",
        "HAMSTRING"
       ]
      },
      "ml": "",
      "cues": [
       "Regola il cuscinetto appena sotto le anche: il bacino deve potersi piegare.",
       "Braccia incrociate sul petto, schiena dritta.",
       "Scendi piegandoti dalle anche.",
       "Risali finché busto e gambe sono in linea."
      ],
      "errors": [
       "Salire oltre la linea inarcando la schiena",
       "Usare lo slancio"
      ],
      "img": {
       "local": [
        "lombari-f1.webp",
        "lombari-f2.webp",
        "lombari-d1.webp",
        "lombari-d2.webp"
       ]
      },
      "ref": {},
      "setup": true,
      "key": "lombari-hyperextension"
     }
    ]
   }
  ],
  "from": "2026-11-15"
 }
];
