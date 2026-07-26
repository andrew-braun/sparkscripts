<script lang="ts">
	import { onMount } from "svelte";

	import { goto } from "$app/navigation";
	import PageShell from "$lib/components/layout/PageShell.svelte";
	import LessonBackLink from "$lib/components/lesson/LessonBackLink.svelte";
	import LessonGateState from "$lib/components/lesson/LessonGateState.svelte";
	import LessonProgressTracker from "$lib/components/lesson/LessonProgressTracker.svelte";
	import StepPracticeCheckpoint from "$lib/components/lesson/StepPracticeCheckpoint.svelte";
	import StepPracticeComplete from "$lib/components/lesson/StepPracticeComplete.svelte";
	import StepPracticeDeck from "$lib/components/lesson/StepPracticeDeck.svelte";
	import StepPracticeRecap from "$lib/components/lesson/StepPracticeRecap.svelte";
	import PageMetadata from "$lib/components/seo/PageMetadata.svelte";
	import Heading from "$lib/components/ui/Heading.svelte";
	import {
		getLessonJourneyState,
		getPracticePassCorrectCount,
		progress,
		recordLessonPracticeAttempt,
	} from "$lib/stores/progress";
	import {
		createLessonCompletionSyncInput,
		queueAndFlushLessonCompletionAttempt,
	} from "$lib/stores/progress-sync";

	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();
	const publication = $derived(data.publication);
	const lesson = $derived(data.lesson);
	const nextLessonId = $derived(data.nextLessonId);
	const corePracticeWords = $derived(lesson.vocabulary.filter((entry) => entry.tier === "core"));
	const extensionPracticeWords = $derived(
		lesson.vocabulary.filter((entry) => entry.tier === "extension"),
	);
	const practiceDeckWords = $derived([...corePracticeWords, ...extensionPracticeWords]);
	const checkpointWords = $derived(corePracticeWords.filter((entry) => entry.drillTarget));
	const passingCorrectCount = $derived(getPracticePassCorrectCount(checkpointWords.length));
	const lessonJourney = $derived.by(() => getLessonJourneyState($progress, lesson.id));

	type Step = "deck" | "recap" | "checkpoint" | "complete";

	const stepOrder = ["deck", "recap", "checkpoint", "complete"] satisfies Step[];

	let currentStepIndex = $state(0);
	let correctCount = $state(0);
	let totalQuestions = $state(0);
	let hasHydratedProgress = $state(false);

	const currentStep = $derived(stepOrder[currentStepIndex]);
	const progressPercent = $derived((currentStepIndex / (stepOrder.length - 1)) * 100);
	const practiceLocked = $derived(hasHydratedProgress && !lessonJourney.practiceUnlocked);
	const learnLocked = $derived(hasHydratedProgress && !lessonJourney.learnUnlocked);
	const hasNextLesson = $derived(nextLessonId !== null);

	onMount(() => {
		hasHydratedProgress = true;
	});

	$effect(() => {
		currentStepIndex = 0;
		correctCount = 0;
		totalQuestions = checkpointWords.length;
	});

	function nextStep() {
		if (currentStepIndex < stepOrder.length - 1) {
			currentStepIndex += 1;
		}
	}

	function handleCheckpointComplete(nextCorrectCount: number, nextTotalQuestions: number) {
		correctCount = nextCorrectCount;
		totalQuestions = nextTotalQuestions;

		const score =
			nextTotalQuestions > 0 ? Math.round((nextCorrectCount / nextTotalQuestions) * 100) : 0;
		const result = recordLessonPracticeAttempt(lesson.id, score);

		if (result?.shouldSync) {
			void queueAndFlushLessonCompletionAttempt(
				createLessonCompletionSyncInput({
					completedAt: result.completedAt,
					lessonId: lesson.id,
					publicationId: publication.publicationId,
					score,
				}),
			);
		}

		nextStep();
	}

	function retryPractice() {
		currentStepIndex = 0;
		correctCount = 0;
		totalQuestions = checkpointWords.length;
	}

	function goToNextLesson() {
		if (nextLessonId !== null) {
			goto(`/learn/${nextLessonId}`);
			return;
		}

		goto("/practice");
	}
</script>

<PageMetadata metadata={data.metadata} />

<svelte:head>
	<meta name="glyphbridge-publication-id" content={publication.publicationId} />
	<meta name="glyphbridge-publication-cache-key" content={publication.publicationCacheKey} />
</svelte:head>

<PageShell class="lesson">
	<Heading as="h1" class="visually-hidden">Practice {lesson.title}</Heading>
	{#if learnLocked}
		<LessonGateState
			title="This practice is still locked."
			description="Pass the previous lesson's practice gate before opening this lesson."
			primaryHref="/learn"
			primaryLabel="Back to lessons"
			secondaryHref={`/learn/${Math.max(1, lesson.id - 1)}/practice`}
			secondaryLabel="Open previous practice"
		/>
	{:else if practiceLocked}
		<LessonGateState
			title="Finish learning before practice."
			description="Complete this lesson's Learning phase first, then come back here for the scored checkpoint."
			primaryHref={`/learn/${lesson.id}`}
			primaryLabel="Open learning"
			secondaryHref="/learn"
			secondaryLabel="All lessons"
		/>
	{:else}
		<div class="lesson__chrome">
			<LessonBackLink />
			<LessonProgressTracker
				currentStep={currentStepIndex + 1}
				totalSteps={stepOrder.length}
				value={progressPercent}
			/>
		</div>

		{#key `${lesson.id}-${currentStep}`}
			<div class="lesson__stage">
				{#if currentStep === "deck"}
					<StepPracticeDeck {lesson} entries={practiceDeckWords} onComplete={nextStep} />
				{:else if currentStep === "recap"}
					<StepPracticeRecap entries={practiceDeckWords} onComplete={nextStep} />
				{:else if currentStep === "checkpoint"}
					<StepPracticeCheckpoint
						entries={checkpointWords}
						onComplete={handleCheckpointComplete}
					/>
				{:else if currentStep === "complete"}
					<StepPracticeComplete
						{lesson}
						{correctCount}
						{totalQuestions}
						{passingCorrectCount}
						{hasNextLesson}
						onRetry={retryPractice}
						onNextLesson={goToNextLesson}
					/>
				{/if}
			</div>
		{/key}
	{/if}
</PageShell>

<style lang="scss">
	:global(.lesson.page-shell) {
		gap: $space-md;
	}

	.lesson__stage {
		@include motion-safe-animation(
			lessonStageFade $motion-duration-slow $motion-ease-standard both
		);
	}

	@keyframes lessonStageFade {
		from {
			opacity: 0;
		}

		to {
			opacity: 1;
		}
	}

	.lesson__chrome {
		align-items: center;
		display: grid;
		gap: $space-xs $space-sm;
		grid-template-columns: auto minmax(12rem, 1fr);
		margin: 0 auto;
		max-width: 64rem;
		width: 100%;
	}

	@media (max-width: $bp-sm) {
		.lesson__chrome {
			align-items: stretch;
			grid-template-columns: 1fr;
		}
	}
</style>
