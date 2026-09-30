# Todo: core

Leggi `CLAUDE.md` prima di iniziare. Un task alla volta, in ordine. Fermati a ogni checkpoint.

## Task 1: Scaffold del Worker e tooling di base

**Description:** Creare il progetto Worker TypeScript con `create-cloudflare`, configurare TypeScript strict, Biome, Vitest con `@cloudflare/vitest-pool-workers` e un endpoint `GET /health` che risponde `ok`.

**Acceptance criteria:**
- [x] `tsconfig.json` con `strict: true`; versioni in `package.json` senza `^` né `~`
- [x] `.gitignore` include `.dev.vars`, `node_modules`, `.wrangler`, `coverage`, `*.m4a`, `*.mp3`, `*.wav`
- [x] Un test verifica che `GET /health` risponda 200 con `ok`

**Verification:**
- [x] `npm test` passa
- [x] `npx tsc --noEmit` e `npx biome check .` senza errori

**Dependencies:** Prerequisiti manuali di `tasks/plan.md`

**Files likely touched:** `package.json`, `tsconfig.json`, `biome.json`, `vitest.config.ts`, `wrangler.toml`, `src/index.ts`, `tests/health.test.ts`, `.gitignore`

**Estimated scope:** M (circa 30 minuti)

## Task 2: Provisioning delle risorse Cloudflare e smoke deploy

**Description:** Creare database D1 `meetings-db`, bucket R2 `meetings-audio` e indice Vectorize `meetings-vectors` (1536 dimensioni, metrica cosine). Collegarli nel `wrangler.toml` come `DB`, `BUCKET` e `VECTORS` e fare il primo deploy.

**Acceptance criteria:**
- [x] Le tre risorse esistono e compaiono in `npx wrangler d1 list`, `npx wrangler r2 bucket list` e `npx wrangler vectorize list`
- [x] `npx wrangler deploy` riesce e `GET /health` sull'URL `workers.dev` risponde `ok`
- [x] I comandi usati sono documentati in `docs/provisioning.md`, così si possono rieseguire

**Verification:**
- [x] `curl` sull'URL deployato restituisce `ok`
- [ ] Manual check: le risorse sono visibili nella dashboard Cloudflare

**Dependencies:** Task 1

**Files likely touched:** `wrangler.toml`, `docs/provisioning.md`

**Estimated scope:** S (circa 20 minuti)

## Checkpoint A
- [x] Deploy riuscito dall'ambiente cloud
- [ ] Revisione con Simone

## Task 3: Script di controllo, guardia del floor e regole di dependency-cruiser

**Description:** Aggiungere a `package.json` gli script `check:fast`, `check:task` e `check:full` come da `CONSTRAINTS.md`. Aggiungere uno script `scripts/floor-guard.sh` che controlla sul diff le cinque regole del floor. Configurare dependency-cruiser con le frecce di `CAPABILITY-MAP.md`.

**Acceptance criteria:**
- [x] `check:fast` esegue tsc, Biome e gitleaks; `check:task` aggiunge Vitest con copertura, osv-scanner, depcruise e floor-guard
- [x] Le regole di dependency-cruiser vietano ogni import che vada contro le frecce della capability map (es. `src/core` non importa da nessun altro modulo)
- [x] `floor-guard.sh` esce con codice 1 se il diff aggiunge `@ts-ignore`, `.skip`, `.only`, `catch {}` vuoto o `Not implemented`

**Verification:**
- [x] `npm run check:task` passa in meno di 90 secondi
- [x] Manual check: un file di prova con `@ts-ignore` e un import vietato fa fallire il controllo, poi viene rimosso

**Dependencies:** Task 1

**Files likely touched:** `package.json`, `scripts/floor-guard.sh`, `.dependency-cruiser.cjs`

**Estimated scope:** M (circa 40 minuti)

## Task 4: Caricamento e validazione della configurazione

