/* Palestra — Backup su file, backup online cifrato, navigazione.
   Parte di app.js diviso il 22/11/2026: i file js/01…10 si caricano in ordine (index.html) e condividono le stesse funzioni globali. */
"use strict";
// ---------- backup ----------
function backupData() { return JSON.stringify({ app: "palestra", v: 1, exportedAt: new Date().toISOString(), data: D, pics: Object.fromEntries(PICM) }, null, 1); }
// Promemoria backup (17/11/2026): dopo 3 sedute nuove o 7 giorni dall'ultimo; anche nel recap. Il telefono non deve cancellare i dati da solo.
const sessSinceBackup = () => { const t = D.prefs.lastBackup ? Date.parse(D.prefs.lastBackup) : 0; return Object.values(D.sessions).filter(s => hasData(s) && (s.updatedAt || 0) > t && s.date >= (D.prefs.lastBackup || "").slice(0, 10)).length; };
const needBackup = () => { const c = cloud(); if (c.code && c.last && Date.now() - c.last < 3 * 864e5) return false; const ds = daysSince(D.prefs.lastBackup); return Object.values(D.sessions).some(hasData) && (ds == null || ds >= 7 || sessSinceBackup() >= 3); };
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
async function exportBackup() {
  const name = `palestra-backup-${todayISO()}.json`, blob = new Blob([backupData()], { type: "application/json" });
  let ok = false;
  try {
    const file = new File([blob], name, { type: "application/json" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: "Backup Palestra" }); ok = true; }
  } catch (e) { if (e && e.name === "AbortError") return; }
  if (!ok) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); }
  D.prefs.lastBackup = new Date().toISOString(); save(true); toast("Backup creato"); render();
}
$("bkExport").onclick = exportBackup;
// unisce un backup ai dati del telefono: sedute più recenti vincono, il resto si somma (vale per file e backup online)
function mergeData(inc) {
  let added = 0;
  for (const [id, s] of Object.entries(inc.sessions || {})) { const l = D.sessions[id]; if (!l || (s.updatedAt || 0) > (l.updatedAt || 0)) { D.sessions[id] = s; added++; } }
  for (const g of Object.keys(inc.setup || {})) D.setup[g] = { ...(inc.setup[g] || {}), ...(D.setup[g] || {}) };
  for (const g of Object.keys(inc.steps || {})) { D.steps = D.steps || {}; D.steps[g] = { ...(inc.steps[g] || {}), ...(D.steps[g] || {}) }; }
  D.rest = { ...(inc.rest || {}), ...(D.rest || {}) }; D.setDur = { ...(inc.setDur || {}), ...(D.setDur || {}) }; D.resets = { ...(inc.resets || {}), ...(D.resets || {}) };
  for (const g of Object.keys(inc.machines || {})) { D.machines = D.machines || {}; D.machines[g] = { ...(inc.machines[g] || {}), ...(D.machines[g] || {}) }; }
  if (Array.isArray(inc.body)) { const have = new Set((D.body || []).map(b => b.id)); D.body = [...(D.body || []), ...inc.body.filter(b => b && !have.has(b.id))]; }
  if (typeof mergeFood === "function") mergeFood(inc); // sezione Cibo (20/11/2026)
  return added;
}
// ---------- Backup automatico online, cifrato (19/11/2026) ----------
// Al primo uso l'app crea un CODICE DI RECUPERO (16 caratteri) che l'utente si salva. Dal codice nascono l'indirizzo del
// backup (SHA-256) e la chiave di cifratura (PBKDF2 → AES-GCM): il servizio riceve solo dati cifrati e non può leggerli.
// Codice e stato stanno in localStorage "palestra-cloud", mai nel backup. Carica: all'avvio, 90" dopo l'ultima modifica,
// a fine allenamento. Ripristino su un telefono nuovo: Impostazioni → "Ripristina con il codice".
const CLOUDK = "palestra-cloud", B32 = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const cloud = () => { try { return JSON.parse(localStorage.getItem(CLOUDK)) || {}; } catch (e) { return {}; } };
const setCloud = o => { try { localStorage.setItem(CLOUDK, JSON.stringify({ ...cloud(), ...o })); } catch (e) {} };
const normCode = c => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
const fmtCode = c => normCode(c).match(/.{1,4}/g).join("-");
function newCode() { const r = crypto.getRandomValues(new Uint8Array(16)); return fmtCode([...r].map(b => B32[b % 32]).join("")); }
const b64e = u => { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const b64d = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function codeId(code) { const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("palestra-id:" + normCode(code))); return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join(""); }
async function codeKey(code) {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(normCode(code)), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: new TextEncoder().encode("palestra-backup-v1"), iterations: 150000, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function gzip(str) { if (!window.CompressionStream) return null; return new Uint8Array(await new Response(new Blob([str]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer()); }
async function gunzip(u8) { return new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream("gzip"))).text(); }
const dataSig = () => { const t = JSON.stringify(D); let h = 5381; for (let i = 0; i < t.length; i += 7) h = (h * 33 + t.charCodeAt(i)) | 0; return t.length + ":" + h + ":" + picsSig(); };
async function cloudUpload(force) {
  const c = cloud(); if (!c.code || S.cloudBusy) return; const sig = dataSig(); if (!force && c.sig === sig) return;
  S.cloudBusy = true;
  try {
    const raw = JSON.stringify({ app: "palestra", v: 1, exportedAt: new Date().toISOString(), data: D, pics: Object.fromEntries(PICM) }), z = await gzip(raw).catch(() => null);
    const iv = crypto.getRandomValues(new Uint8Array(12)), ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await codeKey(c.code), z || new TextEncoder().encode(raw)));
    const data = JSON.stringify({ v: 1, z: !!z, iv: b64e(iv), ct: b64e(ct) });
    const r = await fetch(PUSH_URL + "/vault/put", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: await codeId(c.code), data, at: Date.now() }) });
    if (!r.ok) throw 0; setCloud({ last: Date.now(), sig, err: "" });
  } catch (e) { setCloud({ err: navigator.onLine === false ? "senza rete: riprovo dopo" : "non riuscito: riprovo dopo" }); }
  finally { S.cloudBusy = false; if (S.view === "more") renderCloud(); }
}
async function cloudRestore(code, prev) {
  const r = await fetch(PUSH_URL + "/vault/get", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: await codeId(code), prev: !!prev }) });
  if (r.status === 404) throw new Error("Nessun backup con questo codice");
  if (!r.ok) throw new Error("Servizio non raggiungibile, riprova");
  const env = JSON.parse((await r.json()).data); let plain;
  try { plain = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64d(env.iv) }, await codeKey(code), b64d(env.ct))); } catch (e) { throw new Error("Codice sbagliato"); }
  const j = JSON.parse(env.z ? await gunzip(plain) : new TextDecoder().decode(plain)); if (!j || j.app !== "palestra" || !j.data) throw new Error("Backup non valido");
  return j;
}
let cloudT = 0; const cloudSoon = () => { if (!cloud().code) return; clearTimeout(cloudT); cloudT = setTimeout(() => cloudUpload(), 90000); };
setTimeout(() => cloudUpload(), 4000);
// quanto spazio usano i dati (20/11/2026): su iPhone localStorage ha circa 5 MB
function renderStorage() {
  const el = $("stUse"); if (!el) return; const mb = n => (n / 1048576).toLocaleString("it-IT", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
  const ls = ((localStorage.getItem(KEY) || "").length) * 2, pct = ls / (5 * 1048576); let pb = 0; for (const v of PICM.values()) pb += v.length;
  el.innerHTML = `Dati dell'app: <b>${mb(ls)} MB</b> su circa 5 MB${pct > .7 ? ` · <span class="warnc">quasi pieno: fai un backup e dimmelo</span>` : ""} · Foto: <b>${PICM.size}</b> (${mb(pb)} MB, in un archivio a parte, senza limite stretto)`;
}
function renderCloud() {
  renderStorage(); if (typeof aiSettings === "function") aiSettings(); const box = $("cloudSet"); if (!box) return; const c = cloud();
  const when = t => { if (!t) return "mai"; const d = new Date(t), today = new Date().toDateString() === d.toDateString(); return (today ? "oggi" : d.toLocaleDateString("it-IT", { day: "numeric", month: "short" })) + " alle " + d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }); };
  box.innerHTML = c.code ? `<p><b class="okc">● Attivo</b> · ultimo backup online: <b>${when(c.last)}</b>${c.err ? ` · <span class="warnc">${esc(c.err)}</span>` : ""}</p>
      <p class="note">Si salva da solo a fine allenamento e quando modifichi i dati. È cifrato: si apre solo col tuo codice di recupero.</p>
      ${S.showCode ? `<div class="codebox"><b>${esc(fmtCode(c.code))}</b><button class="btn" id="cdCopy">Copia</button></div><p class="note">Tienilo nelle Note o nel portachiavi dell'iPhone: senza codice il backup non si può aprire, da nessuno.</p>` : ""}
      <div class="row"><button class="btn primary" id="cdNow">Backup ora</button><button class="btn" id="cdShow">${S.showCode ? "Nascondi codice" : "Mostra codice"}</button></div>`
    : `<p>Copia automatica e cifrata dei tuoi dati su internet: se perdi o cambi il telefono, la recuperi col <b>codice di recupero</b>.</p>
      <div class="row"><button class="btn primary" id="cdOn">Attiva backup automatico</button></div>`;
  box.insertAdjacentHTML("beforeend", `<details class="cdrest"${S.cdMsg ? " open" : ""}><summary>Ripristina con il codice (telefono nuovo)</summary>
      <div class="row"><input id="cdIn" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX"><button class="btn" id="cdGo">Ripristina</button></div><p class="note" id="cdMsg">${esc(S.cdMsg || "")}</p></details>`);
  const on = $("cdOn"); if (on) on.onclick = () => { setCloud({ code: newCode(), last: 0, sig: "", err: "" }); S.showCode = true; renderCloud(); cloudUpload(true); };
  const nw = $("cdNow"); if (nw) nw.onclick = () => { nw.textContent = "Salvo…"; cloudUpload(true); };
  const sh = $("cdShow"); if (sh) sh.onclick = () => { S.showCode = !S.showCode; renderCloud(); };
  const cp = $("cdCopy"); if (cp) cp.onclick = () => { try { navigator.clipboard.writeText(fmtCode(cloud().code)); toast("Codice copiato"); } catch (e) {} };
  $("cdGo").onclick = async () => {
    const code = $("cdIn").value, msg = $("cdMsg"); if (normCode(code).length < 16) { msg.textContent = "Il codice ha 16 caratteri."; return; }
    msg.textContent = "Scarico e apro il backup…";
    try { const j = await cloudRestore(code); const n = mergeData(j.data); await restorePics(j); setCloud({ code: fmtCode(code), sig: "", err: "" }); save(true);
      const done = `Fatto: ${n} sedute recuperate (backup del ${new Date(j.exportedAt).toLocaleDateString("it-IT")}). Da ora il backup continua con questo codice.`;
      S.cdMsg = done; toast("Backup ripristinato"); render(); cloudUpload(true); }
    catch (e) { msg.textContent = e.message || "Non riuscito"; }
  };
}
$("bkFile").onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  try {
    const j = JSON.parse(await f.text()); if (!j || j.app !== "palestra" || !j.data) throw 0;
    const added = mergeData(j.data); await restorePics(j);
    save(true); $("bkMsg").textContent = `Ripristino fatto: ${added} sedute importate o aggiornate.`; toast("Backup ripristinato"); render();
  } catch (err) { $("bkMsg").textContent = "Questo file non è un backup dell'app Palestra."; }
  e.target.value = "";
};
$("csv").onclick = () => {
  const names = {}; plans.forEach(p => p.days.forEach(d => d.ex.forEach(ex => names[ex.key] = ex.name)));
  const rows = [["data", "palestra", "scheda", "giorno", "esercizio", "serie", "kg", "reps", "reps sporche", "sensazione"]];
  Object.values(D.sessions).sort((a, b) => a.date < b.date ? -1 : 1).forEach(s => {
    const pn = (plans.find(p => p.id === s.plan) || {}).name || s.plan, gn = (GYMS.find(g => g.id === s.gym) || {}).name || s.gym;
    Object.entries(s.circ || {}).forEach(([c, n]) => { if (n > 0) rows.push([s.date, gn, pn, s.day, "Circuito " + c, "giri", "", n]); });
    Object.entries(s.ex || {}).forEach(([k, arr]) => (arr || []).forEach((r, i) => { if (r && (r.kg != null || r.reps != null)) rows.push([s.date, gn, pn, s.day, subOf(s, k) ? `${subOf(s, k)} (al posto di ${names[k] || k})` : names[k] || k, i + 1, fmt(r.kg), r.reps ?? "", r.dirty ? dN(r) : "", r.dirty ? "" : r.help ? "aiutata" : r.eff === "easy" ? "facile" : r.eff === "hard" ? "al limite" : "giusta"]); }));
  });
  const csv = "﻿" + rows.map(r => r.map(x => `"${String(x).replace(/"/g, '""')}"`).join(";")).join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `palestra-${todayISO()}.csv`; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 1000);
};
function renderMore() {
  const ds = daysSince(D.prefs.lastBackup);
  $("backupInfo").textContent = `${Object.values(D.sessions).filter(hasData).length} sedute salvate · ultimo backup: ${ds == null ? "mai" : ds === 0 ? "oggi" : ds + " giorni fa"}`;
  renderTimerSet(); renderCloud();
  $("gymEdit").innerHTML =GYMS.map(g => `<div class="lrow"><div class="t"><b>${esc(g.name)}</b><small>${gymSessions(g.id).length} sedute · carichi e regolazioni separati</small></div></div>`).join("");
}

