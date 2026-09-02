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

  if (dist > 70) {
    robotState.steering = bodyAngleDiff * 4.8;
    robotState.speed = Math.min(108, (dist - 65) * 1.5); // avanzamento graduale verso il target
  } else {
    robotState.speed = 0; // Target raggiunto in sicurezza
    robotState.steering = 0;
  }
}

registerBehavior('findColor', runFindColorBehavior);