**Description:** Implementare `src/core/config.ts`, che carica e valida con Zod i secret dell'ambiente, `config/tags.json` e `config/providers.json`. Creare `tags.json` con lo schema definitivo e 3 tag segnaposto.

**Acceptance criteria:**
- [ ] Un secret mancante genera un errore con il nome esatto del secret (es. `Missing secret: NOTION_TOKEN`)
- [ ] Un tag o un provider non valido viene rifiutato all'avvio
- [ ] `providers.json` definisce il provider predefinito e quello di fallback, che devono essere diversi

**Verification:**
- [ ] Test unitari per il caso valido, il secret mancante, il tag sconosciuto e il fallback uguale al predefinito
- [ ] `npm run check:task` passa

**Dependencies:** Task 3

**Files likely touched:** `src/core/config.ts`, `config/tags.json`, `config/providers.json`, `tests/core/config.test.ts`

**Estimated scope:** S (circa 30 minuti)

## Task 5: Tipi condivisi e generazione degli id

**Description:** Definire in `src/core/types.ts` i tipi della spec (`Segment`, `TranscriptionResult`, `ProviderId`) e i tipi delle righe D1. Implementare in `src/core/ids.ts` la generazione di UUID v4.

**Acceptance criteria:**
- [ ] I tipi corrispondono esattamente al contratto in `SPEC-core.md`
- [ ] `newId()` restituisce UUID v4 validi e unici su 1000 chiamate

**Verification:**
- [ ] Test unitario su `newId()`
- [ ] `npm run check:task` passa

**Dependencies:** Task 3

**Files likely touched:** `src/core/types.ts`, `src/core/ids.ts`, `tests/core/ids.test.ts`

**Estimated scope:** XS (circa 15 minuti)

## Checkpoint B
- [ ] Una violazione volontaria viene bloccata dai controlli
- [ ] Revisione con Simone

## Task 6: Migrazione D1 iniziale

**Description:** Scrivere `migrations/0001_init.sql` con le otto tabelle di `SPEC-core.md`, con chiavi esterne e indici su `meeting_id` e `recorded_at`. Applicarla prima in locale, poi sul remoto.

**Acceptance criteria:**
- [ ] Tutte le tabelle e i campi della spec esistono
- [ ] Il vincolo "almeno uno tra `meeting_id` e `note_id`" su `items` è garantito da un `CHECK`
- [ ] La migrazione è applicata su remoto, sempre dopo quella locale

**Verification:**
- [ ] Un test nel pool Workers applica la migrazione su un D1 vuoto, inserisce una riunione con un segmento e un elemento, e verifica che un elemento senza riunione né nota venga rifiutato
- [ ] `npx wrangler d1 migrations list meetings-db --remote` mostra `0001` applicata

**Dependencies:** Task 2, Task 5

**Files likely touched:** `migrations/0001_init.sql`, `tests/core/schema.test.ts`

**Estimated scope:** S (circa 30 minuti)

## Task 7: Convenzioni e helper R2

**Description:** Implementare in `src/core/r2.ts` le funzioni che costruiscono le chiavi (`audioKey`, `rawKey`, `extractionKey`) e gli helper `putJson` e `getJson`.

**Acceptance criteria:**
- [ ] Le chiavi seguono esattamente le convenzioni di `SPEC-core.md`
- [ ] `getJson` su una chiave inesistente restituisce `null` invece di lanciare un errore
- [ ] Un round-trip put/get restituisce l'oggetto identico

**Verification:**
- [ ] Test nel pool Workers con R2 simulato
- [ ] `npm run check:task` passa

**Dependencies:** Task 5

**Files likely touched:** `src/core/r2.ts`, `tests/core/r2.test.ts`

**Estimated scope:** S (circa 20 minuti)

## Checkpoint C: modulo core completo
- [ ] Tutti i Success Criteria di `SPEC-core.md` soddisfatti
- [ ] Copertura del progetto registrata in `CONSTRAINTS.md`
- [ ] Revisione con Simone prima di `SPEC-transcription.md`
