// simulazione/web_simulator/js/websocket.js

let ws = null;

function initWebSocket() {
  const wsUrl = `ws://${window.location.hostname || 'localhost'}:8888`;
  const statusBadge = document.getElementById('wsStatus');

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      if (statusBadge) {
        statusBadge.innerHTML = '<div class="status-dot"></div> WEBSOCKET CONNESSO';
        statusBadge.style.color = '#00f5d4';
        statusBadge.style.borderColor = 'rgba(0, 245, 212, 0.4)';
      }
      ws.send("admin:123456");
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg && msg.type === 'command') {
          applyLocalCommand(msg.value);
        } else {
          handleServerResponse(msg);
        }
      } catch (e) {}
    };

    ws.onclose = () => {
      if (statusBadge) {
        statusBadge.innerHTML = '<div class="status-dot" style="background:#ff007f;box-shadow:0 0 10px #ff007f"></div> DISCONNESSO (Retry...)';
        statusBadge.style.color = '#ff007f';
        statusBadge.style.borderColor = 'rgba(255, 0, 127, 0.4)';
      }
      setTimeout(initWebSocket, 3000);
    };

    ws.onerror = () => {
      if (ws) ws.close();
    };
  } catch (err) {
    setTimeout(initWebSocket, 3000);
  }
}

function sendCommand(cmd) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(typeof cmd === 'string' ? cmd : JSON.stringify(cmd));
  }
  applyLocalCommand(cmd);
}

let radarSweepInterval = null;

function startRadarScanVisual() {
  if (radarSweepInterval) clearInterval(radarSweepInterval);
  robotState.activeMode = 'scan';
  robotState.speed = 0;
  robotState.steering = 0;
  let angle = 90;
  robotState.panAngle = angle;
  radarSweepInterval = setInterval(() => {
    angle -= 4;
    robotState.panAngle = angle;

    // Aggiorna attivamente la mappa SLAM con il raggio di scansione radar
    if (typeof updateSensors === 'function') updateSensors();
    if (typeof updateSlamRayFromHit === 'function' && typeof slamMap !== 'undefined' && slamMap && slamMap.grid) {
      const totalHeadAngle = robotState.angle + (robotState.panAngle * Math.PI / 180);
      const distPx = robotState.ultrasonicDist * 160;
      const hitX = robotState.x + Math.cos(totalHeadAngle) * distPx;
      const hitY = robotState.y + Math.sin(totalHeadAngle) * distPx;
      const didHit = (robotState.ultrasonicDist < 1.95);
      updateSlamRayFromHit(robotState.x, robotState.y, hitX, hitY, didHit, 1.2);
      if (typeof updateSlamStats === 'function') updateSlamStats();
    }

    if (angle <= -90) {
      clearInterval(radarSweepInterval);
      radarSweepInterval = null;
      setTimeout(() => {
        robotState.panAngle = 0;
        robotState.activeMode = 'PT';
        updateModeBadge();
      }, 350);
    }
  }, 30);
  updateModeBadge();
}

