# config/settings.py
import os

# Stati Globali del Robot
DS_stu = 0
TS_stu = 0
Switch_3 = 0
Switch_2 = 0
Switch_1 = 0
PT_stu = 0
UD_stu = 0
HA_stu = 0
GA_stu = 0
servo_stu = 0
function_stu = 0
speed = 100
ip_stu = 1  # 1 = Disconnesso, 0 = Connesso

# Colori UI
color_bg = '#000000'
color_text = '#E1F5FE'
color_btn = '#0277BD'
color_btn_text = '#000000'  # Nero per massimo contrasto sui pulsanti bianchi di macOS
color_line = '#01579B'
color_can = '#212121'
color_oval = '#2196F3'
target_color = '#FF6D00'

# Socket di comunicazione globale
tcpClicSock = None
BUFSIZ = 1024

# File per memorizzare l'IP
IP_FILE = os.path.join(os.path.dirname(__file__), "IP.txt")

def save_ip(ip_address):
    """Salva l'IP nel file di configurazione."""
    try:
        with open(IP_FILE, "w") as f:
            f.write(str(ip_address).strip())
    except Exception as e:
        print(f"Errore nel salvataggio dell'IP: {e}")

def load_ip():
    """Carica l'IP salvato o restituisce un IP di default."""
    if os.path.exists(IP_FILE):
        try:
            with open(IP_FILE, "r") as f:
                ip = f.read().strip()
                if ip:
                    return ip
        except Exception as e:
            print(f"Errore nella lettura dell'IP: {e}")
    return "192.168.1.1"  # Default fallback
