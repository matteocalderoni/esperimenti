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

  function isPureOuterShell(x, y) {
    return (x <= pMinX + 1 || x >= pMaxX - 1 || y <= pMinY + 1 || y >= pMaxY - 1);
  }

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
        if (isPureOuterShell(c.x, c.y)) {
          touchesOuterShell = true;
        }
        if (c.x < minX) minX = c.x; if (c.x > maxX) maxX = c.x;
        if (c.y < minY) minY = c.y; if (c.y > maxY) maxY = c.y;

        var vicini = [{x:c.x+1,y:c.y},{x:c.x-1,y:c.y},{x:c.x,y:c.y+1},{x:c.x,y:c.y-1}];
        for (var k = 0; k < vicini.length; k++) {
          var n = vicini[k];
          if (n.x < 0 || n.x >= W || n.y < 0 || n.y >= H) continue;
          if (visto[n.y][n.x] || slamMap.grid[n.y][n.x] !== 1) continue;

          // Non propagare il flood-fill lungo il filo sottile del muro perimetrale per non fondere gli arredi a parete
          if (isPureOuterShell(c.x, c.y) && isPureOuterShell(n.x, n.y)) {
            // Se entrambi i punti sono nel guscio esterno, blocca il passo lungo il margine della parete
            continue;
          }

          visto[n.y][n.x] = true;
          coda.push(n);
        }
      }

      if (celle < SLAM_CLUSTER_MIN_CELLS) continue;

      var spanX = maxX - minX + 1, spanY = maxY - minY + 1;
      var isOuterPerimeter = spanX >= Math.floor(W * 0.6) && spanY >= Math.floor(H * 0.6);

      var depthTop = (minY <= pMinY + 2) ? (maxY - pMinY + 1) : 0;
      var depthBottom = (maxY >= pMaxY - 2) ? (pMaxY - minY + 1) : 0;
      var depthLeft = (minX <= pMinX + 2) ? (maxX - pMinX + 1) : 0;
      var depthRight = (maxX >= pMaxX - 2) ? (pMaxX - minX + 1) : 0;
      var maxWallDepth = Math.max(depthTop, depthBottom, depthLeft, depthRight);

      var effMinX = minX, effMaxX = maxX, effMinY = minY, effMaxY = maxY;

      // Rilevamento avanzato arredo a parete:
      // Un arredo è addossato alla parete se la sua faccia posteriore è orientata verso il perimetro
      // ad una distanza compatibile con la profondità standard (fino a 11 celle = ~2m)
      // e non presenta corridoi di spazio libero confermato (grid === 0) alle sue spalle.
      var isBackedToWall = false;
      var MAX_WALL_ATTACH_CELLS = 11;

      var distW = minX - pMinX;
      var distE = pMaxX - maxX;
      var distN = minY - pMinY;
      var distS = pMaxY - maxY;
      var minDist = Math.min(distW, distE, distN, distS);

      if (minDist <= MAX_WALL_ATTACH_CELLS) {
        // Parete OVEST: prioritaria solo se è la parete più vicina
        if (distW <= minDist + 2 && distW <= MAX_WALL_ATTACH_CELLS && distW > 0) {
          var freeCountW = 0, totalCountW = 0;
          for (var cy = minY; cy <= maxY; cy++) {
            for (var cx = pMinX; cx < minX; cx++) {
              totalCountW++;
              if (slamMap.grid[cy] && slamMap.grid[cy][cx] === 0) freeCountW++;
            }
          }
          if (totalCountW > 0 && (freeCountW / totalCountW < 0.15 || distW <= 2)) {
            effMinX = Math.max(1, pMinX);
            touchesOuterShell = true;
            isBackedToWall = true;
          }
        }

        // Parete EST
        if (distE <= minDist + 2 && distE <= MAX_WALL_ATTACH_CELLS && distE > 0) {
          var freeCountE = 0, totalCountE = 0;
          for (var cy = minY; cy <= maxY; cy++) {
            for (var cx = maxX + 1; cx <= pMaxX; cx++) {
              totalCountE++;
              if (slamMap.grid[cy] && slamMap.grid[cy][cx] === 0) freeCountE++;
            }
          }
          if (totalCountE > 0 && (freeCountE / totalCountE < 0.15 || distE <= 2)) {
            effMaxX = Math.min(W - 2, pMaxX);
            touchesOuterShell = true;
            isBackedToWall = true;
          }
        }

        // Parete NORD
        if (distN <= minDist + 2 && distN <= MAX_WALL_ATTACH_CELLS && distN > 0) {
          var freeCountN = 0, totalCountN = 0;
          for (var cx = minX; cx <= maxX; cx++) {
            for (var cy = pMinY; cy < minY; cy++) {
              totalCountN++;
              if (slamMap.grid[cy] && slamMap.grid[cy][cx] === 0) freeCountN++;
            }
          }
          if (totalCountN > 0 && (freeCountN / totalCountN < 0.15 || distN <= 2)) {
            effMinY = Math.max(1, pMinY);
            touchesOuterShell = true;
            isBackedToWall = true;
          }
        }

        // Parete SUD
        if (distS <= minDist + 2 && distS <= MAX_WALL_ATTACH_CELLS && distS > 0) {
          var freeCountS = 0, totalCountS = 0;
          for (var cx = minX; cx <= maxX; cx++) {
            for (var cy = maxY + 1; cy <= pMaxY; cy++) {
              totalCountS++;
              if (slamMap.grid[cy] && slamMap.grid[cy][cx] === 0) freeCountS++;
            }
          }
          if (totalCountS > 0 && (freeCountS / totalCountS < 0.15 || distS <= 2)) {
            effMaxY = Math.min(H - 2, pMaxY);
            touchesOuterShell = true;
            isBackedToWall = true;
          }
        }
      }

      var isWallProtrusion = touchesOuterShell && !isOuterPerimeter && (maxWallDepth >= 2 || isBackedToWall);

      if (!touchesOuterShell || (includePerimeter && !isOuterPerimeter) || isWallProtrusion || isBackedToWall) {
        if (touchesOuterShell) {
          if (effMinX <= pMinX + 2) effMinX = Math.max(1, pMinX);
          if (effMaxX >= pMaxX - 2) effMaxX = Math.min(W - 2, pMaxX);
          if (effMinY <= pMinY + 2) effMinY = Math.max(1, pMinY);
          if (effMaxY >= pMaxY - 2) effMaxY = Math.min(H - 2, pMaxY);
        }
        var effSpanX = effMaxX - effMinX + 1, effSpanY = effMaxY - effMinY + 1;
        var wallSides = [];
        if (effMinX <= pMinX + 2) wallSides.push('west');
        if (effMaxX >= pMaxX - 2) wallSides.push('east');
        if (effMinY <= pMinY + 2) wallSides.push('north');
        if (effMaxY >= pMaxY - 2) wallSides.push('south');

        blocchi.push({
          minX: effMinX, maxX: effMaxX, minY: effMinY, maxY: effMaxY, celle: celle,
          effMinX: effMinX, effMaxX: effMaxX, effMinY: effMinY, effMaxY: effMaxY,
          larghezzaM: slamSpanMeters(effSpanX, 'x'),
          profonditaM: slamSpanMeters(effSpanY, 'y'),
          isWallAttached: (touchesOuterShell || isBackedToWall),
          wallSides: wallSides
        });
      }
    }
  }
  return mergeNearbyClusters(blocchi, 3);
}

