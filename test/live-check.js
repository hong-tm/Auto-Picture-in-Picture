"use strict";

// Real-browser check, not part of test/run.js. Needs a global Playwright with
// Chromium. Run:  NODE_PATH=<global node_modules> node test/live-check.js [--fixture-only]
// pip.js runs in a CDP isolated world, the same separation a userscript sandbox
// has from the page. The hidden state is faked in that world only, and each PiP
// entry follows a real click so that transient activation allows the request.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const WORLD = "userscript";
const SOURCE = fs.readFileSync(path.join(__dirname, "..", "pip.js"), "utf8");
const FAKE_HIDDEN = `
	globalThis.__hidden = false;
	Object.defineProperty(document, "hidden", { configurable: true, get: () => globalThis.__hidden });
`;

const LIVE = [
	["YouTube watch", ["https://www.youtube.com/watch?v=aqz-KE-bpKQ", "https://www.youtube.com/watch?v=jNQXAC9IVRw"]],
	["YouTube Shorts", ["https://www.youtube.com/shorts/"]],
	["Bilibili video", ["https://www.bilibili.com/video/BV1xx411c7mD/", "https://www.bilibili.com/video/BV1GJ411x7h7/"]],
	["YouTube Music", ["https://music.youtube.com/watch?v=dQw4w9WgXcQ"]],
	["Bilibili live", ["https://live.bilibili.com/1", "https://live.bilibili.com/6", "https://live.bilibili.com/21"]],
];

const fixturePage = (container) => `<!doctype html><title>fixture</title><body><div id="${container}"></div><script>
	function addVideo() {
		const canvas = document.createElement("canvas");
		canvas.width = 320; canvas.height = 180;
		const ctx = canvas.getContext("2d");
		setInterval(() => { ctx.fillStyle = "#" + ((Math.random() * 0xffffff) | 0).toString(16).padStart(6, "0"); ctx.fillRect(0, 0, 320, 180); }, 50);
		const video = document.createElement("video");
		video.muted = true; video.srcObject = canvas.captureStream(20);
		document.querySelector("#${container}").replaceChildren(video);
		video.play();
		window.currentVideo = video;
	}
	addVideo();
</script>`;

async function openPage(browser, options = {}) {
	const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, ...options });
	const page = await context.newPage();
	const cdp = await context.newCDPSession(page);
	await cdp.send("Page.enable");
	await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
		source: `${FAKE_HIDDEN}\n${SOURCE}`,
		worldName: WORLD,
		runImmediately: true,
	});
	const contexts = new Map();
	await cdp.send("Runtime.enable");
	cdp.on("Runtime.executionContextCreated", ({ context: c }) => {
		if (c.name === WORLD && c.auxData?.isDefault === false) contexts.set(c.auxData.frameId, c.id);
	});
	const inWorld = async (expression) => {
		const { frameTree } = await cdp.send("Page.getFrameTree");
		const contextId = contexts.get(frameTree.frame.id);
		assert.ok(contextId, "userscript world missing");
		const { result, exceptionDetails } = await cdp.send("Runtime.evaluate", {
			expression, contextId, returnByValue: true, awaitPromise: true,
		});
		assert.ok(!exceptionDetails, exceptionDetails?.exception?.description);
		return result.value;
	};
	const setHidden = (hidden) => inWorld(`globalThis.__hidden = ${hidden}; document.dispatchEvent(new Event("visibilitychange"));`);
	return { context, page, setHidden };
}

const pipState = (page) => page.evaluate(() => {
	const pip = document.pictureInPictureElement;
	return { open: !!pip, isCurrent: !!pip && pip === window.currentVideo };
});

async function waitForPip(page, wanted, timeout = 4000) {
	await page.waitForFunction((w) => !!document.pictureInPictureElement === w, wanted, { timeout, polling: 100 });
}

