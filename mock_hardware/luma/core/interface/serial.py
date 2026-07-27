# mock_hardware/luma/core/interface/serial.py

class i2c:
    """
    Simulazione dell'interfaccia seriale I2C di luma.core per schermi OLED.
    """
    def __init__(self, port=1, address=0x3C, **kwargs):
        self.port = port
        self.address = address
        print(f"[MOCK LUMA I2C] Interfaccia I2C creata (Porta: {port}, Indirizzo: {hex(address)})")
