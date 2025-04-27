<!-- AUTO PICTURE-IN-PICTURE -->
<div align="center">
  <h1>Auto Picture-in-Picture</h1>
  <p>A seamless Picture-in-Picture experience for YouTube and Bilibili</p>
  
  <p>
    <a href="https://greasyfork.org/zh-CN/scripts/516762-auto-picture-in-picture"><img src="https://img.shields.io/badge/Install-GreasyFork-green.svg" alt="Install on GreasyFork"></a>
    <img src="https://img.shields.io/badge/Chrome-Supported-success.svg" alt="Chrome">
    <img src="https://img.shields.io/badge/Brave-Supported-success.svg" alt="Brave">
    <img src="https://img.shields.io/badge/Edge-Not%20Supported-red.svg" alt="Edge">
    <img src="https://img.shields.io/badge/Chrome-%3E%3D120-blue.svg" alt="Chrome Version">
    <a href="https://afdian.com/a/h1789"><img src="https://img.shields.io/badge/Support-Afdian-blue.svg" alt="Support on Afdian"></a>
  </p>

![Demo](https://github.com/user-attachments/assets/2a61bb9e-03a9-418f-8db6-073c98e2fcd9)

</div>

## Table of Contents

- [Table of Contents](#table-of-contents)
- [Overview](#overview)
- [Key Features](#key-features)
- [Browser Setup](#browser-setup)
  - [1. Enable Auto PiP Feature](#1-enable-auto-pip-feature)
  - [2. Configure Chrome Flags](#2-configure-chrome-flags)
  - [3. Enable Developer Mode](#3-enable-developer-mode)
- [Visual Examples](#visual-examples)
  - [PiP Interface (Chrome)](#pip-interface-chrome)
- [Technical Implementation](#technical-implementation)
- [Project Statistics](#project-statistics)
- [Resources](#resources)
- [Support](#support)

## Overview

An advanced userscript that automatically triggers Picture-in-Picture (PiP) mode for YouTube and Bilibili videos. Built with Chrome's latest Picture-in-Picture API, this script provides a seamless video-watching experience similar to the Arc browser's implementation.

> **Note**: Requires Chrome 120+ for optimal functionality with the new Auto Picture-in-Picture API.

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

</details>

## Browser Setup

<details open>
<summary><b>Chrome/Brave Configuration</b></summary>
<br>

### 1. Enable Auto PiP Feature

```
Settings → Privacy and Security → Site Settings → Additional Permissions
```

Enable "**Automatically enter Picture-in-Picture mode**"

### 2. Configure Chrome Flags

Navigate to `chrome://flags` and enable:

- `Auto picture in picture video heuristics`
- `Auto picture in picture for video playback`

### 3. Enable Developer Mode

Required for userscript installation

</details>

## Visual Examples

<details open>
<summary><b>Configuration Screenshots</b></summary>
<br>

### PiP Interface (Chrome)

![interface](https://github.com/user-attachments/assets/43697cdd-c785-4d83-bbf8-6d0bbc45f0a3)

![PiP Implementation](https://github.com/user-attachments/assets/0a4740d9-088a-4f07-a702-6baa55f66dc6)

</details>

## Technical Implementation

<details>
<summary><b>Chrome Media Session API</b></summary>
<br>

- Utilizes `navigator.mediaSession` API for PiP control
- Custom action handlers for PiP state management
- Bypasses standard interaction requirements
- Maintains native-like experience

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

| Resource                             | Link                                                                                     |
| ------------------------------------ | ---------------------------------------------------------------------------------------- |
| Chrome Auto PiP Documentation        | [Official Docs](https://developer.chrome.com/blog/automatic-picture-in-picture?hl=zh-cn) |
| Picture-in-Picture API Specification | [W3C Spec](https://w3c.github.io/picture-in-picture)                                     |

</details>

## Support

If you find this userscript helpful, consider supporting its development:

[![Support on Afdian](https://img.shields.io/badge/Support-Afdian-blue.svg)](https://afdian.com/a/h1789)
