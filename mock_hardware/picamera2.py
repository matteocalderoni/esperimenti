# mock_hardware/picamera2.py
import os
import time
import numpy as np
import cv2

# Disattiva popup/warning AVFoundation su macOS se OpenCV tenta l'accesso alla webcam
os.environ["OPENCV_AVFOUNDATION_SKIP_AUTH"] = "1"

class PreviewConfiguration:
    def __init__(self):
        self.size = (640, 480)
        self.format = 'RGB888'
        self.transform = None
        self.colour_space = None
        self.buffer_count = 4
        self.queue = True

class Preview:
    def __init__(self):
        pass

class Picamera2:
    def __init__(self):
        self.preview_configuration = PreviewConfiguration()
        self.is_open = True
        self.running = False
        self._cap = None

        # Se l'utente specifica MOCK_CAMERA_MODE=synthetic, oppure se fallisce l'apertura webcam, usa immagini sintetiche
        use_webcam = os.getenv("MOCK_CAMERA_USE_WEBCAM", "0") == "1"
        if use_webcam:
            try:
                self._cap = cv2.VideoCapture(0)
                if not self._cap.isOpened():
                    self._cap = None
            except Exception:
                self._cap = None

    def start(self):
        self.running = True

    def stop(self):
        self.running = False
        if self._cap is not None and self._cap.isOpened():
            self._cap.release()
            self._cap = None

    def capture_array(self):
        """Restituisce una matrice numpy (frame video) RGB o BGR."""
        if self._cap is not None and self._cap.isOpened():
            ret, frame = self._cap.read()
            if ret and frame is not None:
                frame = cv2.resize(frame, self.preview_configuration.size)
                if self.preview_configuration.format == 'RGB888':
                    return cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                return frame

        # Fallback: Genera un frame sintetico di test a 640x480 pixel
        w, h = self.preview_configuration.size
        img = np.zeros((h, w, 3), dtype=np.uint8)
        # Sfondo animato leggermente in base al tempo per simulare un flusso live
        t_sec = int(time.time()) % 255
        img[:, :, 0] = (40 + t_sec // 4) % 256   # R
        img[:, :, 1] = (80 + t_sec // 2) % 256   # G
        img[:, :, 2] = 120                      # B

        # Disegna informazioni di test sul frame
        timestamp = time.strftime("%H:%M:%S")
        cv2.putText(img, "MOCK PICAMERA2 FRAME", (80, 180), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (255, 255, 255), 2)
        cv2.putText(img, f"Time: {timestamp}", (80, 230), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 128), 2)
        cv2.putText(img, "Adeept 4WD Smart Car Emulation", (80, 280), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (200, 200, 200), 1)

        # Disegna una pallina verde al centro per il test di Color Tracking
        cv2.circle(img, (320, 240), 30, (0, 255, 0), -1)

        if self.preview_configuration.format == 'RGB888':
            return img
        return cv2.cvtColor(img, cv2.COLOR_RGB2BGR)

    def capture_file(self, stream, format='jpeg'):
        """Cattura un frame e lo scrive nel buffer stream (BytesIO)."""
        arr = self.capture_array()
        if self.preview_configuration.format == 'RGB888':
            arr = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR)
        _, encoded = cv2.imencode('.jpg', arr)
        stream.write(encoded.tobytes())

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, _exc_type, _exc_val, _exc_tb):
        self.stop()
