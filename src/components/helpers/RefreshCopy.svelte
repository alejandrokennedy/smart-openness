<script>
	/**
	 * Drop-in live copy for a component that already holds `copy` in $state:
	 *   <RefreshCopy docId={DOC_ID} bind:data={copy} />
	 *
	 * Thin wrapper over $runes/liveCopy (same fetch order, proxy fallback and
	 * locking rules — see that file). On AEM builds it does nothing unless
	 * VITE_GDOC_PROXY was set, so leaving it in can't change a published page.
	 * Pass `parse={{ array: "story", delimiter: "name" }}` to guard against the
	 * ArchieML first-key trap ($utils/archieDoc.js).
	 */
	import { onMount } from "svelte";
	import { COPY_LOCKED, fetchDocText } from "$runes/liveCopy.svelte";
	import { parseDoc } from "$utils/archieDoc.js";

	let { docId, data = $bindable(), parse = undefined } = $props();

	let refreshing = $state(false);

	async function refresh() {
		if (COPY_LOCKED) return;
		refreshing = true;
		try {
			data = parseDoc(await fetchDocText(docId), parse);
		} catch (err) {
			console.error("Failed to refresh copy (keeping snapshot):", err);
		} finally {
			refreshing = false;
		}
	}

	onMount(() => {
		refresh();
	});
</script>

<!-- <button onclick={refresh} disabled={refreshing}>
	{refreshing ? "Refreshing..." : "Refresh Copy"}
</button> -->

<!-- <style>
	button {
		position: fixed;
		top: 1rem;
		left: 1rem;
		z-index: 9999;
		padding: 0.5rem 1rem;
		background: white;
		border: 1px solid #ccc;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
	}

	button:hover:not(:disabled) {
		background: #f0f0f0;
	}

	button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style> -->
