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
    
    # Esegue raycast da (250, 250) con ostacolo a 1.0 metro verso destra (angolo 0)
    grid.update_ray(250, 250, dist_meters=1.0, angle_rad=0.0)
    
    # Verifica che il punto di partenza sia marcato come libero (0)
    start_gx, start_gy = grid.world_to_grid(250, 250)
    assert grid.grid[start_gy, start_gx] == 0, "Punto di partenza deve essere 0 (libero)"
    
    # Verifica che l'impatto a 160px (10 celle di distanza) sia marcato come ostacolo (1)
    end_gx, end_gy = grid.world_to_grid(250 + 160, 250)
    assert grid.grid[end_gy, end_gx] == 1, "Punto di impatto finale deve essere 1 (ostacolo)"
    
    # Test dilatazione morfologica
    dilated = grid.get_dilated_grid(radius_cells=2)
    assert np.sum(dilated == 1) > np.sum(grid.grid == 1), "La dilatazione deve espandere la zona ostacoli"
    
    stats = grid.get_stats()
    print(f"   ✅ Grid & Raycast OK! Statistiche: {stats}")

def test_frontier_planner_and_astar():
    print("\n🔍 Test 2: Frontier Clustering & Pathfinding A*...")
    planner = FrontierPlanner()
    
    # Griglia di test 30x30 con stanza centrale libera e ostacolo al centro
    test_grid = np.full((30, 30), -1, dtype=np.int8)
    test_grid[5:25, 5:25] = 0  # Spazio esplorato libero
    
    # Identifica le frontiere al confine tra lo spazio libero e -1
    frontiers = planner.find_frontiers(test_grid)
    assert len(frontiers) > 0, "Dovrebbero essere identificate frontiere lungo il perimetro esplorato"
    print(f"   ✅ Frontiere identificate: {len(frontiers)} cluster")
    
    # Test A* Pathfinding attorno a un muro
    dilated_map = test_grid.copy()
    dilated_map[10:20, 15] = 1  # Muro verticale
    
    start = (10, 15)  # A sinistra del muro
    goal = (20, 15)   # A destra del muro
    
    path = planner.plan_path(start, goal, dilated_map)
    assert len(path) > 0, "A* deve trovare un percorso che aggira il muro"
    assert not any(dilated_map[p[1], p[0]] == 1 for p in path), "Il percorso non deve attraversare muri"
    print(f"   ✅ A* Pathfinding OK! Lunghezza percorso: {len(path)} passi")

def test_vlm_fallback():
    print("\n🔍 Test 3: VLM Inspector (Ollama Connection & Fallback)...")
    vlm = VLMInspector(ollama_url="http://localhost:11434")
    
    available = vlm.is_available()
    print(f"   ℹ️ Ollama Server Disponibile: {available}")
    
    # Test resilienza con input fittizio quando offline
    res = vlm.analyze_frame("data:image/jpeg;base64,/9j/4AAQSkZJRg==")
    assert "landmarks" in res, "La risposta deve contenere la chiave 'landmarks'"
    print(f"   ✅ VLM Inspector Fallback OK! Risultato: {res}")

if __name__ == "__main__":
    print("🚀 AVVIO TEST UNITARI MODULO ESPLORAZIONE 2D & VLM")
    print("=" * 60)
    test_occupancy_grid_and_dilation()
    test_frontier_planner_and_astar()
    test_vlm_fallback()
    print("\n🎉 TUTTI I TEST UNITARI SONO STATI SUPERATI CON SUCCESSO!")