function applyLocalCommand(cmd) {
  // Gestione payload complessi (oggetti JSON da client/server)
  if (typeof cmd === 'object' && cmd !== null) {
    if (cmd.title === 'findColorSet') {
      const [h, s, v] = cmd.data || [0, 0, 0];
      const hueDeg = Math.round((h / 180) * 360);
      const satPct = Math.round((s / 255) * 100);
      arenaObjects.targetBall.color = `hsl(${hueDeg}, ${Math.max(50, satPct)}%, 50%)`;
    }
    return;
  }

  if (typeof cmd !== 'string') return;

  // Comandi manuali di trazione (reimpostano la modalità a PT)
  if (cmd === 'forward') { robotState.activeMode = 'PT'; robotState.speed = robotState.maxSpeed; }
  else if (cmd === 'backward') { robotState.activeMode = 'PT'; robotState.speed = -robotState.maxSpeed * 0.7; }
  else if (cmd === 'DS') robotState.speed = 0;
  else if (cmd === 'left') { robotState.activeMode = 'PT'; robotState.steering = -3; }
  else if (cmd === 'right') { robotState.activeMode = 'PT'; robotState.steering = 3; }
  else if (cmd === 'rotate-left') { robotState.activeMode = 'PT'; robotState.speed = 0; robotState.angle -= 0.15; }
  else if (cmd === 'rotate-right') { robotState.activeMode = 'PT'; robotState.speed = 0; robotState.angle += 0.15; }
  else if (cmd === 'TS') robotState.steering = 0;

  // Servomotori Pan-Tilt
  else if (cmd === 'lookleft') { robotState.activeMode = 'PT'; robotState.panAngle = Math.min(80, robotState.panAngle + 10); }
  else if (cmd === 'lookright') { robotState.activeMode = 'PT'; robotState.panAngle = Math.max(-80, robotState.panAngle - 10); }
  else if (cmd === 'up') { robotState.activeMode = 'PT'; robotState.tiltAngle = Math.min(45, robotState.tiltAngle + 8); }
  else if (cmd === 'down') { robotState.activeMode = 'PT'; robotState.tiltAngle = Math.max(-30, robotState.tiltAngle - 8); }
  else if (cmd === 'home') { robotState.activeMode = 'PT'; robotState.panAngle = 0; robotState.tiltAngle = 0; }

  // Radar Scan (scansione sonar a 180 gradi)
  else if (cmd === 'scan') {
    startRadarScanVisual();
  }

  // Automazione 1: Evitamento Ostacoli Automatico
  else if (cmd === 'automatic') {
    robotState.activeMode = 'automatic';
    robotState.targetHeading = null;
  }

  // Automazione 2: Inseguimento Colore OpenCV
  else if (cmd === 'findColor') {
    robotState.activeMode = 'findColor';
  }

  // Automazione 3: Segui Linea (IR & OpenCV CVFL)
  else if (cmd === 'trackLine' || cmd === 'CVFL') {
    robotState.activeMode = 'trackLine';
  }

  // Automazione 4: Rilevamento Movimento WatchDog
  else if (cmd === 'motionGet' || cmd === 'watchDog') {
    robotState.activeMode = 'motionGet';
    robotState.speed = 0;
    robotState.steering = 0;
  }

  // Automazione 5: Lampeggiante Polizia
  else if (cmd === 'police') {
    robotState.policeActive = true;
    robotState.activeMode = 'police';
  }
  else if (cmd === 'policeOff') {
    robotState.policeActive = false;
    robotState.activeMode = 'PT';
  }

  // Automazione 6: Mappa SLAM (Esplorazione Autonoma Fase 1)
  else if (cmd === 'exploration' || cmd === 'start_slam') {
    robotState.activeMode = 'exploration';
    robotState.engineMode = 'JS';
    if (typeof initSlamGrid === 'function') {
      initSlamGrid();
    } else if (typeof slamMap !== 'undefined') {
      slamMap.fsmState = 'HEAD_SCAN';
      slamMap.scanStep = 0;
      slamMap.scanTimer = 0;
      slamMap.frontiers = [];
      slamMap.currentPath = [];
      slamMap.pathIndex = 0;
      slamMap.stepCounter = 0;
      slamMap.stats = { freeCells: 0, wallCells: 0, exploredPct: 0 };
    }
    var btn = document.getElementById('btnInspectionTour');
    if (btn) {
      btn.disabled = true;
      btn.style.opacity = '0.4';
      btn.style.cursor = 'not-allowed';
      btn.style.boxShadow = 'none';
      btn.innerHTML = '2. 🔍 Riconosci Arredi (VLM)';
    }
  }

  // Automazione 7: Tour VLM (Ispezione Visiva Arredi Fase 2)
  else if (cmd === 'inspectionTour' || cmd === 'vlmTour' || cmd === 'start_vlm_tour') {
    robotState.activeMode = 'inspectionTour';
    robotState.engineMode = 'JS';
    if (typeof startInspectionTour === 'function') {
      startInspectionTour();
    }
  }

  // Segui Luce
  else if (cmd === 'trackLight') {
    robotState.activeMode = 'trackLight';
  }

  // Switch Porte P1, P2, P3
  else if (cmd.startsWith('Switch_')) {
    const parts = cmd.split('_');
    if (parts.length >= 3) {
      const port = parseInt(parts[1]);
      const state = (parts[2] === 'on');
      if (!robotState.switches) robotState.switches = {};
      robotState.switches[port] = state;
    }
  }

  // Taratura PWM
  else if (cmd.startsWith('SiLeft')) {
    const num = parseInt(cmd.split(' ')[1] || '0');
    if (num === 0) robotState.panAngle = Math.min(80, robotState.panAngle + 8);
    else if (num === 1) robotState.tiltAngle = Math.min(45, robotState.tiltAngle + 8);
  }
  else if (cmd.startsWith('SiRight')) {
    const num = parseInt(cmd.split(' ')[1] || '0');
    if (num === 0) robotState.panAngle = Math.max(-80, robotState.panAngle - 8);
    else if (num === 1) robotState.tiltAngle = Math.max(-30, robotState.tiltAngle - 8);
  }
  else if (cmd === 'PWMINIT' || cmd === 'PWMD') {
    robotState.panAngle = 0;
    robotState.tiltAngle = 0;
  }

  // Arresto Funzioni & Stop
  else if (cmd === 'stopCV' || cmd === 'automaticOff' || cmd === 'trackLineOff' || cmd === 'trackLightOff' || cmd === 'keepDistanceOff' || cmd === 'explorationOff' || cmd === 'inspectionTourOff') {
    if (radarSweepInterval) { clearInterval(radarSweepInterval); radarSweepInterval = null; }
    robotState.activeMode = 'PT';
    robotState.policeActive = false;
    robotState.targetHeading = null;
    robotState.speed = 0;
    robotState.steering = 0;
    robotState.panAngle = 0;
    if (typeof tourState !== 'undefined') {
      tourState.active = false;
    }
    if (cmd === 'stopCV' && ws && ws.readyState === WebSocket.OPEN) {
      ws.send('automaticOff');
      ws.send('policeOff');
      ws.send('trackLineOff');
      ws.send('explorationOff');
    }
  }
  updateModeBadge();
}

function handleServerResponse(msg) {
  if (msg.title === 'get_info' && msg.data) {
    const tempEl = document.getElementById('teleCpuTemp');
    const cpuEl = document.getElementById('teleCpuUse');
    const ramEl = document.getElementById('teleRamUse');
    if (tempEl) tempEl.innerText = `${msg.data[0]} °C`;
    if (cpuEl) cpuEl.innerText = `${msg.data[1]} %`;
    if (ramEl) ramEl.innerText = `${msg.data[2]} %`;
  }
}
