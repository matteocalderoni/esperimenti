// simulazione/web_simulator/js/kinematics.js
// Gestione della Cinematica 4WD e Collisioni Fisiche Rigide

function updateKinematics() {
  // 1. Integrazione posizione veicolo (Moto Cartesiano 2D)
  robotState.angle += robotState.steering;
  robotState.x += Math.cos(robotState.angle) * robotState.speed;
  robotState.y += Math.sin(robotState.angle) * robotState.speed;

  // 2. Limiti perimetrali dell'Arena
  const margin = 35;
  if (robotState.x < margin) { robotState.x = margin; robotState.speed = -0.5; robotState.angle += 0.1; }
  if (robotState.x > arenaCanvas.width - margin) { robotState.x = arenaCanvas.width - margin; robotState.speed = -0.5; robotState.angle += 0.1; }
  if (robotState.y < margin) { robotState.y = margin; robotState.speed = -0.5; robotState.angle += 0.1; }
  if (robotState.y > arenaCanvas.height - margin) { robotState.y = arenaCanvas.height - margin; robotState.speed = -0.5; robotState.angle += 0.1; }

  // 3. Collisione solida e spinta fuori dai muri (Hard Wall Push-Out)
  const carR = 22;
  for (const w of arenaObjects.walls) {
    if (robotState.x + carR > w.x && robotState.x - carR < w.x + w.w &&
        robotState.y + carR > w.y && robotState.y - carR < w.y + w.h) {
      
      const overlapLeft = (robotState.x + carR) - w.x;
      const overlapRight = (w.x + w.w) - (robotState.x - carR);
      const overlapTop = (robotState.y + carR) - w.y;
      const overlapBottom = (w.y + w.h) - (robotState.y - carR);

      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

      if (minOverlap === overlapLeft) robotState.x = w.x - carR;
      else if (minOverlap === overlapRight) robotState.x = w.x + w.w + carR;
      else if (minOverlap === overlapTop) robotState.y = w.y - carR;
      else if (minOverlap === overlapBottom) robotState.y = w.y + w.h + carR;

      if (robotState.speed > 0) robotState.speed = -0.4;
    }
  }
}