function mergeNearbyClusters(clusters, maxGapCells) {
  if (!clusters || clusters.length <= 1) return clusters;
  if (typeof maxGapCells !== 'number') maxGapCells = 4;

  var merged = true;
  var list = clusters.slice();

  while (merged) {
    merged = false;
    for (var i = 0; i < list.length; i++) {
      for (var j = i + 1; j < list.length; j++) {
        var c1 = list[i], c2 = list[j];

        var dx = 0;
        if (c1.maxX < c2.minX) dx = c2.minX - c1.maxX;
        else if (c2.maxX < c1.minX) dx = c1.minX - c2.maxX;

        var dy = 0;
        if (c1.maxY < c2.minY) dy = c2.minY - c1.maxY;
        else if (c2.maxY < c1.minY) dy = c1.minY - c2.maxY;

        var gap = Math.max(dx, dy);

        if (gap <= maxGapCells) {
          var newMinX = Math.min(c1.minX, c2.minX);
          var newMaxX = Math.max(c1.maxX, c2.maxX);
          var newMinY = Math.min(c1.minY, c2.minY);
          var newMaxY = Math.max(c1.maxY, c2.maxY);
          var newSpanX = newMaxX - newMinX + 1;
          var newSpanY = newMaxY - newMinY + 1;
          var newCelle = c1.celle + c2.celle;
          var isWallAttached = c1.isWallAttached || c2.isWallAttached;
          var wallSides = (c1.wallSides || []).concat(c2.wallSides || []).filter(function(v, idx, arr) { return arr.indexOf(v) === idx; });

          list[i] = {
            minX: newMinX,
            maxX: newMaxX,
            minY: newMinY,
            maxY: newMaxY,
            effMinX: newMinX,
            effMaxX: newMaxX,
            effMinY: newMinY,
            effMaxY: newMaxY,
            celle: newCelle,
            larghezzaM: slamSpanMeters(newSpanX, 'x'),
            profonditaM: slamSpanMeters(newSpanY, 'y'),
            isWallAttached: isWallAttached,
            wallSides: wallSides
          };

          list.splice(j, 1);
          merged = true;
          break;
        }
      }
      if (merged) break;
    }
  }

  return list;
}

