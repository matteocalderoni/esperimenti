# Piano Operativo: Porting dell'Esplorazione SLAM e Riconoscimento VLM sulla Macchina Reale (Raspberry Pi 4WD)

Questo documento definisce l'architettura, le soluzioni ingegneristiche e la roadmap passo-passo per rendere l'**Esplorazione Metrica SLAM (Fase 1)** e il **Tour di Ispezione Visiva VLM (Fase 2)** — recentemente perfezionati e validati nel simulatore — completamente eseguibili e stabili sulla macchina fisica reale (**Adeept 4WD Smart Car con Raspberry Pi**).

Il piano include la creazione di una **pagina web dedicata nel browser (`/blueprint`)** per visualizzare la piantina in tempo reale con gli oggetti riconosciuti e l'aggiornamento del **telecomando desktop (Tkinter)** con i comandi dedicati.

---

## 🔍 Analisi delle Differenze: Simulatore vs Macchina Reale

| Componente | Simulatore Web (JS/Canvas) | Macchina Fisica Reale (Raspberry Pi) | Soluzione Architetturale Adottata |
| :--- | :--- | :--- | :--- |
| **Cinematica & Odometria** | Posizione $(x, y, \theta)$ esatta calcolata da `SIM_DT` | Motori DC 4WD senza encoder su ponte H PCA9685 | Calibrazione a impulsi temporizzati + compensazione tensione batteria via ADS7830 |
| **Sensore di Prossimità** | Raycast istantaneo a 360° senza ritardi fisici | 1x Sensore HC-SR04 montato su servomotore Pan | Sweep a 5-7 angoli discreti con stabilizzazione servo (120ms) e filtro anti-rimbalzo su 3 campioni |
| **Telecamera & FPV** | Texture fotografiche virtuali caricate su Canvas | Modulo Fotocamera Raspberry Pi (`picamera2` / OpenCV) | Acquisizione frame reale via `camera_opencv.py`, invio JPEG base64 ad Ollama |
| **Modello VLM (Moondream2)** | Chiamata REST locale su Mac (`11434`) | CPU ARM Cortex su Raspberry Pi 4 o Pi 5 | Architettura Dual-Mode: Ollama locale su Pi oppure endpoint LAN verso PC/Mac |
| **Visualizzazione Utente** | Canvas integrato nella schermata simulatore | Operatore remoto su PC/Mac/Tablet via Wi-Fi | **Nuova Pagina Web Dedicata `/blueprint`** con streaming WebSocket in tempo reale |
| **Controllo Remoto** | Pulsanti HTML nella pagina web | App nativa Tkinter + Pagina Web | **Pulsanti dedicati in `desktop_client`** (SLAM Map, VLM Tour, View Blueprint) |

---

## 🎯 Nuovi Componenti Chiave Richiesti

### 1. Pagina Web Dedicata per la Planimetria (`http://<ROBOT_IP>:5000/blueprint`)
Una dashboard autonoma, leggera e pensata per geometri, architetti o periti:
* **Rendering Vettoriale Isometrico ($70 \times 52$)**:
  * Visualizzazione in tempo reale della griglia SLAM costruita dal robot fisico mentre si muove nella stanza.
  * Pareti continue sigillate ermeticamente (`stitch_perimeter_wall_gaps`).
  * Ostacoli e arredi addossati a muro o a centro stanza con quote dimensionali in centimetri.
* **Pannello Ispezione Visiva & Riconoscimento VLM**:
  * Box laterale che mostra lo scatto fotografico reale effettuato dalla fotocamera del robot durante l'ispezione dell'arredo.
  * Etichetta semantica assegnata da Moondream2 (es. `🍽️ Tavolo da Pranzo`, `🧊 Frigorifero`, `🍳 Piano Cottura`, `🛋️ Divano`).
* **Strumenti Operativi**:
  * Switch tema: **White CAD Geometrico** (sfondo bianco, campitura muri 45°) vs **Blueprint Tecnico Neon** (sfondo blu scuro ingegneristico).
  * Pulsante **Esporta PNG HD** per salvare la planimetria quotata a fine lavoro.
  * Controlli rapidi: "Avvia Mappatura (Fase 1)", "Avvia Tour Ispezione VLM (Fase 2)", "Arresto".

