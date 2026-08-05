// simulazione/web_simulator/js/physics.js

function updatePhysics() {
  // 1. Aggiornamento posizione veicolo
  robotState.angle += robotState.steering;
  robotState.x += Math.cos(robotState.angle) * robotState.speed;
  robotState.y += Math.sin(robotState.angle) * robotState.speed;

  // Limiti Arena & Collisione Bordo (Margin con tolleranza ingombro telaio 35px)
  const margin = 35;
  if (robotState.x < margin) { robotState.x = margin; robotState.speed = -0.5; robotState.angle += 0.1; }
  if (robotState.x > arenaCanvas.width - margin) { robotState.x = arenaCanvas.width - margin; robotState.speed = -0.5; robotState.angle += 0.1; }
  if (robotState.y < margin) { robotState.y = margin; robotState.speed = -0.5; robotState.angle += 0.1; }
  if (robotState.y > arenaCanvas.height - margin) { robotState.y = arenaCanvas.height - margin; robotState.speed = -0.5; robotState.angle += 0.1; }

  // 1. Collisione solida e blocco di compenetrazione telaio (Hard Wall Push-Out)
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

  // 2. Calcolo cono di rilevamento ultrasuoni (Multi-Ray Cone Sensing: Raggio Centro, Sinistra -22°, Destra +22°)
  const totalHeadAngle = robotState.angle + (robotState.panAngle * Math.PI / 180);
  const anglesToTest = [
    totalHeadAngle,
    totalHeadAngle - 0.38, // Raggio cono sinistro (~22°)
    totalHeadAngle + 0.38  // Raggio cono destro (~22°)
  ];
  let minDist = 2.0;

  for (const testAngle of anglesToTest) {
    for (let r = 10; r < 320; r += 5) {
      const rx = robotState.x + Math.cos(testAngle) * r;
      const ry = robotState.y + Math.sin(testAngle) * r;

      if (rx < 15 || rx > arenaCanvas.width - 15 || ry < 15 || ry > arenaCanvas.height - 15) {
        minDist = Math.min(minDist, r / 160.0);
        break;
      }
      for (const w of arenaObjects.walls) {
        if (rx >= w.x && rx <= w.x + w.w && ry >= w.y && ry <= w.y + w.h) {
          minDist = Math.min(minDist, r / 160.0);
          break;
        }
      }
    }
  }
  robotState.ultrasonicDist = Math.max(0.05, minDist);

  // 3. Calcolo Posizione dei 3 Sensori IR (Sulla parte frontale del robot)
  updateIRSensors();

  // 4. ESECUZIONE COMPORTAMENTI AUTONOMI SIMULATI
  executeAutonomousBehaviors();

  // 5. Effetto Luci Polizia Stroboscopiche
  if (robotState.policeActive || robotState.activeMode === 'police') {
    robotState.policeState = (robotState.policeState + 1) % 12;
    if (robotState.policeState < 6) {
      robotState.ledColor = '#ff0055'; // Rosso lampeggiante
    } else {
      robotState.ledColor = '#00f0ff'; // Blu lampeggiante
    }
  } else {
    robotState.ledColor = '#00f5d4';
  }

  updateTelemetryUI();
}

function updateIRSensors() {
  const frontDist = 20; // offset frontale dal centro robot
  const sensorWidth = 10; // offset laterale sensori sinistro e destro

  const cosA = Math.cos(robotState.angle);
  const sinA = Math.sin(robotState.angle);

  // Sensore Centro
  const cx = robotState.x + cosA * frontDist;
  const cy = robotState.y + sinA * frontDist;

  // Sensore Sinistro
  const lx = robotState.x + cosA * frontDist - sinA * sensorWidth;
  const ly = robotState.y + sinA * frontDist + cosA * sensorWidth;

  // Sensore Destro
  const rx = robotState.x + cosA * frontDist + sinA * sensorWidth;
  const ry = robotState.y + sinA * frontDist - cosA * sensorWidth;

  robotState.irSensors[0] = isPointOnLineTrack(lx, ly) ? 0 : 1; // Left (0=Nero)
  robotState.irSensors[1] = isPointOnLineTrack(cx, cy) ? 0 : 1; // Center (0=Nero)
  robotState.irSensors[2] = isPointOnLineTrack(rx, ry) ? 0 : 1; // Right (0=Nero)
}

