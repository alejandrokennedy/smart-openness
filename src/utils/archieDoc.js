/**
 * Reading a Google Doc's ArchieML text export. Shared by the page
 * ($runes/liveCopy, RefreshCopy) and the snapshot task (tasks/fetch-google.js)
 * so the two can never parse a doc differently.
 *
 * The trap `delimiter` exists for (nobel-noms): ArchieML takes the FIRST key of
 * a freeform array item as the item delimiter. In a `[story]` of
 * `name:`/`text:` steps, a stray line like `HED:` above the first `name:` makes
 * HED the delimiter, every step folds into one object, and the doc parses as a
 * single step with no error. With `{ delimiter: "name" }`, any lines inside the
 * array before its first `name:` are lifted to the top of the doc (where they
 * parse as ordinary keys), so the array always splits on `name:`.
 *
 * Opt-in on purpose: a CMS-style array (`type:`/`value:` items, see CMS.svelte)
 * that happens to contain a `name:` later on must not be rearranged.
 */

import archieml from "archieml";

const isArrayOpen = (line, array) =>
	new RegExp(`^\\s*\\[\\s*${array}\\s*\\]\\s*$`, "i").test(line);
const isAnyArrayOrClose = (line) => /^\s*\[.*\]\s*$/.test(line);
const isKey = (line, key) => new RegExp(`^\\s*${key}\\s*:`, "i").test(line);

/** Move anything in [array] above its first `delimiter:` out to the top of the doc. */
export function liftArrayPreamble(text, array = "story", delimiter = "name") {
	const lines = text.split(/\r?\n/);
	const start = lines.findIndex((l) => isArrayOpen(l, array));
	if (start < 0) return text;
	let first = -1;
	for (let i = start + 1; i < lines.length; i++) {
		if (isAnyArrayOrClose(lines[i])) break;
		if (isKey(lines[i], delimiter)) {
			first = i;
			break;
		}
	}
	if (first <= start + 1) return text;
	const preamble = lines.slice(start + 1, first);
	return [...preamble, ...lines.slice(0, start + 1), ...lines.slice(first)].join("\n");
}

/** How many items the doc's text says [array] has: `delimiter:` lines inside it. */
export function countArrayItems(text, array = "story", delimiter = "name") {
	const lines = text.split(/\r?\n/);
	const start = lines.findIndex((l) => isArrayOpen(l, array));
	if (start < 0) return 0;
	let n = 0;
	for (let i = start + 1; i < lines.length; i++) {
		if (isAnyArrayOrClose(lines[i])) break;
		if (isKey(lines[i], delimiter)) n++;
	}
	return n;
}

/**
 * Parse a doc's text export.
 * @param {string} text
 * @param {{ array?: string, delimiter?: string }} [opts] pass `delimiter` to
 *   guard [array] (default "story") against the preamble trap above.
 */
export function parseDoc(text, opts = {}) {
	const { array = "story", delimiter } = opts;
	return archieml.load(delimiter ? liftArrayPreamble(text, array, delimiter) : text);
}

/**
 * Returns a warning string if [array] parsed to fewer/more items than the text
 * has `delimiter:` lines — i.e. the silent one-step parse happened anyway.
 */
export function checkArrayCount(text, parsed, array = "story", delimiter = "name") {
	const want = countArrayItems(text, array, delimiter);
	const got = Array.isArray(parsed?.[array]) ? parsed[array].length : 0;
	return got === want
		? null
		: `[${array}] has ${want} "${delimiter}:" lines but parsed to ${got} items`;
}

const pick = (o, k) => {
	if (!o || typeof o !== "object") return undefined;
	const key = Object.keys(o).find((x) => x.toLowerCase() === k);
	const v = key ? o[key] : undefined;
	return typeof v === "string" && v.trim() ? v.trim() : undefined;
};

/**
 * Headline and deck, from a `[header]`/`{header}` block or top-level
 * `hed:`/`dek:`. Keys are case-insensitive.
 */
export function headerOf(parsed) {
	const h = Array.isArray(parsed?.header) ? parsed.header[0] : parsed?.header;
	return {
		hed: pick(h, "hed") ?? pick(parsed, "hed"),
		dek: pick(h, "dek") ?? pick(parsed, "dek")
	};
}

/**
 * A chart's `{footer}` block: note, sources, credit. Tolerates two silent
 * failures seen in clinical-trials: `[footer]` (an array) typed for `{footer}`,
 * and capitalised keys ("Note:").
 *
 * Doc shape (as used in clinical-trials' doc):
 *   {footer}
 *   note: Methodology, may contain <a href="...">links</a>.
 *   credit: Jane Doe
 *   creditUrl: https://cen.acs.org/staffDirectory/...
 *   {}
 *   [footer.sources]
 *   name: ClinicalTrials.gov
 *   url: https://clinicaltrials.gov/
 *
 *   name: ANZCTR
 *   url: https://www.anzctr.org.au/
 *   []
 * `[footer.sources]` after the `{}` adds `sources` to the same footer object.
 * (`source:` + `sourceUrl:` also work for a single source.)
 *
 * @returns {{ note?: string, sources?: {name: string, url?: string}[], source?: string, sourceUrl?: string, credit?: string, creditUrl?: string } | undefined}
 */
export function footerOf(parsed, key = "footer") {
	const raw = parsed?.[key];
	const block = Array.isArray(raw) ? raw[0] : raw;
	if (!block || typeof block !== "object") return undefined;
	return Object.fromEntries(
		Object.entries(block).map(([k, v]) => [k.charAt(0).toLowerCase() + k.slice(1), v])
	);
}

/** footerOf() → the props ChartFooter takes: `<ChartFooter {...chartFooterProps(f)} />`. */
export function chartFooterProps(f) {
	if (!f) return {};
	const items = Array.isArray(f.sources)
		? f.sources.filter((s) => s?.name).map((s) => ({ name: s.name, url: s.url || undefined }))
		: undefined;
	return {
		note: f.note || undefined,
		source:
			items?.length || f.source
				? { items: items?.length ? items : undefined, text: f.source, href: f.sourceUrl || undefined }
				: undefined,
		credit: f.credit ? { text: f.credit, href: f.creditUrl || undefined } : undefined
	};
}
