// simulazione/web_simulator/js/sensors.js
// Emulazione dei Sensori (Array di Prossimita' + Ultrasuoni su testa + Infrarossi IR)
//
// Le tre distanze hanno significati distinti e NON vanno collassate in un minimo
// unico: frontDist decide se frenare, leftDist/rightDist decidono da che parte
// scansare, ultrasonicDist e' il singolo HC-SR04 montato sulla testa pan-tilt.

// Semiapertura del cono considerato "frontale" (gradi).
const FRONT_CONE_DEG = 20;

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

  // Sonde sul telaio
  const fcX = robotState.x + cosA * 22, fcY = robotState.y + sinA * 22;
  const flX = robotState.x + cosA * 20 - sinA * 15, flY = robotState.y + sinA * 20 + cosA * 15;
  const frX = robotState.x + cosA * 20 + sinA * 15, frY = robotState.y + sinA * 20 - cosA * 15;

  // 9 sonde angolari per il Campo di Potenziale Artificiale (APF)
  const probeAnglesDeg = [-75, -50, -30, -15, 0, 15, 30, 50, 75];
  const probes = [];
  let minLeft = 2.0, minRight = 2.0, minFront = 2.0;

  for (let i = 0; i < probeAnglesDeg.length; i++) {
    const relDeg = probeAnglesDeg[i];
    const relRad = relDeg * Math.PI / 180;
    const absAngle = robotState.angle + relRad;

    let ox = fcX, oy = fcY;
    if (relDeg < -20) { ox = flX; oy = flY; }
    else if (relDeg > 20) { ox = frX; oy = frY; }

    const dist = castRayFrom(ox, oy, absAngle);
    probes.push({ relRad, relDeg, dist, ox, oy });   // origine: serve al DWA per posizionare l'ostacolo

    if (relDeg < -FRONT_CONE_DEG) minLeft = Math.min(minLeft, dist);
    else if (relDeg > FRONT_CONE_DEG) minRight = Math.min(minRight, dist);
    else minFront = Math.min(minFront, dist);
  }

  // Ultrasuoni reale: un solo sensore, punta dove punta la testa pan-tilt.
  const panDist = castRayFrom(fcX, fcY, headAngle);

  robotState.proximityProbes = probes;
  robotState.leftDist = minLeft;
  robotState.rightDist = minRight;
  robotState.frontDist = Math.max(0.05, minFront);
  robotState.ultrasonicDist = Math.max(0.05, panDist);

  updateIRSensors();
}

function updateIRSensors() {
  const frontDist = 20, sensorWidth = 10;
  const cosA = Math.cos(robotState.angle), sinA = Math.sin(robotState.angle);

  const cx = robotState.x + cosA * frontDist, cy = robotState.y + sinA * frontDist;
  const lx = robotState.x + cosA * frontDist - sinA * sensorWidth, ly = robotState.y + sinA * frontDist + cosA * sensorWidth;
  const rx = robotState.x + cosA * frontDist + sinA * sensorWidth, ry = robotState.y + sinA * frontDist - cosA * sensorWidth;

  robotState.irSensors[0] = isPointOnLineTrack(lx, ly) ? 0 : 1;
  robotState.irSensors[1] = isPointOnLineTrack(cx, cy) ? 0 : 1;
  robotState.irSensors[2] = isPointOnLineTrack(rx, ry) ? 0 : 1;
}

function isPointOnLineTrack(x, y) {
  const pts = arenaObjects.lineTrack, trackRadius = 15;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i], p2 = pts[(i + 1) % pts.length];
    const A = x - p1.x, B = y - p1.y, C = p2.x - p1.x, D = p2.y - p1.y;
    const dot = A * C + B * D, len_sq = C * C + D * D;
    let param = len_sq !== 0 ? dot / len_sq : -1;
    let xx, yy;
    if (param < 0) { xx = p1.x; yy = p1.y; }
    else if (param > 1) { xx = p2.x; yy = p2.y; }
    else { xx = p1.x + param * C; yy = p1.y + param * D; }
    if (Math.hypot(x - xx, y - yy) <= trackRadius) return true;
  }
  return false;
}
