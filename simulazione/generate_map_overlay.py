#!/usr/bin/env python3
# simulazione/generate_map_overlay.py
# Legge scratch/mapping_results.json e genera un'immagine PNG ad alta risoluzione
# che sovrappone la pianta generata dal robot all'arena originale verita' a terra.

import json
import os
import cv2
import numpy as np

def generate_overlay():
    scratch_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'scratch'))
    json_path = os.path.join(scratch_dir, 'mapping_results.json')
    output_png = os.path.join(scratch_dir, 'overlay_mappa_arena.png')
    brain_dir = os.path.expanduser('~/.gemini/antigravity/brain/ea6949a0-e92e-4ebd-a339-371d83a908cf')

    with open(json_path, 'r') as f:
        data = json.load(f)

    W = data['arenaWidthPx']
    H = data['arenaHeightPx']
    gridW = data['gridWidth']
    gridH = data['gridHeight']
    cellX = data['cellPxX']
    cellY = data['cellPxY']
    comp_grid = data['comparisonGrid']
    walls_gt = data['wallsGT']
    traj = data['trajectory']

    SCALE = 0.5 if W > 1000 else 1.0
    panel_w = int(W * SCALE)
    panel_h = int(H * SCALE)
    header_h = 80
    footer_h = 100
    padding = 20

    total_w = padding + (panel_w + padding) * 3
    total_h = header_h + panel_h + footer_h + padding

    # Create dark background image (BGR)
    img = np.full((total_h, total_w, 3), (38, 24, 18), dtype=np.uint8)

    # Header background
    cv2.rectangle(img, (0, 0), (total_w, header_h), (26, 14, 10), -1)
    cv2.putText(img, "Analisi Sovrapposizione Mappa Robot vs Verita a Terra", (padding, 32),
                cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 245, 240), 2, cv2.LINE_AA)
    sub = f"Arena: {W}x{H} px | Griglia: {gridW}x{gridH} | Cella: {cellX:.1f}x{cellY:.1f} px | Distorsione: {data['cellAspectDistortionPct']}%"
    cv2.putText(img, sub, (padding, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (210, 180, 160), 1, cv2.LINE_AA)
    cv2.line(img, (0, header_h - 1), (total_w, header_h - 1), (90, 60, 40), 2)

    top_m = header_h + 30
    p1_x = padding
    p2_x = padding * 2 + panel_w
    p3_x = padding * 3 + panel_w * 2

    # Panel titles
    titles = [
        (p1_x, "1. Verita a Terra (Arena Originale)"),
        (p2_x, "2. Mappa SLAM Rilevata"),
        (p3_x, "3. Sovrapposizione & Errori")
    ]
    for px, ptitle in titles:
        cv2.rectangle(img, (px - 2, header_h + 5), (px + panel_w + 2, header_h + panel_h + 30), (54, 36, 28), -1)
        cv2.rectangle(img, (px - 2, header_h + 5), (px + panel_w + 2, header_h + panel_h + 30), (105, 70, 50), 2)
        cv2.putText(img, ptitle, (px + 10, header_h + 24), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (250, 230, 220), 1, cv2.LINE_AA)

    # PANEL 1: Ground Truth
    cv2.rectangle(img, (p1_x, top_m), (p1_x + panel_w, top_m + panel_h), (65, 45, 35), -1)
    bordo_s = int(12 * SCALE)
    # Perimeter
    cv2.rectangle(img, (p1_x, top_m), (p1_x + panel_w, top_m + bordo_s), (180, 130, 70), -1)
    cv2.rectangle(img, (p1_x, top_m + panel_h - bordo_s), (p1_x + panel_w, top_m + panel_h), (180, 130, 70), -1)
    cv2.rectangle(img, (p1_x, top_m), (p1_x + bordo_s, top_m + panel_h), (180, 130, 70), -1)
    cv2.rectangle(img, (p1_x + panel_w - bordo_s, top_m), (p1_x + panel_w, top_m + panel_h), (180, 130, 70), -1)
    for w in walls_gt:
        wx0 = p1_x + int(w['x'] * SCALE)
        wy0 = top_m + int(w['y'] * SCALE)
        wx1 = p1_x + int((w['x'] + w['w']) * SCALE)
        wy1 = top_m + int((w['y'] + w['h']) * SCALE)
        cv2.rectangle(img, (wx0, wy0), (wx1, wy1), (180, 200, 0), -1)
        cv2.rectangle(img, (wx0, wy0), (wx1, wy1), (255, 255, 255), 1)

    # PANEL 2: Robot SLAM
    for gy in range(gridH):
        for gx in range(gridW):
            c = comp_grid[gy][gx]
            mapped = c['mappedVal']
            x0 = p2_x + int(gx * cellX * SCALE)
            y0 = top_m + int(gy * cellY * SCALE)
            x1 = p2_x + int((gx + 1) * cellX * SCALE)
            y1 = top_m + int((gy + 1) * cellY * SCALE)
            if mapped == 1:
                col = (65, 65, 235) # Red wall
            elif mapped == 0:
                col = (225, 215, 210) # Light gray free
            else:
                col = (65, 48, 40) # Dark unknown
            cv2.rectangle(img, (x0, y0), (x1, y1), col, -1)

    # PANEL 3: Comparison Status
    for gy in range(gridH):
        for gx in range(gridW):
            c = comp_grid[gy][gx]
            st = c['status']
            x0 = p3_x + int(gx * cellX * SCALE)
            y0 = top_m + int(gy * cellY * SCALE)
            x1 = p3_x + int((gx + 1) * cellX * SCALE)
            y1 = top_m + int((gy + 1) * cellY * SCALE)

            if st == 'MATCH_WALL':
                col = (120, 230, 0) # Green (BGR)
            elif st == 'FALSE_WALL':
                col = (0, 140, 255) # Orange (BGR)
            elif st == 'MISSED_WALL':
                col = (220, 50, 220) # Magenta (BGR)
            elif st == 'MATCH_FREE':
                col = (240, 230, 225) # Light gray
            else:
                col = (70, 52, 45) # Unknown
            cv2.rectangle(img, (x0, y0), (x1, y1), col, -1)

    # Outlines of ground truth walls on Panel 3
    cv2.rectangle(img, (p3_x, top_m), (p3_x + panel_w, top_m + bordo_s), (255, 100, 0), 2)
    cv2.rectangle(img, (p3_x, top_m + panel_h - bordo_s), (p3_x + panel_w, top_m + panel_h), (255, 100, 0), 2)
    cv2.rectangle(img, (p3_x, top_m), (p3_x + bordo_s, top_m + panel_h), (255, 100, 0), 2)
    cv2.rectangle(img, (p3_x + panel_w - bordo_s, top_m), (p3_x + panel_w, top_m + panel_h), (255, 100, 0), 2)
    for w in walls_gt:
        wx0 = p3_x + int(w['x'] * SCALE)
        wy0 = top_m + int(w['y'] * SCALE)
        wx1 = p3_x + int((w['x'] + w['w']) * SCALE)
        wy1 = top_m + int((w['y'] + w['h']) * SCALE)
        cv2.rectangle(img, (wx0, wy0), (wx1, wy1), (255, 100, 0), 2)

    # Robot trajectory on Panel 3
    if len(traj) > 1:
        pts = np.array([[p3_x + int(t['x'] * SCALE), top_m + int(t['y'] * SCALE)] for t in traj], np.int32)
        cv2.polylines(img, [pts], False, (255, 120, 30), 2)

    # Footer metrics bar
    bar_y = top_m + panel_h + 15
    cv2.rectangle(img, (padding, bar_y), (total_w - padding, total_h - 10), (26, 14, 10), -1)
    cv2.rectangle(img, (padding, bar_y), (total_w - padding, total_h - 10), (95, 60, 40), 1)

    c1 = padding + 20
    c2 = padding + 380
    c3 = padding + 760

    cv2.putText(img, "STATISTICHE CORRISPONDENZA", (c1, bar_y + 22), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 215, 255), 1, cv2.LINE_AA)
    cv2.putText(img, f"Richiamo Muri: {data['wallRecallPct']}% ({data['correctWallCells']}/{data['trueWallCells']})", (c1, bar_y + 44), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 240, 230), 1, cv2.LINE_AA)
    cv2.putText(img, f"Precisione Muri: {data['wallPrecisionPct']}% | IoU: {data['iouPct']}%", (c1, bar_y + 64), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 240, 230), 1, cv2.LINE_AA)

    cv2.putText(img, "LEGENDA SOVRAPPOSIZIONE", (c2, bar_y + 22), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 215, 255), 1, cv2.LINE_AA)
    cv2.putText(img, "VERDE: Muro Match | ARANCIONE: Falso Muro", (c2, bar_y + 44), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 230, 120), 1, cv2.LINE_AA)
    cv2.putText(img, "MAGENTA: Muro Mancato | BLU: Linea Guida GT", (c2, bar_y + 64), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (220, 50, 220), 1, cv2.LINE_AA)

    cv2.putText(img, "ASPETTO CELLE E RISOLUZIONE", (c3, bar_y + 22), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 215, 255), 1, cv2.LINE_AA)
    cv2.putText(img, f"Cella: {cellX:.1f}x{cellY:.1f} px ({data['cellAspectDistortionPct']}% distorsione)", (c3, bar_y + 44), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (100, 180, 255), 1, cv2.LINE_AA)
    cv2.putText(img, "Perimetro simulato 12px vs risoluzione cella 30px", (c3, bar_y + 64), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 200), 1, cv2.LINE_AA)

    cv2.imwrite(output_png, img)
    print(f"🎉 Immagine sovrapposizione generata con successo: {output_png}")
    try:
        brain_png = os.path.join(brain_dir, 'overlay_mappa_arena.png')
        cv2.imwrite(brain_png, img)
        print(f"🎉 Copiata anche in artifact: {brain_png}")
    except Exception:
        pass

if __name__ == '__main__':
    generate_overlay()
