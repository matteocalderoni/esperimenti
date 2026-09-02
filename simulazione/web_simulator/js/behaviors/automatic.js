// simulazione/web_simulator/js/behaviors/automatic.js
// Guida Automatica: marcia avanti con scansione continua del muso (±20°)

function runAutomaticBehavior() {
  // Oscillazione continua della testa per coprire il campo visivo (±20°, 1.5°/frame)
  if (!robotState.panSweepDir) robotState.panSweepDir = 1.5;
  robotState.panAngle += robotState.panSweepDir;
  if (robotState.panAngle >= 20) {
    robotState.panAngle = 20;
    robotState.panSweepDir = -1.5;
  } else if (robotState.panAngle <= -20) {
    robotState.panAngle = -20;
    robotState.panSweepDir = 1.5;
  }

  robotState.speed = 96;
  robotState.steering = 0;
}

registerBehavior('automatic', runAutomaticBehavior);
