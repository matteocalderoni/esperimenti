# simulazione/test_passo_4.py
import sys
import os
import time

# Determiniamo i percorsi delle cartelle in modo dinamico
current_dir = os.path.dirname(os.path.realpath(__file__))
project_root = os.path.dirname(current_dir)
mock_dir = os.path.join(project_root, "mock_hardware")

# Iniettiamo il percorso di 'mock_hardware' all'inizio dei percorsi di ricerca di Python
sys.path.insert(0, mock_dir)

print("=== TEST PASSO 4: SENSORI ANALOGICI E ADC (SMBUS & ADS7830) ===")
try:
    # 1. Carichiamo il modulo mock
    import smbus

    # 2. Definiamo le costanti di calcolo per il monitoraggio della batteria
    ADCVref = 4.93
    R15 = 3000
    R17 = 1000
    DivisionRatio = R17 / (R15 + R17)  # 0.25
    WarningThreshold = 6.3

    # Definiamo le costanti per il tracciamento luce
    lightADC = 127
    lightThreshold = 15

    # 3. Avviamo la simulazione del bus SMBus
    print("\n[TEST 1] Inizializzazione Bus SMBus...")
    bus = smbus.SMBus(1)
    address = 0x48  # Indirizzo I2C dell'ADC ADS7830
    cmd_base = 0x84

    # Funzione helper per analogRead (identica a quella usata in Voltage.py e Functions.py)
    def analog_read(chn):
        # Calcolo del byte di comando CMD per selezionare il canale chn dell'ADS7830
        cmd = cmd_base | (((chn << 2 | chn >> 1) & 0x07) << 4)
        return bus.read_byte_data(address, cmd)

    # 4. Test Monitoraggio Batteria (Canale 0)
    print("\n[TEST 2] Test Voltmetro Batteria (Canale 0)...")
    
    # Caso A: Batteria OK
    print("\n-> Caso A: Batteria in carica ottimale (~7.7V)")
    smbus.SMBus.mock_values[address][0] = 100  # Valore ADC 100
    adc_val = analog_read(0)
    voltage_a0 = adc_val / 255.0 * ADCVref
    battery_voltage = voltage_a0 / DivisionRatio
    print(f"[TEST] Valore ADC: {adc_val} | Tensione A0: {voltage_a0:.2f}V | Tensione Batteria: {battery_voltage:.2f}V")
    assert battery_voltage >= WarningThreshold, "Errore: la tensione dovrebbe essere sopra la soglia di guardia"
    print("[TEST] Esito: Batteria OK, nessuna anomalia riscontrata.")

    # Caso B: Batteria Scarica
    print("\n-> Caso B: Batteria scarica (~5.8V)")
    smbus.SMBus.mock_values[address][0] = 75  # Valore ADC 75
    adc_val = analog_read(0)
    voltage_a0 = adc_val / 255.0 * ADCVref
    battery_voltage = voltage_a0 / DivisionRatio
    print(f"[TEST] Valore ADC: {adc_val} | Tensione A0: {voltage_a0:.2f}V | Tensione Batteria: {battery_voltage:.2f}V")
    if battery_voltage < WarningThreshold:
        print(f"[WARNING] Attenzione! La tensione della batteria ({battery_voltage:.2f}V) è scesa sotto la soglia di allarme di {WarningThreshold}V!")
    else:
        raise AssertionError("Errore: la batteria dovrebbe risultare scarica")

    # 5. Test Inseguimento Luce (Canale 1)
    print("\n[TEST 3] Test Tracciamento Luce con Fotoresistenze (Canale 1)...")

    # Caso A: Luce centrata (Valore medio 127)
    print("\n-> Caso A: Sorgente luminosa al centro")
    smbus.SMBus.mock_values[address][1] = 127
    adc_val = analog_read(1)
    print(f"[TEST] Valore ADC Canale 1: {adc_val}")
    if lightADC - lightThreshold <= adc_val <= lightADC + lightThreshold:
        print("[TEST] Decisione Robot: Rimani dritto (MID)")
    else:
        raise AssertionError("Errore nella decisione della traiettoria per luce centrata")

    # Caso B: Luce a Sinistra (Valore < 112)
    print("\n-> Caso B: Sorgente luminosa a sinistra")
    smbus.SMBus.mock_values[address][1] = 95
    adc_val = analog_read(1)
    print(f"[TEST] Valore ADC Canale 1: {adc_val}")
    if adc_val < lightADC - lightThreshold:
        print("[TEST] Decisione Robot: Sterza a Sinistra (ROTATE-LEFT)")
    else:
        raise AssertionError("Errore nella decisione della traiettoria per luce a sinistra")

    # Caso C: Luce a Destra (Valore > 142)
    print("\n-> Caso C: Sorgente luminosa a destra")
    smbus.SMBus.mock_values[address][1] = 155
    adc_val = analog_read(1)
    print(f"[TEST] Valore ADC Canale 1: {adc_val}")
    if adc_val > lightADC + lightThreshold:
        print("[TEST] Decisione Robot: Sterza a Destra (ROTATE-RIGHT)")
    else:
        raise AssertionError("Errore nella decisione della traiettoria per luce a destra")

    # 6. De-inizializzazione
    print("\n[TEST 4] De-inizializzazione...")
    bus.close()

    print("\n[TEST] RISULTATO: PASSO 4 COMPLETATO CON SUCCESSO!")
except Exception as e:
    print(f"\n[TEST ERROR] Fallimento durante il test: {e}")
    sys.exit(1)
