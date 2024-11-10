# YouTube and Bilibili Auto Picture-in-Picture (PiP) Userscript

> For now only compatible to Chrome! Not yet support Edge

I created this userscript with the help of AI to automatically trigger Picture-in-Picture (PiP) mode while watching YouTube and Bilibili videos. It handles tab switching and video playback status changes, providing a seamless video-watching experience. It took some time, but I achieved the best results and really enjoy the previous experience on Arc browser. Maintenance may be sporadic since I am not very familiar with the development, as it's AI-assisted.

Enjoy the smoothest PiP experience available!

## Key Features:
### 1. **Automatic PiP Mode Activation**  
- PiP mode is automatically triggered when the video plays, allowing you to watch the video in a floating window while performing other tasks or browsing other pages.  
- If the tab is switched and the video is still playing, PiP will wait for user interaction to trigger.

### 2. **Prevents PiP Trigger on Pause**  
- When the pause button is clicked, PiP mode will not be automatically triggered, preventing accidental entry into PiP mode.

### 3. **Tab Switching Handling**  
- When switching back to the tab with the video, PiP will remain in standby mode and will only activate when the user clicks on the video.

### 4. **Video Click Event**  
- When the user clicks the video, PiP mode will be triggered if the video is playing.

### 5. **Supports Media Session API** (Chrome 120 and above)  
- The `navigator.mediaSession` API is used to set the "Enter PiP" action, allowing users to control PiP via media sessions.

---

This script enhances your video-watching experience by automatically enabling PiP, allowing efficient multitasking while watching videos. Feel free to reach out if you encounter any issues or need adjustments!

--- 

# YouTube 和 Bilibili 自动画中画 (PiP) 用户脚本

> 目前只适配 Chrome! Edge 有问题

我借助 AI 编写了 YouTube 和 Bilibili 视频播放时的画中画 (PiP) 模式。它处理标签切换和视频播放状态变化，提供无缝的视频观看体验。花费了一些时间，达到了最好的效果，很喜欢之前在 Arc 浏览器上的体验。维护可能随缘，因为不算太懂是依赖 AI 开发的。

请享受目前最丝滑的 PiP 体验！

## 主要功能：
### 1. **自动启用画中画 (PiP) 模式**  
- 当视频播放时，PiP 模式会自动触发，让你在浏览其他页面或执行其他操作时仍能观看视频。  
- 如果切换标签并且视频仍在播放，PiP 将等待用户交互来触发。

### 2. **防止暂停时触发 PiP**  
- 点击暂停按钮时，PiP 模式不会被自动触发，避免不小心进入 PiP 模式。

### 3. **标签切换处理**  
- 当切换到包含视频的标签时，PiP 会保持待命状态，并仅在用户点击视频时触发。

### 4. **视频点击事件**  
- 当用户点击视频时，如果视频正在播放，脚本会触发 PiP 模式。

### 5. **支持媒体会话 API**（Chrome 120 及以上）  
- 使用 `navigator.mediaSession` API 设置“进入 PiP”操作，允许用户通过媒体会话控制 PiP。


![Snipaste_2024-11-11_05-07-37](https://github.com/user-attachments/assets/a368329b-3363-443f-8f6a-c85e9abccd95)

![image](https://github.com/user-attachments/assets/0a4740d9-088a-4f07-a702-6baa55f66dc6)

![GIF 2024-11-11 5-04-15](https://github.com/user-attachments/assets/2a61bb9e-03a9-418f-8db6-073c98e2fcd9)
