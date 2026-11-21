# 真玩考卷（R-270、R-271；任务六十一）

每次改了底层，用真 DeepSeek 照考卷玩一遍，程序对账，人再逐回看正文和截图，只报错。

    export DEEPSEEK_API_KEY=...        # 只放环境变量，绝不写进文件、不提交、不贴聊天
    EXAM_ROOT=$HOME/rpg-exam bash web/tests/real/exam/exam.sh 1-皇帝-调兵与任免.txt

- 考卷第一行 `#开局|年|地方|身份|名字|真或虚`，其后每行一回；行首 `xun|` `month|` `season|` `year|` 定这回过多久。
- 跑完在 `$EXAM_ROOT/<卷名>/`：`play.log` 正文和回执、`shots/` 每回局面页和舆图、`lcr<回>.json` 整局存档、`st<回>.json` 账的要点、`对账.txt` 程序对账（体检、一支兵两条行军单、在途状态、死人占位、日子倒退、程序出错、问题报告各类条数）。这些都不进仓库。
- 驱动跑满两小时会被停：`curl -X POST --data-binary "$EXAM_DIR/lcr<回>.json" localhost:8798/load` 读最后一回，再用 `turns.sh 剩下的行` 接着跑。
- 考卷：1 皇帝（调兵、任免）、2 将领（出兵、围城）、3 地方官（断案、赋税）、4 平民（经商、家事）。都带跨月、跨季、跨年的回合，考逐月结算。
