// simulazione/test_sensor_semantics.js
// Test: le distanze devono avere significati distinti.
//   frontDist      -> cono frontale, decide la frenata
//   leftDist/rightDist -> settori laterali, decidono da che parte scansare
//   ultrasonicDist -> sensore HC-SR04 montato sulla testa pan-tilt
// Collassarle in un unico minimo fa frenare il robot per ostacoli che sta
// semplicemente costeggiando.

const assert = require('assert');
const { loadSim, fakeCanvas } = require('./sim_test_harness');

const CANVAS_W = 446, CANVAS_H = 438;
const MURO_A_SINISTRA = { x: 100, y: 150, w: 170, h: 55 };
const MURO_DAVANTI = { x: 270, y: 190, w: 50, h: 60 };

function setup(muri, pan = 0) {
  const sim = loadSim(
    ['state.js', 'sensors.js', 'dwa_obstacles.js', 'dwa_planner.js', 'kinematics.js', 'slam/slam_grid.js', 'slam/slam_navigator.js'],
    ['robotState', 'arenaObjects', 'updateSensors', 'slamMap', 'navigateSlamPath', 'updateKinematics'],
    { arenaCanvas: fakeCanvas(CANVAS_W, CANVAS_H) }
  );
  sim.arenaObjects.walls.length = 0;
  muri.forEach((m) => sim.arenaObjects.walls.push(m));
  sim.arenaObjects.lineTrack.length = 0;
  Object.assign(sim.robotState, { x: 223, y: 219, angle: 0, panAngle: pan, speed: 60, steering: 0 });
  sim.updateSensors();
  return sim;
}

/** Prepara una traiettoria A* dritta davanti al robot e la fa inseguire per un ciclo. */
function inseguiPercorsoDritto(sim) {
  sim.slamMap.currentPath = [{ gx: 35, gy: 26 }, { gx: 59, gy: 26 }];
  sim.slamMap.pathIndex = 0;
  sim.slamMap.stuckCounter = 0;
  sim.slamMap.stepCounter = 0;
  sim.navigateSlamPath();
  return sim.robotState.speed;
}

function test_ostacolo_costeggiato_non_ferma_il_robot() {
  console.log('\n🔍 Test 1: un ostacolo che il robot costeggia non deve farlo frenare...');
  const sim = setup([MURO_A_SINISTRA]);

  assert.ok(sim.robotState.leftDist < 0.22,
    `Precondizione: il muro deve essere vicino a sinistra (leftDist=${sim.robotState.leftDist.toFixed(2)} m)`);
  assert.ok(sim.robotState.frontDist > 0.5,
    `Precondizione: il fronte deve essere libero (frontDist=${sim.robotState.frontDist.toFixed(2)} m)`);

  const speed = inseguiPercorsoDritto(sim);

  assert.ok(speed > 24,
    `Con il fronte libero a ${sim.robotState.frontDist.toFixed(2)} m il robot deve procedere, ` +
    `invece la velocita' e' scesa a ${speed.toFixed(2)} (frenata d'emergenza)`);
  console.log(`   ✅ Fronte libero: velocita' mantenuta a ${speed.toFixed(2)}.`);
}

function test_ostacolo_frontale_non_viene_investito() {
  console.log('\n🔍 Test 2: con un ostacolo davanti il robot non deve andarci addosso...');
  const sim = setup([MURO_DAVANTI]);

  assert.ok(sim.robotState.frontDist < 0.22,
    `Precondizione: il muro deve essere davanti (frontDist=${sim.robotState.frontDist.toFixed(2)} m)`);

  // Il waypoint e' dritto oltre il muro: la strategia (frenare o scansare) e'
  // libera, l'invariante e' che il robot non tocchi l'ostacolo.
  sim.slamMap.currentPath = [{ gx: 35, gy: 26 }, { gx: 59, gy: 26 }];
  sim.slamMap.pathIndex = 0;
  const rottaIniziale = sim.robotState.angle;
  let collisioni = 0;
  for (let i = 0; i < 80; i++) {
    sim.updateSensors();
    sim.navigateSlamPath();
    const prima = sim.robotState.collisionCooldown;
    sim.updateKinematics();
    if (sim.robotState.collisionCooldown > prima) collisioni++;
  }

  assert.strictEqual(collisioni, 0, `Il robot ha urtato l'ostacolo ${collisioni} volte in 80 tick`);
  assert.ok(Math.abs(sim.robotState.angle - rottaIniziale) > 0.2,
    'Il robot deve reagire all\'ostacolo, invece ha mantenuto la rotta iniziale');
  console.log(`   ✅ 80 tick senza urti, rotta deviata di ${(sim.robotState.angle - rottaIniziale).toFixed(2)} rad.`);
}

function test_ultrasuoni_seguono_la_testa_pan_tilt() {
  console.log('\n🔍 Test 3: ultrasonicDist deve misurare dove punta la testa...');

  const dritto = setup([MURO_A_SINISTRA], 0);
  assert.ok(dritto.robotState.ultrasonicDist > 0.5,
    `Con la testa dritta e il fronte libero l'ultrasuoni deve leggere lontano, ` +
    `invece legge ${dritto.robotState.ultrasonicDist.toFixed(2)} m (sta guardando i fianchi)`);

  const ruotato = setup([MURO_A_SINISTRA], -70);
  assert.ok(ruotato.robotState.ultrasonicDist < 0.5,
    `Con la testa ruotata verso il muro l'ultrasuoni deve leggere vicino, ` +
    `invece legge ${ruotato.robotState.ultrasonicDist.toFixed(2)} m`);

  console.log(`   ✅ Testa a 0°: ${dritto.robotState.ultrasonicDist.toFixed(2)} m, ` +
    `testa a -70°: ${ruotato.robotState.ultrasonicDist.toFixed(2)} m.`);
}

if (require.main === module) {
  console.log('🚀 TEST SEMANTICA SENSORI (fronte / fianchi / testa)');
  console.log('='.repeat(60));
  const tutti = [
    test_ostacolo_costeggiato_non_ferma_il_robot,
    test_ostacolo_frontale_non_viene_investito,
    test_ultrasuoni_seguono_la_testa_pan_tilt,
  ];
  const continua = process.argv.includes('--tutti');
  let falliti = 0;
  for (const t of tutti) {
    try { t(); } catch (e) { falliti++; console.log(`   ❌ ${e.message}`); if (!continua) throw e; }
  }
  if (falliti) { console.log(`\n❌ ${falliti} test falliti su ${tutti.length}.`); process.exit(1); }
  console.log('\n🎉 TUTTI I TEST DEI SENSORI SUPERATI!');
}
