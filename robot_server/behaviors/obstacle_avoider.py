# robot_server/behaviors/obstacle_avoider.py
import time
import Move as move
import Ultra as ultra
from behaviors.base import BaseBehavior

class ObstacleAvoiderBehavior(BaseBehavior):
    def __init__(self, context):
        super().__init__(context)
        self.state = 'sweeping'  # 'sweeping', 'focusing', 'scanning', 'recovering'
        self.pan_angle = 0
        self.pan_sweep_dir = 2.0
        self.focus_angle = 0
        self.stuck_counter = 0

    def dist_redress(self): 
        mark = 0
        dist_value = ultra.checkdist()
        while True:
            dist_value = ultra.checkdist()
            if dist_value > 900:
                mark += 1
            elif mark > 5 or dist_value < 900:
                break
        return round(dist_value, 2)

    def process(self, last_status):
        if self.state == 'sweeping':
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
            else:
                self.stuck_counter = 0
                move.move(50, 1, "mid")
                time.sleep(0.05)

        elif self.state == 'focusing':
            steer_dir = "rotate-left" if self.focus_angle >= 0 else "rotate-right"
            look_ahead = 20 if steer_dir == "rotate-left" else -20
            self.context.scGear.moveAngle(0, self.focus_angle + look_ahead)
            dist = self.dist_redress()
            
            if dist < 30:
                self.stuck_counter += 1
                if self.stuck_counter > 5:
                    self.state = 'recovering'
                else:
                    self.state = 'scanning'
            elif dist > 85:
                self.stuck_counter = 0
                self.state = 'sweeping'
            else:
                move.move(25, 1, steer_dir)
                time.sleep(0.05)

        elif self.state == 'recovering':
            print("🚨 [RECOVERY] Avvio procedura di disincastro (Back-off & Wiggle)...")
            move.move(40, -1, "mid")
            time.sleep(0.4)
            move.move(40, 1, "rotate-left")
            time.sleep(0.3)
            move.move(40, 1, "rotate-right")
            time.sleep(0.3)
            move.motorStop()
            self.stuck_counter = 0
            self.state = 'sweeping'

        elif self.state == 'scanning':
            move.motorStop()
            self.context.scGear.moveAngle(0, 45)
            time.sleep(0.25)
            dist_left = self.dist_redress()
            
            self.context.scGear.moveAngle(0, -45)
            time.sleep(0.25)
            dist_right = self.dist_redress()
            
            self.context.scGear.moveAngle(0, 0)
            
            if dist_left < 25 and dist_right < 25:
                move.move(40, -1, "mid")
                time.sleep(0.5)
                backup_steer = "rotate-left" if dist_left >= dist_right else "rotate-right"
                move.move(40, -1, backup_steer)
                time.sleep(0.5)
            else:
                steer_dir = "rotate-left" if dist_left >= dist_right else "rotate-right"
                move.move(45, 1, steer_dir)
                time.sleep(0.4)
            
            self.state = 'sweeping'
            
        return last_status

