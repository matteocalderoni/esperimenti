// simulazione/web_simulator/js/slam/slam_planner.js
// Rilevamento Frontiere/Hunter e Pathfinding A*
// (la dilatazione degli ostacoli vive in slam_inflation.js)

function findSlamFrontiers() {
  var isFrontier = [], visited = [], centroids = [];
  for (var y = 0; y < slamMap.height; y++) {
    isFrontier.push(new Array(slamMap.width).fill(false));
    visited.push(new Array(slamMap.width).fill(false));
  }
  var dGrid = (typeof getDilatedSlamGrid === 'function') ? getDilatedSlamGrid() : null;
  for (var fy = 2; fy < slamMap.height - 2; fy++) {
    for (var fx = 2; fx < slamMap.width - 2; fx++) {
      // La frontiera deve essere in spazio libero esplorato e FUORI dal buffer di sicurezza dagli ostacoli/pareti
      if (slamMap.grid[fy][fx] === 0 && (!dGrid || dGrid[fy][fx] !== 1)) {
        if (slamMap.grid[fy-1][fx] === -1 || slamMap.grid[fy+1][fx] === -1 ||
            slamMap.grid[fy][fx-1] === -1 || slamMap.grid[fy][fx+1] === -1) {
          isFrontier[fy][fx] = true;
        }
      }
    }
  }
  for (var cy = 2; cy < slamMap.height - 2; cy++) {
    for (var cx = 2; cx < slamMap.width - 2; cx++) {
      if (isFrontier[cy][cx] && !visited[cy][cx]) {
        var queue = [{ x: cx, y: cy }], cluster = [{ x: cx, y: cy }], qi = 0;
        visited[cy][cx] = true;
        while (qi < queue.length) {
          var qc = queue[qi++];
          var nbs = [{x:qc.x+1,y:qc.y},{x:qc.x-1,y:qc.y},{x:qc.x,y:qc.y+1},{x:qc.x,y:qc.y-1}];
          for (var ni = 0; ni < nbs.length; ni++) {
            var nb = nbs[ni];
            if (nb.x > 1 && nb.x < slamMap.width-2 && nb.y > 1 && nb.y < slamMap.height-2 && !visited[nb.y][nb.x] && isFrontier[nb.y][nb.x]) {
              visited[nb.y][nb.x] = true; cluster.push(nb); queue.push(nb);
            }
          }
        }
        // Solo frontiere reali con almeno 3 celle connesse e baricentro protetto
        if (cluster.length >= 3) {
          var sumX = 0, sumY = 0;
          for (var ci = 0; ci < cluster.length; ci++) { sumX += cluster[ci].x; sumY += cluster[ci].y; }
          var cGx = Math.max(3, Math.min(slamMap.width - 4, Math.round(sumX / cluster.length)));
          var cGy = Math.max(3, Math.min(slamMap.height - 4, Math.round(sumY / cluster.length)));
          centroids.push({ gx: cGx, gy: cGy, size: cluster.length });
        }
      }
    }
  }
  return centroids;
}

function findHunterTarget(cur, dGrid) {
  var candidates = [];
  for (var y = 2; y < slamMap.height - 2; y++) {
    for (var x = 2; x < slamMap.width - 2; x++) {
      if (slamMap.grid[y][x] === -1) {
        var nbs = [{x:x+1,y:y},{x:x-1,y:y},{x:x,y:y+1},{x:x,y:y-1}];
        for (var i = 0; i < nbs.length; i++) {
          var p = nbs[i];
          if (p.x >= 3 && p.x < slamMap.width - 3 && p.y >= 3 && p.y < slamMap.height - 3 && (!dGrid || dGrid[p.y][p.x] !== 1)) {
            candidates.push({ gx: p.x, gy: p.y, dist: Math.hypot(p.x - cur.gx, p.y - cur.gy) });
            break;
          }
        }
      }
    }
  }
  if (candidates.length === 0) return null;
  candidates.sort(function(a, b) { return a.dist - b.dist; });
  return candidates[0];
}

function rankFrontiersByBlindness(cur, frontiers) {
  var curHeading = (typeof robotState !== 'undefined' && robotState.angle !== undefined) ? robotState.angle : 0;

  frontiers.forEach(function(f) {
    var dist = Math.hypot(f.gx - cur.gx, f.gy - cur.gy);

    // Valutazione Macro-Informativa (explore_lite): scansiona un ampio raggio (16 celle = 320 px)
    // per premiare le zone inesplorate PIÙ GRANDI della stanza
    var macroUnexp = 0;
    for (var dy = -16; dy <= 16; dy += 2) {
      for (var dx = -16; dx <= 16; dx += 2) {
        var ny = f.gy + dy, nx = f.gx + dx;
        if (ny >= 0 && ny < slamMap.height && nx >= 0 && nx < slamMap.width) {
          if (slamMap.grid[ny][nx] === -1) macroUnexp++;
        }
      }
    }

    // Penalità angolare di virata per evitare inversioni a U repentine
    var angleToFrontier = Math.atan2(f.gy - cur.gy, f.gx - cur.gx);
    var dAngle = Math.abs(angleToFrontier - curHeading);
    while (dAngle > Math.PI) dAngle = Math.abs(dAngle - 2 * Math.PI);
    var turnPenalty = dAngle * 8.0;

    // Penalità per frontiere rintanate negli angoli stretti dell'arena
    var isCorner = (f.gx <= 4 || f.gx >= slamMap.width - 5) && (f.gy <= 4 || f.gy >= slamMap.height - 5);
    var cornerPenalty = isCorner ? 18.0 : 0;

    // Funzione di utilità explore_lite:
    // Pesa fortemente il volume inesplorato (macroUnexp * 6.0), la grandezza della frontiera (f.size * 3.0),
    // penalizza la distanza di viaggio (dist * 0.12), la virata (turnPenalty) e la vicinanza a spigoli ciechi
    f.score = (macroUnexp * 6.0) + (f.size * 3.0) - (dist * 0.12) - turnPenalty - cornerPenalty;
    f.macroUnexp = macroUnexp;
  });
  return frontiers.sort(function(a, b) { return b.score - a.score; });
}

