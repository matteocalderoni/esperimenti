# core/network.py
from socket import *
import threading as thread
import time
import json
import config.settings as settings

def send_command(cmd):
    """Invia un comando stringa al server robot con terminatore di riga."""
    if settings.tcpClicSock:
        try:
            payload = cmd if cmd.endswith('\n') else cmd + '\n'
            settings.tcpClicSock.sendall(payload.encode('utf-8'))
        except Exception as e:
            print(f"Errore nell'invio del comando '{cmd}': {e}")

def info_receive_loop(sock):
    """Loop periodico per richiedere info sulla CPU ogni 3 secondi."""
    while True:
        try:
            sock.sendall(b'get_info\n')
            time.sleep(3)
        except Exception:
            break

def process_message(msg, callbacks):
    """Elabora un messaggio ricevuto dal server (dizionario JSON o stringa legacy)."""
    if isinstance(msg, dict):
        title = msg.get('title', '')
        data = msg.get('data')
        
        if title == 'get_info':
            if 'info' in callbacks and isinstance(data, (list, tuple)) and len(data) >= 3:
                callbacks['info'](data[0], data[1], data[2])
        elif title == 'scanResult':
            if 'radar' in callbacks and data is not None:
                callbacks['radar'](data)
            if 'function' in callbacks:
                callbacks['function']('scan', False)
        elif title.startswith('Switch_'):
            parts = title.split('_')
            if len(parts) >= 3:
                port = int(parts[1])
                state = (parts[2] == 'on')
                setattr(settings, f"Switch_{port}", 1 if state else 0)
                if 'switch' in callbacks:
                    callbacks['switch'](port, state)
        elif title == 'stopCV':
            if 'function' in callbacks:
                callbacks['function']('stopCV', False)
        elif title == 'CVFL_on':
            if 'function' in callbacks:
                callbacks['function']('CVFL', True)
        elif title == 'CVFL_off':
            if 'function' in callbacks:
                callbacks['function']('CVFL', False)
        elif title in ['scan', 'findColor', 'motionGet', 'police', 'automatic', 'trackLine', 'start_slam', 'vlmTour', 'keepDistance']:
            if 'function' in callbacks:
                callbacks['function'](title, True)
        elif title in ['automaticOff', 'policeOff', 'trackLineOff', 'explorationOff', 'inspectionTourOff', 'keepDistanceOff']:
            if 'function' in callbacks:
                callbacks['function']('stopCV', False)

    elif isinstance(msg, str):
        car_info = msg.strip()
        if not car_info:
            return
        if 'get_info' in car_info:
            try:
                cpu_info = json.loads(car_info)['data']
                if 'info' in callbacks:
                    callbacks['info'](cpu_info[0], cpu_info[1], cpu_info[2])
            except Exception:
                pass
        elif 'scanResult' in car_info:
            try:
                scanResult = json.loads(car_info)['data']
                if 'radar' in callbacks:
                    callbacks['radar'](scanResult)
                if 'function' in callbacks:
                    callbacks['function']('scan', False)
            except Exception:
                pass
        elif 'Switch_' in car_info:
            parts = car_info.split('_')
            if len(parts) >= 3:
                try:
                    port = int(parts[1])
                    state = (parts[2].strip() == 'on')
                    setattr(settings, f"Switch_{port}", 1 if state else 0)
                    if 'switch' in callbacks:
                        callbacks['switch'](port, state)
                except Exception:
                    pass
        elif 'FindColor' in car_info or car_info == 'findColor':
            if 'function' in callbacks:
                callbacks['function']('findColor', True)
        elif 'WatchDog' in car_info or car_info == 'motionGet':
            if 'function' in callbacks:
                callbacks['function']('motionGet', True)
        elif 'stopCV' in car_info:
            if 'function' in callbacks:
                callbacks['function']('stopCV', False)
        elif car_info in ['scan', 'police', 'automatic', 'trackLine', 'Speech', 'trackLight', 'keepDistance', 'start_slam', 'vlmTour']:
            if 'function' in callbacks:
                callbacks['function'](car_info, True)
        elif 'CVFL_on' in car_info:
            if 'function' in callbacks:
                callbacks['function']('CVFL', True)
        elif 'CVFL_off' in car_info:
            if 'function' in callbacks:
                callbacks['function']('CVFL', False)

