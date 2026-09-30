// Copertura delle righe modificate (CONSTRAINTS.md): almeno l'80% delle righe eseguibili aggiunte in src/
// rispetto al branch base deve essere coperto dai test. Legge coverage/lcov.info di `vitest run --coverage`.
// Base: $FLOOR_BASE_REF, default origin/main.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";

const THRESHOLD = 80;
const LCOV_PATH = "coverage/lcov.info";
const baseRef = process.env.FLOOR_BASE_REF ?? "origin/main";

function git(...args) {
	return execFileSync("git", args, { encoding: "utf8" });
}

function mergeBase() {
	try {
		git("rev-parse", "--verify", "--quiet", baseRef);
	} catch {
		git("fetch", "--quiet", "origin", baseRef.replace(/^origin\//, ""));
	}
	return git("merge-base", "HEAD", baseRef).trim();
}

function addRange(changed, file, start, count) {
	const lines = changed.get(file) ?? new Set();
	for (let line = start; line < start + count; line++) lines.add(line);
	changed.set(file, lines);
}

function changedLines(base) {
	const changed = new Map();
	let file = null;
	for (const line of git(
		"diff",
		"--no-color",
		"--unified=0",
		base,
		"--",
		"src",
	).split("\n")) {
		if (line.startsWith("+++ ")) {
			file = line === "+++ /dev/null" ? null : line.slice(6);
			continue;
		}
		const hunk = /^@@ -\S+ \+(\d+)(?:,(\d+))? @@/.exec(line);
		if (hunk && file)
			addRange(
				changed,
				file,
				Number(hunk[1]),
				hunk[2] === undefined ? 1 : Number(hunk[2]),
			);
	}
	const untracked = git(
		"ls-files",
		"--others",
		"--exclude-standard",
		"--",
		"src",
	)
		.split("\n")
		.filter(Boolean);
	for (const path of untracked) {
		addRange(changed, path, 1, readFileSync(path, "utf8").split("\n").length);
	}
	return changed;
}

function lineHits(lcov) {
	const hits = new Map();
	let file = null;
	for (const line of lcov.split("\n")) {
		if (line.startsWith("SF:")) {
			file = relative(process.cwd(), resolve(line.slice(3)));
			hits.set(file, new Map());
		} else if (line.startsWith("DA:") && file) {
			const [lineNumber, count] = line.slice(3).split(",");
			hits.get(file).set(Number(lineNumber), Number(count));
		}
	}
	return hits;
}

if (!existsSync(LCOV_PATH)) {
	console.error(
		`diff-coverage: ${LCOV_PATH} non trovato, esegui prima \`vitest run --coverage\``,
	);
	process.exit(1);
}

const hits = lineHits(readFileSync(LCOV_PATH, "utf8"));
const uncovered = [];
let executable = 0;
for (const [file, lines] of changedLines(mergeBase())) {
	const fileHits = hits.get(file);
	if (!fileHits) continue;
	for (const line of [...lines].sort((a, b) => a - b)) {
		if (!fileHits.has(line)) continue;
		executable++;
		if (fileHits.get(line) === 0) uncovered.push(`${file}:${line}`);
	}
}

if (executable === 0) {
	console.log("diff-coverage: nessuna riga eseguibile modificata in src/");
	process.exit(0);
}

const percent = ((executable - uncovered.length) / executable) * 100;
const summary = `${executable - uncovered.length}/${executable} righe modificate coperte (${percent.toFixed(1)}%, soglia ${THRESHOLD}%)`;
if (percent < THRESHOLD) {
	console.error(`diff-coverage: ${summary}`);
	for (const location of uncovered) console.error(`  non coperta: ${location}`);
	process.exit(1);
}
console.log(`diff-coverage: ${summary}`);
