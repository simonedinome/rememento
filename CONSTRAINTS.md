# Constraints

Last reviewed: 2026-09-30 by Simone

Questo file è la fonte canonica della soglia di qualità. Gli script in `package.json` lo rispecchiano; se divergono, vince questo file. Non va mai indebolito nello stesso commit di una modifica che non passava.

## Floor (sempre bloccante)

1. Nessun nuovo commento di soppressione: `@ts-ignore`, `@ts-expect-error` senza motivo, `biome-ignore`.
2. Nessuno stub non implementato: `throw new Error("Not implemented")`, `catch {}` vuoti, `TODO` al posto dell'implementazione.
3. Nessun test saltato (`.skip`, `.only`) o cancellato senza motivo nel messaggio di commit.
4. Nessun secret nel codice, nei test, nelle fixture o nei log. Nessun audio nel repo.
5. Questo file non viene indebolito per far passare una modifica.

## Enforced with numbers

| Dimensione | Regola | Checked by | Runs at | Perché |
|---|---|---|---|---|
| Types | Zero errori | `npx tsc --noEmit` | ogni modifica | TypeScript strict è la prima difesa contro i contratti tra moduli rotti |
| Lint | Zero errori | `npx biome check .` | ogni modifica | Stile unico tra sessioni diverse dell'agente |
| Secrets | Zero finding | `scripts/scan-secrets.sh`: `gitleaks detect` sulla storia git e `gitleaks dir` sui file di `src`, `tests`, `config` e `scripts`, anche non committati; i commenti `gitleaks:allow` non valgono (`--ignore-gitleaks-allow`) | ogni modifica | 6-7 token API gestiti da un agente non sorvegliato: un secret va fermato prima del commit, non dopo |
| Copertura | Righe modificate ≥ 80% | `npx vitest run --coverage` + `git diff` | fine task | Abbastanza alta da forzare un test, abbastanza bassa da permettere righe di config |
| Dipendenze | Nessuna vulnerabilità high o critical | `osv-scanner scan source -r .` | fine task | Sotto high è quasi tutto rumore |
| Architettura | Zero violazioni della capability map | `npx depcruise --validate .dependency-cruiser.cjs src` | fine task | Le frecce di `CAPABILITY-MAP.md` devono restare in una sola direzione |
| Contratti provider | Il parsing passa sulle risposte reali congelate | `npx vitest run tests/contracts` | fine task (da modulo `transcription`) | Controllo esterno: le fixture vengono dai provider, non dall'agente |

## Default applicati (modificabili)

Queste tre scelte non sono state discusse esplicitamente; sono i default della skill, adattati a un progetto nuovo senza codice legacy.

1. **Bloccare o avvisare:** tutto bloccante. Non c'è codice esistente da proteggere, quindi nessun motivo per un periodo di solo avviso.
2. **Numeri:** soglie di default sopra, non "misura e mantieni", perché non esiste ancora un valore di partenza da misurare.
3. **Tempo massimo dei controlli a fine task:** 90 secondi.

## Measured, not yet enforced

| Metrica | Oggi | Direzione |
|---|---|---|
| Copertura del progetto | da misurare alla fine del modulo `core` | non deve scendere |

## Exceptions

| ID | Regola | Path | Motivo | Owner | Expires |
|---|---|---|---|---|---|
| — | — | — | — | — | — |
