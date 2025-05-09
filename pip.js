// ==UserScript==
// @name         Auto Picture-in-Picture
// @namespace    http://tampermonkey.net/
// @version      1.3
// @description  Automatically enables picture-in-picture mode for videos with improved cross-browser support
// @author       hong-tm
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

	// Configuration constants
	const CONFIG = Object.freeze({
		MAX_PIP_ATTEMPTS: 5,
		PIP_RETRY_DELAY: 500,
		YT_NAVIGATION_DELAY: 1000,
		VIDEO_RETRY_DELAY: 200,
		VIDEO_MAX_RETRIES: 10,
		DEBUG: false, // Set to true to enable detailed logging
		RESPECT_NATIVE: true, // Prioritize browser's native Auto PiP functionality
	});

	// Simplified logger
	const Logger = {
		log(...args) {
			if (!CONFIG.DEBUG) return;
			console.log("[PiP]", ...args);
			try {
				GM_log(...args);
			} catch {}
		},
		error(...args) {
			console.error("[PiP Error]", ...args);
			try {
				GM_log("ERROR:", ...args);
			} catch {}
		},
	};

	// Browser detector - using lazy loading and caching results
	const BrowserDetector = (() => {
		const cache = new Map();

		const getCached = (key, fn) => {
			if (!cache.has(key)) {
				cache.set(key, fn());
			}
			return cache.get(key);
		};

		const ua = navigator.userAgent;

		return {
			get isEdge() {
				return getCached("isEdge", () => ua.includes("Edg/"));
			},
			get isBrave() {
				return getCached(
					"isBrave",
					() =>
						window.navigator.brave?.isBrave ||
						ua.includes("Brave") ||
						document.documentElement.dataset.browserType === "brave"
				);
			},
			get isFirefox() {
				return getCached("isFirefox", () => ua.includes("Firefox"));
			},
			get isChromiumBased() {
				return getCached(
					"isChromiumBased",
					() =>
						(ua.includes("Chrome") && !this.isEdge && !this.isBrave) ||
						this.isEdge ||
						this.isBrave
				);
			},
			get supportsPictureInPicture() {
				return getCached(
					"supportsPictureInPicture",
					() =>
						document.pictureInPictureEnabled ||
						document.documentElement.webkitSupportsPresentationMode?.(
							"picture-in-picture"
						)
				);
			},
			// Detect if browser supports native Auto PiP
			get supportsNativeAutoPiP() {
				return getCached("supportsNativeAutoPiP", () => {
					// Chrome/Edge/Brave 137+ detection (by checking specific flags API)
					if (this.isChromiumBased) {
						// Check if auto-picture-in-picture-for-video-playback flag is enabled
						const hasAutoPiPFlag =
							"chrome" in window &&
							chrome.webviewTag !== undefined &&
							"mediaSession" in navigator &&
							"setAutoplayPolicy" in navigator.mediaSession;

						if (hasAutoPiPFlag) {
							Logger.log("Native Auto PiP detected in Chromium browser");
							return true;
						}
					}

					// Firefox 130+ detection (through specific Firefox API behavior)
					if (this.isFirefox) {
						// Firefox has no direct API detection, check version and specific behavior
						const firefoxMatch = ua.match(/Firefox\/(\d+)/);
						if (firefoxMatch && parseInt(firefoxMatch[1], 10) >= 130) {
							Logger.log(
								"Potentially using Firefox with native Auto PiP support"
							);
							return true;
						}
					}

					return false;
				});
			},
		};
	})();

	// Video controller class - handles PiP operations
	class VideoController {
		constructor() {
			this.isTabActive = !document.hidden;
			this.isPiPRequested = false;
			this.pipInitiatedFromOtherTab = false;
			this.pipAttempts = 0;
			this.lastVideoElement = null;
			this.usingNativeAutoPiP = false;

			// Domain-specific video selectors
			this.videoSelectors = {
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

			// Detect if browser supports native Auto PiP
			this.checkNativeAutoPiPSupport();

			// Bind methods to maintain correct 'this' context
			this.handleVisibilityChange = this.handleVisibilityChange.bind(this);
			this.handlePipEnter = this.handlePipEnter.bind(this);
			this.handlePipExit = this.handlePipExit.bind(this);
			this.handleYouTubeNavigation = this.handleYouTubeNavigation.bind(this);
		}

		/**
		 * Detect whether to use browser's native Auto PiP functionality
		 */
		checkNativeAutoPiPSupport() {
			if (CONFIG.RESPECT_NATIVE && BrowserDetector.supportsNativeAutoPiP) {
				this.usingNativeAutoPiP = true;
				Logger.log("Using native browser Auto PiP functionality");
			} else {
				this.usingNativeAutoPiP = false;
				Logger.log("Using script's Auto PiP implementation");
			}
		}

		/**
		 * Get the video element from the current page
		 * @param {number} retryCount - Current retry count
		 * @returns {Promise<HTMLVideoElement|null>} Video element or null
		 */
		async getVideoElement(retryCount = 0) {
			// Check if cached element is still valid
			if (this.lastVideoElement?.isConnected) {
				return this.lastVideoElement;
			}

			// Determine selectors for the current domain
			const domain = Object.keys(this.videoSelectors).find((d) =>
				window.location.hostname.includes(d)
			);

			if (!domain) return null;

			// Try all possible selectors
			for (const selector of this.videoSelectors[domain]) {
				const video = document.querySelector(selector);
				if (video) {
					this.lastVideoElement = video;
					Logger.log("Video element found");
					return video;
				}
			}

			// If no video found and maximum retries not exceeded, retry
			if (retryCount < CONFIG.VIDEO_MAX_RETRIES) {
				const delay = Math.min(
					CONFIG.VIDEO_RETRY_DELAY * (retryCount + 1),
					1000
				);
				await new Promise((resolve) => setTimeout(resolve, delay));
				return this.getVideoElement(retryCount + 1);
			}

			Logger.log("Failed to find video element after retries");
			return null;
		}

		/**
		 * Check if a video is currently playing
		 * @param {HTMLVideoElement} video - Video element
		 * @returns {boolean} Whether the video is playing
		 */
		isVideoPlaying(video) {
			return (
				video &&
				!video.paused &&
				!video.ended &&
				video.readyState > 2 &&
				video.currentTime > 0
			);
		}

		/**
		 * Request Picture-in-Picture mode
		 * @param {HTMLVideoElement} video - Video element
		 * @returns {Promise<boolean>} Whether successful
		 */
		async requestPictureInPicture(video) {
			if (!video) return false;

			try {
				// Special handling for Brave and Edge
				if (BrowserDetector.isBrave || BrowserDetector.isEdge) {
					video.focus();
					await new Promise((resolve) => setTimeout(resolve, 200));
					if (video.paused) {
						await video.play().catch(() => {});
					}
				}

				// Try to set media session autoplay policy
				if (
					"mediaSession" in navigator &&
					"setAutoplayPolicy" in navigator.mediaSession
				) {
					navigator.mediaSession.setAutoplayPolicy("allowed");
				}

				// Try to request PiP mode
				if (document.pictureInPictureEnabled) {
					await video.requestPictureInPicture();
					Logger.log("PiP activated successfully");
					this.pipAttempts = 0;
					return true;
				} else if (video.webkitSetPresentationMode) {
					await video.webkitSetPresentationMode("picture-in-picture");
					Logger.log("Safari PiP activated successfully");
					this.pipAttempts = 0;
					return true;
				}

				throw new Error("PiP not supported in this browser");
			} catch (error) {
				Logger.error(`PiP request failed: ${error.message}`);
				this.pipAttempts++;

				// Use exponential backoff strategy for retries
				if (this.pipAttempts < CONFIG.MAX_PIP_ATTEMPTS) {
					const delay =
						CONFIG.PIP_RETRY_DELAY * Math.pow(1.5, this.pipAttempts);
					Logger.log(
						`Retrying PiP (attempt ${this.pipAttempts}) in ${delay}ms`
					);
					await new Promise((resolve) => setTimeout(resolve, delay));
					return this.requestPictureInPicture(video);
				}

				Logger.error("Max PiP attempts reached");
				return false;
			}
		}

		/**
		 * Enable Picture-in-Picture mode
		 * @param {boolean} forceEnable - Whether to force enable
		 * @returns {Promise<void>}
		 */
		async enablePiP(forceEnable = false) {
			// If using native Auto PiP, skip our implementation (unless forced)
			if (this.usingNativeAutoPiP && !forceEnable) {
				Logger.log("Relying on native Auto PiP functionality");
				return;
			}

			try {
				const video = await this.getVideoElement();
				if (!video || (!forceEnable && !this.isVideoPlaying(video))) {
					return;
				}

				if (!document.pictureInPictureElement && !this.isPiPRequested) {
					const success = await this.requestPictureInPicture(video);
					if (success) {
						this.isPiPRequested = true;
						this.pipInitiatedFromOtherTab = !this.isTabActive;
					}
				}
			} catch (error) {
				Logger.error(`Enable PiP error: ${error.message}`);
			}
		}

		/**
		 * Disable Picture-in-Picture mode
		 * @returns {Promise<void>}
		 */
		async disablePiP() {
			// If using native Auto PiP, skip our implementation
			if (this.usingNativeAutoPiP) {
				Logger.log("Relying on native Auto PiP functionality for exit");
				return;
			}

			if (document.pictureInPictureElement && !this.pipInitiatedFromOtherTab) {
				try {
					await document.exitPictureInPicture();
					Logger.log("PiP mode exited");
					this.isPiPRequested = false;
					this.pipAttempts = 0;
				} catch (error) {
					Logger.error(`Exit PiP error: ${error.message}`);
				}
			}
		}

		/**
		 * Handle tab visibility changes
		 * @returns {Promise<void>}
		 */
		async handleVisibilityChange() {
			const previousState = this.isTabActive;
			this.isTabActive = !document.hidden;

			// Only process if state actually changed
			if (previousState === this.isTabActive) return;

			Logger.log(`Tab visibility: ${this.isTabActive ? "visible" : "hidden"}`);

			// If using native Auto PiP, reduce our intervention
			if (this.usingNativeAutoPiP) {
				Logger.log("Relying on native Auto PiP for visibility change");
				return;
			}

			if (this.isTabActive) {
				// Exit PiP when tab becomes active (unless initiated from another tab)
				if (!this.pipInitiatedFromOtherTab) {
					await this.disablePiP();
				}
			} else {
				// Enable PiP when tab becomes inactive
				const video = await this.getVideoElement();
				if (video && this.isVideoPlaying(video)) {
					const delay = BrowserDetector.isChromiumBased ? 200 : 0;
					setTimeout(() => this.enablePiP(true), delay);
				}
				this.pipInitiatedFromOtherTab = false;
			}
		}

		/**
		 * Set up media session handlers
		 */
		setupMediaSession() {
			if (!("mediaSession" in navigator)) return;

			try {
				// Set up PiP action handler
				if ("setActionHandler" in navigator.mediaSession) {
					navigator.mediaSession.setActionHandler(
						"enterpictureinpicture",
						async () => {
							if (!this.isTabActive) {
								await this.enablePiP(true);
							}
						}
					);

					// Set up other playback control handlers
					["play", "pause", "seekbackward", "seekforward"].forEach((action) => {
						try {
							navigator.mediaSession.setActionHandler(action, null);
						} catch {}
					});
				}

				// Allow autoplay
				if ("setAutoplayPolicy" in navigator.mediaSession) {
					navigator.mediaSession.setAutoplayPolicy("allowed");
				}

				Logger.log("Media session handlers set up");
			} catch (error) {
				Logger.log("Some media session features not supported");
			}
		}

		/**
		 * Handle PiP enter event
		 */
		handlePipEnter() {
			this.pipInitiatedFromOtherTab = !this.isTabActive;
			this.isPiPRequested = true;
			this.pipAttempts = 0;
			Logger.log("Entered PiP mode");
		}

		/**
		 * Handle PiP exit event
		 */
		handlePipExit() {
			this.isPiPRequested = false;
			this.pipInitiatedFromOtherTab = false;
			this.pipAttempts = 0;
			Logger.log("Left PiP mode");
		}

		/**
		 * Handle YouTube navigation events
		 */
		async handleYouTubeNavigation() {
			// If using native Auto PiP, reduce our intervention
			if (this.usingNativeAutoPiP) return;

			// Delay check for video after navigation
			setTimeout(async () => {
				if (!this.isTabActive) {
					const video = await this.getVideoElement();
					if (video && this.isVideoPlaying(video)) {
						await this.enablePiP();
					}
				}
			}, CONFIG.YT_NAVIGATION_DELAY);
		}

		/**
		 * Initialize the controller
		 */
		initialize() {
			Logger.log("Initializing PiP controller...");
			Logger.log(
				`Browser: ${
					BrowserDetector.isFirefox
						? "Firefox"
						: BrowserDetector.isEdge
						? "Edge"
						: BrowserDetector.isBrave
						? "Brave"
						: "Chrome"
				}`
			);
			Logger.log(
				`Native Auto PiP support: ${this.usingNativeAutoPiP ? "Yes" : "No"}`
			);

			// Set up visibility change handler
			document.addEventListener(
				"visibilitychange",
				this.handleVisibilityChange,
				{ passive: true }
			);

			// Set up PiP event handlers
			document.addEventListener("enterpictureinpicture", this.handlePipEnter, {
				passive: true,
			});
			document.addEventListener("leavepictureinpicture", this.handlePipExit, {
				passive: true,
			});

			// YouTube-specific handling
			if (window.location.hostname.includes("youtube.com")) {
				window.addEventListener(
					"yt-navigate-finish",
					this.handleYouTubeNavigation,
					{ passive: true }
				);
			}

			// Set up media session
			this.setupMediaSession();

			// Initial visibility state handling
			this.handleVisibilityChange();

			Logger.log("Initialization complete");
		}
	}

	// Initialize controller
	const pipController = new VideoController();

	// Initialize after DOM loads
	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", () =>
			pipController.initialize()
		);
	} else {
		pipController.initialize();
	}
})();