function stitchPerimeterWallGaps(mapObj) {
  if (!mapObj) mapObj = (typeof slamMap !== 'undefined') ? slamMap : null;
  if (!mapObj || !mapObj.grid) return;
  var H = mapObj.height, W = mapObj.width;
  var grid = mapObj.grid;

  // 1. Calcola l'involucro perimetrale massimo noto della stanza
  var pMinX = 999, pMaxX = -1, pMinY = 999, pMaxY = -1;
  for (var y = 0; y < H; y++) {
    for (var x = 0; x < W; x++) {
      if (grid[y][x] === 1) {
        if (x < pMinX) pMinX = x; if (x > pMaxX) pMaxX = x;
        if (y < pMinY) pMinY = y; if (y > pMaxY) pMaxY = y;
      }
    }
  }
  if (pMaxX < 0) return;

  var perimeterY = [0, H - 1];
  if (pMinY <= 1 && perimeterY.indexOf(pMinY) === -1) perimeterY.push(pMinY);
  if (pMaxY >= H - 2 && perimeterY.indexOf(pMaxY) === -1) perimeterY.push(pMaxY);

  var perimeterX = [0, W - 1];
  if (pMinX <= 1 && perimeterX.indexOf(pMinX) === -1) perimeterX.push(pMinX);
  if (pMaxX >= W - 2 && perimeterX.indexOf(pMaxX) === -1) perimeterX.push(pMaxX);

  // 2. Cucitura orizzontale lungo i margini superiore e inferiore perimetrali
  perimeterY.forEach(function(y) {
    var gapStart = -1;
    for (var x = 0; x < W; x++) {
      if (grid[y][x] === 1) {
        if (gapStart !== -1) {
          var gapLen = x - gapStart - 1;
          if (gapLen >= 1 && gapLen <= 32) {
            for (var gx = gapStart + 1; gx < x; gx++) {
              var logVal = (mapObj.logOddsGrid && mapObj.logOddsGrid[y]) ? mapObj.logOddsGrid[y][gx] : 0;
              if (grid[y][gx] === -1 || (grid[y][gx] === 0 && logVal >= -1.0)) {
                grid[y][gx] = 1;
                if (mapObj.logOddsGrid && mapObj.logOddsGrid[y]) mapObj.logOddsGrid[y][gx] = 2.5;
              }
            }
          }
        }
        gapStart = x;
      }
    }
  });

  // 3. Cucitura verticale lungo i margini sinistro e destro perimetrali
  perimeterX.forEach(function(x) {
    var gapStart = -1;
    for (var y = 0; y < H; y++) {
      if (grid[y][x] === 1) {
        if (gapStart !== -1) {
          var gapLen = y - gapStart - 1;
          if (gapLen >= 1 && gapLen <= 32) {
            for (var gy = gapStart + 1; gy < y; gy++) {
              var logVal = (mapObj.logOddsGrid && mapObj.logOddsGrid[gy]) ? mapObj.logOddsGrid[gy][x] : 0;
              if (grid[gy][x] === -1 || (grid[gy][x] === 0 && logVal >= -1.0)) {
                grid[gy][x] = 1;
                if (mapObj.logOddsGrid && mapObj.logOddsGrid[gy]) mapObj.logOddsGrid[gy][x] = 2.5;
              }
            }
          }
        }
        gapStart = y;
      }
    }
  });

  // 4. Sigillatura continua dell'involucro esterno perimetrale (parete continua chiusa a 4 lati)
  // Parete Nord (y = 0) e Sud (y = H - 1)
  for (var cx = 0; cx < W; cx++) {
    if (grid[0]) {
      grid[0][cx] = 1;
      if (mapObj.logOddsGrid && mapObj.logOddsGrid[0]) mapObj.logOddsGrid[0][cx] = 3.0;
    }
    if (grid[H - 1]) {
      grid[H - 1][cx] = 1;
      if (mapObj.logOddsGrid && mapObj.logOddsGrid[H - 1]) mapObj.logOddsGrid[H - 1][cx] = 3.0;
    }
  }
  // Parete Ovest (x = 0) e Est (x = W - 1)
  for (var cy = 0; cy < H; cy++) {
    if (grid[cy]) {
      grid[cy][0] = 1;
      grid[cy][W - 1] = 1;
      if (mapObj.logOddsGrid && mapObj.logOddsGrid[cy]) {
        mapObj.logOddsGrid[cy][0] = 3.0;
        mapObj.logOddsGrid[cy][W - 1] = 3.0;
      }
    }
  }
}

