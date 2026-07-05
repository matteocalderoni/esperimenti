# Analisi del Progetto: Adeept 4WD Smart Car Kit per Raspberry Pi

Questo repository contiene tutto il software, i fogli tecnici (datasheet) e le guide didattiche (tutorial) per assemblare, configurare e controllare una macchinina robotica a quattro ruote motrici (**Adeept 4WD Smart Car**) basata su **Raspberry Pi**.

Il progetto supporta due varianti hardware a seconda dei tipi di ruote assemblate:
1. **Mecanum Wheels**: Ruote omnidirezionali che consentono movimenti laterali (strafe), diagonali e rotazioni complesse.
2. **Ordinary Wheels**: Ruote classiche con sterzata di tipo differenziale.

---

## 📂 Struttura Principale del Progetto

Il progetto si articola in tre macro-cartelle principali:

```
ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/
├── Datasheet/      # Fogli tecnici dei chip e componenti elettronici usati
├── Tutorial/       # Guide dettagliate in formato PDF divise per capitoli
└── Code/           # Logica del robot (Server, Client ed Esempi di test)
```

1. **`Datasheet/`**: contiene le specifiche tecniche dei componenti hardware chiave, come:
   * `ADS7830.pdf`: Convertitore Analogico-Digitale (ADC) a 8 canali I2C.
   * `PCA9685.pdf`: Controller PWM a 16 canali I2C per servomotori e motori DC.
   * `DRV8833.PDF`: Driver per motori DC.
   * Documentazione per la fotocamera Pi Camera.
2. **`Tutorial/`**: una guida passo-passo suddivisa in capitoli che spiega la preparazione di Raspberry Pi OS, l'assemblaggio meccanico del robot, i test sui singoli componenti e la configurazione di rete.
3. **`Code/Adeept_4WD_Smart_Car_for_RPi/`**: contiene l'intera base di codice Python suddivisa in:
   * **`Server/`**: Il codice che gira a bordo del Raspberry Pi.
   * **`Client/`**: Le interfacce grafiche desktop per controllare il robot da remoto.
   * **`Examples/`**: 14 mini-script di test per convalidare i singoli componenti hardware (LED, Buzzer, Servomotori, WS2812, Sensore ad ultrasuoni, Line Tracking, ecc.).

---

## ⚙️ Architettura del Software (lato Server/Robot)

La cartella `Server/` (divisa in `Server_OrdinaryWheels` e `Server_MecanumWheels`) gestisce il robot tramite una combinazione di Web Server (Flask) e WebSocket Server.

### 1. Avvio e Connettività (`setup_*.py` e `wifi_hotspot_manager.sh`)
* [setup_OrdinaryWheels.py](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/setup_OrdinaryWheels.py) e [setup_MecanumWheels.py](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/setup_MecanumWheels.py) automatizzano l'installazione dei pacchetti di sistema (`i2c-tools`, `python3-opencv`, `python3-pigpio`, ecc.) e dei moduli Python (`adafruit-pca9685`, `flask`, `websockets`, ecc.).
* Viene registrato un servizio di rete gestito dallo script [wifi_hotspot_manager.sh](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/wifi_hotspot_manager.sh): all'avvio, se il robot non riesce a connettersi ad una rete Wi-Fi preconfigurata, avvia in automatico un **Hotspot Wi-Fi locale** denominato `Adeept_Robot` con IP statico `192.168.4.1` tramite `nmcli`.
* Viene infine registrato il servizio systemd `Adeept_Robot.service` per lanciare in automatico sul robot lo script `WebServer.py` all'avvio del sistema.

### 2. Il Server di Controllo Principale ([WebServer.py](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Server/Server_OrdinaryWheels/WebServer.py))
* **Flask Web Server (Porta 5000)** (implementato in [app.py](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Server/Server_OrdinaryWheels/app.py)):
  * Distribuisce l'applicazione Web pre-compilata a pagina singola (Vue.js/React situata in `dist/`).
  * Fornisce l'endpoint `/video_feed` che trasmette lo stream video live JPEG acquisito dalla telecamera tramite OpenCV.
