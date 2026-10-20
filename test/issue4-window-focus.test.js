"use strict";

// Visibility policy: visible pages do not trigger PiP on window blur.
// Hidden pages retain the tab/minimize behavior.

const assert = require("node:assert/strict");
const { createWorld } = require("./harness.js");

const YOUTUBE = { host: "youtube.com", selectors: [".html5-main-video"] };

async function boot(playing) {
	const world = createWorld({
		host: YOUTUBE.host,
		videos: [{ selectors: YOUTUBE.selectors, playing }],
	});
	await world.tick(600);
	return world;
}

// Model the video appearing after document-start so discovery locks the element
// without entering PiP while the page is active.
async function discover(world) {
	world.flushMutations();
	await world.tick(400);
}

function rPiP(world, video) {
	return world.calls.rPiP[video] || 0;
}

function assertNoErrors(world) {
	assert.equal(world.errors.length, 0, `unexpected errors: ${world.errors.join(" | ")}`);
}

module.exports = {
	register(t) {
		t.test("W1 visible page blur does not enter PiP", async () => {
			const world = await boot(true);
			const v1 = world.videos[0];
			await discover(world);

			world.setWindowFocused(false);
			await world.tick(600);
			assert.equal(rPiP(world, v1), 0, "visible page blur must not trigger PiP");
			assert.equal(
				world.document.pictureInPictureElement,
				null,
				"visible video remains inline"
			);
			assertNoErrors(world);
		});

		t.test("W2 tab hide still enters PiP (no regression)", async () => {
			const world = await boot(true);
			const v1 = world.videos[0];
			await discover(world);

			world.setHidden(true);
			await world.tick(600);
			assert.equal(rPiP(world, v1), 1, "hiding the tab must still auto-enter PiP once");
			assertNoErrors(world);
		});

		t.test("W3 window blur while paused must NOT enter PiP", async () => {
			const world = await boot(false);
			const v1 = world.videos[0];
			await discover(world);

			world.setWindowFocused(false);
			await world.tick(600);
			assert.equal(rPiP(world, v1), 0, "a paused video must not enter PiP on blur");
			assertNoErrors(world);
		});

		t.test("W4 tab hide + window blur in one burst enters PiP exactly once", async () => {
			const world = await boot(true);
			const v1 = world.videos[0];
			await discover(world);

			world.setHidden(true);
			world.setWindowFocused(false);
			await world.tick(600);
			assert.equal(rPiP(world, v1), 1, "a coalesced hide+blur must request PiP exactly once");
			assertNoErrors(world);
		});

		t.test("W5 focus changes do not close user PiP", async () => {
			const world = await boot(true);
			const v1 = world.videos[0];
			await discover(world);

			world.userEnterPip(v1);
			world.setWindowFocused(false);
			await world.tick(600);
			assert.equal(world.calls.exit, 0, "a user-initiated PiP must not be exited by blur");

			world.setHidden(false);
			await world.tick(300);
			assert.equal(world.calls.exit, 0, "focus changes must not close user PiP");
			assertNoErrors(world);
		});

		t.test("W6 hidden auto PiP exits on return", async () => {
			const world = await boot(true);
			const v1 = world.videos[0];
			await discover(world);

			world.setHidden(true);
			await world.tick(600);
			assert.equal(rPiP(world, v1), 1, "hidden playing tab must enter PiP once");

			world.setHidden(false);
			await world.tick(300);
			assert.equal(world.calls.exit, 1, "returning to the page must exit auto-initiated PiP");
			assertNoErrors(world);
		});

		t.test("W6b returning without a click restores inline playback", async () => {
			const world = await boot(true);
			const v1 = world.videos[0];
			await discover(world);

			world.setHidden(true);
			await world.tick(600);
			world.setHidden(false);
			await world.tick(300);
			assert.equal(world.document.pictureInPictureElement, null, "PiP must be closed on return without a click");
			assert.equal(v1.paused, false, "the video must remain playable on return without a click");
			assert.equal(world.calls.play.length, 0, "no click should be required to restore the already-playing video");
			assertNoErrors(world);
		});

		t.test("W6c restore before PiP request settles closes late PiP", async () => {
			const world = await boot(true);
			const v1 = world.videos[0];
			await discover(world);
			let settle;
			v1.requestPictureInPicture = () => {
				world.calls.rPiP[v1] = (world.calls.rPiP[v1] || 0) + 1;
				return new Promise((resolve) => {
					settle = () => {
						world.document.pictureInPictureElement = v1;
						v1.dispatch("enterpictureinpicture", { type: "enterpictureinpicture" });
						resolve(v1);
					};
				});
			};
			world.setHidden(true);
			await world.tick(400);
			world.setHidden(false);
			await world.tick(300);
			assert.equal(world.calls.exit, 0, "restore can run before the request settles");
			settle();
			await world.tick(1);
			assert.equal(world.calls.exit, 1, "late PiP entry must be closed after restore");
			assert.equal(world.document.pictureInPictureElement, null);
			assertNoErrors(world);
		});

		t.test("W9 three hide/show cycles each re-enter PiP without a click", async () => {
			const world = await boot(true);
			const v1 = world.videos[0];
			await discover(world);
			for (let cycle = 1; cycle <= 3; cycle++) {
				world.setHidden(true);
				await world.tick(600);
				assert.equal(world.document.pictureInPictureElement, v1, "cycle " + cycle + " must enter PiP");
				assert.equal(rPiP(world, v1), cycle, "cycle " + cycle + " must issue exactly one request");
				world.setHidden(false);
				await world.tick(400);
				assert.equal(world.document.pictureInPictureElement, null, "cycle " + cycle + " must exit PiP on return");
			}
			assert.equal(world.calls.exit, 3, "each return must exit once");
			assertNoErrors(world);
		});

		t.test("W7 quick tab return before delayed PiP does not enter PiP", async () => {
			const world = await boot(true);
			const v1 = world.videos[0];
			await discover(world);

			world.setHidden(true);
			await world.tick(110);
			world.setHidden(false);
			await world.tick(600);
			assert.equal(rPiP(world, v1), 0, "a blur shorter than the PiP delay must not enter PiP");
			assert.equal(world.calls.exit, 0, "nothing to exit when PiP never opened");
			assertNoErrors(world);
		});
		t.test("W8 rejected PiP with mediaSession does not lock the next hidden transition", async () => {
			const world = await boot(true);
			await discover(world);
			const video = world.videos[0];
			const original = video.requestPictureInPicture;
			let attempts = 0;
			video.requestPictureInPicture = () => {
				attempts++;
				return Promise.reject(Object.assign(new Error("PiP needs a user gesture"), { name: "NotAllowedError" }));
			};
			world.setHidden(true);
			await world.tick(3000);
			assert.equal(attempts, 1);
			assert.equal(world.document.pictureInPictureElement, null);

			video.requestPictureInPicture = function () {
				attempts++;
				return original.call(this);
			};
			world.setHidden(false);
			await world.tick(300);
			world.setHidden(true);
			await world.tick(600);
			assert.equal(attempts, 2, "the next hidden transition must attempt PiP again");
			assert.equal(world.document.pictureInPictureElement, video);
			assert.equal(world.errors.length, 1);
			assert.match(world.errors[0], /NotAllowedError/);
		});

				t.test("W10 media session trigger enters PiP before the page reports hidden", async () => {
			const world = await boot(true);
			const v1 = world.videos[0];
			await discover(world);

			let fromMediaSession = false;
			const original = v1.requestPictureInPicture;
			v1.requestPictureInPicture = function () {
				if (!fromMediaSession) {
					return Promise.reject(Object.assign(new Error("Must be handling a user gesture"), { name: "NotAllowedError" }));
				}
				return original.call(this);
			};

			const handler = world.calls.setActionHandler.filter((c) => c.action === "enterpictureinpicture").pop().handler;
			fromMediaSession = true;
			await handler();
			fromMediaSession = false;
			world.setHidden(true);
			await world.tick(600);

			assert.equal(world.document.pictureInPictureElement, v1, "the browser-triggered entry must survive the visibility change");
			assert.equal(world.calls.exit, 0, "the page becoming hidden must not exit the PiP the browser opened");

			world.setHidden(false);
			await world.tick(400);
			assert.equal(world.calls.exit, 1, "restore must still exit auto PiP");
			assertNoErrors(world);
		});

				t.test("W11 the registered enterpictureinpicture handler stays controller-gated", async () => {
			const world = await boot(true);
			const v1 = world.videos[0];
			await discover(world);

			world.setHidden(true);
			await world.tick(600);
			assert.equal(world.document.pictureInPictureElement, v1, "hidden entry must open PiP");

			const handler = world.calls.setActionHandler.filter((c) => c.action === "enterpictureinpicture").pop().handler;
			await handler();
			await world.tick(300);
			assert.equal(rPiP(world, v1), 1, "the handler must not request a second PiP while one is already open");
			assert.equal(world.document.pictureInPictureElement, v1);
			assertNoErrors(world);
		});
		t.test("W12 three browser-triggered cycles enter and exit without a user gesture", async () => {
			const world = await boot(true);
			const v1 = world.videos[0];
			await discover(world);

			let fromMediaSession = false;
			const original = v1.requestPictureInPicture;
			v1.requestPictureInPicture = function () {
				if (!fromMediaSession) {
					return Promise.reject(Object.assign(new Error("Must be handling a user gesture"), { name: "NotAllowedError" }));
				}
				return original.call(this);
			};
			const handler = world.calls.setActionHandler.filter((c) => c.action === "enterpictureinpicture").pop().handler;

			for (let cycle = 1; cycle <= 3; cycle++) {
				fromMediaSession = true;
				await handler();
				fromMediaSession = false;
				world.setHidden(true);
				await world.tick(600);
				assert.equal(world.document.pictureInPictureElement, v1, "cycle " + cycle + " must open PiP from the browser trigger");

				world.setHidden(false);
				await world.tick(400);
				assert.equal(world.document.pictureInPictureElement, null, "cycle " + cycle + " must exit on return");
			}
			assert.equal(world.calls.exit, 3, "every return must exit exactly once");
			assert.equal(rPiP(world, v1), 3, "every cycle must issue exactly one granted request");
		});

		t.test("W13 Chrome 155 still uses the script path when native Auto PiP is off", async () => {
			const world = createWorld({
				host: YOUTUBE.host,
				userAgent: "Mozilla/5.0 Chrome/155.0.0.0 Safari/537.36",
				videos: [{ selectors: YOUTUBE.selectors, playing: true }],
			});
			await world.tick(600);
			await discover(world);

			assert.equal(
				world.calls.setActionHandler.filter((call) => call.action === "enterpictureinpicture").length,
				1,
				"the script must keep its media session handler unless native Auto PiP is explicitly enabled"
			);
			world.setHidden(true);
			await world.tick(600);
			assert.equal(rPiP(world, world.videos[0]), 1);
			assertNoErrors(world);
		});

		t.test("W14 Edge 155 still uses the script path when native Auto PiP is off", async () => {
			const world = createWorld({
				host: YOUTUBE.host,
				userAgent: "Mozilla/5.0 Chrome/155.0.0.0 Safari/537.36 Edg/155.0.0.0",
				videos: [{ selectors: YOUTUBE.selectors, playing: true }],
			});
			await world.tick(600);
			await discover(world);

			assert.equal(
				world.calls.setActionHandler.filter((call) => call.action === "enterpictureinpicture").length,
				1
			);
			world.setHidden(true);
			await world.tick(600);
			assert.equal(rPiP(world, world.videos[0]), 1);
			assertNoErrors(world);
		});

	},
};
