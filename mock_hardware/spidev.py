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

    def xfer2(self, data):
        # xfer2 invia una serie di byte fittizi e restituisce la risposta
        # Per il nostro simulatore, logghiamo solo l'avvenuta scrittura fittizia
        # ed evitiamo stampe ripetitive per non intasare la console.
        return data
