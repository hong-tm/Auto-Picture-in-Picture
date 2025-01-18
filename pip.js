// ==UserScript==
// @name         Auto Picture-in-Picture
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Automatically enables picture-in-picture mode for YouTube and Bilibili with improved Edge and Brave support
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

	class Logger {
		static log(...args) {
			console.log("[PiP Debug]", ...args);
			try {
				GM_log(...args);
			} catch (e) {}
		}

		static error(...args) {
			console.error("[PiP Error]", ...args);
			try {
				GM_log("ERROR:", ...args);
			} catch (e) {}
		}
	}

	class BrowserDetector {
		static get isEdge() {
			return navigator.userAgent.includes("Edg/");
		}

		static get isBrave() {
			return (
				window.navigator.brave?.isBrave ||
				navigator.userAgent.includes("Brave") ||
				document.documentElement.dataset.browserType === "brave"
			);
		}

		static get isChrome() {
			return (
				navigator.userAgent.includes("Chrome") && !this.isEdge && !this.isBrave
			);
		}

		static get isFirefox() {
			return navigator.userAgent.includes("Firefox");
		}

		static get isChromiumBased() {
			return this.isChrome || this.isEdge || this.isBrave;
		}

		static get supportsPictureInPicture() {
			return (
				document.pictureInPictureEnabled ||
				document.documentElement.webkitSupportsPresentationMode?.(
					"picture-in-picture"
				)
			);
		}
	}

	class VideoController {
		constructor() {
			this.isTabActive = !document.hidden;
			this.isPiPRequested = false;
			this.pipInitiatedFromOtherTab = false;
			this.pipAttempts = 0;
			this.MAX_PIP_ATTEMPTS = 5;
			this.PIP_RETRY_DELAY = 500;
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
		}

		async getVideoElement(retryCount = 0, maxRetries = 10) {
			const domain = Object.keys(this.videoSelectors).find((d) =>
				window.location.hostname.includes(d)
			);
			if (!domain) return null;

			let video = null;
			for (const selector of this.videoSelectors[domain]) {
				video = document.querySelector(selector);
				if (video) break;
			}

			if (!video && retryCount < maxRetries) {
				Logger.log(
					`Video element not found, retrying... (${
						retryCount + 1
					}/${maxRetries})`
				);
				await new Promise((resolve) => setTimeout(resolve, 200));
				return this.getVideoElement(retryCount + 1, maxRetries);
			}

			Logger.log(
				video
					? "Video element found!"
					: "Failed to find video element after retries."
			);
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
			Logger.log(
				`Attempting PiP on ${
					BrowserDetector.isBrave
						? "Brave"
						: BrowserDetector.isEdge
						? "Edge"
						: "Chrome"
				}...`
			);

			try {
				if (BrowserDetector.isBrave || BrowserDetector.isEdge) {
					video.focus();
					await new Promise((resolve) => setTimeout(resolve, 200));
					if (video.paused) {
						await video.play().catch(() => {});
					}
				}

				if (document.pictureInPictureEnabled) {
					await video.requestPictureInPicture();
					Logger.log("PiP activated successfully!");
					this.pipAttempts = 0;
					return true;
				} else if (video.webkitSetPresentationMode) {
					await video.webkitSetPresentationMode("picture-in-picture");
					Logger.log("Safari PiP activated successfully!");
					this.pipAttempts = 0;
					return true;
				}
				throw new Error("PiP not supported");
			} catch (error) {
				Logger.error("PiP request failed:", error.message);
				this.pipAttempts++;

				if (this.pipAttempts < this.MAX_PIP_ATTEMPTS) {
					Logger.log(`Retrying PiP (attempt ${this.pipAttempts})...`);
					await new Promise((resolve) =>
						setTimeout(resolve, this.PIP_RETRY_DELAY)
					);
					return this.requestPictureInPicture(video);
				}
				Logger.error("Max PiP attempts reached");
				return false;
			}
		}

		async enablePiP(forceEnable = false) {
			try {
				const video = await this.getVideoElement();
				if (!video || (!forceEnable && !this.isVideoPlaying(video))) {
					Logger.log("Video not ready for PiP");
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
				Logger.error("Enable PiP error:", error);
			}
		}

		async disablePiP() {
			if (document.pictureInPictureElement && !this.pipInitiatedFromOtherTab) {
				try {
					await document.exitPictureInPicture();
					Logger.log("PiP mode exited");
					this.isPiPRequested = false;
					this.pipAttempts = 0;
				} catch (error) {
					Logger.error("Exit PiP error:", error);
				}
			}
		}

		async handleVisibilityChange() {
			const previousState = this.isTabActive;
			this.isTabActive = !document.hidden;
			Logger.log(
				`Tab visibility changed: ${this.isTabActive ? "visible" : "hidden"}`
			);

			if (previousState !== this.isTabActive) {
				if (this.isTabActive) {
					if (!this.pipInitiatedFromOtherTab) {
						await this.disablePiP();
					}
				} else {
					const video = await this.getVideoElement();
					if (video && this.isVideoPlaying(video)) {
						const delay = BrowserDetector.isChromiumBased ? 200 : 0;
						setTimeout(() => this.enablePiP(true), delay);
					}
					this.pipInitiatedFromOtherTab = false;
				}
			}
		}

		setupMediaSession() {
			if ("mediaSession" in navigator) {
				try {
					navigator.mediaSession.setActionHandler(
						"enterpictureinpicture",
						async () => {
							if (!this.isTabActive) {
								await this.enablePiP(true);
							}
						}
					);

					// Add support for Auto-PiP
					if ("setAutoplayPolicy" in navigator.mediaSession) {
						navigator.mediaSession.setAutoplayPolicy("allowed");
					}

					Logger.log("Media session handlers set up");
				} catch (error) {
					Logger.log("Some media session features not supported");
				}
			}
		}

		initialize() {
			Logger.log("Initializing PiP controller...");

			document.addEventListener(
				"visibilitychange",
				() => this.handleVisibilityChange(),
				false
			);

			document.addEventListener("enterpictureinpicture", () => {
				this.pipInitiatedFromOtherTab = !this.isTabActive;
				this.isPiPRequested = true;
				this.pipAttempts = 0;
				Logger.log("Entered PiP mode");
			});

			document.addEventListener("leavepictureinpicture", () => {
				this.isPiPRequested = false;
				this.pipInitiatedFromOtherTab = false;
				this.pipAttempts = 0;
				Logger.log("Left PiP mode");
			});

			if (window.location.hostname.includes("youtube.com")) {
				window.addEventListener("yt-navigate-finish", () => {
					setTimeout(async () => {
						if (!this.isTabActive) {
							const video = await this.getVideoElement();
							if (video && this.isVideoPlaying(video)) {
								await this.enablePiP();
							}
						}
					}, 1000);
				});
			}

			this.setupMediaSession();
			this.handleVisibilityChange();
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
})();
