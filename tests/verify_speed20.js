#!/usr/bin/env node
/**
 * 20-Lauf-Geschwindigkeitstest für Galton_Board_V0X.html (V10+)
 * ------------------------------------------------------------
 * Das Kernziel: Die Simulation muss GESCHWINDIGKEITS-UNABHÄNGIG sein. Wenn speed
 * die Verteilung verfälscht (Tunneling durch zu große Substeps), schlägt der Test
 * fehl. 20 Läufe über verschiedene speed-Werte (1–20) × Parameter.
 */
'use strict';
const fs = require('fs');
const vm = require('vm');

const HTML = process.argv[2] || 'build/Galton_Board_V10.html';
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
    get(t, p) { if (p in t) return t[p]; if (p === 'getContext') return () => makeCtx(); return () => {}; },
    set() { return true; }
  });
}
const elements = {};
function makeEl(id) {
  if (!elements[id]) {
    elements[id] = {
      id, value: '', checked: false, disabled: false, innerHTML: '', textContent: '',
      className: '', style: {}, dataset: {}, width: 0, height: 0, clientWidth: 700, clientHeight: 300,
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
    window: { devicePixelRatio: 1, innerWidth: 1000, innerHeight: 800, AudioContext: undefined,
      webkitAudioContext: undefined, ResizeObserver: undefined, addEventListener() {}, removeEventListener() {} },
    document: { readyState: 'complete', documentElement: { lang: 'de' }, getElementById: makeEl,
      querySelectorAll: () => [], querySelector: () => null, addEventListener() {}, createElement: (t) => makeEl('' + Math.random()) },
  };
  sb.window.document = sb.document; sb.globalThis = sb; vm.createContext(sb); return sb;
}

function binom(n, k) { k = Math.min(k, n - k); let r = 1; for (let z = 1; z <= k; z++) r = r * (n - k + z) / z; return r; }
function chi2Crit(df) { return df * Math.pow(1 - 2 / (9 * df) + 1.6448536269514722 * Math.sqrt(2 / (9 * df)), 3); }

// 20 Läufe: speed-Werte gezielt variieren, Parameter teils wechseln
const CASES = [];
const speeds = [1, 2, 3, 5, 8, 10, 12, 15, 20, 10, 5, 2, 1, 4, 7, 10, 14, 18, 20, 6];
const ballSets = [300, 400, 200, 300, 500, 300, 350, 250, 300, 400, 200, 300, 500, 300, 300, 400, 250, 300, 300, 200];
const rowSets = [12, 12, 10, 14, 12, 12, 10, 12, 12, 12, 12, 10, 12, 14, 12, 12, 12, 12, 12, 10];
for (let c = 0; c < 20; c++) {
  CASES.push({ balls: ballSets[c], rows: rowSets[c], ballR: 4.5, rest: 0.62, grav: 9.81, speed: speeds[c], interval: 38, seed: 42 + c, label: `speed=${speeds[c]}` });
}

let passAll = true;
console.log(`=== 20-Lauf-Geschwindigkeitstest: ${HTML} ===\n`);

CASES.forEach((c, idx) => {
  const sb = newSandbox();
  const g = sb.window.__gb = null;
  try { vm.runInContext(src, sb, { filename: 'app.js' }); } catch (e) { passAll = false; console.log(`❌ Run ${idx + 1}: INIT ${e.message}`); return; }
  const gg = sb.window.__gb;
  const problems = [];
  const fail = (m) => problems.push(m);
  try {
    gg.setParam('balls', String(c.balls));
    gg.setParam('rows', String(c.rows));
    gg.setParam('ballR', String(c.ballR));
    gg.setParam('rest', String(c.rest));
    gg.setParam('grav', String(c.grav));
    gg.setParam('speed', String(c.speed));
    gg.setParam('interval', String(c.interval));
    gg.setParam('seed', String(c.seed));
    gg.readParams(); gg.buildSim();

    const total = c.balls;
    let spawnCount = 0, guard = 0;
    // Echter Browser-Pfad: speed = Frame-Wiederholungen (steps), Spawn skaliert
    // mit speed (spawnAcc += raw*1000*speed). Jede Wiederholung hält h ≤ DT_STEP.
    const RAW = 0.016;
    let spawnAccT = 0;
    while (gg.dropped + gg.balls.length < total && guard++ < 60000) {
      const steps = Math.max(1, Math.min(60, Math.round(c.speed * 3)));
      for (let si = 0; si < steps; si++) { gg.stepWorld(Math.min(RAW, 0.05)); gg.removeSettled(); }
      spawnAccT += RAW * 1000 * c.speed;
      const itvT = 38;
      while (spawnAccT >= itvT && spawnCount < total) { spawnAccT -= itvT; gg.spawnNow(); spawnCount++; }
      for (let k = gg.balls.length - 1; k >= 0; k--) {
        const b = gg.balls[k];
        if (b.y > gg.H + 200) { gg.settleBall(b); gg.removeSettled(); }
      }
    }
    let tail = 0;
    while (gg.balls.length > 0 && tail++ < 60000) {
      const steps2 = Math.max(1, Math.min(60, Math.round(c.speed * 3)));
      for (let si = 0; si < steps2; si++) { gg.stepWorld(Math.min(RAW, 0.05)); gg.removeSettled(); }
      for (let k = gg.balls.length - 1; k >= 0; k--) {
        const b = gg.balls[k];
        if (b.y > gg.H + 200) { gg.settleBall(b); gg.removeSettled(); }
      }
    }
    ['render', 'drawHistogram', 'updateStats'].forEach((fn) => { try { gg[fn](); } catch (e) { fail(`render ${fn}: ${e.message}`); } });
    gg.balls.forEach((b) => { if (!isFinite(b.x) || !isFinite(b.y)) fail('NaN'); });
    if (gg.dropped !== total) fail(`nur ${gg.dropped}/${total} gelandet`);
    if (gg.balls.length > 0) fail(`${gg.balls.length} hängen`);

    const bins = gg.bins.slice();
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

    if (Math.abs(mean - mu) > 0.6) fail(`μ=${mean.toFixed(2)} (Soll ${mu.toFixed(1)})`);
    if (df > 0 && chi2 > crit) fail(`χ²=${chi2.toFixed(1)} > ${crit.toFixed(1)}`);
    if (df > 0 && Math.abs(sd - sig) > 0.8) fail(`σ=${sd.toFixed(2)} (Soll ${sig.toFixed(2)})`);

    if (problems.length) { passAll = false; console.log(`❌ Run ${String(idx + 1).padStart(2)} [${c.label}] ${c.balls}K/${c.rows}E: ${problems.join('; ')}`); }
    else console.log(`✅ Run ${String(idx + 1).padStart(2)} [${c.label}] ${String(c.balls).padStart(4)}K/${String(c.rows).padStart(2)}E → μ=${mean.toFixed(2)} σ=${sd.toFixed(2)} χ²=${chi2.toFixed(1)}`);
  } catch (e) { passAll = false; console.log(`❌ Run ${String(idx + 1).padStart(2)} [${c.label}]: EXCEPTION ${e.message}`); }
});

console.log(`\nRESULT: ${passAll ? '20/20 OK (geschwindigkeitsunabhängig)' : 'FEHLER'}`);
process.exit(passAll ? 0 : 1);