# Guida al Nuovo Sistema dei Comportamenti (Behaviors) del Robot

Per rispettare la **Costituzione del Progetto** (limite rigido di 150 righe e principio di singola responsabilità SRP) e favorire uno sviluppo simmetrico e intuitivo tra la simulazione (JavaScript) e la macchina reale (Python), il modulo `Functions.py` è stato completamente rifattorizzato in un'architettura modulare basata sul **Strategy Pattern**.

---

## 📂 Struttura della Cartella `behaviors/`

Le singole funzionalità automatiche del robot sono isolate nella cartella `robot_server/behaviors/`:

* **`base.py`**: Definisce la classe astratta `BaseBehavior` che espone l'interfaccia comune per tutte le strategie.
* **`line_tracker.py`**: Logica di inseguimento linea (GPIO digitali).
* **`light_tracker.py`**: Logica di inseguimento della luce (fotoresistenze tramite ADC) con protezione d'emergenza integrata contro ostacoli.
* **`obstacle_avoider.py`**: Algoritmo reattivo a sweep continuo per l'evitamento degli ostacoli (conforme a quello della simulazione).
* **`distance_keeper.py`**: Logica per il mantenimento di una distanza costante (soglie a $40\text{ cm}$ e $25\text{ cm}$).

---

## 🛠️ Come Aggiungere una Nuova Automazione (Simmetria Python / JS)

L'aggiunta di una nuova modalità automatica (es. `police` o `watchdog`) segue un flusso identico sia in Python che in JavaScript:

### Passo 1: Prototipazione nel Simulatore JS
1. Crea un nuovo file in `simulazione/web_simulator/js/behaviors/nuovo_comportamento.js`.
2. Implementa la funzione `runNuovoComportamento()` modificando le variabili di stato fisiche:
   ```javascript
   function runNuovoComportamento() {
       robotState.speed = 1.0;
       robotState.steering = 0.05;
   }
   ```
3. Registra la funzione nel dizionario globale:
   ```javascript
   registerBehavior('nuovoComportamento', runNuovoComportamento);
   ```
4. Aggiungi il tag `<script>` in `index.html`.

### Passo 2: Integrazione in Python (Server del Robot)
1. Crea una classe in `robot_server/behaviors/nuovo_comportamento.py` che eredita da `BaseBehavior`:
   ```python
   from behaviors.base import BaseBehavior
   import Move as move

   class NuovoComportamento(BaseBehavior):
       def process(self, last_status):
           move.move(30, 1, "right")
           return last_status
   ```
2. Registrala nel dizionario `self.behaviors` in `Functions.py`:
   ```python
   from behaviors.nuovo_comportamento import NuovoComportamento
   # ...
   self.behaviors['nuovoComportamento'] = NuovoComportamento(self)
   ```

---

## 🔄 Corrispondenza delle Api Comandi (Trazione e Sterzo)

Per facilitare la traduzione logica tra i due ambienti, usa la seguente corrispondenza:

| Azione Concettuale | JavaScript (Simulatore) | Python (Macchina Reale) |
| :--- | :--- | :--- |
| **Avanza Dritto** | `robotState.speed = V; robotState.steering = 0;` | `move.move(speed, 1, "mid")` |
| **Indietreggia** | `robotState.speed = -V;` | `move.move(speed, -1, "mid")` |
| **Sterza a Sinistra** | `robotState.steering = -A;` | `move.move(speed, 1, "left")` (oppure `"rotate-left"`) |
| **Sterza a Destra** | `robotState.steering = A;` | `move.move(speed, 1, "right")` (oppure `"rotate-right"`) |
| **Freno Motori** | `robotState.speed = 0; robotState.steering = 0;` | `move.motorStop()` |
| **Distanza Ultrasuoni** | `robotState.ultrasonicDist` (in metri) | `self.context.distRedress()` (in centimetri) |
