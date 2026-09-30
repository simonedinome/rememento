# Spec: core

## Objective
Fondamenta condivise da tutti gli altri moduli: configurazione validata, tipi di dominio, schema del database D1 con migrazioni, convenzioni e helper per R2, vocabolario dei tag. `core` non chiama API esterne e non contiene logica di business.

Utente: solo Simone (uso personale). Consumatori: tutti gli altri moduli della capability map.

## Tech Stack
1. Cloudflare Workers, TypeScript strict.
2. D1 (SQLite) per i metadati, R2 per audio e JSON grezzi, Vectorize per gli embedding (l'indice viene creato qui, usato da processing e retrieval).
3. Zod per validare la configurazione.
4. Vitest + `@cloudflare/vitest-plugin`. Biome per lint e format.
5. Versioni: ultima stabile al momento dello scaffold, fissate in `package.json` (nessun `^`).

## Commands
```
Install:     npm ci
Dev:         npx wrangler dev
Test:        npm test                      # vitest run
Typecheck:   npx tsc --noEmit
Lint:        npx biome check --write .
Migr. local: npx wrangler d1 migrations apply meetings-db --local
Migr. remote:npx wrangler d1 migrations apply meetings-db --remote
Deploy:      npx wrangler deploy
```

## Project Structure
```
src/core/config.ts      → validazione Zod di config/*.json + requireSecrets (controllo dei secret dichiarati da ogni modulo)
src/core/types.ts       → tipi di dominio condivisi
src/core/r2.ts          → convenzioni chiavi R2 + helper put/get JSON
src/core/ids.ts         → generazione UUID
migrations/             → migrazioni D1 numerate (0001_init.sql, ...)
config/tags.json        → vocabolario tag controllato
config/providers.json   → provider predefinito e fallback
tests/core/             → test del modulo
wrangler.toml           → binding: DB (D1), BUCKET (R2), VECTORS (Vectorize)
.dev.vars               → secret locali (in .gitignore)
```

## Modello dati (D1)

| Tabella | Campi principali | Note |
|---|---|---|
| meetings | id, title, recorded_at, duration_s, language, audio_key, provider, model, status, notion_page_id, created_at | status: uploaded, transcribing, processing, done, failed |
| speakers | id, meeting_id, label, name, verified, confidence | label = etichetta del provider (A, 0...); verified 0/1 |
| segments | id, meeting_id, speaker_id, seq, start_ms, end_ms, text | ordine per seq |
| items | id, meeting_id, note_id, type, text, created_at | type: decision, action_item, insight, summary; meeting_id e note_id nullable, almeno uno valorizzato |
| item_segments | item_id, segment_id | da quale parte della trascrizione viene l'elemento |
| item_tags | item_id, tag_id | tag_id deve esistere in config/tags.json |
| notes | id, notion_page_id, meeting_id, content_hash, written_at | note manuali; meeting_id valorizzato se collegata a una riunione |
| chunks | id, meeting_id, first_seq, last_seq | blocchi di trascrizione indicizzati in Vectorize |

Vectorize: un indice unico, 1536 dimensioni (text-embedding-3-small), metadati `{ kind: item | summary | chunk | note, meeting_id, recorded_at }`. L'id del vettore coincide con l'id della riga D1.

## Convenzioni R2
```
audio/{meetingId}.{ext}
raw/{meetingId}/{provider}.json        → risposta grezza del provider
extraction/{meetingId}.json            → output JSON dell'LLM
```

## Tipi condivisi (contratto verso gli altri moduli)
```ts
export type Segment = {
  speakerLabel: string;
  startMs: number;
  endMs: number;
  text: string;
};

export type TranscriptionResult = {
  provider: ProviderId;
  model: string;
  language: string;
  durationS: number;
  segments: Segment[];
};

export type ProviderId = "deepgram" | "assemblyai" | "elevenlabs" | "openai";
```

## Code Style
```ts
export async function putJson(bucket: R2Bucket, key: string, value: unknown): Promise<void> {
  await bucket.put(key, JSON.stringify(value), {
    httpMetadata: { contentType: "application/json" },
  });
}
```
Funzioni piccole e pure dove possibile, niente classi senza stato, nomi in inglese, commenti solo dove il perché non è ovvio. Errori espliciti con messaggio che dice cosa manca (es. `Missing secret: NOTION_TOKEN`).

## Testing Strategy
1. Test unitari per config: un tag sconosciuto o un provider non valido devono essere rifiutati.
2. Test di integrazione nel pool Workers: le migrazioni si applicano su un D1 vuoto; round-trip put/get JSON su R2 simulato.
3. Nessuna chiamata di rete nei test.

## Boundaries
- Always: test e typecheck verdi prima di ogni commit; migrazioni solo additive; secret solo in variabili d'ambiente o `wrangler secret`.
- Ask first: modifiche a schema esistente (rinomina o rimozione colonne), nuove dipendenze, cambio dimensione dell'indice Vectorize (richiede un indice nuovo e il re-embedding di tutto).
- Never: commit di secret, audio o `.dev.vars`; chiamate ad API esterne da `core`; `--remote` sulle migrazioni senza aver prima eseguito `--local`.

## Success Criteria
1. `npm test` e `npx tsc --noEmit` passano nell'ambiente Claude Code cloud.
2. `0001_init.sql` crea tutte le tabelle sopra, sia in locale sia su remoto.
3. La config rifiuta all'avvio un tag o un provider non valido, con messaggio esplicito. `core` non elenca i secret: ogni modulo dichiara i propri e li verifica con `requireSecrets` quando li usa, che rifiuta un secret mancante con il suo nome.
4. L'indice Vectorize esiste con 1536 dimensioni.
5. Gli altri moduli possono importare `TranscriptionResult` e gli helper R2 senza toccare `core`.

## Open Questions
1. Lista iniziale dei tag per `config/tags.json` (progetti, persone, tipo): da fornire prima della spec di `processing`.
2. Elaborazione asincrona degli audio lunghi: Queues o Workflows nel piano free, da verificare prima della spec di `ingest` (non blocca `core`).
