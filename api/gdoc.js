/**
 * GET /api/gdoc?id=<docId> → the Google Doc's plain-text (ArchieML) export.
 *
 * A Vercel serverless function: the fallback half of $runes/liveCopy when the
 * browser can't fetch Google directly (CORS), and the only route on AEM, which
 * has no /api of its own (build with VITE_GDOC_PROXY=https://<project>.vercel.app).
 * In dev the same URL is served by the vite proxy in vite.config.js.
 *
 * Only doc ids listed in google.config.js are fetched — without that check this
 * is an open redirect-follower on the project's domain.
 *
 * Vercel setup: see CLAUDE.md → "Live copy". In short: import the repo, and
 * turn OFF Deployment Protection (or AEM/readers get a login page, and the
 * snapshot renders instead).
 */
import docs from "../google.config.js";

const ALLOWED = new Set(docs.filter((d) => !d.gid).map((d) => d.id));

/** Origins that may read this from a browser: C&EN's AEM hosts and local previews. */
const corsOk = (origin) => {
	try {
		const h = new URL(origin).hostname;
		return (
			h === "acs.org" ||
			h.endsWith(".acs.org") ||
			h.endsWith(".adobeaemcloud.com") ||
			h === "localhost" ||
			h === "127.0.0.1"
		);
	} catch {
		return false;
	}
};

export default async function handler(req, res) {
	const origin = req.headers?.origin;
	if (origin && corsOk(origin)) {
		res.setHeader("access-control-allow-origin", origin);
		res.setHeader("vary", "origin");
		res.setHeader("access-control-allow-methods", "GET, OPTIONS");
	}
	if (req.method === "OPTIONS") {
		res.status(204).end();
		return;
	}

	const id = String(req.query?.id ?? "").trim();
	if (!ALLOWED.has(id)) {
		res.status(400).send(`unknown doc id: ${id || "(none)"} — add it to google.config.js`);
		return;
	}

	try {
		// Google answers with a 307 to a googleusercontent host; fetch follows it.
		const upstream = await fetch(`https://docs.google.com/document/d/${id}/export?format=txt`, {
			redirect: "follow",
			headers: { "user-agent": "svelte-starter/gdoc-proxy" }
		});
		if (!upstream.ok) {
			res.status(502).send(`google said ${upstream.status}`);
			return;
		}
		// A doc that isn't link-shared answers with the sign-in page, as a 200.
		if ((upstream.headers.get("content-type") ?? "").includes("text/html")) {
			res.status(502).send("google returned a sign-in page — is the doc shared?");
			return;
		}
		const text = await upstream.text();
		// Browsers keep nothing; the edge keeps 30s so a busy page can't send every
		// view to Google. An edit shows within ~half a minute.
		res.setHeader("content-type", "text/plain; charset=utf-8");
		res.setHeader("cache-control", "public, max-age=0, s-maxage=30, stale-while-revalidate=30");
		res.status(200).send(text);
	} catch (e) {
		res.status(502).send(e instanceof Error ? e.message : String(e));
	}
}
