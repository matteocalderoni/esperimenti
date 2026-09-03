// simulazione/web_simulator/js/exploration_bridge.js
// Bridge Telemetria & Ispezione Visiva VLM Ancorata ai Cluster Sensore Reali

var vlmInspecting = false;

function findVisibleObstacleCoord(originX, originY, angleRad) {
  if (typeof castSingleRay === 'function') {
    var ray = castSingleRay(originX, originY, angleRad);
    if (ray && ray.hit) return { x: ray.hitX, y: ray.hitY, distPx: ray.distPx };
  }
  var maxDist = 360, step = 6, W = getArenaW(), H = getArenaH();
  for (var d = 20; d <= maxDist; d += step) {
    var testX = originX + Math.cos(angleRad) * d;
    var testY = originY + Math.sin(angleRad) * d;
    if (testX < 0 || testX >= W || testY < 0 || testY >= H) break;
    var gx = Math.floor((testX / W) * slamMap.width);
    var gy = Math.floor((testY / H) * slamMap.height);
    if (slamMap.grid && slamMap.grid[gy] && slamMap.grid[gy][gx] === 1) return { x: testX, y: testY, distPx: d };
  }
  return { x: originX + Math.cos(angleRad) * 120, y: originY + Math.sin(angleRad) * 120, distPx: 120 };
}

function fillSolidFurnitureCells(coordX, coordY, angleRad, furnName) {
  if (!slamMap || !slamMap.grid) return;
  var W = getArenaW(), H = getArenaH();
  var centerX = coordX + Math.cos(angleRad) * 15;
  var centerY = coordY + Math.sin(angleRad) * 15;
  var cgx = Math.floor((centerX / W) * slamMap.width), cgy = Math.floor((centerY / H) * slamMap.height);
  var name = (furnName || '').toLowerCase();
  var rx = 4, ry = 4;
  if (name.includes('tavolo') || name.includes('scrivania') || name.includes('letto')) { rx = 6; ry = 5; }
  else if (name.includes('cottura') || name.includes('piano') || name.includes('divano')) { rx = 7; ry = 4; }
  else if (name.includes('penisola') || name.includes('mobile')) { rx = 4; ry = 6; }

  for (var dy = -ry; dy <= ry; dy++) {
    for (var dx = -rx; dx <= rx; dx++) {
      var gx = cgx + dx, gy = cgy + dy;
      if (gx >= 0 && gx < slamMap.width && gy >= 0 && gy < slamMap.height) {
        if (slamMap.grid[gy][gx] === -1 || slamMap.grid[gy][gx] === 0) slamMap.grid[gy][gx] = 1;
      }
    }
  }
  if (typeof updateSlamStats === 'function') updateSlamStats();
}

