<!--
  Practice Page — /practice
  ==========================
  Standalone drill session using questions from all completed lessons.
  The user starts a session of N randomized questions, answers them
  one by one, then sees their score.

  Three states:
    1. Start screen — shows stats and a "Start Practice" button
    2. Active session — renders DrillExercise for each question
    3. Results screen — shows score and option to retry

  Drills are pulled from all lessons the user has completed, shuffled,
  and capped at the session size (default: 10 questions).
-->
<script lang="ts">
	import DrillExercise from "$lib/components/exercises/DrillExercise.svelte";
	import GlyphRibbon from "$lib/components/illustrations/GlyphRibbon.svelte";
	import ActionGroup from "$lib/components/layout/ActionGroup.svelte";
	import PageShell from "$lib/components/layout/PageShell.svelte";
	import PageMetadata from "$lib/components/seo/PageMetadata.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import EmptyState from "$lib/components/ui/EmptyState.svelte";
	import Eyebrow from "$lib/components/ui/Eyebrow.svelte";
	import Heading from "$lib/components/ui/Heading.svelte";
	import MetricDisplay from "$lib/components/ui/MetricDisplay.svelte";
	import MetricPill from "$lib/components/ui/MetricPill.svelte";
	import Progress from "$lib/components/ui/Progress.svelte";
	import Reveal from "$lib/components/ui/Reveal.svelte";
	import type { DrillQuestion } from "$lib/data/types";
	import { knownLetters, knownWords, progress } from "$lib/stores/progress";

	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();

	// --- Gather available drills from completed lessons ---
	// Reactively re-computed when progress changes (e.g. after completing a new lesson).
	const availableDrills = $derived.by(() => {
		const completedIds = $progress.lessonProgress
			.filter((lp) => lp.practicePassed)
			.map((lp) => lp.lessonId);
		return data.catalog
			.filter((lesson) => completedIds.includes(lesson.id))
			.flatMap((lesson) => lesson.drills);
	});

	// --- Session configuration ---
	const SESSION_SIZE = 10;

	// --- Session state ---
	let drillPool = $state<DrillQuestion[]>([]);
	let currentDrillIndex = $state(0);
	let correctCount = $state(0);
	let totalAnswered = $state(0);
	let sessionActive = $state(false);

	// Derived state
	const currentDrill = $derived<DrillQuestion | undefined>(drillPool[currentDrillIndex]);
	const sessionComplete = $derived(
		sessionActive && (totalAnswered >= SESSION_SIZE || currentDrillIndex >= drillPool.length),
	);

	/** Fisher-Yates shuffle to randomize drill order each session. */
	function shuffle<T>(arr: T[]): T[] {
		const shuffled = [...arr];
		for (let i = shuffled.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
		}
		return shuffled;
	}

	/** Initialize a new practice session with shuffled drills. */
	function startSession() {
		drillPool = shuffle(availableDrills).slice(0, SESSION_SIZE);
		currentDrillIndex = 0;
		correctCount = 0;
		totalAnswered = 0;
		sessionActive = true;
	}

	/** Called by DrillExercise after user selects an answer. */
	function handleAnswer(isCorrect: boolean) {
		totalAnswered++;
		if (isCorrect) correctCount++;
	}

	/** Called by DrillExercise when user clicks "Next". */
	function handleNext() {
		if (currentDrillIndex < drillPool.length - 1) {
			currentDrillIndex++;
		}
		// sessionComplete derived state will flip to true on the last question
	}
</script>

<PageMetadata metadata={data.metadata} />

