# robot_server/core/frontier_planner.py
import heapq
import math
import numpy as np

class FrontierPlanner:
    """
    Pianificatore Frontiere con Information Gain, Hunter Mode (99%) e A* Pathfinding.
    """
    def find_frontiers(self, grid):
        """Identifica le frontiere: celle libere (0) adiacenti a celle inesplorate (-1)."""
        height, width = grid.shape
        frontiers, visited = [], set()
        for y in range(1, height - 1):
            for x in range(1, width - 1):
                if grid[y, x] == 0:
                    neighbors = [(x+1, y), (x-1, y), (x, y+1), (x, y-1)]
                    if any(grid[ny, nx] == -1 for nx, ny in neighbors) and (x, y) not in visited:
                        cluster = self._bfs_cluster(grid, x, y, visited)
                        if len(cluster) >= 1:
                            cx = int(sum(p[0] for p in cluster) / len(cluster))
                            cy = int(sum(p[1] for p in cluster) / len(cluster))
                            frontiers.append((cx, cy))
        return frontiers

    def _bfs_cluster(self, grid, start_x, start_y, visited):
        queue, cluster = [(start_x, start_y)], []
        visited.add((start_x, start_y))
        while queue:
            cx, cy = queue.pop(0)
            cluster.append((cx, cy))
            for nx, ny in [(cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1)]:
                if 1 <= nx < grid.shape[1] - 1 and 1 <= ny < grid.shape[0] - 1:
                    if (nx, ny) not in visited and grid[ny, nx] == 0:
                        if any(grid[my, mx] == -1 for mx, my in [(nx+1, ny), (nx-1, ny), (nx, ny+1), (nx, ny-1)]):
                            visited.add((nx, ny))
                            queue.append((nx, ny))
        return cluster

    def get_blind_quadrant(self, grid):
        height, width = grid.shape
        mid_x, mid_y = width // 2, height // 2
        counts = [
            {'qx': 0, 'qy': 0, 'count': int(np.sum(grid[:mid_y, :mid_x] == -1))},
            {'qx': 1, 'qy': 0, 'count': int(np.sum(grid[:mid_y, mid_x:] == -1))},
            {'qx': 0, 'qy': 1, 'count': int(np.sum(grid[mid_y:, :mid_x] == -1))},
            {'qx': 1, 'qy': 1, 'count': int(np.sum(grid[mid_y:, mid_x:] == -1))},
        ]
        counts.sort(key=lambda item: item['count'], reverse=True)
        return counts[0]

    def rank_frontiers(self, frontiers, grid, start_grid_pos):
        if not frontiers:
            return []
        sx, sy = start_grid_pos
        height, width = grid.shape
        mid_x, mid_y = width // 2, height // 2
        bq = self.get_blind_quadrant(grid)

        def score_frontier(f):
            fx, fy = f[0], f[1]
            dist = math.hypot(fx - sx, fy - sy)
            min_x, max_x = max(0, fx - 6), min(width, fx + 7)
            min_y, max_y = max(0, fy - 6), min(height, fy + 7)
            unexplored = int(np.sum(grid[min_y:max_y, min_x:max_x] == -1))
            in_blind = 35.0 if ((fx >= mid_x) == bq['qx'] and (fy >= mid_y) == bq['qy']) else 0.0
            return (unexplored * 3.0) + in_blind - (dist * 0.7)

        return sorted(frontiers, key=score_frontier, reverse=True)

    def find_hunter_target(self, grid, dilated_grid, start_pos):
        height, width = grid.shape
        sx, sy = start_pos
        candidates = []
        for y in range(1, height - 1):
            for x in range(1, width - 1):
                if grid[y, x] == -1:
                    for nx, ny in [(x+1, y), (x-1, y), (x, y+1), (x, y-1)]:
                        if 0 <= nx < width and 0 <= ny < height and dilated_grid[ny, nx] != 1:
                            candidates.append(((nx, ny), math.hypot(nx - sx, ny - sy)))
                            break
        if not candidates:
            return None
        candidates.sort(key=lambda c: c[1])
        return candidates[0][0]

    def plan_path(self, start, goal, dilated_grid, costmap=None):
        """Calcola la traiettoria ottima con l'algoritmo A* sulla griglia con ostacoli dilatati e gradiente di costo."""
        height, width = dilated_grid.shape
        sx, sy, gx, gy = start[0], start[1], goal[0], goal[1]
        if not (0 <= sx < width and 0 <= sy < height and 0 <= gx < width and 0 <= gy < height) or dilated_grid[gy, gx] == 1:
            return []

        open_set = [(0, (sx, sy))]
        came_from, g_score = {}, {(sx, sy): 0}
        while open_set:
            _, current = heapq.heappop(open_set)
            if current == (gx, gy):
                path = [current]
                while current in came_from:
                    current = came_from[current]
                    path.append(current)
                path.reverse()
                return path

            cx, cy = current
            for dx, dy, cost in [(1,0,1), (-1,0,1), (0,1,1), (0,-1,1), (1,1,1.414), (-1,1,1.414), (1,-1,1.414), (-1,-1,1.414)]:
                nx, ny = cx + dx, cy + dy
                if 0 <= nx < width and 0 <= ny < height and dilated_grid[ny, nx] != 1:
                    c_penalty = (costmap[ny, nx] * 0.01) if costmap is not None else 0.0
                    tentative_g = g_score[current] + cost + c_penalty
                    if (nx, ny) not in g_score or tentative_g < g_score[(nx, ny)]:
                        came_from[(nx, ny)] = current
                        g_score[(nx, ny)] = tentative_g
                        heapq.heappush(open_set, (tentative_g + math.hypot(gx - nx, gy - ny), (nx, ny)))
        return []
