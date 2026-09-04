// simulazione/web_simulator/js/slam/slam_target.js
// Selezione dell'Obiettivo di Esplorazione & Ispezione Ravvicinata VLM

function slamNoProgress() {
  var frontiers = slamMap.frontiers || [];
  if (frontiers.length > 0 && slamMap.stats.exploredPct < 90) {
    slamMap.noProgressRounds = 0;
    return false;
  }
  if (slamMap.stats.exploredPct > (slamMap.lastProgressPct || 0)) {
    slamMap.lastProgressPct = slamMap.stats.exploredPct;
    slamMap.noProgressRounds = 0;
    return false;
  }
  slamMap.noProgressRounds = (slamMap.noProgressRounds || 0) + 1;
  if (slamMap.noProgressRounds > 35) { slamMap.noProgressRounds = 0; return true; }
  return false;
}

var recentTargetsQueue = [];

function isRecentlyVisitedTarget(gx, gy) {
  var now = Date.now();
  // Mantieni in memoria gli obiettivi visitati negli ultimi 6 secondi
  recentTargetsQueue = recentTargetsQueue.filter(function(t) { return now - t.time < 6000; });
  return recentTargetsQueue.some(function(t) { return Math.hypot(t.gx - gx, t.gy - gy) < 6; });
}

function markTargetAsVisited(gx, gy) {
  recentTargetsQueue.push({ gx: gx, gy: gy, time: Date.now() });
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
  var clusters = (typeof findSlamClusters === 'function') ? findSlamClusters(true) : [];

  for (var gy = 4; gy < slamMap.height - 4; gy += 3) {
    for (var gx = 4; gx < slamMap.width - 4; gx += 3) {
      if (slamMap.grid[gy][gx] === 1) {
        var worldX = (gx / slamMap.width) * W, worldY = (gy / slamMap.height) * H;
        
        // Verifica se l'ostacolo appartiene a un cluster abbandonato o già verificato
        var isAbandonedOrVerified = clusters.some(function(c) {
          var cX = ((c.minX + c.maxX) / 2 / slamMap.width) * W;
          var cY = ((c.minY + c.maxY) / 2 / slamMap.height) * H;
          var near = Math.hypot(cX - worldX, cY - worldY) < 60;
          return near && (c.vlmAbandoned === true || (c.vlmAttempts || 0) >= 3);
        });
        if (isAbandonedOrVerified) continue;

        var isRecognized = landmarks.some(function(lm) { return Math.hypot(lm.x - worldX, lm.y - worldY) < 55 && lm.vlmVerified === true; });
        if (!isRecognized) {
          var candidates = [
            { x: gx, y: gy - 4 }, { x: gx, y: gy + 4 },
            { x: gx - 4, y: gy }, { x: gx + 4, y: gy }
          ];
          for (var ci = 0; ci < candidates.length; ci++) {
            var cand = candidates[ci];
            if (isSafeOpenSpaceTarget(dGrid, cand.x, cand.y) && !isRecentlyVisitedTarget(cand.x, cand.y)) {
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
  var path = [];

  // 1. Ranking Frontiere per Information Gain (Esplorazione ad Ampio Raggio per Tutta la Stanza)
  var frontiers = slamMap.frontiers || [];
  var ranked = (typeof rankFrontiersByBlindness === 'function')
    ? rankFrontiersByBlindness(cur, frontiers) : frontiers;

  for (var fi = 0; fi < Math.min(40, ranked.length); fi++) {
    var f = ranked[fi];
    if (isRecentlyVisitedTarget(f.gx, f.gy)) continue;

    path = planAdaptiveSlamAStar(cur, f);
    if (path.length > 1) {
      slamMap.targetFrontier = f;
      markTargetAsVisited(f.gx, f.gy);
      return path;
    }
  }

  // 1b. Fallback: Prova qualsiasi frontiera raggiungibile anche se in cooldown
  for (var fi2 = 0; fi2 < Math.min(40, ranked.length); fi2++) {
    var f2 = ranked[fi2];
    path = planAdaptiveSlamAStar(cur, f2);
    if (path.length > 1) {
      slamMap.targetFrontier = f2;
      markTargetAsVisited(f2.gx, f2.gy);
      return path;
    }
  }

  // 2. Percorso Boustrophedon di Copertura Spazio Aperto
  if (typeof generateBoustrophedonPath === 'function' && !slamMap.boustrophedonDone) {
    var bPath = generateBoustrophedonPath(3);
    if (bPath && bPath.length > 2) {
      for (var bi = 0; bi < Math.min(20, bPath.length); bi++) {
        var bp = bPath[bi];
        if (isRecentlyVisitedTarget(bp.gx, bp.gy)) continue;

        var pathB = planAdaptiveSlamAStar(cur, bp);
        if (pathB && pathB.length > 1) {
          slamMap.targetFrontier = bp;
          markTargetAsVisited(bp.gx, bp.gy);
          return pathB;
        }
      }
      slamMap.boustrophedonDone = true;
    }
  }

  // 3. Ispezione Proattiva Ostacoli Non Ancora Riconosciuti (solo se non ci sono frontiere aperte)
  var unrecTarget = findUnrecognizedObstacleTarget(cur);
  if (unrecTarget && !isRecentlyVisitedTarget(unrecTarget.x, unrecTarget.y)) {
    var unrecPath = planAdaptiveSlamAStar(cur, unrecTarget);
    if (unrecPath && unrecPath.length > 1) {
      slamMap.targetFrontier = unrecTarget;
      markTargetAsVisited(unrecTarget.x, unrecTarget.y);
      return unrecPath;
    }
  }

  // 4. Fallback Posa di Osservazione per frontiere lontane
  if (typeof findObservationPose === 'function') {
    var dGrid = getDilatedSlamGrid();
    for (var oi = 0; oi < Math.min(15, ranked.length); oi++) {
      var posa = findObservationPose(cur, ranked[oi], dGrid);
      if (!posa) continue;
      path = planAdaptiveSlamAStar(cur, posa);
      if (path.length > 1) {
        slamMap.targetFrontier = ranked[oi];
        markTargetAsVisited(posa.gx, posa.gy);
        return path;
      }
    }
  }

  // 5. Hunter Target (per residui di celle non esplorate)
  if (slamMap.stats.exploredPct < 99 && typeof findHunterTarget === 'function') {
    var hunter = findHunterTarget(cur, getDilatedSlamGrid());
    if (hunter) {
      path = planAdaptiveSlamAStar(cur, hunter);
      if (path.length > 1) {
        markTargetAsVisited(hunter.gx, hunter.gy);
        return path;
      }
    }
  }

  return [];
}
