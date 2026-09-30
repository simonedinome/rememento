import { z } from "zod";
import providersFile from "../../config/providers.json";
import tagsFile from "../../config/tags.json";
import type { ProviderId } from "./types";

// `satisfies` rejects missing and extra keys, so the keys are exactly the ProviderId values.
const PROVIDER_SECRETS = {
	deepgram: "DEEPGRAM_API_KEY",
	assemblyai: "ASSEMBLYAI_API_KEY",
	elevenlabs: "ELEVENLABS_API_KEY",
	openai: "OPENAI_API_KEY",
} as const satisfies Record<ProviderId, string>;

const providerIdSchema = z.enum(
	Object.keys(PROVIDER_SECRETS) as [ProviderId, ...ProviderId[]],
);

// OpenAI is always required because embeddings use text-embedding-3-small.
const BASE_SECRETS = [
	"TELEGRAM_BOT_TOKEN",
	"NOTION_TOKEN",
	"OPENAI_API_KEY",
] as const;

type BaseSecret = (typeof BASE_SECRETS)[number];
type SecretName = BaseSecret | (typeof PROVIDER_SECRETS)[ProviderId];

const secretSchema = z.string().trim().min(1);

const providersSchema = z
	.strictObject({ default: providerIdSchema, fallback: providerIdSchema })
	.refine((providers) => providers.default !== providers.fallback, {
		error: "fallback must differ from default",
		path: ["fallback"],
	});

const tagSchema = z.strictObject({
	id: z
		.string()
		.regex(
			/^[a-z][a-z0-9_]*$/,
			"must be lowercase letters, digits or underscores, usable as a hashtag",
		),
	label: z.string().trim().min(1),
	category: z.enum(["project", "person", "topic"]),
	description: z.string().trim().min(1).optional(),
});

const tagsSchema = z
	.strictObject({ tags: z.array(tagSchema).min(1) })
	.superRefine(({ tags }, ctx) => {
		const seen = new Set<string>();
		for (const [index, tag] of tags.entries()) {
			if (seen.has(tag.id)) {
				ctx.addIssue({
					code: "custom",
					path: ["tags", index, "id"],
					message: `duplicate tag id ${tag.id}`,
				});
			}
			seen.add(tag.id);
		}
	});

export type Tag = z.infer<typeof tagSchema>;

export type ProviderSettings = { id: ProviderId; apiKey: string };

export type Config = {
	secrets: Record<BaseSecret, string>;
	providers: { default: ProviderSettings; fallback: ProviderSettings };
	tags: readonly Tag[];
};

export type ConfigFiles = { tags: unknown; providers: unknown };

const DEFAULT_FILES: ConfigFiles = { tags: tagsFile, providers: providersFile };

function parseFile<T>(schema: z.ZodType<T>, value: unknown, path: string): T {
	const result = schema.safeParse(value);
	if (!result.success) {
		const details = result.error.issues.map(
			(issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`,
		);
		throw new Error(`Invalid ${path}: ${details.join("; ")}`);
	}
	return result.data;
}

// Call only after assertSecretsPresent, which reports every missing secret by name.
function readSecret(env: object, name: SecretName): string {
	return secretSchema.parse(Reflect.get(env, name));
}

function assertSecretsPresent(env: object, names: readonly SecretName[]): void {
	const missing = names.filter(
		(name) => !secretSchema.safeParse(Reflect.get(env, name)).success,
	);
	if (missing.length > 0) {
		throw new Error(
			missing.map((name) => `Missing secret: ${name}`).join("; "),
		);
	}
}

export function loadConfig(
	env: object,
	files: ConfigFiles = DEFAULT_FILES,
): Config {
	const providers = parseFile(
		providersSchema,
		files.providers,
		"config/providers.json",
	);
	const { tags } = parseFile(tagsSchema, files.tags, "config/tags.json");
	const defaultSecret = PROVIDER_SECRETS[providers.default];
	const fallbackSecret = PROVIDER_SECRETS[providers.fallback];
	assertSecretsPresent(env, [
		...new Set<SecretName>([...BASE_SECRETS, defaultSecret, fallbackSecret]),
	]);

	return {
		secrets: {
			TELEGRAM_BOT_TOKEN: readSecret(env, "TELEGRAM_BOT_TOKEN"),
			NOTION_TOKEN: readSecret(env, "NOTION_TOKEN"),
			OPENAI_API_KEY: readSecret(env, "OPENAI_API_KEY"),
		},
		providers: {
			default: {
				id: providers.default,
				apiKey: readSecret(env, defaultSecret),
			},
			fallback: {
				id: providers.fallback,
				apiKey: readSecret(env, fallbackSecret),
			},
		},
		tags,
	};
}

export function assertKnownTags(
	tags: readonly Tag[],
	ids: readonly string[],
): void {
	const known = new Set(tags.map((tag) => tag.id));
	const unknown = ids.filter((id) => !known.has(id));
	if (unknown.length > 0) {
		throw new Error(`Unknown tag: ${unknown.join(", ")}`);
	}
}
