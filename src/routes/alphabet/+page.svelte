<script lang="ts">
	import LetterDetailPanel from "$lib/components/content/alphabet/LetterDetailPanel.svelte";
	import PageShell from "$lib/components/layout/PageShell.svelte";
	import PageMetadata from "$lib/components/seo/PageMetadata.svelte";
	import Heading from "$lib/components/ui/Heading.svelte";
	import Progress from "$lib/components/ui/Progress.svelte";
	import Reveal from "$lib/components/ui/Reveal.svelte";
	import ToggleTiles, { type ToggleTileOption } from "$lib/components/ui/ToggleTiles.svelte";
	import type { Letter } from "$lib/data/types";
	import { knownLetters } from "$lib/stores/progress";

	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();

	// Build a flat list of every letter introduced across all lessons
	const allLetters = $derived<Letter[]>(data.catalog.flatMap((lesson) => lesson.newLetters));

	// Reactively partition letters into consonants, vowels, and tone marks for separate sections
	const consonants = $derived(allLetters.filter((l) => l.type === "consonant"));
	const vowels = $derived(allLetters.filter((l) => l.type === "vowel"));
	const toneMarks = $derived(allLetters.filter((l) => l.type === "tone_mark"));
	const numerals = $derived(allLetters.filter((l) => l.type === "numeral"));
	const marks = $derived(allLetters.filter((l) => l.type === "mark"));

	// Check whether the user has unlocked a letter by completing its lesson
	function isKnown(char: string): boolean {
		return $knownLetters.includes(char);
	}

	// Tracks which letter tile is selected; empty means the detail panel is closed
	let selectedCharacter = $state("");
	const selectedLetter = $derived(
		selectedCharacter === ""
			? null
			: (allLetters.find((letter) => letter.character === selectedCharacter) ?? null),
	);

	function buildSection(
		letters: Letter[],
		headingId: string,
		title: string,
	): { headingId: string; title: string; options: ToggleTileOption[] } {
		return {
			headingId,
			title,
			options: letters.map<ToggleTileOption>((letter) => {
				const known = isKnown(letter.character);
				return {
					value: letter.character,
					primaryLabel: letter.character,
					secondaryLabel: known ? letter.romanization : "?",
					disabled: !known,
					primaryIsThai: true,
					variant: known ? "known" : "default",
					secondaryTone: known ? "default" : "muted",
				};
			}),
		};
	}

	const letterSections = $derived(
		[
			buildSection(consonants, "alphabet-consonants-heading", "Consonants"),
			buildSection(vowels, "alphabet-vowels-heading", "Vowels"),
			buildSection(toneMarks, "alphabet-tone-marks-heading", "Tone Marks"),
			buildSection(numerals, "alphabet-numerals-heading", "Numerals"),
			buildSection(marks, "alphabet-marks-heading", "Marks"),
		].filter((section) => section.options.length > 0),
	);
</script>

<PageMetadata metadata={data.metadata} />

<!--
  Alphabet Page
  Displays all Thai letters the curriculum teaches, split into consonant and vowel grids.
  - Unknown letters appear disabled with a "?" placeholder until the user completes
    the lesson that introduces them.
  - Known letters are clickable and reveal a detail panel with pronunciation,
    romanization, consonant class, writing position, and a mnemonic.
  - A progress bar at the top shows how many letters the user has learned out of the total.
-->
<PageShell class="alphabet">
	<Heading as="h1">Your Thai alphabet progress</Heading>

	<!-- Visual progress bar: fill width is the percentage of letters learned -->
	<div class="alphabet__progress">
		<Reveal as="div" distance={14}>
			<Progress
				label="Letters learned progress"
				value={$knownLetters.length}
				max={allLetters.length}
				valueLabel={`${$knownLetters.length} of ${allLetters.length} letters learned`}
			/>
		</Reveal>
	</div>

	{#each letterSections as section, index}
		<section class="letter-section">
			<Reveal as="div" delay={70 + index * 80} distance={16}>
				<h2 id={section.headingId}>{section.title}</h2>
				<ToggleTiles
					labelledBy={section.headingId}
					options={section.options}
					bind:value={selectedCharacter}
				/>
			</Reveal>
		</section>
	{/each}

	<LetterDetailPanel letter={selectedLetter} onClose={() => (selectedCharacter = "")} />
</PageShell>

<style lang="scss">
	/* ========================================
	   Alphabet page styles
	   ======================================== */

	// Page-level wrapper and subtitle
	.alphabet {
		&__progress {
			margin-bottom: $space-xl;
		}
	}

	// Section wrapper for each letter category (Consonants / Vowels)
	.letter-section {
		background: var(--surface-panel);
		border: 1px solid var(--color-border);
		border-radius: $radius-xl;
		box-shadow: var(--shadow-card);
		margin-top: $space-xl;
		padding: $space-xl;

		h2 {
			margin-bottom: $space-md;
		}
	}
</style>
