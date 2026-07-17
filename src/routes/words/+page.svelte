<script lang="ts">
	// Reactive store of words the user has learned by completing lessons
	import GlyphRibbon from "$lib/components/illustrations/GlyphRibbon.svelte";
	import PageShell from "$lib/components/layout/PageShell.svelte";
	import PageMetadata from "$lib/components/seo/PageMetadata.svelte";
	import Badge from "$lib/components/ui/Badge.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import EmptyState from "$lib/components/ui/EmptyState.svelte";
	import Heading from "$lib/components/ui/Heading.svelte";
	import { knownWords } from "$lib/stores/progress";

	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();
</script>

<PageMetadata metadata={data.metadata} />

<!--
  Known Words Page
  Shows every Thai word the user has unlocked through lessons.
  - When the collection is empty, an "empty state" card encourages the user
    to start their first lesson via a CTA link.
  - Otherwise, a responsive grid of word cards displays each word's Thai script,
    pronunciation, English meaning, category badge, syllable breakdown, and
    optional context note.
-->
<PageShell class="words">
	<header class="words__header">
		<Heading as="h1">Your Thai words</Heading>
		{#if $knownWords.length > 0}
			<p class="words__count">{$knownWords.length} words collected</p>
		{/if}
	</header>

	<!-- Empty state: shown when the user has not completed any lessons yet -->
	{#if $knownWords.length === 0}
		<EmptyState
			title="Your word shelf is empty for now."
			description="Finish the first lesson and your earliest real Thai words will start collecting here."
		>
			{#snippet art()}
				<GlyphRibbon tokens={["คำ", "แรก"]} tone="accent" />
			{/snippet}
			{#snippet actions()}
				<Button href="/learn" variant="primary" size="large">Start lesson 1</Button>
			{/snippet}
		</EmptyState>
		<!-- Word cards grid: each card shows full word details and syllable breakdown -->
	{:else}
		<div class="word-grid">
			{#each $knownWords as word}
				<div class="word-card card">
					<div class="word-card__thai thai">{word.thai}</div>
					<div class="word-card__pronunciation">{word.pronunciation}</div>
					<div class="word-card__meaning">{word.meaning}</div>
					<Badge>{word.category}</Badge>
					<!-- Syllable chips: break the word into its component sounds -->
					<div class="word-card__syllables">
						{#each word.syllables as syllable}
							<span class="word-card__syllable">
								<span class="thai thai--sm">{syllable.thai}</span>
								<span class="word-card__syllable-sound">{syllable.sound}</span>
							</span>
						{/each}
					</div>
					<!-- Optional usage/context note (e.g. formality, common pairings) -->
					{#if word.contextNote}
						<p class="word-card__context">{word.contextNote}</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</PageShell>

<style lang="scss">
	/* ========================================
	   Known Words page styles
	   ======================================== */

	// Page wrapper and subtitle
	.words {
		&__header {
			margin-bottom: $space-lg;
		}

		&__count {
			color: var(--color-text-muted);
			font-size: $font-size-sm;
			font-weight: 500;
			letter-spacing: 0.02em;
			text-transform: uppercase;
		}
	}

	// Responsive grid: cards fill at a minimum width of 320px
	.word-grid {
		display: grid;
		gap: $space-lg;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
	}

	// Individual word card: stacks Thai text, pronunciation, meaning, syllables
	.word-card {
		background: var(--surface-panel);
		border: 1px solid var(--color-border);
		display: flex;
		flex-direction: column;
		gap: $space-sm;

		&__thai {
			color: var(--color-primary-strong);
		}

		&__pronunciation {
			color: var(--color-text);
			font-size: $font-size-lg;
			font-weight: 600;
		}

		&__meaning {
			color: var(--color-text-muted);
			font-size: $font-size-base;
		}

		&__syllables {
			display: flex;
			flex-wrap: wrap;
			gap: $space-sm;
			margin-top: $space-sm;
		}

		&__syllable {
			align-items: center;
			background: var(--surface-interactive);
			border-radius: $radius-sm;
			display: flex;
			flex-direction: column;
			gap: 2px;
			padding: $space-xs $space-sm;
		}

		&__syllable-sound {
			color: var(--color-text-muted);
			font-size: $font-size-xs;
		}

		&__context {
			border-top: 1px solid var(--color-border);
			color: var(--color-text-muted);
			font-size: $font-size-sm;
			line-height: 1.6;
			margin-top: $space-sm;
			padding-top: $space-sm;
		}
	}
</style>
