#!/usr/bin/env python3
# simulazione/generate_map_overlay.py
# Legge scratch/mapping_results.json e genera un'immagine PNG ad alta risoluzione
# che sovrappone la pianta generata dal robot all'arena originale verita' a terra.

import json
import os
import sys
from PIL import Image, ImageDraw, ImageFont

def generate_overlay():
    scratch_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'scratch'))
    json_path = os.path.join(scratch_dir, 'mapping_results.json')
    artifact_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '.gemini', 'antigravity', 'brain', '15b7298a-cba1-43e6-b0ce-e1a28e61f3a7'))
    
    if not os.path.exists(artifact_dir):
        os.makedirs(artifact_dir, exist_ok=True)
    
    output_png = os.path.join(artifact_dir, 'overlay_mappa_arena.png')

    with open(json_path, 'r') as f:
        data = json.load(f)

    W = data['arenaWidthPx']    # 446
    H = data['arenaHeightPx']   # 438
    gridW = data['gridWidth']   # 70
    gridH = data['gridHeight']  # 52
    cellX = data['cellPxX']     # 6.371
    cellY = data['cellPxY']     # 8.423
    comp_grid = data['comparisonGrid']
    walls_gt = data['wallsGT']
    traj = data['trajectory']

    # Scale factor for crisp high-res rendering
    SCALE = 2
    img_w = W * SCALE
    img_h = H * SCALE

    # Layout: 3 panels side-by-side (Ground Truth, Robot SLAM Grid, Overlay Comparison) + Top Header
    header_h = 100
    panel_w = img_w
    panel_h = img_h
    padding = 20

    total_w = padding + (panel_w + padding) * 3
    total_h = header_h + panel_h + padding + 120  # +120 for bottom metrics bar

    img = Image.new('RGB', (total_w, total_h), (18, 24, 38))
    draw = ImageDraw.Draw(img)

    # Try loading font or default
    try:
        title_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 22)
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 14)
        small_font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 12)
    except Exception:
        title_font = font = small_font = ImageFont.load_default()

    # --- Draw Header ---
    draw.rectangle([0, 0, total_w, header_h], fill=(10, 14, 26))
    draw.text((padding, 15), "Analisi Sovrapposizione Mappa Robot vs Verità a Terra (Arena Originale)", fill=(240, 245, 255), font=title_font)
    subtitle = (f"Arena: {W}×{H} px | Griglia SLAM: {gridW}×{gridH} celle | "
                f"Distorsione Celle (Y/X): {data['cellPxY']:.2f}/{data['cellPxX']:.2f} px ({data['cellAspectDistortionPct']}% non quadrata)")
    draw.text((padding, 48), subtitle, fill=(160, 180, 210), font=font)
    draw.line([0, header_h - 1, total_w, header_h - 1], fill=(40, 60, 90), width=2)

    # Helper function to compute pixel rect for grid cell
    def cell_rect(panel_x_off, gx, gy):
        x0 = panel_x_off + int(gx * cellX * SCALE)
        y0 = header_h + int(gy * cellY * SCALE)
        x1 = panel_x_off + int((gx + 1) * cellX * SCALE)
        y1 = header_h + int((gy + 1) * cellY * SCALE)
        return [x0, y0, x1, y1]

    # Panel X offsets
    p1_x = padding
    p2_x = padding * 2 + panel_w
    p3_x = padding * 3 + panel_w * 2

    # Draw Panel Backgrounds & Titles
    for px, ptitle in [(p1_x, "1. Verità a Terra (Arena Originale)"),
                       (p2_x, "2. Mappa Generata dal Robot (SLAM)"),
                       (p3_x, "3. Sovrapposizione & Errori (Match vs Miss)")]:
        draw.rectangle([px - 2, header_h - 2, px + panel_w + 2, header_h + panel_h + 2], fill=(28, 36, 54), outline=(50, 70, 105), width=2)
        draw.text((px + 10, header_h + 8), ptitle, fill=(220, 230, 250), font=font)

    # Adjust inner start for graphics inside panel
    top_margin = 32

    # --- PANEL 1: Ground Truth ---
    # Background floor
    draw.rectangle([p1_x, header_h + top_margin, p1_x + panel_w, header_h + panel_h], fill=(35, 45, 65))
    # Outer Perimeter Wall (12px)
    bordo_s = 12 * SCALE
    draw.rectangle([p1_x, header_h + top_margin, p1_x + panel_w, header_h + top_margin + bordo_s], fill=(70, 130, 180)) # top
    draw.rectangle([p1_x, header_h + panel_h - bordo_s, p1_x + panel_w, header_h + panel_h], fill=(70, 130, 180)) # bottom
    draw.rectangle([p1_x, header_h + top_margin, p1_x + bordo_s, header_h + panel_h], fill=(70, 130, 180)) # left
    draw.rectangle([p1_x + panel_w - bordo_s, header_h + top_margin, p1_x + panel_w, header_h + panel_h], fill=(70, 130, 180)) # right
    # Internal Walls
    for w in walls_gt:
        wx0 = p1_x + int(w['x'] * SCALE)
        wy0 = header_h + top_margin + int(w['y'] * SCALE)
        wx1 = p1_x + int((w['x'] + w['w']) * SCALE)
        wy1 = header_h + top_margin + int((w['y'] + w['h']) * SCALE)
        draw.rectangle([wx0, wy0, wx1, wy1], fill=(0, 200, 180), outline=(255, 255, 255))

    # --- PANEL 2: Robot SLAM Map ---
    for gy in range(gridH):
        for gx in range(gridW):
            c = comp_grid[gy][gx]
            mapped = c['mappedVal']
            r = [p2_x + int(gx * cellX * SCALE),
                 header_h + top_margin + int(gy * cellY * SCALE),
                 p2_x + int((gx + 1) * cellX * SCALE),
                 header_h + top_margin + int((gy + 1) * cellY * SCALE)]
            if mapped == 1:
                color = (235, 65, 65) # Red wall
            elif mapped == 0:
                color = (210, 215, 225) # Light gray free
            else:
                color = (40, 48, 65) # Dark gray unknown
            draw.rectangle(r, fill=color)

    # --- PANEL 3: Overlay Comparison ---
    # First layer: Robot map cells with comparison status
    for gy in range(gridH):
        for gx in range(gridW):
            c = comp_grid[gy][gx]
            st = c['status']
            r = [p3_x + int(gx * cellX * SCALE),
                 header_h + top_margin + int(gy * cellY * SCALE),
                 p3_x + int((gx + 1) * cellX * SCALE),
                 header_h + top_margin + int((gy + 1) * cellY * SCALE)]
            
            if st == 'MATCH_WALL':
                color = (0, 230, 120)     # Green: Muro rilevato perfettamente
            elif st == 'FALSE_WALL':
                color = (255, 140, 0)     # Orange: Falso muro (rumore/errore)
            elif st == 'MISSED_WALL':
                color = (220, 50, 220)    # Magenta: Muro vero mancat o
            elif st == 'MATCH_FREE':
                color = (225, 230, 240)   # Light gray: Spazio libero vero
            else:
                color = (45, 52, 70)      # Unknown
            draw.rectangle(r, fill=color)

    # Overlay ground truth wireframe outlines on Panel 3
    # Perimeter
    draw.rectangle([p3_x, header_h + top_margin, p3_x + panel_w, header_h + top_margin + bordo_s], outline=(0, 100, 255), width=2)
    draw.rectangle([p3_x, header_h + panel_h - bordo_s, p3_x + panel_w, header_h + panel_h], outline=(0, 100, 255), width=2)
    draw.rectangle([p3_x, header_h + top_margin, p3_x + bordo_s, header_h + panel_h], outline=(0, 100, 255), width=2)
    draw.rectangle([p3_x + panel_w - bordo_s, header_h + top_margin, p3_x + panel_w, header_h + panel_h], outline=(0, 100, 255), width=2)
    for w in walls_gt:
        wx0 = p3_x + int(w['x'] * SCALE)
        wy0 = header_h + top_margin + int(w['y'] * SCALE)
        wx1 = p3_x + int((w['x'] + w['w']) * SCALE)
        wy1 = header_h + top_margin + int((w['y'] + w['h']) * SCALE)
        draw.rectangle([wx0, wy0, wx1, wy1], outline=(0, 100, 255), width=2)

    # Draw Robot Trajectory on Panel 3
    if len(traj) > 1:
        points = [(p3_x + int(t['x'] * SCALE), header_h + top_margin + int(t['y'] * SCALE)) for t in traj]
        draw.line(points, fill=(30, 120, 255), width=2)

    # --- Bottom Metrics Bar & Legend ---
    bar_y = header_h + panel_h + 10
    draw.rectangle([padding, bar_y, total_w - padding, total_h - 15], fill=(10, 14, 26), outline=(40, 60, 95), width=1)

    # Metrics Summary Columns
    col1_x = padding + 20
    col2_x = padding + 360
    col3_x = padding + 700

    draw.text((col1_x, bar_y + 12), "📊 STATISTICHE CORRISPONDENZA PUNTI", fill=(255, 215, 0), font=font)
    draw.text((col1_x, bar_y + 35), f"• Wall Recall (Muri Veri Rilevati): {data['wallRecallPct']}% ({data['correctWallCells']}/{data['trueWallCells']} celle)", fill=(230, 240, 255), font=small_font)
    draw.text((col1_x, bar_y + 55), f"• Wall Precision (Muri Rilevati Corretti): {data['wallPrecisionPct']}%", fill=(230, 240, 255), font=small_font)
    draw.text((col1_x, bar_y + 75), f"• Spatial IoU (Overlap Muri): {data['iouPct']}%", fill=(230, 240, 255), font=small_font)

    draw.text((col2_x, bar_y + 12), "🔍 LEGENDA PANNELLO 3 (SOVRAPPOSIZIONE)", fill=(255, 215, 0), font=font)
    draw.text((col2_x, bar_y + 35), "🟩 VERDE: Muro Rilevato Correttamente (True Match)", fill=(0, 230, 120), font=small_font)
    draw.text((col2_x, bar_y + 55), "🟪 MAGENTA: Muro Mancato (Missed GT Wall)", fill=(220, 50, 220), font=small_font)
    draw.text((col2_x, bar_y + 75), "🟧 ARANCIONE: Falso Muro (Rumore / Errore)", fill=(255, 140, 0), font=small_font)

    draw.text((col3_x, bar_y + 12), "⚠️ CAUSA DISTORSIONE POSIZIONAMENTO VLM", fill=(255, 100, 100), font=font)
    draw.text((col3_x, bar_y + 35), f"• Griglia SLAM: {gridW}×{gridH} celle su Arena {W}×{H} px.", fill=(230, 240, 255), font=small_font)
    draw.text((col3_x, bar_y + 55), f"• Cella X: {cellX:.2f} px | Cella Y: {cellY:.2f} px -> Distorsione {data['cellAspectDistortionPct']}%!", fill=(255, 180, 100), font=small_font)
    draw.text((col3_x, bar_y + 75), "• Conseguenza: I raggi VLM proiettati in diagonale subiscono uno shift asimmetrico!", fill=(230, 240, 255), font=small_font)

    img.save(output_png)
    print(f"🎉 Immagine sovrapposizione generata con successo: {output_png}")

if __name__ == '__main__':
    generate_overlay()
