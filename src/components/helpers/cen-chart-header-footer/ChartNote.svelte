<script lang="ts">
	// Methodology / explanatory note beneath a chart, rendered above Source and
	// Credit. Same `.caption` class as ChartSource (AEM hooks it in production)
	// and the same type as ChartSource/ChartCredit — 11px Roboto Mono, #737373,
	// unbolded label — so the three lines read as one block of provenance.
	// The "Note:" prefix is boilerplate, so it lives here, not in the copy doc.
	//
	// Rendered with {@html} deliberately: a methodology note is the one footer
	// line that genuinely needs inline markup (links, an <em>). Consequence: any
	// styling of tags inside it must be `:global()`.
	let { text }: { text: string } = $props();
</script>

<div class="caption note"><span class="label">Note:</span> {@html text}</div>

<style>
	/* Mirrors ChartSource / ChartCredit exactly. */
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

	/* The note runs longer than the source line, so a little air beneath it. */
	.note {
		margin-bottom: 4px;
	}

	/* No anchor rule, deliberately — AEM styles links on the live page. See
	   ChartSource. */
</style>
