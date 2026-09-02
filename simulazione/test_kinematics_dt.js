// simulazione/test_kinematics_dt.js
// Test: il moto deve dipendere dal tempo trascorso, non dal numero di frame.
// Con velocita' in px/s e sterzo in rad/s, simulare un secondo a 60 fps o a
// 120 fps deve portare il robot nella stessa posa.

const assert = require('assert');
const { loadSim, fakeCanvas } = require('./sim_test_harness');

function setup() {
  const sim = loadSim(
    ['state.js', 'sensors.js', 'kinematics.js'],
    ['robotState', 'arenaObjects', 'updateKinematics', 'SIM_DT'],
    { arenaCanvas: fakeCanvas(446, 438) }
  );
  sim.arenaObjects.walls.length = 0;
  sim.arenaObjects.lineTrack.length = 0;
  return sim;
}

/** Percorre `secondi` di simulazione a passo `dt`, restituendo la posa finale. */
function percorri(sim, velocitaPxs, sterzoRads, secondi, dt) {
  Object.assign(sim.robotState, { x: 220, y: 220, angle: 0, collisionCooldown: 0 });
  const passi = Math.round(secondi / dt);
  for (let i = 0; i < passi; i++) {
    sim.robotState.speed = velocitaPxs;
    sim.robotState.steering = sterzoRads;
    sim.updateKinematics(dt);
  }
  return { x: sim.robotState.x, y: sim.robotState.y, angle: sim.robotState.angle };
}

function test_la_posa_non_dipende_dal_frame_rate() {
  console.log('\n🔍 Test 1: un secondo a 60 fps e a 120 fps deve dare la stessa posa...');
  const sim = setup();

  const a = percorri(sim, 90, 0.5, 1.0, 1 / 60);
  const b = percorri(sim, 90, 0.5, 1.0, 1 / 120);

  const scarto = Math.hypot(a.x - b.x, a.y - b.y);
  assert.ok(scarto < 2.0,
    `Le due simulazioni divergono di ${scarto.toFixed(2)} px ` +
    `(60 fps: ${a.x.toFixed(1)},${a.y.toFixed(1)} — 120 fps: ${b.x.toFixed(1)},${b.y.toFixed(1)})`);
  assert.ok(Math.abs(a.angle - b.angle) < 0.02,
    `Le rotte divergono di ${Math.abs(a.angle - b.angle).toFixed(3)} rad`);
  console.log(`   ✅ scarto ${scarto.toFixed(2)} px, rotta ${Math.abs(a.angle - b.angle).toFixed(4)} rad.`);
}

function test_la_velocita_e_in_pixel_al_secondo() {
  console.log('\n🔍 Test 2: la velocita\' deve essere espressa in pixel al secondo...');
  const sim = setup();

  const p = percorri(sim, 120, 0, 1.0, 1 / 60);
  const percorso = Math.hypot(p.x - 220, p.y - 220);

  assert.ok(Math.abs(percorso - 120) < 2,
    `A 120 px/s per un secondo il robot deve percorrere ~120 px, invece ne ha percorsi ${percorso.toFixed(1)}`);
  console.log(`   ✅ 120 px/s per 1 s = ${percorso.toFixed(1)} px.`);
}

function test_lo_sterzo_e_in_radianti_al_secondo() {
  console.log('\n🔍 Test 3: lo sterzo deve essere espresso in radianti al secondo...');
  const sim = setup();

  const p = percorri(sim, 0, 1.0, 1.0, 1 / 60);

  assert.ok(Math.abs(p.angle - 1.0) < 0.02,
    `A 1 rad/s per un secondo la rotta deve cambiare di ~1 rad, invece e' ${p.angle.toFixed(3)}`);
  console.log(`   ✅ 1 rad/s per 1 s = ${p.angle.toFixed(3)} rad.`);
}

if (require.main === module) {
  console.log('🚀 TEST CINEMATICA A TEMPO CONTINUO');
  console.log('='.repeat(60));
  const tutti = [
    test_la_posa_non_dipende_dal_frame_rate,
    test_la_velocita_e_in_pixel_al_secondo,
    test_lo_sterzo_e_in_radianti_al_secondo,
  ];
  const continua = process.argv.includes('--tutti');
  let falliti = 0;
  for (const t of tutti) {
    try { t(); } catch (e) { falliti++; console.log(`   ❌ ${e.message}`); if (!continua) throw e; }
  }
  if (falliti) { console.log(`\n❌ ${falliti} test falliti su ${tutti.length}.`); process.exit(1); }
  console.log('\n🎉 TUTTI I TEST DELLA CINEMATICA SUPERATI!');
}
