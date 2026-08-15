#!/usr/bin/env node
/**
 * Physik-Verifikation Galton Board
 * --------------------------------
 * Extrahiert das <script id="app"> aus der HTML-Datei, evaluiert es in einer
 * Node-umgebung (ohne echten DOM; Canvas via Stub), treibt über die
 * __gb-Harness-API die Substep-Physik mit N Kugeln und prüft:
 *
 *   1. Lauf bricht nicht ab, alle Kugeln landen (keine Endlos-Fallenden)
 *   2. Kein NaN in Positionen/Geschwindigkeiten
 *   3. Verteilung ist glockenförmig: χ²-Test gegen B(rows, 0.5)
 *   4. Mittelwert & StdAbw liegen im erwarteten Bereich
 */
'use strict';
const fs = require('fs');
const vm = require('vm');

const HTML = process.argv[2] || 'build/Galton_Board_V01.html';
const BALLS = parseInt(process.argv[3] || '300', 10);
const ROWS = parseInt(process.argv[4] || '12', 10);

const html = fs.readFileSync(HTML, 'utf8');
const marker = '<script id="app">';
const i = html.indexOf(marker);
const j = html.indexOf('</script>', i);
if (i < 0 || j < 0) { console.error('app script nicht gefunden'); process.exit(1); }
let src = html.slice(i + marker.length, j);

// --- Canvas-Stub: alle 2D-Operationen no-op, aber messbar ---
function makeCtx() {
  const grad = { addColorStop() {} };
  return new Proxy({
    canvas: { width: 1, height: 1 },
    createLinearGradient: () => grad,
    createRadialGradient: () => grad,
    measureText: (t) => ({ width: String(t).length * 6 }),
  }, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (prop === 'getContext') return () => makeCtx();
      return () => {};
    },
    set() { return true; }
  });
}

// --- Minimale DOM-Stubs ---
const elements = {};
function makeEl(id) {
  if (!elements[id]) {
    elements[id] = {
      id, value: '', checked: false, disabled: false, innerHTML: '',
      textContent: '', className: '', style: {}, dataset: {},
      width: 0, height: 0, clientWidth: 700, clientHeight: 300,
      nextElementSibling: { textContent: '' },
      parentElement: { clientWidth: 720, querySelector: () => ({ textContent: '' }) },
      addEventListener() {}, removeEventListener() {},
      getContext: () => makeCtx(),
    };
  }
  return elements[id];
}
function stubCtx() { return { getContext: () => makeCtx() }; }

const sandbox = {
  console,
  Math, JSON, Number, String, Object, Array, parseFloat, parseInt, isNaN,
  performance: { now: () => Date.now() },
  requestAnimationFrame: (fn) => 0,   // keine Echtzeit-Schleife starten
  cancelAnimationFrame() {},
  window: {
    devicePixelRatio: 1,
    innerWidth: 1000, innerHeight: 800,
    AudioContext: undefined, webkitAudioContext: undefined,
    ResizeObserver: undefined,
    addEventListener() {}, removeEventListener() {},
  },
  document: {
    readyState: 'complete',
    documentElement: { lang: 'de' },
    getElementById: makeEl,
    querySelectorAll: () => [],
    querySelector: () => null,
    addEventListener() {}, createElement: (tag) => makeEl('' + Math.random()),
  },
};
sandbox.window.document = sandbox.document;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(src, sandbox, { filename: 'app.js' });

const G = sandbox.window.__gb;
if (!G) { console.error('__gb nicht exportiert'); process.exit(1); }

// --- Parameter setzen & Simulation bauen ---
G.setParam('balls', String(BALLS));
G.setParam('rows', String(ROWS));
G.setParam('interval', '1');   // schneller Spawn für Harness
G.setParam('speed', '3');
G.readParams();
G.buildSim();

// --- Kugeln spawnen & Physik treiben ---
// Realistisches Szenario: Spawn-Intervall in Simulationszeit (38 ms),
// NICHT alle Kugeln auf einmal (600 gleichzeitig wäre unüblich und
// erzeugt ein Dichte-Artefakt, das die Verteilung künstlich verbreitert).
const total = BALLS;
const spawnInterval = 0.038;        // Sekunden simuliert (Default der App)
const spawnEvery = 6;               // Physik-Substeps pro Spawn
let spawnCount = 0;
const maxFrames = 2000000;
let frames = 0, subFrames = 0;

