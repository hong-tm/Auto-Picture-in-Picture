"use strict";

// RED suite for BUG-1: the pinned 8-row state matrix from
// .omo/plans/apip-v141-bugfix.md (## Verification strategy, "### Pinned 8-row
// state matrix"). Every row encodes the POST-FIX expectation, so against
// unmodified v1.4 all 8 rows fail (listener placement plus the state-reset
// rows that depend on it).
//
// Harness facts these rows rely on:
//   - createWorld attaches `videos` before pip.js runs, so on a visible boot
//     the controller never discovers a video: the MutationObserver only fires
//     on mutations and nothing calls getVideoElement. Real pages insert the
//     video after document-start, which is what locks the element and (post
//     BUG-1 fix) attaches the video-scoped PiP listeners. Each row therefore
//     performs an explicit discovery mutation (flushMutations) to model that
//     insertion. Without it, a user-initiated PiP event could never be
//     observed by the script because no video listener would exist yet.
//   - SPA rows (R2/R4/R6/R8) drive the bilibili switch via
//     history.pushState, then swapVideo(v2, {playing:true}), then tick(600).
//     The rescan must come from the site navigation path, not the observer
//     (which is disconnected after lock once BUG-5 lands).

const assert = require("node:assert/strict");
const { createWorld } = require("./harness.js");

const YOUTUBE = { host: "youtube.com", selectors: [".html5-main-video"] };
const BILIBILI = { host: "bilibili.com", selectors: ["video"] };
const SPA_URL = "/bilibili.html?p=2";

async function boot(site) {
	const world = createWorld({
		host: site.host,
		videos: [{ selectors: site.selectors, playing: true }],
	});
	await world.tick(600);
	return world;
}

// Model the video appearing after document-start so the controller's
// discovery path runs. On a visible tab this locks the element without
// entering PiP.
async function discover(world) {
	world.flushMutations();
	await world.tick(400);
}

function newPlayingVideo(world, site) {
	return world.createVideo({ selectors: site.selectors, playing: true });
}

async function spaSwitch(world, v2) {
	world.history.pushState("", "", SPA_URL);
	world.swapVideo(v2, { playing: true });
	await world.tick(600);
}

function rPiP(world, video) {
	return world.calls.rPiP[video] || 0;
}

function assertNoErrors(world) {
	assert.equal(world.errors.length, 0, `unexpected errors: ${world.errors.join(" | ")}`);
}