* **WebSocket Server (Porta 8888)**:
  * Gestisce le connessioni dei client remoti in tempo reale.
  * Implementa una verifica iniziale delle credenziali (`admin:123456`).
  * Riceve stringhe e dizionari JSON contenenti comandi di movimento, controllo dei servomotori, accensione LED o cambio di modalità e risponde inviando telemetria di stato (temperatura CPU, utilizzo RAM, distanze lette dal radar).

### 3. Moduli Hardware e Funzionalità Core
* **Movimento Motori ([Move.py](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Server/Server_OrdinaryWheels/Move.py))**:
  * Utilizza la libreria Adafruit per inviare impulsi PWM sul bus I2C (indirizzo predefinito `0x5f`) controllando un chip PCA9685 connesso a quattro motori DC (M1, M2, M3, M4).
  * Nella versione **Mecanum Wheels** ([Move.py](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Server/Server_MecanumWheels/Move.py)), la cinematica implementa i movimenti di traslazione laterale sinistra/destra e diagonale coordinando la direzione dei singoli motori.
* **Controllo Servomotori ([RPIservo.py](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Server/Server_OrdinaryWheels/RPIservo.py))**:
  * Offre una gestione multithread per posizionare i servomotori in modo fluido interpolando i passi da una posizione iniziale ad una finale in un determinato intervallo di tempo.
* **Comportamento Autonomo ([Functions.py](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Server/Server_OrdinaryWheels/Functions.py))**:
  * Esegue un thread in background che implementa diversi comportamenti avanzati:
    1. **Automatic (Obstacle Avoidance)**: usa il sensore ad ultrasuoni montato su un servomotore. Se rileva un ostacolo, ruota il sensore a sinistra e destra, calcola la via più libera e ruota il robot di conseguenza.
    2. **TrackLine (Line Tracking)**: monitora i tre sensori a infrarossi collegati ai GPIO `22`, `27` e `17` del Raspberry Pi per seguire una linea nera tracciata a terra.
    3. **TrackLight (Inseguimento Luce)**: legge i dati analogici da una fotoresistenza tramite l'ADC ADS7830 (indirizzo I2C `0x48`) per sterzare verso la sorgente luminosa più forte.
    4. **KeepDistance**: mantiene il robot ad una distanza fissa (tra 25 e 35 cm) da un oggetto posto di fronte.
    5. **RadarScan**: esegue una scansione rotante a 180 gradi con il sensore ad ultrasuoni, restituendo una matrice di punti `[distanza, angolo]` per generare una mappa radar.
* **OpenCV & Computer Vision (`camera_opencv.py`, `base_camera.py`, `FPV.py`)**:
  * Elabora i fotogrammi per l'inseguimento cromatico (Color Tracking tramite maschere HSV) e il rilevamento del movimento (Watchdog/Motion Detection).
* **Feedback Visivo e Batteria (`OLED.py`, `RobotLight.py`, `Voltage.py`)**:
  * `OLED.py` gestisce uno schermo OLED SSD1306 per visualizzare l'IP locale e lo stato del robot.
  * `RobotLight.py` comanda una striscia LED RGB indirizzabile WS2812 (effetti respiro, lampeggiante polizia).
  * `Voltage.py` campiona il voltaggio di alimentazione tramite l'ADC per avvertire l'utente in caso di batteria scarica.

---

## 🖥️ Logica lato Client

La cartella `Client/` (ad esempio [GUI.py](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Client/Client_OrdinaryWheels/GUI.py)) implementa un'interfaccia grafica desktop nativa scritta in **Tkinter**:
* Si connette tramite socket TCP al server WebSocket del Raspberry Pi per trasmettere comandi di controllo remoti (tramite tastiera o pulsanti a schermo).
* Supporta la visualizzazione dello stream video di ritorno e l'interazione diretta con l'utente (ad esempio, facendo clic su una parte dell'immagine video, invia i valori di colore HSV rilevati sul pixel per calibrare l'inseguimento cromatico).
* Permette la calibrazione e regolazione fine dell'offset di posizionamento dei singoli servomotori direttamente dalla GUI.

---

## Summary

In sintesi, si tratta di un **progetto didattico e di robotica ben strutturato**, che integra sensori digitali e analogici (tramite ADC I2C), controlli di potenza per attuatori (motori DC e servomotori tramite controller PWM I2C) e computer vision (OpenCV). Il design è modulare ed è studiato sia per essere fruibile da un'applicazione web standard che da una GUI desktop Python centralizzata.
