// simulazione/web_simulator/js/slam/slam_grid.js
// Gestione della Griglia di Occupazione 2D e Raycasting

var slamMap = {
  width: 70,
  height: 69,
  grid: null,
  frontiers: [],
  currentPath: [],
  pathIndex: 0,
  fsmState: 'HEAD_SCAN',
  scanStep: 0,
  scanTimer: 0,
  stepCounter: 0,
  stuckCounter: 0,
  lastProgressPct: 0,
  noProgressRounds: 0,
  targetFrontier: null,
  semanticLandmarks: [],
  vlmSnapshots: [],
  stats: { exploredPct: 0, freeCells: 0, wallCells: 0 }
};

var SCAN_FAN_DEG = [-120, -90, -60, -40, -20, 0, 20, 40, 60, 90, 120];

function getArenaW() {
  return (typeof arenaCanvas !== 'undefined' && arenaCanvas && arenaCanvas.width) ? arenaCanvas.width : 700;
}
function getArenaH() {
  return (typeof arenaCanvas !== 'undefined' && arenaCanvas && arenaCanvas.height) ? arenaCanvas.height : 520;
}

function initSlamGrid() {
  slamMap.grid = [];
  slamMap.logOddsGrid = [];
  for (var y = 0; y < slamMap.height; y++) {
    slamMap.grid.push(new Array(slamMap.width).fill(-1));
    slamMap.logOddsGrid.push(new Array(slamMap.width).fill(0.0));
  }
  slamMap.frontiers = [];
  slamMap.currentPath = [];
  slamMap.pathIndex = 0;
  slamMap.fsmState = 'INITIAL_SCAN';
  slamMap.scanStep = 0;
  slamMap.scanTimer = 0;
  slamMap.stepCounter = 0;
  slamMap.stuckCounter = 0;
  slamMap.lastProgressPct = 0;
  slamMap.noProgressRounds = 0;
  slamMap.targetFrontier = null;
  slamMap.semanticLandmarks = [];
  slamMap.vlmSnapshots = [];
  slamMap.stats = { exploredPct: 0, freeCells: 0, wallCells: 0 };
  if (typeof modalDismissed !== 'undefined') modalDismissed = false;
  if (typeof modalShown !== 'undefined') modalShown = false;
}
initSlamGrid();

function slamWorldToGrid(x, y) {
  var W = getArenaW(), H = getArenaH();
  return {
    gx: Math.max(0, Math.min(slamMap.width - 1, Math.floor((x / W) * slamMap.width))),
    gy: Math.max(0, Math.min(slamMap.height - 1, Math.floor((y / H) * slamMap.height)))
  };
}

function slamGridToWorld(gx, gy) {
  var W = getArenaW(), H = getArenaH();
  return {
    x: (gx + 0.5) / slamMap.width * W,
    y: (gy + 0.5) / slamMap.height * H
  };
}

function updateSlamRayFromHit(startX, startY, hitX, hitY, didHit, weight) {
  var W = getArenaW(), H = getArenaH();
  if (typeof weight !== 'number') weight = 1.0;
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
    if (e2 < dx) { err += dx; y0 += sy; }
  }

  var lFree = -0.20 * weight;
  var lOcc = +1.40 * weight;

  for (var i = 0; i < points.length - 1; i++) {
    var px = points[i].x, py = points[i].y;
    if (py >= 0 && py < slamMap.height && px >= 0 && px < slamMap.width) {
      var currentLog = slamMap.logOddsGrid[py][px];
      slamMap.logOddsGrid[py][px] = Math.max(-5.0, currentLog + lFree);
      if (slamMap.logOddsGrid[py][px] < -0.4) slamMap.grid[py][px] = 0;
      else if (slamMap.logOddsGrid[py][px] > 0.8) slamMap.grid[py][px] = 1;
      else slamMap.grid[py][px] = -1;
    }
  }

  if (didHit && points.length > 0) {
    var ep = points[points.length - 1];
    var dx_dir = Math.sign(x1 - x0);
    var dy_dir = Math.sign(y1 - y0);

    // Aggiorna la cella d'impatto principale e la cella adiacente per spessore muro
    var hitCells = [{ x: ep.x, y: ep.y }, { x: ep.x + dx_dir, y: ep.y + dy_dir }];
    for (var hc = 0; hc < hitCells.length; hc++) {
      var hx = hitCells[hc].x, hy = hitCells[hc].y;
      if (hy >= 0 && hy < slamMap.height && hx >= 0 && hx < slamMap.width) {
        var hitLog = slamMap.logOddsGrid[hy][hx];
        slamMap.logOddsGrid[hy][hx] = Math.min(+5.0, hitLog + (hc === 0 ? lOcc : lOcc * 0.7));
        if (slamMap.logOddsGrid[hy][hx] > 0.8) slamMap.grid[hy][hx] = 1;
        else if (slamMap.logOddsGrid[hy][hx] < -0.4) slamMap.grid[hy][hx] = 0;
        else slamMap.grid[hy][hx] = -1;
      }
    }
  }
}

function scanHeadFan(panDeg) {
  if (typeof castSingleRay !== 'function') return;
  var offsets = [-15, 0, 15];
  for (var i = 0; i < offsets.length; i++) {
    var totalOffset = Math.abs(panDeg + offsets[i]);
    var weight = totalOffset > 60 ? 0.4 : 1.0;
    var angle = robotState.angle + ((panDeg + offsets[i]) * Math.PI / 180);
    var ray = castSingleRay(robotState.x, robotState.y, angle);
    updateSlamRayFromHit(robotState.x, robotState.y, ray.hitX, ray.hitY, ray.hit, weight);
  }
  updateSlamStats();
}

function scanAllRays() {
  if (typeof castSingleRay !== 'function') return;
  for (var i = 0; i < SCAN_FAN_DEG.length; i++) {
    var totalOffset = Math.abs(SCAN_FAN_DEG[i]);
    var weight = totalOffset > 60 ? 0.35 : 1.0;
    var angle = robotState.angle + (SCAN_FAN_DEG[i] * Math.PI / 180);
    var ray = castSingleRay(robotState.x, robotState.y, angle);
    updateSlamRayFromHit(robotState.x, robotState.y, ray.hitX, ray.hitY, ray.hit, weight);
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
  slamMap.stats.freeCells = free;
  slamMap.stats.wallCells = walls;
}
