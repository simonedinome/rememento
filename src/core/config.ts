import { z } from "zod";
import providersFile from "../../config/providers.json";
import tagsFile from "../../config/tags.json";
import { PROVIDER_IDS } from "./types";

const providerIdSchema = z.enum(PROVIDER_IDS);

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

const secretSchema = z.string().trim().min(1);

export type Tag = z.infer<typeof tagSchema>;

export type ProvidersConfig = z.infer<typeof providersSchema>;

export type Config = {
	providers: ProvidersConfig;
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

export function loadConfig(files: ConfigFiles = DEFAULT_FILES): Config {
	return {
		providers: parseFile(
			providersSchema,
			files.providers,
			"config/providers.json",
		),
		tags: parseFile(tagsSchema, files.tags, "config/tags.json").tags,
	};
}

// Each module declares the secrets it uses and calls this before using them.
export function requireSecrets<const N extends string>(
	env: object,
	names: readonly N[],
): Record<N, string> {
	const secrets: Partial<Record<N, string>> = {};
	const missing: N[] = [];
	for (const name of names) {
		const result = secretSchema.safeParse(Reflect.get(env, name));
		if (result.success) {
			secrets[name] = result.data;
		} else {
			missing.push(name);
		}
	}
	if (missing.length > 0) {
		throw new Error(
			missing.map((name) => `Missing secret: ${name}`).join("; "),
		);
	}
	return secrets as Record<N, string>;
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
