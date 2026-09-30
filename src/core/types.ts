// Contract shared with the other modules (SPEC-core.md). Changing it breaks their code.

export const PROVIDER_IDS = [
	"deepgram",
	"assemblyai",
	"elevenlabs",
	"openai",
] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export type Segment = {
	speakerLabel: string;
	startMs: number;
	endMs: number;
	text: string;
};

export type TranscriptionResult = {
	provider: ProviderId;
	model: string;
	language: string;
	durationS: number;
	segments: Segment[];
};

// D1 rows, one per table of SPEC-core.md. Timestamps are ISO 8601 UTC strings; booleans are 0 or 1.

export type MeetingStatus =
	| "uploaded"
	| "transcribing"
	| "processing"
	| "done"
	| "failed";

// Where recorded_at comes from: audio metadata, the file name, the file modification time or manual input.
export type RecordedAtSource = "metadata" | "filename" | "mtime" | "manual";

export type MeetingRow = {
	id: string;
	title: string;
	recorded_at: string;
	recorded_at_source: RecordedAtSource;
	duration_s: number | null;
	language: string | null;
	audio_key: string;
	provider: ProviderId | null;
	model: string | null;
	status: MeetingStatus;
	notion_page_id: string | null;
	created_at: string;
};

export type SpeakerRow = {
	id: string;
	meeting_id: string;
	label: string;
	name: string | null;
	verified: 0 | 1;
	confidence: number | null;
};

export type SegmentRow = {
	id: string;
	meeting_id: string;
	speaker_id: string;
	seq: number;
	start_ms: number;
	end_ms: number;
	text: string;
};

export type ItemType = "decision" | "action_item" | "insight" | "summary";

// At least one of meeting_id and note_id is set.
export type ItemRow = {
	id: string;
	meeting_id: string | null;
	note_id: string | null;
	type: ItemType;
	text: string;
	created_at: string;
};

export type ItemSegmentRow = {
	item_id: string;
	segment_id: string;
};

export type ItemTagRow = {
	item_id: string;
	tag_id: string;
};

export type NoteRow = {
	id: string;
	notion_page_id: string;
	meeting_id: string | null;
	content_hash: string;
	written_at: string;
};

export type ChunkRow = {
	id: string;
	meeting_id: string;
	first_seq: number;
	last_seq: number;
};
