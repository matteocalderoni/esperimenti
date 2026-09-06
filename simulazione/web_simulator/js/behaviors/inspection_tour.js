// simulazione/web_simulator/js/behaviors/inspection_tour.js
// Tour Autonomo di Riconoscimento Arredi (Fase 2) con Fallback a 5 Tentativi

var tourState = {
  active: false,
  fsmState: 'INIT', // 'INIT', 'SELECT_TARGET', 'NAVIGATE', 'ALIGN', 'INSPECT', 'COMPLETE'
  targets: [],      // array di { cluster, pose, cX, cY, attempts: 0 }
  currentIndex: 0,
  currentPose: null,
  currentCluster: null,
  attemptsForCurrent: 0,
  waitFrames: 0,
  tourStartTime: 0
};

function startInspectionTour() {
  robotState.activeMode = 'inspectionTour';
  robotState.engineMode = 'JS';
  robotState.speed = 0;
  robotState.steering = 0;
  robotState.panAngle = 0;
  robotState.tiltAngle = 0;

  tourState.active = true;
  tourState.fsmState = 'INIT';
  tourState.targets = [];
  tourState.currentIndex = 0;
  tourState.attemptsForCurrent = 0;
  tourState.waitFrames = 0;
  tourState.tourStartTime = Date.now();

  console.log('🚀 [Tour VLM] Avvio Tour Riconoscimento Arredi (Fase 2)...');
  updateModeBadge();
}

