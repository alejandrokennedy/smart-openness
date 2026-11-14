import fs from "fs";
import docs from "../google.config.js";
import { parseDoc, checkArrayCount } from "../src/utils/archieDoc.js";

const CWD = process.cwd();

// Each google.config.js entry: { id, filepath, gid? (sheet tab → CSV),
// parse? ({ array, delimiter } — see src/utils/archieDoc.js; use the same value
// you pass to createLiveCopy so snapshot and live copy parse identically) }.
const fetchGoogle = async ({ id, gid, parse }) => {
	console.log(`fetching...${id}`);

	const base = "https://docs.google.com";
	const post = gid
		? `spreadsheets/u/1/d/${id}/export?format=csv&id=${id}&gid=${gid}`
		: `document/d/${id}/export?format=txt`;
	const url = `${base}/${post}`;

	try {
		const response = await fetch(url);
		const text = await response.text();

		if (gid) return text;

		const parsed = parseDoc(text, parse);
		if (parse?.delimiter) {
			const warning = checkArrayCount(text, parsed, parse.array, parse.delimiter);
			if (warning) console.warn(`WARNING (${id}): ${warning}`);
		}
		return JSON.stringify(parsed, null, 2);
	} catch (err) {
		throw new Error(err);
	}
};

(async () => {
	for (let d of docs) {
		try {
			const str = await fetchGoogle(d);
			const file = `${CWD}/${d.filepath}`;
			fs.writeFileSync(file, str);
		} catch (err) {
			console.log(err);
		}
	}
})();
