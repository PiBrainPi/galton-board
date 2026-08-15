#!/usr/bin/env node
// Adaptive Kalibrierung: vTang/restCap als Funktion der Ebenenzahl n.
// Idee: Bei wenigen Ebenen (wenige Kollisionen) braucht die Kugel mehr seitliche
// Streuung (höheres vTang/restCap); bei vielen Ebenen dunkelt die bewährte
// Einstellung (0.55/0.30) ab, damit σ nicht über √(n/4) hinaus wächst.
'use strict';
const fs = require('fs');
const vm = require('vm');
const HTML = process.argv[2] || 'build/Galton_Board_V10.html';
const html = fs.readFileSync(HTML, 'utf8');
const marker = '<script id="app">';
const i = html.indexOf(marker);
const j = html.indexOf('</script>', i);
const src0 = html.slice(i + marker.length, j);

function makeCtx() {
  const grad = { addColorStop() {} };
  return new Proxy({ canvas: { width: 1, height: 1 }, createLinearGradient: () => grad, createRadialGradient: () => grad, measureText: (t) => ({ width: String(t).length * 6 }) }, {
    get(t, p) { if (p in t) return t[p]; if (p === 'getContext') return () => makeCtx(); return () => {}; },
    set() { return true; }
  });
}
function run(rows, balls, seed, vtFn, rcFn) {
  const src = src0
    .replace(/vTang \*= [\d.]+;/, 'vTang *= (' + vtFn + ');')
    .replace(/var restPeg = Math\.min\(state\.rest, [\d.]+\);/, 'var restPeg = Math.min(state.rest, (' + rcFn + '));');
  const elements = {};
  const makeEl = (id) => {
    if (!elements[id]) elements[id] = { id, value: '', checked: false, disabled: false, innerHTML: '', textContent: '', className: '', style: {}, dataset: {}, width: 0, height: 0, clientWidth: 700, clientHeight: 300, nextElementSibling: { textContent: '' }, parentElement: { clientWidth: 720, querySelector: () => ({ textContent: '' }) }, addEventListener() {}, removeEventListener() {}, getContext: () => makeCtx() };
    return elements[id];
  };
  const sb = { console, Math, JSON, Number, String, Object, Array, parseFloat, parseInt, isNaN, performance: { now: () => Date.now() }, requestAnimationFrame: () => 0, cancelAnimationFrame() {}, window: { devicePixelRatio: 1, innerWidth: 1000, innerHeight: 800, AudioContext: undefined, webkitAudioContext: undefined, ResizeObserver: undefined, addEventListener() {}, removeEventListener() {} }, document: { readyState: 'complete', documentElement: { lang: 'de' }, getElementById: makeEl, querySelectorAll: () => [], querySelector: () => null, addEventListener() {}, createElement: (t) => makeEl('' + Math.random()) } };
  sb.window.document = sb.document; sb.globalThis = sb; vm.createContext(sb);
  vm.runInContext(src, sb, { filename: 'app.js' });
  const g = sb.window.__gb;
  g.setParam('balls', String(balls)); g.setParam('rows', String(rows)); g.setParam('seed', String(seed));
  g.readParams(); g.buildSim();
  const RAW = 0.016;
  let spawnCount = 0, spawnAccT = 0, guard = 0;
  while (g.dropped + g.balls.length < balls && guard++ < 60000) {
    for (let si = 0; si < 3; si++) { g.stepWorld(Math.min(RAW, 0.05)); g.removeSettled(); }
    spawnAccT += RAW * 1000;
    while (spawnAccT >= 38 && spawnCount < balls) { spawnAccT -= 38; g.spawnNow(); spawnCount++; }
    for (let k = g.balls.length - 1; k >= 0; k--) { const b = g.balls[k]; if (b.y > g.H + 200) { g.settleBall(b); g.removeSettled(); } }
  }
  let tail = 0;
  while (g.balls.length > 0 && tail++ < 60000) {
    for (let si = 0; si < 3; si++) { g.stepWorld(Math.min(RAW, 0.05)); g.removeSettled(); }
    for (let k = g.balls.length - 1; k >= 0; k--) { const b = g.balls[k]; if (b.y > g.H + 200) { g.settleBall(b); g.removeSettled(); } }
  }
  return g.bins.slice();
}
function binom(n, k) { k = Math.min(k, n - k); let r = 1; for (let z = 1; z <= k; z++) r = r * (n - k + z) / z; return r; }
function stats(bins, n, total) {
  let sum = 0, mean = 0; bins.forEach((v, k) => { sum += v; mean += k * v; }); mean /= sum || 1;
  let var_ = 0; bins.forEach((v, k) => var_ += v * (k - mean) ** 2); var_ /= sum || 1;
  const sd = Math.sqrt(var_);
  const exp = bins.map((_, k) => binom(n, k) * Math.pow(0.5, n) * total);
  let chi2 = 0, df = 0;
  for (let k = 0; k < bins.length; k++) if (exp[k] >= 5) { chi2 += (bins[k] - exp[k]) ** 2 / exp[k]; df += 1; }
  return { mean, sd, chi2 };
}

