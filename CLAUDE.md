# PROGETTO PALESTRA — contesto completo (da incollare all'inizio di una nuova chat)

## Chi sono e come lavoriamo
- Mi alleno in **2 palestre**: **PA = Green Theory**, **PB = Sparta 2.0**. Stessa scheda, ma carichi, regolazioni e progressione **separati** (i kg di macchine diverse non sono confrontabili).
- Il personal trainer (PT) mi manda **una scheda nuova circa ogni mese**, con metodi a volte diversi (piramidali, rest-pause/cedimento, stripping, superserie, alte ripetizioni…).
- **Flusso mensile:** ti mando la **foto della nuova scheda** → tu aggiorni l'app, archivi la vecchia e scegli/verifichi le immagini dei nuovi esercizi.
- Rispondimi in italiano, diretto e sintetico. Se un dato manca o un esercizio è ambiguo, chiedimelo invece di inventare.

## L'app
- **Indirizzo:** https://gianlucabrandi42-netizen.github.io/Palestra/ (P maiuscola). La apro dall'**icona sulla Home** del telefono: i dati stanno lì, non nel browser.
- **Repository GitHub:** `gianlucabrandi42-netizen/Palestra` (pubblico, branch `main`, GitHub Pages da `main` / root). Sullo stesso account c'è anche il repo `brandilab`: **non va toccato**. La Claude GitHub App è autorizzata solo su `Palestra`.
- **Funziona senza abbonamento Claude:** sito statico + dati salvati **solo sul telefono** (localStorage, chiave `palestra-v1`), con **Backup/Ripristino** su file JSON ed esportazione CSV per Excel. Funziona anche offline (service worker).
- **Tema scuro.** Colore accento per palestra: blu = Green Theory, arancio = Sparta.

### File del repository
| File | Cosa contiene |
|---|---|
| `schede.js` | **L'unico file da modificare a ogni cambio scheda**: `PALESTRE`, `SCHEDA_ATTIVA`, `SCHEDE` (attiva + archivio). In testa c'è il commento che spiega il formato. |
| `app.js` | Logica dell'app (registrazione, valutazione serie, kg suggeriti, progressi, backup) |
| `index.html`, `style.css` | Interfaccia |
| `data.js` | Poligoni della mappa muscoli (react-body-highlighter, MIT) |
| `img/` | Immagini esercizi in webp: `<key>-f1/f2` = foto inizio/fine; `<key>-d1/d2` = disegni inizio/fine |
| `sw.js` | Service worker: **a ogni aggiornamento cambiare `VERSION`** (es. `"2026-12-01-1"`), altrimenti i telefoni non scaricano subito i file nuovi |
| `manifest.webmanifest`, `icons/` | Icona (manubrio) e installazione sulla Home |
| `LEGGIMI.md` / `README.md` | Istruzioni brevi |
| `tools/pdf_pt.py` | Genera il PDF di controllo veloce per il PT dalla scheda attiva |
| `CLAUDE.md` | Questo contesto, letto in automatico da Claude Code |

### Formato di un esercizio in `schede.js`
```js
{
  "key": "panca-inclinata-multipower", // ID FISSO: se resta uguale tra due schede, lo storico dei carichi continua
  "name": "Panca inclinata Multipower",
  "tec": "3 serie piramidali: 10 reps, poi 8, poi 8. Aumenta il carico quando scendono le reps.", // "tecnica esatta", come nella mia scheda Excel originale
  "flash": ["Scapole strette", "Sbarra al petto alto", "Gomiti a 60°"], // 2-3 consigli brevissimi, sempre visibili
  "sets": [{"t":"10"}, {"t":"8"}, {"t":"8"}], // t = reps previste ("10", "15-20", "max")
  // type facoltativo per serie: "ced" cedimento/rest-pause · "strip" stripping · "alte" alte reps · "pausa" pausa programmata · "super" superserie · "risc" riscaldamento; note facoltativa es. 'dopo 15"'
  "rest": "90\"",            // facoltativo, recupero
  "bw": false,               // true = corpo libero (kg facoltativi)
  "m": {"p": ["CHEST","FRONT_DELTOIDS"], "s": ["TRICEPS"]}, // muscoli principali/secondari (nomi della mappa)
  "ml": "Petto alto · Deltoidi anteriori",  // facoltativo, etichetta muscoli personalizzata
  "cues": ["…", "…", "…", "…"],   // esecuzione (4 punti)
  "errors": ["…", "…"],           // errori da evitare
  "img": {"local": ["panca_incl-f1.webp","panca_incl-f2.webp","panca_incl-d1.webp","panca_incl-d2.webp"]},
  "ref": {"PA": 10},              // facoltativo: kg di riferimento della scheda precedente
  "setup": true                   // false = nasconde il campo "Regolazioni"
}
```
Muscoli disponibili per `m`: CHEST, FRONT_DELTOIDS, BACK_DELTOIDS, TRICEPS, BICEPS, FOREARM, ABS, OBLIQUES, TRAPEZIUS, UPPER_BACK (dorsali), LOWER_BACK (lombari), GLUTEAL, HAMSTRING, QUADRICEPS, CALVES, LEFT_SOLEUS, RIGHT_SOLEUS, ABDUCTORS (adduttori), ABDUCTOR, NECK. Il deltoide laterale non esiste nella mappa: per le alzate laterali si colorano anteriore + posteriore e si spiega in `ml`.

