# Capitolo 16: Connessioni TCP/IP

Questo capitolo illustra le basi della comunicazione di rete a socket tra un host di controllo ed il Raspberry Pi.

## 📚 Lezioni Incluse
* **Lezione 20**: Introduzione al principio di funzionamento del protocollo TCP.
* **Lezione 21**: Controllo dei pin del robot (es. accensione LED) tramite rete TCP.

## ⚙️ Concetti Chiave & Rete
* **Protocollo TCP/IP (Transmission Control Protocol)**: Protocollo orientato alla connessione che garantisce il recapito affidabile, ordinato ed esente da errori dei pacchetti dati tra due dispositivi in rete.
* **Architettura Client-Server**:
  * Il Raspberry Pi agisce come **Server**, rimanendo in ascolto su una porta specifica (es. 8888 o simile) in attesa di richieste di connessione.
  * Il computer o lo smartphone agisce come **Client**, avviando la connessione verso l'indirizzo IP del robot.
* **Scambio di Messaggi (Socket)**: Una volta stabilito il canale di comunicazione, il client può inviare comandi testuali elementari (ad esempio, stringhe come `'on'` o `'off'`) che il server decodifica ed esegue istantaneamente agendo sull'hardware (GPIO).

---

## 🔗 Collegamenti Utili
* **Cartella del Tutorial originale**: [Chapter 16 PDF Folder](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Tutorial/Chapter%2016%20TCP%20Introduction)
