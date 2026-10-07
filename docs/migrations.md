# Migrazioni D1

Regole in `CLAUDE.md`: prima `--local`, poi `--remote`; una migrazione già applicata non si modifica, se ne crea una nuova.

```
npx wrangler d1 migrations apply meetings-db --local
npx wrangler d1 migrations apply meetings-db --remote
npx wrangler d1 migrations list meetings-db --remote
```

## Chiavi esterne senza `ON DELETE`

D1 applica sempre le chiavi esterne e non permette di disattivarle. Un `DROP TABLE` esegue un `DELETE` implicito che attiva le azioni `ON DELETE`: con `CASCADE`, ricostruire una tabella padre (per esempio per cambiare un `CHECK`) cancellerebbe tutte le righe figlie senza errori. Per questo `0001_init.sql` dichiara le chiavi esterne senza azione e i figli si cancellano esplicitamente, prima del padre.

## Ricostruire una tabella padre

SQLite non permette di cambiare un `CHECK` o il tipo di una colonna con `ALTER TABLE`: serve ricostruire la tabella. Con le chiavi esterne attive, l'ordine che funziona è copia, `DROP`, `CREATE`, reinserimento, con i controlli differiti al commit:

```sql
PRAGMA defer_foreign_keys = ON;
CREATE TABLE meetings_copy AS SELECT * FROM meetings;
DROP TABLE meetings;
CREATE TABLE meetings (...nuovo schema...);
INSERT INTO meetings (...colonne...) SELECT ...colonne... FROM meetings_copy;
DROP TABLE meetings_copy;
```

1. Gli indici della tabella ricostruita vanno ricreati nella stessa migrazione.
2. Non funziona rinominare prima la tabella padre (`ALTER TABLE meetings RENAME TO ...`): con le chiavi esterne attive, SQLite riscrive i riferimenti delle tabelle figlie verso il nuovo nome, e il `DROP` successivo le viola.
3. Verificato con SQLite 3.45: con chiavi esterne senza azione, le righe figlie restano e `PRAGMA foreign_key_check` è vuoto; con `ON DELETE CASCADE`, la stessa procedura svuota le tabelle figlie.
