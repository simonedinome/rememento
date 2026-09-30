import { describe, expect, it } from "vitest";
import {
	assertKnownTags,
	loadConfig,
	requireSecrets,
} from "../../src/core/config";

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

describe("loadConfig", () => {
	it("loads the committed config files", () => {
		const config = loadConfig();
		expect(config.providers).toEqual({
			default: "deepgram",
			fallback: "assemblyai",
		});
		expect(config.tags).toHaveLength(3);
	});

	it("rejects a fallback provider equal to the default", () => {
		expect(() =>
			loadConfig({
				tags,
				providers: { default: "deepgram", fallback: "deepgram" },
			}),
		).toThrow(
			"Invalid config/providers.json: fallback: fallback must differ from default",
		);
	});

	it("rejects an unknown provider", () => {
		expect(() =>
			loadConfig({
				tags,
				providers: { default: "whisper", fallback: "assemblyai" },
			}),
		).toThrow("Invalid config/providers.json: default:");
	});

	it("rejects a tag with an unknown category", () => {
		const invalid = {
			tags: [{ id: "budget", label: "Budget", category: "finance" }],
		};
		expect(() => loadConfig({ tags: invalid, providers })).toThrow(
			"Invalid config/tags.json: tags.0.category:",
		);
	});

	it("rejects a tag id that cannot be a hashtag", () => {
		const invalid = {
			tags: [
				{ id: "Progetto Alfa", label: "Progetto Alfa", category: "project" },
			],
		};
		expect(() => loadConfig({ tags: invalid, providers })).toThrow(
			"Invalid config/tags.json: tags.0.id:",
		);
	});

	it("rejects a tags file that is not an object", () => {
		expect(() => loadConfig({ tags: [], providers })).toThrow(
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
		expect(() => loadConfig({ tags: invalid, providers })).toThrow(
			"Invalid config/tags.json: tags.2.id: duplicate tag id progetto_alfa",
		);
	});
});

describe("requireSecrets", () => {
	const env = {
		NOTION_TOKEN: " notion-test\n",
		OPENAI_API_KEY: "openai-test",
		UNRELATED: "value",
	};

	it("returns only the requested secrets, trimmed", () => {
		expect(requireSecrets(env, ["NOTION_TOKEN", "OPENAI_API_KEY"])).toEqual({
			NOTION_TOKEN: "notion-test",
			OPENAI_API_KEY: "openai-test",
		});
	});

	it("names the missing secret", () => {
		expect(() => requireSecrets(env, ["TELEGRAM_BOT_TOKEN"])).toThrow(
			"Missing secret: TELEGRAM_BOT_TOKEN",
		);
	});

	it("treats a blank secret as missing", () => {
		expect(() =>
			requireSecrets({ NOTION_TOKEN: "  " }, ["NOTION_TOKEN"]),
		).toThrow("Missing secret: NOTION_TOKEN");
	});

	it("lists every missing secret at once", () => {
		expect(() =>
			requireSecrets(env, [
				"DEEPGRAM_API_KEY",
				"NOTION_TOKEN",
				"TELEGRAM_BOT_TOKEN",
			]),
		).toThrow(
			"Missing secret: DEEPGRAM_API_KEY; Missing secret: TELEGRAM_BOT_TOKEN",
		);
	});
});

describe("assertKnownTags", () => {
	const config = loadConfig({ tags, providers });

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
