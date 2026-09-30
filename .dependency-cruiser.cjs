// Arrows of CAPABILITY-MAP.md between modules other than core.
const arrows = {
	core: [],
	transcription: [],
	processing: ["transcription"],
	"notion-sync": [],
	ingest: ["transcription", "processing", "notion-sync"],
	retrieval: [],
	"telegram-bot": ["retrieval", "ingest"],
};

// Every module may import from core; core imports from no module (CAPABILITY-MAP.md, rule 4).
const allowedImports = Object.fromEntries(
	Object.entries(arrows).map(([module, targets]) => [
		module,
		module === "core" ? [] : ["core", ...targets],
	]),
);

const capabilityMapRules = Object.entries(allowedImports).map(
	([module, dependencies]) => ({
		name: `capability-map-${module}`,
		comment: `src/${module} may import only from: ${[module, ...dependencies].join(", ")} (CAPABILITY-MAP.md)`,
		severity: "error",
		from: { path: `^src/${module}/` },
		to: {
			path: "^src/",
			pathNot: `^src/(${[module, ...dependencies].join("|")})/`,
		},
	}),
);

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
	forbidden: [
		...capabilityMapRules,
		{
			name: "no-circular",
			comment:
				"Dependencies go in one direction only (CAPABILITY-MAP.md, rule 3)",
			severity: "error",
			from: {},
			to: { circular: true },
		},
	],
	options: {
		doNotFollow: { path: "node_modules" },
		tsPreCompilationDeps: true,
		tsConfig: { fileName: "tsconfig.json" },
	},
};