function solidifyClusterInteriors(mapObj) {
  if (!mapObj) mapObj = (typeof slamMap !== 'undefined') ? slamMap : null;
  if (!mapObj || !mapObj.grid) return;
  stitchPerimeterWallGaps(mapObj);
  var clusters = findSlamClusters(true);

  var maxSpanX = Math.floor(mapObj.width * 0.6);
  var maxSpanY = Math.floor(mapObj.height * 0.6);

  // Riempimento omogeneo solido delle celle interne degli arredi (-1 o 0) e saldatura muri retrostanti
  clusters.forEach(function(c) {
    var spanX = c.maxX - c.minX + 1;
    var spanY = c.maxY - c.minY + 1;
    // Ignora l'involucro perimetrale esterno della stanza
    if (spanX >= maxSpanX && spanY >= maxSpanY) return;

    if (c.celle >= 4 && (spanX >= 2 || c.isWallAttached) && (spanY >= 2 || c.isWallAttached)) {
      var effMinX = (c.isWallAttached && c.effMinX !== undefined) ? c.effMinX : c.minX;
      var effMaxX = (c.isWallAttached && c.effMaxX !== undefined) ? c.effMaxX : c.maxX;
      var effMinY = (c.isWallAttached && c.effMinY !== undefined) ? c.effMinY : c.minY;
      var effMaxY = (c.isWallAttached && c.effMaxY !== undefined) ? c.effMaxY : c.maxY;

      // Per gli arredi accostati a parete, chiudi automaticamente la parete perimetrale esterna retrostante specifica
      if (c.isWallAttached && c.wallSides && c.wallSides.length > 0) {
        // Parete OVEST
        if (c.wallSides.indexOf('west') !== -1) {
          for (var wy = effMinY; wy <= effMaxY; wy++) {
            if (mapObj.grid[wy]) {
              mapObj.grid[wy][0] = 1;
              if (mapObj.logOddsGrid && mapObj.logOddsGrid[wy]) mapObj.logOddsGrid[wy][0] = 3.5;
            }
          }
          effMinX = 1;
        }
        // Parete EST
        if (c.wallSides.indexOf('east') !== -1) {
          for (var wy = effMinY; wy <= effMaxY; wy++) {
            if (mapObj.grid[wy]) {
              mapObj.grid[wy][mapObj.width - 1] = 1;
              if (mapObj.logOddsGrid && mapObj.logOddsGrid[wy]) mapObj.logOddsGrid[wy][mapObj.width - 1] = 3.5;
            }
          }
          effMaxX = mapObj.width - 2;
        }
        // Parete NORD
        if (c.wallSides.indexOf('north') !== -1) {
          for (var wx = effMinX; wx <= effMaxX; wx++) {
            if (mapObj.grid[0]) {
              mapObj.grid[0][wx] = 1;
              if (mapObj.logOddsGrid && mapObj.logOddsGrid[0]) mapObj.logOddsGrid[0][wx] = 3.5;
            }
          }
          effMinY = 1;
        }
        // Parete SUD
        if (c.wallSides.indexOf('south') !== -1) {
          for (var wx = effMinX; wx <= effMaxX; wx++) {
            if (mapObj.grid[mapObj.height - 1]) {
              mapObj.grid[mapObj.height - 1][wx] = 1;
              if (mapObj.logOddsGrid && mapObj.logOddsGrid[mapObj.height - 1]) mapObj.logOddsGrid[mapObj.height - 1][wx] = 3.5;
            }
          }
          effMaxY = mapObj.height - 2;
        }
      }

      // Riempimento solido del corpo dell'arredo (solo celle sconosciute in ombra, rispetta lo spazio libero confermato)
      for (var gy = effMinY; gy <= effMaxY; gy++) {
        for (var gx = effMinX; gx <= effMaxX; gx++) {
          if (mapObj.grid[gy] && mapObj.grid[gy][gx] !== 0) {
            mapObj.grid[gy][gx] = 1;
            if (mapObj.logOddsGrid && mapObj.logOddsGrid[gy]) {
              mapObj.logOddsGrid[gy][gx] = Math.max(3.0, mapObj.logOddsGrid[gy][gx]);
            }
          }
        }
      }
    }
  });

  reconstructWallSegmentsRansac(mapObj);
  updateSemanticLandmarksFromClusters(mapObj, clusters);
}


