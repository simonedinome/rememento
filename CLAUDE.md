# CLAUDE.md

## All'inizio di ogni sessione
1. Verifica l'ambiente: `echo $CLAUDE_CODE_ENVIRONMENT_NAME` deve restituire il nome dell'ambiente personalizzato. Se è vuoto o `Default`, fermati e avvisa: le API esterne saranno bloccate.
2. Leggi `CONSTRAINTS.md` prima di scrivere codice. Non indebolirlo per far passare una modifica.
3. Leggi `CAPABILITY-MAP.md` e la spec del modulo su cui lavori (`SPEC-<module-id>.md`).
4. Prendi il primo task non completato in `tasks/todo.md`. Un task alla volta, fermati a ogni checkpoint.

## Regole
1. Nessun codice per un modulo senza spec approvata.
2. Le dipendenze tra moduli seguono solo le frecce della capability map.
3. Mai audio, secret o `.dev.vars` nel repo. I secret stanno nelle variabili dell'ambiente cloud o in `wrangler secret`.
4. Migrazioni D1: prima `--local`, poi `--remote`. Mai modificare una migrazione già applicata: se serve una modifica, ne crei una nuova.
5. Prima di dichiarare un task completato: `npm run check:task` deve passare.
6. Se un controllo fallisce, correggi il codice. Non modificare la soglia, non aggiungere soppressioni, non saltare il test.
