import subprocess
import sys
import os
import config.settings as settings

video_process = None

def start_video_stream():
    """Avvia il ricevitore video come processo separato per compatibilità GUI thread-safe."""
    global video_process
    
    # Percorso del file video_receiver.py relativo a questo script
    script_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    receiver_path = os.path.join(script_dir, "video_receiver.py")
    
    if video_process is None or video_process.poll() is not None:
        try:
            target_ip = getattr(settings, 'target_ip', '127.0.0.1')
            print(f"Avvio del flusso video per {target_ip} in un processo separato...")
            video_process = subprocess.Popen([sys.executable, receiver_path, target_ip])
        except Exception as e:
            print(f"Impossibile avviare il flusso video: {e}")

def stop_video_stream():
    """Ferma il processo del ricevitore video se è in esecuzione."""
    global video_process
    if video_process and video_process.poll() is None:
        video_process.terminate()
        video_process = None
        print("Processo video terminato.")
