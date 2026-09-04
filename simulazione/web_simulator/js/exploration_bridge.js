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
  // Il VLM assegna solo etichette semantiche e NON deve inventare ostacoli sintetici nello spazio libero.
  return;
}

function isClusterVlmVerified(cX, cY) {
  if (!slamMap || !slamMap.semanticLandmarks) return false;
  return slamMap.semanticLandmarks.some(function(lm) {
    return Math.hypot(lm.x - cX, lm.y - cY) < 55 && lm.vlmVerified === true;
  });
}

async function triggerStationaryVlmInspection(forcedCluster) {
  if (vlmInspecting) return;
  if (typeof THREE === 'undefined') return;

  var W = typeof getArenaW === 'function' ? getArenaW() : 700;
  var H = typeof getArenaH === 'function' ? getArenaH() : 520;

  // 0. Ricerca cluster ostacolo isolato a centro stanza per puntamento dinamico della fotocamera
  var clusters = (typeof findSlamClusters === 'function') ? findSlamClusters(true) : [];
  var closestCluster = forcedCluster || null;

  if (!closestCluster) {
    var minClusterDist = 999;
    clusters.forEach(function(c) {
      var cX = ((c.minX + c.maxX) / 2 / slamMap.width) * W;
      var cY = ((c.minY + c.maxY) / 2 / slamMap.height) * H;
      if (cX <= 20 || cX >= W - 20 || cY <= 20 || cY >= H - 20) return;
      if (isClusterVlmVerified(cX, cY)) return; // Salva tempo se il cluster e' gia' stato confermato
      var d = Math.hypot(cX - robotState.x, cY - robotState.y);
      if (d < minClusterDist) {
        minClusterDist = d;
        closestCluster = c;
      }
    });
  }

  var cX = closestCluster ? (((closestCluster.minX + closestCluster.maxX) / 2 / slamMap.width) * W) : null;
  var cY = closestCluster ? (((closestCluster.minY + closestCluster.maxY) / 2 / slamMap.height) * H) : null;

  // Se rilevato un cluster d'arredo, orienta il robot (heading) ed il servo pan direttamente al suo centroide per un puntamento VLM perfetto
  if (closestCluster && cX !== null && cY !== null) {
    var angleToCentroid = Math.atan2(cY - robotState.y, cX - robotState.x);
    // Allinea l'orientamento frontale del robot direttamente al centro dell'oggetto
    robotState.angle = angleToCentroid;
    
    // Variazione dinamica dell'angolo pan ad ogni tentativo (0°, -20°, +20°, -35°, +35°) per inquadrature prospettiche diverse
    var offsets = [0, -20, 20, -35, 35];
    var attemptIdx = Math.max(0, (closestCluster.vlmAttempts || 1) - 1);
    var panOffset = offsets[attemptIdx % offsets.length];

    robotState.panAngle = Math.max(-80, Math.min(80, panOffset));
  }

  var headAngleRad = robotState.angle + (robotState.panAngle * Math.PI / 180);
  var targetCoord = findVisibleObstacleCoord(robotState.x, robotState.y, headAngleRad);

  // Aggiorna la fotocamera 3D Three.js in modo SINCRONO prima di scattare la foto
  if (typeof updateThreeCamera === 'function') {
    updateThreeCamera();
  }

  var snapshot = typeof getThreeFPSnapshot === 'function' ? getThreeFPSnapshot() : null;
  if (!snapshot || !snapshot.includes(',')) return;

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
        res: resData, targetX: cX || targetCoord.x, targetY: cY || targetCoord.y,
        timeStr: new Date().toLocaleTimeString()
      });
      console.log('📸 [VLM Inspection] Foto #' + slamMap.vlmSnapshots.length + ' @ ' + Math.round(freezePose.panAngle) + '° Pan | Raw Output: "' + (resData.raw || '') + '" | Status: ' + resData.status);

      var cntEl = document.getElementById('vlmPhotoCount');
      if (cntEl) cntEl.innerText = slamMap.vlmSnapshots.length;

      if (resData.landmarks && resData.landmarks.length > 0) {
        var lm = resData.landmarks[0];
        if (!slamMap.semanticLandmarks) slamMap.semanticLandmarks = [];
        if (!slamMap.vlmCandidateLandmarks) slamMap.vlmCandidateLandmarks = [];
        var nameToRegister = lm.display || lm.name;

        var anchorX = (cX !== null) ? cX : targetCoord.x;
        var anchorY = (cY !== null) ? cY : targetCoord.y;

        // 2. Wall Rejection Filter: scarta etichette VLM proiettate direttamente sulle pareti esterne (margine 25px dal bordo reale 12px)
        if (anchorX <= 25 || anchorX >= W - 25 || anchorY <= 25 || anchorY >= H - 25) {
          console.log('[VLM Filter] Etichetta "' + nameToRegister + '" scartata: cade direttamente sulla parete perimetrale.');
          return;
        }

        // Registrazione Immediata & Multi-View Consensus per la Piantina Semantica
        var landmarkEntry = {
          x: anchorX, y: anchorY, name: nameToRegister, icon: lm.icon || '📦',
          type: lm.type || 'GENERIC', confidence: 0.90, vlmVerified: true, ts: Date.now()
        };

        if (!slamMap.semanticLandmarks) slamMap.semanticLandmarks = [];
        var existingOfficialIdx = slamMap.semanticLandmarks.findIndex(function(item) {
          return Math.hypot(item.x - anchorX, item.y - anchorY) < 45;
        });

        if (existingOfficialIdx >= 0) {
          slamMap.semanticLandmarks[existingOfficialIdx] = landmarkEntry;
        } else {
          slamMap.semanticLandmarks.push(landmarkEntry);
        }

        var candidateIdx = slamMap.vlmCandidateLandmarks.findIndex(function(cand) {
          return Math.hypot(cand.x - anchorX, cand.y - anchorY) < 40;
        });

        if (candidateIdx >= 0) {
          var cand = slamMap.vlmCandidateLandmarks[candidateIdx];
          cand.count += 1;
          cand.x = (cand.x + anchorX) / 2;
          cand.y = (cand.y + anchorY) / 2;
          cand.name = nameToRegister;
          cand.icon = lm.icon || '📦';
        } else {
          slamMap.vlmCandidateLandmarks.push({
            x: anchorX, y: anchorY, name: nameToRegister, icon: lm.icon || '📦',
            type: lm.type || 'GENERIC', confidence: 0.85, count: 1, ts: Date.now()
          });
        }
      }
    }
  } catch (e) {
    console.warn('[VLM Bridge] Errore richiesta ispezione:', e);
  } finally {
    vlmInspecting = false;
  }
}

