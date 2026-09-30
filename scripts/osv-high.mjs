// Vulnerabilità delle dipendenze (CONSTRAINTS.md): blocca solo severità high o critical, cioè CVSS >= 7.0.
// osv-scanner non ha una soglia di severità, quindi si filtra il suo output JSON.
// Una vulnerabilità senza punteggio CVSS blocca, perché potrebbe essere high.
import { spawnSync } from "node:child_process";

const HIGH = 7;

const scan = spawnSync(
	"osv-scanner",
	["scan", "source", "-r", "--format", "json", "."],
	{
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
	},
);
if (scan.error) {
	console.error(`osv-high: osv-scanner non eseguibile (${scan.error.message})`);
	process.exit(1);
}
// Exit code di osv-scanner: 0 nessuna vulnerabilità, 1 vulnerabilità trovate, altro errore di scansione.
if (scan.status !== 0 && scan.status !== 1) {
	console.error(
		`osv-high: osv-scanner terminato con codice ${scan.status}\n${scan.stderr}`,
	);
	process.exit(1);
}

const blocking = [];
let total = 0;
for (const source of JSON.parse(scan.stdout).results ?? []) {
	for (const { package: pkg, groups = [] } of source.packages ?? []) {
		for (const group of groups) {
			total++;
			const score = Number.parseFloat(group.max_severity);
			if (Number.isNaN(score) || score >= HIGH) {
				blocking.push(
					`${pkg.name}@${pkg.version}  ${group.ids.join(", ")}  CVSS ${group.max_severity || "assente"}`,
				);
			}
		}
	}
}

if (blocking.length > 0) {
	console.error(`osv-high: ${blocking.length} vulnerabilità high o critical`);
	for (const entry of blocking) console.error(`  ${entry}`);
	process.exit(1);
}
console.log(`osv-high: ok (${total} vulnerabilità sotto la soglia high)`);
