// simulazione/web_simulator/js/slam/cad_dimensions.js
// Rilievo Geometrico: Estrazione e Misurazione Muri Perimetrali, Tramezzi e Ostacoli

var cadViewActive = true;

function toggleCadDimensions() {
  cadViewActive = !cadViewActive;
  var btn = document.getElementById('btnCadToggle');
  if (btn) btn.classList.toggle('active', cadViewActive);
}

function analyzeRoomGeometry() {
  if (!slamMap || !slamMap.grid) return { bounds: null, segments: [], internalWalls: [], spurs: [] };
  var visited = [];
  for (var y = 0; y < slamMap.height; y++) visited.push(new Array(slamMap.width).fill(false));
  var minGx = 999, maxGx = -1, minGy = 999, maxGy = -1;
  var clusters = [];

  for (var cy = 0; cy < slamMap.height; cy++) {
    for (var cx = 0; cx < slamMap.width; cx++) {
      if (slamMap.grid[cy][cx] === 1 && !visited[cy][cx]) {
        var queue = [{ x: cx, y: cy }], cluster = [{ x: cx, y: cy }], qi = 0;
        visited[cy][cx] = true;
        while (qi < queue.length) {
          var qc = queue[qi++];
          var nbs = [{x:qc.x+1,y:qc.y},{x:qc.x-1,y:qc.y},{x:qc.x,y:qc.y+1},{x:qc.x,y:qc.y-1}];
          for (var ni = 0; ni < nbs.length; ni++) {
            var nb = nbs[ni];
            if (nb.x >= 0 && nb.x < slamMap.width && nb.y >= 0 && nb.y < slamMap.height && !visited[nb.y][nb.x] && slamMap.grid[nb.y][nb.x] === 1) {
              visited[nb.y][nb.x] = true; cluster.push(nb); queue.push(nb);
            }
          }
        }
        if (cluster.length >= 2) {
          var cMinX = Math.min.apply(null, cluster.map(function(p){return p.x;})), cMaxX = Math.max.apply(null, cluster.map(function(p){return p.x;}));
          var cMinY = Math.min.apply(null, cluster.map(function(p){return p.y;})), cMaxY = Math.max.apply(null, cluster.map(function(p){return p.y;}));
          clusters.push({ cells: cluster, minX: cMinX, maxX: cMaxX, minY: cMinY, maxY: cMaxY });
          minGx = Math.min(minGx, cMinX); maxGx = Math.max(maxGx, cMaxX);
          minGy = Math.min(minGy, cMinY); maxGy = Math.max(maxGy, cMaxY);
        }
      }
    }
  }
  if (maxGx < 0) return { bounds: null, segments: [], internalWalls: [], spurs: [] };

  var bounds = { minX: minGx, maxX: maxGx, minY: minGy, maxY: maxGy };
  var internalWalls = [], spurs = [], segments = [];

  clusters.forEach(function(c) {
    var spanX = c.maxX - c.minX + 1, spanY = c.maxY - c.minY + 1;
    var wM = (spanX * 10 / 160.0).toFixed(2), hM = (spanY * 10 / 160.0).toFixed(2);
    var touchesBorder = (c.minX <= bounds.minX + 1 || c.maxX >= bounds.maxX - 1 || c.minY <= bounds.minY + 1 || c.maxY >= bounds.maxY - 1);
    var isLongSpur = (spanX >= 3 && spanY <= 3) || (spanY >= 3 && spanX <= 3);

    var item = { minX: c.minX, maxX: c.maxX, minY: c.minY, maxY: c.maxY, wM: wM, hM: hM, cells: c.cells };
    if (!touchesBorder) {
      item.type = 'INTERNAL'; internalWalls.push(item);
    } else if (isLongSpur && (spanX < (bounds.maxX - bounds.minX) * 0.7 && spanY < (bounds.maxY - bounds.minY) * 0.7)) {
      item.type = 'SPUR'; spurs.push(item);
    } else {
      item.type = 'PERIMETER';
    }
    segments.push(item);
  });

  return { bounds: bounds, segments: segments, internalWalls: internalWalls, spurs: spurs };
}

function openBlueprintModal() {
  var modal = document.getElementById('blueprintModal'), cv = document.getElementById('blueprintCanvas');
  if (!modal || !cv || !slamMap || !slamMap.grid) return;
  cv.width = 880; cv.height = 640;
  var bCtx = cv.getContext('2d');
  if (typeof renderCadBlueprint === 'function') {
    renderCadBlueprint(bCtx, cv.width, cv.height);
  }
  modal.classList.add('active');
}

function closeBlueprintModal() {
  var modal = document.getElementById('blueprintModal');
  if (modal) modal.classList.remove('active');
}

function exportCadPlan() {
  if (!mapCanvas) return;
  var link = document.createElement('a'); link.download = 'tavola_rilievo_cad_geometra.png';
  link.href = mapCanvas.toDataURL('image/png'); link.click();
}
