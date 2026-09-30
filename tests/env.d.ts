// Bindings that exist only in the test runtime (vitest.config.mts).
declare namespace Cloudflare {
	interface Env {
		TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
	}
}
