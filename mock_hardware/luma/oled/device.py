# mock_hardware/luma/oled/device.py

class DummyOLEDDevice:
    """
    Classe base per la simulazione dei driver per display OLED.
    """
    def __init__(self, serial=None, rotate=0, width=128, height=64, **kwargs):
        self.serial = serial
        self.rotate = rotate
        self.width = width
        self.height = height
        self.last_screen = {}
        addr_str = hex(serial.address) if serial and hasattr(serial, 'address') else 'N/A'
        print(f"[MOCK OLED] Dispositivo OLED inizializzato ({self.__class__.__name__}, {width}x{height}px, I2C: {addr_str}, Rotazione: {rotate}°)")

    def display(self, image):
        print(f"[MOCK OLED] Buffer grafico aggiornato su {self.__class__.__name__}")

    def clear(self):
        self.last_screen.clear()
        print(f"[MOCK OLED] Schermo azzerato")

    def hide(self):
        print(f"[MOCK OLED] Schermo spento/in standby")

    def show(self):
        print(f"[MOCK OLED] Schermo riacceso")


class ssd1306(DummyOLEDDevice):
    pass

class ssd1325(DummyOLEDDevice):
    pass

class ssd1331(DummyOLEDDevice):
    pass

class sh1106(DummyOLEDDevice):
    pass
