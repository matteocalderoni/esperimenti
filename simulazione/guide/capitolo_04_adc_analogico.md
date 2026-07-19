# Guida ai Sensori Analogici e all'ADC: Leggere Tensioni e Luce (smbus)

Nelle guide precedenti abbiamo visto come il Raspberry Pi comunica con chip intelligenti via I2C (Capitolo 1 e 2) e con sensori digitali on/off tramite i pin GPIO (Capitolo 3).

In questo capitolo affronteremo un problema fondamentale: **come fa il Raspberry Pi a comprendere il mondo reale "sfumato" (analogico)?** Come fa a sapere se una batteria è quasi scarica o se c'è una luce debole o forte a sinistra?

Spiegheremo il funzionamento del chip **ADS7830** (il convertitore analogico-digitale) e come simularlo tramite la libreria Python **`smbus`**.

---

## 🔌 1. Digitale vs Analogico: Il mondo a gradini o a scivolo?

Per comprendere i sensori analogici dobbiamo prima capire la differenza fondamentale tra segnali digitali e analogici:

*   **Segnale Digitale**: È come un **interruttore della luce classico**. O è acceso (`1`, 3.3V) o è spento (`0`, 0V). Non c'è una via di mezzo. I pin GPIO del Raspberry Pi nascono per capire solo questo linguaggio binario.
*   **Segnale Analogico**: È come un **varialuce (dimmer)** o un termometro. La tensione può assumere qualsiasi valore intermedio (es. 1.2V, 2.5V, 4.1V). Esempi nel robot: la carica della batteria (che scende lentamente da 8.4V a 6V) o la quantità di luce riflessa su una fotoresistenza.

### Il Problema del Raspberry Pi
A differenza di altre schede (come Arduino), **il Raspberry Pi non ha ingressi analogici interni**. Se provassimo a collegare una fotoresistenza o una batteria direttamente ad un pin GPIO, il Pi vedrebbe solo `0` (sotto una certa soglia) o `1` (sopra la soglia), perdendo tutte le sfumature intermedie.

La soluzione? Un chip "interprete" esterno: il **Convertitore Analogico-Digitale (ADC)**.

---

## 📈 2. Il Chip ADS7830: Il Traduttore Analogico-Digitale

Nel nostro robot Adeept 4WD, sulla scheda Robot HAT è installato il chip **ADS7830**:
*   È un convertitore **ADC a 8 canali** (può leggere fino a 8 sensori analogici diversi).
*   Comunica con il Raspberry Pi tramite il bus **I2C** all'indirizzo **`0x48`**.
*   È un convertitore a **8 bit**: questo significa che prende la tensione analogica in ingresso (da 0V a circa 5V) e la trasforma in un numero intero digitale compreso tra **`0` e `255`**.

| Tensione in Ingresso | Valore Digitale a 8 bit |
| :--- | :--- |
| 0.0 Volt (Minimo) | `0` |
| 2.5 Volt (Metà) | `127` |
| 4.93 Volt (Massimo, $V_{ref}$) | `255` |

---

## 🔋 3. Il Voltinometro della Batteria (Partitore di Tensione)

Il robot è alimentato da due batterie ricaricabili in serie (tensione totale nominale di 7.4V, che può arrivare a circa 8.4V quando sono cariche). 

Tuttavia, l'ADC ADS7830 accetta in ingresso una tensione massima pari a quella di riferimento ($V_{ref} \approx 4.93\text{V}$). Se collegassimo la batteria direttamente all'ADC, **bruceremmo il chip!**

Per questo si usa un circuito chiamato **Partitore di Tensione (Voltage Divider)**, composto da due resistenze:
*   $R15 = 3000\ \Omega$
*   $R17 = 1000\ \Omega$

La tensione della batteria viene ridotta secondo la formula del partitore:
$$V_{in\_adc} = V_{battery} \cdot \frac{R17}{R15 + R17} = V_{battery} \cdot \frac{1000}{3000 + 1000} = V_{battery} \cdot 0.25$$

