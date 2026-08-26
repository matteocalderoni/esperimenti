# Capitolo 14: Telecamera e OpenCV

Questo capitolo unisce la telecamera fisica all'elaborazione software per dotare il robot di capacità di visione artificiale.

## 📚 Lezioni Incluse
* **Lezione 17**: Streaming video e scatto fotografico.
* **Lezione 18**: Riconoscimento di oggetti, colori e gesti tramite OpenCV.

## ⚙️ Concetti Chiave & Software
* **Pi Camera**: Modulo telecamera collegato tramite cavo a nastro flessibile (CSI) direttamente sul Raspberry Pi per catturare immagini ad alta risoluzione.
* **OpenCV (Open Source Computer Vision Library)**:
  * **Spazio Colore HSV (Hue, Saturation, Value)**: Rispetto a RGB, lo spazio HSV separa il colore vero e proprio (Tonalità/Hue) dalla saturazione e dalla luminosità, rendendolo ideale per tracciare un oggetto colorato (es. una pallina arancione) creando maschere di soglia stabili anche in presenza di ombre o variazioni di luce.
  * **Motion Detection (Watchdog)**: Confrontando fotogrammi successivi tramite calcolo della differenza assoluta e soglia dei contorni, il software determina se ci sono oggetti in movimento nell'inquadratura.
  * **Riconoscimento Gesti/Oggetti**: Algoritmi di base per isolare forme geometriche o volti.

---

## 🔗 Collegamenti Utili
* **Cartella del Tutorial originale**: [Chapter 14 PDF Folder](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Tutorial/Chapter%2014%20Camera)
* **Codice di Esempio nel Workspace**:
  * [Lesson 17 (Camera Test)](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Examples/11_Camera/camera.py)
  * [Lesson 18 (OpenCV Test)](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Examples/12_OpenCV/opencv.py)
