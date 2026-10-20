"use strict";

// Deterministic operation counts, not CPU timings. Run: node test/performance.js
// Instrument after synchronous startup; each row excludes its setup work.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { createWorld } = require("./harness.js");

function measure(options = {}) {
	const world = createWorld({ host: "youtube.com", ...options });
	let counts;
	const reset = () => {
		counts = { queries: {}, timers: {}, fired: 0, cancelled: 0, mutations: 0 };
	};
	reset();
	const query = world.document.querySelector;
	world.document.querySelector = (selector) => {
		counts.queries[selector] = (counts.queries[selector] || 0) + 1;
		return query(selector);
	};
	const schedule = world.sandbox.setTimeout;
	world.sandbox.setTimeout = (fn, delay, ...args) => {
		counts.timers[delay] = (counts.timers[delay] || 0) + 1;
		return schedule((...values) => {
			counts.fired++;
			return fn(...values);
		}, delay, ...args);
	};
	const cancel = world.sandbox.clearTimeout;
	world.sandbox.clearTimeout = (id) => {
		counts.cancelled++;
		return cancel(id);
	};
	for (const observer of world.observers) {
		const callback = observer.callback;
		observer.callback = (...args) => {
			counts.mutations++;
			return callback(...args);
		};
	}
	return {
		world,
		reset,
		result(name, expectedErrors = false) {
			if (!expectedErrors) assert.deepEqual(world.errors, []);
			return {
				name,
				...counts,
				observerActive: world.observers.some((observer) => observer.observed),
				debugMessages: world.logs.length,
			};
		},
	};
}

async function locked(host = "youtube.com") {
	const probe = measure({
		host,
		videos: [{ selectors: [host === "youtube.com" ? ".html5-main-video" : "video"], playing: true }],
	});
	probe.world.flushMutations();
	await probe.world.tick(600);
	assert.equal(probe.world.observers[0].observed, false);
	probe.reset();
	return probe;
}

async function main() {
	const results = [];
	let probe = await locked();
	for (let i = 0; i < 100; i++) {
		probe.world.flushMutations();
		await probe.world.tick(250);
	}
	results.push(probe.result("locked playback: 100 mutation batches / 25 virtual seconds"));

	probe = await locked();
	for (let i = 0; i < 100; i++) probe.world.window.dispatch("focus");
	await probe.world.tick(100);
	results.push(probe.result("100 redundant focus events in one burst"));

	probe = await locked();
	probe.world.setHidden(true);
	await probe.world.tick(1000);
	assert.equal(probe.world.document.pictureInPictureElement, probe.world.videos[0]);
	results.push(probe.result("cached video: one automatic PiP entry"));
	probe.world.userLeavePip();
	probe.reset();
	for (let i = 0; i < 100; i++) {
		probe.world.flushMutations();
		await probe.world.tick(250);
	}
	results.push(probe.result("after leaving PiP: 100 mutation batches / 25 virtual seconds"));

	probe = await locked("bilibili.com");
	probe.world.history.pushState({}, "", "/video/same-player");
	await probe.world.tick(300);
	results.push(probe.result("Bilibili navigation retaining the connected video"));
	probe.reset();
	for (let i = 0; i < 100; i++) {
		probe.world.flushMutations();
		await probe.world.tick(250);
	}
	results.push(probe.result("after retained-video navigation: 100 mutation batches / 25 virtual seconds"));

	probe = await locked("bilibili.com");
	probe.world.detach(probe.world.videos[0]);
	probe.world.attach(probe.world.createVideo({ selectors: ["video"], playing: true }));
	for (let i = 0; i < 100; i++) probe.world.history.pushState({}, "", "/video/new-player");
	await probe.world.tick(300);
	results.push(probe.result("Bilibili replacement: 100 navigation events in one burst"));

	probe = measure();
	await probe.world.tick(600);
	probe.reset();
	probe.world.flushMutations();
	await probe.world.tick(4000);
	results.push(probe.result("missing video: one mutation batch, retries exhausted"));

	probe = measure();
	await probe.world.tick(600);
	probe.reset();
	for (let i = 0; i < 10; i++) {
		probe.world.flushMutations();
		await probe.world.tick(250);
	}
	await probe.world.tick(4000);
	results.push(probe.result("missing video: 10 mutation batches 250 virtual ms apart"));

	probe = await locked();
	delete probe.world.navigator.mediaSession;
	let attempts = 0;
	probe.world.videos[0].requestPictureInPicture = () => {
		attempts++;
		return Promise.reject(new Error("measured rejection"));
	};
	probe.world.setHidden(true);
	await probe.world.tick(3000);
	assert.equal(attempts, 3);
	assert.equal(probe.world.errors.length, 4); // Three failures and the final exhaustion error.
	results.push({ ...probe.result("PiP rejection without mediaSession: retry exhaustion", true), attempts });

	const source = fs.readFileSync(path.join(__dirname, "..", "pip.js"));
	console.log(JSON.stringify({
		sourceBytes: source.length,
		sourceSha256: crypto.createHash("sha256").update(source).digest("hex"),
		results,
	}, null, 2));
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
