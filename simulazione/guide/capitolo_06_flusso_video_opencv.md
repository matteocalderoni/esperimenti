# Guida alla Telecamera e Visione Artificiale: Stream Video e OpenCV (picamera2, libcamera e OpenCV)

Nelle guide precedenti abbiamo completato la simulazione di tutti i componenti fisici e di interfaccia del robot: attuatori PWM per servomotori e motori DC (Capitolo 2), sensori digitali e segnalatori (Capitolo 3), sensori analogici via ADC (Capitolo 4) e display grafici OLED (Capitolo 5).

In questo capitolo affrontiamo il componente visivo principale del robot: **come fa il Raspberry Pi a catturare il flusso video dalla fotocamera, elaborarlo in tempo reale con OpenCV per inseguire oggetti o linee, e trasmetterlo alla WebUI/GUI desktop tramite lo streaming HTTP/JPEG?**

Spiegheremo il funzionamento dell'ecosistema **`picamera2`** e **`libcamera`**, l'architettura di **OpenCV**, e come abbiamo realizzato l'emulazione software dei moduli mock per far funzionare `camera_opencv.py` e il server del robot direttamente su PC/Mac.

---

## 📹 1. La Telecamera su Raspberry Pi OS (`picamera2` e `libcamera`)

Nelle ultime versioni del sistema operativo Raspberry Pi OS (Bookworm/Bullseye), la gestione della telecamera è migrata dalla vecchia libreria legacy `picamera` al nuovo stack grafico basato su **`libcamera`** e la sua interfaccia Python di alto livello **`picamera2`**.

### Caratteristiche Chiave:
* **`libcamera`**: È il framework C++ nativo del kernel Linux per la gestione dell'hardware della fotocamera, del bilanciamento del bianco e della geometria delle trasformazioni (orientamento verticale/orizzontale).
* **`picamera2`**: È la libreria Python ufficiale che permette di configurare la risoluzione di anteprima (es. `640x480`), il formato colore (`RGB888`, `YUV420`), e di catturare i singoli frame come array NumPy.

---

## 🏗️ 2. Architettura di Streaming e Visione Artificiale (`camera_opencv.py`)

A bordo del robot Adeept, il modulo responsabile della gestione video è [camera_opencv.py](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Server/Server_OrdinaryWheels/camera_opencv.py).

L'architettura è suddivisa in tre parti principali:

| Componente | Modulo / Classe Python | Ruolo e Funzionamento |
| :--- | :--- | :--- |
| **Generatore di Frame** | `Camera.frames()` | Inizializza `Picamera2`, cattura i frame `640x480`, li converte in formato JPEG e li restituisce via `yield` come generatore per lo streaming HTTP (`/video_feed`). |
| **Thread di Elaborazione** | `CVThread` | Un thread dedicato in background che elabora il frame corrente quando è attiva una modalità di visione artificiale. |
| **Libreria Visione** | `OpenCV (cv2)` | Esegue i filtri HSV, le sfocature gaussiane, il tracciamento di contorni e il calcolo dei rettangoli di contenimento. |

---

## 🎨 3. Il Flusso di Streaming MJPEG (`BaseCamera` e Flask)

Il server web Flask ([app.py](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Server/Server_OrdinaryWheels/app.py)) espone l'endpoint `/video_feed` utilizzando il formato **MJPEG (Motion JPEG)**:

```python
@app.route('/video_feed')
def video_feed():
    return Response(gen(Camera()),
                    mimetype='multipart/x-mixed-replace; boundary=frame')
```

### Come Funziona il Processo:
1. La fotocamera cattura una matrice NumPy `640x480x3` (in formato RGB).
2. Se è attiva una funzione di visione (es. inseguimento colore), `CVThread` sovrappone elementi grafici (rettangoli, scritte target, assi di puntamento).
3. `cv2.imencode('.jpg', img)` comprime la matrice NumPy in un buffer binario JPEG.
4. Il buffer viene inviato al browser del client tramite la risposta multipart HTTP, aggiornando l'immagine in streaming live.

---

## 🔄 4. Le Modalità di Computer Vision Integrati (`CVThread`)

Il robot supporta tre modalità visive avanzate:

1. **`findColor` (Inseguimento Cromatico)**:
   * Converte il frame nello spazio colore **HSV** (`cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)`).
   * Applica una maschera d'intervallo con `cv2.inRange(hsv, colorLower, colorUpper)` per isolare il colore desiderato (es. pallina verde o rossa).
   * Trova il cerchio minimo di contenimento e calcola l'errore di posizione `(X, Y)` rispetto al centro dello schermo.
   * Utilizza il **Filtro di Kalman** per muovere i servomotori del Pan-Tilt e mantenere l'oggetto al centro della visuale.

2. **`findlineCV` (Seguipista Visivo)**:
   * Converte l'immagine in scala di grigi e applica una soglia binaria (`cv2.threshold`).
   * Analizza due righe orizzontali di pixel (`linePos_1` e `linePos_2`) per individuare la posizione della linea nera/bianca sul pavimento.
   * Invia comandi di sterzata ai motori DC per seguire il percorso.

3. **`watchDog` (Rilevamento Movimento / Surveillance)**:
   * Mantiene un modello di sfondo dinamico calcolando la media ponderata (`cv2.accumulateWeighted`).
   * Calcola la differenza assoluta tra il frame corrente e lo sfondo (`cv2.absdiff`).
   * Se rileva variazioni significative di contorno, traccia un rettangolo di allarme sul soggetto in movimento.

---

## 💻 5. Come funziona il Mock Software e il Test (`test_passo_6.py`)

Per consentire l'esecuzione e il collaudo del server del robot su sistemi PC/Mac privi della fotocamera hardware e delle librerie C++ di Raspberry Pi:

1. **Creazione dei Moduli Mock in `mock_hardware/`**:
   * [libcamera.py](../../mock_hardware/libcamera.py): simula le classi `Transform` e `ColorSpace`.
   * [picamera2.py](../../mock_hardware/picamera2.py): simula la classe `Picamera2`. Se è disponibile una webcam di sistema la ingloba via OpenCV, altrimenti genera un **frame sintetico di test dinamico** con informazioni visive e un target colorato per i test.

2. **Verifica tramite lo Script di Test [test_passo_6.py](../test_passo_6.py)**:
   * Verifichiamo la cattura diretta dei frame NumPy da `Picamera2`.
   * Testiamo l'integrazione con [camera_opencv.py](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Server/Server_OrdinaryWheels/camera_opencv.py) assicurandoci che la generazione di frame JPEG funzioni correttamente.
   * Verifichiamo i cambi di modalità visiva in `CVThread`.
