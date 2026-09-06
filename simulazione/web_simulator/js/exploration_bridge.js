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

function getClusterKey(cX, cY) {
  return Math.round(cX / 60) + '_' + Math.round(cY / 60);
}

function getClusterAttemptCount(cX, cY) {
  if (!slamMap) return 0;
  if (!slamMap.clusterTracking) slamMap.clusterTracking = {};
  var key = getClusterKey(cX, cY);
  return (slamMap.clusterTracking[key] && slamMap.clusterTracking[key].attempts) || 0;
}

function isClusterAbandoned(cX, cY) {
  if (!slamMap) return false;
  if (!slamMap.clusterTracking) slamMap.clusterTracking = {};
  var key = getClusterKey(cX, cY);
  return (slamMap.clusterTracking[key] && slamMap.clusterTracking[key].abandoned === true);
}

function recordClusterAttempt(cX, cY) {
  if (!slamMap) return;
  if (!slamMap.clusterTracking) slamMap.clusterTracking = {};
  var key = getClusterKey(cX, cY);
  if (!slamMap.clusterTracking[key]) {
    slamMap.clusterTracking[key] = { attempts: 0, lastTime: 0, abandoned: false };
  }
  var rec = slamMap.clusterTracking[key];
  rec.attempts += 1;
  rec.lastTime = Date.now();

  if (rec.attempts >= 5) {
    rec.abandoned = true;
    rec.verified = true;
    registerUnknownObstacleLandmark(cX, cY);
  }
}

function registerUnknownObstacleLandmark(cX, cY, cluster) {
  if (!slamMap) return;
  if (!slamMap.semanticLandmarks) slamMap.semanticLandmarks = [];
  var W = typeof getArenaW === 'function' ? getArenaW() : 2100;
  var H = typeof getArenaH === 'function' ? getArenaH() : 1560;

  var wPx = 200, hPx = 200;
  if (cluster) {
    wPx = Math.max(50, Math.round(((cluster.maxX - cluster.minX) / slamMap.width) * W));
    hPx = Math.max(50, Math.round(((cluster.maxY - cluster.minY) / slamMap.height) * H));
    cluster.vlmVerified = true;
    cluster.vlmAbandoned = true;
  }

  var clKey = getClusterKey(cX, cY);
  if (!slamMap.clusterTracking) slamMap.clusterTracking = {};
  if (!slamMap.clusterTracking[clKey]) slamMap.clusterTracking[clKey] = {};
  slamMap.clusterTracking[clKey].verified = true;
  slamMap.clusterTracking[clKey].abandoned = true;

  var existingIdx = slamMap.semanticLandmarks.findIndex(function(lm) {
    return Math.hypot(lm.x - cX, lm.y - cY) < 70;
  });

  var entry = {
    id: 'obj_unknown_' + Math.round(cX) + '_' + Math.round(cY),
    type: 'UNKNOWN',
    name: '📦 Oggetto Sconosciuto',
    label: '📦 Oggetto Sconosciuto',
    display: '📦 Oggetto Sconosciuto',
    icon: '📦',
    x: cX,
    y: cY,
    w: wPx,
    h: hPx,
    vlmVerified: true,
    vlmAbandoned: true,
    isStaticWall: false
  };

  if (existingIdx >= 0) {
    slamMap.semanticLandmarks[existingIdx] = entry;
  } else {
    slamMap.semanticLandmarks.push(entry);
  }
  console.log('📦 [VLM Fallback] Arredo a (' + Math.round(cX) + ', ' + Math.round(cY) + ') registrato come "📦 Oggetto Sconosciuto"');
}

function isClusterVlmVerified(cX, cY) {
  if (!slamMap) return false;
  if (isClusterAbandoned(cX, cY)) return true;
  var key = getClusterKey(cX, cY);
  if (slamMap.clusterTracking && slamMap.clusterTracking[key] && slamMap.clusterTracking[key].verified) return true;
  if (!slamMap.semanticLandmarks) return false;
  return slamMap.semanticLandmarks.some(function(lm) {
    return Math.hypot(lm.x - cX, lm.y - cY) < 85 && lm.vlmVerified === true;
  });
}

/**
 * Calcola una posa di osservazione ottimale nello spazio libero di fronte all'arredo
 * a distanza ravvicinata (~95px / 1 metro) con linea di vista diretta.
 */
