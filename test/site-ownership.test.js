"use strict";

const assert = require("node:assert/strict");
const { createWorld } = require("./harness.js");

async function ready(videos) {
	const w = createWorld({ host: "youtube.com", videos });
	w.flushMutations();
	await w.tick(600);
	return w;
}

const play = (v) => Object.assign(v, { paused: false, ended: false, readyState: 4, currentTime: 5 });
const nav = async (w) => {
	w.window.dispatch("yt-navigate-finish", { type: "yt-navigate-finish" });
	await w.tick(1200);
};

module.exports = { register(t) {
	t.test("script PiP keeps the site's Media Session metadata", async () => {
		const w = await ready([{ selectors: [".html5-main-video"], playing: true }]);
		const meta = new w.sandbox.MediaMetadata({ title: "Video", artist: "Channel" });
		w.navigator.mediaSession.metadata = meta;
		w.setHidden(true);
		await w.tick(600);
		assert.equal(w.document.pictureInPictureElement, w.videos[0]);
		assert.equal(w.navigator.mediaSession.metadata, meta);
	});

	t.test("only the enterpictureinpicture media action is registered", async () => {
		const w = await ready([{ selectors: [".html5-main-video"], playing: true }]);
		assert.deepEqual(w.calls.setActionHandler.map((c) => c.action), ["enterpictureinpicture"]);
	});

	t.test("after Shorts to watch navigation the watch player is used", async () => {
		// Real YouTube keeps the paused Shorts video connected and first in DOM order.
		const w = await ready([
			{ selectors: [".html5-main-video", "#shorts-player video"], playing: true },
			{ selectors: [".html5-main-video", "#movie_player video"], playing: false },
		]);
		const [short, watch] = w.videos;
		w.location.pathname = "/shorts/a";
		const action = w.calls.setActionHandler.find((c) => c.action === "enterpictureinpicture").handler;
		await action();
		assert.equal(w.document.pictureInPictureElement, short);
		w.userLeavePip();

		w.location.pathname = "/watch";
		short.paused = true;
		play(watch);
		await nav(w);
		w.setHidden(true);
		await w.tick(600);
		assert.equal(w.document.pictureInPictureElement, watch);
	});

	t.test("leave listener follows a video found while PiP was open", async () => {
		const w = await ready([{ selectors: [".html5-main-video"], playing: true }]);
		const first = w.videos[0];
		w.setHidden(true);
		await w.tick(600);
		assert.equal(w.document.pictureInPictureElement, first);

		const next = play(w.createVideo({ selectors: ["#movie_player video"] }));
		w.attach(next);
		await nav(w);
		w.userLeavePip();
		for (let cycle = 0; cycle < 2; cycle++) {
			w.setHidden(false);
			await w.tick(0);
			w.setHidden(true);
			await w.tick(600);
			assert.equal(w.document.pictureInPictureElement, next, `cycle ${cycle}`);
			w.userLeavePip();
		}
	});
} };
