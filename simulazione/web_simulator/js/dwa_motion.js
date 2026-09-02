// simulazione/web_simulator/js/dwa_motion.js
// Vincoli di Moto e Geometria delle Traiettorie per il DWA
//
// Raccoglie cio' che descrive COME il robot puo' muoversi — raggio di sterzata
// minimo, forma dell'arco, margine dagli ostacoli, manovra di disimpegno —
// separandolo dalla scelta del comando, che sta in dwa_planner.js.

/**
 * Velocita' angolare massima ammessa alla velocita' lineare data.
 * In marcia il vincolo e' il raggio di sterzata minimo, sempre: consentire una
 * rotazione libera "a bassa velocita'" faceva ruotare il robot attorno a un
 * punto interno al proprio corpo anche a 10 px/s. La rotazione sul posto resta
 * possibile solo da fermo.
 */
function dwaMaxSteerFor(v) {
  if (Math.abs(v) < DWA.minSpeedFloor) return DWA.pivotRate;
  return Math.min(DWA.maxSteer, Math.abs(v) / DWA.minTurnRadiusPx);
}

/**
 * Arco di curvatura `kappa` (rad/px) lungo `lunghezza` pixel.
 * Geometria pura: non dipende ne' dalla velocita' ne' dal passo temporale.
 */
function dwaArc(kappa, lunghezza) {
  var passo = DWA.arcStepPx;
  var n = Math.max(1, Math.round((lunghezza || DWA.lookaheadPx) / passo));
  var x = robotState.x, y = robotState.y, a = robotState.angle;
  var traj = [];
  for (var i = 0; i < n; i++) {
    a += kappa * passo;
    x += Math.cos(a) * passo;
    y += Math.sin(a) * passo;
    traj.push({ x: x, y: y, a: a });
  }
  return traj;
}

/** Distanza minima fra la traiettoria e i punti ostacolo, in pixel. */
function dwaClearance(traj, obstacles) {
  if (obstacles.length === 0) return Infinity;
  var min = Infinity;
  for (var i = 0; i < traj.length; i++) {
    for (var j = 0; j < obstacles.length; j++) {
      var d = Math.hypot(traj[i].x - obstacles[j].x, traj[i].y - obstacles[j].y);
      if (d < min) { min = d; if (min < 1) return min; }
    }
  }
  return min;
}

function dwaNormalizeAngle(a) {
  while (a < -Math.PI) a += Math.PI * 2;
  while (a > Math.PI) a -= Math.PI * 2;
  return a;
}

/**
 * Manovra da adottare quando nessuna traiettoria in avanti e' percorribile.
 * In ordine: si frena, poi ci si riorienta ruotando sul posto (il telaio e'
 * differenziale e l'ingombro e' un cerchio, quindi ruotando non si spazza area
 * nuova: la manovra e' sempre geometricamente sicura), infine si arretra.
 */
function dwaEscape(goalAngle, dt) {
  if (dt === undefined) dt = SIM_DT;
  var fermo = Math.abs(robotState.speed) < DWA.minSpeedFloor;

  if (!fermo) {
    // Frenata di emergenza: decelerazione tripla, ma finita.
    var v = Math.max(0, robotState.speed - 3 * DWA.accSpeed * dt);
    return { speed: v, steering: 0 };
  }

  var diff = dwaNormalizeAngle(goalAngle - robotState.angle);
  if (Math.abs(diff) > 0.15) {
    return { speed: 0, steering: (diff > 0 ? 1 : -1) * DWA.pivotRate };
  }

  // Gia' allineato al goal e comunque bloccato: si arretra verso il lato libero.
  var verso = (robotState.leftDist >= robotState.rightDist) ? -1 : 1;
  var vIndietro = Math.max(DWA.minSpeed, robotState.speed - DWA.accSpeed * dt);
  // Anche in retromarcia vale il raggio di sterzata minimo.
  return { speed: vIndietro, steering: verso * dwaMaxSteerFor(vIndietro) };
}

