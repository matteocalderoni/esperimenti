// simulazione/web_simulator/js/slam/slam_planner.js
// Rilevamento Frontiere/Hunter e Pathfinding A*
// (la dilatazione degli ostacoli vive in slam_inflation.js)

function findSlamFrontiers() {
  var isFrontier = [], visited = [], centroids = [];
  for (var y = 0; y < slamMap.height; y++) {
    isFrontier.push(new Array(slamMap.width).fill(false));
    visited.push(new Array(slamMap.width).fill(false));
  }
  for (var fy = 1; fy < slamMap.height - 1; fy++) {
    for (var fx = 1; fx < slamMap.width - 1; fx++) {
      if (slamMap.grid[fy][fx] === 0 && (slamMap.grid[fy-1][fx] === -1 || slamMap.grid[fy+1][fx] === -1 ||
          slamMap.grid[fy][fx-1] === -1 || slamMap.grid[fy][fx+1] === -1)) isFrontier[fy][fx] = true;
    }
  }
  for (var cy = 1; cy < slamMap.height - 1; cy++) {
    for (var cx = 1; cx < slamMap.width - 1; cx++) {
      if (isFrontier[cy][cx] && !visited[cy][cx]) {
        var queue = [{ x: cx, y: cy }], cluster = [{ x: cx, y: cy }], qi = 0;
        visited[cy][cx] = true;
        while (qi < queue.length) {
          var qc = queue[qi++];
          var nbs = [{x:qc.x+1,y:qc.y},{x:qc.x-1,y:qc.y},{x:qc.x,y:qc.y+1},{x:qc.x,y:qc.y-1}];
          for (var ni = 0; ni < nbs.length; ni++) {
            var nb = nbs[ni];
            if (nb.x > 0 && nb.x < slamMap.width-1 && nb.y > 0 && nb.y < slamMap.height-1 && !visited[nb.y][nb.x] && isFrontier[nb.y][nb.x]) {
              visited[nb.y][nb.x] = true; cluster.push(nb); queue.push(nb);
            }
          }
        }
        if (cluster.length >= 1) {
          var sumX = 0, sumY = 0;
          for (var ci = 0; ci < cluster.length; ci++) { sumX += cluster[ci].x; sumY += cluster[ci].y; }
          centroids.push({ gx: Math.round(sumX/cluster.length), gy: Math.round(sumY/cluster.length), size: cluster.length });
        }
      }
    }
  }
  return centroids;
}

function findHunterTarget(cur, dGrid) {
  var candidates = [];
  for (var y = 1; y < slamMap.height - 1; y++) {
    for (var x = 1; x < slamMap.width - 1; x++) {
      if (slamMap.grid[y][x] === -1) {
        var nbs = [{x:x+1,y:y},{x:x-1,y:y},{x:x,y:y+1},{x:x,y:y-1}];
        for (var i = 0; i < nbs.length; i++) {
          var p = nbs[i];
          if (p.x > 0 && p.x < slamMap.width-1 && p.y > 0 && p.y < slamMap.height-1 && dGrid[p.y][p.x] !== 1) {
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
  var midX = Math.floor(slamMap.width / 2), midY = Math.floor(slamMap.height / 2);
  frontiers.forEach(function(f) {
    var dist = Math.hypot(f.gx - cur.gx, f.gy - cur.gy), unexp = 0;
    for (var dy = -5; dy <= 5; dy += 2) {
      for (var dx = -5; dx <= 5; dx += 2) {
        var ny = f.gy + dy, nx = f.gx + dx;
        if (ny >= 0 && ny < slamMap.height && nx >= 0 && nx < slamMap.width && slamMap.grid[ny][nx] === -1) unexp++;
      }
    }
    f.score = (unexp * 3.0) + (f.size * 1.5) - (dist * 0.6);
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
          var cPenalty = (costmap && costmap[nny] && costmap[nny][nnx]) ? costmap[nny][nnx] * 0.01 : 0;
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

function planAdaptiveSlamAStar(start, goal) {
  var cmap = (typeof getSlamCostmap === 'function') ? getSlamCostmap() : null;
  var p = planSlamAStar(start, goal, getDilatedSlamGrid(), cmap);
  return (p && p.length > 1) ? p : [];
}
