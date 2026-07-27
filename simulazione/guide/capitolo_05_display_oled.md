# Guida al Display OLED: Visualizzare Dati e Stato (luma.oled e SSD1306)

Nelle guide precedenti abbiamo visto come il Raspberry Pi interagisce con attuatori PWM (Capitolo 2), sensori digitali e segnalatori (Capitolo 3), e sensori analogici via ADC (Capitolo 4).

In questo capitolo affronteremo l'interfaccia di visualizzazione visiva a bordo del robot: **come fa il robot a mostrare all'utente informazioni vitali (come l'indirizzo IP locale, lo stato della rete Wi-Fi o la modalità attiva) senza richiedere un monitor PC esterno collegato?**

Spiegheremo il funzionamento del display **OLED SSD1306** e come simularlo tramite l'emulazione della libreria Python **`luma.oled`**.

---

## 📺 1. Cos'è uno Schermo OLED SSD1306?

L'**OLED** (Organic Light-Emitting Diode) da 0.96 pollici installato a bordo della scheda Robot HAT è un piccolo display grafico con risoluzione di **128 x 64 pixel**.

### Caratteristiche Chiave:
* **Emissione Autonoma**: Ogni singolo pixel brilla di luce propria quando acceso. Non necessita di una retroilluminazione (a differenza dei tradizionali schermi LCD), garantendo un consumo energetico ridottissimo e un contrasto elevatissimo.
* **Comunicazione I2C**: Si collega al Raspberry Pi attraverso il bus **I2C** a 2 fili (SDA e SCL) all'indirizzo predefinito **`0x3C`**.
* **Controller SSD1306**: È il microchip integrato sul display che riceve la matrice dei pixel dal Raspberry Pi e la converte nei segnali elettrici necessari ad accendere fisicamente i singoli diodi luminosi sullo schermo.

---

## 🏗️ 2. Architettura della Libreria `luma.oled`

Su Raspberry Pi, il controllo grafico di questo tipo di schermi è gestito dall'ecosistema open-source **`luma.oled`** (basato su `luma.core`).

La libreria è suddivisa in 3 componenti principali:

| Componente | Modulo Python | Ruolo |
| :--- | :--- | :--- |
| **Interfaccia Seriale** | `luma.core.interface.serial.i2c` | Gestisce il trasporto dati su bus I2C (selezionando porta `1` e indirizzo `0x3C`). |
| **Driver del Dispositivo** | `luma.oled.device.ssd1306` | Conosce la geometria dello schermo (128x64px), la rotazione e l'inizializzazione del chip. |
| **Motore di Rendering** | `luma.core.render.canvas` | Fornisce una superficie di disegno raster 2D (utilizzando l'interfaccia PIL/Pillow). |

---

## 🎨 3. Il Rendering Grafico con `canvas`

In Python, la scrittura sullo schermo OLED avviene tramite un Context Manager (`with` block):

```python
from luma.core.interface.serial import i2c
from luma.core.render import canvas
from luma.oled.device import ssd1306

# 1. Creiamo la connessione seriale e il driver per lo schermo
serial = i2c(port=1, address=0x3C)
device = ssd1306(serial, rotate=0)

# 2. Apriamo la superficie di disegno
with canvas(device) as draw:
    draw.text((0, 0),  "Adeept 4WD Robot", fill="white")
    draw.text((0, 10), "IP: 192.168.4.1",   fill="white")
    draw.text((0, 20), "Mode: AP HOTSPOT", fill="white")
```

### Come Funziona il Processo:
1. Quando si entra nel blocco `with canvas(device) as draw:`, viene creato in memoria un buffer grafico vuoto.
2. I comandi come `draw.text((x, y), stringa)` tracciano i caratteri sul buffer posizionandoli alle coordinate di pixel `(x, y)`.
3. Quando si **esce** dal blocco `with`, `canvas` converte l'immagine tracciata in byte e la trasmette via I2C all'indirizzo `0x3C` per aggiornare istantaneamente lo schermo.

---

## 🔄 4. La Gestione del Display a bordo del Robot (`OLED.py`)

Nel codice del server del robot (situato in [OLED.py](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Server/Server_OrdinaryWheels/OLED.py)), la visualizzazione è gestita in background da un thread dedicato chiamato `OLED_ctrl`.

Il display è suddiviso idealmente in **6 righe verticali** (spaziate di 10 pixel l'una dall'altra):
1. **Riga 1 (y=0)**: Nome/Titolo (`Adeept.COM` o nome personalizzato).
2. **Riga 2 (y=10)**: Indirizzo IP di connessione (`IP: 192.168.4.1` o `CONNECTING`).
3. **Riga 3 (y=20)**: Modalità di rete (`AP MODE` o `STA MODE`).
4. **Riga 4 (y=30)**: Stato Servomotori/Pan-Tilt (`PT MODE ON`).
5. **Riga 5 (y=40)**: Stato Funzione Automatica (`FUNCTION OFF`, `AUTO`, `TRACKING`).
6. **Riga 6 (y=50)**: Messaggi generici di sistema.

Quando un altro modulo (ad esempio lo script di avvio Wi-Fi) individua l'IP del robot, chiama `screen_show(position, text)`. Il thread risveglia la scrittura e aggiorna immediatamente la schermata del robot.

---

## 💻 5. Come funziona il Mock Software e il Test (`test_passo_5.py`)

Nel nostro ambiente di emulazione su PC/Mac:
1. Abbiamo creato la struttura dei moduli mock in `mock_hardware/luma/`:
   * [serial.py](../../mock_hardware/luma/core/interface/serial.py): simula l'interfaccia I2C.
   * [device.py](../../mock_hardware/luma/oled/device.py): simula il driver `ssd1306` memorizzando la risoluzione e lo stato dello schermo.
   * [render.py](../../mock_hardware/luma/core/render.py): simula il contesto `canvas` e l'oggetto `MockDraw` per catturare le righe di testo in un dizionario `last_screen`.

2. Tramite lo script di test [test_passo_5.py](../test_passo_5.py), verifichiamo che:
   * La connessione e il rendering via `canvas` producano le 6 righe corrette.
   * Il thread originale [OLED.py](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Server/Server_OrdinaryWheels/OLED.py) del robot possa essere avviato e controllato senza errori anche sul nostro sistema.
