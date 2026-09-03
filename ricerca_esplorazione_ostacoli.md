# Studio Comparativo: Esplorazione e Evitamento Ostacoli nei Robot Aspirapolvere SOTA vs Adeept 4WD Smart Car

Questo documento sintetizza la ricerca tecnica condotta sulle architetture dei robot aspirapolvere industriali (iRobot Roomba, Roborock, Dreame, Ecovacs) e sugli stack di robotica professionale (ROS 2 / Nav2), mettendoli a confronto diretto con il sistema attualmente implementato nel progetto **Adeept 4WD Smart Car**.

---

## 1. Introduzione e Analisi del Problema

Nel nostro progetto la macchina riscontra limiti e incertezze durante l'esplorazione e l'evitamento degli ostacoli:
- **Movimento frammentato e "a flipper"**: Il robot si sposta frequentemente da un punto all'altro dell'ambiente senza una traiettoria fluida o una copertura ordinata.
- **Vulnerabilità agli angoli ciechi**: A causa delle limitazioni hardware del sensore fisicamente orientabile, la macchina rischia di urtare ostacoli posizionati sui lati o durante le svoltate.
- **Arresti bruschi e manovre discrete**: La gestione degli ostacoli avviene prevalentemente tramite reazioni "Stop-and-Spin" (arresto, scansione meccanica a sinistra/destra e rotazione).

L'obiettivo di questa ricerca è analizzare **come i robot aspirapolvere di nuova generazione risolvono questi problemi**, identificando i divari tecnici e definendo una roadmap di miglioramento.

---

## 2. Analisi dell'Architettura Attuale (`esperimenti`)

### 2.1 Hardware e Percezione
* **Sensore Primario**: 1x sensore ad ultrasuoni (HC-SR04) montato su un servomotore Pan (asse orizzontale).
* **Meccanismo di Scansione**: 
  * *In marcia*: Sweep continuo ristretto ($\pm 15^\circ$) per rilevare ostacoli frontali (`obstacle_avoider.py`).
  * *Da fermo*: Scansione panoramica a ventaglio ($\pm 45^\circ / \pm 60^\circ / \pm 80^\circ$) associata in alcuni casi a una rotazione del telaio di $180^\circ$.
* **Limitazione Odometrica**: Nessun encoder sulle ruote né sensore IMU (bussola/giroscopio) sul robot reale. La posizione ($x, y, \theta$) nella simulazione è calcolata tramite l'integrazione del passo temporale (`SIM_DT`), mentre sul robot reale si basa sul tempo d'attivazione dei motori DC.

### 2.2 Algoritmi di Evitamento Ostacoli
* **Python Backend (`obstacle_avoider.py`)**:
  * Macchina a Stati Finiti a 3 fasi: `sweeping` $\rightarrow$ `focusing` (aggancio angolo) $\rightarrow$ `scanning` (arresto di emergenza $<30\text{ cm}$ e verifica vicoli ciechi).
  * Risposta reattiva: Se un ostacolo è troppo vicino, il robot si ferma, ruota il servo a $+45^\circ$ e $-45^\circ$, sceglie il lato più libero ed esegue una rotazione discreta sul posto.
* **Simulatore JS (`obstacle_guard.js` + `dwa_planner.js`)**:
  * Pianificatore locale **Dynamic Window Approach (DWA)**: campiona coppie $(v, w)$ nello spazio delle velocità e valuta gli archi di traiettoria rispetto agli ostacoli rilevati.

### 2.3 Algoritmo di Esplorazione
* **Frontier-Based Exploration pura (`frontier_planner.py` / `slam_planner.js`)**:
  1. Mantiene una griglia di occupazione 2D (Occupancy Grid).
  2. Rileva le *Frontiere* (celle libere adiacenti a celle inesplorate `-1`) e le raggruppa in cluster.
  3. Ordina le frontiere basandosi sull'Information Gain (quantità di celle inesplorate) e sulla distanza.
  4. Calcola il percorso con l'algoritmo $A^*$ su una griglia con ostacoli dilatati a 3 celle (dilatazione binaria).
  5. *Modalità Hunter*: Se le frontiere classiche si esauriscono prima di raggiungere il 99% di copertura, forza la navigazione verso micro-celle inesplorate isolate.

