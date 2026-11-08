"use strict";

// v1.6.0 cooperation with Chrome's native auto PiP and the new sites.
//   - A PiP window the script did not request while the page is hidden is
//     browser-owned (native auto PiP, media controls, or the site's own
//     handler); the browser closes it on return, so the script must not race.
//   - A user PiP opened on a visible page keeps the script's close-on-return
//     default (state-matrix R7/R8 semantics).
//   - NotAllowedError on a gestureless hidden request is expected on stock
//     Chrome and stays silent.
//   - live.bilibili.com and music.youtube.com are matched sites.

const assert = require("node:assert/strict");
const { createWorld } = require("./harness.js");

async function ready(options = {}) {
	const w = createWorld({
		host: "youtube.com",
		videos: [{ selectors: [".html5-main-video"], playing: true }],
		...options,
	});
	w.flushMutations();
	await w.tick(600);
	return w;
}

module.exports = { register(t) {
	t.test("a spontaneous enter while hidden is browser-owned and the browser closes it first", async () => {
		const w = await ready({ settings: { enabled: false } });
		const video = w.videos[0];
		w.setHidden(true);
		await w.tick(600);
		assert.equal(w.document.pictureInPictureElement, null, "master off: the script stays passive");
		w.userEnterPip(video);
		w.setHidden(false);
		await w.tick(300);
		assert.equal(w.calls.exit, 0, "the script must not race the browser's own closure");
		assert.equal(w.document.pictureInPictureElement, video);
		w.userLeavePip();
		assert.equal(w.document.pictureInPictureElement, null);
	});

	t.test("a user PiP opened on a visible page still closes on return (default)", async () => {
		const w = await ready();
		const video = w.videos[0];
		w.userEnterPip(video);
		w.setHidden(true);
		await w.tick(600);
		w.setHidden(false);
		await w.tick(300);
		assert.equal(w.calls.exit, 1);
		assert.equal(w.document.pictureInPictureElement, null);
	});

	t.test("a NotAllowedError rejection is silent and retried on the next hidden cycle", async () => {
		const w = await ready();
		let attempts = 0;
		w.videos[0].requestPictureInPicture = () => {
			attempts++;
			return Promise.reject(
				Object.assign(new Error("must be handling a user gesture"), {
					name: "NotAllowedError",
				})
			);
		};
		w.setHidden(true);
		await w.tick(3000);
		assert.equal(attempts, 1);
		assert.deepEqual(w.errors, []);
		w.setHidden(false);
		await w.tick(0);
		w.setHidden(true);
		await w.tick(3000);
		assert.equal(attempts, 2);
		assert.deepEqual(w.errors, []);
	});

	t.test("live.bilibili.com pages pick the live player over a generic match", async () => {
		const w = createWorld({
			host: "live.bilibili.com",
			videos: [{ selectors: [".bilibili-player-video video"], playing: true }],
		});
		const live = w.createVideo({ selectors: ["#live-player video"], playing: true });
		w.attach(live);
		w.flushMutations();
		await w.tick(600);
		w.setHidden(true);
		await w.tick(600);
		assert.equal(w.document.pictureInPictureElement, live);
		assert.equal(w.calls.rPiP[w.videos[0]] || 0, 0, "the generic bilibili match must not win");
	});

	t.test("music.youtube.com pages use the watch player selector", async () => {
		const w = createWorld({
			host: "music.youtube.com",
			videos: [{ selectors: ["#movie_player video"], playing: true }],
		});
		w.flushMutations();
		await w.tick(600);
		w.setHidden(true);
		await w.tick(600);
		assert.equal(w.document.pictureInPictureElement, w.videos[0]);
	});

	t.test("the observer ignores non-video mutations while hunting for a first video", async () => {
		const w = createWorld({ host: "youtube.com" });
		await w.tick(600);
		for (let i = 0; i < 5; i++) {
			w.flushMutations([{ addedNodes: [{ nodeType: 1, tagName: "DIV" }] }]);
			await w.tick(250);
		}
		assert.equal(w.querySelectorCalls, 0, "chat-like mutations must not schedule discovery");
		const video = w.createVideo({ selectors: [".html5-main-video"], playing: true });
		w.attach(video);
		w.flushMutations();
		await w.tick(400);
		w.setHidden(true);
		await w.tick(600);
		assert.equal(w.document.pictureInPictureElement, video, "a real video insertion is still discovered");
	});
} };
