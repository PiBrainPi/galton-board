#!/usr/bin/env node
// Diagnose: Wie weit kommen Kugeln seitlich bei wenigen Ebenen? Testet, ob die
// Spawn-Parameter (jitterX ±0.25·GX, vx0 = tilt·60 ≈ ±6) die Streuung begrenzen.
'use strict';
const fs = require('fs');
const vm = require('vm');
const HTML = process.argv[2];
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
  // min/max der gelandeten Kugel-x relativ zu CX und binCenters
  const n = g.bins.length;
  return { bins: g.bins.slice(), cx: g.CX, GX: g.GX, W: g.W, wallL: g.CX - (g.state.rows + 1 - 1) * g.GX / 2 - (g.pegR ? g.pegR() : 3.8) - g.state.ballR * 2.2 - 1, bin0: g.CX - (n - 1) / 2 * g.GX };
}
const r5 = run(5, 300, 42);
console.log('n=5  bins:', r5.bins.join(','));
console.log('n=5  CX=' + r5.cx.toFixed(1), 'GX=' + r5.GX.toFixed(1), 'W=' + r5.W.toFixed(1));
console.log('n=5  Fach0 liegt bei bef. x =', r5.bin0.toFixed(1), '| linke Wand bei', r5.wallL.toFixed(1));
const r12 = run(12, 300, 42);
console.log('n=12 bins:', r12.bins.join(','));
console.log('n=12 CX=' + r12.cx.toFixed(1), 'GX=' + r12.GX.toFixed(1), 'W=' + r12.W.toFixed(1));
console.log('n=12 Fach0 liegt bei bef. x =', r12.bin0.toFixed(1), '| linke Wand bei', r12.wallL.toFixed(1));