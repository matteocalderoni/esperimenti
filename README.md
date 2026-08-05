# Analisi del Progetto: Adeept 4WD Smart Car Kit per Raspberry Pi

Questo repository contiene tutto il software, i fogli tecnici (datasheet), le guide didattiche (tutorial) ed un **ambiente completo di simulazione hardware & grafica 2D** per assemblare, configurare, testare e controllare una macchinina robotica a quattro ruote motrici (**Adeept 4WD Smart Car**) basata su **Raspberry Pi**.

Il progetto supporta due varianti hardware a seconda dei tipi di ruote assemblate:
1. **Mecanum Wheels**: Ruote omnidirezionali che consentono movimenti laterali (strafe), diagonali e rotazioni complesse.
2. **Ordinary Wheels**: Ruote classiche con sterzata di tipo differenziale.

---

## 📂 Struttura Principale del Progetto

Il progetto si articola nelle seguenti cartelle principali:

```text
esperimenti/
├── ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/
│   ├── Datasheet/      # Fogli tecnici dei chip e componenti elettronici usati
│   ├── Tutorial/       # Guide dettagliate in formato PDF divise per capitoli
│   └── Code/           # Logica del robot (Server, Client ed Esempi di test)
├── mock_hardware/      # Layer di simulazione driver hardware per PC/Mac senza RPi
├── simulazione/        # Percorso didattico a 6 capitoli, test unitari e Web Simulator 2D
│   ├── guide/          # Tutorial in Markdown (capitoli 01-06 e piano didattico)
│   ├── web_simulator/  # Simulatore grafico 2D modulare (HTML, CSS, JS)
│   │   ├── index.html  # Entry point della Dashboard
│   │   ├── css/        # base.css, layout.css, components.css, telemetry.css
│   │   └── js/         # state.js, kinematics.js, sensors.js, physics.js, render_*, controls.js, main.js
│   │       └── behaviors/ # automatic.js, find_color.js, track_line.js, track_light.js, keep_distance.js
│   └── test_passo_*.py # Script di test automatico per ogni capitolo
├── README.md           # Documentazione generale del progetto
└── modifiche_e_simulazione.md # Registro di tutte le modifiche apportate alla codebase
```

---

## ⚙️ Architettura del Software (lato Server & Simulazione)

La cartella `Server/` (divisa in `Server_OrdinaryWheels` e `Server_MecanumWheels`) gestisce il robot tramite una combinazione di Web Server (Flask) e WebSocket Server, estesa con supporto alla simulazione locale su PC/Mac.

### 1. Avvio e Connettività
* **Hotspot & Server Reale**: Scripts [setup_OrdinaryWheels.py](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/setup_OrdinaryWheels.py) e [wifi_hotspot_manager.sh](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/wifi_hotspot_manager.sh) per Raspberry Pi OS.
* **Server Web ([app.py](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Server/Server_OrdinaryWheels/app.py)) & WebSocket ([WebServer.py](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Server/Server_OrdinaryWheels/WebServer.py))**:
  * Flask serve l'interfaccia Vue.js precompilata, il flusso MJPEG della telecamera (`/video_feed`) ed il **Simulatore Virtuale 2D** (`/simulator`).
  * WebSocket gestisce comandi a bassa latenza su porta `8888` (motori, servomotori, LED, telemetria).
  * **Sistema di Logging con Banner e Tree Indentation**: Ogni comando WebSocket stampa un banner grafico ben visibile (`════`) ed i log dei motori/servomotori rientrati (`   └─ 🚗`), sopprimendo le righe duplicate inutili.

### 2. Layer Mock Hardware (`mock_hardware/`)
Permette di eseguire l'intera codebase su qualsiasi PC/Mac senza librerie Raspberry Pi reali:
* `gpiozero`: Emulazione pin GPIO, LED, cicalino e sensori di tracciamento linea.
* `adafruit_pca9685` & `adafruit_motor`: Emulazione servomotori PWM (180°) e driver motori DC 4WD.
* `smbus` / `spidev`: Emulazione bus I2C/SPI e convertitore ADC ADS7830 per livello batteria e sensori analogici.
* `luma.oled`: Emulazione schermo OLED SSD1306 con output pulito a variazione contenuto.
* `picamera2` & `libcamera`: Emulazione flusso fotocamera OpenCV (frame sintetico o webcam di sistema).

### 3. Simulatore Web 2D Interattivo (`simulazione/web_simulator/`)
Un'interfaccia grafica modulare responsive per il browser raggiungibile su **`http://localhost:5000/simulator`**:
* **Arena Top-Down 2D**: Campo di prova con tracciato a linea nera, ostacoli con collisioni rigide, pallina verde OpenCV e cono ultrasuoni a 3 raggi ($\pm 22^\circ$).
* **Telecamera FPV 3D**: Visuale prospettiva basata sull'inquadratura reale della testa Pan-Tilt.
* **Architettura Modulare JS**: Divisa nei sottomoduli `kinematics.js`, `sensors.js` e nella cartella `behaviors/` (`automatic.js`, `find_color.js`, `track_line.js`, `track_light.js`, `keep_distance.js`).
* **Selettore Engine Automazioni (JS Experimental vs Python Server)**: Switch nella barra di navigazione che permette di alternare in tempo reale tra i nuovi algoritmi JS locali ed il backend Python nativo del server (`Functions.py`).

---

## 🚀 Come Eseguire la Simulazione

Per avviare il server in modalità simulazione su PC/Mac:

```bash
PYTHONPATH=mock_hardware python3 ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Server/Server_OrdinaryWheels/WebServer.py
```

Naviga quindi con il browser su:
* **Interfaccia Robot Reale**: `http://localhost:5000`
* **Simulatore 2D Interattivo**: `http://localhost:5000/simulator`
* **Esecuzione Test Didattici**: `python3 simulazione/test_passo_6.py`

---

## 📝 Registro Modifiche Dettagliato
Per l'elenco dettagliato di tutti i bug del codice originale corretti, le ottimizzazioni ed il registro passo-passo dei capitoli, consulta il file **[modifiche_e_simulazione.md](file:///Users/mauroi/Documents/esperimenti/modifiche_e_simulazione.md)**.
