# core/video_stream.py
import subprocess
import sys
import os

video_process = None

def start_video_stream():
    """Avvia il ricevitore video come processo separato per compatibilità GUI thread-safe."""
    global video_process
    
    # Percorso del file video_receiver.py relativo a questo script
    script_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    receiver_path = os.path.join(script_dir, "video_receiver.py")
    
    if video_process is None or video_process.poll() is not None:
        try:
            print("Avvio del flusso video in un processo separato...")
            # Usiamo sys.executable per garantire l'uso dello stesso interprete Python
            video_process = subprocess.Popen([sys.executable, receiver_path],
                                             stdout=subprocess.PIPE,
                                             stderr=subprocess.PIPE)
        except Exception as e:
            print(f"Impossibile avviare il flusso video: {e}")

def stop_video_stream():
    """Ferma il processo del ricevitore video se è in esecuzione."""
    global video_process
    if video_process and video_process.poll() is None:
        video_process.terminate()
        video_process = None
        print("Processo video terminato.")
