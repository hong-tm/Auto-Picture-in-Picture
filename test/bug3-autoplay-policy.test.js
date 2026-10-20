"use strict";

// RED suite for BUG-3: navigator.mediaSession.setAutoplayPolicy does not exist.
// Both guarded branches are dead; the recorder stub proves neither is reached.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createWorld } = require("./harness.js");

const PIP_SOURCE = fs.readFileSync(path.join(__dirname, "..", "pip.js"), "utf8");

module.exports = {
	register(t) {
		t.test("mediaSession.setAutoplayPolicy is never called during a full hidden PiP scenario", async () => {
			const world = createWorld({
				host: "youtube.com",
				videos: [{ selectors: [".html5-main-video"], playing: true }],
				setAutoplayPolicy: true,
			});
			const v1 = world.videos[0];

			await world.tick(600);
			world.setHidden(true);
			await world.tick(600);

			assert.ok((world.calls.rPiP[v1] || 0) >= 1, "scenario must actually enter PiP");
			assert.equal(
				world.calls.setAutoplayPolicy.length,
				0,
				"setAutoplayPolicy is non-standard and must never be called"
			);
			assert.equal(world.errors.length, 0, `unexpected errors: ${world.errors.join(" | ")}`);
		});

		t.test("source contains no setAutoplayPolicy", () => {
			assert.ok(
				!PIP_SOURCE.includes("setAutoplayPolicy"),
				"the hallucinated mediaSession.setAutoplayPolicy branches must be removed"
			);
		});
	},
};
