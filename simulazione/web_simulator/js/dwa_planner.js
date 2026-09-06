// simulazione/web_simulator/js/dwa_planner.js
// Pianificatore Locale Dynamic Window Approach (DWA)
//
// Campiona le coppie (velocita', sterzo) raggiungibili nel prossimo passo, ne
// valuta la traiettoria e sceglie quella percorribile migliore.
//
// La traiettoria si valuta come ARCO, parametrizzato dalla curvatura k = w/v
// (rad per pixel) e percorso per una lunghezza fissa. Cosi' la geometria del
// percorso non dipende dalla velocita': con un orizzonte a passi temporali,
// rallentare accorciava l'arco simulato e il robot diventava cieco proprio
// quando andava piano, strisciando in avanti senza mai riaccelerare.
// La velocita' entra solo nel criterio di frenata, come vuole il metodo.

var DWA = {
  lookaheadPx: 80,     // lunghezza dell'arco valutato
  arcStepPx: 4.0,      // passo di campionamento lungo l'arco
  speedSamples: 7,     // campionamento fine delle velocita' positive
  steerSamples: 11,    // dispari: include sempre "dritto"
  maxSpeed: 220,       // px/s: marcia rapida e decisa nell'arena (era 120)
  minSpeed: -60,       // px/s (solo manovra di emergenza)
  maxSteer: 2.8,       // rad/s: tetto assoluto della velocita' angolare
  pivotRate: 1.2,      // rad/s consentiti da fermo
  minTurnRadiusPx: 46, // raggio di sterzata minimo in marcia (rispetta ingombro car 22px * 2)
  minSpeedFloor: 10,   // px/s sotto cui il moto e' rotazione sul posto
  accSpeed: 240,       // px/s^2
  accSteer: 12,        // rad/s^2
  clearanceCap: 100,   // px oltre i quali piu' spazio non aggiunge punteggio (era 80)
  footprintMargin: 1.65, // margine di sicurezza aumentato (36.3 px su raggio 22px) per stare distante dagli angoli
  wHeading: 2.2,       // allineamento al goal
  wClearance: 3.5,     // peso clearance aumentato per favorire traiettorie larghe lontane da muri (era 1.8)
  wSpeed: 2.2,         // spinta in avanti bilanciata (era 2.5)
  wSmooth: 0.5         // preferenza per le traiettorie tese
};

/**
 * Comando (velocita', sterzo) per raggiungere goalAngle evitando gli ostacoli.
 * @param {number} goalAngle rotta desiderata in radianti (assoluta)
 * @param {number} [dt] passo temporale del ciclo
 */
