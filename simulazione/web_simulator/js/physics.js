// simulazione/web_simulator/js/physics.js
// Orchestratore Principale della Fisica e delle Automazioni

function updatePhysics() {
  // 1. Aggiornamento cinematica 4WD e collisione solida muri
  updateKinematics();

  // 2. Calcolo ultrasuoni (Multi-Ray Cone Sensing) e sensori IR
  updateSensors();

  // 3. Esecuzione automazioni (solo in modalità JS Experimental)
  if (robotState.engineMode === 'JS') {
    executeJSBehaviors();
  }

  // 4. Effetti LED Stroboscopici Polizia
  if (robotState.policeActive || robotState.activeMode === 'police') {
    robotState.policeState = (robotState.policeState + 1) % 12;
    robotState.ledColor = (robotState.policeState < 6) ? '#ff0055' : '#00f0ff';
  } else {
    robotState.ledColor = '#00f5d4';
  }

  // 5. Aggiornamento Telemetria UI
  updateTelemetryUI();
}


function executeJSBehaviors() {
  const mode = robotState.activeMode;

  // In modalità esplorazione SLAM, la FSM gestisce il movimento autonomamente
  // — la guardia ostacoli e il cooldown di recupero sono già nella FSM
  if (mode === 'exploration') {
    const behavior = jsBehaviors[mode];
    if (behavior) behavior();
    return;
  }

  // 1. Guardia Ostacoli Modulare Globale con soglie ridotte per inseguimento target (evita conflitti in curva/angolo)
  let guardOptions = {};
  if (mode === 'findColor') {
    guardOptions = { glideThreshold: 0.40, dangerThreshold: 0.22, stopThreshold: 0.20 };
  } else if (mode === 'trackLight') {
    guardOptions = { glideThreshold: 0.35, dangerThreshold: 0.22, stopThreshold: 0.20 };
  }

  if (typeof checkAndHandleObstacles === 'function' && checkAndHandleObstacles(guardOptions)) {
    return;
  }

  // 3. Manovra di disimpegno solo in caso di urto fisico effettivo con pareti (attivato da kinematics.js)
  if (robotState.collisionCooldown > 0) {
    robotState.speed = -0.8;
    robotState.steering = 0.05 * robotState.recoverySteeringDir;
    return;
  }

  // 4. Esecuzione del comportamento specifico della modalità
  const behavior = jsBehaviors[mode];
  if (behavior) {
    behavior();
  }
}

function updateTelemetryUI() {
  const speedEl = document.getElementById('teleSpeed');
  const headingEl = document.getElementById('teleHeading');
  const panEl = document.getElementById('telePan');
  const distEl = document.getElementById('teleDist');

  if (speedEl) speedEl.innerText = `${Math.round(robotState.speed * 25)} %`;
  if (headingEl) headingEl.innerText = `${Math.round((robotState.angle * 180 / Math.PI) % 360)}°`;
  if (panEl) panEl.innerText = `${Math.round(robotState.panAngle)}°`;
  if (distEl) distEl.innerText = `${(robotState.ultrasonicDist * 100).toFixed(1)} cm`;
}
