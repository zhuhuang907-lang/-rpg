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
  (cd "$WORK/rk" && BOCHA_BASE=http://127.0.0.1:$MOCK_PORT RPG_NO_UPDATE=1 PORT=$GAME_PORT WIKI_BASE=http://127.0.0.1:$MOCK_PORT WIKIDATA_BASE=http://127.0.0.1:$MOCK_PORT TGAZ_BASE=http://127.0.0.1:$MOCK_PORT CHGIS_BASE=http://127.0.0.1:$MOCK_PORT/chgis/ NO_PROXY=127.0.0.1 exec node ./server.js > "$WORK/srv.out" 2>&1) & PIDS+=($!)
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
  run "不要图片：局面、人物册不摆画像，没有捏脸按钮，材料里不塞捏出来的相貌" 600 node face.js
  run "存档：两局并存、读回、删除（确认不被重画冲掉）、刷新不复活、游戏里切换" 900 node saves.js
  run "边写边显示：写稿核对时看得到初稿、不露幕后、写完换定稿" 900 node livedraft.js
  run "改错不卡：一键反馈、说写错了、改这段文字、重写这一条，改完接着玩" 900 node fixflow.js
  run "开关与按钮：旧版的「关」不生效、篇幅记住、自检网络报告更新分支换 Key 都有结果、侧栏无怪字、建议只写进输入框" 600 node controls.js
  run "旧存档：缺新册子、旧写法的局读得进来、每页画得出、能接着玩、刷新还在" 600 node oldsave.js
  run "行动单：玩家的话分问计请令试开单子、记账只报进展、三回没下文明写、没有令的兵和地不落账" 600 node acts.js
  run "绝不卡死：记账留下坏条目、有一页画不出来，第二回「我要去酒楼」照样往下走；正忙放不开二十秒自己放开" 900 node stuck.js
  run "聊天一样快：家常的一句话不深想、不另起审稿；要紧的一步照旧深想、审稿；人物有口吻" 900 node light.js
  run "玩家只过日子：天下推演照样跑，要紧的人自己办事落到账上，不凭空添人" 900 node idle.js
  run "朝局：总览、人事树、国策书、委任花国策点、到任落到树上、死人委任不了、身份低只能看；人物照关系淡出不删" 600 node court.js
  run "朝政与军务：国势阶层、时政期限、召见每月三次各照派系、照主张拟诏、处置结掉、国势增减；兵种核定与自定、募编加营、按月扣饷粮、按兵种和地形宽窄打仗" 600 node statecraft.js
  run "家室合常情：成年富户贵族照常情补上妻妾子女仆婢（标推算写依据、不写某），年岁不合常理的当场改" 600 node household.js
  run "营生与本事：属性本事声望品行、本事越用越长、此地行情差事门客、当场买卖拦钱不够驮不动、贵处卖出赚、应下差事、招揽门客、按月给薪" 600 node sandbox.js
  run "统一身份：八种身份照账判定，总兵不是一方之主、寨主管不了县令、商人不是统治者、别人的官和兵不算自己的" 120 env PLAY="$ROOT/web/play.html" node identity.js
  run "局面卡与按需材料：推演、写正文、记账先给局面卡（身份、权限、手里的），记账只附相干字段、只报变化，要紧的不丢" 120 env PLAY="$ROOT/web/play.html" node context.js
  run "自家势力：山寨、商号、商队、宗族、乡勇、绿林共用一套账，人数照军务、本钱照营生，建入退换头领增减迁资结交散，权不互转" 120 env PLAY="$ROOT/web/play.html" node orgs.js
  run "世界自己转：要紧的人照身份、所在、资源、关系自己办事落到账上，账上没有的人不收，兵数不凭空涨，暗地里的只进幕后，外地出事落到辖区，检索词并成一批（五种身份）" 120 env PLAY="$ROOT/web/play.html" node world.js
  run "军政：军令程序当场办（募编分兵合兵换将拨粮改编裁撤）、钱人兵不够当场说明、记账改不了主角兵数、科技照年代开放成了真改战力、推演列 lookup 程序查账给写正文和记账" 120 env PLAY="$ROOT/web/play.html" node mil.js
  run "周边各族也画也能玩、君主自己划分政区（改名改隶分置定都筑城）、州府看得到户口（照地理志推、写依据）" 120 env PLAY="$ROOT/web/play.html" node frontier.js
  run "每个时期都分政权画：五代十国长安一带不空、各国和中原王朝不同色、DeepSeek 并成一家也照内置史料分开、各时期要紧城池归对政权" 120 env PLAY="$ROOT/web/play.html" node realms.js
  run "舆图着色：谭图真界下好几家政权照政权上色、你的地盘真上色、别家地盘写到省一级的照省上色、聚众据地的画商帮不画" 120 env PLAY="$ROOT/web/play.html" node mapcolor.js
  run "吩咐有回音、后果要合理：跟前能办的令当回办成、拖了两回的必须见分晓、诏令没缘由不打折、应对过的不罚误期、一个月新来的事有上限、起兵先有密报" 120 env PLAY="$ROOT/web/play.html" node feedback.js
  run "年岁与名字：长幼次序（兄姐弟妹、伯叔、长次子）不许颠倒、颠倒的交 DeepSeek 重推、一定给数；叙述里不许某地某日某事" 120 env PLAY="$ROOT/web/play.html" node ages.js
  run "新系统吃乱数据：四种身份×记账给出各种怪格式的国势、阶层、时政、军令、人事、本事、差事×每个侧栏，不报错、不露 undefined NaN [object Object]" 300 env PLAY="$ROOT/web/play.html" node garbage.js
  run "家族与人情：族谱、立嗣、生活方向按月长本事、谋划按月推进有成败败露、结果进下一回材料、好感有来由、关系名号" 600 node clan.js
  run "真人核查：开局可选自动／史上真人／虚构，真人查维基条目、维基数据、博查再由 DeepSeek 判，查不到不开局；大官自动查、查无此人另挑真人；人物页逐人核查" 900 node person.js
  run "剧情扩展：照此时此地备几件会找上门的事，平平无事时挑一件写进来（不打断不改命令），注明来由、可走的路成按钮" 600 node hooks.js
  run "舆图：按当年州府画天下与一省、地盘与各方着色、兵马战场、点一处出详情、就地下军令" 600 node smap.js
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
LAT=1 start ai.js && run "照真玩家的玩法连玩六回（假 AI 照真实的慢、读几秒就出下一步）：后台不饿死，天下推演、家底、眼下的事、临门的事都做成" 1700 node realplay.js 6
stop_all
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
