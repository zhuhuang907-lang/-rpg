# 真实 DeepSeek 压力测试

不用假 AI：游戏 → 本机转发（dsproxy.js，记下每次调用的实际 token 用量、耗时、成败、JSON 能否解析、原始输入输出）→ api.deepseek.com。

    bash web/tests/real/run.sh            # 土匪首领、商人、清代总兵各十回
    bash web/tests/real/run.sh bandit     # 只跑一个身份
    REF=8d36d77 bash web/tests/real/run.sh merchant   # 照旧版本跑一遍，对比成本

- Key 从环境变量 `DEEPSEEK_API_KEY` 读（可选 `BOCHA_API_KEY`），在云环境设置里加；不写进仓库、不打印、不贴进聊天。游戏本身只看到本机转发的地址。
- 每个身份每回存：行动前后完整状态、身份与权限、兵马、自家势力、现钱、行动单、没落账的、审稿结果、回执、用时；第十回后刷新，查能不能完整恢复。
- 带 ★ 的回合故意放了毛病（越权、时代不对的东西、凭空的资源），不告诉审稿哪里有错，看推演和审稿挡不挡得住。
- 结果在 `out-时间/`（不进仓库）：`report.md` 汇总，`calls.jsonl` 每次调用一行，`calls/` 原始输入输出，各身份目录下每回的状态。
