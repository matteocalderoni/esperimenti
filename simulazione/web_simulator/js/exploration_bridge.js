// simulazione/web_simulator/js/exploration_bridge.js
// Bridge Telemetria & Ispezione Visiva Reale VLM con Riempimento Solido Oggetti Esplorati

var vlmInspecting = false;

function findVisibleObstacleCoord(originX, originY, angleRad) {
  var maxDist = 360, step = 6, W = getArenaW(), H = getArenaH();
  for (var d = 20; d <= maxDist; d += step) {
    var testX = originX + Math.cos(angleRad) * d;
    var testY = originY + Math.sin(angleRad) * d;
    if (testX < 0 || testX >= W || testY < 0 || testY >= H) break;
    var gx = Math.floor((testX / W) * slamMap.width);
    var gy = Math.floor((testY / H) * slamMap.height);
    if (slamMap.grid && slamMap.grid[gy] && slamMap.grid[gy][gx] === 1) return { x: testX, y: testY };
  }
  return { x: originX + Math.cos(angleRad) * 80, y: originY + Math.sin(angleRad) * 80 };
}

function fillSolidFurnitureCells(coordX, coordY, furnName) {
  if (!slamMap || !slamMap.grid) return;
  var W = getArenaW(), H = getArenaH();
  var cgx = Math.floor((coordX / W) * slamMap.width), cgy = Math.floor((coordY / H) * slamMap.height);
  var name = (furnName || '').toLowerCase();
  var rx = 4, ry = 4; // Raggio footprint di default in celle
  if (name.includes('tavolo')) { rx = 6; ry = 5; }
  else if (name.includes('cottura') || name.includes('piano')) { rx = 7; ry = 4; }
  else if (name.includes('penisola')) { rx = 4; ry = 7; }

  for (var dy = -ry; dy <= ry; dy++) {
    for (var dx = -rx; dx <= rx; dx++) {
      var gx = cgx + dx, gy = cgy + dy;
      if (gx >= 0 && gx < slamMap.width && gy >= 0 && gy < slamMap.height) {
        if (slamMap.grid[gy][gx] === -1 || slamMap.grid[gy][gx] === 0) slamMap.grid[gy][gx] = 1;
      }
    }
  }
  if (typeof calculateSlamStats === 'function') calculateSlamStats();
}

async function triggerStationaryVlmInspection() {
  if (vlmInspecting) return;
  var snapshot = typeof getThreeFPSnapshot === 'function' ? getThreeFPSnapshot() : null;
  if (!snapshot || !snapshot.includes(',')) return;

  var freezePose = {
    x: robotState.x, y: robotState.y, angle: robotState.angle, panAngle: robotState.panAngle,
    totalHead: robotState.angle + (robotState.panAngle * Math.PI / 180)
  };
  vlmInspecting = true;

  try {
    var resp = await fetch('/api/vlm_inspect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: snapshot })
    });

    if (resp.ok) {
      var resData = await resp.json();
      if (resData.landmarks && resData.landmarks.length > 0) {
        var lm = resData.landmarks[0];
        var targetCoord = findVisibleObstacleCoord(freezePose.x, freezePose.y, freezePose.totalHead);
        if (!slamMap.semanticLandmarks) slamMap.semanticLandmarks = [];
        var nameToRegister = lm.display || lm.name;
        var existingIdx = slamMap.semanticLandmarks.findIndex(function(item) {
          return item.name === nameToRegister || Math.hypot(item.x - targetCoord.x, item.y - targetCoord.y) < 50;
        });
        var newEntry = { x: targetCoord.x, y: targetCoord.y, name: nameToRegister, icon: lm.icon || '🔍', confidence: 0.94, ts: Date.now() };
        if (existingIdx >= 0) slamMap.semanticLandmarks[existingIdx] = newEntry;
        else slamMap.semanticLandmarks.push(newEntry);

        // Riempie l'interno solido del mobile nella griglia SLAM come occupato/esplorato
        fillSolidFurnitureCells(targetCoord.x, targetCoord.y, nameToRegister);
        console.log('🎉 [VLM OLLAMA REALE]: Riconosciuto & Solidificato ->', nameToRegister);
      }
    }
  } catch (e) {
    console.warn('[VLM Bridge] Errore richiesta ispezione:', e);
  } finally {
    vlmInspecting = false;
  }
}
