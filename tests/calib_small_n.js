#!/usr/bin/env node
// Kalibrierung für kleine Ebenenzahlen: Findet vTang/restPeg-Werte, bei denen
// BOTH n=5 (Ränder zählen!) und n=12 (Standard) eine plausible Binomialverteilung
// liefern. Modifiziert die Parameter direkt im Quelltext (DOM-Stub), statt die
// Datei zu patchen – so kann ich 20+ Kombinationen schnell durchsweepen.
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
function run(rows, balls, seed, vTangFactor, restCap) {
  // Quelltext anpassen: vTang-Faktor und rest-Cap ersetzen
  const src = src0
    .replace(/vTang \*= [\d.]+;/, 'vTang *= ' + vTangFactor + ';')
    .replace(/var restPeg = Math\.min\(state\.rest, [\d.]+\);/, 'var restPeg = Math.min(state.rest, ' + restCap + ');');
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
  return { mean, sd, chi2, df };
}

console.log('Kalibrierung vTang × restCap für n=5 UND n=12 (je 300 Kugeln, Seed 42)');
console.log('Ziel n=5: σ≈1.12, Ränder ≈ je 9; Ziel n=12: σ≈1.73\n');
const combos = [
  [0.55, 0.30], [0.60, 0.30], [0.65, 0.30], [0.70, 0.30], [0.75, 0.30],
  [0.60, 0.35], [0.65, 0.35], [0.70, 0.35], [0.65, 0.40], [0.70, 0.40],
  [0.80, 0.30], [0.85, 0.30], [0.75, 0.40],
];
let best = null;
for (const [vt, rc] of combos) {
  const b5 = run(5, 300, 42, vt, rc);
  const b12 = run(12, 300, 42, vt, rc);
  const s5 = stats(b5, 5, 300), s12 = stats(b12, 12, 300);
  const edge5 = b5[0] + b5[b5.length - 1];
  const ok5 = Math.abs(s5.sd - 1.118) < 0.25 && edge5 >= 4;
  const ok12 = Math.abs(s12.sd - 1.732) < 0.25 && s12.chi2 < 20;
  const score = Math.abs(s5.sd - 1.118) + Math.abs(s12.sd - 1.732) + (ok5 && ok12 ? 0 : 5);
  if (!best || score < best.score) best = { vt, rc, score, s5, s12, b5, b12, edge5, ok5, ok12 };
  console.log(`vTang=${vt.toFixed(2)} rest=${rc.toFixed(2)} | n5: σ=${s5.sd.toFixed(2)} Ränder=${edge5} χ²=${s5.chi2.toFixed(1)} ${ok5 ? '✅' : '❌'} | n12: σ=${s12.sd.toFixed(2)} χ²=${s12.chi2.toFixed(1)} ${ok12 ? '✅' : '❌'}`);
}
console.log('\nBESTE KOMBINATION:', best ? `vTang=${best.vt} rest=${best.rc}` : '—');
console.log('  n5 bins:', (best.b5 || []).join(','));
console.log('  n12 bins:', (best.b12 || []).join(','));