### 2. Aggiornamento Telecomando Desktop (`desktop_client/`)
Integrazione nella GUI Tkinter dei pulsanti per la gestione del ciclo di rilievo:
* **`🗺️ SLAM Map`**: Invia il comando TCP/WebSocket per avviare l'esplorazione metrica autonoma (Fase 1) fino al completamento (99%).
* **`👁️ VLM Tour`**: Invia il comando per avviare il tour di ispezione visiva dei mobili scoperti (Fase 2).
* **`🛑 Stop All`**: Arresto immediato d'emergenza di tutti i motori e comportamenti.
* **`📐 View Blueprint`**: Pulsante con icona che apre istantaneamente il browser predefinito di sistema all'indirizzo `http://<IP_ROBOT>:5000/blueprint` usando `webbrowser.open()`.

---

## 🛠️ Piano di Implementazione Dettagliato

### Componente 1: Pagina Web Dedicata `/blueprint` e Backend Flask

#### [NEW] [blueprint.html](file:///Users/mauroi/Documents/esperimenti/robot_server/templates/blueprint.html) (o static HTML in `dist/blueprint/`)
* Canvas responsive per la mappa SLAM $70 \times 52$ con renderer CAD.
* Client WebSocket nativo per ricezione pacchetti `map_data`, `robot_pose` e `vlm_inspection_event`.
* Pannello galleria fotografica per visualizzare gli snapshot reali e le descrizioni Moondream2.

#### [MODIFY] [app.py](file:///Users/mauroi/Documents/esperimenti/robot_server/app.py)
* Aggiungere la rotta `@app.route('/blueprint')` per servire la nuova pagina dedicata della planimetria.

#### [MODIFY] [WebServer.py](file:///Users/mauroi/Documents/esperimenti/robot_server/WebServer.py)
* Serializzazione periodica (1-2 Hz) della mappa SLAM Python verso i client WebSocket connessi:
  * Matrice celle occupate/libere/inesplorate.
  * Coordinate $(x, y, \theta)$ stimate del robot.
  * Lista oggetti semantici classificati con Bounding Box e quote.
* Gestione dei comandi in arrivo: `start_slam`, `start_vlm_tour`, `stop_all`.

---

### Componente 2: Aggiornamento del Telecomando Desktop (`desktop_client/`)

#### [MODIFY] [feature_panel.py](file:///Users/mauroi/Documents/esperimenti/desktop_client/ui/feature_panel.py)
* Aggiungere nella card delle automazioni i pulsanti dedicati:
  * `SLAM Map` $\rightarrow$ invia `exploration` / `stopCV`.
  * `VLM Tour` $\rightarrow$ invia `vlmTour` / `stopCV`.
  * `View Blueprint` $\rightarrow$ apre `http://<settings.target_ip>:5000/blueprint`.
  * `Stop All` $\rightarrow$ invia `stopCV`.

#### [MODIFY] [settings.py](file:///Users/mauroi/Documents/esperimenti/desktop_client/config/settings.py)
* Aggiungere le variabili di stato per la modalità SLAM e VLM Tour.

---

### Componente 3: Odometria e Calibrazione Motori Reali (Senza Encoder)

#### [NEW] [odometry_calibrator.py](file:///Users/mauroi/Documents/esperimenti/robot_server/core/odometry_calibrator.py)
* Script guidato da terminale per calibrare:
  * Marcia rettilinea 1 metro a velocità PWM 40 $\rightarrow$ calcolo costante lineare $K_v$ (cm/s).
  * Rotazione in-place 360° a velocità PWM 40 $\rightarrow$ calcolo costante angolare $K_\omega$ (deg/s).
  * Salvataggio parametri in `calibration_data.json`.
* Integrazione della compensazione voltaggio batteria:
  $$v_{\text{eff}} = v_{\text{cal}} \cdot \left(\frac{V_{\text{attuale}}}{V_{\text{calibrazione}}}\right)$$

#### [MODIFY] [Move.py](file:///Users/mauroi/Documents/esperimenti/robot_server/Move.py)
* Metodi di movimento controllato a tempo calibrato:
  * `move_distance_cm(dist_cm, speed=40)`
  * `rotate_angle_deg(angle_deg, speed=40)`

---

### Componente 4: Backend SLAM & Comportamento Esplorazione Reale

