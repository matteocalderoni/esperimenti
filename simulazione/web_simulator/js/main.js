// simulazione/web_simulator/js/main.js

let arenaCanvas, arenaCtx;
let mapCanvas, mapCtx;
let fpvCanvas, fpvCtx;

window.addEventListener('DOMContentLoaded', () => {
  arenaCanvas = document.getElementById('arenaCanvas');
  if (arenaCanvas) arenaCtx = arenaCanvas.getContext('2d');

  mapCanvas = document.getElementById('mapCanvas');
  if (mapCanvas) mapCtx = mapCanvas.getContext('2d');
  
  fpvCanvas = document.getElementById('fpvCanvas');

  // Inizializza Telecamera FPV 3D Three.js
  if (typeof initThreeFPV === 'function') {
    try {
      initThreeFPV();
    } catch (e) {
      console.warn("Three.js initialization failed:", e);
    }
  }

  // Fallback a 2D Context solo se Three.js non è attivo
  if ((typeof threeInitialized === 'undefined' || !threeInitialized) && fpvCanvas) {
    try {
      fpvCtx = fpvCanvas.getContext('2d');
    } catch (e) {}
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  initWebSocket();
  initKeyboardControls();
  initMouseInteraction();

  requestAnimationFrame(gameLoop);
});

function resizeCanvas() {
  if (arenaCanvas) {
    arenaCanvas.width = arenaCanvas.clientWidth;
    arenaCanvas.height = arenaCanvas.clientHeight;
  }
  if (mapCanvas) {
    mapCanvas.width = mapCanvas.clientWidth;
    mapCanvas.height = mapCanvas.clientHeight;
  }
  if (fpvCanvas) {
    fpvCanvas.width = fpvCanvas.clientWidth;
    fpvCanvas.height = fpvCanvas.clientHeight;
    if (typeof threeRenderer !== 'undefined' && threeRenderer) {
      threeRenderer.setSize(fpvCanvas.clientWidth, fpvCanvas.clientHeight, false);
      if (typeof threeCamera !== 'undefined' && threeCamera) {
        threeCamera.aspect = fpvCanvas.clientWidth / fpvCanvas.clientHeight;
        threeCamera.updateProjectionMatrix();
      }
    }
  }
}

function gameLoop() {
  updatePhysics();
  drawArena();
  if (typeof drawOccupancyMap === 'function') {
    drawOccupancyMap();
  }

  // Rendering FPV (Priorità a Three.js 3D se inizializzato)
  if (typeof updateThreeCamera === 'function' && typeof threeInitialized !== 'undefined' && threeInitialized) {
    updateThreeCamera();
  } else {
    drawFPV();
  }

  requestAnimationFrame(gameLoop);
}

