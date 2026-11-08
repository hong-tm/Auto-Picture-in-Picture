"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
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
	t.test("window focus returning does not close PiP the user opened on a visible page", async () => {
		const w = await ready();
		w.userEnterPip(w.videos[0]);
		w.setWindowFocused(false);
		await w.tick(600);
		w.setWindowFocused(true);
		await w.tick(300);
		assert.equal(w.calls.exit, 0);
		assert.equal(w.document.pictureInPictureElement, w.videos[0]);
	});

	t.test("window blur on a visible page schedules no work", async () => {
		const w = await ready();
		let scheduled = 0;
		const schedule = w.sandbox.setTimeout;
		w.sandbox.setTimeout = (...args) => {
			scheduled++;
			return schedule(...args);
		};
		w.setWindowFocused(false);
		w.setWindowFocused(true);
		await w.tick(600);
		assert.equal(scheduled, 0);
	});

	t.test("a minimize (blur, then hidden) keeps the synchronous gesture path", async () => {
		const w = await ready();
		w.navigator.userActivation = { isActive: true };
		w.setWindowFocused(false);
		w.setHidden(true);
		await w.tick(0);
		assert.equal(w.document.pictureInPictureElement, w.videos[0]);
	});

	t.test("a rejected entry attempts once per hidden cycle and tries again on the next", async () => {
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
		w.setHidden(false);
		await w.tick(0);
		w.setHidden(true);
		await w.tick(3000);
		assert.equal(attempts, 2);
		assert.deepEqual(w.errors, []);
	});

	t.test("a browser without the PiP API stays silent and does not retry", async () => {
		const w = await ready();
		w.document.pictureInPictureEnabled = undefined;
		let scheduled = 0;
		const schedule = w.sandbox.setTimeout;
		w.setHidden(true);
		await w.tick(300);
		w.sandbox.setTimeout = (...args) => {
			scheduled++;
			return schedule(...args);
		};
		await w.tick(3000);
		assert.equal(scheduled, 0);
		assert.deepEqual(w.errors, []);
	});

	t.test("closing PiP while hidden stays closed for the next video until the page returns", async () => {
		const w = await ready();
		const video = w.videos[0];
		w.setHidden(true);
		await w.tick(600);
		w.userLeavePip();
		w.window.dispatch("yt-navigate-finish", { type: "yt-navigate-finish" });
		await w.tick(1200);
		assert.equal(w.document.pictureInPictureElement, null);

		w.setHidden(false);
		await w.tick(0);
		w.setHidden(true);
		await w.tick(600);
		assert.equal(w.document.pictureInPictureElement, video);
	});

	t.test("a browser action overrides a dismissal made while hidden", async () => {
		const w = await ready();
		w.setHidden(true);
		await w.tick(600);
		w.userLeavePip();
		const action = w.calls.setActionHandler.find((c) => c.action === "enterpictureinpicture").handler;
		await action();
		assert.equal(w.document.pictureInPictureElement, w.videos[0]);
	});

	t.test("a site removing the PiP video is not treated as a user dismissal", async () => {
		const w = await ready({ host: "bilibili.com", videos: [{ selectors: ["video"], playing: true }] });
		w.setHidden(true);
		await w.tick(600);
		const next = w.createVideo({ selectors: ["video"], playing: true });
		w.swapVideo(next, { playing: true });
		await w.tick(600);
		assert.equal(w.document.pictureInPictureElement, next);
	});

	t.test("a replacement video that starts after discovery still enters PiP while hidden", async () => {
		const w = await ready({ host: "bilibili.com", videos: [{ selectors: ["video"], playing: true }] });
		w.setHidden(true);
		await w.tick(600);
		const next = w.createVideo({ selectors: ["video"], paused: true, readyState: 0 });
		w.swapVideo(next);
		await w.tick(600);
		assert.equal(w.document.pictureInPictureElement, null, "precondition: not playing at discovery");
		Object.assign(next, { paused: false, readyState: 4 });
		next.dispatch("playing", { type: "playing" });
		await w.tick(0);
		assert.equal(w.document.pictureInPictureElement, next);
	});

	t.test("hiding during a buffering stall enters PiP once playback resumes", async () => {
		const w = await ready();
		const video = w.videos[0];
		video.readyState = 2;
		w.setHidden(true);
		await w.tick(600);
		assert.equal(w.document.pictureInPictureElement, null);
		video.readyState = 4;
		video.dispatch("playing", { type: "playing" });
		await w.tick(0);
		assert.equal(w.document.pictureInPictureElement, video);
	});

	t.test("playing on a visible page or after a dismissal does not enter PiP", async () => {
		const w = await ready();
		const video = w.videos[0];
		video.dispatch("playing", { type: "playing" });
		await w.tick(0);
		assert.equal(w.document.pictureInPictureElement, null);

		w.setHidden(true);
		await w.tick(600);
		w.userLeavePip();
		video.dispatch("playing", { type: "playing" });
		await w.tick(0);
		assert.equal(w.document.pictureInPictureElement, null);
	});

	t.test("cleanup removes the playing listener", async () => {
		const w = await ready();
		assert.equal(w.listeners(w.videos[0], "playing"), 1);
		w.window.dispatch("pagehide", { persisted: false });
		assert.equal(w.listeners(w.videos[0], "playing"), 0);
	});

	t.test("PiP left on a removed video moves to the replacement", async () => {
		const w = await ready({
			host: "bilibili.com",
			videos: [{ selectors: ["video"], playing: true }],
			keepPipOnDetach: true,
		});
		const old = w.videos[0];
		w.setHidden(true);
		await w.tick(600);
		const next = w.createVideo({ selectors: ["video"], playing: true });
		w.detach(old);
		w.attach(next);
		assert.equal(w.document.pictureInPictureElement, old, "precondition: removed element stays in PiP");
		w.history.pushState("", "", "/video/next");
		await w.tick(600);
		assert.equal(w.document.pictureInPictureElement, next);
		assert.equal(w.listeners(next, "leavepictureinpicture"), 1);
		assert.equal(w.listeners(old, "leavepictureinpicture"), 0);
		w.setHidden(false);
		await w.tick(0);
		assert.equal(w.document.pictureInPictureElement, null);
	});

	t.test("script survives document-start without documentElement", () => {
		const source = fs.readFileSync(path.join(__dirname, "..", "pip.js"), "utf8");
		const sandbox = {
			document: { documentElement: null, hidden: false, readyState: "loading", addEventListener() {} },
			navigator: { userAgent: "Chrome/120" },
			location: { hostname: "www.youtube.com", pathname: "/" },
			setTimeout() {},
			clearTimeout() {},
			console,
			addEventListener() {},
			MutationObserver: class {
				observe(target) {
					if (!target) throw new TypeError("observe target is not a Node");
				}
				disconnect() {}
			},
		};
		sandbox.window = sandbox;
		vm.runInNewContext(source, sandbox);
	});
} };
