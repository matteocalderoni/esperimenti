#!/usr/bin/env python3
# simulazione/test_cluster_merging.py
import sys
import os

base_dir = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
sys.path.insert(0, os.path.join(base_dir, 'robot_server'))

from vision.vlm_inspector import VLMInspector

def test_vlm_expanded_vocabulary():
    print("🔍 Test VLM Vocabulary Expansion & Substring Matching...")
    vlm = VLMInspector()
    
    test_cases = [
        ("dining table with 4 chairs", "tavolo_pranzo"),
        ("large wooden table in the center", "tavolo_pranzo"),
        ("tavolino da pranzo in legno", "tavolo_pranzo"),
        ("eating area surface", "tavolo_pranzo"),
        ("workstation desk", "tavolo_pranzo"),
        ("a wooden chair", "sedia"),
        ("sgabello alto", "sedia"),
        ("kitchen stove and cooktop", "piano_cottura"),
        ("frigorifero grande", "frigorifero")
    ]
    
    for text, expected_id in test_cases:
        matched = vlm._match_category(text)
        assert matched is not None, f"Fallimento: '{text}' non è stato riconosciuto!"
        assert matched["id"] == expected_id, f"Fallimento: '{text}' associato a {matched['id']} invece di {expected_id}"
        print(f"   ✅ '{text}' -> {matched['display']} ({matched['id']})")

def test_python_cluster_merging_logic():
    print("\n🔍 Test Logic Merging Cluster Vicini (Python)...")
    # Test della logica pura di fusione bounding box senza dipendenze da scipy
    raw_clusters = [
        {'min_x': 25, 'max_x': 30, 'min_y': 20, 'max_y': 25, 'span_x': 6, 'span_y': 6, 'cells': [(25,20), (30,25)]},
        {'min_x': 32, 'max_x': 38, 'min_y': 20, 'max_y': 25, 'span_x': 7, 'span_y': 6, 'cells': [(32,20), (38,25)]}
    ]
    
    # Gap tra max_x=30 e min_x=32 è 2 celle (< 4 celle -> deve essere fuso in 1 cluster)
    from core.occupancy_grid import OccupancyGrid
    # Patch minima temporanea se scipy manca
    grid = OccupancyGrid.__new__(OccupancyGrid)
    merged = grid.merge_nearby_clusters(raw_clusters, max_gap_cells=4)
    
    assert len(merged) == 1, f"I 2 cluster vicini avrebbero dovuto essere fusi in 1! Trovati: {len(merged)}"
    assert merged[0]['min_x'] == 25 and merged[0]['max_x'] == 38, "Bounding box fuso errato!"
    print(f"   ✅ Fusione Cluster OK! 2 frammenti (gap 2 celle) fusi in 1 unico bounding box: x=[25..38]")

if __name__ == "__main__":
    print("🚀 AVVIO TEST UNITARIO CLUSTER MERGING & VLM VOCABULARY")
    print("=" * 60)
    test_vlm_expanded_vocabulary()
    test_python_cluster_merging_logic()
    print("\n🎉 TUTTI I TEST VLM E CLUSTER SONO STATI SUPERATI CON SUCCESSO!")
