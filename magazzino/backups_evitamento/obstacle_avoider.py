# robot_server/behaviors/obstacle_avoider.py
import time
import Move as move
import Ultra as ultra
from behaviors.base import BaseBehavior
from behaviors.obstacle_guard import check_and_handle_obstacles

class ObstacleAvoiderBehavior(BaseBehavior):
    def __init__(self, context):
        super().__init__(context)
        self.pan_angle = 0
        self.pan_sweep_dir = 1.5  # lenta oscillazione ±20°

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
            print(dist_value)
        return round(dist_value, 2)

    def process(self, last_status):
        # 1. Oscillazione lenta della testa per coprire il muso (±20°, ~1.5°/ciclo)
        self.pan_angle += self.pan_sweep_dir
        if self.pan_angle >= 20:
            self.pan_angle = 20
            self.pan_sweep_dir = -1.5
        elif self.pan_angle <= -20:
            self.pan_angle = -20
            self.pan_sweep_dir = 1.5
        self.context.scGear.moveAngle(0, self.pan_angle)

        dist = self.dist_redress()

        # 2. Guardia Ostacoli Unificata (si gestisce la direzione in base al pan_angle)
        if not check_and_handle_obstacles(dist, mode='automatic'):
            move.move(50, 1, "mid")
            
        time.sleep(0.05)
        return last_status
