// simulazione/web_simulator/js/render_arena.js

function drawArena() {
  if (!arenaCtx || !arenaCanvas) return;

  const W = (typeof getArenaW === 'function') ? getArenaW() : 2100;
  const H = (typeof getArenaH === 'function') ? getArenaH() : 1560;

  arenaCtx.clearRect(0, 0, arenaCanvas.width, arenaCanvas.height);

  arenaCtx.save();
  const scaleX = arenaCanvas.width / W;
  const scaleY = arenaCanvas.height / H;
  arenaCtx.scale(scaleX, scaleY);

  // 1. Griglia Sfondo (passo 120 px = 1.2 metri)
  arenaCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  arenaCtx.lineWidth = 2;
  const gridSize = 120;
  for (let x = 0; x < W; x += gridSize) {
    arenaCtx.beginPath(); arenaCtx.moveTo(x, 0); arenaCtx.lineTo(x, H); arenaCtx.stroke();
  }
  for (let y = 0; y < H; y += gridSize) {
    arenaCtx.beginPath(); arenaCtx.moveTo(0, y); arenaCtx.lineTo(W, y); arenaCtx.stroke();
  }

  // 2. Disegna Tracciato Linea Nera (Loop Ovale)
  arenaCtx.strokeStyle = '#1e293b';
  arenaCtx.lineWidth = 36;
  arenaCtx.lineCap = 'round';
  arenaCtx.lineJoin = 'round';
  arenaCtx.beginPath();
  const pts = arenaObjects.lineTrack;
  arenaCtx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) arenaCtx.lineTo(pts[i].x, pts[i].y);
  arenaCtx.closePath();
  arenaCtx.stroke();

  // 3. Disegna Mobili ed Elettrodomestici Cucina
  for (const w of arenaObjects.walls) {
    arenaCtx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    arenaCtx.strokeStyle = '#38bdf8';
    arenaCtx.lineWidth = 4;
    arenaCtx.fillRect(w.x, w.y, w.w, w.h);
    arenaCtx.strokeRect(w.x, w.y, w.w, w.h);

    // Decorazione interna (fornelli, lavello, frigo, tavolo)
    if (w.name.includes('Piano Cottura')) {
      arenaCtx.fillStyle = 'rgba(56,189,248,0.2)'; arenaCtx.fillRect(w.x+12, w.y+12, w.w*0.4, w.h-24); // lavello
      arenaCtx.strokeStyle = '#f59e0b'; arenaCtx.strokeRect(w.x+w.w*0.5, w.y+18, w.w*0.43, w.h-36); // fornelli
    } else if (w.name.includes('Tavolo')) {
      arenaCtx.strokeStyle = 'rgba(255,255,255,0.2)'; arenaCtx.strokeRect(w.x+24, w.y+24, w.w-48, w.h-48);
    }
    arenaCtx.fillStyle = '#f8fafc'; arenaCtx.font = 'bold 24px sans-serif';
    arenaCtx.textAlign = 'center'; arenaCtx.textBaseline = 'middle';
    arenaCtx.fillText((w.icon || '📦') + ' ' + w.name, w.x + w.w / 2, w.y + w.h / 2);
  }

  // 4. Disegna Target Colore (Pallina verde per OpenCV)
  const ball = arenaObjects.targetBall;
  arenaCtx.fillStyle = ball.color;
  arenaCtx.beginPath();
  arenaCtx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  arenaCtx.fill();
  arenaCtx.shadowColor = ball.color;
  arenaCtx.shadowBlur = 15;
  arenaCtx.fill();
  arenaCtx.shadowBlur = 0;

  // 5. Disegna Sorgente Luminosa per TrackLight
  const light = arenaObjects.lightSource;
  arenaCtx.fillStyle = light.color;
  arenaCtx.shadowColor = light.color;
  arenaCtx.shadowBlur = 20;
  arenaCtx.beginPath();
  arenaCtx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
  arenaCtx.fill();
  arenaCtx.shadowBlur = 0;

  // 6. Cono Sensori & Radar Scan / Watchdog
  const totalHeadAngle = robotState.angle + (robotState.panAngle * Math.PI / 180);
  const distPx = robotState.ultrasonicDist * 160;

  if (robotState.activeMode === 'scan') {
    // Cerchi concentrici di portata radar (50cm, 100cm, 150cm, 200cm)
    arenaCtx.save();
    arenaCtx.strokeStyle = 'rgba(0, 245, 212, 0.18)';
    arenaCtx.lineWidth = 1.5;
    arenaCtx.setLineDash([6, 6]);
    for (let r = 80; r <= 320; r += 80) {
      arenaCtx.beginPath();
      arenaCtx.arc(robotState.x, robotState.y, r, 0, Math.PI * 2);
      arenaCtx.stroke();
    }
    arenaCtx.setLineDash([]);

    // Fascio del Radar con gradiente luminoso che spazza a 180°
    const radarBeamGrad = arenaCtx.createRadialGradient(
      robotState.x, robotState.y, 10,
      robotState.x, robotState.y, Math.max(distPx, 40)
    );
    radarBeamGrad.addColorStop(0, 'rgba(0, 245, 212, 0.6)');
    radarBeamGrad.addColorStop(0.8, 'rgba(0, 245, 212, 0.25)');
    radarBeamGrad.addColorStop(1, 'rgba(0, 245, 212, 0.05)');

    arenaCtx.fillStyle = radarBeamGrad;
    arenaCtx.strokeStyle = '#00f5d4';
    arenaCtx.lineWidth = 3;
    arenaCtx.beginPath();
    arenaCtx.moveTo(robotState.x, robotState.y);
    arenaCtx.arc(robotState.x, robotState.y, distPx, totalHeadAngle - 0.45, totalHeadAngle + 0.45);
    arenaCtx.closePath();
    arenaCtx.fill();
    arenaCtx.stroke();

    // Raggio centrale del radar
    arenaCtx.strokeStyle = '#ffffff';
    arenaCtx.lineWidth = 2;
    arenaCtx.beginPath();
    arenaCtx.moveTo(robotState.x, robotState.y);
    arenaCtx.lineTo(robotState.x + Math.cos(totalHeadAngle) * distPx, robotState.y + Math.sin(totalHeadAngle) * distPx);
    arenaCtx.stroke();

    // Punto di eco radar (riflessione onda su ostacolo)
    const echoX = robotState.x + Math.cos(totalHeadAngle) * distPx;
    const echoY = robotState.y + Math.sin(totalHeadAngle) * distPx;
    arenaCtx.fillStyle = '#ff0055';
    arenaCtx.shadowColor = '#ff0055';
    arenaCtx.shadowBlur = 12;
    arenaCtx.beginPath();
    arenaCtx.arc(echoX, echoY, 6, 0, Math.PI * 2);
    arenaCtx.fill();
    arenaCtx.shadowBlur = 0;

    // Etichetta stato radar
    arenaCtx.font = 'bold 16px "JetBrains Mono", monospace';
    arenaCtx.fillStyle = '#00f5d4';
    arenaCtx.textAlign = 'center';
    arenaCtx.fillText(`📡 RADAR SCAN (${Math.round(robotState.panAngle)}°) - ${(robotState.ultrasonicDist * 100).toFixed(0)}cm`, robotState.x, robotState.y - 42);
    arenaCtx.restore();

  } else if (robotState.activeMode === 'motionGet') {
    // Cono Sorveglianza / WatchDog (Ambra / Arancione)
    arenaCtx.save();
    arenaCtx.fillStyle = 'rgba(245, 158, 11, 0.20)';
    arenaCtx.strokeStyle = 'rgba(245, 158, 11, 0.7)';
    arenaCtx.lineWidth = 2.5;
    arenaCtx.setLineDash([8, 4]);
    arenaCtx.beginPath();
    arenaCtx.moveTo(robotState.x, robotState.y);
    arenaCtx.arc(robotState.x, robotState.y, Math.max(distPx, 180), totalHeadAngle - 0.52, totalHeadAngle + 0.52);
    arenaCtx.closePath();
    arenaCtx.fill();
    arenaCtx.stroke();
    arenaCtx.setLineDash([]);

    // Etichetta WatchDog
    arenaCtx.font = 'bold 16px "JetBrains Mono", monospace';
    arenaCtx.fillStyle = '#f59e0b';
    arenaCtx.textAlign = 'center';
    arenaCtx.fillText(`👁️ WATCHDOG SORVEGLIANZA (${Math.round(robotState.panAngle)}°)`, robotState.x, robotState.y - 42);
    arenaCtx.restore();

  } else {
    // Cono Standard Ultrasuoni (~22°)
    arenaCtx.fillStyle = 'rgba(0, 240, 255, 0.15)';
    arenaCtx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
    arenaCtx.lineWidth = 3;
    arenaCtx.beginPath();
    arenaCtx.moveTo(robotState.x, robotState.y);
    arenaCtx.arc(robotState.x, robotState.y, distPx, totalHeadAngle - 0.38, totalHeadAngle + 0.38);
    arenaCtx.closePath();
    arenaCtx.fill();
    arenaCtx.stroke();
  }

  // 7. Disegna il Robot Adeept 4WD
  arenaCtx.save();
  arenaCtx.translate(robotState.x, robotState.y);
  arenaCtx.rotate(robotState.angle);

  // Aura LED RGB WS2812 sotto il telaio
  arenaCtx.shadowColor = robotState.ledColor;
  arenaCtx.shadowBlur = 30;
  arenaCtx.fillStyle = robotState.ledColor;
  arenaCtx.fillRect(-26, -16, 52, 32);
  arenaCtx.shadowBlur = 0;

  // Telaio Principale
  arenaCtx.fillStyle = '#0f172a';
  arenaCtx.strokeStyle = '#38bdf8';
  arenaCtx.lineWidth = 4;
  arenaCtx.beginPath();
  arenaCtx.roundRect(-28, -18, 56, 36, 6);
  arenaCtx.fill();
  arenaCtx.stroke();

  // Indicatore dei 3 Sensori IR (Palline sul davanti: Nero=Sulla linea, Verde=Bianco)
  const irCols = robotState.irSensors.map(v => v === 0 ? '#00ff55' : '#475569');
  arenaCtx.fillStyle = irCols[0]; arenaCtx.beginPath(); arenaCtx.arc(24, -12, 4, 0, Math.PI * 2); arenaCtx.fill(); // Sinistro
  arenaCtx.fillStyle = irCols[1]; arenaCtx.beginPath(); arenaCtx.arc(24, 0, 4, 0, Math.PI * 2); arenaCtx.fill();   // Centro
  arenaCtx.fillStyle = irCols[2]; arenaCtx.beginPath(); arenaCtx.arc(24, 12, 4, 0, Math.PI * 2); arenaCtx.fill();  // Destro

  // Indicatori Porte Switch (P1, P2, P3) sul retro del telaio
  const sw = robotState.switches || {};
  for (let i = 1; i <= 3; i++) {
    const isOn = !!sw[i];
    arenaCtx.fillStyle = isOn ? '#00ff55' : '#334155';
    if (isOn) {
      arenaCtx.shadowColor = '#00ff55';
      arenaCtx.shadowBlur = 8;
    }
    arenaCtx.beginPath();
    arenaCtx.arc(-22, -10 + (i - 1) * 10, 3, 0, Math.PI * 2);
    arenaCtx.fill();
    arenaCtx.shadowBlur = 0;
  }

  // Ruote 4WD
  arenaCtx.fillStyle = '#334155';
  arenaCtx.fillRect(-24, -26, 16, 8);
  arenaCtx.fillRect(8, -26, 16, 8);
  arenaCtx.fillRect(-24, 18, 16, 8);
  arenaCtx.fillRect(8, 18, 16, 8);

  // Torretta Pan-Tilt e Telecamera
  arenaCtx.save();
  arenaCtx.rotate(robotState.panAngle * Math.PI / 180);
  arenaCtx.fillStyle = '#00f0ff';
  arenaCtx.beginPath();
  arenaCtx.arc(0, 0, 12, 0, Math.PI * 2);
  arenaCtx.fill();
  arenaCtx.fillStyle = '#000';
  arenaCtx.fillRect(5, -5, 10, 10);
  // Indicatore ottico / lens
  arenaCtx.fillStyle = (robotState.activeMode === 'motionGet') ? '#ffaa00' : '#00ff55';
  arenaCtx.beginPath();
  arenaCtx.arc(14, 0, 3, 0, Math.PI * 2);
  arenaCtx.fill();
  arenaCtx.restore();

  arenaCtx.restore();

  // Ripristina la matrice di trasformazione originale
  arenaCtx.restore();
}
