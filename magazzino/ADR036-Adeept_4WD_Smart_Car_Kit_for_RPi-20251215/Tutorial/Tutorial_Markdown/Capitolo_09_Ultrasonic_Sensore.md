# Capitolo 9: Sensore ad Ultrasuoni

Questo capitolo spiega come utilizzare il sensore ad ultrasuoni per calcolare la distanza dagli ostacoli in tempo reale.

## 📚 Lezioni Incluse
* **Lezione 12**: Misurare la distanza con un sensore ad ultrasuoni.

## ⚙️ Concetti Chiave & Cablaggio
* **Sensore HC-SR04**: Integra un trasmettitore e un ricevitore ad ultrasuoni.
* **Principio dell'Eco (Sonar)**:
  1. Il Raspberry Pi invia un breve impulso di trigger (durata 10 microsecondi) al pin `Trig` del sensore.
  2. Il sensore trasmette un pacchetto di ultrasuoni a 40 kHz.
  3. Il pin `Echo` del sensore passa a livello logico `HIGH` e vi rimane finché il ricevitore non cattura l'onda riflessa.
  4. Misurando la durata temporale dell'impulso di Echo ($t$), si calcola la distanza sfruttando la velocità del suono nell'aria ($\approx 340 \text{ m/s}$):
     $$\text{Distanza (cm)} = \frac{t \times 34000}{2}$$
     *(Diviso 2 poiché l'onda compie il percorso di andata e ritorno)*.

---

## 🔗 Collegamenti Utili
* **Cartella del Tutorial originale**: [Chapter 9 PDF Folder](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Tutorial/Chapter%209%20Ultrasonic)
* **Codice di Esempio nel Workspace**:
  * [Lesson 12 Python script](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Examples/06_Ultrasonic/ultrasonic.py)
