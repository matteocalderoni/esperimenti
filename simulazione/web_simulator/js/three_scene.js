// simulazione/web_simulator/js/three_scene.js
// Gestione Scena 3D Three.js per Telecamera FPV e Visuale Immersiva

let threeScene, threeCamera, threeRenderer;
let threeWallMeshes = [];
let threeTargetBall, threeLightMesh;
let threeInitialized = false;

function initThreeFPV() {
  const container = document.getElementById('fpvCanvas');
  if (!container || typeof THREE === 'undefined') return;

  try {
    // 1. Setup Scene, Camera & Renderer
    threeScene = new THREE.Scene();
    threeScene.background = new THREE.Color(0x0a0f1d);
    threeScene.fog = new THREE.FogExp2(0x0a0f1d, 0.04);

    const aspect = (container.clientWidth || 320) / (container.clientHeight || 240);
    threeCamera = new THREE.PerspectiveCamera(65, aspect, 0.1, 100);

    threeRenderer = new THREE.WebGLRenderer({ canvas: container, antialias: true, preserveDrawingBuffer: true });
    threeRenderer.setSize(container.clientWidth || 320, container.clientHeight || 240, false);
    threeRenderer.shadowMap.enabled = true;

    // 2. Luci (Ambient + Directional)
    const ambientLight = new THREE.AmbientLight(0x334155, 1.8);
    threeScene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight.position.set(5, 10, 5);
    threeScene.add(dirLight);

    // 3. Pavimento con Texture a Griglia
    const floorGeo = new THREE.PlaneGeometry(16, 12);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8, metalness: 0.2 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    threeScene.add(floorMesh);

    const gridHelper = new THREE.GridHelper(16, 32, 0x00f5d4, 0x1e293b);
    gridHelper.position.y = 0.01;
    threeScene.add(gridHelper);

    // 4. Muri Perimetrali e Interni
    buildThreeArenaWalls();

    // 5. Oggetti Target (Pallina Verde e Faro Giallo)
    buildThreeLandmarks();

    threeInitialized = true;
  } catch (e) {
    console.warn("WebGL not supported in current environment, using 2D Canvas fallback:", e);
    threeInitialized = false;
  }
}

function to3D(x2d, y2d) {
  return { x: (x2d - 350) / 45, z: (y2d - 260) / 45 };
}

function buildThreeArenaWalls() {
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x6d28d9, roughness: 0.4, metalness: 0.6 });
  const borderMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.5 });

  // Muri interni da arenaObjects.walls
  for (const w of arenaObjects.walls) {
    const p = to3D(w.x + w.w / 2, w.y + w.h / 2);
    const geo = new THREE.BoxGeometry(w.w / 45, 1.4, w.h / 45);
    const mesh = new THREE.Mesh(geo, wallMat);
    mesh.position.set(p.x, 0.7, p.z);
    threeScene.add(mesh);
    threeWallMeshes.push(mesh);
  }

  // 4 Muri perimetrali (Nord, Sud, Ovest, Est)
  const borders = [
    { x: 0, z: -5.8, w: 15.6, d: 0.3 }, { x: 0, z: 5.8, w: 15.6, d: 0.3 },
    { x: -7.8, z: 0, w: 0.3, d: 11.8 }, { x: 7.8, z: 0, w: 0.3, d: 11.8 }
  ];
  for (const b of borders) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, 1.6, b.d), borderMat);
    mesh.position.set(b.x, 0.8, b.z);
    threeScene.add(mesh);
  }
}

function buildThreeLandmarks() {
  // Target Pallina Verde (OpenCV)
  const ballMat = new THREE.MeshStandardMaterial({ color: 0x00ff55, emissive: 0x00aa33, roughness: 0.3 });
  threeTargetBall = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), ballMat);
  const pBall = to3D(arenaObjects.targetBall.x, arenaObjects.targetBall.y);
  threeTargetBall.position.set(pBall.x, 0.35, pBall.z);
  threeScene.add(threeTargetBall);

  // Faro Luminoso Giallo
  const lightMat = new THREE.MeshStandardMaterial({ color: 0xffbe0b, emissive: 0xffaa00, roughness: 0.2 });
  threeLightMesh = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), lightMat);
  const pLight = to3D(arenaObjects.lightSource.x, arenaObjects.lightSource.y);
  threeLightMesh.position.set(pLight.x, 0.45, pLight.z);
  threeScene.add(threeLightMesh);

  const pointLight = new THREE.PointLight(0xffbe0b, 2, 8);
  pointLight.position.set(pLight.x, 0.8, pLight.z);
  threeScene.add(pointLight);

  // Landmark Semantico Aggiuntivo: "Porta Rossa" e "Quadro Blu" per VLM Ollama
  const doorMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.5 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.3, 0.1), doorMat);
  door.position.set(-3.5, 0.65, -5.65);
  threeScene.add(door);

  const signMat = new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.3 });
  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.8, 0.1), signMat);
  sign.position.set(3.5, 0.9, -5.65);
  threeScene.add(sign);
}

function updateThreeCamera() {
  if (!threeInitialized) return;

  // Aggiorna posizione della camera (montata sul robot ad altezza 0.35m)
  const pos3d = to3D(robotState.x, robotState.y);
  threeCamera.position.set(pos3d.x, 0.35, pos3d.z);

  // Rotazione Complessiva (Yaw del veicolo + Pan della testa)
  const totalHeading = -robotState.angle - (robotState.panAngle * Math.PI / 180);
  const pitch = (robotState.tiltAngle * Math.PI / 180);

  threeCamera.rotation.order = 'YXZ';
  threeCamera.rotation.y = totalHeading - Math.PI / 2;
  threeCamera.rotation.x = pitch;
  threeCamera.rotation.z = 0;

  // Aggiorna posizioni dinamiche target
  const pBall = to3D(arenaObjects.targetBall.x, arenaObjects.targetBall.y);
  threeTargetBall.position.set(pBall.x, 0.35, pBall.z);

  const pLight = to3D(arenaObjects.lightSource.x, arenaObjects.lightSource.y);
  threeLightMesh.position.set(pLight.x, 0.45, pLight.z);

  threeRenderer.render(threeScene, threeCamera);
}

function getThreeFPSnapshot() {
  if (threeInitialized && threeRenderer) {
    return threeRenderer.domElement.toDataURL('image/jpeg', 0.8);
  }
  const fpv = document.getElementById('fpvCanvas');
  if (fpv && typeof fpv.toDataURL === 'function') {
    return fpv.toDataURL('image/jpeg', 0.8);
  }
  return null;
}
