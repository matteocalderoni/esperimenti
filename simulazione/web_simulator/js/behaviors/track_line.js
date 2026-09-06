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

  if (left === 0 || center === 0 || right === 0) {
    if (center === 0) {
      robotState.speed = 138;
      robotState.steering = 0;
    } else if (left === 0) {
      robotState.speed = 100;
      robotState.steering = -3.8;
    } else if (right === 0) {
      robotState.speed = 100;
      robotState.steering = 3.8;
    }
  } else {
    // Se il robot è fuori tracciato, naviga attivamente verso il punto più vicino della linea
    let nearest = null;
    let minDist = Infinity;
    if (typeof arenaObjects !== 'undefined' && arenaObjects.lineTrack) {
      for (const pt of arenaObjects.lineTrack) {
        const d = Math.hypot(pt.x - robotState.x, pt.y - robotState.y);
        if (d < minDist) { minDist = d; nearest = pt; }
      }
    }
    if (nearest && minDist > 35) {
      const targetAngle = Math.atan2(nearest.y - robotState.y, nearest.x - robotState.x);
      let diff = targetAngle - robotState.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      robotState.steering = diff * 3.5;
      robotState.speed = Math.min(130, minDist * 1.5);
    } else {
      robotState.speed = 70;
      robotState.steering = 2.5;
    }
  }
}

registerBehavior('trackLine', runTrackLineBehavior);
registerBehavior('CVFL', runTrackLineBehavior);