<PageShell narrow class="practice">
	<Heading as="h1" class="practice__title">Thai reading practice</Heading>

	<!-- STATE: No drills available (user hasn't completed any lessons) -->
	{#if availableDrills.length === 0}
		<Reveal as="div" distance={16}>
			<EmptyState
				title="Your practice deck opens after the first lesson."
				description="Finish one lesson and Glyphin will turn its drills into a short review sprint here."
			>
				{#snippet art()}
					<GlyphRibbon tokens={["ท", "ฝ", "ก"]} />
				{/snippet}
				{#snippet actions()}
					<Button href="/learn" variant="primary" size="large">Start lesson 1</Button>
				{/snippet}
			</EmptyState>
		</Reveal>

		<!-- STATE: Session not started — show stats and start button -->
	{:else if !sessionActive}
		<div class="start surface-panel surface-panel--accent card">
			<Reveal as="div" distance={18}>
				<h2>Practice what already feels familiar.</h2>
			</Reveal>
			<Reveal as="div" delay={60} distance={14}>
				<p>
					You have <strong>{availableDrills.length}</strong> review prompts ready from completed
					lessons.
				</p>
			</Reveal>
			<div class="metric-row start__stats">
				<Reveal as="div" delay={120} distance={12}>
					<MetricPill value={$knownLetters.length} label="letters ready" />
					<MetricPill value={$knownWords.length} label="words in memory" />
				</Reveal>
			</div>
			<Reveal as="div" delay={180} distance={12}>
				<Button variant="primary" size="large" onclick={startSession}>
					Start Practice Session ({Math.min(SESSION_SIZE, availableDrills.length)}
					questions)
				</Button>
			</Reveal>
		</div>

		<!-- STATE: Session complete — show results -->
	{:else if sessionComplete}
		<div class="results surface-panel surface-panel--success card">
			<GlyphRibbon tokens={["ไ", "ท", "ย"]} tone="success" class="results__art" />
			<Reveal as="div" distance={18}>
				<Eyebrow tone="success">
					{#if correctCount === totalAnswered}
						Perfect run
					{:else if correctCount >= totalAnswered * 0.7}
						Strong pass
					{:else}
						Solid reset
					{/if}
				</Eyebrow>
			</Reveal>
			<Reveal as="div" delay={60} distance={14}>
				<h2>Session complete.</h2>
			</Reveal>
			<Reveal as="div" delay={100} distance={12}>
				<p class="results__summary">
					You just reviewed {totalAnswered} prompts pulled from words you already unlocked.
				</p>
			</Reveal>

			<div class="results__score surface-panel card card--flat">
				<Reveal as="div" delay={150} distance={12}>
					<MetricDisplay
						value={`${correctCount}/${totalAnswered}`}
						label="Correct"
						tone="success"
					/>
				</Reveal>
			</div>
			<div class="results__pct">
				<Reveal as="span" delay={190} distance={10}>
					{Math.round((correctCount / totalAnswered) * 100)}%
				</Reveal>
			</div>
			<Reveal as="div" delay={230} distance={10}>
				<ActionGroup justify="center">
					<Button variant="primary" size="large" onclick={startSession}
						>Practice Again</Button
					>
					<Button href="/learn" variant="secondary" size="large">Back to Lessons</Button>
				</ActionGroup>
			</Reveal>
		</div>

		<!-- STATE: Active session — show current drill -->
	{:else if currentDrill}
		<div class="session">
			<!-- Progress bar for the session -->
			<div class="session__header">
				<div class="session__progress">
					<Reveal as="div" distance={14} duration={360}>
						<Progress
							label="Practice session progress"
							value={totalAnswered}
							max={SESSION_SIZE}
							valueLabel={`${totalAnswered} of ${SESSION_SIZE} questions answered`}
						/>
					</Reveal>
				</div>
				<Reveal as="div" delay={80} distance={10} duration={320}>
					<span class="session__count"
						>{totalAnswered + 1} / {Math.min(SESSION_SIZE, drillPool.length)}</span
					>
				</Reveal>
			</div>

			<!-- Reusable drill component handles the answer UI -->
			<DrillExercise
				prompt={currentDrill.prompt}
				options={currentDrill.options}
				correctIndex={currentDrill.correctIndex}
				onAnswer={handleAnswer}
				onNext={handleNext}
				nextLabel={currentDrillIndex < drillPool.length - 1 && totalAnswered < SESSION_SIZE
					? "Next Question"
					: "See Results"}
			/>

			<!-- Running score counter -->
			<div class="session__score">
				<Reveal as="span" delay={120} distance={10} duration={320}>
					Score: {correctCount} / {totalAnswered}
				</Reveal>
			</div>
		</div>
	{/if}
</PageShell>

<style lang="scss">
	// Shared layout for empty, start, and results states
	.start {
		align-items: center;
		display: flex;
		flex-direction: column;
		gap: $space-lg;
		margin: 0 auto;
		max-width: var(--content-max-width);
		padding: clamp($space-xl, 5vw, $space-3xl);
		text-align: center;

		p {
			color: var(--color-text-muted);
			max-width: 34rem;
		}

		.start__stats {
			width: 100%;
		}
	}

	.results {
		align-items: center;
		display: flex;
		flex-direction: column;
		gap: $space-lg;
		margin: 0 auto;
		max-width: var(--content-max-width);
		padding: $space-3xl;
		text-align: center;

		&__summary {
			color: var(--color-text-muted);
		}

		.results__score {
			min-width: 12rem;
		}

		&__pct {
			color: var(--color-primary-strong);
			font-size: $font-size-xl;
			font-weight: 700;
		}
	}

	// Active session layout
	.session {
		display: flex;
		flex-direction: column;
		gap: $space-xl;
		margin: 0 auto;
		max-width: var(--content-max-width);

		&__header {
			align-items: center;
			display: flex;
			gap: $space-md;

			.session__progress {
				flex: 1;
			}

			.session__count {
				@include step-counter;
				white-space: nowrap;
			}
		}

		&__score {
			text-align: center;
			@include step-counter;
		}
	}
</style>
