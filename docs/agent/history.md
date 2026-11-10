# 发布史与真机验证记录

## 发布史

- v1.4（2025-06）：初始发布。
- v1.4.1：bugfix 链——PiP 事件挂到 video 元素、B 站站内换片保持 PiP、锁定后停 observer、删死代码、回归套件 `node test/run.js` 上线。
- v1.5.0（PR #5）：窗口切换也触发（issue #4）；`pagehide` bfcache 感知清理。
- v1.5.1：可见页 blur 不触发；拒绝请求不再误标成功；触发时序收紧。
- v1.5.2（PR #6?）：返回即退 PiP；Shorts 选当前播放器；换片保留 leave 监听。
- v1.5.3（PR #8）：浏览器所有 PiP 返回时交给浏览器关，不竞争退出；按请求来源区分，不猜浏览器版本。
- v1.5.4 + 7-bugfix 链（工作区迭代，用户真机验证）：隐藏页换元素/缓冲后重进、断连视频不阻塞、Firefox Xray 风险消除（Navigation API）、可见页手动 PiP 焦点恢复不关、隐藏页手动关闭后不再弹、无 PiP API 浏览器静默、document-start 容错。
- v1.6.0（PR #10，2026-11-09 合入 main）：GM 菜单双开关 + 原生 Auto PiP 配合（自发隐藏期进入判浏览器所有 + 1 秒浏览器优先关闭）+ 新站点（live.bilibili.com、music.youtube.com）+ observer 过滤 + 清理死重试/死选择器。同 PR 内三个跟进修复：总开关注销 Media Session action、Settings 每次访问重读、返回页刷新 handler。
- v1.6.1（council 审查轮，分支 `fix/v1.6.1-council`）：浏览器动作不再被在途请求吞掉（`#browserQueued`，含守卫退出与排在失败浏览器请求后面的重跑）；别的标签页关总开关后旧 handler 不再触发原生 PiP；同源子框架不重复注册菜单、返回时刷新标签；隐藏期持续监听 video 替换（含同一隐藏期的第二次替换：锁定新 video 时隐藏页不断开 observer）。README 最小化说明改为两条可持续路径（整窗遮挡 flag / 关闭「返回时关闭」；最小化不在遮挡 flag 覆盖内——Chromium 把最小化映射为 kHidden，auto-PiP helper 不处理）。

## 真机验证记录

- 2026-11-03：Chrome 155 Canary——最小化后 `requestPictureInPicture` 无手势被 NotAllowedError 拒；点击后 >5 秒再最小化同样失败（确认手势根因）。headless 访问 B 站两次被验证码拦。
- 2026-11-06：live-check 真页全过（YouTube 看片/Shorts、B 站视频、YT Music、B 站直播房间 1）；选择器 `#live-player video` / `.live-player-ctnr video` 真房间确认。
- 2026-11-09（v1.6.0 合入前用户验证）：Tampermonkey 真机——遮挡与切页 OK；最小化需近期点击，与文档一致（原生路径未开时属预期）。
