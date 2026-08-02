// simulazione/web_simulator/js/controls.js

function initKeyboardControls() {
  const activeKeys = {};

  document.addEventListener('keydown', (e) => {
    if (activeKeys[e.code]) return;
    activeKeys[e.code] = true;

    switch (e.code) {
      case 'KeyW': sendCommand('forward'); break;
      case 'KeyS': sendCommand('backward'); break;
      case 'KeyA': sendCommand('left'); break;
      case 'KeyD': sendCommand('right'); break;
      case 'Digit1': sendCommand('rotate-left'); break;
      case 'Digit3': sendCommand('rotate-right'); break;
      case 'KeyI': sendCommand('up'); break;
      case 'KeyK': sendCommand('down'); break;
      case 'KeyJ': sendCommand('lookleft'); break;
      case 'KeyL': sendCommand('lookright'); break;
      case 'Space': sendCommand('DS'); sendCommand('TS'); sendCommand('home'); break;
    }
  });

  document.addEventListener('keyup', (e) => {
    delete activeKeys[e.code];
    switch (e.code) {
      case 'KeyW':
      case 'KeyS':
      case 'Digit1':
      case 'Digit3': sendCommand('DS'); break;
      case 'KeyA':
      case 'KeyD': sendCommand('TS'); break;
      case 'KeyI':
      case 'KeyK': sendCommand('UDstop'); break;
      case 'KeyJ':
      case 'KeyL': sendCommand('LRstop'); break;
    }
  });
}
