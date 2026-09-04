// simulazione/sim_test_harness.js
// Harness minimale per eseguire i moduli del web_simulator sotto Node.
// I moduli del simulatore sono script "browser globals": vengono concatenati
// ed eseguiti in un unico contesto vm, poi le variabili richieste sono esposte.

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const JS_DIR = path.join(__dirname, 'web_simulator', 'js');

/**
 * Carica i moduli indicati in un contesto isolato.
 * @param {string[]} files    percorsi relativi a web_simulator/js
 * @param {string[]} exports  nomi di variabili/funzioni da restituire
 * @param {object}   globals  globali da iniettare (es. arenaCanvas)
 */
function loadSim(files, exports, globals = {}) {
  const src = files
    .map((f) => fs.readFileSync(path.join(JS_DIR, f), 'utf8'))
    .join('\n;\n');

  const epilogue =
    '\n;globalThis.__api = {' +
    exports.map((n) => `${n}: typeof ${n} !== 'undefined' ? ${n} : undefined`).join(', ') +
    '};';

  const sandbox = Object.assign(
    {
      console,
      document: { getElementById: () => null },
      window: {},
      requestAnimationFrame: () => 0,
    },
    globals
  );

  const ctx = vm.createContext(sandbox);
  vm.runInContext(src + epilogue, ctx, { filename: 'simulator-bundle.js' });
  return ctx.__api;
}

/** Canvas fittizio: solo le dimensioni sono usate dai moduli sotto test. */
function fakeCanvas(width, height) {
  return { width, height, clientWidth: width, clientHeight: height };
}

/** Distanza in pixel dal bordo del muro rettangolare piu' vicino. */
function clearanceFromWalls(x, y, walls) {
  let best = Infinity;
  for (const w of walls) {
    const dx = Math.max(w.x - x, 0, x - (w.x + w.w));
    const dy = Math.max(w.y - y, 0, y - (w.y + w.h));
    best = Math.min(best, Math.hypot(dx, dy));
  }
  return best;
}

/** Riempie un rettangolo di celle occupate (valore 1) nella griglia SLAM. */
function fillCells(slamMap, gx0, gy0, gx1, gy1) {
  for (let gy = gy0; gy <= gy1; gy++) {
    for (let gx = gx0; gx <= gx1; gx++) {
      if (slamMap.grid[gy] && slamMap.grid[gy][gx] !== undefined) slamMap.grid[gy][gx] = 1;
    }
  }
}

/** Marca come libere (0) tutte le celle non occupate: griglia interamente esplorata. */
function markRestFree(slamMap) {
  for (let gy = 0; gy < slamMap.height; gy++) {
    for (let gx = 0; gx < slamMap.width; gx++) {
      if (slamMap.grid[gy][gx] !== 1) slamMap.grid[gy][gx] = 0;
    }
  }
}

/**
 * Carica l'intero simulatore nell'ordine dichiarato da index.html, escludendo
 * i moduli che richiedono un DOM o la rete. Serve ai test end-to-end.
 */
function loadSimFromIndex() {
  const html = fs.readFileSync(path.join(__dirname, 'web_simulator', 'index.html'), 'utf8');
  const senzaDom = ['three_scene', 'render_arena', 'render_map', 'render_fpv', 'websocket', 'controls', 'main'];
  const files = [...html.matchAll(/js\/([a-z_/]+)\.js/g)]
    .map((m) => m[1] + '.js')
    .filter((f, i, a) => a.indexOf(f) === i)
    .filter((f) => !senzaDom.some((e) => f.includes(e)));

  return loadSim(files,
    ['robotState', 'arenaObjects', 'slamMap', 'updatePhysics', 'initSlamGrid',
     'slamGridToWorld', 'updateSensors', 'jsBehaviors', 'solidifyClusterInteriors', 'findSlamClusters'],
    { arenaCanvas: fakeCanvas(446, 438), fetch: () => Promise.reject(new Error('offline')) });
}

/** Qualita' della mappa SLAM confrontata con la verita' a terra dell'arena. */
function groundTruthMapQuality(sim, W = 446, H = 438, bordo = 12) {
  const cell = W / sim.slamMap.width;
  const eMuro = (x, y) =>
    x < bordo || x > W - bordo || y < bordo || y > H - bordo ||
    sim.arenaObjects.walls.some((m) => x >= m.x && x <= m.x + m.w && y >= m.y && y <= m.y + m.h);

  let muriVeri = 0, muriTrovati = 0, falsiMuri = 0, libereOk = 0, libereTot = 0;
  for (let gy = 0; gy < sim.slamMap.height; gy++) {
    for (let gx = 0; gx < sim.slamMap.width; gx++) {
      const w = sim.slamGridToWorld(gx, gy);
      const v = sim.slamMap.grid[gy][gx];
      if (eMuro(w.x, w.y)) { muriVeri++; if (v === 1) muriTrovati++; continue; }
      libereTot++;
      if (v === 0) libereOk++;
      if (v === 1 && !eMuro(w.x + cell, w.y) && !eMuro(w.x - cell, w.y) &&
          !eMuro(w.x, w.y + cell) && !eMuro(w.x, w.y - cell)) falsiMuri++;
    }
  }
  return {
    copertura: sim.slamMap.stats.exploredPct,
    richiamoMuri: +(100 * muriTrovati / Math.max(1, muriVeri)).toFixed(1),
    falsiMuri,
    libereCorrette: +(100 * libereOk / Math.max(1, libereTot)).toFixed(1)
  };
}

module.exports = { loadSim, loadSimFromIndex, groundTruthMapQuality, fakeCanvas,
                   clearanceFromWalls, fillCells, markRestFree, JS_DIR };
