// simulazione/web_simulator/js/render_map.js
// Visualizzatore 2D Mappa SLAM & Integrazione Tavola CAD del Geometra

function drawOccupancyMap() {
  if (!mapCanvas || !mapCtx || !slamMap || !slamMap.grid) return;
  var w = mapCanvas.width, h = mapCanvas.height;

  // 1. Se la modalità CAD è attiva, renderizza la Tavola Architettonica
  if (typeof cadViewActive !== 'undefined' && cadViewActive && typeof renderCadBlueprint === 'function') {
    renderCadBlueprint(mapCtx, w, h);

    // Indicatore Robot sulla Tavola CAD
    var W = getArenaW(), H = getArenaH();
    var rx = (robotState.x / W) * w, ry = (robotState.y / H) * h;
    mapCtx.save(); mapCtx.translate(rx, ry); mapCtx.rotate(robotState.angle);
    mapCtx.fillStyle = '#00f0ff'; mapCtx.beginPath(); mapCtx.arc(0, 0, 5, 0, Math.PI * 2); mapCtx.fill();
    mapCtx.strokeStyle = '#fff'; mapCtx.lineWidth = 1.5; mapCtx.beginPath(); mapCtx.moveTo(0, 0); mapCtx.lineTo(8, 0); mapCtx.stroke();
    mapCtx.restore();
    return;
  }

  // 2. Rendering Raster SLAM Standard (quando CAD è disattivato)
  mapCtx.clearRect(0, 0, w, h); mapCtx.fillStyle = '#060913'; mapCtx.fillRect(0, 0, w, h);
  var cellW = w / slamMap.width, cellH = h / slamMap.height;
  for (var gy = 0; gy < slamMap.height; gy++) {
    for (var gx = 0; gx < slamMap.width; gx++) {
      var val = slamMap.grid[gy][gx], px = gx * cellW, py = gy * cellH;
      if (val === -1) { mapCtx.strokeStyle = 'rgba(255,255,255,0.025)'; mapCtx.lineWidth = 0.5; mapCtx.strokeRect(px, py, cellW, cellH); }
      else if (val === 0) { mapCtx.fillStyle = 'rgba(0,240,255,0.13)'; mapCtx.fillRect(px, py, cellW, cellH); }
      else if (val === 1) { mapCtx.fillStyle = '#8338ec'; mapCtx.fillRect(px, py, cellW, cellH); }
    }
  }

  // Percorso A* pianificato
  if (slamMap.currentPath && slamMap.currentPath.length > 1) {
    mapCtx.strokeStyle = '#00f5d4'; mapCtx.lineWidth = 2; mapCtx.setLineDash([4, 4]); mapCtx.beginPath();
    for (var pi = 0; pi < slamMap.currentPath.length; pi++) {
      var pt = slamMap.currentPath[pi], ppx = (pt.gx + 0.5) * cellW, ppy = (pt.gy + 0.5) * cellH;
      if (pi === 0) mapCtx.moveTo(ppx, ppy); else mapCtx.lineTo(ppx, ppy);
    }
    mapCtx.stroke(); mapCtx.setLineDash([]);
  }

  // Robot sulla piantina
  var W2 = getArenaW(), H2 = getArenaH();
  var rx2 = (robotState.x / W2) * w, ry2 = (robotState.y / H2) * h;
  mapCtx.save(); mapCtx.translate(rx2, ry2); mapCtx.rotate(robotState.angle);
  mapCtx.fillStyle = '#00f0ff'; mapCtx.beginPath(); mapCtx.arc(0, 0, 6, 0, Math.PI * 2); mapCtx.fill();
  mapCtx.strokeStyle = '#fff'; mapCtx.lineWidth = 2; mapCtx.beginPath(); mapCtx.moveTo(0, 0); mapCtx.lineTo(10, 0); mapCtx.stroke();
  mapCtx.restore();
}

let modalShown = false, modalDismissed = false;
function showCompletionModal(pct) {
  if (modalShown || modalDismissed) return;
  modalShown = true;
  var overlay = document.getElementById('completionModal'), pctEl = document.getElementById('modalExploredPct');
  if (pctEl) pctEl.innerText = `${pct}%`;
  if (overlay) overlay.classList.add('active');
}

function closeCompletionModal() {
  var overlay = document.getElementById('completionModal');
  if (overlay) overlay.classList.remove('active');
  modalDismissed = true;
}
