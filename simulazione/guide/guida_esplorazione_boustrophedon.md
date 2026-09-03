# Guida Tecnica: Implementazione Esplorazione Boustrophedon, Soft Costmap e Quotatura Integrale dell'Arena

Questa guida documenta l'architettura software integrata per potenziare la pulizia, l'esplorazione, l'evitamento degli ostacoli e la **quotatura geometrica integrale di tutti gli elementi dell'Arena** per il robot **Adeept 4WD Smart Car** sia in simulazione 2D (JavaScript) sia nel backend nativo Python (`robot_server/`), senza alcuna modifica all'hardware esistente.

---

## 1. Architettura Software Integrata

### 1.1 Pianificatore Boustrophedon (Lawnmower Pattern)
* **Python**: `robot_server/core/coverage_planner.py`
* **JavaScript**: `simulazione/web_simulator/js/slam/slam_boustrophedon.js`

L'algoritmo scompone la bounding box dell'area esplorata in corsie ad S di larghezza pari a 3 celle (circa 25-30 cm). Genera una sequenza ordinata di punti ad S che viene data in pasto al pianificatore di percorso $A^*$ prima di ricorrere al ranking delle frontiere inesplorate.

---

### 1.2 Soft Inflation & Gradiente di Costo (Layered Costmap)
* **Python**: `robot_server/core/occupancy_grid.py` (metodo `get_costmap()`)
* **JavaScript**: `simulazione/web_simulator/js/slam/slam_inflation.js` (funzione `getSlamCostmap()`)

Sostituisce la dilatazione rigida binaria (muro/passaggio) con un campo di costo continuo attorno ad ogni ostacolo:
$$\text{Cost}(d) = 255 \cdot \exp(-\gamma \cdot d)$$

L'algoritmo $A^*$ e il planner DWA incorporano questa penalità nel costo dei nodi, spingendo il robot a curvare dolcemente lontano dalle pareti ed eliminando gli arresti bruschi a scatti.

---

### 1.3 FSM di Recovery a 3 Livelli e Look-Ahead Servo Panning
* **Python**: `robot_server/behaviors/obstacle_avoider.py` (stato `recovering`)
* **JavaScript**: `simulazione/web_simulator/js/obstacle_guard.js` & `sensors.js`

1. **Look-Ahead Pan Servo**: Durante le virate, l'angolo del servo ultrasuoni Pan viene anticipato in direzione dello sterzo ($\theta_{\text{pan\_eff}} = \theta_{\text{pan}} + K \cdot \omega$), eliminando l'angolo cieco all'interno del raggio di curvatura.
2. **Recovery FSM**: Se viene rilevato uno stallo odometrico/temporale (ostacolo ravvicinato fisso per oltre 45 frame o 5 cicli), il sistema attiva automaticamente la procedura di disincastro: micro-retromarcia dritta di 10 cm seguita da un'oscillazione dello sterzo ("Wiggle").

---

### 1.4 Quotatura Metrica Integrale dell'Arena CAD
* **JavaScript**: `simulazione/web_simulator/js/slam/cad_renderer.js` & `slam_clusters.js`

Estende la misurazione del rilievo ben oltre le sole quote perimetrali rigide:
1. **Misurazione di Tutti gli Ostacoli ed Arredi Interni**: Tutti i blocchi occupati (sia arredi riconosciuti da VLM sia tramezzi/ostacoli generici rilevati dalla griglia) vengono misurati ed etichettati con la propria dimensione metrica $\text{Larghezza} \times \text{Profondità}$ in metri (`0.85m × 0.40m`).
2. **Quote a Catena su Tutti e 4 i Lati dell'Arena**:
   * *Lato Superiore*: Larghezza totale e assi cerchiati ①-②.
   * *Lato Inferiore*: Quota base inferiore dell'arena.
   * *Lato Sinistro*: Altezza totale e assi cerchiati Ⓐ-Ⓑ.
   * *Lato Destro*: Quota altezza lato destro.

---

## 2. Verifica e Test

I test automatici e le simulazioni confermano il rispetto di tutte le regole della Costituzione:
- **Tutti i file sono stati mantenuti al di sotto del limite rigido di 150 righe**.
- Le responsabilità rimangono rigorosamente separate tra moduli di calcolo geometrico (`coverage_planner`), griglia (`occupancy_grid`), FSM comportamenti (`room_explorer`), quotatura CAD (`cad_renderer`, `slam_clusters`) e simulatore JS.
