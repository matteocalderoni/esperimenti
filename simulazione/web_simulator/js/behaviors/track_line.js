// simulazione/web_simulator/js/behaviors/track_line.js
// Algoritmo Seguipista IR (3 Sensori a Infrarossi sul Pavimento)

function runTrackLineBehavior() {
  const [left, center, right] = robotState.irSensors;

  // Aggiorna la memoria dell'ultimo lato in cui è stata vista la linea
  if (left === 0 && right === 1) {
    robotState.lastLineSide = 'left';
  } else if (right === 0 && left === 1) {
    robotState.lastLineSide = 'right';
  }

  robotState.panAngle = 0;

  if (center === 0) {
    robotState.speed = 132;
    robotState.steering = 0;
  } else if (left === 0) {
    robotState.speed = 96;
    robotState.steering = -3.6;
  } else if (right === 0) {
    robotState.speed = 96;
    robotState.steering = 3.6;
  } else {
    robotState.speed = 30;
    robotState.steering = 3;
  }
}

registerBehavior('trackLine', runTrackLineBehavior);
