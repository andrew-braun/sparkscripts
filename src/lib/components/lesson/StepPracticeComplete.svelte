<script lang="ts">
	import GlyphRibbon from "$lib/components/illustrations/GlyphRibbon.svelte";
	import ActionGroup from "$lib/components/layout/ActionGroup.svelte";
	import StepLayout from "$lib/components/lesson/StepLayout.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import Eyebrow from "$lib/components/ui/Eyebrow.svelte";
	import MetricDisplay from "$lib/components/ui/MetricDisplay.svelte";
	import Reveal from "$lib/components/ui/Reveal.svelte";
	import type { Lesson } from "$lib/data/types";

	let {
		lesson,
		correctCount,
		totalQuestions,
		passingCorrectCount,
		hasNextLesson,
		onRetry,
		onNextLesson,
	}: {
		lesson: Lesson;
		correctCount: number;
		totalQuestions: number;
		passingCorrectCount: number;
		hasNextLesson: boolean;
		onRetry: () => void;
		onNextLesson: () => void;
	} = $props();

	const passed = $derived(correctCount >= passingCorrectCount);
	const courseComplete = $derived(passed && !hasNextLesson);
	const percent = $derived(
		totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0,
	);
</script>

<StepLayout>
	<section class={["practice-complete surface-panel", { "practice-complete--passed": passed }]}>
		<Reveal as="div" distance={16}>
			<div class="practice-complete__hero">
				<div class="practice-complete__copy">
					<Eyebrow tone={passed ? "success" : "accent"}>
						{#if courseComplete}
							Course complete
						{:else if passed}
							Practice passed
						{:else}
							Practice needs one more run
						{/if}
					</Eyebrow>
					<h2>
						{#if courseComplete}
							You've finished every Thai lesson.
						{:else if passed}
							That lesson is unlocked.
						{:else}
							You are close.
						{/if}
					</h2>
					{#if courseComplete}
						<p>
							You've read your way through the whole course. Keep the words fresh with
							mixed review whenever you like.
						</p>
					{:else if !passed}
						<p>Need {passingCorrectCount} of {totalQuestions} to pass.</p>
					{/if}
				</div>

				<div class="practice-complete__score">
					<GlyphRibbon
						tokens={lesson.newLetters.map((letter) => letter.character)}
						tone={passed ? "success" : "mixed"}
					/>
					<MetricDisplay
						value={`${correctCount}/${totalQuestions}`}
						label="Practice score"
						tone={passed ? "success" : "primary"}
					/>
					<span>{percent}%</span>
				</div>
			</div>
		</Reveal>

		<Reveal as="div" delay={100} distance={10}>
			<ActionGroup justify="start" stackAt="sm">
				{#if passed}
					{#if hasNextLesson}
						<Button variant="primary" size="large" onclick={onNextLesson}>
							Start the next lesson
						</Button>
					{:else}
						<Button href="/practice" variant="primary" size="large">
							Practice what you know
						</Button>
					{/if}
					<Button variant="secondary" size="large" onclick={onRetry}>
						Run this practice again
					</Button>
				{:else}
					<Button variant="primary" size="large" onclick={onRetry}>
						Try this practice again
					</Button>
					<Button href={`/learn/${lesson.id}`} variant="secondary" size="large">
						Back to learning
					</Button>
				{/if}
			</ActionGroup>
		</Reveal>
	</section>
</StepLayout>

<style lang="scss">
	.practice-complete {
		display: grid;
		gap: clamp(#{$space-md}, 2vw, #{$space-xl});
		padding: clamp(#{$space-md}, 3vw, #{$space-xl});

		&.practice-complete--passed {
			border-color: rgb(var(--rgb-success) / 0.35);
		}

		.practice-complete__hero {
			display: grid;
			gap: $space-lg;
		}

		.practice-complete__copy {
			display: grid;
			gap: $space-sm;

			h2,
			p {
				margin: 0;
			}

			p {
				color: var(--color-text-muted);
				font-size: $font-size-lg;
				line-height: 1.55;
				max-width: 42rem;
			}
		}

		.practice-complete__score {
			align-items: start;
			background: var(--color-surface-card);
			border: 1px solid var(--color-border-strong);
			border-radius: $radius-lg;
			display: grid;
			gap: $space-md;
			padding: $space-lg;

			span:last-child {
				color: var(--color-text-muted);
				font-size: $font-size-lg;
				font-weight: 800;
			}
		}
	}

	@media (min-width: $bp-md) {
		.practice-complete {
			.practice-complete__hero {
				grid-template-columns: minmax(0, 1fr) minmax(15rem, 0.75fr);
			}
		}
	}
</style>
