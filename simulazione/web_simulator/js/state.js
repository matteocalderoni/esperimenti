// simulazione/web_simulator/js/state.js

// Stato del Robot Simulato
const robotState = {
  // Posizione e Fisica Veicolo
  x: 350,
  y: 300,
  angle: 0,           // Angolo di rotta in radianti (0 = destra, PI/2 = giù)
  speed: 0,           // Velocità lineare (-5 a +5)
  steering: 0,        // Angolo di sterzo (-0.05 a +0.05)
  maxSpeed: 3.5,

  // Servomotori Pan-Tilt
  panAngle: 0,        // -90° (destra) a +90° (sinistra)
  tiltAngle: 0,       // -45° (basso) a +45° (alto)
  panSweepDir: 1.5,   // Direzione dello sweep per la modalità ostacoli

  // Sensori
  ultrasonicDist: 0.5,// in metri (0.0 a 2.0)
  irSensors: [1, 1, 1], // [Sinistra, Centro, Destra] 1=Bianco (fuori pista), 0=Nero (sulla linea)

  // Attuatori & Luci
  ledColor: '#00f0ff',
  policeActive: false,
  policeState: 0,

  // Stato Funzione
  activeMode: 'PT'    // 'PT', 'findColor', 'trackLine', 'automatic', 'police', 'keepDistance', 'trackLight'
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
  // Muri e Ostacoli Fisici
  walls: [
    {x: 280, y: 200, w: 120, h: 25},
    {x: 480, y: 270, w: 25, h: 90}
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
    'PT': 'MODE: MANUAL (PT)',
    'findColor': 'MODE: OPENCV COLOR TRACKING',
    'automatic': 'MODE: AUTOMATIC OBSTACLE AVOIDANCE',
    'trackLine': 'MODE: LINE TRACKING (IR)',
    'police': 'MODE: POLICE STROBE LIGHTS',
    'trackLight': 'MODE: LIGHT TRACKING',
    'keepDistance': 'MODE: KEEP DISTANCE (RADAR)'
  };
  badge.innerText = modeNames[robotState.activeMode] || `MODE: ${robotState.activeMode.toUpperCase()}`;
}
