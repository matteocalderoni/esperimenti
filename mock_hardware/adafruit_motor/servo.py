# mock_hardware/adafruit_motor/servo.py
# File fittizio per simulare i servomotori di Adafruit.

class Servo:
    def __init__(self, channel, min_pulse=750, max_pulse=2250, actuation_range=180):
        self.channel = channel
        self.min_pulse = min_pulse
        self.max_pulse = max_pulse
        self.actuation_range = actuation_range
        self._angle = None
        print(f"[MOCK SERVO] Inizializzato Servo sul canale PWM {channel.index} (Range d'azione: {actuation_range} gradi)")

    @property
    def angle(self):
        return self._angle

    @angle.setter
    def angle(self, val):
        self._angle = val
        if val is not None:
            # Verifica che l'angolo sia nei limiti fisici consentiti
            if val < 0 or val > self.actuation_range:
                print(f"[MOCK SERVO WARNING] Angolo {val}° fuori range consentito (0-{self.actuation_range})!")
            print(f"[MOCK SERVO] Canale {self.channel.index} -> Angolo impostato a: {val}°")
        else:
            print(f"[MOCK SERVO] Canale {self.channel.index} -> Servo disattivato (None)")
