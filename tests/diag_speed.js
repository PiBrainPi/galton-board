#!/usr/bin/env node
// Diagnose: Ist die Physik geschwindigkeitsunabhängig?
// Gleicher Seed, gleiche Parameter, nur speed variiert → identische Verteilung erwartet.
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
function run(speed) {
  const elements = {};
  const makeEl = (id) => {
    if (!elements[id]) elements[id] = { id, value: '', checked: false, disabled: false, innerHTML: '', textContent: '', className: '', style: {}, dataset: {}, width: 0, height: 0, clientWidth: 700, clientHeight: 300, nextElementSibling: { textContent: '' }, parentElement: { clientWidth: 720, querySelector: () => ({ textContent: '' }) }, addEventListener() {}, removeEventListener() {}, getContext: () => makeCtx() };
    return elements[id];
  };
  const sb = { console, Math, JSON, Number, String, Object, Array, parseFloat, parseInt, isNaN, performance: { now: () => Date.now() }, requestAnimationFrame: () => 0, cancelAnimationFrame() {}, window: { devicePixelRatio: 1, innerWidth: 1000, innerHeight: 800, AudioContext: undefined, webkitAudioContext: undefined, ResizeObserver: undefined, addEventListener() {}, removeEventListener() {} }, document: { readyState: 'complete', documentElement: { lang: 'de' }, getElementById: makeEl, querySelectorAll: () => [], querySelector: () => null, addEventListener() {}, createElement: (t) => makeEl('' + Math.random()) } };
  sb.window.document = sb.document; sb.globalThis = sb; vm.createContext(sb);
  vm.runInContext(src, sb, { filename: 'app.js' });
  const g = sb.window.__gb;
  g.setParam('balls', '300'); g.setParam('rows', '12'); g.setParam('speed', String(speed)); g.setParam('seed', '42');
  g.readParams(); g.buildSim();
  const RAW = 0.016;
  let spawnCount = 0, spawnAccT = 0, guard = 0;
  while (g.dropped + g.balls.length < 300 && guard++ < 60000) {
    // speed = Frame-Wiederholungen (Browser: steps = round(speed*3))
    const steps = Math.max(1, Math.min(60, Math.round(speed * 3)));
    for (let si = 0; si < steps; si++) { g.stepWorld(Math.min(RAW, 0.05)); g.removeSettled(); }
    // Spawn skaliert mit speed (Browser: spawnAcc += raw*1000*speed)
    spawnAccT += RAW * 1000 * speed;
    while (spawnAccT >= 38 && spawnCount < 300) { spawnAccT -= 38; g.spawnNow(); spawnCount++; }
    for (let k = g.balls.length - 1; k >= 0; k--) { const b = g.balls[k]; if (b.y > g.H + 200) { g.settleBall(b); g.removeSettled(); } }
  }
  let tail = 0;
  while (g.balls.length > 0 && tail++ < 60000) {
    const steps2 = Math.max(1, Math.min(60, Math.round(speed * 3)));
    for (let si = 0; si < steps2; si++) { g.stepWorld(Math.min(RAW, 0.05)); g.removeSettled(); }
    for (let k = g.balls.length - 1; k >= 0; k--) { const b = g.balls[k]; if (b.y > g.H + 200) { g.settleBall(b); g.removeSettled(); } }
  }
  return { bins: g.bins.slice(), dropped: g.dropped, H: g.H };
}
const r1 = run(1);
const r10 = run(10);
console.log('speed=1  bins:', r1.bins.join(','));
console.log('speed=10 bins:', r10.bins.join(','));
console.log('IDENTISCH:', JSON.stringify(r1.bins) === JSON.stringify(r10.bins) ? 'JA' : 'NEIN');