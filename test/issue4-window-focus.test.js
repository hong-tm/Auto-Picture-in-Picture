"use strict";

// Regression suite for issue #4: auto-PiP must also trigger when the user
// switches to another WINDOW (the window loses focus), not only when the tab
// becomes hidden. Root cause pre-fix: the controller listened only to
// document.visibilitychange, which never fires on window blur, so switching
// windows left the video playing with no PiP.
//
// Harness op: setWindowFocused(false|true) dispatches blur/focus on the window
// (and updates document.hasFocus()), mirroring the events a real window switch
// fires. Tab-hidden semantics are unchanged and re-checked by W2.

const assert = require("node:assert/strict");
const { createWorld } = require("./harness.js");

const YOUTUBE = { host: "youtube.com", selectors: [".html5-main-video"] };

async function boot(playing) {
	const world = createWorld({
		host: YOUTUBE.host,
		videos: [{ selectors: YOUTUBE.selectors, playing }],
	});
	await world.tick(600);
	return world;
}

// Model the video appearing after document-start so discovery locks the element
// without entering PiP while the page is active.
async function discover(world) {
	world.flushMutations();
	await world.tick(400);
}

function rPiP(world, video) {
	return world.calls.rPiP[video] || 0;
}

function assertNoErrors(world) {
	assert.equal(world.errors.length, 0, `unexpected errors: ${world.errors.join(" | ")}`);
}

module.exports = {
	register(t) {
		t.test("W1 window blur while playing enters PiP (issue #4)", async () => {
			const world = await boot(true);
			const v1 = world.videos[0];
			await discover(world);

			world.setWindowFocused(false);
			await world.tick(600);
			assert.equal(rPiP(world, v1), 1, "losing window focus must auto-enter PiP once");
			assert.equal(
				world.document.pictureInPictureElement,
				v1,
				"the playing video must be the PiP element"
			);
			assertNoErrors(world);
		});

		t.test("W2 tab hide still enters PiP (no regression)", async () => {
			const world = await boot(true);
			const v1 = world.videos[0];
			await discover(world);

			world.setHidden(true);
			await world.tick(600);
			assert.equal(rPiP(world, v1), 1, "hiding the tab must still auto-enter PiP once");
			assertNoErrors(world);
		});

		t.test("W3 window blur while paused must NOT enter PiP", async () => {
			const world = await boot(false);
			const v1 = world.videos[0];
			await discover(world);

			world.setWindowFocused(false);
			await world.tick(600);
			assert.equal(rPiP(world, v1), 0, "a paused video must not enter PiP on blur");
			assertNoErrors(world);
		});

		t.test("W4 tab hide + window blur in one burst enters PiP exactly once", async () => {
			const world = await boot(true);
			const v1 = world.videos[0];
			await discover(world);

			world.setHidden(true);
			world.setWindowFocused(false);
			await world.tick(600);
			assert.equal(rPiP(world, v1), 1, "a coalesced hide+blur must request PiP exactly once");
			assertNoErrors(world);
		});

		t.test("W5 window focus exits a user-initiated PiP once", async () => {
			const world = await boot(true);
			const v1 = world.videos[0];
			await discover(world);

			world.userEnterPip(v1);
			world.setWindowFocused(false);
			await world.tick(600);
			assert.equal(world.calls.exit, 0, "a user-initiated PiP must not be exited by blur");

			world.setWindowFocused(true);
			await world.tick(300);
			assert.equal(world.calls.exit, 1, "regaining window focus must exit a user-initiated PiP once");
			assertNoErrors(world);
		});

		t.test("W6 window focus keeps an auto-initiated PiP (mirrors R3 semantics)", async () => {
			const world = await boot(true);
			const v1 = world.videos[0];
			await discover(world);

			world.setWindowFocused(false);
			await world.tick(600);
			assert.equal(rPiP(world, v1), 1, "blur must auto-enter PiP once");

			world.setWindowFocused(true);
			await world.tick(300);
			assert.equal(
				world.calls.exit,
				0,
				"an auto-initiated PiP must persist on window focus (code-as-written)"
			);
			assertNoErrors(world);
		});

		t.test("W7 focus returning before the delayed PiP fires must not enter PiP", async () => {
			const world = await boot(true);
			const v1 = world.videos[0];
			await discover(world);

			world.setWindowFocused(false);
			await world.tick(110);
			world.setWindowFocused(true);
			await world.tick(600);
			assert.equal(rPiP(world, v1), 0, "a blur shorter than the PiP delay must not enter PiP");
			assert.equal(world.calls.exit, 0, "nothing to exit when PiP never opened");
			assertNoErrors(world);
		});
	},
};