function copyVlmLogToClipboard() {
  var snaps = (slamMap && slamMap.vlmSnapshots) ? slamMap.vlmSnapshots : [];
  if (snaps.length === 0) {
    alert('Nessuna descrizione VLM presente al momento.');
    return;
  }
  var lines = ['=== LOG DESCRIZIONI VLM (MOONDREAM / OLLAMA) ===\n'];
  snaps.forEach(function(s, idx) {
    var raw = (s.res && (s.res.raw || (s.res.landmarks && s.res.landmarks[0] ? s.res.landmarks[0].description : ''))) || 'N/A';
    var cat = (s.res && s.res.landmarks && s.res.landmarks.length > 0) ? s.res.landmarks[0].display : 'Non Riconosciuto';
    lines.push('Foto #' + (idx + 1) + ' [' + s.timeStr + '] - Pan: ' + s.panDeg + '° | Heading: ' + s.headingDeg + '°');
    lines.push('  -> Descrizione Output VLM: "' + raw + '"');
    lines.push('  -> Categoria Associata: ' + cat);
    lines.push('');
  });
  var text = lines.join('\n');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(function() {
      alert('✅ Log descrizioni VLM copiato negli appunti!');
    }).catch(function() {
      console.log(text); alert('Log stampato in console!');
    });
  } else {
    console.log(text); alert('Log stampato in console!');
  }
}

function openVlmGalleryModal() {
  var modal = document.getElementById('vlmGalleryModal');
  var grid = document.getElementById('vlmGalleryGrid');
  if (!modal || !grid) return;
  grid.innerHTML = '';
  var snaps = (slamMap && slamMap.vlmSnapshots) ? slamMap.vlmSnapshots : [];

  var headerHtml = '<div style="grid-column:1 / -1; background:rgba(0,240,255,0.06); border:1px solid rgba(0,240,255,0.2); border-radius:6px; padding:10px; margin-bottom:8px; font-size:11px; color:#e2e8f0;">' +
    '<div style="font-weight:bold; color:#00f0ff; margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">' +
      '<span>💬 Prompt VLM inviato al Modello Moondream:</span>' +
      '<button onclick="copyVlmLogToClipboard()" style="padding:4px 10px; font-size:11px; background:rgba(255,190,11,0.2); border:1px solid #ffbe0b; color:#ffbe0b; border-radius:4px; cursor:pointer; font-weight:bold;">📋 Copia Log Descrizioni</button>' +
    '</div>' +
    '<code style="color:#a5f3fc; font-family:monospace;">"Identify the main object or furniture visible in this image. For example: dining table, desk, chair, sofa, bed, refrigerator, stove, cabinet, counter, or door. Output the concise object name."</code>' +
  '</div>';

  grid.innerHTML = headerHtml;

  if (snaps.length === 0) {
    grid.innerHTML += '<div style="grid-column:1 / -1; color:var(--text-muted); padding:30px; text-align:center; font-size:13px;">📸 Nessuno scatto salvato finora. Avvia l\'esplorazione SLAM per catturare le foto VLM dell\'ostacolo!</div>';
  } else {
    snaps.forEach(function(s, idx) {
      var lm = (s.res && s.res.landmarks && s.res.landmarks.length > 0) ? s.res.landmarks[0] : null;
      var raw = (s.res && (s.res.raw || (lm ? lm.description : ''))) || 'Nessuna risposta';
      var statusBadge = lm
        ? '<span style="color:#00f5d4; font-weight:bold;">' + lm.icon + ' ' + lm.display + '</span>'
        : '<span style="color:#ffbe0b;">⚠️ Non riconosciuto</span>';

      var cardHtml = '<div style="background:rgba(15,23,42,0.85); border:1px solid rgba(0,240,255,0.25); border-radius:8px; padding:10px; display:flex; flex-direction:column; gap:6px;">' +
        '<div style="font-size:11px; color:var(--text-muted); display:flex; justify-content:space-between; font-weight:bold;">' +
          '<span>Foto #' + (idx + 1) + ' (' + s.timeStr + ')</span><span>Pan: ' + s.panDeg + '°</span>' +
        '</div>' +
        '<img src="' + s.img + '" style="width:100%; height:140px; object-fit:cover; border-radius:4px; border:1px solid #334155;">' +
        '<div style="font-size:11px;">' + statusBadge + '</div>' +
        '<div style="font-size:11px; color:#38bdf8; font-family:monospace; background:rgba(0,0,0,0.5); padding:6px; border-radius:4px; border:1px solid rgba(56,189,248,0.2); max-height:60px; overflow-y:auto; word-break:break-word;">' +
          '<strong>Descrizione Model Output:</strong><br>"' + raw + '"' +
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

