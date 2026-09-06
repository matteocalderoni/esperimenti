// simulazione/web_simulator/js/behaviors/motion_get.js
// Modalità di Sorveglianza & Rilevamento Movimento (WatchDog)

function runMotionGetBehavior(dt) {
  if (dt === undefined) dt = (typeof SIM_DT !== 'undefined') ? SIM_DT : 0.016;

  // Il robot sta fermo sul posto in modalità sentinella
  robotState.speed = 0;
  robotState.steering = 0;

  // Oscillazione dolce della testa/telecamera (sweep da -60° a +60°)
  if (typeof robotState.watchdogPanDir === 'undefined') {
    robotState.watchdogPanDir = 1;
  }
  robotState.panAngle += robotState.watchdogPanDir * 35 * dt;
  if (robotState.panAngle >= 60) {
    robotState.panAngle = 60;
    robotState.watchdogPanDir = -1;
  } else if (robotState.panAngle <= -60) {
    robotState.panAngle = -60;
    robotState.watchdogPanDir = 1;
  }

  // Tilt leggero per monitorare l'ambiente
  robotState.tiltAngle = Math.sin(Date.now() / 600) * 8;

  // Effetto LED di allerta sorveglianza (impulso ambra/arancione)
  const pulse = Math.sin(Date.now() / 250);
  robotState.ledColor = (pulse > 0) ? '#ffaa00' : '#ff4400';
}

registerBehavior('motionGet', runMotionGetBehavior);
registerBehavior('watchDog', runMotionGetBehavior);
