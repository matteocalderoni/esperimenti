# Guida ai Segnali PWM e agli Attuatori: Servomotori e Motori DC

Nel capitolo precedente abbiamo visto come il Raspberry Pi (Master) parla con i chip (Slaves) tramite il bus I2C. Ora vedremo cosa fa il robot con queste informazioni per compiere azioni fisiche. 

In particolare, vedremo come si muovono la testa (servomotori) e le ruote (motori a corrente continua) usando i **segnali PWM** e il chip **PCA9685**.

---

## 💡 1. Cos'è il segnale PWM? (L'interruttore ultra-veloce)

Il Raspberry Pi lavora con segnali digitali: o c'è tensione (1, cioè 3.3V) o non c'è (0, cioè 0V). Non può erogare a comando tensioni intermedie come 1.5V o 2V.

E allora, **come facciamo a far girare un motore a metà velocità o a regolare la luminosità di un LED?**

Usiamo la tecnica **PWM (Pulse Width Modulation - Modulazione di Larghezza di Impulso)**.

### L'analogia della lampadina:
Immagina di essere in camera tua e di premere l'interruttore della luce accendendola e spegnendola continuamente:
* Se la accendi per 1 secondo e la spegni per 1 secondo, vedrai la luce lampeggiare.
* Se invece fai lo stesso ciclo **1000 volte al secondo**, il tuo occhio non vedrà più il lampeggio a causa della persistenza retinica. Vedrà invece una lampadina accesa con una **luminosità dimezzata (50%)**.

Regolando la frazione di tempo in cui il segnale è acceso (*Duty Cycle*) rispetto al tempo totale del ciclo, possiamo simulare qualsiasi valore intermedio:
* **Duty Cycle 10%**: Il segnale è acceso solo per il 10% del tempo. Un motore girerà pianissimo.
* **Duty Cycle 50%**: Il segnale è acceso per metà del tempo. Il motore girerà a media velocità.
* **Duty Cycle 90%**: Il segnale è quasi sempre acceso. Il motore girerà quasi al massimo.

---

## ⏰ 2. Perché serve il chip PCA9685?

Il Raspberry Pi può generare segnali PWM via software, ma questo richiede un calcolo continuo e preciso da parte del processore. Se il processore è occupato a fare altro (es. elaborare il video della telecamera), il segnale PWM potrebbe subire micro-ritardi, facendo "tremare" i servomotori o rendendo instabili i motori.

Per questo sul robot è presente il chip **PCA9685**:
* È un **generatore PWM hardware a 16 canali**.
* Comunica con il Raspberry Pi tramite il bus I2C (all'indirizzo `0x5f`).
* Il Raspberry Pi gli invia un singolo comando rapido: *"Ehi PCA9685, imposta il canale 0 al 45% di PWM"*.
* Da quel momento in poi, il chip PCA9685 genera il segnale elettrico in modo autonomo, preciso e continuo su quel canale, senza più disturbare il Raspberry Pi.

---

## 🤖 3. Come funziona un Servomotore? (La testa del robot)

Un servomotore (o semplicemente *servo*) è un motore speciale che non gira continuamente a 360°, ma si posiziona su un **angolo preciso** (solitamente tra 0° e 180°). 

All'interno contiene un piccolo circuito di controllo e un potenziometro che misura l'angolo attuale dell'ingranaggio.

### Come fa il servo a capire l'angolo dal segnale PWM?
Il servo si aspetta un segnale di controllo ripetuto 50 volte al secondo (frequenza di 50 Hz, ovvero un ciclo ogni 20 millisecondi). All'interno di questo ciclo:
* Se riceve un impulso alto di **1.5 millisecondi**, si posiziona esattamente al centro (**90°**).
* Se l'impulso è più breve (circa **0.5 millisecondi**), ruota tutto a sinistra (**0°**).
* Se l'impulso è più lungo (circa **2.5 millisecondi**), ruota tutto a destra (**180°**).

Modificando la larghezza di questo impulso (chiamato *Pulse Width*), il servo si sposta istantaneamente sull'angolo corrispondente.

---

## 🚗 4. Come funziona un Motore DC? (Le ruote del robot)

I motori che fanno girare le ruote sono normali motori in corrente continua (DC). A differenza dei servi, girano continuamente a 360° e hanno solo due fili di alimentazione.

Se colleghi i fili in un modo, il motore gira in avanti; se li inverti, gira all'indietro.

### Come li controlliamo con la Robot HAT?
Non possiamo collegare i motori DC direttamente al chip PCA9685 perché richiedono molta più corrente elettrica di quella che il chip può erogare. Si usa quindi un chip intermediario chiamato **DRV8833 (Ponte H / H-Bridge)**:
* Il PCA9685 genera i segnali di controllo PWM a bassa corrente.
* Questi segnali entrano nel driver DRV8833.
* Il DRV8833 preleva l'energia direttamente dalle batterie e la invia ai motori, regolandone la direzione e la velocità in base ai segnali PWM ricevuti dal PCA9685.

---

## 💡 Mappatura del Codice Python nel nostro Mock

Per testare questo meccanismo sul Mac senza l'hardware reale, implementeremo:

1. **`mock_hardware/adafruit_pca9685.py`**:
   Creiamo una classe `PCA9685` fittizia. All'interno conterrà una lista chiamata `channels` di 16 oggetti. Ogni oggetto simulerà una porta fisica del chip.
2. **`mock_hardware/adafruit_motor/servo.py`**:
   Creiamo la classe `Servo`. Quando modificheremo la proprietà `.angle`, il mock stamperà a schermo:
   `[MOCK SERVO] Impostato angolo del servo a X gradi`.
3. **`mock_hardware/adafruit_motor/motor.py`**:
   Creiamo la classe `DCMotor`. Quando modificheremo la proprietà `.throttle` (che accetta valori da `-1.0` a `+1.0`), il mock stamperà a schermo:
   `[MOCK MOTOR] Trazione motore impostata a X% (Avanti/Indietro)`.
