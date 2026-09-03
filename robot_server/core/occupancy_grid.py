# robot_server/core/occupancy_grid.py
import math
import numpy as np
from scipy.ndimage import binary_dilation

class OccupancyGrid:
    """
    Griglia di Occupazione 2D per Mappatura ed Esplorazione Spaziale.
    Valori celle: -1 = Inesplorato/Sconosciuto, 0 = Spazio Libero, 1 = Ostacolo/Muro
    """
    def __init__(self, width_cells=70, height_cells=52, resolution=10.0):
        self.width = width_cells
        self.height = height_cells
        self.resolution = resolution  # 10 pixel/cm per cella
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

    def update_ray(self, start_x, start_y, dist_meters, angle_rad, max_range=2.1):
        """Aggiorna la matrice 2D tracciando spazio libero lungo il raggio e ostacolo all'impatto."""
        dist_px = dist_meters * 160.0
        gx0, gy0 = self.world_to_grid(start_x, start_y)
        
        target_x = start_x + math.cos(angle_rad) * dist_px
        target_y = start_y + math.sin(angle_rad) * dist_px
        gx1, gy1 = self.world_to_grid(target_x, target_y)

        line_cells = self.bresenham_line(gx0, gy0, gx1, gy1)
        
        # Le celle intermedie sono certe come spazio libero (0)
        for cx, cy in line_cells[:-1]:
            if 0 <= cx < self.width and 0 <= cy < self.height:
                if self.grid[cy, cx] != 1:  # Non sovrascrivere muri già confermati
                    self.grid[cy, cx] = 0

        # L'ultima cella è un ostacolo (1) solo se entro il range massimo del sensore
        if dist_meters < max_range:
            end_x, end_y = line_cells[-1]
            if 0 <= end_x < self.width and 0 <= end_y < self.height:
                self.grid[end_y, end_x] = 1

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
