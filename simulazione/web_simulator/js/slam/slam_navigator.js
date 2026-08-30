// simulazione/web_simulator/js/slam/slam_navigator.js
// Inseguimento Waypoint A* Proattivo con Aggiramento Ostacoli e Ricalcolo Dinamico

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

    // 1. Disimpegno di emergenza se ostacolo imprevisto troppo vicino (< 18cm)
    if (minD < 0.18) {
      robotState.speed = -0.8;
      robotState.steering = (robotState.leftDist >= robotState.rightDist) ? 0.09 : -0.09;
      slamMap.stuckCounter = (slamMap.stuckCounter || 0) + 1;
      if (slamMap.stuckCounter > 15) {
        slamMap.stuckCounter = 0;
        robotState.speed = 0;
        slamMap.fsmState = 'HEAD_SCAN';
      }
      return;
    }

    // 2. Controllo Proattivo Velocità e Curvatura
    if (Math.abs(diff) > 0.8) {
      robotState.speed = 0.5;
      robotState.steering = diff > 0 ? 0.12 : -0.12;
    } else {
      var baseSpeed = minD < 0.35 ? 1.0 : 2.0;
      robotState.speed = Math.max(0.8, baseSpeed - (Math.abs(diff) * 0.8));
      robotState.steering = diff * 0.20;
    }

    // 3. Avanzamento Waypoint se raggiunto (< 14px)
    if (dist < 14) {
      slamMap.pathIndex++;
      slamMap.stuckCounter = 0;
    } else {
      slamMap.stuckCounter = (slamMap.stuckCounter || 0) + 1;
    }

    // 4. Rilevamento Blocco/Stallo: se fermi per > 45 frame, ricalcola traiettoria A*
    if (slamMap.stuckCounter >= 45) {
      slamMap.stuckCounter = 0;
      robotState.speed = 0;
      robotState.steering = 0;
      slamMap.scanStep = 0;
      slamMap.fsmState = 'HEAD_SCAN';
      return;
    }

    slamMap.stepCounter++;
    if (slamMap.stepCounter >= 120) {
      slamMap.stepCounter = 0;
      robotState.speed = 0;
      robotState.steering = 0;
      slamMap.scanStep = 0;
      slamMap.fsmState = 'HEAD_SCAN';
    }
  } else {
    // Raggiunto l'obiettivo o fine percorso: passa a scansione panoramica
    robotState.speed = 0;
    robotState.steering = 0;
    slamMap.scanStep = 0;
    slamMap.fsmState = 'HEAD_SCAN';
  }
}
