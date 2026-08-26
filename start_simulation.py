#!/usr/bin/env python3
# start_simulation.py
import subprocess
import time
import os
import sys

# Determina i percorsi assoluti del progetto
base_dir = os.path.dirname(os.path.realpath(__file__))
venv_python = os.path.join(base_dir, 'venv', 'bin', 'python')

if not os.path.exists(venv_python):
    print("❌ Errore: Ambiente virtuale 'venv' non trovato.")
    print("Esegui prima la creazione dell'ambiente.")
    sys.exit(1)

print("🚀 [SIMULAZIONE] Avvio del Server Robot (Mock Hardware)...")

# Configura l'ambiente per il server con il path del mock hardware
server_env = os.environ.copy()
server_env['PYTHONPATH'] = os.path.join(base_dir, 'mock_hardware')

# Avvia il server in background
server_proc = subprocess.Popen(
    [venv_python, 'WebServer.py'],
    cwd=os.path.join(base_dir, 'robot_server'),
    env=server_env
)

# Attende 2 secondi per permettere al server Flask e WS di inizializzarsi
time.sleep(2)

print("🎮 Avvio del Telecomando Desktop (Client)...")

# Avvia il client grafico in primo piano
client_proc = subprocess.Popen(
    [venv_python, 'main.py'],
    cwd=os.path.join(base_dir, 'desktop_client')
)

try:
    # Rimane in attesa finché l'utente non chiude la finestra del telecomando
    client_proc.wait()
finally:
    # Alla chiusura del telecomando, arresta automaticamente il server in background
    print("\n🛑 Spegnimento automatico del Server Robot (Mock)...")
    server_proc.terminate()
    try:
        server_proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        server_proc.kill()
    print("👋 Chiusura simulazione completata. Arrivederci!")
