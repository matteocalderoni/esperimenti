// simulazione/web_simulator/js/physics.js
// Orchestratore Principale della Fisica e delle Automazioni

function updatePhysics() {
  // 1. Aggiornamento cinematica 4WD e collisione solida muri
  updateKinematics();

  // 2. Calcolo ultrasuoni (Multi-Ray Bumper Proximity Array) e sensori IR
  updateSensors();

  // 3. Esecuzione automazioni (solo in modalità JS Experimental)
  if (robotState.engineMode === 'JS') {
    executeJSBehaviors();
  }

  // 4. Effetti LED Stroboscopici Polizia
  if (robotState.policeActive || robotState.activeMode === 'police') {
    robotState.policeState = (robotState.policeState + 1) % 12;
    robotState.ledColor = (robotState.policeState < 6) ? '#ff0055' : '#00f0ff';
  } else if (robotState.ultrasonicDist >= 0.70) {
    robotState.ledColor = '#00f5d4';
  }

  // 5. Aggiornamento Telemetria UI
  updateTelemetryUI();
}

function executeJSBehaviors() {
  const mode = robotState.activeMode;
  if (mode === 'PT') return;

  // 1. Manovra di disimpegno solo in caso di urto fisico effettivo con pareti (attivato da kinematics.js)
  if (robotState.collisionCooldown > 0) {
    robotState.speed = -0.8;
    robotState.steering = 0.05 * robotState.recoverySteeringDir;
    return;
  }

  // 2. Guardia Ostacoli APF (attiva solo nelle modalità reattive, NON in exploration che ha il suo pathfinder A*)
  if (mode !== 'exploration') {
    let guardOptions = {};
    if (mode === 'findColor') guardOptions = { dInfluence: 0.40, stopThreshold: 0.20 };
    else if (mode === 'trackLight') guardOptions = { dInfluence: 0.35, stopThreshold: 0.20 };
    else if (mode === 'automatic') guardOptions = { dInfluence: 0.65, dangerThresh: 0.18 };

    if (typeof checkAndHandleObstacles === 'function' && checkAndHandleObstacles(guardOptions)) {
      return;
    }
  }

  // 3. Esecuzione del comportamento specifico della modalità
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
