"use strict";

// RED suite for BUG-6: PerformanceMonitor and MediaCapabilitiesHelper are
// dormant subsystems (~120 lines). The performance monitor never runs
// (PERFORMANCE_MONITORING = false) and the capabilities probe result is only
// logged. Both must be deleted; the Logger and DEBUG flag stay.

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createWorld } = require("./harness.js");

const PIP_SOURCE = fs.readFileSync(path.join(__dirname, "..", "pip.js"), "utf8");

module.exports = {
	register(t) {
		t.test("source contains no PerformanceMonitor / PERFORMANCE_MONITORING", () => {
			for (const identifier of ["PerformanceMonitor", "PERFORMANCE_MONITORING"]) {
				assert.ok(!PIP_SOURCE.includes(identifier), `${identifier} must be removed`);
			}
		});

		t.test("source contains no MediaCapabilitiesHelper / checkVideoCapabilities / decodingInfo", () => {
			for (const identifier of ["MediaCapabilitiesHelper", "checkVideoCapabilities", "decodingInfo"]) {
				assert.ok(!PIP_SOURCE.includes(identifier), `${identifier} must be removed`);
			}
		});

		t.test("mediaCapabilities.decodingInfo is never called during an enablePiP scenario", async () => {
			const world = createWorld({
				host: "youtube.com",
				videos: [{ selectors: [".html5-main-video"], playing: true }],
			});
			const v1 = world.videos[0];

			await world.tick(600);
			world.setHidden(true);
			await world.tick(600);

			assert.ok((world.calls.rPiP[v1] || 0) >= 1, "scenario must actually enter PiP");
			assert.equal(world.calls.decodingInfo.length, 0, "the capabilities probe must not run");
			assert.equal(world.errors.length, 0, `unexpected errors: ${world.errors.join(" | ")}`);
		});

		t.test("Logger class and DEBUG flag survive the dead-code removal", () => {
			const loggerCount = (PIP_SOURCE.match(/\bclass Logger\b/g) || []).length;
			assert.equal(loggerCount, 1, "exactly one Logger class must remain");
			assert.ok(PIP_SOURCE.includes("const DEBUG = false;"), "const DEBUG = false must remain");
		});
	},
};
