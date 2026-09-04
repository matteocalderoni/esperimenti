// simulazione/web_simulator/js/raycasting_sensor.js
// Simulatore Raycasting per Sensore Ultrasuoni — usa dimensioni canvas dinamiche

function castSingleRay(startX, startY, angleRad, maxDistance) {
  if (maxDistance === undefined) maxDistance = 1050;
  const W = (typeof arenaCanvas !== 'undefined' && arenaCanvas && arenaCanvas.width)  ? arenaCanvas.width  : 2100;
  const H = (typeof arenaCanvas !== 'undefined' && arenaCanvas && arenaCanvas.height) ? arenaCanvas.height : 1560;
  const step = 4;

  for (var r = 10; r < maxDistance; r += step) {
    var rx = startX + Math.cos(angleRad) * r;
    var ry = startY + Math.sin(angleRad) * r;

    // Bordi arena dinamici (bordo muro reale = 12 px)
    if (rx < 12 || rx > W - 12 || ry < 12 || ry > H - 12) {
      return { dist: r / 160.0, hitX: rx, hitY: ry, hit: true };
    }

    // Muri interni
    for (var wi = 0; wi < arenaObjects.walls.length; wi++) {
      var w = arenaObjects.walls[wi];
      if (rx >= w.x && rx <= w.x + w.w && ry >= w.y && ry <= w.y + w.h) {
        return { dist: r / 160.0, hitX: rx, hitY: ry, hit: true };
      }
    }
  }

  var endX = startX + Math.cos(angleRad) * maxDistance;
  var endY = startY + Math.sin(angleRad) * maxDistance;
  return { dist: maxDistance / 160.0, hitX: endX, hitY: endY, hit: false };
}

// Scansione radar a 5 scatti discreti
function performRadarScan(anglesDeg) {
  if (!anglesDeg) anglesDeg = [-60, -30, 0, 30, 60];
  var results = [];
  for (var i = 0; i < anglesDeg.length; i++) {
    var totalAngle = robotState.angle + (anglesDeg[i] * Math.PI / 180);
    var ray = castSingleRay(robotState.x, robotState.y, totalAngle);
    results.push({
      relAngleDeg: anglesDeg[i],
      distMeters: Math.round(ray.dist * 100) / 100,
      hitPoint: { x: Math.round(ray.hitX), y: Math.round(ray.hitY) }
    });
  }
  return results;
}
