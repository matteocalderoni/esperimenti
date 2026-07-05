# Capitolo 6: Controllo dei Servomotori

Questo capitolo tratta il posizionamento angolare dei servomotori tramite il driver PWM dedicato I2C.

## 📚 Lezioni Incluse
* **Lezione 9**: Controllo della rotazione dei servomotori.

## ⚙️ Concetti Chiave & Hardware
* **Servomotori**: Attuatori rotativi che mantengono una posizione angolare specifica (solitamente tra 0 e 180 gradi) in base alla durata di un impulso PWM (tipicamente tra 0.5 ms e 2.5 ms con una frequenza di 50 Hz).
* **PCA9685 (Controller PWM via I2C)**: Chip integrato sulla Robot HAT che riceve comandi I2C dal Raspberry Pi ed emette autonomamente segnali PWM precisi su 16 canali indipendenti, sgravando la CPU da compiti di temporizzazione critica.
* **Calibrazione**: Impostazione dei limiti software (impulso minimo/massimo e angolo di mezzeria) per evitare sforzi meccanici o blocchi.

---

## 🔗 Collegamenti Utili
* **Cartella del Tutorial originale**: [Chapter 6 PDF Folder](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Tutorial/Chapter%206%20Servo)
* **Codice di Esempio nel Workspace**:
  * [Lesson 9 Python script](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Examples/03_Servo/servo.py)
  * [initPosServos.py (script di riposizionamento)](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/initPosServos.py)