### Cosa fa l'app (per non rompere nulla)
- **Allenamento:** si scelgono palestra, giorno e data. Per ogni esercizio:
  - animazione del movimento (foto inizio/fine alternate), con zoom a pizzico o doppio tocco;
  - nome, tecnica esatta e consigli flash;
  - campo **Regolazioni**, separato per palestra;
  - per ogni serie: ultima volta, **kg suggeriti oggi**, kg e reps;
  - "Dettagli": galleria, mappa muscoli davanti/dietro, esecuzione ed errori.
- **Valutazione graduata delle serie** (non solo rosso/verde). La forza è stimata con Epley, kg × (1 + reps/30), e confrontata con la stessa serie dell'ultima seduta normale:
  - verde = target raggiunto;
  - azzurro = meno reps ma forza pari o superiore (più kg, oppure in linea con una giornata no);
  - giallo = quasi (≥80% del target, ≥60% se giornata no) oppure carico salito;
  - rosso = molto sotto.
- **Forma del giorno** ("Al top / Normale / Stanco / giù"): stanco = −10%.
- **Rientro dopo una pausa**, calcolato automaticamente sui giorni dall'ultimo allenamento in qualsiasi palestra:
  - 10–20 gg = −10%; 21–34 gg = −15%; 35+ gg = −25%;
  - c'è il tasto "Non è un rientro".
- **Kg suggeriti:**
  - base = ultima seduta normale (salta fino a 2 giornate no o di rientro);
  - +2,5% (minimo +1 kg) se l'ultima volta tutte le serie erano a target;
  - poi × fattore forma/pausa, arrotondato a 0,5 kg.
