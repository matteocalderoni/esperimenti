# mock_hardware/smbus.py
# File fittizio per simulare il modulo smbus (I2C) su sistemi di sviluppo.

class SMBus:
    # Dizionario condiviso per memorizzare i valori simulati dei sensori analogici.
    # L'indirizzo di default dell'ADC ADS7830 è 0x48.
    # I canali vanno da 0 a 7.
    # Canale 0: Monitoraggio Batteria (es. 100 = ~7.73V, 75 = ~5.8V - batteria scarica)
    # Canale 1: Fotoresistenza per tracciamento luce (127 = centro, <112 = sinistra, >142 = destra)
    mock_values = {
        0x48: {
            0: 100,  # Batteria OK (~7.7V)
            1: 127,  # Luce al centro
            2: 128,
            3: 128,
            4: 128,
            5: 128,
            6: 128,
            7: 128
        }
    }

    def __init__(self, bus_num=1):
        self.bus_num = bus_num
        print(f"[MOCK SMBUS] Inizializzato SMBus sul bus {bus_num}")

    def read_byte_data(self, addr, cmd):
        # L'ADC ADS7830 usa un comando CMD per selezionare il canale.
        # Il valore del canale viene estratto decodificando i bit di CMD.
        # CMD = 0x84 | (channel_bits << 4)
        # Dove channel_bits è calcolato come ((chn << 2 | chn >> 1) & 0x07)
        # Decodifichiamo channel_bits a partire dal comando cmd:
        channel_bits = (cmd >> 4) & 0x07
        
        # Mappa inversa per risalire da channel_bits al canale originale (0-7):
        mapping_rev = {0: 0, 4: 1, 1: 2, 5: 3, 2: 4, 6: 5, 3: 6, 7: 7}
        chn = mapping_rev.get(channel_bits, 0)

        # Recuperiamo il valore simulato per l'indirizzo ed il canale
        addr_values = self.mock_values.get(addr, {})
        value = addr_values.get(chn, 128) # Default a metà scala (128)

        # Evitiamo di intasare la console con stampe a loop per il polling continuo della batteria (canale 0)
        last_key = (addr, chn)
        if not hasattr(self, '_last_read'):
            self._last_read = {}
        if self._last_read.get(last_key) != value:
            self._last_read[last_key] = value
            print(f"[MOCK SMBUS] Lettura I2C su ind. {hex(addr)} | Cmd: {hex(cmd)} (Canale {chn}) -> Valore: {value}")
        return value

    def write_byte_data(self, addr, cmd, val):
        print(f"[MOCK SMBUS] Scrittura I2C su ind. {hex(addr)} | Cmd: {hex(cmd)} | Valore: {val}")
        if addr not in self.mock_values:
            self.mock_values[addr] = {}
        self.mock_values[addr][cmd] = val

    def close(self):
        print(f"[MOCK SMBUS] Chiusura bus {self.bus_num}")
