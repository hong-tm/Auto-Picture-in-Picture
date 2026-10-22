<!-- AUTO PICTURE-IN-PICTURE -->
<div align="center">
  <h1>Auto Picture-in-Picture</h1>
  <p>A seamless Picture-in-Picture experience for YouTube and Bilibili</p>
  
  <p>
    <a href="https://greasyfork.org/zh-CN/scripts/516762-auto-picture-in-picture"><img src="https://img.shields.io/badge/Install-GreasyFork-green.svg" alt="Install on GreasyFork"></a>
    <img src="https://img.shields.io/badge/Chrome-Supported-success.svg" alt="Chrome">
    <img src="https://img.shields.io/badge/Brave-Supported-success.svg" alt="Brave">
    <img src="https://img.shields.io/badge/Edge-Supported-success.svg" alt="Edge">
    <img src="https://img.shields.io/badge/Chrome-%3E%3D120-blue.svg" alt="Chrome Version">
    <a href="https://afdian.com/a/h1789"><img src="https://img.shields.io/badge/Support-Afdian-blue.svg" alt="Support on Afdian"></a>
  </p>

  <p>
    <b>Language:</b> 
    <a href="README.md">English</a> | 
    <a href="README_zh.md">中文</a>
  </p>

![Demo](https://github.com/user-attachments/assets/2a61bb9e-03a9-418f-8db6-073c98e2fcd9)

</div>

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Overview](#overview)
- [Key Features](#key-features)
- [Browser Compatibility](#browser-compatibility)
- [Browser Setup](#browser-setup)
  - [Chrome/Brave/Edge Setup](#chromebraveedge-setup)
  - [Firefox Setup](#firefox-setup)
  - [Enable Developer Mode](#enable-developer-mode)
- [Visual Examples](#visual-examples)
  - [PiP Interface (Chrome with Updated Controls)](#pip-interface-chrome-with-updated-controls)
- [Technical Implementation](#technical-implementation)
- [Project Statistics](#project-statistics)
- [Resources](#resources)
- [Known limitations](#known-limitations)
- [Support](#support)

## Overview

An advanced userscript that automatically triggers Picture-in-Picture (PiP) mode for YouTube and Bilibili videos. This script provides a seamless video-watching experience across multiple browsers, enhancing the native PiP functionality with additional features and broader compatibility.

> **Note**: Many browsers now offer native Auto PiP features in beta/experimental mode.

## Changelog

### v1.5.3

- Leave return-to-page closure to the browser for PiP requested through its Media Session action, avoiding a competing script exit. Script-triggered PiP still closes on return. The distinction uses the actual request source, not browser version or flags.

### v1.5.2

- Returning to a visible page exits PiP even before window focus returns. Pending PiP requests that finish after the return are also closed.
- YouTube Shorts selects the current player instead of a cached video from an earlier Short. Navigating while PiP is open preserves its leave listener so closing PiP does not block later requests.

### v1.5.1

- Visible pages no longer enter PiP on window blur, avoiding unwanted popups when using a second monitor. Automatic requests follow page visibility; app switches that keep the page visible do not trigger them.
- A rejected PiP request no longer marks PiP as active or blocks later requests. The real browser error is reported. Chromium may require user activation or a browser-provided automatic PiP action; registering Media Session does not bypass this requirement.
- Trigger timing is tighter: a request with active user activation starts immediately, return-to-page exit is not delayed by the old debounce, pending requests are coalesced, and stale hidden requests are cancelled when playback stops or the page becomes visible.

### v1.5.0

- Switching to another window now enters PiP, not only switching tabs. The active state combines tab visibility with window focus (a new `window` `blur`/`focus` listener alongside `visibilitychange`), so a window switch during playback triggers auto PiP the same way a tab switch does. Fixes issue #4.
- Cleanup now runs on `pagehide` when the page leaves normally and is skipped for bfcache entries, so returning to a cached page keeps the controller active.

### v1.4.1

- PiP enter and leave events are now tracked on the video element instead of the document. That matches the API spec and keeps state tracking correct on engines that do not bubble these events.
- Switching videos inside Bilibili keeps auto PiP working. The script watches the site's in-page navigation, locks the new video, and re-enters PiP when the tab is hidden.
- The DOM observer stops once a video is locked, so the script does less work while a video plays.
- Removed dead code and the call to `mediaSession.setAutoplayPolicy`, an API no browser ships.
- The regression suite runs with `node test/run.js`.

## Key Features

<details open>
<summary><b>Automatic PiP Functionality</b></summary>
<br>

| Feature                | Description                                                         |
| ---------------------- | ------------------------------------------------------------------- |
| **Smart Activation**   | Automatically enters PiP mode during active video playback          |
| **Tab Management**     | Intelligently handles tab switching with user interaction detection |
| **Pause Handling**     | Prevents PiP activation during video pauses                         |
| **Click Optimization** | Enhanced click event handling for better user experience            |
| **Cross-Browser**      | Consistent experience across Chrome, Edge, and Brave                |
| **Error Resilience**   | Robust error handling with automatic retry mechanisms               |

</details>

## Browser Compatibility

<details open>
<summary><b>Native Auto PiP Support Status</b></summary>
<br>

| Browser | Native Auto PiP | Status        | Available In               |
| ------- | --------------- | ------------- | -------------------------- |
| Chrome  | ✅              | Beta          | Chrome 137.0.7151.15+      |
| Firefox | ✅              | Experimental  | Firefox 130+               |
| Edge    | ❓              | Beta          | Edge 137+ (Chromium-based) |
| Brave   | ❓              | Beta          | Brave 1.63+                |
| Safari  | ❓              | Not Available | -                          |

</details>

## Browser Setup

### Chrome/Brave/Edge Setup

<details open>
<summary><b>Using Native Auto PiP</b></summary>
<br>

1. Enable Auto PiP Feature (Settings)

   ```
   Settings → Privacy and Security → Site Settings → Additional Permissions
   ```

   Enable "**Automatically enter Picture-in-Picture mode**"

2. Configure Chrome Flags
   Navigate to `chrome://flags` and enable:
   - `#auto-picture-in-picture-for-video-playback`
   - `#video-picture-in-picture-controls-update-2024`
   - `#media-session-enter-picture-in-picture`
   - `#document-picture-in-picture-animate-resize`

> **⚠️ Important Note for Chrome 137.0.7151.15+ Users:**
> If you're using Chrome Beta 137.0.7151.15 or above, also enable:
>
> - `#browser-initiated-automatic-picture-in-picture`
>
> With this flag enabled and native Auto PiP configured, this userscript becomes optional as the browser now handles automatic PiP functionality natively.

</details>

> **Important:** The script can register the Media Session handler and attempt a request, but it cannot grant Chrome's automatic PiP permission. If Chrome rejects a request with `NotAllowedError`, enabling more retries or calling the handler directly cannot create a user gesture.
>
> `#auto-picture-in-picture-on-window-occluded` controls automatic PiP when another window fully covers Chrome. `#browser-initiated-automatic-picture-in-picture` lets Chrome open standard video PiP when a site has no `enterpictureinpicture` handler. These flags are separate. If you enable either native path, test the browser behavior with the userscript disabled first.
>
> With all flags left at `Default`, the userscript still keeps its own fallback path. Chrome may require a fresh click for a later direct request, especially for window minimization.

### Firefox Setup

<details open>
<summary><b>Using Native Auto PiP (Experimental)</b></summary>
<br>

1. Enable Experimental Auto PiP Feature
   ```
   Type about:settings#experimental in the address bar
   ```
2. Check the box for "**picture-in-picture auto-open on tab switch**"

3. For manual PiP control:
   ```
   Settings → General → Browsing
   ```
   Ensure "**Enable picture-in-picture video controls (E)**" is checked

</details>

<details open>
<summary><b>Zen Browser (Firefox-based)</b></summary>
<br>

Zen Browser is based on Firefox and includes similar Auto PiP functionality. The setup process is similar:

1. Navigate to `about:settings#experimental` in Zen Browser
2. Enable the experimental PiP features
3. For best results, ensure you're using Zen Browser version 120 or higher

Note: Zen Browser often includes additional performance optimizations for video playback, which can enhance the PiP experience.

</details>

### Enable Developer Mode

Required for userscript installation in all browsers

## Visual Examples

<details open>
<summary><b>Configuration Screenshots</b></summary>
<br>

### PiP Interface (Chrome with Updated Controls)

![interface](https://github.com/user-attachments/assets/43697cdd-c785-4d83-bbf8-6d0bbc45f0a3)

![PiP Implementation](https://github.com/user-attachments/assets/0a4740d9-088a-4f07-a702-6baa55f66dc6)

</details>

## Known limitations

- The script does not control Chrome flags or site permissions.
- Chrome may allow the first PiP request after a click and reject later direct requests after the transient activation expires.
- The official Media Session automatic PiP path works only when Chrome decides the page is eligible and provides its PiP request token.
- Window minimization and window occlusion are separate browser states. The script can observe page visibility, but a userscript cannot force Chrome to grant automatic PiP authorization for every minimized-window cycle.

## Technical Implementation

<details>
<summary><b>Advanced Browser APIs</b></summary>
<br>

- Utilizes `navigator.mediaSession` API for PiP control
- Custom action handlers for PiP state management
- Cross-browser compatibility layer
- Intelligent feature detection
- Progressive enhancement approach
- Graceful fallbacks for unsupported browsers

</details>

## Project Statistics

<details open>
<summary><b>Star History</b></summary>
<br>

<a href="https://www.star-history.com/#hong-tm/Auto-Picture-in-Picture&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=hong-tm/Auto-Picture-in-Picture&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=hong-tm/Auto-Picture-in-Picture&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=hong-tm/Auto-Picture-in-Picture&type=Date" />
 </picture>
</a>

</details>

## Resources

<details open>
<summary><b>Documentation & References</b></summary>
<br>

| Resource                              | Link                                                                                                                                                                 |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chrome Auto PiP Documentation         | [Official Docs](https://developer.chrome.com/blog/automatic-picture-in-picture?hl=zh-cn)                                                                             |
| Firefox Auto PiP (Experimental)       | [Firefox Blog](https://blog.nightly.mozilla.org/2024/08/26/streamline-your-screen-time-with-auto-open-picture-in-picture-and-more-these-weeks-in-firefox-issue-166/) |
| Picture-in-Picture API Specification  | [W3C Spec](https://w3c.github.io/picture-in-picture)                                                                                                                 |
| Firefox Picture-in-Picture User Guide | [Firefox Support](https://support.mozilla.org/en-US/kb/about-picture-picture-firefox)                                                                                |

</details>

## Support

If you find this userscript helpful, consider supporting its development:

[![Support on Afdian](https://img.shields.io/badge/Support-Afdian-blue.svg)](https://afdian.com/a/h1789)
