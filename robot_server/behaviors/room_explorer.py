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
    Comportamento di Esplorazione e Mappatura Autonoma 2D (FSM a 4 Stati).
    """
    def __init__(self, context):
        super().__init__(context)
        self.grid = OccupancyGrid()
        self.planner = FrontierPlanner()
        self.vlm = VLMInspector()

        self.fsm_state = 'SCAN_360'  # 'SCAN_360', 'UPDATE_GRID', 'FIND_FRONTIERS', 'NAVIGATE'
        self.current_pose = {'x': 350.0, 'y': 150.0, 'theta': 0.0}
        self.last_radar_scan = []
        self.latest_frame = None
        self.current_path = []
        self.path_index = 0

    def update_telemetry(self, pose, scan, scan_angles, frame=None):
        """Riceve aggiornamenti di telemetria dal simulatore o dai driver fisici."""
        self.current_pose = pose
        self.last_radar_scan = list(zip(scan_angles, scan))
        if frame:
            self.latest_frame = frame

    def process(self, last_status):
        if self.fsm_state == 'SCAN_360':
            move.motorStop()
            print(f"\n📡 [FSM: SCAN_360] Pose: ({self.current_pose['x']:.0f}, {self.current_pose['y']:.0f})")
            
            # Se siamo su hardware reale ed i dati non arrivano dal bridge, scansiona con il servo
            if not self.last_radar_scan and hasattr(self.context, 'scGear'):
                self.last_radar_scan = []
                for ang in [-60, -30, 0, 30, 60]:
                    self.context.scGear.moveAngle(0, ang)
                    time.sleep(0.15)
                    d = self.context.behaviors['automatic'].dist_redress() / 100.0
                    self.last_radar_scan.append((ang, d))
                self.context.scGear.moveAngle(0, 0)

            self.fsm_state = 'UPDATE_GRID'

        elif self.fsm_state == 'UPDATE_GRID':
            # Aggiornamento griglia di occupazione 2D tramite raycasting
            rx, ry = self.current_pose['x'], self.current_pose['y']
            heading = self.current_pose['theta']

            for rel_ang_deg, dist_m in self.last_radar_scan:
                abs_ang_rad = heading + math.radians(rel_ang_deg)
                self.grid.update_ray(rx, ry, dist_m, abs_ang_rad)

            stats = self.grid.get_stats()
            print(f"🗺️ [FSM: GRID UPDATED] Esplorato: {stats['explored_pct']}% (Celle libere: {stats['free_cells']}, Muri: {stats['obstacle_cells']})")

            # Correzione Semantica con VLM Ollama (se presente un frame)
            if self.latest_frame:
                vlm_res = self.vlm.analyze_frame(self.latest_frame)
                if vlm_res.get('landmarks'):
                    print(f"👁️ [VLM SEMANTIC] Riconosciuti landmark: {vlm_res['landmarks']}")

            self.fsm_state = 'FIND_FRONTIERS'

        elif self.fsm_state == 'FIND_FRONTIERS':
            frontiers = self.planner.find_frontiers(self.grid.grid)
            if not frontiers:
                print("🎉 [FSM: COMPLETE] Nessuna nuova frontiera. Esplorazione completata!")
                self.fsm_state = 'SCAN_360'
                time.sleep(1.0)
                return last_status

            gx, gy = self.grid.world_to_grid(self.current_pose['x'], self.current_pose['y'])
            # Seleziona la frontiera più vicina
            frontiers.sort(key=lambda p: math.hypot(p[0] - gx, p[1] - gy))
            target_frontier = frontiers[0]
            print(f"🎯 [FSM: FRONTIER] Obiettivo selezionato: cella {target_frontier}")

            # Calcolo percorso A* con ostacoli dilatati
            dilated = self.grid.get_dilated_grid(radius_cells=2)
            self.current_path = self.planner.plan_path((gx, gy), target_frontier, dilated)
            self.path_index = 0

            if self.current_path and len(self.current_path) > 1:
                self.fsm_state = 'NAVIGATE'
            else:
                self.fsm_state = 'SCAN_360'

        elif self.fsm_state == 'NAVIGATE':
            if self.path_index < len(self.current_path) - 1:
                self.path_index += 1
                next_cell = self.current_path[self.path_index]
                target_wx, target_wy = self.grid.grid_to_world(next_cell[0], next_cell[1])

                # Calcolo direzione passo discreto (10-15 cm)
                dx = target_wx - self.current_pose['x']
                dy = target_wy - self.current_pose['y']
                target_ang = math.atan2(dy, dx)
                diff = target_ang - self.current_pose['theta']
                diff = (diff + math.pi) % (2 * math.pi) - math.pi

                if abs(diff) > 0.4:
                    steer = "rotate-right" if diff > 0 else "rotate-left"
                    move.move(40, 1, steer)
                    time.sleep(0.2)
                else:
                    move.move(50, 1, "mid")
                    time.sleep(0.3)
                move.motorStop()

            # Dopo alcuni passi, esegue una nuova scansione per aggiornare la mappa
            if self.path_index >= min(4, len(self.current_path) - 1):
                self.fsm_state = 'SCAN_360'

        time.sleep(0.05)
        return last_status
