// simulazione/web_simulator/js/behaviors/exploration.js
// SLAM Mapping — Scansione Continua in Movimento
//
// ARCHITETTURA:
//  1. INITIAL_SCAN: rotazione sul posto 360° per mappa iniziale
//  2. FIND_FRONTIERS: identifica la prossima zona inesplorata
//  3. NAVIGATE: si muove verso la frontiera MENTRE scansiona ogni frame
//  Repeat fino a copertura >= 92%
//
// BUG FIX: coordinate normalizzate rispetto alla dimensione reale del canvas.
// BUG FIX: usa hitX/hitY dal raycast direttamente (no conversione metri→px errata).

var slamMap = {
  width: 70,
  height: 52,
  grid: null,
  frontiers: [],
  currentPath: [],
  pathIndex: 0,
  fsmState: 'INITIAL_SCAN',
  scanBodyAngle: 0,       // angolo corpo durante la rotazione iniziale
  scanStep: 0,            // passo corrente della rotazione (0..35)
  scanTimer: 0,
  stepCounter: 0,
  stuckCounter: 0,
  targetFrontier: null,
  stats: { exploredPct: 0, freeCells: 0, wallCells: 0 }
};

// Fan 11 raggi: copertura 240° (da -120° a +120°)
var SCAN_FAN_DEG = [-120, -90, -60, -40, -20, 0, 20, 40, 60, 90, 120];

// ─── Dimensioni canvas dinamiche ─────────────────────────────────────────────
function getArenaW() {
  return (typeof arenaCanvas !== 'undefined' && arenaCanvas && arenaCanvas.width)  ? arenaCanvas.width  : 700;
}
function getArenaH() {
  return (typeof arenaCanvas !== 'undefined' && arenaCanvas && arenaCanvas.height) ? arenaCanvas.height : 520;
}

// ─── Inizializzazione griglia ─────────────────────────────────────────────────
function initSlamGrid() {
  slamMap.grid = [];
  for (var y = 0; y < slamMap.height; y++) {
    slamMap.grid.push(new Array(slamMap.width).fill(-1));
  }
  // Bordi pre-mappati (noti a priori)
  for (var x = 0; x < slamMap.width; x++) {
    slamMap.grid[0][x] = 1;
    slamMap.grid[slamMap.height - 1][x] = 1;
  }
  for (var yb = 0; yb < slamMap.height; yb++) {
    slamMap.grid[yb][0] = 1;
    slamMap.grid[yb][slamMap.width - 1] = 1;
  }
  slamMap.frontiers = [];
  slamMap.currentPath = [];
  slamMap.pathIndex = 0;
  slamMap.fsmState = 'INITIAL_SCAN';
  slamMap.scanBodyAngle = robotState ? robotState.angle : 0;
  slamMap.scanStep = 0;
  slamMap.scanTimer = 0;
  slamMap.stepCounter = 0;
  slamMap.stuckCounter = 0;
  slamMap.targetFrontier = null;
  slamMap.stats = { exploredPct: 0, freeCells: 0, wallCells: 0 };
}
initSlamGrid();

// ─── Coordinate (normalizzate rispetto al canvas reale) ───────────────────────
function slamWorldToGrid(x, y) {
  var W = getArenaW(), H = getArenaH();
  return {
    gx: Math.max(0, Math.min(slamMap.width  - 1, Math.floor((x / W) * slamMap.width))),
    gy: Math.max(0, Math.min(slamMap.height - 1, Math.floor((y / H) * slamMap.height)))
  };
}

function slamGridToWorld(gx, gy) {
  var W = getArenaW(), H = getArenaH();
  return {
    x: (gx + 0.5) / slamMap.width  * W,
    y: (gy + 0.5) / slamMap.height * H
  };
}

