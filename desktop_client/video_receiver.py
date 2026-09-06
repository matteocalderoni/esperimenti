# video_receiver.py
import cv2
import sys
import time

def run_http_stream(url):
    """Connette al flusso video MJPEG HTTP (WebServer.py / Simulatore)."""
    cap = cv2.VideoCapture(url)
    if not cap.isOpened():
        return False
        
    cv2.namedWindow('Adeept Smart Car Stream', flags=cv2.WINDOW_NORMAL | cv2.WINDOW_KEEPRATIO)
    cv2.resizeWindow('Adeept Smart Car Stream', width=640, height=480)
    print(f"Flusso video HTTP connesso a {url}")
    
    consecutive_fails = 0
    while True:
        ret, frame = cap.read()
        if ret and frame is not None:
            cv2.imshow('Adeept Smart Car Stream', frame)
            consecutive_fails = 0
        else:
            consecutive_fails += 1
            if consecutive_fails > 25:
                print("Segnale video HTTP terminato.")
                break
            time.sleep(0.05)
            
        key = cv2.waitKey(1) & 0xFF
        if key == ord('q'):
            break
        try:
            if cv2.getWindowProperty('Adeept Smart Car Stream', cv2.WND_PROP_VISIBLE) < 1:
                break
        except Exception:
            pass
            
    cap.release()
    cv2.destroyAllWindows()
    return True

def run_zmq_stream():
    """Connette al flusso video ZMQ (server legacy GUIServer.py su porta 5555)."""
    try:
        import zmq
        import base64
        import numpy as np
    except ImportError:
        print("Libreria pyzmq o numpy non disponibile per il fallback legacy.")
        return False

    context = zmq.Context()
    footage_socket = context.socket(zmq.PAIR)
    try:
        footage_socket.bind('tcp://*:5555')
    except Exception as e:
        print(f"Errore di binding della porta video ZMQ 5555: {e}")
        return False
        
    cv2.namedWindow('Adeept Smart Car Stream', flags=cv2.WINDOW_NORMAL | cv2.WINDOW_KEEPRATIO)
    cv2.resizeWindow('Adeept Smart Car Stream', width=640, height=480)
    print("Flusso video ZMQ in ascolto sulla porta 5555...")
    
    while True:
        try:
            frame_str = footage_socket.recv_string(flags=0)
            img = base64.b64decode(frame_str)
            npimg = np.frombuffer(img, dtype=np.uint8)
            source = cv2.imdecode(npimg, 1)
            if source is not None:
                cv2.imshow('Adeept Smart Car Stream', source)
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                break
            try:
                if cv2.getWindowProperty('Adeept Smart Car Stream', cv2.WND_PROP_VISIBLE) < 1:
                    break
            except Exception:
                pass
        except KeyboardInterrupt:
            break
        except Exception as e:
            print("Errore ricezione frame ZMQ:", e)
            break
            
    cv2.destroyAllWindows()
    footage_socket.close()
    context.term()
    return True

def main():
    target_ip = sys.argv[1] if len(sys.argv) > 1 else '127.0.0.1'
    http_url = f"http://{target_ip}:5000/video_feed"
    
    # Prova prima lo streaming HTTP (standard moderno per simulazione e server reale)
    success = run_http_stream(http_url)
    if not success:
        print("HTTP stream non raggiungibile, tentativo di fallback con ZMQ...")
        run_zmq_stream()

if __name__ == '__main__':
    main()