async function fixture(browser) {
	const { context, page, setHidden } = await openPage(browser);
	if (process.env.LIVE_DEBUG) page.on("console", (m) => console.log("console:", m.text()));
	await page.route("https://www.bilibili.com/**", (route) => route.fulfill({ contentType: "text/html", body: fixturePage("bilibili-player") }));
	await page.goto("https://www.bilibili.com/video/fixture");
	await page.waitForFunction(() => window.currentVideo.currentTime > 0 && window.currentVideo.readyState > 2);
	await page.waitForTimeout(800);

	const nativePush = await page.evaluate(() => /\[native code\]/.test(history.pushState.toString()));
	assert.ok(nativePush, "page history must stay native");

	await page.mouse.click(5, 5);
	await setHidden(true);
	await waitForPip(page, true);
	console.log("ok   fixture: hidden + activation enters PiP");

	// Main-world route change that swaps the element. The page must re-enter on the new one.
	await page.evaluate(() => { history.pushState({}, "", "/video/next"); });
	await page.mouse.click(5, 5);
	await page.evaluate(() => { addVideo(); });
	await page.waitForFunction(() => window.currentVideo.readyState > 2 && window.currentVideo.currentTime > 0);
	await page.evaluate(() => { history.pushState({}, "", "/video/next2"); });
	await page.mouse.click(5, 5);
	await page.waitForFunction(() => document.pictureInPictureElement === window.currentVideo, null, { timeout: 5000, polling: 100 }).catch(async (error) => {
		console.log(await page.evaluate(() => ({ pip: !!document.pictureInPictureElement, stale: document.pictureInPictureElement && !document.pictureInPictureElement.isConnected, active: navigator.userActivation.isActive, paused: window.currentVideo.paused, rs: window.currentVideo.readyState, t: window.currentVideo.currentTime, hidden: document.hidden })));
		throw error;
	});
	console.log("ok   fixture: main-world pushState + element swap re-enters on the new video");

	await setHidden(false);
	await waitForPip(page, false);
	console.log("ok   fixture: return exits script PiP");

	// User PiP on a visible page survives window blur and focus.
	await page.mouse.click(5, 5);
	await page.evaluate(() => window.currentVideo.requestPictureInPicture());
	await waitForPip(page, true);
	await page.evaluate(() => { window.dispatchEvent(new Event("blur")); window.dispatchEvent(new Event("focus")); });
	await page.waitForTimeout(500);
	assert.equal((await pipState(page)).open, true, "focus must not close user PiP");
	console.log("ok   fixture: window blur + focus keeps user PiP");

	// v1.6.0: master toggle off via the localStorage fallback keeps the script
	// passive, and a PiP the script did not open while hidden is browser-owned:
	// returning to the page must not race the browser's own closure, but the
	// script closes it once the browser leaves it open past the grace period.
	await page.evaluate(() => document.exitPictureInPicture());
	await waitForPip(page, false);
	await page.evaluate(() => localStorage.setItem("auto-pip-settings", JSON.stringify({ enabled: false })));
	await page.reload();
	await page.waitForFunction(() => window.currentVideo.currentTime > 0 && window.currentVideo.readyState > 2);
	await page.waitForTimeout(800);
	await setHidden(true);
	await page.waitForTimeout(800);
	assert.equal((await pipState(page)).open, false, "master off: a hidden playing video must not auto-enter");
	await page.evaluate(() => window.currentVideo.requestPictureInPicture());
	await waitForPip(page, true);
	await setHidden(false);
	await page.waitForTimeout(600);
	assert.equal((await pipState(page)).open, true, "browser-owned PiP must survive the return");
	await page.waitForTimeout(800);
	assert.equal((await pipState(page)).open, false, "PiP the browser left open must close after the grace period");
	await page.evaluate(() => localStorage.removeItem("auto-pip-settings"));
	console.log("ok   fixture: master toggle off + browser-owned PiP gets the browser first, then closes");
	await context.close();
}

async function liveFixture(browser) {
	const { context, page, setHidden } = await openPage(browser);
	await page.route("https://live.bilibili.com/**", (route) => route.fulfill({ contentType: "text/html", body: fixturePage("live-player") }));
	await page.goto("https://live.bilibili.com/6");
	await page.waitForFunction(() => window.currentVideo.currentTime > 0 && window.currentVideo.readyState > 2);
	await page.waitForTimeout(800);
	await page.mouse.click(5, 5);
	await setHidden(true);
	await waitForPip(page, true);
	await setHidden(false);
	await waitForPip(page, false);
	console.log("ok   fixture: live.bilibili.com live player enters and exits PiP");
	await context.close();
}

async function liveSite(browser, name, urls) {
	for (const url of urls) {
		const { context, page, setHidden } = await openPage(browser, {
			locale: "zh-CN",
			userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
		});
		try {
			await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
			await page.waitForFunction(() => [...document.querySelectorAll("video")].some((v) => !v.paused && v.readyState > 2 && v.currentTime > 0), null, { timeout: 25000, polling: 500 });
			await page.waitForTimeout(1500);
			await page.mouse.move(640, 5);
			await page.mouse.click(640, 5);
			await setHidden(true);
			await waitForPip(page, true, 5000);
			const inPlayer = await page.evaluate(() => {
				const pip = document.pictureInPictureElement;
				return { playing: !pip.paused, width: pip.videoWidth };
			});
			await setHidden(false);
			await waitForPip(page, false);
			console.log(`ok   ${name}: ${page.url()} entered and exited PiP ${JSON.stringify(inPlayer)}`);
			await context.close();
			return true;
		} catch (error) {
			console.log(`skip ${name}: ${url}: ${error.message.split("\n")[0]}`);
			await context.close();
		}
	}
	console.log(`FAIL ${name}: every candidate URL failed`);
	return false;
}

(async () => {
	const browser = await chromium.launch({
		headless: true,
		channel: "chromium",
		args: ["--no-sandbox", "--autoplay-policy=no-user-gesture-required"],
	});
	let failed = false;
	try {
		await fixture(browser);
		await liveFixture(browser);
		if (!process.argv.includes("--fixture-only")) {
			for (const [name, urls] of LIVE) {
				const ok = await liveSite(browser, name, urls);
				if (name === "Bilibili live") {
					if (!ok) console.log("note Bilibili live: real rooms are captcha/login-gated headless; selectors were verified on the real page and the routed fixture covers the integration - needs one manual check in a signed-in browser");
				} else {
					failed = !ok || failed;
				}
			}
		}
	} finally {
		await browser.close();
	}
	process.exitCode = failed ? 1 : 0;
})().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