function getOptimalInspectionPose(cluster) {
  if (!cluster || !slamMap || !slamMap.grid) return null;
  var W = (typeof getArenaW === 'function') ? getArenaW() : 2100;
  var H = (typeof getArenaH === 'function') ? getArenaH() : 1560;
  var minWx = (cluster.minX / slamMap.width) * W;
  var maxWx = (cluster.maxX / slamMap.width) * W;
  var minWy = (cluster.minY / slamMap.height) * H;
  var maxWy = (cluster.maxY / slamMap.height) * H;
  var cX = (minWx + maxWx) / 2;
  var cY = (minWy + maxWy) / 2;

  var dGrid = (typeof getDilatedSlamGrid === 'function') ? getDilatedSlamGrid() : slamMap.grid;
  var standoffs = [95, 115, 135, 75];
  var bestPose = null, bestDist = 9999;

  for (var s = 0; s < standoffs.length; s++) {
    var standoff = standoffs[s];
    // Pose ortogonali rispetto alle facce dell'arredo + opzioni diagonali
    var candidates = [
      { px: cX, py: minWy - standoff, targetX: cX, targetY: minWy }, // Nord
      { px: cX, py: maxWy + standoff, targetX: cX, targetY: maxWy }, // Sud
      { px: minWx - standoff, py: cY, targetX: minWx, targetY: cY }, // Ovest
      { px: maxWx + standoff, py: cY, targetX: maxWx, targetY: cY }, // Est
      { px: minWx - standoff * 0.8, py: minWy - standoff * 0.8, targetX: minWx, targetY: minWy },
      { px: maxWx + standoff * 0.8, py: minWy - standoff * 0.8, targetX: maxWx, targetY: minWy },
      { px: minWx - standoff * 0.8, py: maxWy + standoff * 0.8, targetX: minWx, targetY: maxWy },
      { px: maxWx + standoff * 0.8, py: maxWy + standoff * 0.8, targetX: maxWx, targetY: maxWy }
    ];

    for (var i = 0; i < candidates.length; i++) {
      var cand = candidates[i];
      if (cand.px < 50 || cand.px >= W - 50 || cand.py < 50 || cand.py >= H - 50) continue;
      var g = slamWorldToGrid(cand.px, cand.py);
      if (dGrid[g.gy] && dGrid[g.gy][g.gx] === 0) {
        var dRobot = Math.hypot(cand.px - robotState.x, cand.py - robotState.y);
        if (dRobot < bestDist) {
          bestDist = dRobot;
          bestPose = {
            gx: g.gx,
            gy: g.gy,
            worldX: cand.px,
            worldY: cand.py,
            targetAngle: Math.atan2(cand.targetY - cand.py, cand.targetX - cand.px),
            cluster: cluster,
            cX: cX,
            cY: cY
          };
        }
      }
    }
    if (bestPose) break;
  }
  return bestPose;
}

