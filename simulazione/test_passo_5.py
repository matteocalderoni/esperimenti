# simulazione/test_passo_5.py
import sys
import os
import time

# Determiniamo i percorsi delle cartelle in modo dinamico
current_dir = os.path.dirname(os.path.realpath(__file__))
project_root = os.path.dirname(current_dir)
mock_dir = os.path.join(project_root, "mock_hardware")

# Iniettiamo il percorso di 'mock_hardware' all'inizio dei percorsi di ricerca di Python
sys.path.insert(0, mock_dir)

print("=== TEST PASSO 5: DISPLAY OLED (LUMA.OLED & SSD1306) ===")
try:
    # 1. Carichiamo i moduli mock di luma
    print("\n[TEST 1] Importazione dei moduli mock di luma...")
    from luma.core.interface.serial import i2c
    from luma.core.render import canvas
    from luma.oled.device import ssd1306, ssd1325, ssd1331, sh1106

    # 2. Inizializzazione dell'interfaccia I2C e del driver OLED SSD1306
    print("\n[TEST 2] Inizializzazione Interfaccia I2C e Display SSD1306 (0x3C)...")
    serial = i2c(port=1, address=0x3C)
    device = ssd1306(serial, rotate=0)

    # 3. Test di rendering diretto tramite canvas
    print("\n[TEST 3] Rendering di prova sul display via canvas...")
    with canvas(device) as draw:
        draw.text((0, 0), "Adeept 4WD Car", fill="white")
        draw.text((0, 10), "IP: 192.168.4.1", fill="white")
        draw.text((0, 20), "Mode: AP HOTSPOT", fill="white")
        draw.text((0, 30), "PT MODE ON", fill="white")
        draw.text((0, 40), "Status: READY", fill="white")
        draw.text((0, 50), "Batt: 7.8V OK", fill="white")

    # Verifichiamo che il display simulato contenga le 6 righe di testo previste
    assert len(device.last_screen) == 6, f"Errore: attese 6 righe, trovate {len(device.last_screen)}"
    assert device.last_screen[0] == "Adeept 4WD Car", "Errore sul valore della riga 0"
    assert device.last_screen[10] == "IP: 192.168.4.1", "Errore sul valore della riga 1"
    print("[TEST] Esito: Rendering grafico completato correttamente!")

    # 4. Test integrazione con la classe OLED_ctrl originale del robot
    print("\n[TEST 4] Test integrazione con la classe del robot OLED_ctrl...")
    server_dir = os.path.join(
        project_root,
        "ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215",
        "Code",
        "Adeept_4WD_Smart_Car_for_RPi",
        "Server",
        "Server_OrdinaryWheels"
    )
    sys.path.insert(0, server_dir)

    import OLED
    oled_controller = OLED.OLED_ctrl()
    
    print("\n-> Aggiornamento informazioni a schermo tramite OLED_ctrl...")
    oled_controller.screen_show(1, "GEWBOT.COM")
    oled_controller.screen_show(2, "IP: 192.168.1.100")
    oled_controller.screen_show(3, "STA MODE")
    
    # Avviamo brevemente il thread e attendiamo l'elaborazione del frame
    oled_controller.start()
    time.sleep(0.5)
    oled_controller.stop()

    print("\n[TEST] RISULTATO: PASSO 5 COMPLETATO CON SUCCESSO!")

except Exception as e:
    print(f"\n[TEST ERROR] Fallimento durante il test: {e}")
    sys.exit(1)
