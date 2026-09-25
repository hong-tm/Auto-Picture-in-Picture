"use strict";

const assert = require("node:assert/strict");
const { createWorld } = require("./harness.js");

module.exports = {
	register(t) {
		t.test("hidden tab with a playing video enters PiP on unmodified v1.4", async () => {
			const world = createWorld({
				host: "youtube.com",
				videos: [{ selectors: [".html5-main-video"], playing: true }],
			});
			const v1 = world.videos[0];

			await world.tick(600);
			world.setHidden(true);
			await world.tick(400);

			assert.ok(
				(world.calls.rPiP[v1] || 0) >= 1,
				`expected requestPictureInPicture >= 1, got ${world.calls.rPiP[v1]}`
			);
			assert.equal(
				world.errors.length,
				0,
				`unexpected errors: ${world.errors.join(" | ")}`
			);
		});

		t.test("unknown host bails out of getVideoElement with no uncaught errors", async () => {
			const world = createWorld({
				host: "example.com",
				videos: [{ selectors: [".html5-main-video"], playing: true }],
			});

			await world.tick(600);
			world.setHidden(true);
			await world.tick(400);

			// No domain matches, so getVideoElement returns null before touching the
			// DOM. Zero querySelector calls plus zero PiP requests pin that path.
			assert.equal(
				world.querySelectorCalls,
				0,
				"getVideoElement must return null at the domain gate without querying the DOM"
			);
			assert.equal(
				Object.keys(world.calls.rPiP).length,
				0,
				"unknown host must not request Picture-in-Picture"
			);
			assert.equal(
				world.errors.length,
				0,
				`unexpected errors: ${world.errors.join(" | ")}`
			);
		});
	},
};
