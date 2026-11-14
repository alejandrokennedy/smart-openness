<script lang="ts">
	import "$styles/scoped.css";
	import Header from "$components/Header.svelte";
	import { DEV_CONTROLS } from "$utils/devControls";

	let { children } = $props();
</script>

<!-- The simulated C&EN header is a dev/preview aid only: on AEM the real page
     header is already there. The hidden mark lets the AEM converter reject a
     build that still contains dev controls (see $utils/devControls). -->
{#if DEV_CONTROLS}
	<Header />
	<span hidden data-dev-controls="cen-dev-controls-on"></span>
{/if}
<div id="content">
	{@render children?.()}
</div>
