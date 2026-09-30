# CLAUDE.md

## All'inizio di ogni sessione
1. Verifica la rete: `bash scripts/check-network.sh` deve uscire con codice 0. Se segnala un dominio `BLOCKED` o una variabile mancante, fermati e avvisa: il dominio va aggiunto alla allowlist dell'ambiente cloud, la variabile alle sue impostazioni.
2. Leggi `CONSTRAINTS.md` prima di scrivere codice. Non indebolirlo per far passare una modifica.
3. Leggi `CAPABILITY-MAP.md` e la spec del modulo su cui lavori (`SPEC-<module-id>.md`).
4. Prendi il primo task non completato in `tasks/todo.md`. Un task alla volta, fermati a ogni checkpoint.

## Regole
1. Nessun codice per un modulo senza spec approvata.
2. Le dipendenze tra moduli seguono solo le frecce della capability map.
3. Mai audio, secret o `.dev.vars` nel repo. I secret stanno nelle variabili dell'ambiente cloud o in `wrangler secret`.
4. Migrazioni D1: prima `--local`, poi `--remote`. Mai modificare una migrazione già applicata: se serve una modifica, ne crei una nuova.
5. Ogni esecuzione `--remote` (migrazione o `d1 execute`) che crea o modifica vincoli (`PRIMARY KEY`, `UNIQUE`, `NOT NULL`, `CHECK`) o chiavi esterne richiede l'approvazione esplicita di Simone prima di essere eseguita. Mostra l'SQL e aspetta la risposta: l'approvazione vale solo per quell'SQL.
6. Prima di dichiarare un task completato: `npm run check:task` deve passare.
7. Se un controllo fallisce, correggi il codice. Non modificare la soglia, non aggiungere soppressioni, non saltare il test.
8. Una riunione si cancella solo con la funzione di `core` descritta in `SPEC-core.md` (Cancellazione di una riunione). Se non esiste ancora, va aggiunta a `core` prima di usarla: nessun modulo cancella da solo righe di `meetings` o dei suoi figli.
