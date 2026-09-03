# Documentazione Tecnica: Architettura VLM (Ollama Moondream) e Integrazione Robotica

Questo documento descrive nel dettaglio come il robot **Adeept 4WD Smart Car** utilizza attualmente il **Vision-Language Model (VLM)** in locale per la percezione semantica visiva dell'ambiente, insieme alle caratteristiche tecniche complete del modello **Moondream2**.

---

## 1. Caratteristiche Tecniche del Modello VLM (Moondream2)

Il sistema di visione semantica si basa su **Moondream2**, un modello Vision-Language ultra-leggero progettato specificamente per l'esecuzione ad alte prestazioni su dispositivi Edge e computer locali senza dipendenze da cloud esterni.

```
┌─────────────────────────────────────────────────────────────────────────┐
│   IMMAGINE FPV (Base64 JPEG)                                            │
└────────────────────┬────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│   VISION ENCODER (SigLIP / ViT Lightweight)                             │
│   Estrattore di feature visive ad alta risoluzione                     │
└────────────────────┬────────────────────────────────────────────────────┘
                     │  Embeddings Visivi
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│   LLM BACKBONE (Moondream 1.6B Parameters - Quantizzazione Q4_K_M)     │
│   Prompt: "Describe this image in one short sentence."                   │
└────────────────────┬────────────────────────────────────────────────────┘
                     │  Sintesi Testuale in Linguaggio Naturale
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│   KEYWORD GROUNDING & CATALOG MATCHING (VLMInspector)                   │
│   Estrazione entità semantica (Frigo, Piano Cottura, Tavolo, ecc.)      │
└─────────────────────────────────────────────────────────────────────────┘
```

### 📋 Scheda Tecnica del Modello

| Parametro | Specifica Tecnica |
| :--- | :--- |
| **Nome Modello** | **Moondream2** (distribuito via Ollama col tag `moondream`) |
| **Numero di Parametri** | **~1.6 Miliardi (1.6B parameters)** |
| **Encoder Visivo (Vision)** | **SigLIP / ViT (Vision Transformer)** ottimizzato a bassa latenza |
| **Spina Dorsale Linguistica (LLM)** | Derivato da **Phi-1.5 / TinyLlama** (~1.4B parametri di linguaggio) |
| **Quantizzazione** | **GGUF q4_K_M (4-bit quantization)** |
| **Impronta Memoria RAM/VRAM** | **< 1.8 GB di VRAM/RAM** durante l'inferenza |
| **Latenza d'Inferenza** | **0.8 - 1.5 secondi** per frame su CPU/GPU standard |
| **Host/Server locale** | Service daemon **Ollama** su `http://localhost:11434` |
| **Endpoint REST utilizzato** | `POST http://localhost:11434/api/generate` |
| **Input Format** | Frame JPEG codificato in stringa **Base64** |
| **Prompt Standard Inviato** | `"Describe this image in one short sentence."` |

---

## 2. Come la Macchina Utilizza il VLM in Questo Momento

Mentre i sensori ad ultrasuoni e il raycasting SLAM misurano la **geometria pura** dell'ambiente (distanze in centimetri senza sapere cosa siano gli ostacoli), il VLM viene utilizzato per la **comprensione semantica**: la macchina capisce *cosa* sta guardando e assegna una funzione agli oggetti.

```
                     ┌────────────────────────────────────┐
                     │ Scansione Pan-Tilt da Fermo        │
                     │ (-60°, 0°, +60°)                   │
                     └────────────────┬───────────────────┘
                                      │
                                      ▼
                     ┌────────────────────────────────────┐
                     │ Scatto FPV + Base64 Encoding       │
                     └────────────────┬───────────────────┘
                                      │
                                      ▼
                     ┌────────────────────────────────────┐
                     │ REST POST /api/vlm_inspect (Flask) │
                     └────────────────┬───────────────────┘
                                      │
                                      ▼
                     ┌────────────────────────────────────┐
                     │ Inferenza Ollama Moondream (1.6B)  │
                     └────────────────┬───────────────────┘
                                      │
                                      ▼
                     ┌────────────────────────────────────┐
                     │ Keyword Catalog Grounding          │
                     │ (VLMInspector.py)                  │
                     └────────────────┬───────────────────┘
                                      │
                                      ▼
                     ┌────────────────────────────────────┐
                     │ Proiezione 2D & Solidificazione    │
                     │ Griglia SLAM (fillSolidCells)      │
                     └────────────────┬───────────────────┘
                                      │
                                      ▼
                     ┌────────────────────────────────────┐
                     │ Rendering Icona & Blocco CAD       │
                     │ sulla Tavola del Geometra          │
                     └────────────────────────────────────┘
```

### 🔄 Flusso di Esecuzione Passo-Passo

#### 1. Triggering Sincronizzato da Fermo (`exploration.js` & `room_explorer.py`)
Durante la fase di esplorazione, quando il robot esegue la scansione panoramica della testa Pan-Tilt (`HEAD_SCAN`), alle angolazioni salienti ($-60^\circ, 0^\circ, +60^\circ$) arresta i motori delle ruote. Questo evita il mosso da movimento (motion blur) nelle immagini catturate dalla telecamera.

