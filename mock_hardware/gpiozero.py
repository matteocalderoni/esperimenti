# mock_hardware/gpiozero.py
# File fittizio per simulare la libreria gpiozero del Raspberry Pi.

class Device:
    def __init__(self, *args, **kwargs):
        pass

class GPIODevice(Device):
    def __init__(self, pin, *args, **kwargs):
        self.pin = pin
        super().__init__(*args, **kwargs)

class LED(GPIODevice):
    def __init__(self, pin, *args, **kwargs):
        super().__init__(pin, *args, **kwargs)
        self._value = False
        print(f"[MOCK LED] Inizializzato LED su pin GPIO {self.pin}")

    def on(self):
        self._value = True
        print(f"[MOCK LED] Pin {self.pin} -> **ACCESO**")

    def off(self):
        self._value = False
        print(f"[MOCK LED] Pin {self.pin} -> **SPENTO**")

    @property
    def value(self):
        return self._value

    @value.setter
    def value(self, val):
        self._value = bool(val)
        status = "ACCESO" if self._value else "SPENTO"
        print(f"[MOCK LED] Pin {self.pin} -> {status}")

class InputDevice(GPIODevice):
    def __init__(self, pin, *args, **kwargs):
        super().__init__(pin, *args, **kwargs)
        self._value = 1  # 1 = bianco (nessuna linea), 0 = nero (linea rilevata)
        print(f"[MOCK INPUT_DEVICE] Inizializzato input su pin GPIO {self.pin}")

    @property
    def value(self):
        return self._value

    @value.setter
    def value(self, val):
        self._value = int(val)
        status = "NERO (Linea rilevata)" if val == 0 else "BIANCO (Nessuna linea)"
        print(f"[MOCK INPUT_DEVICE] Pin {self.pin} -> Stato sensore impostato a: {status} ({val})")

class DistanceSensor(GPIODevice):
    def __init__(self, echo, trigger, queue_len=5, max_distance=1, threshold_distance=0.1, *args, **kwargs):
        self.echo = echo
        self.trigger = trigger
        self.max_distance = max_distance
        self._distance = 0.5  # 50 cm di default
        super().__init__(echo, *args, **kwargs)
        print(f"[MOCK DISTANCE_SENSOR] Inizializzato ultrasuoni (Trigger GPIO {trigger}, Echo GPIO {echo})")

    @property
    def distance(self):
        return self._distance

    @distance.setter
    def distance(self, val):
        self._distance = float(val)
        print(f"[MOCK DISTANCE_SENSOR] Distanza impostata a: {val:.2f} m ({val*100:.1f} cm)")

    @property
    def value(self):
        return self._distance

class TonalBuzzer(GPIODevice):
    def __init__(self, pin, *args, **kwargs):
        super().__init__(pin, *args, **kwargs)
        self._tone = None
        print(f"[MOCK TONAL_BUZZER] Inizializzato cicalino su pin GPIO {self.pin}")

    def play(self, tone):
        self._tone = tone
        print(f"[MOCK TONAL_BUZZER] Pin {self.pin} -> **SUONA NOTA: {tone}**")

    def stop(self):
        self._tone = None
        print(f"[MOCK TONAL_BUZZER] Pin {self.pin} -> **SILENZIATO**")

class PWMOutputDevice(GPIODevice):
    def __init__(self, pin, *args, **kwargs):
        super().__init__(pin, *args, **kwargs)
        self._value = 0.0
        print(f"[MOCK PWM_OUTPUT] Inizializzato output PWM su pin GPIO {self.pin}")

    @property
    def value(self):
        return self._value

    @value.setter
    def value(self, val):
        self._value = float(val)
        print(f"[MOCK PWM_OUTPUT] Pin {self.pin} -> Regolazione PWM: {val*100:.1f}%")
