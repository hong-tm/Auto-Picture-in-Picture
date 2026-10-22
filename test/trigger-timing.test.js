"use strict";
const assert = require("node:assert/strict");
const { createWorld } = require("./harness.js");
async function ready() {
	const w = createWorld({host: "youtube.com", videos: [{selectors: [".html5-main-video"], playing: true}]});
	await w.tick(600);
	w.flushMutations();
	await w.tick(400);
	return w;
}
const action = w => w.calls.setActionHandler.find(c => c.action === "enterpictureinpicture").handler;
module.exports = { register(t) {
	t.test("active gesture requests cached video before the visibility handler returns", async () => {
		const w = await ready();
		w.navigator.userActivation = {isActive: true};
		w.setHidden(true);
		assert.equal(w.calls.rPiP[w.videos[0]], 1);
		w.navigator.userActivation.isActive = false;
		await w.tick(0);
		assert.equal(w.document.pictureInPictureElement, w.videos[0]);
	});
	t.test("return exits existing PiP without a debounce timer", async () => {
		const w = await ready();
		w.setHidden(true);
		await w.tick(600);
		w.setHidden(false);
		assert.equal(w.calls.exit, 1);
		await w.tick(0);
		assert.equal(w.document.pictureInPictureElement, null);
	});
	t.test("media action starts cached request synchronously and coalesces pending entries", async () => {
		const w = await ready();
		const video = w.videos[0];
		const original = video.requestPictureInPicture;
		let calls = 0, settle;
		video.requestPictureInPicture = () => {
			calls++;
			return new Promise(resolve => { settle = () => resolve(original.call(video)); });
		};
		const handler = action(w);
		const first = handler();
		assert.equal(calls, 1);
		const second = handler();
		w.setHidden(true);
		await w.tick(600);
		assert.equal(calls, 1);
		settle();
		await Promise.all([first, second]);
		w.setHidden(false);
		await w.tick(0);
		assert.equal(w.calls.exit, 0);
		w.userLeavePip();
		video.requestPictureInPicture = original;
		await handler();
		assert.equal(w.calls.rPiP[video], 2);
		assert.equal(w.errors.length, 0);
	});
	t.test("return during video discovery cancels a stale hidden request", async () => {
		const w = createWorld({host: "youtube.com"});
		await w.tick(600);
		w.setHidden(true);
		await w.tick(350);
		w.setHidden(false);
		const video = w.createVideo({selectors: [".html5-main-video"], playing: true});
		w.attach(video);
		await w.tick(2000);
		assert.equal(w.calls.rPiP[video] || 0, 0);
	});
	t.test("paused video is rechecked before the delayed hidden request", async () => {
		const w = await ready();
		w.setHidden(true);
		await w.tick(150);
		w.videos[0].paused = true;
		await w.tick(450);
		assert.equal(w.calls.rPiP[w.videos[0]] || 0, 0);
	});
} };
