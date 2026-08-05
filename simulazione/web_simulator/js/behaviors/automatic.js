// simulazione/web_simulator/js/behaviors/automatic.js
// Algoritmo Evitamento Ostacoli Automatico (IA Sperimentale Client JS)

function runAutomaticBehavior() {
  // 1. Quando la strada è libera (≥ 35 cm), la testa rimane bloccata DRITTA (0°) per evitare punti ciechi
  if (robotState.ultrasonicDist >= 0.35) {
    robotState.panAngle = 0;
    robotState.speed = 2.2;
    robotState.steering = 0;
  } else {
    // 2. Ostacolo rilevato di fronte (< 35 cm): Frena, orienta la testa per valutare gli spazi e sterza
    robotState.speed = -0.5; // Retromarcia di sicurezza
    
    robotState.panAngle += robotState.panSweepDir;
    if (robotState.panAngle > 40) robotState.panSweepDir = -3.5;
    if (robotState.panAngle < -40) robotState.panSweepDir = 3.5;

    // Sterza nella direzione dove la testa trova via libera
    if (robotState.panAngle > 0) {
      robotState.angle += 0.09; // Sterza a destra
    } else {
      robotState.angle -= 0.09; // Sterza a sinistra
    }
  }
}