#### 2. Cattura dell'Istantanea FPV Base64 (`exploration_bridge.js`)
La funzione `triggerStationaryVlmInspection()` acquisisce l'istantanea corrente dalla telecamera (frame OpenCV su robot reale, oppure render FPV WebGL 3D su simulatore) e la codifica in formato Base64:
```javascript
var snapshot = getThreeFPSnapshot(); // Ritorna "data:image/jpeg;base64,..."
```

#### 3. Inoltro al Backend Python Flask (`app.py`)
Il frontend JS invia la stringa Base64 tramite richiesta REST all'endpoint Flask:
* **Route**: `POST /api/vlm_inspect`
* **Payload**: `{"image": "data:image/jpeg;base64,..."}`

#### 4. Inferenza Moondream & Catalogo Grounding (`vlm_inspector.py`)
Il modulo Python `VLMInspector` interroga Ollama via HTTP REST API ed esegue il parsing della risposta testuale prodotta da Moondream confrontandola con il catalogo arredi della cucina:

```python
self.catalog = [
    {"id": "frigorifero", "name": "Frigorifero", "icon": "🧊", "keywords": ["refrigerator", "fridge", "water dispenser", "steel finish"]},
    {"id": "piano_cottura", "name": "Piano Cottura & Lavello", "icon": "🍳", "keywords": ["sink", "faucet", "cooktop", "stove", "countertop"]},
    {"id": "tavolo_pranzo", "name": "Tavolo da Pranzo", "icon": "🍽️", "keywords": ["chair", "chairs", "dining", "four legs"]},
    {"id": "penisola_cucina", "name": "Penisola / Bancone", "icon": "🍸", "keywords": ["island", "bar stool", "peninsula", "stool"]},
    {"id": "credenza", "name": "Mobile Credenza", "icon": "🗄️", "keywords": ["cabinet", "plates", "sideboard", "cupboard"]}
]
```

Se Moondream risponde ad esempio *"A kitchen with a stainless steel refrigerator next to a sink"*, la parola chiave `refrigerator` attiva il riconoscimento del **Frigorifero** (confidenza $94\%$).

#### 5. Proiezione Trigonometrica 2D (`findVisibleObstacleCoord`)
Utilizzando la posa attuale del robot ($x, y, \theta$) e l'angolo di puntamento della testa Pan-Tilt ($\theta_{\text{pan}}$), il software calcola la traiettoria del raggio visivo e individua le coordinate esatte $(X_{\text{world}}, Y_{\text{world}})$ dell'ostacolo inquadrato.

#### 6. Solidificazione Geometrica nella Griglia SLAM (`fillSolidFurnitureCells`)
I sensori di distanza vedono solo la parete o superficie anteriore di un mobile, lasciando il suo centro come spazio ignoto.
Non appena il VLM riconosce il mobile (es. Tavolo o Piano Cottura), la funzione `fillSolidFurnitureCells()` riempie l'impronta solida dell'oggetto nella griglia $70 \times 52$, trasformando le celle interne da sconosciute (`-1`) a occupate (`1`). 
In questo modo il pianificatore $A^*$ evita di tracciare percorsi attraverso il centro del mobile.

#### 7. Annotazione sulla Tavola Architettonica CAD (`cad_renderer.js`)
L'arredo riconosciuto dal VLM viene disegnato sulla piantina CAD con:
* La sua **icona emoji dedicata** (🍳, 🧊, 🍽️, 🍸, 🗄️).
* Il **simbolo grafico architettonico CAD** (es. fornelli e lavello con rubinetto, tavolo rettangolare con 4 sedia).
* La **quota metrica effettiva** ($\text{Larghezza} \times \text{Profondità}$ in metri).
* Il conteggio nel **cartiglio del geometra** (*ARREDI VLM: X/5 identificati*).

---

## 3. Moduli Software Involti nel Flusso VLM

1. **`robot_server/vision/vlm_inspector.py`**:
   Client Python nativo per la gestione delle chiamate ad Ollama Moondream e il catalogo delle parole chiave.
2. **`robot_server/app.py`**:
   Endpoint Flask REST `/api/vlm_inspect` che gestisce le richieste provenienti dall'interfaccia utente o dal simulatore.
3. **`simulazione/web_simulator/js/exploration_bridge.js`**:
   Bridge JavaScript che cattura il frame FPV, invia la richiesta al server, calcola la proiezione 2D dell'oggetto e popola la griglia SLAM.
4. **`simulazione/web_simulator/js/behaviors/exploration.js`**:
   Orchestratore della FSM che ferma il robot durante i punti salienti del Pan sweep per consentire lo scatto nitido VLM.
5. **`simulazione/web_simulator/js/slam/cad_renderer.js`**:
   Rendering grafico sulla piantina CAD dell'arredo scoperto con simboleggiamento architettonico.

---

## 4. Vantaggi dell'Architettura Attuale

* **100% Locale e Gratuito**: Nessun costo per API cloud (tipo OpenAI GPT-4V o Google Gemini API) e completa tutela della privacy delle immagini domestiche.
* **Funzionamento Offline**: Il robot può operare in totale assenza di connessione internet grazie all'esecuzione locale su Ollama.
* **Integrazione Fisico-Semantica**: Connette il significato di linguaggio naturale (VLM) con la griglia di occupazione metrica millimetrica (SLAM 2D) ed il pianificatore di percorso $A^*$.