---

## 3. Come Funzionano i Robot Aspirapolvere State-of-the-Art (SOTA)

I robot aspirapolvere commerciali moderni si basano su un'architettura integrata che combina **Sensor Fusion**, **Coverage Path Planning (CPP)** e **Costmap Stratificate**.

```
                         ┌─────────────────────────────┐
                         │   Sensori Hardware Fusion   │
                         │ (LiDAR 360°, Bumpers, ToF)  │
                         └──────────────┬──────────────┘
                                        │
                                        ▼
                         ┌─────────────────────────────┐
                         │   SLAM & Odometria (EKF)    │
                         └──────────────┬──────────────┘
                                        │
                                        ▼
                         ┌─────────────────────────────┐
                         │  Layered Costmap (Costmap2D) │
                         │ (Static + Dynamic + Inflation)│
                         └──────────────┬──────────────┘
                                        │
          ┌─────────────────────────────┴─────────────────────────────┐
          ▼                                                           ▼
┌───────────────────────────────────┐               ┌───────────────────────────────────┐
│ Global Planner: Coverage (CPP)    │               │ Local Planner: TEB / DWA Dynamic  │
│ 1. Wall-Following (Perimetro)     │               │ - Traiettorie paraboliche continue│
│ 2. Boustrophedon (Serpentina)     │               │ - Margini sfumati con gradiente   │
└───────────────────────────────────┘               └───────────────────────────────────┘
```

### 3.1 Hardware e Sensor Fusion
1. **LiDAR a Scansione Continua 360° (LDS)**: Ruota a 5-10 Hz fornendo migliaia di punti al secondo senza tempi morti o rotazioni meccaniche di servomotori.
2. **Sensori di Parete Laterali (IR Wall Sensors)**: Posizionati sul lato destro per misurare la distanza dalla parete a frequenza elevatissima ($>50\text{ Hz}$), consentendo al robot di sfiorare i muri a 1-2 cm di distanza costante.
3. **Bumpers Tattili Meccanici**: Rilevano l'impatto fisico istantaneo con ostacoli trasparenti (vetro), neri o sottili (gambe di sedie) che i sensori ottici/ultrasuoni possono fallire.
4. **Sensori 3D ToF / Telecamere AI (Structured Light)**: Identificano piccoli oggetti a terra (cavi, scarpe, ostacoli bassi) classificandoli semanticamente.
5. **Sensor Fusion Odometrica (EKF)**: Combinazione di encoder alle ruote + giroscopio/IMU a 6 assi per prevenire lo slittamento e mantenere la rotta precisa anche senza riferimenti visivi.

### 3.2 Strategia di Copertura dell'Spazio (Coverage Path Planning - CPP)
A differenza del nostro robot che usa la Frontier Exploration per muoversi ovunque, i robot aspirapolvere **separano nettamente l'esplorazione dalla copertura**:

1. **Fase 1: Cleaning del Perimetro (Wall-Following / Edge Cleaning)**
   * Il robot si allinea alla prima parete trovata e la segue lungo tutto il perimetro della stanza fino a chiudere il poligono o incontrare un varco.
   * *Scopo*: Mappare con precisione i confini rigidi dell'ambiente e rimuovere la polvere dai battiscopa.
2. **Fase 2: Serpentina Boustrophedon (Lawnmower / Zig-Zag Pattern)**
   * Una volta delimitato il poligono interno, l'algoritmo suddivide l'area in sotto-regioni convesse (*Boustrophedon Cellular Decomposition*).
   * Genera righe di spazzamento parallele a distanza pari al diametro della spazzola ($D_{\text{robot}}$).
   * Minimizza le rotazioni e garantisce il 100% di copertura senza sovrapposizioni o salti caotici.
