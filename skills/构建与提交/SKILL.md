---
name: 构建与提交
description: 改完代码要构建三个版本、跑测试、提交推送时用。说明顺序和提交检查的每一项。
---

# 构建与提交

## 顺序

1. 第一次在这个克隆里提交前：`git config core.hooksPath scripts/hooks`（启用提交检查）。
2. 改 `web/game.src.html`（或数据 JSON）。
3. `python3 web/build.py` —— 生成 `web/index.html`、`web/play.html`、`rpg-kernel/public/index.html`。语法错会在这里报。
4. 快的先跑：`node web/tests/prompt_guard.js`、`node web/tests/rules_regress.js`、你新加的测试。
5. 全部改完后跑一次完整测试：`QUICK=1 bash web/tests/qa.sh`（约一个半小时）。需要 `NODE_PATH` 指到 playwright 的 `node_modules`。
   - 跑的时候**不许再构建、不许再改源码和测试**，否则指纹对不上，白跑。
   - 两套不能同时跑。
6. 全过后提交。提交检查（`scripts/check.sh`）会自动核：完整测试指纹、护栏、规则回归、三版同一次构建、台账三栏、无 Key 无型号名。
7. 推到自己的分支（`ds/任务X-…` 或 `glm/任务X-…`）。主开发分支只由 Claude 合并推送。

## 不许

- `git commit --no-verify` 或任何绕过提交检查的办法。
- 提交 `rpg-kernel/data/adapter-config.json`、`data/search.json`、存档、`.qa-pass`。
- 在提交信息、代码里写模型型号名。

## 提交信息

一行说清做了什么，带 R-编号或 任务X，用中文，例如：`任务三 R-216 朝议表态加撤回按钮并配真点测试`。
