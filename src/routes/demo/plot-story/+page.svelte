<script lang="ts">
	/**
	 * Smoke test for the shared story pieces: PlotStoryDemo, StoryActions, and
	 * ChartFooter (note + per-item sources + linked credit). /demo/plot-story
	 */
	import PlotStoryDemo from "$components/story/PlotStoryDemo.svelte";
	import StoryActions from "$components/story/StoryActions.svelte";
	import ChartFooter from "$components/helpers/cen-chart-header-footer/ChartFooter.svelte";
</script>

<section class="intro">
	<h1>PlotStory demo</h1>
	<StoryActions />
</section>

<PlotStoryDemo />

<section class="outro">
	<ChartFooter
		note="Placeholder data. Notes may contain <a href='https://example.com'>links</a>."
		source={{
			items: [
				{ name: "ClinicalTrials.gov", url: "https://clinicaltrials.gov" },
				{ name: "UN World Population Prospects", url: "https://population.un.org/wpp/" },
				{ name: "C&EN analysis" }
			]
		}}
		credit={{ text: "Jane Doe" }}
	/>
</section>

<style>
	.intro,
	.outro {
		max-width: 40rem;
		margin: 4rem auto;
		padding: 0 1rem;
	}
</style>
