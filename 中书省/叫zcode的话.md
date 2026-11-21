# 叫 zcode 的话（2026-11-16 两档，复制整段贴给对应那一档）

## 2026-11-21 真玩考卷（两档都贴这一段）
```
你是 zcode。先 git fetch origin。照 中书省/任务六十一.md 做：用真 DeepSeek 照 web/tests/real/exam/ 的考卷玩，对账，只报错、不改游戏代码。
档甲跑 1、2 号卷，档乙跑 3、4 号卷，先跑完的接对方没开的那张。
1. git checkout -B zcode/task-六十一 origin/claude/staging
2. DeepSeek Key 放环境变量 DEEPSEEK_API_KEY（本机已有那个），绝不写进文件、不提交、不打印
3. 一张卷：EXAM_ROOT=$HOME/rpg-exam bash web/tests/real/exam/exam.sh <卷名>.txt（约一小时）
4. 跑完逐回读 play.log、看 shots/ 截图，照任务六十一「要报什么」七类，一条一行写进 中书省/考卷回报/<卷名>-<日期>.md（先抄 对账.txt 全文）
5. 只提交回报的 md，git push -u origin HEAD；严禁推发布分支
6. 有问题写进 中书省/问答/zcode.md，照自己理解接着做，不停下来问
```

## 档甲（2026-11-18 起）
```
你是 zcode·档甲。先 git fetch origin && git checkout claude/staging && git pull。
这批活是项目主人「各时代剧情都要符合社会现实」的数据底子（方案见 docs/知识库/时代真实保障方案.md），照顺序做：
① 任务五十九：十国中枢与州郡长官逐年表，先闽、南唐、吴越（要求在 中书省/任务五十九.md），分支 zcode/task-五十九
② 做完接 任务五十八：宋段州府县表重做（中书省/任务五十八.md，照文中三条自检），分支 zcode/task-五十八
1. 每件照文件里的「规矩」：出处写书名卷次篇名，查不到的照制度和任职时间线推、写明「推定」与依据，不写「某、不详、待查」，不写这年代没有的东西
2. 每做一批 git add -A && git commit && git push 到本任务分支（推之前先 git merge origin/claude/staging，跑 python3 web/build.py、node web/tests/prompt_guard.js、node web/tests/hist_audit.js 必须 0 处可疑）；严禁推发布分支
3. 只改你这件点名的文件，不碰 web/game.src.html
4. 有问题写进 中书省/问答/zcode.md 提交推送，照你自己的理解接着做，不停下来问
5. 每件做完在那件任务文件末尾「回奏」写清：交了什么、几条、提交号、抽样十条（事→出处→原文片段）
6. 额度快完了：把做好的提交推送，在回奏写清做到哪
```

## 档乙（2026-11-18 起）
```
你是 zcode·档乙。先 git fetch origin && git checkout claude/staging && git pull。
这批活是项目主人「各时代剧情都要符合社会现实」的数据底子（方案见 docs/知识库/时代真实保障方案.md），照顺序做：
① 任务六十：五代十国大事改写成可执行条目，不少于三百条（要求在 中书省/任务六十.md），分支 zcode/task-六十
② 做完接 任务五十一：唐后期、五代名臣补有据的能力分（中书省/任务五十一.md）
1. 每件照文件里的「规矩」：出处写书名卷次篇名，查不到的照制度和任职时间线推、写明「推定」与依据，不写「某、不详、待查」，不写这年代没有的东西
2. 每做一批 git add -A && git commit && git push 到本任务分支（推之前先 git merge origin/claude/staging，跑 python3 web/build.py、node web/tests/prompt_guard.js、node web/tests/hist_audit.js 必须 0 处可疑）；严禁推发布分支
3. 只改你这件点名的文件，不碰 web/game.src.html
4. 有问题写进 中书省/问答/zcode.md 提交推送，照你自己的理解接着做，不停下来问
5. 每件做完在那件任务文件末尾「回奏」写清：交了什么、几条、提交号、抽样十条（事→出处→原文片段）
6. 额度快完了：把做好的提交推送，在回奏写清做到哪
```
