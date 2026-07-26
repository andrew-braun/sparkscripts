import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [sveltekit()],
	ssr: {
		noExternal: ["@lucide/svelte"],
	},
	css: {
		preprocessorOptions: {
			scss: {
				additionalData: `@use '$styles/variables' as *;\n@use '$styles/mixins' as *;\n`,
			},
		},
	},
	test: {
		// All current and planned unit tests are pure Node-environment (no DOM).
		// The component `.test.js` files assert on `.svelte` source text, not on a
		// rendered DOM. A browser/component environment (Testing Library, jsdom)
		// is a later layer — see `.ai/2026-07-11-automated-test-suites.md` Task 4.
		environment: "node",
		include: ["src/**/*.{test,spec}.{js,ts}", "scripts/**/*.test.mjs"],
		// `sveltekit()` above resolves `$lib` and the custom aliases from
		// `svelte.config.js`, so tests import modules exactly as app code does.
	},
});
