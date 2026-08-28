# robot_server/behaviors/light_tracker.py
import time
import Move as move
from behaviors.base import BaseBehavior
from behaviors.obstacle_guard import check_and_handle_obstacles

class LightTrackerBehavior(BaseBehavior):
    def __init__(self, context, adc, light_adc=127, light_threshold=15):
        super().__init__(context)
        self.adc = adc
        self.light_adc = light_adc
        self.light_threshold = light_threshold

    def process(self, last_status):
        # 1. Guardia Ostacoli Unificata con soglie ridotte per inseguimento target
        dist = self.context.distRedress()
        if check_and_handle_obstacles(dist, mode='trackLight', glide_threshold=40, danger_threshold=22, stop_threshold=20):
            time.sleep(0.1)
            return last_status

        adc_value = self.adc.analogRead(1)
        if last_status is None or last_status == 0:
            pass
        elif (adc_value < self.light_adc - self.light_threshold and 
              last_status < self.light_adc - self.light_threshold):
            return last_status
        elif (adc_value > self.light_adc + self.light_threshold and 
              last_status > self.light_adc + self.light_threshold):
            return last_status
        elif (self.light_adc - self.light_threshold < adc_value < self.light_adc + self.light_threshold and 
              self.light_adc - self.light_threshold < last_status < self.light_adc + self.light_threshold):
            return last_status

        print(f"Light Tracking Value: {adc_value}")
        if adc_value < self.light_adc - self.light_threshold:
            move.move(30, 1, "rotate-left")
        elif adc_value > self.light_adc + self.light_threshold:
            move.move(30, 1, "rotate-right")
        else:
            move.move(30, 1, "mid")
        time.sleep(0.2)
        return adc_value
