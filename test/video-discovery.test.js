"use strict";

const assert = require("node:assert/strict");
const { createWorld } = require("./harness.js");

module.exports = {
	register(t) {
		t.test("overlapping missing-video scans share one retry chain", async () => {
			const world = createWorld({ host: "youtube.com" });
			let queries = 0;
			let timers = 0;
			const querySelector = world.document.querySelector;
			world.document.querySelector = (selector) => {
				queries++;
				return querySelector(selector);
			};
			const setTimeout = world.sandbox.setTimeout;
			world.sandbox.setTimeout = (fn, delay, ...args) => {
				timers++;
				return setTimeout(fn, delay, ...args);
			};

			await world.tick(600);
			for (let i = 0; i < 10; i++) {
				world.flushMutations();
				await world.tick(250);
			}
			await world.tick(4000);

			assert.equal(queries, 18, "ten mutation batches should use one six-attempt scan");
			assert.equal(timers, 15, "ten mutation batches should use one retry schedule plus debounce timers");
			assert.deepEqual(world.errors, []);
		});
	},
};
