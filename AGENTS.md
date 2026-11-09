# Auto-Picture-in-Picture — AGENTS

Tampermonkey 用户脚本：标签页隐藏时自动进画中画。单文件 `pip.js`（IIFE + 私有字段类，tab 缩进），无构建无依赖，GreasyFork 直接消费。支持 YouTube、YouTube Music、B 站、B 站直播；带脚本菜单双开关（总开关 / 返回页面时关闭）。`test/` 是零依赖 node:vm 回归套件 + 可选真浏览器 live-check。

```bash
node test/run.js                                        # 全量回归
NODE_PATH=<global node_modules> node test/live-check.js # 真实 Chromium（--fixture-only 离线）
```

## 为什么每次改完东西功能就会出问题（先读，改代码前）

这个仓库的返工不是随机的，七个根因每个都有真实事故。改前对照，改后自查：

1. **状态分散在一个私有字段网里。** `#browserPiP`、`#entryPending`、`#userDismissed`、`#resume`、`#pipEventVideo` 相互约束，单独加/改一个字段，某个组合态就会失真。事故：脚本退出与浏览器自关竞争，把原生 PiP 关挂死（v1.5.3 才修）；媒体回调差点接管已开的脚本 PiP。规则：动 `VideoController` 状态，必须全量测试过（重点 state-matrix 8 行、native-pip-exit、lifecycle-gaps），并在心里过一遍新组合态。
2. **单元测试全绿 ≠ 功能没坏。** harness 是假 DOM：测不了真手势（headless `userActivation` 恒真）、真最小化、真 Tampermonkey 沙箱。事故：v1.5.4 修的 7 个 bug 全部在旧套件全绿时被真机发现。规则：触发/手势/退出/安装路径的改动，必须 live-check 真页，并给用户列真机验证清单。
3. **原生能力只能做加法。** 事故：曾按「原生 Auto PiP 优先」改写并关掉脚本回退，没开 flag 的用户全部触发失效。规则：脚本自己的回退路径永远保留；原生路径只加配合逻辑，绝不替代。
4. **退出 PiP 是竞争窗口。** 浏览器要关自己开的 PiP 窗时，脚本同时 `exitPictureInPicture` 会把它挂死。规则：浏览器所有的 PiP 一律给 1 秒优先 + 复检后再兜底（`disablePiP`），新增退出逻辑前先问「这个窗是谁开的」。
5. **浏览器行为差异是坑源，不是 spec 直觉。** Chromium 移除 PiP 视频后 `pictureInPictureElement` 残留且不发事件（必须 `isConnected`）；PiP 事件在 video 不在 document；Firefox Xray 下页面调不了沙箱函数（补丁 `history` 会断 B 站路由）。规则：动生命周期代码前先读 `docs/agent/code-map.md` 的「浏览器差异」。
6. **站点结构会漂。** YouTube Shorts 的 `ytd-reel-video-renderer[is-active]` 说失效就失效；B 站换 video 元素。规则：选择器/站点适配的改动必须真页验证，候选 URL 逐个试（consent/验证码/登录墙常见）。
7. **易变事实写进文档，必然过期，过期文档误导下一轮修改。** 事故：AGENTS.md 的行号/行数/测试数多次漂移，用户多次纠正。规则：**本文件与 docs/agent/* 不写行号、行数、测试数**——用符号名（全文搜索定位）和命令现查；改 `pip.js`/`test/` 的同一变更里核对受影响条目仍然为真。

## 硬约束

- 不加构建工具、不拆 `pip.js`。
- 头部 21 行是发布契约：`@match`/`@grant`/版本变更必须同步 `test/fenced-guards.test.js` 的头部夹具。
- 不加 `@noframes`（会杀嵌入播放器）；不补丁页面 `history`；不删测试来变绿。
- 发布流程：本地 Tampermonkey 真机验证 → 用户确认 → 才开 PR。

## 参考（按需读）

- `docs/agent/structure.md` — 仓库结构与各文件职责。
- `docs/agent/code-map.md` — 符号地图：任务入口、符号表。
- `docs/agent/browser-quirks.md` — 浏览器差异与已知未修。
- `docs/agent/testing.md` — 验证边界：harness 能/不能证明什么、live-check 用法。
- `docs/agent/workflow.md` — 四拍工作流、发布流程、文档维护规则。
- `docs/agent/history.md` — 发布史与真机验证记录。
