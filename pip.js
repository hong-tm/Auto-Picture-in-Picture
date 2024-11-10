// ==UserScript==
// @name         Auto Picture-in-Picture
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Automatically enables picture-in-picture mode for YouTube and Bilibili with user interaction when switching tabs.
// @author       hong-tm
// @license      MIT
// @icon         https://raw.githubusercontent.com/hong-tm/blog-image/main/picture-in-picture.svg
// @match        https://www.youtube.com/*
// @match        https://www.bilibili.com/*
// @grant        none
// @downloadURL https://update.greasyfork.org/scripts/516762/Auto%20Picture-in-Picture.user.js
// @updateURL https://update.greasyfork.org/scripts/516762/Auto%20Picture-in-Picture.meta.js
// ==/UserScript==

(function ()
{
    'use strict';

    let isTabActive = !document.hidden;
    let isPiPRequested = false; // Track if PiP was requested by the user

    // Get the appropriate video element based on the current site
    function getVideoElement()
    {
        if (window.location.hostname.includes('youtube.com'))
        {
            return document.querySelector('.html5-main-video') || document.querySelector('video');
        } else if (window.location.hostname.includes('bilibili.com'))
        {
            return document.querySelector('.bilibili-player-video video') || document.querySelector('video');
        }
        return null;
    }

    // Check if the video is playing
    function isVideoPlaying(video)
    {
        return video && !video.paused && !video.ended && video.readyState > 2;
    }

    // Enable PiP for the video with a user gesture
    async function enablePiP()
    {
        const video = getVideoElement();

        if (!video || !isVideoPlaying(video))
        {
            return;
        }

        try
        {
            // If PiP is not already active, request PiP mode
            if (!document.pictureInPictureElement && !isPiPRequested)
            {
                await video.requestPictureInPicture();
                isPiPRequested = true; // Set flag to track PiP request
            }
        } catch (error)
        {
            console.error('PiP error:', error);
        }
    }

    // Disable PiP
    async function disablePiP()
    {
        if (document.pictureInPictureElement)
        {
            try
            {
                await document.exitPictureInPicture();
                isPiPRequested = false; // Reset the PiP flag when exiting PiP
            } catch (error)
            {
                console.error('Error exiting PiP:', error);
            }
        }
    }

    // Handle visibility change (tab switch)
    function handleVisibilityChange()
    {
        isTabActive = !document.hidden;

        if (document.hidden)
        {
            // Tab is inactive, disable PiP if active
            disablePiP();
        } else
        {
            // Tab is active, check if PiP should be enabled
            const video = getVideoElement();
            if (video && isVideoPlaying(video) && !document.pictureInPictureElement && !isPiPRequested)
            {
                console.log("Tab active, waiting for user interaction to enable PiP.");
            }
        }
    }

    // Monitor video state
    function monitorVideo()
    {
        if (!isTabActive)
        {
            const video = getVideoElement();
            if (video && isVideoPlaying(video) && !document.pictureInPictureElement)
            {
                console.log("Tab inactive, awaiting user interaction for PiP.");
            }
        }
    }

    // Register media session actions (for Chrome 120+)
    try
    {
        navigator.mediaSession.setActionHandler("enterpictureinpicture", async () =>
        {
            const video = getVideoElement();
            if (video && isVideoPlaying(video))
            {
                await video.requestPictureInPicture();
                isPiPRequested = true; // Track the user gesture
            }
        });
    } catch (error)
    {
        console.log("The enterpictureinpicture action is not yet supported.");
    }

    // Initialize event listeners
    function initializeEventListeners()
    {
        // Main visibility change listener
        document.addEventListener('visibilitychange', handleVisibilityChange, false);

        // Monitor video state periodically
        setInterval(monitorVideo, 500);

        // Handle YouTube's dynamic navigation
        if (window.location.hostname.includes('youtube.com'))
        {
            window.addEventListener('yt-navigate-finish', () =>
            {
                setTimeout(() =>
                {
                    if (isTabActive)
                    {
                        const video = getVideoElement();
                        if (video && isVideoPlaying(video))
                        {
                            console.log("Waiting for user interaction to enable PiP after navigation.");
                        }
                    }
                }, 1000);
            });
        }

        // Add click event to trigger PiP manually
        const video = getVideoElement();
        if (video)
        {
            video.addEventListener('click', async (e) =>
            {
                // Only request PiP if the video is playing and not paused
                if (!video.paused)
                {
                    // Request PiP when the user clicks the video
                    await enablePiP();
                }
            });
        }
    }

    // Initial check
    handleVisibilityChange();

    // Start the script
    if (document.readyState === 'loading')
    {
        document.addEventListener('DOMContentLoaded', initializeEventListeners);
    } else
    {
        initializeEventListeners();
    }
})();
