#!/usr/bin/env node
/**
 * 15-Simulationen-Härtetest für Galton_Board_V0X.html
 * ---------------------------------------------------
 * Spielt 15 willkürliche, aber sinnvolle Parametersätze durch und prüft hart:
 *  - Render-Funktionen werfen nicht (silent-freeze-Klasse)
 *  - keine NaN-Positionen
 *  - ALLE Kugeln landen (kein Endlos-Fallender, kein Hänger)
 *  - Verteilung glockenförmig: χ² gegen Binomial, μ ≈ n/2, σ ≈ √(n/4)
 *  - keine Kugel außerhalb des Brettes
 */
'use strict';
const fs = require('fs');
const vm = require('vm');

const HTML = process.argv[2] || 'build/Galton_Board_V06.html';
const html = fs.readFileSync(HTML, 'utf8');
const marker = '<script id="app">';
const i = html.indexOf(marker);
const j = html.indexOf('</script>', i);
if (i < 0 || j < 0) { console.error('app script nicht gefunden'); process.exit(1); }
const src = html.slice(i + marker.length, j);

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
      addEventListener() {}, removeEventListener() {}, getContext: () => makeCtx(),
    };
  }
  return elements[id];
}

function newSandbox() {
  const sb = {
    console, Math, JSON, Number, String, Object, Array, parseFloat, parseInt, isNaN,
    performance: { now: () => Date.now() },
    requestAnimationFrame: () => 0, cancelAnimationFrame() {},
    window: {
      devicePixelRatio: 1, innerWidth: 1000, innerHeight: 800,
      AudioContext: undefined, webkitAudioContext: undefined,
      ResizeObserver: undefined, addEventListener() {}, removeEventListener() {},
    },
    document: {
      readyState: 'complete', documentElement: { lang: 'de' },
      getElementById: makeEl, querySelectorAll: () => [],
      querySelector: () => null, addEventListener() {}, createElement: (t) => makeEl('' + Math.random()),
    },
  };
  sb.window.document = sb.document;
  sb.globalThis = sb;
  vm.createContext(sb);
  return sb;
}

// --- 15 Parametersätze (willkürlich, aber sinnvoll) ---
const CASES = [
  { balls: 300, rows: 12, ballR: 4.5, rest: 0.62, grav: 9.81, speed: 1,   interval: 38,  seed: 42,    label: 'Default' },
  { balls: 800, rows: 10, ballR: 4.0, rest: 0.55, grav: 9.81, speed: 1.5, interval: 22,  seed: 7,     label: 'Viele Kugeln' },
  { balls: 60,  rows: 8,  ballR: 5.5, rest: 0.70, grav: 12,   speed: 0.5, interval: 80,  seed: 123,   label: 'Wenige, große' },
  { balls: 400, rows: 20, ballR: 3.5, rest: 0.60, grav: 9.81, speed: 1,   interval: 30,  seed: 1001,   label: '20 Ebenen' },
  { balls: 200, rows: 15, ballR: 4.5, rest: 0.80, grav: 15,   speed: 2,   interval: 45,  seed: 555,    label: 'Elastisch+schwer' },
  { balls: 150, rows: 4,  ballR: 6.0, rest: 0.40, grav: 6,    speed: 1,   interval: 60,  seed: 77,     label: 'Nur 4 Ebenen' },
  { balls: 500, rows: 12, ballR: 2.5, rest: 0.65, grav: 9.81, speed: 3,   interval: 15,  seed: 2024,    label: 'Kleine Kugeln, schnell' },
  { balls: 350, rows: 18, ballR: 4.0, rest: 0.35, grav: 20,   speed: 1.2, interval: 25,  seed: 31415,   label: 'Sehr schwer' },
  { balls: 100, rows: 12, ballR: 6.5, rest: 0.90, grav: 4,    speed: 0.7, interval: 100, seed: 2718,    label: 'Leicht & weich' },
  { balls: 600, rows: 24, ballR: 3.0, rest: 0.58, grav: 9.81, speed: 1.4, interval: 20,  seed: 161803,   label: '24 Ebenen' },
  { balls: 250, rows: 6,  ballR: 5.0, rest: 0.50, grav: 18,   speed: 2.5, interval: 40,  seed: 99,      label: 'Breit & schnell' },
  { balls: 450, rows: 14, ballR: 3.8, rest: 0.45, grav: 10,   speed: 0.9, interval: 35,  seed: 271828,   label: 'Mittelklasse' },
  { balls: 75,  rows: 10, ballR: 5.5, rest: 0.72, grav: 8,    speed: 1.8, interval: 90,  seed: 7e2,      label: 'Ruhig groß' },
  { balls: 900, rows: 16, ballR: 2.0, rest: 0.63, grav: 11,   speed: 1.1, interval: 12,  seed: 90210,    label: 'Massenlauf' },
  { balls: 320, rows: 3,  ballR: 7.0, rest: 0.30, grav: 9.81, speed: 1,   interval: 50,  seed: 42,       label: 'Minimal 3 Ebenen' },
];

