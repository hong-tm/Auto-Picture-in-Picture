"use strict";

// The Bilibili router calls history.pushState in the page's main world. A
// sandboxed userscript cannot see those calls by patching its own history, and
// on Firefox a sandbox function assigned onto the page's history throws
// "Permission denied" when the page calls it. The Navigation API reports them
// to every world, so the watch listens there and leaves the page's history alone.

const assert = require("node:assert/strict");
const { createWorld } = require("./harness.js");

async function boot(options = {}) {
	const w = createWorld({
		host: "bilibili.com",
		videos: [{ selectors: ["video"], playing: true }],
		...options,
	});
	await w.tick(600);
	return w;
}

const swapInNext = (w) => {
	w.detach(w.videos[0]);
	w.attach(w.createVideo({ selectors: ["video"], playing: true }));
};

module.exports = { register(t) {
	t.test("the page's history functions are never replaced", async () => {
		const w = await boot();
		assert.equal(w.history.pushState, w.nativeHistory.pushState);
		assert.equal(w.history.replaceState, w.nativeHistory.replaceState);
	});

	for (const method of ["pushState", "replaceState"]) {
		t.test(`a main-world ${method} triggers the debounced rescan`, async () => {
			const w = await boot();
			swapInNext(w);
			const before = w.querySelectorCalls;
			w.history[method]("", "", "/video/next");
			await w.tick(600);
			assert.ok(w.querySelectorCalls > before);
			assert.deepEqual(w.errors, []);
		});
	}

	t.test("without the Navigation API popstate still rescans", async () => {
		const w = await boot({ noNavigationApi: true });
		swapInNext(w);
		const before = w.querySelectorCalls;
		w.window.dispatch("popstate", { type: "popstate" });
		await w.tick(600);
		assert.ok(w.querySelectorCalls > before);
		assert.deepEqual(w.errors, []);
	});

	t.test("without the Navigation API a removed PiP video is still replaced", async () => {
		const w = await boot({ noNavigationApi: true });
		w.setHidden(true);
		await w.tick(600);
		const next = w.createVideo({ selectors: ["video"], playing: true });
		w.swapVideo(next, { playing: true });
		await w.tick(600);
		assert.equal(w.document.pictureInPictureElement, next);
	});
} };
