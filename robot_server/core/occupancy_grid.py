# robot_server/core/occupancy_grid.py
import math
import numpy as np
from scipy.ndimage import binary_dilation

class OccupancyGrid:
    """
    Griglia di Occupazione 2D per Mappatura ed Esplorazione Spaziale.
    Valori celle: -1 = Inesplorato/Sconosciuto, 0 = Spazio Libero, 1 = Ostacolo/Muro
    """
    def __init__(self, width_cells=70, height_cells=69, resolution=10.0):
        self.width = width_cells
        self.height = height_cells
        self.resolution = resolution  # 10 pixel/cm per cella
        self.log_odds = np.zeros((self.height, self.width), dtype=np.float32)
        self.grid = np.full((self.height, self.width), -1, dtype=np.int8)

    def world_to_grid(self, x, y):
        gx = int(x / self.resolution)
        gy = int(y / self.resolution)
        gx = max(0, min(self.width - 1, gx))
        gy = max(0, min(self.height - 1, gy))
        return gx, gy

    def grid_to_world(self, gx, gy):
        x = (gx + 0.5) * self.resolution
        y = (gy + 0.5) * self.resolution
        return x, y

    def bresenham_line(self, x0, y0, x1, y1):
        """Genera le coordinate discrete dei punti attraversati dal raggio."""
        points = []
        dx = abs(x1 - x0)
        dy = abs(y1 - y0)
        sx = 1 if x0 < x1 else -1
        sy = 1 if y0 < y1 else -1
        err = dx - dy

        x, y = x0, y0
        while True:
            points.append((x, y))
            if x == x1 and y == y1:
                break
            e2 = 2 * err
            if e2 > -dy:
                err -= dy
                x += sx
            if e2 < dx:
                err += dx
                y += sy
        return points

    def update_ray(self, start_x, start_y, dist_meters, angle_rad, max_range=2.1, weight=1.0):
        """Aggiorna la griglia Bayesiana in Log-Odds tracciando spazio libero ed ostacoli."""
        dist_px = dist_meters * 160.0
        gx0, gy0 = self.world_to_grid(start_x, start_y)
        
        target_x = start_x + math.cos(angle_rad) * dist_px
        target_y = start_y + math.sin(angle_rad) * dist_px
        gx1, gy1 = self.world_to_grid(target_x, target_y)

        line_cells = self.bresenham_line(gx0, gy0, gx1, gy1)
        
        l_free = -0.40 * weight
        l_occ = +0.85 * weight

        # Celle intermedie: decremento log-odds (spazio libero)
        for cx, cy in line_cells[:-1]:
            if 0 <= cx < self.width and 0 <= cy < self.height:
                self.log_odds[cy, cx] = max(-5.0, self.log_odds[cy, cx] + l_free)

        # Ultima cella: incremento log-odds (ostacolo) se entro range massimo
        if dist_meters < max_range and len(line_cells) > 0:
            end_x, end_y = line_cells[-1]
            if 0 <= end_x < self.width and 0 <= end_y < self.height:
                self.log_odds[end_y, end_x] = min(+5.0, self.log_odds[end_y, end_x] + l_occ)

        self._sync_discrete_grid()

    def _sync_discrete_grid(self):
        """Sincronizza la griglia discreta (-1, 0, 1) basandosi sui valori Log-Odds."""
        self.grid[self.log_odds < -0.6] = 0
        self.grid[self.log_odds > 1.2] = 1
        self.grid[(self.log_odds >= -0.6) & (self.log_odds <= 1.2)] = -1

    def stitch_perimeter_wall_gaps(self):
        """Cuce piccoli gap (1-4 celle) lungo le pareti perimetrali esterne della stanza."""
        H, W = self.height, self.width
        # Orizzontale (parete top e bottom)
        for y in [0, 1, 2, H - 3, H - 2, H - 1]:
            if y < 0 or y >= H: continue
            gap_start = -1
            for x in range(W):
                if self.grid[y, x] == 1:
                    if gap_start != -1 and 1 <= (x - gap_start - 1) <= 4:
                        for gx in range(gap_start + 1, x):
                            if self.grid[y, gx] == -1:
                                self.grid[y, gx] = 1
                                self.log_odds[y, gx] = 2.0
                    gap_start = x
                elif self.grid[y, x] == 0:
                    gap_start = -1

        # Verticale (parete left e right)
        for x in [0, 1, 2, W - 3, W - 2, W - 1]:
            if x < 0 or x >= W: continue
            gap_start = -1
            for y in range(H):
                if self.grid[y, x] == 1:
                    if gap_start != -1 and 1 <= (y - gap_start - 1) <= 4:
                        for gy in range(gap_start + 1, y):
                            if self.grid[gy, x] == -1:
                                self.grid[gy, x] = 1
                                self.log_odds[gy, x] = 2.0
                    gap_start = y
                elif self.grid[y, x] == 0:
                    gap_start = -1

    def solidify_obstacle_hulls(self, min_cluster_cells=5):
        """Riempie le celle interne (-1) dei contorni degli ostacoli solidi d'arredo."""
        self.stitch_perimeter_wall_gaps()
        H, W = self.height, self.width
        visited = np.zeros((H, W), dtype=bool)
        max_span_x = int(W * 0.6)
        max_span_y = int(H * 0.6)

        for y in range(H):
            for x in range(W):
                if self.grid[y, x] == 1 and not visited[y, x]:
                    cluster_cells = []
                    queue = [(x, y)]
                    visited[y, x] = True
                    min_x, max_x = x, x
                    min_y, max_y = y, y

                    while queue:
                        cx, cy = queue.pop(0)
                        cluster_cells.append((cx, cy))
                        min_x = min(min_x, cx)
                        max_x = max(max_x, cx)
                        min_y = min(min_y, cy)
                        max_y = max(max_y, cy)

                        for dx, dy in [(1,0), (-1,0), (0,1), (0,-1)]:
                            nx, ny = cx + dx, cy + dy
                            if 0 <= nx < W and 0 <= ny < H:
                                if self.grid[ny, nx] == 1 and not visited[ny, nx]:
                                    visited[ny, nx] = True
                                    queue.append((nx, ny))

                    span_x = max_x - min_x + 1
                    span_y = max_y - min_y + 1

                    if span_x >= max_span_x and span_y >= max_span_y:
                        continue

                    if len(cluster_cells) >= min_cluster_cells and span_x >= 2 and span_y >= 2:
                        for gy in range(min_y, max_y + 1):
                            for gx in range(min_x, max_x + 1):
                                if self.grid[gy, gx] == -1:
                                    self.grid[gy, gx] = 1
                                    self.log_odds[gy, gx] = max(2.5, self.log_odds[gy, gx])

    def get_dilated_grid(self, radius_cells=2):
        """Dilatazione morfologica degli ostacoli per garantire il buffer di sicurezza al robot."""
        obstacle_mask = (self.grid == 1)
        struct = np.ones((radius_cells * 2 + 1, radius_cells * 2 + 1), dtype=bool)
        dilated = binary_dilation(obstacle_mask, structure=struct)
        
        dilated_map = self.grid.copy()
        dilated_map[dilated] = 1
        return dilated_map

    def get_costmap(self, gamma=0.3, max_cost=255.0):
        """Mappa di costo con decadimento esponenziale attorno agli ostacoli."""
        costmap = np.zeros((self.height, self.width), dtype=np.float32)
        obs_y, obs_x = np.where(self.grid == 1)
        if len(obs_y) == 0:
            return costmap

        for y in range(self.height):
            for x in range(self.width):
                if self.grid[y, x] == 1:
                    costmap[y, x] = max_cost
                else:
                    d_min = np.min(np.hypot(obs_x - x, obs_y - y))
                    if d_min <= 4.0:
                        costmap[y, x] = max_cost * math.exp(-gamma * d_min)
        return costmap

    def get_stats(self):
        total = self.width * self.height
        explored = np.sum(self.grid >= 0)
        free = np.sum(self.grid == 0)
        obstacles = np.sum(self.grid == 1)
        pct = (explored / total) * 100.0
        return {
            'explored_pct': round(pct, 1),
            'free_cells': int(free),
            'obstacle_cells': int(obstacles),
            'unknown_cells': int(total - explored)
        }
