# robot_server/behaviors/room_explorer.py
import math
import time
import Move as move
from behaviors.base import BaseBehavior
from core.occupancy_grid import OccupancyGrid
from core.frontier_planner import FrontierPlanner
from vision.vlm_inspector import VLMInspector

class RoomExplorerBehavior(BaseBehavior):
    """
    Comportamento di Esplorazione e Mappatura Autonoma 2D (FSM a 5 Stati, Dilatazione 3, Target 99%).
    """
    def __init__(self, context):
        super().__init__(context)
        self.grid = OccupancyGrid()
        self.planner = FrontierPlanner()
        self.vlm = VLMInspector()
        self.fsm_state = 'INITIAL_SCAN'
        self.current_pose = {'x': 350.0, 'y': 150.0, 'theta': 0.0}
        self.last_radar_scan = []
        self.latest_frame = None
        self.current_path = []
        self.path_index = 0

    def update_telemetry(self, pose, scan, scan_angles, frame=None):
        self.current_pose = pose
        self.last_radar_scan = list(zip(scan_angles, scan))
        if frame: self.latest_frame = frame

    def _scan_head(self):
        if not self.last_radar_scan and hasattr(self.context, 'scGear'):
            self.last_radar_scan = []
            for ang in [-60, -30, 0, 30, 60]:
                self.context.scGear.moveAngle(0, ang)
                time.sleep(0.12)
                d = self.context.behaviors['automatic'].dist_redress() / 100.0
                self.last_radar_scan.append((ang, d))
            self.context.scGear.moveAngle(0, 0)

    def _apply_scan_to_grid(self):
        rx, ry = self.current_pose['x'], self.current_pose['y']
        heading = self.current_pose['theta']
        for rel_ang_deg, dist_m in self.last_radar_scan:
            self.grid.update_ray(rx, ry, dist_m, heading + math.radians(rel_ang_deg))

    def process(self, last_status):
        if self.fsm_state in ('INITIAL_SCAN', 'SCAN_360'):
            move.motorStop()
            self._scan_head()
            self._apply_scan_to_grid()
            stats = self.grid.get_stats()
            print(f"🗺️ [FSM: SCAN] Copertura: {stats['explored_pct']}% (Target >= 99%)")
            can_rotate = all(d > 0.22 for _, d in self.last_radar_scan) if self.last_radar_scan else True
            self.fsm_state = 'ROTATE_180' if (self.fsm_state == 'INITIAL_SCAN' and can_rotate) else 'FIND_FRONTIERS'

        elif self.fsm_state == 'ROTATE_180':
            print("🔄 [FSM: ROTATE_180] Rotazione telaio 180° per completare scansione...")
            move.move(40, 1, "rotate-right")
            time.sleep(0.6)
            move.motorStop()
            self.current_pose['theta'] = (self.current_pose['theta'] + math.pi) % (2 * math.pi)
            self.fsm_state = 'SCAN_2'

        elif self.fsm_state == 'SCAN_2':
            self._scan_head()
            self._apply_scan_to_grid()
            if self.latest_frame:
                vlm_res = self.vlm.analyze_frame(self.latest_frame)
                if vlm_res.get('landmarks'): print(f"👁️ [VLM] Landmark: {vlm_res['landmarks']}")
            self.fsm_state = 'FIND_FRONTIERS'

        elif self.fsm_state == 'FIND_FRONTIERS':
            stats = self.grid.get_stats()
            if stats['explored_pct'] >= 99:
                print("🎉 [FSM: COMPLETE] Target 99% raggiunto con successo!")
                self.fsm_state = 'SCAN_360'
                time.sleep(1.0)
                return last_status

            gx, gy = self.grid.world_to_grid(self.current_pose['x'], self.current_pose['y'])
            dilated = self.grid.get_dilated_grid(radius_cells=3) # Buffer 3 celle
            frontiers = self.planner.find_frontiers(self.grid.grid)
            target = None

            if frontiers:
                ranked = self.planner.rank_frontiers(frontiers, self.grid.grid, (gx, gy))
                target = ranked[0]
                bq = self.planner.get_blind_quadrant(self.grid.grid)
                print(f"🎯 [FSM: BLIND AREA] Target: cella {target} (Quadrante cieco: {bq['qx']},{bq['qy']})")
            else:
                target = self.planner.find_hunter_target(self.grid.grid, dilated, (gx, gy))

            if target:
                self.current_path = self.planner.plan_path((gx, gy), target, dilated)
                self.path_index = 0
                self.fsm_state = 'NAVIGATE' if self.current_path and len(self.current_path) > 1 else 'SCAN_360'
            else:
                self.fsm_state = 'SCAN_360'

        elif self.fsm_state == 'NAVIGATE':
            if self.path_index < len(self.current_path) - 1:
                self.path_index += 1
                next_cell = self.current_path[self.path_index]
                target_wx, target_wy = self.grid.grid_to_world(next_cell[0], next_cell[1])
                dx, dy = target_wx - self.current_pose['x'], target_wy - self.current_pose['y']
                diff = (math.atan2(dy, dx) - self.current_pose['theta'] + math.pi) % (2 * math.pi) - math.pi
                if abs(diff) > 0.4:
                    move.move(40, 1, "rotate-right" if diff > 0 else "rotate-left")
                    time.sleep(0.2)
                else:
                    move.move(50, 1, "mid")
                    time.sleep(0.3)
                move.motorStop()
            if self.path_index >= min(4, len(self.current_path) - 1):
                self.fsm_state = 'SCAN_360'

        time.sleep(0.05)
        return last_status
