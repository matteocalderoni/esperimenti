// simulazione/web_simulator/js/render_fpv.js
// Telecamera FPV Fotorealistica con Texture Arredi e Visione VLM

var furnImages = {};
function getFurnImage(url) {
  if (!url) return null;
  if (!furnImages[url]) {
    var img = new Image(); img.src = url; furnImages[url] = img;
  }
  return furnImages[url];
}

function drawFPV() {
  if (!fpvCtx || !fpvCanvas) return;
  fpvCtx.clearRect(0, 0, fpvCanvas.width, fpvCanvas.height);

  // Sfondo 3D Stanza & Pareti Cucina
  var grad = fpvCtx.createLinearGradient(0, 0, 0, fpvCanvas.height);
  grad.addColorStop(0, '#0f172a'); grad.addColorStop(0.5, '#1e293b'); grad.addColorStop(1, '#0c1222');
  fpvCtx.fillStyle = grad; fpvCtx.fillRect(0, 0, fpvCanvas.width, fpvCanvas.height);

  // Parquet / Piastrelle Pavimento Cucina in Prospettiva
  fpvCtx.strokeStyle = 'rgba(255, 255, 255, 0.04)'; fpvCtx.lineWidth = 1;
  var horizon = fpvCanvas.height * 0.5;
  for (var x = -300; x <= fpvCanvas.width + 300; x += 50) {
    fpvCtx.beginPath(); fpvCtx.moveTo(fpvCanvas.width / 2, horizon); fpvCtx.lineTo(x, fpvCanvas.height); fpvCtx.stroke();
  }
  for (var y = horizon; y <= fpvCanvas.height; y += 18) {
    fpvCtx.beginPath(); fpvCtx.moveTo(0, y); fpvCtx.lineTo(fpvCanvas.width, y); fpvCtx.stroke();
  }

  // 1. Rendering Fotografico dei Mobili Cucina & Bounding Box VLM
  if (arenaObjects.walls) {
    var totalHead = robotState.angle + (robotState.panAngle * Math.PI / 180);
    // Ordina per distanza decrescente per corretta occlusione
    var sortedWalls = arenaObjects.walls.slice().sort(function(a, b) {
      return Math.hypot((b.x+b.w/2)-robotState.x, (b.y+b.h/2)-robotState.y) - Math.hypot((a.x+a.w/2)-robotState.x, (a.y+a.h/2)-robotState.y);
    });

    for (var wi = 0; wi < sortedWalls.length; wi++) {
      var furn = sortedWalls[wi];
      var cx = furn.x + furn.w / 2, cy = furn.y + furn.h / 2;
      var fdx = cx - robotState.x, fdy = cy - robotState.y, fdist = Math.hypot(fdx, fdy);
      var fDiff = Math.atan2(fdy, fdx) - totalHead;
      while (fDiff < -Math.PI) fDiff += Math.PI * 2;
      while (fDiff > Math.PI) fDiff -= Math.PI * 2;

      if (Math.abs(fDiff) < 0.85 && fdist < 360 && fdist > 25) {
        var sx = (fpvCanvas.width / 2) + (fDiff * 450);
        var sy = horizon + 20 + (1600 / fdist);
        var sw = Math.max(45, (furn.w * 380) / fdist), sh = Math.max(40, (furn.h * 420) / fdist);
        var img = getFurnImage(furn.asset);

        if (img && img.complete && img.naturalWidth > 0) {
          fpvCtx.drawImage(img, sx - sw/2, sy - sh/2, sw, sh);
        } else {
          fpvCtx.fillStyle = '#1e293b'; fpvCtx.fillRect(sx - sw/2, sy - sh/2, sw, sh);
        }

        // Bounding Box AI VLM (Ollama LLaVA Vision)
        fpvCtx.strokeStyle = '#ffbe0b'; fpvCtx.lineWidth = 1.5; fpvCtx.setLineDash([3, 3]);
        fpvCtx.strokeRect(sx - sw/2 - 3, sy - sh/2 - 3, sw + 6, sh + 6); fpvCtx.setLineDash([]);
        fpvCtx.fillStyle = '#060913'; fpvCtx.fillRect(sx - sw/2 - 3, sy - sh/2 - 16, sw + 6, 13);
        fpvCtx.fillStyle = '#ffbe0b'; fpvCtx.font = 'bold 8px monospace';
        fpvCtx.fillText((furn.icon || '🔍') + ' ' + furn.name, sx - sw/2, sy - sh/2 - 6);
      }
    }
  }

  // 2. Render Target Pallina Verde (OpenCV)
  var ball = arenaObjects.targetBall;
  var bdx = ball.x - robotState.x, bdy = ball.y - robotState.y, bdist = Math.hypot(bdx, bdy);
  var bDiff = Math.atan2(bdy, bdx) - (robotState.angle + (robotState.panAngle * Math.PI / 180));
  while (bDiff < -Math.PI) bDiff += Math.PI * 2;
  while (bDiff > Math.PI) bDiff -= Math.PI * 2;

  if (Math.abs(bDiff) < 0.75 && bdist < 380) {
    var bsx = (fpvCanvas.width / 2) + (bDiff * 420), bsy = horizon + 30 + (2000 / bdist), bsize = Math.max(10, 1600 / bdist);
    fpvCtx.fillStyle = ball.color; fpvCtx.beginPath(); fpvCtx.arc(bsx, bsy, bsize, 0, Math.PI * 2); fpvCtx.fill();
  }

  // 3. Overlay HUD Telecamera
  fpvCtx.fillStyle = 'rgba(0, 240, 255, 0.85)'; fpvCtx.font = '10px monospace';
  fpvCtx.fillText('CAM FPV: VLM VISION (LLaVA ACTIVE)', 10, 18);
  fpvCtx.fillText('PAN: ' + Math.round(robotState.panAngle) + '°  TILT: ' + Math.round(robotState.tiltAngle) + '°', 10, 32);
}
