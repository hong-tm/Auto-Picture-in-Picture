# 🌟 YouTube and Bilibili Auto Picture-in-Picture (PiP) Userscript

> **Currently Only Compatible with Chrome and Brave! Edge is Not Supported**

This userscript automatically triggers Picture-in-Picture (PiP) mode while watching YouTube and Bilibili videos. It handles tab switching and playback status changes, providing a smooth video-watching experience. Inspired by the Arc browser experience, it was developed with AI assistance. Future maintenance may be sporadic.

🎉 **Enjoy the smoothest PiP experience!**

![GIF Preview](https://github.com/user-attachments/assets/2a61bb9e-03a9-418f-8db6-073c98e2fcd9)

---

## 🔻 Installation

- [Install on GreasyFork](https://greasyfork.org/zh-CN/scripts/516762-auto-picture-in-picture)

## ☕ Support the Author

- [aifadian](https://afdian.com/a/h1789)

---

## 🌟 Key Features

### 1. Automatic PiP Mode Activation

- 🔄 PiP mode is automatically triggered during video playback, allowing you to view the video in a floating window while multitasking or browsing other pages.
- ⚡ If you switch tabs, PiP mode will wait for user interaction to activate.

### 2. Prevents PiP Trigger on Pause

- ❌ When the pause button is clicked, PiP mode will not be triggered, preventing accidental PiP entry.

### 3. Tab Switching Handling

- 🔄 When you return to the video tab, PiP remains in standby and activates only when the video is clicked.

### 4. Video Click Event

- 🎬 PiP mode is triggered when the video is clicked, as long as it’s playing.

### 5. Supports Media Session API (Chrome 120+)

- 📱 Uses `navigator.mediaSession` API to set "Enter PiP" action, enabling control of PiP via media sessions.

### 6. Bypasses User Interaction Requirement

- ✅ Unlike other scripts, this one activates PiP without requiring page interaction.

---

## ⚙️ Setup Instructions for Chrome

To ensure the script works correctly, follow these steps:

1. **Open Chrome Settings**

   - Click the "three dots" icon in the upper-right corner and select "Settings".

2. **Access Site Settings**

   - Go to "Privacy and Security" → "Site Settings".

3. **Enable Auto PiP Mode**

   - Under "Permissions," select "Additional Permissions Settings".
   - Locate "Automatically enter Picture-in-Picture mode" and allow sites to use this feature automatically.

4. **Enable Developer Mode for Extensions**

5. **Enable Chrome Flags**
   - Go to `chrome://flags` and enable:
     - `Auto picture in picture video heuristics`
     - `Auto picture in picture for video playback`

---

![pip](https://github.com/user-attachments/assets/28be7dfa-a5cf-46fc-bea2-dedb48b776d1)

![pip-example](https://github.com/user-attachments/assets/0a4740d9-088a-4f07-a702-6baa55f66dc6)
