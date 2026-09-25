"use strict";

// Zero-dependency node:vm harness for pip.js.
//
// Fidelity boundaries (deliberate, documented per plan Risk 3):
//   - No real DOM, layout, or event bubbling. Events are dispatched directly on
//     their target. pip.js PiP events (enter/leave) fire on the video element,
//     which matches the browser spec and therefore does NOT reach the
//     document-level listeners of unmodified v1.4.
//   - Deterministic clock. setTimeout/clearTimeout/performance.now read the
//     virtual timeline; only tick(ms) advances it. tick() is async so it can
//     drain microtasks between timer callbacks (await pipelines in pip.js).
//   - querySelector is backed by per-video selector-tag maps, not a DOM tree.
//     It returns the first connected video whose tags include the selector.
//   - mediaCapabilities.decodingInfo always reports supported/smooth/powerEfficient.
//   - document.hidden fires visibilitychange only when the value actually changes.
//   - detach(video) models the browser: removing a video that is in PiP clears
//     document.pictureInPictureElement and fires leavepictureinpicture on it.

const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const PIP_PAGE = path.join(__dirname, "..", "pip.js");

const DEFAULT_UA =
	"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

function makeListenerRegistry(errorSink) {
	const handlers = new Map();

	const addEventListener = (type, handler) => {
		if (typeof handler !== "function") return;
		if (!handlers.has(type)) handlers.set(type, []);
		const list = handlers.get(type);
		if (!list.includes(handler)) list.push(handler);
	};

	const removeEventListener = (type, handler) => {
		const list = handlers.get(type);
		if (!list) return;
		const index = list.indexOf(handler);
		if (index >= 0) list.splice(index, 1);
	};

	const dispatch = (type, event) => {
		const list = handlers.get(type);
		if (!list) return;
		for (const handler of list.slice()) {
			try {
				handler(event || { type });
			} catch (error) {
				if (errorSink) errorSink(error);
			}
		}
	};

	return {
		addEventListener,
		removeEventListener,
		dispatch,
		__count(type) {
			const list = handlers.get(type);
			return list ? list.length : 0;
		},
	};
}

class MediaMetadata {
	constructor(init = {}) {
		this.title = init.title;
		this.artist = init.artist;
		this.album = init.album;
		this.artwork = init.artwork || [];
	}
}

