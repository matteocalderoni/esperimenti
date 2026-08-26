# core/network.py
from socket import *
import threading as thread
import time
import json
import config.settings as settings

def send_command(cmd):
    """Invia un comando stringa al server robot."""
    if settings.tcpClicSock:
        try:
            settings.tcpClicSock.send(cmd.encode())
        except Exception as e:
            print(f"Errore nell'invio del comando '{cmd}': {e}")

def info_receive_loop(sock):
    """Loop periodico per richiedere info sulla CPU ogni 3 secondi."""
    while True:
        try:
            sock.send('get_info'.encode())
            time.sleep(3)
        except:
            break

def connection_loop(sock, callbacks):
    """Loop di ricezione dati dal socket TCP del robot."""
    while True:
        try:
            car_info = (sock.recv(settings.BUFSIZ)).decode()
            if not car_info:
                continue
            
            print("car_info:", car_info)
            
            if "get_info" in car_info:
                try:
                    cpu_info = json.loads(car_info)['data']
                    if 'info' in callbacks:
                        callbacks['info'](cpu_info[0], cpu_info[1], cpu_info[2])
                except Exception as e:
                    print('get_info json error:', e)
                    
            elif 'Switch_' in car_info:
                parts = car_info.split('_')
                if len(parts) >= 3:
                    port = int(parts[1])
                    state = parts[2].strip() == 'on'
                    if 'switch' in callbacks:
                        callbacks['switch'](port, state)
                        
            elif 'scanResult' in car_info:
                try:
                    scanResult = json.loads(car_info)['data']
                    if 'radar' in callbacks:
                        callbacks['radar'](scanResult)
                except Exception as e:
                    print('scanResult json error:', e)
                    
            elif 'stopCV' in car_info:
                if 'function' in callbacks:
                    callbacks['function']('stopCV', False)
                    
            elif car_info in ['scan', 'findColor', 'motionGet', 'police', 'automatic', 'trackLine', 'Speech', 'trackLight', 'keepDistance']:
                if 'function' in callbacks:
                    callbacks['function'](car_info, True)
                    
            elif 'CVFL_on' in car_info:
                if 'function' in callbacks:
                    callbacks['function']('CVFL', True)
                    
            elif 'CVFL_off' in car_info:
                if 'function' in callbacks:
                    callbacks['function']('CVFL', False)
                    
            elif 'OSD' in car_info:
                OSD_info = car_info.split()
                try:
                    settings.OSD_X = float(OSD_info[1])
                    settings.OSD_Y = float(OSD_info[2])
                except:
                    pass
        except Exception as e:
            print("Connessione interrotta o errore:", e)
            if 'connection' in callbacks:
                callbacks['connection']('Disconnected', '#F44336')
            break

def socket_connect(ip_address, callbacks):
    """Effettua il tentativo di connessione socket TCP (fino a 5 tentativi)."""
    SERVER_IP = ip_address
    SERVER_PORT = 10223
    ADDR = (SERVER_IP, SERVER_PORT)
    
    settings.tcpClicSock = socket(AF_INET, SOCK_STREAM)
    
    for i in range(1, 6):
        if settings.ip_stu == 1:
            print(f"Connecting to server @ {SERVER_IP}:{SERVER_PORT} (Try {i}/5)...")
            if 'connection' in callbacks:
                callbacks['connection'](f"Connecting {i}/5", '#FF8F00')
            try:
                settings.tcpClicSock.connect(ADDR)
                print("Connected!")
                
                settings.ip_stu = 0 # 0 = Connesso
                settings.save_ip(SERVER_IP)
                
                if 'connection' in callbacks:
                    callbacks['connection']('Connected', '#558B2F')
                    
                # Avvia i thread di ascolto e polling
                conn_thread = thread.Thread(target=connection_loop, args=(settings.tcpClicSock, callbacks))
                conn_thread.setDaemon(True)
                conn_thread.start()
                
                info_thread = thread.Thread(target=info_receive_loop, args=(settings.tcpClicSock,))
                info_thread.setDaemon(True)
                info_thread.start()
                
                # Ritorna successo
                return True
            except Exception as e:
                print(f"Connessione fallita tentativo {i}: {e}")
                time.sleep(1)
                
    # Se arriviamo qui, tutti i tentativi sono falliti
    settings.ip_stu = 1
    if 'connection' in callbacks:
        callbacks['connection']('Disconnected', '#F44336')
    return False
