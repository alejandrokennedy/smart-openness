import { readFileSync } from "fs";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import { timeFormat } from "d3";
import path from "path";
import svg from "vite-plugin-svgstring";
import dsv from "@rollup/plugin-dsv";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const timestamp = timeFormat("%Y-%m-%d-%H:%M")(new Date());

export default defineConfig({
	define: {
		__VERSION__: JSON.stringify(version),
		__TIMESTAMP__: JSON.stringify(timestamp)
	},
	plugins: [sveltekit(), dsv(), svg()],
	/**
	 * Dev half of the live-copy proxy ($runes/liveCopy, api/gdoc.js): serves
	 * /api/gdoc?id=<docId> by fetching the doc's text export server-side. The
	 * deployed site gets the same URL from the Vercel function in api/gdoc.js.
	 */
	server: {
		proxy: {
			"^/api/gdoc\\b": {
				target: "https://docs.google.com",
				changeOrigin: true,
				// Google 307s to a googleusercontent host; passing that back to the
				// browser just moves the CORS problem one hop, so follow it here.
				followRedirects: true,
				rewrite: (p) => {
					const id = new URL(p, "http://localhost").searchParams.get("id") ?? "";
					return `/document/d/${encodeURIComponent(id)}/export?format=txt`;
				}
			}
		}
	},
	resolve: {
		alias: {
			$actions: path.resolve("./src/actions"),
			$components: path.resolve("./src/components"),
			$data: path.resolve("./src/data"),
			$routes: path.resolve("./src/routes"),
			$runes: path.resolve("./src/runes"),
			$styles: path.resolve("./src/styles"),
			$svg: path.resolve("./src/svg"),
			$utils: path.resolve("./src/utils")
		}
	},
	ssr: {
		noExternal: ["bits-ui"]
	}
});
