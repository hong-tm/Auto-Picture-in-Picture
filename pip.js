// ==UserScript==
// @name         Auto Picture-in-Picture
// @namespace    http://tampermonkey.net/
// @version      1.6.0
// @description  Automatically enables picture-in-picture mode for YouTube and Bilibili with improved Edge and Brave support
// @author       hong-tm
// @license      MIT
// @icon         https://raw.githubusercontent.com/hong-tm/blog-image/main/picture-in-picture.svg
// @match        https://www.youtube.com/*
// @match        https://music.youtube.com/*
// @match        https://www.bilibili.com/*
// @match        https://live.bilibili.com/*
// @grant        GM_log
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @run-at       document-start
// @downloadURL https://update.greasyfork.org/scripts/516762/Auto%20Picture-in-Picture.user.js
// @updateURL https://update.greasyfork.org/scripts/516762/Auto%20Picture-in-Picture.meta.js
// ==/UserScript==

(function () {
	"use strict";

	const DEBUG = false;

	class Logger {
		static #queue = [];
		static #batchTimeout = null;
		static #BATCH_DELAY = 100;

		static #processBatch() {
			if (this.#queue.length === 0) return;
			const messages = this.#queue.splice(0);
			if (DEBUG) {
				console.log("[PiP Debug]", ...messages);
				try {
					GM_log(...messages);
				} catch (e) {}
			}
		}

		static log(...args) {
			if (!DEBUG) return;
			this.#queue.push(...args);
			if (!this.#batchTimeout) {
				this.#batchTimeout = setTimeout(() => {
					this.#batchTimeout = null;
					this.#processBatch();
				}, this.#BATCH_DELAY);
			}
		}

		static error(...args) {
			console.error("[PiP Error]", ...args);
			try {
				GM_log("ERROR:", ...args);
			} catch (e) {}
		}
	}

	class Settings {
		static #KEY = "settings";
		static #STORAGE_KEY = "auto-pip-settings";

		// Read storage on every access: another tab may have changed it.
		static #load() {
			const values = { enabled: true, closeOnReturn: true };
			try {
				const raw =
					typeof GM_getValue === "function"
						? GM_getValue(this.#KEY)
						: localStorage.getItem(this.#STORAGE_KEY);
				if (raw) Object.assign(values, JSON.parse(raw));
			} catch (e) {}
			return values;
		}

		static #save(values) {
			try {
				const raw = JSON.stringify(values);
				if (typeof GM_setValue === "function") GM_setValue(this.#KEY, raw);
				else localStorage.setItem(this.#STORAGE_KEY, raw);
			} catch (e) {}
		}

		static get enabled() {
			return this.#load().enabled;
		}

		static get closeOnReturn() {
			return this.#load().closeOnReturn;
		}

		static toggle(name) {
			const values = this.#load();
			values[name] = !values[name];
			this.#save(values);
		}
	}

	class Menu {
		static #ids = [];
		static #registeredOnce = false;
		static #onToggle = null;

		static setup(onToggle = this.#onToggle) {
			this.#onToggle = onToggle;
			if (typeof GM_registerMenuCommand !== "function") return;
			const canUpdate = typeof GM_unregisterMenuCommand === "function";
			if (this.#registeredOnce && !canUpdate) return;
			if (canUpdate) {
				for (const id of this.#ids) {
					try {
						GM_unregisterMenuCommand(id);
					} catch (e) {}
				}
			}
			this.#ids = [
				GM_registerMenuCommand(
					`Auto PiP: ${Settings.enabled ? "ON" : "OFF"}`,
					() => {
						Settings.toggle("enabled");
						this.#onToggle?.();
						this.setup();
					}
				),
				GM_registerMenuCommand(
					`Close PiP on return: ${
						Settings.closeOnReturn ? "ON" : "OFF"
					}`,
					() => {
						Settings.toggle("closeOnReturn");
						this.setup();
					}
				),
			];
			this.#registeredOnce = true;
		}
	}

	class BrowserDetector {
		static #browserInfo = null;

		static #initBrowserInfo() {
			if (this.#browserInfo) return;
			const ua = navigator.userAgent;
			this.#browserInfo = {
				isEdge: ua.includes("Edg/"),
				isBrave:
					window.navigator.brave?.isBrave ||
					ua.includes("Brave") ||
					document.documentElement.dataset.browserType === "brave",
			};
			this.#browserInfo.isChrome =
				ua.includes("Chrome") &&
				!this.#browserInfo.isEdge &&
				!this.#browserInfo.isBrave;
			this.#browserInfo.isChromiumBased =
				this.#browserInfo.isChrome ||
				this.#browserInfo.isEdge ||
				this.#browserInfo.isBrave;
		}

		static get isEdge() {
			this.#initBrowserInfo();
			return this.#browserInfo.isEdge;
		}

		static get isBrave() {
			this.#initBrowserInfo();
			return this.#browserInfo.isBrave;
		}

		static get isChromiumBased() {
			this.#initBrowserInfo();
			return this.#browserInfo.isChromiumBased;
		}
	}

	class VideoController {
		#userDismissed = false;
		#entryPending = false;
		#resume = 0;
		#hiddenTimer = null;
		#browserPiP = false;
		#lastVideoElement = null;
		#pipEventVideo = null;
		#videoObserver = null;
		#observerActive = false;
		#videoDiscovery = null;
		#eventListeners = new Set();
		#debounceTimers = new Map();

		static VIDEO_SELECTORS = {
			"youtube.com": [
				"#movie_player video",
				".html5-main-video",
				"video.video-stream",
			],
			// Key order matters: "live.bilibili.com" must be checked before
			// "bilibili.com", which hostname.includes() would also match.
			"live.bilibili.com": [
				"#live-player video",
				".live-player-ctnr video",
				"video",
			],
			"bilibili.com": [
				".bilibili-player-video video",
				"#bilibili-player video",
				"video",
			],
		};

		constructor() {
			this.#setupVideoObserver();
		}

		#debounce(fn, delay) {
			return (...args) => {
				const key = fn.toString();
				if (this.#debounceTimers.has(key)) {
					clearTimeout(this.#debounceTimers.get(key));
				}
				this.#debounceTimers.set(
					key,
					setTimeout(() => {
						this.#debounceTimers.delete(key);
						fn.apply(this, args);
					}, delay)
				);
			};
		}

		#setupVideoObserver() {
			const rescan = this.#debounce(() => {
				if (!this.#lastVideoElement?.isConnected) {
					this.getVideoElement().then((video) => {
						if (video && document.hidden && this.isVideoPlaying(video)) {
							this.enablePiP(true);
						}
					});
				}
			}, 200);
			this.#videoObserver = new MutationObserver((mutations) => {
				if (this.#lastVideoElement?.isConnected) return;
				// While hunting for a first video, ignore mutations that cannot
				// have added one; busy pages and chat iframes mutate constantly.
				// Once a locked video was lost, any change is a reason to look.
				if (
					this.#lastVideoElement ||
					mutations.some((m) =>
						[...m.addedNodes].some(
							(n) =>
								n.nodeType === 1 &&
								(n.tagName === "VIDEO" ||
									!!n.querySelector?.("video"))
						)
					)
				) {
					rescan();
				}
			});

			// `document` exists at document-start; documentElement may not yet.
			this.#videoObserver.observe(document, {
				childList: true,
				subtree: true,
			});
			this.#observerActive = true;
		}

		#setVideoObserverActive(active) {
			if (active) {
				if (!this.#observerActive && this.#videoObserver) {
					this.#videoObserver.observe(document, {
						childList: true,
						subtree: true,
					});
					this.#observerActive = true;
				}
			} else if (this.#observerActive) {
				this.#videoObserver?.disconnect();
				this.#observerActive = false;
			}
		}

		#syncPipListeners() {
			if (document.pictureInPictureElement?.isConnected || this.#pipEventVideo === this.#lastVideoElement) return;

			if (this.#pipEventVideo) {
				this.#pipEventVideo.removeEventListener(
					"enterpictureinpicture",
					this.#onEnterPiP
				);
				this.#pipEventVideo.removeEventListener(
					"leavepictureinpicture",
					this.#onLeavePiP
				);
				this.#pipEventVideo.removeEventListener("playing", this.#onVideoPlaying);
			}

			if (this.#lastVideoElement?.isConnected) {
				this.#lastVideoElement.addEventListener(
					"enterpictureinpicture",
					this.#onEnterPiP
				);
				this.#lastVideoElement.addEventListener(
					"leavepictureinpicture",
					this.#onLeavePiP
				);
				this.#lastVideoElement.addEventListener("playing", this.#onVideoPlaying);
				this.#pipEventVideo = this.#lastVideoElement;
			} else {
				this.#pipEventVideo = null;
			}
		}

		#installBilibiliNavigationWatch(addListener) {
			// The router runs in the page's main world. Navigation API events reach
			// every world, and patching page history breaks routing on Firefox, where
			// the page may not call a sandbox function.
			const rescan = () => this.#scheduleBiliRescan();
			if (window.navigation) addListener(window.navigation, "currententrychange", rescan);
			addListener(window, "popstate", rescan);
		}

		#scheduleBiliRescan() {
			this.#debounce(() => this.#rescanAfterNavigation(), 300)();
		}

		async #rescanAfterNavigation() {
			this.#setVideoObserverActive(true);
			if (this.#lastVideoElement?.isConnected) return;

			this.#lastVideoElement = null;
			const video = await this.getVideoElement();
			if (video && document.hidden && this.isVideoPlaying(video)) {
				this.enablePiP(true);
			}
		}

		async getVideoElement(retryCount = 0, maxRetries = 5) {
			if (this.#lastVideoElement?.isConnected && !this.#shorts()) {
				return this.#lastVideoElement;
			}
			if (this.#videoDiscovery) return this.#videoDiscovery;

			const discovery = this.#findVideoElement(retryCount, maxRetries);
			this.#videoDiscovery = discovery;
			try {
				return await discovery;
			} finally {
				if (this.#videoDiscovery === discovery) this.#videoDiscovery = null;
			}
		}

		#shorts() {
			return location.hostname.includes("youtube.com") && location.pathname.startsWith("/shorts/");
		}

		async #findVideoElement(retryCount, maxRetries) {
			const domain = Object.keys(VideoController.VIDEO_SELECTORS).find((d) =>
				window.location.hostname.includes(d)
			);
			if (!domain) {
				return null;
			}

			let video = null;
			const selectors = this.#shorts()
				? ["#shorts-player video"]
				: VideoController.VIDEO_SELECTORS[domain];
			for (const selector of selectors) {
				video = document.querySelector(selector);
				if (video) {
					this.#lastVideoElement = video;
					this.#setVideoObserverActive(false);
					this.#syncPipListeners();
					break;
				}
			}

			if (!video && retryCount < maxRetries) {
				Logger.log(
					`Video element not found, retrying... (${
						retryCount + 1
					}/${maxRetries})`
				);
				await new Promise((resolve) =>
					setTimeout(resolve, Math.min(200 * (retryCount + 1), 1000))
				);
				return this.#findVideoElement(retryCount + 1, maxRetries);
			}

			Logger.log(
				video
					? "Video element found!"
					: "Failed to find video element after retries."
			);
			if (!video) {
				this.#setVideoObserverActive(true);
			}
			return video;
		}

		isVideoPlaying(video) {
			if (!video) return false;
			return (
				!video.paused &&
				!video.ended &&
				video.readyState > 2 &&
				video.currentTime > 0
			);
		}

		async requestPictureInPicture(video) {
			if (!video) return false;
			if (!document.pictureInPictureEnabled && !video.webkitSetPresentationMode) return false;

			try {
				// Handle browser-specific cases
				if (BrowserDetector.isBrave || BrowserDetector.isEdge) {
					video.focus();
					await new Promise((resolve) => setTimeout(resolve, 200));
					if (video.paused) {
						await video.play().catch(() => {});
					}
				}

				// Try to enter PiP mode
				if (document.pictureInPictureEnabled) {
					try {
						await video.requestPictureInPicture();
						Logger.log("PiP activated successfully!");
						return true;
					} catch (e) {
						// A hidden page without a fresh user gesture gets
						// NotAllowedError here; Chrome's native auto PiP path
						// covers that case. Retrying cannot create a gesture.
						Logger.log("PiP request rejected:", e.name);
						return false;
					}
				} else if (video.webkitSetPresentationMode) {
					await video.webkitSetPresentationMode("picture-in-picture");
					Logger.log("Safari PiP activated successfully!");
					return true;
				}
				throw new Error("PiP not supported");
			} catch (error) {
				Logger.error("PiP request failed:", error.message);
				return false;
			}
		}

		async enablePiP(forceEnable = false, browserAction = false) {
			// Chromium keeps a removed video as pictureInPictureElement with no leave
			// event, so only a connected element means PiP is really showing the page.
			if (this.#entryPending || document.pictureInPictureElement?.isConnected) return;
			if (this.#userDismissed && !browserAction) return;
			// The master switch stops automatic entries. Media-control actions
			// are user initiated and stay allowed.
			if (!Settings.enabled && !browserAction) return;
			this.#entryPending = true;
			this.#browserPiP = browserAction;
			const id = this.#resume;
			try {
				const video = this.#lastVideoElement?.isConnected && !this.#shorts()
					? this.#lastVideoElement : await this.getVideoElement();
				if ((!browserAction && !document.hidden) || !video ||
					(!forceEnable && !this.isVideoPlaying(video))) return;
				const success = await this.requestPictureInPicture(video);
				if (success && !document.hidden && id !== this.#resume) this.disablePiP();
			} catch (error) {
				Logger.error("Enable PiP error:", error);
			} finally {
				this.#entryPending = false;
				if (!document.pictureInPictureElement) this.#browserPiP = false;
			}
		}

		async disablePiP() {
			// With "Close PiP on return" off, closure stays with the user.
			if (!Settings.closeOnReturn || !document.pictureInPictureElement) return;
			if (this.#browserPiP) {
				// The browser normally closes its own auto PiP on return, and a
				// competing exit can hang it. Close only what it leaves open.
				const id = this.#resume;
				await new Promise((resolve) => setTimeout(resolve, 1000));
				// The browser closing it resets #browserPiP, so a PiP opened later
				// on the visible page is not closed here.
				if (document.hidden || id !== this.#resume || !this.#browserPiP ||
					!Settings.closeOnReturn) return;
			}
			if (document.pictureInPictureElement) {
				try {
					await document.exitPictureInPicture();
					Logger.log("PiP mode exited");
				} catch (error) {
					Logger.error("Exit PiP error:", error);
				}
			}
		}

		#onEnterPiP = () => {
			// An enter while hidden with no script request in flight is the
			// browser or the site opening PiP itself (native auto PiP). The
			// browser closes that window on return, so do not race it.
			if (!this.#entryPending && document.hidden) this.#browserPiP = true;
			Logger.log("Entered PiP mode");
		};

		#onLeavePiP = () => {
			this.#browserPiP = false;
			// A connected video leaving PiP on a hidden page means the user closed it.
			// The site removing the video does not count.
			this.#userDismissed = document.hidden && !!this.#pipEventVideo?.isConnected;
			this.#syncPipListeners();
			this.#setVideoObserverActive(true);
			Logger.log("Left PiP mode");
		};

		// A video found while still loading or stalled has no other trigger later.
		#onVideoPlaying = () => {
			if (document.hidden) this.enablePiP(true);
		};

		#onVisibilityChange = () => {
			clearTimeout(this.#hiddenTimer);
			this.#hiddenTimer = null;
			if (!this.#lastVideoElement?.isConnected) this.#setVideoObserverActive(true);
			if (!document.hidden) {
				this.#resume++;
				this.#userDismissed = false;
				this.disablePiP();
			} else if (navigator.userActivation?.isActive) {
				this.enablePiP();
			} else {
				this.#hiddenTimer = setTimeout(() => {
					this.#hiddenTimer = null;
					this.enablePiP();
				}, BrowserDetector.isChromiumBased ? 300 : 100);
			}
		};

		setupMediaSession() {
			if ("mediaSession" in navigator) {
				try {
					// Native auto PiP fires this action too, so the master switch
					// off removes it and leaves PiP to the browser and the player.
					navigator.mediaSession.setActionHandler(
						"enterpictureinpicture",
						Settings.enabled
							? async () => {
								Logger.log("Media session enterpictureinpicture action");
								await this.enablePiP(true, true);
							}
							: null
					);
					Logger.log("Media session enterpictureinpicture handler registered");
				} catch (error) {
					Logger.log("Some media session features not supported");
				}
			}
		}

		#addEventListeners() {
			const addListener = (
				target,
				event,
				handler,
				options = { passive: true }
			) => {
				target.addEventListener(event, handler, options);
				this.#eventListeners.add({ target, event, handler });
			};

			addListener(document, "visibilitychange", this.#onVisibilityChange);

			if (window.location.hostname.includes("bilibili.com")) {
				this.#installBilibiliNavigationWatch(addListener);
			} else if (window.location.hostname.includes("youtube.com")) {
				addListener(
					window,
					"yt-navigate-finish",
					this.#debounce(async () => {
						// YouTube keeps the Shorts player connected after leaving Shorts.
						this.#lastVideoElement = null;
						if (document.hidden) {
							this.#setVideoObserverActive(true);
							const video = await this.getVideoElement();
							if (video && this.isVideoPlaying(video)) {
								await this.enablePiP();
							}
						}
					}, 1000)
				);
			}
		}

		cleanup() {
			clearTimeout(this.#hiddenTimer);
			this.#hiddenTimer = null;
			this.#eventListeners.forEach(({ target, event, handler }) => {
				target.removeEventListener(event, handler);
			});
			this.#eventListeners.clear();

			if (this.#pipEventVideo) {
				this.#pipEventVideo.removeEventListener(
					"enterpictureinpicture",
					this.#onEnterPiP
				);
				this.#pipEventVideo.removeEventListener(
					"leavepictureinpicture",
					this.#onLeavePiP
				);
				this.#pipEventVideo.removeEventListener("playing", this.#onVideoPlaying);
				this.#pipEventVideo = null;
			}

			if (this.#videoObserver) {
				this.#videoObserver.disconnect();
				this.#videoObserver = null;
			}
			this.#observerActive = false;

			this.#debounceTimers.forEach((timer) => clearTimeout(timer));
			this.#debounceTimers.clear();
		}

		initialize() {
			Logger.log("Initializing PiP controller...");
			this.#addEventListeners();
			this.setupMediaSession();
			Menu.setup(() => this.setupMediaSession());

			// Force immediate visibility check and PiP attempt
			setTimeout(() => {
				if (document.hidden) {
					this.getVideoElement().then((video) => {
						if (video && this.isVideoPlaying(video)) {
							this.enablePiP(true);
						}
					});
				}
			}, 500);

			Logger.log("Initialization complete");
		}
	}

	// Initialize the controller
	const pipController = new VideoController();
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", () =>
			pipController.initialize()
		);
	} else {
		pipController.initialize();
	}

	// Cleanup after a real page leave, but keep the controller for bfcache.
	window.addEventListener(
		"pagehide",
		(event) => {
			if (!event.persisted) pipController.cleanup();
		},
		{ passive: true }
	);
})();
