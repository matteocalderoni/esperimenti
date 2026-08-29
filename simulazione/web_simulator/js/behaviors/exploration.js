// simulazione/web_simulator/js/behaviors/exploration.js
// SLAM Mapping & Autonomous Exploration Orchestrator (FSM: HEAD_SCAN -> FIND_FRONTIERS -> NAVIGATE)

function runExplorationBehavior() {
  if (!slamMap.grid) initSlamGrid();

  // 1. Verifica completamento target >= 95%
  if (slamMap.stats.exploredPct >= 95) {
    slamMap.fsmState = 'COMPLETE';
  }

  // 2. Stato HEAD_SCAN / INITIAL_SCAN: Scansione da fermo (solo testa servo Pan-Tilt, anticollisione off)
  if (slamMap.fsmState === 'HEAD_SCAN' || slamMap.fsmState === 'INITIAL_SCAN') {
    robotState.speed = 0;
    robotState.steering = 0;

    // Inizializza angolo testa all'estrema sinistra se inizio scansione
    if (slamMap.scanStep === 0) {
      robotState.panAngle = -80;
    }

    // Avanza la testa di 5° a frame
    robotState.panAngle += 5;
    slamMap.scanStep++;

    // Scansiona a ventaglio dall'angolazione corrente della testa
    if (typeof scanHeadFan === 'function') {
      scanHeadFan(robotState.panAngle);
    } else {
      scanAllRays();
    }

    // Sweep completato da -80° a +80° (32 passi)
    if (robotState.panAngle >= 80 || slamMap.scanStep >= 34) {
      robotState.panAngle = 0; // Ricentra la testa
      slamMap.scanStep = 0;
      slamMap.fsmState = 'FIND_FRONTIERS';
    }
    return;
  }

  // 3. Stato NAVIGATE: Movimento verso frontiera con anticollisione attiva
  if (slamMap.fsmState === 'NAVIGATE') {
    scanAllRays(); // Continua a mappare durante la marcia
    if (typeof navigateSlamPath === 'function') {
      navigateSlamPath();
    }
  }

  // 4. Stato FIND_FRONTIERS: Ricerca baricentri inesplorati e calcolo traiettoria A*
  else if (slamMap.fsmState === 'FIND_FRONTIERS') {
    robotState.speed = 0;
    robotState.steering = 0;
    robotState.panAngle = 0;

    var frontiers = findSlamFrontiers();
    slamMap.frontiers = frontiers;

    if (frontiers.length === 0) {
      slamMap.fsmState = 'COMPLETE';
      return;
    }

    var cur = slamWorldToGrid(robotState.x, robotState.y);
    var dGrid = getDilatedSlamGrid(2); // Buffer di sicurezza 2 celle

    frontiers.sort(function(a, b) {
      return Math.hypot(a.gx - cur.gx, a.gy - cur.gy) - Math.hypot(b.gx - cur.gx, b.gy - cur.gy);
    });

    var path = [];
    var limit = Math.min(10, frontiers.length);
    for (var fi = 0; fi < limit; fi++) {
      path = planSlamAStar(cur, frontiers[fi], dGrid);
      if (path.length > 1) {
        slamMap.targetFrontier = frontiers[fi];
        break;
      }
    }

    if (path.length > 1) {
      slamMap.currentPath = path;
      slamMap.pathIndex = 0;
      slamMap.stepCounter = 0;
      slamMap.stuckCounter = 0;
      slamMap.fsmState = 'NAVIGATE';
    } else {
      slamMap.stuckCounter++;
      if (slamMap.stuckCounter > 2) {
        slamMap.stuckCounter = 0;
        slamMap.fsmState = 'COMPLETE';
      } else {
        slamMap.scanStep = 0;
        slamMap.fsmState = 'HEAD_SCAN';
      }
    }
  }

  // 5. Stato COMPLETE: Arresto totale e notifica modale di completamento
  else if (slamMap.fsmState === 'COMPLETE') {
    robotState.speed = 0;
    robotState.steering = 0;
    robotState.panAngle = 0;
    if (typeof showCompletionModal === 'function') {
      showCompletionModal(slamMap.stats.exploredPct);
    }
  }
}

registerBehavior('exploration', runExplorationBehavior);
