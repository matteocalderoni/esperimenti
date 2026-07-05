# Piano Didattico: Emulazione Hardware e Simulazione del Robot

Questo file serve a tracciare i progressi nello sviluppo e nella comprensione dei singoli moduli mock per far funzionare il server del robot Adeept 4WD sul tuo computer.

Spunta le caselle (`[x]`) man mano che completiamo e verifichiamo ciascun passo.

---

## 🗺️ Mappa del Percorso

```mermaid
graph TD
    P1[Passo 1: I2C Base<br>board & busio] --> P2[Passo 2: Attuatori<br>PCA9685 & adafruit_motor]
    P2 --> P3[Passo 3: GPIO Base<br>gpiozero & spidev]
    P3 --> P4[Passo 4: ADC Analogico<br>smbus & ADS7830]
    P4 --> P5[Passo 5: Display<br>luma.oled SSD1306]
    P5 --> P6[Passo 6: Fotocamera<br>picamera2 & OpenCV Webcam]
```

---

## 📋 Lista delle Tappe

### [x] Passo 1: Le basi della comunicazione I2C (`board.py` e `busio.py`)
* **Obiettivo**: Comprendere il protocollo seriale I2C e simulare il bus dati.
* **Componenti**:
  * [x] Comprendere SDA, SCL e indirizzamento I2C.
  * [x] Creare `mock_hardware/board.py` con costanti di pin fittizie.
  * [x] Creare `mock_hardware/busio.py` con la classe di bus `I2C`.
  * [x] Scrivere e avviare lo script di test locale `simulazione/test_passo_1.py`.

### [ ] Passo 2: Controllo dei servomotori e motori DC (`adafruit_pca9685` e `adafruit_motor`)
* **Obiettivo**: Comprendere i segnali PWM (modulazione di larghezza di impulso) per muovere attuatori.
* **Componenti**:
  * [ ] Comprendere il funzionamento del driver I2C a 16 canali PCA9685.
  * [ ] Creare `mock_hardware/adafruit_pca9685.py` (simulazione canali PWM).
  * [ ] Creare la cartella `mock_hardware/adafruit_motor/` con `__init__.py`.
  * [ ] Creare `mock_hardware/adafruit_motor/servo.py` (simulazione angoli).
  * [ ] Creare `mock_hardware/adafruit_motor/motor.py` (simulazione throttle).
  * [ ] Scrivere e avviare lo script di test locale `simulazione/test_passo_2.py`.

### [ ] Passo 3: Input e Output Digitali (`gpiozero.py` e `spidev.py`)
* **Obiettivo**: Leggere stati logici alti/bassi e inviare impulsi di trigger.
* **Componenti**:
  * [ ] Comprendere il funzionamento dei GPIO digitali (infrarossi line tracking, buzzer, ultrasuoni).
  * [ ] Creare `mock_hardware/gpiozero.py` con classi per `LED`, `TonalBuzzer`, `PWMOutputDevice`, `DistanceSensor` e `InputDevice`.
  * [ ] Creare `mock_hardware/spidev.py` per simulare la comunicazione SPI (per i LED WS2812).
  * [ ] Scrivere e avviare lo script di test locale `simulazione/test_passo_3.py`.

### [ ] Passo 4: Sensori analogici e convertitore ADC (`smbus.py`)
* **Obiettivo**: Convertire correnti/tensioni continue in valori digitali utilizzabili (0-255).
* **Componenti**:
  * [ ] Comprendere il chip ADC ADS7830 (partitore di tensione batteria e fotoresistenze).
  * [ ] Creare `mock_hardware/smbus.py` simulando le chiamate I2C per i canali dell'ADC.
  * [ ] Scrivere e avviare lo script di test locale `simulazione/test_passo_4.py`.

### [ ] Passo 5: Scrittura sul display OLED (`luma/`)
* **Obiettivo**: Visualizzare dati utili su uno schermo OLED grafico SSD1306.
* **Componenti**:
  * [ ] Comprendere la libreria `luma.core` e il rendering raster.
  * [ ] Creare i pacchetti mock per `luma.core` e `luma.oled`.
  * [ ] Scrivere e avviare lo script di test locale `simulazione/test_passo_5.py`.

### [ ] Passo 6: Flusso Video e Visione Artificiale (`picamera2.py` e `libcamera.py`)
* **Obiettivo**: Catturare le immagini della telecamera e integrarle con OpenCV.
* **Componenti**:
  * [ ] Creare i mock per `libcamera.py` e `picamera2.py`.
  * [ ] Configurare l'acquisizione video fittizia devitalizzando l'errore o deviandola sulla webcam di sistema.
  * [ ] Avviare per la prima volta `WebServer.py` su Mac, collegarsi con la WebUI o la GUI desktop.
  * [ ] Convalidare la ricezione dei comandi.
