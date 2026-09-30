# Implementation Plan: core

Spec di riferimento: `SPEC-core.md`. Vincoli: `CONSTRAINTS.md`. Mappa: `CAPABILITY-MAP.md`.

## Overview
Fondamenta del progetto: scaffold del Worker, provisioning delle risorse Cloudflare, controlli di qualità, configurazione validata, tipi condivisi, schema D1, helper R2. Alla fine del piano gli altri moduli possono partire senza toccare `core`.

## Architecture Decisions
1. **Provisioning subito dopo lo scaffold.** È il punto più fragile (token, rete dell'ambiente cloud, permessi): se fallisce, deve fallire il primo giorno, non dopo aver scritto il codice.
2. **Controlli di qualità prima del codice di dominio.** Ogni task successivo nasce già dentro i vincoli, invece di doverli rispettare a posteriori.
3. **Versioni fissate a quelle generate da `create-cloudflare`.** Evita incompatibilità tra Vitest e `@cloudflare/vitest-pool-workers`.
4. **Vectorize a 1536 dimensioni** (text-embedding-3-small), come da spec. Cambiarle in futuro significa creare un indice nuovo e ricalcolare tutti gli embedding.

## Prerequisiti (manuali, a carico di Simone)
Non sono task dell'agente: vanno completati prima del Task 1.

1. Repo GitHub privato creato e collegato a Claude Code cloud.
2. Account Cloudflare creato. API token con permessi di modifica su Workers Scripts, D1, Workers R2 Storage e Vectorize, più lettura di Account Settings.
3. Ambiente cloud personalizzato in Claude Code:
   1. rete Custom, con i domini `api.cloudflare.com`, `*.r2.cloudflarestorage.com`, `api.telegram.org`, `api.notion.com`, `api.openai.com`, `api.deepgram.com`, `api.assemblyai.com`, `api.elevenlabs.io`, più l'opzione "includi i registri pacchetti di default";
   2. variabili `CLOUDFLARE_API_TOKEN` e `CLOUDFLARE_ACCOUNT_ID`;
   3. setup script che installa gitleaks e osv-scanner.
4. `CAPABILITY-MAP.md`, `SPEC-core.md`, `CONSTRAINTS.md`, `CLAUDE.md` e `tasks/` nella root del repo.

## Task List

### Phase 1: Foundation
- [x] Task 1: Scaffold del Worker e tooling di base
- [x] Task 2: Provisioning delle risorse Cloudflare e smoke deploy

### Checkpoint A
- [x] `npx wrangler deploy` riesce dall'ambiente cloud
- [x] D1, R2 e Vectorize esistono e sono collegati nel `wrangler.toml`
- [ ] Revisione con Simone

### Phase 2: Quality gates e config
- [x] Task 3: Script di controllo, guardia del floor e regole di dependency-cruiser
- [x] Task 4: Caricamento e validazione della configurazione
- [ ] Task 5: Tipi condivisi e generazione degli id

### Checkpoint B
- [ ] `npm run check:task` passa in meno di 90 secondi
- [ ] Una violazione volontaria (tag sconosciuto, `@ts-ignore`, import vietato) viene bloccata
- [ ] Revisione con Simone

### Phase 3: Dati
- [ ] Task 6: Migrazione D1 iniziale
- [ ] Task 7: Convenzioni e helper R2

### Checkpoint C: modulo core completo
- [ ] Tutti i Success Criteria di `SPEC-core.md` soddisfatti
- [ ] Copertura del progetto misurata e registrata in `CONSTRAINTS.md`
- [ ] Revisione con Simone prima di scrivere `SPEC-transcription.md`

## Risks and Mitigations

| Rischio | Impatto | Mitigazione |
|---|---|---|
| La sessione parte nell'ambiente cloud Default invece di quello personalizzato, e le API vengono bloccate senza avviso | Alto | All'inizio di ogni sessione eseguire `scripts/check-network.sh`, che prova tutti i domini della allowlist |
| Permessi del token Cloudflare insufficienti | Medio | Il Task 2 verifica ogni risorsa singolarmente; l'errore indica quale permesso manca |
| Incompatibilità di versione tra Vitest e il pool Workers | Medio | Versioni generate da `create-cloudflare` e fissate senza `^` |
| Lista dei tag non ancora definita | Basso per `core` | `tags.json` con uno schema e 3 tag segnaposto; lista reale prima della spec di `processing` |

## Open Questions
1. Lista iniziale dei tag (non blocca `core`, blocca `processing`).
2. Elaborazione asincrona degli audio lunghi: Queues o Workflows nel piano free (non blocca `core`, blocca `ingest`).
