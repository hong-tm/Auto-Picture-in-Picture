# 浏览器差异与已知未修

## 支持概览

Chrome / Edge / Brave（Chromium 系）为主力；Firefox 130+ 实验性（README 有独立设置章节：`about:settings#experimental` 开 tab-switch 自动 PiP）；Safari 走 `webkitSetPresentationMode` 回退路径。

## 差异（坑源）

- **Chromium**：移除正在 PiP 的 video 后 `pictureInPictureElement` 仍指向脱离 DOM 的元素且**不发 leave 事件** → 判「PiP 开着」必须加 `isConnected`。
- **Chrome 134+ 原生 Auto PiP**（逐步推送，flag `#auto-picture-in-picture-for-video-playback` 可立即启用）：调页面注册的 `enterpictureinpicture` action，handler 内 `requestPictureInPicture` 免手势，返回页面浏览器自动关窗。资格 = 顶层框架 + 最近 2 秒可听 + 播放中 + 音频焦点 + handler 已注册 + MEI/站点权限。静音视频与 iframe 内媒体不走原生路径。相关 flags：`#browser-initiated-automatic-picture-in-picture`（无 handler 时浏览器直接开窗）、`#auto-picture-in-picture-on-window-occluded`（遮挡）；`#media-session-enter-picture-in-picture` 已转正默认。
- **`HTMLVideoElement.autoPictureInPicture`** 已于 2022 年从 Chromium 删除，不可用。
- **Firefox**：Xray 隔离（见 code-map SPA 导航行）；PiP 130+ 实验性。
- **Safari**：`webkitSetPresentationMode` 回退。

## 已知未修（有意保留，别顺手改）

- `navigator.brave?.isBrave` 真值判断测的是未调用的函数引用（harness 桩为 `() => Promise.resolve(true)`，恒真）。
- Brave/Edge 的 `video.focus()` + `video.play()` 分支（fenced-guards 钉为字节不变）。
- 明确不做：通用站点探测、快捷键、Document PiP。
