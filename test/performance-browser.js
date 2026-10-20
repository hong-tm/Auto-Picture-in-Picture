"use strict";

// Compare the existing pre-deletion revision with the working userscript.
// Deterministic VM counts, not CPU timings or real-browser coverage.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

const root = path.join(__dirname, "..");
const beforeRevision = "d6ee04e0f9ce1ecf1a4afbd714e24e4feaa38ff8";
const before = execFileSync("git", ["show", `${beforeRevision}:pip.js`], {
	cwd: root,
	encoding: "utf8",
});
const after = fs.readFileSync(path.join(root, "pip.js"), "utf8");
const harness = fs.readFileSync(path.join(__dirname, "harness.js"), "utf8");

async function measure(source, ua, exitsOnRestore) {
	let maps = 0;
	const checks = [];
	const harnessModule = { exports: {} };
	// Instrument only the userscript VM. Harness bookkeeping uses native Maps.
	vm.runInNewContext(harness, {
		module: harnessModule,
		__dirname,
		setImmediate,
		require(name) {
			if (name !== "node:vm") return require(name);
			return {
				runInNewContext(_source, sandbox, options) {
					sandbox.Map = class extends Map {
						constructor(...args) {
							super(...args);
							maps++;
						}
					};
					return vm.runInNewContext(source, sandbox, options);
				},
			};
		},
	});
	const world = harnessModule.exports.createWorld({
		host: "youtube.com",
		userAgent: {
			includes(part) {
				checks.push(part);
				return ua.includes(part);
			},
		},
		videos: [{ selectors: [".html5-main-video"], playing: true }],
	});
	const startupMaps = maps;
	await world.tick(500);
	world.setHidden(true);
	await world.tick(1000);
	assert.equal(world.document.pictureInPictureElement, world.videos[0], ua);
	world.setHidden(false);
	await world.tick(100);
	assert.equal(world.document.pictureInPictureElement, exitsOnRestore ? null : world.videos[0], ua);
	world.userLeavePip();
	world.flushMutations();
	world.window.dispatch("focus");
	await world.tick(1000);
	assert.equal(world.document.pictureInPictureElement, null, ua);
	assert.equal(world.calls.rPiP[world.videos[0]], 1, ua);
	assert.equal(world.calls.exit, exitsOnRestore ? 1 : 0, ua);
	assert.equal(world.errors.length, 0, world.errors.join("\n"));
	return {
		ua,
		startupMaps,
		checks,
		focusCalls: world.calls.focus.length,
		playCalls: world.calls.play.length,
		pipRequests: world.calls.rPiP[world.videos[0]],
	};
}

function identity(source) {
	return {
		bytes: Buffer.byteLength(source),
		sha256: crypto.createHash("sha256").update(source).digest("hex"),
	};
}

async function main() {
	const results = [];
	for (const ua of ["Chrome/120", "Chrome/120 Edg/120", "Chrome/120 Brave", "Firefox/120", "Safari/17"]) {
		const previous = await measure(before, ua, false);
		const current = await measure(after, ua, true);
		assert.equal(previous.startupMaps, 2);
		assert.equal(current.startupMaps, 1);
		assert.deepEqual(previous.checks, ["Edg/", "Brave", "Firefox", "Chrome"]);
		assert.deepEqual(current.checks, ["Edg/", "Brave", "Chrome"]);
		assert.equal(current.focusCalls, /Edg\/|Brave/.test(ua) ? 1 : 0);
		assert.equal(current.focusCalls, previous.focusCalls);
		assert.equal(current.playCalls, previous.playCalls);
		assert.equal(current.pipRequests, previous.pipRequests);
		results.push({ before: previous, after: current });
	}
	assert.ok(Buffer.byteLength(after) < 16408);
	console.log(JSON.stringify({ beforeRevision, before: identity(before), after: identity(after), results }, null, 2));
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});