3. **Fase 3: Navigazione Inter-Stanza via Frontier Planning**
   * L'algoritmo a frontiere (tipo il nostro $A^*$) viene attivato **soltanto** alla fine di una stanza per guidare il robot verso la porta o il passaggio per la stanza successiva.

### 3.3 Pianificazione Locale e Mappe di Costo (Layered Costmap & TEB)
1. **Costmap2D Stratificata**:
   * *Static Layer*: La mappa rigida generata dallo SLAM.
   * *Obstacle Layer*: Gli ostacoli rilevati in tempo reale (dinamici).
   * *Inflation Layer*: Decadimento di costo esponenziale attorno ad ogni ostacolo. Non è una dilatazione binaria (passabile/non passabile), ma una "valle di costo" che scoraggia il robot dall'avvicinarsi ai muri senza bloccargli il passaggio nei varchi stretti.
2. **Pianificatori Locali Flessibili (TEB - Timed Elastic Band)**:
   * Collegati alla traiettoria Boustrophedon tramite *Via-Points* (punti di ancoraggio).
   * Curvano le traiettorie in tempo reale, permettendo al robot di schivare ostacoli imprevisti mantenendo la velocità e riallineandosi subito alla corsia di pulizia.
3. **FSM di Disincastro (Stuck Recovery Behaviors)**:
   Se il robot si incastra o le ruote slittano, viene avviata una sequenza automatica a livelli:
   * *Livello 1*: Reset della costmap temporanea e rotazione a $360^\circ$ a bassa velocità.
   * *Livello 2*: Manovra di oscillazione dinamica ("Wiggle") e micro-retromarcia di 5 cm.
   * *Livello 3*: Ritorno guidato verso l'ultimo punto libero conosciuto sulla scia del perimetro.

---

## 4. Matrice Comparativa: Adeept 4WD vs Robot Aspirapolvere SOTA

| Caratteristica | Adeept 4WD Smart Car (Stato Attuale) | Robot Aspirapolvere SOTA (iRobot/Roborock) |
| :--- | :--- | :--- |
| **Sensore Principale** | 1x Ultrasuoni con Pan Servo motorizzato | LiDAR 360° continuo (LDS) / Visual 3D ToF |
| **Sensori di Contatto** | Nessuno (Dipende solo dalla distanza ottica/ultrasuoni) | Bumpers tattili meccanici con switch di sicurezza |
| **Frequenza Aggiornamento Vista**| Lenta (~1-2 Hz dovuta ai tempi fisici del servo) | Elevata (5-10 Hz a 360° senza parti in movimento esterno) |
| **Odometria** | Stimata a tempo/simulata (`SIM_DT`) | Sensor Fusion (Encoder Ruote + IMU 6-assi + SLAM ICP) |
| **Strategia di Pulizia/Esplorazione** | **Frontier Exploration pura**: salta tra i confini inesplorati | **CPP Ibrido**: Wall-Following (perimetro) + Boustrophedon (serpentina) |
| **Pianificazione Locale** | DWA / Reazione Discreta "Stop & Spin" | TEB / DWA con via-points e curvatura continua |
| **Modello di Gestione Ostacoli** | Dilatazione ostacoli binaria (3 celle) | Layered Costmap con decadimento esponenziale (Inflation) |
| **Gestione Incastri / Angoli Ciechi** | Rettifica con rotazione $180^\circ$ e backup base | FSM di Recovery a 3 livelli (Reset Costmap, Wiggle, Back-off) |

---

## 5. Proposte di Miglioramento (Roadmap per il Progetto)

Per risolvere i problemi riscontrati nell'esplorazione e nell'evitamento ostacoli senza stravolgere la piattaforma hardware, proponiamo i seguenti interventi software e architetturali.

