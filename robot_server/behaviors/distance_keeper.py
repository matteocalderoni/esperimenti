# robot_server/behaviors/distance_keeper.py
import time
import Move as move
from behaviors.base import BaseBehavior

class DistanceKeeperBehavior(BaseBehavior):
    def __init__(self, context, dist_redress_func):
        super().__init__(context)
        self.dist_redress = dist_redress_func

    def process(self, last_status):
        self.context.scGear.moveAngle(0, 0)
        dist = self.dist_redress()
        # thresholds: 40cm and 25cm matching JS keep_distance.js
        if dist > 40:
            move.move(40, 1, "mid")
        elif dist < 25:
            move.move(40, -1, "mid")
        else:
            move.motorStop()
        time.sleep(0.1)
        return last_status
