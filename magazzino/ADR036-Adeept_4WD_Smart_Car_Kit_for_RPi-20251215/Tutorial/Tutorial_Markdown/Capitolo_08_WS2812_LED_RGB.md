# Capitolo 8: Striscia LED RGB WS2812

Questo capitolo illustra la programmazione dei LED RGB indirizzabili (noti come NeoPixel) integrati sul robot.

## 📚 Lezioni Incluse
* **Lezione 11**: Accensione e controllo dei LED WS2812.

## ⚙️ Concetti Chiave & Cablaggio
* **LED Indirizzabili WS2812**: Ogni LED contiene un piccolo circuito integrato di controllo che permette di comandare individualmente colore (RGB) e luminosità di decine di LED in cascata utilizzando un solo pin di segnale dati ad alta velocità.
* **Controllo ad impulsi precisi**: Richiedono una temporizzazione molto precisa (spesso implementata via bus SPI o PWM dedicati sul Raspberry Pi).
* **Animazioni**: Creazione di effetti luminosi come la variazione sfumata di colore (effetto respiro), giochi di luce inseguitori o indicatori di stato (ad esempio, colore rosso lampeggiante per indicare emergenza o retromarcia).

---

## 🔗 Collegamenti Utili
* **Cartella del Tutorial originale**: [Chapter 8 PDF Folder](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Tutorial/Chapter%208%20WS2812)
* **Codice di Esempio nel Workspace**:
  * [Lesson 11 Python script](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Examples/05_WS2812/ws2812.py)
