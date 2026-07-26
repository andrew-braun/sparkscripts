<!--
  StepIntro.svelte — Lesson Step 1: Word Introduction
  ====================================================
  Shows the anchor word in large Thai script with a "Can you guess?"
  prompt. Includes an optional real-world context note explaining
  where the learner would encounter this word in Thailand.

  This is the first thing the learner sees — it creates curiosity
  before any breakdown or instruction happens.
-->
<script lang="ts">
	import StepLayout from "$lib/components/lesson/StepLayout.svelte";
	import Badge from "$lib/components/ui/Badge.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import ButtonForwardLabel from "$lib/components/ui/ButtonForwardLabel.svelte";
	import NoticeBox from "$lib/components/ui/NoticeBox.svelte";
	import type { Lesson } from "$lib/data/types";

	let { lesson, onNext }: { lesson: Lesson; onNext: () => void } = $props();
</script>

<StepLayout class="step--intro">
	<section class="intro-shell surface-panel lesson-accent-panel">
		<div class="intro-shell__copy">
			<Badge>Stage {lesson.stage}</Badge>
			<h2 class="step__title">{lesson.title}</h2>
		</div>

		<!-- Large word reveal — the learner's first look at the anchor word -->
		<div class="word-reveal">
			<div class="word-reveal__thai thai thai--lg">{lesson.anchorWord.thai}</div>
		</div>

		<div class="intro-shell__support">
			<!-- Context note explaining where this word appears in the real world -->
			{#if lesson.anchorWord.contextNote}
				<NoticeBox>
					<p>{lesson.anchorWord.contextNote}</p>
				</NoticeBox>
			{/if}

			<Button variant="primary" size="large" fullWidth={true} onclick={onNext}>
				<ButtonForwardLabel label="Open this word" />
			</Button>
		</div>
	</section>
</StepLayout>

<style lang="scss">
	.intro-shell {
		display: grid;
		gap: clamp(#{$space-md}, 2vw, #{$space-xl});
		padding: clamp(#{$space-lg}, 3vw, #{$space-xl});

		&__copy {
			display: flex;
			flex-direction: column;
			gap: $space-md;
		}

		&__support {
			display: flex;
			flex-direction: column;
			gap: $space-lg;
		}
	}

	.step__title {
		font-size: $font-size-2xl;
	}

	.word-reveal {
		background: var(--color-primary);
		border: 1px solid var(--color-primary);
		border-radius: $radius-xl;
		box-shadow: var(--shadow-card);
		color: var(--color-on-primary);
		padding: $space-xl;
		text-align: center;

		.word-reveal__thai {
			color: var(--color-on-primary);
		}
	}

	@media (min-width: $bp-md) {
		.intro-shell {
			align-items: center;
			gap: $space-lg $space-xl;
			grid-template-columns: minmax(0, 0.85fr) minmax(20rem, 1.15fr);

			&__support {
				gap: $space-md;
			}
		}

		.word-reveal {
			grid-column: 2;
			grid-row: 1 / span 2;
			padding: $space-xl;
		}
	}
</style>
