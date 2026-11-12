#!/bin/bash
# 提交前检查（需求台账 R-132）：没过就不许提交。git 钩子 scripts/hooks/pre-commit 自动跑；手动跑：bash scripts/check.sh
ROOT=$(cd "$(dirname "$0")/.." && pwd); cd "$ROOT"; bad=0
say() { echo "【提交前检查】$*"; }
# 完整测试放到最后（R-218，2026-11-12 玩家：「最后时刻在最后排版的时候再跑测试」）：
#   发布分支（claude/gallant-davinci-l8pni0、main）照旧必须全过；其余工作分支（glm/…、ds/…、court/…）只提醒，合并进发布分支时再跑
br=$(git rev-parse --abbrev-ref HEAD 2>/dev/null); release=0; case "$br" in claude/gallant-davinci-l8pni0|main) release=1;; esac
# 1. 完整测试（全按钮真点、地图、人物……）全过以后源码没再改过
fp=$(bash scripts/fingerprint.sh); pass=$(cat .qa-pass 2>/dev/null)
if [ "$fp" != "$pass" ]; then
  if [ $release = 1 ]; then say "完整测试没在现在这份源码上全部通过（或之后又改过源码、测试）。先跑 QUICK=1 bash web/tests/qa.sh，全过了再提交。"; bad=1
  else say "工作分支 $br：完整测试留到合并进发布分支时跑（提醒，不拦）"; fi
else say "完整测试：这份源码全部通过 ✓"; fi
# 2. 提示词护栏、规则回归（快，现跑）
if node web/tests/prompt_guard.js > /tmp/rpg-guard.out 2>&1; then say "提示词护栏 ✓"; else say "提示词护栏没过："; grep 不合格 /tmp/rpg-guard.out | head -5; bad=1; fi
if node web/tests/rules_regress.js > /tmp/rpg-rules.out 2>&1; then say "规则回归 ✓"; else say "规则回归没过："; grep 不合格 /tmp/rpg-rules.out | head -5; bad=1; fi
# 3. 三个版本是同一次构建
b=$(python3 -c "import json;print(json.load(open('rpg-kernel/public/version.json'))['build'])" 2>/dev/null)
for f in web/index.html web/play.html rpg-kernel/public/index.html; do grep -q "$b" "$f" || { if [ $release = 1 ]; then say "$f 不是最新一次构建（$b），三个版本不同步"; bad=1; else say "工作分支：$f 不是最新一次构建（提醒，不拦）"; fi; }; done
# 4. 需求台账每条都有玩家验收、自动验收、状态
n=$(grep -c '^### R-' REQUIREMENTS.md); for k in 玩家验收 自动验收 状态; do m=$(grep -c "^- $k：" REQUIREMENTS.md); [ "$m" -lt "$n" ] && { say "需求台账有 $((n-m)) 条缺「$k」"; bad=1; }; done
# 5. 不提交 Key、模型名
if git diff --cached -U0 2>/dev/null | grep -E '^\+' | grep -qE 'sk-[A-Za-z0-9]{24,}|claude-(opus|sonnet|haiku|fable)-[0-9]'; then say "要提交的改动里有 API Key 或模型名"; bad=1; fi
[ $bad = 0 ] && say "全部通过，可以提交" || say "没通过，拒绝提交"
exit $bad
