# 仓库结构 — 文件职责

## 目录

```
./
├── pip.js            # 整个用户脚本：全部逻辑，唯一发布产物
├── test/
│   ├── run.js        # 回归套件入口：发现 test/*.test.js 并逐个运行
│   ├── harness.js    # 零依赖 node:vm 假 DOM harness（能力边界见 testing.md）
│   ├── *.test.js     # 按主题分文件的回归测试（状态矩阵、触发时序、菜单设置等）
│   ├── live-check.js # 可选真浏览器检查：CDP 隔离 world，需全局 Playwright
│   ├── performance.js / performance-browser.js  # 独立性能脚本（不进回归套件）
│   └── performance-*.md                            # 性能测量记录
├── README.md         # 英文文档：changelog、浏览器设置、已知限制
├── README_zh.md      # 中文文档（与英文同步维护）
├── AGENTS.md         # 主入口：根因与规则（保持简短）
└── docs/agent/       # 拆分的参考文件（本目录）
```

## 约束

- 无构建、无 bundler、无 package.json、无 CI；改动直接进 `pip.js`，`test/` 纯 Node 零依赖。
- 发布产物只有 `pip.js`，经 GreasyFork 分发（脚本 id 516762）；头部元数据是发布契约（见 AGENTS.md 硬约束与根因 7 的文档规则）。
