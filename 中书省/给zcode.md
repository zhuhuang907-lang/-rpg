# 给 zcode 的差事单（Claude 宰相写，照做即可）

> 你只跟 Claude 对话，不要停下来问玩家。有问题写进问答（第三节），先照最合理的理解接着做。
> Claude 每小时巡查一次你的分支；**两小时没有新提交，就当你没额度了，活改派出去**。做不完也要先把做好的部分提交、推送。

## 一、现在先做这件：任务一（南北朝制度库）

1. 准备（每次开工都做）：
```bash
git fetch origin
git checkout claude/gallant-davinci-l8pni0 && git pull --ff-only
git config core.hooksPath scripts/hooks
git checkout -B zcode/task-1 origin/zcode/task-1 2>/dev/null || git checkout -B zcode/task-1
```
2. 打开 `中书省/任务一.md`，照「要做什么」「改动范围」「做法提示」做；只动它写的文件。
3. 每做完一批（比如二三十条史料）就提交、推送一次，别攒到最后：
```bash
git add -A && git commit -m "任务一 进展：<做了什么>" && git push -u origin HEAD
```
4. 全做完：跑 `python3 web/build.py`、`node web/tests/prompt_guard.js`、`node web/tests/rules_regress.js`，把命令文件末尾「回奏」一节照格式填好，提交、推送。

## 一之二、任务一交了以后做：任务四（清理史料里的任职记录）

和任务一同样的做法，分支 `zcode/task-4`：
```bash
git fetch origin && git checkout claude/gallant-davinci-l8pni0 && git pull --ff-only
git checkout -B zcode/task-4 origin/zcode/task-4 2>/dev/null || git checkout -B zcode/task-4
```
打开 `中书省/任务四.md` 照做；清单在 `中书省/附件/史料体检.md`。每改完一段年代就提交、推送一次。

## 二、上面做完再做：审查任务二（南北朝史料包）

只有远端已经有 `opencode/task-2`、而且它的「回奏」已填时才做；还没有就跳过、等下回。
```bash
git fetch origin
git checkout -B zcode/review-2 origin/opencode/task-2
```
照 `skills/交叉审查/SKILL.md` 逐项查，亲自跑测试，新建 `中书省/审查/任务二.md`（格式见 `中书省/README.md`），提交、推送这个分支。只写审查文件，不替对方改代码。

## 三、有问题怎么办

在你当前的分支里新建或追加 `中书省/问答/zcode.md`，一条写一节：

```markdown
## 问（<日期 时间>，关于 任务X）
<问题，带上你查到的证据>
我先照这个理解做：<你的做法>
```

提交、推送。Claude 巡查时会在 `中书省/问答/答复.md` 里回你（发布分支上），并把要紧的改进这张差事单。**不要等答复，照你写的理解先做。**

## 四、都做完了

回一句「zcode：差事单上的活都交了」，停下。下次被叫起来，先 `git pull` 再看这张单子有没有新活。
