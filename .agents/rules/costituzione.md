# Costituzione del Progetto Adeept 4WD & Simulatore

Questa Costituzione definisce le regole ferree di sviluppo e organizzazione del codice per l'intero progetto. Deve essere consultata e rispettata rigorosamente prima e durante ogni operazione.

## 1. Limite Assoluto di Dimensione (Max 150 righe)
- **Nessun programma o script** (Python, JavaScript, o altro) deve superare il limite massimo di **150 righe** di codice.
- Nel caso in cui una modifica porti il file a superare tale limite, il file **deve essere obbligatoriamente diviso** in moduli più piccoli e specializzati prima di procedere.

## 2. Principio di Singola Responsabilità (Single Responsibility)
- Ogni file, modulo, classe o funzione deve avere **una sola e specifica responsabilità** o scopo.
- File monolitici sono severamente vietati. Manteniamo un'architettura modulare: separa ad esempio l'accesso all'hardware, la logica di elaborazione dei dati, l'interfaccia utente (HTML/JS) e la gestione della rete in file e cartelle distinti.

## 3. Documentazione Costante e Continua
- **Ogni modifica strutturale, aggiunta o risoluzione di bug** deve essere prontamente documentata.
- Le documentazioni vanno redatte o aggiornate in appositi **file testuali `.md` all'interno della cartella `simulazione/guide/`** (oppure nei log principali se pertinenti).
- L'obiettivo è garantire un **punto di ripristino mentale perfetto**: il contesto, le ragioni di una modifica e i prossimi passi devono risultare evidenti ed immediatamente comprensibili a te in futuro, ad altri utenti e alle intelligenze artificiali ad ogni nuovo accesso o sessione.
