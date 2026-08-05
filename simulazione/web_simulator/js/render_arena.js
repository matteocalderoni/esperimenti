// simulazione/web_simulator/js/render_arena.js

function drawArena() {
  if (!arenaCtx || !arenaCanvas) return;
  arenaCtx.clearRect(0, 0, arenaCanvas.width, arenaCanvas.height);

  // 1. Griglia Sfondo
  arenaCtx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  arenaCtx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < arenaCanvas.width; x += gridSize) {
    arenaCtx.beginPath(); arenaCtx.moveTo(x, 0); arenaCtx.lineTo(x, arenaCanvas.height); arenaCtx.stroke();
  }
  for (let y = 0; y < arenaCanvas.height; y += gridSize) {
    arenaCtx.beginPath(); arenaCtx.moveTo(0, y); arenaCtx.lineTo(arenaCanvas.width, y); arenaCtx.stroke();
  }

  // 2. Disegna Tracciato Linea Nera
  arenaCtx.strokeStyle = '#1e293b';
  arenaCtx.lineWidth = 24;
  arenaCtx.lineCap = 'round';
  arenaCtx.lineJoin = 'round';
  arenaCtx.beginPath();
  const pts = arenaObjects.lineTrack;
  arenaCtx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) arenaCtx.lineTo(pts[i].x, pts[i].y);
  arenaCtx.closePath();
  arenaCtx.stroke();

  // 3. Disegna Ostacoli (Muri Mappati)
  arenaCtx.fillStyle = 'rgba(131, 56, 236, 0.4)';
  arenaCtx.strokeStyle = '#8338ec';
  arenaCtx.lineWidth = 2;
  for (const w of arenaObjects.walls) {
    arenaCtx.fillRect(w.x, w.y, w.w, w.h);
    arenaCtx.strokeRect(w.x, w.y, w.w, w.h);
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

  // 6. Cono Raggio Ultrasuoni (Ampiezza fisica ~22°)
  const totalHeadAngle = robotState.angle + (robotState.panAngle * Math.PI / 180);
  const distPx = robotState.ultrasonicDist * 160;
  arenaCtx.fillStyle = 'rgba(0, 240, 255, 0.15)';
  arenaCtx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
  arenaCtx.lineWidth = 1;
  arenaCtx.beginPath();
  arenaCtx.moveTo(robotState.x, robotState.y);
  arenaCtx.arc(robotState.x, robotState.y, distPx, totalHeadAngle - 0.38, totalHeadAngle + 0.38);
  arenaCtx.closePath();
  arenaCtx.fill();
  arenaCtx.stroke();

  // 7. Disegna il Robot Adeept 4WD
  arenaCtx.save();
  arenaCtx.translate(robotState.x, robotState.y);
  arenaCtx.rotate(robotState.angle);

  // Aura LED RGB WS2812 sotto il telaio
  arenaCtx.shadowColor = robotState.ledColor;
  arenaCtx.shadowBlur = 30;
  arenaCtx.fillStyle = robotState.ledColor;
  arenaCtx.fillRect(-22, -14, 44, 28);
  arenaCtx.shadowBlur = 0;

  // Telaio Principale
  arenaCtx.fillStyle = '#0f172a';
  arenaCtx.strokeStyle = '#38bdf8';
  arenaCtx.lineWidth = 2;
  arenaCtx.beginPath();
  arenaCtx.roundRect(-24, -16, 48, 32, 6);
  arenaCtx.fill();
  arenaCtx.stroke();

  // Indicatore dei 3 Sensori IR (Palline sul davanti: Nero=Sulla linea, Verde=Bianco)
  const irCols = robotState.irSensors.map(v => v === 0 ? '#00ff55' : '#475569');
  arenaCtx.fillStyle = irCols[0]; arenaCtx.beginPath(); arenaCtx.arc(20, -10, 3, 0, Math.PI * 2); arenaCtx.fill(); // Sinistro
  arenaCtx.fillStyle = irCols[1]; arenaCtx.beginPath(); arenaCtx.arc(20, 0, 3, 0, Math.PI * 2); arenaCtx.fill();   // Centro
  arenaCtx.fillStyle = irCols[2]; arenaCtx.beginPath(); arenaCtx.arc(20, 10, 3, 0, Math.PI * 2); arenaCtx.fill();  // Destro

  // Ruote 4WD
  arenaCtx.fillStyle = '#334155';
  arenaCtx.fillRect(-20, -22, 14, 6);
  arenaCtx.fillRect(6, -22, 14, 6);
  arenaCtx.fillRect(-20, 16, 14, 6);
  arenaCtx.fillRect(6, 16, 14, 6);

  // Torretta Pan-Tilt e Telecamera
  arenaCtx.save();
  arenaCtx.rotate(robotState.panAngle * Math.PI / 180);
  arenaCtx.fillStyle = '#00f0ff';
  arenaCtx.beginPath();
  arenaCtx.arc(0, 0, 10, 0, Math.PI * 2);
  arenaCtx.fill();
  arenaCtx.fillStyle = '#000';
  arenaCtx.fillRect(4, -4, 8, 8);
  arenaCtx.restore();

  arenaCtx.restore();
}