function planSlamAStar(start, goal, dGrid, costmap) {
  var gx = goal.gx, gy = goal.gy, sx = start.gx, sy = start.gy;
  var openSet = [{ x: sx, y: sy, g: 0, f: Math.hypot(gx-sx, gy-sy) }], cameFrom = {}, gScore = {};
  gScore[sx+','+sy] = 0; var iter = 0;
  while (openSet.length > 0 && iter++ < 3500) {
    openSet.sort(function(a,b){return a.f-b.f;});
    var curr = openSet.shift();
    if (curr.x === gx && curr.y === gy) {
      var path = [], key = curr.x+','+curr.y, node = { x: curr.x, y: curr.y };
      while (node) { path.push({ gx: node.x, gy: node.y }); var prev = cameFrom[key]; if (!prev) break; key = prev.x+','+prev.y; node = prev; }
      path.reverse(); return path;
    }
    var dirs = [{dx:1,dy:0,c:1},{dx:-1,dy:0,c:1},{dx:0,dy:1,c:1},{dx:0,dy:-1,c:1},{dx:1,dy:1,c:1.4},{dx:-1,dy:1,c:1.4},{dx:1,dy:-1,c:1.4},{dx:-1,dy:-1,c:1.4}];
    for (var di = 0; di < dirs.length; di++) {
      var d = dirs[di], nnx = curr.x+d.dx, nny = curr.y+d.dy;
      if (nnx > 0 && nnx < slamMap.width-1 && nny > 0 && nny < slamMap.height-1) {
        if (dGrid[nny][nnx] !== 1 || (curr.x === sx && curr.y === sy && slamMap.grid[nny][nnx] !== 1)) {
          var cPenalty = (costmap && costmap[nny] && costmap[nny][nnx]) ? costmap[nny][nnx] * 0.035 : 0;
          var tentG = curr.g + d.c + cPenalty, nKey = nnx+','+nny;
          if (gScore[nKey] === undefined || tentG < gScore[nKey]) {
            cameFrom[nKey] = { x: curr.x, y: curr.y }; gScore[nKey] = tentG;
            openSet.push({ x: nnx, y: nny, g: tentG, f: tentG + Math.hypot(gx-nnx, gy-nny) });
          }
        }
      }
    }
  }
  return [];
}

/**
 * Line-of-Sight su griglia: controlla se il raggio diretto interseca ostacoli dilatati.
 */
function isLineClearOnGrid(x1, y1, x2, y2, dGrid) {
  var dist = Math.hypot(x2 - x1, y2 - y1);
  var steps = Math.max(1, Math.ceil(dist * 2));
  for (var s = 0; s <= steps; s++) {
    var t = s / steps;
    var gx = Math.round(x1 + (x2 - x1) * t);
    var gy = Math.round(y1 + (y2 - y1) * t);
    if (gx < 0 || gx >= slamMap.width || gy < 0 || gy >= slamMap.height) return false;
    // Punti intermedi: non devono toccare la dilatazione di sicurezza
    if (s > 0 && s < steps) {
      if (dGrid[gy] && dGrid[gy][gx] === 1) return false;
    } else {
      // Estremi: non devono toccare ostacoli solidi reali
      if (slamMap.grid && slamMap.grid[gy] && slamMap.grid[gy][gx] === 1) return false;
    }
  }
  return true;
}

/**
 * Algoritmo String Pulling (Path Smoothing): elimina lo zig-zag a 90°/45° unendo
 * con segmenti rettilinei i waypoint visibili in linea retta.
 */
function smoothSlamPath(rawPath, dGrid) {
  if (!rawPath || rawPath.length <= 2) return rawPath || [];
  if (!dGrid) dGrid = (typeof getDilatedSlamGrid === 'function') ? getDilatedSlamGrid() : slamMap.grid;

  var smoothed = [rawPath[0]];
  var curIdx = 0;

  while (curIdx < rawPath.length - 1) {
    var furthestIdx = curIdx + 1;
    for (var testIdx = rawPath.length - 1; testIdx > curIdx + 1; testIdx--) {
      if (isLineClearOnGrid(rawPath[curIdx].gx, rawPath[curIdx].gy, rawPath[testIdx].gx, rawPath[testIdx].gy, dGrid)) {
        furthestIdx = testIdx;
        break;
      }
    }
    smoothed.push(rawPath[furthestIdx]);
    curIdx = furthestIdx;
  }
  return smoothed;
}

function planAdaptiveSlamAStar(start, goal) {
  var dGrid = getDilatedSlamGrid();
  // Se l'obiettivo ricade nella fascia di sicurezza degli ostacoli o a ridosso dei muri,
  // reindirizza l'A* verso una posa di osservazione libera che rispetti la distanza di sicurezza
  if (dGrid && dGrid[goal.gy] && dGrid[goal.gy][goal.gx] === 1) {
    var safeGoal = (typeof findObservationPose === 'function') ? findObservationPose(start, goal, dGrid) : null;
    if (safeGoal) {
      goal = safeGoal;
    } else {
      return [];
    }
  }
  var cmap = (typeof getSlamCostmap === 'function') ? getSlamCostmap() : null;
  var p = planSlamAStar(start, goal, dGrid, cmap);
  if (p && p.length > 1) {
    return smoothSlamPath(p, dGrid);
  }
  return [];
}
