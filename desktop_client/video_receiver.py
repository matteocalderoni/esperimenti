# video_receiver.py
import cv2
import zmq
import base64
import numpy as np
import sys

def main():
    context = zmq.Context()
    footage_socket = context.socket(zmq.PAIR)
    
    try:
        footage_socket.bind('tcp://*:5555')
    except Exception as e:
        print(f"Errore di binding della porta video 5555: {e}")
        sys.exit(1)
        
    cv2.namedWindow('Stream', flags=cv2.WINDOW_NORMAL | cv2.WINDOW_KEEPRATIO)
    cv2.resizeWindow('Stream', width=640, height=480)
    
    print("Ricevitore video in ascolto sulla porta 5555...")
    
    while True:
        try:
            frame = footage_socket.recv_string()
            img = base64.b64decode(frame)
            npimg = np.frombuffer(img, dtype=np.uint8)
            source = cv2.imdecode(npimg, 1)
            
            if source is not None:
                cv2.imshow("Stream", source)
            
            # Controlla la chiusura della finestra premendo 'q' o tasto di chiusura window
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q') or cv2.getWindowProperty('Stream', cv2.WND_PROP_VISIBLE) < 1:
                break
        except KeyboardInterrupt:
            break
        except Exception as e:
            print("Errore ricezione frame:", e)
            
    cv2.destroyAllWindows()
    footage_socket.close()
    context.term()

if __name__ == '__main__':
    main()
