# Studio Tecnico e Ricerca: Unificazione Ostacoli (Cluster Merging) ed Espansione Vocabolario VLM

---

## 1. Introduzione ed Analisi delle Criticità

Durante i test di navigazione ed ispezione nell'arena con il **tavolo centrale singolo**, sono stati riscontrati due problemi principali:

1. **Frazionamento dell'Oggetto (Tavolo Diviso in 2 Ostacoli Separati)**:
   - I sensori del robot rilevano il tavolo (150cm × 80cm) da angolazioni diverse. Poiché il centro del tavolo o lo spazio tra le gambe non viene scansionato direttamente (o presenta piccoli varchi di 10-30 cm), l'algoritmo di clustering basato su adiacenza 4-connessa stretto suddivide il tavolo in due ostacoli distinti e frammentati.
2. **Mancato Riconoscimento & Vocabolario VLM Limitato**:
   - Il modello VLM (Moondream/Ollama) genera descrizioni naturali estese (es. *"a large wooden table with chairs"*, *"eating area"*, *"brown table"*, *"tavolino"*). Il dizionario di parole chiave attuali è troppo rigido (`\bkey\b`) e fallisce l'abbinamento se la descrizione contiene sinonimi o forme composte.

---

## 2. Come Risolvono il Cluster Splitting i Framework di Robotica SOTA (ROS 2 / PCL / DBSCAN)

Nei framework industriali come **ROS 2 (Nav2, Perception Stack)** e librerie come **PCL (Point Cloud Library)**, il frazionamento degli oggetti viene superato tramite 3 tecniche principali:

### 2.1 Euclidean Cluster Extraction con Tolleranza Spaziale $\varepsilon$ (DBSCAN)
Invece di aggregare solo le celle direttamente adiacenti (distanza 1 cella = 10 cm), gli algoritmi di clustering tipo **DBSCAN (Density-Based Spatial Clustering of Applications with Noise)** o **Euclidean Cluster Extraction** utilizzano un raggio di ricerca $\varepsilon$ (es. 3-4 celle = 30-40 cm):
- Se due frammenti d'ostacolo sono separati da una distanza $\le \varepsilon$, vengono automaticamente riconosciuti ed uniti nello **stesso cluster logico**.

### 2.2 Merging Post-Clustering via Prossimità Bounding Box (Bounding Box Union)
Dopo la prima fase di clustering, viene eseguita un'analisi topologica dei raggruppamenti:
- Se due Bounding Box $B_1$ e $B_2$ hanno una distanza tra i rispettivi bordi $d(B_1, B_2) \le D_{\text{merge}}$ (es. $\le 40\text{ cm}$), oppure hanno una sovrapposizione parziale o un allineamento spaziale coerente, l'algoritmo esegue l'**Unione dei Bounding Box**:
  $$B_{\text{merged}} = \text{Union}(B_1, B_2) = [\min(x_1, x_2), \max(x_1, x_2), \min(y_1, y_2), \max(y_1, y_2)]$$
- Questo garantisce che un tavolo grande (150cm) veda i suoi frammenti laterali o le gambe fuse in un **unico blocco d'arredo centralizzato**.

### 2.3 Open-Vocabulary Tokenization & Fuzzy Keyword Matching per VLM
Per consentire al VLM di classificare correttamente gli oggetti anche con descrizioni variopinte:
- Si rimuove il vincolo rigido dei confini di parola `\bkey\b`.
- Si normalizza il testo (lowercase, rimozione punteggiatura).
- Si espande il dizionario sinonimi includendo forme inglesi ed italiane (es. `table`, `dining`, `desk`, `eating area`, `wood table`, `tavolo`, `tavolino`, `scrivania`, `piano`).
- Si applica la ricerca per sottostringa (substring matching) su token e n-grammi.

---

## 3. Matrice Comparativa: Metodi di Clustering ed Associazione

| Approccio | Algoritmo Attuale (4-Connesso Stretto) | Soluzione Industriale (SOTA / PCL DBSCAN) | Proposta Implementativa per Adeept 4WD |
| :--- | :--- | :--- | :--- |
| **Criterio Adiacenza** | Solo celle direttamente adiacenti ($d = 10\text{ cm}$) | Tolleranza Euclidea $\varepsilon$ ($d \le 35\text{ cm}$) | **Euclidean DBSCAN** con raggio $\varepsilon = 3.5$ celle |
| **Gestione Varchi** | Un gap di 15 cm spezza l'oggetto in 2 blocchi | Unifica frammenti vicini entro la soglia $\varepsilon$ | **Cluster Proximity Merging** per Bounding Box vicine ($< 40\text{ cm}$) |
| **Matching VLM** | Regex rigida `\bkey\b` con poche parole chiave | Open-Vocabulary Token Matching & Fuzzy String Search | **Vocabolario Espanso IT/EN + Substring Matching** |
| **Rappresentazione** | Frammenti multipli disarticolati | Unico Bounding Box semantico consolidato | **Single Unified Bounding Box** con icona 🍽️ |

---

## 4. Soluzioni Architetturali da Implementare

1. **In `slam_clusters.js` (JavaScript Simulator)**:
   - Sostituire il flood-fill 4-connesso stretto con **Euclidean Cluster Extraction ($\varepsilon = 3.5$ celle)**.
   - Aggiungere la funzione `mergeNearbyClusters(clusters, maxGapPx)` che fonda i Bounding Box separati da meno di 40 cm.
2. **In `occupancy_grid.py` (Python Server Backend)**:
   - Implementare `merge_adjacent_obstacle_clusters()` in Python per unificare i frammenti nelle metriche del server.
3. **In `vlm_inspector.py` (Vision Module)**:
   - Espandere il dizionario `category_map` per `tavolo_pranzo` con tutti i sinonimi italiani/inglesi.
   - Perfezionare la funzione `_match_category(raw_text)` con substring matching su token.

---

## 5. Esito e Validazione Attesa

Con queste modifiche:
- Il robot riconoscerà il tavolo da pranzo come **1 singolo blocco rettangolare unificato** (150cm × 80cm) senza spezzarlo.
- Il modulo VLM mapperà le risposte di Moondream (es. *"wooden table with chairs"*) direttamente alla categoria `🍽️ Tavolo da Pranzo` con confidenza elevata.
