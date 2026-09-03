# Documentazione Tecnica: Architettura VLM Open-Vocabulary (Ollama Moondream) e Integrazione Robotica Generica

Questo documento descrive nel dettaglio come il robot **Adeept 4WD Smart Car** utilizza attualmente il **Vision-Language Model (VLM)** in locale per la percezione semantica visiva **Open-Vocabulary (ad ampio spettro su qualsiasi ambiente)**, insieme alle caratteristiche tecniche complete del modello **Moondream2** e alla proiezione spaziale 2D corretta.

---

## 1. Architettura Open-Vocabulary Generica (Qualsiasi Ambiente)

Anziché vincolare il robot a una scelta multipla rigida o a un catalogo chiuso di 5 arredi, il sistema adotta un approccio **Open-Vocabulary** capace di identificare e mappare qualsiasi oggetto o elemento architettonico in qualsiasi stanza (soggiorno, camera da letto, ufficio, garage, corridoio, cucina):

```
┌─────────────────────────────────────────────────────────────────────────┐
│   IMMAGINE FPV (Base64 JPEG)                                            │
└────────────────────┬────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│   PROMPT DI IDENTIFICAZIONE APERTO                                      │
│   "What main object, furniture, or architectural feature is in the      │
│    center foreground of this image? Output only the concise name."      │
└────────────────────┬────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│   LLM OLLAMA MOONDREAM2 (1.6B Parameters - Quantizzazione Q4_K_M)       │
└────────────────────┬────────────────────────────────────────────────────┘
                     │  Nome conciso dell'oggetto (es. "sofa", "desk", "bed")
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│   CLASSIFICATORE DINAMICO OPEN-VOCABULARY (VLMInspector.py)              │
│   Mappatura dinamica categoria, icona (🛋️, 🛏️, 🍽️, 🚪, 📺, 🗄️, 🪴...)   │
└────────────────────┬────────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│   PROIEZIONE VETTORIALE 2D & RAYCASTING REALE (exploration_bridge.js)   │
│   θ_ottico = θ_robot + θ_pan | Distanza d_impatto reale del sensore    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Risoluzione dei Problemi di Identificazione e Posizionamento

### A. Riconoscimento Preciso ma Generico (Open-Vocabulary Prompt)
1. **Prompt Strutturato Diretto**: Sostituita la frase vaga *"Describe this image"* con un prompt ad identificazione concisa del soggetto in primo piano:
   `"What main object, furniture, or architectural feature is in the center foreground of this image? Output only the concise object name."`
2. **Classificatore Generico Dinamico**: Il modulo `VLMInspector` mappa qualsiasi oggetto risposto da Moondream (es. divani, letti, scrivanie, sedie, televisori, porte, piante, elettrodomestici) assegnando l'icona emoji ed il simboleggiamento appropriato in modo completamente generico.

### B. Posizionamento Spaziale 2D Millimetrico sulla Mappa
1. **Allineamento dell'Asse Ottico 3D $\rightarrow$ 2D**: Corretta la formula dell'angolo del raggio in `exploration_bridge.js`:
   $$\theta_{\text{ottico}} = \theta_{\text{robot}} + \theta_{\text{pan}}$$
   Eliminata l'inversione di segno che proiettava gli oggetti visti a sinistra sul lato destro della piantina.
2. **Distanza d'Impatto Reale**: Eliminato il valore fisso arbitrario a 80 pixel. Il punto dell'oggetto viene ricavato dal raggio ultrasuoni/raycast reale $d_{\text{sensore}}$ dove la superficie visibile è stata effettivamente rilevata.
3. **Offset della Solidificazione Solida**: Il punto visibile viene trattato come **faccia anteriore dell'oggetto**, arricchendo l'ingombro solido nella griglia SLAM all'indietro e lasciando libero il passaggio frontale per il robot.

---

## 3. Scheda Tecnica del Modello (Moondream2)

| Parametro | Specifica Tecnica |
| :--- | :--- |
| **Nome Modello** | **Moondream2** (distribuito via Ollama col tag `moondream`) |
| **Numero di Parametri** | **~1.6 Miliardi (1.6B parameters)** |
| **Encoder Visivo (Vision)** | **SigLIP / ViT (Vision Transformer)** ottimizzato a bassa latenza |
| **Spina Dorsale Linguistica (LLM)** | Derivato da **Phi-1.5 / TinyLlama** (~1.4B parametri di linguaggio) |
| **Quantizzazione** | **GGUF q4_K_M (4-bit quantization)** |
| **Impronta Memoria RAM/VRAM** | **< 1.8 GB di VRAM/RAM** durante l'inferenza |
| **Latenza d'Inferenza** | **0.8 - 1.5 secondi** per frame su CPU/GPU standard |
| **Host/Server locale** | Service daemon **Ollama** su `http://localhost:11434` |
