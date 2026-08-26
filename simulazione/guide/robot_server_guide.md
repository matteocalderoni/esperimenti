# Guida al Robot Server (Fase 1: Estrazione)

Il server del robot è stato estratto con successo dalla cartella originale del produttore ed isolato in una directory pulita dedicata: `robot_server/`.

## 📂 Contenuto della Cartella `robot_server/`
Tutti i file originali necessari al funzionamento del server e della simulazione si trovano ora in questo pacchetto, garantendo l'integrità degli import di default:

- **`WebServer.py`**: Gestore centrale delle connessioni di rete del robot. Esegue sia il server WebSocket (porta `8888` per il simulatore web) sia il server TCP Socket (porta `10223` per il telecomando desktop), inoltrando in broadcast i comandi ricevuti via TCP al simulatore nel browser.
- **`app.py`**: Server web Flask (porta `5000`) che serve le interfacce grafiche (inclusa la simulazione a `/simulator`) e lo stream MJPEG della telecamera.
- **`Functions.py`**: Contiene la logica decisionale e di coordinamento del robot.
- **`Move.py`**, **`RPIservo.py`**, **`RobotLight.py`**, **`Ultra.py`**, **`OLED.py`**, **`Voltage.py`**, **`Switch.py`**: Driver e utilità di gestione dell'hardware del robot (DC Motors, Servo, LED, Ultrasuoni, OLED, Batteria).
- **`dist/`**: Contiene l'interfaccia utente web originale precompilata del produttore.

---

## 🚀 Come Avviare il Nuovo Server in Simulazione (Mac/PC)

Abbiamo creato uno script centralizzato che gestisce l'inizializzazione del server e del client in contemporanea evitando conflitti di porte:
```bash
./start_simulation.py
```
Questo script:
1. Avvia `WebServer.py` in background con l'ambiente virtuale (`venv`) e il Mock Hardware.
2. Inizializza i canali Flask (5000), WebSocket (8888) e TCP (10223).
3. Lancia il telecomando grafico in primo piano.
4. Quando chiudi il telecomando desktop, lo script spegne in modo pulito il server in background per liberare le porte.

Se preferisci avviare il server manualmente in modalità mock (senza avviare il telecomando desktop):
```bash
cd robot_server
PYTHONPATH=../mock_hardware ../venv/bin/python WebServer.py
```
Naviga quindi su [http://127.0.0.1:5000/simulator](http://127.0.0.1:5000/simulator) per visualizzare l'arena virtuale del simulatore.

---

## 🛠️ Prossimi Passi (Refactoring dei file)
Ora che i file sono isolati, possiamo procedere a scomporli uno per volta in sotto-moduli specializzati (es. dividendo la telemetria dal WebSocket principale, o separando gli effetti delle luci dal driver WS2812), mantenendo sempre ciascun file rigidamente sotto il limite delle **150 righe** come previsto dalla Costituzione del Progetto.
