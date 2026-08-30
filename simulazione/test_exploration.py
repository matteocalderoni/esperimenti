#!/usr/bin/env python3
# simulazione/test_exploration.py
import sys
import os
import math
import numpy as np

# Aggiunge percorsi ai moduli di test
base_dir = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
sys.path.insert(0, os.path.join(base_dir, 'robot_server'))
sys.path.insert(0, os.path.join(base_dir, 'mock_hardware'))

from core.occupancy_grid import OccupancyGrid
from core.frontier_planner import FrontierPlanner
from vision.vlm_inspector import VLMInspector

def test_occupancy_grid_and_dilation():
    print("\n🔍 Test 1: Occupancy Grid & Bresenham Raycasting...")
    grid = OccupancyGrid(width_cells=50, height_cells=50, resolution=10.0)
    
    grid.update_ray(250, 250, dist_meters=1.0, angle_rad=0.0)
    start_gx, start_gy = grid.world_to_grid(250, 250)
    assert grid.grid[start_gy, start_gx] == 0, "Punto di partenza deve essere 0 (libero)"
    
    end_gx, end_gy = grid.world_to_grid(250 + 160, 250)
    assert grid.grid[end_gy, end_gx] == 1, "Punto di impatto finale deve essere 1 (ostacolo)"
    
    dilated = grid.get_dilated_grid(radius_cells=3) # Buffer 30px
    assert np.sum(dilated == 1) > np.sum(grid.grid == 1), "La dilatazione deve espandere la zona ostacoli"
    
    stats = grid.get_stats()
    print(f"   ✅ Grid & Raycast OK! Statistiche: {stats}")

def test_frontier_planner_and_astar():
    print("\n🔍 Test 2: Frontier Clustering & Pathfinding A*...")
    planner = FrontierPlanner()
    
    test_grid = np.full((30, 30), -1, dtype=np.int8)
    test_grid[5:25, 5:25] = 0
    
    frontiers = planner.find_frontiers(test_grid)
    assert len(frontiers) > 0, "Dovrebbero essere identificate frontiere"
    print(f"   ✅ Frontiere identificate: {len(frontiers)} cluster")
    
    dilated_map = test_grid.copy()
    dilated_map[10:20, 15] = 1
    start, goal = (10, 15), (20, 15)
    
    path = planner.plan_path(start, goal, dilated_map)
    assert len(path) > 0, "A* deve trovare un percorso che aggira il muro"
    assert not any(dilated_map[p[1], p[0]] == 1 for p in path), "Il percorso non deve attraversare muri"
    print(f"   ✅ A* Pathfinding OK! Lunghezza percorso: {len(path)} passi")

def test_blind_quadrant_and_hunter_mode():
    print("\n🔍 Test 3: Information Gain & Hunter Mode (99%)...")
    planner = FrontierPlanner()
    
    grid = np.zeros((40, 40), dtype=np.int8)
    grid[20:, 20:] = -1  # Angolo cieco principale a Sud-Est
    
    bq = planner.get_blind_quadrant(grid)
    assert bq['qx'] == 1 and bq['qy'] == 1, "Il quadrante cieco deve essere Sud-Est (1, 1)"
    print(f"   ✅ Quadrante cieco rilevato: qx={bq['qx']}, qy={bq['qy']} ({bq['count']} celle)")
    
    f_near_explored = (5, 5)
    f_blind_area = (21, 21)
    ranked = planner.rank_frontiers([f_near_explored, f_blind_area], grid, start_grid_pos=(10, 10))
    assert ranked[0] == f_blind_area, "La frontiera verso l'angolo cieco deve avere priorità massima!"
    print(f"   ✅ Ranking Information Gain OK! Priorità assegnata a: {ranked[0]}")

    # Test Hunter Target quando le frontiere standard sono esaurite
    dilated = grid.copy()
    hunter_target = planner.find_hunter_target(grid, dilated, (10, 10))
    assert hunter_target is not None, "Hunter Mode deve individuare un punto di aggancio per le celle residue"
    print(f"   ✅ Hunter Mode OK! Target residuo individuato a: {hunter_target}")

def test_vlm_fallback():
    print("\n🔍 Test 4: VLM Inspector (Ollama Connection & Fallback)...")
    vlm = VLMInspector(ollama_url="http://localhost:11434")
    cat_ids = [c["id"] for c in vlm.catalog]
    assert "piano_cottura" in cat_ids, "I landmark cucina devono includere il piano cottura"
    assert "frigorifero" in cat_ids, "I landmark cucina devono includere il frigorifero"
    res = vlm.analyze_frame("data:image/jpeg;base64,/9j/4AAQSkZJRg==")
    assert "landmarks" in res, "La risposta deve contenere la chiave 'landmarks'"
    print(f"   ✅ VLM Inspector & Catalogo Cucina OK! Risultato: {res}")

if __name__ == "__main__":
    print("🚀 AVVIO TEST UNITARI MODULO ESPLORAZIONE 2D & VLM")
    print("=" * 60)
    test_occupancy_grid_and_dilation()
    test_frontier_planner_and_astar()
    test_blind_quadrant_and_hunter_mode()
    test_vlm_fallback()
    print("\n🎉 TUTTI I TEST UNITARI SONO STATI SUPERATI CON SUCCESSO!")