function createWorld(options = {}) {
	const host = options.host || "example.com";
	const readyState = options.readyState || "complete";
	const userAgent = options.userAgent || DEFAULT_UA;

	const errors = [];
	const logs = [];
	const pushError = (error) => errors.push(String((error && error.stack) || error));

	const calls = {
		rPiP: {},
		exit: 0,
		play: [],
		focus: [],
		decodingInfo: [],
		setActionHandler: [],
		setAutoplayPolicy: [],
		metadata: [],
		pushState: 0,
		pushStateArgs: [],
		replaceState: 0,
		replaceStateArgs: [],
	};

	let now = 0;
	let timerSeq = 0;
	const timers = new Map();

	function fakeSetTimeout(fn, delay, ...args) {
		const id = ++timerSeq;
		const ms = Number(delay);
		timers.set(id, {
			id,
			time: now + Math.max(0, Number.isFinite(ms) ? ms : 0),
			fn,
			args,
		});
		return id;
	}

	function fakeClearTimeout(id) {
		timers.delete(id);
	}

	function runTimer(timer) {
		let result;
		try {
			result = timer.fn(...timer.args);
		} catch (error) {
			errors.push(String((error && error.stack) || error));
			return;
		}
		if (result && typeof result.then === "function") {
			result.catch((error) => errors.push(String((error && error.stack) || error)));
		}
	}

	function earliestDue(target) {
		let best = null;
		for (const timer of timers.values()) {
			if (timer.time > target) continue;
			if (!best || timer.time < best.time || (timer.time === best.time && timer.id < best.id)) {
				best = timer;
			}
		}
		return best;
	}

	function drainMicrotasks() {
		return new Promise((resolve) => setImmediate(resolve));
	}

	async function tick(ms) {
		const target = now + ms;
		let guard = 0;
		for (;;) {
			if (guard++ > 100000) {
				errors.push("tick() guard exceeded");
				break;
			}
			const timer = earliestDue(target);
			if (timer) {
				now = Math.max(now, timer.time);
				timers.delete(timer.id);
				runTimer(timer);
				await drainMicrotasks();
				continue;
			}
			if (now < target) {
				now = target;
				await drainMicrotasks();
				continue;
			}
			break;
		}
	}

	// --- document ---------------------------------------------------------
	const connectedVideos = [];
	const observers = [];

	const document = makeListenerRegistry(pushError);
	document.readyState = readyState;
	document.title = "Harness Test Page";
	document.pictureInPictureEnabled = true;
	document.pictureInPictureElement = null;
	document.documentElement = {
		dataset: {},
		webkitSupportsPresentationMode: undefined,
	};

	let hidden = false;
	Object.defineProperty(document, "hidden", {
		configurable: true,
		enumerable: true,
		get() {
			return hidden;
		},
		set(value) {
			const next = Boolean(value);
			if (next === hidden) return;
			hidden = next;
			document.dispatch("visibilitychange", { type: "visibilitychange" });
		},
	});

	let querySelectorCalls = 0;
	document.querySelector = (selector) => {
		querySelectorCalls++;
		for (const video of connectedVideos) {
			if (video.matches(selector)) return video;
		}
		return null;
	};

	document.exitPictureInPicture = async () => {
		calls.exit++;
		const video = document.pictureInPictureElement;
		document.pictureInPictureElement = null;
		if (video) {
			video.dispatch("leavepictureinpicture", { type: "leavepictureinpicture" });
		}
	};

	// --- videos -----------------------------------------------------------
	let videoSeq = 0;

	function createVideo(spec = {}) {
		const tags = new Set(spec.selectors || []);
		const video = makeListenerRegistry(pushError);

		video.__id = "video" + ++videoSeq;
		video.paused = spec.playing ? false : spec.paused !== undefined ? spec.paused : true;
		video.ended = spec.ended !== undefined ? spec.ended : false;
		video.currentTime =
			spec.currentTime !== undefined ? spec.currentTime : spec.playing ? 5 : 0;
		video.readyState = spec.readyState !== undefined ? spec.readyState : 4;
		video.videoWidth = spec.videoWidth !== undefined ? spec.videoWidth : 1280;
		video.videoHeight = spec.videoHeight !== undefined ? spec.videoHeight : 720;
		video.isConnected = false;
		video.webkitSetPresentationMode = undefined;

		video.play = function () {
			calls.play.push(this);
			this.paused = false;
			return Promise.resolve();
		};
		video.focus = function () {
			calls.focus.push(this);
		};
		video.matches = function (selector) {
			return tags.has(selector);
		};
		video.requestPictureInPicture = function () {
			calls.rPiP[this] = (calls.rPiP[this] || 0) + 1;
			document.pictureInPictureElement = this;
			this.dispatch("enterpictureinpicture", { type: "enterpictureinpicture" });
			return Promise.resolve();
		};

		Object.defineProperty(video, "toString", {
			configurable: true,
			value() {
				return this.__id;
			},
		});

		return video;
	}

	function attach(video) {
		video.isConnected = true;
		if (!connectedVideos.includes(video)) connectedVideos.push(video);
	}

	function detach(video) {
		video.isConnected = false;
		const index = connectedVideos.indexOf(video);
		if (index >= 0) connectedVideos.splice(index, 1);
		if (document.pictureInPictureElement === video) {
			document.pictureInPictureElement = null;
			video.dispatch("leavepictureinpicture", { type: "leavepictureinpicture" });
		}
	}

	// --- MutationObserver -------------------------------------------------
	function FakeMutationObserver(callback) {
		this.callback = callback;
		this.observed = false;
		this.observeCalls = 0;
		this.disconnectCalls = 0;
		this.target = null;
		this.options = null;
		observers.push(this);
	}

	FakeMutationObserver.prototype.observe = function (target, opts) {
		this.target = target;
		this.options = opts;
		this.observed = true;
		this.observeCalls++;
	};

	FakeMutationObserver.prototype.disconnect = function () {
		this.observed = false;
		this.disconnectCalls++;
	};

	function flushMutations() {
		for (const observer of observers) {
			if (!observer.observed) continue;
			try {
				observer.callback([], observer);
			} catch (error) {
				errors.push(String((error && error.stack) || error));
			}
		}
	}

	// --- navigator --------------------------------------------------------
	const mediaSession = {
		setActionHandler(action, handler) {
			calls.setActionHandler.push({ action, handler });
		},
	};

	let metadataValue = null;
	Object.defineProperty(mediaSession, "metadata", {
		configurable: true,
		enumerable: true,
		get() {
			return metadataValue;
		},
		set(value) {
			metadataValue = value;
			calls.metadata.push(value);
		},
	});

	if (options.setAutoplayPolicy) {
		mediaSession.setAutoplayPolicy = (policy) => {
			calls.setAutoplayPolicy.push(policy);
		};
	}

	const navigator = {
		userAgent,
		mediaSession,
		mediaCapabilities: {
			decodingInfo(config) {
				calls.decodingInfo.push(config);
				return Promise.resolve({ supported: true, smooth: true, powerEfficient: true });
			},
		},
	};
	if (options.brave) {
		navigator.brave = { isBrave: () => Promise.resolve(true) };
	}

	// --- history ----------------------------------------------------------
	const history = {
		pushState(state, title, url) {
			calls.pushState++;
			calls.pushStateArgs.push([state, title, url]);
		},
		replaceState(state, title, url) {
			calls.replaceState++;
			calls.replaceStateArgs.push([state, title, url]);
		},
	};

	// --- sandbox / window -------------------------------------------------
	const sandbox = makeListenerRegistry(pushError);
	sandbox.document = document;
	sandbox.navigator = navigator;
	sandbox.location = {
		hostname: host,
		host,
		href: "https://" + host + "/",
		protocol: "https:",
		pathname: "/",
	};
	sandbox.history = history;
	sandbox.setTimeout = fakeSetTimeout;
	sandbox.clearTimeout = fakeClearTimeout;
	sandbox.performance = { now: () => now };
	sandbox.MutationObserver = FakeMutationObserver;
	sandbox.MediaMetadata = MediaMetadata;
	sandbox.GM_log = (...args) => {
		logs.push("GM_log " + args.map(String).join(" "));
	};
	sandbox.console = {
		log: (...args) => logs.push("LOG " + args.map(String).join(" ")),
		info: (...args) => logs.push("INFO " + args.map(String).join(" ")),
		warn: (...args) => logs.push("WARN " + args.map(String).join(" ")),
		debug: (...args) => logs.push("DEBUG " + args.map(String).join(" ")),
		error: (...args) => errors.push("ERROR " + args.map(String).join(" ")),
	};
	sandbox.window = sandbox;
	sandbox.self = sandbox;

	// --- initial DOM graph ------------------------------------------------
	const videos = [];
	for (const spec of options.videos || []) {
		const video = createVideo(spec);
		attach(video);
		videos.push(video);
	}

	// --- harness ops ------------------------------------------------------
	function setHidden(value) {
		document.hidden = value;
	}

	function userEnterPip(video) {
		document.pictureInPictureElement = video;
		video.dispatch("enterpictureinpicture", { type: "enterpictureinpicture" });
	}

	function userLeavePip() {
		const video = document.pictureInPictureElement;
		document.pictureInPictureElement = null;
		if (video) {
			video.dispatch("leavepictureinpicture", { type: "leavepictureinpicture" });
		}
	}

	function swapVideo(video, opts = {}) {
		const { playing } = opts;
		for (const connected of connectedVideos.slice()) detach(connected);
		if (playing !== undefined) {
			video.paused = !playing;
			if (playing) {
				video.ended = false;
				video.readyState = 4;
				if (!(video.currentTime > 0)) video.currentTime = 5;
			}
		}
		attach(video);
		flushMutations();
	}

	function listeners(target, event) {
		if (target && typeof target.__count === "function") return target.__count(event);
		return 0;
	}

	// --- run the userscript ----------------------------------------------
	try {
		const source = fs.readFileSync(PIP_PAGE, "utf8");
		vm.runInNewContext(source, sandbox, { filename: PIP_PAGE });
	} catch (error) {
		errors.push(String((error && error.stack) || error));
	}

	return {
		sandbox,
		window: sandbox,
		document,
		navigator,
		location: sandbox.location,
		history,
		videos,
		calls,
		errors,
		logs,
		observers,
		createVideo,
		attach,
		detach,
		setHidden,
		userEnterPip,
		userLeavePip,
		swapVideo,
		flushMutations,
		listeners,
		tick,
		get querySelectorCalls() {
			return querySelectorCalls;
		},
	};
}

module.exports = { createWorld };
