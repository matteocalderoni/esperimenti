# Capitolo 15: Monitoraggio e Allarme Batteria

Questo capitolo illustra come leggere lo stato di carica delle batterie a bordo del robot per prevenire danni da scarica profonda.

## 📚 Lezioni Incluse
* **Lezione 19**: Rilevamento della tensione della batteria e gestione dell'allarme.

## ⚙️ Concetti Chiave & Hardware
* **Batterie Li-ion 18650**: Il robot è alimentato da due batterie da 3.7V in serie (totale circa 7.4V nominali). Queste batterie non devono scendere sotto i 3.0V per cella per evitare di danneggiarle irreversibilmente.
* **Partitore di Tensione**: Poiché l'ADC ADS7830 accetta solo tensioni in ingresso fino a 5V (o la sua tensione di riferimento), viene utilizzato un partitore resistivo per dividere la tensione totale della batteria a metà, portandola in un range sicuro per la misurazione analogica.
* **Procedura software**: Il server effettua periodicamente letture sul canale ADC preposto. Se il valore scende al di sotto della soglia minima configurata (es. circa 6.5V totali), attiva un allarme sonoro tramite il buzzer e invia notifiche visive per allertare l'utente.

---

## 🔗 Collegamenti Utili
* **Cartella del Tutorial originale**: [Chapter 15 PDF Folder](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Tutorial/Chapter%2015%20Battery%20Level%20Detection%20and%20Alarm)
* **Codice di Esempio nel Workspace**:
  * [Lesson 19 Python script](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Examples/13_Voltage/voltage.py)
