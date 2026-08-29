// simulazione/web_simulator/js/render_map.js
// Visualizzatore 2D Piantina Ricostruita (Occupancy Grid SLAM Live)

function drawOccupancyMap() {
  if (!mapCanvas || !mapCtx || !slamMap || !slamMap.grid) return;

  var w = mapCanvas.width;
  var h = mapCanvas.height;
  mapCtx.clearRect(0, 0, w, h);

  // Sfondo tecnico
  mapCtx.fillStyle = '#060913';
  mapCtx.fillRect(0, 0, w, h);

  var cellW = w / slamMap.width;
  var cellH = h / slamMap.height;

  // 1. Occupancy Grid
  for (var gy = 0; gy < slamMap.height; gy++) {
    for (var gx = 0; gx < slamMap.width; gx++) {
      var val = slamMap.grid[gy][gx];
      var px = gx * cellW, py = gy * cellH;

      if (val === -1) {
        // Inesplorata — retino millimetrato
        mapCtx.strokeStyle = 'rgba(255,255,255,0.025)';
        mapCtx.lineWidth = 0.5;
        mapCtx.strokeRect(px, py, cellW, cellH);
      } else if (val === 0) {
        // Libera — ciano tenue
        mapCtx.fillStyle = 'rgba(0,240,255,0.13)';
        mapCtx.fillRect(px, py, cellW, cellH);
      } else if (val === 1) {
        // Muro — viola neon
        mapCtx.fillStyle = '#8338ec';
        mapCtx.fillRect(px, py, cellW, cellH);
        mapCtx.strokeStyle = '#a855f7';
        mapCtx.lineWidth = 0.5;
        mapCtx.strokeRect(px, py, cellW, cellH);
      }
    }
  }

  // 2. Percorso A* pianificato
  if (slamMap.currentPath && slamMap.currentPath.length > 1) {
    mapCtx.strokeStyle = '#00f5d4';
    mapCtx.lineWidth   = 2;
    mapCtx.setLineDash([4, 4]);
    mapCtx.beginPath();
    for (var pi = 0; pi < slamMap.currentPath.length; pi++) {
      var pt  = slamMap.currentPath[pi];
      var ppx = (pt.gx + 0.5) * cellW;
      var ppy = (pt.gy + 0.5) * cellH;
      if (pi === 0) mapCtx.moveTo(ppx, ppy); else mapCtx.lineTo(ppx, ppy);
    }
    mapCtx.stroke();
    mapCtx.setLineDash([]);
  }

  // 3. Frontiere (solo baricentri di cluster — riduce "tante luci")
  if (slamMap.frontiers && slamMap.frontiers.length > 0) {
    // Mostra al massimo 15 frontiere più vicine al robot per non sovraffollare
    var cur = { gx: Math.floor((robotState.x / getArenaW()) * slamMap.width),
                gy: Math.floor((robotState.y / getArenaH()) * slamMap.height) };
    var sorted = slamMap.frontiers.slice().sort(function(a,b) {
      return Math.hypot(a.gx-cur.gx, a.gy-cur.gy) - Math.hypot(b.gx-cur.gx, b.gy-cur.gy);
    });
    var maxShow = Math.min(15, sorted.length);
    for (var fi = 0; fi < maxShow; fi++) {
      var f = sorted[fi], fx = (f.gx + 0.5) * cellW, fy = (f.gy + 0.5) * cellH;
      mapCtx.fillStyle = fi === 0 ? '#ff006e' : '#ffbe0b';
      mapCtx.beginPath(); mapCtx.arc(fx, fy, fi === 0 ? 5 : 3, 0, Math.PI * 2); mapCtx.fill();
    }
  }

  // 4. Robot sulla piantina
  var W = getArenaW(), H = getArenaH();
  var rx = (robotState.x / W) * w;
  var ry = (robotState.y / H) * h;

  mapCtx.save();
  mapCtx.translate(rx, ry);
  mapCtx.rotate(robotState.angle);

  // Cono di scansione
  mapCtx.fillStyle = 'rgba(0,240,255,0.15)';
  mapCtx.beginPath();
  mapCtx.moveTo(0, 0);
  mapCtx.arc(0, 0, 28, -2.1, 2.1);
  mapCtx.closePath();
  mapCtx.fill();

  // Dot robot
  mapCtx.fillStyle   = '#00f0ff';
  mapCtx.shadowColor = '#00f0ff';
  mapCtx.shadowBlur  = 10;
  mapCtx.beginPath();
  mapCtx.arc(0, 0, 7, 0, Math.PI * 2);
  mapCtx.fill();
  mapCtx.shadowBlur = 0;

  // Indicatore direzione
  mapCtx.strokeStyle = '#fff';
  mapCtx.lineWidth   = 2;
  mapCtx.beginPath();
  mapCtx.moveTo(0, 0);
  mapCtx.lineTo(11, 0);
  mapCtx.stroke();

  mapCtx.restore();

  // 5. HUD
  mapCtx.fillStyle   = 'rgba(6,9,19,0.85)';
  mapCtx.strokeStyle = 'rgba(0,240,255,0.3)';
  mapCtx.lineWidth   = 1;
  mapCtx.fillRect(8, 8, 240, 80);
  mapCtx.strokeRect(8, 8, 240, 80);

  mapCtx.fillStyle = slamMap.stats.exploredPct >= 95 ? '#00ff55' : '#00f5d4';
  mapCtx.font      = 'bold 11px monospace';
  mapCtx.fillText('COPERTURA: ' + slamMap.stats.exploredPct + '% (TARGET >= 95%)', 16, 26);

  mapCtx.fillStyle = '#94a3b8';
  mapCtx.font      = '10px monospace';
  mapCtx.fillText('LIBERE: ' + slamMap.stats.freeCells + '  MURI: ' + slamMap.stats.wallCells, 16, 42);

  var areaW = (W / 160).toFixed(1), areaH = (H / 160).toFixed(1);
  mapCtx.fillText('ARENA: ' + areaW + 'm x ' + areaH + 'm', 16, 58);
  mapCtx.fillText('FSM: ' + slamMap.fsmState, 16, 74);
}

let modalShown = false, modalDismissed = false;
function showCompletionModal(pct) {
  if (modalShown || modalDismissed) return;
  modalShown = true;
  const overlay = document.getElementById('completionModal');
  const pctEl = document.getElementById('modalExploredPct');
  if (pctEl) pctEl.innerText = `${pct}%`;
  if (overlay) overlay.classList.add('active');
}

function closeCompletionModal() {
  const overlay = document.getElementById('completionModal');
  if (overlay) overlay.classList.remove('active');
  modalDismissed = true;
}

