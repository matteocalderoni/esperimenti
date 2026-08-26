# Guida al Nuovo Client Desktop Modularizzato

Per migliorare la leggibilità, conformarsi alle regole della Costituzione del Progetto (limite di 150 righe e SRP) e facilitare lo sviluppo, il vecchio client monolitico `GUI.py` (oltre 1000 righe) è stato completamente rifattorizzato ed estratto in una cartella dedicata.

## 📂 Struttura del Nuovo Client
Il client è situato in `desktop_client/` ed è suddiviso nei seguenti moduli specializzati:

- **`main.py`**: Il punto di ingresso principale dell'applicazione. Configura la finestra di Tkinter, carica il logo e coordina le interazioni tra l'interfaccia utente (UI) e la logica di rete.
- **`config/settings.py`**: Contiene lo stato dell'applicazione (variabili globali come velocità, stati di switch e pulsanti), la palette di colori dell'interfaccia grafica e la gestione del salvataggio persistente dell'ultimo indirizzo IP utilizzato.
- **`core/network.py`**: Gestisce la connessione socket TCP al robot su porta `10223`, i thread asincroni per ricevere i dati di telemetria (CPU Temp, Usage, RAM) e i risultati del radar ad ultrasuoni, esponendo callback per aggiornare la UI in modo disaccoppiato.
- **`core/video_stream.py`**: Gestisce in modo thread-safe l'avvio e l'arresto del processo parallelo dedicato alla ricezione del flusso video della telecamera.
- **`video_receiver.py`**: Script autonomo avviato come sotto-processo che si collega via ZeroMQ sulla porta `5555` per decodificare lo stream video MJPEG e visualizzarlo in una finestra OpenCV.
- **`ui/`**: Cartella contenente i singoli pannelli grafici (classe dedicata per ciascuno, tutti ampiamente sotto le 150 righe):
  - `info_panel.py`: Inserimento IP, tasto Connect e telemetria.
  - `control_panel.py`: Pulsanti di movimento DC e pulsanti sterzata/pan-tilt.
  - `sensor_panel.py`: Canvas del radar ad ultrasuoni (corretto memory leak presente nell'originale).
  - `slider_panel.py`: Slider per velocità, parametri del tracciatore di linea e selettore colore RGB/HSV.
  - `feature_panel.py`: Pulsanti per l'attivazione delle automazioni (Radar, OpenCV, automatico) e impostazioni dei servo.
  - `components.py`: Facade per importazioni semplificate.
- **`utils/helpers.py`**: Funzioni matematiche e di conversione cromatica (RGB to Hex, RGB to HSV).

---

## 🚀 Come Eseguire il Client

### 1. Avvia il Mock Server (se sei su PC/Mac) o connetti il Robot reale
Assicurati che il server del robot sia in esecuzione sulla tua macchina:
```bash
PYTHONPATH=mock_hardware python3 ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Server/Server_OrdinaryWheels/WebServer.py
```

### 2. Avvia la UI Modularizzata
In un altro terminale, spostati nella cartella del client e avvia `main.py`:
```bash
cd desktop_client
python3 main.py
```

### 3. Collega la UI
Nell'interfaccia grafica:
- Per la **Simulazione**: Inserisci `127.0.0.1` nel campo IP Address e clicca su **Connect** (oppure premi Invio).
- Per il **Robot Reale**: Inserisci l'indirizzo IP locale assegnato al Raspberry Pi (es. `192.168.1.100`) e clicca su **Connect**.
