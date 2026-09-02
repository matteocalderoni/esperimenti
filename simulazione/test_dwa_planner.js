// simulazione/test_dwa_planner.js
// Il DWA sceglie il comando simulando le traiettorie candidate PRIMA di
// impegnarsi. Qualita' della guida: test_dwa_guida.js.

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
  console.log('\n🔍 Test 2: deve raggiungere il goal sul lato libero costeggiando l\'ostacolo...');
  // Il DWA insegue una rotta desiderata evitando gli ostacoli; scegliere DOVE
  // andare spetta all'A*. Qui il goal punta al settore libero, come farebbe un
  // waypoint del percorso globale, e si guida davvero per piu' tick.
  const sim = setup([MURO_AVANTI_E_SOPRA], { speed: 60 });
  const yPartenza = sim.robotState.y;
  const dt = 1 / 60;
  let collisioni = 0;

  // Si guida finche' l'ostacolo non e' superato: oltre, con un goal fisso e
  // senza il recupero collisioni di physics.js, il robot finirebbe in un angolo
  // dell'arena e si misurerebbe quello, non l'aggiramento.
  const oltreLOstacolo = () => sim.robotState.y > MURO_AVANTI_E_SOPRA.y + MURO_AVANTI_E_SOPRA.h;
  let superato = false;
  for (let i = 0; i < 240 && !superato; i++) {
    sim.updateSensors();
    const cmd = sim.planDwaCommand(Math.PI / 4, dt);   // goal: in basso a destra, il lato libero
    sim.robotState.speed = cmd.speed;
    sim.robotState.steering = cmd.steering;
    const prima = sim.robotState.collisionCooldown;
    sim.updateKinematics(dt);
    if (sim.robotState.collisionCooldown > prima) collisioni++;
    superato = oltreLOstacolo();
  }
  assert.ok(superato, 'Il robot deve riuscire a portarsi oltre l\'ostacolo entro 4 secondi');

  assert.strictEqual(collisioni, 0, `Ha urtato l'ostacolo ${collisioni} volte`);
  console.log(`   ✅ Ostacolo superato senza urti, scostamento ${(sim.robotState.y - yPartenza).toFixed(0)} px ` +
    'verso il lato libero.');
}

function test_la_traiettoria_scelta_e_libera() {
  console.log('\n🔍 Test 3: la traiettoria scelta non deve passare sull\'ostacolo...');
  const sim = setup([MURO_LONTANO]);

  const cmd = sim.planDwaCommand(sim.robotState.angle);
  assert.ok(cmd.speed > 0, 'Precondizione: a questa distanza la marcia avanti deve essere ammessa');
  const kappa = cmd.speed !== 0 ? cmd.steering / cmd.speed : 0;
  const traiettoria = sim.dwaArc(kappa, sim.DWA.lookaheadPx);
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

  // La frenata rispetta una decelerazione finita: si verifica che porti
  // effettivamente all'arresto, non che azzeri la velocita' in un tick solo.
  const dt = 1 / 60;
  let cmd = null;
  for (let i = 0; i < 60; i++) {
    sim.updateSensors();
    cmd = sim.planDwaCommand(sim.robotState.angle, dt);
    sim.robotState.speed = cmd.speed;
    sim.robotState.steering = cmd.steering;
    if (cmd.speed <= 5) break;
  }

  // 5 px/s sono 3 cm/s: il robot e' fermo a tutti gli effetti pratici.
  assert.ok(cmd.speed <= 5,
    `Accerchiato deve arrestarsi entro un secondo, invece avanza ancora a ${cmd.speed.toFixed(1)} px/s`);
  console.log(`   ✅ Disimpegno: velocita' ${cmd.speed.toFixed(1)} px/s, sterzo ${cmd.steering.toFixed(2)} rad/s.`);
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
