// simulazione/web_simulator/js/render_fpv.js

function drawFPV() {
  if (!fpvCtx || !fpvCanvas) return;
  fpvCtx.clearRect(0, 0, fpvCanvas.width, fpvCanvas.height);

  // Sfondo 3D Stanza
  const grad = fpvCtx.createLinearGradient(0, 0, 0, fpvCanvas.height);
  grad.addColorStop(0, '#090d16');
  grad.addColorStop(0.5, '#131b2e');
  grad.addColorStop(1, '#050810');
  fpvCtx.fillStyle = grad;
  fpvCtx.fillRect(0, 0, fpvCanvas.width, fpvCanvas.height);

  // Griglia di prospettiva pavimento
  fpvCtx.strokeStyle = 'rgba(0, 240, 255, 0.1)';
  fpvCtx.lineWidth = 1;
  const horizon = fpvCanvas.height * 0.5;
  for (let x = -200; x <= fpvCanvas.width + 200; x += 60) {
    fpvCtx.beginPath();
    fpvCtx.moveTo(fpvCanvas.width / 2, horizon);
    fpvCtx.lineTo(x, fpvCanvas.height);
    fpvCtx.stroke();
  }

  // Disegna l'oggetto target pallina verde se inquadrato dalla telecamera
  const ball = arenaObjects.targetBall;
  const dx = ball.x - robotState.x;
  const dy = ball.y - robotState.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const targetAngle = Math.atan2(dy, dx);
  const totalHeadAngle = robotState.angle + (robotState.panAngle * Math.PI / 180);
  let diffAngle = targetAngle - totalHeadAngle;

  while (diffAngle < -Math.PI) diffAngle += Math.PI * 2;
  while (diffAngle > Math.PI) diffAngle -= Math.PI * 2;

  if (Math.abs(diffAngle) < 0.75 && dist < 380) {
    const screenX = (fpvCanvas.width / 2) + (diffAngle * 420);
    const screenY = horizon + 30 + (2000 / dist);
    const size = Math.max(10, 1600 / dist);

    fpvCtx.fillStyle = ball.color;
    fpvCtx.shadowColor = ball.color;
    fpvCtx.shadowBlur = 20;
    fpvCtx.beginPath();
    fpvCtx.arc(screenX, screenY, size, 0, Math.PI * 2);
    fpvCtx.fill();
    fpvCtx.shadowBlur = 0;

    // Se è attiva la modalità OpenCV FindColor, mostra il mirino di puntamento e blocco target
    if (robotState.activeMode === 'findColor') {
      fpvCtx.strokeStyle = '#00f5d4';
      fpvCtx.lineWidth = 2;
      fpvCtx.strokeRect(screenX - size - 6, screenY - size - 6, size * 2 + 12, size * 2 + 12);
      
      fpvCtx.fillStyle = '#00f5d4';
      fpvCtx.font = '12px monospace';
      fpvCtx.fillText('TARGET DETECTED [COLOR LOCK]', screenX - size - 6, screenY - size - 12);
    }
  }

  // Overlay HUD Telecamera
  fpvCtx.fillStyle = 'rgba(0, 240, 255, 0.8)';
  fpvCtx.font = '12px monospace';
  fpvCtx.fillText(`CAM FPV MODE: ${robotState.activeMode.toUpperCase()}`, 15, 25);
  fpvCtx.fillText(`TILT: ${Math.round(robotState.tiltAngle)}°  PAN: ${Math.round(robotState.panAngle)}°`, 15, 45);
  fpvCtx.fillText(`IR SENSORS: L:${robotState.irSensors[0]} C:${robotState.irSensors[1]} R:${robotState.irSensors[2]}`, 15, 65);
}
