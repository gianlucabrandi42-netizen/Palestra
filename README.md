# Palestra — app della scheda di allenamento

App per il telefono: scheda del personal trainer, kg e ripetizioni per serie, foto con animazione del movimento, mappa dei muscoli, regolazioni delle macchine e progressi. Funziona anche senza connessione e senza abbonamenti.

## Dove sono i dati
- **Allenamenti, regolazioni, note**: solo sul telefono (memoria dell'app). Fai un **Backup** dalla scheda "Backup" ogni 2 settimane e salvalo su Drive o iCloud. Con "Ripristina backup" li ricarichi su un telefono nuovo.
- **La scheda del PT**: nel file `schede.js` di questo repository.

## Cambio scheda mensile
1. Si aggiunge la nuova scheda in `schede.js` e si mette il suo id in `SCHEDA_ATTIVA`. Le vecchie restano nell'elenco come archivio.
2. Se un esercizio resta uguale, si tiene lo stesso `key`: lo storico dei carichi continua.
3. Per esercizi nuovi si aggiungono le immagini in `img/`.
4. In `sw.js` si cambia `VERSION` (per esempio la data) così i telefoni scaricano subito la nuova scheda.

## Pubblicazione (GitHub Pages)
Settings → Pages → Source: "Deploy from a branch" → Branch `main`, cartella `/ (root)` → Save.
Indirizzo: `https://<tuo-utente>.github.io/palestra/`

## Aggiungere l'icona alla schermata Home
- **iPhone**: apri l'indirizzo in Safari → Condividi → "Aggiungi alla schermata Home".
- **Android**: apri in Chrome → menu ⋮ → "Installa app" oppure "Aggiungi a schermata Home".

## Crediti immagini
Foto: Free Exercise DB (pubblico dominio). Illustrazioni: Everkinetic (CC BY-SA 4.0). Mappa muscoli: react-body-highlighter (MIT).
