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
  x: 350,
  y: 150,
  angle: 0,           // Angolo di rotta in radianti (0 = destra, PI/2 = giù)
  speed: 0,           // Velocità lineare in px/s
  steering: 0,        // Velocità angolare in rad/s
  maxSpeed: 210,      // px/s

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

// Mappa Ostacoli e Tracciato nell'Arena (Canvas 700x520)
const arenaObjects = {
  // Tracciato Linea Nera (Loop ovale)
  lineTrack: [
    {x: 150, y: 150},
    {x: 550, y: 150},
    {x: 600, y: 260},
    {x: 550, y: 370},
    {x: 150, y: 370},
    {x: 100, y: 260}
  ],
  // Arena con 2 Mobili Distinti (Tavolo da Pranzo e Frigorifero), entrambi con 4 lati liberi per il passaggio
  walls: [
    { x: 160, y: 220, w: 130, h: 75, name: 'Tavolo da Pranzo', icon: '🍽️', category: 'furniture', vlm: 'Tavolo da pranzo con sedie', asset: '/simulator/assets/furniture/dining_table.jpg' },
    { x: 15, y: 335, w: 95, h: 85, name: 'Frigorifero', icon: '🧊', category: 'appliance', vlm: 'Frigorifero in acciaio inox', asset: '/simulator/assets/furniture/fridge.jpg' }
  ],

  // Target Colore per OpenCV (Pallina verde)
  targetBall: { x: 350, y: 90, radius: 18, color: '#00ff55' },
  // Sorgente Luminosa per TrackLight
  lightSource: { x: 580, y: 100, radius: 25, color: '#ffbe0b' }
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
