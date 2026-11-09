# 符号地图 — 任务入口与符号表

定位方式：全文搜索符号名（`class VideoController`、`#onVisibilityChange`…）。**本目录不写行号、行数、测试数**——它们随每次改动过期，过期即误导（见 AGENTS.md 根因 7）。

## 任务 → 入口

| 任务 | 符号 | 要点 |
|------|------|------|
| 加站点 | `VideoController.VIDEO_SELECTORS` | hostname `includes()` 按**插入序**匹配：更具体的键（`"live.bilibili.com"`）必须排在宽键（`"bilibili.com"`）之前，否则宽键先命中。`music.youtube.com` 无需单独键：`youtube.com` 的选择器直接命中其 `#movie_player video`。 |
| 改触发行为 | `#onVisibilityChange` | 唯一触发入口：隐藏+播放→进 PiP（`userActivation.isActive` 时同步，否则 300/100ms 定时器）；可见→退出 + `setupMediaSession()` 刷新（别的标签页可能刚切了总开关）。`enablePiP` 拒绝可见页的脚本请求，受 `Settings.enabled`（media-control 的 `browserAction` 绕过总开关）和 `#userDismissed` 约束。`#onVideoPlaying` 在隐藏页补进。 |
| PiP 请求与回退 | `VideoController.requestPictureInPicture` | 无 PiP API 时静默返回 false；Brave/Edge focus+play 变通；请求被拒→静默记日志返回 false，**无重试循环**（当前所有浏览器都有 `mediaSession`）。无新手势的 NotAllowedError 在原生 Chrome 上是预期，最小化场景尤其如此。 |
| 原生 vs 脚本退出的竞争 | `#onEnterPiP` / `#onLeavePiP` / `disablePiP` | 隐藏期无脚本请求在途时自发 `enterpictureinpicture`（`!#entryPending && document.hidden`）= 浏览器所有（原生 Auto PiP / 媒体控制 / 站点自己）→ `#browserPiP = true`。返回时 `disablePiP` 给浏览器 **1 秒**先关自己的窗（竞争退出可能把原生关闭挂死），再复查 `document.hidden`/`#resume`/`#browserPiP`/`Settings.closeOnReturn`，只关浏览器没关掉的。可见页上用户手动开的 PiP 默认返回仍关（`Settings.closeOnReturn` 可关掉）。 |
| 菜单与设置 | `Settings` / `Menu` | `enabled`/`closeOnReturn` 默认 true/true；GM 存储键 `settings`，无 GM 时 `localStorage` 键 `auto-pip-settings`；**每次访问都重读存储**（不缓存），跨标签页即时生效，toggle 保存整个新对象。`Menu.setup(onToggle)` 注册两条命令；enabled 开关触发 `onToggle`（`initialize` 接到 `setupMediaSession`），因为原生 Auto PiP 也会触发该 action。 |
| Media Session | `setupMediaSession` | 仅 `Settings.enabled` 时注册 `enterpictureinpicture`，否则注册 `null`（= 注销，把 PiP 留给浏览器和播放器）；Menu 切换与每次返回页面都会重跑——原生 Auto PiP 可能早于 `visibilitychange` 触发。 |
| 视频发现 | `getVideoElement` / `#shorts` / `#findVideoElement` | 重试 ≤5，锁进 `#lastVideoElement` 直到断连或 `yt-navigate-finish`；Shorts 用 `["#shorts-player video"]`（`ytd-reel-video-renderer[is-active]` 线上已匹配不到，已删）。 |
| SPA 导航 | `#addEventListeners` / `#installBilibiliNavigationWatch` | YouTube：`yt-navigate-finish` 丢缓存；B 站（含直播）：Navigation API `currententrychange` + `popstate` → 300ms 防抖重扫。**绝不补丁页面 `history`**：Firefox Xray 下页面调不了沙箱函数，会断站点路由。 |
| PiP 事件挂载 | `#syncPipListeners` | enter/leave/playing 三个监听始终跟当前 video（leave 后重同步）；事件在 video 元素上，不在 document。 |
| observer 生命周期 | `#setVideoObserverActive` + `#setupVideoObserver` 回调 | 锁定视频后断开 MutationObserver；SPA 导航/查找失败/leave-PiP 时重连。回调过滤变动：未锁定时只有「新增了 `<video>`」的批次才触发扫描（聊天 iframe 空转）；锁定视频丢失后任何变动都重扫。harness 的 `flushMutations()` 默认给一条新增 video 记录。 |
| 页面清理 | `pagehide` 监听 | bfcache 感知（`persisted` 跳过）。 |
| 浏览器嗅探 | `BrowserDetector` | UA 缓存；只暴露 `isEdge`/`isBrave`/`isChromiumBased`。 |

## 符号表

| 符号 | 类型 | 职责 |
|------|------|------|
| `Logger` | class | 批量调试日志；`DEBUG=false`（发布态）时休眠 |
| `Settings` | class | 持久化开关 `enabled` / `closeOnReturn`；每次访问重读存储；GM 存储 + localStorage 回退 |
| `Menu` | class | 注册两条 Tampermonkey 菜单命令、切换后刷新标签；enabled 开关通知 `onToggle`（媒体会话刷新） |
| `BrowserDetector` | class | UA 嗅探缓存；无 Firefox 标志、不做 PiP 支持探测 |
| `VideoController` | class | 全部运行时逻辑；文件末尾创建单例 |
| `VideoController.#debounce` | 私有方法 | 按函数体为键的防抖（清理时统一清） |
| `VideoController.#setupVideoObserver` | 私有方法 | 建 MutationObserver + video-added 过滤（见上表 observer 行） |
| `VideoController.#setVideoObserverActive` | 私有方法 | observer 幂等连接/断开 |
| `VideoController.#syncPipListeners` | 私有方法 | PiP 监听从旧视频解绑、绑到当前视频 |
| `VideoController.#installBilibiliNavigationWatch` | 私有方法 | 监听 Navigation API `currententrychange` 与 `popstate` |
| `VideoController.#rescanAfterNavigation` | 私有方法 | B 站 SPA 导航后重找视频；未激活+播放中则重进 PiP |
| `VideoController.#shorts` | 私有方法 | 仅按 URL 判断 YouTube Shorts 页 |
| `VideoController.#onVisibilityChange` | 私有 handler | 唯一触发入口；返回页还负责刷新媒体会话 |
| `VideoController.#onVideoPlaying` | 私有 handler | 隐藏页上锁定视频开始/恢复播放时补进 |
| `VideoController.#onEnterPiP` / `#onLeavePiP` | 私有 handler | enter 把隐藏期自发进入归类为浏览器所有；leave 记录用户手动关闭、重同步监听、重开 observer |
