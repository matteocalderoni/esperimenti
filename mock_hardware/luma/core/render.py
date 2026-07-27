# mock_hardware/luma/core/render.py

class MockDraw:
    """
    Simula l'oggetto canvas/PIL.ImageDraw per il rendering di testo e forme.
    """
    def __init__(self, device):
        self.device = device
        self.lines = {}

    def text(self, xy, text, fill="white", **kwargs):
        x, y = xy
        self.lines[y] = text
        print(f"[MOCK OLED DRAW] Posizione ({x}, {y}): '{text}'")

    def rectangle(self, xy, fill=None, outline=None, **kwargs):
        print(f"[MOCK OLED DRAW] Rettangolo: {xy}")


class canvas:
    """
    Context Manager che simula luma.core.render.canvas.
    all'uscita dal blocco 'with', 'invia' le modifiche al dispositivo OLED.
    """
    def __init__(self, device):
        self.device = device
        self.draw = MockDraw(device)

    def __enter__(self):
        self.draw.lines.clear()
        return self.draw

    def __exit__(self, exc_type, exc_val, exc_tb):
        if hasattr(self.device, 'last_screen'):
            self.device.last_screen = dict(self.draw.lines)
        print(f"[MOCK OLED DISPLAY] Frame inviato allo schermo ({len(self.draw.lines)} righe di testo)")
        return False
