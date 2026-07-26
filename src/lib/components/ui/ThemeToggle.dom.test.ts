import { render, screen } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ThemeToggle from "./ThemeToggle.svelte";

describe("ThemeToggle", () => {
	it("exposes an accessible name and pressed state for dark mode", () => {
		render(ThemeToggle, { mode: "dark" });
		const button = screen.getByRole("button", { name: "Switch to light mode" });
		expect(button.getAttribute("aria-pressed")).toBe("false");
		expect(button.textContent).toContain("Dark");
	});

	it("flips the accessible name and pressed state for light mode", () => {
		render(ThemeToggle, { mode: "light" });
		const button = screen.getByRole("button", { name: "Switch to dark mode" });
		expect(button.getAttribute("aria-pressed")).toBe("true");
		expect(button.textContent).toContain("Light");
	});

	it("invokes the ontoggle callback on click", async () => {
		const user = userEvent.setup();
		const ontoggle = vi.fn();
		render(ThemeToggle, { mode: "dark", ontoggle });
		await user.click(screen.getByRole("button"));
		expect(ontoggle).toHaveBeenCalledTimes(1);
	});
});