function planDwaCommand(goalAngle, dt) {
  if (dt === undefined) dt = (typeof SIM_DT !== 'undefined') ? SIM_DT : 0.016;
  var obstacles = dwaObstaclePoints();
  var raggioSicuro = CAR_RADIUS_PX * DWA.footprintMargin;

  // Calcolo distanza minima dagli ostacoli per lookahead adattivo
  var minObsDist = Infinity;
  for (var oi = 0; oi < obstacles.length; oi++) {
    var od = Math.hypot(obstacles[oi].x - robotState.x, obstacles[oi].y - robotState.y);
    if (od < minObsDist) minObsDist = od;
  }
  // Lookahead dinamico: in spazi aperti 80 px; negli spazi stretti e curve scala fino a 42 px
  var currentLookahead = Math.max(42, Math.min(DWA.lookaheadPx, minObsDist * 0.92));

  var dv = DWA.accSpeed * dt, dw = DWA.accSteer * dt;
  // Finestra di avanzamento: campiona solo velocita' non-negative per garantire accelerazione continua
  var vLo = Math.max(0, robotState.speed - dv);
  var vHi = Math.min(DWA.maxSpeed, robotState.speed + dv);
  var wLo = Math.max(-DWA.maxSteer, robotState.steering - dw);
  var wHi = Math.min(DWA.maxSteer, robotState.steering + dw);

  var best = null;
  for (var iv = 0; iv < DWA.speedSamples; iv++) {
    var v = vLo + (vHi - vLo) * (DWA.speedSamples === 1 ? 0 : iv / (DWA.speedSamples - 1));
    if (v <= 0 && robotState.speed > 0) continue;
    var wMax = dwaMaxSteerFor(v);

    // Finestra di sterzo raggiungibile E compatibile con il raggio minimo.
    var wCandLo = Math.max(wLo, -wMax), wCandHi = Math.min(wHi, wMax);
    if (wCandLo > wCandHi) continue;              // a questa velocita' non c'e' sterzo ammissibile

    for (var iw = 0; iw < DWA.steerSamples; iw++) {
      var w = wCandLo + (wCandHi - wCandLo) * (DWA.steerSamples === 1 ? 0 : iw / (DWA.steerSamples - 1));

      var kappa = (Math.abs(v) < DWA.minSpeedFloor) ? 0 : w / v;
      var traj = dwaArc(kappa, currentLookahead);
      var clear = dwaClearance(traj, obstacles);
      if (clear < raggioSicuro) continue;         // il corpo del robot non ci passa

      // Criterio di frenata: la velocita' deve permettere l'arresto entro lo
      // spazio libero residuo, decelerando di accSpeed.
      var spazioLibero = clear - raggioSicuro;
      if (isFinite(spazioLibero) && v > Math.sqrt(2 * DWA.accSpeed * spazioLibero)) continue;

      var fine = traj[traj.length - 1];
      var heading = 1 - Math.abs(dwaNormalizeAngle(goalAngle - fine.a)) / Math.PI;
      var clearScore = Math.min(clear, DWA.clearanceCap) / DWA.clearanceCap;

      // Regulated Curvature Speed Profile:
      // In rettilineo (curvatura bassa) spinge a maxSpeed (220 px/s).
      // In curva (curvatura alta) adegua con dolcezza la velocita' per evitare sbandamenti
      var curvRatio = Math.min(1.0, Math.abs(kappa) * DWA.minTurnRadiusPx);
      var vTarget = DWA.maxSpeed / (1.0 + 1.2 * curvRatio);
      var speedScore = 1.0 - Math.min(1.0, Math.abs(v - vTarget) / DWA.maxSpeed);

      // Premia lo sterzo tenue: riporta le ruote dritte senza oscillazioni
      var smoothScore = 1 - Math.min(1, Math.abs(w) / DWA.maxSteer);
      var score = DWA.wHeading * heading + DWA.wClearance * clearScore +
                  DWA.wSpeed * speedScore + DWA.wSmooth * smoothScore;

      if (!best || score > best.score) best = { score: score, v: v, w: w };
    }
  }

  // Se nessun arco a velocita' standard e' risultato libero, valuta un avanzamento controllato a passo d'uomo (creep)
  // per negoziare la curva stretta senza bloccarsi ne' ruotare sul posto
  if (!best && minObsDist > CAR_RADIUS_PX * 1.35) {
    var vCreep = Math.min(Math.max(DWA.minSpeedFloor + 4, robotState.speed - dv * 1.5), 32);
    var diffGoal = dwaNormalizeAngle(goalAngle - robotState.angle);
    var wMaxCreep = dwaMaxSteerFor(vCreep);
    var wCreep = Math.max(-wMaxCreep, Math.min(wMaxCreep, diffGoal * 2.2));
    var creepTraj = dwaArc(wCreep / vCreep, 36);
    var creepClear = dwaClearance(creepTraj, obstacles);
    if (creepClear >= CAR_RADIUS_PX * 1.30) {
      best = { score: 1.0, v: vCreep, w: wCreep };
    }
  }

  if (!best) return dwaEscape(goalAngle, dt);
  return { speed: best.v, steering: best.w };
}