function updateSemanticLandmarksFromClusters(mapObj, clusters) {
  if (!mapObj || !clusters) return;
  if (!mapObj.semanticLandmarks) mapObj.semanticLandmarks = [];
  var maxSpanX = Math.floor(mapObj.width * 0.6);
  var maxSpanY = Math.floor(mapObj.height * 0.6);

  clusters.forEach(function(c) {
    var spanX = c.maxX - c.minX + 1;
    var spanY = c.maxY - c.minY + 1;
    if (spanX >= maxSpanX && spanY >= maxSpanY) return;

    var pos = slamGridToWorld((c.minX + c.maxX) / 2, (c.minY + c.maxY) / 2);

    // Se esiste già un landmark verificato dal VLM vicino al cluster, aggiorna le dimensioni geometriche
    var existingIdx = mapObj.semanticLandmarks.findIndex(function(item) {
      return Math.hypot(item.x - pos.x, item.y - pos.y) < 60 && item.vlmVerified;
    });

    if (existingIdx >= 0) {
      var lm = mapObj.semanticLandmarks[existingIdx];
      lm.x = (lm.x + pos.x) / 2;
      lm.y = (lm.y + pos.y) / 2;
      lm.w = c.larghezzaM * 100;
      lm.h = c.profonditaM * 100;
    }
  });
}


