// simulazione/web_simulator/js/exploration_bridge.js
// Bridge di Telemetria & Streaming Snapshot WebGL per Modulo Esplorazione

let explorationActive = false;
let explorationInterval = null;

function startExplorationBridge() {
  explorationActive = true;
  if (explorationInterval) clearInterval(explorationInterval);

  console.log('[EXPLORATION] Avvio Bridge Telemetria 3D & VLM');
  
  // Invia telemetria e snapshot ogni 500ms durante l'esplorazione
  explorationInterval = setInterval(() => {
    if (!explorationActive || robotState.activeMode !== 'exploration') {
      stopExplorationBridge();
      return;
    }
    sendExplorationData();
  }, 500);
}

function stopExplorationBridge() {
  explorationActive = false;
  if (explorationInterval) {
    clearInterval(explorationInterval);
    explorationInterval = null;
  }
  console.log('[EXPLORATION] Arresto Bridge Telemetria');
}

function sendExplorationData() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const radarScan = typeof performRadarScan === 'function' ? performRadarScan() : [];
  const snapshot = typeof getThreeFPSnapshot === 'function' ? getThreeFPSnapshot() : null;

  const payload = {
    title: 'exploration_telemetry',
    data: {
      pose: {
        x: Math.round(robotState.x),
        y: Math.round(robotState.y),
        theta: Math.round(robotState.angle * 100) / 100
      },
      scan: radarScan.map(r => r.distMeters),
      scanAngles: radarScan.map(r => r.relAngleDeg),
      frame: snapshot
    }
  };

  ws.send(JSON.stringify(payload));
}
