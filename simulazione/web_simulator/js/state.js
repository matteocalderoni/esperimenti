// simulazione/web_simulator/js/state.js

// Passo temporale di riferimento della simulazione: 60 fps.
// Velocita' e sterzo sono grandezze fisiche (px/s, rad/s), non per frame:
// il moto dipende dal tempo trascorso e non dal frame rate del browser.
const SIM_DT = 1 / 60;
const SIM_MAX_DT = 1 / 15;   // passo massimo accettato dopo una pausa del browser

// Ingombro fisico del telaio: raggio di collisione in pixel.
// Unica fonte di verita' per cinematica, pianificatore e sensori.
const CAR_RADIUS_PX = 22;

// Stato del Robot Simulato
const robotState = {
  // Posizione e Fisica Veicolo
  x: 1050,
  y: 780,
  angle: 0,           // Angolo di rotta in radianti (0 = destra, PI/2 = giù)
  speed: 0,           // Velocità lineare in px/s
  steering: 0,        // Velocità angolare in rad/s
  maxSpeed: 300,      // px/s

  // Servomotori Pan-Tilt
  panAngle: 0,        // -90° (destra) a +90° (sinistra)
  tiltAngle: 0,       // -45° (basso) a +45° (alto)
  panSweepDir: 1.5,   // Direzione dello sweep per la modalità ostacoli

  // Sensori
  ultrasonicDist: 0.5,// in metri (0.0 a 2.0)
  leftDist: 0.5,      // Raggio sinistro
  rightDist: 0.5,     // Raggio destro
  irSensors: [1, 1, 1], // [Sinistra, Centro, Destra] 1=Bianco (fuori pista), 0=Nero (sulla linea)

  // Attuatori & Luci
  ledColor: '#00f0ff',
  policeActive: false,
  policeState: 0,

  // Stato Funzione & Engine Executore
  activeMode: 'PT',   // 'PT', 'findColor', 'trackLine', 'automatic', 'police', 'keepDistance', 'trackLight', 'exploration'
  engineMode: 'JS',    // 'JS' (Sperimentale / Client) oppure 'PYTHON' (Backend Server)
  collisionCooldown: 0, // Cooldown per la manovra di recupero dopo un urto
  recoverySteeringDir: -1, // Direzione di sterzo durante il recupero (-1 = sinistra, 1 = destra)
  lastLineSide: 'left', // Memoria dell'ultimo lato in cui è stata vista la linea nera
  recoverySpeedSign: -1, // Segno della velocità di recupero (-1 = retromarcia, 1 = marcia avanti)
  targetHeading: null,  // Rotta desiderata memorizzata per l'evitamento predittivo
  stuckFrames: 0,       // Contatore frame consecutivi in zona ostacolo (stuck detection)
  stuckEscaping: false  // Manovra di fuga attiva
};

// Mappa Ostacoli e Tracciato nell'Arena Triplicata (Canvas 2100x1560)
const arenaObjects = {
  // Tracciato Linea Nera (Loop ovale triplicato)
  lineTrack: [
    {x: 450, y: 450},
    {x: 1650, y: 450},
    {x: 1800, y: 780},
    {x: 1650, y: 1110},
    {x: 450, y: 1110},
    {x: 300, y: 780}
  ],
  // Arena Triplicata con 5 Mobili Semantici Distinti
  walls: [
    { x: 480, y: 660, w: 390, h: 225, name: 'Tavolo da Pranzo', icon: '🍽️', category: 'furniture', vlm: 'Tavolo da pranzo con sedie', asset: '/simulator/assets/furniture/dining_table.jpg' },
    { x: 30, y: 1005, w: 285, h: 255, name: 'Frigorifero', icon: '🧊', category: 'appliance', vlm: 'Frigorifero in acciaio inox', asset: '/simulator/assets/furniture/fridge.jpg' },
    { x: 1260, y: 30, w: 330, h: 225, name: 'Credenza', icon: '🗄️', category: 'storage', vlm: 'Credenza e mobile contenitore', asset: '/simulator/assets/furniture/sideboard.jpg' },
    { x: 1350, y: 960, w: 360, h: 240, name: 'Divano', icon: '🛋️', category: 'seating', vlm: 'Divano a tre posti', asset: '/simulator/assets/furniture/sofa.jpg' },
    { x: 30, y: 360, w: 300, h: 210, name: 'Piano Cottura', icon: '🍳', category: 'kitchen', vlm: 'Piano cottura e lavello', asset: '/simulator/assets/furniture/countertop.jpg' }
  ],

  // Target Colore per OpenCV (Pallina verde)
  targetBall: { x: 1050, y: 270, radius: 24, color: '#00ff55' },
  // Sorgente Luminosa per TrackLight
  lightSource: { x: 1740, y: 300, radius: 35, color: '#ffbe0b' }
};

function updateModeBadge() {
  const badge = document.getElementById('modeBadge');
  if (!badge) return;

  const modeNames = {
    'PT': 'MANUAL (PT)',
    'findColor': 'OPENCV COLOR TRACKING',
    'automatic': 'AUTOMATIC OBSTACLE AVOIDANCE',
    'trackLine': 'LINE TRACKING (IR)',
    'police': 'POLICE STROBE LIGHTS',
    'trackLight': 'LIGHT TRACKING',
    'keepDistance': 'KEEP DISTANCE (RADAR)',
    'exploration': '🗺️ SLAM EXPLORATION'
  };
  const modeLabel = modeNames[robotState.activeMode] || robotState.activeMode.toUpperCase();
  const engineLabel = robotState.engineMode === 'JS' ? '🧪 ENGINE: JS EXPERIMENTAL' : '🐍 ENGINE: PYTHON SERVER';

  badge.innerText = `MODE: ${modeLabel} | ${engineLabel}`;
}

// Global behaviors registry for JS Experimental Mode
const jsBehaviors = {};

function registerBehavior(mode, behaviorFunc) {
  jsBehaviors[mode] = behaviorFunc;
}
