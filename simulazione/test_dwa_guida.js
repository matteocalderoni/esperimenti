// simulazione/test_dwa_guida.js
// Test sulla QUALITA' della guida prodotta dal DWA: raggio di sterzata
// compatibile con l'ingombro e velocita' senza scatti. Nascono dalla
// segnalazione "la macchina gira su se stessa e cambia velocita' di colpo".

const assert = require('assert');
const { loadSim, fakeCanvas } = require('./sim_test_harness');

const CANVAS_W = 446, CANVAS_H = 438;
// Muro davanti e in alto: lascia libero solo il settore in basso (sterzo positivo).
const MURO_AVANTI_E_SOPRA = { x: 270, y: 110, w: 60, h: 120 };
// Ostacolo lontano abbastanza da poter essere superato in marcia.
const MURO_LONTANO = { x: 380, y: 100, w: 40, h: 130 };
const ACCERCHIAMENTO = [
  { x: 255, y: 190, w: 60, h: 60 },
  { x: 150, y: 150, w: 120, h: 40 },
  { x: 150, y: 250, w: 120, h: 40 },
];

function setup(muri, statoRobot = {}) {
  const sim = loadSim(
    ['state.js', 'sensors.js', 'kinematics.js', 'dwa_obstacles.js', 'dwa_motion.js', 'dwa_planner.js'],
    ['robotState', 'arenaObjects', 'updateSensors', 'planDwaCommand', 'dwaArc', 'dwaClearance', 'dwaObstaclePoints', 'DWA', 'updateKinematics'],
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

function test_non_sterza_piu_stretto_del_proprio_ingombro() {
  console.log('\n🔍 Test 6: alle velocita\' di marcia il raggio di sterzata deve superare l\'ingombro...');
  const sim = setup([MURO_AVANTI_E_SOPRA], { speed: 90, steering: 0 });

  const cmd = sim.planDwaCommand(sim.robotState.angle);
  const raggio = cmd.steering !== 0 ? Math.abs(cmd.speed / cmd.steering) : Infinity;

  assert.ok(raggio >= 2 * 22,
    `Raggio di sterzata ${raggio.toFixed(1)} px a ${cmd.speed.toFixed(0)} px/s: il robot ` +
    `(raggio 22 px) ruoterebbe attorno a un punto dentro il proprio corpo`);
  console.log(`   ✅ raggio di sterzata ${raggio === Infinity ? 'rettilineo' : raggio.toFixed(0) + ' px'} a ${cmd.speed.toFixed(0)} px/s.`);
}

function test_la_velocita_non_cambia_a_scatti() {
  console.log('\n🔍 Test 7: la velocita\' non deve cambiare a scatti da un tick all\'altro...');
  const sim = setup([]);
  const dt = 1 / 60;

  let strappoMax = 0, vPrec = sim.robotState.speed;
  for (let i = 0; i < 120; i++) {
    const cmd = sim.planDwaCommand(sim.robotState.angle, dt);
    sim.robotState.speed = cmd.speed;
    sim.robotState.steering = cmd.steering;
    strappoMax = Math.max(strappoMax, Math.abs(cmd.speed - vPrec) / dt);
    vPrec = cmd.speed;
    sim.updateSensors();
  }

  assert.ok(strappoMax <= 400,
    `Variazione di velocita' fino a ${strappoMax.toFixed(0)} px/s²: la marcia risulta a scatti`);
  console.log(`   ✅ variazione massima ${strappoMax.toFixed(0)} px/s².`);
}

if (require.main === module) {
  console.log('🚀 TEST QUALITA' + "'" + ' DELLA GUIDA (DWA)');
  console.log('='.repeat(60));
  const tutti = [
    test_non_sterza_piu_stretto_del_proprio_ingombro,
    test_la_velocita_non_cambia_a_scatti,
  ];
  const continua = process.argv.includes('--tutti');
  let falliti = 0;
  for (const t of tutti) {
    try { t(); } catch (e) { falliti++; console.log(`   ❌ ${e.message}`); if (!continua) throw e; }
  }
  if (falliti) { console.log(`\n❌ ${falliti} test falliti su ${tutti.length}.`); process.exit(1); }
  console.log('\n🎉 TUTTI I TEST DI QUALITA' + "'" + ' DELLA GUIDA SUPERATI!');
}
