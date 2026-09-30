import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { beforeAll, describe, expect, expectTypeOf, it } from "vitest";
import { newId } from "../../src/core/ids";
import type {
	ChunkRow,
	ItemRow,
	ItemSegmentRow,
	ItemTagRow,
	MeetingRow,
	NoteRow,
	SegmentRow,
	SpeakerRow,
} from "../../src/core/types";

const COLUMNS = {
	meetings: [
		"id",
		"title",
		"recorded_at",
		"recorded_at_source",
		"duration_s",
		"language",
		"audio_key",
		"provider",
		"model",
		"status",
		"notion_page_id",
		"created_at",
	],
	speakers: ["id", "meeting_id", "label", "name", "verified", "confidence"],
	segments: [
		"id",
		"meeting_id",
		"speaker_id",
		"seq",
		"start_ms",
		"end_ms",
		"text",
	],
	notes: ["id", "notion_page_id", "meeting_id", "content_hash", "written_at"],
	items: ["id", "meeting_id", "note_id", "type", "text", "created_at"],
	item_segments: ["item_id", "segment_id"],
	item_tags: ["item_id", "tag_id"],
	chunks: ["id", "meeting_id", "first_seq", "last_seq"],
} as const;

const NOW = "2026-09-30T09:00:00.000Z";

async function tableNames(): Promise<string[]> {
	const { results } = await env.DB.prepare(
		"SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name != 'd1_migrations' ORDER BY name",
	).all<{ name: string }>();
	return results.map((row) => row.name);
}

async function insertMeeting(recordedAtSource = "filename"): Promise<string> {
	const id = newId();
	await env.DB.prepare(
		"INSERT INTO meetings (id, title, recorded_at, recorded_at_source, audio_key, status, created_at) VALUES (?, ?, ?, ?, ?, 'uploaded', ?)",
	)
		.bind(
			id,
			"Riunione di prova",
			NOW,
			recordedAtSource,
			`audio/${id}.m4a`,
			NOW,
		)
		.run();
	return id;
}

async function insertSegment(meetingId: string): Promise<string> {
	const speakerId = newId();
	const segmentId = newId();
	await env.DB.batch([
		env.DB.prepare(
			"INSERT INTO speakers (id, meeting_id, label) VALUES (?, ?, 'A')",
		).bind(speakerId, meetingId),
		env.DB.prepare(
			"INSERT INTO segments (id, meeting_id, speaker_id, seq, start_ms, end_ms, text) VALUES (?, ?, ?, 0, 0, 4200, 'Decidiamo di partire a ottobre.')",
		).bind(segmentId, meetingId, speakerId),
	]);
	return segmentId;
}

let tablesBeforeMigration: string[] = [];

beforeAll(async () => {
	tablesBeforeMigration = await tableNames();
	await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
});

describe("0001_init", () => {
	it("creates the eight tables of the spec on an empty database", async () => {
		expect(tablesBeforeMigration).toEqual([]);
		expect(await tableNames()).toEqual(Object.keys(COLUMNS).sort());
	});

	it("gives every table exactly the columns of its row type", async () => {
		expectTypeOf<(typeof COLUMNS.meetings)[number]>().toEqualTypeOf<
			keyof MeetingRow
		>();
		expectTypeOf<(typeof COLUMNS.speakers)[number]>().toEqualTypeOf<
			keyof SpeakerRow
		>();
		expectTypeOf<(typeof COLUMNS.segments)[number]>().toEqualTypeOf<
			keyof SegmentRow
		>();
		expectTypeOf<(typeof COLUMNS.notes)[number]>().toEqualTypeOf<
			keyof NoteRow
		>();
		expectTypeOf<(typeof COLUMNS.items)[number]>().toEqualTypeOf<
			keyof ItemRow
		>();
		expectTypeOf<(typeof COLUMNS.item_segments)[number]>().toEqualTypeOf<
			keyof ItemSegmentRow
		>();
		expectTypeOf<(typeof COLUMNS.item_tags)[number]>().toEqualTypeOf<
			keyof ItemTagRow
		>();
		expectTypeOf<(typeof COLUMNS.chunks)[number]>().toEqualTypeOf<
			keyof ChunkRow
		>();

		for (const [table, columns] of Object.entries(COLUMNS)) {
			const { results } = await env.DB.prepare(
				`SELECT name FROM pragma_table_info('${table}')`,
			).all<{ name: string }>();
			expect(results.map((row) => row.name)).toEqual(columns);
		}
	});

	it("stores a meeting with a segment and an item that cites it", async () => {
		const meetingId = await insertMeeting();
		const segmentId = await insertSegment(meetingId);
		const itemId = newId();
		await env.DB.batch([
			env.DB.prepare(
				"INSERT INTO items (id, meeting_id, type, text, created_at) VALUES (?, ?, 'decision', 'Partenza a ottobre', ?)",
			).bind(itemId, meetingId, NOW),
			env.DB.prepare(
				"INSERT INTO item_segments (item_id, segment_id) VALUES (?, ?)",
			).bind(itemId, segmentId),
		]);

		const row = await env.DB.prepare(
			"SELECT items.text AS item, segments.text AS quote, speakers.label AS speaker FROM items JOIN item_segments ON item_segments.item_id = items.id JOIN segments ON segments.id = item_segments.segment_id JOIN speakers ON speakers.id = segments.speaker_id WHERE items.id = ?",
		)
			.bind(itemId)
			.first();
		expect(row).toEqual({
			item: "Partenza a ottobre",
			quote: "Decidiamo di partire a ottobre.",
			speaker: "A",
		});
	});

	it("rejects an item with neither a meeting nor a note", async () => {
		await expect(
			env.DB.prepare(
				"INSERT INTO items (id, type, text, created_at) VALUES (?, 'insight', 'Orfano', ?)",
			)
				.bind(newId(), NOW)
				.run(),
		).rejects.toThrow(/CHECK constraint failed/);
	});

	it("rejects a segment of an unknown meeting", async () => {
		await expect(insertSegment(newId())).rejects.toThrow(
			/FOREIGN KEY constraint failed/,
		);
	});

	it("requires recorded_at_source to be one of the four sources", async () => {
		await expect(insertMeeting("guess")).rejects.toThrow(
			/CHECK constraint failed/,
		);
		await expect(
			env.DB.prepare(
				"INSERT INTO meetings (id, title, recorded_at, audio_key, status, created_at) VALUES (?, 'Senza fonte', ?, 'audio/x.m4a', 'uploaded', ?)",
			)
				.bind(newId(), NOW, NOW)
				.run(),
		).rejects.toThrow(
			/NOT NULL constraint failed: meetings.recorded_at_source/,
		);
	});

	it("refuses to delete a meeting until its children are deleted", async () => {
		const meetingId = await insertMeeting("manual");
		await insertSegment(meetingId);
		const deleteMeeting = env.DB.prepare(
			"DELETE FROM meetings WHERE id = ?",
		).bind(meetingId);

		await expect(deleteMeeting.run()).rejects.toThrow(
			/FOREIGN KEY constraint failed/,
		);

		await env.DB.batch([
			env.DB.prepare("DELETE FROM segments WHERE meeting_id = ?").bind(
				meetingId,
			),
			env.DB.prepare("DELETE FROM speakers WHERE meeting_id = ?").bind(
				meetingId,
			),
			deleteMeeting,
		]);
		const remaining = await env.DB.prepare(
			"SELECT count(*) AS total FROM meetings WHERE id = ?",
		)
			.bind(meetingId)
			.first<number>("total");
		expect(remaining).toBe(0);
	});
});
