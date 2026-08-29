# Guida all'Esplorazione Autonoma, Mappatura SLAM e Visione VLM

Questa guida documenta la nuova logica avanzata di **Esplorazione Autonoma dell'Ambiente e Mappatura Spaziale (SLAM)** implementata in parallelo nel motore JavaScript del simulatore e nel server Python del robot (`robot_server`), con supporto alla visione semantica locale tramite **VLM (Vision-Language Model con Ollama)**.

---

## 🧭 1. Architettura della Macchina a Stati (FSM)

L'algoritmo di esplorazione autonoma adotta una **Finite State Machine (FSM)** ciclica che alterna scansioni ad alta risoluzione a veicolo fermo (muovendo solo la testa Pan-Tilt senza rischio di urti o vibrazioni) e spostamenti protetti da anticollisione:

```mermaid
graph TD
    S1[1. HEAD_SCAN (Da fermo)<br>Sweep testa Pan-Tilt -80°..+80°<br>Anticollisione DISATTIVATA] --> S2[2. FIND_FRONTIERS<br>Ricerca baricentri inesplorati & Path A*]
    S2 --> S3[3. NAVIGATE (In movimento)<br>Inseguimento waypoint<br>Anticollisione ATTIVA con obstacle_guard]
    S3 -->|Dopo ogni tratto / arrivo waypoint| S1
    S2 -->|Copertura >= 95% o finite frontiere| S4[🎉 ESPLORAZIONE COMPLETATA + MODAL]
```

### Stati Operativi & Architettura Modulare (`simulazione/web_simulator/js/slam/`):
1. **`slam_grid.js`**: Gestisce la matrice 2D `OccupancyGrid` ($70 \times 52$, risoluzione $10\text{ px/cella}$), le coordinate world $\leftrightarrow$ grid e la scansione a ventaglio `scanHeadFan(panDeg)` dalla testa.
2. **`slam_planner.js`**: Calcola la dilatazione morfologica di sicurezza a $2$ celle attorno a tutti gli ostacoli per proteggere la sagoma del telaio, identifica i baricentri delle frontiere (BFS) ed esegue il pathfinding con $A^*$.
3. **`slam_navigator.js`**: Insegue i waypoint calcolati con controllo di sterzo progressivo. Al completamento del segmento di marcia, arresta la macchina (`speed = 0`, `steering = 0`) e riavvia `HEAD_SCAN`.
4. **`exploration.js`**: Coordina la FSM, esegue lo sweep della testa a veicolo fermo (senza rotazione del telaio), verifica il target al **95%** e attiva il pop-up modale ([modal.css](file:///Users/mauroi/Documents/esperimenti/simulazione/web_simulator/css/modal.css)).

---

## 🛡️ 2. Guardia Ostacoli a Curvatura Continua (`obstacle_guard.js`)

Per eliminare sia lo sfarfallio sia il rimbalzo continuo avanti/indietro:
- **Scelta Lato Libero con Memoria (`leftDist` vs `rightDist`)**: Il robot calcola continuamente il varco con più spazio libero e mantiene la rotta con isteresi per evitare cambi continui di polarità.
- **Curvatura Dinamica in Avanzamento ($d < 65\text{cm}$)**: Davanti agli ostacoli il veicolo mantiene sempre trazione e velocità attiva ($\text{speed} \ge 1.0$) sterzando con precisione, impostando una traiettoria ad arco fluido per aggirare l'ostacolo.
- **Disimpegno di Sicurezza ($< 18\text{cm}$)**: La retromarcia interviene solo in caso di contatto imminente per un breve intervallo (22 frame / 0.35s), tornando istantaneamente alla marcia avanti senza entrare in loop ciclici.
- **Filtro Passa-Basso**: Interpolazione a 60 FPS di velocità e sterzo per movimenti morbidi e realistici.
- **Backup di Sicurezza**: I backup precedenti sono conservati in `magazzino/backups_evitamento/`.

---

## 🕶️ 3. Visualizzatore 3D Three.js e Scena Immersiva (`three_scene.js`)

Per consentire una visione FPV realistica e generare frame visivi sintetici ad alta fedeltà:
- **WebGL Three.js Renderer**: Rendering 3D a 60 FPS proiettato sulla testa Pan-Tilt del robot (Yaw e Pitch sincronizzati).
- **Landmarks 3D Presenti nell'Arena**:
  - `pallina_verde`: Target sferico per OpenCV Color Tracking.
  - `faro_giallo`: Sorgente di luce point-light per Light Tracking.
  - `porta_rossa` & `quadro_blu`: Landmark semantici su parete nord per il riconoscimento VLM.

---

## 👁️ 4. Integrazione Visione VLM con Ollama (`vlm_inspector.py`)

Il modulo `vlm_inspector.py` permette di interfacciare il robot con un modello Vision-Language locale (es. `llava:7b` su `http://localhost:11434`):
- **Ispezione Snapshot**: Il simulatore WebGL o la telecamera invia un frame JPEG base64 al server.
- **Prompt Strutturato JSON**: Il modello restituisce la presenza e direzione dei landmark noti.
- **Fallback Resiliente**: In assenza del server Ollama o in caso di timeout, il server opera in modalità offline senza bloccare i cicli di movimento.

---

## 🧪 5. Test e Validazione

I test automatici per griglia, $A^*$, dilatazione e VLM sono inclusi in `simulazione/test_exploration.py`:
```bash
PYTHONPATH=mock_hardware:robot_server venv/bin/python simulazione/test_exploration.py
```
