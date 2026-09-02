// simulazione/web_simulator/js/obstacle_guard.js
// Guardia Ostacoli per le Modalita' Reattive
//
// Non decide piu' da sola: quando il fronte si chiude delega la scelta del
// comando al pianificatore locale DWA, che valuta le traiettorie candidate.
// Resta qui solo il contratto verso physics.js: "true = ho preso il controllo,
// non eseguire il comportamento della modalita'".

function checkAndHandleObstacles(options = {}) {
  const mode = robotState.activeMode;
  if (mode === 'PT') return false;

  const dInfluence = options.dInfluence || 0.65;   // distanza a cui intervenire
  const stopThresh = options.stopThreshold || 0.30;

  // 1. Tracciamento linea: qui non si aggira, ci si ferma e si aspetta.
  if (mode === 'trackLine') {
    if (robotState.frontDist < stopThresh) {
      robotState.speed += (0 - robotState.speed) * Math.min(1, 24 * SIM_DT);
      robotState.steering = 0;
      robotState.ledColor = (Math.floor(Date.now() / 250) % 2 === 0) ? '#ff0000' : '#ffbe0b';
      return true;
    }
    return false;
  }

  // 2. Via libera: guida il comportamento della modalita'.
  if (robotState.frontDist >= dInfluence) return false;

  // 3. Fronte chiuso: il DWA sceglie il comando mantenendo la rotta corrente.
  const cmd = planDwaCommand(robotState.angle, options.dt);
  robotState.speed = cmd.speed;
  robotState.steering = cmd.steering;
  robotState.ledColor = (cmd.speed <= 0) ? '#ff0055' : '#ffbe0b';
  return true;
}
