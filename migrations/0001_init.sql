-- Initial schema of the core module (SPEC-core.md), mirrored by the row types in src/core/types.ts.
-- Timestamps are ISO 8601 UTC strings and booleans are 0 or 1. D1 always enforces foreign keys.
-- speakers and segments need no separate meeting_id index: their UNIQUE constraints start with meeting_id.
-- Foreign keys have no ON DELETE action on purpose: D1 cannot turn foreign keys off, and the DROP TABLE of a
-- later table rebuild would run the action and delete the child rows. Children are deleted explicitly
-- (rebuild procedure in docs/migrations.md).

CREATE TABLE meetings (
	id TEXT PRIMARY KEY,
	title TEXT NOT NULL,
	recorded_at TEXT NOT NULL,
	recorded_at_source TEXT NOT NULL CHECK (recorded_at_source IN ('metadata', 'filename', 'mtime', 'manual')),
	duration_s REAL,
	language TEXT,
	audio_key TEXT NOT NULL,
	provider TEXT CHECK (provider IN ('deepgram', 'assemblyai', 'elevenlabs', 'openai')),
	model TEXT,
	status TEXT NOT NULL CHECK (status IN ('uploaded', 'transcribing', 'processing', 'done', 'failed')),
	notion_page_id TEXT,
	created_at TEXT NOT NULL
);

CREATE INDEX idx_meetings_recorded_at ON meetings (recorded_at);

CREATE TABLE speakers (
	id TEXT PRIMARY KEY,
	meeting_id TEXT NOT NULL REFERENCES meetings (id),
	label TEXT NOT NULL,
	name TEXT,
	verified INTEGER NOT NULL DEFAULT 0 CHECK (verified IN (0, 1)),
	confidence REAL,
	UNIQUE (meeting_id, label)
);

CREATE TABLE segments (
	id TEXT PRIMARY KEY,
	meeting_id TEXT NOT NULL REFERENCES meetings (id),
	speaker_id TEXT NOT NULL REFERENCES speakers (id),
	seq INTEGER NOT NULL,
	start_ms INTEGER NOT NULL,
	end_ms INTEGER NOT NULL,
	text TEXT NOT NULL,
	UNIQUE (meeting_id, seq)
);

CREATE INDEX idx_segments_speaker_id ON segments (speaker_id);

CREATE TABLE notes (
	id TEXT PRIMARY KEY,
	notion_page_id TEXT NOT NULL UNIQUE,
	meeting_id TEXT REFERENCES meetings (id),
	content_hash TEXT NOT NULL,
	written_at TEXT NOT NULL
);

CREATE INDEX idx_notes_meeting_id ON notes (meeting_id);

CREATE TABLE items (
	id TEXT PRIMARY KEY,
	meeting_id TEXT REFERENCES meetings (id),
	note_id TEXT REFERENCES notes (id),
	type TEXT NOT NULL CHECK (type IN ('decision', 'action_item', 'insight', 'summary')),
	text TEXT NOT NULL,
	created_at TEXT NOT NULL,
	CHECK (meeting_id IS NOT NULL OR note_id IS NOT NULL)
);

CREATE INDEX idx_items_meeting_id ON items (meeting_id);

CREATE INDEX idx_items_note_id ON items (note_id);

CREATE TABLE item_segments (
	item_id TEXT NOT NULL REFERENCES items (id),
	segment_id TEXT NOT NULL REFERENCES segments (id),
	PRIMARY KEY (item_id, segment_id)
);

CREATE INDEX idx_item_segments_segment_id ON item_segments (segment_id);

CREATE TABLE item_tags (
	item_id TEXT NOT NULL REFERENCES items (id),
	tag_id TEXT NOT NULL,
	PRIMARY KEY (item_id, tag_id)
);

CREATE INDEX idx_item_tags_tag_id ON item_tags (tag_id);

CREATE TABLE chunks (
	id TEXT PRIMARY KEY,
	meeting_id TEXT NOT NULL REFERENCES meetings (id),
	first_seq INTEGER NOT NULL,
	last_seq INTEGER NOT NULL,
	CHECK (first_seq <= last_seq)
);

CREATE INDEX idx_chunks_meeting_id ON chunks (meeting_id);
