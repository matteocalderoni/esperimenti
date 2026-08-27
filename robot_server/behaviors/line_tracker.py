# robot_server/behaviors/line_tracker.py
import time
import Move as move
from behaviors.base import BaseBehavior
from behaviors.obstacle_guard import check_and_handle_obstacles

class LineTrackerBehavior(BaseBehavior):
    def process(self, last_status):
        # 1. Guardia Ostacoli Unificata (Stop & Wait)
        dist = self.context.distRedress()
        if check_and_handle_obstacles(dist, mode='trackLine'):
            time.sleep(0.2)
            return last_status

        status_left = self.context.track_line_left.value
        status_middle = self.context.track_line_middle.value
        status_right = self.context.track_line_right.value
        
        current_status = (status_left << 2) | (status_middle << 1) | status_right
        
        if last_status == current_status:
            return last_status
            
        # 0 means NERO (line detected), 1 means BIANCO (ground)
        if status_middle == 0:
            move.move(30, 1, "mid")
        elif status_left == 0:
            move.move(30, 1, "rotate-left")
        elif status_right == 0:
            move.move(30, 1, "rotate-right")
        else:
            move.move(30, 1, "mid")
            
        print(f"Line sensors: {status_left} {status_middle} {status_right}")
        time.sleep(0.1)
        return current_status
