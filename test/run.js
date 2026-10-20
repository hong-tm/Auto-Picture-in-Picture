"use strict";

// Discovers test/*.test.js, runs each registered test, prints PASS n / FAIL m,
// and exits 1 when any test fails. Zero dependencies.

const fs = require("node:fs");
const path = require("node:path");

const TEST_DIR = __dirname;

function collectTests() {
	const tests = [];
	const files = fs
		.readdirSync(TEST_DIR)
		.filter((file) => file.endsWith(".test.js"))
		.sort();

	for (const file of files) {
		const collector = {
			test(name, fn) {
				tests.push({ name: `${file} :: ${name}`, fn });
			},
		};
		try {
			const mod = require(path.join(TEST_DIR, file));
			if (typeof mod.register !== "function") {
				throw new Error(`${file} does not export register(t)`);
			}
			mod.register(collector);
		} catch (error) {
			tests.push({
				name: `${file} :: load error`,
				fn() {
					throw error;
				},
			});
		}
	}

	return tests;
}

async function main() {
	const tests = collectTests();
	let pass = 0;
	let fail = 0;

	for (const test of tests) {
		try {
			await test.fn();
			pass++;
			console.log(`ok ${pass + fail} - ${test.name}`);
		} catch (error) {
			fail++;
			console.log(`not ok ${pass + fail} - ${test.name}`);
			const detail = String((error && error.stack) || error);
			for (const line of detail.split("\n")) console.log(`  ${line}`);
		}
	}

	console.log(`PASS ${pass} / FAIL ${fail}`);
	process.exit(fail > 0 ? 1 : 0);
}

main();
