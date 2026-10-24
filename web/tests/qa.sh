#!/bin/bash
# 全套质量检测：每次改动、发布之前必须全部通过（任何一项不过就退出码非零）
#   bash web/tests/qa.sh            全套（约 30–40 分钟）
#   QUICK=1 bash web/tests/qa.sh    快速（护栏 + 规则回归 + 巡检 + 家业，约 5 分钟）
# 需要：python3、node、playwright（NODE_PATH 指到它的 node_modules）、Chromium（CHROMIUM 指到可执行文件，不填用 playwright 自带）
set -u
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; QA="$ROOT/web/tests/qa"
WORK="$(mktemp -d)"; MOCK_PORT="${MOCK_PORT:-3741}"; GAME_PORT="${GAME_PORT:-8741}"; export MOCK_PORT GAME_PORT
FAIL=0; PIDS=()
say() { printf '\n== %s\n' "$*"; }
bad() { echo "!! 不合格：$*"; FAIL=1; }
stop_all() { for p in "${PIDS[@]:-}"; do [ -n "$p" ] && kill "$p" 2>/dev/null; done; PIDS=(); sleep 0.5; }
trap 'stop_all; rm -rf "$WORK"' EXIT
start() {   # $1 = 模拟 AI 的脚本名
  stop_all
  rm -rf "$WORK/rk" && mkdir -p "$WORK/rk" "$WORK/mock"
  tar --exclude=./data --exclude=./node_modules -C "$ROOT/rpg-kernel" -cf - . | tar -C "$WORK/rk" -xf -
  mkdir -p "$WORK/rk/data"
  printf '{"selected":"deepseek","configs":{"deepseek":{"apiKey":"%s","model":"deepseek-v4-pro","baseUrl":"http://127.0.0.1:%s"}}}' "${KEYVAL-sk-test1234}" "${DEADDS:-$MOCK_PORT}" > "$WORK/rk/data/adapter-config.json"
  sed "s/MOCKPORT/$MOCK_PORT/g" "$QA/search.json" > "$WORK/rk/data/search.json"
  cp "$QA"/*.js "$WORK/mock/"
  (cd "$WORK/mock" && exec node "./$1" > "$WORK/mock.out" 2>&1) & PIDS+=($!)
  (cd "$WORK/rk" && BOCHA_BASE=http://127.0.0.1:$MOCK_PORT RPG_NO_UPDATE=1 PORT=$GAME_PORT WIKI_BASE=http://127.0.0.1:$MOCK_PORT TGAZ_BASE=http://127.0.0.1:$MOCK_PORT NO_PROXY=127.0.0.1 exec node ./server.js > "$WORK/srv.out" 2>&1) & PIDS+=($!)
  for i in $(seq 1 40); do curl -s "http://127.0.0.1:$GAME_PORT/api/health" >/dev/null && return 0; sleep 0.5; done
  bad "游戏服务起不来"; tail -20 "$WORK/srv.out"; return 1
}
run() {   # $1 = 名字，$2 = 超时秒，$3... = 命令；输出里必须没有「不合格」的标志
  local name="$1" t="$2"; shift 2
  say "$name"
  local out; out="$(cd "$WORK/mock" && timeout "$t" "$@" 2>&1)"; local rc=$?
  echo "$out" | tail -6
  [ $rc -ne 0 ] && { bad "$name（退出码 $rc）"; return; }
  echo "$out" | grep -qE 'ERRS \[\]|PAGE ERRORS 0|ESTATE OK|不合格 0' || bad "$name：没看到通过的标志"
  echo "$out" | grep -qE 'ERRS \[[^]]|PAGE ERRORS [1-9]|UI ERRORS [1-9]|STUCK \[[^]]|LEAKS [1-9]|INVARIANTS [1-9]|ESTATE FAIL' && bad "$name：有报错"
}
say "构建"; (cd "$ROOT" && python3 web/build.py 2>&1) | tail -3; [ ${PIPESTATUS[0]} -eq 0 ] || { bad "构建失败（页面脚本有语法错误）"; echo "有不合格项，不许发布"; exit 1; }
say "提示词护栏"; node "$ROOT/web/tests/prompt_guard.js" | tail -1; [ ${PIPESTATUS[0]} -eq 0 ] || bad "提示词护栏"
say "规则回归"; node "$ROOT/web/tests/rules_regress.js" | tail -1; [ ${PIPESTATUS[0]} -eq 0 ] || bad "规则回归"
KEYVAL= start ai.js && run "填 Key：粘贴、保存、换 Key、型号、博查、开关、输入不丢" 300 node keyflow.js
start ai.js && {
  run "巡检（开局 + 三回合 + 十个侧栏）" 600 node tour.js
  run "家业（流民开局现钱不离谱、逐项立账）" 600 node estate.js
  run "军队：募兵进账、守城有战报、出战扣伤亡、离谱数目交账房" 600 node army.js
  run "后宅子嗣、政令、经济账：纳妾、有孕生产、政令月结、只报一项不丢" 900 node family.js
  run "刑案监狱、生意、江湖：告状立案、开铺月结、入帮、收押打点、获释" 900 node crime.js
  run "捏脸：开局画像、捏脸面板、换脸、身边人小像、相貌进材料" 600 node face.js
  run "存档：两局并存、读回、删除（确认不被重画冲掉）、刷新不复活、游戏里切换" 900 node saves.js
  run "边写边显示：写稿核对时看得到初稿、不露幕后、写完换定稿" 900 node livedraft.js
  run "改错不卡：一键反馈、说写错了、改这段文字、重写这一条，改完接着玩" 900 node fixflow.js
  run "开关与按钮：旧版的「关」不生效、篇幅记住、自检网络报告更新分支换 Key 都有结果、侧栏无怪字、建议只写进输入框" 600 node controls.js
  run "旧存档：缺新册子、旧写法的局读得进来、每页画得出、能接着玩、刷新还在" 600 node oldsave.js
  run "人走到哪地图跟到哪：出门办事地图换成所在地、标出家和离家多远、对不上的地名照年代查出当时县名、回家换回、换了年代照当年州县重画" 600 node travel.js
  run "档案馆：每回全文另存进游戏文件夹、刷新还在、按人名翻出旧事、写成史书小说能下载、刷新后书还在" 600 node archive.js
  [ -z "${QUICK:-}" ] && run "自定开局" 600 node custom.js
  [ -z "${QUICK:-}" ] && run "网页版模式" 600 node claudemode.js
  [ -z "${QUICK:-}" ] && run "连玩几十回合" 1500 node drive.js
}
DEADDS=9 start ai.js && {
  run "连不上 DeepSeek 时自动改由浏览器直连：存过 Key 的直接开局、重新粘贴 Key 试连都通、接着玩" 900 node dsdirect.js
}
start ai.js && {
  WEB_PORT=$((GAME_PORT + 7)); (cd "$ROOT/web" && exec python3 -m http.server "$WEB_PORT" --bind 127.0.0.1 > "$WORK/web.out" 2>&1) & PIDS+=($!); sleep 1
  run "网页版：在线打开、存到电脑上双击打开，只填 Key 就能玩（坏 Key 说清、开局、接着玩、刷新还在）" 900 env WEB_URL="http://127.0.0.1:$WEB_PORT/play.html" WEB_FILE="$ROOT/web/play.html" node webds.js
  # 账号模式先关着（ACCOUNTS_ON = false），账号检测暂停；重新启用时把下一行的 # 去掉
  # run "网页版账号：名字加密码、不用邮箱手机；各账号的 Key 存档互不相通、密码不对进不去、同名不能再注册、第一个账号接手旧存档" 600 env WEB_URL="http://127.0.0.1:$WEB_PORT/play.html" node webacct.js
}
if [ -z "${QUICK:-}" ]; then
  start nasty.js && run "捣乱 AI：格式怪、字段类型错、慢、空" 1700 node drive2.js 40 "$GAME_PORT"
  start chaos.js && run "两成出错的 AI 连玩" 1500 node drive.js
  start nasty.js && run "乱点：边玩边改设置、停下、重写、改稿、分支、读档、刷新" 1500 node fuzz.js 70
  stop_all
  say "测速（假 AI 照真实的慢缩成十分之一，开局 + 三回合）"; (cd "$ROOT" && MOCK_PORT=$((MOCK_PORT+10)) GAME_PORT=$((GAME_PORT+10)) LAT=1 timeout 900 bash web/tests/perf.sh 3 2>&1 | grep -E '^(OPEN|TURN|PERF)' | sed 's/ bg-before.*//') | tee "$WORK/perf.out"; grep -q "PERF OK" "$WORK/perf.out" || bad "测速：一回合太慢"
  say "桌面服务端自测"; (cd "$ROOT/rpg-kernel" && timeout 400 node test_runner.js 2>&1 | grep 汇总) | tee "$WORK/tr.out"; grep -q "FAIL 0" "$WORK/tr.out" || bad "桌面服务端自测"
fi
echo; [ $FAIL -eq 0 ] && echo "全部通过" || echo "有不合格项，不许发布"
exit $FAIL
