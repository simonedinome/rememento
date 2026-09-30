import { describe, expect, it } from "vitest";
import { newId } from "../../src/core/ids";

const UUID_V4 =
	/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("newId", () => {
	it("returns 1000 valid and unique UUID v4", () => {
		const ids = Array.from({ length: 1000 }, () => newId());
		for (const id of ids) expect(id).toMatch(UUID_V4);
		expect(new Set(ids).size).toBe(1000);
	});
});
