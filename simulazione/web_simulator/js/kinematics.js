// simulazione/web_simulator/js/kinematics.js
// Gestione della Cinematica 4WD e Collisioni Fisiche Rigide

function updateKinematics(dt) {
  if (dt === undefined) dt = SIM_DT;

  // Gestione cooldown collisione (in secondi)
  if (robotState.collisionCooldown > 0) {
    robotState.collisionCooldown = Math.max(0, robotState.collisionCooldown - dt);
  }

  // 1. Integrazione posizione veicolo (Moto Cartesiano 2D)
  robotState.angle += robotState.steering * dt;
  robotState.x += Math.cos(robotState.angle) * robotState.speed * dt;
  robotState.y += Math.sin(robotState.angle) * robotState.speed * dt;

  // 2. Limiti perimetrali dell'Arena
  const margin = 35;
  if (robotState.x < margin) { robotState.x = margin; robotState.speed = -30; robotState.angle += 6 * dt; }
  if (robotState.x > arenaCanvas.width - margin) { robotState.x = arenaCanvas.width - margin; robotState.speed = -30; robotState.angle += 6 * dt; }
  if (robotState.y < margin) { robotState.y = margin; robotState.speed = -30; robotState.angle += 6 * dt; }
  if (robotState.y > arenaCanvas.height - margin) { robotState.y = arenaCanvas.height - margin; robotState.speed = -30; robotState.angle += 6 * dt; }

  // 3. Collisione solida e spinta fuori dai muri (Hard Wall Push-Out)
  const carR = CAR_RADIUS_PX;
  for (const w of arenaObjects.walls) {
    if (robotState.x + carR > w.x && robotState.x - carR < w.x + w.w &&
        robotState.y + carR > w.y && robotState.y - carR < w.y + w.h) {
      
      const overlapLeft = (robotState.x + carR) - w.x;
      const overlapRight = (w.x + w.w) - (robotState.x - carR);
      const overlapTop = (robotState.y + carR) - w.y;
      const overlapBottom = (w.y + w.h) - (robotState.y - carR);

      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

      let steerDir = -1; // Default: sterzo a sinistra
      let px = 0, py = 0;
      if (minOverlap === overlapLeft) {
        robotState.x = w.x - carR;
        steerDir = -1; // Ostacolo a destra -> sterza a sinistra
        px = -1; py = 0;
      } else if (minOverlap === overlapRight) {
        robotState.x = w.x + w.w + carR;
        steerDir = 1;  // Ostacolo a sinistra -> sterza a destra
        px = 1; py = 0;
      } else if (minOverlap === overlapTop) {
        robotState.y = w.y - carR;
        // Urto frontale: decide in base al sensore di linea attivo o all'ultima memoria salvata
        if (robotState.irSensors[0] === 0) steerDir = -1;      // Linea a sinistra -> gira a sinistra
        else if (robotState.irSensors[2] === 0) steerDir = 1;  // Linea a destra -> gira a destra
        else steerDir = (robotState.lastLineSide === 'right') ? 1 : -1; // Fallback sulla memoria
        px = 0; py = -1;
      } else if (minOverlap === overlapBottom) {
        robotState.y = w.y + w.h + carR;
        if (robotState.irSensors[0] === 0) steerDir = -1;
        else if (robotState.irSensors[2] === 0) steerDir = 1;
        else steerDir = (robotState.lastLineSide === 'right') ? 1 : -1;
        px = 0; py = 1;
      }

      robotState.recoverySteeringDir = steerDir;

      // Calcola se la direzione del push-out (via di fuga) è concorde con la rotta del robot
      const hx = Math.cos(robotState.angle);
      const hy = Math.sin(robotState.angle);
      const dot = hx * px + hy * py;
      robotState.recoverySpeedSign = (dot > 0) ? 1 : -1;

      robotState.collisionCooldown = 0.85; // Avvia la manovra di recupero (secondi)
      if (robotState.speed > 0) robotState.speed = -24;
    }
  }
}
