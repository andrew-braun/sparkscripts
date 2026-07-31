# Scored practice answer grid Implementation Plan

- **Status: COMPLETE — verified against source 2026-07-31.** The unticked
  checkboxes below are stale bookkeeping, not remaining work.
  `src/lib/components/lesson/StepPracticeCheckpoint.svelte:132` passes
  `columns={2}` to the shared `RadioButtons`, which is the entire scope of this
  plan. Do not re-execute it.

> **For agentic workers:** REQUIRED SUB-SKILL: Use $superpowers-subagent-driven-development (recommended) or $superpowers-executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the four scored-practice answer buttons use the reusable two-column `RadioButtons` layout while retaining the existing one-column mobile behavior.

**Architecture:** Keep the layout responsibility in the shared `RadioButtons` component. Configure only `StepPracticeCheckpoint` through its existing `columns` prop; no shared component CSS or API changes are needed because the component already maps `columns={2}` to a two-column grid and collapses it at the small breakpoint.

**Tech Stack:** Svelte 5, SvelteKit 2, TypeScript, SCSS, pnpm.

## Global Constraints

- Reuse the existing `RadioButtons` `columns` prop rather than adding a new layout API.
- Configure only `StepPracticeCheckpoint` with `columns={2}`.
- Preserve the shared component's current small-screen rule, which collapses multi-column layouts to one column at the `$bp-sm` breakpoint.
- Leave all other `RadioButtons` consumers unchanged.

---

### Task 1: Configure the scored checkpoint answer grid

**Files:**

- Modify: `src/lib/components/lesson/StepPracticeCheckpoint.svelte` at the `RadioButtons` invocation.
- Test: source assertion plus `pnpm check`, focused ESLint, and focused Stylelint commands.

**Interfaces:**

- Consumes: `RadioButtons`' existing `columns?: number` prop and its responsive grid styles.
- Produces: scored checkpoint answer options rendered with two columns on larger screens and one column at the small breakpoint.

- [ ] **Step 1: Verify the desired assertion fails before the change**

Run:

```bash
rg -n 'columns=\{2\}' src/lib/components/lesson/StepPracticeCheckpoint.svelte
```

Expected: exit code `1` because the checkpoint currently passes `columns={1}`.

- [ ] **Step 2: Make the minimal implementation change**

In `src/lib/components/lesson/StepPracticeCheckpoint.svelte`, change the existing prop:

```svelte
columns={1}
```

to:

```svelte
columns={2}
```

Do not change `RadioButtons.svelte`; its reusable two-column option and mobile collapse rule already exist.

- [ ] **Step 3: Verify the layout assertion passes**

Run:

```bash
rg -n 'columns=\{2\}' src/lib/components/lesson/StepPracticeCheckpoint.svelte
```

Expected: one matching line in the checkpoint component.

- [ ] **Step 4: Run focused and project validation**

Run:

```bash
pnpm exec prettier --check src/lib/components/lesson/StepPracticeCheckpoint.svelte .ai/2026-07-11-practice-answer-grid-design.md .ai/2026-07-11-practice-answer-grid.md
pnpm exec eslint src/lib/components/lesson/StepPracticeCheckpoint.svelte
pnpm exec stylelint src/lib/components/lesson/StepPracticeCheckpoint.svelte --config ./stylelint.sort.config.mjs
pnpm check
```

Expected: each command exits `0` with no lint, style, Svelte, or TypeScript errors.
