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

function applyLocalCommand(cmd) {
  if (cmd === 'forward') robotState.speed = robotState.maxSpeed;
  else if (cmd === 'backward') robotState.speed = -robotState.maxSpeed * 0.7;
  else if (cmd === 'DS') robotState.speed = 0;
  else if (cmd === 'left') robotState.steering = -0.05;
  else if (cmd === 'right') robotState.steering = 0.05;
  else if (cmd === 'rotate-left') { robotState.speed = 0; robotState.angle -= 0.12; }
  else if (cmd === 'rotate-right') { robotState.speed = 0; robotState.angle += 0.12; }
  else if (cmd === 'TS') robotState.steering = 0;
  else if (cmd === 'lookleft') robotState.panAngle = Math.min(80, robotState.panAngle + 10);
  else if (cmd === 'lookright') robotState.panAngle = Math.max(-80, robotState.panAngle - 10);
  else if (cmd === 'up') robotState.tiltAngle = Math.min(45, robotState.tiltAngle + 8);
  else if (cmd === 'down') robotState.tiltAngle = Math.max(-30, robotState.tiltAngle - 8);
  else if (cmd === 'home') { robotState.panAngle = 0; robotState.tiltAngle = 0; }
  else if (cmd === 'police') { robotState.policeActive = true; robotState.activeMode = 'police'; }
  else if (cmd === 'policeOff') { robotState.policeActive = false; robotState.activeMode = 'PT'; }
  else if (cmd === 'findColor') robotState.activeMode = 'findColor';
  else if (cmd === 'automatic') robotState.activeMode = 'automatic';
  else if (cmd === 'trackLine') robotState.activeMode = 'trackLine';
  else if (cmd === 'trackLight') robotState.activeMode = 'trackLight';
  else if (cmd === 'keepDistance') robotState.activeMode = 'keepDistance';
  else if (cmd === 'stopCV' || cmd === 'automaticOff' || cmd === 'trackLineOff' || cmd === 'trackLightOff' || cmd === 'keepDistanceOff') {
    robotState.activeMode = 'PT';
    robotState.policeActive = false;
    robotState.speed = 0;
    robotState.steering = 0;
    robotState.panAngle = 0;
    if (cmd === 'stopCV' && ws && ws.readyState === WebSocket.OPEN) {
      ws.send('automaticOff');
      ws.send('policeOff');
      ws.send('trackLineOff');
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
