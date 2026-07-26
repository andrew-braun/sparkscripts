<script lang="ts">
	import { onMount } from "svelte";

	import HomeHero from "$lib/components/content/home/HomeHero.svelte";
	import LearnerHomeHub from "$lib/components/content/home/LearnerHomeHub.svelte";
	import PageMetadata from "$lib/components/seo/PageMetadata.svelte";
	import {
		appProgressFromLearnerProjection,
		buildCourseJourney,
		buildCourseProgressStats,
	} from "$lib/data/course-journey";
	import type { AppProgress } from "$lib/data/types";
	import { authSession } from "$lib/stores/learner";
	import { applyLearnerProjection, progress } from "$lib/stores/progress";

	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();
	let hasHydratedProgress = $state(false);

	const emptyProgress = $derived<AppProgress>({
		knownLetters: [],
		knownWords: [],
		lessonProgress: [],
		currentLessonId: data.catalog[0]?.id ?? 1,
	});
	const publishedPack = $derived({ stages: data.stages, lessons: data.catalog });
	const serverProgress = $derived(
		data.projection ? appProgressFromLearnerProjection(data.projection) : emptyProgress,
	);
	const activeProgress = $derived(hasHydratedProgress ? $progress : serverProgress);
	const journey = $derived(buildCourseJourney(publishedPack, activeProgress));
	const stats = $derived(
		hasHydratedProgress
			? buildCourseProgressStats(publishedPack, activeProgress)
			: data.serverStats,
	);
	const authenticated = $derived(data.auth.authenticated || $authSession.authenticated);
	const hasStartedLearning = $derived(
		activeProgress.lessonProgress.length > 0 ||
			stats.knownLetterCount > 0 ||
			stats.knownWordCount > 0,
	);
	const showDashboard = $derived(
		data.auth.authenticated || (hasHydratedProgress && (authenticated || hasStartedLearning)),
	);

	onMount(() => {
		if (data.projection) {
			applyLearnerProjection(data.projection);
		}
		hasHydratedProgress = true;
	});
</script>

<PageMetadata metadata={data.metadata} />

<div class="home container">
	{#if showDashboard}
		<LearnerHomeHub {authenticated} {journey} {stats} />
	{:else}
		<HomeHero />
	{/if}
</div>

<style lang="scss">
	.home {
		display: flex;
		flex-direction: column;
		gap: $space-3xl;
	}
</style>
