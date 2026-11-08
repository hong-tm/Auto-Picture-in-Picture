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

An advanced userscript that automatically triggers Picture-in-Picture (PiP) mode for YouTube, YouTube Music, Bilibili and Bilibili Live videos. This script provides a seamless video-watching experience across multiple browsers, enhancing the native PiP functionality with additional features and broader compatibility.

> **Note**: Many browsers now offer native Auto PiP features in beta/experimental mode.

## Changelog

### v1.6.0

- New userscript menu: a master switch for automatic PiP and a "Close PiP on return" switch. Settings persist through the script manager's storage (`GM_setValue`), or the site's `localStorage` when that is unavailable. With the master switch off, the script also removes its Media Session PiP handler, so the browser's native Auto PiP no longer opens windows through it; the player's own PiP button still works.
- Cooperation with Chrome's native Auto PiP: a PiP window the script did not request while the page is hidden (native Auto PiP, media controls, or the site's own player) is left to the browser, which closes it when the page returns; the script no longer races it with its own exit. If the browser leaves it open, the script closes it about 1 second after the page returns. A PiP you opened yourself on a visible page still closes on return by default — the new menu switch can turn that off.
- A gestureless `NotAllowedError` on a hidden page is expected on stock Chrome and is no longer logged as an error; the next hide attempts again. The retry loop that only ran on browsers without `mediaSession` (none shipped today) was removed.
- New sites: Bilibili live rooms (`live.bilibili.com`, selectors verified on real rooms) and YouTube Music (`music.youtube.com`).
- The video observer ignores mutations that cannot have added a video, so chat iframes and busy pages no longer trigger discovery scans.
- YouTube Shorts discovery uses the current `#shorts-player video` selector; the stale `ytd-reel-video-renderer[is-active]` selector (no longer present on the live site) was removed.

### v1.5.4

- After leaving YouTube Shorts for a normal video, auto PiP uses the watch player again. YouTube keeps the paused Shorts video in the page, and the script used to pick it.
- The script no longer replaces the site's Media Session metadata or clears its play, pause and seek handlers. OS media controls keep the video title, channel and thumbnail.
- PiP event listeners move to the current video after PiP closes, so a video found while PiP was open cannot block later automatic entries.
- On Bilibili, the navigation watch uses the Navigation API, so route changes inside the page are seen from the userscript sandbox without patching the page's `history`. Browsers without this API (Firefox before 147, for example) fall back to `popstate` and the DOM observer.
- A replacement video that starts playing after the script finds it now enters PiP while the page is hidden. The same applies when the page is hidden during buffering.
- When a site removes the video that is in PiP, PiP moves to the new video. Chromium keeps the removed element as the PiP element without an event, which used to block the new entry.
- Window focus changes no longer close PiP that you opened yourself on a visible page. Only page visibility now starts or closes automatic PiP.
- If you close PiP while the page is hidden, it stays closed for later videos until you return to the page.
- Browsers without the PiP API no longer log errors and retry on every tab switch. The retry budget resets after a failed entry. The script no longer fails when `document.documentElement` does not exist yet at `document-start`.

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
| **Menu Switches**      | Master switch and close-on-return switch in the userscript menu     |
| **Tab Management**     | Intelligently handles tab switching with user interaction detection |
| **Pause Handling**     | Prevents PiP activation during video pauses                         |
| **Cross-Browser**      | Consistent experience across Chrome, Edge, and Brave                |
| **Error Resilience**   | Expected rejections are handled quietly; no busy retry loops        |

</details>

## Browser Compatibility

<details open>
<summary><b>Native Auto PiP Support Status</b></summary>
<br>

| Browser | Native Auto PiP | Status         | Available In                                                |
| ------- | --------------- | -------------- | ----------------------------------------------------------- |
| Chrome  | ✅              | Gradual rollout | Chrome 134+ (flag `#auto-picture-in-picture-for-video-playback` forces it on) |
| Firefox | ✅              | Experimental   | Firefox 130+                                                |
| Edge    | ❓              | Beta           | Edge 137+ (Chromium-based)                                  |
| Brave   | ❓              | Beta           | Brave 1.63+                                                 |
| Safari  | ❓              | Not Available  | -                                                           |

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

> **Minimize does not trigger?** A minimized window hides the page with no user gesture on it, and a userscript cannot create one, so the script's own request only succeeds within ~5 seconds after your last click. For minimize (and fully covered windows), enable the native path above: the site permission "Automatically enter Picture-in-Picture mode" plus `#auto-picture-in-picture-for-video-playback`. Chrome then calls the media-session action the script registers and opens PiP without a gesture. The native path needs media that is playing and was audible within the last two seconds in the top frame; muted videos and iframe players keep the script's click-based path.

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
- The official Media Session automatic PiP path works only when Chrome decides the page is eligible and provides its PiP request token. Eligibility includes media that was audible within the last two seconds and lives in the top frame; muted videos and iframe players rely on the script's gesture-based path.
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
