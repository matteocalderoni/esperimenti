# Capitolo 10: Inseguimento Linea (Line Tracking)

In questo capitolo viene spiegato il funzionamento del tracciamento di linee nere a terra mediante sensori ottici a riflessione infrarossa.

## 📚 Lezioni Incluse
* **Lezione 13**: Funzionamento del Line Tracking.

## ⚙️ Concetti Chiave & Hardware
* **Sensori Infrarossi a Riflessione**: Composti da un LED emettitore IR e da un fototransitore ricevitore.
  * La superficie chiara riflette la luce IR $\rightarrow$ il fototransitore conduce e il sensore legge un valore logico.
  * La linea nera (scura) assorbe la luce IR $\rightarrow$ il fototransitore non conduce $\rightarrow$ il sensore restituisce un valore logico opposto.
* **Modulo a Tre Sensori (Sinistro, Centrale, Destro)**: Collegati ai pin GPIO `22`, `27` e `17` del Raspberry Pi.
* **Algoritmo di Controllo**: A seconda dello stato combinato dei tre sensori (es. `0 1 0` indica linea centrata, `1 0 0` indica linea a sinistra), il software decide se far avanzare dritto il robot o farlo ruotare a destra/sinistra per riallinearsi.

---

## 🔗 Collegamenti Utili
* **Cartella del Tutorial originale**: [Chapter 10 PDF Folder](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Tutorial/Chapter%2010%20Line%20Tracking)
* **Codice di Esempio nel Workspace**:
  * [Lesson 13 Python script](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Examples/07_Line_Tracking/line_track.py)
