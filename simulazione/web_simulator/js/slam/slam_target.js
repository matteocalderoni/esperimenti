// simulazione/web_simulator/js/slam/slam_target.js
// Selezione dell'Obiettivo di Esplorazione & Ispezione Ravvicinata VLM

function slamNoProgress() {
  // Non si può mai dichiarare stallo a fine gara se la stanza non è ancora esplorata al 75%
  if (!slamMap.stats || slamMap.stats.exploredPct < 75) return false;
  var frontiers = slamMap.frontiers || [];
  if (frontiers.length === 0) {
    if (typeof findHunterTarget === 'function') {
      var cur = (typeof slamWorldToGrid === 'function' && typeof robotState !== 'undefined')
        ? slamWorldToGrid(robotState.x, robotState.y) : { gx: 35, gy: 26 };
      var hunter = findHunterTarget(cur, (typeof getDilatedSlamGrid === 'function') ? getDilatedSlamGrid() : null);
      if (hunter) return false;
    }
    return true;
  }

  if (slamMap.stats.exploredPct > (slamMap.lastProgressPct || 0)) {
    slamMap.lastProgressPct = slamMap.stats.exploredPct;
    slamMap.noProgressRounds = 0;
    return false;
  }
  slamMap.noProgressRounds = (slamMap.noProgressRounds || 0) + 1;
  if (slamMap.noProgressRounds > 30) {
    slamMap.noProgressRounds = 0;
    return true;
  }
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
  var W = (typeof getArenaW === 'function') ? getArenaW() : 2100;
  var H = (typeof getArenaH === 'function') ? getArenaH() : 1560;
  var clusters = (typeof findSlamClusters === 'function') ? findSlamClusters(true) : [];
  var bestPose = null, bestDist = 9999;
  var nowTime = Date.now();

  for (var i = 0; i < clusters.length; i++) {
    var c = clusters[i];
    var cX = ((c.minX + c.maxX) / 2 / slamMap.width) * W;
    var cY = ((c.minY + c.maxY) / 2 / slamMap.height) * H;
    if (cX <= 30 || cX >= W - 30 || cY <= 30 || cY >= H - 30) continue;
    if (typeof isClusterVlmVerified === 'function' && isClusterVlmVerified(cX, cY)) continue;
    if (typeof isClusterAbandoned === 'function' && isClusterAbandoned(cX, cY)) continue;

    var key = (typeof getClusterKey === 'function') ? getClusterKey(cX, cY) : '';
    var lastAttempt = (slamMap.clusterTracking && slamMap.clusterTracking[key]) ? slamMap.clusterTracking[key].lastTime : 0;
    if (nowTime - lastAttempt < 3000) continue; // Cooldown 3s tra tentativi dello stesso cluster

    if (typeof getOptimalInspectionPose === 'function') {
      var pose = getOptimalInspectionPose(c);
      if (pose && !isRecentlyVisitedTarget(pose.gx, pose.gy)) {
        var d = Math.hypot(pose.worldX - robotState.x, pose.worldY - robotState.y);
        if (d < bestDist) {
          bestDist = d;
          bestPose = pose;
        }
      }
    }
  }
  return bestPose;
}

/**
 * Verifica se la frontiera corrente è ancora attiva (ha celle sconosciute adiacenti e non è stata ancora raggiunta)
 */
function isFrontierStillActive(cur, f) {
  if (!f || !slamMap.grid) return false;
  // Distanza su griglia: se siamo a meno di 2.5 celle (~50 px), è considerata raggiunta
  var d = Math.hypot(f.gx - cur.gx, f.gy - cur.gy);
  if (d < 2.5) return false;

  // Verifica se ci sono ancora celle sconosciute (-1) nelle vicinanze della frontiera
  var unexp = 0;
  for (var dy = -2; dy <= 2; dy++) {
    for (var dx = -2; dx <= 2; dx++) {
      var ny = f.gy + dy, nx = f.gx + dx;
      if (ny >= 0 && ny < slamMap.height && nx >= 0 && nx < slamMap.width) {
        if (slamMap.grid[ny][nx] === -1) unexp++;
      }
    }
  }
  return unexp >= 2;
}

function planSlamExplorationPath(cur) {
  var path = [];
  slamMap.targetInspectionCluster = null;

  // 0. TARGET COMMITMENT (Hysteresis):
  // Se abbiamo già un target frontiera attivo, non è ancora raggiunto ed è ancora inesplorato,
  // continuiamo a puntare verso di esso per evitare il tipico "chattering / oscillazione continua di rotta".
  if (slamMap.targetFrontier && isFrontierStillActive(cur, slamMap.targetFrontier)) {
    path = planAdaptiveSlamAStar(cur, slamMap.targetFrontier);
    if (path && path.length > 1) {
      return path;
    }
  }
  // Altrimenti il target precedente è esaurito o non più raggiungibile: ne selezioniamo uno nuovo
  slamMap.targetFrontier = null;

  // 1. Ranking Frontiere con Heading-Awareness e Information Gain
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

  // 2. Fallback: Qualsiasi frontiera raggiungibile
  for (var fi2 = 0; fi2 < Math.min(40, ranked.length); fi2++) {
    var f2 = ranked[fi2];
    path = planAdaptiveSlamAStar(cur, f2);
    if (path.length > 1) {
      slamMap.targetFrontier = f2;
      markTargetAsVisited(f2.gx, f2.gy);
      return path;
    }
  }

  // 3. Copertura Boustrophedon per aree aperte
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
