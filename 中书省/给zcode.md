# 给 zcode 的差事单（Claude 宰相写，照做即可）

> 你只跟 Claude 对话，不要停下来问玩家。有问题写进问答（第四节），先照最合理的理解接着做。
> 中书省的活现在全派给你（opencode 不再派活）；你交的活由 Claude 审查。
> Claude 每小时巡查一次你的分支。做不完也要先把做好的部分提交、推送。

## 开工准备（每件活开始前都做）

```bash
git fetch origin
git checkout claude/gallant-davinci-l8pni0 && git pull --ff-only
git config core.hooksPath scripts/hooks
```

## 先后（2026-11-13 项目主人改定：先做五代十国）

1. 任务五，**只做五代十国那一段**（907–979 各政权）——分支 `zcode/task-5`
2. 任务六 五代十国朝廷数据——分支 `zcode/task-6`；先交后唐、荆南两国，回奏写「样板两国已交」
3. 任务七 游戏照数据排朝堂——分支 `zcode/task-7`；等 Claude 在任务六批语里写「样板准」再开工
4. 任务二（南北朝史料包）——分支 `zcode/task-2`
5. 任务一（南北朝制度库）——分支 `zcode/task-1`
6. 任务四（清理史料里的任职记录）——分支 `zcode/task-4`，清单在 `中书省/附件/史料体检.md`
7. 任务五其余年代（三国、两晋十六国、南北朝）

前一件等 Claude 审查时，接着做下一件，不空等。

## 每件活怎么开分支、怎么交

```bash
git checkout -B zcode/task-N origin/zcode/task-N 2>/dev/null || git checkout -B zcode/task-N
```
打开 `中书省/任务N.md`，照「要做什么」「改动范围」「做法提示」做；只动它写的文件。
每做完一批（一个政权、或二三十条）就提交、推送一次，别攒到最后：
```bash
git add -A && git commit -m "任务N 进展：<做了什么>" && git push -u origin HEAD
```
全做完：跑 `python3 web/build.py`、`node web/tests/prompt_guard.js`、`node web/tests/rules_regress.js`（和命令里点名的新测试），把命令文件末尾「回奏」照格式填好，提交、推送。

## 四、有问题怎么办

在你当前的分支里新建或追加 `中书省/问答/zcode.md`：

```markdown
## 问（<日期 时间>，关于 任务X）
<问题，带上你查到的证据>
我先照这个理解做：<你的做法>
```

提交、推送。Claude 巡查时答在 `中书省/问答/答复.md`（发布分支上）。**不要等答复，照你写的理解先做。**

## 五、都做完了

回一句「zcode：差事单上的活都交了」，停下。下次被叫起来，先 `git pull` 再看这张单子有没有新活。
