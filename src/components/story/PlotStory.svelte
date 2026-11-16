<script lang="ts">
	/**
	 * PlotStory — Story.svelte's empty frame, set up for SveltePlot.
	 *
	 * Adds only what every SveltePlot chart needs: plot.css, a measured box
	 * whose size is committed after resizes settle, and a render gate. For steps,
	 * phases, tooltips and scroll-anchored notes, copy from PlotStoryDemo.svelte
	 * (rendered at /demo/plot-story).
	 */
	import "$styles/plot.css";
	import { footerState } from "$utils/footerState.svelte";
	import { MOBILE_BREAKPOINT, FOOTER_H, headerHeight } from "$utils/chrome";
	import { Plot } from "svelteplot";
	// import RefreshCopy from "$components/helpers/RefreshCopy.svelte";

	interface Props {
		copy?: any;
		darkMode?: boolean;
		/** Does this story show the scroll-progress bar? Bigger features often
		 *  drop it to reclaim vertical space. Adds PROG_BAR_H on desktop. */
		progressBar?: boolean;
	}

	let { copy, darkMode = false, progressBar = false }: Props = $props();
	// let { copy: initialCopy, darkMode = false, progressBar = false }: Props = $props();
	// let copy = $state(initialCopy);
	// const DOC_ID = "your-google-doc-id-here";

	let width = $state(1024);
	let height = $state(800);
	let isMobile = $derived(width <= MOBILE_BREAKPOINT);
	let headerH = $derived(headerHeight(isMobile, progressBar));
	let footerH = $derived(footerState.visible ? FOOTER_H : 0);

	// Plot needs explicit numbers. Feeding it a new size every frame of a
	// window-resize drag makes its ResizeObserver ping-pong and freezes the page,
	// so `measured*` track the box and `chart*` commit once a resize settles
	// (paired with the --fig-w pin in CSS). Start at 0 so the gate stays shut
	// until there's a real size; below MIN_PLOT_H, Plot throws on negative heights.
	const MIN_PLOT_H = 80;
	let measuredWidth = $state(0);
	let measuredHeight = $state(0);
	let chartWidth = $state(0);
	let chartHeight = $state(0);
	let committed = false; // plain let: not a dependency of the effect

	$effect(() => {
		const w = measuredWidth;
		const h = measuredHeight;
		if (!w || !h) return;
		if (!committed) {
			// First real measurement: apply at once.
			chartWidth = w;
			chartHeight = h;
			committed = true;
			return;
		}
		const id = setTimeout(() => {
			chartWidth = w;
			chartHeight = h;
		}, 120);
		return () => clearTimeout(id);
	});
</script>

<div class="scrollo-story" class:scrollo-dark={darkMode}>
	<div
		id="background"
		bind:clientHeight={height}
		bind:clientWidth={width}
		style:height={`calc(100vh - ${headerH}px - ${footerH}px)`}
		style:top={`${headerH}px`}
	>
		<div class="layout-container">
			<div
				class="plot-container"
				bind:clientWidth={measuredWidth}
				bind:clientHeight={measuredHeight}
				style:--fig-w={`${chartWidth}px`}
			>
				{#if chartHeight >= MIN_PLOT_H}
					<!-- Explicit domains keep the frame fixed; only the values move. -->
					<Plot width={chartWidth} height={chartHeight} x={{ domain: [0, 1] }} y={{ domain: [0, 1] }}>
						<!-- Marks go here -->
					</Plot>
				{/if}
			</div>
		</div>
	</div>
	<!-- uncomment below to pull directly from gdoc on page reload -->
	<!-- <RefreshCopy docId={DOC_ID} bind:data={copy} /> -->
</div>

<style>
	.scrollo-story {
		color-scheme: light;
	}

	.scrollo-story.scrollo-dark {
		color-scheme: dark;
	}

	:global(body):has(.scrollo-dark) {
		background-color: black;
	}

	#background {
		position: sticky;
	}

	.layout-container {
		position: relative;
		height: 100%;
		width: 100%;
		overflow: hidden;
		align-content: center;
	}

	/* Keep the width explicit (plot.css's %): an auto width lets the pinned
	   figure feed back into the measured size and re-triggers the resize loop. */
	.plot-container {
		height: 96%;
	}

	/* Pin SveltePlot's <figure> to the committed width (see the script). */
	.plot-container :global(figure.svelteplot) {
		width: var(--fig-w, 100%);
		max-width: none;
	}

	.plot-container :global(svg) {
		width: 100%;
		height: 100%;
		max-width: none;
	}
</style>
