# main.py
import tkinter as tk
import os
import sys

# Aggiunge la directory corrente al sys.path per garantire import corretti da qualsiasi punto
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import config.settings as settings
import core.network as network
import core.video_stream as video_stream
from ui.components import InfoPanel, ControlPanel, SensorPanel, SliderPanel, FeaturePanel
import utils.helpers as helpers

# Pannelli UI globali
info_panel = None
slider_panel = None
feature_panel = None
sensor_panel = None

def on_connect(ip_address):
    """Callback invocata al click sul pulsante Connect."""
    if not ip_address:
        ip_address = settings.load_ip()
        
    callbacks = {
        'info': lambda temp, usage, ram: info_panel.update_info(temp, usage, ram),
        'switch': lambda num, state: feature_panel.update_switch_color(num, state),
        'radar': lambda data: sensor_panel.update_radar(data),
        'function': on_function_changed,
        'connection': on_connection_status
    }
    
    # Avvia la connessione in un thread separato per evitare freeze della UI
    import threading as thread
    connect_thread = thread.Thread(target=network.socket_connect, args=(ip_address, callbacks))
    connect_thread.setDaemon(True)
    connect_thread.start()

def on_function_changed(name, active):
    """Riceve aggiornamenti sullo stato delle funzioni (es. OpenCV, Tracking)."""
    feature_panel.update_func_color(name, active)
    if name == 'CVFL' or name == 'stopCV':
        slider_panel.update_cvfl_button_color(active if name != 'stopCV' else False)

def on_connection_status(text, bg_color):
    """Gestisce l'evento di connessione/disconnessione."""
    info_panel.update_status(text, bg_color)
    if text == 'Connected':
        # Avvia il ricevitore video se connesso
        video_stream.start_video_stream()
    else:
        # Ferma il ricevitore video se disconnesso
        video_stream.stop_video_stream()

def main():
    global info_panel, slider_panel, feature_panel, sensor_panel
    
    root = tk.Tk()
    root.title('4WD_Smart_Car (Modular)')
    root.geometry('1020x650')
    root.resizable(False, False)
    root.config(bg=settings.color_bg)
    
    # Frame di background per forzare il colore nero su macOS
    bg_frame = tk.Frame(root, bg=settings.color_bg)
    bg_frame.place(x=0, y=0, relwidth=1, relheight=1)
    
    # Caricamento del logo (opzionale)
    logo_path = os.path.join(os.path.dirname(__file__), "logo.png")
    if os.path.exists(logo_path):
        try:
            logo = tk.PhotoImage(file=logo_path)
            l_logo = tk.Label(bg_frame, image=logo, bg=settings.color_bg)
            l_logo.place(x=30, y=13)
        except Exception as e:
            print("Logo load error:", e)

    # Inizializzazione Pannelli UI (usando bg_frame invece di root come parent)
    info_panel = InfoPanel(bg_frame, x=20, y=15, width=980, height=95, connect_callback=on_connect)
    
    ControlPanel(bg_frame, motor_x=20, motor_y=125, servo_x=380, servo_y=125, send_callback=network.send_command)
    
    sensor_panel = SensorPanel(bg_frame, x=20, y=350)
    
    slider_panel = SliderPanel(bg_frame, fl_x=720, fl_y=125, fc_x=720, fc_y=295,
                               send_callback=network.send_command,
                               rgb_to_hsv_callback=helpers.rgb_to_hsv,
                               hex_color_callback=helpers.RGB_to_Hex)
                               
    feature_panel = FeaturePanel(bg_frame, func_x=380, func_y=350, pwm_x=720, pwm_y=465,
                                 send_callback=network.send_command)

    # Assicura la chiusura pulita dei processi figli
    def on_close():
        video_stream.stop_video_stream()
        root.destroy()
        sys.exit(0)

    root.protocol("WM_DELETE_WINDOW", on_close)
    
    # Avvia loop principale Tkinter
    root.mainloop()

if __name__ == '__main__':
    main()
