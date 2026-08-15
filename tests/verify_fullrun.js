#!/usr/bin/env node
/**
 * Volllauf-Verifikation für Galton_Board_V0X.html (V04+)
 * ------------------------------------------------------
 * 1. extrahiert <script id="app">, evaluiert in Node-Sandbox (Canvas-Stub)
 * 2. treibt die Physik real (38-ms-Spawn), bis alle Kugeln gelandet sind
 * 3. ruft JEDE Render-Funktion explizit auf (render, drawHistogram, updateStats)
 *    → fängt den "silent freeze"-Bug-Klasse ab (undeklarierte Schleifenvariable
 *      killt den rAF-Loop; node --check sieht das nicht)
 * 4. prüft Statistik + χ² gegen Binomial(rows, 0.5) wie verify_physics.js
 */
'use strict';
const fs = require('fs');
const vm = require('vm');

const HTML = process.argv[2] || 'build/Galton_Board_V04.html';
const BALLS = parseInt(process.argv[3] || '300', 10);
const ROWS = parseInt(process.argv[4] || '12', 10);

const html = fs.readFileSync(HTML, 'utf8');
const marker = '<script id="app">';
const i = html.indexOf(marker);
const j = html.indexOf('</script>', i);
if (i < 0 || j < 0) { console.error('app script nicht gefunden'); process.exit(1); }
let src = html.slice(i + marker.length, j);

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

const sandbox = {
  console, Math, JSON, Number, String, Object, Array, parseFloat, parseInt, isNaN,
  performance: { now: () => Date.now() },
  requestAnimationFrame: (fn) => 0,
  cancelAnimationFrame() {},
  window: {
    devicePixelRatio: 1, innerWidth: 1000, innerHeight: 800,
    AudioContext: undefined, webkitAudioContext: undefined,
    ResizeObserver: undefined, addEventListener() {}, removeEventListener() {},
  },
  document: {
    readyState: 'complete', documentElement: { lang: 'de' },
    getElementById: makeEl, querySelectorAll: () => [],
    querySelector: () => null, addEventListener() {}, createElement: (tag) => makeEl('' + Math.random()),
  },
};
sandbox.window.document = sandbox.document;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

// rAF als echte Mikro-Schleife installieren, damit frame() (und damit render,
// drawHistogram, updateStats) tatsächlich ausgeführt wird
let rafQueue = [];
sandbox.requestAnimationFrame = (fn) => { rafQueue.push(fn); return rafQueue.length; };
sandbox.window.requestAnimationFrame = sandbox.requestAnimationFrame;

let runErr = null;
try {
  vm.runInContext(src, sandbox, { filename: 'app.js' });
} catch (e) { runErr = e; }

const G = sandbox.window.__gb;
if (runErr) { console.error('INIT-FEHLER:', runErr.message); process.exit(1); }
if (!G) { console.error('__gb nicht exportiert'); process.exit(1); }

// --- Parameter setzen, Simulation bauen ---
G.setParam('balls', String(BALLS));
G.setParam('rows', String(ROWS));
G.setParam('interval', '38');
G.setParam('speed', '3');
G.readParams();
G.buildSim();

// --- Volllauf mit realistischem Spawn-Intervall ---
const total = BALLS;
const spawnEvery = 6;   // ~50 ms simuliert pro Spawn
let spawnCount = 0, guard = 0;

while (G.dropped + G.balls.length < total && guard++ < 200000) {
  for (let s = 0; s < spawnEvery; s++) G.stepWorld(1 / 120);
  G.removeSettled();
  if (spawnCount < total) { G.spawnNow(); spawnCount++; }
  for (let k = G.balls.length - 1; k >= 0; k--) {
    const b = G.balls[k];
    if (b.y > G.H + 200) { G.settleBall(b); G.removeSettled(); }
  }
}
let tailGuard = 0;
while (G.balls.length > 0 && tailGuard++ < 200000) {
  G.stepWorld(1 / 120); G.removeSettled();
  for (let k = G.balls.length - 1; k >= 0; k--) {
    const b = G.balls[k];
    if (b.y > G.H + 200) { G.settleBall(b); G.removeSettled(); }
  }
}
if (G.balls.length > 0) { console.error('FEHLER: Kugeln nach Nachlauf nicht gesettled'); process.exit(1); }

// --- JEDE Render-Funktion explizit ausführen (fängt silent-freeze) ---
const renderChecks = ['render', 'drawHistogram', 'updateStats'];
for (const fn of renderChecks) {
  try {
    if (typeof G[fn] !== 'function') { console.error(`FEHLER: ${fn} nicht vorhanden`); process.exit(1); }
    G[fn]();
    console.log(`Render ${fn}: OK`);
  } catch (e) {
    console.error(`FEHLER in ${fn}:`, e.message);
    process.exit(1);
  }
}

// --- Statistik-Check ---
const bins = G.bins.slice();
if (G.dropped !== total) { console.error(`FEHLER: ${G.dropped}/${total} gelandet`); process.exit(1); }
const n = ROWS, p = 0.5;
const mu = n * p, sigma = Math.sqrt(n * p * (1 - p));
let sum = 0, mean = 0;
bins.forEach((v, k) => { sum += v; mean += k * v; });
mean /= sum || 1;
let variance = 0;
bins.forEach((v, k) => variance += v * (k - mean) * (k - mean));
variance /= sum || 1;
const sd = Math.sqrt(variance);
function binom(nn, kk) { kk = Math.min(kk, nn - kk); let r = 1; for (let z = 1; z <= kk; z++) r = r * (nn - kk + z) / z; return r; }
const exp = bins.map((_, k) => binom(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k) * total);
let chi2 = 0, df = 0;
for (let k = 0; k < bins.length; k++) if (exp[k] >= 5) { chi2 += (bins[k] - exp[k]) ** 2 / exp[k]; df += 1; }
function chi2Crit(df) { return df * Math.pow(1 - 2 / (9 * df) + 1.6448536269514722 * Math.sqrt(2 / (9 * df)), 3); }
const crit = chi2Crit(df);
const passChi2 = chi2 <= crit * 1.15;
const passMean = Math.abs(mean - mu) < 0.45;
const passSd = Math.abs(sd - sigma) < 0.5;

console.log(`Kugeln: ${total} | Ebenen: ${n}`);
console.log(`Fächer: [${bins.join(', ')}]`);
console.log(`Mittelwert: ${mean.toFixed(3)} (theoretisch ${mu.toFixed(2)})`);
console.log(`StdAbw:    ${sd.toFixed(3)} (theoretisch ${sigma.toFixed(3)})`);
console.log(`χ² = ${chi2.toFixed(2)} (df=${df}, kritisch ≈ ${crit.toFixed(1)})`);
console.log(`RESULT: ${passChi2 && passMean && passSd ? 'OK' : 'FEHLER'}`);
process.exit(passChi2 && passMean && passSd ? 0 : 1);
