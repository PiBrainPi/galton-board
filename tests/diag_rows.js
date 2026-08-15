#!/usr/bin/env node
// Diagnose: Randfächer bei verschiedenen Ebenenzahlen – werden die äußersten
// Fächer (0 und n) jemals gefüllt? Bei p=0.5 ist P(Rand) = 2^-n.
// 5 Ebenen → 1/32 ≈ 3.1% → ~9 Kugeln von 300 je Randfach erwartet.
'use strict';
const fs = require('fs');
const vm = require('vm');
const HTML = process.argv[2] || 'build/Galton_Board_V10.html';
const html = fs.readFileSync(HTML, 'utf8');
const marker = '<script id="app">';
const i = html.indexOf(marker);
const j = html.indexOf('</script>', i);
const src = html.slice(i + marker.length, j);

function makeCtx() {
  const grad = { addColorStop() {} };
  return new Proxy({ canvas: { width: 1, height: 1 }, createLinearGradient: () => grad, createRadialGradient: () => grad, measureText: (t) => ({ width: String(t).length * 6 }) }, {
    get(t, p) { if (p in t) return t[p]; if (p === 'getContext') return () => makeCtx(); return () => {}; },
    set() { return true; }
  });
}
function run(rows, balls, seed) {
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
  return { bins: g.bins.slice(), dropped: g.dropped, GX: g.GX, W: g.W, H: g.H, pegs0: g.pegs[0] ? g.pegs[0].length : 0 };
}

console.log('=== Randfach-Diagnose über Ebenenzahlen (300 Kugeln, seeds 42–47) ===\n');
const rowsAll = [3, 4, 5, 6, 7, 8, 10, 12, 15, 20];
let anyEmpty = false;
for (const rows of rowsAll) {
  // Mehrere Seeds, um Statistiken zu sammeln
  let edgeL = 0, edgeR = 0, sum = 0;
  const results = [];
  for (let seed = 42; seed <= 47; seed++) {
    const r = run(rows, 300, seed);
    const n = r.bins.length;
    edgeL += r.bins[0];
    edgeR += r.bins[n - 1];
    sum += r.bins.reduce((a, b) => a + b, 0);
    results.push(r.bins.join(','));
  }
  const expect = 300 * Math.pow(0.5, rows); // erwartete Kugeln je Randfach
  const fillL = edgeL > 0 ? 'JA' : '⚠️ NIE';
  const fillR = edgeR > 0 ? 'JA' : '⚠️ NIE';
  if (edgeL === 0 || edgeR === 0) anyEmpty = true;
  console.log(`Ebenen=${String(rows).padStart(2)} | Fach0 über 6 Seeds: ${String(edgeL).padStart(4)} (erw. ~${expect.toFixed(1)}×6) ${fillL} | Fach${rows} über 6 Seeds: ${String(edgeR).padStart(4)} ${fillR}`);
  console.log(`   2 Seeds-Beispiel: [${results[0]}]`);
}
console.log(`\n${anyEmpty ? '⚠️  RANDFÄCHER BLEIBEN LEER → BUG BESTÄTIGT' : 'Alle Randfächer gefüllt'}`);