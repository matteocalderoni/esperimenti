# mock_hardware/busio.py
# File fittizio per simulare le interfacce bus (I2C, SPI, ecc.) di CircuitPython.

class I2C:
    def __init__(self, scl, sda, frequency=100000):
        self.scl = scl
        self.sda = sda
        self.frequency = frequency
        print(f"[MOCK I2C] Inizializzato bus I2C a {frequency}Hz (Pin: SCL={scl}, SDA={sda})")

    def deinit(self):
        print("[MOCK I2C] Bus I2C de-inizializzato e rilasciato.")

    def __enter__(self):
        # Supporta l'uso con l'istruzione 'with'
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        # Rilascia le risorse fittizie all'uscita dal blocco 'with'
        self.deinit()
