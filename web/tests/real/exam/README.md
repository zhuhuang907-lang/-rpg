# 真玩考卷（R-270）

每次改了底层，用真 DeepSeek 照同一张考卷玩一遍，程序对账，对不上的不交。

    EXAM_DIR=/tmp/rpg-exam bash up.sh &                       # 起游戏、本机转发、驱动（端口 8798）
    curl -X POST --data-binary "$EXAM_DIR/lcr92.json" localhost:8798/load   # 读一个存档（或 /start 开新局）
    EXAM_DIR=/tmp/rpg-exam bash turns.sh 皇帝-调兵与任免.txt    # 每行一回；行首 xun| month| season| year| 定这回过多久
    python3 -I check.py /tmp/rpg-exam                          # 对账：体检、一支兵两条行军单、在途状态、死人占位、日子倒退

- 每回存：正文（play.log）、截图（shots/）、整局存档（lcr<回>.json）、账的要点（st<回>.json）。
- Key 由云环境的转发注入，不写进仓库。驱动跑满两小时会被停，接着从最后一回的存档读起。
- 考卷：`皇帝-调兵与任免.txt`（后唐李从荣：调兵北上、围城、增派、问空缺、照拟任命）。以后加：将领、小官、平民各一张。
