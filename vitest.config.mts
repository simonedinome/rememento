import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [
		cloudflareTest(async () => ({
			wrangler: { configPath: "./wrangler.toml" },
			miniflare: {
				// Relative to the project root, where Vitest runs.
				bindings: { TEST_MIGRATIONS: await readD1Migrations("migrations") },
			},
		})),
	],
	test: {
		include: ["tests/**/*.test.ts"],
		coverage: {
			provider: "istanbul",
			include: ["src/**/*.ts"],
			reporter: ["text-summary", "lcovonly"],
		},
	},
});
