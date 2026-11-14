/**
 * Development-only UI — copy toggles, sliders, the simulated C&EN header, the
 * stand-in Save button — shown on the dev server and on Vercel/preview builds,
 * never in the AEM export.
 *
 * `pnpm build:aem` builds with VITE_TARGET=aem, which Vite inlines, so this
 * becomes a compile-time `false` and gated markup is dropped from the bundle.
 *
 *   {#if DEV_CONTROLS}<MyDevPanel />{/if}
 *
 * +layout.svelte renders DEV_CONTROLS_MARK whenever DEV_CONTROLS is on; the
 * AEM converter (tasks/convert-svelte.ts) refuses a build containing it, so a
 * plain `pnpm build` can't be shipped to AEM by mistake.
 */
export const DEV_CONTROLS: boolean =
	import.meta.env.DEV || import.meta.env.VITE_TARGET !== "aem";

/** Keep in step with DEV_CONTROLS_MARK in tasks/convert-svelte.ts. */
export const DEV_CONTROLS_MARK = "cen-dev-controls-on";
