# 浏览器差异与已知未修

## 支持概览

Chrome / Edge / Brave（Chromium 系）为主力；Firefox 130+ 实验性（README 有独立设置章节：`about:settings#experimental` 开 tab-switch 自动 PiP）；Safari 走 `webkitSetPresentationMode` 回退路径。

## 差异（坑源）

- **Chromium**：移除正在 PiP 的 video 后 `pictureInPictureElement` 仍指向脱离 DOM 的元素且**不发 leave 事件** → 判「PiP 开着」必须加 `isConnected`。
- **Chromium auto-PiP 所有权跟随动作而非请求**：media-session `enterpictureinpicture` action 一旦在隐藏周期内触发，返回时就可能有浏览器侧的关闭在途——**不管窗口最终由哪个 `requestPictureInPicture` 赢下打开**；useraction 不触发浏览器关窗，只是脚本关闭晚 1 秒，无碍（真机 2026-11-11 实锤：脚本请求赢下开窗、误判脚本所有并立即 exit，与浏览器自己的关闭竞争 → `exitPictureInPicture` 永不返回、无 leave、元素残留 → 页面黑屏占位、回不去）。脚本侧对策：隐藏页上浏览器动作一到（`enablePiP` 首个守卫前）就把窗口标为浏览器所有，返回走 1 秒让行 + 复查；脚本重入不清除该标记（窗口可能被复用，浏览器返回时仍会关它）；不按 `enterPictureInPictureReason` 门控（旧版 Chromium 无该字段）。
- **Chrome 134+ 原生 Auto PiP**（切标签页触发，默认开启）：调页面注册的 `enterpictureinpicture` action，handler 内 `requestPictureInPicture` 免手势，返回页面浏览器自动关窗。资格 = 顶层框架 + 最近 2 秒可听 + 播放中 + 音频焦点 + handler 已注册 + MEI/站点权限。静音视频与 iframe 内媒体不走原生路径。官方文档写明的触发只有切标签页；整窗遮挡要 `#auto-picture-in-picture-on-window-occluded`（实验，默认关，Windows/macOS/Linux/ChromeOS）。最小化不触发：Chromium 把最小化窗口映射为 `kHidden`，auto-PiP helper 对该状态明确不做任何事（只有 kOccluded 进、kVisible 出），最小化仍需 ~5 秒内页面点击或保持 PiP 窗口。action handler 收到 `details.enterPictureInPictureReason`：`useraction`（浏览器 UI 按钮）/ `contentoccluded`（切页或整窗遮挡）/ `other`，旧版本可能没有该字段。页面注册了 handler 时 `#browser-initiated-automatic-picture-in-picture` 不起作用（handler 优先）。相关 flags：`#browser-initiated-automatic-picture-in-picture`（无 handler 时浏览器直接开窗）、`#auto-picture-in-picture-on-window-occluded`（遮挡）；`#media-session-enter-picture-in-picture` 已转正默认。
- **`HTMLVideoElement.autoPictureInPicture`** 已于 2022 年从 Chromium 删除，不可用。
- **Firefox**：Xray 隔离（见 code-map SPA 导航行）；PiP 130+ 实验性。
- **Safari**：`webkitSetPresentationMode` 回退。

## 已知未修（有意保留，别顺手改）

- 可见页上排队的动作会被有意丢弃（flush 的 `document.hidden` 门控，有测试钉住）：脚本请求在途、页面恰好恢复可见时到达的用户点击会丢——窄竞态，浏览器 UI 点击通常由浏览器自己直接处理。
- 脚本请求在途时到达的换片重扫同样被丢弃（预存行为，v1.6.1 前对在途期一切调用都直接 return）：A 的请求未落定、B 替换 A 时，B 的 `enablePiP` 在 pending 守卫处返回；A 若失败无人补跑 B，只能等下次可见性变化或 DOM 变动。窄竞态，未修。
- 排队浏览器动作的重放（`#browserQueued` → `enablePiP(true, true)`）不复查总开关：动作入队后、重放前别的标签页关掉总开关时，自动动作（contentoccluded）仍会开窗。入口侧已按 reason + 总开关拦截，仅重放路径漏；毫秒级窗口、后果良性（多开一次窗），未修。

- `navigator.brave?.isBrave` 真值判断测的是未调用的函数引用：真实 Brave 里结果仍正确（`navigator.brave` 只在 Brave 暴露且为真值函数，其他浏览器走 UA 回退）。该分支只有 fenced-guards 字节围栏、无行为测试——harness 有 `options.brave` 桩，但没有任何测试传入它。
- Brave/Edge 的 `video.focus()` + `video.play()` 分支（fenced-guards 钉为字节不变）。
- 旧版 `webkitSetPresentationMode` 分支只能进不能退（`disablePiP` 看 `document.pictureInPictureElement`，该路径不设置它，也不发标准 enter/leave 事件）。Safari 13.1+ 走标准 API，不受影响。
- `#debounce` 以 `fn.toString()` 为键：`#scheduleBiliRescan` 依赖「同源码的新闭包共用一个定时器」来合并 `currententrychange` + `popstate`。新增调用点的函数体不能与现有的逐字相同。
- 明确不做：通用站点探测、快捷键、Document PiP。
