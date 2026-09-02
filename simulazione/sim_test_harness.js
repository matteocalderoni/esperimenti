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

module.exports = { loadSim, fakeCanvas, clearanceFromWalls, fillCells, markRestFree, JS_DIR };