function runInspectionTourBehavior(dt) {
  if (!slamMap || !slamMap.grid) return;

  var W = (typeof getArenaW === 'function') ? getArenaW() : 2100;
  var H = (typeof getArenaH === 'function') ? getArenaH() : 1560;

  // 1. INIT: Estrazione e Ordinamento Nearest-Neighbor dei Cluster Arredi
  if (tourState.fsmState === 'INIT') {
    robotState.speed = 0;
    robotState.steering = 0;
    robotState.panAngle = 0;

    var rawClusters = (typeof findSlamClusters === 'function') ? findSlamClusters(true) : [];
    var candidates = [];

    rawClusters.forEach(function(c) {
      var cX = ((c.minX + c.maxX) / 2 / slamMap.width) * W;
      var cY = ((c.minY + c.maxY) / 2 / slamMap.height) * H;
      // Escludi muri perimetrali esterni (margine 35 px)
      if (cX <= 35 || cX >= W - 35 || cY <= 35 || cY >= H - 35) return;

      var pose = (typeof getOptimalInspectionPose === 'function') ? getOptimalInspectionPose(c) : null;
      if (pose) {
        candidates.push({
          cluster: c,
          pose: pose,
          cX: cX,
          cY: cY,
          attempts: 0
        });
      }
    });

    if (candidates.length === 0) {
      console.log('⚠️ [Tour VLM] Nessun arredo interno rilevato dallo SLAM da ispezionare.');
      tourState.fsmState = 'COMPLETE';
      return;
    }

    // Ordinamento Nearest Neighbor a partire dalla posa attuale del robot
    var ordered = [];
    var curX = robotState.x, curY = robotState.y;
    while (candidates.length > 0) {
      var bestIdx = 0, bestDist = 99999;
      for (var i = 0; i < candidates.length; i++) {
        var d = Math.hypot(candidates[i].pose.worldX - curX, candidates[i].pose.worldY - curY);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      var nextTarget = candidates.splice(bestIdx, 1)[0];
      ordered.push(nextTarget);
      curX = nextTarget.pose.worldX;
      curY = nextTarget.pose.worldY;
    }

    tourState.targets = ordered;
    tourState.currentIndex = 0;
    tourState.fsmState = 'SELECT_TARGET';
    console.log('📋 [Tour VLM] Pianificate ' + ordered.length + ' tappe di ispezione arredi.');
    return;
  }

  // 2. SELECT_TARGET: Pianificazione percorso verso la posa dell'arredo
  if (tourState.fsmState === 'SELECT_TARGET') {
    robotState.speed = 0;
    robotState.steering = 0;

    if (tourState.currentIndex >= tourState.targets.length) {
      tourState.fsmState = 'COMPLETE';
      return;
    }

    var targetItem = tourState.targets[tourState.currentIndex];
    var freshPose = (typeof getOptimalInspectionPose === 'function') ? getOptimalInspectionPose(targetItem.cluster) : targetItem.pose;
    if (freshPose) {
      targetItem.pose = freshPose;
    }
    tourState.currentPose = targetItem.pose;
    tourState.currentCluster = targetItem.cluster;
    tourState.attemptsForCurrent = 0;
    tourState.waitFrames = 0;
    tourState.replanAttempts = 0;

    var cur = slamWorldToGrid(robotState.x, robotState.y);
    var goal = { gx: targetItem.pose.gx, gy: targetItem.pose.gy };
    var path = (typeof planAdaptiveSlamAStar === 'function') ? planAdaptiveSlamAStar(cur, goal) : [];

    if (path && path.length > 1) {
      slamMap.currentPath = path;
      slamMap.pathIndex = 0;
      slamMap.stuckCounter = 0;
      tourState.fsmState = 'NAVIGATE';
      console.log('🚗 [Tour VLM] In rotta verso Arredo #' + (tourState.currentIndex + 1) + '/' + tourState.targets.length +
                  ' a (' + Math.round(targetItem.pose.worldX) + ', ' + Math.round(targetItem.pose.worldY) + ')');
    } else {
      console.warn('⚠️ [Tour VLM] Posa non raggiungibile per Arredo #' + (tourState.currentIndex + 1));
      tourState.currentIndex++;
    }
    return;
  }

  // 3. NAVIGATE: Guida fluida DWA verso la posa di osservazione
  if (tourState.fsmState === 'NAVIGATE') {
    scanAllRays();

    var curPose = tourState.currentPose;
    var distToPose = curPose ? Math.hypot(robotState.x - curPose.worldX, robotState.y - curPose.worldY) : 999;
    var percorsoValido = slamMap.currentPath && slamMap.currentPath.length > 0 &&
                         slamMap.pathIndex < slamMap.currentPath.length - 1;

    // Se siamo arrivati alla posa di ispezione con sufficiente vicinanza e moto smorzato
    var arrivatoPosa = distToPose <= 20 || (!percorsoValido && distToPose <= 40 && Math.abs(robotState.speed) < 15);
    if (arrivatoPosa) {
      robotState.speed = 0;
      robotState.steering = 0;
      tourState.fsmState = 'ALIGN';
      return;
    }

    if (!percorsoValido) {
      tourState.replanAttempts = (tourState.replanAttempts || 0) + 1;
      if (tourState.replanAttempts > 3) {
        console.warn('⚠️ [Tour VLM] Posa non raggiungibile per Arredo #' + (tourState.currentIndex + 1) + '. Salto al successivo.');
        tourState.replanAttempts = 0;
        tourState.currentIndex++;
        tourState.fsmState = 'SELECT_TARGET';
        return;
      }
      var cur = slamWorldToGrid(robotState.x, robotState.y);
      var goal = { gx: curPose.gx, gy: curPose.gy };
      var path = (typeof planAdaptiveSlamAStar === 'function') ? planAdaptiveSlamAStar(cur, goal) : [];
      if (path && path.length > 1) {
        slamMap.currentPath = path;
        slamMap.pathIndex = 0;
      } else {
        tourState.replanAttempts = 0;
        tourState.currentIndex++;
        tourState.fsmState = 'SELECT_TARGET';
      }
      return;
    }

    tourState.replanAttempts = 0;
    if (typeof navigateSlamPath === 'function') {
      navigateSlamPath(dt);
    }
    return;
  }

  // 4. ALIGN: Allineamento frontale tramite rotazione fisica continua sul posto (no teletrasporto!)
  if (tourState.fsmState === 'ALIGN') {
    robotState.speed = 0;

    var cl = tourState.currentCluster;
    var minWx = (cl.minX / slamMap.width) * W;
    var maxWx = (cl.maxX / slamMap.width) * W;
    var minWy = (cl.minY / slamMap.height) * H;
    var maxWy = (cl.maxY / slamMap.height) * H;
    var cX = (minWx + maxWx) / 2;
    var cY = (minWy + maxWy) / 2;

    var targetLookX = (robotState.x < minWx) ? minWx : (robotState.x > maxWx ? maxWx : cX);
    var targetLookY = (robotState.y < minWy) ? minWy : (robotState.y > maxWy ? maxWy : cY);
    var angleToTarget = Math.atan2(targetLookY - robotState.y, targetLookX - robotState.x);

    // Calcola l'errore angolare normalizzato nell'intervallo [-PI, PI]
    var diffAngle = angleToTarget - robotState.angle;
    while (diffAngle > Math.PI) diffAngle -= 2 * Math.PI;
    while (diffAngle < -Math.PI) diffAngle += 2 * Math.PI;

    // Se l'orientamento è allineato (entro 0.06 rad ~ 3.4°), arresta rotazione e procedi allo scatto
    if (Math.abs(diffAngle) <= 0.06) {
      robotState.steering = 0;
      // Micro-allineamento ottico della torretta pan/tilt
      robotState.panAngle = diffAngle * 180 / Math.PI;
      robotState.tiltAngle = 5;

      if (typeof updateThreeCamera === 'function') {
        updateThreeCamera();
      }

      tourState.waitFrames = 0;
      tourState.fsmState = 'INSPECT';
      console.log('🎯 [Tour VLM] Allineamento ottico completato verso (' + Math.round(targetLookX) + ', ' + Math.round(targetLookY) + ')');
      return;
    }

    // Rotazione fisica continua differenziale sul posto (velocità angolare max 2.2 rad/s proporzionale)
    var turnDir = (diffAngle > 0) ? 1 : -1;
    var omega = turnDir * Math.min(2.2, Math.max(0.7, Math.abs(diffAngle) * 2.8));
    robotState.steering = omega;
    robotState.panAngle = 0;
    robotState.tiltAngle = 5;

    if (typeof updateThreeCamera === 'function') {
      updateThreeCamera();
    }
    return;
  }

  // 5. INSPECT: Esecuzione Scatto Mirato VLM con Fallback 5 Tentativi
  if (tourState.fsmState === 'INSPECT') {
    robotState.speed = 0;
    robotState.steering = 0;

    if (typeof vlmInspecting !== 'undefined' && vlmInspecting) {
      return;
    }

    var targetItem = tourState.targets[tourState.currentIndex];
    var cX = targetItem.cX, cY = targetItem.cY;

    if (typeof isClusterVlmVerified === 'function' && isClusterVlmVerified(cX, cY)) {
      console.log('✅ [Tour VLM] Arredo #' + (tourState.currentIndex + 1) + ' verificato.');
      tourState.currentIndex++;
      tourState.fsmState = 'SELECT_TARGET';
      return;
    }

    if (tourState.attemptsForCurrent >= 5) {
      console.log('📦 [Tour VLM Fallback] 5 tentativi esauriti per Arredo #' + (tourState.currentIndex + 1) + '. Registrazione come "📦 Oggetto Sconosciuto".');
      if (typeof registerUnknownObstacleLandmark === 'function') {
        registerUnknownObstacleLandmark(cX, cY, tourState.currentCluster);
      }
      tourState.currentIndex++;
      tourState.fsmState = 'SELECT_TARGET';
      return;
    }

    tourState.waitFrames++;
    if (tourState.waitFrames < 10) return;

    tourState.attemptsForCurrent++;
    if (typeof recordClusterAttempt === 'function') {
      recordClusterAttempt(cX, cY);
    }

    console.log('📸 [Tour VLM] Scatto foto per Arredo #' + (tourState.currentIndex + 1) + ' (Tentativo ' + tourState.attemptsForCurrent + '/5)...');
    if (typeof triggerStationaryVlmInspection === 'function') {
      triggerStationaryVlmInspection(tourState.currentCluster).then(function(res) {
        if (res && res.success) {
          console.log('✨ [Tour VLM] Successo riconoscimento Arredo #' + (tourState.currentIndex + 1) + ': ' + (res.landmark || 'Sconosciuto'));
          tourState.currentIndex++;
          tourState.fsmState = 'SELECT_TARGET';
        } else {
          if (res && res.reason === 'too_far') {
            console.warn('⚠️ [Tour VLM] Distanza eccessiva per scatto. Riposizionamento...');
            tourState.attemptsForCurrent = Math.max(0, tourState.attemptsForCurrent - 1);
            tourState.fsmState = 'SELECT_TARGET';
            return;
          }
          if (tourState.attemptsForCurrent >= 5) {
            registerUnknownObstacleLandmark(cX, cY, tourState.currentCluster);
            tourState.currentIndex++;
            tourState.fsmState = 'SELECT_TARGET';
          } else {
            tourState.waitFrames = 0;
          }
        }
      }).catch(function(err) {
        console.warn('Errore trigger VLM:', err);
        if (tourState.attemptsForCurrent >= 5) {
          registerUnknownObstacleLandmark(cX, cY, tourState.currentCluster);
          tourState.currentIndex++;
          tourState.fsmState = 'SELECT_TARGET';
        }
      });
    }
    return;
  }

  // 6. COMPLETE: Tour Concluso con Successo
  if (tourState.fsmState === 'COMPLETE') {
    robotState.speed = 0;
    robotState.steering = 0;
    robotState.panAngle = 0;
    robotState.tiltAngle = 0;

    if (tourState.active) {
      tourState.active = false;
      console.log('🎉 [Tour VLM] Tour di Riconoscimento Arredi Concluso!');
      if (typeof showCompletionModal === 'function') {
        showCompletionModal(100, 'tour');
      }
    }
    return;
  }
}

registerBehavior('inspectionTour', runInspectionTourBehavior);
