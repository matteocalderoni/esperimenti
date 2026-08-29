// simulazione/web_simulator/js/slam/slam_navigator.js
// Inseguimento Waypoint A* con Passaggio a Scansione Periodica da Fermo

function navigateSlamPath() {
  if (slamMap.currentPath.length > 0 && slamMap.pathIndex < slamMap.currentPath.length - 1) {
    var nextPt = slamMap.currentPath[slamMap.pathIndex + 1];
    var target = slamGridToWorld(nextPt.gx, nextPt.gy);
    var ddx = target.x - robotState.x;
    var ddy = target.y - robotState.y;
    var dist = Math.hypot(ddx, ddy);
    var targetAngle = Math.atan2(ddy, ddx);
    var diff = targetAngle - robotState.angle;
    while (diff < -Math.PI) diff += Math.PI * 2;
    while (diff > Math.PI) diff -= Math.PI * 2;

    // Controllo velocità e sterzo verso il waypoint
    if (Math.abs(diff) > 0.5) {
      robotState.speed = 0.5;
      robotState.steering = diff > 0 ? 0.12 : -0.12;
    } else {
      robotState.speed = 2.0;
      robotState.steering = diff * 0.18;
    }

    // Avanzamento al prossimo waypoint se vicini (< 14px)
    if (dist < 14) {
      slamMap.pathIndex++;
      slamMap.stuckCounter = 0;
    }

    slamMap.stepCounter++;
    // Dopo ogni tratto di marcia (~120 frame), fermati ed esegui una scansione testa da fermo
    if (slamMap.stepCounter >= 120) {
      slamMap.stepCounter = 0;
      robotState.speed = 0;
      robotState.steering = 0;
      slamMap.scanStep = 0;
      slamMap.fsmState = 'HEAD_SCAN';
    }
  } else {
    // Raggiunto l'obiettivo o fine percorso: fermati ed esegui scansione testa da fermo
    robotState.speed = 0;
    robotState.steering = 0;
    slamMap.scanStep = 0;
    slamMap.fsmState = 'HEAD_SCAN';
  }
}
