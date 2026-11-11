"use strict";

const assert = require("node:assert/strict");
const { createWorld } = require("./harness.js");

async function ready() {
	const w = createWorld({ host: "youtube.com", videos: [
		{ selectors: [".html5-main-video"], playing: true },
	] });
	w.flushMutations();
	await w.tick(600);
	return w;
}

const action = w => w.calls.setActionHandler.find(c => c.action === "enterpictureinpicture").handler;

module.exports = { register(t) {
	t.test("browser-owned PiP returns without a competing script exit for six cycles", async () => {
		const w = await ready();
		for (let cycle = 0; cycle < 6; cycle++) {
			w.setHidden(true);
			await action(w)();
			assert.equal(w.document.pictureInPictureElement, w.videos[0]);
			w.setHidden(false);
			w.window.dispatch("focus");
			await w.tick(0);
			assert.equal(w.calls.exit, 0, "browser return must not also call the page exit API");
			// Native closure arrives after visibility/focus, as in the reporter's trace.
			w.userLeavePip();
			assert.equal(w.document.pictureInPictureElement, null);
		}
		assert.equal(w.calls.rPiP[w.videos[0]], 6);
		assert.deepEqual(w.errors, []);
	});

	t.test("browser-owned PiP the browser leaves open is closed after a grace period", async () => {
		const w = await ready();
		for (let cycle = 0; cycle < 3; cycle++) {
			w.setHidden(true);
			await action(w)();
			w.setHidden(false);
			await w.tick(999);
			assert.equal(w.calls.exit, cycle, "the browser gets the first chance to close");
			await w.tick(1);
			assert.equal(w.calls.exit, cycle + 1);
			assert.equal(w.document.pictureInPictureElement, null);
		}
		assert.deepEqual(w.errors, []);
	});

	t.test("a spontaneous hidden entry left open on return is closed too", async () => {
		const w = await ready();
		w.setHidden(true);
		w.userEnterPip(w.videos[0]);
		w.setHidden(false);
		await w.tick(1000);
		assert.equal(w.calls.exit, 1);
		assert.equal(w.document.pictureInPictureElement, null);
	});

	t.test("a PiP opened after the browser closed its own is not closed by the grace timer", async () => {
		const w = await ready();
		w.setHidden(true);
		await action(w)();
		w.setHidden(false);
		await w.tick(200);
		w.userLeavePip();
		w.userEnterPip(w.videos[0]);
		await w.tick(1000);
		assert.equal(w.calls.exit, 0);
		assert.equal(w.document.pictureInPictureElement, w.videos[0]);
	});

	t.test("hiding again within the grace period keeps browser-owned PiP", async () => {
		const w = await ready();
		w.setHidden(true);
		await action(w)();
		w.setHidden(false);
		await w.tick(500);
		w.setHidden(true);
		await w.tick(1000);
		assert.equal(w.calls.exit, 0);
		assert.equal(w.document.pictureInPictureElement, w.videos[0]);
	});

	t.test("browser ownership applies before the entry promise settles", async () => {
		const w = await ready();
		const video = w.videos[0];
		let settle;
		video.requestPictureInPicture = () => {
			w.userEnterPip(video);
			return new Promise(resolve => { settle = resolve; });
		};
		const pending = action(w)();
		w.setHidden(true);
		w.setHidden(false);
		assert.equal(w.calls.exit, 0);
		w.userLeavePip();
		settle();
		await pending;
		assert.equal(w.calls.exit, 0);
		assert.equal(w.document.pictureInPictureElement, null);
	});

	t.test("a rejected browser entry does not claim a later script entry", async () => {
		const w = await ready();
		const video = w.videos[0];
		const original = video.requestPictureInPicture;
		video.requestPictureInPicture = () => Promise.reject(new Error("denied"));
		await action(w)();
		video.requestPictureInPicture = original;
		w.setHidden(true);
		await w.tick(600);
		assert.equal(w.document.pictureInPictureElement, video);
		w.setHidden(false);
		await w.tick(0);
		assert.equal(w.calls.exit, 1);
		assert.equal(w.document.pictureInPictureElement, null);
	});

	t.test("a browser action on a hidden page gives the browser the return close", async () => {
		const w = await ready();
		w.setHidden(true);
		await w.tick(600);
		assert.equal(w.document.pictureInPictureElement, w.videos[0]);
		await action(w)({enterPictureInPictureReason: "contentoccluded"});
		w.setHidden(false);
		await w.tick(0);
		// The browser's auto PiP engaged for this cycle, so it closes the window
		// on return; a racing script exit can hang PiP (real-machine 2026-11-11).
		assert.equal(w.calls.exit, 0, "browser-first wait, no racing exit");
		await w.tick(1000);
		assert.equal(w.calls.exit, 1, "the browser left it open; the script closes after the wait");
		assert.equal(w.document.pictureInPictureElement, null);
	});

	t.test("a useraction on a hidden page takes the same browser-first close", async () => {
		const w = await ready();
		w.setHidden(true);
		await w.tick(600);
		assert.equal(w.document.pictureInPictureElement, w.videos[0]);
		await action(w)({enterPictureInPictureReason: "useraction"});
		w.setHidden(false);
		await w.tick(0);
		assert.equal(w.calls.exit, 0, "not gated on reason: browser-first wait either way");
		await w.tick(1000);
		assert.equal(w.calls.exit, 1, "the browser did not close it; the script does");
		assert.equal(w.document.pictureInPictureElement, null);
	});

	t.test("a browser action on a visible page does not take over an open window", async () => {
		const w = await ready();
		w.userEnterPip(w.videos[0]);
		await action(w)({enterPictureInPictureReason: "contentoccluded"});
		w.setHidden(true);
		await w.tick(0);
		w.setHidden(false);
		await w.tick(0);
		assert.equal(w.calls.exit, 1, "still script-owned: closes at once on return");
	});
} };
