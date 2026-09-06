#!/usr/bin/env python3
# simulazione/test_path_smoothing.py
import sys
import os
import math
import numpy as np

base_dir = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
sys.path.insert(0, os.path.join(base_dir, 'robot_server'))

from core.frontier_planner import FrontierPlanner

def test_string_pulling_smoothing():
    print("🔍 Test Algoritmo String Pulling (Path Smoothing)...")
    planner = FrontierPlanner()
    
    # Griglia 30x30 libera con un ostacolo al centro (x: 12..16, y: 8..20)
    dilated_grid = np.zeros((30, 30), dtype=np.int8)
    dilated_grid[8:20, 12:17] = 1 # Ostacolo dilatato
    
    start = (5, 14)
    goal = (24, 14)
    
    # Calcola percorso A* grezzo (senza smoothing)
    height, width = dilated_grid.shape
    import heapq
    open_set = [(0, start)]
    came_from, g_score = {}, {start: 0}
    raw_path = []
    while open_set:
        _, current = heapq.heappop(open_set)
        if current == goal:
            raw_path = [current]
            while current in came_from:
                current = came_from[current]
                raw_path.append(current)
            raw_path.reverse()
            break
        cx, cy = current
        for dx, dy, cost in [(1,0,1), (-1,0,1), (0,1,1), (0,-1,1), (1,1,1.414), (-1,1,1.414), (1,-1,1.414), (-1,-1,1.414)]:
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < width and 0 <= ny < height and dilated_grid[ny, nx] != 1:
                tentative_g = g_score[current] + cost
                if (nx, ny) not in g_score or tentative_g < g_score[(nx, ny)]:
                    came_from[(nx, ny)] = current
                    g_score[(nx, ny)] = tentative_g
                    heapq.heappush(open_set, (tentative_g + math.hypot(goal[0] - nx, goal[1] - ny), (nx, ny)))
    
    assert len(raw_path) > 0, "A* non ha trovato il percorso!"
    raw_length = len(raw_path)
    
    # Esegue lo smoothing del percorso
    smoothed_path = planner.smooth_path(raw_path, dilated_grid)
    smooth_length = len(smoothed_path)
    
    print(f"   📊 Waypoint A* grezzi: {raw_length} -> Waypoint smussati: {smooth_length}")
    reduction_pct = ((raw_length - smooth_length) / raw_length) * 100
    print(f"   📉 Riduzione complessità: {reduction_pct:.1f}%")
    
    assert smooth_length < raw_length, "Lo smoothing non ha ridotto il numero di waypoint!"
    assert smoothed_path[0] == start, "Il punto iniziale è stato alterato!"
    assert smoothed_path[-1] == goal, "Il punto finale è stato alterato!"
    
    # Verifica che tutti i segmenti smussati siano liberi da collisioni
    for i in range(len(smoothed_path) - 1):
        p1 = smoothed_path[i]
        p2 = smoothed_path[i+1]
        assert planner.is_line_clear(p1, p2, dilated_grid), f"Collisione rilevata tra {p1} e {p2}!"
    
    print("   ✅ Algoritmo String Pulling validato: traiettoria pulita e 100% collision-free!")

def test_heading_aware_frontier_ranking():
    print("\n🔍 Test Heading-Aware Frontier Ranking...")
    planner = FrontierPlanner()
    grid = np.zeros((40, 40), dtype=np.int8)
    
    robot_pos = (20, 20)
    current_heading = 0.0 # Il robot è rivolto a Est (+X)
    
    # Frontiera 1: di fronte al robot a Est (28, 20) - dist = 8
    # Frontiera 2: alle spalle del robot a Ovest (12, 20) - dist = 8
    grid[19:22, 28:31] = -1
    grid[19:22, 11:14] = -1
    
    frontiers = [(12, 20), (28, 20)] # Ordine sparso
    
    # Ranking senza orientamento
    ranked_no_heading = planner.rank_frontiers(frontiers, grid, robot_pos)
    assert len(ranked_no_heading) == 2
    
    # Ranking CON orientamento (rivolto a Est: (28, 20) deve vincere nettamente)
    ranked_heading = planner.rank_frontiers(frontiers, grid, robot_pos, current_heading=current_heading)
    
    assert ranked_heading[0] == (28, 20), f"Attesa frontiera frontale (28, 20) al 1° posto, trovata: {ranked_heading[0]}"
    print(f"   ✅ Robot heading = 0 rad (Est) -> Scelta frontiera frontale: {ranked_heading[0]}")
    
    # Inverti orientamento (rivolto a Ovest: heading = pi)
    ranked_heading_west = planner.rank_frontiers(frontiers, grid, robot_pos, current_heading=math.pi)
    assert ranked_heading_west[0] == (12, 20), f"Attesa frontiera (12, 20) al 1° posto per heading Ovest, trovata: {ranked_heading_west[0]}"
    print(f"   ✅ Robot heading = π rad (Ovest) -> Scelta frontiera: {ranked_heading_west[0]}")

if __name__ == "__main__":
    print("🚀 AVVIO TEST UNITARIO PATH SMOOTHING & HEADING-AWARE RANKING")
    print("=" * 60)
    test_string_pulling_smoothing()
    test_heading_aware_frontier_ranking()
    print("\n🎉 TUTTI I TEST PATHFINDING & RANKING SONO STATI SUPERATI CON SUCCESSO!")
