// simulazione/web_simulator/js/slam/cad_blocks.js
// Blocchi Architettonici CAD 2D con Supporto Bitematico (Carta Bianca & Neon Cyberpunk)

function isDarkCad() {
  return typeof cadTheme !== 'undefined' && cadTheme === 'dark';
}

function drawCadDiningTable(ctx, x, y, w, h) {
  ctx.save();
  var dark = isDarkCad();
  ctx.fillStyle = dark ? '#0a1128' : '#f8fafc';
  ctx.strokeStyle = dark ? '#ffbe0b' : '#0f172a';
  ctx.lineWidth = 1.5;
  ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);

  // Sedie Sagomate con Schienale (Top e Bottom)
  var chairW = Math.min(24, w * 0.35), chairD = 10;
  [-chairD - 2, h + 2].forEach(function(offsetY) {
    [x + w * 0.2, x + w * 0.65].forEach(function(cx) {
      ctx.fillStyle = dark ? '#1e293b' : '#ffffff';
      ctx.strokeStyle = dark ? '#ffbe0b' : '#0f172a'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(cx - chairW/2, y + offsetY, chairW, chairD, 3) : ctx.rect(cx - chairW/2, y + offsetY, chairW, chairD);
      ctx.fill(); ctx.stroke();
    });
  });
  ctx.fillStyle = dark ? '#ffbe0b' : '#0f172a'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('🍽️ TAVOLO DA PRANZO', x + w / 2, y + h / 2);
  ctx.restore();
}

function drawCadCooktopSink(ctx, x, y, w, h) {
  ctx.save();
  var dark = isDarkCad();
  ctx.fillStyle = dark ? '#0c1222' : '#f1f5f9';
  ctx.strokeStyle = dark ? '#00f0ff' : '#0f172a'; ctx.lineWidth = 1.5;
  ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);

  // 1. Piano Cottura (4 Fuochi Circolari)
  var cookW = w * 0.45, cookH = h * 0.8, cx0 = x + 6, cy0 = y + (h - cookH) / 2;
  ctx.strokeRect(cx0, cy0, cookW, cookH);
  var burners = [[cx0 + cookW*0.3, cy0 + cookH*0.3, 5], [cx0 + cookW*0.7, cy0 + cookH*0.3, 6],
                 [cx0 + cookW*0.3, cy0 + cookH*0.7, 7], [cx0 + cookW*0.7, cy0 + cookH*0.7, 5]];
  burners.forEach(function(b) {
    ctx.beginPath(); ctx.arc(b[0], b[1], b[2], 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(b[0], b[1], b[2] * 0.4, 0, Math.PI * 2); ctx.fill();
  });
  // 2. Lavello con Vasca & Rubinetto
  var sinkW = w * 0.45, sinkH = h * 0.75, sx0 = x + w - sinkW - 6, sy0 = y + (h - sinkH) / 2;
  ctx.strokeRect(sx0, sy0, sinkW, sinkH);
  ctx.beginPath(); ctx.arc(sx0 + sinkW/2, sy0 + sinkH/2, 4, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx0 + sinkW/2, sy0 + 3); ctx.lineTo(sx0 + sinkW/2, sy0 + 10); ctx.stroke();
  ctx.fillStyle = dark ? '#00f0ff' : '#0f172a'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
  ctx.fillText('🍳 PIANO COTTURA & LAVELLO', x + w / 2, y - 6);
  ctx.restore();
}

function drawCadPeninsula(ctx, x, y, w, h) {
  ctx.save();
  var dark = isDarkCad();
  ctx.fillStyle = dark ? '#0a1128' : '#f8fafc';
  ctx.strokeStyle = dark ? '#ff70a6' : '#0f172a'; ctx.lineWidth = 1.5;
  ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
  var numStools = Math.max(2, Math.floor(h / 32));
  for (var i = 0; i < numStools; i++) {
    var sy = y + (h / (numStools + 1)) * (i + 1);
    ctx.fillStyle = dark ? '#1e293b' : '#ffffff'; ctx.strokeStyle = dark ? '#ff70a6' : '#0f172a'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(x - 10, sy, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = dark ? '#ff70a6' : '#0f172a'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillText('🍸 PENISOLA SNACK', 0, 0); ctx.restore();
  ctx.restore();
}

function drawCadFridge(ctx, x, y, w, h) {
  ctx.save();
  var dark = isDarkCad();
  ctx.fillStyle = dark ? '#0c1222' : '#f1f5f9';
  ctx.strokeStyle = dark ? '#00f5d4' : '#0f172a'; ctx.lineWidth = 1.5;
  ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = dark ? 'rgba(0,245,212,0.4)' : '#64748b'; ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y + h); ctx.stroke();
  ctx.strokeStyle = dark ? '#00f5d4' : '#0f172a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x + 4, y + h - 6); ctx.lineTo(x + w - 4, y + h - 6); ctx.stroke();
  ctx.fillStyle = dark ? '#00f5d4' : '#0f172a'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
  ctx.fillText('🧊 FRIGORIFERO', x + w / 2, y - 6);
  ctx.restore();
}

function drawCadCabinet(ctx, x, y, w, h) {
  ctx.save();
  var dark = isDarkCad();
  ctx.fillStyle = dark ? '#0a1128' : '#f8fafc';
  ctx.strokeStyle = dark ? '#a855f7' : '#0f172a'; ctx.lineWidth = 1.5;
  ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = dark ? 'rgba(168,85,247,0.4)' : '#64748b'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h); ctx.stroke();
  ctx.fillStyle = dark ? '#a855f7' : '#0f172a'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
  ctx.fillText('🗄️ MOBILE CREDENZA', x + w / 2, y + h + 10);
  ctx.restore();
}
