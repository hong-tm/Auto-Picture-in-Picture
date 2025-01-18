# YouTube and Bilibili Auto Picture-in-Picture (PiP) Userscript

[![Install on GreasyFork](https://img.shields.io/badge/Install-GreasyFork-green.svg)](https://greasyfork.org/zh-CN/scripts/516762-auto-picture-in-picture)
[![Chrome](https://img.shields.io/badge/Chrome-Supported-success.svg)]()
[![Brave](https://img.shields.io/badge/Brave-Supported-success.svg)]()
[![Edge](https://img.shields.io/badge/Edge-Not%20Supported-red.svg)]()
[![Chrome Version](https://img.shields.io/badge/Chrome-%3E%3D120-blue.svg)]()

An advanced userscript that automatically triggers Picture-in-Picture (PiP) mode for YouTube and Bilibili videos. Built with Chrome's latest Picture-in-Picture API, this script provides a seamless video-watching experience similar to the Arc browser's implementation.

> **Note**: Requires Chrome 120+ for optimal functionality with the new Auto Picture-in-Picture API.

![Demo](https://github.com/user-attachments/assets/2a61bb9e-03a9-418f-8db6-073c98e2fcd9)

## Key Features

### Automatic PiP Functionality

- **Smart Activation**: Automatically enters PiP mode during active video playback
- **Tab Management**: Intelligently handles tab switching with user interaction detection
- **Pause Handling**: Prevents PiP activation during video pauses
- **Click Optimization**: Enhanced click event handling for better user experience

### Technical Implementation

- **Chrome Media Session API**
  - Utilizes `navigator.mediaSession` API for PiP control
  - Custom action handlers for PiP state management
- **User Interaction Enhancement**
  - Bypasses standard interaction requirements
  - Maintains native-like experience

## Browser Setup

### Chrome/Brave Configuration

1. **Enable Auto PiP Feature**

   ```
   Settings → Privacy and Security → Site Settings → Additional Permissions
   ```

   Enable "**Automatically enter Picture-in-Picture mode**"

2. **Configure Chrome Flags**
   Navigate to `chrome://flags` and enable:

   - `Auto picture in picture video heuristics`
   - `Auto picture in picture for video playback`

3. **Enable Developer Mode**
   Required for userscript installation

## Visual Examples

![PiP Settings](https://github.com/user-attachments/assets/28be7dfa-a5cf-46fc-bea2-dedb48b776d1)

### PiP in Action

![PiP Implementation](https://github.com/user-attachments/assets/0a4740d9-088a-4f07-a702-6baa55f66dc6)

## Support the Project

If you find this userscript helpful, consider supporting its development:

- [Support on Afdian](https://afdian.com/a/h1789)

## Related Resources

- [Chrome Auto PiP Documentation](https://developer.chrome.com/blog/automatic-picture-in-picture?hl=zh-cn)
- [Picture-in-Picture API Specification](https://w3c.github.io/picture-in-picture)
