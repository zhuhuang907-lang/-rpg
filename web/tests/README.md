# 质量检测

每次改动游戏、发布之前，必须跑全套检测并全部通过：

```
bash web/tests/qa.sh            # 全套，约半小时到四十分钟
QUICK=1 bash web/tests/qa.sh    # 快速，约五分钟（GitHub 每次推送自动跑这一套，不过就不打安装包）
```

要装好 python3、node、playwright（用 `NODE_PATH` 指到它的 node_modules）；Chromium 用 playwright 自带的，或用 `CHROMIUM` 指定。

| 检测 | 防的是什么 |
|---|---|
| `prompt_guard.js` 提示词护栏 | 示范段落被删、写正文的思考被关、分段与格式规则丢失、首行和【当前情况】不再由程序生成、不给玩家看将来的史事被改回去、立家业被去掉（这几样被改坏过一次，剧情马上变差） |
| `rules_regress.js` 规则回归 | 替主角说话、宣布众人跟随、擅自快进、官职含糊、夹英文、纠错识别、正文清洗、自动分段、【当前情况】生成，共 14 条 |
| `qa/tour.js` 巡检 | 开局 + 三回合 + 十个侧栏页都能打开、没有报错 |
| `qa/estate.js` 家业 | 流民开局现钱不离谱：模拟 AI 故意给流民八万文，程序必须退回重立；家底逐项立账 |
| `qa/custom.js` / `qa/claudemode.js` | 自定开局；网页版模式（Sonnet 5.5、努力程度中） |
| `qa/drive.js` | 连玩几十回合：不卡、不报错、存档不坏、上一版不丢 |
| `qa/drive2.js` + `qa/nasty.js` | 捣乱 AI：字段类型错、正文包成 JSON、空回复、慢；界面不露 JSON 和内部标记，时间回合不倒退 |
| `qa/chaos.js` | 两成调用出错的 AI 连玩：自动重试，不丢回合 |
| `rpg-kernel/test_runner.js` | 桌面服务端自测 |

模拟 AI（`qa/ai.js` 等）只能测程序有没有坏，测不出真模型写得好不好；剧情质量要靠真玩时的「一键反馈」和「设置 → 导出问题报告」。
