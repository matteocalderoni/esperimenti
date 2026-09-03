// simulazione/web_simulator/js/behaviors/exploration.js
// SLAM Exploration Orchestrator con Scansione Multispaziale e Ispezione Ravvicinata VLM

var lastVlmScanPos = { x: 0, y: 0 };

function isClearForRotation() {
  if (robotState.ultrasonicDist && robotState.ultrasonicDist < 0.45) return false;
  if (robotState.rayDistances && robotState.rayDistances.length > 0) {
    return robotState.rayDistances.every(function(d) { return d > 0.40; });
  }
  return false;
}

function runExplorationBehavior() {
  if (!slamMap.grid) initSlamGrid();
  if (slamMap.stats.exploredPct >= 99) slamMap.fsmState = 'COMPLETE';

  // 1. HEAD_SCAN: Scansione Panoramica Pan-Tilt da Fermo + Scatto VLM
  if (slamMap.fsmState === 'HEAD_SCAN' || slamMap.fsmState === 'HEAD_SCAN_1' || slamMap.fsmState === 'INITIAL_SCAN') {
    robotState.speed = 0; robotState.steering = 0;
    if (slamMap.scanStep === 0) robotState.panAngle = -80;
    robotState.panAngle += 5; slamMap.scanStep++;
    if (typeof scanHeadFan === 'function') scanHeadFan(robotState.panAngle); else scanAllRays();

    if ((robotState.panAngle === -60 || robotState.panAngle === 0 || robotState.panAngle === 60) && typeof triggerStationaryVlmInspection === 'function') {
      triggerStationaryVlmInspection();
    }

    if (robotState.panAngle >= 80 || slamMap.scanStep >= 34) {
      robotState.panAngle = 0; slamMap.scanStep = 0;
      lastVlmScanPos = { x: robotState.x, y: robotState.y };
      if ((slamMap.fsmState === 'INITIAL_SCAN' || slamMap.fsmState === 'HEAD_SCAN_1') && isClearForRotation()) {
        slamMap.rotateAngleLeft = Math.PI;
        slamMap.fsmState = 'ROTATE_180';
      } else {
        slamMap.fsmState = 'FIND_FRONTIERS';
      }
    }
    return;
  }

  // 2. ROTATE_180: Rotazione controllata del telaio solo se c'è spazio libero
  if (slamMap.fsmState === 'ROTATE_180') {
    robotState.speed = 0;
    var stepAngle = 4.8;
    robotState.steering = stepAngle;
    slamMap.rotateAngleLeft = (slamMap.rotateAngleLeft || Math.PI) - stepAngle * SIM_DT;
    if (typeof scanAllRays === 'function') scanAllRays();

    if (slamMap.rotateAngleLeft <= 0) {
      robotState.steering = 0; slamMap.scanStep = 0; slamMap.rotateAngleLeft = 0;
      slamMap.fsmState = 'HEAD_SCAN_2';
    }
    return;
  }

  // 3. HEAD_SCAN_2: Seconda scansione panoramica dopo la rotazione
  if (slamMap.fsmState === 'HEAD_SCAN_2') {
    robotState.speed = 0; robotState.steering = 0;
    if (slamMap.scanStep === 0) robotState.panAngle = -80;
    robotState.panAngle += 5; slamMap.scanStep++;
    if (typeof scanHeadFan === 'function') scanHeadFan(robotState.panAngle); else scanAllRays();

    if ((robotState.panAngle === -60 || robotState.panAngle === 0 || robotState.panAngle === 60) && typeof triggerStationaryVlmInspection === 'function') {
      triggerStationaryVlmInspection();
    }

    if (robotState.panAngle >= 80 || slamMap.scanStep >= 34) {
      robotState.panAngle = 0; slamMap.scanStep = 0;
      lastVlmScanPos = { x: robotState.x, y: robotState.y };
      slamMap.fsmState = 'FIND_FRONTIERS';
    }
    return;
  }

  // 4. NAVIGATE: Movimento verso la frontiera + Scansioni intermedie ogni 90px
  if (slamMap.fsmState === 'NAVIGATE') {
    scanAllRays();
    if (typeof navigateSlamPath === 'function') navigateSlamPath();

    // Se ha percorso più di 90px dall'ultimo scatto, attiva una scansione intermedia distribuita
    var distFromLast = Math.hypot(robotState.x - lastVlmScanPos.x, robotState.y - lastVlmScanPos.y);
    if (distFromLast > 90) {
      robotState.speed = 0; robotState.steering = 0;
      slamMap.scanStep = 0;
      slamMap.fsmState = 'HEAD_SCAN';
    }
  }

  // 5. FIND_FRONTIERS: scelta dell'obiettivo (logica in slam/slam_target.js)
  else if (slamMap.fsmState === 'FIND_FRONTIERS') {
    robotState.speed = 0; robotState.steering = 0; robotState.panAngle = 0;
    var cur = slamWorldToGrid(robotState.x, robotState.y);
    slamMap.frontiers = findSlamFrontiers();

    if (slamNoProgress()) { slamMap.fsmState = 'COMPLETE'; return; }

    var path = planSlamExplorationPath(cur);
    if (path.length > 1) {
      slamMap.currentPath = path; slamMap.pathIndex = 0;
      slamMap.stepCounter = 0; slamMap.stuckCounter = 0;
      slamMap.fsmState = 'NAVIGATE';
    } else {
      slamMap.stuckCounter++;
      if (slamMap.stuckCounter > 3 || slamMap.stats.exploredPct >= 99) {
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
