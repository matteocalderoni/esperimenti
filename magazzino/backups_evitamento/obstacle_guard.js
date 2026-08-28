// simulazione/web_simulator/js/obstacle_guard.js
// Modulo Unificato per la Gestione e Guardia degli Ostacoli (DRY Pattern)

function checkAndHandleObstacles(options = {}) {
  const mode = robotState.activeMode;
  if (mode === 'PT') return false;

  const stopThreshold  = options.stopThreshold  || 0.30;
  const glideThreshold = options.glideThreshold  || 0.80;
  const dangerThreshold = options.dangerThreshold || 0.25;
  const STUCK_LIMIT = 60;   // frame in zona ostacolo prima di attivare fuga
  const ESCAPE_FRAMES = 50; // durata della manovra di fuga aggressiva

  // 1. Eccezione Specifica: Tracciamento Linea (Stop & Wait a 30cm)
  if (mode === 'trackLine') {
    robotState.stuckFrames = 0;
    robotState.stuckEscaping = false;
    if (robotState.ultrasonicDist < stopThreshold) {
      robotState.speed = 0;
      robotState.steering = 0;
      robotState.ledColor = (Math.floor(Date.now() / 250) % 2 === 0) ? '#ff0000' : '#ffbe0b';
      return true;
    }
    return false;
  }

  const dist = robotState.ultrasonicDist;

  // Calcola direzione di fuga
  const leftD  = robotState.leftDist  !== undefined ? robotState.leftDist  : dist;
  const rightD = robotState.rightDist !== undefined ? robotState.rightDist : dist;
  const pan = robotState.panAngle || 0;

  let steerDir;
  if (Math.abs(pan) > 3) {
    steerDir = (pan > 0) ? -1 : 1;
  } else if (rightD < leftD - 0.05) {
    steerDir = -1;
  } else if (leftD < rightD - 0.05) {
    steerDir = 1;
  } else {
    steerDir = -1;
  }

  // 2. Rilevamento Blocco (Stuck Detection)
  if (dist < glideThreshold) {
    robotState.stuckFrames++;
  } else {
    robotState.stuckFrames = 0;
    robotState.stuckEscaping = false;
  }

  if (robotState.stuckFrames >= STUCK_LIMIT) {
    robotState.stuckEscaping = true;
  }

  // 3. Manovra di Fuga Aggressiva (robot bloccato in angolo)
  if (robotState.stuckEscaping) {
    robotState.stuckFrames = Math.max(0, robotState.stuckFrames - 1); // countdown
    if (robotState.stuckFrames < STUCK_LIMIT - ESCAPE_FRAMES) {
      robotState.stuckEscaping = false; // fuga completata
    }
    robotState.speed    = -1.2;           // retromarcia decisa
    robotState.steering = steerDir * 0.14; // curva aggressiva verso il lato libero
    robotState.ledColor = (Math.floor(Date.now() / 150) % 2 === 0) ? '#ff4400' : '#000000';
    return true;
  }

  // 4. Fascia Rossa (dist < 25cm) -> Disimpegno in retromarcia
  if (dist < dangerThreshold) {
    robotState.speed    = -0.8;
    robotState.steering = -steerDir * 0.10;
    return true;
  }

  // 5. Fascia Gialla (25cm <= dist < 80cm) -> Decelerazione e sterzata progressive
  if (dist < glideThreshold) {
    const urgency = (glideThreshold - dist) / (glideThreshold - dangerThreshold);
    robotState.speed    = 1.6 - (1.1 * urgency);
    robotState.steering = steerDir * (0.03 + 0.08 * urgency);
    return true;
  }

  return false;
}