#### [MODIFY] [occupancy_grid.py](file:///Users/mauroi/Documents/esperimenti/robot_server/core/occupancy_grid.py)
* Griglia predefinita $70 \times 52$ isometrica a celle quadrate ($18.75\text{ cm}$/cella).
* Porting delle funzioni testate in simulazione:
  * `stitch_perimeter_wall_gaps()`: Chiusura ermetica delle 4 pareti esterne.
  * `classify_semantic_objects()`: Riconoscimento ostacoli a parete e isolati con parametri `wall_sides` e `min_dist`.
* Metodo `to_dict()` per la trasmissione JSON compatta via WebSocket.

#### [MODIFY] [room_explorer.py](file:///Users/mauroi/Documents/esperimenti/robot_server/behaviors/room_explorer.py)
* **Fase 1 (Mappatura)**:
  * Sweep iniziale Pan-Tilt $\pm 60^\circ$ e rotazione $180^\circ$ calibrata.
  * Esplorazione a frontiere $A^*$ con avanzamento metrico a step e verifica continua ostacoli.
  * **Arresto completo al 99% di copertura**: la macchina si ferma, emette un beep acustico (buzzer) e notifica il completamento. La Fase 2 **non** parte in automatico.
* **Fase 2 (Tour VLM)**:
  * Metodo `start_vlm_tour()`:
    1. Calcola i vantage point per ciascun cluster scoperto.
    2. Guida il robot verso il primo vantage point.
    3. Esegue un pivot turn continuo per centrare l'oggetto.
    4. Scatta la foto reale con la Pi Camera.
    5. Invia la foto a Ollama Moondream2.
    6. Assegna l'etichetta semantica e trasmette l'evento alla pagina `/blueprint`.
    7. Passa al cluster successivo fino al termine del tour.

---

### Componente 5: Visione Reale e Supporto Dual-Mode Ollama

#### [MODIFY] [vlm_inspector.py](file:///Users/mauroi/Documents/esperimenti/robot_server/vision/vlm_inspector.py)
* Parametro di configurazione `ollama_url`:
  * Default: `http://127.0.0.1:11434` (per Pi 5 o Pi 4 con 8GB di RAM).
  * Alternativa via variabile d'ambiente o config: `http://<IP_MAC_PC>:11434` (per demandare l'inferenza al computer dell'utente via Wi-Fi con risposta immediata).
* Prompt conciso open-vocabulary ottimizzato:
  *"What main object, furniture, or architectural feature is in the center foreground of this image? Output only the concise name."*

---

## 🧪 Piano di Collaudo e Verifica

### 1. Collaudo Pagina Web `/blueprint` e Sincronizzazione WebSocket
* Avviare il server (anche in modalità mock su Mac):
  ```bash
  cd robot_server
  PYTHONPATH=../mock_hardware python WebServer.py
  ```
* Aprire `http://127.0.0.1:5000/blueprint` nel browser e verificare:
  * Connessione WebSocket verde e stabile.
  * Rendering fluido della tavola CAD a sfondo bianco e tema neon.
  * Ricezione corretta degli aggiornamenti griglia.

### 2. Collaudo Telecomando Desktop
* Avviare il telecomando:
  ```bash
  ./start_client.py
  ```
* Verificare la presenza dei nuovi tasti `SLAM Map`, `VLM Tour` e `View Blueprint`.
* Verificare che il click su `View Blueprint` apra correttamente la pagina web nel browser.

### 3. Collaudo Motori & Calibrazione sul Pavimento Reale
* Eseguire lo script di calibrazione sul Raspberry Pi:
  ```bash
  python robot_server/core/odometry_calibrator.py
  ```
* Verificare che il robot avanzi esattamente di 1 metro e ruoti esattamente di 90° e 180° sul pavimento di prova.

### 4. Collaudo Rilievo Reale Completo
1. Posizionare il robot al centro della stanza.
2. Cliccare **`SLAM Map`** dal telecomando o dalla pagina web `/blueprint`:
   - Il robot esegue la scansione a 360°, naviga verso le frontiere e costruisce la piantina.
   - Si ferma al completamento della mappatura.
3. Cliccare **`VLM Tour`**:
   - Il robot visita ciascun arredo, scatta la foto e Moondream2 la classifica.
   - La pagina `/blueprint` mostra la foto reale e l'arredo quotato con la sua icona.