// Verschiedene adaptive Funktionen testen. n steht in state.rows zur Verfügung.
const cands = [
  { name: 'vt=0.55+max(0,(10-n))*0.02, cap=0.30', vt: '0.55 + Math.max(0, (10 - state.rows)) * 0.02', rc: '0.30' },
  { name: 'vt=0.55+max(0,(12-n))*0.02, cap=0.30', vt: '0.55 + Math.max(0, (12 - state.rows)) * 0.02', rc: '0.30' },
  { name: 'vt=0.55+max(0,(12-n))*0.025, cap=0.30', vt: '0.55 + Math.max(0, (12 - state.rows)) * 0.025', rc: '0.30' },
  { name: 'vt=0.55+max(0,(10-n))*0.03, cap=0.30', vt: '0.55 + Math.max(0, (10 - state.rows)) * 0.03', rc: '0.30' },
  { name: 'vt=0.58+max(0,(10-n))*0.02, cap=0.30', vt: '0.58 + Math.max(0, (10 - state.rows)) * 0.02', rc: '0.30' },
  { name: 'vt=0.55+max(0,(12-n))*0.015, cap=0.32', vt: '0.55 + Math.max(0, (12 - state.rows)) * 0.015', rc: '0.32' },
  { name: 'vt=0.55+max(0,(14-n))*0.02, cap=0.30', vt: '0.55 + Math.max(0, (14 - state.rows)) * 0.02', rc: '0.30' },
];

const rowsTest = [3, 4, 5, 6, 7, 8, 10, 12, 15, 20];
console.log('Adaptive Kandidaten → Ziel: σ≈√(n/4) bei allen n, Ränder bei kleinen n gefüllt\n');
for (const c of cands) {
  let fails = 0, worst = 0; const lines = [];
  for (const n of rowsTest) {
    const b = run(n, n <= 6 ? 600 : 300, 42, c.vt, c.rc);
    const s = stats(b, n, b.reduce((a, v) => a + v, 0));
    const edge = b[0] + b[b.length - 1];
    const expect = (b.reduce((a, v) => a + v, 0)) * Math.pow(0.5, n);
    const sdOk = Math.abs(s.sd - Math.sqrt(n / 4)) < 0.30;
    const edgeOk = n <= 8 ? edge >= expect * 0.5 : true;
    if (!sdOk || !edgeOk) fails++;
    worst = Math.max(worst, Math.abs(s.sd - Math.sqrt(n / 4)));
    lines.push(`n${String(n).padStart(2)}:σ=${s.sd.toFixed(2)} R=${edge}${sdOk && edgeOk ? '✓' : '✗'}`);
  }
  console.log(`[${c.name}]`);
  console.log('  ' + lines.join(' | '));
  console.log(`  → fails=${fails} worstΔσ=${worst.toFixed(2)}\n`);
}