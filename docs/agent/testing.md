# 测试与验证边界 — 什么能被证明，什么不能

## 命令

```bash
node test/run.js                                              # 全量回归（零依赖，node:vm 假 DOM）
NODE_PATH=<global node_modules> node test/live-check.js       # 真实 Chromium：夹具 + 真页
NODE_PATH=<global node_modules> node test/live-check.js --fixture-only   # 离线夹具
```

测试数量不写在文档里：以 `node test/run.js` 末行输出为准。真页候选 URL 逐个试——consent 墙、登录墙、限流、懒加载都会让单 URL 不可靠（B 站直播部分房间 headless 有验证码，换房间再试）。

## harness 能 / 不能证明什么

**能**：状态机（state-matrix 8 行）、触发时序（trigger-timing）、菜单与设置（settings-menu）、原生配合语义（native-autopip / native-pip-exit）、observer 生命周期（bug5）、视频发现（video-discovery）、头部围栏（fenced-guards）、B 站主世界导航（bilibili-main-world）。

**不能**（node:vm 假 DOM 的边界，绿色 ≠ 功能没坏）：
- 真手势——headless Chromium `userActivation` 恒为 true，无手势拒绝（NotAllowedError）与物理最小化**无法复现**；
- 真最小化/遮挡——`bringToFront` 不产生真实 hidden；
- 真iframe 与 Tampermonkey 沙箱语义——live-check 用 CDP 隔离 world 近似，不等于真安装。

规则：涉及触发、手势、退出、安装行为的改动，除全量测试外必须 live-check 真页，并在交付说明里列「留给用户真机验证」的清单。历史教训：v1.5.4 修的 7 个 bug 全部是在旧套件全绿状态下被真机发现的。

## live-check 覆盖

- 夹具：隐藏+激活进 PiP；主世界 pushState 换元素重进；返回退脚本 PiP；blur/focus 不关用户 PiP；总开关关（localStorage 回退）+ 浏览器所有 PiP 返回不被竞争关闭；live.bilibili.com 路由夹具。
- 真页：YouTube 看片/Shorts、B 站视频、YouTube Music、B 站直播（2026-11-06 全部真页进出 PiP 通过）。

## 发布流程

见 `workflow.md`（四拍、发布门槛与文档维护规则）。