function isPointOnLineTrack(x, y) {
  const pts = arenaObjects.lineTrack;
  const trackRadius = 15;

  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    
    const A = x - p1.x;
    const B = y - p1.y;
    const C = p2.x - p1.x;
    const D = p2.y - p1.y;

    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq !== 0) param = dot / len_sq;

    let xx, yy;
    if (param < 0) { xx = p1.x; yy = p1.y; }
    else if (param > 1) { xx = p2.x; yy = p2.y; }
    else { xx = p1.x + param * C; yy = p1.y + param * D; }

    const dx = x - xx;
    const dy = y - yy;
    if (Math.sqrt(dx * dx + dy * dy) <= trackRadius) return true;
  }
  return false;
}

function executeAutonomousBehaviors() {
  const mode = robotState.activeMode;

  if (mode === 'automatic') {
    // 1. Quando la strada è libera (≥ 35 cm), la testa rimane bloccata DRITTA (0°) per evitare punti ciechi
    if (robotState.ultrasonicDist >= 0.35) {
      robotState.panAngle = 0;
      robotState.speed = 2.2;
      robotState.steering = 0;
    } else {
      // 2. Ostacolo rilevato di fronte (< 35 cm): Frena, orienta la testa per valutare gli spazi e sterza
      robotState.speed = -0.5; // Retromarcia di sicurezza
      
      robotState.panAngle += robotState.panSweepDir;
      if (robotState.panAngle > 40) robotState.panSweepDir = -3.5;
      if (robotState.panAngle < -40) robotState.panSweepDir = 3.5;

      // Sterza nella direzione dove la testa trova via libera
      if (robotState.panAngle > 0) {
        robotState.angle += 0.09; // Sterza a destra
      } else {
        robotState.angle -= 0.09; // Sterza a sinistra
      }
    }
  }
  else if (mode === 'findColor') {
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
  else if (mode === 'trackLine') {
    const [left, center, right] = robotState.irSensors;
    robotState.panAngle = 0;

    if (center === 0) {
      robotState.speed = 2.2;
      robotState.steering = 0;
    } else if (left === 0) {
      robotState.speed = 1.6;
      robotState.steering = -0.06;
    } else if (right === 0) {
      robotState.speed = 1.6;
      robotState.steering = 0.06;
    } else {
      robotState.speed = 0.5;
      robotState.steering = 0.05;
    }
  }
  else if (mode === 'keepDistance') {
    robotState.panAngle = 0;
    if (robotState.ultrasonicDist > 0.40) {
      robotState.speed = 1.8;
    } else if (robotState.ultrasonicDist < 0.25) {
      robotState.speed = -1.5;
    } else {
      robotState.speed = 0;
    }
  }
  else if (mode === 'trackLight') {
    const light = arenaObjects.lightSource;
    const dx = light.x - robotState.x;
    const dy = light.y - robotState.y;
    const distToLight = Math.hypot(dx, dy);
    const targetAngle = Math.atan2(dy, dx);
    let diffAngle = targetAngle - robotState.angle;

    while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
    while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;

    // Protezione per angoli ciechi: se un ostacolo o una parete blocca il cammino (< 0.35m), devia per schivare il muro
    if (robotState.ultrasonicDist < 0.35) {
      robotState.speed = -0.6;
      robotState.angle += 0.14; // devia per disincastrarsi dall'angolo cieco
    } else if (distToLight > 60) {
      robotState.steering = diffAngle * 0.08;
      robotState.speed = Math.min(2.0, distToLight * 0.02);
    } else {
      robotState.speed = 0; // Sorgente luminosa raggiunta
      robotState.steering = 0;
    }
  }
}

function updateTelemetryUI() {
  const speedEl = document.getElementById('teleSpeed');
  const headingEl = document.getElementById('teleHeading');
  const panEl = document.getElementById('telePan');
  const distEl = document.getElementById('teleDist');

  if (speedEl) speedEl.innerText = `${Math.round(robotState.speed * 25)} %`;
  if (headingEl) headingEl.innerText = `${Math.round((robotState.angle * 180 / Math.PI) % 360)}°`;
  if (panEl) panEl.innerText = `${Math.round(robotState.panAngle)}°`;
  if (distEl) distEl.innerText = `${(robotState.ultrasonicDist * 100).toFixed(1)} cm`;
}
