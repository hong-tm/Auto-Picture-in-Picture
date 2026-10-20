"use strict";

// RED suite for BUG-4: bilibili is an SPA and swaps the video element without
// a page load. v1.4 only watches youtube's `yt-navigate-finish`, so a bilibili
// session change never re-locks the new video.
//
// The tests swap videos with explicit detach/attach instead of swapVideo so
// the MutationObserver path stays out of the timing measurement: post-BUG-5
// the observer is disconnected after lock, and even before BUG-5 a
// mutation-driven rescan would pollute a 300 ms debounce assertion.

const assert = require("node:assert/strict");
const { createWorld } = require("./harness.js");

const BILIBILI = { host: "bilibili.com", selectors: ["video"] };
const YOUTUBE = { host: "youtube.com", selectors: [".html5-main-video"] };
const SPA_URL = "/bilibili.html?p=2";

async function boot(site) {
	const world = createWorld({
		host: site.host,
		videos: [{ selectors: site.selectors, playing: true }],
	});
	await world.tick(600);
	return world;
}

function attachNextVideo(world, site) {
	const video = world.createVideo({ selectors: site.selectors, playing: true });
	world.attach(video);
	return video;
}

module.exports = {
	register(t) {
		t.test("bilibili rescan waits for the full 300ms debounce", async () => {
			const world = await boot(BILIBILI);
			const v1 = world.videos[0];
			world.detach(v1);
			attachNextVideo(world, BILIBILI);

			const before = world.querySelectorCalls;
			world.history.pushState("", "", SPA_URL);
			await world.tick(299);
			assert.equal(
				world.querySelectorCalls,
				before,
				"rescan must not run before the 300ms debounce elapses"
			);

			await world.tick(1);
			assert.ok(world.querySelectorCalls > before, "rescan must run at 300ms");
			assert.equal(world.errors.length, 0, `unexpected errors: ${world.errors.join(" | ")}`);
		});

		t.test("bilibili rescan locks the new video, moves listeners, and re-enters PiP while hidden", async () => {
			const world = await boot(BILIBILI);
			const v1 = world.videos[0];

			world.setHidden(true);
			await world.tick(600);
			assert.equal(world.calls.rPiP[v1] || 0, 1, "hide must auto-enter PiP on the first video");

			world.history.pushState("", "", SPA_URL);
			world.detach(v1);
			const v2 = attachNextVideo(world, BILIBILI);
			await world.tick(600);

			assert.equal(world.calls.rPiP[v2] || 0, 1, "the new video must be locked and re-enter PiP");
			assert.equal(world.listeners(v2, "leavepictureinpicture"), 1, "listeners must be re-attached");
			assert.equal(world.listeners(v1, "leavepictureinpicture"), 0, "listeners must be detached from v1");
			assert.equal(world.errors.length, 0, `unexpected errors: ${world.errors.join(" | ")}`);
		});

		t.test("bilibili pushState burst coalesces into a single rescan", async () => {
			const world = await boot(BILIBILI);
			const v1 = world.videos[0];
			world.detach(v1);
			const v2 = attachNextVideo(world, BILIBILI);

			const beforeBurst = world.querySelectorCalls;
			world.history.pushState("", "", "/bilibili.html?p=2");
			world.history.pushState("", "", "/bilibili.html?p=3");
			world.history.pushState("", "", "/bilibili.html?p=4");
			await world.tick(600);
			const burstDelta = world.querySelectorCalls - beforeBurst;
			assert.ok(burstDelta > 0, "a pushState burst must trigger one rescan");

			world.detach(v2);
			attachNextVideo(world, BILIBILI);
			const beforeSingle = world.querySelectorCalls;
			world.history.pushState("", "", "/bilibili.html?p=5");
			await world.tick(600);
			const singleDelta = world.querySelectorCalls - beforeSingle;

			assert.equal(
				burstDelta,
				singleDelta,
				"three pushStates inside one debounce window must coalesce into one rescan"
			);
			assert.equal(world.errors.length, 0, `unexpected errors: ${world.errors.join(" | ")}`);
		});

		t.test("bilibili popstate triggers the same debounced rescan", async () => {
			const world = await boot(BILIBILI);
			const v1 = world.videos[0];
			world.detach(v1);
			attachNextVideo(world, BILIBILI);

			const before = world.querySelectorCalls;
			world.window.dispatch("popstate", { type: "popstate" });
			await world.tick(600);

			assert.ok(world.querySelectorCalls > before, "popstate must trigger a rescan");
			assert.equal(world.errors.length, 0, `unexpected errors: ${world.errors.join(" | ")}`);
		});

		t.test("youtube history.pushState is untouched: call-through, zero rescans", async () => {
			const world = await boot(YOUTUBE);
			const v1 = world.videos[0];
			world.detach(v1);
			attachNextVideo(world, YOUTUBE);

			const beforeQueries = world.querySelectorCalls;
			const beforePush = world.calls.pushState;
			world.history.pushState("", "", "/watch?v=abc");
			await world.tick(600);

			assert.equal(world.calls.pushState, beforePush + 1, "youtube must not intercept history.pushState");
			assert.equal(world.querySelectorCalls, beforeQueries, "youtube must not rescan on an SPA pushState");
			assert.equal(world.errors.length, 0, `unexpected errors: ${world.errors.join(" | ")}`);
		});
	},
};
