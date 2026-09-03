// simulazione/web_simulator/js/slam/slam_boustrophedon.js
// Pianificatore di Copertura Boustrophedon (Lawnmower Pattern) per Simulatore Web

function generateBoustrophedonPath(stepCells) {
  if (!stepCells) stepCells = 3;
  var minX = slamMap.width, maxX = 0, minY = slamMap.height, maxY = 0;
  var found = false;

  for (var y = 0; y < slamMap.height; y++) {
    for (var x = 0; x < slamMap.width; x++) {
      if (slamMap.grid[y][x] === 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
        found = true;
      }
    }
  }

  if (!found) return [];

  var path = [];
  var reverse = false;

  for (var cy = minY + 1; cy < maxY; cy += stepCells) {
    var rowCells = [];
    for (var cx = minX + 1; cx < maxX; cx++) {
      if (slamMap.grid[cy][cx] === 0) {
        rowCells.push({ gx: cx, gy: cy });
      }
    }

    if (rowCells.length === 0) continue;
    if (reverse) rowCells.reverse();

    if (rowCells.length > 2) {
      path.push(rowCells[0]);
      path.push(rowCells[rowCells.length - 1]);
    } else {
      path = path.concat(rowCells);
    }
    reverse = !reverse;
  }
  return path;
}
