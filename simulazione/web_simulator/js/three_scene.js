// simulazione/web_simulator/js/three_scene.js
// Scena 3D Three.js per Telecamera FPV Fotorealistica (Mobili Cucina & Visione VLM)

let threeScene, threeCamera, threeRenderer, threeWallMeshes = [], threeTargetBall, threeLightMesh, threeInitialized = false;

function initThreeFPV() {
  const container = document.getElementById('fpvCanvas');
  if (!container || typeof THREE === 'undefined') return;

  try {
    threeScene = new THREE.Scene();
    threeScene.background = new THREE.Color(0x0a0f1d);
    threeScene.fog = new THREE.FogExp2(0x0a0f1d, 0.04);

    const aspect = (container.clientWidth || 320) / (container.clientHeight || 240);
    threeCamera = new THREE.PerspectiveCamera(65, aspect, 0.1, 100);

    threeRenderer = new THREE.WebGLRenderer({ canvas: container, antialias: true, preserveDrawingBuffer: true });
    threeRenderer.setSize(container.clientWidth || 320, container.clientHeight || 240, false);

    threeScene.add(new THREE.AmbientLight(0x64748b, 2.0));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 12, 5);
    threeScene.add(dirLight);

    // Pavimento Parquet / Piastrelle Cucina
    const floorGeo = new THREE.PlaneGeometry(16, 12);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.1 });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    threeScene.add(floorMesh);

    const grid = new THREE.GridHelper(16, 32, 0x38bdf8, 0x334155);
    grid.position.y = 0.01;
    threeScene.add(grid);

    buildThreeKitchenFurniture();
    buildThreeLandmarks();
    threeInitialized = true;
  } catch (e) {
    threeInitialized = false;
  }
}

function to3D(x2d, y2d) {
  return { x: (x2d - 350) / 45, z: (y2d - 260) / 45 };
}

function buildThreeKitchenFurniture() {
  const borderMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.8 });
  const texLoader = new THREE.TextureLoader();

  for (const w of arenaObjects.walls) {
    const p = to3D(w.x + w.w / 2, w.y + w.h / 2);
    const geo = new THREE.BoxGeometry(w.w / 45, 1.3, w.h / 45);
    let mat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 });
    if (w.asset) {
      texLoader.load(w.asset, function(tex) { mat.map = tex; mat.needsUpdate = true; });
    }
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(p.x, 0.65, p.z);
    threeScene.add(mesh);
    threeWallMeshes.push(mesh);
  }

  // 4 Muri perimetrali della Cucina (Nord, Sud, Ovest, Est)
  [{ x: 0, z: -5.8, w: 15.6, d: 0.3 }, { x: 0, z: 5.8, w: 15.6, d: 0.3 },
   { x: -7.8, z: 0, w: 0.3, d: 11.8 }, { x: 7.8, z: 0, w: 0.3, d: 11.8 }
  ].forEach(b => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, 1.6, b.d), borderMat);
    m.position.set(b.x, 0.8, b.z);
    threeScene.add(m);
  });
}

function buildThreeLandmarks() {
  const ballMat = new THREE.MeshStandardMaterial({ color: 0x00ff55, emissive: 0x00aa33, roughness: 0.3 });
  threeTargetBall = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 16), ballMat);
  const pBall = to3D(arenaObjects.targetBall.x, arenaObjects.targetBall.y);
  threeTargetBall.position.set(pBall.x, 0.35, pBall.z);
  threeScene.add(threeTargetBall);

  const lightMat = new THREE.MeshStandardMaterial({ color: 0xffbe0b, emissive: 0xffaa00, roughness: 0.2 });
  threeLightMesh = new THREE.Mesh(new THREE.SphereGeometry(0.45, 16, 16), lightMat);
  const pLight = to3D(arenaObjects.lightSource.x, arenaObjects.lightSource.y);
  threeLightMesh.position.set(pLight.x, 0.45, pLight.z);
  threeScene.add(threeLightMesh);
}

function updateThreeCamera() {
  if (!threeInitialized) return;
  const pos3d = to3D(robotState.x, robotState.y);
  threeCamera.position.set(pos3d.x, 0.35, pos3d.z);

  const totalHeading = -robotState.angle - (robotState.panAngle * Math.PI / 180);
  threeCamera.rotation.order = 'YXZ';
  threeCamera.rotation.y = totalHeading - Math.PI / 2;
  threeCamera.rotation.x = (robotState.tiltAngle * Math.PI / 180);

  const pBall = to3D(arenaObjects.targetBall.x, arenaObjects.targetBall.y);
  threeTargetBall.position.set(pBall.x, 0.35, pBall.z);

  threeRenderer.render(threeScene, threeCamera);
}

function getThreeFPSnapshot() {
  if (threeInitialized && threeRenderer) return threeRenderer.domElement.toDataURL('image/jpeg', 0.85);
  const fpv = document.getElementById('fpvCanvas');
  return (fpv && typeof fpv.toDataURL === 'function') ? fpv.toDataURL('image/jpeg', 0.85) : null;
}
