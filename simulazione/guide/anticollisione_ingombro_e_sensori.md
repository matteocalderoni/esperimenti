# Anticollisione: ingombro del robot nel pianificatore e semantica dei sensori

Data: 2026-09-02 — Interventi 1 e 2 dell'analisi sull'evitamento ostacoli.

## Il problema

Il robot in modalità esplorazione passava l'**85,1% dei tick di navigazione in
frenata d'emergenza** (`frontDist < 0,22 m`) e restava sostanzialmente incastrato
contro i mobili: la copertura della mappa si fermava intorno al 71% e avanzava di
un punto percentuale ogni 25 secondi.

La causa non era la taratura delle soglie, ma il fatto che **l'A\* pianificava
percorsi che il robot fisicamente non poteva percorrere**.

### Perché

La dilatazione degli ostacoli era espressa in *celle di griglia*:

```
canvas          446 × 438 px   (dipende dalla finestra del browser)
griglia SLAM    70 × 52 celle
→ cella         6,37 × 8,42 px  ← non quadrata
raggio robot    22 px = 3,45 celle in orizzontale
dilatazione r=2 12,7 px         ← 58% del raggio del robot
```

Il pianificatore trattava il robot come un **punto adimensionale**. Misura sui
percorsi realmente prodotti: 11 waypoint su 23 passavano a meno di 22 px dai muri,
uno con distanza 0 (dentro il muro). In più `planAdaptiveSlamAStar`, quando non
trovava un percorso, *abbassava la sicurezza* provando r=1 e poi r=0 anziché
scartare l'obiettivo.

Secondo problema, indipendente: `ultrasonicDist` era il minimo su tutte e nove le
sonde di prossimità (±75°), e su quel singolo valore si decideva la frenata. Il
robot non distingueva **"ostacolo davanti"** da **"ostacolo che sto costeggiando"**.

## Cosa è cambiato

### 1. Dilatazione ancorata all'ingombro fisico

Nuovo modulo `web_simulator/js/slam/slam_inflation.js`:

- `CAR_RADIUS_PX` (22 px) è ora una costante condivisa in `state.js`, usata sia da
  `kinematics.js` per la collisione sia dal pianificatore. Unica fonte di verità.
- `getSafeDilationCells()` converte il raggio del telaio (più un margine del 10%)
  in celle **separatamente per asse**, perché le celle non sono quadrate.
  Alle dimensioni attuali: `{rx: 4, ry: 3}`.
- `getDilatedSlamGrid(rx, ry)` è anisotropa; senza argomenti usa il raggio sicuro.
- `planAdaptiveSlamAStar()` fa **un solo tentativo**, al raggio sicuro. Se non
  esiste un percorso percorribile restituisce `[]` e il chiamante prova la
  frontiera successiva: si scarta l'obiettivo, mai il margine di sicurezza.

### 2. Semantica dei sensori separata

In `sensors.js` le tre distanze hanno ora significati distinti e non collassano
più in un minimo unico:

| valore | significato | chi lo usa |
|---|---|---|
| `frontDist` | minimo del cono frontale (±20°) | decide la **frenata** |
| `leftDist` / `rightDist` | settori laterali (oltre ±20°) | decidono **da che parte scansare** |
| `ultrasonicDist` | il singolo HC-SR04 sulla testa pan-tilt | telemetria, `keepDistance`, disegno del fascio |

Consumatori aggiornati a `frontDist`: `slam_navigator.js`, `obstacle_guard.js`
(incluso lo stop del tracciamento linea) e l'indicatore LED in `physics.js`.

## Risultati misurati

Stessa strumentazione prima e dopo, modalità esplorazione dall'avvio:

| metrica | prima | dopo |
|---|---|---|
| tick in frenata d'emergenza (su NAVIGATE) | 85,1 % | **0 %** |
| collisioni fisiche | 1 su 175 tick | **0 su 1275 tick** |
| copertura mappa | ~71 %, in stallo | **85 %, esplorazione conclusa** |

## Test

```bash
node simulazione/test_planner_safety.js --tutti
node simulazione/test_sensor_semantics.js --tutti
```

I moduli del simulatore sono script "browser globals": `simulazione/sim_test_harness.js`
li concatena ed esegue in un contesto `vm` di Node, senza dipendenze esterne e
senza modificare i file di produzione.

## Note e lavoro residuo

- L'esplorazione ora **termina** al 85% invece di proseguire all'infinito: il
  restante 15% è spazio che il robot, con il suo ingombro reale, non può
  raggiungere. Il modale di fine rilievo ha però il titolo "99%" cablato mentre
  mostra la percentuale reale nel badge: incoerenza cosmetica preesistente,
  diventata visibile ora che la procedura arriva davvero in fondo.
