# Capitolo 12: Matrice LED

In questo capitolo viene spiegato come visualizzare simboli e forme grafiche su una matrice di LED.

## 📚 Lezioni Incluse
* **Lezione 15**: Display della Matrice LED.

## ⚙️ Concetti Chiave & Hardware
* **Matrice LED 8x8**: Composta da 64 diodi LED disposti in righe e colonne.
* **Controllo a Scansione (Multiplexing)**: Per controllare 64 LED individualmente con un numero limitato di pin, il software accende rapidamente una riga alla volta inviando i dati della colonna corrispondente ad altissima velocità. A causa della persistenza della visione dell'occhio umano, l'intera immagine appare statica e priva di sfarfallio.
* **Mappe di Bit (Font/Icone)**: Definizione di array binari a 8 byte (es. `smile_array`) dove ogni bit `1` o `0` corrisponde allo stato acceso o spento di un pixel specifico della griglia.

---

## 🔗 Collegamenti Utili
* **Cartella del Tutorial originale**: [Chapter 12 PDF Folder](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Tutorial/Chapter%2012%20LED%20Matrix)
* **Codice di Esempio nel Workspace**:
  * [Lesson 15 Python script](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Examples/09_LED_Matrix/matrix.py)
