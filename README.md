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
├── robot_server/       # Il cervello del robot (Flask, WebSockets, Driver hardware)
├── desktop_client/     # Il telecomando grafico (UI modularizzata in Tkinter)
├── mock_hardware/      # Emulatore driver hardware per PC/Mac senza Raspberry Pi
├── simulazione/        # Web Simulator 2D, guide e script di test
│   ├── guide/          # Tutorial in Markdown (capitoli 01-06, guide refactoring)
│   └── web_simulator/  # Dashboard 2D del simulatore (HTML, CSS, JS)
├── magazzino/          # Archivio originale (Datasheet chip e Tutorial PDF Adeept)
├── costituzione.md     # Regole ferree di sviluppo (SRP, Max 150 righe)
├── README.md           # Documentazione generale del progetto
└── modifiche_e_simulazione.md # Registro modifiche e bugfix
```

---

## ⚙️ Architettura del Software (lato Server & Simulazione)

La cartella `Server/` (divisa in `Server_OrdinaryWheels` e `Server_MecanumWheels`) gestisce il robot tramite una combinazione di Web Server (Flask) e WebSocket Server, estesa con supporto alla simulazione locale su PC/Mac.

### 1. Avvio e Connettività Unificata
* **Hotspot & Server Reale**: Scripts [setup_OrdinaryWheels.py](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/setup_OrdinaryWheels.py) e [wifi_hotspot_manager.sh](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/wifi_hotspot_manager.sh) per Raspberry Pi OS.
* **Server Web ([app.py](file:///Users/mauroi/Documents/esperimenti/robot_server/app.py)) & Net Server ([WebServer.py](file:///Users/mauroi/Documents/esperimenti/robot_server/WebServer.py))**:
  * Flask serve l'interfaccia Vue.js precompilata, il flusso MJPEG della telecamera (`/video_feed`) ed il **Simulatore Virtuale 2D** (`/simulator`).
  * `WebServer.py` gestisce sia il **WebSocket server (porta `8888`)** per il simulatore web, sia il **TCP Socket server (porta `10223`)** in un thread separato per il telecomando desktop.
  * **Broadcast e Sincronizzazione in tempo reale**: Qualsiasi comando ricevuto via TCP dal telecomando desktop viene automaticamente convertito e inviato in broadcast tramite WebSocket al simulatore web del browser. In questo modo il telecomando può pilotare contemporaneamente sia la macchina reale sia la simulazione nel browser!
  * **Sistema di Logging con Banner e Tree Indentation**: Ogni comando di rete stampa un banner grafico ben visibile (`═`) e i log dei motori/servomotori rientrati (`   └─`), sopprimendo le righe duplicate inutili.

### 2. Layer Mock Hardware (`mock_hardware/`)
Permette di eseguire l'intera codebase su qualsiasi PC/Mac senza librerie Raspberry Pi reali:
* `gpiozero`: Emulazione pin GPIO, LED, cicalino e sensori di tracciamento linea.
* `adafruit_pca9685` & `adafruit_motor`: Emulazione servomotori PWM (180°) e driver motori DC 4WD.
* `smbus` / `spidev`: Emulazione bus I2C/SPI e convertitore ADC ADS7830 per livello batteria e sensori analogici.
* `luma.oled`: Emulazione schermo OLED SSD1306 con output pulito a variazione contenuto.
* `picamera2` & `libcamera`: Emulazione flusso fotocamera OpenCV (frame sintetico o webcam di sistema).

### 3. Simulatore Web 2D Interattivo & Visuale 3D (`simulazione/web_simulator/`)
Un'interfaccia grafica modulare responsive per il browser raggiungibile su **`http://localhost:5000/simulator`**:
* **Arena Top-Down 2D**: Campo di prova con tracciato a linea nera, ostacoli con collisioni rigide, pallina verde OpenCV e sensori di prossimità avanzati.
* **Mappatura SLAM in Tempo Reale**: Canvas dedicato alla piantina ricostruita (`render_map.js`) con Occupancy Grid a celle libere/muri e percorsi di frontiera calcolati con $A^*$.
* **Telecamera FPV 3D WebGL (Three.js)**: Visuale tridimensionale immersiva renderizzata in tempo reale in base all'orientamento del robot e alla testa Pan-Tilt (`three_scene.js`).
* **Architettura Modulare JS**: Divisa nei moduli `kinematics.js`, `sensors.js`, `raycasting_sensor.js`, `obstacle_guard.js` e nei comportamenti autonomi in `behaviors/` (`automatic.js`, `exploration.js`, `find_color.js`, `track_line.js`, `track_light.js`, `keep_distance.js`).
* **Selettore Engine Automazioni (JS Experimental vs Python Server)**: Switch nella barra di navigazione che permette di alternare in tempo reale tra i nuovi algoritmi JS locali ed il backend Python nativo del server (`Functions.py`).

