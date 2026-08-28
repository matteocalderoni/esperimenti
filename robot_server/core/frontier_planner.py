# robot_server/core/frontier_planner.py
import heapq
import math
import numpy as np

class FrontierPlanner:
    """
    Pianificatore Frontiere e Navigazione A* per Esplorazione Autonoma.
    """
    def __init__(self):
        pass

    def find_frontiers(self, grid):
        """Identifica le frontiere: celle libere (0) direttamente adiacenti a celle inesplorate (-1)."""
        height, width = grid.shape
        frontiers = []
        visited = set()

        for y in range(1, height - 1):
            for x in range(1, width - 1):
                if grid[y, x] == 0:  # Cella libera nota
                    # Controlla se almeno un vicino è inesplorato (-1)
                    neighbors = [(x+1, y), (x-1, y), (x, y+1), (x, y-1)]
                    if any(grid[ny, nx] == -1 for nx, ny in neighbors):
                        if (x, y) not in visited:
                            # Cluster BFS per estrarre la frontiera
                            cluster = self._bfs_cluster(grid, x, y, visited)
                            if len(cluster) >= 2:  # Filtra piccoli rumori isolati
                                centroid_x = int(sum(p[0] for p in cluster) / len(cluster))
                                centroid_y = int(sum(p[1] for p in cluster) / len(cluster))
                                frontiers.append((centroid_x, centroid_y))
        return frontiers

    def _bfs_cluster(self, grid, start_x, start_y, visited):
        queue = [(start_x, start_y)]
        visited.add((start_x, start_y))
        cluster = []

        while queue:
            cx, cy = queue.pop(0)
            cluster.append((cx, cy))
            for nx, ny in [(cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1)]:
                if 1 <= nx < grid.shape[1] - 1 and 1 <= ny < grid.shape[0] - 1:
                    if (nx, ny) not in visited and grid[ny, nx] == 0:
                        neighbors = [(nx+1, ny), (nx-1, ny), (nx, ny+1), (nx, ny-1)]
                        if any(grid[my, mx] == -1 for mx, my in neighbors):
                            visited.add((nx, ny))
                            queue.append((nx, ny))
        return cluster

    def plan_path(self, start, goal, dilated_grid):
        """Calcola la traiettoria ottima con l'algoritmo A* sulla griglia con ostacoli dilatati."""
        height, width = dilated_grid.shape
        sx, sy = start
        gx, gy = goal

        if not (0 <= sx < width and 0 <= sy < height) or not (0 <= gx < width and 0 <= gy < height):
            return []
        if dilated_grid[gy, gx] == 1:
            return []

        open_set = []
        heapq.heappush(open_set, (0, (sx, sy)))
        came_from = {}
        g_score = { (sx, sy): 0 }

        def heuristic(a, b):
            return math.hypot(b[0] - a[0], b[1] - a[1])

        while open_set:
            _, current = heapq.heappop(open_set)
            if current == (gx, gy):
                # Ricostruzione del percorso
                path = [current]
                while current in came_from:
                    current = came_from[current]
                    path.append(current)
                path.reverse()
                return path

            cx, cy = current
            # Movimenti a 8 direzioni
            for dx, dy, cost in [(1,0,1), (-1,0,1), (0,1,1), (0,-1,1), 
                                 (1,1,1.414), (-1,1,1.414), (1,-1,1.414), (-1,-1,1.414)]:
                nx, ny = cx + dx, cy + dy
                if 0 <= nx < width and 0 <= ny < height:
                    if dilated_grid[ny, nx] == 1:  # Ostacolo o zona di sicurezza
                        continue
                    tentative_g = g_score[current] + cost
                    if (nx, ny) not in g_score or tentative_g < g_score[(nx, ny)]:
                        came_from[(nx, ny)] = current
                        g_score[(nx, ny)] = tentative_g
                        f_score = tentative_g + heuristic((nx, ny), (gx, gy))
                        heapq.heappush(open_set, (f_score, (nx, ny)))

        return []  # Nessun percorso trovato
