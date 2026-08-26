# Guida Completa all'Uso del Telecomando (desktop_client)

Questa guida spiega come utilizzare il telecomando grafico Tkinter per pilotare la macchinina **Adeept 4WD** (sia virtuale sia reale) e sfruttare tutte le automazioni e calibrazioni disponibili.

---

## 🔌 1. Connessione (IP Address)
Il telecomando si trova nella parte alta del pannello ed è universale:
* **Per controllare il simulatore locale**: Inserisci l'indirizzo `127.0.0.1` nel campo **IP Address** e premi **Connect** (o premi *Invio* sulla tastiera).
* **Per controllare la macchina reale**: Inserisci l'indirizzo IP del Raspberry Pi collegato alla tua rete Wi-Fi (es. `192.168.1.15`) e premi **Connect**.

---

## 🚗 2. Comandi di Guida e Movimento (Traction & Steering)
Puoi guidare la macchinina cliccando con il mouse sui pulsanti a schermo, oppure comodamente tramite le scorciatoie da tastiera (mentre la finestra del telecomando è attiva):

| Movimento | Pulsante GUI | Tasto Tastiera | Descrizione |
| :--- | :--- | :---: | :--- |
| **Avanti** | `Forward` | **`W`** | La macchina avanza finché tieni premuto il tasto |
| **Indietro** | `Backward` | **`S`** | La macchina indietreggia |
| **Gira a Sinistra** | `Left` | **`A`** | Sterza a sinistra durante la marcia |
| **Gira a Destra** | `Right` | **`D`** | Sterza a destra durante la marcia |
| **Rotazione Sinistra** | `SpinLeft` | **`1`** | Ruota sul posto in senso antiorario |
| **Rotazione Destra** | `SpinRight` | **`3`** | Ruota sul posto in senso orario |
| **Regola Velocità** | Slider `Speed` | *-* | Modifica la potenza dei motori (0-100%) |

---

## 📷 3. Controllo Telecamera e Testa (Pan-Tilt)
La testa del robot supporta due servomotori per orientare la telecamera e il sensore ad ultrasuoni:

| Movimento Servo | Pulsante GUI | Tasto Tastiera | Descrizione |
| :--- | :--- | :---: | :--- |
| **Ruota in Alto** | `Up` | **`I`** | Alza l'inclinazione verticale (Pitch) |
| **Ruota in Basso** | `Down` | **`K`** | Abbassa l'inclinazione verticale |
| **Ruota a Sinistra** | `Left` | **`J`** | Ruota a sinistra (Yaw) |
| **Ruota a Destra** | `Right` | **`L`** | Ruota a destra (Yaw) |
| **Centra Testa** | `Home (H)` | **`H`** | Riposiziona immediatamente i servo al centro (90°) |
| **PT / ARM** | `PT` / `ARM` | *-* | Funzionalità ausiliarie per braccio robotico o modalità testa |

---

## 🧠 4. Automazioni e Intelligenza Artificiale (AI)
Puoi avviare le modalità automatiche cliccando sui rispettivi pulsanti. Cliccando nuovamente sullo stesso pulsante, la modalità verrà arrestata (stato spento):

* **`RadarScan`**: Il sensore ultrasuoni sulla testa ruota a destra e sinistra scansionando l'ambiente circostante e disegnando i punti rilevati sulla griglia radar.
* **`FindColor`**: La macchina insegue un oggetto colorato (configurato tramite il Color Picker).
* **`MotionGet`**: Modalità sorveglianza: rileva il movimento davanti alla fotocamera.
* **`Police`**: Attiva un gioco di luci con LED RGB (effetto sirena polizia).
* **`Automatic`**: Guida completamente autonoma (evita ostacoli automatico usando il sensore ad ultrasuoni).
* **`TrackLine`**: Insegue autonomamente una linea nera sul pavimento.
* **`TrackLight`**: Insegue le fonti di luce usando le fotoresistenze a bordo del robot.
* **`KeepDistance`**: Il robot mantiene una distanza di sicurezza costante da un oggetto davanti a sé.

---

## ⚙️ 5. Impostazioni Avanzate (Line Tracking & Color Picker)
* **Line Tracking**:
  * **Lip 1 / Lip 2**: Regola le soglie di rilevamento della telecamera per l'inseguimento della linea.
  * **Error**: Tolleranza di deviazione per la correzione della traiettoria.
  * **CV FL**: Attiva l'elaborazione video per la linea nera.
  * **Render**: Mostra a schermo il disegno del tracciato rilevato.
* **Color Picker**:
  * Muovi gli slider **Red (R)**, **Green (G)**, **Blue (B)** per selezionare un colore target da far inseguire al robot. Il quadratino a fianco mostrerà in tempo reale l'anteprima del colore.
  * Clicca su **Color Set** per registrare il colore scelto sul server.
* **PWM Calibration**:
  * Permette di calibrare finemente la posizione centrale dei servo (PWM0 e PWM1) usando le freccette `<` e `>`, registrando la posizione con il tasto `Set`.
  * **Init Pos**: Muove la testa nella posizione iniziale memorizzata.
  * **Default Set**: Ripristina i valori di fabbrica dei servo.
