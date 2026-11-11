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
	t.test("a browser action behind a rejected script request is not lost", async () => {
		const w = await ready();
		const video = w.videos[0];
		const original = video.requestPictureInPicture;
		let reject;
		video.requestPictureInPicture = () => new Promise((_, no) => {
			reject = () => no(Object.assign(new Error("gesture"), {name: "NotAllowedError"}));
		});
		w.setHidden(true);
		await w.tick(600);
		assert.equal(typeof reject, "function", "precondition: script request in flight");
		video.requestPictureInPicture = original;
		const native = action(w)({enterPictureInPictureReason: "contentoccluded"});
		reject();
		await native;
		await w.tick(0);
		assert.equal(w.document.pictureInPictureElement, video);
		// Browser-owned: the browser closes it on return, the script does not race.
		w.setHidden(false);
		await w.tick(0);
		assert.equal(w.calls.exit, 0);
		assert.equal(w.errors.length, 0);
	});
	t.test("a queued browser action is dropped once the page is visible again", async () => {
		const w = await ready();
		const video = w.videos[0];
		const original = video.requestPictureInPicture;
		let reject;
		video.requestPictureInPicture = () => new Promise((_, no) => {
			reject = () => no(Object.assign(new Error("gesture"), {name: "NotAllowedError"}));
		});
		w.setHidden(true);
		await w.tick(600);
		video.requestPictureInPicture = original;
		action(w)({enterPictureInPictureReason: "contentoccluded"});
		w.setHidden(false);
		reject();
		await w.tick(50);
		assert.equal(w.document.pictureInPictureElement, null);
	});
	t.test("a queued browser action survives a guard exit of the in-flight request", async () => {
		const w = createWorld({host: "youtube.com"});
		w.setHidden(true);
		await w.tick(300);
		const handler = action(w);
		handler({enterPictureInPictureReason: "contentoccluded"});
		const stalled = w.createVideo({selectors: [".html5-main-video"], paused: true, readyState: 2, currentTime: 0});
		w.attach(stalled);
		await w.tick(600);
		assert.equal(w.document.pictureInPictureElement, stalled, "the queued browser action ran after the guard exit");
		assert.equal(w.errors.length, 0);
	});
	t.test("a queued user action behind a failing browser request still runs", async () => {
		const w = await ready();
		const video = w.videos[0];
		const original = video.requestPictureInPicture;
		const rejections = [];
		video.requestPictureInPicture = () => new Promise((_, no) => {
			rejections.push(() => no(Object.assign(new Error("gesture"), {name: "NotAllowedError"})));
		});
		w.setHidden(true);
		await w.tick(600);
		assert.equal(rejections.length, 1, "precondition: script request in flight");
		const handler = action(w);
		handler({enterPictureInPictureReason: "contentoccluded"});
		rejections[0]();
		await w.tick(1);
		assert.equal(rejections.length, 2, "the browser request re-ran after the script request failed");
		handler({enterPictureInPictureReason: "useraction"});
		video.requestPictureInPicture = original;
		rejections[1]();
		await w.tick(1);
		assert.equal(w.document.pictureInPictureElement, video);
		assert.equal(w.calls.rPiP[video], 1);
		assert.equal(w.errors.length, 0);
	});
	t.test("a window opened before a queued browser action is left to the browser on return", async () => {
		const w = await ready();
		const video = w.videos[0];
		const original = video.requestPictureInPicture;
		let settle;
		video.requestPictureInPicture = () => new Promise(resolve => { settle = () => resolve(original.call(video)); });
		w.setHidden(true);
		await w.tick(600);
		assert.equal(typeof settle, "function", "precondition: script request in flight");
		const handler = action(w);
		handler({enterPictureInPictureReason: "contentoccluded"});
		settle();
		await w.tick(1);
		assert.equal(w.document.pictureInPictureElement, video);
		w.setHidden(false);
		await w.tick(0);
		assert.equal(w.calls.exit, 0, "a browser-involved window must get the browser-first wait, not a racing exit");
		w.userLeavePip();
		await w.tick(1500);
		assert.equal(w.calls.exit, 0, "the browser closed its own window; the script must not exit again");
		assert.equal(w.errors.length, 0);
	});
	t.test("a return before the in-flight request settles still defers to the browser", async () => {
		const w = await ready();
		const video = w.videos[0];
		const original = video.requestPictureInPicture;
		let settle;
		video.requestPictureInPicture = () => new Promise(resolve => { settle = () => resolve(original.call(video)); });
		w.setHidden(true);
		await w.tick(600);
		assert.equal(typeof settle, "function", "precondition: script request in flight");
		action(w)({enterPictureInPictureReason: "contentoccluded"});
		w.setHidden(false);
		settle();
		await w.tick(1);
		assert.equal(w.document.pictureInPictureElement, video);
		assert.equal(w.calls.exit, 0, "browser-involved: 1s grace, no racing exit");
		await w.tick(1000);
		assert.equal(w.calls.exit, 1, "the browser left it open; the script closes after the wait");
		assert.equal(w.errors.length, 0);
	});
} };
