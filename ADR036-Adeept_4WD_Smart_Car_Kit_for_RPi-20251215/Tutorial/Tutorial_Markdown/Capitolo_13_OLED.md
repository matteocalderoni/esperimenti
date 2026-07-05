# Capitolo 13: Schermo OLED

Questo capitolo illustra la configurazione e la stampa di testi su uno schermo grafico OLED a due colori.

## 📚 Lezioni Incluse
* **Lezione 16**: Display grafico OLED.

## ⚙️ Concetti Chiave & Hardware
* **Schermo OLED SSD1306**: Un piccolo display grafico a basso consumo con risoluzione $128 \times 64$ o $128 \times 32$ pixel che utilizza la tecnologia a diodi organici a emissione di luce (OLED), la quale non richiede retroilluminazione.
* **Bus I2C (Inter-Integrated Circuit)**: Il display si collega e riceve i comandi grafici dal Raspberry Pi condividendo la linea dati (SDA) e la linea di clock (SCL).
* **Libreria Luma.OLED / Adafruit**: Uso di driver software per disegnare primitive grafiche (punti, linee, rettangoli) o rendering di testi (caricando font raster) per visualizzare l'indirizzo IP locale, la carica stimata della batteria e la modalità attiva di funzionamento del robot.

---

## 🔗 Collegamenti Utili
* **Cartella del Tutorial originale**: [Chapter 13 PDF Folder](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Tutorial/Chapter%2013%20OLED)
* **Codice di Esempio nel Workspace**:
  * [Lesson 16 Python script](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Examples/10_OLED/oled.py)
