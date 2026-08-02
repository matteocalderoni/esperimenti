// simulazione/web_simulator/js/physics.js

function updatePhysics() {
  // 1. Aggiornamento posizione veicolo
  robotState.angle += robotState.steering;
  robotState.x += Math.cos(robotState.angle) * robotState.speed;
  robotState.y += Math.sin(robotState.angle) * robotState.speed;

  // Limiti Arena
  const margin = 30;
  if (robotState.x < margin) { robotState.x = margin; robotState.speed = 0; }
  if (robotState.x > arenaCanvas.width - margin) { robotState.x = arenaCanvas.width - margin; robotState.speed = 0; }
  if (robotState.y < margin) { robotState.y = margin; robotState.speed = 0; }
  if (robotState.y > arenaCanvas.height - margin) { robotState.y = arenaCanvas.height - margin; robotState.speed = 0; }

  // 2. Calcolo distanza ultrasuoni col Raycasting
  const totalHeadAngle = robotState.angle + (robotState.panAngle * Math.PI / 180);
  let minDist = 2.0;
  const rayMaxDist = 320;

  for (let r = 10; r < rayMaxDist; r += 5) {
    const rx = robotState.x + Math.cos(totalHeadAngle) * r;
    const ry = robotState.y + Math.sin(totalHeadAngle) * r;

    if (rx < 10 || rx > arenaCanvas.width - 10 || ry < 10 || ry > arenaCanvas.height - 10) {
      minDist = r / 160.0;
      break;
    }
    for (const w of arenaObjects.walls) {
      if (rx >= w.x && rx <= w.x + w.w && ry >= w.y && ry <= w.y + w.h) {
        minDist = r / 160.0;
        break;
      }
    }
    if (minDist < 2.0) break;
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
    robotState.panAngle += robotState.panSweepDir;
    if (robotState.panAngle > 45) robotState.panSweepDir = -2.5;
    if (robotState.panAngle < -45) robotState.panSweepDir = 2.5;

    if (robotState.ultrasonicDist < 0.35) {
      robotState.speed = -0.8;
      robotState.angle += 0.1;
    } else {
      robotState.speed = 2.2;
      robotState.steering = 0;
    }
  }
  else if (mode === 'findColor') {
    const ball = arenaObjects.targetBall;
    const dx = ball.x - robotState.x;
    const dy = ball.y - robotState.y;
    const targetAngle = Math.atan2(dy, dx);
    let diffAngle = (targetAngle - robotState.angle) * 180 / Math.PI;

    while (diffAngle < -180) diffAngle += 360;
    while (diffAngle > 180) diffAngle -= 360;

    const desiredPan = Math.max(-75, Math.min(75, diffAngle));
    robotState.panAngle += (desiredPan - robotState.panAngle) * 0.15;
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
    const targetAngle = Math.atan2(dy, dx);
    let diffAngle = targetAngle - robotState.angle;

    while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
    while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;

    robotState.steering = diffAngle * 0.1;
    robotState.speed = 2.0;
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