function reconstructWallSegmentsRansac(mapObj) {
  if (!mapObj) mapObj = (typeof slamMap !== 'undefined') ? slamMap : null;
  if (!mapObj || !mapObj.grid) return;

  var H = mapObj.height, W = mapObj.width;
  var pts = [];
  for (var y = 0; y < H; y++) {
    for (var x = 0; x < W; x++) {
      if (mapObj.grid[y][x] === 1) pts.push({ x: x, y: y });
    }
  }

  var minInliers = 6;
  if (pts.length < minInliers) return;

  var remaining = pts.slice();
  var maxIter = 40;
  var distThresh = 1.2;
  var maxGapCells = 15;

  while (remaining.length >= minInliers) {
    var bestInliers = [];
    var bestLine = null;

    for (var iter = 0; iter < maxIter; iter++) {
      if (remaining.length < 2) break;
      var i1 = Math.floor(Math.random() * remaining.length);
      var i2 = Math.floor(Math.random() * remaining.length);
      if (i1 === i2) continue;

      var p1 = remaining[i1], p2 = remaining[i2];
      var dx = p2.x - p1.x, dy = p2.y - p1.y;
      var distP = Math.hypot(dx, dy);
      if (distP < 3.0) continue;

      var A = dy / distP, B = -dx / distP;
      var C = -(A * p1.x + B * p1.y);

      var inliers = [];
      for (var k = 0; k < remaining.length; k++) {
        var p = remaining[k];
        var d = Math.abs(A * p.x + B * p.y + C);
        if (d <= distThresh) inliers.push(p);
      }

      if (inliers.length > bestInliers.length) {
        bestInliers = inliers;
        bestLine = { A: A, B: B, C: C, dx: dx, dy: dy, p1: p1 };
      }
    }

    if (bestInliers.length < minInliers || !bestLine) break;

    var dirX = bestLine.dx / Math.hypot(bestLine.dx, bestLine.dy);
    var dirY = bestLine.dy / Math.hypot(bestLine.dx, bestLine.dy);

    var proj = [];
    for (var j = 0; j < bestInliers.length; j++) {
      var pt = bestInliers[j];
      var t = (pt.x - bestLine.p1.x) * dirX + (pt.y - bestLine.p1.y) * dirY;
      proj.push({ t: t, x: pt.x, y: pt.y });
    }
    proj.sort(function(a, b) { return a.t - b.t; });

    for (var m = 0; m < proj.length - 1; m++) {
      var pa = proj[m], pb = proj[m+1];
      var gapDist = Math.hypot(pb.x - pa.x, pb.y - pa.y);

      if (gapDist >= 1.5 && gapDist <= maxGapCells) {
        var linePts = getBresenhamPoints(pa.x, pa.y, pb.x, pb.y);
        for (var lp = 1; lp < linePts.length - 1; lp++) {
          var gx = linePts[lp].x, gy = linePts[lp].y;
          if (gx >= 0 && gx < W && gy >= 0 && gy < H) {
            var cellLog = (mapObj.logOddsGrid && mapObj.logOddsGrid[gy]) ? mapObj.logOddsGrid[gy][gx] : 0;
            if (mapObj.grid[gy][gx] === -1 && cellLog >= -0.2) {
              mapObj.grid[gy][gx] = 1;
              if (mapObj.logOddsGrid && mapObj.logOddsGrid[gy]) {
                mapObj.logOddsGrid[gy][gx] = Math.max(2.5, mapObj.logOddsGrid[gy][gx]);
              }
            }
          }
        }
      }
    }

    var inlierSet = new Set(bestInliers);
    var newRem = [];
    for (var r = 0; r < remaining.length; r++) {
      if (!inlierSet.has(remaining[r])) newRem.push(remaining[r]);
    }
    remaining = newRem;
  }
}




function getBresenhamPoints(x0, y0, x1, y1) {
  var pts = [];
  var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  var sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  var err = dx - dy;
  var cx = x0, cy = y0;
  while (true) {
    pts.push({ x: cx, y: cy });
    if (cx === x1 && cy === y1) break;
    var e2 = 2 * err;
    if (e2 > -dy) { err -= dy; cx += sx; }
    if (e2 < dx) { err += dx; cy += sy; }
  }
  return pts;
}

