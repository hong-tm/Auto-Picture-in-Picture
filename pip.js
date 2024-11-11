// ==UserScript==
// @name         Auto Picture-in-Picture
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Automatically enables picture-in-picture mode for YouTube and Bilibili with improved Edge and Brave support
// @author
// @license      MIT
// @icon         https://raw.githubusercontent.com/hong-tm/blog-image/main/picture-in-picture.svg
// @match        https://www.youtube.com/*
// @match        https://www.bilibili.com/*
// @grant        GM_log
// @run-at       document-start
// @downloadURL https://update.greasyfork.org/scripts/516762/Auto%20Picture-in-Picture.user.js
// @updateURL https://update.greasyfork.org/scripts/516762/Auto%20Picture-in-Picture.meta.js
// ==/UserScript==

(function () {
	"use strict";

	// Enhanced logging that works in all browsers
	const debug = {
		log: (...args) => {
			console.log("[PiP Debug]", ...args);
			try {
				GM_log(...args);
			} catch (e) {
				// Fallback if GM_log isn't available
			}
		},
		error: (...args) => {
			console.error("[PiP Error]", ...args);
			try {
				GM_log("ERROR:", ...args);
			} catch (e) {
				// Fallback if GM_log isn't available
			}
		},
	};

	let isTabActive = !document.hidden;
	let isPiPRequested = false;
	let pipInitiatedFromOtherTab = false;
	let lastInteractionTime = 0;
	let pipAttempts = 0;
	const MAX_PIP_ATTEMPTS = 5;
	const PIP_RETRY_DELAY = 500;

	// Enhanced browser detection
	const browserInfo = {
		get isEdge() {
			return navigator.userAgent.includes("Edg/");
		},
		get isBrave() {
			return (
				window.navigator.brave?.isBrave || // Direct Brave API check
				navigator.userAgent.includes("Brave") ||
				document.documentElement.dataset.browserType === "brave"
			);
		},
		get isChrome() {
			return (
				navigator.userAgent.includes("Chrome") && !this.isEdge && !this.isBrave
			);
		},
		get isFirefox() {
			return navigator.userAgent.includes("Firefox");
		},
		get isChromiumBased() {
			return this.isChrome || this.isEdge || this.isBrave;
		},
	};

	// Enhanced video element detection
	async function getVideoElement(retryCount = 0, maxRetries = 10) {
		const selectors = {
			"youtube.com": [
				".html5-main-video",
				"video.video-stream",
				"#movie_player video",
			],
			"bilibili.com": [
				".bilibili-player-video video",
				"#bilibili-player video",
				"video",
			],
		};

		const domain = Object.keys(selectors).find((d) =>
			window.location.hostname.includes(d)
		);
		if (!domain) return null;

		let video = null;
		for (const selector of selectors[domain]) {
			video = document.querySelector(selector);
			if (video) break;
		}

		if (!video && retryCount < maxRetries) {
			debug.log(
				`Video element not found, retrying... (${retryCount + 1}/${maxRetries})`
			);
			await new Promise((resolve) => setTimeout(resolve, 200));
			return getVideoElement(retryCount + 1, maxRetries);
		}

		debug.log(
			video
				? "Video element found!"
				: "Failed to find video element after retries."
		);
		return video;
	}

	function isVideoPlaying(video) {
		if (!video) return false;
		const playing =
			!video.paused &&
			!video.ended &&
			video.readyState > 2 &&
			video.currentTime > 0;
		debug.log(`Is video playing: ${playing}`);
		return playing;
	}

	// Enhanced PiP request for Chromium-based browsers
	async function requestChromiumPiP(video) {
		if (!video) return false;
		debug.log(
			`Attempting PiP on ${
				browserInfo.isBrave ? "Brave" : browserInfo.isEdge ? "Edge" : "Chrome"
			}...`
		);

		try {
			// Special handling for Brave/Edge
			if (browserInfo.isBrave || browserInfo.isEdge) {
				// Force a user interaction context
				video.focus();
				await new Promise((resolve) => setTimeout(resolve, 200));

				// Ensure video is playing
				if (video.paused) {
					await video.play().catch(() => {});
				}
			}

			if (document.pictureInPictureEnabled) {
				await video.requestPictureInPicture();
				debug.log("PiP activated successfully!");
				pipAttempts = 0;
				return true;
			} else {
				throw new Error("PiP not enabled in browser");
			}
		} catch (error) {
			debug.error("PiP request failed:", error.message);
			pipAttempts++;

			if (pipAttempts < MAX_PIP_ATTEMPTS) {
				debug.log(`Retrying PiP (attempt ${pipAttempts})...`);
				await new Promise((resolve) => setTimeout(resolve, PIP_RETRY_DELAY));
				return requestChromiumPiP(video);
			} else {
				debug.error("Max PiP attempts reached");
				return false;
			}
		}
	}

	async function enablePiP(forceEnable = false) {
		try {
			const video = await getVideoElement();
			if (!video || (!forceEnable && !isVideoPlaying(video))) {
				debug.log("Video not ready for PiP");
				return;
			}

			if (!document.pictureInPictureElement && !isPiPRequested) {
				let success = false;

				if (browserInfo.isChromiumBased) {
					success = await requestChromiumPiP(video);
				} else {
					success = await video
						.requestPictureInPicture()
						.then(() => true)
						.catch((e) => {
							debug.error("Non-Chromium PiP request failed:", e);
							return false;
						});
				}

				if (success) {
					debug.log("PiP enabled successfully");
					isPiPRequested = true;
					pipInitiatedFromOtherTab = !isTabActive;
				}
			}
		} catch (error) {
			debug.error("Enable PiP error:", error);
		}
	}

	async function disablePiP() {
		if (document.pictureInPictureElement && !pipInitiatedFromOtherTab) {
			try {
				await document.exitPictureInPicture();
				debug.log("PiP mode exited");
				isPiPRequested = false;
				pipAttempts = 0;
			} catch (error) {
				debug.error("Exit PiP error:", error);
			}
		}
	}

	/* function handleUserInteraction(event) {
        lastInteractionTime = Date.now();
        debug.log("User interaction detected:", event.type);

        if (!isTabActive) {
            const checkAndEnablePiP = async () => {
                const video = await getVideoElement();
                if (video && isVideoPlaying(video)) {
                    await enablePiP(true);
                }
            };

            if (browserInfo.isBrave || browserInfo.isEdge) {
                setTimeout(checkAndEnablePiP, 200);
            } else {
                checkAndEnablePiP();
            }
        }
    } */

	async function handleVisibilityChange() {
		const previousState = isTabActive;
		isTabActive = !document.hidden;
		debug.log(`Tab visibility changed: ${isTabActive ? "visible" : "hidden"}`);

		if (previousState !== isTabActive) {
			if (isTabActive) {
				if (!pipInitiatedFromOtherTab) {
					await disablePiP();
				}
			} else {
				const video = await getVideoElement();
				if (video && isVideoPlaying(video)) {
					const delay = browserInfo.isChromiumBased ? 200 : 0;
					setTimeout(() => enablePiP(true), delay);
				}
				pipInitiatedFromOtherTab = false;
			}
		}
	}

	function initializeEventListeners() {
		debug.log("Initializing event listeners...");

		document.addEventListener(
			"visibilitychange",
			handleVisibilityChange,
			false
		);

		/* ["click", "keydown", "mousedown", "touchstart"].forEach((eventType) => {
            document.addEventListener(eventType, handleUserInteraction, {
                passive: true,
            });
        }); */

		if (window.location.hostname.includes("youtube.com")) {
			window.addEventListener("yt-navigate-finish", () => {
				setTimeout(async () => {
					if (!isTabActive) {
						const video = await getVideoElement();
						if (video && isVideoPlaying(video)) {
							await enablePiP();
						}
					}
				}, 1000);
			});
		}

		document.addEventListener("enterpictureinpicture", () => {
			pipInitiatedFromOtherTab = !isTabActive;
			isPiPRequested = true;
			pipAttempts = 0;
			debug.log("Entered PiP mode");
		});

		document.addEventListener("leavepictureinpicture", () => {
			isPiPRequested = false;
			pipInitiatedFromOtherTab = false;
			pipAttempts = 0;
			debug.log("Left PiP mode");
		});
	}

	function initializeMediaSession() {
		if ("mediaSession" in navigator) {
			try {
				navigator.mediaSession.setActionHandler(
					"enterpictureinpicture",
					async () => {
						if (!isTabActive) {
							await enablePiP(true);
						}
					}
				);
				debug.log("Media session PiP handler set");
			} catch (error) {
				debug.log("PiP media session action not supported");
			}
		}
	}

	// Enhanced initialization with error handling
	function initialize() {
		debug.log("Initializing script...");
		debug.log("Browser detected:", {
			isEdge: browserInfo.isEdge,
			isBrave: browserInfo.isBrave,
			isChrome: browserInfo.isChrome,
			isFirefox: browserInfo.isFirefox,
		});

		try {
			handleVisibilityChange();
			initializeMediaSession();
			initializeEventListeners();
			debug.log("Initialization complete");
		} catch (error) {
			debug.error("Initialization error:", error);
		}
	}

	// Ensure script runs as early as possible
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", initialize);
	} else {
		initialize();
	}
})();