async function triggerStationaryVlmInspection() {
  if (vlmInspecting) return;
  robotState.speed = 0; robotState.steering = 0;

  var snapshot = typeof getThreeFPSnapshot === 'function' ? getThreeFPSnapshot() : null;
  if (!snapshot || !snapshot.includes(',')) return;

  var headAngleRad = robotState.angle + (robotState.panAngle * Math.PI / 180);
  var freezePose = {
    x: robotState.x, y: robotState.y, angle: robotState.angle, panAngle: robotState.panAngle,
    totalHead: headAngleRad
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
      if (!slamMap.vlmSnapshots) slamMap.vlmSnapshots = [];
      slamMap.vlmSnapshots.push({
        img: snapshot, panDeg: Math.round(freezePose.panAngle), headingDeg: Math.round(freezePose.angle * 180 / Math.PI),
        res: resData, timeStr: new Date().toLocaleTimeString()
      });
      var cntEl = document.getElementById('vlmPhotoCount');
      if (cntEl) cntEl.innerText = slamMap.vlmSnapshots.length;

      if (resData.landmarks && resData.landmarks.length > 0) {
        var lm = resData.landmarks[0];
        var targetCoord = findVisibleObstacleCoord(freezePose.x, freezePose.y, freezePose.totalHead);
        if (!slamMap.semanticLandmarks) slamMap.semanticLandmarks = [];
        var nameToRegister = lm.display || lm.name;

        var W = typeof getArenaW === 'function' ? getArenaW() : 700;
        var H = typeof getArenaH === 'function' ? getArenaH() : 520;
        var hitGx = Math.floor((targetCoord.x / W) * slamMap.width);
        var hitGy = Math.floor((targetCoord.y / H) * slamMap.height);

        var clusters = (typeof findSlamClusters === 'function') ? findSlamClusters(true) : [];
        var targetCluster = clusters.find(function(c) {
          return hitGx >= c.minX - 4 && hitGx <= c.maxX + 4 && hitGy >= c.minY - 4 && hitGy <= c.maxY + 4;
        });

        var anchorX = targetCluster ? (((targetCluster.minX + targetCluster.maxX) / 2 / slamMap.width) * W) : targetCoord.x;
        var anchorY = targetCluster ? (((targetCluster.minY + targetCluster.maxY) / 2 / slamMap.height) * H) : targetCoord.y;

        // Cerca se esiste gia' un landmark registrato precisamente per questo specifico cluster sensore
        var existingIdx = slamMap.semanticLandmarks.findIndex(function(item) {
          var dist = Math.hypot(item.x - anchorX, item.y - anchorY);
          return dist < 40;
        });

        var newEntry = {
          x: anchorX, y: anchorY, name: nameToRegister, icon: lm.icon || '📦',
          type: lm.type || 'GENERIC', confidence: lm.confidence || 0.95, ts: Date.now()
        };

        if (existingIdx >= 0) slamMap.semanticLandmarks[existingIdx] = newEntry;
        else slamMap.semanticLandmarks.push(newEntry);

        fillSolidFurnitureCells(anchorX, anchorY, freezePose.totalHead, nameToRegister);
      }
    }
  } catch (e) {
    console.warn('[VLM Bridge] Errore richiesta ispezione:', e);
  } finally {
    vlmInspecting = false;
  }
}

function openVlmGalleryModal() {
  var modal = document.getElementById('vlmGalleryModal');
  var grid = document.getElementById('vlmGalleryGrid');
  if (!modal || !grid) return;
  grid.innerHTML = '';
  var snaps = slamMap.vlmSnapshots || [];

  if (snaps.length === 0) {
    grid.innerHTML = '<div style="color:var(--text-muted); padding:20px; text-align:center;">Nessuno scatto salvato finora. Avvia l\'esplorazione per catturare le foto!</div>';
  } else {
    snaps.forEach(function(s, idx) {
      var lm = (s.res && s.res.landmarks && s.res.landmarks.length > 0) ? s.res.landmarks[0] : null;
      var raw = (s.res && (s.res.raw || (lm ? lm.description : ''))) || 'Nessuna risposta';
      var statusBadge = lm
        ? '<span style="color:#00f5d4; font-weight:bold;">' + lm.icon + ' ' + lm.display + '</span>'
        : '<span style="color:#ffbe0b;">⚠️ Non riconosciuto</span>';

      var cardHtml = '<div style="background:rgba(15,23,42,0.8); border:1px solid rgba(0,240,255,0.2); border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:6px;">' +
        '<div style="font-size:11px; color:var(--text-muted); display:flex; justify-content:space-between;">' +
          '<span>Foto #' + (idx + 1) + ' (' + s.timeStr + ')</span><span>Pan: ' + s.panDeg + '°</span>' +
        '</div>' +
        '<img src="' + s.img + '" style="width:100%; height:140px; object-fit:cover; border-radius:4px; border:1px solid #334155;">' +
        '<div style="font-size:11px;">' + statusBadge + '</div>' +
        '<div style="font-size:10px; color:#94a3b8; font-family:monospace; background:rgba(0,0,0,0.3); padding:4px; border-radius:3px; max-height:45px; overflow-y:auto;">' +
          'Moondream: "' + raw + '"' +
        '</div>' +
      '</div>';
      grid.innerHTML += cardHtml;
    });
  }
  modal.classList.add('active');
}

function closeVlmGalleryModal() {
  var modal = document.getElementById('vlmGalleryModal');
  if (modal) modal.classList.remove('active');
}
