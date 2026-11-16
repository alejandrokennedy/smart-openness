<script lang="ts">
	/**
	 * Chart 1 — share of China-affiliated papers with an affiliation outside
	 * mainland China, by field, 2018–2025 (OpenAlex). Static chart.
	 * Data: analysis/export_share_csv.py → src/data/china-intl-share.csv.
	 */
	import "$styles/plot.css";
	import { MOBILE_BREAKPOINT } from "$utils/chrome";
	import { Plot, Line, Dot, Text, HTMLTooltip } from "svelteplot";
	import AnchoredTooltip from "$components/helpers/tooltip/AnchoredTooltip.svelte";
	import ChartHeader from "$components/helpers/cen-chart-header-footer/ChartHeader.svelte";
	import ChartFooter from "$components/helpers/cen-chart-header-footer/ChartFooter.svelte";
	import rows from "$data/china-intl-share.csv";

	// ── Data ───────────────────────────────────────────────────────────────────
	const data = rows.map((d) => ({
		field: d.field,
		year: +d.year,
		share: +d.share,
		cn_intl: +d.cn_intl,
		cn_total: +d.cn_total
	}));
	const PROVISIONAL_YEAR = 2025;
	const YEARS = [...new Set(data.map((d) => d.year))];
	const ends = data.filter((d) => d.year === PROVISIONAL_YEAR);

	const FIELDS = ["Chemistry", "Chemical engineering", "Biochemistry, genetics & molecular biology"];
	const COLORS = ["#2a78d6", "#eb6834", "#1baf7a"];
	const colorOf = (field: string) => COLORS[FIELDS.indexOf(field)];
	const SHORT: Record<string, string> = { "Biochemistry, genetics & molecular biology": "Biochemistry" };
	const short = (field: string) => SHORT[field] ?? field;
	// Chemistry and Biochemistry end 0.7 pp apart in 2025 — nudge labels apart.
	const LABEL_DY: Record<string, number> = { Chemistry: 7, "Biochemistry, genetics & molecular biology": -7 };

	// Axis styling, matching clinical-trials: muted #4b4b4b ticks/labels, faint grid.
	const AXIS_MUTED = "#4b4b4b";
	const STROKE_W = 3;
	const DOT_R = 5;

	// ── Size ───────────────────────────────────────────────────────────────────
	// Breakpoint on the window width (same 768px as the CSS media query below).
	let winW = $state(1024);
	let winH = $state(800);
	let isMobile = $derived(winW <= MOBILE_BREAKPOINT);

	// Measure the plot container, but feed Plot a COMMITTED width that only
	// updates once a resize settles. Passing every frame's width straight to Plot
	// lets SveltePlot's own ResizeObserver and our binding chase each other
	// (→ effect_update_depth_exceeded). The <figure> is also pinned to the
	// committed width in CSS (--fig-w) so it can't feed back into the measurement.
	const RESIZE_DEBOUNCE_MS = 120;
	let measuredW = $state(0);
	let chartW = $state(0);
	$effect(() => {
		const w = measuredW;
		if (!w) return;
		if (!chartW) {
			chartW = w; // first measurement: apply at once
			return;
		}
		const id = setTimeout(() => (chartW = w), RESIZE_DEBOUNCE_MS);
		return () => clearTimeout(id);
	});

	// Height follows width. Desktop: ~0.55 aspect, 380px floor, capped at 620px
	// or 72% of the window (whichever is lower). Mobile: taller, near-square.
	let chartH = $derived(
		Math.round(
			isMobile
				? Math.max(300, Math.min(460, chartW * 0.95))
				: Math.max(380, Math.min(chartW * 0.55, 620, winH * 0.72))
		)
	);
</script>

<svelte:window bind:innerWidth={winW} bind:innerHeight={winH} />

