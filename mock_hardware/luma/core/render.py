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

    def rectangle(self, xy, fill=None, outline=None, **kwargs):
        pass


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
        new_lines = dict(self.draw.lines)
        old_lines = getattr(self.device, 'last_screen', {})
        if new_lines != old_lines:
            self.device.last_screen = new_lines
            print(f"[MOCK OLED DISPLAY] Contenuto schermo aggiornato ({len(new_lines)} righe):")
            for y, txt in new_lines.items():
                print(f"  -> Riga (y={y}): '{txt}'")
        return False
