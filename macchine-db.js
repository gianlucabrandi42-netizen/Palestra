// =====================================================================================
//  DATABASE MACCHINARI (18/11/2026) — marche, linee e modelli più diffusi nelle palestre,
//  per la ricerca mentre scrivi in "Sostituisci". Solo nomi e tipo di movimento: niente
//  foto dei produttori (copyright). Le foto vere si aprono col tasto "Foto vere ↗"
//  (ricerca immagini di quel modello preciso).
//  Fonti dei nomi: cataloghi e listini online dei produttori e dei rivenditori (Panatta:
//  Fit Evo, SEC, Monolith, Freeweight HP, Freeweight Special; Technogym: Selection 700/900,
//  Pure, Element+, Artis; Life Fitness / Hammer Strength; Matrix; Cybex; Gym80; Nautilus;
//  Precor; Atlantis; Prime; Arsenal; Newtech; Hoist; Freemotion; Toorx; Impulse).
//  Formato: CAT = tipi di movimento (muscoli + esercizi della scheda che può sostituire);
//  LINES = [marca, linea, "Modello:cat|Modello:cat|…"]. Per aggiungere una macchina basta
//  aggiungere "Nome:cat" alla sua linea (o una riga nuova).
// =====================================================================================
(() => {
const CAT = {
  cp:    { n: "Chest press",            ml: "Petto · tricipiti · deltoidi anteriori", k: ["panca-inclinata-manubri", "panca-inclinata-multipower"] },
  ip:    { n: "Panca inclinata",        ml: "Petto alto · deltoidi anteriori · tricipiti", k: ["panca-inclinata-multipower", "panca-inclinata-manubri"] },
  dp:    { n: "Panca declinata",        ml: "Petto basso · tricipiti", k: [] },
  fly:   { n: "Croci / pectoral",       ml: "Petto", k: ["croci-inclinata-manubri"] },
  sp:    { n: "Shoulder press",         ml: "Deltoidi · tricipiti", k: ["shoulder-press-macchina"] },
  lat:   { n: "Alzate laterali",        ml: "Deltoidi laterali", k: ["alzate-laterali"] },
  rd:    { n: "Deltoidi posteriori",    ml: "Deltoidi posteriori · trapezio", k: ["peck-back-deltoidi-posteriori", "face-pull-corda-cavo-alto"] },
  pd:    { n: "Lat machine",            ml: "Dorsali · bicipiti", k: ["lat-machine-avanti"] },
  po:    { n: "Pullover",               ml: "Dorsali", k: ["lat-machine-avanti"] },
  row:   { n: "Rematore / low row",     ml: "Dorso · dorsali · bicipiti", k: ["pulley-basso", "rematore-bilanciere"] },
  hrow:  { n: "High row",               ml: "Dorsali alti · trapezio", k: ["rematore-bilanciere", "lat-machine-avanti"] },
  tbar:  { n: "T-bar row",              ml: "Dorso · dorsali", k: ["rematore-bilanciere", "pulley-basso"] },
  shrug: { n: "Shrug",                  ml: "Trapezio", k: [] },
  bic:   { n: "Curl bicipiti",          ml: "Bicipiti", k: ["curl-bilanciere", "curl-martello-manubri"] },
  tri:   { n: "Tricipiti",              ml: "Tricipiti", k: ["spinte-in-basso-al-cavo-corda", "french-press-bilanciere"] },
  dip:   { n: "Dip",                    ml: "Tricipiti · petto basso", k: ["spinte-in-basso-al-cavo-corda", "french-press-bilanciere"] },
  arm:   { n: "Braccia (multi)",        ml: "Bicipiti · tricipiti", k: ["curl-bilanciere", "spinte-in-basso-al-cavo-corda"] },
  abs:   { n: "Addominali",             ml: "Addominali", k: ["crunch", "crunch-inverso"] },
  rot:   { n: "Rotary torso",           ml: "Obliqui", k: ["crunch"] },
  lb:    { n: "Lombari",                ml: "Lombari · glutei", k: ["lombari-hyperextension", "stacchi-rumeni"] },
  lp:    { n: "Leg press",              ml: "Quadricipiti · glutei", k: ["leg-press", "hack-squat", "affondi-in-camminata"] },
  hack:  { n: "Hack squat",             ml: "Quadricipiti · glutei", k: ["hack-squat", "leg-press"] },
  sq:    { n: "Squat a macchina",       ml: "Quadricipiti · glutei", k: ["hack-squat", "leg-press", "affondi-in-camminata"] },
  lunge: { n: "Affondi a macchina",     ml: "Quadricipiti · glutei", k: ["affondi-in-camminata"] },
  le:    { n: "Leg extension",          ml: "Quadricipiti", k: ["leg-extension"] },
  lc:    { n: "Leg curl sdraiato",      ml: "Femorali", k: ["leg-curl-sdraiato", "stacchi-rumeni"] },
  lcs:   { n: "Leg curl seduto",        ml: "Femorali", k: ["leg-curl-sdraiato"] },
  lck:   { n: "Leg curl in piedi / in ginocchio", ml: "Femorali", k: ["leg-curl-sdraiato"] },
  glute: { n: "Glutei / hip thrust",    ml: "Glutei · femorali", k: ["hip-thrust", "stacchi-rumeni"] },
  ham:   { n: "Glute ham / reverse hyper", ml: "Femorali · glutei · lombari", k: ["stacchi-rumeni", "lombari-hyperextension", "leg-curl-sdraiato"] },
  abd:   { n: "Abductor",               ml: "Glutei laterali", k: ["hip-thrust"] },
  add:   { n: "Adductor",               ml: "Adduttori", k: [] },
  calf:  { n: "Calf in piedi",          ml: "Polpacci", k: ["calf-in-piedi"] },
  calfs: { n: "Calf seduto",            ml: "Polpacci (soleo)", k: ["calf-in-piedi"] },
  cable: { n: "Cavi / crossover",       ml: "Multiuso (cavi)", k: ["croci-inclinata-manubri", "spinte-in-basso-al-cavo-corda", "face-pull-corda-cavo-alto", "pulley-basso", "alzate-laterali"] },
  smith: { n: "Multipower / smith",     ml: "Multiuso (panca, squat, affondi)", k: ["panca-inclinata-multipower", "hack-squat", "affondi-in-camminata", "stacchi-rumeni"] },
  belt:  { n: "Belt squat",             ml: "Quadricipiti · glutei", k: ["hack-squat", "leg-press"] },
  multi: { n: "Multi press",            ml: "Petto · spalle", k: ["panca-inclinata-multipower", "shoulder-press-macchina"] }
};
// linee isotoniche "a pacco pesi" con i modelli tipici (nomi da targhetta in inglese)
const SEL = "Chest Press:cp|Incline Chest Press:ip|Pectoral Fly:fly|Rear Delt:rd|Shoulder Press:sp|Lateral Raise:lat|Lat Pulldown:pd|Seated Row:row|Biceps Curl:bic|Triceps Extension:tri|Abdominal Crunch:abs|Back Extension:lb|Rotary Torso:rot|Leg Press:lp|Leg Extension:le|Seated Leg Curl:lcs|Prone Leg Curl:lc|Hip Abductor:abd|Hip Adductor:add|Glute:glute|Calf Raise:calf";
const LINES = [
  // ---- PANATTA (Apiro, Italia) ----
  ["Panatta", "Fit Evo", "Chest Press:cp|Inclined Chest Press:ip|Inclined Chest Press Circular:ip|Pectoral Machine:fly|Pec Deck Butterfly:fly|Reverse Fly:rd|Shoulder Press:sp|Lateral Raises:lat|Lat Machine:pd|Lat Pulldown Convergent:pd|Low Row:row|Horizontal Pull:row|Arm Curl:bic|Triceps Machine:tri|Abdominal Crunch:abs|Rotary Torso:rot|Lower Back:lb|Leg Press:lp|Inclined Leg Press:lp|Leg Extension:le|Lying Leg Curl:lc|Seated Leg Curl:lcs|Standing Leg Curl:lck|Abductor:abd|Adductor:add|Calf Raise:calf|Gluteus Machine:glute|Crossover:cable|Dual Adjustable Pulley:cable|Pulley:cable|Multipower:smith"],
  ["Panatta", "SEC", "Chest Press:cp|Inclined Chest Press:ip|Pectoral Machine:fly|Shoulder Press:sp|Lateral Raises:lat|Lat Machine:pd|Low Row:row|Arm Curl:bic|Triceps Machine:tri|Abdominal Crunch:abs|Lower Back:lb|Leg Press:lp|Leg Extension:le|Lying Leg Curl:lc|Seated Leg Curl:lcs|Adductor:add|Abductor:abd|Pulley:cable|Crossover:cable"],
  ["Panatta", "Monolith", "Chest Press:cp|Inclined Chest Press Circular:ip|Inclined Chest Press:ip|Pectoral Machine:fly|Reverse Fly:rd|Shoulder Press:sp|Lateral Raises:lat|Lat Machine:pd|Lat Pulldown Circular:pd|Low Row:row|Rowing Machine:row|Pullover Machine:po|Biceps Curl:bic|Triceps Machine:tri|Dips Press:dip|Abdominal Crunch:abs|Lower Back:lb|Leg Press:lp|Leg Extension:le|Lying Leg Curl:lc|Seated Leg Curl:lcs|Standing Leg Curl:lck|Abductor:abd|Adductor:add|Hip Thrust:glute|Gluteus Machine:glute|Standing Calf:calf|Crossover:cable"],
  ["Panatta", "Freeweight HP", "Chest Press:cp|Inclined Chest Press:ip|Inclined Chest Press Circular:ip|Decline Chest Press:dp|Shoulder Press:sp|Lateral Raises:lat|Lat Pulldown:pd|Low Row:row|High Row:hrow|T-Bar Row:tbar|Arm Curl:bic|Triceps Dips:dip|Abdominal Crunch Bench:abs|Inclined Leg Press:lp|Hack Squat:hack|Squat Machine:sq|Pendulum Squat:sq|Leg Extension:le|Lying Leg Curl:lc|Hip Thrust:glute|Standing Calf:calf|Seated Calf:calfs|Smith Machine:smith|Multipower:smith"],
  ["Panatta", "Freeweight Special", "Super Inclined Bench Press:ip|Super Inclined Chest Press:ip|Super Upper Chest Flight Machine:fly|Super Middle Chest Flight Machine:fly|Super Lower Chest Flight Machine:fly|Super Horizontal Multi Press:multi|Super Vertical Multi Press:multi|Super Lateral Raises:lat|Super Deltoid Press:sp|Pullover Machine:po|Super Lat Machine:pd|Super Rowing Machine:row|Super Power Row:row|Adjustable Row 45°:row|Super Shrug Machine:shrug|Four Angles Biceps Machine:bic|Standing Total Arm:arm|Super Pendulum Squat:sq|Super Hack Squat:hack|Super Horizontal Leg Press Dual System:lp|Vertical Leg Press:lp|Super Lunge Machine:lunge|Alternate Leg Extension:le|Alternate Leg Curl:lck|Kneeling Leg Curling:lck|Lying Leg Curl:lc|Standing Hip Thrust:glute|Hip Thrust:glute|Super Seated Calf:calfs|Donkey Calf:calf|Belt Squat:belt"],
  ["Panatta", "Freeweight One", "Chest Press:cp|Inclined Chest Press:ip|Shoulder Press:sp|Lat Pulldown:pd|Low Row:row|Leg Press:lp|Hack Squat:hack|Hip Thrust:glute"],
  // ---- TECHNOGYM ----
  ["Technogym", "Selection 900", "Chest Press:cp|Pectoral:fly|Delts Machine:rd|Shoulder Press:sp|Lateral Raise:lat|Vertical Traction:pd|Pulldown:pd|Low Row:row|Upper Back:rd|Arm Curl:bic|Arm Extension:tri|Total Abdominal:abs|Abdominal Crunch:abs|Rotary Torso:rot|Lower Back:lb|Leg Press:lp|Leg Extension:le|Leg Curl:lcs|Prone Leg Curl:lc|Glute Press:glute|Abductor:abd|Adductor:add|Multi Hip:glute"],
  ["Technogym", "Selection 700", "Chest Press:cp|Pectoral:fly|Shoulder Press:sp|Lateral Raise:lat|Vertical Traction:pd|Low Row:row|Upper Back:rd|Arm Curl:bic|Arm Extension:tri|Abdominal Crunch:abs|Lower Back:lb|Leg Press:lp|Leg Extension:le|Leg Curl:lcs|Prone Leg Curl:lc|Abductor:abd|Adductor:add|Glute:glute|Multi Hip:glute"],
  ["Technogym", "Pure", "Chest Press:cp|Incline Chest Press:ip|Wide Chest Press:cp|Decline Chest Press:dp|Shoulder Press:sp|Lat Pulldown:pd|Pullover:po|Low Row:row|High Row:hrow|Row:row|Biceps Curl:bic|Triceps:tri|Leg Press:lp|Hack Squat:hack|Squat Lunge:lunge|Leg Extension:le|Leg Curl:lcs|Prone Leg Curl:lc|Hip Thrust:glute|Rear Kick:glute|Standing Calf:calf|Seated Calf:calfs|Belt Squat:belt"],
  ["Technogym", "Element+", "Chest Press:cp|Butterfly:fly|Delts Machine:rd|Shoulder Press:sp|Lat Machine:pd|Low Row:row|Arm Curl:bic|Arm Extension:tri|Abdominal Crunch:abs|Lower Back:lb|Leg Press:lp|Leg Extension:le|Leg Curl:lcs|Abductor:abd|Adductor:add|Multi Hip:glute"],
  ["Technogym", "Artis", "Chest Press:cp|Pectoral:fly|Shoulder Press:sp|Vertical Traction:pd|Low Row:row|Arm Curl:bic|Triceps:tri|Abdominal:abs|Lower Back:lb|Leg Press:lp|Leg Extension:le|Leg Curl:lcs|Prone Leg Curl:lc|Glute:glute|Abductor:abd|Adductor:add"],
  ["Technogym", "Plurima / Cable", "Crossover:cable|Dual Adjustable Pulley:cable|Kinesis:cable"],
  // ---- LIFE FITNESS / HAMMER STRENGTH ----
  ["Life Fitness", "Insignia", "Chest Press:cp|Incline Press:ip|Pectoral Fly / Rear Delt:fly|Rear Delt:rd|Shoulder Press:sp|Lateral Raise:lat|Lat Pulldown:pd|Seated Row:row|Biceps Curl:bic|Triceps Extension:tri|Triceps Press:dip|Abdominal:abs|Back Extension:lb|Leg Press:lp|Arc Leg Press:lp|Leg Extension:le|Seated Leg Curl:lcs|Prone Leg Curl:lc|Hip Abductor:abd|Hip Adductor:add|Glute:glute|Calf Extension:calf"],
  ["Life Fitness", "Signature", SEL],
  ["Life Fitness", "Optima", "Chest Press:cp|Pectoral Fly / Rear Delt:fly|Shoulder Press:sp|Lat Pulldown:pd|Seated Row:row|Biceps Curl:bic|Triceps Extension:tri|Abdominal Crunch:abs|Back Extension:lb|Leg Press:lp|Leg Extension:le|Seated Leg Curl:lcs|Hip Abductor:abd|Hip Adductor:add"],
  ["Hammer Strength", "Plate Loaded", "Iso-Lateral Bench Press:cp|Iso-Lateral Horizontal Bench Press:cp|Iso-Lateral Incline Press:ip|Iso-Lateral Super Incline Press:ip|Iso-Lateral Decline Chest Press:dp|Iso-Lateral Wide Chest:cp|Iso-Lateral Chest / Back:cp|Super Fly:fly|Iso-Lateral Shoulder Press:sp|Plate Loaded Lateral Raise:lat|Iso-Lateral Front Lat Pulldown:pd|Iso-Lateral Wide Pulldown:pd|Plate Loaded Pullover:po|Iso-Lateral Row:row|Iso-Lateral Low Row:row|Iso-Lateral High Row:hrow|Iso-Lateral D.Y. Row:row|T-Bar Row:tbar|Iso-Lateral T-Bar Row:tbar|Seated / Standing Shrug:shrug|Plate Loaded Seated Biceps:bic|Plate Loaded Seated Dip:dip|Abdominal / Oblique Crunch:abs|Plate Loaded Linear Leg Press:lp|Plate Loaded Hack Squat:hack|Plate Loaded V-Squat:sq|Pendulum-X Squat:sq|Plate Loaded Super Squat Press:sq|Plate Loaded Belt Squat:belt|Iso-Lateral Leg Extension:le|Iso-Lateral Leg Curl:lcs|Iso-Lateral Kneeling Leg Curl:lck|Plate Loaded Glute Drive:glute|Glute Ham / Reverse Hyper:ham|Plate Loaded Seated Calf Raise:calfs|Ground Base Multi-Squat:sq"],
  ["Hammer Strength", "Select", "Chest Press:cp|Incline Press:ip|Pectoral Fly / Rear Delt:fly|Shoulder Press:sp|Lateral Raise:lat|Lat Pulldown:pd|Low Row:row|Biceps Curl:bic|Triceps Extension:tri|Abdominal Crunch:abs|Back Extension:lb|Leg Press:lp|Leg Extension:le|Seated Leg Curl:lcs|Prone Leg Curl:lc|Hip Abductor:abd|Hip Adductor:add|Glute Drive:glute"],
  // ---- MATRIX ----
  ["Matrix", "Ultra", SEL + "|Converging Chest Press:cp|Converging Shoulder Press:sp|Diverging Lat Pulldown:pd|Diverging Seated Row:row|Glute Trainer:glute"],
  ["Matrix", "Aura", SEL],
  ["Matrix", "Versa", SEL],
  ["Matrix", "Magnum", "Chest Press:cp|Incline Press:ip|Decline Press:dp|Shoulder Press:sp|Lat Pulldown:pd|Low Row:row|High Row:hrow|T-Bar Row:tbar|Leg Press:lp|Hack Squat:hack|Leg Extension:le|Leg Curl:lcs|Hip Thrust:glute|Seated Calf:calfs|Breaker Bench:smith"],
  // ---- CYBEX ----
  ["Cybex", "Eagle NX", SEL + "|Fly / Rear Delt:fly|Overhead Press:sp|Arm Curl:bic|Arm Extension:tri|Leg Curl:lcs"],
  ["Cybex", "Prestige VRS", SEL],
  ["Cybex", "VR1", SEL],
  ["Cybex", "Plate Loaded", "Chest Press:cp|Incline Press:ip|Shoulder Press:sp|Row:row|Lat Pulldown:pd|Leg Press:lp|Hack Squat:hack|Squat Press:sq|Calf Raise:calf"],
  // ---- GYM80 ----
  ["Gym80", "Sygnum", "Chest Press:cp|Incline Chest Press:ip|Butterfly:fly|Reverse Butterfly:rd|Shoulder Press:sp|Lateral Raise:lat|Lat Pulldown:pd|Seated Row:row|Pullover:po|Biceps Curl:bic|Triceps Extension:tri|Abdominal Crunch:abs|Lower Back:lb|Leg Press:lp|Leg Extension:le|Seated Leg Curl:lcs|Lying Leg Curl:lc|Abductor:abd|Adductor:add|Glute:glute|Calf Raise:calf"],
  ["Gym80", "Pure Kraft", "Chest Press:cp|Incline Chest Press:ip|Shoulder Press:sp|Lat Pulldown:pd|Rowing:row|High Row:hrow|T-Bar Row:tbar|Leg Press:lp|Hack Squat:hack|Pendulum Squat:sq|Belt Squat:belt|Leg Extension:le|Leg Curl:lcs|Hip Thrust:glute|Calf Raise:calf"],
  // ---- NAUTILUS ----
  ["Nautilus", "Impact", SEL],
  ["Nautilus", "Inspiration", SEL],
  ["Nautilus", "Leverage", "Chest Press:cp|Incline Press:ip|Decline Press:dp|Shoulder Press:sp|Lat Pulldown:pd|Low Row:row|High Row:hrow|Leg Press:lp|Squat:sq|Leg Extension:le|Leg Curl:lcs|Glute Drive:glute"],
  // ---- PRECOR ----
  ["Precor", "Resolute", SEL],
  ["Precor", "Discovery", SEL + "|Plate Loaded Leg Press:lp|Plate Loaded Hack Squat:hack"],
  // ---- ALTRE MARCHE ----
  ["Atlantis", "Precision", "Chest Press:cp|Incline Chest Press:ip|Pec Fly:fly|Rear Delt:rd|Shoulder Press:sp|Lateral Raise:lat|Lat Pulldown:pd|Seated Row:row|Biceps Curl:bic|Triceps Extension:tri|Leg Press:lp|Hack Squat:hack|V-Squat:sq|Leg Extension:le|Lying Leg Curl:lc|Seated Leg Curl:lcs|Glute:glute|Standing Calf:calf|Seated Calf:calfs"],
  ["Prime", "Hybrid / Evolution", "Chest Press:cp|Incline Press:ip|Fly:fly|Rear Delt:rd|Shoulder Press:sp|Lateral Raise:lat|Lat Pulldown:pd|Seated Row:row|Preacher Curl:bic|Triceps Extension:tri|Leg Press:lp|Hack Squat:hack|Leg Extension:le|Leg Curl:lcs|Hip Thrust:glute"],
  ["Arsenal", "Reloaded / Alpha", "Chest Press:cp|Incline Press:ip|Shoulder Press:sp|Lateral Raise:lat|Lat Pulldown:pd|Seated Row:row|Leg Press:lp|Hack Squat:hack|Pendulum Squat:sq|Leg Extension:le|Leg Curl:lcs|Hip Thrust:glute"],
  ["Newtech", "Plate / Selectorized", "Chest Press:cp|Incline Press:ip|Shoulder Press:sp|Side Lateral:lat|Lat Pulldown:pd|Seated Row:row|Leg Press:lp|Hack Squat:hack|Leg Extension:le|Leg Curl:lcs|Hip Thrust:glute"],
  ["Hoist", "ROC-IT / Mi", "Chest Press:cp|Incline Press:ip|Pec Fly / Rear Delt:fly|Shoulder Press:sp|Lateral Raise:lat|Lat Pulldown:pd|Seated Row:row|Biceps Curl:bic|Triceps Extension:tri|Leg Press:lp|Leg Extension:le|Leg Curl:lcs|Glute:glute"],
  ["Freemotion", "Epic / Genesis", "Dual Cable Cross:cable|Chest Press:cp|Incline Press:ip|Shoulder Press:sp|Lat Pulldown:pd|Seated Row:row|Leg Press:lp|Leg Extension:le|Leg Curl:lcs"],
  ["Impulse", "IT / Encore", SEL],
  ["Toorx", "PLX", "Converging Chest Press:cp|Incline Chest Press:ip|Converging Shoulder Press:sp|Lat Pulldown:pd|Rowing Machine:row|Biceps Curl:bic|Assisted Pull Up / Dip:dip|Horizontal Leg Press:lp|Hip Thrust:glute|Leg Extension:le|Leg Curl:lcs|Multipower:smith|Cable Crossover:cable"],
  ["Body-Solid", "Pro Club", SEL]
];
const list = [];
for (const [b, l, models] of LINES) for (const it of models.split("|")) { const i = it.lastIndexOf(":"), n = it.slice(0, i).trim(), c = it.slice(i + 1).trim(); if (n && CAT[c] && !list.some(x => x.b === b && x.l === l && x.n === n)) list.push({ b, l, n, c }); }
window.MACCHINE_DB = { CAT, list };
})();
