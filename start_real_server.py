#!/usr/bin/env python3
# start_real_server.py
import subprocess
import os
import sys

# Determina i percorsi assoluti del progetto
base_dir = os.path.dirname(os.path.realpath(__file__))
venv_python = os.path.join(base_dir, 'venv', 'bin', 'python')

# Se il venv locale esiste, lo usiamo, altrimenti usiamo il python3 di sistema
# (utile se eseguito direttamente sul Raspberry Pi dove potrebbe non esserci il venv del Mac)
python_bin = venv_python if os.path.exists(venv_python) else 'python3'

print(f"🔌 [REALE] Avvio del Server del Robot con hardware reale ({python_bin})...")
print("⚠️ NOTA: Questo comando deve essere lanciato sul Raspberry Pi reale per funzionare con i chip fisici.")

# Avvia il server reale (senza impostare il mock hardware PYTHONPATH!)
server_proc = subprocess.Popen(
    [python_bin, 'WebServer.py'],
    cwd=os.path.join(base_dir, 'robot_server')
)

try:
    server_proc.wait()
except KeyboardInterrupt:
    print("\n🛑 Spegnimento del Server Robot...")
    server_proc.terminate()
    server_proc.wait()
    print("👋 Server arrestato.")
