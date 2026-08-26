# Capitolo 7: Controllo dei Motori DC

Questo capitolo descrive come controllare il movimento e la velocità dei motori elettrici a corrente continua che spingono il robot.

## 📚 Lezioni Incluse
* **Lezione 10**: Controllo dei motori DC per ruote Mecanum e ruote ordinarie.

## ⚙️ Concetti Chiave & Hardware
* **Ponte H (H-Bridge)**: Circuito integrato (in particolare il chip **DRV8833** presente sulla Robot HAT) che permette di invertire la polarità fornita ai motori DC per farli ruotare in avanti o all'indietro.
* **Controllo della Velocità tramite PWM**: Regolando il ciclo di lavoro (*Duty Cycle*) dei segnali PWM inviati ai driver ponte H, si varia la tensione media ai capi del motore controllando la velocità di trazione da 0 a 100%.
* **Cinematica Ordinaria vs. Mecanum**:
  * La cinematica ordinaria usa uno sterzo differenziale (rallentando o invertendo i motori di un lato per girare).
  * La cinematica Mecanum permette la traslazione laterale diretta combinando rotazioni concordi e discordi delle ruote a rulli diagonali.

---

## 🔗 Collegamenti Utili
* **Cartella del Tutorial originale**: [Chapter 7 PDF Folder](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Tutorial/Chapter%207%20Motor)
* **Codice di Esempio nel Workspace**:
  * [Esempio di test motori ordinari](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Examples/04_Motor/motor_OrdinaryWheels.py)
  * [Esempio di test motori Mecanum](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Examples/04_Motor/motor_MecanumWheels.py)
