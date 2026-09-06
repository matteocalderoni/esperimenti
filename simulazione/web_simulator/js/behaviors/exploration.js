// simulazione/web_simulator/js/behaviors/exploration.js
// SLAM Exploration Orchestrator con Scansione Multispaziale e Ispezione Ravvicinata VLM

var lastVlmScanPos = { x: 0, y: 0 };

function isClearForRotation() {
  if (robotState.ultrasonicDist && robotState.ultrasonicDist < 0.45) return false;
  if (robotState.rayDistances && robotState.rayDistances.length > 0) {
    return robotState.rayDistances.every(function(d) { return d > 0.40; });
  }
  return false;
}

function runExplorationBehavior(dt) {
  if (dt === undefined) dt = (typeof SIM_DT !== 'undefined') ? SIM_DT : 0.016;
  if (!slamMap.grid) initSlamGrid();

  // 1. INITIAL_SCAN / RECOVERY: Scansione a 360° istantanea per mappare subito l'ambiente iniziale
  if (slamMap.fsmState === 'HEAD_SCAN' || slamMap.fsmState === 'HEAD_SCAN_1' || slamMap.fsmState === 'INITIAL_SCAN' ||
      slamMap.fsmState === 'ROTATE_180' || slamMap.fsmState === 'HEAD_SCAN_2') {
    robotState.panAngle = 0;
    if (typeof scan360Rays === 'function') scan360Rays(); else scanAllRays();
    slamMap.fsmState = 'FIND_FRONTIERS';
    return;
  }

  // 2. NAVIGATE: Movimento continuo e fluido verso la frontiera aperta con regolazione dinamica
  if (slamMap.fsmState === 'NAVIGATE') {
    scanAllRays();
    if (typeof navigateSlamPath === 'function') navigateSlamPath(dt);
  }

  // 3. FIND_FRONTIERS: Selezione fluida della nuova frontiera (mantiene l'inerzia)
  else if (slamMap.fsmState === 'FIND_FRONTIERS') {
    robotState.panAngle = 0;
    var cur = slamWorldToGrid(robotState.x, robotState.y);
    slamMap.frontiers = findSlamFrontiers();

    // Se non ci sono frontiere aperte trovate:
    if (!slamMap.frontiers || slamMap.frontiers.length === 0) {
      // Conclusione valida SOLO se abbiamo già coperto la quasi totalità della stanza (>= 75%)
      if (slamMap.stats.exploredPct >= 75) {
        console.log('🏁 [SLAM Phase 1] Nessuna frontiera aperta residua: rilievo stanza completato!');
        slamMap.fsmState = 'COMPLETE';
        return;
      }
      // Altrimenti, se siamo a inizio o metà esplorazione (< 75%), NON è conclusa:
      // esegui scansione a 360° per aprire nuove frontiere o usa un hunter target
      if (typeof scan360Rays === 'function') scan360Rays(); else scanAllRays();
      slamMap.frontiers = findSlamFrontiers();
      if (!slamMap.frontiers || slamMap.frontiers.length === 0) {
        var hunter = (typeof findHunterTarget === 'function') ? findHunterTarget(cur, getDilatedSlamGrid()) : null;
        if (hunter) {
          var hPath = planAdaptiveSlamAStar(cur, hunter);
          if (hPath && hPath.length > 1) {
            slamMap.currentPath = hPath;
            slamMap.pathIndex = 0;
            slamMap.stepCounter = 0;
            slamMap.stuckCounter = 0;
            slamMap.fsmState = 'NAVIGATE';
            return;
          }
        }
        return; // Riprova al frame successivo
      }
    }

    if (slamNoProgress()) {
      console.log('🏁 [SLAM Phase 1] Mappatura completata per assenza di nuovo progresso.');
      slamMap.fsmState = 'COMPLETE';
      return;
    }

    var path = planSlamExplorationPath(cur);
    if (path && path.length > 1) {
      slamMap.currentPath = path;
      slamMap.pathIndex = 0;
      slamMap.stepCounter = 0;
      slamMap.stuckCounter = 0;
      slamMap.fsmState = 'NAVIGATE';
    } else {
      slamMap.stuckCounter++;
      if (typeof recentTargetsQueue !== 'undefined') recentTargetsQueue = [];
      if (slamMap.stats.exploredPct >= 85 && slamMap.stuckCounter >= 30) {
        slamMap.stuckCounter = 0;
        slamMap.fsmState = 'COMPLETE';
      } else {
        if (typeof scan360Rays === 'function') scan360Rays(); else scanAllRays();
      }
    }
  }

  // 4. COMPLETE: Mappatura 2D & Quote CAD completate
  else if (slamMap.fsmState === 'COMPLETE') {
    // Salvaguardia categorica contro falsi completamenti a inizio sessione
    if (slamMap.stats.exploredPct < 70) {
      console.warn('⚠️ [SLAM] Rifiutato stato COMPLETE anomalo a ' + slamMap.stats.exploredPct + '%. Riavvio frontiere.');
      if (typeof scan360Rays === 'function') scan360Rays(); else scanAllRays();
      slamMap.fsmState = 'FIND_FRONTIERS';
      return;
    }

    robotState.speed = 0; robotState.steering = 0; robotState.panAngle = 0;

    // Consolidamento automatico della mappa SLAM, chiusura pareti retrostanti e classificazione arredi
    if (!slamMap.solidified) {
      slamMap.solidified = true;
      if (typeof solidifyClusterInteriors === 'function') {
        solidifyClusterInteriors(slamMap);
      }
    }

    // Attiva il pulsante per la Fase 2 (Tour Riconoscimento Arredi VLM)
    var btn = document.getElementById('btnInspectionTour');
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.cursor = 'pointer';
      btn.style.background = 'rgba(255, 190, 11, 0.25)';
      btn.style.borderColor = 'var(--accent-amber)';
      btn.style.color = '#fff';
      btn.style.boxShadow = '0 0 16px rgba(255, 190, 11, 0.6)';
      btn.innerHTML = '2. 🔍 Riconosci Arredi (VLM) ➔';
    }

    if (typeof showCompletionModal === 'function') {
      showCompletionModal(slamMap.stats.exploredPct, 'mapping');
    }
  }
}

registerBehavior('exploration', runExplorationBehavior);
