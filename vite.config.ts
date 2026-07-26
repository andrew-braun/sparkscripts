import { sveltekit } from "@sveltejs/kit/vite";
import { svelteTesting } from "@testing-library/svelte/vite";
import { configDefaults, defineConfig } from "vitest/config";

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
		// Two isolated projects. The `dom` project adds the browser `resolve`
		// conditions that Svelte client rendering needs (via `svelteTesting()`);
		// those must NOT leak into the `node` project, where they would change how
		// server deps like `@supabase/ssr` resolve. `sveltekit()` is inherited by
		// both (`extends: true`) so `$lib` and the custom aliases resolve as in app
		// code.
		projects: [
			{
				extends: true,
				test: {
					name: "node",
					// Pure Node-environment suites: server trust boundaries, utils,
					// curriculum/delivery mapping, and build-tooling scripts. Component
					// `.test.js` files here assert on `.svelte` source text, not a DOM.
					environment: "node",
					include: ["src/**/*.{test,spec}.{js,ts}", "scripts/**/*.test.mjs"],
					exclude: [...configDefaults.exclude, "src/**/*.dom.test.{js,ts}"],
				},
			},
			{
				extends: true,
				plugins: [svelteTesting()],
				test: {
					name: "dom",
					// Renders real components + exercises the localStorage-backed
					// progress store. `svelteTesting()` handles auto-cleanup.
					environment: "jsdom",
					include: ["src/**/*.dom.test.{js,ts}"],
					setupFiles: ["./src/test/setup-dom.ts"],
				},
			},
		],
	},
});
