// simulazione/web_simulator/js/dwa_planner.js
// Pianificatore Locale Dynamic Window Approach (DWA)
//
// Sostituisce la guardia a soglie: invece di reagire quando l'ostacolo e' gia'
// addosso, campiona le coppie (velocita', sterzo) raggiungibili nel prossimo
// tick, ne simula la traiettoria e sceglie quella che resta libera. Usa l'array
// completo di sonde di prossimita', che i tre scalari front/left/right non
// riescono a rappresentare (due lati possono avere lo stesso minimo pur essendo
// uno libero e uno chiuso).

var DWA = {
  lookaheadPx: 60,     // orizzonte simulato, in pixel di percorso
  maxTurnRad: 1.2,     // rotazione massima simulata (oltre, l'arco diventa una spirale)
  minSteps: 8,
  maxSteps: 100,
  footprintMargin: 1.15,  // stesso margine della dilatazione del pianificatore A*
  speedSamples: 5,
  steerSamples: 11,    // dispari: include sempre "dritto"
  maxSpeed: 120,       // px/s
  minSpeed: -60,       // px/s (solo manovra di emergenza)
  maxSteer: 8.4,       // rad/s
  accSpeed: 1260,      // px/s^2
  accSteer: 216,       // rad/s^2
  minSpeedFloor: 12,   // px/s: evita divisioni per zero nell'orizzonte
  clearanceCap: 90,    // px oltre i quali "piu' spazio" non aggiunge punteggio
  wHeading: 2.2,       // allineamento al goal
  wClearance: 1.8,     // margine dagli ostacoli
  wSpeed: 0.7          // preferenza per la marcia spedita
};

/** Passi necessari a coprire l'orizzonte, limitati anche nella rotazione totale. */
function dwaStepsFor(v, w, dt) {
  if (dt === undefined) dt = SIM_DT;
  var passo = Math.max(Math.abs(v), DWA.minSpeedFloor) * dt;      // px percorsi per passo
  var perDistanza = DWA.lookaheadPx / passo;
  var perRotazione = (!w) ? Infinity : DWA.maxTurnRad / (Math.abs(w) * dt);
  return Math.max(DWA.minSteps, Math.min(DWA.maxSteps, Math.round(Math.min(perDistanza, perRotazione))));
}

/** Traiettoria prodotta mantenendo (v, w) costanti, stessa cinematica del simulatore. */
function dwaSimulate(v, w, steps, dt) {
  if (dt === undefined) dt = SIM_DT;
  var x = robotState.x, y = robotState.y, a = robotState.angle;
  var traj = [];
  for (var i = 0; i < steps; i++) {
    a += w * dt;
    x += Math.cos(a) * v * dt;
    y += Math.sin(a) * v * dt;
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
 * Manovra di disimpegno quando nessuna traiettoria in avanti e' percorribile.
 * Ignora di proposito il limite di accelerazione: e' una frenata di emergenza.
 */
function dwaEscape() {
  var verso = (robotState.leftDist >= robotState.rightDist) ? -1 : 1;
  return { speed: DWA.minSpeed, steering: verso * DWA.maxSteer };
}

/**
 * Comando (velocita', sterzo) per raggiungere goalAngle evitando gli ostacoli.
 * @param {number} goalAngle rotta desiderata in radianti (assoluta)
 */
function planDwaCommand(goalAngle, dt) {
  if (dt === undefined) dt = SIM_DT;
  var obstacles = dwaObstaclePoints();
  // Finestra dinamica: quanto velocita' e sterzo possono cambiare in un passo.
  var dv = DWA.accSpeed * dt, dw = DWA.accSteer * dt;
  var vLo = Math.max(DWA.minSpeed, robotState.speed - dv);
  var vHi = Math.min(DWA.maxSpeed, robotState.speed + dv);
  var wLo = Math.max(-DWA.maxSteer, robotState.steering - dw);
  var wHi = Math.min(DWA.maxSteer, robotState.steering + dw);

  var best = null;
  for (var iv = 0; iv < DWA.speedSamples; iv++) {
    var v = vLo + (vHi - vLo) * (DWA.speedSamples === 1 ? 0 : iv / (DWA.speedSamples - 1));
    if (v <= 0) continue;              // la retromarcia e' solo manovra di emergenza
    for (var iw = 0; iw < DWA.steerSamples; iw++) {
      var w = wLo + (wHi - wLo) * (DWA.steerSamples === 1 ? 0 : iw / (DWA.steerSamples - 1));
      var traj = dwaSimulate(v, w, dwaStepsFor(v, w, dt), dt);
      var clear = dwaClearance(traj, obstacles);
      var raggioSicuro = CAR_RADIUS_PX * DWA.footprintMargin;
      if (clear < raggioSicuro) continue;    // il corpo del robot non ci passa

      // Criterio di ammissibilita' del DWA: la velocita' deve permettere di
      // fermarsi entro lo spazio libero residuo, decelerando di accSpeed a tick.
      var spazioLibero = clear - raggioSicuro;
      if (isFinite(spazioLibero) && v > Math.sqrt(2 * DWA.accSpeed * spazioLibero)) continue;

      var fine = traj[traj.length - 1];
      var heading = 1 - Math.abs(dwaNormalizeAngle(goalAngle - fine.a)) / Math.PI;
      var clearScore = Math.min(clear, DWA.clearanceCap) / DWA.clearanceCap;
      var speedScore = v / DWA.maxSpeed;
      var score = DWA.wHeading * heading + DWA.wClearance * clearScore + DWA.wSpeed * speedScore;

      if (!best || score > best.score) best = { score: score, v: v, w: w };
    }
  }

  if (!best) return dwaEscape();
  return { speed: best.v, steering: best.w };
}
