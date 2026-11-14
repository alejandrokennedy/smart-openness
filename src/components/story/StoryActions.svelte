<script lang="ts">
	/**
	 * Share + Save buttons for a story's title page (from Cancer Alley, made
	 * story-agnostic in nobel-noms).
	 *
	 * SHARE calls `openShareModal`, a global the C&EN article page's own JS
	 * provides. Off AEM (dev, Vercel preview) it is absent and the click only logs.
	 *
	 * SAVE is not built here. The article page already has a working Save button
	 * (wired to the reader's account, carrying the article's path and DOI);
	 * `static/aem/story-save.js` moves THAT button into the empty `.cen-save-slot`
	 * once the page has initialised it. The converter only ships that script when
	 * `aem.config.json` has `"saveButton": true`. Save therefore appears on AEM
	 * only; the slot hides itself while empty.
	 *
	 * On dev/Vercel a stand-in Save is drawn beside the slot (not in it — the AEM
	 * script appends to the slot) so the row can be seen as it will look.
	 * `DEV_CONTROLS` keeps it out of the AEM build.
	 *
	 * Colours assume a white page; override .action-btn for dark/video intros.
	 */
	import { onMount } from "svelte";
	import { DEV_CONTROLS } from "$utils/devControls";

	const DEV_SAVE = DEV_CONTROLS;

	/**
	 * More than one row may be on the page (e.g. the title page's, plus a
	 * `compact` one that fades in top-right once the title scrolls away).
	 * `active` says which is showing; story-save.js keeps the page's single Save
	 * button in the active row's slot, moving it across as the reader scrolls.
	 */
	let { active = true, compact = false }: { active?: boolean; compact?: boolean } = $props();

	let shareTitle = $state("C&EN Story");
	let shareUrl = $state("");
	let shareAriaLabel = $state("Share this story");

	/** Page-relative where it can be, as the share modal expects. */
	function shareLink(raw: string): string {
		try {
			const url = new URL(raw || window.location.href, window.location.origin);
			return url.origin === window.location.origin
				? url.pathname + url.search + url.hash
				: url.toString();
		} catch {
			return window.location.href;
		}
	}

	onMount(() => {
		const meta = (sel: string, attr: string) =>
			document.querySelector(sel)?.getAttribute(attr) ?? null;
		shareTitle =
			meta('meta[property="og:title"]', "content") ||
			meta('meta[name="twitter:title"]', "content") ||
			document.title ||
			"C&EN Story";
		shareUrl = shareLink(
			meta('meta[property="og:url"]', "content") ||
				meta('link[rel="canonical"]', "href") ||
				window.location.href
		);
		shareAriaLabel = `Share, ${shareTitle}`;
	});

	function handleShare(event: MouseEvent) {
		const open = (window as unknown as { openShareModal?: (e: MouseEvent) => void })
			.openShareModal;
		if (typeof open === "function") open(event);
		else console.warn("openShareModal not available — the C&EN page JS is not loaded");
	}
</script>

<ul class="story-actions" class:compact data-cen-save-actions data-active={active ? "true" : "false"}>
	<li>
		<button
			class="action-btn"
			type="button"
			onclick={handleShare}
			aria-label={shareAriaLabel}
			data-role="share"
			data-title={shareTitle}
			data-link={shareUrl}
			data-print="true"
		>
			<span class="action-label">Share</span>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				fill="currentColor"
				viewBox="0 0 16 16"
				aria-hidden="true"
			>
				<path
					d="M11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.5 2.5 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5"
				/>
			</svg>
		</button>
	</li>
	<!-- Filled on AEM by static/aem/story-save.js; hidden while empty. -->
	<li class="cen-save-slot"></li>
	{#if DEV_SAVE}
		<li>
			<button
				class="action-btn dev-save"
				type="button"
				title="DEV stand-in: on AEM the article page's own Save button goes here"
				onclick={() => console.info("Save is the article page's own button; it only works on AEM")}
			>
				<span class="action-label">Save</span>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					fill="currentColor"
					viewBox="0 0 16 16"
					aria-hidden="true"
				>
					<path
						d="M2 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v13.5a.5.5 0 0 1-.777.416L8 13.101l-5.223 2.815A.5.5 0 0 1 2 15.5zm2-1a1 1 0 0 0-1 1v12.566l4.723-2.482a.5.5 0 0 1 .554 0L13 14.566V2a1 1 0 0 0-1-1z"
					/>
				</svg>
			</button>
		</li>
	{/if}
</ul>

<style>
	.story-actions {
		display: flex;
		gap: 0.5rem;
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.cen-save-slot:empty {
		display: none;
	}

	/* The small copy, top right after the title has gone: same buttons, tighter. */
	.story-actions.compact {
		gap: 0.25rem;
	}

	.story-actions.compact .action-btn,
	.story-actions.compact :global(.cen-save-button) {
		padding: 0.15rem 0.45rem;
		font-size: 0.62rem;
	}

	.story-actions.compact svg {
		width: 13px;
		height: 13px;
	}

	.action-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.25rem 0.6rem;
		font-family: var(--mono, monospace);
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #12263a;
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--border-radius, 2px);
		cursor: pointer;
		transition: border-color 0.15s ease;
	}

	.action-btn:hover,
	.action-btn:focus-visible {
		border-color: #12263a;
		outline: none;
	}

	/* Underlined on hover, on the BUTTON: the C&EN page underlines
	   buttons on hover itself, and a second underline on the label drew two
	   lines on AEM. Here the button's rule wins the cascade (one line, with
	   our offset) and the label carries none of its own. The moved Save
	   button gets the same in static/aem/story-save.css. */
	.action-btn:hover,
	.action-btn:focus-visible {
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.action-btn .action-label {
		text-decoration: none !important;
	}

	.action-btn svg {
		color: var(--color-red, #ff533d);
		fill: currentColor;
		flex-shrink: 0;
		width: 16px;
		height: 16px;
	}
</style>
