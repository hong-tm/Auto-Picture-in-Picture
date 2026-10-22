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

	t.test("a browser callback does not take ownership of existing script PiP", async () => {
		const w = await ready();
		w.setHidden(true);
		await w.tick(600);
		assert.equal(w.document.pictureInPictureElement, w.videos[0]);
		await action(w)();
		w.setHidden(false);
		await w.tick(0);
		assert.equal(w.calls.exit, 1);
		assert.equal(w.document.pictureInPictureElement, null);
	});
} };
