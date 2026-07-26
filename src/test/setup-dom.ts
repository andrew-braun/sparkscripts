import { vi } from "vitest";

// jsdom does not implement these browser APIs. Svelte transitions and some Bits
// UI primitives touch them during render; stub them so DOM tests do not crash on
// unrelated environment gaps. Keep these minimal and behavior-free.

if (typeof window.matchMedia !== "function") {
	window.matchMedia = vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}));
}

if (typeof globalThis.ResizeObserver !== "function") {
	globalThis.ResizeObserver = class {
		observe() {}
		unobserve() {}
		disconnect() {}
	};
}