<!-- Tooltip body: same layout and styling as clinical-trials' .ct-tip. -->
{#snippet tipBody(d: (typeof data)[number])}
	<div class="ct-tip">
		<div class="ct-tip-head">
			<span class="ct-tip-year">{d.year}</span>
			<span class="ct-tip-field" style:color={colorOf(d.field)}>{short(d.field)}</span>
			{#if d.year === PROVISIONAL_YEAR}<span class="ct-tip-col">provisional</span>{/if}
		</div>
		<div class="ct-tip-grid">
			<span class="ct-tip-label">international share</span>
			<span class="ct-tip-num">{d.share.toFixed(1)}%</span>
			<span class="ct-tip-label">international papers</span>
			<span class="ct-tip-num">{d.cn_intl.toLocaleString()}</span>
			<span class="ct-tip-label">all China papers</span>
			<span class="ct-tip-num">{d.cn_total.toLocaleString()}</span>
		</div>
	</div>
{/snippet}

<div class="china-collab">
	<ChartHeader
		marginTop="1.5rem"
		title="China's international co-authorship is falling in chemistry fields"
		caption="Share of China-affiliated articles and reviews that list at least one affiliation outside mainland China, by field."
	/>

	<div class="legend">
		{#each FIELDS as f, i (f)}
			<span class="key"><span class="swatch" style:background={COLORS[i]}></span>{f}</span>
		{/each}
	</div>

	<div
		class="plot-container"
		role="img"
		aria-label="Line chart: share of China-affiliated papers co-authored internationally, 2018–2025, for chemistry, chemical engineering and biochemistry"
		bind:clientWidth={measuredW}
		style:--fig-w={`${chartW}px`}
		style:--axis-muted={AXIS_MUTED}
	>
		{#if chartW}
			<Plot
				width={chartW}
				height={chartH}
				marginTop={14}
				marginLeft={isMobile ? 34 : 44}
				marginRight={isMobile ? 44 : 180}
				x={{ domain: [2018, 2025], ticks: YEARS, label: "", tickFormat: (d: number) => (isMobile ? `'${String(d).slice(2)}` : String(d)) }}
				y={{ domain: [0, 35], grid: true, ticks: [0, 5, 10, 15, 20, 25, 30, 35], label: "", tickFormat: (d: number) => `${d}%` }}
				color={{ domain: FIELDS, scheme: COLORS }}
			>
				<Line {data} x="year" y="share" stroke="field" strokeWidth={STROKE_W} />
				<Dot {data} x="year" y="share" fill="field" stroke="white" r={DOT_R} />
				<Text
					data={ends}
					x="year"
					y="share"
					text={(d) => `${d.share.toFixed(1)}%${isMobile ? "" : ` ${short(d.field)}`}`}
					dx={10}
					dy={(d) => LABEL_DY[d.field] ?? 0}
					textAnchor="start"
					fill={{ value: AXIS_MUTED, scale: null }}
				/>
				<!-- HTMLTooltip lives in Plot's `overlay` snippet (a real positioned div),
				     not among the marks: inside the <svg> its wrapper is never laid out
				     and the anchor would measure 0,0. Its wrapper sits ON the hovered
				     datum, so the grown dot and the anchored box share one search. -->
				{#snippet overlay()}
					<HTMLTooltip {data} x="year" y="share">
						{#snippet children({ datum })}
							{#if datum}
								<i class="dot-grown" style:--dot={colorOf(datum.field)}></i>
								<AnchoredTooltip key={datum} offset={14} align="center" target=".china-collab">
									{@render tipBody(datum)}
								</AnchoredTooltip>
							{/if}
						{/snippet}
					</HTMLTooltip>
				{/snippet}
			</Plot>
		{/if}
	</div>

	<ChartFooter
		note="International means affiliation in at least one country besides mainland China (Hong Kong counts as international). 2025 data are still being indexed by OpenAlex."
		source={{ items: [{ name: "OpenAlex", url: "https://openalex.org/" }, { name: "C&EN analysis" }] }}
		credit={{ text: "Alexander Kennedy", href: "https://cen.acs.org/staffDirectory/Alexander-Kennedy.html" }}
		marginTop="1rem"
	/>
</div>

<style>
	.china-collab {
		width: 92%;
		max-width: 1200px;
		margin: 0 auto;
		font-family: var(--plot-font, Helvetica, Arial, sans-serif);
	}

	/* Fill the wrapper (plot.css's 92% would double the side padding). Keep the
	   width EXPLICIT: an auto width lets the figure feed back into the measurement. */
	.plot-container {
		width: 100%;
		position: relative;
		--chart-font-size: 12px;
	}

	/* Pin SveltePlot's <figure> to the COMMITTED width (see the debounce above). */
	.plot-container :global(figure.svelteplot) {
		width: var(--fig-w, 100%);
		max-width: none;
	}

	/* SveltePlot writes font-size: 11px INLINE on every <text>; only !important wins. */
	.plot-container :global(svg text) {
		font-size: var(--chart-font-size) !important;
	}

	.plot-container :global(.axis-x),
	.plot-container :global(.axis-y) {
		color: var(--axis-muted);
	}

	/* No y tick marks: the gridlines already lead the eye to the labels. */
	.plot-container :global(.axis-y .tick line) {
		display: none;
	}

	.plot-container :global(.grid-y line) {
		stroke: var(--axis-muted);
		stroke-opacity: 0.15;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem 1rem;
		margin: 0.25rem 0 0.5rem;
		font-size: 12px;
		color: #4b4b4b;
	}

	.key {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	.swatch {
		display: inline-block;
		width: 16px;
		height: 3px;
	}

	/* Hovered dot, grown (clinical-trials pattern): drawn at the origin of
	   HTMLTooltip's wrapper, which sits on the datum. Same fill + white ring as
	   the Dot marks, a bit larger, so the real dot reads as swelling. */
	.dot-grown {
		position: absolute;
		top: 0;
		left: 0;
		width: 16px;
		height: 16px;
		margin: -8px 0 0 -8px;
		background: var(--dot);
		border: 2px solid white;
		border-radius: 50%;
		box-sizing: border-box;
		pointer-events: none;
	}

	/* Tooltip body — copied from clinical-trials' .ct-tip. font-family/color set
	   explicitly: the box is portaled, so it can't rely on the ambient cascade. */
	.ct-tip {
		font-family: var(--plot-font, Helvetica, Arial, sans-serif);
		font-size: 12px;
		line-height: 1.35;
		color: #242424;
		background: #fff;
		border: 1px solid rgba(0, 0, 0, 0.12);
		border-radius: 5px;
		box-shadow: 0 2px 10px rgba(0, 0, 0, 0.16);
		padding: 7px 9px;
		white-space: nowrap;
	}

	.ct-tip-head {
		display: flex;
		align-items: baseline;
		gap: 6px;
		margin-bottom: 5px;
	}

	.ct-tip-year {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}

	.ct-tip-field {
		font-weight: 600;
	}

	.ct-tip-grid {
		display: grid;
		grid-template-columns: auto auto;
		gap: 3px 14px;
		align-items: baseline;
	}

	.ct-tip-col {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: #767676;
	}

	.ct-tip-label {
		color: #565656;
	}

	.ct-tip-num {
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	@media (max-width: 768px) {
		.china-collab {
			width: 96%;
		}
		.plot-container {
			--chart-font-size: 11px;
		}
		.legend {
			font-size: 11px;
			gap: 0.2rem 0.75rem;
		}
	}
</style>
