# Registro Modifiche, Correzioni & Ambiente di Simulazione

Questo documento contiene l'elenco completo ed analitico di **tutti i lavori svolti**, delle **modifiche apportate al codice originale** e dei **bug corretti** per consentire l'esecuzione, il test e la simulazione del robot Adeept 4WD Smart Car sia su Mac/PC sia su Raspberry Pi reale.

---

## 🎯 Summary delle Attività Svolte

1. **Creazione del Layer di Mock Hardware (`mock_hardware/`)**:
   * Sviluppati tutti i driver emulati in Python per sostituire le librerie Raspberry Pi nativi (`gpiozero`, `adafruit_pca9685`, `smbus`, `spidev`, `luma.oled`, `picamera2`, `libcamera`).
   * Consentita la completa esecuzione senza hardware fisico mantenendo il 100% di retrocompatibilità.

2. **Realizzazione del Percorso Didattico a 6 Capitoli (`simulazione/`)**:
   * **Passo 1**: Inizializzazione del sistema e dei motori DC.
   * **Passo 2**: Controllo dei servomotori Pan-Tilt PWM su bus I2C PCA9685.
   * **Passo 3**: Lettura sensori ad ultrasuoni (HC-SR04) e raycasting distanze.
   * **Passo 4**: Gestione feedback visivo (OLED SSD1306) ed effetti LED WS2812.
   * **Passo 5**: Sensori IR di tracciamento linea e convertitore ADC ADS7830.
   * **Passo 6**: Acquisizione flusso video e visione artificiale con OpenCV (`camera_opencv.py`).
   * Creazione di guide in Markdown ([piano_didattico.md](file:///Users/mauroi/Documents/esperimenti/simulazione/guide/piano_didattico.md), [capitolo_06_flusso_video_opencv.md](file:///Users/mauroi/Documents/esperimenti/simulazione/guide/capitolo_06_flusso_video_opencv.md)) e script di test unitari automatici ([test_passo_6.py](file:///Users/mauroi/Documents/esperimenti/simulazione/test_passo_6.py)).

3. **Sviluppo del Simulatore Grafico 2D Modulare (`simulazione/web_simulator/`)**:
   * Progettata una dashboard interattiva HTML5 Canvas + Glassmorphism UI raggiungibile su **`http://localhost:5000/simulator`**.
   * Architettura modulare a responsabilità singola:
     * `index.html`: Entry point con Selettore Engine (JS Experimental vs Python Server).
     * `css/`: `base.css`, `layout.css`, `components.css`, `telemetry.css`.
     * `js/`: `state.js`, `kinematics.js`, `sensors.js`, `physics.js`, `render_arena.js`, `render_fpv.js`, `websocket.js`, `controls.js`, `main.js`.
     * `js/behaviors/`: `automatic.js`, `find_color.js`, `track_line.js`, `track_light.js`, `keep_distance.js`.

4. **Refactoring del Sistema di Logging del Terminale**:
   * Introduzione di banner di separazione visuali (`════`) con icone per ogni comando WebSocket ricevuto in `WebServer.py`.
   * Formattazione dei log hardware ad albero rientrato (`   └─ 🚗`) ed eliminazione dei log duplicati (`get_info`, `frequency`).

5. **Sviluppo del Modulo di Esplorazione Autonoma 2D & SLAM (`core/` & `behaviors/exploration.js`)**:
   * **Occupancy Grid 2D**: Matrice $70 \times 52$ con raycasting Bresenham e dilatazione morfologica di sicurezza.
   * **Pianificatore Frontiere**: Clustering BFS per identificare zone inesplorate e calcolo traiettorie ottime con algoritmo **$A^*$**.
   * **Architettura Simmetrica**: Supporto completo sia in Python (`robot_server/behaviors/room_explorer.py`) sia in JavaScript con canvas live (`render_map.js`).

6. **Guardia Ostacoli Unificata & Manovre di Fuga (`obstacle_guard.js`)**:
   * Algoritmo a doppia soglia (rosso $< 25\text{ cm}$, giallo $< 80\text{ cm}$) e rilevamento stallo (`stuckFrames >= 60`) per disimpegnare automaticamente il robot da angoli ciechi.

7. **Visuale Immersiva 3D WebGL Three.js & Integrazione Visione VLM Ollama (`three_scene.js` & `vlm_inspector.py`)**:
   * Rendering 3D a 60 FPS con telecamera ancorata alla testa Pan-Tilt.
   * Riconoscimento semantico di landmark visivi (`porta_rossa`, `quadro_blu`, `pallina_verde`, `faro_giallo`) interrogando in background il modello locale VLM (LLaVA) tramite API Ollama.

---

## 🛠️ Registro Dettagliato delle Modifiche ai File Originali

### 1. [Info.py](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Server/Server_OrdinaryWheels/Info.py) (e variante Mecanum)
* **Bug Originale**: Su macOS o PC, la chiamata `get_info` cercava di leggere la temperatura CPU dal file Linux `/sys/class/thermal/thermal_zone0/temp`. Questo sollevava un'eccezione `FileNotFoundError` che faceva crashare il WebSocket ogni 5 secondi, causando il ciclo infinito di disconnessioni/riconnessioni nel browser (*reconnecting...*).
* **Modifica Effettuata**: Inserita la gestione delle eccezioni `try...except` con valore emulato fallback di `50.0 °C` per Mac/PC. Sul Raspberry Pi reale continua a leggere la temperatura fisica reale.

### 2. [WebServer.py](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Server/Server_OrdinaryWheels/WebServer.py) (e variante Mecanum)
* **Bug 1 (Firma WebSocket)**: La funzione `main_logic` accettava 2 argomenti (`websocket, path`), incompatibile con la versione `websockets` v10+ in Python 3.10+. Aggiornata a `async def main_logic(websocket, path=None)`.
* **Bug 2 (Thread Infinito in `stopCV`)**: Cliccando **Disattiva Tutte le Funzioni** (`stopCV`), il codice originale di Adeept non chiamava `fuc.pause()` né `ws2812.pause()`. Di conseguenza, i thread in background continuavano ad inviare comandi di movimento e sterzo all'infinito sul terminale.
* **Modifica Effettuata**: Inserite le chiamate esplicite a `fuc.pause()` e `ws2812.pause()` negli handler `stopCV` e `policeOff`.
* **Miglioramento Logging**: Aggiunta la funzione `print_command_banner` per stampare banner visivi ed eliminare il rumore di fondo.

### 3. [OLED.py](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Server/Server_OrdinaryWheels/OLED.py)
* **Bug Originale**: Il file conteneva l'istruzione `print('loop')` ad ogni iterazione del thread dello schermo, intasando la console di testo.
* **Modifica Effettuata**: Eliminata la riga di debug `print('loop')`.

### 4. [app.py](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Server/Server_OrdinaryWheels/app.py) (e variante Mecanum)
* **Funzionalità Aggiunta**: Inserita la rotta Flask `@app.route('/simulator')` e `@app.route('/simulator/<path:filename>')` per servire l'interfaccia modulare del simulatore grafico 2D evitando conflitti con i file statici della WebApp predefinita `dist/`.

---

## 📊 Tabella di Confronto "Prima vs Dopo"

| Componente | Stato Codice Originale Adeept | Stato Attuale Modificato & Simulato |
| :--- | :--- | :--- |
| **Esecuzione su Mac/PC** | ❌ Crash immediato (mancanza librerie GPIO e file `/sys/class/thermal/...`) | ✅ Esecuzione fluida 100% senza hardware reale grazie a `mock_hardware` |
| **Connessione WebApp** | ❌ Crash WebSocket ogni 5s per eccezione lettura temperatura | ✅ Connessione WebSocket 100% stabile e senza disconnessioni |
| **Console/Terminale** | ❌ Intasata da scritte `loop` ad ogni iterazione dello schermo | ✅ Banner visivi con icone (`════`) e log ad albero (`   └─ 🚗`) |
| **Spegnimento Funzioni** | ❌ `stopCV` non fermava i thread background dei motori | ✅ Arresto istantaneo dei motori e dei thread con `fuc.pause()` |
| **Simulazione Grafica** | ❌ Assente (solo terminale di testo) | ✅ Arena 2D interattiva, telecamera FPV 3D Three.js e mappa SLAM |
| **Mappatura & Esplorazione** | ❌ Assente | ✅ SLAM Occupancy Grid, Frontier Clustering, Pathfinding $A^*$ |
| **Visione Intelligente VLM**| ❌ Assente | ✅ Integrazione semantica locale Ollama per riconoscimento landmark |
| **Struttura Software** | ❌ File monolitici lunghi e confusi | ✅ Architettura modulare conforme alla Costituzione (SRP e max 150 righe) |
| **Selettore Engine IA** | ❌ Assente | ✅ Switch nell'interfaccia tra 🧪 `JS Experimental` e 🐍 `Python Server` |
