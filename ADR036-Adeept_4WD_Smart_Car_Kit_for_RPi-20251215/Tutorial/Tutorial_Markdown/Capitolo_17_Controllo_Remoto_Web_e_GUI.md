# Capitolo 17: Controllo Remoto tramite Web App e Interfaccia Desktop GUI

Questo capitolo illustra l'integrazione di tutti i sensori, motori ed elaborazioni video in un sistema di controllo remoto centralizzato fruibile via browser o client desktop.

## 📚 Lezioni Incluse
* **Lezione 22**: Introduzione alla WEBUI (Web-based User Interface).
* **Lezione 23**: Controllo delle luci di segnalazione (Warning Light).
* **Lezione 24**: Scansione Radar ad ultrasuoni e mappatura.
* **Lezione 25**: Guida autonoma con evitamento ostacoli (Obstacle Avoidance).
* **Lezione 26**: Line Tracking tramite sensori IR fisici.
* **Lezioni 27 e 28**: Inseguimento linea basato su feed video (Video Line Tracking) e calibrazione.
* **Lezione 29**: Introduzione e utilizzo dell'applicazione Client desktop nativa in Tkinter.

## ⚙️ Dettagli Software & Funzionalità
* **Web UI (Flask + WebSocket)**: Permette di governare il robot da dispositivi mobili e PC collegati alla medesima rete wireless. I comandi vengono spediti istantaneamente via WebSocket e lo streaming JPEG viene ricevuto via HTTP multipart.
* **Radar Scan**: Il sensore ad ultrasuoni montato sulla testa ruota di 180 gradi grazie ad un servomotore. Rileva le distanze ad ogni angolo e trasmette i dati al client, che visualizza una mappa polare degli ostacoli circostanti.
* **Video Line Tracking**: In questa modalità, OpenCV isola i contorni di una linea scura all'interno del flusso d'immagine della telecamera, calcola l'errore di centraggio rispetto all'asse del robot ed invia comandi correttivi di sterzata ai motori, senza fare affidamento sui sensori infrarossi fisici.
* **Tkinter Desktop GUI**: Un'applicazione desktop Python ricca di funzionalità che permette il controllo a tastiera, la visualizzazione video e la taratura dell'offset dei servomotori o della maschera colore HSV per l'inseguimento cromatico.

---

## 🔗 Collegamenti Utili
* **Cartelle del Tutorial originale**:
  * [Chapter 17 (Mecanum Wheels) PDF Folder](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Tutorial/Chapter%2017%20Remote%20Control%20for%20Mecanum%20Wheels)
  * [Chapter 17 (Ordinary Wheels) PDF Folder](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Tutorial/Chapter%2017%20Remote%20Control%20for%20Ordinary%20Wheels)
* **Codice Principale del Controllo**:
  * [WebServer.py (Ordinario)](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Server/Server_OrdinaryWheels/WebServer.py)
  * [Client GUI.py (Ordinario)](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Client/Client_OrdinaryWheels/GUI.py)
