// simulazione/web_simulator/js/slam/slam_target.js
// Selezione dell'Obiettivo di Esplorazione & Ispezione Ravvicinata VLM

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

function isSafeOpenSpaceTarget(dGrid, tx, ty) {
  if (tx < 3 || tx >= slamMap.width - 3 || ty < 3 || ty >= slamMap.height - 3) return false;
  for (var dy = -2; dy <= 2; dy++) {
    for (var dx = -2; dx <= 2; dx++) {
      if (dGrid[ty + dy] && dGrid[ty + dy][tx + dx] === 1) return false;
    }
  }
  return true;
}

function findUnrecognizedObstacleTarget(cur) {
  if (!slamMap || !slamMap.grid) return null;
  var W = getArenaW(), H = getArenaH();
  var landmarks = slamMap.semanticLandmarks || [];
  var dGrid = (typeof getDilatedSlamGrid === 'function') ? getDilatedSlamGrid() : slamMap.grid;
  
  for (var gy = 4; gy < slamMap.height - 4; gy += 3) {
    for (var gx = 4; gx < slamMap.width - 4; gx += 3) {
      if (slamMap.grid[gy][gx] === 1) {
        var worldX = (gx / slamMap.width) * W, worldY = (gy / slamMap.height) * H;
        var isRecognized = landmarks.some(function(lm) { return Math.hypot(lm.x - worldX, lm.y - worldY) < 55 && lm.vlmVerified === true; });
        if (!isRecognized) {
          // Cerca una posizione di osservazione in spazio aperto ampio (escludendo i varchi stretti)
          var candidates = [
            { x: gx, y: gy - 4 }, { x: gx, y: gy + 4 },
            { x: gx - 4, y: gy }, { x: gx + 4, y: gy }
          ];
          for (var ci = 0; ci < candidates.length; ci++) {
            var cand = candidates[ci];
            if (isSafeOpenSpaceTarget(dGrid, cand.x, cand.y)) {
              return cand;
            }
          }
        }
      }
    }
  }
  return null;
}

function planSlamExplorationPath(cur) {
  // 1. Ispezione Proattiva Ravvicinata di Ostacoli Non Ancora Riconosciuti
  var unrecTarget = findUnrecognizedObstacleTarget(cur);
  if (unrecTarget) {
    var unrecPath = planAdaptiveSlamAStar(cur, unrecTarget);
    if (unrecPath && unrecPath.length > 1) {
      slamMap.targetFrontier = unrecTarget;
      return unrecPath;
    }
  }

  // 2. Percorso Boustrophedon di Copertura
  if (typeof generateBoustrophedonPath === 'function' && !slamMap.boustrophedonDone) {
    var bPath = generateBoustrophedonPath(3);
    if (bPath && bPath.length > 2) {
      for (var bi = 0; bi < Math.min(15, bPath.length); bi++) {
        var bp = planAdaptiveSlamAStar(cur, bPath[bi]);
        if (bp && bp.length > 1) { slamMap.targetFrontier = bPath[bi]; return bp; }
      }
      slamMap.boustrophedonDone = true;
    }
  }

  // 3. Ranking Frontiere per Information Gain
  var ranked = (typeof rankFrontiersByBlindness === 'function')
    ? rankFrontiersByBlindness(cur, slamMap.frontiers) : slamMap.frontiers;
  var path = [];

  for (var fi = 0; fi < Math.min(30, ranked.length); fi++) {
    path = planAdaptiveSlamAStar(cur, ranked[fi]);
    if (path.length > 1) { slamMap.targetFrontier = ranked[fi]; return path; }
  }

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