def connection_loop(sock, callbacks):
    """Loop di ricezione dati dal socket TCP con buffering robusto."""
    decoder = json.JSONDecoder()
    buf = ""
    while True:
        try:
            raw_bytes = sock.recv(getattr(settings, 'BUFSIZ', 65536))
            if not raw_bytes:
                print("⚠️ [TCP CLIENT] Connessione chiusa dal server.")
                settings.ip_stu = 1
                if 'connection' in callbacks:
                    callbacks['connection']('Disconnesso', '#F44336')
                break
                
            buf += raw_bytes.decode('utf-8', errors='ignore')
            while buf:
                buf = buf.lstrip()
                if not buf:
                    break
                if buf.startswith('{'):
                    try:
                        obj, idx = decoder.raw_decode(buf)
                        buf = buf[idx:]
                        process_message(obj, callbacks)
                        continue
                    except json.JSONDecodeError:
                        break  # Incompleto, attendi i prossimi byte
                else:
                    nl_idx = buf.find('\n')
                    if nl_idx != -1:
                        line = buf[:nl_idx].strip()
                        buf = buf[nl_idx+1:]
                        if line:
                            process_message(line, callbacks)
                    elif '{' in buf:
                        idx = buf.find('{')
                        line = buf[:idx].strip()
                        buf = buf[idx:]
                        if line:
                            process_message(line, callbacks)
                    else:
                        if len(buf) > 100:
                            process_message(buf.strip(), callbacks)
                            buf = ""
                        break
        except Exception as e:
            print("Connessione interrotta o errore:", e)
            settings.ip_stu = 1
            if 'connection' in callbacks:
                callbacks['connection']('Disconnesso', '#F44336')
            break

connection_lock = thread.Lock()

def socket_connect(ip_address, callbacks):
    """Effettua il tentativo di connessione socket TCP (fino a 5 tentativi)."""
    if not connection_lock.acquire(blocking=False):
        print("⚠️ Connessione già in corso, tentativo ignorato.")
        return False

    try:
        if settings.ip_stu == 0:
            print("ℹ️ Già connesso al server.")
            return True

        SERVER_IP = ip_address
        SERVER_PORT = 10223
        ADDR = (SERVER_IP, SERVER_PORT)
        
        settings.ip_stu = 1
        
        for i in range(1, 6):
            print(f"Connessione al server @ {SERVER_IP}:{SERVER_PORT} (Tentativo {i}/5)...")
            if 'connection' in callbacks:
                callbacks['connection'](f"Connessione {i}/5", '#FF8F00')
            try:
                sock = socket(AF_INET, SOCK_STREAM)
                sock.settimeout(3.0)
                sock.connect(ADDR)
                sock.settimeout(None)
                settings.tcpClicSock = sock
                print("Connesso con successo!")
                
                settings.ip_stu = 0 # 0 = Connesso
                settings.save_ip(SERVER_IP)
                
                if 'connection' in callbacks:
                    callbacks['connection']('Connesso', '#558B2F')
                    
                conn_thread = thread.Thread(target=connection_loop, args=(settings.tcpClicSock, callbacks))
                conn_thread.setDaemon(True)
                conn_thread.start()
                
                info_thread = thread.Thread(target=info_receive_loop, args=(settings.tcpClicSock,))
                info_thread.setDaemon(True)
                info_thread.start()
                
                return True
            except Exception as e:
                print(f"Connessione fallita tentativo {i}: {e}")
                time.sleep(0.5)
                    
        settings.ip_stu = 1
        if 'connection' in callbacks:
            callbacks['connection']('Disconnesso', '#F44336')
        return False
    finally:
        connection_lock.release()
