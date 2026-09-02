// simulazione/test_cad_dimensions.js
// Test: le quote della piantina devono corrispondere alle misure reali
// dell'arena. La dimensione della cella dipende dal canvas e non e' quadrata:
// darla per scontata a 10 px falsa ogni quota e la superficie.

const assert = require('assert');
const { loadSim, fakeCanvas } = require('./sim_test_harness');

const CANVAS_W = 446, CANVAS_H = 438;
const PX_PER_METRO = 160;

function setup() {
  return loadSim(
    ['state.js', 'slam/slam_grid.js', 'slam/slam_metrics.js'],
    ['slamMap', 'slamCellMeters', 'slamSpanMeters', 'slamAreaM2', 'formatQuota'],
    { arenaCanvas: fakeCanvas(CANVAS_W, CANVAS_H) }
  );
}

function test_la_cella_ha_le_misure_del_canvas() {
  console.log('\n🔍 Test 1: la cella deve misurare quanto arena/griglia, per asse...');
  const sim = setup();
  const c = sim.slamCellMeters();

  const attesoW = (CANVAS_W / sim.slamMap.width) / PX_PER_METRO;
  const attesoH = (CANVAS_H / sim.slamMap.height) / PX_PER_METRO;

  assert.ok(Math.abs(c.w - attesoW) < 1e-6, `Larghezza cella ${c.w} invece di ${attesoW}`);
  assert.ok(Math.abs(c.h - attesoH) < 1e-6, `Altezza cella ${c.h} invece di ${attesoH}`);
  assert.ok(Math.abs(c.w - c.h) > 1e-6, 'La cella non e\' quadrata: le due misure devono differire');
  console.log(`   ✅ cella ${(c.w * 100).toFixed(2)} × ${(c.h * 100).toFixed(2)} cm.`);
}

function test_la_quota_totale_e_la_misura_dell_arena() {
  console.log('\n🔍 Test 2: la quota d\'ingombro totale deve dare la misura dell\'arena...');
  const sim = setup();

  const larghezza = sim.slamSpanMeters(sim.slamMap.width, 'x');
  const altezza = sim.slamSpanMeters(sim.slamMap.height, 'y');

  assert.ok(Math.abs(larghezza - CANVAS_W / PX_PER_METRO) < 0.01,
    `Larghezza dichiarata ${larghezza.toFixed(2)} m invece di ${(CANVAS_W / PX_PER_METRO).toFixed(2)} m`);
  assert.ok(Math.abs(altezza - CANVAS_H / PX_PER_METRO) < 0.01,
    `Altezza dichiarata ${altezza.toFixed(2)} m invece di ${(CANVAS_H / PX_PER_METRO).toFixed(2)} m`);
  console.log(`   ✅ ingombro ${larghezza.toFixed(2)} × ${altezza.toFixed(2)} m.`);
}

function test_la_superficie_deriva_dall_area_reale_della_cella() {
  console.log('\n🔍 Test 3: la superficie deve derivare dall\'area reale della cella...');
  const sim = setup();
  const c = sim.slamCellMeters();

  const area = sim.slamAreaM2(1000);
  const atteso = 1000 * c.w * c.h;

  assert.ok(Math.abs(area - atteso) < 1e-6,
    `Superficie ${area.toFixed(3)} m² invece di ${atteso.toFixed(3)} m²`);
  console.log(`   ✅ 1000 celle libere = ${area.toFixed(2)} m².`);
}

function test_la_quota_e_formattata_in_metri() {
  console.log('\n🔍 Test 4: la quota deve essere formattata con l\'unita\'...');
  const sim = setup();
  assert.strictEqual(sim.formatQuota(2.7875), '2.79 m');
  assert.strictEqual(sim.formatQuota(0.4), '0.40 m');
  console.log('   ✅ formato quota corretto.');
}

if (require.main === module) {
  console.log('🚀 TEST QUOTE DELLA PIANTINA');
  console.log('='.repeat(60));
  const tutti = [
    test_la_cella_ha_le_misure_del_canvas,
    test_la_quota_totale_e_la_misura_dell_arena,
    test_la_superficie_deriva_dall_area_reale_della_cella,
    test_la_quota_e_formattata_in_metri,
  ];
  const continua = process.argv.includes('--tutti');
  let falliti = 0;
  for (const t of tutti) {
    try { t(); } catch (e) { falliti++; console.log(`   ❌ ${e.message}`); if (!continua) throw e; }
  }
  if (falliti) { console.log(`\n❌ ${falliti} test falliti su ${tutti.length}.`); process.exit(1); }
  console.log('\n🎉 TUTTI I TEST DELLE QUOTE SUPERATI!');
}