// ─── Aggiornamento griglia da hitX/hitY (coordinate pixel dirette) ────────────
function updateSlamRayFromHit(startX, startY, hitX, hitY, didHit) {
  var W = getArenaW(), H = getArenaH();
  hitX = Math.max(0, Math.min(W - 1, hitX));
  hitY = Math.max(0, Math.min(H - 1, hitY));

  var p0 = slamWorldToGrid(startX, startY);
  var p1 = slamWorldToGrid(hitX, hitY);

  var x0 = p0.gx, y0 = p0.gy, x1 = p1.gx, y1 = p1.gy;
  var dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
  var sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  var err = dx - dy;
  var points = [];
  var safety = 0;

  while (safety++ < 300) {
    points.push({ x: x0, y: y0 });
    if (x0 === x1 && y0 === y1) break;
    var e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 <  dx) { err += dx; y0 += sy; }
  }

  // Celle percorse → libere
  for (var i = 0; i < points.length - 1; i++) {
    var px = points[i].x, py = points[i].y;
    if (py >= 0 && py < slamMap.height && px >= 0 && px < slamMap.width) {
      if (slamMap.grid[py][px] !== 1) slamMap.grid[py][px] = 0;
    }
  }

  // Cella finale → muro (solo se il raggio ha colpito qualcosa)
  if (didHit && points.length > 0) {
    var ep = points[points.length - 1];
    if (ep.y >= 0 && ep.y < slamMap.height && ep.x >= 0 && ep.x < slamMap.width) {
      slamMap.grid[ep.y][ep.x] = 1;
    }
  }
}

// ─── Scansione fan (chiamata ogni frame durante NAVIGATE) ─────────────────────
function scanAllRays() {
  if (typeof castSingleRay !== 'function') return;
  for (var i = 0; i < SCAN_FAN_DEG.length; i++) {
    var angle = robotState.angle + (SCAN_FAN_DEG[i] * Math.PI / 180);
    var ray = castSingleRay(robotState.x, robotState.y, angle);
    updateSlamRayFromHit(robotState.x, robotState.y, ray.hitX, ray.hitY, ray.hit);
  }
  updateSlamStats();
}

function updateSlamStats() {
  var explored = 0, free = 0, walls = 0;
  var total = slamMap.width * slamMap.height;
  for (var y = 0; y < slamMap.height; y++) {
    for (var x = 0; x < slamMap.width; x++) {
      var v = slamMap.grid[y][x];
      if (v === 0) { explored++; free++; }
      else if (v === 1) { explored++; walls++; }
    }
  }
  slamMap.stats.exploredPct = Math.round((explored / total) * 100);
  slamMap.stats.freeCells   = free;
  slamMap.stats.wallCells   = walls;
}

