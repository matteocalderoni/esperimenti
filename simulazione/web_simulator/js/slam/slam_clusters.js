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

      var isWallProtrusion = touchesOuterShell && !isOuterPerimeter && (maxWallDepth >= 2);

      if (!touchesOuterShell || (includePerimeter && !isOuterPerimeter) || isWallProtrusion) {
        var effMinX = minX, effMaxX = maxX, effMinY = minY, effMaxY = maxY;
        if (touchesOuterShell) {
          if (effMinX <= pMinX + 10) effMinX = Math.max(1, pMinX);
          if (effMaxX >= pMaxX - 10) effMaxX = Math.min(W - 2, pMaxX);
          if (effMinY <= pMinY + 10) effMinY = Math.max(1, pMinY);
          if (effMaxY >= pMaxY - 10) effMaxY = Math.min(H - 2, pMaxY);
        }
        var effSpanX = effMaxX - effMinX + 1, effSpanY = effMaxY - effMinY + 1;
        blocchi.push({
          minX: effMinX, maxX: effMaxX, minY: effMinY, maxY: effMaxY, celle: celle,
          larghezzaM: slamSpanMeters(effSpanX, 'x'),
          profonditaM: slamSpanMeters(effSpanY, 'y'),
          isWallAttached: touchesOuterShell
        });
      }
    }
  }
  return mergeNearbyClusters(blocchi, 4);
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

          list[i] = {
            minX: newMinX,
            maxX: newMaxX,
            minY: newMinY,
            maxY: newMaxY,
            celle: newCelle,
            larghezzaM: slamSpanMeters(newSpanX, 'x'),
            profonditaM: slamSpanMeters(newSpanY, 'y'),
            isWallAttached: isWallAttached
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

  var perimeterY = [0, 1, 2, 3, 4, H - 5, H - 4, H - 3, H - 2, H - 1];
  var perimeterX = [0, 1, 2, 3, 4, W - 5, W - 4, W - 3, W - 2, W - 1];

  // Cucitura orizzontale lungo i margini superiore e inferiore (fino a 12 celle di gap ~ 1.20m)
  perimeterY.forEach(function(y) {
    if (y < 0 || y >= H) return;
    var gapStart = -1;
    for (var x = 0; x < W; x++) {
      if (grid[y][x] === 1) {
        if (gapStart !== -1) {
          var gapLen = x - gapStart - 1;
          if (gapLen >= 1 && gapLen <= 12) {
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

  // Cucitura verticale lungo i margini sinistro e destro (fino a 12 celle di gap ~ 1.20m)
  perimeterX.forEach(function(x) {
    if (x < 0 || x >= W) return;
    var gapStart = -1;
    for (var y = 0; y < H; y++) {
      if (grid[y][x] === 1) {
        if (gapStart !== -1) {
          var gapLen = y - gapStart - 1;
          if (gapLen >= 1 && gapLen <= 12) {
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
}

function solidifyClusterInteriors(mapObj) {
  if (!mapObj) mapObj = (typeof slamMap !== 'undefined') ? slamMap : null;
  if (!mapObj || !mapObj.grid) return;
  stitchPerimeterWallGaps(mapObj);
  var clusters = findSlamClusters(true);

  var maxSpanX = Math.floor(mapObj.width * 0.6);
  var maxSpanY = Math.floor(mapObj.height * 0.6);

  // Riempimento omogeneo solido delle celle interne degli arredi (-1 o 0) per eliminare varchi/quadrati vuoti
  clusters.forEach(function(c) {
    var spanX = c.maxX - c.minX + 1;
    var spanY = c.maxY - c.minY + 1;
    // Ignora l'involucro perimetrale esterno della stanza
    if (spanX >= maxSpanX && spanY >= maxSpanY) return;

    if (c.celle >= 4 && spanX >= 2 && spanY >= 2) {
      // Per gli arredi accostati a parete, salda il bounding box fino al filo del muro reale perimetrale
      var effMinX = c.minX, effMaxX = c.maxX, effMinY = c.minY, effMaxY = c.maxY;
      if (c.isWallAttached) {
        if (effMinX <= 6) effMinX = 1;
        if (effMaxX >= mapObj.width - 7) effMaxX = mapObj.width - 2;
        if (effMinY <= 6) effMinY = 1;
        if (effMaxY >= mapObj.height - 7) effMaxY = mapObj.height - 2;
      }

      for (var gy = effMinY; gy <= effMaxY; gy++) {
        for (var gx = effMinX; gx <= effMaxX; gx++) {
          if (mapObj.grid[gy]) {
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

  clusters.forEach(function(c, idx) {
    var spanX = c.maxX - c.minX + 1;
    var spanY = c.maxY - c.minY + 1;
    if (spanX >= maxSpanX && spanY >= maxSpanY) return;

    var pos = slamGridToWorld((c.minX + c.maxX) / 2, (c.minY + c.maxY) / 2);
    var objType = (c.larghezzaM >= 0.5 && c.profonditaM >= 0.5) ? 'table' : 'chair';
    var defaultLabel = (objType === 'table') ? '🍽️ Tavolo' : '🪑 Sedia';

    // Cerca un eventuale landmark gia' verificato ed etichettato dal VLM per questo cluster
    var existingIdx = mapObj.semanticLandmarks.findIndex(function(item) {
      return Math.hypot(item.x - pos.x, item.y - pos.y) < 45;
    });

    if (existingIdx < 0) {
      mapObj.semanticLandmarks.push({
        id: 'obj_' + (idx + 1),
        type: objType,
        name: defaultLabel,
        label: defaultLabel,
        icon: (objType === 'table') ? '🍽️' : '🪑',
        x: pos.x,
        y: pos.y,
        w: c.larghezzaM * 100,
        h: c.profonditaM * 100,
        isStaticWall: false
      });
    } else {
      // Aggiorna posizione e dimensioni dell'arredo senza sovrascrivere l'etichetta ed il nome VLM reale
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

