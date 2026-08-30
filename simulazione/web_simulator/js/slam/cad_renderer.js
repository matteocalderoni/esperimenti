// simulazione/web_simulator/js/slam/cad_renderer.js
// Motore Grafico Tavola Architettonica CAD: Campitura 45°, Squadratura e Quote Geometra

function drawCadHatchPattern(ctx, x, y, w, h) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = 'rgba(0,240,255,0.45)'; ctx.lineWidth = 1;
  var step = 6, diag = w + h;
  for (var d = -h; d < diag; d += step) {
    ctx.beginPath(); ctx.moveTo(x + d, y); ctx.lineTo(x + d + h, y + h); ctx.stroke();
  }
  ctx.restore();
}

function drawCadTickLine(ctx, x1, y1, x2, y2, label, isVert) {
  ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  [[x1, y1], [x2, y2]].forEach(function(p) {
    ctx.beginPath(); ctx.moveTo(p[0] - 4, p[1] + 4); ctx.lineTo(p[0] + 4, p[1] - 4); ctx.stroke();
  });
  ctx.font = 'bold 9px monospace'; var tw = ctx.measureText(label).width;
  ctx.save();
  if (isVert) {
    ctx.translate(x1, (y1 + y2) / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = '#050c1a'; ctx.fillRect(-tw/2 - 3, -6, tw + 6, 12);
    ctx.fillStyle = '#00f0ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, 0);
  } else {
    var midX = (x1 + x2) / 2;
    ctx.fillStyle = '#050c1a'; ctx.fillRect(midX - tw/2 - 3, y1 - 6, tw + 6, 12);
    ctx.fillStyle = '#00f0ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, midX, y1);
  }
  ctx.restore();
}

function renderCadBlueprint(ctx, w, h) {
  ctx.fillStyle = '#050c1a'; ctx.fillRect(0, 0, w, h);
  // 1. Squadratura Tavola CAD
  ctx.strokeStyle = 'rgba(0,240,255,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(6, 6, w - 12, h - 12);
  ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 1.5; ctx.strokeRect(10, 10, w - 20, h - 20);

  if (!slamMap || !slamMap.grid) return;
  var geo = analyzeRoomGeometry(), cellW = w / slamMap.width, cellH = h / slamMap.height;

  // 2. Griglia Millimetrata & Retino CAD
  ctx.strokeStyle = 'rgba(255,255,255,0.025)'; ctx.lineWidth = 0.5;
  for (var gx = 10; gx < w - 10; gx += 20) { ctx.beginPath(); ctx.moveTo(gx, 10); ctx.lineTo(gx, h - 10); ctx.stroke(); }
  for (var gy = 10; gy < h - 10; gy += 20) { ctx.beginPath(); ctx.moveTo(10, gy); ctx.lineTo(w - 10, gy); ctx.stroke(); }

  // 3. Muratura con Campitura Sezionata a 45°
  for (var y = 0; y < slamMap.height; y++) {
    for (var x = 0; x < slamMap.width; x++) {
      var val = slamMap.grid[y][x], px = x * cellW, py = y * cellH;
      if (val === 0) { ctx.fillStyle = 'rgba(0,240,255,0.08)'; ctx.fillRect(px, py, cellW, cellH); }
      else if (val === 1) {
        ctx.fillStyle = '#1e1b4b'; ctx.fillRect(px, py, cellW, cellH);
        drawCadHatchPattern(ctx, px, py, cellW, cellH);
        ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 0.5; ctx.strokeRect(px, py, cellW, cellH);
      }
    }
  }

  // 4. Quote Muri Interni e Tramezzi Sporgenti dal Perimetro
  var allToQuote = [].concat(geo.internalWalls, geo.spurs);
  allToQuote.forEach(function(item) {
    var ox1 = item.minX * cellW, oy1 = item.minY * cellH, ox2 = (item.maxX + 1) * cellW, oy2 = (item.maxY + 1) * cellH;
    ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
    ctx.strokeRect(ox1 - 2, oy1 - 2, (ox2 - ox1) + 4, (oy2 - oy1) + 4); ctx.setLineDash([]);
    var label = (item.type === 'SPUR' ? 'Tramezzo ' : 'Muro ') + item.wM + 'm×' + item.hM + 'm';
    var midX = (ox1 + ox2) / 2, midY = oy1 - 8;
    ctx.font = 'bold 8px monospace'; var tw = ctx.measureText(label).width;
    ctx.fillStyle = 'rgba(5,12,26,0.92)'; ctx.fillRect(midX - tw/2 - 2, midY - 5, tw + 4, 10);
    ctx.fillStyle = item.type === 'SPUR' ? '#ffbe0b' : '#00f5d4';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, midX, midY);
  });

  // 5. Quote Perimetrali Dinamiche della Stanza
  if (geo.bounds) {
    var bx1 = geo.bounds.minX * cellW, bx2 = (geo.bounds.maxX + 1) * cellW;
    var by1 = geo.bounds.minY * cellH, by2 = (geo.bounds.maxY + 1) * cellH;
    var wM = (((geo.bounds.maxX - geo.bounds.minX + 1) * 10) / 160.0).toFixed(2) + ' m';
    var hM = (((geo.bounds.maxY - geo.bounds.minY + 1) * 10) / 160.0).toFixed(2) + ' m';
    drawCadTickLine(ctx, Math.max(24, bx1), 22, Math.min(w - 24, bx2), 22, wM, false);
    drawCadTickLine(ctx, 22, Math.max(24, by1), 22, Math.min(h - 24, by2), hM, true);
  }

  // 6. Cartiglio Professionale del Geometra
  var freeM2 = (slamMap.stats.freeCells * 0.0039).toFixed(2), bw = 260, bh = 90, bx = w - bw - 14, by = h - bh - 14;
  ctx.fillStyle = 'rgba(5,12,26,0.96)'; ctx.strokeStyle = '#00f0ff'; ctx.lineWidth = 1;
  ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = '#00f0ff'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left';
  ctx.fillText('📐 TAVOLA RILIEVO ARCHITETTONICO', bx + 8, by + 15);
  ctx.strokeStyle = 'rgba(0,240,255,0.3)'; ctx.beginPath(); ctx.moveTo(bx + 5, by + 21); ctx.lineTo(bx + bw - 5, by + 21); ctx.stroke();
  ctx.fillStyle = '#94a3b8'; ctx.font = '9px monospace';
  ctx.fillText('OGGETTO: Pianta Stato di Fatto (SLAM 2D)', bx + 8, by + 34);
  ctx.fillText('MURI: ' + geo.internalWalls.length + ' interni, ' + geo.spurs.length + ' tramezzi perimetrali', bx + 8, by + 47);
  ctx.fillText('INGOMBRO: ' + (geo.bounds ? wM + ' × ' + hM : 'In scansione...'), bx + 8, by + 60);
  ctx.fillText('SUP. CALPESTABILE: ' + freeM2 + ' m² | SCALA: 1:50 eq.', bx + 8, by + 73);
  ctx.fillText('STATO: ' + (slamMap.stats.exploredPct >= 99 ? '✅ RILIEVO 99% COMPLETO' : '⏳ RILIEVO IN CORSO (' + slamMap.stats.exploredPct + '%)'), bx + 8, by + 85);

  // 7. Scala Metrica Grafica & Bussola Nord
  var sx = 24, sy = h - 24;
  ctx.fillStyle = '#050c1a'; ctx.fillRect(sx - 4, sy - 12, 140, 20); ctx.strokeStyle = '#00f0ff'; ctx.strokeRect(sx - 4, sy - 12, 140, 20);
  ctx.fillStyle = '#fff'; ctx.fillRect(sx, sy, 60, 4); ctx.fillStyle = '#00f0ff'; ctx.fillRect(sx + 60, sy, 60, 4);
  ctx.font = '8px monospace'; ctx.fillStyle = '#00f0ff'; ctx.textAlign = 'center';
  ctx.fillText('0', sx, sy - 3); ctx.fillText('0.5m', sx + 60, sy - 3); ctx.fillText('1.0m (160px)', sx + 120, sy - 3);
}

function drawSurveyorDimensions(ctx, w, h) {
  if (typeof cadViewActive !== 'undefined' && cadViewActive) renderCadBlueprint(ctx, w, h);
}
