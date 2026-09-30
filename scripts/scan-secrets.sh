#!/usr/bin/env bash
# Secret scan di CONSTRAINTS.md: la storia git e i file del working tree in src, tests, config e scripts,
# compresi quelli modificati o nuovi e non ancora committati.
# --ignore-gitleaks-allow: un commento gitleaks:allow è una soppressione, vietata dal floor.
set -euo pipefail

flags=(--redact --no-banner --ignore-gitleaks-allow --verbose --log-level warn)

gitleaks detect "${flags[@]}"
for dir in src tests config scripts; do
	if [ -d "$dir" ]; then
		gitleaks dir "${flags[@]}" "$dir"
	fi
done
echo "scan-secrets: ok"
