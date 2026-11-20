// Service worker: rende l'app utilizzabile anche senza connessione.
// Quando aggiorni i file, cambia VERSION per forzare l'aggiornamento sui telefoni.
const VERSION = "2026-11-20-10";
const FILES = ["./", "index.html", "style.css", "app.js", "data.js", "schede.js", "macchine.js", "macchine-db.js", "macchine-schede.js", "nutrizione.js", "cibo.js", "img/m-abd-f1.webp", "img/m-abd-f2.webp", "img/m-abs-f1.webp", "img/m-abs-f2.webp", "img/m-add-f1.webp", "img/m-add-f2.webp", "img/m-bic-f1.webp", "img/m-bic-f2.webp", "img/m-cable-f1.webp", "img/m-cable-f2.webp", "img/m-calfs-f1.webp", "img/m-calfs-f2.webp", "img/m-cp-f1.webp", "img/m-cp-f2.webp", "img/m-dip-f1.webp", "img/m-dip-f2.webp", "img/m-dp-f1.webp", "img/m-dp-f2.webp", "img/m-fly-f1.webp", "img/m-fly-f2.webp", "img/m-ham-f1.webp", "img/m-ham-f2.webp", "img/m-hrow-f1.webp", "img/m-hrow-f2.webp", "img/m-ip-f1.webp", "img/m-ip-f2.webp", "img/m-lat-f1.webp", "img/m-lat-f2.webp", "img/m-lck-f1.webp", "img/m-lck-f2.webp", "img/m-lcs-f1.webp", "img/m-lcs-f2.webp", "img/m-lunge-f1.webp", "img/m-lunge-f2.webp", "img/m-rd-f1.webp", "img/m-rd-f2.webp", "img/m-row-f1.webp", "img/m-row-f2.webp", "img/m-shrug-f1.webp", "img/m-shrug-f2.webp", "img/m-smith-f1.webp", "img/m-smith-f2.webp", "img/m-sp-f1.webp", "img/m-sp-f2.webp", "img/m-tbar-f1.webp", "img/m-tbar-f2.webp", "img/m-tri-f1.webp", "img/m-tri-f2.webp", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "img/affondi-d1.webp", "img/affondi-d2.webp", "img/affondi-f1.webp", "img/affondi-f2.webp", "img/alzate_lat-d1.webp", "img/alzate_lat-d2.webp", "img/alzate_lat-f1.webp", "img/alzate_lat-f2.webp", "img/calf-f1.webp", "img/calf-f2.webp", "img/croci_incl-d1.webp", "img/croci_incl-d2.webp", "img/croci_incl-f1.webp", "img/croci_incl-f2.webp", "img/crunch-f1.webp", "img/crunch-f2.webp", "img/crunch-d1.webp", "img/crunch-d2.webp", "img/curl_bil-d1.webp", "img/curl_bil-d2.webp", "img/curl_bil-f1.webp", "img/curl_bil-f2.webp", "img/face_pull-f1.webp", "img/face_pull-f2.webp", "img/french-d1.webp", "img/french-d2.webp", "img/french-f1.webp", "img/french-f2.webp", "img/hack-f1.webp", "img/hack-f2.webp", "img/hip_thrust-f1.webp", "img/hip_thrust-f2.webp", "img/inverso-d1.webp", "img/inverso-d2.webp", "img/inverso-f1.webp", "img/inverso-f2.webp", "img/lat-f1.webp", "img/lat-f2.webp", "img/leg_curl-d1.webp", "img/leg_curl-d2.webp", "img/leg_curl-f1.webp", "img/leg_curl-f2.webp", "img/leg_ext-d1.webp", "img/leg_ext-d2.webp", "img/leg_ext-f1.webp", "img/leg_ext-f2.webp", "img/leg_press-d1.webp", "img/leg_press-d2.webp", "img/leg_press-f1.webp", "img/leg_press-f2.webp", "img/lombari-d1.webp", "img/lombari-d2.webp", "img/lombari-f1.webp", "img/lombari-f2.webp", "img/manubri_incl-d1.webp", "img/manubri_incl-d2.webp", "img/manubri_incl-f1.webp", "img/manubri_incl-f2.webp", "img/martello-d1.webp", "img/martello-d2.webp", "img/martello-f1.webp", "img/martello-f2.webp", "img/panca_incl-d1.webp", "img/panca_incl-d2.webp", "img/panca_incl-f1.webp", "img/panca_incl-f2.webp", "img/peck_back-f1.webp", "img/peck_back-f2.webp", "img/pulley-d1.webp", "img/pulley-d2.webp", "img/pulley-f1.webp", "img/pulley-f2.webp", "img/pushdown-d1.webp", "img/pushdown-d2.webp", "img/pushdown-f1.webp", "img/pushdown-f2.webp", "img/rematore-f1.webp", "img/rematore-f2.webp", "img/rematore-d1.webp", "img/rematore-d2.webp", "img/rumeno-f1.webp", "img/rumeno-f2.webp", "img/shoulder-d1.webp", "img/shoulder-d2.webp", "img/shoulder-f1.webp", "img/shoulder-f2.webp", "img/theme/gt-corner.svg", "img/theme/gt-done.svg", "img/theme/gt-emblem.svg", "img/theme/gt-frieze.svg", "img/theme/gt-leaf.svg", "img/theme/gt-leaves.svg", "img/theme/gt-side.svg", "img/theme/sp-top.svg", "img/theme/sp-side.svg", "img/theme/sp-corner.svg", "img/theme/sp-frieze.svg", "img/theme/sp-helmet.svg", "img/theme/sp-laurel.svg", "img/theme/sp-meander.svg"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // rete prima per i file della scheda (così gli aggiornamenti arrivano subito), cache se offline
    if (/\/(schede|app|data|macchine|macchine-db|macchine-schede|nutrizione|cibo)\.js$|\/index\.html$|\/$|\/style\.css$/.test(url.pathname)) {
      // cache:"no-cache" = chiede sempre al server se il file è cambiato (GitHub Pages lo farebbe tenere 10 minuti)
      e.respondWith(fetch(req, { cache: "no-cache" }).then(r => { const c = r.clone(); caches.open(VERSION).then(ca => ca.put(req, c)); return r; }).catch(() => caches.match(req, { ignoreSearch: true })));
    } else {
      e.respondWith(caches.match(req, { ignoreSearch: true }).then(m => m || fetch(req).then(r => { const c = r.clone(); caches.open(VERSION).then(ca => ca.put(req, c)); return r; })));
    }
  } else if (url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")) {
    e.respondWith(caches.match(req).then(m => m || fetch(req).then(r => { const c = r.clone(); caches.open(VERSION).then(ca => ca.put(req, c)); return r; })));
  }
});

// l'app chiede la versione installata (Impostazioni → Versione)
self.addEventListener("message", e => { if (e.data === "ver" && e.ports[0]) e.ports[0].postMessage(VERSION); });

// Notifiche push del timer di recupero (inviate dal servizio in worker/): mostrate anche a telefono bloccato
self.addEventListener("push", e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || "Palestra", {
    body: d.body || "", tag: d.tag || "rest", renotify: true, icon: "icons/icon-192.png", badge: "icons/icon-192.png",
    timestamp: d.at || Date.now(), data: { url: "./" },
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    for (const c of cs) if ("focus" in c) return c.focus();
    return self.clients.openWindow("./");
  }));
});
