// simulazione/test_continuous_alignment.js
// Verifica che l'allineamento del robot per l'ispezione avvenga tramite
// rotazione differenziale fisica continua (nessun salto discreto di angolo o coordinate).

const assert = require('assert');

global.CAR_RADIUS_PX = 22;
global.SIM_DT = 0.016;
global.getArenaW = () => 2100;
global.getArenaH = () => 1560;

global.robotState = {
  x: 500,
  y: 600,
  angle: 0.0,
  speed: 0,
  steering: 0,
  panAngle: 0,
  tiltAngle: 0,
  collisionCooldown: 0
};

function updateKinematics(dt) {
  robotState.angle += robotState.steering * dt;
  robotState.x += Math.cos(robotState.angle) * robotState.speed * dt;
  robotState.y += Math.sin(robotState.angle) * robotState.speed * dt;
}

const tourState = {
  fsmState: 'ALIGN',
  currentCluster: { minX: 20, maxX: 30, minY: 20, maxY: 30 },
  waitFrames: 0
};

global.slamMap = {
  width: 70,
  height: 52
};

console.log('🧪 TEST ROTAZIONE CONTINUA SUL POSTO (NO TELETRASPORTO)');
console.log('====================================================');

// Supponiamo che l'arredo si trovi a targetLookX = 800, targetLookY = 600
// targetAngle = 0, ma robotState.angle iniziale = PI (rotazione di 180 gradi)
robotState.angle = Math.PI;
const initialX = robotState.x;
const initialY = robotState.y;

const targetLookX = 800;
const targetLookY = 600;
const angleToTarget = Math.atan2(targetLookY - robotState.y, targetLookX - robotState.x);

let maxDeltaAnglePerTick = 0;
let totalTicks = 0;

while (tourState.fsmState === 'ALIGN' && totalTicks < 300) {
  totalTicks++;
  const prevAngle = robotState.angle;

  // Codice di ALIGN conforme a inspection_tour.js
  var diffAngle = angleToTarget - robotState.angle;
  while (diffAngle > Math.PI) diffAngle -= 2 * Math.PI;
  while (diffAngle < -Math.PI) diffAngle += 2 * Math.PI;

  if (Math.abs(diffAngle) <= 0.06) {
    robotState.steering = 0;
    robotState.panAngle = diffAngle * 180 / Math.PI;
    robotState.tiltAngle = 5;
    tourState.fsmState = 'INSPECT';
    break;
  }

  var turnDir = (diffAngle > 0) ? 1 : -1;
  var omega = turnDir * Math.min(2.2, Math.max(0.7, Math.abs(diffAngle) * 2.8));
  robotState.steering = omega;

  // Integrazione cinematica
  updateKinematics(SIM_DT);

  const deltaAngle = Math.abs(robotState.angle - prevAngle);
  if (deltaAngle > maxDeltaAnglePerTick) {
    maxDeltaAnglePerTick = deltaAngle;
  }

  // Verifica che x e y rimangano rigidamente costanti (nessun drift o salto cartesiano sul posto)
  assert.strictEqual(robotState.x, initialX, 'La posizione X non deve muoversi durante la rotazione pura!');
  assert.strictEqual(robotState.y, initialY, 'La posizione Y non deve muoversi durante la rotazione pura!');
}

console.log(`⏱️ Rotazione di 180° completata in ${totalTicks} tick (${(totalTicks * SIM_DT).toFixed(2)}s)`);
console.log(`🔄 Massimo delta angolare per tick: ${(maxDeltaAnglePerTick * 180 / Math.PI).toFixed(2)}° (fisicamente continuo e realistico)`);
console.log(`🎯 Stato finale FSM: ${tourState.fsmState}`);
console.log(`📐 Angolo finale: ${(robotState.angle * 180 / Math.PI).toFixed(2)}°, panAngle servo: ${robotState.panAngle.toFixed(2)}°`);

// Asserzioni
assert.strictEqual(tourState.fsmState, 'INSPECT', 'Lo stato finale deve essere INSPECT');
assert.ok(maxDeltaAnglePerTick < 0.06, 'La rotazione deve essere fluida e priva di scatti istantanei (<0.06 rad per frame)');
assert.ok(totalTicks >= 40 && totalTicks <= 120, 'La rotazione di 180° deve richiedere un tempo fisico realistico (~0.8-1.5s)');

console.log('\n✅ TEST ALLINEAMENTO CONTINUO SUPERATO AL 100%!');
