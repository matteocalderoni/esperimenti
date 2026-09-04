// simulazione/web_simulator/js/slam/cad_renderer.js
// Motore Grafico CAD: Perimetri Sensore Quotati & Nominati da VLM (Senza Disegni Invasivi)

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

function renderCadBlueprint(ctx, w, h) {
  var dark = (cadTheme === 'dark');
  ctx.fillStyle = dark ? '#050c1a' : '#ffffff'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = dark ? '#00f0ff' : '#0f172a'; ctx.lineWidth = 2; ctx.strokeRect(12, 12, w - 24, h - 24);
  ctx.strokeStyle = dark ? 'rgba(0,240,255,0.3)' : '#64748b'; ctx.lineWidth = 0.8; ctx.strokeRect(16, 16, w - 32, h - 32);

  if (!slamMap || !slamMap.grid) return;
  var cellW = w / slamMap.width, cellH = h / slamMap.height;
  var landmarks = slamMap.semanticLandmarks || [];

  // 1. Griglia SLAM Reale (Spazio Libero e Muri)
  for (var y = 0; y < slamMap.height; y++) {
    for (var x = 0; x < slamMap.width; x++) {
      var val = slamMap.grid[y][x], px = x * cellW, py = y * cellH;
      if (val === 0) { ctx.fillStyle = dark ? 'rgba(0,240,255,0.05)' : '#fafafa'; ctx.fillRect(px, py, cellW, cellH); }
      else if (val === 1) {
        ctx.fillStyle = dark ? '#1e1b4b' : '#334155'; ctx.fillRect(px, py, cellW, cellH);
      }
    }
  }

  // 2. Perimetri Ostacoli Rilevati dal Sensore con Nome VLM & Quote Metriche
  if (typeof findSlamClusters === 'function') {
    var clusters = findSlamClusters(false);
    clusters.forEach(function(c, idx) {
      var ox = c.minX * cellW, oy = c.minY * cellH;
      var ow = (c.maxX - c.minX + 1) * cellW, oh = (c.maxY - c.minY + 1) * cellH;
      var worldCX = ((c.minX + c.maxX) / 2 / slamMap.width) * (typeof getArenaW === 'function' ? getArenaW() : 700);
      var worldCY = ((c.minY + c.maxY) / 2 / slamMap.height) * (typeof getArenaH === 'function' ? getArenaH() : 520);

      // Trova l'eventuale nome VLM associato al perimetro dell'ostacolo (anche a parete)
      var matchedLm = landmarks.find(function(lm) {
        var W = typeof getArenaW === 'function' ? getArenaW() : 700;
        var H = typeof getArenaH === 'function' ? getArenaH() : 520;
        var lmGx = Math.floor((lm.x / W) * slamMap.width), lmGy = Math.floor((lm.y / H) * slamMap.height);
        var inside = (lmGx >= c.minX - 1 && lmGx <= c.maxX + 1 && lmGy >= c.minY - 1 && lmGy <= c.maxY + 1);
        return inside || Math.hypot(lm.x - worldCX, lm.y - worldCY) < 30;
      });

      var title = matchedLm ? (matchedLm.icon + ' ' + matchedLm.name) : ('Ostacolo #' + (idx + 1));
      var dimStr = formatQuota(c.larghezzaM) + ' × ' + formatQuota(c.profonditaM);

      // Tratteggio e Campitura Pulita Tecnica CAD
      ctx.fillStyle = dark ? 'rgba(0,240,255,0.15)' : 'rgba(241,245,249,0.85)';
      ctx.fillRect(ox, oy, ow, oh);
      ctx.strokeStyle = dark ? '#00f0ff' : '#0f172a';
      ctx.lineWidth = 1.5; ctx.strokeRect(ox, oy, ow, oh);

      // Etichetta Nome VLM + Quota Metrica al Centro del Perimetro
      var cx = ox + ow / 2, cy = oy + oh / 2;
      ctx.font = 'bold 9px monospace';
      var tw1 = ctx.measureText(title).width, tw2 = ctx.measureText(dimStr).width;
      var maxW = Math.max(tw1, tw2) + 8;

      ctx.fillStyle = dark ? 'rgba(5,12,26,0.9)' : 'rgba(255,255,255,0.95)';
      ctx.fillRect(cx - maxW / 2, cy - 11, maxW, 22);
      ctx.strokeStyle = dark ? '#00f0ff' : '#64748b'; ctx.lineWidth = 0.8;
      ctx.strokeRect(cx - maxW / 2, cy - 11, maxW, 22);

      ctx.fillStyle = dark ? '#00f0ff' : '#0f172a'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(title, cx, cy - 4);
      ctx.font = '8px monospace'; ctx.fillStyle = dark ? '#94a3b8' : '#475569';
      ctx.fillText(dimStr, cx, cy + 5);
    });
  }

  // 3. Quote Esterne dell'Arena
  if (typeof analyzeRoomGeometry === 'function') {
    var geo = analyzeRoomGeometry();
    if (geo && geo.bounds) {
      var bx1 = geo.bounds.minX * cellW, bx2 = (geo.bounds.maxX + 1) * cellW;
      var by1 = geo.bounds.minY * cellH, by2 = (geo.bounds.maxY + 1) * cellH;
      var wM = formatQuota(slamSpanMeters(geo.bounds.maxX - geo.bounds.minX + 1, 'x'));
      var hM = formatQuota(slamSpanMeters(geo.bounds.maxY - geo.bounds.minY + 1, 'y'));
      drawCadTickLineTheme(ctx, Math.max(26, bx1), 26, Math.min(w - 26, bx2), 26, 'Larghezza Arena: ' + wM, false, dark);
      drawCadTickLineTheme(ctx, 26, Math.max(26, by1), 26, Math.min(h - 26, by2), 'Altezza Arena: ' + hM, true, dark);
      var propLbl = document.getElementById('blueprintProportionsLabel');
      if (propLbl) propLbl.innerText = 'Proporzioni Reali: ' + wM + ' x ' + hM;
    }
  }

  // 4. Cartiglio Geometra
  var bw = 265, bh = 76, bx = w - bw - 20, by = h - bh - 20;
  ctx.fillStyle = dark ? 'rgba(5,12,26,0.96)' : '#ffffff'; ctx.strokeStyle = dark ? '#00f0ff' : '#0f172a'; ctx.lineWidth = 1.5;
  ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = dark ? '#00f0ff' : '#0f172a'; ctx.font = 'bold 10px monospace'; ctx.textAlign = 'left';
  ctx.fillText('TAVOLA 1: PIANTA STATO DI FATTO', bx + 8, by + 14);
  ctx.strokeStyle = dark ? '#00f0ff' : '#0f172a'; ctx.beginPath(); ctx.moveTo(bx + 4, by + 20); ctx.lineTo(bx + bw - 4, by + 20); ctx.stroke();
  ctx.font = '8px monospace'; ctx.fillStyle = dark ? '#94a3b8' : '#334155';
  ctx.fillText('METODO: Perimetri Rilevati da Sensore + Nomi VLM', bx + 8, by + 32);
  ctx.fillText('ARREDI VLM: ' + (slamMap.semanticLandmarks || []).length + ' identificati (Ollama)', bx + 8, by + 44);
  ctx.fillText('STATO: ' + (slamMap.stats.exploredPct >= 99 ? '✅ RILIEVO 99% ULTIMATO' : '⏳ RILIEVO IN CORSO (' + slamMap.stats.exploredPct + '%)'), bx + 8, by + 56);
}

function drawSurveyorDimensions(ctx, w, h) {
  if (typeof cadViewActive !== 'undefined' && cadViewActive) renderCadBlueprint(ctx, w, h);
}