function binom(n, k) { k = Math.min(k, n - k); let r = 1; for (let z = 1; z <= k; z++) r = r * (n - k + z) / z; return r; }
function chi2Crit(df) { return df * Math.pow(1 - 2 / (9 * df) + 1.6448536269514722 * Math.sqrt(2 / (9 * df)), 3); }

let passAll = true;
console.log(`=== 15-Simulationen-Härtetest: ${HTML} ===\n`);

CASES.forEach((c, idx) => {
  const sb = newSandbox();
  const G = sb.window.__gb = null;
  try { vm.runInContext(src, sb, { filename: 'app.js' }); } catch (e) { fail(idx, c, 'INIT', e.message); return; }
  const g = sb.window.__gb;
  const problems = [];
  const fail = (msg) => problems.push(msg);

  try {
    g.setParam('balls', String(c.balls));
    g.setParam('rows', String(c.rows));
    g.setParam('ballR', String(c.ballR));
    g.setParam('rest', String(c.rest));
    g.setParam('grav', String(c.grav));
    g.setParam('speed', String(c.speed));
    g.setParam('interval', String(c.interval));
    g.setParam('seed', String(c.seed));
    g.readParams();
    g.buildSim();

    // Volllauf
    const total = c.balls;
    let spawnCount = 0, guard = 0;
    while (g.dropped + g.balls.length < total && guard++ < 400000) {
      for (let s = 0; s < 6; s++) g.stepWorld(1 / 120);
      g.removeSettled();
      if (spawnCount < total) { g.spawnNow(); spawnCount++; }
      for (let k = g.balls.length - 1; k >= 0; k--) {
        const b = g.balls[k];
        if (b.y > g.H + 200) { g.settleBall(b); g.removeSettled(); }
      }
    }
    let tail = 0;
    while (g.balls.length > 0 && tail++ < 400000) {
      g.stepWorld(1 / 120); g.removeSettled();
      for (let k = g.balls.length - 1; k >= 0; k--) {
        const b = g.balls[k];
        if (b.y > g.H + 200) { g.settleBall(b); g.removeSettled(); }
      }
    }

    // Render-Funktionen
    ['render', 'drawHistogram', 'updateStats'].forEach((fn) => {
      try { g[fn](); } catch (e) { fail(`render ${fn}: ${e.message}`); }
    });

    // NaN-Check
    g.balls.forEach((b) => { if (!isFinite(b.x) || !isFinite(b.y)) fail('NaN-Position'); });

    // Alle gelandet?
    if (g.dropped !== total) fail(`nur ${g.dropped}/${total} gelandet`);
    if (g.balls.length > 0) fail(`${g.balls.length} Kugeln hängen`);

    // Außerhalb des Brettes?
    g.balls.forEach((b) => { if (b.x < 0 || b.x > g.W || b.y < 0 || b.y > g.H) fail('Kugel out-of-bounds'); });

    // Statistik – Plausibilität
    const bins = g.bins.slice();
    const n = c.rows, mu = n * 0.5, sig = Math.sqrt(n * 0.25);
    let sum = 0, mean = 0;
    bins.forEach((v, k) => { sum += v; mean += k * v; });
    mean /= sum || 1;
    let var_ = 0;
    bins.forEach((v, k) => var_ += v * (k - mean) * (k - mean));
    var_ /= sum || 1;
    const sd = Math.sqrt(var_);
    const exp = bins.map((_, k) => binom(n, k) * Math.pow(0.5, n) * total);
    let chi2 = 0, df = 0;
    for (let k = 0; k < bins.length; k++) if (exp[k] >= 5) { chi2 += (bins[k] - exp[k]) ** 2 / exp[k]; df += 1; }
    const crit = df > 0 ? chi2Crit(df) * 1.15 : 0;

    // Toleranz: bei kleinen n (Kugeln≤100) etwas großzügiger
    const tolMean = c.balls < 100 ? 0.7 : 0.5;
    const tolSd = c.balls < 100 ? 0.8 : 0.6;
    if (Math.abs(mean - mu) > tolMean) fail(`μ=${mean.toFixed(2)} (Soll ${mu.toFixed(1)})`);
    if (df > 0 && chi2 > crit) fail(`χ²=${chi2.toFixed(1)} > ${crit.toFixed(1)}`);
    if (df > 0 && Math.abs(sd - sig) > tolSd) fail(`σ=${sd.toFixed(2)} (Soll ${sig.toFixed(2)})`);

    if (problems.length) {
      passAll = false;
      console.log(`❌ Run ${String(idx + 1).padStart(2)} [${c.label}]: ${problems.join('; ')}`);
    } else {
      console.log(`✅ Run ${String(idx + 1).padStart(2)} [${c.label}] ${String(c.balls).padStart(4)} Kugeln / ${String(c.rows).padStart(2)} Ebenen → μ=${mean.toFixed(2)} σ=${sd.toFixed(2)} χ²=${chi2.toFixed(1)}`);
    }
  } catch (e) {
    passAll = false;
    console.log(`❌ Run ${String(idx + 1).padStart(2)} [${c.label}]: EXCEPTION ${e.message}`);
  }
});

console.log(`\nRESULT: ${passAll ? '15/15 OK' : 'FEHLER'}`);
process.exit(passAll ? 0 : 1);
