# ui/feature_panel.py
import tkinter as tk
import config.settings as settings

class FeaturePanel:
    def __init__(self, parent, func_x, func_y, pwm_x, pwm_y, send_callback):
        self.parent = parent
        self.root = parent.winfo_toplevel()
        self.send = send_callback
        
        self.func_buttons = {}
        self.sw_buttons = {}
        self.active_func_name = None
        
        # Crea le due schede container
        self.card_auto = tk.LabelFrame(parent, text=" Automazioni & IA ", bg='#121212', fg='#29B6F6', bd=1, relief='solid', font=('Helvetica', 10, 'bold'))
        self.card_auto.place(x=func_x, y=func_y, width=320, height=280)
        
        self.card_pwm = tk.LabelFrame(parent, text=" Configurazione & Porte ", bg='#121212', fg='#29B6F6', bd=1, relief='solid', font=('Helvetica', 10, 'bold'))
        self.card_pwm.place(x=pwm_x, y=pwm_y, width=280, height=165)
        
        self.build_function_buttons(0, 0)
        self.build_switch_buttons(0, 0)
        self.build_config_buttons(0, 0)

    def build_function_buttons(self, x, y):
        # Mappa dei comandi on/off associati a ciascun pulsante funzione
        funcs = {
            'Radar Scan': ('scan', 'stopCV'),
            'Evitamento': ('automatic', 'automaticOff'),
            'Trova Colore': ('findColor', 'stopCV'),
            'Segui Linea': ('trackLine', 'trackLineOff'),
            'Rilevamento': ('motionGet', 'stopCV'),
            'Mappa SLAM': ('start_slam', 'stopCV'),
            'Lampeggiante': ('police', 'policeOff'),
            'Tour VLM': ('vlmTour', 'stopCV')
        }

        def on_func_press(name, on_cmd, off_cmd):
            if self.active_func_name == name:
                # Disattiva la funzione corrente se cliccata di nuovo
                self.send(off_cmd)
                self.active_func_name = None
                self.func_buttons[name].config(bg=settings.color_btn)
            else:
                # Spegne la funzione precedente
                if self.active_func_name and self.active_func_name in funcs:
                    prev_off = funcs[self.active_func_name][1]
                    self.send(prev_off)
                    self.func_buttons[self.active_func_name].config(bg=settings.color_btn)
                
                # Attiva la nuova funzione selezionata
                self.send(on_cmd)
                self.active_func_name = name
                self.func_buttons[name].config(bg='#4CAF50')

        # Dispone i pulsanti in due colonne ordinate da 4 righe ciascuna
        for i, (name, (on_cmd, off_cmd)) in enumerate(funcs.items()):
            col = i // 4
            row = i % 4
            px = x + 20 + (col * 150)
            py = y + 25 + (row * 48)
            
            btn = tk.Button(self.card_auto, width=11, text=name, fg=settings.color_btn_text, bg=settings.color_btn, relief='ridge')
            btn.place(x=px, y=py)
            btn.bind('<ButtonPress-1>', lambda e, n=name, on=on_cmd, off=off_cmd: on_func_press(n, on, off))
            self.func_buttons[name] = btn

        # Pulsante dedicato View Blueprint CAD
        btn_bp = tk.Button(self.card_auto, width=28, text='📐 Apri Blueprint CAD', fg='#000000', bg='#00F2FE', relief='ridge', font=('Helvetica', 9, 'bold'))
        btn_bp.place(x=x + 20, y=y + 225)
        btn_bp.bind('<ButtonPress-1>', lambda e: self.open_blueprint())

    def open_blueprint(self):
        import webbrowser
        ip = getattr(settings, 'target_ip', '127.0.0.1')
        webbrowser.open(f"http://{ip}:5000/blueprint")

    def build_switch_buttons(self, x, y):
        def on_switch_press(num):
            var_name = f"Switch_{num}"
            current_val = getattr(settings, var_name)
            if current_val == 0:
                self.send(f"Switch_{num}_on")
                setattr(settings, var_name, 1)
            else:
                self.send(f"Switch_{num}_off")
                setattr(settings, var_name, 0)

        # Label per le porte
        lbl_ports = tk.Label(self.card_pwm, text='Porte:', fg=settings.color_text, bg='#121212')
        lbl_ports.place(x=x+15, y=y+15)

        for i in range(1, 4):
            btn = tk.Button(self.card_pwm, width=6, text=f'Porta {i}', fg=settings.color_btn_text, bg=settings.color_btn, relief='ridge')
            btn.place(x=x + 65 + ((i-1) * 65), y=y+10)
            btn.bind('<ButtonPress-1>', lambda e, n=i: on_switch_press(n))
            self.sw_buttons[i] = btn

    def build_config_buttons(self, x, y):
        # Disposizione compatta per la taratura PWM
        lbl_pwm0 = tk.Label(self.card_pwm, text='PWM0:', fg=settings.color_text, bg='#121212')
        lbl_pwm0.place(x=x+15, y=y+50)
        
        btn_l0 = tk.Button(self.card_pwm, width=4, text='<', fg=settings.color_btn_text, bg=settings.color_btn, relief='ridge')
        btn_l0.place(x=x+65, y=y+45)
        btn_l0.bind('<ButtonPress-1>', lambda e: self.send('SiLeft 0'))

        btn_m0 = tk.Button(self.card_pwm, width=6, text='Set', fg=settings.color_btn_text, bg=settings.color_btn, relief='ridge')
        btn_m0.place(x=x+115, y=y+45)
        btn_m0.bind('<ButtonPress-1>', lambda e: self.send('PWMMS 0'))

        btn_r0 = tk.Button(self.card_pwm, width=4, text='>', fg=settings.color_btn_text, bg=settings.color_btn, relief='ridge')
        btn_r0.place(x=x+180, y=y+45)
        btn_r0.bind('<ButtonPress-1>', lambda e: self.send('SiRight 0'))

        lbl_pwm1 = tk.Label(self.card_pwm, text='PWM1:', fg=settings.color_text, bg='#121212')
        lbl_pwm1.place(x=x+15, y=y+85)

        btn_l1 = tk.Button(self.card_pwm, width=4, text='<', fg=settings.color_btn_text, bg=settings.color_btn, relief='ridge')
        btn_l1.place(x=x+65, y=y+80)
        btn_l1.bind('<ButtonPress-1>', lambda e: self.send('SiLeft 1'))

        btn_m1 = tk.Button(self.card_pwm, width=6, text='Set', fg=settings.color_btn_text, bg=settings.color_btn, relief='ridge')
        btn_m1.place(x=x+115, y=y+80)
        btn_m1.bind('<ButtonPress-1>', lambda e: self.send('PWMMS 1'))

        btn_r1 = tk.Button(self.card_pwm, width=4, text='>', fg=settings.color_btn_text, bg=settings.color_btn, relief='ridge')
        btn_r1.place(x=x+180, y=y+80)
        btn_r1.bind('<ButtonPress-1>', lambda e: self.send('SiRight 1'))

        btn_init = tk.Button(self.card_pwm, width=12, text='Pos. Iniziale', fg=settings.color_btn_text, bg='#212121', relief='ridge')
        btn_init.place(x=x+15, y=y+120)
        btn_init.bind('<ButtonPress-1>', lambda e: self.send('PWMINIT'))

        btn_def = tk.Button(self.card_pwm, width=12, text='Predefinito', fg=settings.color_btn_text, bg='#212121', relief='ridge')
        btn_def.place(x=x+140, y=y+120)
        btn_def.bind('<ButtonPress-1>', lambda e: self.send('PWMD'))

    def update_func_color(self, name, active):
        """Cambia colore del bottone funzione (verde = attivo, blu = inattivo)."""
        cmd_to_name = {
            'scan': 'Radar Scan', 'findColor': 'Trova Colore', 'motionGet': 'Rilevamento',
            'police': 'Lampeggiante', 'automatic': 'Evitamento', 'trackLine': 'Segui Linea',
            'start_slam': 'Mappa SLAM', 'exploration': 'Mappa SLAM',
            'vlmTour': 'Tour VLM', 'start_vlm_tour': 'Tour VLM'
        }
        btn_name = cmd_to_name.get(name, name)
        
        if btn_name == 'stopCV':
            for bname, btn in self.func_buttons.items():
                btn.config(bg=settings.color_btn)
            self.active_func_name = None
            return

        if btn_name in self.func_buttons:
            if active:
                self.active_func_name = btn_name
                for bname, btn in self.func_buttons.items():
                    btn.config(bg='#4CAF50' if bname == btn_name else settings.color_btn)
            else:
                if self.active_func_name == btn_name:
                    self.active_func_name = None
                self.func_buttons[btn_name].config(bg=settings.color_btn)

    def update_switch_color(self, num, active):
        """Aggiorna il colore del pulsante Switch (verde = attivo, blu = inattivo)."""
        if num in self.sw_buttons:
            self.sw_buttons[num].config(bg='#4CAF50' if active else settings.color_btn)
