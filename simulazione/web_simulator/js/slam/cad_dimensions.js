// simulazione/web_simulator/js/slam/cad_dimensions.js
// Rilievo Geometrico: Estrazione Muri Perimetrali, Tramezzi e Isolamento Arredi VLM

var cadViewActive = true;
function toggleCadDimensions() {
  cadViewActive = !cadViewActive;
  var btn = document.getElementById('btnCadToggle');
  if (btn) btn.classList.toggle('active', cadViewActive);
}

function analyzeRoomGeometry() {
  if (!slamMap || !slamMap.grid) return { bounds: null, segments: [], internalWalls: [], spurs: [], furniture: [] };
  var minGx = 999, maxGx = -1, minGy = 999, maxGy = -1;

  for (var cy = 0; cy < slamMap.height; cy++) {
    for (var cx = 0; cx < slamMap.width; cx++) {
      if (slamMap.grid[cy][cx] === 1) {
        minGx = Math.min(minGx, cx); maxGx = Math.max(maxGx, cx);
        minGy = Math.min(minGy, cy); maxGy = Math.max(maxGy, cy);
      }
    }
  }
  if (maxGx < 0) return { bounds: null, segments: [], internalWalls: [], spurs: [], furniture: [] };
  var bounds = { minX: minGx, maxX: maxGx, minY: minGy, maxY: maxGy };
  var internalWalls = [], spurs = [], furniture = [], segments = [];

  // 1. Isolamento Affidabile degli Arredi Identificati da VLM (anche se toccano le pareti)
  if (slamMap.semanticLandmarks && slamMap.semanticLandmarks.length > 0) {
    slamMap.semanticLandmarks.forEach(function(lm) {
      var centerGx = Math.max(0, Math.min(slamMap.width - 1, Math.floor((lm.x / getArenaW()) * slamMap.width)));
      var centerGy = Math.max(0, Math.min(slamMap.height - 1, Math.floor((lm.y / getArenaH()) * slamMap.height)));
      var rad = 6, fMinX = centerGx, fMaxX = centerGx, fMinY = centerGy, fMaxY = centerGy, foundCells = 0;

      for (var dy = -rad; dy <= rad; dy++) {
        for (var dx = -rad; dx <= rad; dx++) {
          var tgx = centerGx + dx, tgy = centerGy + dy;
          if (tgx >= 0 && tgx < slamMap.width && tgy >= 0 && tgy < slamMap.height && slamMap.grid[tgy][tgx] === 1) {
            fMinX = Math.min(fMinX, tgx); fMaxX = Math.max(fMaxX, tgx);
            fMinY = Math.min(fMinY, tgy); fMaxY = Math.max(fMaxY, tgy);
            foundCells++;
          }
        }
      }
      var spanX = Math.max(3, fMaxX - fMinX + 1), spanY = Math.max(3, fMaxY - fMinY + 1);
      var wM = slamSpanMeters(spanX, 'x').toFixed(2), hM = slamSpanMeters(spanY, 'y').toFixed(2);
      var furnItem = {
        minX: Math.max(0, fMinX), maxX: Math.min(slamMap.width - 1, fMaxX),
        minY: Math.max(0, fMinY), maxY: Math.min(slamMap.height - 1, fMaxY),
        wM: wM, hM: hM, furnName: lm.name, icon: lm.icon, type: 'FURNITURE'
      };
      furniture.push(furnItem);
      segments.push(furnItem);
    });
  }

  return { bounds: bounds, segments: segments, internalWalls: internalWalls, spurs: spurs, furniture: furniture };
}

function openBlueprintModal() {
  var modal = document.getElementById('blueprintModal'), cv = document.getElementById('blueprintCanvas');
  if (!modal || !cv || !slamMap || !slamMap.grid) return;
  cv.width = 880; cv.height = 640;
  var bCtx = cv.getContext('2d');
  if (typeof renderCadBlueprint === 'function') renderCadBlueprint(bCtx, cv.width, cv.height);
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
