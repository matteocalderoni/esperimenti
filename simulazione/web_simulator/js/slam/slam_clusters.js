// simulazione/web_simulator/js/slam/slam_clusters.js
// Rilevamento Geometrico degli Ingombri Interni da Quotare
//
// Il VLM da' il nome dell'arredo, non la sua geometria: senza VLM la piantina
// restava priva di quote sui singoli elementi. Qui gli ingombri si ricavano
// dalla sola griglia, come componenti connesse di celle occupate che non
// toccano il perimetro del rilievo.

// Sotto questa soglia una macchia di celle e' rumore di scansione, non un mobile.
var SLAM_CLUSTER_MIN_CELLS = 6;

/**
 * Ingombri interni presenti nella mappa, con quote in metri.
 * @returns {Array<{minX,maxX,minY,maxY,celle,larghezzaM,profonditaM}>}
 */
function findSlamClusters() {
  if (!slamMap || !slamMap.grid) return [];
  var H = slamMap.height, W = slamMap.width;
  var visto = [];
  for (var i = 0; i < H; i++) visto.push(new Array(W).fill(false));

  var blocchi = [];
  for (var y = 0; y < H; y++) {
    for (var x = 0; x < W; x++) {
      if (slamMap.grid[y][x] !== 1 || visto[y][x]) continue;

      var coda = [{ x: x, y: y }], qi = 0, celle = 0;
      var minX = x, maxX = x, minY = y, maxY = y, tocca = false;
      visto[y][x] = true;

      while (qi < coda.length) {
        var c = coda[qi++];
        celle++;
        if (c.x === 0 || c.y === 0 || c.x === W - 1 || c.y === H - 1) tocca = true;
        if (c.x < minX) minX = c.x;
        if (c.x > maxX) maxX = c.x;
        if (c.y < minY) minY = c.y;
        if (c.y > maxY) maxY = c.y;

        var vicini = [{x:c.x+1,y:c.y},{x:c.x-1,y:c.y},{x:c.x,y:c.y+1},{x:c.x,y:c.y-1}];
        for (var k = 0; k < vicini.length; k++) {
          var n = vicini[k];
          if (n.x < 0 || n.x >= W || n.y < 0 || n.y >= H) continue;
          if (visto[n.y][n.x] || slamMap.grid[n.y][n.x] !== 1) continue;
          visto[n.y][n.x] = true;
          coda.push(n);
        }
      }

      // Il perimetro del rilievo e' muratura, non un arredo da quotare.
      if (tocca || celle < SLAM_CLUSTER_MIN_CELLS) continue;

      blocchi.push({
        minX: minX, maxX: maxX, minY: minY, maxY: maxY, celle: celle,
        larghezzaM: slamSpanMeters(maxX - minX + 1, 'x'),
        profonditaM: slamSpanMeters(maxY - minY + 1, 'y')
      });
    }
  }
  return blocchi;
}
