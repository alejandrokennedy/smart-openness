<script lang="ts">
	import { getContext } from "svelte";
	import StoryContainer from "./story/StoryContainer.svelte";
	import Story from "./story/Story.svelte";
	import PlotStory from "./story/PlotStory.svelte";
	import ChinaCollabChart from "./charts/ChinaCollabChart.svelte";

	const copy = getContext("copy");
	const data = getContext("data");
</script>

<svelte:boundary onerror={(e) => console.error(e)}>
	<StoryContainer>
		<ChinaCollabChart />
		<!-- <Story {copy} /> -->
		<!-- <Story {copy} darkMode /> -->
	</StoryContainer>
</svelte:boundary>
