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
        
        # Crea le due schede container
        self.card_auto = tk.LabelFrame(parent, text=" Automations & AI ", bg='#121212', fg='#29B6F6', bd=1, relief='solid', font=('Helvetica', 10, 'bold'))
        self.card_auto.place(x=func_x, y=func_y, width=320, height=280)
        
        self.card_pwm = tk.LabelFrame(parent, text=" System Config & Ports ", bg='#121212', fg='#29B6F6', bd=1, relief='solid', font=('Helvetica', 10, 'bold'))
        self.card_pwm.place(x=pwm_x, y=pwm_y, width=280, height=165)
        
        self.build_function_buttons(0, 0)
        self.build_switch_buttons(0, 0)
        self.build_config_buttons(0, 0)

    def build_function_buttons(self, x, y):
        # Mappa dei comandi on/off associati a ciascun pulsante funzione
        funcs = {
            'RadarScan': ('scan', 'stopCV'),
            'FindColor': ('findColor', 'stopCV'),
            'MotionGet': ('motionGet', 'stopCV'),
            'Police': ('police', 'policeOff'),
            'Automatic': ('automatic', 'automaticOff'),
            'TrackLine': ('trackLine', 'trackLineOff'),
            'TrackLight': ('trackLight', 'trackLightOff'),
            'KeepDistance': ('keepDistance', 'keepDistanceOff')
        }

        def on_func_press(name, on_cmd, off_cmd):
            # Se la funzione corrente è spenta, la accendiamo
            if settings.function_stu == 0:
                self.send(on_cmd)
                settings.function_stu = 1
            else:
                self.send(off_cmd)
                settings.function_stu = 0

        # Dispone i pulsanti in due colonne ordinate da 4 righe ciascuna
        for i, (name, (on_cmd, off_cmd)) in enumerate(funcs.items()):
            col = i // 4
            row = i % 4
            px = x + 20 + (col * 150)
            py = y + 30 + (row * 50)
            
            btn = tk.Button(self.card_auto, width=11, text=name, fg=settings.color_btn_text, bg=settings.color_btn, relief='ridge')
            btn.place(x=px, y=py)
            btn.bind('<ButtonPress-1>', lambda e, n=name, on=on_cmd, off=off_cmd: on_func_press(n, on, off))
            self.func_buttons[name] = btn

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
        lbl_ports = tk.Label(self.card_pwm, text='Ports:', fg=settings.color_text, bg='#121212')
        lbl_ports.place(x=x+15, y=y+15)

        for i in range(1, 4):
            btn = tk.Button(self.card_pwm, width=6, text=f'Port {i}', fg=settings.color_btn_text, bg=settings.color_btn, relief='ridge')
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

        btn_init = tk.Button(self.card_pwm, width=12, text='Init Pos', fg=settings.color_btn_text, bg='#212121', relief='ridge')
        btn_init.place(x=x+15, y=y+120)
        btn_init.bind('<ButtonPress-1>', lambda e: self.send('PWMINIT'))

        btn_def = tk.Button(self.card_pwm, width=12, text='Default Set', fg=settings.color_btn_text, bg='#212121', relief='ridge')
        btn_def.place(x=x+140, y=y+120)
        btn_def.bind('<ButtonPress-1>', lambda e: self.send('PWMD'))

    def update_func_color(self, name, active):
        """Cambia colore del bottone funzione (verde = attivo, blu = inattivo)."""
        cmd_to_name = {
            'scan': 'RadarScan', 'findColor': 'FindColor', 'motionGet': 'MotionGet',
            'police': 'Police', 'automatic': 'Automatic', 'trackLine': 'TrackLine',
            'Speech': 'TrackLine', 'trackLight': 'TrackLight', 'keepDistance': 'KeepDistance'
        }
        btn_name = cmd_to_name.get(name, name)
        
        if btn_name == 'stopCV':
            # Spegne tutti i pulsanti funzione
            for btn in self.func_buttons.values():
                btn.config(bg=settings.color_btn)
            settings.function_stu = 0
            return

        if btn_name in self.func_buttons:
            self.func_buttons[btn_name].config(bg='#4CAF50' if active else settings.color_btn)

    def update_switch_color(self, num, active):
        """Aggiorna il colore del pulsante Switch (verde = attivo, blu = inattivo)."""
        if num in self.sw_buttons:
            self.sw_buttons[num].config(bg='#4CAF50' if active else settings.color_btn)
