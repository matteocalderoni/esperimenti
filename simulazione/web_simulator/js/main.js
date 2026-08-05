// simulazione/web_simulator/js/main.js

let arenaCanvas, arenaCtx;
let fpvCanvas, fpvCtx;

window.addEventListener('DOMContentLoaded', () => {
  arenaCanvas = document.getElementById('arenaCanvas');
  if (arenaCanvas) arenaCtx = arenaCanvas.getContext('2d');
  
  fpvCanvas = document.getElementById('fpvCanvas');
  if (fpvCanvas) fpvCtx = fpvCanvas.getContext('2d');

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
  if (fpvCanvas) {
    fpvCanvas.width = fpvCanvas.clientWidth;
    fpvCanvas.height = fpvCanvas.clientHeight;
  }
}

function gameLoop() {
  updatePhysics();
  drawArena();
  drawFPV();
  requestAnimationFrame(gameLoop);
}