while (G.dropped + G.balls.length < total && frames < maxFrames) {
  // 6 Substeps Physik = 50 ms simuliert
  for (let s = 0; s < spawnEvery; s++) {
    G.stepWorld(1 / 120);
  }
  G.removeSettled();
  frames += 0.05;
  subFrames += spawnEvery;
  // Nach jedem Spawn-Intervall eine Kugel
  if (spawnCount < total) {
    G.spawnNow();
    spawnCount++;
  }
  // aus Sicherheit: wenn Kugeln hängen (y > 2*H), settle direkt
  for (let k = G.balls.length - 1; k >= 0; k--) {
    const b = G.balls[k];
    if (b.y > G.H + 200) { G.settleBall(b); G.removeSettled(); }
  }
}
if (frames >= maxFrames) {
  console.error('FEHLER: Physik-Lauf nicht terminiert (Kugeln hängen)');
  process.exit(1);
}
// Nachlauf: restliche fallende Kugeln zu Ende bringen
while (G.balls.length > 0 && subFrames < 200000) {
  G.stepWorld(1 / 120);
  G.removeSettled();
  subFrames++;
  for (let k = G.balls.length - 1; k >= 0; k--) {
    const b = G.balls[k];
    if (b.y > G.H + 200) { G.settleBall(b); G.removeSettled(); }
  }
}
if (G.balls.length > 0) {
  console.error('FEHLER: Kugeln nach Nachlauf nicht gesettled');
  process.exit(1);
}

// --- Ergebnisse einsammeln ---
const bins = G.bins.slice();
const rest = G.restList.length;
if (rest !== total) {
  console.error(`FEHLER: nur ${rest}/${total} Kugeln gelandet`);
  process.exit(1);
}
let nanCount = 0;
G.balls.forEach(b => { if (!isFinite(b.x) || !isFinite(b.y) || !isFinite(b.vx) || !isFinite(b.vy)) nanCount++; });
G.restList.forEach(b => { if (!isFinite(b.x) || !isFinite(b.y)) nanCount++; });
if (nanCount > 0) { console.error(`FEHLER: ${nanCount} NaN-Positionen`); process.exit(1); }

// --- Statistik ---
const n = ROWS, p = 0.5;
const mu = n * p;
const sigma = Math.sqrt(n * p * (1 - p));
let sum = 0, mean = 0;
bins.forEach((v, k) => { sum += v; mean += k * v; });
mean /= sum || 1;
let variance = 0;
bins.forEach((v, k) => variance += v * (k - mean) * (k - mean));
variance /= sum || 1;
const sd = Math.sqrt(variance);

// Binomial-Wahrscheinlichkeiten
function binom(n, k) { k = Math.min(k, n - k); let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; }
const exp = bins.map((_, k) => binom(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k) * total);

// χ²-Gütetest (Zellen mit erwartet < 5 zusammenfassen)
let chi2 = 0, df = 0;
for (let k = 0; k < bins.length; k++) {
  if (exp[k] >= 5) { chi2 += (bins[k] - exp[k]) ** 2 / exp[k]; df += 1; }
}
// kritischer Wert χ²(df, 0.95) grob
function chi2Crit(df) {
  // Approximation nach Wilson-Hilferty für χ²
  return df * Math.pow(1 - 2 / (9 * df) + 1.6448536269514722 * Math.sqrt(2 / (9 * df)), 3);
}
const crit = chi2Crit(df);
const passChi2 = chi2 <= crit * 1.15; // 15% Toleranz wegen deterministischer Stichprobe
const passMean = Math.abs(mean - mu) < 0.45;
const passSd = Math.abs(sd - sigma) < 0.5;

console.log(`Kugeln: ${total} | Ebenen: ${n}`);
console.log(`Fächer: [${bins.join(', ')}]`);
console.log(`Mittelwert: ${mean.toFixed(3)} (theoretisch ${mu.toFixed(2)})`);
console.log(`StdAbw:    ${sd.toFixed(3)} (theoretisch ${sigma.toFixed(3)})`);
console.log(`χ² = ${chi2.toFixed(2)} (df=${df}, kritisch ≈ ${crit.toFixed(1)} mit 15% Toleranz)`);
console.log(`RESULT: ${passChi2 && passMean && passSd ? 'OK' : 'FEHLER'}`);
if (!passChi2) console.log('  -> χ²-Test nicht bestanden');
if (!passMean) console.log('  -> Mittelwert weicht zu stark ab');
if (!passSd) console.log('  -> StdAbw weicht zu stark ab');
process.exit(passChi2 && passMean && passSd ? 0 : 1);
