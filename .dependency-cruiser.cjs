// Arrows of CAPABILITY-MAP.md: each module may import only from itself and the modules listed here.
const allowedImports = {
	core: [],
	transcription: ["core"],
	processing: ["core", "transcription"],
	"notion-sync": ["core"],
	ingest: ["transcription", "processing", "notion-sync"],
	retrieval: ["core"],
	"telegram-bot": ["retrieval", "ingest"],
};

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
