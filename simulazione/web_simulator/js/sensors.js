// simulazione/web_simulator/js/sensors.js
// Emulazione dei Sensori (Ultrasuoni HC-SR04 ed Infrarossi IR Seguipista)

function updateSensors() {
  // 1. Calcolo cono di rilevamento ultrasuoni (Multi-Ray Cone Sensing: Raggio Centro 0°, Sinistra -22°, Destra +22°)
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

  // 2. Calcolo Posizione dei 3 Sensori IR sulla parte frontale inferiore
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