module.exports = {
	register(t) {
		t.test("R1 youtube/script/hidden/manual-close", async () => {
			const world = await boot(YOUTUBE);
			const v1 = world.videos[0];
			await discover(world);

			world.setHidden(true);
			await world.tick(600);
			assert.equal(rPiP(world, v1), 1, "hide must auto-enter PiP once");
			assert.equal(
				world.listeners(v1, "leavepictureinpicture"),
				1,
				"leavepictureinpicture must be tracked on the locked video element"
			);

			world.userLeavePip();
			assert.equal(
				world.calls.exit,
				0,
				"a user close must not be routed through document.exitPictureInPicture"
			);

			world.setHidden(false);
			await world.tick(300);
			world.setHidden(true);
			await world.tick(600);
			assert.equal(rPiP(world, v1), 2, "a user close must reset state so a later hide re-enters");
			assertNoErrors(world);
		});

		t.test("R2 bilibili/script/hidden/SPA-switch", async () => {
			const world = await boot(BILIBILI);
			const v1 = world.videos[0];
			await discover(world);

			world.setHidden(true);
			await world.tick(600);
			assert.equal(rPiP(world, v1), 1, "hide must auto-enter PiP on the first video");

			const v2 = newPlayingVideo(world, BILIBILI);
			await spaSwitch(world, v2);
			assert.equal(rPiP(world, v2), 1, "SPA switch while hidden must lock and re-enter on the new video");
			assert.equal(world.listeners(v2, "leavepictureinpicture"), 1, "listeners must move to the new video");
			assert.equal(world.listeners(v1, "leavepictureinpicture"), 0, "old video listeners must be detached");
			assertNoErrors(world);
		});

		t.test("R3 youtube/script/visible/manual-close", async () => {
			const world = await boot(YOUTUBE);
			const v1 = world.videos[0];
			await discover(world);

			world.setHidden(true);
			await world.tick(600);
			assert.equal(rPiP(world, v1), 1, "hide must auto-enter PiP once");

			world.setHidden(false);
			await world.tick(300);
			assert.equal(
				world.calls.exit,
				0,
				"show must not exit when the PiP was initiated from the other tab (code-as-written)"
			);

			world.userLeavePip();
			world.setHidden(true);
			await world.tick(600);
			assert.equal(rPiP(world, v1), 2, "after a user close the state must reset and re-enter");
			assertNoErrors(world);
		});

		t.test("R4 bilibili/script/visible/SPA-switch", async () => {
			const world = await boot(BILIBILI);
			const v1 = world.videos[0];
			await discover(world);

			world.setHidden(true);
			await world.tick(600);
			assert.equal(rPiP(world, v1), 1, "hide must auto-enter PiP once");

			world.setHidden(false);
			await world.tick(300);
			assert.equal(world.calls.exit, 0, "show must not exit a cross-tab-initiated PiP");

			const v2 = newPlayingVideo(world, BILIBILI);
			await spaSwitch(world, v2);
			assert.equal(rPiP(world, v2), 0, "an active tab must not auto-enter PiP after an SPA switch");
			assert.equal(world.listeners(v2, "leavepictureinpicture"), 1, "listeners must move to the new video");
			assertNoErrors(world);
		});

		t.test("R5 youtube/user/hidden/manual-close", async () => {
			const world = await boot(YOUTUBE);
			const v1 = world.videos[0];
			await discover(world);

			world.userEnterPip(v1);
			assert.equal(rPiP(world, v1), 0, "a manual PiP entry does not call requestPictureInPicture");
			assert.equal(
				world.listeners(v1, "enterpictureinpicture"),
				1,
				"enterpictureinpicture must be tracked on the locked video element"
			);

			world.setHidden(true);
			await world.tick(600);
			assert.equal(rPiP(world, v1), 0, "no auto request while PiP is already open");

			world.userLeavePip();
			assert.equal(
				world.listeners(v1, "leavepictureinpicture"),
				1,
				"leavepictureinpicture must be tracked on the locked video element"
			);

			world.setHidden(false);
			await world.tick(300);
			world.setHidden(true);
			await world.tick(600);
			assert.equal(rPiP(world, v1), 1, "after a user close a re-hide enters PiP once");
			assertNoErrors(world);
		});

		t.test("R6 bilibili/user/hidden/SPA-switch", async () => {
			const world = await boot(BILIBILI);
			const v1 = world.videos[0];
			await discover(world);

			world.userEnterPip(v1);
			world.setHidden(true);
			await world.tick(600);

			const v2 = newPlayingVideo(world, BILIBILI);
			await spaSwitch(world, v2);
			assert.equal(rPiP(world, v2), 1, "SPA switch while hidden must re-enter on the new video");
			assert.equal(world.listeners(v2, "leavepictureinpicture"), 1, "listeners must move to the new video");
			assert.equal(world.listeners(v1, "leavepictureinpicture"), 0, "old video listeners must be detached");
			assertNoErrors(world);
		});

		t.test("R7 youtube/user/visible/manual-close", async () => {
			const world = await boot(YOUTUBE);
			const v1 = world.videos[0];
			await discover(world);

			world.userEnterPip(v1);
			world.setHidden(true);
			await world.tick(600);

			world.setHidden(false);
			await world.tick(300);
			assert.equal(world.calls.exit, 1, "show must exit a user-initiated PiP once");

			world.setHidden(true);
			await world.tick(600);
			assert.equal(rPiP(world, v1), 1, "re-hide after the exit must enter PiP once");
			assert.equal(
				world.listeners(v1, "leavepictureinpicture"),
				1,
				"leavepictureinpicture must be tracked on the locked video element"
			);
			assertNoErrors(world);
		});

		t.test("R8 bilibili/user/visible/SPA-switch", async () => {
			const world = await boot(BILIBILI);
			const v1 = world.videos[0];
			await discover(world);

			world.userEnterPip(v1);
			world.setHidden(true);
			await world.tick(600);

			world.setHidden(false);
			await world.tick(300);
			assert.equal(world.calls.exit, 1, "show must exit a user-initiated PiP once");

			const v2 = newPlayingVideo(world, BILIBILI);
			await spaSwitch(world, v2);
			assert.equal(rPiP(world, v2), 0, "an active tab must not auto-enter after an SPA switch");
			assert.equal(world.listeners(v2, "leavepictureinpicture"), 1, "listeners must move to the new video");
			assertNoErrors(world);
		});
	},
};
