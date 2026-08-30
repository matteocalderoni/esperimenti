// simulazione/web_simulator/js/behaviors/exploration.js
// SLAM Exploration Orchestrator (FSM: HEAD_SCAN_1 -> ROTATE_180 -> HEAD_SCAN_2 -> FIND_FRONTIERS -> NAVIGATE)

function isClearForRotation() {
  if (robotState.ultrasonicDist && robotState.ultrasonicDist < 0.25) return false;
  if (robotState.rayDistances && robotState.rayDistances.length > 0) {
    return robotState.rayDistances.every(function(d) { return d > 0.20; });
  }
  return true;
}

function runExplorationBehavior() {
  if (!slamMap.grid) initSlamGrid();
  if (slamMap.stats.exploredPct >= 99) slamMap.fsmState = 'COMPLETE';

  // 1. HEAD_SCAN_1 o HEAD_SCAN standard da fermo (sweep -80°..+80°)
  if (slamMap.fsmState === 'HEAD_SCAN' || slamMap.fsmState === 'HEAD_SCAN_1' || slamMap.fsmState === 'INITIAL_SCAN') {
    robotState.speed = 0; robotState.steering = 0;
    if (slamMap.scanStep === 0) robotState.panAngle = -80;
    robotState.panAngle += 5; slamMap.scanStep++;
    if (typeof scanHeadFan === 'function') scanHeadFan(robotState.panAngle); else scanAllRays();

    if (robotState.panAngle >= 80 || slamMap.scanStep >= 34) {
      robotState.panAngle = 0; slamMap.scanStep = 0;
      if ((slamMap.fsmState === 'INITIAL_SCAN' || slamMap.fsmState === 'HEAD_SCAN_1') && isClearForRotation()) {
        slamMap.rotateAngleLeft = Math.PI;
        slamMap.fsmState = 'ROTATE_180';
      } else {
        slamMap.fsmState = 'FIND_FRONTIERS';
      }
    }
    return;
  }

  // 2. ROTATE_180: Rotazione controllata del telaio sul posto di 180° per coprire l'angolo cieco posteriore
  if (slamMap.fsmState === 'ROTATE_180') {
    robotState.speed = 0;
    var stepAngle = 0.08;
    robotState.steering = stepAngle;
    slamMap.rotateAngleLeft = (slamMap.rotateAngleLeft || Math.PI) - stepAngle;
    if (typeof scanAllRays === 'function') scanAllRays();

    if (slamMap.rotateAngleLeft <= 0) {
      robotState.steering = 0;
      slamMap.scanStep = 0;
      slamMap.rotateAngleLeft = 0;
      slamMap.fsmState = 'HEAD_SCAN_2';
    }
    return;
  }

  // 3. HEAD_SCAN_2: Seconda scansione panoramica dopo la rotazione di 180°
  if (slamMap.fsmState === 'HEAD_SCAN_2') {
    robotState.speed = 0; robotState.steering = 0;
    if (slamMap.scanStep === 0) robotState.panAngle = -80;
    robotState.panAngle += 5; slamMap.scanStep++;
    if (typeof scanHeadFan === 'function') scanHeadFan(robotState.panAngle); else scanAllRays();

    if (robotState.panAngle >= 80 || slamMap.scanStep >= 34) {
      robotState.panAngle = 0; slamMap.scanStep = 0;
      slamMap.fsmState = 'FIND_FRONTIERS';
    }
    return;
  }

  // 4. NAVIGATE: Movimento verso la frontiera dell'angolo cieco con guardia ostacoli attiva
  if (slamMap.fsmState === 'NAVIGATE') {
    scanAllRays();
    if (typeof navigateSlamPath === 'function') navigateSlamPath();
  }

  // 5. FIND_FRONTIERS: Selezione intelligente con Information Gain e Hunter Mode per target 99%
  else if (slamMap.fsmState === 'FIND_FRONTIERS') {
    robotState.speed = 0; robotState.steering = 0; robotState.panAngle = 0;
    var cur = slamWorldToGrid(robotState.x, robotState.y);
    var dGrid = getDilatedSlamGrid(3); // Buffer 30px
    var frontiers = findSlamFrontiers();
    slamMap.frontiers = frontiers;

    var path = [];
    if (frontiers.length > 0) {
      var ranked = (typeof rankFrontiersByBlindness === 'function') ? rankFrontiersByBlindness(cur, frontiers) : frontiers;
      var limit = Math.min(10, ranked.length);
      for (var fi = 0; fi < limit; fi++) {
        path = planSlamAStar(cur, ranked[fi], dGrid);
        if (path.length > 1) { slamMap.targetFrontier = ranked[fi]; break; }
      }
    } else if (slamMap.stats.exploredPct < 99 && typeof findHunterTarget === 'function') {
      var hunter = findHunterTarget(cur, dGrid);
      if (hunter) path = planSlamAStar(cur, hunter, dGrid);
    }

    if (path.length > 1) {
      slamMap.currentPath = path; slamMap.pathIndex = 0;
      slamMap.stepCounter = 0; slamMap.stuckCounter = 0;
      slamMap.fsmState = 'NAVIGATE';
    } else {
      slamMap.stuckCounter++;
      if (slamMap.stuckCounter > 2 || slamMap.stats.exploredPct >= 99) {
        slamMap.stuckCounter = 0; slamMap.fsmState = 'COMPLETE';
      } else {
        slamMap.scanStep = 0; slamMap.fsmState = 'HEAD_SCAN';
      }
    }
  }

  // 6. COMPLETE: Target 99% raggiunto
  else if (slamMap.fsmState === 'COMPLETE') {
    robotState.speed = 0; robotState.steering = 0; robotState.panAngle = 0;
    if (typeof showCompletionModal === 'function') showCompletionModal(slamMap.stats.exploredPct);
  }
}

registerBehavior('exploration', runExplorationBehavior);
