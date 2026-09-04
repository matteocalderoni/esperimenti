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

      // Se e' un arredo isolato oppure sporge verso l'interno dalla parete (ma non e' il perimetro completo)
      var spanX = maxX - minX + 1, spanY = maxY - minY + 1;
      var isOuterPerimeter = spanX >= Math.floor(W * 0.6) && spanY >= Math.floor(H * 0.6);

      // Calcola la profondita' di penetrazione verso l'interno della stanza dalle pareti esterne
      var depthTop = (minY <= pMinY + 2) ? (maxY - pMinY + 1) : 0;
      var depthBottom = (maxY >= pMaxY - 2) ? (pMaxY - minY + 1) : 0;
      var depthLeft = (minX <= pMinX + 2) ? (maxX - pMinX + 1) : 0;
      var depthRight = (maxX >= pMaxX - 2) ? (pMaxX - minX + 1) : 0;
      var maxWallDepth = Math.max(depthTop, depthBottom, depthLeft, depthRight);

      // Un accumulo a parete e' una sporgenza di arredo reale SOLO SE la sua profondita' verso l'interno e' >= 3 celle
      var isWallProtrusion = touchesOuterShell && !isOuterPerimeter && (maxWallDepth >= 3);

      if (!touchesOuterShell || (includePerimeter && !isOuterPerimeter) || isWallProtrusion) {
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

function stitchPerimeterWallGaps(mapObj) {
  if (!mapObj) mapObj = (typeof slamMap !== 'undefined') ? slamMap : null;
  if (!mapObj || !mapObj.grid) return;
  var H = mapObj.height, W = mapObj.width;
  var grid = mapObj.grid;

  // Cucitura orizzontale lungo le pareti superiore/inferiore
  [0, 1, 2, H - 3, H - 2, H - 1].forEach(function(y) {
    if (y < 0 || y >= H) return;
    var gapStart = -1;
    for (var x = 0; x < W; x++) {
      if (grid[y][x] === 1) {
        if (gapStart !== -1 && (x - gapStart - 1) >= 1 && (x - gapStart - 1) <= 4) {
          for (var gx = gapStart + 1; gx < x; gx++) {
            if (grid[y][gx] === -1) {
              grid[y][gx] = 1;
              if (mapObj.logOddsGrid && mapObj.logOddsGrid[y]) mapObj.logOddsGrid[y][gx] = 2.0;
            }
          }
        }
        gapStart = x;
      } else if (grid[y][x] === 0) {
        gapStart = -1;
      }
    }
  });

  // Cucitura verticale lungo le pareti sinistra/destra
  [0, 1, 2, W - 3, W - 2, W - 1].forEach(function(x) {
    if (x < 0 || x >= W) return;
    var gapStart = -1;
    for (var y = 0; y < H; y++) {
      if (grid[y][x] === 1) {
        if (gapStart !== -1 && (y - gapStart - 1) >= 1 && (y - gapStart - 1) <= 4) {
          for (var gy = gapStart + 1; gy < y; gy++) {
            if (grid[gy][x] === -1) {
              grid[gy][x] = 1;
              if (mapObj.logOddsGrid && mapObj.logOddsGrid[gy]) mapObj.logOddsGrid[gy][x] = 2.0;
            }
          }
        }
        gapStart = y;
      } else if (grid[gy] && grid[gy][x] === 0) {
        gapStart = -1;
      }
    }
  });
}

function solidifyClusterInteriors(mapObj) {
  if (!mapObj) mapObj = (typeof slamMap !== 'undefined') ? slamMap : null;
  if (!mapObj || !mapObj.grid) return;
  stitchPerimeterWallGaps(mapObj);
  var clusters = findSlamClusters(true);
  var maxSpanX = Math.floor(mapObj.width * 0.6);
  var maxSpanY = Math.floor(mapObj.height * 0.6);

  clusters.forEach(function(c) {
    var spanX = c.maxX - c.minX + 1;
    var spanY = c.maxY - c.minY + 1;
    // Ignora l'involucro perimetrale esterno della stanza che abbraccia l'intera mappa
    if (spanX >= maxSpanX && spanY >= maxSpanY) return;

    if (c.celle >= 5 && spanX >= 2 && spanY >= 2) {
      for (var gy = c.minY; gy <= c.maxY; gy++) {
        for (var gx = c.minX; gx <= c.maxX; gx++) {
          if (gy >= 0 && gy < mapObj.height && gx >= 0 && gx < mapObj.width) {
            // Riempi solo se non e' gia' stato confermato spazio libero (0) da raycast sonari
            if (mapObj.grid[gy][gx] === -1) {
              mapObj.grid[gy][gx] = 1;
              if (mapObj.logOddsGrid && mapObj.logOddsGrid[gy]) {
                mapObj.logOddsGrid[gy][gx] = Math.max(2.5, mapObj.logOddsGrid[gy][gx]);
              }
            }
          }
        }
      }
    }
  });
}