### 4. Modulo di Esplorazione Autonoma e Visione VLM (`robot_server/core/` & `vision/`)
* **Occupancy Grid & Frontier Planner**: Generazione autonoma della mappa 2D e calcolo di traiettorie A* per raggiungere le aree inesplorate (`occupancy_grid.py`, `frontier_planner.py`).
* **Vision-Language Model (VLM Ollama)**: Ispezione visiva dei frame FPV tramite modelli locali LLaVA per il riconoscimento di porte, quadri e landmark semantici (`vlm_inspector.py`).

---

## 🚀 Istruzioni di Avvio Semplificate

Abbiamo creato tre script dedicati per gestire facilmente i diversi flussi di lavoro:

### 1. Avviare la Simulazione Completa (PC/Mac)
Questo script avvia il server locale con l'hardware simulato (Mock) ed il telecomando grafico in contemporanea:
```bash
./start_simulation.py
```
*Naviga quindi su [http://127.0.0.1:5000/simulator](http://127.0.0.1:5000/simulator) nel browser e inserisci `127.0.0.1` nel telecomando per iniziare ad usarlo.*

### 2. Avviare solo il Telecomando Desktop (Client)
Utile per connettersi ad un server già avviato (locale o sulla macchina reale via Wi-Fi):
```bash
./start_client.py
```
*Inserisci l'indirizzo IP del robot (es. `192.168.1.XX`) nel campo **IP Address** e connettiti.*

### 3. Avviare il Server sul Robot Reale (Raspberry Pi)
Questo comando avvia il server utilizzando i veri driver elettronici della macchina. **Deve essere lanciato sul Raspberry Pi reale**:
```bash
./start_real_server.py
```

---

## ⚙️ Istruzioni di Avvio Manuale (Per Debug o Log separati)

Se preferisci controllare manualmente i singoli processi:

### 1. Attivare il Virtual Environment
In ogni nuovo terminale che apri:
```bash
source venv/bin/activate
```

### 2. Avviare il Server Robot (Mock)
```bash
cd robot_server
PYTHONPATH=../mock_hardware python WebServer.py
```

### 4. Accedere al Simulatore 2D nel Browser
Naviga su:
* **Simulatore Web 2D**: [http://127.0.0.1:5000/simulator](http://127.0.0.1:5000/simulator)
* **Pannello Classico**: [http://127.0.0.1:5000](http://127.0.0.1:5000)

### 5. Eseguire i Test Didattici
Dalla radice del progetto (con `venv` attivo):
```bash
PYTHONPATH=mock_hardware python simulazione/test_passo_6.py
```

---

## 📝 Registro Modifiche Dettagliato
Per l'elenco dettagliato di tutti i bug del codice originale corretti, le ottimizzazioni ed il registro passo-passo dei capitoli, consulta il file **[modifiche_e_simulazione.md](file:///Users/mauroi/Documents/esperimenti/modifiche_e_simulazione.md)**.
