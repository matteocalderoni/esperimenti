// simulazione/web_simulator/js/slam/cad_renderer.js
// Motore Grafico Tavola Architettonica CAD con Doppio Tema (AutoCAD Carta Bianca & Blueprint Neon)

var cadTheme = 'white';
function toggleCadTheme() {
  cadTheme = (cadTheme === 'white') ? 'dark' : 'white';
  var btn = document.getElementById('btnThemeToggle');
  if (btn) btn.innerText = cadTheme === 'white' ? '🎨 Tema: Bianco CAD' : '🎨 Tema: Blueprint Neon';
  var mcv = document.getElementById('blueprintCanvas');
  if (mcv && typeof renderCadBlueprint === 'function') renderCadBlueprint(mcv.getContext('2d'), mcv.width, mcv.height);
}

function drawCadTickLineTheme(ctx, x1, y1, x2, y2, label, isVert, dark) {
  ctx.strokeStyle = dark ? '#00f0ff' : '#0f172a'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  [[x1, y1], [x2, y2]].forEach(function(p) {
    ctx.beginPath(); ctx.moveTo(p[0] - 4, p[1] + 4); ctx.lineTo(p[0] + 4, p[1] - 4); ctx.stroke();
  });
  ctx.font = 'bold 10px monospace'; var tw = ctx.measureText(label).width;
  ctx.save();
  if (isVert) {
    ctx.translate(x1, (y1 + y2) / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = dark ? '#050c1a' : '#ffffff'; ctx.fillRect(-tw/2 - 4, -7, tw + 8, 14);
    ctx.fillStyle = dark ? '#00f0ff' : '#0f172a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, 0, 0);
  } else {
    var midX = (x1 + x2) / 2;
    ctx.fillStyle = dark ? '#050c1a' : '#ffffff'; ctx.fillRect(midX - tw/2 - 4, y1 - 7, tw + 8, 14);
    ctx.fillStyle = dark ? '#00f0ff' : '#0f172a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, midX, y1);
  }
  ctx.restore();
}

/** Quota larghezza x profondita' stampata sotto un blocco arredo. */
function drawCadBlockDimensions(ctx, f, ox, oy, ow, oh, dark, testoDato) {
  var testo = testoDato || (formatQuota(slamSpanMeters(f.maxX - f.minX + 1, 'x')) + ' × ' +
                            formatQuota(slamSpanMeters(f.maxY - f.minY + 1, 'y')));
  ctx.font = 'bold 7px monospace';
  var tw = ctx.measureText(testo).width;
  var cx = ox + ow / 2, cy = oy + oh + 7;
  ctx.fillStyle = dark ? 'rgba(5,12,26,0.85)' : 'rgba(255,255,255,0.9)';
  ctx.fillRect(cx - tw / 2 - 3, cy - 6, tw + 6, 11);
  ctx.fillStyle = dark ? '#00f0ff' : '#0f172a';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(testo, cx, cy);
}

function renderCadBlueprint(ctx, w, h) {
  var dark = (cadTheme === 'dark');
  ctx.fillStyle = dark ? '#050c1a' : '#ffffff'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = dark ? '#00f0ff' : '#0f172a'; ctx.lineWidth = 2; ctx.strokeRect(12, 12, w - 24, h - 24);
  ctx.strokeStyle = dark ? 'rgba(0,240,255,0.3)' : '#64748b'; ctx.lineWidth = 0.8; ctx.strokeRect(16, 16, w - 32, h - 32);

  if (!slamMap || !slamMap.grid) return;
  var geo = analyzeRoomGeometry(), cellW = w / slamMap.width, cellH = h / slamMap.height;

  // 1. Muratura Sezionata
  for (var y = 0; y < slamMap.height; y++) {
    for (var x = 0; x < slamMap.width; x++) {
      var val = slamMap.grid[y][x], px = x * cellW, py = y * cellH;
      if (val === 0) { ctx.fillStyle = dark ? 'rgba(0,240,255,0.06)' : '#fafafa'; ctx.fillRect(px, py, cellW, cellH); }
      else if (val === 1) {
        ctx.fillStyle = dark ? '#1e1b4b' : '#1e293b'; ctx.fillRect(px, py, cellW, cellH);
        ctx.strokeStyle = dark ? '#a855f7' : '#0f172a'; ctx.lineWidth = 0.5; ctx.strokeRect(px, py, cellW, cellH);
      }
    }
  }

  // 2. Blocchi CAD Arredo Architettonici
  (geo.furniture || []).forEach(function(f) {
    var ox = f.minX * cellW, oy = f.minY * cellH, ow = (f.maxX - f.minX + 1) * cellW, oh = (f.maxY - f.minY + 1) * cellH;
    var n = (f.furnName || '').toLowerCase();
    drawCadBlockDimensions(ctx, f, ox, oy, ow, oh, dark);
    if (n.includes('tavolo')) drawCadDiningTable(ctx, ox, oy, ow, oh);
    else if (n.includes('cottura') || n.includes('lavello')) drawCadCooktopSink(ctx, ox, oy, ow, oh);
    else if (n.includes('penisola') || n.includes('bancone')) drawCadPeninsula(ctx, ox, oy, ow, oh);
    else if (n.includes('frigo')) drawCadFridge(ctx, ox, oy, ow, oh);
    else if (n.includes('credenza') || n.includes('mobile')) drawCadCabinet(ctx, ox, oy, ow, oh);
  });

  // 2b. Quote sugli ingombri rilevati dalla sola griglia (non richiedono il VLM)
  if (typeof findSlamClusters === 'function' && (geo.furniture || []).length === 0) {
    findSlamClusters().forEach(function (b) {
      var ox = b.minX * cellW, oy = b.minY * cellH;
      var ow = (b.maxX - b.minX + 1) * cellW, oh = (b.maxY - b.minY + 1) * cellH;
      ctx.strokeStyle = dark ? 'rgba(0,240,255,0.55)' : 'rgba(15,23,42,0.55)';
      ctx.lineWidth = 0.8; ctx.setLineDash([3, 2]);
      ctx.strokeRect(ox, oy, ow, oh);
      ctx.setLineDash([]);
      drawCadBlockDimensions(ctx, null, ox, oy, ow, oh, dark,
        formatQuota(b.larghezzaM) + ' × ' + formatQuota(b.profonditaM));
    });
  }

  // 3. Quote Esterne a Catena ed Assi Cerchiati
  if (geo.bounds) {
    var bx1 = geo.bounds.minX * cellW, bx2 = (geo.bounds.maxX + 1) * cellW, by1 = geo.bounds.minY * cellH, by2 = (geo.bounds.maxY + 1) * cellH;
    var wM = formatQuota(slamSpanMeters(geo.bounds.maxX - geo.bounds.minX + 1, 'x'));
    var hM = formatQuota(slamSpanMeters(geo.bounds.maxY - geo.bounds.minY + 1, 'y'));
    drawCadTickLineTheme(ctx, Math.max(26, bx1), 26, Math.min(w - 26, bx2), 26, wM, false, dark);
    drawCadTickLineTheme(ctx, 26, Math.max(26, by1), 26, Math.min(h - 26, by2), hM, true, dark);
    [['①', bx1, 18], ['②', bx2, 18], ['Ⓐ', 18, by1], ['Ⓑ', 18, by2]].forEach(function(a) {
      ctx.fillStyle = dark ? '#050c1a' : '#ffffff'; ctx.strokeStyle = dark ? '#00f0ff' : '#0f172a'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(a[1], a[2], 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = dark ? '#00f0ff' : '#0f172a'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(a[0], a[1], a[2]);
    });
  }

  // 4. Dicitura Locale Protetta da Sovrapposizioni (Posizionata in zona libera)
  var freeM2 = slamAreaM2(slamMap.stats.freeCells).toFixed(2);
  var badgeX = w * 0.38, badgeY = h * 0.65;
  ctx.fillStyle = dark ? 'rgba(5,12,26,0.92)' : '#ffffff'; ctx.strokeStyle = dark ? '#00f0ff' : '#64748b'; ctx.lineWidth = 1;
  ctx.fillRect(badgeX - 60, badgeY - 14, 120, 30); ctx.strokeRect(badgeX - 60, badgeY - 14, 120, 30);
  ctx.fillStyle = dark ? '#00f0ff' : '#0f172a'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'center';
  ctx.fillText('CUCINA ABITABILE', badgeX, badgeY - 1);
  ctx.font = '8px monospace'; ctx.fillStyle = dark ? '#94a3b8' : '#475569';
  ctx.fillText('Sup. ' + freeM2 + ' m² | ±0.00', badgeX, badgeY + 11);

  // 5. Cartiglio Geometra
  var bw = 265, bh = 88, bx = w - bw - 20, by = h - bh - 20;
  ctx.fillStyle = dark ? 'rgba(5,12,26,0.96)' : '#ffffff'; ctx.strokeStyle = dark ? '#00f0ff' : '#0f172a'; ctx.lineWidth = 1.5;
  ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = dark ? '#00f0ff' : '#0f172a'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left';
  ctx.fillText('TAVOLA 1: PIANTA STATO DI FATTO', bx + 8, by + 14);
  ctx.strokeStyle = dark ? '#00f0ff' : '#0f172a'; ctx.beginPath(); ctx.moveTo(bx + 4, by + 20); ctx.lineTo(bx + bw - 4, by + 20); ctx.stroke();
  ctx.font = '8px monospace'; ctx.fillStyle = dark ? '#94a3b8' : '#334155';
  ctx.fillText('COMMITTENTE: Rilievo Robotico SLAM + VLM', bx + 8, by + 32);
  ctx.fillText('ARREDI VLM: ' + (slamMap.semanticLandmarks || []).length + '/5 identificati (Moondream)', bx + 8, by + 44);
  ctx.fillText('INGOMBRO: ' + (geo.bounds ? wM + ' × ' + hM : 'In corso') + ' | SCALA: 1:50 eq.', bx + 8, by + 56);
  ctx.fillText('STATO: ' + (slamMap.stats.exploredPct >= 99 ? '✅ RILIEVO 99% ULTIMATO' : '⏳ RILIEVO IN CORSO (' + slamMap.stats.exploredPct + '%)'), bx + 8, by + 68);
}

function drawSurveyorDimensions(ctx, w, h) {
  if (typeof cadViewActive !== 'undefined' && cadViewActive) renderCadBlueprint(ctx, w, h);
}
