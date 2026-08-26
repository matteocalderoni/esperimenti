#!/usr/bin/env python3
# start_client.py
import subprocess
import os
import sys

# Determina i percorsi assoluti del progetto
base_dir = os.path.dirname(os.path.realpath(__file__))
venv_python = os.path.join(base_dir, 'venv', 'bin', 'python')

if not os.path.exists(venv_python):
    print("❌ Errore: Ambiente virtuale 'venv' non trovato.")
    sys.exit(1)

print("🎮 Avvio del Telecomando Desktop (Client)...")
print("👉 Inserisci l'IP della macchina reale (es. 192.168.1.XX) per controllarla via Wi-Fi,")
print("   oppure 127.0.0.1 per controllare la simulazione locale se già avviata.")

# Avvia il client grafico in primo piano
client_proc = subprocess.Popen(
    [venv_python, 'main.py'],
    cwd=os.path.join(base_dir, 'desktop_client')
)

try:
    client_proc.wait()
except KeyboardInterrupt:
    client_proc.terminate()
    print("\n👋 Client chiuso.")
