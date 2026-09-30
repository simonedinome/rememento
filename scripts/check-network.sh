#!/usr/bin/env bash
# Verifica che l'ambiente cloud raggiunga tutti i domini della allowlist (tasks/plan.md, prerequisito 3).
# Un host bloccato dal proxy non restituisce nessuna risposta HTTP: curl riporta il codice 000.
set -u

for var in CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID; do
	if [ -z "${!var:-}" ]; then
		echo "Missing env: $var"
		exit 1
	fi
done

hosts=(
	"api.cloudflare.com"
	"${CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com"
	"rememento.simonecarlucci33.workers.dev"
	"api.telegram.org"
	"api.notion.com"
	"api.openai.com"
	"api.deepgram.com"
	"api.assemblyai.com"
	"api.elevenlabs.io"
	"registry.npmjs.org"
)

failed=0
for host in "${hosts[@]}"; do
	code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$host")
	if [ "$code" = "000" ]; then
		echo "BLOCKED  $host"
		failed=1
	else
		echo "ok       $host (HTTP $code)"
	fi
done

exit "$failed"
