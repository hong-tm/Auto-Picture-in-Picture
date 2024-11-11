## ☕Support the author 
[aifadian](https://afdian.com/a/h1789)

## 🔻Installation
[greasyfork](https://greasyfork.org/zh-CN/scripts/516762-auto-picture-in-picture)

## 🌟 **YouTube and Bilibili Auto Picture-in-Picture (PiP) Userscript**

> **Currently Only Compatible with Chrome and Brave! Edge is Not Supported**

I created this userscript with the help of AI to automatically trigger Picture-in-Picture (PiP) mode while watching YouTube and Bilibili videos. It handles tab switching and video playback status changes, providing a seamless video-watching experience. It took some time, but I achieved the best results and really enjoyed the previous experience on the Arc browser. Maintenance may be sporadic since it’s AI-assisted.

🎉 **Enjoy the smoothest PiP experience available!**

---

## 🌟 Key Features:

### 1. **Automatic PiP Mode Activation**
- 🔄 PiP mode is automatically triggered when the video plays, allowing you to watch the video in a floating window while performing other tasks or browsing other pages.
- ⚡ If the tab is switched and the video is still playing, PiP will wait for user interaction to trigger.

### 2. **Prevents PiP Trigger on Pause**
- ❌ When the pause button is clicked, PiP mode will not be automatically triggered, preventing accidental entry into PiP mode.

### 3. **Tab Switching Handling**
- 🔄 When switching back to the tab with the video, PiP will remain in standby mode and will only activate when the user clicks on the video.

### 4. **Video Click Event**
- 🎬 When the user clicks the video, PiP mode will be triggered if the video is playing.

### 5. **Supports Media Session API** (Chrome 120 and above)
- 📱 The `navigator.mediaSession` API is used to set the "Enter PiP" action, allowing users to control PiP via media sessions.

### 6. **Bypass User Interaction Requirement**
- ✅ Unlike other scripts that might be limited by browser security restrictions, this script doesn't require user interaction (like clicking on the page) to activate PiP mode.

---

## ⚡⚡⚡ To ensure the script works, please follow the instructions below:

### 1. **Open Chrome Settings**
- Click the "three dots" icon in the upper-right corner of Chrome and select "Settings".

### 2. **Access Site Settings**
- In the left menu, select "Privacy and Security," then click on "Site Settings".

### 3. **Adjust Permissions for Auto PiP Mode**
- Under the "Permissions" section, find and click on "Additional Permissions Settings".
- Locate "Automatically enter Picture-in-Picture mode" and make sure to select "Sites can automatically enter Picture-in-Picture mode". This will allow websites that support this feature to automatically enter PiP mode when playing videos.

### 4. Enable developer mode for extension

### 5. Chrome Flags
Open chrome://flags
Enable the following flags:
- Auto picture in picture video heuristics
- Auto picture in picture for video playback

---

![Snipaste_2024-11-11_05-07-37](https://github.com/user-attachments/assets/a368329b-3363-443f-8f6a-c85e9abccd95)

---

![image](https://github.com/user-attachments/assets/0a4740d9-088a-4f07-a702-6baa55f66dc6)

---

![GIF 2024-11-11 5-04-15](https://github.com/user-attachments/assets/2a61bb9e-03a9-418f-8db6-073c98e2fcd9)
