<script lang="ts">
	import { onMount } from "svelte";

	import { goto } from "$app/navigation";
	import PageShell from "$lib/components/layout/PageShell.svelte";
	import LessonGateState from "$lib/components/lesson/LessonGateState.svelte";
	import LessonLearnFlow from "$lib/components/lesson/LessonLearnFlow.svelte";
	import PageMetadata from "$lib/components/seo/PageMetadata.svelte";
	import Heading from "$lib/components/ui/Heading.svelte";
	import { getLessonJourneyState, progress } from "$lib/stores/progress";

	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();
	const publication = $derived(data.publication);
	const lesson = $derived(data.lesson);
	const lessonJourney = $derived.by(() => getLessonJourneyState($progress, lesson.id));

	let hasHydratedProgress = $state(false);
	const learnLocked = $derived(hasHydratedProgress && !lessonJourney.learnUnlocked);

	onMount(() => {
		hasHydratedProgress = true;
	});

	function goToPractice() {
		goto(`/learn/${lesson.id}/practice`);
	}
</script>

<PageMetadata metadata={data.metadata} />

<svelte:head>
	<meta name="glyphbridge-publication-id" content={publication.publicationId} />
	<meta name="glyphbridge-publication-cache-key" content={publication.publicationCacheKey} />
</svelte:head>

<PageShell class="lesson">
	<Heading as="h1" class="visually-hidden">{lesson.title}</Heading>
	{#if learnLocked}
		<LessonGateState
			title="This lesson is still locked."
			description="Pass the practice gate from the previous lesson to open this learning phase."
			primaryHref="/learn"
			primaryLabel="Back to lessons"
			secondaryHref={`/learn/${Math.max(1, lesson.id - 1)}/practice`}
			secondaryLabel="Open previous practice"
		/>
	{:else}
		{#key lesson.id}
			<LessonLearnFlow {lesson} onStartPractice={goToPractice} />
		{/key}
	{/if}
</PageShell>

<style lang="scss">
	:global(.lesson.page-shell) {
		gap: $space-md;
	}
</style>
