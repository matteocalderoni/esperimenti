// simulazione/web_simulator/js/slam/slam_clusters.js
// Rilevamento Geometrico degli Ingombri Interni ed Arredi a Parete da Quotare

var SLAM_CLUSTER_MIN_CELLS = 5;

function findSlamClusters(includePerimeter) {
  if (!slamMap || !slamMap.grid) return [];
  var H = slamMap.height, W = slamMap.width;

  // 1. Calcola i margini perimetrali esterni della stanza (involucro esterno)
  var pMinX = 999, pMaxX = -1, pMinY = 999, pMaxY = -1;
  for (var y = 0; y < H; y++) {
    for (var x = 0; x < W; x++) {
      if (slamMap.grid[y][x] === 1) {
        if (x < pMinX) pMinX = x; if (x > pMaxX) pMaxX = x;
        if (y < pMinY) pMinY = y; if (y > pMaxY) pMaxY = y;
      }
    }
  }
  if (pMaxX < 0) return [];

  var visto = [];
  for (var i = 0; i < H; i++) visto.push(new Array(W).fill(false));
  var blocchi = [];

  for (var y = 0; y < H; y++) {
    for (var x = 0; x < W; x++) {
      if (slamMap.grid[y][x] !== 1 || visto[y][x]) continue;

      var coda = [{ x: x, y: y }], qi = 0, celle = 0;
      var minX = x, maxX = x, minY = y, maxY = y;
      var touchesOuterShell = false;
      visto[y][x] = true;

      while (qi < coda.length) {
        var c = coda[qi++];
        celle++;
        // Verifica se la cella fa parte della parete sottile di bordo dell'involucro esterno
        if (c.x <= pMinX + 1 || c.x >= pMaxX - 1 || c.y <= pMinY + 1 || c.y >= pMaxY - 1) {
          touchesOuterShell = true;
        }
        if (c.x < minX) minX = c.x; if (c.x > maxX) maxX = c.x;
        if (c.y < minY) minY = c.y; if (c.y > maxY) maxY = c.y;

        var vicini = [{x:c.x+1,y:c.y},{x:c.x-1,y:c.y},{x:c.x,y:c.y+1},{x:c.x,y:c.y-1}];
        for (var k = 0; k < vicini.length; k++) {
          var n = vicini[k];
          if (n.x < 0 || n.x >= W || n.y < 0 || n.y >= H) continue;
          if (visto[n.y][n.x] || slamMap.grid[n.y][n.x] !== 1) continue;
          visto[n.y][n.x] = true;
          coda.push(n);
        }
      }

      if (celle < SLAM_CLUSTER_MIN_CELLS) continue;

      // Se e' un arredo isolato oppure sporge per piu' di 2 celle verso l'interno dalla parete
      var spanX = maxX - minX + 1, spanY = maxY - minY + 1;
      var isWallProtrusion = touchesOuterShell && (spanX >= 3 || spanY >= 3);

      if (!touchesOuterShell || includePerimeter || isWallProtrusion) {
        blocchi.push({
          minX: minX, maxX: maxX, minY: minY, maxY: maxY, celle: celle,
          larghezzaM: slamSpanMeters(spanX, 'x'),
          profonditaM: slamSpanMeters(spanY, 'y'),
          isWallAttached: touchesOuterShell
        });
      }
    }
  }
  return blocchi;
}
