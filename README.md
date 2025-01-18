# Auto Picture-in-Picture (PiP) for YouTube and Bilibili

[![Install on GreasyFork](https://img.shields.io/badge/Install-GreasyFork-green.svg)](https://greasyfork.org/zh-CN/scripts/516762-auto-picture-in-picture)
[![Chrome](https://img.shields.io/badge/Chrome-Supported-success.svg)]()
[![Brave](https://img.shields.io/badge/Brave-Supported-success.svg)]()
[![Edge](https://img.shields.io/badge/Edge-Not%20Supported-red.svg)]()

A sophisticated userscript that enhances your video-watching experience by automatically managing Picture-in-Picture (PiP) mode for YouTube and Bilibili platforms. Inspired by Arc browser's functionality and developed with modern web technologies.

![Demo](https://github.com/user-attachments/assets/2a61bb9e-03a9-418f-8db6-073c98e2fcd9)

## Features

### Advanced PiP Management

- **Intelligent Activation**: Seamlessly triggers PiP mode during video playback
- **Smart Tab Switching**: Implements sophisticated tab management with user interaction awareness
- **Pause Protection**: Prevents unwanted PiP activation during video pauses
- **Click Event Optimization**: Refined click handling for optimal user experience

### Technical Capabilities

- **Media Session API Integration** (Chrome 120+)
  - Leverages `navigator.mediaSession` API for enhanced PiP control
  - Implements custom PiP action handlers
- **User Interaction Bypass**
  - Advanced implementation that circumvents standard interaction requirements
  - Maintains smooth functionality without compromising user experience

## Installation Guide

### Chrome/Brave Setup

1. **Configure Browser Settings**

   ```
   Settings → Privacy and Security → Site Settings → Additional Permissions
   ```

   Enable **"Automatically enter Picture-in-Picture mode"**

2. **Enable Required Flags**
   Navigate to `chrome://flags` and enable:

   - `Auto picture in picture video heuristics`
   - `Auto picture in picture for video playback`

3. **Enable Developer Mode**
   Required for userscript functionality

### PiP example

![PiP Settings](https://github.com/user-attachments/assets/28be7dfa-a5cf-46fc-bea2-dedb48b776d1)

### Implementation Example

![PiP Implementation](https://github.com/user-attachments/assets/0a4740d9-088a-4f07-a702-6baa55f66dc6)

## Support Development

If you find this tool valuable, consider supporting the development:

- [Afdian Support Page](https://afdian.com/a/h1789)
