// simulazione/web_simulator/js/sensors.js
// Emulazione dei Sensori (Ultrasuoni HC-SR04 ed Infrarossi IR Seguipista)

function updateSensors() {
  const cosA = Math.cos(robotState.angle);
  const sinA = Math.sin(robotState.angle);
  const headAngle = robotState.angle + (robotState.panAngle * Math.PI / 180);

  function castRayFrom(ox, oy, angle, maxDist = 320) {
    const W = arenaCanvas ? arenaCanvas.width : 700;
    const H = arenaCanvas ? arenaCanvas.height : 520;
    for (let r = 5; r < maxDist; r += 4) {
      const rx = ox + Math.cos(angle) * r;
      const ry = oy + Math.sin(angle) * r;
      if (rx < 12 || rx > W - 12 || ry < 12 || ry > H - 12) {
        return r / 160.0;
      }
      for (let i = 0; i < arenaObjects.walls.length; i++) {
        const w = arenaObjects.walls[i];
        if (rx >= w.x && rx <= w.x + w.w && ry >= w.y && ry <= w.y + w.h) {
          return r / 160.0;
        }
      }
    }
    return maxDist / 160.0;
  }

  // Sonde paraurti: Centro (+22px), Spigolo Sinistro (+20px, -15px), Spigolo Destro (+20px, +15px)
  const fcX = robotState.x + cosA * 22, fcY = robotState.y + sinA * 22;
  const flX = robotState.x + cosA * 20 - sinA * 15, flY = robotState.y + sinA * 20 + cosA * 15;
  const frX = robotState.x + cosA * 20 + sinA * 15, frY = robotState.y + sinA * 20 - cosA * 15;

  // Proiezioni multi-raggio per coprire tutta la larghezza del muso e gli angoli laterali
  const centerD = Math.min(castRayFrom(fcX, fcY, headAngle), castRayFrom(fcX, fcY, robotState.angle));
  const leftD   = Math.min(castRayFrom(flX, flY, robotState.angle), castRayFrom(flX, flY, robotState.angle - 0.35), castRayFrom(flX, flY, robotState.angle - 0.70));
  const rightD  = Math.min(castRayFrom(frX, frY, robotState.angle), castRayFrom(frX, frY, robotState.angle + 0.35), castRayFrom(frX, frY, robotState.angle + 0.70));

  robotState.leftDist  = leftD;
  robotState.rightDist = rightD;
  robotState.frontDist = centerD;
  robotState.ultrasonicDist = Math.max(0.05, Math.min(centerD, leftD, rightD));

  updateIRSensors();
}

function updateIRSensors() {
  const frontDist = 20;   // offset frontale dal centro robot
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

  robotState.irSensors[0] = isPointOnLineTrack(lx, ly) ? 0 : 1; // Left (0 = Nero)
  robotState.irSensors[1] = isPointOnLineTrack(cx, cy) ? 0 : 1; // Center (0 = Nero)
  robotState.irSensors[2] = isPointOnLineTrack(rx, ry) ? 0 : 1; // Right (0 = Nero)
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
