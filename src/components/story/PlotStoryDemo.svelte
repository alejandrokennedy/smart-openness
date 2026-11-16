<script lang="ts">
	/**
	 * PlotStoryDemo — a REFERENCE, not a starting point. A working SveltePlot
	 * scrolly with placeholder data, rendered at /demo/plot-story. Start new
	 * stories from PlotStory.svelte (the empty frame) and copy patterns from
	 * here as needed. Distilled from clinical-trials' PlotStory:
	 *
	 *   1. Page-chrome math — the sticky pane sits between header and footer.
	 *   2. Measure → debounced commit → Plot width/height (+ a render gate that
	 *      prevents SveltePlot's negative-height crash). Also in PlotStory.
	 *   3. ScrolloSteps over the sticky chart, with per-step pacing in CSS.
	 *   4. `progressIn(i)` — each step's 0→1 as a PARALLEL phase.
	 *   5. Fixed domains: the frame never moves, only the values do.
	 *   6. Desktop-only hover readout (HTMLTooltip + AnchoredTooltip), hidden
	 *      while scrolling.
	 *   7. Helpers for prose notes that move 1:1 with the scroll (opt-in).
	 */
	import "$styles/plot.css";
	import { footerState } from "$utils/footerState.svelte";
	import { MOBILE_BREAKPOINT, FOOTER_H, headerHeight } from "$utils/chrome";
	import { Plot, Line, Dot, HTMLTooltip } from "svelteplot";
	import { Tween } from "svelte/motion";
	import { cubicOut } from "svelte/easing";
	import ScrolloSteps from "$components/helpers/ScrolloSteps.svelte";
	import AnchoredTooltip from "$components/helpers/tooltip/AnchoredTooltip.svelte";
	// import RefreshCopy from "$components/helpers/RefreshCopy.svelte";

	interface Props {
		copy?: any;
		darkMode?: boolean;
		/** Does this story show the scroll-progress bar? Adds PROG_BAR_H on desktop. */
		progressBar?: boolean;
	}

	let { copy, darkMode = false, progressBar = false }: Props = $props();
	// let { copy: initialCopy, darkMode = false, progressBar = false }: Props = $props();
	// let copy = $state(initialCopy);
	// const DOC_ID = "your-google-doc-id-here";

	const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
	const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

	// ── 1. Page chrome ─────────────────────────────────────────────────────────
	let width = $state(1024);
	let height = $state(800);
	let isMobile = $derived(width <= MOBILE_BREAKPOINT);
	let headerH = $derived(headerHeight(isMobile, progressBar));
	let footerH = $derived(footerState.visible ? FOOTER_H : 0);
	let paneH = $derived(`calc(100vh - ${headerH}px - ${footerH}px)`);

	// ── 2. Measurement ─────────────────────────────────────────────────────────
	// Plot can't size itself from CSS; it needs numbers. `measured*` update every
	// resize frame; `chart*` are COMMITTED sizes, updated once a resize settles.
	// Feeding SveltePlot a new size every frame of a window-resize drag makes its
	// internal ResizeObserver ping-pong (→ effect_update_depth_exceeded, frozen
	// page). Debouncing the commit and pinning the <figure> to the committed
	// width (see CSS --fig-w) breaks the loop.
	//
	// Start at ZERO, not a placeholder: any non-zero default is a real size for a
	// frame and the gate below would mount a wrong-sized chart before the true
	// geometry lands.
	const MIN_PLOT_H = 80; // below this the plot body computes negative and Plot throws
	const RESIZE_DEBOUNCE_MS = 120;
	let measuredWidth = $state(0);
	let measuredHeight = $state(0);
	let chartWidth = $state(0);
	let chartHeight = $state(0);
	let measured = $state(false);

	$effect(() => {
		const w = measuredWidth;
		const h = measuredHeight;
		if (!w || !h) return;
		if (!measured) {
			// First real measurement: apply at once.
			chartWidth = w;
			chartHeight = h;
			measured = true;
			return;
		}
		const id = setTimeout(() => {
			chartWidth = w;
			chartHeight = h;
		}, RESIZE_DEBOUNCE_MS);
		return () => clearTimeout(id);
	});

	// ── Placeholder data ───────────────────────────────────────────────────────
	// Replace with your own (e.g. `import rows from "$data/my.csv"` — values are
	// strings, coerce them; see src/csv.d.ts).
	const X0 = 2000;
	const X1 = 2025;
	const Y_MAX = 100;
	const data = Array.from({ length: X1 - X0 + 1 }, (_, i) => ({
		year: X0 + i,
		value: 20 + 60 * (i / (X1 - X0)) + 8 * Math.sin(i / 2)
	}));

	// ── 3. Steps ───────────────────────────────────────────────────────────────
	// Chapters from the doc's [story] (ArchieML `text:` items), else placeholders.
	const PLACEHOLDER_CHAPTERS = [
		{ text: "Intro: the chart is empty. Keep scrolling." },
		{ text: "Scrub: the line draws itself as you scroll." },
		{ text: "Zoom: same data, the frame tightens around the recent years." }
	];
	let chapters = $derived(
		Array.isArray(copy?.story) && copy.story.length ? copy.story : PLACEHOLDER_CHAPTERS
	);
	// Step indices used by the script. Per-step SCROLL LENGTH lives in CSS
	// (:nth-child rules at the bottom) — reorder steps and update both.
	const REVEAL_STEP = 1;
	const ZOOM_STEP = 2;

	// Must match the `top` passed to ScrolloSteps (also used by scrollYAt below).
	const SCROLLO_TOP_VH = 75;

	let step = $state<number | null | undefined>(undefined);
	let stepProgress = $state<number | null | undefined>(undefined);

	// ── 4. Parallel phases ─────────────────────────────────────────────────────
	// Each step's own 0→1, pinned at 1 once the step is behind us, so a finished
	// phase never unwinds underneath the next one.
	const progressIn = (index: number) =>
		step == null || step < index ? 0 : step > index ? 1 : (stepProgress ?? 0);

	// A Tween smooths scroll jitter but TRAILS the scroll by its duration. 0 =
	// follow the scroll exactly (scroll-scrubbing is reader-driven, so it's fine
	// under reduced motion too).
	const TWEEN_MS = 0;
	const reveal = Tween.of(() => progressIn(REVEAL_STEP), { duration: TWEEN_MS, easing: cubicOut });
	let p = $derived(reveal.current);
	let z = $derived(progressIn(ZOOM_STEP));

	// ── 5. Fixed domains ───────────────────────────────────────────────────────
	// Give Plot explicit domains: the frame, margins and gridlines are then fixed
	// by construction and only the values move. To animate a "zoom", lerp the
	// domain bound (or rescale the values) from `z` rather than swapping data.
	let visible = $derived(data.filter((d) => d.year <= lerp(X0, X1, p) + 1e-9));
	let xDomain = $derived([lerp(X0, 2015, z), X1]);
	let decorationFade = $derived(clamp(p / 0.1)); // axes fade in early in the reveal

	// ── 6. Hover readout ───────────────────────────────────────────────────────
	// Desktop only (hover doesn't exist on touch and a tap would fight the
	// scroll). Any scroll hides it: scrolling drives every transition, and a
	// stale readout over a moving chart is worse than none.
	const TIP_SCROLL_QUIET_MS = 150;
	let scrollY = $state(0);
	let winH = $state(800);
	let scrolling = $state(false);
	$effect(() => {
		void scrollY;
		scrolling = true;
		const id = setTimeout(() => (scrolling = false), TIP_SCROLL_QUIET_MS);
		return () => clearTimeout(id);
	});
	let showTips = $derived(!isMobile && !scrolling && visible.length > 0);

	// ── 7. Scroll-anchored notes (opt-in) ──────────────────────────────────────
	// For prose that should move EXACTLY with the scroll (rise in, hold, leave)
	// rather than fade on step changes. `scrollYAt` INVERTS Scrollo's progress
	// formula — progress = (scrollY + trigger - stepTop) / stepHeight — to get the
	// scrollY at which a step reaches a given progress. If Scrollo's
	// calculateStepProgress() ever changes, update this too.
	//
	//   let note = $state({ px: 0, top: 0 });
	//   $effect(() => observeStep(REVEAL_STEP, (px, top) => (note = { px, top })));
	//   let startY = $derived(scrollYAt(note.top, note.px, 0.5)); // halfway through
	//   let shift = $derived(Math.max(0, scrollY - startY));     // px scrolled since
	//   <p class="note" style:transform={`translateY(${-shift}px)`}>…</p>
	let overlayEl = $state<HTMLDivElement | null>(null);
	let triggerPx = $derived((SCROLLO_TOP_VH / 100) * winH);
	const scrollYAt = (top: number, px: number, frac: number) => top + frac * px - triggerPx;

	/** Observe a step's height + document top; returns a cleanup for $effect. */
	function observeStep(index: number, apply: (px: number, top: number) => void) {
		const el = overlayEl?.querySelector<HTMLElement>(`.step:nth-child(${index + 1})`);
		if (!el) return;
		const measure = () => apply(el.offsetHeight, window.scrollY + el.getBoundingClientRect().top);
		measure();
		const ro = new ResizeObserver(measure);
		ro.observe(el);
		return () => ro.disconnect();
	}
