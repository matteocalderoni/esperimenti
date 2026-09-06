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
  if (!slamMap || !slamMap.grid) {
    if (typeof initSlamGrid === 'function') initSlamGrid();
    else return;
  }

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

    // Se non ci sono cluster da SLAM, fallback immediato agli arredi noti dell'arena
    if (candidates.length === 0 && typeof arenaObjects !== 'undefined' && arenaObjects.walls) {
      console.log('ℹ️ [Tour VLM] Generazione tappe di ispezione diretta dagli arredi dell\'arena...');
      arenaObjects.walls.forEach(function(w) {
        var cX = w.x + w.w / 2;
        var cY = w.y + w.h / 2;
        var gMin = (typeof slamWorldToGrid === 'function') ? slamWorldToGrid(w.x, w.y) : { gx: Math.floor((w.x / W) * slamMap.width), gy: Math.floor((w.y / H) * slamMap.height) };
        var gMax = (typeof slamWorldToGrid === 'function') ? slamWorldToGrid(w.x + w.w, w.y + w.h) : { gx: Math.floor(((w.x + w.w) / W) * slamMap.width), gy: Math.floor(((w.y + w.h) / H) * slamMap.height) };

        // Trova una posa di ispezione libera a distanza ottimale (~105 px)
        var inspectX = cX, inspectY = cY;
        var options = [
          { x: cX, y: w.y - 105 },                  // Nord
          { x: cX, y: w.y + w.h + 105 },            // Sud
          { x: w.x - 105, y: cY },                  // Ovest
          { x: w.x + w.w + 105, y: cY }             // Est
        ];
        var foundPose = false;
        for (var i = 0; i < options.length; i++) {
          var opt = options[i];
          if (opt.x >= 70 && opt.x <= W - 70 && opt.y >= 70 && opt.y <= H - 70) {
            var insideOtherWall = arenaObjects.walls.some(function(other) {
              return other !== w && opt.x >= other.x - 25 && opt.x <= other.x + other.w + 25 &&
                     opt.y >= other.y - 25 && opt.y <= other.y + other.h + 25;
            });
            if (!insideOtherWall) {
              inspectX = opt.x;
              inspectY = opt.y;
              foundPose = true;
              break;
            }
          }
        }
        if (!foundPose) {
          inspectX = cX;
          inspectY = (w.y + w.h + 105 < H - 70) ? (w.y + w.h + 105) : (w.y - 105);
        }

        var targetAngle = Math.atan2(cY - inspectY, cX - inspectX);
        var gPos = (typeof slamWorldToGrid === 'function') ? slamWorldToGrid(inspectX, inspectY) : { gx: Math.floor((inspectX / W) * slamMap.width), gy: Math.floor((inspectY / H) * slamMap.height) };
        candidates.push({
          cluster: {
            minX: gMin.gx, maxX: gMax.gx, minY: gMin.gy, maxY: gMax.gy,
            name: w.name, vlm: w.vlm, icon: w.icon, category: w.category
          },
          pose: { worldX: inspectX, worldY: inspectY, theta: targetAngle, gx: gPos.gx, gy: gPos.gy },
          cX: cX,
          cY: cY,
          attempts: 0
        });
      });
    }

    if (candidates.length === 0) {
      console.log('⚠️ [Tour VLM] Nessun arredo interno rilevato da ispezionare.');
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

    // Se l'orientamento è allineato (entro 0.12 rad ~ 6.8°) o tempo limite raggiunto
    tourState.alignFrames = (tourState.alignFrames || 0) + 1;
    if (Math.abs(diffAngle) <= 0.12 || (tourState.alignFrames > 45 && Math.abs(diffAngle) <= 0.35)) {
      robotState.steering = 0;
      // Micro-allineamento ottico della torretta pan/tilt (assorbe l'errore residuo)
      robotState.panAngle = Math.max(-80, Math.min(80, diffAngle * 180 / Math.PI));
      robotState.tiltAngle = 5;

      if (typeof updateThreeCamera === 'function') {
        updateThreeCamera();
      }

      tourState.alignFrames = 0;
      tourState.waitFrames = 0;
      tourState.fsmState = 'INSPECT';
      console.log('🎯 [Tour VLM] Allineamento ottico completato verso (' + Math.round(targetLookX) + ', ' + Math.round(targetLookY) + ')');
      return;
    }

    // Rotazione fisica continua differenziale sul posto proporzionale e smorzata
    var turnDir = (diffAngle > 0) ? 1 : -1;
    var omega = turnDir * Math.min(1.8, Math.max(0.4, Math.abs(diffAngle) * 2.0));
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
            console.warn('⚠️ [Tour VLM] Distanza eccessiva per scatto. Forzatura acquisizione...');
            if (tourState.attemptsForCurrent >= 3) {
              registerUnknownObstacleLandmark(cX, cY, tourState.currentCluster);
              tourState.currentIndex++;
              tourState.fsmState = 'SELECT_TARGET';
            } else {
              tourState.waitFrames = 0;
            }
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
registerBehavior('vlmTour', runInspectionTourBehavior);
