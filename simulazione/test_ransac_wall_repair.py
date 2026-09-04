#!/usr/bin/env python3
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'robot_server'))

from core.occupancy_grid import OccupancyGrid

def test_ransac_wall_stitching():
    og = OccupancyGrid(width_cells=40, height_cells=40, resolution=10.0)
    
    # 1. Simula una parete orizzontale a y=10 da x=5 a x=35, ma con una lacuna da x=18 a x=24 (ombra ostacolo)
    for x in range(5, 18):
        og.grid[10, x] = 1
        og.log_odds[10, x] = 3.5
    for x in range(25, 36):
        og.grid[10, x] = 1
        og.log_odds[10, x] = 3.5
        
    # Lacuna occlusa al centro
    for x in range(18, 25):
        og.grid[10, x] = -1
        og.log_odds[10, x] = 0.0

    print("--- PRIMA DI RANSAC WALL RECONSTRUCTION ---")
    gap_before = [og.grid[10, x] for x in range(15, 28)]
    print(f"Linea y=10 (x=15..27): {gap_before}")

    # Esegui la ricostruzione delle pareti RANSAC
    og.reconstruct_wall_segments(min_inliers=5, max_gap_cells=15)

    print("--- DOPO RANSAC WALL RECONSTRUCTION ---")
    gap_after = [og.grid[10, x] for x in range(15, 28)]
    print(f"Linea y=10 (x=15..27): {gap_after}")

    # Verifica che le celle del varco siano state ricucite a 1
    stitched_count = sum(1 for x in range(18, 25) if og.grid[10, x] == 1)
    assert stitched_count == 7, f"Errore RANSAC: solo {stitched_count}/7 celle ricucite!"
    print("SUCCESS: RANSAC Wall Reconstruction ha ricucito perfettamente la parete occlusa!")

if __name__ == '__main__':
    test_ransac_wall_stitching()
