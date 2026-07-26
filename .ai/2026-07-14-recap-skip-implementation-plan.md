# Quick Recap Skip Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `$superpowers-subagent-driven-development` (recommended) or `$superpowers-executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Explain the quick-recap card interaction up front and let learners move directly to the scored check whenever they choose.

**Architecture:** Keep the behavior local to `StepPracticeRecap.svelte`. Reuse its existing `onComplete` callback for a visible secondary skip action, while keeping the primary post-reveal action conditional on every card being revealed. Add a focused source-contract test because the current Node test suite has no Svelte component renderer.

**Tech Stack:** Svelte 5, TypeScript, SCSS, Node test runner.

## Global Constraints

- Change only the recap step's rendering and scoped styles, plus its focused test.
- Reuse the existing completion callback; do not add a route, store, curriculum field, or progression rule.
- Keep the current self-check card interaction and all-revealed calculation.
- Skipping enters the scored check immediately and without confirmation.
- Keep copy concise and learner-focused.

---

### Task 1: Make quick recap optional and self-explanatory

**Files:**

- Create: `src/lib/components/lesson/StepPracticeRecap.test.js`
- Modify: `src/lib/components/lesson/StepPracticeRecap.svelte`

**Interfaces:**

- Consumes: the existing `onComplete: () => void` callback supplied by the lesson flow owner.
- Produces: an instructional prompt, an always-visible secondary skip action, and the existing all-revealed primary action.

- [x] **Step 1: Write the failing test**

Create `src/lib/components/lesson/StepPracticeRecap.test.js`:

```js
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = readFileSync(new URL("./StepPracticeRecap.svelte", import.meta.url), "utf8");

describe("StepPracticeRecap completion choices", () => {
	it("explains the card interaction and lets learners skip directly to the scored check", () => {
		assert.match(source, /Try each word, then tap a card to reveal its answer\./u);
		assert.match(
			source,
			/<Button[^>]*variant="secondary"[^>]*onclick=\{onComplete\}[\s\S]*?>\s*Skip recap\s*<\/Button>/u,
		);
	});

	it("keeps the primary scored-check action available after every card is revealed", () => {
		assert.match(
			source,
			/\{#if allRevealed\}[\s\S]*?<Button[^>]*variant="primary"[^>]*onclick=\{onComplete\}[\s\S]*?Start the scored check[\s\S]*?<\/Button>[\s\S]*?\{\/if\}/u,
		);
	});
});
```

- [x] **Step 2: Run the test to verify it fails**

Run: `node --test src/lib/components/lesson/StepPracticeRecap.test.js`

Expected: FAIL because the recap component does not yet include the instruction or secondary `Skip recap` button.

- [x] **Step 3: Add the instruction and skip control**

In `src/lib/components/lesson/StepPracticeRecap.svelte`, add the prompt above `.practice-recap__grid` and append the secondary button after the grid:

```svelte
<p class="practice-recap__prompt">Try each word, then tap a card to reveal its answer.</p>
```

```svelte
<Button variant="secondary" size="large" fullWidth={true} onclick={onComplete}>Skip recap</Button>
```

Add scoped styling so the prompt is legible, centered, and uses the existing muted text token:

```scss
&__prompt {
	color: var(--color-text-muted);
	margin: 0 0 $space-lg;
	text-align: center;
}
```

- [x] **Step 4: Run the focused test to verify it passes**

Run: `node --test src/lib/components/lesson/StepPracticeRecap.test.js`

Expected: PASS; both completion-choice assertions succeed.

- [x] **Step 5: Run project validation**

Run: `pnpm check:all`

Expected: PASS with no new type, accessibility, formatting, lint, or style diagnostics.

- [x] **Step 6: Review the completed change**

Run: `git diff --check && git diff -- src/lib/components/lesson/StepPracticeRecap.svelte src/lib/components/lesson/StepPracticeRecap.test.js`

Expected: no whitespace errors; the diff is limited to the recap copy, skip action, scoped styling, and focused test.

## Execution Notes

- The focused test failed before implementation because the new prompt and skip action were absent, then passed after implementation.
- `pnpm check:all` reached its formatting stage and failed on pre-existing formatting drift across unrelated workspace files. The task files were formatted directly; `pnpm test`, `pnpm lint`, `pnpm stylelint`, and `pnpm check` passed afterward.
