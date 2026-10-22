"use strict";

const assert = require("node:assert/strict");
const { createWorld } = require("./harness.js");

async function ready() {
	const w = createWorld({
		host: "youtube.com",
		videos: [{ selectors: [".html5-main-video"], playing: true }],
	});
	w.flushMutations();
	await w.tick(600);
	return w;
}

module.exports = { register(t) {
	t.test("visible return exits PiP even when window focus has not returned", async () => {
		const w = await ready();
		w.setWindowFocused(false);
		w.setHidden(true);
		await w.tick(600);
		assert.equal(w.document.pictureInPictureElement, w.videos[0]);
		w.setHidden(false);
		await w.tick(0);
		assert.equal(w.document.pictureInPictureElement, null);
		assert.equal(w.calls.exit, 1);
	});

	t.test("browser entry begun before hidden is closed if it settles after return", async () => {
		const w = await ready();
		const video = w.videos[0];
		const original = video.requestPictureInPicture;
		let settle;
		video.requestPictureInPicture = () => new Promise(resolve => {
			settle = () => resolve(original.call(video));
		});
		const handler = w.calls.setActionHandler.find(c => c.action === "enterpictureinpicture").handler;
		const pending = handler();
		w.setHidden(true);
		w.setHidden(false);
		settle();
		await pending;
		assert.equal(w.document.pictureInPictureElement, null);
		assert.equal(w.calls.exit, 1);
	});

	t.test("Shorts picks the active video instead of a connected cached Short", async () => {
		const w = await ready();
		w.location.pathname = "/shorts/second";
		const previous = w.videos[0];
		previous.paused = true;
		const active = w.createVideo({
			selectors: [".html5-main-video", "ytd-reel-video-renderer[is-active] video"],
			playing: true,
		});
		w.attach(active);
		const handler = w.calls.setActionHandler.find(c => c.action === "enterpictureinpicture").handler;
		await handler();
		assert.equal(w.document.pictureInPictureElement, active);
		assert.equal(w.calls.rPiP[previous] || 0, 0);
		w.setHidden(true);
		w.setHidden(false);
		await w.tick(0);
		assert.equal(w.document.pictureInPictureElement, null);
	});

	t.test("Shorts without an active renderer marker uses the Shorts player", async () => {
		const w = await ready();
		w.location.pathname = "/shorts/current";
		const active = w.createVideo({
			selectors: [".html5-main-video", "#shorts-player video"],
			playing: true,
		});
		w.attach(active);
		const handler = w.calls.setActionHandler.find(c => c.action === "enterpictureinpicture").handler;
		await handler();
		assert.equal(w.document.pictureInPictureElement, active);
	});
} };
