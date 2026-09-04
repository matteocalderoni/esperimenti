// simulazione/web_simulator/js/slam/slam_inflation.js
// Dilatazione degli Ostacoli Ancorata all'Ingombro Fisico del Robot
//
// La griglia SLAM ha celle la cui dimensione in pixel dipende dal canvas
// (arena / numero di celle) e NON e' quadrata. Esprimere la dilatazione in
// "celle" produce quindi un margine variabile e, alle dimensioni tipiche,
// piu' piccolo del raggio del robot: l'A* pianifica varchi impercorribili.
// Qui il margine parte sempre da CAR_RADIUS_PX e viene convertito in celle
// separatamente per asse.

// Margine di sicurezza elevato oltre il raggio del telaio (55%): blocca i varchi stretti < 70cm ed impone l'aggiramento sicuro.
var SLAM_SAFETY_MARGIN = 1.55;

/**
 * Raggio di dilatazione in celle, per asse, che copre l'ingombro reale.
 * @returns {{rx: number, ry: number}}
 */
function getSafeDilationCells() {
  var cellW = getArenaW() / slamMap.width;
  var cellH = getArenaH() / slamMap.height;
  var raggioPx = CAR_RADIUS_PX * SLAM_SAFETY_MARGIN;
  return {
    rx: Math.max(1, Math.ceil(raggioPx / cellW)),
    ry: Math.max(1, Math.ceil(raggioPx / cellH))
  };
}

/**
 * Copia della griglia con gli ostacoli dilatati.
 * Senza argomenti usa il raggio sicuro derivato dall'ingombro del robot.
 * @param {number} [rx] raggio in celle sull'asse X
 * @param {number} [ry] raggio in celle sull'asse Y (default: rx)
 */
function getDilatedSlamGrid(rx, ry) {
  if (rx === undefined) {
    var sicuro = getSafeDilationCells();
    rx = sicuro.rx;
    ry = sicuro.ry;
  }
  if (ry === undefined) ry = rx;

  var dGrid = slamMap.grid.map(function (row) { return row.slice(); });
  for (var y = 0; y < slamMap.height; y++) {
    for (var x = 0; x < slamMap.width; x++) {
      if (slamMap.grid[y][x] === 1) {
        for (var dy = -ry; dy <= ry; dy++) {
          for (var dx = -rx; dx <= rx; dx++) {
            var ny = y + dy, nx = x + dx;
            if (ny >= 0 && ny < slamMap.height && nx >= 0 && nx < slamMap.width) dGrid[ny][nx] = 1;
          }
        }
      }
    }
  }
  return dGrid;
}

/**
 * Genera una mappa di costo sfumata con decadimento esponenziale attorno agli ostacoli.
 */
function getSlamCostmap(gamma, maxCost) {
  if (gamma === undefined) gamma = 0.3;
  if (maxCost === undefined) maxCost = 255;
  var costmap = [];
  var obs = [];

  for (var y = 0; y < slamMap.height; y++) {
    costmap.push(new Array(slamMap.width).fill(0));
    for (var x = 0; x < slamMap.width; x++) {
      if (slamMap.grid[y][x] === 1) obs.push({ x: x, y: y });
    }
  }

  if (obs.length === 0) return costmap;

  for (var cy = 0; cy < slamMap.height; cy++) {
    for (var cx = 0; cx < slamMap.width; cx++) {
      if (slamMap.grid[cy][cx] === 1) {
        costmap[cy][cx] = maxCost;
      } else {
        var minD = Infinity;
        for (var oi = 0; oi < Math.min(60, obs.length); oi++) {
          var d = Math.hypot(obs[oi].x - cx, obs[oi].y - cy);
          if (d < minD) minD = d;
        }
        if (minD <= 4.0) {
          costmap[cy][cx] = Math.round(maxCost * Math.exp(-gamma * minD));
        }
      }
    }
  }
  return costmap;
}