- Restano aperti i punti 3 e 4 dell'analisi: sostituire la guardia a soglie di
  `obstacle_guard.js` con un Dynamic Window Approach (le nove sonde in
  `robotState.proximityProbes` sono calcolate a ogni frame e oggi **non le legge
  nessuno**), e introdurre `dt` nell'integrazione di `kinematics.js`, oggi
  espressa in px/frame e rad/frame.
- Codice morto individuato durante l'analisi e **non** toccato da questo
  intervento: `recoverySpeedSign` (calcolato in `kinematics.js`, mai letto: la
  manovra di recupero retrocede sempre anche quando la via di fuga è in avanti),
  `rayDistances` (letto da `isClearForRotation()` ma mai scritto, quindi lo stato
  `ROTATE_180` è irraggiungibile), `stuckFrames`, `stuckEscaping`, `targetHeading`.
- Lo stesso difetto di dilatazione esiste lato Python: `core/occupancy_grid.py`
  usa `radius_cells=2` slegato dall'ingombro.

---

# Intervento 3: Dynamic Window Approach

Data: 2026-09-02 — sostituzione del livello reattivo.

## Cosa c'era

`obstacle_guard.js` era una cascata di soglie su tre scalari: sotto 65 cm curva,
sotto 18 cm retromarcia. Non simulava nulla, quindi si accorgeva dell'ostacolo
solo quando era già addosso, e le nove sonde di prossimità calcolate a ogni frame
non le leggeva nessuno.

## Cosa c'è ora

Nuovo modulo `web_simulator/js/dwa_planner.js` (campionamento e punteggio) e
`dwa_obstacles.js` (nuvola di punti dalle sonde). A ogni tick campiona le coppie
(velocità, sterzo) raggiungibili nel prossimo frame — la *dynamic window*, limitata
dall'accelerazione — ne simula la traiettoria con la stessa cinematica del
simulatore e sceglie la migliore secondo:

```
punteggio = 2,2·allineamento_al_goal + 1,8·margine_dagli_ostacoli + 0,7·velocità
```

Una candidata è ammissibile solo se supera due criteri:

1. **ingombro**: la traiettoria resta a più di `CAR_RADIUS_PX × 1,15` (25,3 px) dagli
   ostacoli — lo stesso margine usato dalla dilatazione dell'A\*;
2. **frenata**: `v ≤ sqrt(2 · accSpeed · spazio_libero)`, cioè la velocità deve
   permettere di fermarsi entro lo spazio residuo. È il criterio canonico del DWA
   ed è ciò che impedisce di "strisciare" contro un muro a bassa velocità.

Se nessuna candidata in avanti è ammissibile scatta `dwaEscape()`: retromarcia
verso il lato più libero, unica manovra autorizzata a violare il limite di
accelerazione perché è una frenata di emergenza.

Gli ostacoli vengono ricostruiti dalle sonde **interpolando fra sonde adiacenti**:
nove punti isolati lasciavano varchi in cui una traiettoria stretta si infilava pur
attraversando un muro continuo.

Consumatori: `slam_navigator.js` (insegue il waypoint A\* chiedendo il comando al
DWA) e `obstacle_guard.js`, che si riduce al solo contratto verso `physics.js`
— "via libera? guida il comportamento; fronte chiuso? decide il DWA" — più
l'eccezione dello stop&wait del tracciamento linea.

## Risultati misurati

800 tick di esplorazione dall'avvio, stessa strumentazione dei precedenti:

| metrica | prima dell'intervento 1 | dopo 1+2 | dopo 1+2+3 |
|---|---|---|---|
| collisioni fisiche | 1 / 175 tick | 0 / 1275 tick | **0 / 800 tick** |
| tick a contatto (<14 cm) | frequenti | 0 | **0** |
| manovre di disimpegno | — | — | **1,3% dei tick di navigazione** |
| copertura raggiunta | ~71%, in stallo | 85% | **86%** |
| tick per concludere | mai concluso | ~1275 | **~800** |

## Limiti noti

- **Le unità cinematiche restano incoerenti** (punto 4, non affrontato): la velocità
  è in px/frame e lo sterzo in rad/frame, mai dimensionati fra loro. A `v=1,35` e
  `maxSteer=0,14` il raggio di sterzata è 9,6 px, meno della metà del raggio del
  robot: il robot ruota su sé stesso più in fretta di quanto avanzi di una propria
  lunghezza. Il DWA ci convive limitando la rotazione simulata (`maxTurnRad`), ma
  la taratura di `lookaheadPx` e `maxTurnRad` resta empirica finché non si
  introduce `dt` con unità fisiche.
- Con un waypoint irraggiungibile perché coperto da un ostacolo il DWA entra in un
  **ciclo limite**: scansa, il goal lo richiama, riscansa. Non è pericoloso (zero
  urti in 80 tick di prova) e il rilevamento di stallo a 40 tick forza comunque un
  nuovo piano, ma è il motivo per cui il DWA da solo non basta: serve l'A\* sopra.
