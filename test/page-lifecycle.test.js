"use strict";

// Verify pagehide cleanup without breaking bfcache restoration.
const assert = require("node:assert/strict");
const { createWorld } = require("./harness.js");

async function boot() {
	const world = createWorld({
		host: "youtube.com",
		videos: [{ selectors: [".html5-main-video"], playing: true }],
	});
	await world.tick(600);
	return world;
}

module.exports = {
	register(t) {
		t.test("pagehide keeps the controller for bfcache restoration", async () => {
			const world = await boot();

			world.window.dispatch("pagehide", { persisted: true });
			assert.equal(world.listeners(world.window, "focus"), 1);
			assert.equal(world.listeners(world.document, "visibilitychange"), 1);

			world.setWindowFocused(false);
			await world.tick(600);
			assert.equal(world.document.pictureInPictureElement, world.videos[0]);
			assert.equal(world.errors.length, 0, world.errors.join(" | "));
		});

		t.test("pagehide cleans up on a normal page leave", async () => {
			const world = await boot();

			world.window.dispatch("pagehide", { persisted: false });
			assert.equal(world.listeners(world.window, "focus"), 0);
			assert.equal(world.listeners(world.document, "visibilitychange"), 0);
			assert.equal(world.observers[0].observed, false);
			assert.equal(world.errors.length, 0, world.errors.join(" | "));
		});
	},
};
