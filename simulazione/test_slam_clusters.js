// simulazione/test_slam_clusters.js
// Test: gli ingombri presenti nella mappa devono essere riconosciuti e quotati
// anche senza il VLM, che identifica il nome dell'arredo ma non la sua geometria.

const assert = require('assert');
const { loadSim, fakeCanvas, fillCells, markRestFree } = require('./sim_test_harness');

const CANVAS_W = 446, CANVAS_H = 438;

function setup() {
  const sim = loadSim(
    ['state.js', 'slam/slam_grid.js', 'slam/slam_metrics.js', 'slam/slam_clusters.js'],
    ['slamMap', 'initSlamGrid', 'findSlamClusters', 'slamSpanMeters'],
    { arenaCanvas: fakeCanvas(CANVAS_W, CANVAS_H) }
  );
  sim.initSlamGrid();
  markRestFree(sim.slamMap);
  return sim;
}

function test_riconosce_due_ingombri_separati() {
  console.log('\n🔍 Test 1: due ingombri separati devono dare due blocchi quotati...');
  const sim = setup();
  fillCells(sim.slamMap, 10, 10, 15, 14);   // 6 x 5 celle
  fillCells(sim.slamMap, 40, 30, 45, 33);   // 6 x 4 celle

  const cl = sim.findSlamClusters();

  assert.strictEqual(cl.length, 2, `Attesi 2 ingombri, trovati ${cl.length}`);
  const primo = cl.find((c) => c.minX === 10);
  assert.ok(primo, 'Il primo ingombro deve partire dalla colonna 10');
  assert.strictEqual(primo.maxX, 15);
  assert.strictEqual(primo.maxY, 14);
  assert.ok(Math.abs(primo.larghezzaM - sim.slamSpanMeters(6, 'x')) < 1e-6,
    `Larghezza ${primo.larghezzaM} invece di ${sim.slamSpanMeters(6, 'x')}`);
  assert.ok(Math.abs(primo.profonditaM - sim.slamSpanMeters(5, 'y')) < 1e-6,
    `Profondita' ${primo.profonditaM} invece di ${sim.slamSpanMeters(5, 'y')}`);
  console.log(`   ✅ 2 ingombri, il primo ${primo.larghezzaM.toFixed(2)} × ${primo.profonditaM.toFixed(2)} m.`);
}

function test_ignora_il_perimetro_dell_arena() {
  console.log('\n🔍 Test 2: le pareti perimetrali non sono un arredo da quotare...');
  const sim = setup();
  // Perimetro completo
  fillCells(sim.slamMap, 0, 0, sim.slamMap.width - 1, 0);
  fillCells(sim.slamMap, 0, sim.slamMap.height - 1, sim.slamMap.width - 1, sim.slamMap.height - 1);
  fillCells(sim.slamMap, 0, 0, 0, sim.slamMap.height - 1);
  fillCells(sim.slamMap, sim.slamMap.width - 1, 0, sim.slamMap.width - 1, sim.slamMap.height - 1);
  fillCells(sim.slamMap, 20, 20, 26, 25);   // un mobile interno

  const cl = sim.findSlamClusters();

  assert.strictEqual(cl.length, 1,
    `Deve restare solo l'ingombro interno, trovati ${cl.length} blocchi`);
  assert.strictEqual(cl[0].minX, 20);
  console.log('   ✅ Perimetro escluso, resta il solo ingombro interno.');
}

function test_scarta_il_rumore_isolato() {
  console.log('\n🔍 Test 3: le celle sparse non devono diventare arredi...');
  const sim = setup();
  sim.slamMap.grid[20][20] = 1;
  sim.slamMap.grid[30][40] = 1;
  fillCells(sim.slamMap, 10, 10, 15, 14);

  const cl = sim.findSlamClusters();

  assert.strictEqual(cl.length, 1, `Il rumore isolato non va quotato, trovati ${cl.length} blocchi`);
  console.log('   ✅ Rumore scartato, resta il solo ingombro reale.');
}

if (require.main === module) {
  console.log('🚀 TEST RILEVAMENTO INGOMBRI PER LE QUOTE');
  console.log('='.repeat(60));
  const tutti = [
    test_riconosce_due_ingombri_separati,
    test_ignora_il_perimetro_dell_arena,
    test_scarta_il_rumore_isolato,
  ];
  const continua = process.argv.includes('--tutti');
  let falliti = 0;
  for (const t of tutti) {
    try { t(); } catch (e) { falliti++; console.log(`   ❌ ${e.message}`); if (!continua) throw e; }
  }
  if (falliti) { console.log(`\n❌ ${falliti} test falliti su ${tutti.length}.`); process.exit(1); }
  console.log('\n🎉 TUTTI I TEST DEGLI INGOMBRI SUPERATI!');
}