// ---------- navigazione ----------
document.querySelectorAll(".tabbar button").forEach(b => b.onclick = () => { S.view = b.dataset.view; render(); scrollTo(0, 0); });
function render() {
  if (S.view !== "log") closeSheet();
  if (S.view !== "log" || (FE && !dayObj().ex.some(e => e.key === FE.key))) closeFeel();
  document.querySelectorAll(".tabbar button").forEach(b => b.toggleAttribute("aria-current", b.dataset.view === S.view));
  document.querySelectorAll(".tabbar button[aria-current]").forEach(b => b.setAttribute("aria-current", "page"));
  for (const v of ["log", "prog", "plan", "more", "cibo"]) $("v-" + v).hidden = S.view !== v;
  $("console").hidden = S.view !== "log"; if (S.view !== "log") togglePanel(false);
  if (S.view !== "cibo" && typeof closeRecipe === "function") closeRecipe();
  setTheme(); // 20/11/2026: aprendo direttamente sul Cibo il tema non veniva mai impostato (festa "Giornata completa" trasparente)
  if (S.view === "log") renderLog(); else if (S.view === "prog") renderProg(); else if (S.view === "plan") renderPlans(); else if (S.view === "cibo") { if (typeof renderCibo === "function") renderCibo(); } else renderMore();
  drawTimer(); drawMissing(); markReviewDot();
}
