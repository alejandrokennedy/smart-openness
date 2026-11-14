<script lang="ts">
	// Source line beneath a chart — mirrors AEM's
	// `<div class="caption"><b>Source:</b> <a href=…>…</a>.</div>`.
	// `text` is the link label; if `href` is omitted the label renders as plain
	// text (no link). The class name is kept because AEM hooks it in production.
	//
	// Type is deliberately NOT AEM's 16px caption any more: this line now matches
	// ChartCredit exactly — same family, size, weight, leading and ink — so the
	// two lines under the chart read as one small block of provenance rather than
	// as a caption followed by an afterthought. The label is unbolded for the same
	// reason ("Credit:" never was). Both need to beat AEM's own `.caption` rule,
	// which Svelte's scoping class does on specificity.
	//
	// Two shapes. `text` + `href` is the single-source case. `items` is the list
	// case: each source carries its OWN url, so a chart drawing on three
	// registries links each name to the right place. That matters here — with one
	// href the whole label becomes a single link, so "UN World Population
	// Prospects" would take the reader to ClinicalTrials.gov.
	//
	// Deliberately NOT a `text` string plus a parallel list of urls: those pair by
	// position, and the moment a source name contains a comma (most institutional
	// names eventually do) the two lists silently slip out of alignment.
	let {
		text,
		href,
		title,
		items
	}: {
		text?: string;
		href?: string;
		title?: string;
		items?: { name: string; url?: string }[];
	} = $props();

	// ACS style, so the serial comma: "A", "A and B", "A, B, and C". The writer
	// supplies names only — punctuation is the component's job, or it ends up
	// inside a link label.
	const separator = (i: number, n: number) =>
		i === 0 ? "" : i === n - 1 ? (n > 2 ? ", and " : " and ") : ", ";
</script>

<div class="caption">
	<span class="label">Source:</span>
	{#if items?.length}
		{#each items as item, i (item.name)}{separator(
				i,
				items.length
			)}{#if item.url}<a href={item.url}>{item.name}</a
				>{:else}{item.name}{/if}{/each}
	{:else if text}
		{#if href}<a {href} {title}>{text}</a>{:else}{text}{/if}
	{/if}
</div>

<style>
	/* Mirrors ChartCredit exactly — see the note in the script block. */
	.caption {
		font-family: "Roboto Mono", monospace;
		font-size: 11px;
		font-weight: 400;
		font-style: normal;
		line-height: 16px;
		color: #737373;
	}

	.caption .label {
		font-weight: 400;
	}

	/* No anchor rule, deliberately. AEM styles links on the live page, so anything
	   set here would either fight it or drift from it. The consequence is that
	   links show browser defaults in local dev — that difference is expected, and
	   the production rendering is the one that counts. Same in ChartCredit. */
</style>
