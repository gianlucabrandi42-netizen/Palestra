/* Palestra — Avvio dell'app: prima schermata, ritorno nell'app, aggiornamenti, versione.
   Parte di app.js diviso il 22/11/2026: i file js/01…09 si caricano in ordine (index.html) e condividono le stesse funzioni globali. */
"use strict";
// caricamento delle foto salvate (IndexedDB): spostato qui dal blocco ARCHIVIO FOTO, così parte quando tutti i file sono caricati
if (window.indexedDB) picLoadAll().then(migratePics).then(() => render()).catch(() => {});
if ("scrollRestoration" in history) history.scrollRestoration = "manual";
// 20/11/2026 (richiesta dell'utente): l'app si apre sul CIBO, a meno che ci sia un allenamento in corso (recupero che conta,
// oppure seduta di oggi iniziata, non finita, senza "Fine allenamento" e con l'ultimo inserimento da meno di 45'): allora torna lì.
function trainingActive() {
  if (running()) return true;
  let L = null; try { L = JSON.parse(localStorage.getItem(LKEY)); } catch (e) {}
  if (!L || L.date !== todayISO()) return false;
  const s = Object.values(D.sessions).filter(x => x.date === L.date && x.gym === L.gym && x.day === L.day && hasData(x)).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0];
  if (!s || s.tEnd || sessDone(s)) return false;
  return Date.now() - (s.t1 || s.updatedAt || 0) < 45 * 60000;
}
if (!trainingActive()) S.view = "cibo";
render();
resumeLast();
// tornando nell'app dopo più di 10 minuti: allenamento in corso → la seduta; altrimenti il Cibo (se eri in Allenamento)
{ let away = 0; document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") { away = Date.now(); return; }
  if (!away || Date.now() - away < 600000 || document.activeElement?.matches("input,textarea")) return;
  if (trainingActive()) { if (S.view !== "log") resumeLast(true); }
  else if (S.view === "log") { S.view = "cibo"; render(); scrollTo(0, 0); }
}); }
// Aggiornamenti (20/11/2026: "non vedo l'app cambiata"): controlla sw.js a ogni apertura e ritorno nell'app; quando il service worker
// nuovo prende il comando, ricarica la pagina una volta (subito se non stai scrivendo, altrimenti alla prossima uscita/rientro).
if ("serviceWorker" in navigator && location.protocol === "https:") {
  const hadCtl = !!navigator.serviceWorker.controller; let swReload = false, swDone = false;
  const doReload = () => { if (swDone) return; const a = document.activeElement; if (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) { swReload = true; return; } swDone = true; location.reload(); };
  // 22/11/2026 ("la schermata si ricarica e perdo il punto"): l'aggiornamento arrivava qualche secondo dopo il rientro nell'app,
  // mentre si toccavano i pulsanti. Ora la pagina si ricarica solo quando non la stai usando: uscendo dall'app o al rientro,
  // oppure subito solo nei primi 1,5" dall'apertura (prima di qualsiasi tocco).
  const t0 = Date.now(); let touched = false; addEventListener("pointerdown", () => { touched = true; }, { capture: true, passive: true });
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!hadCtl) return; if (!touched && Date.now() - t0 < 1500) doReload(); else swReload = true; });
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden" && swReload) { swDone = true; location.reload(); } });
  navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then(reg => {
    document.addEventListener("visibilitychange", () => { if (document.visibilityState !== "visible") return; if (swReload) return doReload(); reg.update().catch(() => {}); });
  }).catch(() => {});
}
// versione installata, per controllare che l'aggiornamento sia arrivato
setTimeout(() => swVersion().then(v => { const e = $("appVer"); if (e) e.textContent = "Versione app: " + (v || "non installata (aperta dal browser?)"); }), 800);
function swVersion() { return new Promise(ok => { const c = navigator.serviceWorker && navigator.serviceWorker.controller; if (!c) return ok(null); const ch = new MessageChannel(); ch.port1.onmessage = e => ok(e.data); c.postMessage("ver", [ch.port2]); setTimeout(() => ok(null), 1500); }); }