### 5.1 Miglioramenti Software (Implementabili da Subito nel Codice/Simulatore)

#### 1. Introduzione del Pattern Ibrido: Wall-Following + Boustrophedon (CPP)
* **Pianificatore di Copertura Systematic**:
  * Modificare `room_explorer.py` / `exploration.js` introducendo una FSM a due macro-fasi:
    1. `PERIMETER_MODE`: Segue il muro sul lato destro mantenendo una distanza target dai punti rilevati (tramite i raycast laterali).
    2. `BOUSTROPHEDON_MODE`: Genera righe di scansione ad "S" parallele per coprire l'interno della stanza.
  * Usare la `FRONTIER_MODE` solo quando la stanza corrente è completata e occorre passare a un'altra zona.

#### 2. Costmap con Decadimento Esponenziale (Soft Inflation Layer)
* Sostituire la funzione `get_dilated_grid` in `occupancy_grid.py` / `slam_inflation.js` con un gradiente di costo:
  $$\text{Costo}(d) = \exp(-\gamma \cdot (d - r_{\text{robot}}))$$
* Questo evita che il percorso $A^*$ sia un'alternativa rigida tra "passaggio libero" e "muro", consentendo traiettorie fluide che sfiorano gli ostacoli a velocità ridotta anziché fermarsi a scatti.

#### 3. FSM di Recovery & Disincastro (Stuck Detection Avanzata)
* Arricchire `obstacle_guard.js` e `obstacle_avoider.py` con la rilevazione di stallo prolungato:
  * Se le ruote girano ma il robot non cambia coordinate $x,y$ per più di 1.5 secondi:
    1. Ignora temporaneamente la griglia di ostacoli dinamica vicina.
    2. Esegui una micro-retromarcia dritta di 10 cm.
    3. Esegui una rotazione "Wiggle" (oscillazione $\pm 30^\circ$) per liberare il raggio di curvatura.

#### 4. Sweeping Predittivo del Servo Pan (Look-Ahead Panning)
* Attualmente il servo oscilla monotonamente tra $\pm 15^\circ$. 
* **Miglioramento**: Orientare il servo Pan in anticipo nella direzione di sterzata del robot ($\theta_{\text{sterzo}}$). Se il robot sta curando a destra, il servo guarda verso destra prima che il telaio completi la rotazione, eliminando l'angolo cieco interno alla curva.

---

### 5.2 Miglioramenti Hardware consigliati (Per la Macchina Reale Adeept 4WD)

1. **Bumper Anteriore Tattile**:
   * Aggiungere due microswitch meccanici sul paraurti anteriore (sinistro e destro) connessi ai pin GPIO del Raspberry Pi.
   * Garantisce l'arresto immediato e la manovra di evasione anche se il sensore ad ultrasuoni fallisce la lettura (ad es. per riflessione angolata).
2. **Sensore IR di Parete Dedicato (Side Distance Sensor)**:
   * Posizionare un sensore di distanza IR fisso rivolto a $90^\circ$ sul lato destro del telaio per facilitare l'algoritmo di *Wall Following*.
3. **Encoder sulle Ruote**:
   * Installare dischi encoder ottici sui motori DC per misurare i giri ruota effettivi, consentendo l'integrazione odometrica reale e limitando il drift della posizione.

---

## 6. Conclusione

L'attuale implementazione della nostra macchina è avanzata sul piano della mappatura SLAM e del pathfinding $A^*$, ma risente della scelta dell'algoritmo di esplorazione (Frontier pura anziché Coverage sistematica) e della natura a scatti del sensore ad ultrasuoni a singolo orientamento.

Adottando le strategie dei robot aspirapolvere SOTA (**Wall Following + Boustrophedon**, **Layered Costmap con sfumatura di costo** e **Look-Ahead Panning per il servo**), la nostra **Adeept 4WD Smart Car** potrà raggiungere movimenti fluidi, regolari e privi di collisioni o incastri.
