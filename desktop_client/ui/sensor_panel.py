# ui/sensor_panel.py
import tkinter as tk
import math
import config.settings as settings

class SensorPanel:
    def __init__(self, parent, x, y):
        self.parent = parent
        self.root = parent.winfo_toplevel()
        self.x = x
        self.y = y
        self.x_range = 1.0  # Range in metri (default)
        
        # Crea la card container per il radar
        self.card = tk.LabelFrame(parent, text=" Ultrasonic Radar ", bg='#121212', fg='#29B6F6', bd=1, relief='solid', font=('Helvetica', 10, 'bold'))
        self.card.place(x=x, y=y, width=340, height=280)
        
        # Crea l'oggetto canvas centrandolo all'interno della card
        self.canvas = tk.Canvas(self.card, bg=settings.color_can, height=250, width=320, highlightthickness=0)
        self.canvas.place(x=10, y=10)
        
        self.draw_static_grid()

    def draw_static_grid(self):
        """Disegna la griglia e i cerchi concentrici del radar."""
        self.canvas.delete("all")
        
        # Linee di griglia
        self.canvas.create_line(0, 62, 320, 62, fill='darkgray')
        self.canvas.create_line(0, 124, 320, 124, fill='darkgray')
        self.canvas.create_line(0, 186, 320, 186, fill='darkgray')
        self.canvas.create_line(160, 0, 160, 250, fill='darkgray')
        self.canvas.create_line(80, 0, 80, 250, fill='darkgray')
        self.canvas.create_line(240, 0, 240, 250, fill='darkgray')
        
        # Testi del radar
        self.canvas.create_text((27, 178), text=f'{round((self.x_range/4), 2)}m', fill='#aeea00')
        self.canvas.create_text((27, 116), text=f'{round((self.x_range/2), 2)}m', fill='#aeea00')
        self.canvas.create_text((27, 54), text=f'{round((self.x_range*0.75), 2)}m', fill='#aeea00')

    def update_radar(self, info):
        """Aggiorna il radar disegnando i punti rilevati dal sensore ultrasuoni."""
        self.draw_static_grid()
        total_number = len(info)
        if total_number == 0:
            return
            
        for i in range(0, total_number):
            try:
                dis_info_get = float(info[i])
            except ValueError:
                continue
                
            if dis_info_get > 0:
                # Calcola posizioni e lunghezze proporzionali
                len_dis_1 = int((dis_info_get / self.x_range))
                pos = int((i / total_number) * 320)
                pos_ra = int(((i / total_number) * 140) + 20)  # Range di direzione scalato (20-160)
                len_dis = int(len_dis_1 * (math.sin(math.radians(pos_ra))))
                
                y0_l = 250 - len_dis
                x1_l = pos
                y1_l = y0_l
                
                x0, y0 = pos + 3, 250 - len_dis + 3
                x1, y1 = pos - 3, 250 - len_dis - 3
                
                if pos <= 160:
                    pos = 160 - abs(int(len_dis_1 * (math.cos(math.radians(pos_ra)))))
                    x1_l = (x1_l - math.cos(math.radians(pos_ra)) * 130)
                else:
                    pos = abs(int(len_dis_1 * (math.cos(math.radians(pos_ra))))) + 160
                    x1_l = x1_l + abs(math.cos(math.radians(pos_ra)) * 130)
                    
                y1_l = y1_l - abs(math.sin(math.radians(pos_ra)) * 130)
                
                # Disegna linee di raggio e punti rilevati
                self.canvas.create_line(pos, y0_l, x1_l, y1_l, fill=settings.color_line)
                self.canvas.create_oval(pos + 3, y0, pos - 3, y1, fill=settings.color_oval, outline=settings.color_oval)
