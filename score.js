const CFG = {
  pollMs: 60000,
  spoilerDelayMs: 30000,
  workerOverlayUrl: "https://gentle-frost-fb04.steinerized.workers.dev/overlay?team=torino"
};

// --- DOM (crea comp+line se non esistono) ---
const root = document.getElementById("score");
if (!root) throw new Error("Manca #score nel DOM");

let compEl = document.getElementById("comp");
let lineEl = document.getElementById("line");
let line2El = document.getElementById("line2");

if (!line2El) {
  line2El = document.createElement("div");
  line2El.id = "line2";
  root.appendChild(line2El);
}

if (!compEl) {
  compEl = document.createElement("div");
  compEl.id = "comp";
  root.appendChild(compEl);
}
if (!lineEl) {
  lineEl = document.createElement("div");
  lineEl.id = "line";
  root.appendChild(lineEl);
}

// --- STATE ---
let lastLineText = "";
let tmr = null;

function fmtShortIT(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleString("it-IT", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).replace(",", " -");
}

function toNumOrNull(x) {
  if (typeof x === "number" && Number.isFinite(x)) return x;
  if (typeof x === "string" && x.trim() !== "" && !Number.isNaN(Number(x))) return Number(x);
  return null; // include {} e altri oggetti
}

function formatScore(m) {
  const h = m?.home || "Home";
  const a = m?.away || "Away";
  const hs = toNumOrNull(m?.scoreHome);
  const as = toNumOrNull(m?.scoreAway);

  if (hs == null || as == null) return `${h} vs ${a}`;
  return `${h} ${hs} - ${as} ${a}`;
}

function short3(name) {
  if (!name) return "";
  return name.trim().slice(0, 3).toUpperCase();
}

function setNow(compText, lineText, mode) {
  if (line2El) line2El.textContent = "";
  compEl.textContent = compText || "";
  lineEl.textContent = lineText || "";
  root.dataset.mode = mode || "";     // utile per CSS (es. [data-mode="LIVE"])
  lastLineText = lineText || "";

}

function setLineWithDelay(nextLineText) {
  if (!nextLineText || nextLineText === lastLineText) return;
  if (tmr) clearTimeout(tmr);
  tmr = setTimeout(() => {
    lineEl.textContent = nextLineText;
    lastLineText = nextLineText;
    tmr = null;
  }, CFG.spoilerDelayMs);
}

function short3Team(name) {
  if (!name) return "";

  const STOP = new Set([
    "AC","ACF","FC","SSC","AS","US","UC","SS","SC","CF","CD",
    "CALCIO","FOOTBALL","CLUB","HELLAS","SPORTING","SPORT","REAL",
    "DE","DEL","DELLA","DELL","DI","DA","LA","LE","IL","LO"
  ]);

  const tokens = name
    .trim()
    .split(/\s+/)
    .map(t => t.toUpperCase().replace(/[^A-Z0-9]/g, ""))
    .filter(Boolean);

  for (const t of tokens) {
    if (STOP.has(t)) continue;
    if (t.length < 3) continue;
    return t.slice(0, 3);
  }

  const first = tokens[0] || "";
  return first.slice(0, 3);
}


// --- MAIN ---
async function tick() {
  try {
    if (!lastLineText) setNow("Caricamento…", "Inizializzazione…", "LOADING");

    const res = await fetch(CFG.workerOverlayUrl, { cache: "no-store" });
    const data = await res.json();

    const mode = data?.mode;          // LIVE / NEXT / FINISHED / UNKNOWN / NONE
    const forced = data?.forced;      // "LAST" (se fallback)
    const comp = data?.competition || ""; // se l’hai aggiunta nel Worker
    const m = data?.match;

    if (!m || !mode) {
      setNow(comp || "Live Score", "Nessun dato disponibile", "NONE");
      return;
    }

    // Etichette “carine” per la prima riga se non hai competition
    const compLine = comp || "Torino • Live Score";

    if (mode === "LIVE") {
  const h = short3Team(m.home);
  const a = short3Team(m.away);

  const hs = toNumOrNull(m.scoreHome);
  const as = toNumOrNull(m.scoreAway);

  const left = (hs == null) ? 0 : hs;
  const right = (as == null) ? 0 : as;

  const line = `${h} ${left}-${right} ${a}`;

  // prima volta live: subito; aggiornamenti: delay anti-spoiler
  if (root.dataset.mode !== "LIVE") setNow(compLine, line, "LIVE");
  else {
    compEl.textContent = compLine;
    root.dataset.mode = "LIVE";
    if (line2El) line2El.textContent = "";
    setLineWithDelay(line);
  }
  return;
}
    if (mode === "NEXT") {
  // niente header
  compEl.textContent = "";

  // solo squadre
  lineEl.textContent = `${m.home} - ${m.away}`;

  // nessuna riga sotto
  line2El.textContent = "";

  root.dataset.mode = "NEXT";
  return;
}

    if (forced === "LAST" || mode === "FINISHED") {
      setNow(compLine, `Ultimo: ${formatScore(m)}`, "LAST");
      return;
    }

    setNow(compLine, "Nessuna partita in programma", "NONE");

  } catch (e) {
    console.error("[SCORE]", e);
    setNow("Live Score", "Errore dati", "ERROR");
  }
}

tick();
setInterval(tick, CFG.pollMs);
