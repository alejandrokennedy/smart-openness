<script lang="ts">
	// Credit line beneath a chart — mirrors AEM's
	// `<p class="credit">Credit: …</p>`. `text` is the credited name; the
	// "Credit:" prefix is boilerplate (matching ChartSource's "Source:" prefix).
	// Scoped styles mirror the live AEM computed values as a dev fallback.
	//
	// `href` takes the same shape as ChartSource's, and exists for the same
	// reason: a byline usually links to a staff page. Having the field means the
	// copy doc never has to carry an <a> tag — which matters more than it sounds,
	// because Google Docs silently autocorrects attribute quotes to curly ones
	// and the resulting tag renders as literal text.
	let { text, href }: { text: string; href?: string } = $props();
</script>

<p class="credit">
	Credit: {#if href}<a {href}>{text}</a>{:else}{text}{/if}
</p>

<style>
	/* No anchor rule — AEM styles links on the live page. See ChartSource. */
	.credit {
		/* Upright, not italic. The name used to sit in an <i>; the two provenance
		   lines now share one plain treatment. */
		font-style: normal;
		font-family: "Roboto Mono", monospace;
		font-size: 11px;
		font-weight: 400;
		line-height: 16px;
		color: #737373; /* rgb(115, 115, 115) */
		margin: 5px 0 16px 0px; /* top right bottom left */
	}
</style>
