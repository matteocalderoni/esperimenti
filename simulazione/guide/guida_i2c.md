# Guida al Protocollo I2C: Come Comunicano i Chip

**Come fanno il "cervello" del robot (il Raspberry Pi) e i vari componenti (sensori, display, motori) a parlarsi tra loro?**

La tecnologia usata è **I2C** (pronunciata *I-quadro-C* o *I-two-C*, acronimo di *Inter-Integrated Circuit*). 

Questa guida ti spiega come funziona in modo semplice e figurato.

---

## 👥 L'analogia di base: L'aula scolastica

Immagina un'aula con un **insegnante** (il Raspberry Pi, chiamato **Master**) e molti **alunni** (i sensori e i motori, chiamati **Slaves**).

* Gli alunni non possono parlare tra loro.
* Possono parlare solo quando l'insegnante fa loro una domanda diretta.
* Per farlo, usano una lavagna condivisa da tutti. Questa lavagna ha solo due righe di gesso: una riga per il tempo (**SCL**) e una riga per le lettere (**SDA**).

---

## 🔌 Perché usiamo l'I2C? (Il problema dei troppi fili)

Se volessimo collegare il Raspberry Pi a ogni singolo componente usando fili dedicati, finiremmo i pin (le "porte" del computer) quasi subito e avremmo una giungla impraticabile di cavi.

Il protocollo I2C risolve questo problema permettendo a **moltissimi componenti (fino a 128!) di condividere gli stessi identici due fili**. È come una linea telefonica condivisa in cui tutti ascoltano lo stesso cavo, ma risponde solo chi viene chiamato per nome.

I due fili si chiamano:
1. **SCL (Serial Clock)**
2. **SDA (Serial Data)**

Vediamo cosa fanno nel dettaglio.

---

## ⏰ 1. SCL (Serial Clock) — Il "Battito del Tempo"

I chip elettronici non hanno orecchie per ascoltare, leggono la tensione elettrica (acceso/spento, ovvero `1` e `0`) a una velocità incredibile. Per capire quando leggere un dato, hanno bisogno di un segnale di tempo comune.

* **SCL è come un metronomo** controllato dal Raspberry Pi (Master).
* Il segnale su questo filo sale e scende di continuo ad intervalli regolari (es. 100.000 volte al secondo, ovvero 100 kHz).
* **La regola di lettura**: Ogni volta che il metronomo batte (il segnale di SCL passa da 0 a 1), tutti i chip sanno che in quel preciso istante devono leggere il valore presente sull'altro filo (SDA).

Senza SCL, un chip potrebbe leggere i dati troppo velocemente o troppo lentamente, confondendo una sequenza di `111` con un singolo `1` prolungato.

---

## 💬 2. SDA (Serial Data) — La "Voce dei Dati"

Questo è il filo su cui viaggiano le informazioni vere e proprie in formato binario (bit di `0` e `1`).

* Quando il clock (**SCL**) è attivo, il chip che sta parlando imposta la tensione su **SDA**:
  * Tensione alta (es. 3.3 Volt) $\rightarrow$ significa **`1`** (vero).
  * Tensione bassa (0 Volt) $\rightarrow$ significa **`0`** (falso).
* Poiché il cavo è unico, la comunicazione è **monodirezionale alternata (Half-Duplex)**: sul filo SDA può parlare solo un chip alla volta. Se parlassero insieme, i segnali elettrici si scontrerebbero creando interferenze.

---

## 📬 3. L'Indirizzamento: Come evitare che parlino tutti insieme?

Se tutti i sensori ascoltano lo stesso filo SDA, come fa un sensore a sapere che il messaggio è rivolto a lui? 

Grazie agli **Indirizzi I2C**.

Ogni chip Slave ha un **indirizzo numerico univoco** scritto nei suoi circuiti in fabbrica. È come un codice postale o il numero civico di una casa. Questi indirizzi sono solitamente scritti in formato esadecimale (numeri preceduti da `0x`).

### Come avviene una conversazione tipo sul bus I2C:

1. **Il Master attira l'attenzione**: Il Raspberry Pi invia un segnale di "Inizio" sul bus.
2. **Chiama per indirizzo**: Il Master invia sul filo SDA un byte contenente l'indirizzo del destinatario (es. `0x5f` per il controller dei motori) e specifica se vuole **scrivere** (inviare un comando) o **leggere** (ricevere un dato da un sensore).
3. **L'alunno alza la mano**: Tutti i chip sul bus leggono l'indirizzo chiamato. Solo il chip che possiede l'indirizzo `0x5f` risponde inviando un segnale di conferma (chiamato **ACK** - *Acknowledge*). Tutti gli altri chip si mettono a riposo e ignorano i messaggi successivi.
4. **Scambio di dati**: A questo punto, il Master e lo Slave selezionato si scambiano i dati byte dopo byte.
5. **Chiusura**: Il Master invia un segnale di "Stop" per liberare la linea. Ora il bus è libero per una nuova chiamata.

---

## 🚗 Gli indirizzi I2C nel nostro Robot

Nel nostro Adeept 4WD Smart Car, i principali componenti collegati al bus I2C del Raspberry Pi sono:

| Componente | Indirizzo I2C | Ruolo nel Robot |
| :--- | :--- | :--- |
| **PCA9685** | `0x5f` | Riceve i comandi dal Pi per muovere i servomotori (testa) e regolare la velocità dei motori DC (ruote). |
| **ADS7830** | `0x48` | Misura i valori analogici dei sensori di luce (fotoresistenze) e il voltaggio della batteria, convertendoli in dati digitali per il Pi. |
| **SSD1306** | `0x3c` (o simile) | Lo schermo OLED che mostra messaggi di testo e l'IP del robot. |

---

## 💡 Riepilogo per fissare i concetti

* **I2C** = Un bus di comunicazione a 2 fili condiviso da molti chip.
* **SCL** = Il clock (tempo) che scandisce il ritmo della lettura dei bit.
* **SDA** = La linea dei dati su cui viaggiano gli `0` e `1`.
* **Master (Raspberry Pi)** = Chi comanda il clock e decide chi deve parlare.
* **Slave (Sensore/Motore)** = Chi risponde solo quando viene chiamato il proprio **indirizzo**.
