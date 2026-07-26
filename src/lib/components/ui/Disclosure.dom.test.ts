import { render, screen } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";

import Disclosure from "./Disclosure.svelte";

describe("Disclosure", () => {
	it("renders a native details/summary closed by default", () => {
		const { container } = render(Disclosure, { summary: "More detail" });
		const details = container.querySelector("details");
		expect(details).not.toBeNull();
		expect(details?.open).toBe(false);
		expect(screen.getByText("More detail")).toBeTruthy();
	});

	it("respects the open prop", () => {
		const { container } = render(Disclosure, { summary: "More detail", open: true });
		expect(container.querySelector("details")?.open).toBe(true);
	});
});
