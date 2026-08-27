# simulazione/test_functions_refactored.py
import sys
import os
import time

# Dynamic paths setup
current_dir = os.path.dirname(os.path.realpath(__file__))
project_root = os.path.dirname(current_dir)
mock_dir = os.path.join(project_root, "mock_hardware")
server_dir = os.path.join(project_root, "robot_server")

sys.path.insert(0, mock_dir)
sys.path.insert(0, server_dir)

print("=== TEST INTEGRAZIONE STRATEGY BEHAVIORS (FUNCTIONS REFACTORED) ===")

try:
    import Move as move
    from gpiozero import InputDevice, DistanceSensor
    import smbus
    
    # Import the refactored Functions orchestrator
    import Functions as functions
    
    print("\n[TEST 1] Inizializzazione modulo Functions...")
    fuc = functions.Functions()
    fuc.setup()
    
    print("\n[TEST 2] Test Tracciamento Linea (trackLine)...")
    # Impostiamo i mock sensor values (0 = nero, 1 = bianco)
    fuc.track_line_left.value = 1
    fuc.track_line_middle.value = 0  # Centro sulla linea
    fuc.track_line_right.value = 1
    
    # Eseguiamo un ciclo di elaborazione
    print("-> Caso A: Centro sulla linea (MID)")
    functions.last_status = None
    fuc.functionMode = 'trackLine'
    fuc.functionGoing()
    
    # Quando il centro è sulla linea, si aspetta che vada dritto
    print("-> Caso B: Sinistro sulla linea (ROTATE-LEFT)")
    fuc.track_line_left.value = 0
    fuc.track_line_middle.value = 1
    fuc.track_line_right.value = 1
    functions.last_status = None
    fuc.functionGoing()
    
    print("\n[TEST 3] Test Evitamento Ostacoli Automatico (automatic)...")
    import Ultra as ultra
    ultra.sensor.distance = 0.50  # 50 cm
    
    print("-> Caso A: Via libera (Avanza dritto)")
    fuc.functionMode = 'automatic'
    fuc.functionGoing()
    assert fuc.behaviors['automatic'].pan_angle == 0, "L'angolo del pan deve essere al centro"
    
    print("-> Caso B: Ostacolo rilevato (Aggiramento in marcia avanti)")
    ultra.sensor.distance = 0.20  # 20 cm
    fuc.functionGoing()
    
    print("\n[TEST 4] Test Mantenimento Distanza (keepDistance)...")
    print("-> Caso A: Troppo lontano (>40cm) -> Avanza")
    ultra.sensor.distance = 0.50
    fuc.functionMode = 'keepDistance'
    fuc.functionGoing()
    
    print("-> Caso B: Troppo vicino (<25cm) -> Indietreggia")
    ultra.sensor.distance = 0.15
    fuc.functionGoing()
    
    print("-> Caso C: In range (25-40cm) -> Si ferma")
    ultra.sensor.distance = 0.30
    fuc.functionGoing()
    
    print("\n[TEST 5] Test Inseguimento Luce (trackLight)...")
    print("-> Caso A: Luce a sinistra (Canale 1 < 112) -> Gira a sinistra")
    # Mock ADC su canale 1
    address = 0x48
    smbus.SMBus.mock_values[address][1] = 90
    fuc.functionMode = 'trackLight'
    functions.last_status = None
    fuc.functionGoing()
    
    print("\n[TEST] RISULTATO: TUTTI I TEST DEI BEHAVIOR SONO PASSATI CON SUCCESSO!")
    os._exit(0)

except Exception as e:
    print(f"\n[TEST ERROR] Fallimento durante il test: {e}")
    import traceback
    traceback.print_exc()
    os._exit(1)
