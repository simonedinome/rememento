import { describe, expect, it } from "vitest";
import { assertKnownTags, loadConfig } from "../../src/core/config";

const env = {
	TELEGRAM_BOT_TOKEN: "telegram-test",
	NOTION_TOKEN: "notion-test",
	OPENAI_API_KEY: "openai-test",
	DEEPGRAM_API_KEY: "deepgram-test",
	ASSEMBLYAI_API_KEY: "assemblyai-test",
};

const tags = {
	tags: [
		{ id: "progetto_alfa", label: "Progetto Alfa", category: "project" },
		{
			id: "mario_rossi",
			label: "Mario Rossi",
			category: "person",
			description: "Collega",
		},
	],
};

const providers = { default: "deepgram", fallback: "assemblyai" };

function withoutKey(
	source: Record<string, string>,
	key: string,
): Record<string, string> {
	return Object.fromEntries(
		Object.entries(source).filter(([name]) => name !== key),
	);
}

describe("loadConfig", () => {
	it("loads the committed config files with every required secret", () => {
		const config = loadConfig(env);
		expect(config.providers.default).toEqual({
			id: "deepgram",
			apiKey: "deepgram-test",
		});
		expect(config.providers.fallback).toEqual({
			id: "assemblyai",
			apiKey: "assemblyai-test",
		});
		expect(config.secrets).toEqual({
			TELEGRAM_BOT_TOKEN: "telegram-test",
			NOTION_TOKEN: "notion-test",
			OPENAI_API_KEY: "openai-test",
		});
		expect(config.tags).toHaveLength(3);
	});

	it("names the missing secret", () => {
		expect(() => loadConfig(withoutKey(env, "NOTION_TOKEN"))).toThrow(
			"Missing secret: NOTION_TOKEN",
		);
	});

	it("treats a blank secret as missing", () => {
		expect(() => loadConfig({ ...env, OPENAI_API_KEY: "  " })).toThrow(
			"Missing secret: OPENAI_API_KEY",
		);
	});

	it("lists every missing secret at once", () => {
		expect(() => loadConfig({})).toThrow(
			"Missing secret: TELEGRAM_BOT_TOKEN; Missing secret: NOTION_TOKEN; Missing secret: OPENAI_API_KEY; Missing secret: DEEPGRAM_API_KEY; Missing secret: ASSEMBLYAI_API_KEY",
		);
	});

	it("requires the secret of the configured transcription providers only", () => {
		const files = {
			tags,
			providers: { default: "elevenlabs", fallback: "openai" },
		};
		expect(() => loadConfig(env, files)).toThrow(
			"Missing secret: ELEVENLABS_API_KEY",
		);
		const config = loadConfig(
			{ ...env, ELEVENLABS_API_KEY: "elevenlabs-test" },
			files,
		);
		expect(config.providers.fallback).toEqual({
			id: "openai",
			apiKey: "openai-test",
		});
	});

	it("rejects a fallback provider equal to the default", () => {
		expect(() =>
			loadConfig(env, {
				tags,
				providers: { default: "deepgram", fallback: "deepgram" },
			}),
		).toThrow(
			"Invalid config/providers.json: fallback: fallback must differ from default",
		);
	});

	it("rejects an unknown provider", () => {
		expect(() =>
			loadConfig(env, {
				tags,
				providers: { default: "whisper", fallback: "assemblyai" },
			}),
		).toThrow("Invalid config/providers.json: default:");
	});

	it("rejects a tag with an unknown category", () => {
		const invalid = {
			tags: [{ id: "budget", label: "Budget", category: "finance" }],
		};
		expect(() => loadConfig(env, { tags: invalid, providers })).toThrow(
			"Invalid config/tags.json: tags.0.category:",
		);
	});

	it("rejects a tag id that cannot be a hashtag", () => {
		const invalid = {
			tags: [
				{ id: "Progetto Alfa", label: "Progetto Alfa", category: "project" },
			],
		};
		expect(() => loadConfig(env, { tags: invalid, providers })).toThrow(
			"Invalid config/tags.json: tags.0.id:",
		);
	});

	it("rejects a tags file that is not an object", () => {
		expect(() => loadConfig(env, { tags: [], providers })).toThrow(
			"Invalid config/tags.json: (root):",
		);
	});

	it("rejects duplicate tag ids", () => {
		const invalid = {
			tags: [
				...tags.tags,
				{ id: "progetto_alfa", label: "Altro", category: "topic" },
			],
		};
		expect(() => loadConfig(env, { tags: invalid, providers })).toThrow(
			"Invalid config/tags.json: tags.2.id: duplicate tag id progetto_alfa",
		);
	});
});

describe("assertKnownTags", () => {
	const config = loadConfig(env, { tags, providers });

	it("accepts tags from the vocabulary", () => {
		expect(() =>
			assertKnownTags(config.tags, ["progetto_alfa", "mario_rossi"]),
		).not.toThrow();
	});

	it("rejects a tag missing from the vocabulary", () => {
		expect(() =>
			assertKnownTags(config.tags, ["progetto_alfa", "progetto_beta"]),
		).toThrow("Unknown tag: progetto_beta");
	});
});
