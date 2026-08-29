// simulazione/web_simulator/js/slam/slam_planner.js
// Algoritmi di Dilatazione, Rilevamento Frontiere (BFS) e Pathfinding A*

function getDilatedSlamGrid(radius) {
  if (!radius) radius = 2; // Dilatazione di sicurezza a 2 celle (buffer carR)
  var dGrid = slamMap.grid.map(function(row) { return row.slice(); });
  for (var y = 0; y < slamMap.height; y++) {
    for (var x = 0; x < slamMap.width; x++) {
      if (slamMap.grid[y][x] === 1) {
        for (var dy = -radius; dy <= radius; dy++) {
          for (var dx = -radius; dx <= radius; dx++) {
            var ny = y + dy, nx = x + dx;
            if (ny >= 0 && ny < slamMap.height && nx >= 0 && nx < slamMap.width) {
              dGrid[ny][nx] = 1;
            }
          }
        }
      }
    }
  }
  return dGrid;
}

function findSlamFrontiers() {
  var isFrontier = [];
  for (var y = 0; y < slamMap.height; y++) {
    isFrontier.push(new Array(slamMap.width).fill(false));
  }
  for (var fy = 1; fy < slamMap.height - 1; fy++) {
    for (var fx = 1; fx < slamMap.width - 1; fx++) {
      if (slamMap.grid[fy][fx] === 0) {
        if (slamMap.grid[fy-1][fx] === -1 || slamMap.grid[fy+1][fx] === -1 ||
            slamMap.grid[fy][fx-1] === -1 || slamMap.grid[fy][fx+1] === -1) {
          isFrontier[fy][fx] = true;
        }
      }
    }
  }

  var visited = [];
  for (var vy = 0; vy < slamMap.height; vy++) {
    visited.push(new Array(slamMap.width).fill(false));
  }
  var centroids = [];

  for (var cy = 1; cy < slamMap.height - 1; cy++) {
    for (var cx = 1; cx < slamMap.width - 1; cx++) {
      if (isFrontier[cy][cx] && !visited[cy][cx]) {
        var queue = [{ x: cx, y: cy }];
        visited[cy][cx] = true;
        var cluster = [{ x: cx, y: cy }];
        var qi = 0;
        while (qi < queue.length) {
          var qc = queue[qi++];
          var nbs = [{x:qc.x+1,y:qc.y},{x:qc.x-1,y:qc.y},{x:qc.x,y:qc.y+1},{x:qc.x,y:qc.y-1}];
          for (var ni = 0; ni < nbs.length; ni++) {
            var nb = nbs[ni];
            if (nb.x > 0 && nb.x < slamMap.width-1 && nb.y > 0 && nb.y < slamMap.height-1) {
              if (!visited[nb.y][nb.x] && isFrontier[nb.y][nb.x]) {
                visited[nb.y][nb.x] = true;
                cluster.push(nb);
                queue.push(nb);
              }
            }
          }
        }
        if (cluster.length >= 3) {
          var sumX = 0, sumY = 0;
          for (var ci = 0; ci < cluster.length; ci++) { sumX += cluster[ci].x; sumY += cluster[ci].y; }
          centroids.push({ gx: Math.round(sumX/cluster.length), gy: Math.round(sumY/cluster.length) });
        }
      }
    }
  }
  return centroids;
}

function planSlamAStar(start, goal, dGrid) {
  var gx = goal.gx, gy = goal.gy;
  if (dGrid[gy] && dGrid[gy][gx] === 1) {
    var found = false;
    for (var r = 1; r <= 5 && !found; r++) {
      for (var fdy = -r; fdy <= r && !found; fdy++) {
        for (var fdx = -r; fdx <= r && !found; fdx++) {
          var ny = gy + fdy, nx = gx + fdx;
          if (ny > 0 && ny < slamMap.height-1 && nx > 0 && nx < slamMap.width-1) {
            if (dGrid[ny][nx] !== 1) { gx = nx; gy = ny; found = true; }
          }
        }
      }
    }
    if (!found) return [];
  }

  var sx = start.gx, sy = start.gy;
  var openSet = [{ x: sx, y: sy, g: 0, f: Math.hypot(gx-sx, gy-sy) }];
  var cameFrom = {}, gScore = {};
  gScore[sx+','+sy] = 0;
  var iter = 0;

  while (openSet.length > 0 && iter++ < 4000) {
    openSet.sort(function(a,b){return a.f-b.f;});
    var curr = openSet.shift();
    if (curr.x === gx && curr.y === gy) {
      var path = [];
      var key = curr.x+','+curr.y;
      var node = { x: curr.x, y: curr.y };
      while (node) {
        path.push({ gx: node.x, gy: node.y });
        var prev = cameFrom[key];
        if (!prev) break;
        key = prev.x+','+prev.y; node = prev;
      }
      path.reverse();
      return path;
    }
    var dirs = [
      {dx:1,dy:0,c:1},{dx:-1,dy:0,c:1},{dx:0,dy:1,c:1},{dx:0,dy:-1,c:1},
      {dx:1,dy:1,c:1.414},{dx:-1,dy:1,c:1.414},{dx:1,dy:-1,c:1.414},{dx:-1,dy:-1,c:1.414}
    ];
    for (var di = 0; di < dirs.length; di++) {
      var d = dirs[di];
      var nnx = curr.x+d.dx, nny = curr.y+d.dy;
      if (nnx > 0 && nnx < slamMap.width-1 && nny > 0 && nny < slamMap.height-1) {
        if (dGrid[nny][nnx] === 1) continue;
        var tentG = curr.g + d.c;
        var nKey = nnx+','+nny;
        if (gScore[nKey] === undefined || tentG < gScore[nKey]) {
          cameFrom[nKey] = { x: curr.x, y: curr.y };
          gScore[nKey] = tentG;
          openSet.push({ x: nnx, y: nny, g: tentG, f: tentG + Math.hypot(gx-nnx, gy-nny) });
        }
      }
    }
  }
  return [];
}
