import { describe, expectTypeOf, it } from "vitest";
import type {
	ProviderId,
	Segment,
	TranscriptionResult,
} from "../../src/core/types";

// Checked by tsc: the shared types must match the contract in SPEC-core.md exactly.
describe("shared types contract", () => {
	it("ProviderId lists the four providers", () => {
		expectTypeOf<ProviderId>().toEqualTypeOf<
			"deepgram" | "assemblyai" | "elevenlabs" | "openai"
		>();
	});

	it("Segment matches the spec", () => {
		expectTypeOf<Segment>().toEqualTypeOf<{
			speakerLabel: string;
			startMs: number;
			endMs: number;
			text: string;
		}>();
	});

	it("TranscriptionResult matches the spec", () => {
		expectTypeOf<TranscriptionResult>().toEqualTypeOf<{
			provider: ProviderId;
			model: string;
			language: string;
			durationS: number;
			segments: Segment[];
		}>();
	});
});
