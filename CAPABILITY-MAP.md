# Capability Map: Meeting Memory

Sistema personale che trascrive registrazioni di riunioni, estrae decisioni/action item/insight taggati e permette di ritrovarli dal telefono (Telegram) con speaker, data e citazione della trascrizione. Notion è l'archivio leggibile; D1 + Vectorize sono la fonte dei dati per la ricerca.

## Criterio di successo del progetto
Entro un mese: arretrato (~10 registrazioni da 30-60 min) importato, e almeno una decisione reale ritrovata da telefono in meno di un minuto, con speaker e data corretti.

## Moduli

| Module id | Responsabilità | Depends on |
|---|---|---|
| core | Config, tipi condivisi, schema D1 + migrazioni, helper R2, vocabolario tag | — |
| transcription | Adapter provider (Deepgram, AssemblyAI, ElevenLabs Scribe, OpenAI), output normalizzato, fallback, script benchmark | core |
| processing | Proposta nomi speaker, riassunto, elementi atomici con tag e riferimenti ai segmenti, embedding | core, transcription |
| notion-sync | Scrittura database Notion (Riunioni, Elementi, Note manuali), lettura note manuali | core |
| ingest | Pipeline audio → R2 → trascrizione → elaborazione → salvataggio; script locale per l'arretrato | core, transcription, processing, notion-sync |
| retrieval | Domanda → ricerca vettoriale su elementi, poi segmenti → risposta citata | core |
| telegram-bot | Domande, timeline con hashtag, conferma speaker, cattura nuovi audio | core, retrieval, ingest |

## Build order
1. core
2. transcription
3. processing ‖ notion-sync
4. ingest (fino all'import dell'arretrato)
5. retrieval
6. telegram-bot (solo ricerca + timeline)
7. note manuali (estensione di notion-sync + processing)
8. telegram-bot (cattura nuovi audio, conferma speaker, comando /model)

## Assunzioni approvate
1. Repo GitHub privato, TypeScript. Worker in `src/`, script una tantum in `scripts/`.
2. Sviluppo con Claude Code cloud in un ambiente personalizzato: allowlist con API Cloudflare, Telegram, Notion, OpenAI, Deepgram, AssemblyAI, ElevenLabs, endpoint R2, più i registri pacchetti di default. Deploy con `CLOUDFLARE_API_TOKEN` (niente `wrangler login`).
3. Nessun audio nel repo. Campioni di benchmark su R2.
4. Test con Vitest nel runtime Workers (`@cloudflare/vitest-plugin`).
5. Vocabolario tag in `config/tags.json`, versionato.

## Fuori scope
Note manoscritte Boox, integrazione Agentforce/BWH Buddy, second-brain come contenitore, condivisione con colleghi, UI web custom, routing automatico dei provider per costo.

## Regole
1. Ogni modulo ha la sua spec: `SPEC-<module-id>.md`. Nessun codice senza spec approvata.
2. I module id non si rinominano.
3. Le dipendenze vanno in una sola direzione. Se due moduli hanno bisogno l'uno dell'altro, sono un modulo solo.
4. Tutti i moduli possono importare da `core`; `core` non importa da nessun modulo. Le regole di `.dependency-cruiser.cjs` applicano la tabella sopra.
