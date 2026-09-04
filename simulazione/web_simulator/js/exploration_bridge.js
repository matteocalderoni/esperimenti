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

async function triggerStationaryVlmInspection() {
  if (vlmInspecting) return;

  var headAngleRad = robotState.angle + (robotState.panAngle * Math.PI / 180);
  var targetCoord = findVisibleObstacleCoord(robotState.x, robotState.y, headAngleRad);

  // 1. Distance Gate: scarta se l'ostacolo e' a meno di 45cm (parete piatta da vicino) o oltre 2.20m
  if (targetCoord.distPx < 70 || targetCoord.distPx > 350) {
    console.log('[VLM Gate] Ispezione annullata: ostacolo fuori range ideale (' + (targetCoord.distPx/160).toFixed(2) + 'm)');
    return;
  }

  robotState.speed = 0; robotState.steering = 0;

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
        res: resData, timeStr: new Date().toLocaleTimeString()
      });
      var cntEl = document.getElementById('vlmPhotoCount');
      if (cntEl) cntEl.innerText = slamMap.vlmSnapshots.length;

      if (resData.landmarks && resData.landmarks.length > 0) {
        var lm = resData.landmarks[0];
        if (!slamMap.semanticLandmarks) slamMap.semanticLandmarks = [];
        if (!slamMap.vlmCandidateLandmarks) slamMap.vlmCandidateLandmarks = [];
        var nameToRegister = lm.display || lm.name;

        var W = typeof getArenaW === 'function' ? getArenaW() : 700;
        var H = typeof getArenaH === 'function' ? getArenaH() : 520;
        var hitGx = Math.floor((targetCoord.x / W) * slamMap.width);
        var hitGy = Math.floor((targetCoord.y / H) * slamMap.height);

        var clusters = (typeof findSlamClusters === 'function') ? findSlamClusters(true) : [];
        var targetCluster = clusters.find(function(c) {
          return hitGx >= c.minX - 2 && hitGx <= c.maxX + 2 && hitGy >= c.minY - 2 && hitGy <= c.maxY + 2;
        });

        var anchorX = targetCluster ? (((targetCluster.minX + targetCluster.maxX) / 2 / slamMap.width) * W) : targetCoord.x;
        var anchorY = targetCluster ? (((targetCluster.minY + targetCluster.maxY) / 2 / slamMap.height) * H) : targetCoord.y;

        // 2. Wall Rejection Filter: scarta etichette VLM proiettate dentro i muri perimetrali esterni
        if (anchorX <= 18 || anchorX >= W - 18 || anchorY <= 18 || anchorY >= H - 18) {
          console.log('[VLM Filter] Etichetta "' + nameToRegister + '" scartata: cade nel muro perimetrale.');
          return;
        }

        // Multi-View Consensus: Cerca nelle osservazioni candidate precedenti
        var candidateIdx = slamMap.vlmCandidateLandmarks.findIndex(function(cand) {
          return Math.hypot(cand.x - anchorX, cand.y - anchorY) < 35;
        });

        if (candidateIdx >= 0) {
          var cand = slamMap.vlmCandidateLandmarks[candidateIdx];
          cand.count += 1;
          cand.x = (cand.x + anchorX) / 2;
          cand.y = (cand.y + anchorY) / 2;
          if (cand.name === nameToRegister || cand.type === lm.type) {
            cand.confidence = Math.min(0.99, cand.confidence + 0.15);
          } else {
            // Sovrascrivi il nome se la nuova osservazione e' piu' recente/sicura
            cand.name = nameToRegister;
            cand.icon = lm.icon || '📦';
          }

          // Se raggiunge almeno 2 osservazioni concordanti o confidenza elevata, promuovi a landmark ufficiale
          if (cand.count >= 2) {
            var existingOfficialIdx = slamMap.semanticLandmarks.findIndex(function(item) {
              return Math.hypot(item.x - cand.x, item.y - cand.y) < 30;
            });
            var newEntry = {
              x: cand.x, y: cand.y, name: cand.name, icon: cand.icon,
              type: cand.type, confidence: cand.confidence, ts: Date.now()
            };
            if (existingOfficialIdx >= 0) slamMap.semanticLandmarks[existingOfficialIdx] = newEntry;
            else slamMap.semanticLandmarks.push(newEntry);
          }
        } else {
          // Primo scatto: registra come candidato provvisorio (non compare ancora in piantina)
          slamMap.vlmCandidateLandmarks.push({
            x: anchorX, y: anchorY, name: nameToRegister, icon: lm.icon || '📦',
            type: lm.type || 'GENERIC', confidence: 0.70, count: 1, ts: Date.now()
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
