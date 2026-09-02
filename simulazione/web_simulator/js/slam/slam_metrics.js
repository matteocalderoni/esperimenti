// simulazione/web_simulator/js/slam/slam_metrics.js
// Conversione Griglia -> Misure Metriche per le Quote della Piantina
//
// La cella della griglia SLAM non ha dimensione fissa: dipende dal canvas
// (arena / numero di celle) e non e' quadrata. Darla per scontata a 10 px
// falsava ogni quota e la superficie del locale. Qui c'e' l'unica conversione.

// Scala del simulatore: 160 px = 1 metro (stessa usata dai raycast dei sensori).
var SLAM_PX_PER_METER = 160;

/** Dimensione di una cella in metri, per asse. */
function slamCellMeters() {
  return {
    w: (getArenaW() / slamMap.width) / SLAM_PX_PER_METER,
    h: (getArenaH() / slamMap.height) / SLAM_PX_PER_METER
  };
}

/**
 * Lunghezza in metri di una campata di `celle` lungo un asse.
 * @param {number} celle numero di celle
 * @param {'x'|'y'} asse
 */
function slamSpanMeters(celle, asse) {
  var c = slamCellMeters();
  return celle * (asse === 'y' ? c.h : c.w);
}

/** Superficie in metri quadri corrispondente a un numero di celle. */
function slamAreaM2(celle) {
  var c = slamCellMeters();
  return celle * c.w * c.h;
}

/** Etichetta di quota, in metri con due decimali. */
function formatQuota(metri) {
  return metri.toFixed(2) + ' m';
}
