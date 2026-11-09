# Agent 工作流 — 四拍与发布

## 四拍

**isolate → build → prove → ship**：在独立分支上做最小正确改动，用下面的检查证明，再以 PR 交付。

## 检查

```bash
node test/run.js                                              # 全量回归（零依赖）
NODE_PATH=<global node_modules> node test/live-check.js       # 真实 Chromium：夹具 + 真页
NODE_PATH=<global node_modules> node test/live-check.js --fixture-only   # 离线夹具
```

验证边界（harness 能/不能证明什么、live-check 覆盖范围）见 `testing.md`。

## 发布流程

本地 Tampermonkey 真机验证 → 用户确认 → 才开 PR。涉及触发/手势/退出/安装路径的改动，交付说明里必须列「留给用户真机验证」的清单。

## 文档维护规则

改 `pip.js` / `test/` 的同一变更里：

1. 核对 `AGENTS.md` 的根因与规则条目是否仍成立；
2. 更新 `docs/agent/*` 中受影响的条目（行为描述、任务入口、符号职责）；
3. **不写行号、行数、测试数**——用符号名（全文搜索定位）和命令现查（`node test/run.js` 末行输出为准）。
