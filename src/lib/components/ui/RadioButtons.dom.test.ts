import { render, screen } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import RadioButtons from "./RadioButtons.svelte";

const options = [
	{ value: "a", label: "Alpha" },
	{ value: "b", label: "Beta" },
	{ value: "c", label: "Gamma" },
];

describe("RadioButtons", () => {
	it("renders each option as an accessible radio", () => {
		render(RadioButtons, { options });
		expect(screen.getAllByRole("radio")).toHaveLength(3);
		expect(screen.getByRole("radio", { name: "Alpha" })).toBeTruthy();
	});

	it("selects an option on click", async () => {
		const user = userEvent.setup();
		render(RadioButtons, { options });
		const beta = screen.getByRole("radio", { name: "Beta" });
		await user.click(beta);
		expect(beta.getAttribute("aria-checked")).toBe("true");
	});

	it("moves selection with the arrow keys", async () => {
		const user = userEvent.setup();
		render(RadioButtons, { options, value: "a" });
		screen.getByRole("radio", { name: "Alpha" }).focus();
		await user.keyboard("{ArrowDown}");
		expect(screen.getByRole("radio", { name: "Beta" }).getAttribute("aria-checked")).toBe(
			"true",
		);
	});
});
