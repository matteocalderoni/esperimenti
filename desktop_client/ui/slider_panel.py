# ui/slider_panel.py
import tkinter as tk
import time
import config.settings as settings

class SliderPanel:
    def __init__(self, parent, fl_x, fl_y, fc_x, fc_y, send_callback, rgb_to_hsv_callback, hex_color_callback):
        self.parent = parent
        self.root = parent.winfo_toplevel()
        self.send = send_callback
        self.rgb_to_hsv = rgb_to_hsv_callback
        self.hex_color = hex_color_callback
        
        # Tkinter variables
        self.var_lip1 = tk.StringVar(value="440")
        self.var_lip2 = tk.StringVar(value="380")
        self.var_err = tk.StringVar(value="20")
        self.var_R = tk.StringVar(value="80")
        self.var_G = tk.StringVar(value="80")
        self.var_B = tk.StringVar(value="80")
        
        self.btn_cvfl = None
        self.canvas_show = None
        
        # Crea le schede container
        self.card_line = tk.LabelFrame(parent, text=" Line Tracking ", bg='#121212', fg='#29B6F6', bd=1, relief='solid', font=('Helvetica', 10, 'bold'))
        self.card_line.place(x=fl_x, y=fl_y, width=280, height=160)
        
        self.card_color = tk.LabelFrame(parent, text=" Color Picker ", bg='#121212', fg='#29B6F6', bd=1, relief='solid', font=('Helvetica', 10, 'bold'))
        self.card_color.place(x=fc_x, y=fc_y, width=280, height=160)
        
        self.build_line_tracking_sliders(0, 0)
        self.build_color_picker_sliders(0, 0)

    def build_line_tracking_sliders(self, x, y):
        w = 150
        
        def lip1_send(event):
            time.sleep(0.03)
            self.send(f"CVFLL1 {self.var_lip1.get()}")
            
        def lip2_send(event):
            time.sleep(0.03)
            self.send(f"CVFLL2 {self.var_lip2.get()}")
            
        def err_send(event):
            time.sleep(0.03)
            self.send(f"CVFLSP {self.var_err.get()}")
            
        scale_lip1 = tk.Scale(self.card_line, from_=0, to=480, orient=tk.HORIZONTAL, length=w,
                              variable=self.var_lip1, troughcolor='#212121', command=lip1_send,
                              fg=settings.color_text, bg='#121212', highlightthickness=0)
        scale_lip1.place(x=x+10, y=y+15)
        
        scale_lip2 = tk.Scale(self.card_line, from_=0, to=480, orient=tk.HORIZONTAL, length=w,
                              variable=self.var_lip2, troughcolor='#212121', command=lip2_send,
                              fg=settings.color_text, bg='#121212', highlightthickness=0)
        scale_lip2.place(x=x+10, y=y+55)
        
        scale_err = tk.Scale(self.card_line, from_=0, to=200, orient=tk.HORIZONTAL, length=w,
                             variable=self.var_err, troughcolor='#212121', command=err_send,
                             fg=settings.color_text, bg='#121212', highlightthickness=0)
        scale_err.place(x=x+10, y=y+95)

        # Pulsanti associati collocati a lato degli slider
        btn_render = tk.Button(self.card_line, width=8, text='Render', fg=settings.color_btn_text, bg='#212121', relief='ridge')
        btn_render.place(x=x+180, y=y+55)
        btn_render.bind('<ButtonPress-1>', lambda e: self.send('Render'))

        self.btn_cvfl = tk.Button(self.card_line, width=8, text='CV FL', fg=settings.color_btn_text, bg='#212121', relief='ridge')
        self.btn_cvfl.place(x=x+180, y=y+15)
        self.btn_cvfl.bind('<ButtonPress-1>', self.on_cvfl_press)

        btn_wb = tk.Button(self.card_line, width=8, text='Switch', fg=settings.color_btn_text, bg='#212121', relief='ridge')
        btn_wb.place(x=x+180, y=y+95)
        btn_wb.bind('<ButtonPress-1>', self.on_wb_press)

    def on_cvfl_press(self, event):
        if settings.function_stu == 0:
            self.send('CVFL')
            settings.function_stu = 1
        else:
            self.send('stopCV')
            settings.function_stu = 0

    def on_wb_press(self, event):
        if settings.function_stu == 0:
            self.send('CVFLColorSet 0')
            settings.function_stu = 1
        else:
            self.send('CVFLColorSet 255')
            settings.function_stu = 0

    def build_color_picker_sliders(self, x, y):
        w = 150
        
        def update_canvas(event):
            hex_color = self.hex_color(int(self.var_R.get()), int(self.var_G.get()), int(self.var_B.get()))
            self.canvas_show.config(bg=hex_color)
            time.sleep(0.03)

        scale_r = tk.Scale(self.card_color, from_=0, to=255, orient=tk.HORIZONTAL, length=w,
                           variable=self.var_R, troughcolor='#FF1744', command=update_canvas,
                           fg=settings.color_text, bg='#121212', highlightthickness=0)
        scale_r.place(x=x+10, y=y+15)

        scale_g = tk.Scale(self.card_color, from_=0, to=255, orient=tk.HORIZONTAL, length=w,
                           variable=self.var_G, troughcolor='#00E676', command=update_canvas,
                           fg=settings.color_text, bg='#121212', highlightthickness=0)
        scale_g.place(x=x+10, y=y+55)

        scale_b = tk.Scale(self.card_color, from_=0, to=255, orient=tk.HORIZONTAL, length=w,
                           variable=self.var_B, troughcolor='#2979FF', command=update_canvas,
                           fg=settings.color_text, bg='#121212', highlightthickness=0)
        scale_b.place(x=x+10, y=y+95)

        initial_hex = self.hex_color(int(self.var_R.get()), int(self.var_G.get()), int(self.var_B.get()))
        self.canvas_show = tk.Canvas(self.card_color, bg=initial_hex, height=65, width=80, highlightthickness=0)
        self.canvas_show.place(x=x+180, y=y+15)

        btn_set = tk.Button(self.card_color, width=8, text='Color Set', fg=settings.color_btn_text, bg='#212121', relief='ridge')
        btn_set.place(x=x+180, y=y+95)
        btn_set.bind('<ButtonPress-1>', self.on_color_set_press)

    def on_color_set_press(self, event):
        r, g, b = int(self.var_R.get()), int(self.var_G.get()), int(self.var_B.get())
        h, s, v = self.rgb_to_hsv(r, g, b)
        message = f"{{'title': 'findColorSet', 'data': [{h}, {s}, {v}]}}"
        print(message)
        self.send(message)

    def update_color_picker_values(self, r, g, b):
        self.var_R.set(str(r))
        self.var_G.set(str(g))
        self.var_B.set(str(b))
        hex_color = self.hex_color(r, g, b)
        if self.canvas_show:
            self.canvas_show.config(bg=hex_color)
            
    def update_cvfl_button_color(self, active):
        if self.btn_cvfl:
            self.btn_cvfl.config(bg='#4CAF50' if active else '#212121')
