# mock_hardware/adafruit_pca9685.py
# File fittizio per simulare il chip generatore PWM Adafruit PCA9685.

class PWMChannel:
    def __init__(self, index):
        self.index = index

class PCA9685:
    def __init__(self, i2c_bus, address=0x40):
        self.i2c_bus = i2c_bus
        self.address = address
        self._frequency = 50
        # Creiamo un array di 16 canali PWM fittizi
        self.channels = [PWMChannel(i) for i in range(16)]
        print(f"[MOCK PCA9685] Inizializzato chip PCA9685 all'indirizzo I2C 0x{address:02x}")

    @property
    def frequency(self):
        return self._frequency

    @frequency.setter
    def frequency(self, val):
        if self._frequency != val:
            self._frequency = val
            print(f"   ├─ ⚙️ [PCA9685] Frequenza PWM: {val}Hz")

    def deinit(self):
        print("[MOCK PCA9685] Chip disattivato.")