async function triggerStationaryVlmInspection(forcedCluster) {
  if (vlmInspecting) return;
  if (typeof THREE === 'undefined') return;

  var W = typeof getArenaW === 'function' ? getArenaW() : 2100;
  var H = typeof getArenaH === 'function' ? getArenaH() : 1560;

  var clusters = (typeof findSlamClusters === 'function') ? findSlamClusters(true) : [];
  var closestCluster = forcedCluster || null;

  if (!closestCluster) {
    var minEdgeDist = 120;
    clusters.forEach(function(c) {
      var minWx = (c.minX / slamMap.width) * W;
      var maxWx = (c.maxX / slamMap.width) * W;
      var minWy = (c.minY / slamMap.height) * H;
      var maxWy = (c.maxY / slamMap.height) * H;
      var cX = (minWx + maxWx) / 2;
      var cY = (minWy + maxWy) / 2;
      if (cX <= 25 || cX >= W - 25 || cY <= 25 || cY >= H - 25) return;
      if (isClusterVlmVerified(cX, cY)) return;
      var dx = Math.max(minWx - robotState.x, 0, robotState.x - maxWx);
      var dy = Math.max(minWy - robotState.y, 0, robotState.y - maxWy);
      var ed = Math.hypot(dx, dy);
      if (ed < minEdgeDist) {
        minEdgeDist = ed;
        closestCluster = c;
      }
    });
  }

  if (!closestCluster) return;

  var minWx = (closestCluster.minX / slamMap.width) * W;
  var maxWx = (closestCluster.maxX / slamMap.width) * W;
  var minWy = (closestCluster.minY / slamMap.height) * H;
  var maxWy = (closestCluster.maxY / slamMap.height) * H;
  var cX = (minWx + maxWx) / 2;
  var cY = (minWy + maxWy) / 2;

  // Calcola la distanza minima dal bordo dell'arredo
  var dx = Math.max(minWx - robotState.x, 0, robotState.x - maxWx);
  var dy = Math.max(minWy - robotState.y, 0, robotState.y - maxWy);
  var edgeDist = Math.hypot(dx, dy);

  // Rifiuta scatti da lontano: l'ispezione deve avvenire solo a raggio ravvicinato (<= 160px = 1 metro)
  if (edgeDist > 160) {
    return { success: false, reason: 'too_far' };
  }

  // Puntamento ottico: orienta la fotocamera (pan servo) verso la faccia visibile dell'arredo senza teletrasporto del telaio
  var targetLookX = (robotState.x < minWx) ? minWx : (robotState.x > maxWx ? maxWx : cX);
  var targetLookY = (robotState.y < minWy) ? minWy : (robotState.y > maxWy ? maxWy : cY);
  var angleToCentroid = Math.atan2(targetLookY - robotState.y, targetLookX - robotState.x);

  var diffRad = angleToCentroid - robotState.angle;
  while (diffRad > Math.PI) diffRad -= 2 * Math.PI;
  while (diffRad < -Math.PI) diffRad += 2 * Math.PI;

  robotState.panAngle = Math.max(-90, Math.min(90, diffRad * 180 / Math.PI));
  robotState.tiltAngle = 5;

  var headAngleRad = robotState.angle + (robotState.panAngle * Math.PI / 180);
  var targetCoord = { x: cX, y: cY };

  // Aggiorna la fotocamera 3D Three.js in modo SINCRONO prima di scattare la foto
  if (typeof updateThreeCamera === 'function') {
    updateThreeCamera();
  }

  var snapshot = typeof getThreeFPSnapshot === 'function' ? getThreeFPSnapshot() : null;
  if (!snapshot || !snapshot.includes(',')) return { success: false, reason: 'no_snapshot' };

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

      if (resData.status === 'ollama_offline') {
        console.warn('⚠️ [VLM Bridge] Il demone Ollama non risponde sulla porta 11434. Assicurati che Ollama sia avviato.');
      }

      var cntEl = document.getElementById('vlmPhotoCount');
      if (cntEl) cntEl.innerText = slamMap.vlmSnapshots.length;

      if (resData.landmarks && resData.landmarks.length > 0) {
        var lm = resData.landmarks[0];
        if (!slamMap.semanticLandmarks) slamMap.semanticLandmarks = [];
        if (!slamMap.vlmCandidateLandmarks) slamMap.vlmCandidateLandmarks = [];
        var nameToRegister = (lm.icon ? lm.icon + ' ' : '') + (lm.display || lm.name);

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
          return Math.hypot(item.x - anchorX, item.y - anchorY) < 60;
        });

        if (existingOfficialIdx >= 0) {
          slamMap.semanticLandmarks[existingOfficialIdx] = landmarkEntry;
        } else {
          slamMap.semanticLandmarks.push(landmarkEntry);
        }

        if (closestCluster) closestCluster.vlmVerified = true;
        var clKey = getClusterKey(anchorX, anchorY);
        if (slamMap.clusterTracking) {
          if (!slamMap.clusterTracking[clKey]) slamMap.clusterTracking[clKey] = {};
          slamMap.clusterTracking[clKey].verified = true;
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
        return { success: true, landmark: nameToRegister };
      } else {
        var anchorX = (cX !== null) ? cX : targetCoord.x;
        var anchorY = (cY !== null) ? cY : targetCoord.y;
        var attempts = getClusterAttemptCount(anchorX, anchorY);
        console.log('⚠️ [VLM Inspection] Oggetto non categorizzato nel catalogo. Tentativi: ' + attempts + '/5');
        if (attempts >= 5) {
          registerUnknownObstacleLandmark(anchorX, anchorY, closestCluster);
          return { success: true, unknown: true };
        }
        return { success: false, attempts: attempts };
      }
    }
    return { success: false };
  } catch (e) {
    console.warn('[VLM Bridge] Errore richiesta ispezione:', e);
    return { success: false, error: e };
  } finally {
    vlmInspecting = false;
    robotState.tiltAngle = 0;
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
      var raw = (s.res && (s.res.raw || (lm ? lm.description : '')));
      if (!raw) {
        if (s.res && s.res.status === 'ollama_offline') {
          raw = '⚠️ Servizio Ollama offline sulla porta 11434. Avvia Ollama con "ollama run moondream" o aprendo Ollama.app.';
        } else {
          raw = 'Nessuna risposta';
        }
      }
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

