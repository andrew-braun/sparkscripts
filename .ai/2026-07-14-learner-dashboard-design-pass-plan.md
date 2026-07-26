# Learner Dashboard Design Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `$superpowers-executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the learner dashboard compact and task-focused while preserving
clear H1-to-stage spacing and a single-line resume action.

**Architecture:** Keep the change local to the existing dashboard composition.
Use the existing `Button` primitive with a plain text label for this one action,
and adjust only `LearnerHomeHub.svelte` layout styles; progress data and the
shared forward-label component remain unchanged.

**Tech Stack:** Svelte 5, TypeScript, SCSS, existing Glyphin design tokens

## Global Constraints

- Preserve all learner progress data and resume-target behavior.
- Keep the statistics and course-stage journey structure unchanged.
- Keep "Continue learning," "Continue practice," and "Review what you know" on
  one line.
- Preserve deliberate breathing room between the H1 and current-stage text.
- Do not change `ButtonForwardLabel.svelte` or other forward-action buttons.

---

### Task 1: Refine the learner dashboard hierarchy and CTA

**Files:**

- Modify: `src/lib/components/content/home/LearnerHomeHub.svelte`
- Verify: `src/lib/components/content/home/LearnerHomeHub.svelte`

**Interfaces:**

- Consumes: `journey.resumeTarget.href` and the existing derived
  `continueLabel: string`.
- Produces: the same dashboard markup and navigation behavior with a compact
  responsive layout and a non-wrapping text-only CTA.

- [ ] **Step 1: Record the pre-change verification baseline**

Run:

```bash
pnpm exec prettier --check src/lib/components/content/home/LearnerHomeHub.svelte
pnpm exec stylelint src/lib/components/content/home/LearnerHomeHub.svelte
```

Expected: both commands pass before the focused edit, or any pre-existing
failure is recorded before changing the component.

- [ ] **Step 2: Replace the dashboard-specific forward label**

Remove the `ButtonForwardLabel` import. Wrap the resume button in a locally
styled action container and render the existing derived label directly:

```svelte
<div class="learner-home__action">
	<Button href={journey.resumeTarget.href} size="large" variant="primary">
		{continueLabel}
	</Button>
</div>
```

This preserves the existing destination and label logic while removing the
dashboard arrow without changing the shared forward-action primitive.

- [ ] **Step 3: Tighten outer spacing and preserve text-line spacing**

Update the component styles to:

```scss
.learner-home {
	display: grid;
	gap: $space-xl;

	&__hero {
		gap: $space-lg;
		padding: clamp($space-lg, 3.5vw, $space-2xl);
	}

	&__heading {
		--heading-font-size: clamp(2rem, 4vw, 3.5rem);
	}

	&__lead {
		margin: $space-sm 0 0;
	}

	&__action {
		flex-shrink: 0;

		:global(.btn) {
			white-space: nowrap;
		}
	}

	&__journey {
		gap: $space-md;
	}
}

@media (max-width: $bp-md) {
	.learner-home {
		&__action {
			:global(.btn) {
				width: 100%;
			}
		}
	}
}
```

Retain all unrelated declarations already present in those selectors. The
explicit lead margin adds separation below the H1 even as the panel and section
spacing become tighter.

- [x] **Step 4: Format and run focused component validation**

Run:

```bash
pnpm exec prettier --write src/lib/components/content/home/LearnerHomeHub.svelte
pnpm exec stylelint src/lib/components/content/home/LearnerHomeHub.svelte
pnpm check
```

Expected: Prettier completes, Stylelint reports no violations, and `pnpm check`
reports zero Svelte/TypeScript errors.

- [x] **Step 5: Review the final diff against the design**

Run:

```bash
git diff --check
git diff -- src/lib/components/content/home/LearnerHomeHub.svelte
```

Expected: no whitespace errors; the diff changes only the dashboard CTA markup
and dashboard-local layout styles. Confirm the three derived labels remain
unchanged in the script and the mobile CTA receives full available width.
