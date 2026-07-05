# simulazione/test_passo_3.py
import sys
import os

# Determiniamo i percorsi delle cartelle in modo dinamico
current_dir = os.path.dirname(os.path.realpath(__file__))
project_root = os.path.dirname(current_dir)
mock_dir = os.path.join(project_root, "mock_hardware")

# Iniettiamo il percorso di 'mock_hardware' all'inizio dei percorsi di ricerca di Python
sys.path.insert(0, mock_dir)

print("=== TEST PASSO 3: GPIO DIGITALI E SPI (GPIOZERO, SPIDEV) ===")
try:
    # 1. Carichiamo i moduli mock
    from gpiozero import LED, InputDevice, DistanceSensor, TonalBuzzer
    import spidev

    # 2. Test LED (Output Digitale)
    print("\n[TEST 1] Controllo LED...")
    led_test = LED(17) # Supponiamo sia sul pin 17
    led_test.on()
    led_test.off()
    led_test.value = True # Accendi tramite assegnazione di valore

    # 3. Test Buzzer (Allarme Sonoro)
    print("\n[TEST 2] Controllo Buzzer...")
    buzzer = TonalBuzzer(18)
    buzzer.play("A4") # Suona la nota La
    buzzer.stop()

    # 4. Test Inseguimento Linea (Input Digitale)
    print("\n[TEST 3] Lettura Sensori Line Tracking...")
    # I tre sensori IR di linea
    ir_sinistro = InputDevice(22)
    ir_centro = InputDevice(27)
    
    print(f"[TEST] Stato iniziale (Sinistro): {ir_sinistro.value}")
    # Simuliamo il passaggio sopra una linea nera
    ir_sinistro.value = 0 # 0 = nero rilevato
    print(f"[TEST] Stato dopo passaggio linea (Sinistro): {ir_sinistro.value}")

    # 5. Test Ultrasuoni (Distanza HC-SR04)
    print("\n[TEST 4] Lettura Sensore Ultrasuoni...")
    ultrasuoni = DistanceSensor(echo=24, trigger=23)
    print(f"[TEST] Distanza iniziale rilevata: {ultrasuoni.distance*100:.1f} cm")
    
    # Simuliamo l'avvicinamento a una parete
    ultrasuoni.distance = 0.15 # 15 cm
    print(f"[TEST] Distanza dopo avvicinamento: {ultrasuoni.distance*100:.1f} cm")

    # 6. Test Canale SPI (WS2812)
    print("\n[TEST 5] Inizializzazione Bus SPI...")
    spi = spidev.SpiDev(0, 0)
    spi.open(0, 0)
    spi.xfer2([255, 0, 0]) # Invia colore Rosso fittizio
    spi.close()

    print("\n[TEST] RISULTATO: PASSO 3 COMPLETATO CON SUCCESSO!")
except Exception as e:
    print(f"\n[TEST ERROR] Fallimento durante il test: {e}")
