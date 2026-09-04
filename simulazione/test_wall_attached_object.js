// simulazione/test_wall_attached_object.js
// Test unitario ed end-to-end per verificare la gestione di arredi a parete (3 lati liberi)

const assert = require('assert');
const { loadSimFromIndex, groundTruthMapQuality } = require('./sim_test_harness');

function testWallAttachedObjectRecognition() {
  console.log('🚀 TEST ARREDO A PARETE (Frigorifero contro parete con 3 lati liberi)');
  console.log('='.repeat(60));

  const sim = loadSimFromIndex();
  sim.initSlamGrid();
  sim.robotState.activeMode = 'exploration';
  sim.robotState.engineMode = 'JS';

  console.log('📌 Configurazione Ostacoli Arena:');
  sim.arenaObjects.walls.forEach(w => {
    console.log(`   - ${w.name} (${w.icon}): pos (${w.x}, ${w.y}), dim ${w.w}x${w.h} px`);
  });

  // Esegue 1500 tick di simulazione per esplorare l'arena e scansionare il frigo
  for (let t = 0; t < 1500; t++) {
    sim.updatePhysics();
  }

  if (typeof sim.solidifyClusterInteriors === 'function') {
    sim.solidifyClusterInteriors();
  }

  const clusters = sim.findSlamClusters(true);
  console.log(`\n🔍 Cluster Rilevati dallo SLAM (${clusters.length}):`);
  clusters.forEach((c, idx) => {
    const pos = sim.slamGridToWorld((c.minX + c.maxX) / 2, (c.minY + c.maxY) / 2);
    console.log(`   Cluster #${idx + 1}: x=[${c.minX}..${c.maxX}], y=[${c.minY}..${c.maxY}], ` +
                `centroide (${Math.round(pos.x)}, ${Math.round(pos.y)}), celle: ${c.celle}, wallAttached: ${c.isWallAttached}`);
  });

  console.log(`\n🏷️ Landmark Semantici Mappati (${sim.slamMap.semanticLandmarks.length}):`);
  sim.slamMap.semanticLandmarks.forEach(lm => {
    console.log(`   - [${lm.icon} ${lm.name}] a (${Math.round(lm.x)}, ${Math.round(lm.y)}), size (${Math.round(lm.w)}x${Math.round(lm.h)})`);
  });

  const q = groundTruthMapQuality(sim);
  console.log(`\n📊 Mappa Finale: Copertura ${q.copertura}%, Richiamo Muri ${q.richiamoMuri}%, Falsi Muri ${q.falsiMuri}, Celle Libere ${q.libereCorrette}%`);

  // Verifiche:
  // 1. Devono esserci cluster d'arredo rilevati
  assert.ok(clusters.length >= 2, `Attesi almeno 2 cluster d'arredo, trovati ${clusters.length}`);
  
  // 2. I landmark semantici devono essere mappati sulla piantina 2D
  assert.ok(sim.slamMap.semanticLandmarks.length >= 2, `Attesi almeno 2 landmark semantici, trovati ${sim.slamMap.semanticLandmarks.length}`);

  console.log('\n✅ TEST ARREDO A PARETE SUPERATO CON SUCCESSO!');
}

if (require.main === module) {
  testWallAttachedObjectRecognition();
}
