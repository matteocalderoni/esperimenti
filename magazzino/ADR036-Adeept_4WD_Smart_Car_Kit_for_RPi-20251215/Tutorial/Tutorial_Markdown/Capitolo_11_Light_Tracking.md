# Capitolo 11: Inseguimento Luce (Light Tracking)

Questo capitolo tratta il rilevamento di fonti luminose e l'inseguimento automatico della luce tramite l'uso di fotoresistenze e del convertitore analogico-digitale (ADC).

## 📚 Lezioni Incluse
* **Lezione 14**: Inseguimento automatico della sorgente luminosa.

## ⚙️ Concetti Chiave & Hardware
* **Fotoresistenza (LDR - Light Dependent Resistor)**: Sensore la cui resistenza elettrica diminuisce all'aumentare dell'intensità luminosa incidente.
* **ADS7830 (Convertitore Analogico-Digitale I2C)**: Poiché il Raspberry Pi possiede solo ingressi digitali (GPIO), l'ADC ADS7830 (indirizzo I2C `0x48`) viene utilizzato per leggere la tensione analogica variabile prodotta dai partitori di tensione delle fotoresistenze e convertirla in un valore digitale intero compreso tra `0` e `255`.
* **Algoritmo di Guida**: Il robot confronta i valori letti dalle fotoresistenze posizionate sul lato sinistro e destro. Ruota nella direzione del sensore che legge la luminosità maggiore fino a bilanciare i valori, muovendosi così verso la sorgente luminosa.

---

## 🔗 Collegamenti Utili
* **Cartella del Tutorial originale**: [Chapter 11 PDF Folder](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Tutorial/Chapter%2011%20Light%20Tracking)
* **Codice di Esempio nel Workspace**:
  * [Lesson 14 Python script](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Examples/08_Light_Tracking/light_track.py)
