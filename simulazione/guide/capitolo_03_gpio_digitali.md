# Guida ai GPIO Digitali: Sensori e Attuatori (gpiozero e spidev)

Nelle tappe precedenti abbiamo visto come il Raspberry Pi comunica con i chip intelligenti via I2C. In questo capitolo vedremo come il Raspberry Pi comunica direttamente con i componenti più semplici usando i suoi pin **GPIO** digitali (Input e Output).

In particolare, spiegheremo i sensori di tracciamento linea, il sensore a ultrasuoni, i LED di segnalazione, il cicalino e i LED RGB indirizzabili.

---

## 🔌 1. Cosa sono i pin GPIO? (Gli ingressi e le uscite della scheda)

I pin **GPIO (General Purpose Input/Output)** sono i piedini metallici esposti sul Raspberry Pi. Possono essere configurati via software in due modi:

1. **OUTPUT (Uscite)**: Il Raspberry Pi decide la tensione sul pin.
   * `1` (HIGH - 3.3V) $\rightarrow$ ad esempio, accende un LED o fa suonare un cicalino.
   * `0` (LOW - 0V) $\rightarrow$ spegne il componente.
2. **INPUT (Ingressi)**: Il Raspberry Pi "ascolta" la tensione sul pin impostata da un sensore esterno.
   * Il sensore invia 3.3V $\rightarrow$ il Raspberry Pi legge `1`.
   * Il sensore invia 0V $\rightarrow$ il Raspberry Pi legge `0`.

---

## 📦 2. La libreria `gpiozero`

Per programmare i GPIO sul Raspberry Pi si usa la libreria **`gpiozero`**. È una libreria scritta per rendere l'elettronica semplicissima per chi comincia. Invece di configurare manualmente registri e tensioni elettriche, ti permette di ragionare in termini di oggetti fisici reali:

* Per accendere un LED: `led = LED(17)` e poi `led.on()`.
* Per leggere la distanza: `sensor = DistanceSensor(echo=24, trigger=23)`.

---

## 🔍 3. I sensori e attuatori digitali del nostro Robot

Nel nostro simulatore del Passo 3, emuleremo i seguenti componenti gestiti da `gpiozero`:

### A. I LED e il Buzzer (Output Digitali)
* **LED**: Semplici luci di stato (on/off) collegate ai pin GPIO.
* **Buzzer (Cicalino)**: Comandato ad impulsi veloci per emettere suoni di allarme. Nel codice viene usato come `TonalBuzzer` o `PWMOutputDevice` per modularne il volume o la nota.

### B. I sensori di Line Tracking (Input Digitali)
* Il modulo infrarossi inferiore del robot ha tre sensori (sinistro, centrale, destro).
* Ciascun sensore invia un segnale digitale:
  * **`0` (Nero)**: La luce IR viene assorbita dalla linea scura (sensore sopra la pista).
  * **`1` (Bianco)**: La luce IR viene riflessa dal pavimento chiaro.
* Nel codice del robot vengono letti tramite la classe `InputDevice` di `gpiozero`.

### C. Il sensore ad Ultrasuoni HC-SR04 (Input + Output)
* Ha due pin principali collegati al Raspberry Pi:
  1. `Trigger` (Output): Il Pi invia un impulso per far partire l'onda ad ultrasuoni.
  2. `Echo` (Input): Il Pi misura quanto tempo il pin rimane alto per calcolare la distanza dell'ostacolo.
* Fortunatamente, `gpiozero` racchiude questa logica nella classe `DistanceSensor` che ci restituisce direttamente la distanza in metri (da `0.0` a `1.0`).

---

## 🌈 4. La comunicazione SPI (`spidev`) per i LED colorati WS2812

I LED posteriori colorati (WS2812) sono particolari: richiedono l'invio di byte di colore ad altissima velocità e con precisione millimetrica. 

* Per farlo, il Raspberry Pi non usa semplici pin GPIO generici, ma sfrutta il protocollo **SPI (Serial Peripheral Interface)** tramite la libreria **`spidev`**.
* La linea SPI invia flussi rapidi di byte che descrivono le intensità di Rosso, Verde e Blu per ciascun LED collegato in cascata.

---

## 💡 Mappatura del Codice Python nel nostro Mock

Per far girare questi moduli sul tuo Mac, creeremo:

1. **`mock_hardware/gpiozero.py`**:
   Conterrà le classi simulate:
   * `LED`: Stamperà `[MOCK LED] Pin X -> ACCESO / SPENTO`.
   * `InputDevice`: Simulerà i sensori di tracciamento linea (restituendo ad esempio `0` o `1`).
   * `DistanceSensor`: Simulerà la lettura di distanza ad ultrasuoni (restituendo un valore preimpostato o variabile).
   * `TonalBuzzer` e `PWMOutputDevice`: Loggheranno l'attivazione acustica o luminosa.
2. **`mock_hardware/spidev.py`**:
   Fornirà la classe `SpiDev` fittizia per evitare crash quando il robot inizializza il controllo dei LED posteriori colorati.
