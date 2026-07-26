import { render, screen } from "@testing-library/svelte";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import Button from "./Button.svelte";

describe("Button", () => {
	it("renders a native button with type=button by default", () => {
		render(Button, { onclick: () => {} });
		const button = screen.getByRole("button");
		expect(button.tagName).toBe("BUTTON");
		expect(button.getAttribute("type")).toBe("button");
	});

	it("renders an anchor when href is provided", () => {
		render(Button, { href: "/learn" });
		const link = screen.getByRole("link");
		expect(link.tagName).toBe("A");
		expect(link.getAttribute("href")).toBe("/learn");
	});

	it("applies variant and size modifier classes", () => {
		render(Button, { variant: "secondary", size: "large" });
		const button = screen.getByRole("button");
		expect(button.classList.contains("btn")).toBe(true);
		expect(button.classList.contains("btn--secondary")).toBe(true);
		expect(button.classList.contains("btn--large")).toBe(true);
	});

	it("fires onclick when enabled", async () => {
		const user = userEvent.setup();
		const onclick = vi.fn();
		render(Button, { onclick });
		await user.click(screen.getByRole("button"));
		expect(onclick).toHaveBeenCalledTimes(1);
	});

	it("does not fire onclick when disabled", async () => {
		const user = userEvent.setup();
		const onclick = vi.fn();
		render(Button, { disabled: true, onclick });
		await user.click(screen.getByRole("button"));
		expect(onclick).not.toHaveBeenCalled();
	});
});
