"use strict";

// RED suite for BUG-5: the MutationObserver watches the whole documentElement
// subtree forever. It must disconnect once a video is locked and reconnect
// only when the controller again needs to discover a video:
//   (a) bilibili navigation rescan
//   (b) getVideoElement retry exhaustion
//   (c) leavepictureinpicture
//   (d) visibilitychange with no connected video
// observe() may only run on an inactive->active transition.

const assert = require("node:assert/strict");
const { createWorld } = require("./harness.js");

const YOUTUBE = { host: "youtube.com", selectors: [".html5-main-video"] };
const BILIBILI = { host: "bilibili.com", selectors: ["video"] };

async function boot(site) {
	const world = createWorld({
		host: site.host,
		videos: [{ selectors: site.selectors, playing: true }],
	});
	await world.tick(600);
	return world;
}

function observer(world) {
	return world.observers[0];
}

// Lock the first video through the discovery path (post-fix this disconnects
// the observer).
async function lock(world) {
	world.flushMutations();
	await world.tick(400);
}

function assertNoErrors(world) {
	assert.equal(world.errors.length, 0, `unexpected errors: ${world.errors.join(" | ")}`);
}

module.exports = {
	register(t) {
		for (const site of [YOUTUBE, BILIBILI]) {
			t.test(`${site.host}: connected mutations schedule no timers, later replacement is discovered`, async () => {
				const world = await boot(site);
				const v1 = world.videos[0];
				await lock(world);
				if (site === BILIBILI) {
					world.history.pushState({}, "", "/video/same-player");
					await world.tick(300);
				} else {
					world.userEnterPip(v1);
					world.userLeavePip();
				}
				assert.equal(observer(world).observed, true);
				let scheduled = 0;
				const schedule = world.sandbox.setTimeout;
				world.sandbox.setTimeout = (...args) => {
					scheduled++;
					return schedule(...args);
				};
				const before = world.querySelectorCalls;
				for (let i = 0; i < 100; i++) {
					world.flushMutations();
					await world.tick(250);
				}
				assert.equal(scheduled, 0, "a connected cached video needs no debounce timer");
				assert.equal(world.querySelectorCalls, before);
				assert.equal(observer(world).observed, true, "keep watching for removal");

				const v2 = world.createVideo({ selectors: site.selectors, playing: true });
				world.swapVideo(v2);
				assert.equal(scheduled, 1);
				await world.tick(199);
				assert.equal(world.querySelectorCalls, before, "preserve the 200ms discovery debounce");
				await world.tick(1);
				assert.equal(observer(world).observed, false);
				assert.equal(world.listeners(v1, "leavepictureinpicture"), 0);
				assert.equal(world.listeners(v2, "leavepictureinpicture"), 1);
				world.setHidden(true);
				await world.tick(300);
				assert.equal(world.document.pictureInPictureElement, v2);
				assertNoErrors(world);
			});
		}

		t.test("queued discovery ignores a cached video reconnected before the debounce fires", async () => {
			const world = await boot(YOUTUBE);
			const v1 = world.videos[0];
			world.setHidden(true);
			await world.tick(600);
			world.userLeavePip();
			world.detach(v1);
			world.flushMutations();
			world.attach(v1);
			world.flushMutations();
			const before = world.querySelectorCalls;
			await world.tick(200);
			assert.equal(world.querySelectorCalls, before);
			assert.equal(world.document.pictureInPictureElement, null, "do not reopen manually closed PiP");
			assert.equal(world.calls.rPiP[v1], 1);
			assertNoErrors(world);
		});

		t.test("observer disconnects after lock and flushMutations becomes a no-op", async () => {
			const world = await boot(YOUTUBE);
			const v1 = world.videos[0];
			const obs = observer(world);
			assert.equal(obs.observeCalls, 1, "constructor must observe exactly once");

			await lock(world);
			assert.ok(obs.disconnectCalls >= 1, "locking the video must disconnect the observer");
			assert.equal(obs.observed, false, "observer must be inactive after lock");

			world.detach(v1);
			const before = world.querySelectorCalls;
			world.flushMutations();
			await world.tick(400);
			assert.equal(
				world.querySelectorCalls,
				before,
				"flushMutations must be a no-op while the observer is disconnected"
			);
			assert.equal(obs.observeCalls, 1, "no-op flush must not re-observe");
			assertNoErrors(world);
		});

		t.test("observer reconnects on the bilibili navigation rescan", async () => {
			const world = await boot(BILIBILI);
			const v1 = world.videos[0];
			const obs = observer(world);

			await lock(world);
			assert.equal(obs.observed, false, "precondition: observer disconnected after lock");

			world.detach(v1);
			const v2 = world.createVideo({ selectors: BILIBILI.selectors, playing: true });
			world.attach(v2);

			const observeBefore = obs.observeCalls;
			world.history.pushState("", "", "/bilibili.html?p=2");
			await world.tick(600);

			// The rescan re-observes at the top, then locks v2 and disconnects again;
			// the reconnect is proven by the observe count, not the final flag.
			assert.ok(obs.observeCalls > observeBefore, "navigation rescan must reconnect the observer");
			assert.equal(obs.observed, false, "the rescan locks the new video and disconnects again");
			assert.ok(obs.observeCalls > observeBefore, "observeCalls must increment on reconnect");
			assertNoErrors(world);
		});

		t.test("observer reconnects when getVideoElement exhausts retries with no connected video", async () => {
			const world = await boot(YOUTUBE);
			const v1 = world.videos[0];
			const obs = observer(world);

			await lock(world);
			assert.equal(obs.observed, false, "precondition: observer disconnected after lock");

			world.detach(v1);
			const observeBefore = obs.observeCalls;

			world.setHidden(true);
			// 100ms visibility debounce + 5 retry delays (200/400/600/800/1000ms).
			await world.tick(5000);

			assert.equal(obs.observed, true, "a failed rescan must reconnect the observer");
			assert.equal(
				obs.observeCalls,
				observeBefore + 1,
				"retry exhaustion must reconnect once, not once per trigger"
			);
			assertNoErrors(world);
		});

		t.test("observer reconnects when the user leaves PiP", async () => {
			const world = await boot(YOUTUBE);
			const v1 = world.videos[0];
			const obs = observer(world);

			world.setHidden(true);
			await world.tick(600);
			assert.equal(world.calls.rPiP[v1] || 0, 1, "precondition: hide entered PiP");
			assert.equal(obs.observed, false, "precondition: observer disconnected after lock");

			const observeBefore = obs.observeCalls;
			world.userLeavePip();

			assert.equal(obs.observed, true, "leavepictureinpicture must reconnect the observer");
			assert.ok(obs.observeCalls > observeBefore, "observeCalls must increment on reconnect");
			assertNoErrors(world);
		});

		t.test("observe only fires on an inactive->active transition", async () => {
			const world = await boot(YOUTUBE);
			const v1 = world.videos[0];
			const obs = observer(world);

			await lock(world);
			assert.equal(obs.observed, false, "precondition: observer disconnected after lock");

			world.detach(v1);
			world.setHidden(true);
			await world.tick(150);
			assert.equal(obs.observed, true, "a visibility change with no connected video must reconnect");
			const afterReconnect = obs.observeCalls;

			world.setHidden(false);
			await world.tick(150);
			world.setHidden(true);
			await world.tick(150);
			assert.equal(
				obs.observeCalls,
				afterReconnect,
				"observe must not fire again while already active"
			);
			assertNoErrors(world);
		});
	},
};
