"use strict";

// v1.6.0 GM menu + persisted settings. The master switch stops automatic
// entries, including native auto PiP through the Media Session action, which
// is unregistered while off; "Close PiP on return"
// decides whether a script-owned PiP window is closed when the page becomes
// visible again.

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

const command = (w, fragment) => w.menu.find((c) => c.label.includes(fragment));

module.exports = { register(t) {
	t.test("the menu registers both toggles with ON defaults", async () => {
		const w = await ready();
		assert.deepEqual(w.menu.map((c) => c.label), [
			"Auto PiP: ON",
			"Close PiP on return: ON",
		]);
	});

	t.test("the master toggle off stops automatic entries and refreshes the label", async () => {
		const w = await ready();
		command(w, "Auto PiP").fn();
		assert.deepEqual(w.menu.map((c) => c.label), [
			"Auto PiP: OFF",
			"Close PiP on return: ON",
		]);
		w.setHidden(true);
		await w.tick(600);
		assert.equal(w.calls.rPiP[w.videos[0]] || 0, 0);
		w.setHidden(false);
		await w.tick(0);
		assert.equal(w.calls.exit, 0);
	});

	t.test("the master toggle unregisters the media action and restores it", async () => {
		const w = await ready();
		const last = () => w.calls.setActionHandler
			.filter((c) => c.action === "enterpictureinpicture")
			.pop().handler;
		command(w, "Auto PiP").fn();
		assert.equal(last(), null, "native auto PiP must not reach the script while off");
		command(w, "Auto PiP").fn();
		await last()();
		assert.equal(w.document.pictureInPictureElement, w.videos[0]);
		w.userLeavePip();
		assert.equal(w.document.pictureInPictureElement, null);
	});

	t.test("starting with the master switch off registers no media action", async () => {
		const w = await ready({ settings: { enabled: false } });
		assert.deepEqual(
			w.calls.setActionHandler.map((c) => [c.action, c.handler]),
			[["enterpictureinpicture", null]]
		);
	});

	t.test("the close-on-return toggle off keeps script PiP open on return", async () => {
		const w = await ready();
		w.setHidden(true);
		await w.tick(600);
		assert.equal(w.document.pictureInPictureElement, w.videos[0]);
		command(w, "Close PiP on return").fn();
		assert.deepEqual(w.menu.map((c) => c.label).slice(-1), ["Close PiP on return: OFF"]);
		w.setHidden(false);
		await w.tick(0);
		assert.equal(w.calls.exit, 0);
		assert.equal(w.document.pictureInPictureElement, w.videos[0]);
		w.userLeavePip();
		assert.equal(w.document.pictureInPictureElement, null);
	});

	t.test("toggles persist to the GM store", async () => {
		const w = await ready();
		command(w, "Auto PiP").fn();
		assert.deepEqual(JSON.parse(w.gmStore.get("settings")), {
			enabled: false,
			closeOnReturn: true,
		});
	});

	t.test("a setting changed in another tab applies without a reload", async () => {
		const w = await ready();
		w.gmStore.set("settings", JSON.stringify({ enabled: false, closeOnReturn: true }));
		w.setHidden(true);
		await w.tick(600);
		assert.equal(w.calls.rPiP[w.videos[0]] || 0, 0);
		command(w, "Close PiP on return").fn();
		assert.deepEqual(JSON.parse(w.gmStore.get("settings")), {
			enabled: false,
			closeOnReturn: false,
		}, "a toggle must not overwrite the other tab's value");
	});

	t.test("a tab started with the switch off restores the media action on return", async () => {
		const w = await ready({ settings: { enabled: false } });
		const last = () => w.calls.setActionHandler
			.filter((c) => c.action === "enterpictureinpicture")
			.pop().handler;
		assert.equal(last(), null);
		w.setHidden(true);
		w.gmStore.set("settings", JSON.stringify({ enabled: true, closeOnReturn: true }));
		w.setHidden(false);
		assert.equal(typeof last(), "function", "another tab turned it on");
	});

	t.test("without GM storage, settings load from localStorage", async () => {
		const w = await ready({ noGM: true, settings: { enabled: false } });
		assert.deepEqual(w.menu, [], "no GM menu API means no commands");
		w.setHidden(true);
		await w.tick(600);
		assert.equal(w.calls.rPiP[w.videos[0]] || 0, 0);
		w.setHidden(false);
		await w.tick(0);
	});
} };
