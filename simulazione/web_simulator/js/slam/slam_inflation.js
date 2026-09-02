// simulazione/web_simulator/js/slam/slam_inflation.js
// Dilatazione degli Ostacoli Ancorata all'Ingombro Fisico del Robot
//
// La griglia SLAM ha celle la cui dimensione in pixel dipende dal canvas
// (arena / numero di celle) e NON e' quadrata. Esprimere la dilatazione in
// "celle" produce quindi un margine variabile e, alle dimensioni tipiche,
// piu' piccolo del raggio del robot: l'A* pianifica varchi impercorribili.
// Qui il margine parte sempre da CAR_RADIUS_PX e viene convertito in celle
// separatamente per asse.

// Margine di sicurezza oltre il raggio del telaio (10%).
var SLAM_SAFETY_MARGIN = 1.10;

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
