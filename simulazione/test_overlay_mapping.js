// simulazione/test_overlay_mapping.js
// Esegue la mappatura dell'arena in simulazione headless e calcola
// le metriche di corrispondenza punti e proporzione rispetto alla verita' a terra.

const fs = require('fs');
const path = require('path');
const { loadSimFromIndex, fakeCanvas } = require('./sim_test_harness');

const SCRATCH_DIR = path.join(__dirname, '..', 'scratch');
if (!fs.existsSync(SCRATCH_DIR)) {
  fs.mkdirSync(SCRATCH_DIR, { recursive: true });
}

function runMappingTest() {
  console.log('🚀 Avvio Simulazione Mappatura Arena per Analisi Corrispondenza...');
  const sim = loadSimFromIndex();
  sim.initSlamGrid();
  sim.robotState.activeMode = 'exploration';
  sim.robotState.engineMode = 'JS';

  const trajectory = [];
  const MAX_TICKS = 4000;
  let tickDone = null;

  for (let t = 0; t < MAX_TICKS; t++) {
    sim.updatePhysics();
    if (t % 10 === 0) {
      trajectory.push({ x: sim.robotState.x, y: sim.robotState.y, angle: sim.robotState.angle });
    }
    if (sim.slamMap.fsmState === 'COMPLETE' && tickDone === null) {
      tickDone = t;
      break;
    }
  }

  // Solidificazione dei perimetri arredi (Bounded Hull Fill)
  if (typeof sim.solidifyClusterInteriors === 'function') {
    sim.solidifyClusterInteriors();
  }

  const W = 2100, H = 1560, bordo = 12;
  const gridW = sim.slamMap.width;
  const gridH = sim.slamMap.height;

  const cellPxX = W / gridW;
  const cellPxY = H / gridH;
  const cellAspect = cellPxY / cellPxX;

  const walls = sim.arenaObjects.walls;
  const isGroundTruthWall = (gx, gy) => {
    const x0 = gx * cellPxX, x1 = (gx + 1) * cellPxX;
    const y0 = gy * cellPxY, y1 = (gy + 1) * cellPxY;
    if (x0 < bordo || x1 > W - bordo || y0 < bordo || y1 > H - bordo) return true;
    for (const m of walls) {
      if (Math.max(x0, m.x) < Math.min(x1, m.x + m.w) && Math.max(y0, m.y) < Math.min(y1, m.y + m.h)) {
        return true;
      }
    }
    return false;
  };

  let trueWallCells = 0;
  let detectedWallCells = 0;
  let correctWallCells = 0;
  let falseWallCells = 0;
  let freeCellsTotal = 0;
  let freeCellsCorrect = 0;
  let unknownCells = 0;

  const comparisonGrid = []; // 2D array of grid status comparison

  for (let gy = 0; gy < gridH; gy++) {
    const rowComp = [];
    for (let gx = 0; gx < gridW; gx++) {
      const worldPos = sim.slamGridToWorld(gx, gy);
      const isGTWall = isGroundTruthWall(gx, gy);
      const mappedVal = sim.slamMap.grid[gy][gx]; // -1, 0, 1

      if (isGTWall) trueWallCells++;
      else freeCellsTotal++;

      if (mappedVal === 1) detectedWallCells++;
      if (mappedVal === -1) unknownCells++;

      let status = 'UNKNOWN'; // -1
      if (mappedVal === 1 && isGTWall) {
        correctWallCells++;
        status = 'MATCH_WALL'; // Muro vero rilevato correttamente (True Positive)
      } else if (mappedVal === 1 && !isGTWall) {
        falseWallCells++;
        status = 'FALSE_WALL'; // Muro inventato (False Positive)
      } else if (mappedVal === 0 && isGTWall) {
        status = 'MISSED_WALL'; // Muro mancato (False Negative)
      } else if (mappedVal === 0 && !isGTWall) {
        freeCellsCorrect++;
        status = 'MATCH_FREE'; // Spazio libero corretto (True Negative)
      }

      rowComp.push({
        gx, gy,
        worldX: worldPos.x, worldY: worldPos.y,
        isGTWall, mappedVal, status
      });
    }
    comparisonGrid.push(rowComp);
  }

  const wallRecall = ((correctWallCells / Math.max(1, trueWallCells)) * 100).toFixed(1);
  const wallPrecision = ((correctWallCells / Math.max(1, detectedWallCells)) * 100).toFixed(1);
  const freeAccuracy = ((freeCellsCorrect / Math.max(1, freeCellsTotal)) * 100).toFixed(1);
  const iou = ((correctWallCells / Math.max(1, trueWallCells + falseWallCells)) * 100).toFixed(1);

  const results = {
    arenaWidthPx: W,
    arenaHeightPx: H,
    gridWidth: gridW,
    gridHeight: gridH,
    cellPxX,
    cellPxY,
    cellAspectDistortionPct: Math.abs((cellAspect - 1.0) * 100).toFixed(1),
    ticksToComplete: tickDone,
    explorationPct: sim.slamMap.stats.exploredPct,
    trueWallCells,
    detectedWallCells,
    correctWallCells,
    falseWallCells,
    missedWallCells: trueWallCells - correctWallCells,
    wallRecallPct: parseFloat(wallRecall),
    wallPrecisionPct: parseFloat(wallPrecision),
    freeAccuracyPct: parseFloat(freeAccuracy),
    iouPct: parseFloat(iou),
    wallsGT: walls,
    trajectory,
    comparisonGrid
  };

  const jsonPath = path.join(SCRATCH_DIR, 'mapping_results.json');
  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2));
  console.log(`✅ Mappatura completata. Risultati salvati in: ${jsonPath}`);
  console.log(`📊 STATISTICHE CORRISPONDENZA:`);
  console.log(`   - Copertura Mappa: ${sim.slamMap.stats.exploredPct}% (Tick: ${tickDone})`);
  console.log(`   - Muri Veri nell'Arena: ${trueWallCells} celle`);
  console.log(`   - Muri Rilevati dal Robot: ${detectedWallCells} celle`);
  console.log(`   - Muri Rilevati CORRETTAMENTE (Match): ${correctWallCells} (${wallRecall}%)`);
  console.log(`   - Muri MANCATI (Missed): ${trueWallCells - correctWallCells}`);
  console.log(`   - Falsi Muri (False Positives): ${falseWallCells}`);
  console.log(`   - Precisione Muri: ${wallPrecision}%`);
  console.log(`   - Precisione Spazio Libero: ${freeAccuracy}%`);
  console.log(`   - IoU (Intersection over Union Muri): ${iou}%`);
  console.log(`   - Distorsione Aspetto Celle (Y/X): ${cellAspect.toFixed(3)} (${results.cellAspectDistortionPct}% di deformazione rispetto al quadrato!)`);
}

runMappingTest();
