// simulazione/web_simulator/js/slam/slam_navigator.js
// Inseguimento della Traiettoria A* tramite Pianificatore Locale DWA & Regulated Lookahead
//
// L'A* fornisce il percorso globale; il DWA decide istante per istante il
// comando (velocita', sterzo) che avvicina al waypoint garantendo moto fluido continuo.

function navigateSlamPath(dt) {
  if (dt === undefined) dt = (typeof SIM_DT !== 'undefined') ? SIM_DT : 0.016;

  var percorsoValido = slamMap.currentPath && slamMap.currentPath.length > 0 &&
                       slamMap.pathIndex < slamMap.currentPath.length - 1;

  if (!percorsoValido) {
    robotState.speed = 0;
    robotState.steering = 0;
    if (robotState.activeMode === 'inspectionTour') {
      return;
    }
    if (slamMap.targetInspectionCluster) {
      slamMap.fsmState = 'INSPECT_STATIONARY';
    } else {
      // Arrivo al target frontiera: sblocca il target per la prossima selezione
      slamMap.targetFrontier = null;
      slamMap.fsmState = 'FIND_FRONTIERS';
    }
    return;
  }

  // Avanzamento e potatura intelligente dei waypoint:
  // Non inseguire waypoint che il robot ha già superato o che sono ormai alle sue spalle
  while (slamMap.pathIndex < slamMap.currentPath.length - 1) {
    var pt = slamMap.currentPath[slamMap.pathIndex + 1];
    var wpt = slamGridToWorld(pt.gx, pt.gy);
    var wx = wpt.x - robotState.x, wy = wpt.y - robotState.y;
    var wDist = Math.hypot(wx, wy);

    // Se siamo vicini, il waypoint è considerato raggiunto:
    // Per i waypoint intermedi soglia a 46 px (taglio curva); per l'ultimo waypoint finale soglia a 18 px (posizionamento preciso)
    var isLastWaypoint = (slamMap.pathIndex >= slamMap.currentPath.length - 2);
    var reachThresh = isLastWaypoint ? 18 : 46;
    if (wDist <= reachThresh) {
      slamMap.pathIndex++;
      if (slamMap.pathIndex >= slamMap.currentPath.length - 1) {
        robotState.speed = 0;
        robotState.steering = 0;
        if (robotState.activeMode === 'inspectionTour') {
          return;
        }
        if (slamMap.targetInspectionCluster) {
          slamMap.fsmState = 'INSPECT_STATIONARY';
        } else {
          slamMap.targetFrontier = null;
          slamMap.fsmState = 'FIND_FRONTIERS';
        }
        return;
      }
      continue;
    }

    // Se esiste un waypoint successivo:
    if (slamMap.pathIndex < slamMap.currentPath.length - 2) {
      var nextPtAfter = slamMap.currentPath[slamMap.pathIndex + 2];
      var nextTargetAfter = slamGridToWorld(nextPtAfter.gx, nextPtAfter.gy);
      var distAfter = Math.hypot(nextTargetAfter.x - robotState.x, nextTargetAfter.y - robotState.y);

      // Proiezione del vettore robot->waypoint rispetto alla direzione del robot
      // Se il waypoint è dietro il robot o se il punto successivo è più vicino, è già stato superato
      var cosA = Math.cos(robotState.angle), sinA = Math.sin(robotState.angle);
      var forwardProj = wx * cosA + wy * sinA;
      if ((distAfter < wDist && wDist < 52) || (forwardProj < -2 && wDist < 55)) {
        slamMap.pathIndex++;
        continue;
      }
    }

    break;
  }

  // Calcola il punto target effettivo (con lookahead morbido al punto successivo se vicino < 42 px)
  var nextPt = slamMap.currentPath[slamMap.pathIndex + 1];
  var target = slamGridToWorld(nextPt.gx, nextPt.gy);
  var ddx = target.x - robotState.x, ddy = target.y - robotState.y;
  var dist = Math.hypot(ddx, ddy);

  if (dist < 42 && slamMap.pathIndex < slamMap.currentPath.length - 2) {
    var lookaheadPt = slamMap.currentPath[slamMap.pathIndex + 2];
    var lTarget = slamGridToWorld(lookaheadPt.gx, lookaheadPt.gy);
    var blend = (42 - dist) / 42 * 0.65;
    target = {
      x: target.x * (1 - blend) + lTarget.x * blend,
      y: target.y * (1 - blend) + lTarget.y * blend
    };
    ddx = target.x - robotState.x;
    ddy = target.y - robotState.y;
  }

  // Il DWA calcola il comando (v, w) ottimale
  var cmd = planDwaCommand(Math.atan2(ddy, ddx), dt);

  // Decelerazione progressiva e fluida quando ci si avvicina al traguardo finale
  var isApproachingGoal = (slamMap.pathIndex >= slamMap.currentPath.length - 2);
  if (isApproachingGoal && dist < 65) {
    var vTaper = Math.max(14, dist * 1.5);
    cmd.speed = Math.min(cmd.speed, vTaper);
  }

  robotState.speed = cmd.speed;
  robotState.steering = cmd.steering;

  // Rilevamento di stallo reale basato su odometria (spostamento cartesiano nel tempo)
  // Elimina completamente i falsi positivi mentre il robot sta viaggiando a pieno regime
  if (!slamMap.lastStuckPos) {
    slamMap.lastStuckPos = { x: robotState.x, y: robotState.y, time: Date.now() };
  }
  var now = Date.now();
  var dMoved = Math.hypot(robotState.x - slamMap.lastStuckPos.x, robotState.y - slamMap.lastStuckPos.y);

  if (dMoved > 15) {
    // Spostamento regolare: resetta timer
    slamMap.lastStuckPos = { x: robotState.x, y: robotState.y, time: now };
    slamMap.stuckCounter = 0;
  } else if (now - slamMap.lastStuckPos.time > 2200 && Math.abs(robotState.speed) > 10) {
    // Il robot ha provato a muoversi per 2.2 secondi ma non ha percorso più di 15 px (ostacolo imprevisto)
    console.warn('⚠️ [SLAM Navigator] Stallo fisico effettivo rilevato (>2.2s). Ricalcolo rotta.');
    slamMap.lastStuckPos = { x: robotState.x, y: robotState.y, time: now };
    slamMap.stuckCounter = 0;
    slamMap.currentPath = [];
    if (robotState.activeMode !== 'inspectionTour') {
      slamMap.targetFrontier = null;
      slamMap.fsmState = 'FIND_FRONTIERS';
    }
    return;
  }

  if (robotState.activeMode !== 'inspectionTour') {
    slamMap.stepCounter++;
    if (slamMap.stepCounter > 180) {
      slamMap.stepCounter = 0;
      slamMap.targetFrontier = null;
      slamMap.currentPath = [];
      slamMap.fsmState = 'FIND_FRONTIERS';
    }
  }
}

