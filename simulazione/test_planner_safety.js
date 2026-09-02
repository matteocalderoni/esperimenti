// simulazione/test_planner_safety.js
// Test: il pianificatore A* deve produrre percorsi percorribili dall'ingombro
// reale del robot (raggio 22 px), non da un punto adimensionale.

const assert = require('assert');
const { loadSim, fakeCanvas, clearanceFromWalls, fillCells, markRestFree } = require('./sim_test_harness');

const CANVAS_W = 446, CANVAS_H = 438;
const CAR_RADIUS_PX = 22;

function setup() {
  return loadSim(
    ['state.js', 'slam/slam_grid.js', 'slam/slam_inflation.js', 'slam/slam_planner.js'],
    ['slamMap', 'initSlamGrid', 'planAdaptiveSlamAStar', 'slamWorldToGrid', 'slamGridToWorld', 'arenaObjects'],
    { arenaCanvas: fakeCanvas(CANVAS_W, CANVAS_H) }
  );
}

function test_varco_troppo_stretto_non_e_percorribile() {
  console.log('\n🔍 Test 1: un varco piu' + "'" + ' stretto del robot non deve produrre percorso...');
  const sim = setup();
  sim.initSlamGrid();
  markRestFree(sim.slamMap);

  // Muro verticale completo sulla colonna 35, con un varco di 3 celle (~25 px).
  const cellH = CANVAS_H / sim.slamMap.height;
  fillCells(sim.slamMap, 35, 0, 35, 24);
  fillCells(sim.slamMap, 35, 28, 35, 51);
  const varcoPx = 3 * cellH;
  assert.ok(varcoPx < 2 * CAR_RADIUS_PX,
    `Il varco di prova (${varcoPx.toFixed(1)} px) deve essere piu' stretto del diametro del robot (${2 * CAR_RADIUS_PX} px)`);

  const path = sim.planAdaptiveSlamAStar({ gx: 10, gy: 26 }, { gx: 60, gy: 26 });

  assert.strictEqual(path.length, 0,
    `Nessun percorso deve attraversare un varco di ${varcoPx.toFixed(1)} px, ` +
    `ma ne e' stato restituito uno di ${path.length} waypoint`);
  console.log(`   ✅ Varco di ${varcoPx.toFixed(1)} px correttamente rifiutato.`);
}

function test_waypoint_rispettano_ingombro_robot() {
  console.log('\n🔍 Test 2: ogni waypoint deve stare almeno a un raggio dai muri reali...');
  const sim = setup();
  sim.initSlamGrid();
  markRestFree(sim.slamMap);

  // Occupa nella griglia le celle coperte dai mobili reali dell'arena.
  const walls = sim.arenaObjects.walls;
  for (const w of walls) {
    const a = sim.slamWorldToGrid(w.x, w.y);
    const b = sim.slamWorldToGrid(w.x + w.w, w.y + w.h);
    fillCells(sim.slamMap, a.gx, a.gy, b.gx, b.gy);
  }

  // Partenza e arrivo in spazio realmente libero (verificato sotto).
  const startPx = { x: 150, y: 150 }, goalPx = { x: 380, y: 380 };
  for (const p of [startPx, goalPx]) {
    assert.ok(clearanceFromWalls(p.x, p.y, walls) >= CAR_RADIUS_PX,
      `Il punto di prova (${p.x},${p.y}) deve stare in spazio libero`);
  }
  const start = sim.slamWorldToGrid(startPx.x, startPx.y);
  const goal = sim.slamWorldToGrid(goalPx.x, goalPx.y);
  const path = sim.planAdaptiveSlamAStar(start, goal);
  assert.ok(path.length > 1, 'Deve esistere un percorso attraverso l\'arena reale');

  const violazioni = [];
  for (const node of path) {
    const p = sim.slamGridToWorld(node.gx, node.gy);
    const c = clearanceFromWalls(p.x, p.y, walls);
    if (c < CAR_RADIUS_PX) violazioni.push({ gx: node.gx, gy: node.gy, clearance: +c.toFixed(1) });
  }

  assert.strictEqual(violazioni.length, 0,
    `${violazioni.length} waypoint su ${path.length} passano a meno di ${CAR_RADIUS_PX} px dai muri: ` +
    JSON.stringify(violazioni.slice(0, 5)));
  console.log(`   ✅ Tutti i ${path.length} waypoint rispettano l'ingombro del robot.`);
}

function test_corridoio_ampio_resta_percorribile() {
  console.log('\n🔍 Test 3: un corridoio ampio non deve essere chiuso da un eccesso di dilatazione...');
  const sim = setup();
  sim.initSlamGrid();
  markRestFree(sim.slamMap);

  const cellH = CANVAS_H / sim.slamMap.height;
  fillCells(sim.slamMap, 35, 0, 35, 14);
  fillCells(sim.slamMap, 35, 38, 35, 51);
  const varcoPx = 23 * cellH;
  assert.ok(varcoPx > 4 * CAR_RADIUS_PX, 'Il corridoio di prova deve essere ampiamente percorribile');

  const path = sim.planAdaptiveSlamAStar({ gx: 10, gy: 26 }, { gx: 60, gy: 26 });

  assert.ok(path.length > 1,
    `Un corridoio di ${varcoPx.toFixed(1)} px deve restare percorribile, invece non e' stato trovato percorso`);
  console.log(`   ✅ Corridoio di ${varcoPx.toFixed(1)} px percorribile (${path.length} waypoint).`);
}

if (require.main === module) {
  console.log('🚀 TEST SICUREZZA PIANIFICATORE A* (ingombro robot)');
  console.log('='.repeat(60));
  const tutti = [
    test_varco_troppo_stretto_non_e_percorribile,
    test_waypoint_rispettano_ingombro_robot,
    test_corridoio_ampio_resta_percorribile,
  ];
  // `node test_planner_safety.js --tutti` esegue tutti i test senza fermarsi al primo errore.
  const continua = process.argv.includes('--tutti');
  let falliti = 0;
  for (const t of tutti) {
    try { t(); } catch (e) { falliti++; console.log(`   ❌ ${e.message}`); if (!continua) throw e; }
  }
  if (falliti) { console.log(`\n❌ ${falliti} test falliti su ${tutti.length}.`); process.exit(1); }
  console.log('\n🎉 TUTTI I TEST DEL PIANIFICATORE SUPERATI!');
}
