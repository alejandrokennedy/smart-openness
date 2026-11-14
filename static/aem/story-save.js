/**
 * Move the C&EN article page's own Save button into the story's title page.
 *
 * From misc/save-btn/intro-save.js (Cancer Alley), made story-agnostic: it
 * finds the story's action row by its `data-cen-save-actions` attribute rather
 * than by one import root id and one class, so any export can load it.
 *
 * The page's Save button is already wired to the reader's account and carries
 * the article's path and DOI; building our own would mean duplicating that.
 * So this waits until the page has initialised it, then moves it into the
 * story's `.cen-save-slot` and hides the page's sticky header copy.
 *
 * It KEEPS WATCHING after the move The story re-renders its title
 * block, and a slot that is re-rendered comes back empty — the moved button
 * went with the old one, and the first version had stopped looking. The
 * button is held on to and put back.
 *
 * DEBUGGING ON THE LIVE PAGE: add ?cenSaveDebug=1 to the URL and the console
 * lists every candidate button the script can see and why each was or was
 * not taken — which is the one thing that cannot be checked off the page.
 *
 * Loaded by the import.html that tasks/convert-svelte.ts writes, after the
 * story's own script. Does nothing where there is no page Save button.
 */
(function setupStorySave() {
	"use strict";
	if (window.__cenStorySave) return;
	window.__cenStorySave = true;

	var DEBUG = /[?&]cenSaveDebug=1(?:&|$)/.test(window.location.search);
	function log() {
		if (DEBUG && window.console) console.log.apply(console, ["[cen-save]"].concat([].slice.call(arguments)));
	}

	function hasBookmark(button) {
		return (
			button.classList.contains("saveIconAnalytics") ||
			!!button.querySelector(".saveIconAnalytics, .bi-bookmark, .bi-bookmark-fill, [class*='bookmark']")
		);
	}

	function isInitializedSaveButton(button) {
		if (!button || button.dataset.initialized !== "true") return false;
		var hasSaveMetadata = button.hasAttribute("data-path") || button.hasAttribute("data-doi");
		return hasSaveMetadata && hasBookmark(button);
	}

	/**
	 * Where Cancer Alley found it first; then, if the live page puts it
	 * somewhere else, any initialised save-like control outside the story.
	 */
	var PLACES = [
		'.article-header-sticky a[data-initialized="true"]',
		'.article-utility-bar--actions a[data-initialized="true"]',
		'a[data-initialized="true"][data-path]',
		'a[data-initialized="true"][data-doi]',
		'button[data-initialized="true"][data-path]',
		'button[data-initialized="true"][data-doi]'
	];

	function findNativeSaveButton() {
		for (var k = 0; k < PLACES.length; k++) {
			var list = document.querySelectorAll(PLACES[k]);
			for (var j = 0; j < list.length; j++) {
				var b = list[j];
				if (b.closest("[data-cen-save-actions]")) continue;
				if (isInitializedSaveButton(b)) return b;
			}
		}
		return null;
	}

	function report() {
		if (!DEBUG) return;
		var seen = document.querySelectorAll(
			"[data-path], [data-doi], .saveIconAnalytics, .bi-bookmark, .bi-bookmark-fill, [data-initialized]"
		);
		log("slot present:", !!findSlot(), "· candidates:", seen.length);
		for (var k = 0; k < seen.length; k++) {
			var el = seen[k].closest("a, button") || seen[k];
			log(
				el.tagName.toLowerCase(),
				"class=" + JSON.stringify(el.className),
				"initialized=" + el.getAttribute("data-initialized"),
				"path=" + el.hasAttribute("data-path"),
				"doi=" + el.hasAttribute("data-doi"),
				"bookmark=" + hasBookmark(el),
				"in:",
				(el.closest("[class]") && el.parentElement && el.parentElement.closest("[class]")
					? el.parentElement.closest("[class]").className
					: "?")
			);
		}
	}

	/**
	 * The slot of the row that is showing. A story may have several
	 * (e.g. a title-page row and a compact one that takes over once the title
	 * has faded); each says which via data-active. Falls back to the first.
	 */
	function findSlot() {
		return (
			document.querySelector('[data-cen-save-actions][data-active="true"] .cen-save-slot') ||
			document.querySelector("[data-cen-save-actions] .cen-save-slot")
		);
	}

	var moved = null;

	function transfer() {
		var slot = findSlot();
		if (!slot) return false;
		if (slot.querySelector(".cen-save-button")) return true;
		// Moved once already, and now the other row is showing: carry it across.
		if (moved && moved.parentElement !== slot) {
			slot.appendChild(moved);
			log("moved the Save button to the row now showing");
			return true;
		}
		// Already moved once and the slot was re-rendered: put the same one back.
		var button = moved || findNativeSaveButton();
		if (!button) return false;
		if (!moved) {
			var originalItem = button.closest("li");
			["btn", "btn-sm", "font-mono", "text-uppercase", "text-dark", "howerBorder"].forEach(function (c) {
				button.classList.remove(c);
			});
			button.classList.add("cen-save-button");
			if (originalItem && !originalItem.contains(slot)) {
				// Removed once the button has left it, if it held nothing else.
				setTimeout(function () {
					if (!originalItem.children.length) originalItem.remove();
				}, 0);
			}
			moved = button;
			log("moved the page's Save button into the story");
		} else {
			log("slot was re-rendered; put the Save button back");
		}
		slot.appendChild(button);
		document.body.classList.add("cen-save-transferred");
		return true;
	}

	report();
	transfer();
	if (!("MutationObserver" in window)) return;
	var pending = false;
	new MutationObserver(function () {
		if (pending) return;
		pending = true;
		// Batched to one check a frame: this watches the whole page, for good.
		requestAnimationFrame(function () {
			pending = false;
			transfer();
		});
	}).observe(document.body, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ["data-initialized", "data-active"]
	});
	if (DEBUG) setTimeout(report, 4000);
})();
