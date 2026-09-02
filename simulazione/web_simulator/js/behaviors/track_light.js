// simulazione/web_simulator/js/behaviors/track_light.js
// Algoritmo Inseguimento Luce (Faro Giallo con Guardia Angoli Ciechi)

function runTrackLightBehavior() {
  const light = arenaObjects.lightSource;
  const dx = light.x - robotState.x;
  const dy = light.y - robotState.y;
  const distToLight = Math.hypot(dx, dy);
  const targetAngle = Math.atan2(dy, dx);
  let diffAngle = targetAngle - robotState.angle;

  while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
  while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;

  if (distToLight > 60) {
    robotState.steering = diffAngle * 4.8;
    robotState.speed = Math.min(120, distToLight * 1.2);
  } else {
    robotState.speed = 0; // Sorgente luminosa raggiunta
    robotState.steering = 0;
  }
}

registerBehavior('trackLight', runTrackLightBehavior);
