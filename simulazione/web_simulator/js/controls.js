// simulazione/web_simulator/js/controls.js

function initKeyboardControls() {
  const activeKeys = {};

  document.addEventListener('keydown', (e) => {
    if (activeKeys[e.code]) return;
    activeKeys[e.code] = true;

    switch (e.code) {
      case 'KeyW': sendCommand('forward'); break;
      case 'KeyS': sendCommand('backward'); break;
      case 'KeyA': sendCommand('left'); break;
      case 'KeyD': sendCommand('right'); break;
      case 'Digit1': sendCommand('rotate-left'); break;
      case 'Digit3': sendCommand('rotate-right'); break;
      case 'KeyI': sendCommand('up'); break;
      case 'KeyK': sendCommand('down'); break;
      case 'KeyJ': sendCommand('lookleft'); break;
      case 'KeyL': sendCommand('lookright'); break;
      case 'Space': sendCommand('DS'); sendCommand('TS'); sendCommand('home'); break;
    }
  });

  document.addEventListener('keyup', (e) => {
    delete activeKeys[e.code];
    switch (e.code) {
      case 'KeyW':
      case 'KeyS':
      case 'Digit1':
      case 'Digit3': sendCommand('DS'); break;
      case 'KeyA':
      case 'KeyD': sendCommand('TS'); break;
      case 'KeyI':
      case 'KeyK': sendCommand('UDstop'); break;
      case 'KeyJ':
      case 'KeyL': sendCommand('LRstop'); break;
    }
  });
}

function initMouseInteraction() {
  const canvas = document.getElementById('arenaCanvas');
  if (!canvas) return;

  let isDragging = null;

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    const W = (typeof getArenaW === 'function') ? getArenaW() : 2100;
    const H = (typeof getArenaH === 'function') ? getArenaH() : 1560;
    const worldX = (mx / canvas.width) * W;
    const worldY = (my / canvas.height) * H;

    const ball = arenaObjects.targetBall;
    const light = arenaObjects.lightSource;

    const distBall = Math.hypot(worldX - ball.x, worldY - ball.y);
    const distLight = Math.hypot(worldX - light.x, worldY - light.y);

    if (distBall <= ball.radius + 30) {
      isDragging = 'ball';
    } else if (distLight <= light.radius + 30) {
      isDragging = 'light';
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);

    const W = (typeof getArenaW === 'function') ? getArenaW() : 2100;
    const H = (typeof getArenaH === 'function') ? getArenaH() : 1560;
    const worldX = (mx / canvas.width) * W;
    const worldY = (my / canvas.height) * H;

    if (isDragging === 'ball') {
      arenaObjects.targetBall.x = worldX;
      arenaObjects.targetBall.y = worldY;
    } else if (isDragging === 'light') {
      arenaObjects.lightSource.x = worldX;
      arenaObjects.lightSource.y = worldY;
    }
  });

  window.addEventListener('mouseup', () => {
    isDragging = null;
  });
}

function setEngineMode(mode) {
  robotState.engineMode = mode;
  
  const btnJS = document.getElementById('btnEngineJS');
  const btnPy = document.getElementById('btnEnginePython');

  if (btnJS && btnPy) {
    if (mode === 'JS') {
      btnJS.className = 'engine-btn active';
      btnPy.className = 'engine-btn';
    } else {
      btnJS.className = 'engine-btn';
      btnPy.className = 'engine-btn python-active';
    }
  }

  updateModeBadge();
}
