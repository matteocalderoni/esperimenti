# simulazione/test_passo_1.py
import sys
import os

# Determiniamo i percorsi delle cartelle in modo dinamico
current_dir = os.path.dirname(os.path.realpath(__file__))
project_root = os.path.dirname(current_dir)
mock_dir = os.path.join(project_root, "mock_hardware")

# Iniettiamo il percorso di 'mock_hardware' all'inizio dei percorsi di ricerca di Python
sys.path.insert(0, mock_dir)

print("=== TEST PASSO 1: I2C BASE ===")
try:
    # Proviamo a caricare i moduli che sul Mac darebbero errore
    from board import SCL, SDA
    import busio

    print(f"[TEST] Pin importati: SCL = '{SCL}', SDA = '{SDA}'")

    # Proviamo l'inizializzazione standard
    print("\n[TEST] Inizializzazione diretta...")
    i2c_bus = busio.I2C(SCL, SDA)
    i2c_bus.deinit()

    # Proviamo l'inizializzazione tramite context manager (with)
    print("\n[TEST] Inizializzazione tramite Context Manager (with)...")
    with busio.I2C(SCL, SDA, frequency=400000) as i2c_fast:
        print("[TEST] All'interno del blocco 'with'...")

    print("\n[TEST] RISULTATO: PASSO 1 COMPLETATO CON SUCCESSO!")
except Exception as e:
    print(f"\n[TEST ERROR] Fallimento durante il test: {e}")
