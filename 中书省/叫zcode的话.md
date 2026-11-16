# 叫 zcode 的话（2026-11-16 两档，复制整段贴给对应那一档）

## 档甲
```
你是 zcode·档甲。先 git fetch origin && git checkout claude/staging && git pull。
读 中书省/给zcode.md 末尾「2026-11-16 两档分工」，照档甲的顺序做：任务四十四（隋唐前期名臣）→ 四十七（隋唐前期、两宋地方长官表）（名臣格式照 中书省/附件/名臣预制格式.md，样板看 web/figures/sanguo.json）（每件的要求在 中书省/任务三十六.md 等文件里）。
1. 每件照文件里的「规矩」：出处写书名卷次，核不到的不编，不写这年代没有的东西
2. 每做一批 git add -A && git commit && git push（推 claude/staging 前先 merge origin/claude/staging，跑 python3 web/build.py、node web/tests/prompt_guard.js、node web/tests/hist_audit.js 必须 0 处可疑）
3. 只改你这几件的文件，不碰 web/game.src.html，不碰档乙的文件（web/events/、web/vocab/、song-south-yuan、*-ties、web/figures/ 里档乙那三段）
4. 有问题写进 中书省/问答/zcode.md 提交推送，照你自己的理解接着做，不停下来问
5. 每件做完在那件任务文件末尾「回奏」写清：交了什么、几条、提交号、抽样十条（事→出处→原文片段）
6. 额度快完了：把做好的提交推送，在回奏写清做到哪
```

## 档乙
```
你是 zcode·档乙。先 git fetch origin && git checkout claude/staging && git pull。
读 中书省/给zcode.md 末尾「2026-11-16 两档分工」，照档乙的顺序做：任务四十五（两宋名臣）→ 四十八（四段宰辅逐年表）→ 四十九（七段地名对照表）（每件的要求在 中书省/任务三十八.md 等文件里）。
1. 每件照文件里的「规矩」：出处写书名卷次，核不到的不编，不写这年代没有的东西；各年代的事要有这个年代自己的样子，不许几个年代照抄一套
2. 每做一批 git add -A && git commit && git push（推 claude/staging 前先 merge origin/claude/staging，跑 python3 web/build.py、node web/tests/prompt_guard.js、node web/tests/hist_audit.js 必须 0 处可疑、python3 scripts/plan_metrics.py 看数）
3. 只改你这几件的文件，不碰 web/game.src.html，不碰档甲的文件（web/history/ 里除 song-south-yuan 以外的、web/arcs/nanbei|suitang、scripts/court_supplement/）
4. 有问题写进 中书省/问答/zcode.md 提交推送，照你自己的理解接着做，不停下来问
5. 每件做完在那件任务文件末尾「回奏」写清：交了什么、几条、提交号、抽样十条（事→出处→原文片段）
6. 额度快完了：把做好的提交推送，在回奏写清做到哪
```
