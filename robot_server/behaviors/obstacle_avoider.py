# robot_server/behaviors/obstacle_avoider.py
import time
import Move as move
import Ultra as ultra
from behaviors.base import BaseBehavior

class ObstacleAvoiderBehavior(BaseBehavior):
    def __init__(self, context):
        super().__init__(context)
        self.state = 'sweeping'  # 'sweeping', 'focusing', 'scanning'
        self.pan_angle = 0
        self.pan_sweep_dir = 2.0  # Sweep step size
        self.focus_angle = 0

    def dist_redress(self): 
        # Helper function for noise filtering on ultrasonic readings
        mark = 0
        dist_value = ultra.checkdist()
        while True:
            dist_value = ultra.checkdist()
            if dist_value > 900:
                mark += 1
            elif mark > 5 or dist_value < 900:
                break
            # Suppressed print statement to avoid polluting console log
        return round(dist_value, 2)

    def process(self, last_status):
        if self.state == 'sweeping':
            # 1. Continuous narrow sweep (±15°, 2° per cycle)
            self.pan_angle += self.pan_sweep_dir
            if self.pan_angle >= 15:
                self.pan_angle = 15
                self.pan_sweep_dir = -2.0
            elif self.pan_angle <= -15:
                self.pan_angle = -15
                self.pan_sweep_dir = 2.0
            self.context.scGear.moveAngle(0, self.pan_angle)
            
            dist = self.dist_redress()
            
            if dist < 80:
                self.state = 'focusing'
                self.focus_angle = self.pan_angle
                print(f"[INFO] Ostacolo rilevato a {dist}cm (angolo {self.focus_angle}°). Avvio tracciamento attivo.")
            else:
                move.move(50, 1, "mid")
                time.sleep(0.05)

        elif self.state == 'focusing':
            # 2. Lock ultrasonic sensor on the detected obstacle angle
            self.context.scGear.moveAngle(0, self.focus_angle)
            dist = self.dist_redress()
            
            if dist < 30:
                self.state = 'scanning'
                print(f"[WARNING] Ostacolo critico a {dist}cm! Arresto di emergenza e scansione sinistra/destra.")
            elif dist > 85:
                self.state = 'sweeping'
                print(f"[INFO] Via libera ({dist}cm). Ritorno a scansione continua.")
            else:
                # Glide: slow down and steer away from the locked obstacle angle
                # positive focus_angle means obstacle is on the right -> steer left
                steer_dir = "rotate-left" if self.focus_angle >= 0 else "rotate-right"
                move.move(25, 1, steer_dir)
                time.sleep(0.05)

        elif self.state == 'scanning':
            # 3. Emergency Stop and Look Left/Right Scan
            move.motorStop()
            
            # Look Left (+45 degrees)
            self.context.scGear.moveAngle(0, 45)
            time.sleep(0.3)
            dist_left = self.dist_redress()
            
            # Look Right (-45 degrees)
            self.context.scGear.moveAngle(0, -45)
            time.sleep(0.3)
            dist_right = self.dist_redress()
            
            # Center the head
            self.context.scGear.moveAngle(0, 0)
            time.sleep(0.2)
            
            print(f"[SCAN] Risultati - Sinistra: {dist_left}cm, Destra: {dist_right}cm")
            
            if dist_left < 25 and dist_right < 25:
                # Trapped in a corner: back up
                print("[SCAN] Spazio insufficiente su entrambi i lati. Retromarcia...")
                move.move(40, -1, "mid")
                time.sleep(0.6)
                # Backup turn towards the side with more space
                backup_steer = "rotate-left" if dist_left >= dist_right else "rotate-right"
                move.move(40, -1, backup_steer)
                time.sleep(0.6)
            else:
                # Turn towards the direction with more clearance
                steer_dir = "rotate-left" if dist_left >= dist_right else "rotate-right"
                print(f"[SCAN] Svolta evasiva verso {steer_dir}")
                move.move(45, 1, steer_dir)
                time.sleep(0.5)
            
            # Resume sweeping
            self.state = 'sweeping'
            
        return last_status

