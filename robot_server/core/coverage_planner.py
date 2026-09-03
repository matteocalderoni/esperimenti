# robot_server/core/coverage_planner.py
import numpy as np

class CoveragePlanner:
    """
    Pianificatore Boustrophedon per Generazione di Corsie ad S (Lawnmower Pattern).
    Scompone lo spazio libero in una griglia di passi parallelati.
    """
    def __init__(self, step_cells=3):
        self.step_cells = step_cells  # Distanza tra corsie ad S (in celle)

    def get_bounding_box(self, grid):
        """Trova la bounding box delle celle libere (0)."""
        free_coords = np.argwhere(grid == 0)
        if len(free_coords) == 0:
            return None
        min_y, min_x = free_coords.min(axis=0)
        max_y, max_x = free_coords.max(axis=0)
        return (min_x, min_y, max_x, max_y)

    def generate_boustrophedon_path(self, grid, start_pos=None):
        """
        Genera una sequenza ordinata di waypoints ad S (Boustrophedon).
        """
        bbox = self.get_bounding_box(grid)
        if not bbox:
            return []

        min_x, min_y, max_x, max_y = bbox
        path = []
        reverse = False

        for y in range(min_y + 1, max_y, self.step_cells):
            row_cells = []
            for x in range(min_x + 1, max_x):
                if grid[y, x] == 0:  # Cella libera
                    row_cells.append((x, y))

            if not row_cells:
                continue

            if reverse:
                row_cells.reverse()

            # Aggiunge inizio e fine corsia per evitare sovraffollamento punti
            if len(row_cells) > 2:
                path.append(row_cells[0])
                path.append(row_cells[-1])
            else:
                path.extend(row_cells)

            reverse = not reverse

        return path