</script>

<svelte:window bind:scrollY bind:innerHeight={winH} />

<div class="scrollo-story" class:scrollo-dark={darkMode}>
	<div
		id="background"
		bind:clientHeight={height}
		bind:clientWidth={width}
		style:height={paneH}
		style:top={`${headerH}px`}
	>
		<div class="layout-container">
			<div
				class="plot-container"
				bind:clientWidth={measuredWidth}
				bind:clientHeight={measuredHeight}
				style:--fig-w={`${chartWidth}px`}
				style:--decoration-opacity={decorationFade}
			>
				<!-- Render gate: wait for a real measurement before mounting Plot. -->
				{#if data.length && chartHeight >= MIN_PLOT_H}
					<Plot
						width={chartWidth}
						height={chartHeight}
						marginLeft={isMobile ? 36 : 44}
						marginRight={12}
						x={{ domain: xDomain, label: "", tickFormat: { useGrouping: false } }}
						y={{ domain: [0, Y_MAX], grid: true, label: "Value" }}
					>
						<Line data={visible} x="year" y="value" stroke="var(--plot-series, #046dbe)" strokeWidth={2} />
						<Dot data={visible} x="year" y="value" r={2.5} fill="var(--plot-series, #046dbe)" />
						{#if showTips}
							<!-- HTMLTooltip finds the nearest datum and positions an absolute
							     wrapper ON it; AnchoredTooltip measures that wrapper to place
							     the floating box, and the ring is drawn at its origin. One
							     search, so ring and readout can't disagree. -->
							<HTMLTooltip data={visible} x="year" y="value">
								{#snippet children({ datum })}
									{#if datum}
										<i class="dot-hover"></i>
										<!-- target keeps the box inside .scrollo-story so it
										     inherits the story's fonts and tokens. -->
										<AnchoredTooltip key={datum} offset={12} align="center" target=".scrollo-story">
											<div class="tip">
												<b>{datum.year}</b>
												{datum.value.toFixed(1)}
											</div>
										</AnchoredTooltip>
									{/if}
								{/snippet}
							</HTMLTooltip>
						{/if}
					</Plot>
				{/if}
			</div>
		</div>
	</div>

	<!-- Steps scroll over the sticky chart. The negative margin pulls the first
	     step up so steps and chart share the viewport. -->
	<div
		bind:this={overlayEl}
		class="foreground-overlay"
		style:margin-top={`calc(-1 * ${paneH})`}
		style:--scrollo-container-trim={isMobile ? "0px" : "30vh"}
	>
		<ScrolloSteps bind:step bind:stepProgress {chapters} top={`${SCROLLO_TOP_VH}vh`} smoothIntro />
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
		display: block;
		align-content: center;
	}

	/* Height lives here, not in plot.css: it belongs to THIS frame (a sticky
	   full-viewport pane). Keep the width EXPLICIT (plot.css's %): an auto width
	   lets the pinned figure feed back into the measured size and re-triggers the
	   resize loop. */
	.plot-container {
		height: 96%;
		position: relative;
		/* SveltePlot writes font-size: 11px INLINE on every <text>, so only
		   !important wins. One knob for all chart type. */
		--chart-font-size: 12px;
	}

	.plot-container :global(svg text) {
		font-size: var(--chart-font-size) !important;
	}

	/* Pin SveltePlot's <figure> to the COMMITTED width (see the debounce in the
	   script) instead of tracking the container every resize frame. */
	.plot-container :global(figure.svelteplot) {
		width: var(--fig-w, 100%);
		max-width: none;
	}

	.plot-container :global(svg) {
		width: 100%;
		height: 100%;
		max-width: none;
	}

	/* Chart furniture fades in with the reveal. Axis titles carry SveltePlot's
	   own inline-ish opacity: 0.8 at equal specificity, hence !important. */
	.plot-container :global(.axis-x),
	.plot-container :global(.axis-y),
	.plot-container :global(.grid-x),
	.plot-container :global(.grid-y) {
		opacity: var(--decoration-opacity, 1);
	}

	.plot-container :global(.axis-x-title),
	.plot-container :global(.axis-y-title) {
		opacity: var(--decoration-opacity, 1) !important;
	}

	.dot-hover {
		position: absolute;
		top: 0;
		left: 0;
		width: 10px;
		height: 10px;
		margin: -5px 0 0 -5px;
		background: var(--plot-series, #046dbe);
		border: 1.5px solid white;
		border-radius: 50%;
		box-sizing: border-box;
		pointer-events: none;
	}

	.tip {
		font-family: var(--plot-font, Helvetica, Arial, sans-serif);
		font-size: 13px;
		display: flex;
		gap: 0.5em;
	}

	/* Per-step scroll length. A step's height IS the scroll it's scrubbed
	   against, so these are pacing controls, not styling. Indices mirror
	   REVEAL_STEP / ZOOM_STEP in the script. */
	.foreground-overlay :global(.step:nth-child(1)) {
		padding-bottom: 60vh;
	}

	.foreground-overlay :global(.step:nth-child(2)) {
		padding-bottom: 120vh;
	}

	.foreground-overlay :global(.step:nth-child(3)) {
		padding-bottom: 80vh;
	}

	@media (max-width: 768px) {
		.plot-container {
			--chart-font-size: 11px;
		}
	}
</style>
