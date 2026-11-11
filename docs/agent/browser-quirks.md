# 浏览器差异与已知未修

## 支持概览

Chrome / Edge / Brave（Chromium 系）为主力；Firefox 130+ 实验性（README 有独立设置章节：`about:settings#experimental` 开 tab-switch 自动 PiP）；Safari 走 `webkitSetPresentationMode` 回退路径。

## 差异（坑源）

- **Chromium**：移除正在 PiP 的 video 后 `pictureInPictureElement` 仍指向脱离 DOM 的元素且**不发 leave 事件** → 判「PiP 开着」必须加 `isConnected`。
- **Chromium auto-PiP 所有权跟随动作而非请求**：media-session `enterpictureinpicture` action 一旦触发，返回可见时浏览器就关闭这扇窗——**不管窗口最终由哪个 `requestPictureInPicture` 赢下打开**（真机 2026-11-11 实锤：脚本请求赢下开窗、误判脚本所有并立即 exit，与浏览器自己的关闭竞争 → `exitPictureInPicture` 永不返回、无 leave、元素残留 → 页面黑屏占位、回不去）。脚本侧对策：补跑的浏览器动作发现 PiP 已开时（隐藏页）把窗口标回浏览器所有（`enablePiP` 首个守卫），返回走 1 秒让行。
- **Chrome 134+ 原生 Auto PiP**（切标签页触发，默认开启）：调页面注册的 `enterpictureinpicture` action，handler 内 `requestPictureInPicture` 免手势，返回页面浏览器自动关窗。资格 = 顶层框架 + 最近 2 秒可听 + 播放中 + 音频焦点 + handler 已注册 + MEI/站点权限。静音视频与 iframe 内媒体不走原生路径。官方文档写明的触发只有切标签页；整窗遮挡要 `#auto-picture-in-picture-on-window-occluded`（实验，默认关，Windows/macOS/Linux/ChromeOS）。最小化不触发：Chromium 把最小化窗口映射为 `kHidden`，auto-PiP helper 对该状态明确不做任何事（只有 kOccluded 进、kVisible 出），最小化仍需 ~5 秒内页面点击或保持 PiP 窗口。action handler 收到 `details.enterPictureInPictureReason`：`useraction`（浏览器 UI 按钮）/ `contentoccluded`（切页或整窗遮挡）/ `other`，旧版本可能没有该字段。页面注册了 handler 时 `#browser-initiated-automatic-picture-in-picture` 不起作用（handler 优先）。相关 flags：`#browser-initiated-automatic-picture-in-picture`（无 handler 时浏览器直接开窗）、`#auto-picture-in-picture-on-window-occluded`（遮挡）；`#media-session-enter-picture-in-picture` 已转正默认。
- **`HTMLVideoElement.autoPictureInPicture`** 已于 2022 年从 Chromium 删除，不可用。
- **Firefox**：Xray 隔离（见 code-map SPA 导航行）；PiP 130+ 实验性。
- **Safari**：`webkitSetPresentationMode` 回退。

## 已知未修（有意保留，别顺手改）

- 可见页上排队的动作会被有意丢弃（flush 的 `document.hidden` 门控，有测试钉住）：脚本请求在途、页面恰好恢复可见时到达的用户点击会丢——窄竞态，浏览器 UI 点击通常由浏览器自己直接处理。

- `navigator.brave?.isBrave` 真值判断测的是未调用的函数引用（harness 桩为 `() => Promise.resolve(true)`，恒真）。
- Brave/Edge 的 `video.focus()` + `video.play()` 分支（fenced-guards 钉为字节不变）。
- 旧版 `webkitSetPresentationMode` 分支只能进不能退（`disablePiP` 看 `document.pictureInPictureElement`，该路径不设置它，也不发标准 enter/leave 事件）。Safari 13.1+ 走标准 API，不受影响。
- `#debounce` 以 `fn.toString()` 为键：`#scheduleBiliRescan` 依赖「同源码的新闭包共用一个定时器」来合并 `currententrychange` + `popstate`。新增调用点的函数体不能与现有的逐字相同。
- 明确不做：通用站点探测、快捷键、Document PiP。