// ─── Dilatazione sicurezza ────────────────────────────────────────────────────
function getDilatedSlamGrid(radius) {
  if (!radius) radius = 1;
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

// ─── Rilevamento frontiere (cluster → solo baricentri) ────────────────────────
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

  // BFS clustering → restituisce solo i baricentri (riduce i "puntini")
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
        // Solo cluster significativi (almeno 3 celle)
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

// ─── A* ──────────────────────────────────────────────────────────────────────
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

// ─── FSM Principale ───────────────────────────────────────────────────────────
function runExplorationBehavior() {
  if (!slamMap.grid) initSlamGrid();

  // ─── Stato: INITIAL_SCAN (rotazione 360° sul posto per mappa di base) ────────
  if (slamMap.fsmState === 'INITIAL_SCAN') {
    robotState.speed    = 0;
    robotState.steering = 0;

    slamMap.scanTimer++;
    if (slamMap.scanTimer >= 6) {
      slamMap.scanTimer = 0;

      // Rotazione corpo: 36 passi × 10° = 360°
      var scanAngle = slamMap.scanBodyAngle + (slamMap.scanStep * (Math.PI * 2 / 36));
      // Aggiorna angolo robot durante la rotazione
      robotState.angle = scanAngle;

      // Scansione fan completo all'angolo corrente
      if (typeof castSingleRay === 'function') {
        for (var i = 0; i < SCAN_FAN_DEG.length; i++) {
          var a = robotState.angle + (SCAN_FAN_DEG[i] * Math.PI / 180);
          var ray = castSingleRay(robotState.x, robotState.y, a);
          updateSlamRayFromHit(robotState.x, robotState.y, ray.hitX, ray.hitY, ray.hit);
        }
        updateSlamStats();
      }

      slamMap.scanStep++;
      if (slamMap.scanStep >= 36) {
        slamMap.scanStep = 0;
        robotState.angle = slamMap.scanBodyAngle; // Riporta all'angolo originale
        slamMap.fsmState = 'FIND_FRONTIERS';
      }
    }
    return;
  }

  // Tutte gli altri stati: scansione continua ad ogni frame mentre si muove
  scanAllRays();

  if (slamMap.stats.exploredPct >= 92) {
    slamMap.fsmState = 'COMPLETE';
  }

  // ─── Stato: NAVIGATE ─────────────────────────────────────────────────────────
  if (slamMap.fsmState === 'NAVIGATE') {
    if (slamMap.currentPath.length > 0 && slamMap.pathIndex < slamMap.currentPath.length - 1) {
      var nextPt = slamMap.currentPath[slamMap.pathIndex + 1];
      var target  = slamGridToWorld(nextPt.gx, nextPt.gy);
      var ddx = target.x - robotState.x;
      var ddy = target.y - robotState.y;
      var dist = Math.hypot(ddx, ddy);
      var targetAngle = Math.atan2(ddy, ddx);
      var diff = targetAngle - robotState.angle;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff >  Math.PI) diff -= Math.PI * 2;

      if (Math.abs(diff) > 0.45) {
        robotState.speed    = 0.5;
        robotState.steering = diff > 0 ? 0.12 : -0.12;
      } else {
        robotState.speed    = 2.5;
        robotState.steering = diff * 0.18;
      }

      // Anti-collisione integrata
      if (typeof castSingleRay === 'function') {
        var front = castSingleRay(robotState.x, robotState.y, robotState.angle);
        if (front.dist < 0.18) {
          robotState.speed    = -0.5;
          robotState.steering = 0.15;
          slamMap.stuckCounter++;
          if (slamMap.stuckCounter > 25) {
            slamMap.stuckCounter = 0;
            slamMap.currentPath  = [];
            slamMap.fsmState     = 'FIND_FRONTIERS';
          }
          return;
        }
      }

      if (dist < 12) {
        slamMap.pathIndex++;
        slamMap.stuckCounter = 0;
      }

      slamMap.stepCounter++;
      // Aggiorna rotta ogni ~200 frame per incorporare nuovi muri rilevati
      if (slamMap.stepCounter >= 200) {
        slamMap.stepCounter = 0;
        slamMap.fsmState    = 'FIND_FRONTIERS';
      }

    } else {
      slamMap.fsmState = 'FIND_FRONTIERS';
    }

  // ─── Stato: FIND_FRONTIERS ───────────────────────────────────────────────────
  } else if (slamMap.fsmState === 'FIND_FRONTIERS') {
    robotState.speed    = 0;
    robotState.steering = 0;

    var frontiers = findSlamFrontiers();
    slamMap.frontiers = frontiers;

    if (frontiers.length === 0) {
      slamMap.fsmState = 'COMPLETE';
      return;
    }

    var cur   = slamWorldToGrid(robotState.x, robotState.y);
    var dGrid = getDilatedSlamGrid(1);

    // Ordina per distanza (il più vicino prima)
    frontiers.sort(function(a, b) {
      return Math.hypot(a.gx-cur.gx, a.gy-cur.gy) - Math.hypot(b.gx-cur.gx, b.gy-cur.gy);
    });

    var path = [];
    var limit = Math.min(8, frontiers.length);
    for (var fi = 0; fi < limit; fi++) {
      path = planSlamAStar(cur, frontiers[fi], dGrid);
      if (path.length > 1) { slamMap.targetFrontier = frontiers[fi]; break; }
    }

    if (path.length > 1) {
      slamMap.currentPath  = path;
      slamMap.pathIndex    = 0;
      slamMap.stepCounter  = 0;
      slamMap.stuckCounter = 0;
      slamMap.fsmState     = 'NAVIGATE';
    } else {
      // Nessun path: fai una mini-rotazione e riprova
      robotState.angle += 0.15;
      slamMap.stuckCounter++;
      if (slamMap.stuckCounter > 50) {
        slamMap.stuckCounter = 0;
        slamMap.fsmState = 'COMPLETE';
      }
    }

  // ─── Stato: COMPLETE ─────────────────────────────────────────────────────────
  } else if (slamMap.fsmState === 'COMPLETE') {
    robotState.speed    = 0;
    robotState.steering = 0;
    robotState.panAngle = 0;
  }
}

registerBehavior('exploration', runExplorationBehavior);