In pratica, **il partitore divide la tensione della batteria esattamente per 4**, portando la tensione massima di 8.4V a un valore sicuro di 2.1V, perfettamente tollerato dall'ADC.

### Ricostruzione Software della Tensione (`Voltage.py`)
Quando il codice del robot in [Voltage.py](file:///Users/mauroi/Documents/esperimenti/ADR036-Adeept_4WD_Smart_Car_Kit_for_RPi-20251215/Code/Adeept_4WD_Smart_Car_for_RPi/Server/Server_OrdinaryWheels/Voltage.py) legge il canale 0 dell'ADC, esegue il calcolo inverso per mostrare la tensione reale:
1. Legge il valore ADC (da 0 a 255).
2. Calcola la tensione letta dall'ADC: $V_{in\_adc} = \frac{\text{Valore ADC}}{255} \cdot 4.93\text{V}$.
3. Moltiplica per 4 (l'inverso di $0.25$) per ottenere la tensione reale della batteria: $V_{battery} = V_{in\_adc} \cdot 4$.

Se la tensione scende sotto la soglia di allarme di **6.3 V**, il robot attiva il cicalino di allarme per evitare di danneggiare le batterie.

---

## ☀️ 4. Inseguimento Luce con Fotoresistenze (LDR)

Il robot usa anche due fotoresistenze (LDR - Light Dependent Resistors) collegate ad altri canali dell'ADC (ad esempio il canale 1) per rilevare la luminosità dell'ambiente circostante.

Le fotoresistenze variano la propria resistenza elettrica in base alla luce che ricevono:
*   **Tanta Luce**: Resistenza bassissima.
*   **Buio**: Resistenza altissima.

Inserite in un circuito a partitore, generano una tensione variabile proporzionale alla luce. Il modulo `Functions.py` legge questo valore dal canale 1 dell'ADC:
*   **Valore < 112**: Indica che c'è molta luce sul lato sinistro $\rightarrow$ Il robot decide di sterzare a sinistra (`ROTATE-LEFT`).
*   **Valore > 142**: Indica che c'è molta luce sul lato destro $\rightarrow$ Il robot decide di sterzare a destra (`ROTATE-RIGHT`).
*   **Valore tra 112 e 142**: La luce è bilanciata al centro $\rightarrow$ Il robot prosegue dritto (`MID`).

---

## 💻 5. Come funziona il protocollo software (`smbus`) e il Mock

Su Raspberry Pi si usa la libreria nativa C/Python **`smbus`** (o `smbus2`) per inviare comandi I2C a basso livello.

Per leggere il canale analogico, l'ADS7830 si aspetta che gli venga inviato un byte di comando specifico (`CMD`). Nel codice del robot, questo comando è calcolato così:
```python
cmd = 0x84 | (((chn << 2 | chn >> 1) & 0x07) << 4)
```
Questo byte imposta il chip per leggere in modalità "Single Ended" (singolo canale rispetto a massa) sul canale `chn` desiderato.

### La nostra emulazione in [smbus.py](../../mock_hardware/smbus.py)
Nel nostro simulatore locale, abbiamo ricreato la libreria `smbus` simulando la classe `SMBus`. Il metodo `read_byte_data(address, cmd)` intercetta il byte `cmd`, esegue il calcolo inverso per determinare quale canale analogico il robot sta cercando di leggere, e restituisce il valore corrispondente memorizzato nel dizionario fittizio `mock_values`.

In questo modo, possiamo testare la reazione del robot modificando dinamicamente i valori simulati dal nostro script di test [test_passo_4.py](../test_passo_4.py):
*   Impostando il canale 0 a `100` $\rightarrow$ simuliamo la batteria carica.
*   Impostando il canale 0 a `75` $\rightarrow$ simuliamo la batteria scarica e verifichiamo la segnalazione di allarme.
*   Impostando il canale 1 a `95` o `155` $\rightarrow$ simuliamo la deviazione della luce a sinistra o a destra.
