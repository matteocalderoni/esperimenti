// simulazione/web_simulator/js/behaviors/track_line.js
// Algoritmo Seguipista IR (3 Sensori a Infrarossi sul Pavimento)

function runTrackLineBehavior() {
  const [left, center, right] = robotState.irSensors;
  robotState.panAngle = 0;

  if (center === 0) {
    robotState.speed = 2.2;
    robotState.steering = 0;
  } else if (left === 0) {
    robotState.speed = 1.6;
    robotState.steering = -0.06;
  } else if (right === 0) {
    robotState.speed = 1.6;
    robotState.steering = 0.06;
  } else {
    robotState.speed = 0.5;
    robotState.steering = 0.05;
  }
}
