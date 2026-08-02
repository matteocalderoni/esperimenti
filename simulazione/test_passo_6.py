# simulazione/test_passo_6.py
import sys
import os
import time

# Determiniamo i percorsi delle cartelle in modo dinamico
current_dir = os.path.dirname(os.path.realpath(__file__))
project_root = os.path.dirname(current_dir)
mock_dir = os.path.join(project_root, "mock_hardware")

# Iniettiamo il percorso di 'mock_hardware' all'inizio dei percorsi di ricerca di Python
sys.path.insert(0, mock_dir)

print("=== TEST PASSO 6: FLUSSO VIDEO E VISIONE ARTIFICIALE (PICAMERA2 & OPENCV) ===")
try:
    # 1. Carichiamo i moduli mock di libcamera e picamera2
    print("\n[TEST 1] Importazione dei moduli mock libcamera e picamera2...")
    import libcamera
    from picamera2 import Picamera2

    # Verifichiamo le classi principali
    transform = libcamera.Transform(hflip=0, vflip=0)
    cs = libcamera.ColorSpace.Sycc()
    print("[TEST 1] libcamera mock verificato con successo.")

    # 2. Test diretto di Picamera2
    print("\n[TEST 2] Test cattura frame da Picamera2 mock...")
    picam2 = Picamera2()
    picam2.start()
    frame_array = picam2.capture_array()
    assert frame_array is not None, "Errore: frame_array è None"
    assert frame_array.shape == (480, 640, 3), f"Errore dimensioni frame: {frame_array.shape}"
    picam2.stop()
    print(f"[TEST 2] Frame catturato correttamente con dimensioni: {frame_array.shape}")

    # 3. Test integrazione con camera_opencv.py del robot
    print("\n[TEST 3] Importazione e test del modulo camera_opencv.py del robot...")
    server_dir = os.path.join(
        project_root,
        "ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215",
        "Code",
        "Adeept_4WD_Smart_Car_for_RPi",
        "Server",
        "Server_OrdinaryWheels"
    )
    sys.path.insert(0, server_dir)

    import camera_opencv
    from camera_opencv import Camera

    print("-> Generazione flusso di frame JPEG tramite Camera.frames()...")
    gen = Camera.frames()
    
    # Preleviamo i primi 3 frame generati dal flusso di streaming
    for i in range(3):
        frame_bytes = next(gen)
        assert isinstance(frame_bytes, bytes), "Errore: il frame ritornato non è di tipo bytes"
        assert len(frame_bytes) > 0, "Errore: il buffer del frame JPEG è vuoto"
        print(f"   [Frame {i+1}] Dimensione JPEG generato: {len(frame_bytes)} bytes")

    # 4. Test modalità di visione artificiale (CVThread)
    print("\n[TEST 4] Test cambio modalità CV (FindColor, LineTracking, WatchDog)...")
    cam = Camera()
    cam.modeSet('findColor')
    assert camera_opencv.Camera.modeSelect == 'findColor', "Errore impostazione modalità findColor"

    cam.modeSet('none')
    assert camera_opencv.Camera.modeSelect == 'none', "Errore impostazione modalità none"
    print("[TEST 4] Cambi di modalità CV gestiti correttamente.")

    print("\n[TEST] RISULTATO: PASSO 6 COMPLETATO CON SUCCESSO!")
    os._exit(0)

except Exception as e:
    print(f"\n[TEST ERROR] Fallimento durante il test: {e}")
    import traceback
    traceback.print_exc()
    os._exit(1)
