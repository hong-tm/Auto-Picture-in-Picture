"use strict";

// RED suite for BUG-2: the #hasUserGesture flag is written in three places and
// read nowhere. Removing it must also remove the document-level
// mousedown/keydown/touchstart listeners that exist only to feed it.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createWorld } = require("./harness.js");

const PIP_SOURCE = fs.readFileSync(path.join(__dirname, "..", "pip.js"), "utf8");

module.exports = {
	register(t) {
		t.test("boot adds no mousedown/keydown/touchstart listeners on document", async () => {
			const world = createWorld({
				host: "youtube.com",
				videos: [{ selectors: [".html5-main-video"], playing: true }],
			});
			await world.tick(600);

			for (const event of ["mousedown", "keydown", "touchstart"]) {
				assert.equal(
					world.listeners(world.document, event),
					0,
					`document must not track ${event} for the dead #hasUserGesture flag`
				);
			}
			assert.equal(world.errors.length, 0, `unexpected errors: ${world.errors.join(" | ")}`);
		});

		t.test("source contains no #hasUserGesture dead code", () => {
			assert.ok(
				!PIP_SOURCE.includes("#hasUserGesture"),
				"the dead #hasUserGesture field, assignments, and gesture listeners must be removed"
			);
		});
	},
};
