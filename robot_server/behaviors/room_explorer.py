# robot_server/behaviors/room_explorer.py
import math
import time
import Move as move
from behaviors.base import BaseBehavior
from core.occupancy_grid import OccupancyGrid
from core.frontier_planner import FrontierPlanner
from core.coverage_planner import CoveragePlanner
from vision.vlm_inspector import VLMInspector

class RoomExplorerBehavior(BaseBehavior):
    """
    Comportamento di Esplorazione Autonoma 2D (FSM Ibrida Boustrophedon/Frontier, Target 99%).
    """
    def __init__(self, context):
        super().__init__(context)
        self.grid = OccupancyGrid()
        self.planner = FrontierPlanner()
        self.coverage = CoveragePlanner(step_cells=3)
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
                print("🎉 [FSM: COMPLETE] Target 99% raggiunto con successo! Arresto robot.")
                move.motorStop()
                self.fsm_state = 'COMPLETE'
                self._sound_completion_beep()
                return last_status

            gx, gy = self.grid.world_to_grid(self.current_pose['x'], self.current_pose['y'])
            dilated = self.grid.get_dilated_grid(radius_cells=3) # Buffer 3 celle
            
            # Priorità 1: Corsia ad S Boustrophedon
            b_path_points = self.coverage.generate_boustrophedon_path(self.grid.grid)
            target = None
            if b_path_points:
                for bp in b_path_points[:10]:
                    p = self.planner.plan_path((gx, gy), bp, dilated)
                    if len(p) > 1:
                        target = bp
                        break

            # Priorità 2: Ranking Frontiere classiche
            if not target:
                frontiers = self.planner.find_frontiers(self.grid.grid)
                if frontiers:
                    ranked = self.planner.rank_frontiers(frontiers, self.grid.grid, (gx, gy), self.current_pose.get('theta', 0.0))
                    target = ranked[0]
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
            if self.path_index >= len(self.current_path) - 1:
                self.fsm_state = 'SCAN_360'

        elif self.fsm_state == 'COMPLETE':
            move.motorStop()

        time.sleep(0.05)
        return last_status

    def _sound_completion_beep(self):
        """Emette un segnale acustico di completamento rilievo."""
        try:
            if hasattr(self.context, 'switch'):
                self.context.switch.switch(1, 1)
                time.sleep(0.2)
                self.context.switch.switch(1, 0)
        except Exception:
            pass

    def start_vlm_tour(self, frame_provider_cb=None):
        """
        Fase 2: Tour d'Ispezione Visiva dei cluster e arredi rilevati in Fase 1.
        """
        print("👁️ [VLM TOUR] Avvio tour d'ispezione visiva degli arredi...")
        self.grid.classify_semantic_objects()
        objects = self.grid.semantic_objects

        if not objects:
            print("ℹ️ Nessun oggetto o arredo isolato da ispezionare.")
            return []

        results = []
        for obj in objects:
            print(f"📷 [VLM TOUR] Inquadramento arredo: {obj['label']} a ({obj['world_x']:.1f}, {obj['world_y']:.1f})")
            # Calcolo orientamento verso il centro dell'oggetto
            dx = obj['world_x'] - self.current_pose['x']
            dy = obj['world_y'] - self.current_pose['y']
            target_angle = math.atan2(dy, dx)
            angle_diff_deg = math.degrees(target_angle - self.current_pose['theta'])
            
            # Pivot turn continuo
            move.rotate_angle_deg(angle_diff_deg, speed=40)
            self.current_pose['theta'] = target_angle
            time.sleep(0.5)

            # Acquisizione frame
            frame_b64 = None
            if frame_provider_cb:
                frame_b64 = frame_provider_cb()
            elif self.latest_frame:
                frame_b64 = self.latest_frame

            vlm_res = {"landmarks": [], "status": "no_frame"}
            if frame_b64:
                vlm_res = self.vlm.analyze_frame(frame_b64)
                if vlm_res.get('landmarks'):
                    top_landmark = vlm_res['landmarks'][0]
                    obj['label'] = f"{top_landmark['icon']} {top_landmark['display']}"
                    obj['type'] = top_landmark['type']
                    obj['vlm_description'] = top_landmark['description']
                    print(f"✨ [VLM RICONOSCIUTO] {obj['label']}")

            results.append({
                "object": obj,
                "vlm_result": vlm_res
            })

        print("✅ [VLM TOUR] Tour d'ispezione visiva completato con successo!")
        return results

