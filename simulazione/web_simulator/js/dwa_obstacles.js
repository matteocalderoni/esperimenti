// simulazione/web_simulator/js/dwa_obstacles.js
// Modello degli Ostacoli Locali ricavato dalle Sonde di Prossimita'
//
// Trasforma le nove sonde in una nuvola di punti nel riferimento dell'arena,
// che il DWA usa per misurare il margine delle traiettorie candidate.

// Portata oltre la quale la sonda non ha visto nulla (px).
var DWA_PROBE_RANGE_PX = 315;

/** Punto d'eco di una sonda, nel riferimento dell'arena. */
function dwaProbePoint(p) {
  var dPx = p.dist * 160;
  if (dPx >= DWA_PROBE_RANGE_PX) return null;   // nessun eco: fuori portata
  var a = robotState.angle + p.relRad;
  var ox = (p.ox !== undefined) ? p.ox : robotState.x;
  var oy = (p.oy !== undefined) ? p.oy : robotState.y;
  return { x: ox + Math.cos(a) * dPx, y: oy + Math.sin(a) * dPx };
}

/**
 * Sonde di prossimita' -> punti ostacolo.
 * Fra due sonde adiacenti che vedono entrambe qualcosa viene interpolata la
 * superficie: nove punti isolati lascerebbero varchi in cui una traiettoria
 * stretta si infila pur passando attraverso un muro continuo.
 */
function dwaObstaclePoints() {
  var pts = [], probes = robotState.proximityProbes || [];
  var precedente = null;
  for (var i = 0; i < probes.length; i++) {
    var punto = dwaProbePoint(probes[i]);
    if (punto) {
      if (precedente) {
        for (var k = 1; k <= 2; k++) {
          var t = k / 3;
          pts.push({ x: precedente.x + (punto.x - precedente.x) * t,
                     y: precedente.y + (punto.y - precedente.y) * t });
        }
      }
      pts.push(punto);
    }
    precedente = punto;
  }
  return pts;
}

