// simulazione/test_dwa_planner.js
// Test: il Dynamic Window Approach deve scegliere il comando (velocita', sterzo)
// simulando le traiettorie candidate PRIMA di impegnarsi, invece di reagire a
// soglie quando l'ostacolo e' gia' addosso.

const assert = require('assert');
const { loadSim, fakeCanvas } = require('./sim_test_harness');

const CANVAS_W = 446, CANVAS_H = 438;
// Muro davanti e in alto: lascia libero solo il settore in basso (sterzo positivo).
const MURO_AVANTI_E_SOPRA = { x: 270, y: 110, w: 60, h: 120 };
const ACCERCHIAMENTO = [
  { x: 255, y: 190, w: 60, h: 60 },
  { x: 150, y: 150, w: 120, h: 40 },
  { x: 150, y: 250, w: 120, h: 40 },
];

function setup(muri, statoRobot = {}) {
  const sim = loadSim(
    ['state.js', 'sensors.js', 'dwa_obstacles.js', 'dwa_planner.js'],
    ['robotState', 'arenaObjects', 'updateSensors', 'planDwaCommand', 'dwaSimulate', 'dwaClearance', 'dwaObstaclePoints', 'dwaStepsFor'],
    { arenaCanvas: fakeCanvas(CANVAS_W, CANVAS_H) }
  );
  sim.arenaObjects.walls.length = 0;
  muri.forEach((m) => sim.arenaObjects.walls.push(m));
  sim.arenaObjects.lineTrack.length = 0;
  Object.assign(sim.robotState,
    { x: 223, y: 219, angle: 0, panAngle: 0, speed: 60, steering: 0 }, statoRobot);
  sim.updateSensors();
  return sim;
}

function test_procede_dritto_quando_e_libero() {
  console.log('\n🔍 Test 1: con l\'ambiente libero deve accelerare dritto verso il goal...');
  const sim = setup([]);
  const vPrima = sim.robotState.speed;

  const cmd = sim.planDwaCommand(sim.robotState.angle);

  assert.ok(cmd.speed > vPrima,
    `Con l'ambiente libero deve accelerare (da ${vPrima} a ${cmd.speed.toFixed(2)})`);
  assert.ok(Math.abs(cmd.steering) < 1.8,
    `Con il goal dritto davanti lo sterzo deve restare quasi nullo, invece e' ${cmd.steering.toFixed(3)}`);
  console.log(`   ✅ velocita' ${vPrima} -> ${cmd.speed.toFixed(2)}, sterzo ${cmd.steering.toFixed(3)}.`);
}

function test_aggira_dal_lato_libero() {
  console.log('\n🔍 Test 2: con un ostacolo davanti deve virare verso il settore libero...');
  const sim = setup([MURO_AVANTI_E_SOPRA]);

  assert.ok(sim.robotState.frontDist < 0.25, 'Precondizione: ostacolo davanti');
  // I tre scalari left/right qui coincidono: e' l'array di sonde a distinguere
  // il lato libero, ed e' esattamente il dato che il DWA sfrutta.
  const sonda = (deg) => sim.robotState.proximityProbes.find((p) => p.relDeg === deg).dist;
  assert.ok(sonda(50) > sonda(-50) * 2,
    `Precondizione: il settore a sterzo positivo deve essere piu' libero ` +
    `(+50°: ${sonda(50).toFixed(2)} m contro -50°: ${sonda(-50).toFixed(2)} m)`);

  const cmd = sim.planDwaCommand(sim.robotState.angle);

  assert.ok(cmd.steering > 0,
    `Deve virare verso il lato libero (sterzo positivo), invece sterza ${cmd.steering.toFixed(3)}`);
  console.log(`   ✅ Vira dal lato libero: sterzo ${cmd.steering.toFixed(3)}, velocita' ${cmd.speed.toFixed(2)}.`);
}

function test_la_traiettoria_scelta_e_libera() {
  console.log('\n🔍 Test 3: la traiettoria scelta non deve passare sull\'ostacolo...');
  const sim = setup([MURO_AVANTI_E_SOPRA]);

  const cmd = sim.planDwaCommand(sim.robotState.angle);
  const traiettoria = sim.dwaSimulate(cmd.speed, cmd.steering, sim.dwaStepsFor(cmd.speed, cmd.steering));
  const distanzaMinima = sim.dwaClearance(traiettoria, sim.dwaObstaclePoints());

  assert.ok(distanzaMinima >= 22 * 1.15,
    `La traiettoria scelta passa a ${distanzaMinima.toFixed(1)} px dagli ostacoli, ` +
    'sotto il raggio del robot piu\' margine (25,3 px)');
  console.log(`   ✅ Distanza minima della traiettoria scelta: ${distanzaMinima.toFixed(1)} px.`);
}

function test_disimpegno_quando_tutto_e_bloccato() {
  console.log('\n🔍 Test 4: se nessuna traiettoria in avanti e\' percorribile deve disimpegnarsi...');
  const sim = setup(ACCERCHIAMENTO);

  assert.ok(sim.robotState.frontDist < 0.15, 'Precondizione: robot accerchiato');

  const cmd = sim.planDwaCommand(sim.robotState.angle);

  assert.ok(cmd.speed <= 0,
    `Accerchiato deve arretrare o fermarsi, invece avanza a ${cmd.speed.toFixed(2)}`);
  console.log(`   ✅ Manovra di disimpegno: velocita' ${cmd.speed.toFixed(2)}, sterzo ${cmd.steering.toFixed(3)}.`);
}

function test_rispetta_il_limite_di_accelerazione() {
  console.log('\n🔍 Test 5: il comando non deve saltare oltre il limite di accelerazione...');
  const sim = setup([], { speed: 12, steering: 0 });

  const cmd = sim.planDwaCommand(sim.robotState.angle);

  assert.ok(cmd.speed - 12 <= 21.5,
    `La velocita' non puo' passare da 12 a ${cmd.speed.toFixed(1)} px/s in un tick`);
  assert.ok(Math.abs(cmd.steering - 0) <= 3.7,
    `Lo sterzo non puo' passare da 0 a ${cmd.steering.toFixed(2)} rad/s in un tick`);
  console.log(`   ✅ Variazioni entro i limiti: Δv ${(cmd.speed - 12).toFixed(1)} px/s, Δsterzo ${cmd.steering.toFixed(2)} rad/s.`);
}

if (require.main === module) {
  console.log('🚀 TEST DYNAMIC WINDOW APPROACH');
  console.log('='.repeat(60));
  const tutti = [
    test_procede_dritto_quando_e_libero,
    test_aggira_dal_lato_libero,
    test_la_traiettoria_scelta_e_libera,
    test_disimpegno_quando_tutto_e_bloccato,
    test_rispetta_il_limite_di_accelerazione,
  ];
  const continua = process.argv.includes('--tutti');
  let falliti = 0;
  for (const t of tutti) {
    try { t(); } catch (e) { falliti++; console.log(`   ❌ ${e.message}`); if (!continua) throw e; }
  }
  if (falliti) { console.log(`\n❌ ${falliti} test falliti su ${tutti.length}.`); process.exit(1); }
  console.log('\n🎉 TUTTI I TEST DEL DWA SUPERATI!');
}
