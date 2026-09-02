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
  lookaheadPx: 70,     // lunghezza dell'arco valutato
  arcStepPx: 3.5,      // passo di campionamento lungo l'arco
  speedSamples: 5,
  steerSamples: 11,    // dispari: include sempre "dritto"
  maxSpeed: 120,       // px/s
  minSpeed: -60,       // px/s (solo manovra di emergenza)
  maxSteer: 2.8,       // rad/s: tetto assoluto della velocita' angolare
  pivotRate: 1.2,      // rad/s consentiti da fermo
  minTurnRadiusPx: 40, // raggio di sterzata minimo in marcia
  minSpeedFloor: 8,    // px/s sotto cui il moto e' rotazione sul posto
  accSpeed: 240,       // px/s^2
  accSteer: 12,        // rad/s^2
  clearanceCap: 90,    // px oltre i quali piu' spazio non aggiunge punteggio
  footprintMargin: 1.15,  // stesso margine della dilatazione del pianificatore A*
  wHeading: 2.4,       // allineamento al goal
  wClearance: 1.6,     // margine dagli ostacoli
  wSpeed: 1.0,         // preferenza per la marcia spedita
  wSmooth: 0.5         // preferenza per le traiettorie tese
};

/**
 * Comando (velocita', sterzo) per raggiungere goalAngle evitando gli ostacoli.
 * @param {number} goalAngle rotta desiderata in radianti (assoluta)
 * @param {number} [dt] passo temporale del ciclo
 */
function planDwaCommand(goalAngle, dt) {
  if (dt === undefined) dt = SIM_DT;
  var obstacles = dwaObstaclePoints();
  var raggioSicuro = CAR_RADIUS_PX * DWA.footprintMargin;

  var dv = DWA.accSpeed * dt, dw = DWA.accSteer * dt;
  var vLo = Math.max(DWA.minSpeed, robotState.speed - dv);
  var vHi = Math.min(DWA.maxSpeed, robotState.speed + dv);
  var wLo = Math.max(-DWA.maxSteer, robotState.steering - dw);
  var wHi = Math.min(DWA.maxSteer, robotState.steering + dw);

  var best = null;
  for (var iv = 0; iv < DWA.speedSamples; iv++) {
    var v = vLo + (vHi - vLo) * (DWA.speedSamples === 1 ? 0 : iv / (DWA.speedSamples - 1));
    if (v <= 0) continue;                         // la retromarcia e' solo emergenza
    var wMax = dwaMaxSteerFor(v);

    // Finestra di sterzo raggiungibile E compatibile con il raggio minimo.
    var wCandLo = Math.max(wLo, -wMax), wCandHi = Math.min(wHi, wMax);
    if (wCandLo > wCandHi) continue;              // a questa velocita' non c'e' sterzo ammissibile

    for (var iw = 0; iw < DWA.steerSamples; iw++) {
      var w = wCandLo + (wCandHi - wCandLo) * (DWA.steerSamples === 1 ? 0 : iw / (DWA.steerSamples - 1));

      var kappa = (Math.abs(v) < DWA.minSpeedFloor) ? 0 : w / v;
      var traj = dwaArc(kappa, DWA.lookaheadPx);
      var clear = dwaClearance(traj, obstacles);
      if (clear < raggioSicuro) continue;         // il corpo del robot non ci passa

      // Criterio di frenata: la velocita' deve permettere l'arresto entro lo
      // spazio libero residuo, decelerando di accSpeed.
      var spazioLibero = clear - raggioSicuro;
      if (isFinite(spazioLibero) && v > Math.sqrt(2 * DWA.accSpeed * spazioLibero)) continue;

      var fine = traj[traj.length - 1];
      var heading = 1 - Math.abs(dwaNormalizeAngle(goalAngle - fine.a)) / Math.PI;
      var clearScore = Math.min(clear, DWA.clearanceCap) / DWA.clearanceCap;
      var speedScore = v / DWA.maxSpeed;
      // Premia lo sterzo tenue: e' cio' che riporta le ruote dritte dopo una
      // rotazione sul posto, altrimenti il robot resta bloccato a ripivotare.
      var smoothScore = 1 - Math.min(1, Math.abs(w) / DWA.maxSteer);
      var score = DWA.wHeading * heading + DWA.wClearance * clearScore +
                  DWA.wSpeed * speedScore + DWA.wSmooth * smoothScore;

      if (!best || score > best.score) best = { score: score, v: v, w: w };
    }
  }

  if (!best) return dwaEscape(goalAngle, dt);
  return { speed: best.v, steering: best.w };
}
