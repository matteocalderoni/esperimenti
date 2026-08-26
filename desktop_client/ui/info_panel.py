# ui/info_panel.py
import tkinter as tk
import config.settings as settings

class InfoPanel:
    def __init__(self, parent, x, y, width, height, connect_callback):
        self.parent = parent
        self.root = parent.winfo_toplevel()
        self.connect_callback = connect_callback
        
        # Crea la card container
        self.card = tk.LabelFrame(parent, text=" Connection & Telemetry ", bg='#121212', fg='#29B6F6', bd=1, relief='solid', font=('Helvetica', 10, 'bold'))
        self.card.place(x=x, y=y, width=width, height=height)
        
        # Connettività Input Layout (coordinati locali alla card)
        self.lbl_ip = tk.Label(self.card, text='IP Address:', fg=settings.color_text, bg='#121212')
        self.lbl_ip.place(x=120, y=10)
        
        self.entry_ip = tk.Entry(self.card, show=None, width=15, bg="#37474F", fg='#eceff1', bd=0, highlightthickness=1, highlightbackground='#2C2C2C')
        self.entry_ip.insert(0, settings.load_ip())
        self.entry_ip.place(x=120, y=35)
        
        self.btn_connect = tk.Button(self.card, width=8, text='Connect', fg=settings.color_btn_text, bg=settings.color_btn, relief='ridge')
        self.btn_connect.place(x=255, y=30)
        
        # Binda invio e click alla callback
        self.btn_connect.bind('<ButtonPress-1>', self.on_connect_click)
        self.root.bind('<Return>', self.on_connect_click)
        
        # Schermo Informazioni di Telemetria (riallineati per evitare overlap)
        self.lbl_status = tk.Label(self.card, width=14, text='Disconnected', fg=settings.color_text, bg='#F44336', font=('Helvetica', 9, 'bold'))
        self.lbl_status.place(x=360, y=32)
        
        self.lbl_temp = tk.Label(self.card, width=20, text='CPU Temp: -- ℃', fg=settings.color_text, bg='#212121', anchor='w', padx=8)
        self.lbl_temp.place(x=500, y=10)
        
        self.lbl_usage = tk.Label(self.card, width=20, text='CPU Usage: --', fg=settings.color_text, bg='#212121', anchor='w', padx=8)
        self.lbl_usage.place(x=500, y=40)
        
        self.lbl_ram = tk.Label(self.card, width=20, text='RAM Usage: --', fg=settings.color_text, bg='#212121', anchor='w', padx=8)
        self.lbl_ram.place(x=680, y=10)
        
        self.lbl_default_ip = tk.Label(self.card, width=20, text='Use default IP', fg=settings.color_text, bg=settings.color_btn, anchor='w', padx=8)
        self.lbl_default_ip.place(x=680, y=40)

    def on_connect_click(self, event):
        ip = self.entry_ip.get().strip()
        if ":" in ip:
            ip = ip.split(":")[0]  # Rimuove l'eventuale porta inserita per errore (es. :5000)
        self.connect_callback(ip)

    def update_info(self, temp, usage, ram):
        """Aggiorna le etichette con le info ricevute dal robot."""
        self.lbl_temp.config(text=f'CPU Temp: {temp}℃')
        self.lbl_usage.config(text=f'CPU Usage: {usage}')
        self.lbl_ram.config(text=f'RAM Usage: {ram}')

    def update_status(self, text, bg_color):
        """Aggiorna lo stato della connessione visivo."""
        self.lbl_status.config(text=text, bg=bg_color)
        if text == 'Connected':
            self.lbl_default_ip.config(text=f'IP: {self.entry_ip.get()}')
            self.entry_ip.config(state='disabled')
            self.btn_connect.config(state='disabled')
        elif text.startswith('Connecting'):
            self.lbl_default_ip.config(text=f'Default: {self.entry_ip.get()}')
