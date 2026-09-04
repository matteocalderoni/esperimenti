// simulazione/test_exploration_coverage.js
// Test end-to-end: l'esplorazione non deve dichiararsi conclusa lasciando
// frontiere ancora raggiungibili. Esegue il ciclo completo headless e
// confronta la mappa finale con la verita' a terra dell'arena.

const assert = require('assert');
const { loadSimFromIndex, groundTruthMapQuality } = require('./sim_test_harness');

const TICKS = 20000;
// Riferimento: risultato della versione a soglie prima del rifacimento
// dell'anticollisione. Il nuovo pianificatore non deve mappare di meno.
// Soglie calibrate per la griglia isotropa 70x69: il 100% dello spazio libero ed i muri
// esplorati nell'arena corrispondono all'82% di celle esplorate totali.
const COPERTURA_MINIMA = 80;
const RICHIAMO_MURI_MINIMO = 35;

// Il rilievo deve concludersi: con le pose di osservazione una rotta si trova
// quasi sempre, e senza un criterio di progresso l'esplorazione non finirebbe.
const TICK_MASSIMI_PER_CONCLUDERE = 8000;

function esploraFinoInFondo() {
  const sim = loadSimFromIndex();
  sim.initSlamGrid();
  sim.robotState.activeMode = 'exploration';
  sim.robotState.engineMode = 'JS';

  let tickCompletato = null;
  for (let t = 0; t < TICKS; t++) {
    sim.updatePhysics();
    if (sim.slamMap.fsmState === 'COMPLETE' && tickCompletato === null) tickCompletato = t;
  }
  if (typeof sim.solidifyClusterInteriors === 'function') {
    sim.solidifyClusterInteriors();
  }
  return { sim, tickCompletato };
}

function test_la_mappa_finale_non_regredisce() {
  console.log('\n🔍 Test 1: la mappa finale deve reggere il confronto con la versione precedente...');
  const { sim, tickCompletato } = esploraFinoInFondo();
  const q = groundTruthMapQuality(sim);

  console.log(`   copertura ${q.copertura}%, richiamo muri ${q.richiamoMuri}%, ` +
    `falsi muri ${q.falsiMuri}, concluso al tick ${tickCompletato}`);

  assert.ok(q.copertura >= COPERTURA_MINIMA,
    `Copertura ${q.copertura}%, sotto il minimo di ${COPERTURA_MINIMA}%: ` +
    'l\'esplorazione si ferma lasciando spazio raggiungibile inesplorato');
  assert.ok(q.richiamoMuri >= RICHIAMO_MURI_MINIMO,
    `Richiamo muri ${q.richiamoMuri}%, sotto il minimo di ${RICHIAMO_MURI_MINIMO}%`);
  assert.ok(tickCompletato !== null && tickCompletato <= TICK_MASSIMI_PER_CONCLUDERE,
    tickCompletato === null
      ? `Il rilievo non si e' mai concluso in ${TICKS} tick: continua a girare senza aggiungere nulla`
      : `Rilievo concluso solo al tick ${tickCompletato}, oltre il limite di ${TICK_MASSIMI_PER_CONCLUDERE}`);
  console.log('   ✅ Mappa finale entro i riferimenti.');
}

function test_non_inventa_muri() {
  console.log('\n🔍 Test 2: la mappa non deve contenere muri inventati...');
  const { sim } = esploraFinoInFondo();
  const q = groundTruthMapQuality(sim);

  assert.ok(q.falsiMuri <= 6,
    `${q.falsiMuri} celle segnate come muro non sono ne' un ostacolo ne' adiacenti a uno`);
  assert.ok(q.libereCorrette >= 90,
    `Solo il ${q.libereCorrette}% delle celle libere e' classificato correttamente`);
  console.log(`   ✅ ${q.falsiMuri} falsi muri, ${q.libereCorrette}% di celle libere corrette.`);
}

if (require.main === module) {
  console.log('🚀 TEST COPERTURA ESPLORAZIONE (end-to-end)');
  console.log('='.repeat(60));
  const tutti = [test_la_mappa_finale_non_regredisce, test_non_inventa_muri];
  const continua = process.argv.includes('--tutti');
  let falliti = 0;
  for (const t of tutti) {
    try { t(); } catch (e) { falliti++; console.log(`   ❌ ${e.message}`); if (!continua) throw e; }
  }
  if (falliti) { console.log(`\n❌ ${falliti} test falliti su ${tutti.length}.`); process.exit(1); }
  console.log('\n🎉 TUTTI I TEST DI COPERTURA SUPERATI!');
}
