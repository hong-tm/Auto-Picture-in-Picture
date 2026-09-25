"use strict";

// Fenced-region guards. These regions are explicitly out of scope for the
// v1.4.1 bugfix (see the plan's "Out of scope" table) and must stay
// byte-identical. The header may only change its @version line, which may be
// 1.4 or 1.4.1 (todo 11 bumps it; this suite must not need an edit).
//
// These guards pass on unmodified v1.4 and must stay green through the chain.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const PIP_SOURCE = fs.readFileSync(path.join(__dirname, "..", "pip.js"), "utf8");
const PIP_LINES = PIP_SOURCE.split("\n");

const VERSION_LINE = /^\s*\/\/\s*@version\s+1\.4(\.1)?\s*$/;

const HEADER = [
	"// ==UserScript==",
	"// @name         Auto Picture-in-Picture",
	"// @namespace    http://tampermonkey.net/",
	"// @version      1.4",
	"// @description  Automatically enables picture-in-picture mode for YouTube and Bilibili with improved Edge and Brave support",
	"// @author       hong-tm",
	"// @license      MIT",
	"// @icon         https://raw.githubusercontent.com/hong-tm/blog-image/main/picture-in-picture.svg",
	"// @match        https://www.youtube.com/*",
	"// @match        https://www.bilibili.com/*",
	"// @grant        GM_log",
	"// @run-at       document-start",
	"// @downloadURL https://update.greasyfork.org/scripts/516762/Auto%20Picture-in-Picture.user.js",
	"// @updateURL https://update.greasyfork.org/scripts/516762/Auto%20Picture-in-Picture.meta.js",
	"// ==/UserScript==",
];

// pip.js:158-161 (brave detection branch)
const BRAVE_BLOCK = [
	"\t\t\t\tisBrave:",
	"\t\t\t\t\twindow.navigator.brave?.isBrave ||",
	'\t\t\t\t\tua.includes("Brave") ||',
	'\t\t\t\t\tdocument.documentElement.dataset.browserType === "brave",',
].join("\n");

// pip.js:390-396 (Brave/Edge play branch)
const PLAY_BRANCH = [
	"\t\t\t\tif (BrowserDetector.isBrave || BrowserDetector.isEdge) {",
	"\t\t\t\t\tvideo.focus();",
	"\t\t\t\t\tawait new Promise((resolve) => setTimeout(resolve, 200));",
	"\t\t\t\t\tif (video.paused) {",
	"\t\t\t\t\t\tawait video.play().catch(() => {});",
	"\t\t\t\t\t}",
	"\t\t\t\t}",
].join("\n");

// pip.js:656-663 (deprecated unload listener)
const UNLOAD_LISTENER = [
	"\t// Cleanup on unload",
	"\twindow.addEventListener(",
	'\t\t"unload",',
	"\t\t() => {",
	"\t\t\tpipController.cleanup();",
	"\t\t},",
	"\t\t{ passive: true }",
	"\t);",
].join("\n");

module.exports = {
	register(t) {
		t.test("header lines 1-15 are intact (only @version may change)", () => {
			assert.ok(PIP_LINES.length >= 15, "pip.js must have at least 15 lines");
			for (let i = 0; i < 15; i++) {
				if (i === 3) {
					assert.match(PIP_LINES[i], VERSION_LINE, "@version must be 1.4 or 1.4.1");
				} else {
					assert.equal(PIP_LINES[i], HEADER[i], `header line ${i + 1} must be unchanged`);
				}
			}
		});

		t.test("fenced brave detection block is byte-identical", () => {
			assert.ok(PIP_SOURCE.includes(BRAVE_BLOCK), "brave block (pip.js:158-161) must stay verbatim");
		});

		t.test("fenced Brave/Edge play branch is byte-identical", () => {
			assert.ok(PIP_SOURCE.includes(PLAY_BRANCH), "Brave/Edge play branch (pip.js:390-396) must stay verbatim");
		});

		t.test("fenced unload listener is byte-identical", () => {
			assert.ok(PIP_SOURCE.includes(UNLOAD_LISTENER), "unload listener (pip.js:656-663) must stay verbatim");
		});
	},
};
