// simulazione/web_simulator/js/behaviors/automatic.js
// Guida Automatica Adattiva: marcia avanti con scansione adattiva e scansione attiva sinistra/destra

function runAutomaticBehavior() {
  if (!robotState.avoidState) {
    robotState.avoidState = 'sweeping';
    robotState.panAngle = 0;
    robotState.panSweepDir = 2.0;
    robotState.focusAngle = 0;
    robotState.scanStep = 0;
    robotState.scanTimer = 0;
  }

  if (robotState.avoidState === 'sweeping') {
    // 1. Oscillazione continua stretta (±15°, 2° per frame)
    robotState.panAngle += robotState.panSweepDir;
    if (robotState.panAngle >= 15) {
      robotState.panAngle = 15;
      robotState.panSweepDir = -2.0;
    } else if (robotState.panAngle <= -15) {
      robotState.panAngle = -15;
      robotState.panSweepDir = 2.0;
    }

    robotState.speed = 1.6;
    robotState.steering = 0;

    if (robotState.ultrasonicDist < 0.80) {
      robotState.avoidState = 'focusing';
      robotState.focusAngle = robotState.panAngle;
      console.log(`[INFO-JS] Ostacolo a ${(robotState.ultrasonicDist * 100).toFixed(1)}cm all'angolo ${Math.round(robotState.focusAngle)}°. Blocco servo.`);
    }

  } else if (robotState.avoidState === 'focusing') {
    // 2. Lock del sensore sull'angolo di rilevamento ostacolo
    robotState.panAngle = robotState.focusAngle;

    if (robotState.ultrasonicDist < 0.30) {
      robotState.avoidState = 'scanning';
      robotState.scanStep = 0;
      robotState.scanTimer = 0;
      robotState.speed = 0;
      robotState.steering = 0;
      console.log(`[WARNING-JS] Ostacolo critico a ${(robotState.ultrasonicDist * 100).toFixed(1)}cm! Arresto e scansione.`);
    } else if (robotState.ultrasonicDist > 0.85) {
      robotState.avoidState = 'sweeping';
      console.log(`[INFO-JS] Via libera. Ritorno a scansione continua.`);
    } else {
      // Decelerazione e sterzata allontanandosi dall'ostacolo
      robotState.speed = 0.8;
      // focusAngle positivo = ostacolo a destra -> sterza a sinistra
      robotState.steering = (robotState.focusAngle >= 0) ? -0.06 : 0.06;
    }

  } else if (robotState.avoidState === 'scanning') {
    // 3. Arresto e scansione attiva sinistra/destra non bloccante
    robotState.speed = 0;
    robotState.steering = 0;
    robotState.scanTimer++;

    if (robotState.scanStep === 0) {
      // Posiziona a Sinistra (+45°)
      robotState.panAngle = 45;
      if (robotState.scanTimer >= 25) {
        robotState.distLeft = robotState.ultrasonicDist;
        robotState.scanStep = 1;
        robotState.scanTimer = 0;
      }
    } else if (robotState.scanStep === 1) {
      // Posiziona a Destra (-45°)
      robotState.panAngle = -45;
      if (robotState.scanTimer >= 25) {
        robotState.distRight = robotState.ultrasonicDist;
        robotState.scanStep = 2;
        robotState.scanTimer = 0;
      }
    } else if (robotState.scanStep === 2) {
      // Ricentra servo e prendi decisione
      robotState.panAngle = 0;
      if (robotState.scanTimer >= 15) {
        robotState.scanTimer = 0;
        console.log(`[SCAN-JS] Sinistra: ${(robotState.distLeft * 100).toFixed(1)}cm, Destra: ${(robotState.distRight * 100).toFixed(1)}cm`);

        if (robotState.distLeft < 0.25 && robotState.distRight < 0.25) {
          // Entrambi i lati bloccati -> Retromarcia
          robotState.scanStep = 3;
        } else {
          // Svolta verso il lato libero
          robotState.scanSteer = (robotState.distLeft >= robotState.distRight) ? -0.08 : 0.08;
          robotState.scanStep = 4;
        }
      }
    } else if (robotState.scanStep === 3) {
      // Esecuzione retromarcia d'emergenza
      robotState.speed = -1.0;
      robotState.steering = (robotState.distLeft >= robotState.distRight) ? -0.04 : 0.04;
      if (robotState.scanTimer >= 35) {
        robotState.avoidState = 'sweeping';
      }
    } else if (robotState.scanStep === 4) {
      // Esecuzione curva evasiva in avanti
      robotState.speed = 1.2;
      robotState.steering = robotState.scanSteer;
      if (robotState.scanTimer >= 35) {
        robotState.avoidState = 'sweeping';
      }
    }
  }
}

registerBehavior('automatic', runAutomaticBehavior);

