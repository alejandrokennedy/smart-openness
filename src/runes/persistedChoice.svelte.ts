/**
 * A reactive choice between a fixed set of options, remembered in
 * localStorage. Made for dev/review controls ("log or linear?", "layout A or
 * B?") that should survive a reload while the desk compares versions —
 * generalised from nobel-noms' axisScale / vennPlace / mapPlace runes.
 *
 *   // $runes/axisScale.svelte.ts — module level, so any component can read it
 *   export const axisScale = persistedChoice("my-story-axis", ["log", "linear"] as const, "log");
 *
 *   // a component
 *   onMount(() => axisScale.restore());          // after hydration, see below
 *   <select bind:value={axisScale.value}>…</select>   // or axisScale.set("linear")
 *
 * `restore()` is explicit (call it in onMount) rather than automatic: the
 * prerendered HTML is built with the default, and reading storage before
 * hydration would make client and server disagree. Saved values no longer in
 * `options` are ignored. Prefix keys with the story slug — localStorage is
 * shared by every story on the same origin (localhost, cen.acs.org).
 *
 * For dev controls, gate the UI behind DEV_CONTROLS ($utils/devControls) and
 * decide what the published build should use (the `initial` value, unless
 * restore() is called there too).
 */

export class PersistedChoice<T extends string> {
	#value = $state() as T;
	readonly key: string;
	readonly options: readonly T[];
	readonly initial: T;

	constructor(key: string, options: readonly T[], initial: T) {
		this.key = key;
		this.options = options;
		this.initial = initial;
		this.#value = initial;
	}

	get value(): T {
		return this.#value;
	}

	set value(v: T) {
		this.set(v);
	}

	set(v: T) {
		if (!this.options.includes(v)) return;
		this.#value = v;
		try {
			localStorage.setItem(this.key, v);
		} catch {
			/* private mode / no storage: still works for this session */
		}
	}

	restore() {
		try {
			const saved = localStorage.getItem(this.key);
			if (saved !== null && (this.options as readonly string[]).includes(saved)) {
				this.#value = saved as T;
			}
		} catch {
			/* no storage */
		}
	}

	reset() {
		this.#value = this.initial;
		try {
			localStorage.removeItem(this.key);
		} catch {
			/* no storage */
		}
	}
}

export function persistedChoice<T extends string>(
	key: string,
	options: readonly T[],
	initial: T
): PersistedChoice<T> {
	return new PersistedChoice(key, options, initial);
}
