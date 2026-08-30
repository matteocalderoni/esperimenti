// simulazione/web_simulator/js/slam/slam_navigator.js
// Inseguimento Traiettoria A* Fluido e Proattivo con Controllo di Curvatura Anti-Collisione

function navigateSlamPath() {
  if (slamMap.currentPath.length > 0 && slamMap.pathIndex < slamMap.currentPath.length - 1) {
    var nextPt = slamMap.currentPath[slamMap.pathIndex + 1];
    var target = slamGridToWorld(nextPt.gx, nextPt.gy);
    var ddx = target.x - robotState.x, ddy = target.y - robotState.y;
    var dist = Math.hypot(ddx, ddy);
    var targetAngle = Math.atan2(ddy, ddx);
    var diff = targetAngle - robotState.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;

    var minD = robotState.ultrasonicDist || 1.0;

    // 1. Rallentamento di Sicurezza e Sterzata Morbida se Ostacolo Vicino (< 22cm)
    if (minD < 0.22) {
      robotState.speed = 0.2;
      robotState.steering = (robotState.leftDist >= robotState.rightDist) ? 0.12 : -0.12;
      slamMap.stuckCounter = (slamMap.stuckCounter || 0) + 1;
      if (slamMap.stuckCounter > 12) {
        slamMap.stuckCounter = 0; slamMap.scanStep = 0; slamMap.fsmState = 'HEAD_SCAN';
      }
      return;
    }

    // 2. Controllo Continuo Velocità & Sterzata Fluida
    if (Math.abs(diff) > 0.6) {
      robotState.speed = 0.5;
      robotState.steering = Math.max(-0.15, Math.min(0.15, diff * 0.25));
    } else {
      var speedScale = Math.min(1.8, Math.max(0.7, (minD - 0.20) * 2.5));
      robotState.speed = Math.max(0.6, speedScale - (Math.abs(diff) * 0.6));
      robotState.steering = Math.max(-0.14, Math.min(0.14, diff * 0.20));
    }

    // 3. Avanzamento Waypoint Fluido (< 16px)
    if (dist < 16) {
      slamMap.pathIndex++;
      slamMap.stuckCounter = 0;
    } else {
      slamMap.stuckCounter = (slamMap.stuckCounter || 0) + 1;
    }

    // 4. Rilevamento Stallo
    if (slamMap.stuckCounter >= 40) {
      slamMap.stuckCounter = 0; robotState.speed = 0; robotState.steering = 0;
      slamMap.scanStep = 0; slamMap.fsmState = 'HEAD_SCAN';
      return;
    }

    slamMap.stepCounter++;
    if (slamMap.stepCounter >= 120) {
      slamMap.stepCounter = 0; robotState.speed = 0; robotState.steering = 0;
      slamMap.scanStep = 0; slamMap.fsmState = 'HEAD_SCAN';
    }
  } else {
    robotState.speed = 0; robotState.steering = 0; slamMap.scanStep = 0;
    slamMap.fsmState = 'HEAD_SCAN';
  }
}
