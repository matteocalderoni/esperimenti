// simulazione/web_simulator/js/slam/slam_target.js
// Selezione dell'Obiettivo di Esplorazione
//
// Sceglie dove andare: frontiera raggiungibile, altrimenti posa di osservazione
// che la inquadri, altrimenti cella ignota piu' vicina. Decide anche quando il
// rilievo e' concluso, con un criterio di progresso della copertura.

/** Aggiorna il criterio di progresso; true se non c'e' piu' nulla da rilevare. */
function slamNoProgress() {
  if (slamMap.stats.exploredPct > (slamMap.lastProgressPct || 0)) {
    slamMap.lastProgressPct = slamMap.stats.exploredPct;
    slamMap.noProgressRounds = 0;
    return false;
  }
  slamMap.noProgressRounds = (slamMap.noProgressRounds || 0) + 1;
  if (slamMap.noProgressRounds > 14) { slamMap.noProgressRounds = 0; return true; }
  return false;
}

/** Percorso verso il prossimo obiettivo di esplorazione; [] se non ce n'e'. */
function planSlamExplorationPath(cur) {
  var ranked = (typeof rankFrontiersByBlindness === 'function')
    ? rankFrontiersByBlindness(cur, slamMap.frontiers) : slamMap.frontiers;
  var path = [];

  for (var fi = 0; fi < Math.min(30, ranked.length); fi++) {
    path = planAdaptiveSlamAStar(cur, ranked[fi]);
    if (path.length > 1) { slamMap.targetFrontier = ranked[fi]; return path; }
  }

  // Nessuna frontiera raggiungibile: non serve arrivarci sopra, basta vederla.
  if (typeof findObservationPose === 'function') {
    var dGrid = getDilatedSlamGrid();
    for (var oi = 0; oi < Math.min(12, ranked.length); oi++) {
      var posa = findObservationPose(cur, ranked[oi], dGrid);
      if (!posa) continue;
      path = planAdaptiveSlamAStar(cur, posa);
      if (path.length > 1) { slamMap.targetFrontier = ranked[oi]; return path; }
    }
  }

  if (slamMap.stats.exploredPct < 99 && typeof findHunterTarget === 'function') {
    var hunter = findHunterTarget(cur, getDilatedSlamGrid());
    if (hunter) {
      path = planAdaptiveSlamAStar(cur, hunter);
      if (path.length > 1) return path;
    }
  }
  return [];
}
