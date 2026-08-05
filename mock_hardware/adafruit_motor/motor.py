# mock_hardware/adafruit_motor/motor.py
# File fittizio per simulare i motori DC di Adafruit.

SLOW_DECAY = "SLOW_DECAY"
FAST_DECAY = "FAST_DECAY"

class DCMotor:
    def __init__(self, positive_channel, negative_channel):
        self.positive_channel = positive_channel
        self.negative_channel = negative_channel
        self._throttle = None
        self._decay_mode = None
        print(f"[MOCK MOTOR] Inizializzato DCMotor (IN1=Canale {positive_channel.index}, IN2=Canale {negative_channel.index})")

    @property
    def throttle(self):
        return self._throttle

    @throttle.setter
    def throttle(self, val):
        if self._throttle != val:
            self._throttle = val
            if val is None or val == 0:
                print(f"   └─ 🚗 [MOTORI DC] Canali ({self.positive_channel.index}, {self.negative_channel.index}) -> **FERMO**")
            else:
                speed_percent = abs(val * 100)
                direction = "AVANTI" if val > 0 else "INDIETRO"
                print(f"   └─ 🚗 [MOTORI DC] Canali ({self.positive_channel.index}, {self.negative_channel.index}) -> {direction} ({speed_percent:.1f}%)")

    @property
    def decay_mode(self):
        return self._decay_mode

    @decay_mode.setter
    def decay_mode(self, val):
        self._decay_mode = val
        # Salviamo la modalità di decadimento della corrente fittizia
