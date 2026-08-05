// simulazione/web_simulator/js/behaviors/find_color.js
// Algoritmo Inseguimento Colore OpenCV (Visual Servoing + Chassis Follow + Guardia Ultrasuoni)

function runFindColorBehavior() {
  const ball = arenaObjects.targetBall;
  const dx = ball.x - robotState.x;
  const dy = ball.y - robotState.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const targetAngle = Math.atan2(dy, dx);
  
  // 1. Servo Pan-Tilt Tracking: la testa orienta la fotocamera per agganciare il centro del target verde
  let diffAngle = (targetAngle - robotState.angle) * 180 / Math.PI;
  while (diffAngle < -180) diffAngle += 360;
  while (diffAngle > 180) diffAngle -= 360;

  const desiredPan = Math.max(-75, Math.min(75, diffAngle));
  robotState.panAngle += (desiredPan - robotState.panAngle) * 0.18;

  const desiredTilt = Math.max(-25, Math.min(25, (150 - dist) * 0.2));
  robotState.tiltAngle += (desiredTilt - robotState.tiltAngle) * 0.15;

  // 2. Inseguimento Veicolo con Protezione Ostacoli Frontale (Chassis Follow + Ultrasonic Safety Guard)
  let bodyAngleDiff = targetAngle - robotState.angle;
  while (bodyAngleDiff < -Math.PI) bodyAngleDiff += Math.PI * 2;
  while (bodyAngleDiff > Math.PI) bodyAngleDiff -= Math.PI * 2;

  // Se un muro sbarra la strada di fronte (< 35cm), esegue l'aggiramento in MARCIA AVANTI (evita retromarcia cieca contro i muri posteriori)
  if (robotState.ultrasonicDist < 0.35) {
    robotState.speed = 1.0; // Avanzamento moderato in avanti
    // Sterza in marcia avanti verso l'estremità aperta dell'ostacolo (in base al Pan della testa)
    robotState.steering = (robotState.panAngle < 0) ? 0.08 : -0.08;
  } else if (dist > 70) {
    robotState.steering = bodyAngleDiff * 0.08;
    robotState.speed = Math.min(2.0, (dist - 65) * 0.025); // avanzamento graduale verso il target
  } else {
    robotState.speed = 0; // Target raggiunto in sicurezza
    robotState.steering = 0;
  }
}
