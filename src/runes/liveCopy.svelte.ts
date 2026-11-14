/**
 * Live Google Doc copy at RUNTIME — a refresh picks up the writer's edits
 * without anyone re-running `pnpm gdoc`. Generalised from nobel-noms.
 *
 *   import snapshot from "$data/copy.json";
 *   import { createLiveCopy } from "$runes/liveCopy.svelte";
 *
 *   const copy = createLiveCopy({ docId: "1abc…", snapshot });
 *   onMount(() => copy.load());
 *   // read copy.data (starts as the snapshot), copy.status, copy.error
 *
 * Where the text comes from, in order:
 *   1. Google directly (its text export currently sends CORS headers).
 *   2. The /api/gdoc proxy — the vite dev server in dev (vite.config.js), a
 *      Vercel function when deployed there (api/gdoc.js). On AEM, which has no
 *      /api, only if VITE_GDOC_PROXY=<https://your-project.vercel.app> was set
 *      at build time.
 *   3. If both fail: the snapshot `pnpm gdoc` wrote stays on the page, so the
 *      worst case is the writer's last-snapshotted words, never an error.
 *
 * LOCKED (no fetch at all, the snapshot is the story) when:
 *   - the build is for AEM (`pnpm build:aem`) and VITE_GDOC_PROXY is unset —
 *     the default, so a published page can't change under anyone's feet;
 *   - or VITE_COPY_LOCKED=1 at build (e.g. lock a Vercel review build).
 *
 * The doc must be shared "anyone with the link can view": otherwise Google
 * answers with a sign-in page, which is detected and treated as a failure.
 */

import { DEV_CONTROLS } from "$utils/devControls";
import { parseDoc, checkArrayCount } from "$utils/archieDoc.js";

const GDOC_PROXY: string = import.meta.env.VITE_GDOC_PROXY ?? "";

export const COPY_LOCKED: boolean =
	import.meta.env.VITE_COPY_LOCKED === "1" || (!DEV_CONTROLS && !GDOC_PROXY);

const isAemHost = (h: string) =>
	h === "acs.org" || h.endsWith(".acs.org") || h.endsWith(".adobeaemcloud.com");

function proxyUrl(): string | null {
	if (typeof location === "undefined") return null;
	if (GDOC_PROXY) return `${GDOC_PROXY.replace(/\/$/, "")}/api/gdoc`;
	return isAemHost(location.hostname) ? null : "/api/gdoc";
}

async function fetchText(url: string): Promise<string> {
	const res = await fetch(url, { cache: "no-store", credentials: "omit" });
	if (!res.ok) throw new Error(`HTTP ${res.status} from ${new URL(url, "http://x").host}`);
	// A doc that isn't link-shared answers with Google's sign-in page, as a 200.
	if ((res.headers.get("content-type") ?? "").includes("text/html")) {
		throw new Error("got an HTML page, not the doc — is it shared 'anyone with the link'?");
	}
	return res.text();
}

/** A doc's plain-text (ArchieML) export: Google directly, then the proxy. */
export async function fetchDocText(docId: string): Promise<string> {
	const errors: string[] = [];
	try {
		return await fetchText(`https://docs.google.com/document/d/${docId}/export?format=txt`);
	} catch (e) {
		errors.push(`direct: ${e instanceof Error ? e.message : e}`);
	}
	const proxy = proxyUrl();
	if (proxy) {
		try {
			return await fetchText(`${proxy}?id=${encodeURIComponent(docId)}`);
		} catch (e) {
			errors.push(`proxy: ${e instanceof Error ? e.message : e}`);
		}
	}
	throw new Error(errors.join("; "));
}

export interface LiveCopyOptions<T> {
	docId: string;
	/** What `pnpm gdoc` wrote (e.g. `import snapshot from "$data/copy.json"`). */
	snapshot: T;
	/**
	 * Guard a freeform array against ArchieML's first-key trap (see
	 * $utils/archieDoc.js), e.g. `{ array: "story", delimiter: "name" }`. Use
	 * the same value in google.config.js so the snapshot parses identically.
	 */
	parse?: { array?: string; delimiter?: string };
	/** Reject a parse that's missing what the story needs (e.g. no [story]). */
	validate?: (parsed: any) => string | null;
}

export class LiveCopy<T = any> {
	data = $state.raw<T>() as T;
	status = $state<"snapshot" | "loading" | "live" | "error">("snapshot");
	error = $state<string | null>(null);
	/** Set when the delimiter guard counted a different number of items. */
	warning = $state<string | null>(null);
	readonly docUrl: string;
	#opts: LiveCopyOptions<T>;
	#started = false;

	constructor(opts: LiveCopyOptions<T>) {
		this.#opts = opts;
		this.data = opts.snapshot;
		this.docUrl = `https://docs.google.com/document/d/${opts.docId}/edit`;
	}

	/** Idempotent; pass `true` to force a re-fetch (e.g. a "refresh" button). */
	async load(force = false) {
		if (COPY_LOCKED || typeof window === "undefined") return;
		if (this.#started && !force) return;
		this.#started = true;
		this.status = "loading";
		const { docId, parse, validate } = this.#opts;
		try {
			const text = await fetchDocText(docId);
			const parsed = parseDoc(text, parse);
			const invalid = validate?.(parsed);
			if (invalid) throw new Error(invalid);
			this.warning = parse?.delimiter
				? checkArrayCount(text, parsed, parse.array, parse.delimiter)
				: null;
			this.data = parsed as T;
			this.status = "live";
			this.error = null;
		} catch (e) {
			this.status = "error";
			this.error = e instanceof Error ? e.message : String(e);
			this.data = this.#opts.snapshot;
			console.warn(`[liveCopy] using snapshot for ${docId}: ${this.error}`);
		}
	}
}

export function createLiveCopy<T = any>(opts: LiveCopyOptions<T>): LiveCopy<T> {
	return new LiveCopy(opts);
}
