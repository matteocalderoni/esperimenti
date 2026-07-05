# Capitolo 1: Introduzione al Raspberry Pi e alla Robot HAT

Questo capitolo introduce i componenti fondamentali del kit robotico.

## 📚 Lezioni Incluse
* **Lezione 1**: Introduzione al Raspberry Pi (caratteristiche fisiche, modelli supportati e pinout GPIO).
* **Lezione 2**: Introduzione alla scheda **Adeept Robot HAT V3.2**.

## ⚙️ Concetti Chiave & Hardware
* **Raspberry Pi**: Utilizzato come computer centrale di bordo per elaborare i comandi e gestire lo streaming video.
* **Adeept Robot HAT V3.2**: La scheda shield montata sopra i pin GPIO del Raspberry Pi che funge da interfaccia di potenza e di segnale:
  * Distribuisce l'alimentazione proveniente dalle batterie 18650.
  * Integra i driver ponte H **DRV8833** per la trazione dei motori DC.
  * Contiene il convertitore analogico-digitale (ADC) **ADS7830** (I2C indirizzo `0x48`) per leggere i sensori analogici.
  * Fornisce i canali PWM pilotati dal chip **PCA9685** (I2C indirizzo `0x5f`) per il controllo dei servomotori.

---

## 🔗 Collegamenti Utili
* **Cartella del Tutorial originale**: [Chapter 1 PDF Folder](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Tutorial/Chapter%201%20Introduction%20to%20the%20Raspberry%20Pi%20And%20the%20Adeept%20Robot%20HAT)
* **Datasheet dei chip coinvolti**:
  * [ADS7830 ADC Datasheet](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Datasheet/ADS7830.pdf)
  * [PCA9685 PWM Datasheet](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Datasheet/PCA9685.pdf)
