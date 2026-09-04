# robot_server/core/occupancy_grid.py
import math
import numpy as np

try:
    from scipy.ndimage import binary_dilation
    HAS_SCIPY = True
except ImportError:
    HAS_SCIPY = False

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
        self.static_wall_grid = np.full((self.height, self.width), -1, dtype=np.int8)
        self.dynamic_obstacle_grid = np.full((self.height, self.width), -1, dtype=np.int8)
        self.semantic_objects = []


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

        # Celle intermedie: decremento log-odds (spazio libero lungo il raggio)
        is_hit = (dist_meters < max_range)
        clear_limit = max(0, len(line_cells) - 1) if is_hit else len(line_cells)

        for cx, cy in line_cells[:clear_limit]:
            if 0 <= cx < self.width and 0 <= cy < self.height:
                current_log = self.log_odds[cy, cx]
                # Protezione pareti ad alta confidenza (muri stabili RANSAC/Log-Odds >= 3.0)
                if current_log >= 3.0:
                    l_free_eff = l_free * 0.15
                else:
                    l_free_eff = l_free
                self.log_odds[cy, cx] = max(-5.0, current_log + l_free_eff)


        # Ultima cella: incremento log-odds (ostacolo) se entro range massimo
        if is_hit and len(line_cells) > 0:
            end_x, end_y = line_cells[-1]
            if 0 <= end_x < self.width and 0 <= end_y < self.height:
                self.log_odds[end_y, end_x] = min(+5.0, self.log_odds[end_y, end_x] + l_occ)

        self._sync_discrete_grid()


    def _sync_discrete_grid(self):
        """Sincronizza le griglie discrete basandosi sui valori Log-Odds ed i layer static/dynamic."""
        self.grid[self.log_odds < -0.35] = 0
        self.grid[self.log_odds > 0.8] = 1
        self.grid[(self.log_odds >= -0.35) & (self.log_odds <= 0.8)] = -1

        # Layer Pareti Statiche: isola le celle muro ad altissima confidenza
        self.static_wall_grid[self.log_odds >= 3.0] = 1
        self.static_wall_grid[self.log_odds < -0.35] = 0


    def merge_nearby_clusters(self, raw_clusters, max_gap_cells=4):
        """Unisce i bounding box di cluster vicini (gap <= max_gap_cells celle ~ 40cm)."""
        if not raw_clusters or len(raw_clusters) <= 1:
            return raw_clusters

        merged = True
        clusters = list(raw_clusters)

        while merged:
            merged = False
            for i in range(len(clusters)):
                for j in range(i + 1, len(clusters)):
                    c1 = clusters[i]
                    c2 = clusters[j]

                    dx = 0
                    if c1['max_x'] < c2['min_x']:
                        dx = c2['min_x'] - c1['max_x']
                    elif c2['max_x'] < c1['min_x']:
                        dx = c1['min_x'] - c2['max_x']

                    dy = 0
                    if c1['max_y'] < c2['min_y']:
                        dy = c2['min_y'] - c1['max_y']
                    elif c2['max_y'] < c1['min_y']:
                        dy = c1['min_y'] - c2['max_y']

                    gap = max(dx, dy)

                    if gap <= max_gap_cells:
                        min_x = min(c1['min_x'], c2['min_x'])
                        max_x = max(c1['max_x'], c2['max_x'])
                        min_y = min(c1['min_y'], c2['min_y'])
                        max_y = max(c1['max_y'], c2['max_y'])
                        all_cells = c1['cells'] + c2['cells']

                        clusters[i] = {
                            'min_x': min_x, 'max_x': max_x,
                            'min_y': min_y, 'max_y': max_y,
                            'span_x': max_x - min_x + 1,
                            'span_y': max_y - min_y + 1,
                            'cells': all_cells
                        }
                        clusters.pop(j)
                        merged = True
                        break
                if merged:
                    break

        return clusters

    def classify_semantic_objects(self):
        """
        Estragga gli ostacoli isolati a centro stanza trasformandoli in Bounding Box semantici.
        Mantiene le pareti perimetrali integre ed evita di spezzarle.
        """
        H, W = self.height, self.width
        visited = np.zeros((H, W), dtype=bool)
        self.semantic_objects = []
        max_span_x = int(W * 0.6)
        max_span_y = int(H * 0.6)

        raw_clusters = []

        for y in range(H):
            for x in range(W):
                if self.grid[y, x] == 1 and not visited[y, x]:
                    cluster = []
                    queue = [(x, y)]
                    visited[y, x] = True
                    min_x, max_x = x, x
                    min_y, max_y = y, y

                    while queue:
                        cx, cy = queue.pop(0)
                        cluster.append((cx, cy))
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

                    # Ignora l'involucro perimetrale esterno della stanza
                    if span_x >= max_span_x and span_y >= max_span_y:
                        continue

                    if 4 <= len(cluster) <= 120 and span_x < max_span_x and span_y < max_span_y:
                        raw_clusters.append({
                            'min_x': min_x, 'max_x': max_x,
                            'min_y': min_y, 'max_y': max_y,
                            'span_x': span_x, 'span_y': span_y,
                            'cells': cluster
                        })

        merged_clusters = self.merge_nearby_clusters(raw_clusters, max_gap_cells=4)

        for item in merged_clusters:
            for cy, cx in item['cells']:
                self.dynamic_obstacle_grid[cy, cx] = 1

            wx, wy = self.grid_to_world(item['min_x'], item['min_y'])
            w_width = item['span_x'] * self.resolution
            w_height = item['span_y'] * self.resolution

            obj_type = "table" if (w_width >= 40 and w_height >= 40) else "chair"
            label = "🍽️ Tavolo" if obj_type == "table" else "🪑 Sedia"

            self.semantic_objects.append({
                'id': f"obj_{len(self.semantic_objects)+1}",
                'type': obj_type,
                'label': label,
                'gx': item['min_x'], 'gy': item['min_y'],
                'span_x': item['span_x'], 'span_y': item['span_y'],
                'world_x': wx, 'world_y': wy,
                'width_cm': w_width, 'height_cm': w_height
            })


    def stitch_perimeter_wall_gaps(self):
        """Cuce gap fino a 12 celle (~1.20m) lungo i margini delle pareti perimetrali esterne."""
        H, W = self.height, self.width
        perimeter_y = [0, 1, 2, 3, 4, H - 5, H - 4, H - 3, H - 2, H - 1]
        perimeter_x = [0, 1, 2, 3, 4, W - 5, W - 4, W - 3, W - 2, W - 1]

        # Orizzontale (pareti superiore ed inferiore)
        for y in perimeter_y:
            if y < 0 or y >= H: continue
            gap_start = -1
            for x in range(W):
                if self.grid[y, x] == 1:
                    if gap_start != -1:
                        gap_len = x - gap_start - 1
                        if 1 <= gap_len <= 12:
                            for gx in range(gap_start + 1, x):
                                if self.grid[y, gx] == -1 or (self.grid[y, gx] == 0 and self.log_odds[y, gx] >= -1.0):
                                    self.grid[y, gx] = 1
                                    self.log_odds[y, gx] = 2.5
                    gap_start = x

        # Verticale (pareti sinistra e destra)
        for x in perimeter_x:
            if x < 0 or x >= W: continue
            gap_start = -1
            for y in range(H):
                if self.grid[y, x] == 1:
                    if gap_start != -1:
                        gap_len = y - gap_start - 1
                        if 1 <= gap_len <= 12:
                            for gy in range(gap_start + 1, y):
                                if self.grid[gy, x] == -1 or (self.grid[gy, x] == 0 and self.log_odds[gy, x] >= -1.0):
                                    self.grid[gy, x] = 1
                                    self.log_odds[gy, x] = 2.5
                    gap_start = y

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

        self.reconstruct_wall_segments()

    def reconstruct_wall_segments(self, min_inliers=6, distance_threshold=1.2, max_gap_cells=15):
        """
        Algoritmo RANSAC per la ricostruzione delle pareti occluse dietro gli oggetti (Hole Stitching).
        Identifica segmenti di retta tra i punti muro (grid == 1) e congiunge i varchi inesplorati (-1).
        """
        H, W = self.height, self.width
        wall_pts = [(x, y) for y in range(H) for x in range(W) if self.grid[y, x] == 1]
        if len(wall_pts) < min_inliers:
            return

        remaining_pts = list(wall_pts)
        max_iterations = 40

        while len(remaining_pts) >= min_inliers:
            best_inliers = []
            best_line = None

            for _ in range(max_iterations):
                if len(remaining_pts) < 2:
                    break
                idx1, idx2 = np.random.choice(len(remaining_pts), 2, replace=False)
                p1, p2 = remaining_pts[idx1], remaining_pts[idx2]

                dx = p2[0] - p1[0]
                dy = p2[1] - p1[1]
                dist_p = math.hypot(dx, dy)
                if dist_p < 3.0:
                    continue

                A = dy / dist_p
                B = -dx / dist_p
                C = -(A * p1[0] + B * p1[1])

                inliers = []
                for px, py in remaining_pts:
                    d = abs(A * px + B * py + C)
                    if d <= distance_threshold:
                        inliers.append((px, py))

                if len(inliers) > len(best_inliers):
                    best_inliers = inliers
                    best_line = (A, B, C, dx, dy, p1)

            if len(best_inliers) < min_inliers or best_line is None:
                break

            A, B, C, dx, dy, p1 = best_line

            dir_x, dir_y = dx / math.hypot(dx, dy), dy / math.hypot(dx, dy)
            proj_inliers = []
            for px, py in best_inliers:
                t = (px - p1[0]) * dir_x + (py - p1[1]) * dir_y
                proj_inliers.append((t, px, py))

            proj_inliers.sort(key=lambda item: item[0])

            for i in range(len(proj_inliers) - 1):
                p_a = (proj_inliers[i][1], proj_inliers[i][2])
                p_b = (proj_inliers[i+1][1], proj_inliers[i+1][2])
                gap_dist = math.hypot(p_b[0] - p_a[0], p_b[1] - p_a[1])

                if 1.5 <= gap_dist <= max_gap_cells:
                    gap_line = self.bresenham_line(p_a[0], p_a[1], p_b[0], p_b[1])
                    for gx, gy in gap_line[1:-1]:
                        if 0 <= gx < W and 0 <= gy < H:
                            if self.grid[gy, gx] == -1 and self.log_odds[gy, gx] >= -0.2:
                                self.grid[gy, gx] = 1
                                self.log_odds[gy, gx] = max(2.5, self.log_odds[gy, gx])

            inlier_set = set(best_inliers)
            remaining_pts = [p for p in remaining_pts if p not in inlier_set]





    def get_dilated_grid(self, radius_cells=2):
        """Dilatazione morfologica degli ostacoli per garantire il buffer di sicurezza al robot."""
        obstacle_mask = (self.grid == 1)
        if HAS_SCIPY:
            struct = np.ones((radius_cells * 2 + 1, radius_cells * 2 + 1), dtype=bool)
            dilated = binary_dilation(obstacle_mask, structure=struct)
        else:
            dilated = obstacle_mask.copy()
            for _ in range(radius_cells):
                d = dilated.copy()
                dilated[1:, :] |= d[:-1, :]
                dilated[:-1, :] |= d[1:, :]
                dilated[:, 1:] |= d[:, :-1]
                dilated[:, :-1] |= d[:, 1:]
        
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
