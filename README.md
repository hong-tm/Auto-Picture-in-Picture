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
- [Support](#support)

## Overview

An advanced userscript that automatically triggers Picture-in-Picture (PiP) mode for YouTube and Bilibili videos. This script provides a seamless video-watching experience across multiple browsers, enhancing the native PiP functionality with additional features and broader compatibility.

> **Note**: Many browsers now offer native Auto PiP features in beta/experimental mode.

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
