# ui/control_panel.py
import tkinter as tk
import config.settings as settings

import time

class ControlPanel:
    def __init__(self, parent, motor_x, motor_y, servo_x, servo_y, send_callback):
        self.parent = parent
        self.root = parent.winfo_toplevel()
        self.send = send_callback
        
        # Variabili spostate da SliderPanel per conformità SRP e limite 150 righe
        self.var_speed = tk.StringVar(value="100")
        
        # Crea le due schede container
        self.traction_card = tk.LabelFrame(parent, text=" Traction & Steering ", bg='#121212', fg='#29B6F6', bd=1, relief='solid', font=('Helvetica', 10, 'bold'))
        self.traction_card.place(x=motor_x, y=motor_y, width=320, height=210)
        
        self.servo_card = tk.LabelFrame(parent, text=" Pan-Tilt & Servo Control ", bg='#121212', fg='#29B6F6', bd=1, relief='solid', font=('Helvetica', 10, 'bold'))
        self.servo_card.place(x=servo_x, y=servo_y, width=320, height=210)
        
        self.build_motor_buttons(0, 0)
        self.build_servo_buttons(0, 0)

    def build_servo_buttons(self, x, y):
        # Callback locali per inviare i comandi al socket
        def start_look(direction):
            self.send(direction)

        def stop_look(axis):
            self.send(axis)

        # Creazione pulsanti Servo locali alla servo_card
        btn_left = tk.Button(self.servo_card, width=8, text='Left', fg=settings.color_btn_text, bg=settings.color_btn, relief='ridge')
        btn_left.place(x=x+40, y=y+75)
        btn_left.bind('<ButtonPress-1>', lambda e: start_look('lookleft'))
        btn_left.bind('<ButtonRelease-1>', lambda e: stop_look('LRstop'))
        self.root.bind('<KeyPress-j>', lambda e: start_look('lookleft'))
        self.root.bind('<KeyRelease-j>', lambda e: stop_look('LRstop'))

        btn_up = tk.Button(self.servo_card, width=8, text='Up', fg=settings.color_btn_text, bg=settings.color_btn, relief='ridge')
        btn_up.place(x=x+120, y=y+25)
        btn_up.bind('<ButtonPress-1>', lambda e: start_look('up'))
        btn_up.bind('<ButtonRelease-1>', lambda e: stop_look('UDstop'))
        self.root.bind('<KeyPress-i>', lambda e: start_look('up'))
        self.root.bind('<KeyRelease-i>', lambda e: stop_look('UDstop'))

        btn_down = tk.Button(self.servo_card, width=8, text='Down', fg=settings.color_btn_text, bg=settings.color_btn, relief='ridge')
        btn_down.place(x=x+120, y=y+75)
        btn_down.bind('<ButtonPress-1>', lambda e: start_look('down'))
        btn_down.bind('<ButtonRelease-1>', lambda e: stop_look('UDstop'))
        self.root.bind('<KeyPress-k>', lambda e: start_look('down'))
        self.root.bind('<KeyRelease-k>', lambda e: stop_look('UDstop'))

        btn_right = tk.Button(self.servo_card, width=8, text='Right', fg=settings.color_btn_text, bg=settings.color_btn, relief='ridge')
        btn_right.place(x=x+200, y=y+75)
        btn_right.bind('<ButtonPress-1>', lambda e: start_look('lookright'))
        btn_right.bind('<ButtonRelease-1>', lambda e: stop_look('LRstop'))
        self.root.bind('<KeyPress-l>', lambda e: start_look('lookright'))
        self.root.bind('<KeyRelease-l>', lambda e: stop_look('LRstop'))

        # Home button e configurazioni servomotore
        btn_home = tk.Button(self.servo_card, width=8, text='Home (H)', fg=settings.color_btn_text, bg='#212121', relief='ridge')
        btn_home.place(x=x+200, y=y+130)
        btn_home.bind('<ButtonPress-1>', lambda e: self.send('home'))
        self.root.bind('<KeyPress-h>', lambda e: self.send('home'))

        btn_arm = tk.Button(self.servo_card, width=8, text='ARM', fg=settings.color_btn_text, bg=settings.color_btn, relief='ridge')
        btn_arm.place(x=x+40, y=y+130)
        btn_arm.bind('<ButtonPress-1>', lambda e: self.send('AR'))

        btn_pt = tk.Button(self.servo_card, width=8, text='PT', fg=settings.color_btn_text, bg=settings.color_btn, relief='ridge')
        btn_pt.place(x=x+120, y=y+130)
        btn_pt.bind('<ButtonPress-1>', lambda e: self.send('PT'))

    def build_motor_buttons(self, x, y):
        # Direzioni motori DC locali alla traction_card
        btn_left = tk.Button(self.traction_card, width=8, text='Left', fg=settings.color_btn_text, bg=settings.color_btn, relief='ridge')
        btn_left.place(x=x+40, y=75)
        btn_left.bind('<ButtonPress-1>', lambda e: self.send('left'))
        btn_left.bind('<ButtonRelease-1>', lambda e: self.send('TS'))
        self.root.bind('<KeyPress-a>', lambda e: self.send('left'))
        self.root.bind('<KeyRelease-a>', lambda e: self.send('TS'))

        btn_forward = tk.Button(self.traction_card, width=8, text='Forward', fg=settings.color_btn_text, bg=settings.color_btn, relief='ridge')
        btn_forward.place(x=x+120, y=25)
        btn_forward.bind('<ButtonPress-1>', lambda e: self.send('forward'))
        btn_forward.bind('<ButtonRelease-1>', lambda e: self.send('DS'))
        self.root.bind('<KeyPress-w>', lambda e: self.send('forward'))
        self.root.bind('<KeyRelease-w>', lambda e: self.send('DS'))

        btn_backward = tk.Button(self.traction_card, width=8, text='Backward', fg=settings.color_btn_text, bg=settings.color_btn, relief='ridge')
        btn_backward.place(x=x+120, y=75)
        btn_backward.bind('<ButtonPress-1>', lambda e: self.send('backward'))
        btn_backward.bind('<ButtonRelease-1>', lambda e: self.send('DS'))
        self.root.bind('<KeyPress-s>', lambda e: self.send('backward'))
        self.root.bind('<KeyRelease-s>', lambda e: self.send('DS'))

        btn_right = tk.Button(self.traction_card, width=8, text='Right', fg=settings.color_btn_text, bg=settings.color_btn, relief='ridge')
        btn_right.place(x=x+200, y=75)
        btn_right.bind('<ButtonPress-1>', lambda e: self.send('right'))
        btn_right.bind('<ButtonRelease-1>', lambda e: self.send('TS'))
        self.root.bind('<KeyPress-d>', lambda e: self.send('right'))
        self.root.bind('<KeyRelease-d>', lambda e: self.send('TS'))

        # Rotazione sul posto (Spin) locali alla traction_card
        btn_spin_l = tk.Button(self.traction_card, width=8, text='SpinLeft', fg=settings.color_btn_text, bg=settings.color_btn, relief='ridge')
        btn_spin_l.place(x=x+40, y=25)
        btn_spin_l.bind('<ButtonPress-1>', lambda e: self.send('rotate-left'))
        btn_spin_l.bind('<ButtonRelease-1>', lambda e: self.send('DS'))
        self.root.bind('<KeyPress-1>', lambda e: self.send('rotate-left'))
        self.root.bind('<KeyRelease-1>', lambda e: self.send('DS'))

        btn_spin_r = tk.Button(self.traction_card, width=8, text='SpinRight', fg=settings.color_btn_text, bg=settings.color_btn, relief='ridge')
        btn_spin_r.place(x=x+200, y=25)
        btn_spin_r.bind('<ButtonPress-1>', lambda e: self.send('rotate-right'))
        btn_spin_r.bind('<ButtonRelease-1>', lambda e: self.send('DS'))
        self.root.bind('<KeyPress-3>', lambda e: self.send('rotate-right'))
        self.root.bind('<KeyRelease-3>', lambda e: self.send('DS'))

        # Slider velocità (Spostato qui da SliderPanel per accorpare i controlli di guida)
        def scale_send(event):
            time.sleep(0.03)
            self.send(f"wsB {self.var_speed.get()}")
            
        lbl_speed = tk.Label(self.traction_card, text='Speed:', fg=settings.color_text, bg='#121212')
        lbl_speed.place(x=x+20, y=145)

        scale_b = tk.Scale(self.traction_card, from_=0, to=100, orient=tk.HORIZONTAL, length=200,
                           variable=self.var_speed, troughcolor='#448AFF', command=scale_send,
                           fg=settings.color_text, bg='#121212', highlightthickness=0)
        scale_b.place(x=x+80, y=125)
