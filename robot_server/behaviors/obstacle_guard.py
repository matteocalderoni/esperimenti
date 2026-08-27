# robot_server/behaviors/obstacle_guard.py
import Move as move

def check_and_handle_obstacles(dist, mode='automatic', stop_threshold=30, glide_threshold=80, danger_threshold=25):
    """
    Guardia unificata per la gestione degli ostacoli.
    - trackLine: Stop & Wait a 30cm
    - altre modalità:
        - dist < 25cm:           disimpegno in retromarcia
        - 25cm <= dist < 80cm:   decelerazione e sterzata progressive
    """
    if mode == 'trackLine':
        if dist < stop_threshold:
            move.motorStop()
            print("[WARNING] Ostacolo rilevato sulla linea! Arresto di sicurezza (Stop & Wait)...")
            return True
        return False
        
    if dist < danger_threshold:
        move.move(30, -1, "rotate-right")
        return True
    elif dist < glide_threshold:
        # urgency: 0.0 a 80cm, 1.0 a 25cm -> velocità da 60 a 20
        urgency = (glide_threshold - dist) / (glide_threshold - danger_threshold)
        speed = int(60 - 40 * urgency)  # 60% a 80cm -> 20% a 25cm
        move.move(speed, 1, "rotate-left")
        return True
        
    return False
