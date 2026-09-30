import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { newId } from "../../src/core/ids";
import {
	audioKey,
	extractionKey,
	getJson,
	putJson,
	rawKey,
} from "../../src/core/r2";

const MEETING_ID = "3f2b8c1e-9d4a-4e6b-8a7c-1d2e3f4a5b6c";

describe("R2 keys", () => {
	it("follow the conventions of SPEC-core.md", () => {
		expect(audioKey(MEETING_ID, "m4a")).toBe(`audio/${MEETING_ID}.m4a`);
		expect(rawKey(MEETING_ID, "deepgram")).toBe(
			`raw/${MEETING_ID}/deepgram.json`,
		);
		expect(extractionKey(MEETING_ID)).toBe(`extraction/${MEETING_ID}.json`);
	});

	it("normalizes the audio extension", () => {
		expect(audioKey(MEETING_ID, ".M4A")).toBe(`audio/${MEETING_ID}.m4a`);
	});

	it("rejects an extension that is not a plain suffix", () => {
		expect(() => audioKey(MEETING_ID, "m4a/../x")).toThrow(
			"Invalid audio extension: m4a/../x",
		);
		expect(() => audioKey(MEETING_ID, "")).toThrow("Invalid audio extension");
	});

	it("rejects a meeting id that is not a UUID", () => {
		expect(() => extractionKey("../secrets")).toThrow(
			"Invalid meeting id: ../secrets",
		);
		expect(() => rawKey(MEETING_ID.toUpperCase(), "openai")).toThrow(
			"Invalid meeting id",
		);
		expect(() => audioKey("meeting", "m4a")).toThrow("Invalid meeting id");
	});
});

describe("putJson and getJson", () => {
	it("round-trip the same value", async () => {
		const key = extractionKey(newId());
		const value = {
			summary: "Decisione: partenza a ottobre — città: Genève",
			items: [{ type: "decision", segments: [0, 3], confidence: 0.92 }],
			speaker: null,
			verified: false,
		};
		await putJson(env.BUCKET, key, value);
		expect(await getJson(env.BUCKET, key)).toEqual(value);
	});

	it("store the value as application/json", async () => {
		const key = rawKey(newId(), "assemblyai");
		await putJson(env.BUCKET, key, { ok: true });
		const head = await env.BUCKET.head(key);
		expect(head?.httpMetadata?.contentType).toBe("application/json");
	});

	it("return null for a missing key", async () => {
		expect(await getJson(env.BUCKET, extractionKey(newId()))).toBeNull();
	});

	it("name the key when the object is not valid JSON", async () => {
		const key = extractionKey(newId());
		await env.BUCKET.put(key, "{not json");
		await expect(getJson(env.BUCKET, key)).rejects.toThrow(
			`Invalid JSON in R2 object ${key}`,
		);
	});
});