- **Progressi:** per ogni esercizio un indice per seduta (Σ kg×reps, o totale reps a corpo libero), più grafico e trend. Le giornate no e i rientri sono **esclusi dal trend**.
- **Storico collegato per `key`** tra schede diverse e per palestra.
- **Timer di recupero** (barra sopra il menu in basso):
  - base **1:30** per tutti gli esercizi, regolabile (±15" dalla barra o da Backup → Timer di recupero); se un esercizio ha `rest` in `schede.js`, vale quello (formati accettati: `90"`, `1'30`, `1:30`, `2'`);
  - parte da solo quando inserisci le reps di una serie (solo per la seduta di oggi); si può anche avviare a mano (tocco sul tempo a timer fermo), mettere in pausa (tasto ⏸/▶), fermare (✕), ±15";
  - **tocco sul tempo durante il recupero → porta alla prossima serie da fare** (stessa logica della ripresa all'apertura, anche da un'altra sezione);
  - iPhone sospende l'audio delle app web silenziose: durante il recupero l'app tiene acceso un tono inudibile (40 Hz, volume minimo) perché i bip di fine timer suonino; si spegne in pausa/stop/fine;
  - a fine recupero: vibrazione (Android), 3 bip, "VIA!" verde; avviso breve a 5" dalla fine. Ogni avviso si può disattivare;
  - iPhone: le app web non possono vibrare → solo un leggero tocco aptico (iOS 18+, trucco dell'interruttore) + suono, che con il telefono in silenzioso potrebbe non sentirsi;
  - mentre conta, lo schermo resta acceso (Wake Lock); a telefono bloccato l'app è sospesa e l'avviso arriva alla riapertura;
  - impostazioni in `D.prefs.timer`, timer in corso in localStorage `palestra-timer` (non nel backup).
  - **Notifica a schermo spento / altra app** (opzione in Backup → Timer, da attivare): l'app usa **ntfy.sh** (gratuito, senza account) + app **ntfy** sull'iPhone, iscritta a un canale casuale (`D.prefs.timer.topic`, es. `palestra-xxxxxxxxx`, fa da password). All'avvio del recupero l'app programma sul server una notifica (`POST ntfy.sh/<topic>/<sid>?at=<fine−5">`); ±15" la sostituisce (stesso sequence ID), pausa/stop la annullano (`DELETE ntfy.sh/<topic>/<sid>`). Il server invia le notifiche programmate ogni 10" → arriva tra circa −5" e +5". Ritardo minimo 10": recuperi più brevi restano solo nell'app. ntfy.sh non è raggiungibile dalla sessione cloud: si prova solo dal telefono.
- **Ripresa all'apertura:** ogni volta che inserisci le reps, l'app salva palestra, giorno, esercizio e serie (localStorage `palestra-last`). Se riapri l'app lo stesso giorno, torna lì e evidenzia la prossima serie da fare: la stessa se mancano le reps, altrimenti la successiva o il primo set dell'esercizio dopo (nei circuiti segue l'ordine del giro).
- **Circuiti** (campo `circ` in `schede.js`): esercizi consecutivi con lo stesso `circ` si fanno di seguito senza pausa. Il loro `rest` parte solo dopo l'ultimo esercizio del giro. Con "Invio" dalle reps si passa all'esercizio successivo del giro, poi al giro dopo. Le serie S1/S2/S3 corrispondono ai giri.

## Procedura di aggiornamento mensile (per Claude)
1. Leggi la foto della scheda. Elenca esercizi e schemi e chiedimi conferma su abbreviazioni o interpretazioni dubbie, **prima** di modificare.
2. In `schede.js` aggiungi la nuova scheda (nuovo `id`, es. `p2026-12`, con `name` e `from`), imposta `SCHEDA_ATTIVA` e aggiungi `to` alla vecchia. **Non cancellare le schede vecchie** (sono l'archivio).
3. **Riusa la stessa `key`** per gli esercizi che restano uguali, anche se cambia lo schema: così lo storico continua.
4. Scrivi `tec` nello stile dell'Excel originale, cioè lo schema spiegato a parole. Esempi: "3 serie piramidali: 10, poi 8, poi 8. Aumenta il carico quando scendono le reps" / "3×8, ultima serie: 15" pausa + cedimento + 15" pausa + cedimento" / "2×10 + 1×(8+8+8) stripping". Usa `type` sulle serie speciali.
5. Aggiungi `flash` (3 consigli brevissimi), `cues` (4), `errors` (2) e `m` (muscoli).
6. **Immagini dei nuovi esercizi**, da fonti libere e **verificate a vista una per una**:
   - Foto: Free Exercise DB, pubblico dominio: `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/<Id>/0.jpg` e `1.jpg` (elenco in `dist/exercises.json`).
   - Disegni: Everkinetic, CC BY-SA 4.0, repo `everkinetic/data`. Usare `dist/png/<id>-relaxation.png` / `-tension.png`, **non** `src/images-web`, che ha errori di catalogazione.
   - Converti in webp (foto larghe 720 px, disegni 520 px) e salvale in `img/` come `<nome>-f1/-f2/-d1/-d2.webp`.
   - **Errori già trovati, da non ripetere:** l'immagine "smith-machine-incline-bench-press" di Everkinetic images-web mostra un piegamento su una palla; la lat machine wide-grip di Everkinetic tira dietro la nuca (sbagliato).
   - Nota: nelle foto degli affondi in camminata l'atleta è senza manubri (`imgNote` se serve).
7. Cambia `VERSION` in `sw.js`. Fai commit e push su `main` di `Palestra` e verifica che il workflow "pages build and deployment" sia `success`.
8. Prepara il **PDF per il PT** con `python3 tools/pdf_pt.py "Scheda_<mese>_per_PT.pdf"` (in cima allo script, la lista `DUBBI` da compilare con le domande della nuova scheda): 1 tabella per giorno con esercizio + serie/tecnica, foto inizio → fine, consigli flash, errori; in alto i dubbi da confermare. **Niente spunte né caselle**: deve essere un'occhiata veloce. Foto compresse (JPEG ~360 px) per stare sotto ~1 MB.

### Limiti tecnici noti (sessioni Claude Code nel cloud)
- Il push funziona solo se la Claude GitHub App è installata su `Palestra` (fatto).
- L'API GitHub Pages è bloccata dal proxy: impostazioni di Pages solo a mano (già attive).
- `github.io` e `cdn.jsdelivr.net` non sono raggiungibili dalla sessione, mentre `raw.githubusercontent.com` sì. L'app online la provo io dal telefono.

## Scheda in uso: "Scheda novembre 2026" (id `p2026-11`, dal 15/11/2026)
- **G1 Petto · Tricipiti · Spalle:**
  - Panca inclinata Multipower 10-8-8
  - Panca inclinata manubri 3×8
  - Croci inclinata manubri 3×10
  - Spinte in basso al cavo (corda) 10-8-8
  - French press bilanciere 3×10
  - Alzate laterali 3×10
  - Shoulder press macchina 10-8-8
  - **Circuito addominali**: Crunch → Crunch inverso → Lombari (hyperextension), 15-20 reps ciascuno senza pausa, **30" di recupero dopo il giro completo**, 3 giri (confermato da me)
- **G2 Dorso · Bicipiti · Posteriori:**
  - Rematore bilanciere 10-8-8
  - Pulley basso 8-8-6
  - Lat machine avanti 3×10
  - Curl bilanciere 10-8-8
  - Curl martello manubri 3×10
  - Peck back (deltoidi posteriori) 3×10
  - Face pull (corda cavo alto) 3×12
  - addominali come G1
- **G3 Gambe:**
  - Hack squat 3×8
  - Leg press 3×10
  - Leg extension 10-10-8-8
  - Affondi in camminata 3×10 per gamba
  - Leg curl sdraiato 10-8-8
  - Stacchi rumeni 3×10
  - Hip thrust 3×10
  - Calf in piedi 3×12
  - addominali come G1
- Confermati da me: panca al **Multipower**, shoulder press alla **macchina**, "mezzi stacchi" = **stacchi rumeni**, "tirate corda cavo alto" = **face pull**, affondi **10 per gamba**, addominali dei giorni 2 e 3 = quelli del giorno 1. Tapis roulant a fine allenamento **tolto**.
- Riferimenti kg dalla scheda precedente (ultimo massimo):
  - Green Theory: Multipower 10, pushdown 25, french press 25, peck back 41, leg press 72, leg extension 59, leg curl 45, calf 16.
  - Sparta: shoulder press 19, alzate laterali 7.

## In sospeso
- **Ho mandato al PT il PDF di controllo** (`Scheda_novembre_2026_per_PT.pdf`) con 4 dubbi:
  1. 10-8-8 / 8-8-6 / 10-10-8-8 intesi come piramidali (sali di carico quando scendono le reps)?
  2. Addominali dei giorni 2 e 3 uguali al giorno 1?
  3. **Recupero tra le serie** (non indicato): quanto? → da inserire in `rest`. Per ora l'app usa 1:30 di base; addominali già definiti: 30" a fine circuito.
  4. Interpretazioni: lombari = hyperextension, mezzi stacchi = stacchi rumeni, tirate corda cavo alto = face pull, affondi 10 per gamba.
- Quando il PT risponde: applicare le correzioni in `schede.js` (e nelle immagini, se serve), poi pubblicare.
- Le percentuali di forma e rientro sono stime prudenti: si possono cambiare se il PT preferisce altri valori.

## Cose da sapere
- Una prima versione dell'app era un artifact su claude.ai (https://claude.ai/artifact/LJ6wYZbo7izSqvqboyUWzU): **non è più in uso**, non contiene dati e si può ignorare o eliminare.
- I file Excel e i PDF per il PT li conservo io (scaricati dalla chat): non sono nel repository.

## Storico del progetto
- In origine c'era un file Excel creato con ChatGPT (`Scheda_Allenamento_Green_Theory_Sparta_2_0.xlsm`): fogli per giorno e palestra, sessioni in orizzontale, foglio progressione. La colonna "Tecnica esatta" descriveva lo schema delle serie: è lo stile che mi piace e che va mantenuto.
- Poi una versione aggiornata (`Scheda_Allenamento_Green_Theory_Sparta_v2.xlsx`), con lo storico della scheda vecchia nei fogli "Old …". Oggi l'Excel resta solo come backup: l'app è lo strumento principale.
