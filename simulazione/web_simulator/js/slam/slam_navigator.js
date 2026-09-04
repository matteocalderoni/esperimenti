// simulazione/web_simulator/js/slam/slam_navigator.js
// Inseguimento della Traiettoria A* tramite Pianificatore Locale DWA
//
// L'A* fornisce il percorso globale; il DWA decide istante per istante il
// comando (velocita', sterzo) che avvicina al waypoint restando percorribile.

function navigateSlamPath(dt) {
  var percorsoValido = slamMap.currentPath.length > 0 &&
                       slamMap.pathIndex < slamMap.currentPath.length - 1;
  if (!percorsoValido) {
    robotState.speed = 0;
    robotState.steering = 0;
    slamMap.scanStep = 0;
    slamMap.fsmState = 'HEAD_SCAN';
    return;
  }

  var nextPt = slamMap.currentPath[slamMap.pathIndex + 1];
  var target = slamGridToWorld(nextPt.gx, nextPt.gy);
  var ddx = target.x - robotState.x, ddy = target.y - robotState.y;
  var dist = Math.hypot(ddx, ddy);

  // Il DWA sceglie il comando simulando le traiettorie raggiungibili.
  var cmd = planDwaCommand(Math.atan2(ddy, ddx), dt);
  robotState.speed = cmd.speed;
  robotState.steering = cmd.steering;

  // Avanzamento del waypoint e rilevamento stallo.
  if (dist < 16) {
    slamMap.pathIndex++;
    slamMap.stuckCounter = 0;
  } else if (cmd.speed <= 0) {
    slamMap.stuckCounter += 2;   // manovra di disimpegno: pesa doppio
  } else {
    slamMap.stuckCounter++;
  }

  if (slamMap.stuckCounter >= 40) {
    slamMap.stuckCounter = 0;
    robotState.speed = 0;
    robotState.steering = 0;
    slamMap.scanStep = 0;
    slamMap.fsmState = 'HEAD_SCAN';
    return;
  }

  slamMap.stepCounter++;
}
