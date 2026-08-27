// simulazione/web_simulator/js/behaviors/automatic.js
// Guida Automatica: marcia avanti con scansione lenta del muso (±20°)

function runAutomaticBehavior() {
  // Oscillazione lenta della testa per coprire il muso della macchina (±20°, ~1.5°/frame)
  if (!robotState.panSweepDir) robotState.panSweepDir = 1.5;
  robotState.panAngle += robotState.panSweepDir;
  if (robotState.panAngle >= 20) {
    robotState.panAngle = 20;
    robotState.panSweepDir = -1.5;
  } else if (robotState.panAngle <= -20) {
    robotState.panAngle = -20;
    robotState.panSweepDir = 1.5;
  }

  robotState.speed = 1.6;
  robotState.steering = 0;
}

registerBehavior('automatic', runAutomaticBehavior);
