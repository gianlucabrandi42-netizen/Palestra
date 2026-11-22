/* Palestra — Recap di fine allenamento e scheda dell'esercizio (renderLog).
   Parte di app.js diviso il 22/11/2026: i file js/01…09 si caricano in ordine (index.html) e condividono le stesse funzioni globali. */
"use strict";
// ---------- recap a fine allenamento (tutti gli esercizi fatti, oppure "Fine allenamento") ----------
const e1 = (r, bw) => !r || r.reps == null ? 0 : bw || !r.kg ? r.reps : r.kg * (1 + r.reps / 30);
const durWords = m => { m = Math.max(1, m || 0); const h = Math.floor(m / 60), r = m % 60, hs = `${h} ${h === 1 ? "ora" : "ore"}`, rs = `${r} ${r === 1 ? "minuto" : "minuti"}`; return !h ? rs : !r ? hs : `${hs} e ${rs}`; };
function recapCard(d, s, units) {
  const done = units.filter(u => u.done).length;
  if (!hasData(s) || (done < units.length && !s.tEnd)) return null;
  let nSet = 0, nDone = 0, clean = 0, vol = 0, volPrev = 0, nE = 0, nH = 0, nA = 0, nEx = 0; const upEx = [], better = [], worse = [], recs = [], rests = [], painEx = [], skipEx = [];
  const ok1 = okRec, bud = isBuddy(s); let push1 = 0, dirty2 = 0, dirty3 = 0; // serie con 1 sporca = "hai spinto"; 2+ = da sistemare
  const prevDay = gymSessions(S.gym).filter(x => x.day === s.day && x.date < s.date && home(x) && hasData(x)).pop();
  d.ex.forEach((ex, idx) => {
    if (isCircNoLog(d, idx)) return;
    const cur = exSets(s, ex.key), sk = isSkip(s, ex.key), sb = subOf(s, ex.key), nm = sb || ex.name;
    if (sk) skipEx.push(nm); if (hasPain(s, ex.key)) painEx.push(nm);
    if (sk && !cur.some(r => r && r.reps != null)) return;
    nEx++;
    ex.sets.forEach((st, i) => { const r = cur[i]; if ((sk || i >= need(ex, s)) && !(r && r.reps != null)) return; nSet++; if (r && r.reps != null) { nDone++; const dn = dN(r); if (dn === 1) push1++; else if (dn === 2) dirty2++; else if (dn >= 3) dirty3++; if (!r.dirty) { clean++; if (r.help) nA++; else if (r.eff === "easy") nE++; else if (r.eff === "hard") nH++; } vol += (r.kg || 0) * r.reps; }
      if (i > 0 && !circGroup(d, idx)) { const g = restGap(cur[i - 1], r, ex, i); if (g != null) rests.push({ g, p: restFor(ex), long: lrOn(r) }); } });
    if (!cur.some(r => r && r.reps != null)) return;
    if (!ex.bw && !hasPain(s, ex.key)) { const stv = stepFor(ex.key, sb).v, pv = gymSessions(S.gym).filter(x => x.date < s.date && home(x) && exHas(x, ex.key, sb)).pop(), ps = pv ? exSets(pv, ex.key) : [];
      if (ex.sets.some((st, i) => { const r = cur[i], a = r && r.reps != null ? advise(r, ps[i], tnum(st.t), stv, 1) : null; return a && a.kg > r.kg; })) upEx.push(nm); }
    if (prevDay) exSets(prevDay, ex.key).forEach(r => { if (r && r.reps != null) volPrev += (r.kg || 0) * r.reps; });
    const best = Math.max(0, ...cur.filter(ok1).map(r => e1(recR(r), ex.bw)));
    const before = gymSessions(S.gym).filter(x => x.date < s.date && home(x) && exHas(x, ex.key, sb));
    const last = before[before.length - 1], lb = last ? Math.max(0, ...exSets(last, ex.key).filter(ok1).map(r => e1(recR(r), ex.bw))) : 0;
    const allBest = Math.max(0, ...before.flatMap(x => exSets(x, ex.key).filter(ok1).map(r => e1(recR(r), ex.bw))));
    if (best && lb) { const pc = (best / lb - 1) * 100; if (pc >= 0.5) better.push({ n: nm, pc }); else if (pc <= -0.5) worse.push({ n: nm, pc }); }
    if (best && allBest && best > allBest + 1e-9) recs.push(nm);
  });
  const pcs = x => `${x.pc > 0 ? "+" : "−"}${Math.abs(x.pc).toFixed(Math.abs(x.pc) < 10 ? 1 : 0).replace(".", ",")}%`;
  const vd = prevDay && volPrev ? (vol / volPrev - 1) * 100 : null, dirty = nDone - clean, cp = nDone ? clean / nDone : 1, miss = nSet - nDone;
  const nLong = rests.filter(x => x.long).length, avgR = rests.length ? rests.reduce((a, x) => a + x.g, 0) / rests.length : null, avgP = rests.length ? rests.reduce((a, x) => a + x.p, 0) / rests.length : null;
  const durMin = s.t0 ? Math.round(((s.tEnd || s.t1 || s.t0) - s.t0) / 60000) : null;
  const pastD = gymSessions(S.gym).filter(x => x.day === s.day && x.date < s.date && x.t0 && x.t1 && isBuddy(x) === bud).slice(-5).map(x => ((x.tEnd || x.t1) - x.t0) / 60000);
  const usual = pastD.length >= 2 ? pastD.reduce((a, b) => a + b, 0) / pastD.length : null, special = isOffDay(s) || isAway(s);
  // ---- il verdetto: incoraggia o cazzia, con i motivi concreti ----
  let sc = 0; const good = [], bad = [];
  if (recs.length) { sc += Math.min(4, recs.length * 2); good.push(`${recs.length === 1 ? "Un record" : recs.length + " record"}: ${listIt(recs)}`); }
  if (better.length && better.length >= Math.ceil(nEx / 2)) { sc += 2; good.push(`Meglio dell'ultima volta in ${better.length} esercizi su ${nEx}`); }
  const heavy = dirty2 + dirty3; // serie sporche davvero (2+ reps): quelle con 1 sola sono una spinta, non un errore
  if (nDone && (nDone - heavy) / nDone >= 0.9 && !dirty3) { sc += 1; good.push(push1 ? `Hai spinto in ${push1} ${push1 === 1 ? "serie" : "serie"} (1 rep sporca): così si cresce` : `Esecuzione pulita: ${Math.round(cp * 100)}% delle serie`); }
  if (rests.length >= 4 && !nLong) { sc += 1; good.push(bud ? "Recuperi rispettati anche in 2" : "Recuperi rispettati"); }
  if (!miss) sc += 1;
  { const tot = Object.values(D.sessions).filter(x => hasData(x) && x.date <= s.date).length; if (MILESTONES.includes(tot)) good.unshift(`🎖 ${tot}ª seduta registrata: costanza da campione`); }
  if (heavy >= 3 || dirty3) { sc -= 2; bad.push(dirty3 ? `${dirty3 === 1 ? "Una serie" : dirty3 + " serie"} con 3+ reps sporche${dirty2 ? ` e ${dirty2} con 2` : ""}: lì il carico era troppo. Prima la tecnica, poi il peso.` : `${heavy} serie con 2 reps sporche: stai caricando più di quello che controlli. Prima la tecnica, poi il peso.`); }
  if (bud && nLong) bad.push(`In 2: ${nLong === 1 ? "una serie" : nLong + " serie"} con recupero oltre il doppio (media ${fmtSec(Math.round(avgR))}). Quelle reps non contano per salire.`);
  else if (nLong >= 3 || (rests.length >= 4 && nLong / rests.length >= 0.25)) { sc -= 2; bad.push(`Hai riposato troppo in ${nLong} serie (media ${fmtSec(Math.round(avgR))} invece di ${fmtSec(Math.round(avgP))}). Rispetta il timer: le reps devono venire dal muscolo, non dalla pausa.`); }
  else if (nLong) bad.push(`${nLong === 1 ? "Una serie" : nLong + " serie"} con recupero lungo: quelle reps non contano per salire.`);
  if (miss >= 2) { sc -= 2; bad.push(`${miss} serie non fatte: la scheda va chiusa tutta.`); }
  if (worse.length >= 2 && !special) { sc -= worse.length >= 3 ? 2 : 1; bad.push(`Sotto l'ultima volta in ${worse.length} esercizi. Se eri stanco segnalo in "Come stai oggi": l'app abbassa i carichi e non ti penalizza.`); }
  if (nDone >= 6 && nE / nDone >= 0.4) { sc -= 1; bad.push(`${nE} serie facili: ti stai risparmiando. La prossima volta spingi, i carichi salgono.`); }
  if (nDone >= 6 && (nH + heavy) / nDone > 0.7) { sc -= 1; bad.push("Quasi tutte le serie al limite o sporche: carichi troppo alti per oggi, consolida prima di salire."); }
  if (painEx.length) bad.push(`Fastidio a ${listIt(painEx)}: carico fermo la prossima volta. Se continua, dillo al PT.`);
  if (nA) good.push(`${nA === 1 ? "Una serie aiutata" : nA + " serie aiutate"}: valgono per il volume, non per salire`);
  if (!bud && usual && durMin && durMin > usual * 1.25 && durMin - usual >= 10) bad.push(`${Math.round(durMin - usual)} minuti più del solito: occhio alle pause tra un esercizio e l'altro.`);
  const head = special ? ["🙂", "Giornata particolare", "conta esserci stato: i dati di oggi non pesano sui progressi."]
    : sc >= 4 && bad.length < 2 && heavy < 3 && dirty3 < 2 ? ["🔥", "Allenamento da applausi", "così si cresce. Continua così."]
    : sc >= 1 ? ["👍", "Buon allenamento", bad.length ? "ma c'è margine: guarda sotto." : "solido, avanti così."]
    : sc >= -2 ? ["⚠️", "Oggi si poteva fare meglio", "niente drammi, ma sistema questo:"]
    : ["😤", "Così non cresci", "serve più testa in sala:"];
  const el = document.createElement("section"); el.className = "recap" + (sc <= 0 && !special ? " meh" : "");
  el.innerHTML = `<div class="rc-h"><span class="rc-k">Recap · ${esc(d.id)}${bud ? " · 👥 in 2" : ""}${isAway(s) ? " · 📍 " + esc(s.site || "altra sede") : ""}</span><b>🏁 Allenamento completato</b>${s.t0 ? `<small>Durata <b class="rc-dur">${durWords(durMin)}</b> · dalle ${hhmm(s.t0)} alle ${hhmm(s.tEnd || s.t1)}</small>` : ""}</div>
    <div class="rc-v"><p><span>${head[0]}</span><b>${head[1]}</b> ${head[2]}</p>
      ${good.slice(0, 2).map(x => `<p class="g">✓ ${esc(x)}</p>`).join("")}${bad.slice(0, 3).map(x => `<p class="b">! ${esc(x)}</p>`).join("")}</div>
    <div class="rc-g">
      <div><span>Durata</span><b>${durMin != null ? (durMin < 60 ? `${Math.max(1, durMin)}<i> min</i>` : `${Math.floor(durMin / 60)}<i> h </i>${String(durMin % 60).padStart(2, "0")}<i> min</i>`) : "—"}</b>${usual && durMin ? `<small class="${durMin <= usual ? "up" : "dn"}">${durMin <= usual ? "−" : "+"}${Math.abs(Math.round(durMin - usual))} min vs solito</small>` : ""}</div>
      <div><span>Serie</span><b>${nDone}<i>/${nSet}</i></b>${avgR != null ? `<small>recupero ~${fmtSec(Math.round(avgR / 5) * 5)}</small>` : ""}</div>
      <div><span>Pulite</span><b>${Math.round(cp * 100)}<i>%</i></b></div>
      <div><span>Volume</span><b>${Math.round(vol).toLocaleString("it-IT")}<i> kg</i></b>${vd != null ? `<small class="${vd >= 0 ? "up" : "dn"}">${vd >= 0 ? "+" : "−"}${Math.abs(vd).toFixed(0)}% vs ${new Date(prevDay.date + "T12:00").toLocaleDateString("it-IT", { day: "numeric", month: "short" })}</small>` : ""}</div>
    </div>
    ${better.length ? `<p class="rc-l up">↑ <b>Meglio dell'ultima volta:</b> ${better.sort((a, b) => b.pc - a.pc).map(x => `${esc(x.n)} ${pcs(x)}`).join(" · ")}</p>` : ""}
    ${(() => { if (special) return ""; const k = d.ex.map(e => ({ e, tr: subOf(s, e.key) ? null : setsTrend(e, exSets(s, e.key), s) })).filter(x => x.tr && ["climb", "drop", "light"].includes(x.tr.kind));
      return k.length ? `<p class="rc-l">↕ <b>Tra le serie:</b> ${k.map(x => `${esc(x.e.name)}: ${{ climb: "salita troppo", drop: "calo forte", light: "S1 leggera" }[x.tr.kind]}`).join(" · ")}</p>` : ""; })()}
    ${worse.length ? `<p class="rc-l dn">↓ <b>Sotto l'ultima volta:</b> ${worse.map(x => `${esc(x.n)} ${pcs(x)}`).join(" · ")}${special ? " (giornata particolare, non conta)" : ""}</p>` : ""}
    ${skipEx.length ? `<p class="rc-l">⤼ <b>Saltati oggi:</b> ${esc(listIt(skipEx))}</p>` : ""}
    <div class="rc-feel" aria-label="Com'erano le serie">${["easy", "ok", "hard", "dirty", "help"].map(f => { const n = f === "easy" ? nE : f === "hard" ? nH : f === "dirty" ? dirty : f === "help" ? nA : clean - nE - nH - nA; return n ? `<span data-f="${f}"><i>${feelIcon(f)}</i>${n} ${FEEL[f].n.toLowerCase()}</span>` : ""; }).join("")}</div>
    ${typeof logShake === "function" && s.date === todayISO() ? `<button type="button" class="rc-bk rc-sh" data-shake>${shakeDone(s.date) ? "✓ Shaker segnato nel Cibo" : "🥤 Segna lo shaker post-palestra"} <small>${shakeDone(s.date) ? "conta nelle proteine di oggi" : "un tocco: va nello spuntino 2 (o nel dopo cena)"}</small></button>` : ""}
    ${needBackup() ? `<button type="button" class="rc-bk" data-bk>💾 Salva il backup <small>File → iCloud Drive · i dati sono solo su questo telefono</small></button>` : ""}
    <p class="rc-l nx">→ <b>Prossima volta:</b> ${reduced(s) ? "si riparte dai carichi dell'ultima seduta normale" : !upEx.length ? "stessi carichi, punta alle reps piene" : upEx.length <= 3 ? `carico su in ${esc(listIt(upEx))}` : `carico su in ${upEx.length} esercizi`}.</p>`;
  return el;
}
function renderLog() {
  // 22/11/2026 ("toccando i pulsanti in Info la schermata si ricarica e perdo il punto"): con il riquadro Info aperto
  // si ricordano posizione del contenuto, foto della galleria e immagini già caricate, e si rimettono dopo il ridisegno.
  const sh = $("isheet"), c = sh && sh.querySelector(".is-c"), keep = S.sheet && sh && !sh.hidden && sh.classList.contains("on");
  const st = keep ? { top: c.scrollTop, gx: (c.querySelector(".gallery") || {}).scrollLeft || 0, imgs: keepImgs(c), y: scrollY } : null;
  if (S.sheet || sh._card) { c.textContent = ""; sh._card = null; }
  renderLog0();
  if (S.sheet) { if (document.querySelector(`.ex[data-ex="${S.sheet}"]`)) openSheet(S.sheet); else closeSheet(); }
  if (st && S.sheet && !sh.hidden) { reuseImgs(c, st.imgs); const g = c.querySelector(".gallery"); if (g && st.gx) g.scrollLeft = st.gx; c.scrollTop = st.top; if (scrollY !== st.y) scrollTo(0, st.y); }
}
function renderLog0() {
  PIC.clear(); renderConsole(); renderWeek(); renderSite(); renderDur();
  const p = plan(), d = dayObj(), sess = current();
  // forma del giorno
  const cond = condition(sess);
  $("ready").innerHTML = Object.entries(READY).map(([k, v]) => `<button data-r="${k}" aria-pressed="${(sess.readiness || "ok") === k}">${v.n}</button>`).join("");
  $("ready").querySelectorAll("button").forEach(b => b.onclick = () => { setSess({ readiness: b.dataset.r }); togglePanel(false); });
  const pi = pauseInfo(S.date);
  $("pauseNag").innerHTML = pi.back && !sess.ignorePause
    ? `<div class="nag info"><span><b>Rientro dopo ${pi.days} giorni.</b> Oggi rifai i carichi dell'ultima volta, senza aumenti. Se una serie viene 3 reps o più sotto il target, scendi di un salto nella serie dopo.${pi.days >= 35 ? " Dopo più di 5 settimane usa la prima serie come prova." : ""} Non conta per i progressi.</span><button class="btn sm" id="noPause">Non è un rientro</button></div>`
    : sess.ignorePause && pi.back ? `<div class="nag info"><span>Pausa di ${pi.days} giorni ignorata.</span><button class="btn sm" id="noPause">Riattiva</button></div>` : "";
  if ($("noPause")) $("noPause").onclick = () => setSess({ ignorePause: !sess.ignorePause });
  { const wk = weekStart(todayISO()), stalls = plan().days.flatMap(dd => dd.ex.filter(e => !e.nolog && stallInfo(e, S.gym)).map(e => e.name));
    let h = "";
    if (D.prefs.deload === wk) h = `<div class="nag info"><span><b>Settimana di scarico.</b> Carichi −35% e una serie in meno per esercizio (2 invece di 3). Non conta per i progressi: serve a recuperare e ripartire più forte.</span><button class="btn sm" id="dlOff">Annulla</button></div>`;
    else if (stalls.length >= 3 && D.prefs.deloadAsk !== wk && ![...deloadWeeks()].some(w => w < wk && (new Date(wk) - new Date(w)) / 864e5 <= 28)) h = `<div class="nag"><span>⏸ <b>${stalls.length} esercizi fermi da 3 sedute.</b> Valuta una settimana di scarico (meglio sentire il PT).</span><button class="btn sm" id="dlOn">Scarico</button><button class="btn sm ghost" id="dlNo">Non ora</button></div>`;
    $("pauseNag").insertAdjacentHTML("beforeend", h);
    if ($("dlOff")) $("dlOff").onclick = () => { delete D.prefs.deload; D.prefs.deloads = (D.prefs.deloads || []).filter(w => w !== wk); save(); renderLog(); };
    if ($("dlOn")) $("dlOn").onclick = () => { D.prefs.deload = wk; D.prefs.deloads = [...new Set([...(D.prefs.deloads || []), wk])]; save(); renderLog(); toast("Settimana di scarico attiva"); };
    if ($("dlNo")) $("dlNo").onclick = () => { D.prefs.deloadAsk = wk; save(); renderLog(); }; }
  // promemoria backup
  const ds = daysSince(D.prefs.lastBackup), nSess = Object.keys(D.sessions).length, since = sessSinceBackup();
  $("backupNag").innerHTML = nSess >= 1 && needBackup() ? `<div class="nag"><span>💾 ${ds == null ? "Non hai ancora un backup." : `Ultimo backup ${ds} ${ds === 1 ? "giorno" : "giorni"} fa`}${since ? ` · ${since} ${since === 1 ? "seduta nuova" : "sedute nuove"}` : ""}. I dati stanno solo su questo telefono: salvalo in File → iCloud Drive.</span><button class="btn sm" id="nagBk">Salva</button></div>` : "";
  if ($("nagBk")) $("nagBk").onclick = exportBackup;

  const list = $("list"), oldListImgs = keepImgs(list); list.textContent = ""; S.listImgs = oldListImgs;
  { const rc = recapCard(d, sess, dayUnitsList(d, sess)); if (rc) { list.appendChild(rc); const bk = rc.querySelector("[data-bk]"); if (bk) bk.onclick = exportBackup; const sh = rc.querySelector("[data-shake]"); if (sh) sh.onclick = () => { logShake(sess.date); renderLog(); }; } }
  const units = dayUnitsList(d, sess), curU = currentUnit(d, sess, units);
  S.sig = units.filter(u => unitOpen(u, curU)).map(u => u.keys[0]).join(",") + "|" + (curU ? curU.keys[0] : "");
  let exN = 0;
  d.ex.forEach((ex, idx) => {
    const u = units.find(x => x.keys[0] === ex.key);
    if (!u) return; // membro di circuito già mostrato
    exN = u.n;
    if (!unitOpen(u, curU)) { list.appendChild(miniCard(u, sess)); return; }
    const cg0 = isCircNoLog(d, idx);
    if (cg0) { list.appendChild(circCard(d, cg0, exN, u === curU)); return; }
    const last = lastBefore(ex.key), lastSets = last ? exSets(last, ex.key) : [];
    const rs = lastRef(ex.key), refSets = rs ? exSets(rs, ex.key) : [], hit1 = rs ? allHit(refSets, ex) && allClean(refSets) : false, pr = hit1 ? prevRef(ex.key, rs) : null,
      hit = hit1 && !!pr && allHit(exSets(pr, ex.key), ex) && allClean(exSets(pr, ex.key)), cond = condition(sess), sbN = subOf(sess, ex.key), stp = ex.bw ? { v: null } : stepFor(ex.key, sbN), exD = sbN ? subEx(ex, sbN) : ex;
    const pr2 = rs ? prevRef(ex.key, rs) : null, prSets = pr2 ? exSets(pr2, ex.key) : [], nUp = i => easy2(refSets[i], prSets[i], tnum(ex.sets[i].t)) ? 2 : 1;
    const painRef = rs && hasPain(rs, ex.key);
    const trRef = rs && !subOf(rs, ex.key) ? setsTrend(ex, exSets(rs, ex.key), rs) : null;
    const advise2 = (r, pl, t, step, f, n) => { let a = advise(r, pl, t, step, f, n);
      if (a && r && trRef && f >= 1 && !cond.hold) { const i = refSets.indexOf(r);
        if (trRef.kind === "light" && i === 0 && a.kg > r.kg && step && !a.mode && a.kg < r.kg + 2 * step - 1e-9) a = { ...a, kg: r2(r.kg + 2 * step), why: "S1 leggera l'ultima volta: un salto in più" };
        if (trRef.kind === "climb" && i === trRef.last && a.kg > trRef.keep) a = { ...a, kg: trRef.keep, why: "Salita troppo l'ultima volta: tieni il carico della serie prima" }; }
      if (a && cond.hold && r && r.kg != null && (a.kg > r.kg || (t != null && a.reps > t))) return { kg: Math.min(a.kg, r.kg), reps: t, why: "Rientro: stessi carichi dell'ultima volta", mode: "back" };
      return a && painRef && r && a.kg > r.kg ? { kg: r.kg, reps: t, why: "Fastidio l'ultima volta: carico fermo finché non passa", mode: "pain" } : a; };
    const ref = sbN || resetOf(ex.key) ? null : ex.ref && ex.ref[S.gym];
    const stl = ex.bw ? null : stallInfo(ex, S.gym, S.date, sbN || "");
    const trendToday = setsTrend(ex, exSets(sess, ex.key), sess);
    // record di sempre per questo esercizio in questa palestra (serie pulite, non aiutate, sedute normali precedenti)
    const prBest = ex.bw ? 0 : Math.max(0, ...gymSessions(S.gym).filter(x => x.date < S.date && home(x) && exHas(x, ex.key, sbN)).flatMap(x => exSets(x, ex.key).filter(r => okRec(r) && r.kg != null && r.reps != null).map(r => e1rm(r.kg, r.reps))));
    const isPR = r => prBest > 0 && okRec(r) && r.kg != null && r.reps != null && e1rm(r.kg, cleanR(r)) > prBest * 1.001 && !isOffDay(sess) && home(sess);
    // riscaldamento: primo esercizio del giorno o primo che lavora muscoli nuovi; 50%×10 · 70%×5 · 85%×2 del carico di S1, al salto disponibile
    const warm = (() => {
      if (ex.bw || isCircNoLog(d, idx)) return "";
      const before = d.ex.slice(0, idx).filter(e => !e.nolog), seen = new Set(before.flatMap(e => (e.m && e.m.p) || []));
      if (before.length && ((ex.m && ex.m.p) || []).some(m => seen.has(m))) return "";
      const a0 = refSets[0] ? advise2(refSets[0], prSets[0], tnum(ex.sets[0].t), stp.v, cond.f, nUp(0)) : null, base = a0 && a0.kg;
      if (!base || base < 15) return "";
      const st = stp.v || 2.5, out = []; for (const [p, r] of [[0.5, 10], [0.7, 5], [0.85, 2]]) { const k = Math.floor(base * p / st) * st; if (k > 0 && !out.some(o => o.k === k)) out.push({ k, r }); }
      return out.map(o => `<em><b>${fmt(o.k)}</b> kg × ${o.r}</em>`).join("");
    })();
    // riga "CARICO" del blocco info: cosa fare oggi con il peso e perché
    let pills = "", load = null;
    if (rs && cond.f < 1) load = { c: "near", t: `↓ Oggi −${Math.round((1 - cond.f) * 100)}%: ${esc(cond.why)}` };
    else if (rs && cond.hold) load = { c: "", t: `= Rientro dopo ${cond.p.days} giorni: stessi carichi dell'ultima volta, niente aumenti oggi.` };
    else if (rs) {
      const lab = i => { let n = 0, out = ""; ex.sets.forEach((st, j) => { if (!st.type || ["std", "alte", "pausa", "risc"].includes(st.type)) n++; if (j === i) out = st.type === "ced" ? "RP" : st.type === "strip" ? "ST" : st.type === "super" ? "SS" : "S" + n; }); return out; };
      const ix = f => ex.sets.map((st, i) => f(refSets[i], tnum(st.t)) ? i : -1).filter(i => i >= 0), names = a => listIt(a.map(lab));
      const up = ix(setUp), dirty = ix((r, t) => r && r.dirty && !setUp(r, t)), hard = ix(atLimit), dbl = up.filter(i => nUp(i) === 2), all = up.length === ex.sets.length, inc = ex.bw ? "aumenta" : stp.v ? `+${fmt(stp.v)} kg` : "sali un po'";
      // serie per serie: S1 +5 kg (facile 2 volte) · S2 stesso carico (al limite) · S3 +2,5 kg
      const advs = ex.sets.map((st, i) => ex.bw ? null : advise2(refSets[i], prSets[i], tnum(st.t), stp.v, 1, nUp(i))), special = advs.some(a => a && a.why);
      // serie con lo stesso esito raggruppate ("S1 e S2: +2,5 kg · S3: stesso carico"), poi i motivi una volta sola
      const what = i => { const r = refSets[i], t = tnum(ex.sets[i].t), a = advs[i], dk = a && a.kg != null && r && r.kg != null ? r2(a.kg - r.kg) : null;
        return ex.bw ? (setUp(r, t) ? "aumenta" : "stesse reps") : dk == null ? "—" : (dk > 0 ? `+${fmt(dk)} kg` : dk < 0 ? `−${fmt(-dk)} kg` : "stesso carico") + (a && t != null && a.reps > t ? `, ${a.reps} reps` : ""); };
      const perSet = () => { const g = new Map(); ex.sets.forEach((_, i) => { const w = what(i); g.set(w, [...(g.get(w) || []), i]); });
        const head = g.size === 1 ? `Tutte le serie: ${[...g.keys()][0]}` : [...g].map(([w, a]) => `${names(a)}: ${w}`).join(" · ");
        const why = [...new Set(advs.map(a => a && a.why).filter(Boolean))];
        const own = (f, txt) => { const a = ex.sets.map((_, i) => !(advs[i] && advs[i].why) && f(i) ? i : -1).filter(i => i >= 0); if (a.length) why.push(`${names(a)} ${txt}`); };
        own(i => nUp(i) === 2, "facile due volte di fila: doppio salto"); own(i => atLimit(refSets[i], tnum(ex.sets[i].t)), "al limite: consolida"); own(i => refSets[i] && refSets[i].dirty && !setUp(refSets[i], tnum(ex.sets[i].t)), "sporca: falla più pulita");
        return `${head}. ${why.join(". ")}${why.length ? "." : ""}`; };
      const upK = advs.some((a, i) => a && refSets[i] && a.kg > refSets[i].kg);
      if (up.length && all && !dbl.length && !special) load = { c: "up", t: `↑ Tutte le serie a target e pulite: ${inc}.${stp.v ? " Ok anche 1-2 reps in meno." : ""}` };
      else if (up.length || special) load = { c: upK ? "up" : "", t: `${upK ? "↑" : "="} ${perSet()}${stp.v && upK ? " Col peso nuovo ok anche 1-2 reps in meno." : ""}` };
      else if (hard.length) load = { c: "", t: `= Stesso carico: a target ma al limite, consolida prima di salire.${dirty.length ? ` ${names(dirty)} sporc${dirty.length > 1 ? "he: falle pulite" : "a: falla pulita"}.` : ""}` };
      else if (dirty.length) load = { c: "near", t: "~ Serie sporche l'ultima volta: stesso carico, falle pulite." };
      else load = { c: "", t: "= Stesso carico: l'ultima volta nessuna serie a target." };
    }
    else if (resetOf(ex.key) && !sbN) load = { c: "", t: `↺ Ripartito da zero il ${ddmm(resetOf(ex.key))}: scegli carichi con cui lo senti bene, da qui l'app riparte` };
    else if (ref) load = { c: "", t: `Scheda precedente: ${fmt(ref)} kg${cond.f < 1 ? ` · oggi ${fmt(roundKg(ref * cond.f))} kg (${esc(cond.why)})` : ""}` };
    const cg = circGroup(d, idx);
    if (cg) pills += cg.last ? `<span class="pill circ">Circuito · recupero ${fmtSec(restFor(ex))} a fine giro</span>` : `<span class="pill circ">Circuito · subito il prossimo</span>`;
    const isCur = u === curU, manual = !isCur;
    const oi = oooInfo(sess, ex.key, S.date === todayISO()), prosp = oi && !oi.started;
    let jc = oi && oi.off && !prosp ? { ...cond, ooo: true, why: [cond.why, "fuori ordine"].filter(Boolean).join(" + ") } : cond;
    if (isAway(sess)) { jc = { ...jc, ooo: true, why: [jc.why, "altra sede"].filter(Boolean).join(" + ") }; load = { c: "near", t: `📍 Altra sede: kg della tua palestra solo indicativi, macchine diverse. Non conta per i progressi.` }; }
    const fr = exD._pic ? [] : execFrames(exD), mpic = exD._pic || "";
    const card = document.createElement("article"); card.className = "ex" + (isCur ? " cur" : ""); card.dataset.ex = ex.key;
    const open = S.open.has(ex.key);
    card.innerHTML = `
      <div class="exh">
        ${fr.length ? `<button class="exec thumb" data-zoom aria-label="Ingrandisci le immagini di ${esc(ex.name)}">
          ${fr.map(f => `<img src="${f.src}" alt="${esc(ex.name)} — ${esc(f.cap)}" class="${f.draw ? "draw" : ""}" loading="lazy">`).join("")}
          <span class="zoom"><svg viewBox="0 0 24 24"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg></span></button>` : mpic ? `<button class="exec thumb mpic" data-zoom aria-label="Ingrandisci le immagini di ${esc(sbN)}"><img src="${mpic}" alt="${esc(sbN)}"></button>` : ""}
        <div class="t"><div class="exk">${exNum(exN)}${isCur ? " · Adesso" : ""}</div>
          <h3 class="exname">${esc(sbN || ex.name)}</h3>${sbN ? `<div class="subof">↔ al posto di ${esc(ex.name)}</div>` : ""}${rxLine(ex)}</div>
      </div>
      ${todayBanners(sess, ex, painRef, rs)}
      ${(exD.flash || []).length ? `<p class="tipline" aria-label="Da ricordare">${exD.flash.map(x => `<span>${esc(x)}</span>`).join("")}</p>` : ""}
      ${pills ? `<div class="pills">${pills}</div>` : ""}
      ${oi ? oooBox(oi, prosp) : ""}
      ${((D.setup[S.gym] || {})[ex.key]) ? `<div class="exinfo top">
        <div class="ir"><span class="il">Regolazioni</span><button type="button" class="iv setv" data-editsetup>${esc(D.setup[S.gym][ex.key])}</button></div>
      </div>` : ""}
      ${warm ? `<p class="warm"><span>🔥 Riscaldamento <i>· non si registra</i></span>${warm}</p>` : ""}
      <div class="sets"><div class="sh"><span>Serie</span><span>Ultima</span><span>${ex.bw ? "kg (opz.)" : "kg"}</span><span>Reps</span><span></span></div></div>
      ${load ? `<p class="advice ${load.c}"><span>Consiglio</span>${load.t}</p>` : ""}
      ${trendToday && !isOffDay(sess) ? `<p class="advice trend ${trendToday.cls}"><span>Tra le serie</span>${trendToday.msg}</p>` : ""}
      ${stl && !cond.deload ? `<p class="advice stall"><span>Fermo</span>⏸ Nessun miglioramento da ${stl.n} sedute. Prova: salto più piccolo o una rep in più invece del peso, recuperi pieni, tecnica pulita. Se continua, dillo al PT.</p>` : ""}
      <div class="exfoot${manual ? " two" : ""}">
        ${manual ? `<button class="more" data-close>Chiudi</button>` : ""}
        <button class="infobtn" data-more aria-haspopup="dialog"><svg viewBox="0 0 24 24" class="ib-i"><circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.6v.01"/></svg><span><b>Info ed esecuzione</b><small>foto · muscoli · regolazioni</small></span><svg viewBox="0 0 24 24" class="ib-c"><path d="M9 6l6 6-6 6"/></svg></button></div>
      <div class="panel" hidden><div class="exinfo">
        ${ex.setup === false ? "" : `<div class="ir setup"${((D.setup[S.gym] || {})[ex.key]) ? "" : " hidden"}><label class="il" for="su-${ex.key}">Regolazioni</label><div class="iv"><input id="su-${ex.key}" autocomplete="off" placeholder="es. sedile 4, schienale 2"></div></div>`}
        ${ex.tec ? `<div class="ir"><span class="il">Schema</span><div class="iv tecv">${esc(ex.tec)}</div></div>` : ""}
        ${ex.nolog ? "" : (() => { const own = (D.setDur || {})[ex.key], est = setSec({ ...ex, key: "__" }, 0, null);
          return `<div class="ir"><span class="il">Durata serie<i>${own ? "impostata da te" : "stimata"}</i></span><div class="iv durset"><button type="button" data-sd="-5" aria-label="Meno 5 secondi">−5"</button><b>${own || est}"</b><button type="button" data-sd="5" aria-label="Più 5 secondi">+5"</button>${own ? `<button type="button" class="sd-reset" data-sd="0">stimata</button>` : ""}</div></div>`; })()}
        <div class="ir"><span class="il">Recupero${hasRest(ex) ? "" : "<i>predefinito</i>"}</span><div class="iv restsel" role="group" aria-label="Recupero tra le serie">${S.restEdit === ex.key
          ? `<input class="stepin" id="rsin-${ex.key}" inputmode="text" autocomplete="off" placeholder="es. 1:45" value="${hasRest(ex) && !REST_QUICK.includes(restFor(ex)) ? fmtSec(restFor(ex)) : ""}"><button type="button" data-restok>OK</button><button type="button" data-restx aria-label="Annulla">✕</button>`
          : REST_QUICK.map(v => `<button type="button" data-rest-set="${v}" aria-pressed="${restFor(ex) === v}">${fmtSec(v)}</button>`).join("") + (() => { const cu = !REST_QUICK.includes(restFor(ex)); return `<button type="button" data-restc aria-pressed="${cu}" class="cust">${cu ? fmtSec(restFor(ex)) : "altro"}</button>`; })()}</div></div>
        ${ex.bw ? "" : `<div class="ir"><span class="il">Salto pesi${stp.auto && stp.v ? "<i>stimato</i>" : ""}</span><div class="iv stepsel" role="group" aria-label="Salto dei pesi">${S.stepEdit === ex.key
          ? `<input class="stepin" id="stin-${ex.key}" inputmode="decimal" autocomplete="off" placeholder="kg, es. 1,25" value="${stp.v && !STEPS.includes(stp.v) ? fmt(stp.v) : ""}"><button type="button" data-stepok>OK</button><button type="button" data-stepx aria-label="Annulla">✕</button>`
          : STEPS.map(v => `<button type="button" data-step="${v}" aria-pressed="${stp.v === v}" class="${stp.v === v && stp.auto ? "auto" : ""}">${fmt(v)}</button>`).join("") + (() => { const cu = stp.v && !STEPS.includes(stp.v); return `<button type="button" data-stepc aria-pressed="${!!cu}" class="cust${cu && stp.auto ? " auto" : ""}">${cu ? fmt(stp.v) : "altro"}</button>`; })()}</div></div>`}
        ${ex.setup === false || ((D.setup[S.gym] || {})[ex.key]) ? "" : `<button type="button" class="addsetup" data-addsetup>⚙ Aggiungi regolazioni della macchina</button>`}
        ${ex.bw ? "" : `<div class="ir"><span class="il">Kg suggeriti</span><div class="iv"><button type="button" class="chip" data-copy>⚡ Scrivili nelle serie</button></div></div>`}
      </div>
      ${ex.nolog ? "" : `<div class="reset0${resetOf(ex.key) ? " on" : ""}">${resetOf(ex.key)
        ? `<p><b>↺ Progressi azzerati dal ${ddmm(resetOf(ex.key))}</b><small>Le sedute prima non contano per carichi, record e progressi (restano nello storico).</small></p><button type="button" data-reset0="undo">Annulla</button>`
        : `<p><b>Riparti da zero</b><small>Stavi sbagliando esecuzione e hai abbassato i carichi? Da oggi l'app ignora le sedute vecchie di questo esercizio (in tutte e due le palestre). Lo storico resta.</small></p><button type="button" data-reset0="go">↺ Azzera</button>`}</div>`}
      <div class="today3"><span class="t3k">Solo per oggi</span><div class="acts3" role="group" aria-label="Solo per oggi">
        <button type="button" data-act="sub" aria-pressed="${!!sbN}"><svg viewBox="0 0 24 24"><path d="M4 8h14l-4-4M20 16H6l4 4"/></svg><span>Sostituisci</span></button>
        <button type="button" data-act="later" aria-pressed="${isLater(sess, ex.key)}"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg><span>Occupato</span></button>
        <button type="button" data-act="pain" aria-pressed="${hasPain(sess, ex.key)}"><svg viewBox="0 0 24 24"><path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 10v4.2M12 17v.01"/></svg><span>Fastidio</span></button>
        <button type="button" data-act="skip" aria-pressed="${isSkip(sess, ex.key)}"><svg viewBox="0 0 24 24"><path d="M5 6l8 6-8 6zM16 6v12"/></svg><span>Non lo faccio</span></button></div></div>
      <div class="pbody"></div></div>`;
    const setsEl = card.querySelector(".sets"), cur = exSets(sess, ex.key), P = [];
    let sn = 0;
    ex.sets.forEach((st, i) => {
      const ty = TYPES[st.type] || TYPES.std; if (!st.type || st.type === "std" || st.type === "alte" || st.type === "pausa" || st.type === "risc") sn++;
      const label = st.type === "ced" ? "RP" : st.type === "strip" ? "ST" : st.type === "super" ? "SS" : "S" + sn;
      const r = cur[i] || {}, lr = lastSets[i], tn = tnum(st.t), rr = refSets[i];
      const adv = ex.bw ? null : advise2(rr, prSets[i], tn, stp.v, cond.f, nUp(i)), sug = adv ? adv.kg : null, goal = adv && adv.reps != null && tn != null && adv.reps > tn ? adv.reps : null, lk = lr && lr.kg != null ? lr.kg : null;
      const dir = sug == null || lk == null ? "" : sug > lk + 1e-9 ? "up" : sug < lk - 1e-9 ? "dn" : "eq";
      const row = document.createElement("div"); row.className = "set" + (i >= need(ex, sess) ? " xset" : "");
      row.innerHTML = `<div class="sn" style="--tc:var(${ty.c})">${label}<small>×${esc(st.t)}</small>${ty.n || st.note ? `<em>${esc([ty.n, st.note].filter(Boolean).join(" · "))}</em>` : ""}</div>
        <div class="prev">${lr && (lr.kg != null || lr.reps != null) ? `<b class="lv${lr.dirty ? " dirty" : ""}"${lr.dirty ? ' title="Sporca l\'ultima volta"' : ""}>${lr.kg != null ? fmt(lr.kg) + " × " : ""}${lr.reps ?? "–"}${lr.dirty ? `<i>~${dN(lr) > 1 ? dN(lr) : ""}</i>` : ""}</b>` : `<b class="lv none">—</b>`}${sug != null ? `<span class="sug ${dir}">${{ up: "↑", dn: "↓", eq: "=" }[dir] || "oggi"} ${goal ? `${fmt(sug)} × ${goal}` : `${fmt(sug)} kg`}</span>` : ""}</div>
        <input id="kg-${ex.key}-${i}" inputmode="${tPrefs().pad ? "none" : "decimal"}" enterkeyhint="next" autocomplete="off" aria-label="${esc(ex.name)} serie ${i + 1} kg" placeholder="${sug != null ? fmt(sug) : lr && lr.kg != null ? fmt(lr.kg) : ref ? fmt(roundKg(ref * cond.f)) : "kg"}">
        <input id="rp-${ex.key}-${i}" inputmode="${tPrefs().pad ? "none" : "numeric"}" enterkeyhint="next" autocomplete="off" aria-label="${esc(ex.name)} serie ${i + 1} ripetizioni" placeholder="${tn != null ? tn : "max"}">
        <button type="button" class="dq" aria-label="Com'era la serie?"></button><div class="fb"></div>`;
      const [kg, rp] = row.querySelectorAll("input"); kg.value = fmt(r.kg); rp.value = r.reps ?? "";
      const fb = row.querySelector(".fb"), dq = row.querySelector(".dq");
      const isDirty = () => dN(exSets(current(), ex.key)[i]);
      const upd = () => {
        if (row._gap) { const all = exSets(current(), ex.key), g = restGap(all[i - 1], all[i], ex, i), pl = restFor(ex);
          row._gap.hidden = g == null; if (g != null) {
            // colore (19/11/2026, richiesta dell'utente): tempo tra le due serie confrontato con recupero previsto + durata stimata della serie.
            // verde = nei tempi (tolleranza 15"); rosso = recupero lungo, stessa soglia del messaggio "Recupero lungo" (isLong); arancione = in mezzo
            const ov = Math.round((g - pl) / 5) * 5, cl = isLong(g, pl, !!current().buddy) ? "red" : g > pl + 15 ? "orange" : "green";
            row._gap.className = "rgap " + cl;
            row._gap.innerHTML = `<span>recupero ${fmtSec(Math.round(g / 5) * 5)}${cl !== "green" ? ` <b>+${fmtSec(ov)}</b>` : ""}</span><small>previsto ${fmtSec(pl)} · serie ~${setSec(ex, i, all[i])}" · cambio 10"</small>`; } }
        const cr = exSets(current(), ex.key)[i] || {}, fv = feelOf(cr);
        judge(kg, rp, fb, tn, rr, { ...jc, step: stp.v, last: i >= need(ex, current()) - 1 }, isDirty(), cr.eff, goal);
        { const pv = i > 0 ? exSets(current(), ex.key)[i - 1] : null, k = num(kg.value), rv = num(rp.value);
          if (pv && pv.kg != null && k != null && rv != null && tn != null && k > pv.kg && rv <= tn - CLIMB_MISS && !cr.dirty && !cond.hold) { fb.className = "fb near"; fb.hidden = false;
            fb.textContent = `Salita troppo: prossima volta ${fmt(pv.kg)} kg qui`; } }
        if (cond.hold && num(rp.value) != null && tn != null && num(rp.value) <= tn - 3 && i < ex.sets.length - 1 && num(kg.value) != null) {
          const st = stp.v || 2.5, low = Math.max(0, num(kg.value) - st); fb.className = "fb near"; fb.hidden = false;
          fb.textContent = `Rientro: prossima serie ${fmt(low)} kg`; }
        if (isPR(cr) && !cr.help) { fb.className = "fb ok"; fb.hidden = false; fb.textContent = `🏆 Nuovo record: ${fmt(cr.kg)}×${cr.reps}!`; }
        if (cr.help && num(rp.value) != null && !cr.dirty) { fb.className = "fb prog"; fb.hidden = false; fb.textContent = "🤝 Aiutata: prossima volta da solo"; }
        if (lrOn(cr) && num(rp.value) != null && !cr.dirty) {
          fb.className = "fb prog"; fb.hidden = false;
          fb.innerHTML = `<span>⏱ Pausa ~${fmtSec(cr.lr)}: non conta per salire</span><button type="button" class="lrok">Non ha influito</button>`;
          const b = fb.querySelector(".lrok"); b.onmousedown = e => e.preventDefault();
          b.onclick = () => { const s2 = JSON.parse(JSON.stringify(current())); s2.ex[ex.key][i] = { ...s2.ex[ex.key][i], lrOk: true }; s2.updatedAt = Date.now(); D.sessions[s2.id] = s2; save(); upd(); };
        }
        const has = num(rp.value) != null;
        dq.classList.toggle("off", !has); dq.disabled = !has; dq.dataset.f = fv; dq.innerHTML = feelIcon(fv);
        dq.setAttribute("aria-label", `Serie ${FEEL[fv].n.toLowerCase()}: tocca per cambiare`);
        if (card._live) card._live();
      };
      row._upd = upd; row._i = i; row._kg = kg; row._rp = rp; row._fb = fb;
      P[i] = { plan: sug, goal, tn, lk, label, ph: kg.placeholder, rph: rp.placeholder, sugHTML: (row.querySelector(".sug") || {}).outerHTML || "" };
      dq.onclick = () => openFeel(ex, i, label);
      kg.oninput = e => { edit(ex, i, "kg", kg.value); upd(); autoKg(e, kg, rp); };
      rp.oninput = e => { edit(ex, i, "reps", rp.value); upd(); autoReps(e, rp); };
      // serie completata (reps inserite e campo lasciato) → parte il recupero
      rp.addEventListener("change", () => {
        if (num(rp.value) != null) openFeel(ex, i, label);
        { const cr = exSets(current(), ex.key)[i]; S.cel = S.cel || new Set(); const ck = `${current().id}|${ex.key}|${i}`;
          if (isPR(cr) && !S.cel.has(ck)) { S.cel.add(ck); celebrate(`🏆 Nuovo record`, `${sbN || ex.name} · ${fmt(cr.kg)}×${cr.reps}`); } }
        if (num(rp.value) == null || S.date !== todayISO() || !tPrefs().auto) return;
        const g = circGroup(d, idx);
        if (g && !g.last) { toast(`Subito: ${d.ex[idx + 1].name}`); return; } // circuito: niente recupero tra gli esercizi
        // ultima serie (o ultimo giro): tra un esercizio e l'altro il recupero NON parte (scelta dell'utente, 17/11/2026);
        // riparte dopo la prima serie dell'esercizio successivo
        if (i >= need(ex, current()) - 1) { { const n = nextOpenUnit(d, idx); S.between = { next: n ? (subOf(current(), n.k) || (d.ex.find(e => e.key === n.k) || {}).name) : "" }; } if (running() || T.left != null) stopRest(); else drawTimer(); return; } // niente avviso a fine esercizio (18/11/2026, l'utente non lo vuole): bastano la barra del timer e "Tra le serie" nella scheda
        if (g) { startRest(restFor(ex), `Giro ${i + 1} finito · poi giro ${i + 2}`, tKey(ex)); return; }
        startRest(restFor(ex), `${subOf(current(), ex.key) || ex.name} · poi serie ${i + 2}`, tKey(ex));
      });
      if (i > 0 && !circGroup(d, idx)) { const gp = document.createElement("div"); gp.className = "rgap"; gp.hidden = true; setsEl.appendChild(gp); row._gap = gp; }
      upd(); setsEl.appendChild(row);
    });
    // adattamento in tempo reale delle serie ancora da fare (vedi liveAdj)
    card._live = () => {
      if (ex.bw || circGroup(d, idx)) return;
      const sets = exSets(current(), ex.key), stv = stepFor(ex.key, subOf(current(), ex.key)).v, canUp = cond.f >= 1 && !cond.hold && !hasPain(current(), ex.key);
      let first = true;
      setsEl.querySelectorAll(".set").forEach(row => { if (row._i == null) return;
        const i = row._i, r = sets[i] || {}, p = P[i], filled = r.kg != null || r.reps != null, kgTyped = row._kg.value.trim() !== "";
        const a = filled || kgTyped ? null : liveAdj(i, sets, P, stv, canUp);
        const changed = a && (a.noPlan ? true : Math.abs(a.kg - p.plan) > 1e-9 || (a.reps || null) !== (p.goal || null));
        const pv = row.querySelector(".prev"); let sg = pv.querySelector(".sug");
        if (!changed) { // torna al suggerimento di partenza
          row._kg.placeholder = p.ph; row._rp.placeholder = p.rph; row.classList.remove("live");
          if (sg && sg.classList.contains("live")) { if (p.sugHTML) sg.outerHTML = p.sugHTML; else sg.remove(); }
          if (row._fb.dataset.live) { row._fb.textContent = ""; row._fb.hidden = true; delete row._fb.dataset.live; }
          if (!filled) first = false; return; }
        const dir = p.lk == null ? "" : a.kg > p.lk + 1e-9 ? "up" : a.kg < p.lk - 1e-9 ? "dn" : "eq", rp2 = a.reps && p.tn != null && a.reps > p.tn ? a.reps : null;
        row._kg.placeholder = fmt(a.kg); row._rp.placeholder = rp2 != null ? rp2 : p.rph; row.classList.add("live");
        if (!sg) { sg = document.createElement("span"); pv.appendChild(sg); }
        sg.className = `sug ${dir} live`; sg.textContent = `${{ up: "↑", dn: "↓", eq: "=" }[dir] || "oggi"} ${rp2 != null ? `${fmt(a.kg)} × ${rp2}` : `${fmt(a.kg)} kg`}`;
        if (first) { const lj = P[a.j].label, rj = sets[a.j], tj = P[a.j].tn;
          const why = a.out < 0 ? (dN(rj) ? `${lj} ${cleanR(rj)} pulite su ${tj}` : `${lj} ${rj.reps} su ${tj}`) : a.out > 0 ? `${lj} ${rj.eff === "easy" ? "facile" : `+${rj.reps - tj} reps`}` : a.dev ? `${lj} a ${fmt(rj.kg)} kg` : a.noPlan ? `da ${lj}` : "";
          const what = rp2 != null && a.out > 0 ? `qui ${fmt(a.kg)} × ${rp2}` : `qui ${fmt(a.kg)} kg`;
          if (why) { row._fb.className = "fb live"; row._fb.hidden = false; row._fb.dataset.live = "1"; row._fb.textContent = `⟳ ${why}: ${what}`; } }
        first = false;
      });
    };
    card._live();
    const su = card.querySelector(".setup input");
    if (su) {
      su.value = ((D.setup[S.gym] || {})[ex.key]) || ""; su.oninput = () => { D.setup[S.gym] = D.setup[S.gym] || {}; D.setup[S.gym][ex.key] = su.value.trim(); save(); S.setupDirty = true; const t = card.querySelector("[data-editsetup]"); if (t) t.textContent = su.value.trim() || "—"; };
    }
    card.querySelectorAll("[data-act]").forEach(b => b.onclick = () => exAct(ex, b.dataset.act));
    card.querySelectorAll("[data-reset0]").forEach(b => b.onclick = () => {
      if (b.dataset.reset0 === "undo") { D.resets = { ...(D.resets || {}) }; delete D.resets[ex.key]; save(); renderLog(); toast(`Progressi di ${ex.name} ripristinati`); return; }
      if (!b.classList.contains("arm")) { b.classList.add("arm"); b.textContent = "Tocca di nuovo"; clearTimeout(b._t); b._t = setTimeout(() => { b.classList.remove("arm"); b.textContent = "↺ Azzera"; }, 4000); return; }
      D.resets = { ...(D.resets || {}), [ex.key]: S.date }; save(); renderLog(); toast(`${ex.name}: si riparte da zero da oggi`);
    });
    card.querySelectorAll("[data-sd]").forEach(b => b.onclick = () => { const d = +b.dataset.sd, cur = (D.setDur || {})[ex.key] || setSec({ ...ex, key: "__" }, 0, null);
      D.setDur = { ...(D.setDur || {}) }; if (!d) delete D.setDur[ex.key]; else D.setDur[ex.key] = Math.max(10, Math.min(180, cur + d)); save(); renderLog(); });
    card.querySelectorAll("[data-restc]").forEach(b => b.onclick = () => { S.restEdit = ex.key; renderLog(); setTimeout(() => { const i = $(`rsin-${ex.key}`); if (i) { i.focus(); i.select(); } }, 60); });
    { const ri = card.querySelector(`#rsin-${CSS.escape(ex.key)}`); if (ri) {
      const ok = () => { const v = parseRest(ri.value.trim()); S.restEdit = null; if (v && v >= 10 && v <= 600) { setRest(ex.key, v); toast(`Recupero ${ex.name}: ${fmtSec(v)}`); } else renderLog(); };
      ri.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); ok(); } };
      const bo = card.querySelector("[data-restok]"), bx = card.querySelector("[data-restx]");
      if (bo) { bo.onmousedown = e => e.preventDefault(); bo.onclick = ok; }
      if (bx) { bx.onmousedown = e => e.preventDefault(); bx.onclick = () => { S.restEdit = null; renderLog(); }; } } }
    card.querySelectorAll("[data-rest-set]").forEach(b => b.onclick = () => { const v = +b.dataset.restSet; if (!hasRest(ex) && v === restFor(ex)) return toast(`Già ${fmtSec(v)} (predefinito)`); setRest(ex.key, (D.rest || {})[ex.key] === v || v === tPrefs().sec ? null : v); toast((D.rest || {})[ex.key] ? `Recupero ${ex.name}: ${fmtSec(v)}` : "Recupero tolto: torna quello di base"); });
    card.querySelectorAll("[data-addsetup]").forEach(b => b.onclick = () => { const r = b.parentNode.querySelector(".ir.setup"); if (r) { r.hidden = false; b.remove(); const i = r.querySelector("input"); i.focus(); i.scrollIntoView({ block: "center", behavior: "smooth" }); } });
    card.querySelectorAll("[data-mach]").forEach(b => b.onclick = () => { if (b.dataset.mach === "orig") setExMap("machOk", ex.key, true); else { S.subEdit = ex.key; renderLog(); } });
    card.querySelectorAll("[data-undo]").forEach(b => b.onclick = () => exAct(ex, b.dataset.undo, true));
    const withPic = n => { const sp = S.subPic && S.subPic.key === ex.key ? S.subPic : null; S.subPic = null; S.subEdit = null; setExMap("sub", ex.key, n); if (sp && n) saveMachinePic(n, sp.file); };
    card.querySelectorAll("[data-alt]").forEach(b => b.onclick = () => withPic(b.dataset.alt));
    { const cam = card.querySelector(".subcam"); if (cam) cam.addEventListener("pointerdown", () => { S.camTap = Date.now(); }); }
    const spi = card.querySelector("[data-subpic]"); if (spi) spi.onchange = () => { const f = spi.files[0]; if (!f) return; const nm = (card.querySelector(".subin input") || {}).value;
      if (nm && nm.trim()) return withPic(nm.trim()); S.subPic = { key: ex.key, file: f, url: URL.createObjectURL(f) }; renderLog(); };
    const pin = card.querySelector("[data-pic]"); if (pin) pin.onchange = () => { if (pin.files[0]) saveMachinePic(subOf(current(), ex.key), pin.files[0]); };
    const sbi = card.querySelector(".subin input"); if (sbi) { sbi.onkeydown = e => { if (e.key === "Enter") sbi.blur(); }; sbi.onchange = () => { if (Date.now() - (S.camTap || 0) < 2000 || Date.now() - (S.dbTap || 0) < 1500) return; withPic(sbi.value.trim() || null); };
      const box = card.querySelector(".dbres"), others = [...card.querySelectorAll(".xb.sub .alts:not(.used)")], usedBoxes = [...card.querySelectorAll(".xb.sub .alts.used")];
      const usedSet = new Set([...usedSubs(ex), ...usedSubsOther(ex, [])].map(dbNorm));
      sbi.oninput = () => { const q = sbi.value.trim(), toks = dbNorm(q).split(" ").filter(Boolean);
        let r = dbSearch(sbi.value, ex.key); r = [...r.filter(m => usedSet.has(dbNorm(dbName(m)))), ...r.filter(m => !usedSet.has(dbNorm(dbName(m))))];
        box.hidden = !q; others.forEach(o => o.hidden = !!q);
        usedBoxes.forEach(ub => { let any = false; ub.querySelectorAll(".alt").forEach(a => { const ok = !toks.length || toks.every(t => a.dataset.un.includes(t)); a.hidden = !ok; any = any || ok; }); ub.hidden = !any; });
        box.innerHTML = r.length ? `<span class="altk">Dal database macchinari · ${r.length === 14 ? "primi 14" : r.length}</span><p class="subhint">Per essere sicuro: il nome deve essere quello sulla targhetta della macchina; con "Foto vere" vedi proprio quel modello.</p>${r.map(m => { const c = window.MACCHINE_DB.CAT[m.c], fit = c.k.includes(ex.key);
          return `<div class="alt"><button type="button" class="altn" data-db="${esc(dbName(m))}">${machinePic(dbName(m)) ? `<img src="${machinePic(dbName(m))}" alt="">` : ""}<b>${usedSet.has(dbNorm(dbName(m))) ? "⭐ " : ""}${esc(m.n)}</b><small>${esc(m.b)} · ${esc(m.l)} · ${esc(c.ml)}${fit ? "" : " · <i>altro movimento</i>"}${usedSet.has(dbNorm(dbName(m))) ? " · <b>già usata</b>" : ""}</small></button><a class="altq" href="${mQ(m)}" target="_blank" rel="noopener">Foto vere ↗</a></div>`; }).join("")}`
          : sbi.value.trim() ? `<p class="subhint">Nessuna macchina trovata: va bene lo stesso, il nome che scrivi resta salvato.</p>` : "";
        box.querySelectorAll("[data-db]").forEach(b => { b.onpointerdown = () => { S.dbTap = Date.now(); }; b.onclick = () => withPic(b.dataset.db); }); }; /* toccando la fotocamera il nome aspetta la foto */ setTimeout(() => sbi.focus(), 60); }
    const cp = card.querySelector("[data-copy]") || { set hidden(v) {} };
    if (ex.bw || !rs || !refSets.some(r => r && r.kg != null)) { const row = cp.closest && cp.closest(".ir"); if (row) row.remove(); }
    cp.onclick = () => (closeSheet(), ex.sets).forEach((_, i) => { const el0 = $(`kg-${ex.key}-${i}`), a = advise2(refSets[i], prSets[i], tnum(ex.sets[i].t), stp.v, cond.f, nUp(i)), k = el0 && el0.value === "" && /\d/.test(el0.placeholder) ? num(el0.placeholder) : a && a.kg; if (k != null) { const el = $(`kg-${ex.key}-${i}`); el.value = fmt(k); edit(ex, i, "kg", el.value); el.dispatchEvent(new Event("input")); } });
    const panel = card.querySelector(".panel"), pbody = panel.querySelector(".pbody"); if (open) fillPanel(pbody, exD);
    const openInfo = () => openSheet(ex.key);
    card.querySelectorAll("[data-more]").forEach(b => b.onclick = () => {
      openInfo();
    });
    const es = card.querySelector("[data-editsetup]"); if (es) es.onclick = () => { openInfo(); const i = $("isheet").querySelector(".setup input"); if (i) { i.focus(); i.scrollIntoView({ block: "center", behavior: "smooth" }); } };
    const z = card.querySelector("[data-zoom]"); if (z) z.onclick = () => openLB(exD, exD._pic ? 0 : -1);
    // Chiudi: la riga chiusa resta dove stavi guardando (o subito sotto la barra in alto se la scheda iniziava più su)
    card.querySelectorAll("[data-step]").forEach(b => b.onclick = () => { const v = +b.dataset.step; setStep(stepK(ex.key, sbN), stp.v === v && !stp.auto ? null : v); });
    card.querySelectorAll("[data-stepc]").forEach(b => b.onclick = () => { S.stepEdit = ex.key; renderLog(); setTimeout(() => { const i = $(`stin-${ex.key}`); if (i) { i.focus(); i.select(); } }, 60); });
    { const si = card.querySelector(".stepin"); if (si) {
      const ok = () => { const v = num(si.value); S.stepEdit = null; if (v != null && v > 0 && v <= 50) { setStep(stepK(ex.key, sbN), Math.round(v * 100) / 100); toast(`Salto pesi: ${fmt(Math.round(v * 100) / 100)} kg`); } else renderLog(); };
      si.onkeydown = e => { if (e.key === "Enter") { e.preventDefault(); ok(); } };
      const bo = card.querySelector("[data-stepok]"), bx = card.querySelector("[data-stepx]");
      if (bo) { bo.onmousedown = e => e.preventDefault(); bo.onclick = ok; }
      if (bx) { bx.onmousedown = e => e.preventDefault(); bx.onclick = () => { S.stepEdit = null; renderLog(); }; } } }
    const ob = card.querySelector("[data-ooo]"); if (ob) ob.onclick = () => toggleOrderOk(oi.key);
    const cl = card.querySelector("[data-close]"); if (cl) cl.onclick = () => { if (S.hold === ex.key && S.moveGo) return S.moveGo();
      const top = card.getBoundingClientRect().top, hb = $("console").getBoundingClientRect().bottom + 8;
      const nx = card.nextElementSibling, nsel = nx ? (nx.dataset.mini ? `.exmini[data-mini="${nx.dataset.mini}"]` : nx.dataset.ex ? `.ex[data-ex="${nx.dataset.ex}"]` : nx.dataset.circ ? `[data-circ="${nx.dataset.circ}"]` : null) : null;
      const nt = nsel ? nx.getBoundingClientRect().top : null;
      S.exOpen.delete(ex.key); renderLog();
      const m = document.querySelector(`.exmini[data-mini="${ex.key}"]`) || rowEl(ex.key, 0), n2 = nsel && document.querySelector(nsel);
      if (n2 && nt != null && nt < innerHeight) {
        let dy = n2.getBoundingClientRect().top - nt;                       // ciò che stava sotto resta dov'era
        if (m) { const mt = m.getBoundingClientRect().top - dy; if (mt < hb) dy -= hb - mt; } // e la riga chiusa resta visibile
        scrollTo({ top: Math.max(0, scrollY + dy) });
      } else if (m) scrollTo({ top: Math.max(0, m.getBoundingClientRect().top + scrollY - Math.max(top, hb)) });
    };
    list.appendChild(card);
  });
  reuseImgs(list, oldListImgs);
  markNext();
  $("note").value = sess.note || "";
  updateProgress();
}
