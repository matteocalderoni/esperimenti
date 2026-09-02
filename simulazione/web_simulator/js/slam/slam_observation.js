// simulazione/web_simulator/js/slam/slam_observation.js
// Punti di Osservazione per Frontiere Irraggiungibili
//
// Con la dilatazione ancorata all'ingombro molte frontiere finiscono in varchi
// troppo stretti per il telaio. Non serve pero' arrivarci sopra: basta portarsi
// in una cella sicura che le veda. Qui si cerca la posa di osservazione piu'
// conveniente, da cui la scansione della testa fara' il resto.

// Raggio utile del sensore per una scansione significativa, in celle.
var SLAM_OBS_RADIUS_CELLS = 12;

/** Linea di vista fra due celle: nessun ostacolo noto lungo il segmento. */
function hasSlamLineOfSight(x0, y0, x1, y1) {
  var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  var sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  var err = dx - dy, sicurezza = 0;

  while (sicurezza++ < 200) {
    if (x0 === x1 && y0 === y1) return true;
    var e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
    if (y0 < 0 || y0 >= slamMap.height || x0 < 0 || x0 >= slamMap.width) return false;
    if (x0 === x1 && y0 === y1) return true;
    if (slamMap.grid[y0][x0] === 1) return false;   // muro noto: vista interrotta
  }
  return false;
}

/**
 * Cella sicura e gia' esplorata da cui si vede `target`, la piu' vicina a `cur`.
 * @returns {{gx:number, gy:number}|null}
 */
function findObservationPose(cur, target, dGrid) {
  var r = SLAM_OBS_RADIUS_CELLS;
  var migliore = null, minDist = Infinity;

  for (var dy = -r; dy <= r; dy++) {
    for (var dx = -r; dx <= r; dx++) {
      var gx = target.gx + dx, gy = target.gy + dy;
      if (gy <= 0 || gy >= slamMap.height - 1 || gx <= 0 || gx >= slamMap.width - 1) continue;
      if (slamMap.grid[gy][gx] !== 0) continue;     // deve essere spazio libero noto
      if (dGrid[gy][gx] === 1) continue;            // deve starci il telaio
      if (gx === cur.gx && gy === cur.gy) continue; // gia' qui: non aggiunge nulla
      if (!hasSlamLineOfSight(gx, gy, target.gx, target.gy)) continue;

      var d = Math.hypot(gx - cur.gx, gy - cur.gy);
      if (d < minDist) { minDist = d; migliore = { gx: gx, gy: gy }; }
    }
  }
  return migliore;
}
