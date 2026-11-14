/**
 * The reader's reduce-motion preference, reactive, with a way to test it.
 *
 *   import { reducedMotion } from "$runes/reducedMotion.svelte";
 *   const dur = $derived(reducedMotion.current ? 0 : 600);
 *
 * Wraps Svelte's built-in `prefersReducedMotion` (svelte/motion) — use that
 * directly if you don't need the override. The override exists because the OS
 * setting is awkward to flip while reviewing: add `?reduceMotion=1` (or `=0`)
 * to the URL, or set `reducedMotion.override` from a dev control.
 *
 * What "reduced" should mean for a scrolly (nobel-noms' answer): marks
 * crossfade in place between steps instead of travelling, hovers open at once,
 * no autoplaying loops. Scroll-scrubbed progress itself is reader-driven and can
 * stay. Read `.current` inside $derived/$effect/markup so it stays reactive.
 */
import { prefersReducedMotion } from "svelte/motion";

class ReducedMotion {
	/** null = follow the OS setting. */
	override = $state<boolean | null>(null);

	constructor() {
		if (typeof location !== "undefined") {
			const q = new URLSearchParams(location.search).get("reduceMotion");
			if (q === "1" || q === "0") this.override = q === "1";
		}
	}

	get current(): boolean {
		return this.override ?? prefersReducedMotion.current;
	}
}

export const reducedMotion = new ReducedMotion();
