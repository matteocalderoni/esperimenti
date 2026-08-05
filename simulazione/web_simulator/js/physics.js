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

  if (mode === 'automatic') {
    runAutomaticBehavior();
  } else if (mode === 'findColor') {
    runFindColorBehavior();
  } else if (mode === 'trackLine') {
    runTrackLineBehavior();
  } else if (mode === 'trackLight') {
    runTrackLightBehavior();
  } else if (mode === 'keepDistance') {
    runKeepDistanceBehavior();
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
