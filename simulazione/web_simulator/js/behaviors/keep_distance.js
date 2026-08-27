// simulazione/web_simulator/js/behaviors/keep_distance.js
// Algoritmo Mantenimento Distanza Radar Proporzionale

function runKeepDistanceBehavior() {
  robotState.panAngle = 0;
  if (robotState.ultrasonicDist > 0.40) {
    robotState.speed = 1.8;
  } else if (robotState.ultrasonicDist < 0.25) {
    robotState.speed = -1.5;
  } else {
    robotState.speed = 0;
  }
}

registerBehavior('keepDistance', runKeepDistanceBehavior);
