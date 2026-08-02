# mock_hardware/spidev.py
# File fittizio per simulare la comunicazione bus SPI (Serial Peripheral Interface).

class SpiDev:
    def __init__(self, bus=0, device=0):
        self.bus = bus
        self.device = device
        self.max_speed_hz = 8000000
        print(f"[MOCK SPI] Inizializzato bus SPI {bus}, device {device}")

    def open(self, bus, device):
        self.bus = bus
        self.device = device
        print(f"[MOCK SPI] Aperto canale SPI (Bus: {bus}, Device: {device})")

    def close(self):
        print(f"[MOCK SPI] Canale SPI chiuso.")

    def xfer2(self, data, *_args, **_kwargs):
        return data

    def xfer(self, data, *_args, **_kwargs):
        return data
