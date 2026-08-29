// simulazione/web_simulator/js/obstacle_guard.js
// Modulo di Evitamento Ostacoli Fluido e Continuo (No Loop Avanti/Indietro)

function checkAndHandleObstacles(options = {}) {
  const mode = robotState.activeMode;
  if (mode === 'PT') return false;

  const dInfluence   = options.dInfluence   || 0.65; // Inizio manovra di evitamento (65cm)
  const dangerThresh = options.dangerThresh || 0.18; // Soglia critica retromarcia (18cm)
  const stopThresh   = options.stopThreshold || 0.30; // Soglia stop line-tracker

  // 1. Eccezione Tracciamento Linea (Stop & Wait a 30cm)
  if (mode === 'trackLine') {
    if (robotState.ultrasonicDist < stopThresh) {
      robotState.speed += (0 - robotState.speed) * 0.4;
      robotState.steering = 0;
      robotState.ledColor = (Math.floor(Date.now() / 250) % 2 === 0) ? '#ff0000' : '#ffbe0b';
      return true;
    }
    return false;
  }

  const minD   = robotState.ultrasonicDist;
  const leftD  = robotState.leftDist !== undefined ? robotState.leftDist : minD;
  const rightD = robotState.rightDist !== undefined ? robotState.rightDist : minD;
  const pan    = robotState.panAngle || 0;

  // 2. Disimpegno in Retromarcia Solo se a Contatto Imminente (< 18cm)
  if (minD < dangerThresh && !robotState.reversingCooldown) {
    robotState.reversingCooldown = 22; // Circa 0.35s di arretramento mirato
  }

  if (robotState.reversingCooldown > 0) {
    robotState.reversingCooldown--;
    const backSteer = (leftD >= rightD) ? 0.10 : -0.10;
    robotState.speed = -1.0;
    robotState.steering = backSteer;
    robotState.ledColor = '#ff0055';
    return true;
  }

  // 3. Scelta Lato Libero con Memoria (Anti-Sfarfallio / Isteresi)
  let steerDir = robotState.lockedSteerDir || 1;
  if (Math.abs(pan) > 5 && mode === 'automatic') {
    steerDir = (pan > 0) ? -1 : 1;
  } else if (leftD > rightD + 0.04) {
    steerDir = -1; // Più spazio a sinistra -> Sterza a Sinistra
  } else if (rightD > leftD + 0.04) {
    steerDir = 1;  // Più spazio a destra -> Sterza a Destra
  }
  robotState.lockedSteerDir = steerDir;

  // Se via libera oltre 65cm, nessun intervento (marcia normale)
  if (minD >= dInfluence) {
    return false;
  }

  // 4. Marcia Avanti e Curvatura Fluida Attiva (ZERO STALLO, ZERO LOOP)
  const urgency = (dInfluence - minD) / (dInfluence - dangerThresh);
  const targetSpeed = Math.max(1.0, 1.6 - (0.5 * urgency));
  const targetSteer = steerDir * (0.04 + 0.11 * urgency);

  // 5. Filtro Passa-Basso per Massima Fluidità a 60 FPS
  robotState.speed += (targetSpeed - robotState.speed) * 0.30;
  robotState.steering += (targetSteer - robotState.steering) * 0.25;
  robotState.ledColor = '#ffbe0b';

  return true;
}
