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
trap 'stop_all; rm -rf "$WORK"; rm -f /tmp/rpg-qa.lock' EXIT
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
echo $$ > /tmp/rpg-qa.lock   # 完整测试跑着时不许别处重新构建（build.py 照这个锁拒绝），免得测到一半页面被换掉
FP0=$(bash "$ROOT/scripts/fingerprint.sh")   # 这一轮测的是哪一份源码（需求台账 R-132）
say "提示词护栏"; node "$ROOT/web/tests/prompt_guard.js" | tail -1; [ ${PIPESTATUS[0]} -eq 0 ] || bad "提示词护栏"
say "规则回归"; node "$ROOT/web/tests/rules_regress.js" | tail -1; [ ${PIPESTATUS[0]} -eq 0 ] || bad "规则回归"
say "五代十国朝廷数据（任务六）"; node "$ROOT/web/tests/court_data.js" | tail -1; [ ${PIPESTATUS[0]} -eq 0 ] || bad "五代十国朝廷数据"
say "江山时序：本机服务替玩家下到 data/cache/jiangshan、只认两个文件、不是地图数据不收、下过不再下"; JS=$(node "$ROOT/web/tests/jsmapsrv.js" 2>&1 | tail -1); echo "$JS"; echo "$JS" | grep -q "ERRS \[\]" || bad "江山时序下载"
say "历史原文库：65 本在库、按书检索真语料带出处、非法书号安全跳过"; CS=$(cd "$ROOT" && node "$ROOT/web/tests/qa/citesrv.js" 2>&1 | tail -1); echo "$CS"; echo "$CS" | grep -q "ERRS \[\]" || bad "历史原文库"
say "端口被占：别的程序占着往后挪、游戏已经开着不另开"; PF=$(node "$ROOT/web/tests/portfallback.js" 2>&1 | tail -1); echo "$PF"; echo "$PF" | grep -q "ERRS \[\]" || bad "端口被占"
KEYVAL= start ai.js && run "填 Key：粘贴、保存、换 Key、型号、博查、开关、输入不丢" 300 node keyflow.js
start ai.js && {
  run "巡检（开局 + 三回合 + 十个侧栏）" 600 node tour.js
  run "打仗全程实玩：宣战出兵、开拔、兵临城下、探报、真打一仗、拿下城、地盘地图记上、战争进度加分；别家的城不许不打就占（R-144）" 400 node warplay.js
  run "桌面版：本机服务存 GLM Key、试连、转交 GLM、清除（R-135）" 200 node glmsrv.js
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
  run "开局一次查齐：开场写完挡着输入框把后台的活做完（没做成的当场再做），做完才放第一步；界面不写上回没推成" 900 node prep.js
  run "绝不卡死：记账留下坏条目、有一页画不出来，第二回「我要去酒楼」照样往下走；正忙放不开二十秒自己放开" 900 node stuck.js
  run "聊天一样快：家常的一句话不深想、不另起审稿；要紧的一步照旧深想、审稿；人物有口吻" 900 node light.js
  run "玩家只过日子：天下推演照样跑，要紧的人自己办事落到账上，不凭空添人" 900 node idle.js
  run "朝局：总览、人事树、国策书、委任花国策点、到任落到树上、死人委任不了、身份低只能看；人物照关系淡出不删" 600 node court.js
  run "朝政与军务：国势阶层、时政期限、召见每月三次各照派系、照主张拟诏、处置结掉、国势增减；兵种核定与自定、募编加营、按月扣饷粮、按兵种和地形宽窄打仗" 600 node statecraft.js
  run "真人和别朝人同名不改名、跨朝代的同一个人不拆成两个、已认作真人的不被翻成虚构" 120 env PLAY="$ROOT/web/play.html" node samename.js
  run "舆图不留圆圈和空白、不串年代（后世府名、总管府、改名后旧名并存）、放大后治所都写名字、府名写全、大图照屏幕宽高" 300 env PLAY="$ROOT/web/play.html" node mapfix.js
  run "正文紧扣玩家这一步：结尾再交代原话、主角身份、前几步、上一回停在哪、字数；字数超出一半或不到一半打回改稿（R-134）" 120 env PLAY="$ROOT/web/play.html" node narr.js
  run "读书人以上（宗室、读书人、乡绅）能看朝局、百姓看不到；这一年这一家的真官员不当撞名改掉、旧档改回原名（R-136、R-137）" 120 env PLAY="$ROOT/web/play.html" node court2.js
  run "GLM 写故事和推演、DeepSeek 做杂活、GLM 出错退回 DeepSeek、设置页填 GLM Key 改分工（R-135）" 120 env PLAY="$ROOT/web/play.html" node glm.js
  run "作战按天打：宽度、战术相克、组织度、追击合围、城破被俘；自创战法 AI 评估有上限、条件不合用不上；战报逐日；军务页真点（R-141）" 200 env PLAY="$ROOT/web/play.html" node battle.js
  run "外交卡（修好结盟联姻称臣互市）、战局、补给线、战争进度与议和割地、敌国来犯；外交只给一方之主、寨主义军是绿林往来、商人大臣没有（R-142、R-143）" 200 env PLAY="$ROOT/web/play.html" node diplo.js
  run "按钮都有效果：资料没推好挡住的按钮点了当场去推、推好就能用；没填内容的按钮说清楚缺什么（R-144）" 300 env PLAY="$ROOT/web/play.html" node buttons.js
  run "打仗不止攻城、敌国之主和手下大臣由 DeepSeek 扮演主动行事：敌军开拔走到真打、设伏劫粮劫营迎击、和书、奏章准驳落账、将领便宜行事（R-145）" 200 env PLAY="$ROOT/web/play.html" node rivals.js
  run "战争第一期：人力池募兵、围城每天涨进度出事粮尽投降俘将、强攻撤围真点、将领阅历特质、占领按月加分、厌战掉民心、停战毁约、俘虏赎放斩、陷敌将领赎回（R-139）" 200 env PLAY="$ROOT/web/play.html" node war1.js
  run "战争第一期后半：甲械工坊真点、缺甲打折、募兵领甲每月补甲、过长江要船造船真点、召臣属出兵真点半年回去、军团勾选编路派战线令守令攻、会同围城兵力合算一齐强攻（R-139）" 200 env PLAY="$ROOT/web/play.html" node war2.js
  run "当面说：外交、议和、劝守将开城、劝俘虏归顺、写信请名士，玩家写说辞、DeepSeek 判允不允、允了落账不允态度掉、一月一回、说辞重画不丢；吴、吴越不混（R-148）" 200 env PLAY="$ROOT/web/play.html" node parley.js
  run "草根线：拉队伍、招人看户口人缘与上限、操练升兵种、买粮发饷欠了就逃、行军遇事停步、打跑放说、俘虏收编卖放、村子帮工勒索洗劫、酒肆寻好汉请入伙忠心掉光就走、打听差事接下办成、占山立寨修寨每月出息、恶名到了官府派兵追来真打、扯旗称王接到一方之主、山大王说招安，全真点（R-147）" 200 env PLAY="$ROOT/web/play.html" node party.js
  run "臣子线：公事挑办法定成败、考成国势变、收钱回绝、被参认罪说情自辩、上疏言事、派系拉人、误期扣分、年底评等第卓异两回劣罢官，全真点（R-149）" 200 env PLAY="$ROOT/web/play.html" node off.js
  run "百姓线与国债商路：一家吃穿挨饿病倒、佃田秋收、借还债到期卖身、加派交了告官、捐出身、逃荒成流民能拉队伍、投军；借国债上限付息失信、开商路商税涨开战就断，全真点（R-146）" 200 env PLAY="$ROOT/web/play.html" node hh.js
  run "政治：议事会挑人派差每月见效怨恨打折、封臣契约重了进项多不满到头叛离、派系逼宫答应收买拒绝起兵当面说服、律法要威望一年一回王权强田赋多派系怨，全真点（R-146）" 200 env PLAY="$ROOT/web/play.html" node pol.js
  run "尾项补完：移驻绕开把守的关、敌军出来截路、对岸有敌军抢渡水战、粮队被劫；夺嫡输了的下场、真人宗室照史料定处境、袭爵清降明不降；公主和亲下嫁入道；女子说亲入宫出家；外放内调；殿试中进士授官，全真点（R-153 R-154 R-155 R-157 R-149）" 300 env PLAY="$ROOT/web/play.html" node finish.js
  run "人称称谓与 GLM 分工：二十种身份叫法、女主角家人下人叫法、第二人称规矩、唐朝写王爷被挑出；只填 GLM 能开局、首页有 GLM 栏；当面说说亲走 GLM（R-162、R-135）" 200 env PLAY="$ROOT/web/play.html" node address.js
  run "继承法四种真管用、死后照法定人；内廷宦官外戚涨落、抑与倚重全真点（R-164、R-165）" 200 env PLAY="$ROOT/web/play.html" node inner.js
  run "zcode 那批改正：互谋走 DeepSeek、不构陷君主本人、敛财带单位、票拟封驳照朝代、渡河看对岸敌军；用重臣那道关照朝代叫（R-163、R-167 补正）" 200 env PLAY="$ROOT/web/play.html" node r163fix.js
  run "国计民生按季推演：年成米价商贸流民制度落地落账、商税军粮跟着变、写正文带市面；囤米粜米施粥开仓平粜以工代赈全真点（R-168）" 200 env PLAY="$ROOT/web/play.html" node minsheng.js
  run "后勤补全：本色经漕运入太仓、京城被围运不进；就地征粮真点（自家掉民心、别家记恨、半年再征减半、一月一回）；敌军远来逃散；后勤栏写够吃几个月（R-169）" 200 env PLAY="$ROOT/web/play.html" node logi2.js
  run "自己改的元接着数，不被史书年号盖掉（R-169）" 120 env PLAY="$ROOT/web/play.html" node era.js
  run "南宋金元新史料：1127–1368 年号、真人、史事、制度库都有，真人照生卒出场（R-171）" 120 env PLAY="$ROOT/web/play.html" node era_ssy.js
  run "探马先行到城下当回就打；你任命的官岁末考课（上中下、连两年下考罢黜、七十致仕、卒年病故出缺）；法理凭血统（R-171）" 150 env PLAY="$ROOT/web/play.html" node r171.js
  run "历史原文库取证：按年代挑书、检索词带年号真人、桌面与网页两路出带出处的原文（R-172）" 180 env PLAY="$ROOT/web/play.html" node cite.js
  run "文化线：作诗文评四等、雅集请本地人、文社会文、同月有节度（R-178）" 120 env PLAY="$ROOT/web/play.html" node cult.js
  run "学问手艺：读书涨学问涨文墨、坐馆月束脩、学徒三年出师落本事（R-184、R-188）" 120 env PLAY="$ROOT/web/play.html" node study.js
  run "舆图大修：关卡大表、古道走廊（行军变慢写循某道）、交战红圈、新占地金圈、粮道画线（R-197~202）" 240 env PLAY="$ROOT/web/play.html" node passes.js
  run "朝局核实与主角落位：原文库核人、核不上腾位、seatSelf 落位、你的位子卡、人名门禁（R-203~205）" 240 env PLAY="$ROOT/web/play.html" node orgself.js
  run "剧情像 RPG：史论总结腔打回、第二人称、对话场面、结尾停在拿主意处；家常短步只查史论（R-206~208）" 120 env PLAY="$ROOT/web/play.html" node storychk.js
  run "真人硬门槛：模型夹带的古人（李白）不收、名单外不立档、真人档案只列此刻在世且核实过的、旧档打开就清（R-209~211）" 120 env PLAY="$ROOT/web/play.html" node eragate.js
  run "朝局可玩：朝议摆上页面、玩家表态定成败、待办与回音看得到、位子没落树也有卡、空缺数不虚高（R-212~214）" 120 env PLAY="$ROOT/web/play.html" node courtissue.js
  run "原文库检索：照朝代政权挑书、整词比对、同段多词排前、在命中处摘句、真语料查得到（R-189）" 300 env PLAY="$ROOT/web/play.html" node libsearch.js
  run "三方分工：整理归 DeepSeek、写故事想事情归 GLM、互为后备、材料过长删中间；原文佐证进推演（R-189）" 150 env PLAY="$ROOT/web/play.html" node r189.js
  run "默认全交 DeepSeek；翻史书真点；朝臣互谋、大臣奏事、敌国之主、当面说、立真人档案带史书原文；同查询只查一回（R-192）" 150 env PLAY="$ROOT/web/play.html" node r192.js
  run "四种身份十个页面都不写「不详」（守军、兵数、年岁、品级照制度和常情推）；朝局没整理就自动整理（R-193）" 200 env PLAY="$ROOT/web/play.html" node r193.js
  run "身份转换照账接上：佃农落草招安做官（队伍编营、山寨散、恶名清、按钮收起）罢官交兵权再拉队伍；投军不能拉队伍、逃散成流民能拉；寨主称王队伍编军、山寨并地盘、主公了结；布商捐监生不是官、捐实官候补十月补缺，全真点（R-153）" 200 env PLAY="$ROOT/web/play.html" node shift.js
  run "皇子太子王爷贵族：清皇子问安结交构陷（家谱里的兄弟）韬晦、够格立太子、猜忌到头被废圈禁、清不之藩；明初王爷就藩护卫九千、添募护卫、削藩奉诏、起兵清君侧；唐亲王不之藩；晋门阀门生荐举子弟，全真点（R-157）" 200 env PLAY="$ROOT/web/play.html" node royal.js
  run "各朝入仕：西晋士族寒门请中正品评（上品无寒门）、三年清定、托人打点、照乡品起家清浊；东汉举孝廉拜郎中满一年外补县长、举茂才除县令；唐门荫授官；明有报考，全真点（R-156）" 200 env PLAY="$ROOT/web/play.html" node rushi.js
  run "后勤与地盘染色：太仓转运仓、粮沿路网运路远耗多水运省、敌军截路断粮、每月从仓扣粮、修仓调粮征民夫全真点、图上画仓和补给圆点、地盘大的描外沿、敌军粮道也会被截（R-155）" 200 env PLAY="$ROOT/web/play.html" node logi.js
  run "地图和打仗连在一起：行军照路网（过关渡河、山路慢、沿路地名照当年）、地形照高程、图上兵马沿路挪并画路线、关上敌军先在关下打打不下停在关前、敌军也照路网走（R-154）" 200 env PLAY="$ROOT/web/play.html" node mapwar.js
  run "江湖：置办兵甲马、打擂押注、酒肆闲话照账说、雇镖师、匪巢每月冒出前去剿攻寨缴获和当面说开寨、投效史料在位真人领饷应召推托赐田庄劫村翻脸辞别、被俘关着不能办事脱逃赎身说动看守、头领心愿赏钱回乡误期寒心、差事讨债寻人，全真点（R-152）" 200 env PLAY="$ROOT/web/play.html" node jianghu.js
  run "各身份全按钮普查：一方之主、地方官、山大王、佃农、商人、兵丁、读书人、女子、吏员、流民、皇子、王爷、门阀各页侧栏每个按钮真点，不许页面出错、不许点了什么都不变（R-144）" 1800 env PLAY="$ROOT/web/play.html" node allbtn.js
  run "新月结、面板各自兜底：队伍家计朝局的账坏了页面照画、月结照走（R-151）" 100 env PLAY="$ROOT/web/play.html" node safe.js
  run "天下名录照这一年并立的各家做表，宗室以外的文武大臣都列上，有博查的逐个按名字核，不按清朝写死问法" 120 env PLAY="$ROOT/web/play.html" node roster.js
  run "年岁不许人人三十：记账给的岁数不收、账上一排同一个整十岁数没依据的挑出来交 DeepSeek 照经历重推" 120 env PLAY="$ROOT/web/play.html" node age30.js
  run "家室合常情：成年富户贵族照常情补上妻妾子女仆婢（标推算写依据、不写某），年岁不合常理的当场改" 600 node household.js
  run "营生与本事：属性本事声望品行、本事越用越长、此地行情差事门客、当场买卖拦钱不够驮不动、贵处卖出赚、应下差事、招揽门客、按月给薪" 600 node sandbox.js
  run "统一身份：八种身份照账判定，总兵不是一方之主、寨主管不了县令、商人不是统治者、别人的官和兵不算自己的" 120 env PLAY="$ROOT/web/play.html" node identity.js
  run "局面卡与按需材料：推演、写正文、记账先给局面卡（身份、权限、手里的），记账只附相干字段、只报变化，要紧的不丢" 120 env PLAY="$ROOT/web/play.html" node context.js
  run "自家势力：山寨、商号、商队、宗族、乡勇、绿林共用一套账，人数照军务、本钱照营生，建入退换头领增减迁资结交散，权不互转" 120 env PLAY="$ROOT/web/play.html" node orgs.js
  run "世界自己转：要紧的人照身份、所在、资源、关系自己办事落到账上，账上没有的人不收，兵数不凭空涨，暗地里的只进幕后，外地出事落到辖区，检索词并成一批（五种身份）" 120 env PLAY="$ROOT/web/play.html" node world.js
  run "军政：军令程序当场办（募编分兵合兵换将拨粮改编裁撤）、钱人兵不够当场说明、记账改不了主角兵数、科技照年代开放成了真改战力、推演列 lookup 程序查账给写正文和记账" 120 env PLAY="$ROOT/web/play.html" node mil.js
  run "按钮真点得动：六种身份每页每个按钮真点一下不报错；输入框上有这个身份能办的事、点了写进框里" 900 env PLAY="$ROOT/web/play.html" node clickall.js
  run "新制与改革、建号改元、职权内选官：改革职权以内当场推行按月见效、建号改元当场改、招贤来的人当场任命、平民没有这个窗口" 120 env PLAY="$ROOT/web/play.html" node reform.js
  run "百姓科举、经营：功名照朝代一级级考、到月程序定中不中、进士授官、隋以前察举；开铺子由 DeepSeek 判行情、程序按月结算、增资收铺、记账改不了本钱" 120 env PLAY="$ROOT/web/play.html" node livelihood.js
  run "各种身份都能玩：地方官管辖区、山大王管山寨能劫掠、武官管自己的兵、节度使土司酋长是一方之主、开局照史料查统带的兵、局面页摆出辖区和兵马" 120 env PLAY="$ROOT/web/play.html" node roles.js
  run "朝局令当场办：一方之主任命跟前的当场到任、远处的下一回到任、罢免增设裁撤当场办、国策走诏令回报了才算已行；写正文吩咐了就办不说空话；日本新罗西域西南夷南越林邑都在" 120 env PLAY="$ROOT/web/play.html" node courtnow.js
  run "任职里的遭遇不算官职：削籍归里、罢归、致仕、下狱论死不再当成此刻的官职，括注里的经历去掉（任务三，R-221）" 120 env PLAY="$ROOT/web/play.html" node postclean.js
  run "朝堂先查表、后补缺：内置史料里这一年在任的真人先坐位子，模型改不了他们的官、抢不了位子；玩家任命的不动；朝廷可以不满员（任务三，R-221）" 120 env PLAY="$ROOT/web/play.html" node courttable.js
  run "任职年表：晚明照哈佛库整理的表先坐位子（户部尚书照表），后金不套明朝的表，朝局页看得见（任务六，R-225）" 150 env PLAY="$ROOT/web/play.html" node tenure.js
  run "各年代任职年表：资治通鉴逐年任免（三国两晋十六国南北朝五代）与哈佛库唐末五代十国表照政权取；前秦王猛不混进东晋；东西魏并立只写魏不乱认；前秦开局吏部尚书照表坐王猛（R-226）" 150 env PLAY="$ROOT/web/play.html" node tenure2.js
  run "南北朝、隋唐前期君主年号：君主照正史、年号照哈佛库年号表，换君改元同年归对人；只有君主年号的表不挡联网自建史事；东魏开局年号是武定（R-226）" 120 env PLAY="$ROOT/web/play.html" node rulers2.js
  run "五代十国朝廷照数据排：荆南小国十几个位子，明载、推定的人坐原位，空位照用人来路补人、标虚构、不与真人重名、重开同一人；南平也认（任务七，R-227）" 150 env PLAY="$ROOT/web/play.html" node wudai_court.js
  run "官员名录也照任职年表和朝廷数据：明 1625 年表上的户部尚书、荆南 926 年高季兴高从诲进名录，模型不给人也有；真点人物页看得到（R-225、R-227）" 150 env PLAY="$ROOT/web/play.html" node rostertable.js
  run "兵力虚实：敌军只给估计（传闻虚张、给范围），真点派探子探准，探报一年就旧；自己直接统的兵照实数（任务三，R-221）" 150 env PLAY="$ROOT/web/play.html" node troopfog.js
  run "虚构人物戏份：程序补的虚构人物，没提拔、没打过交道的，写给模型时标「虚构·照常供职」并附不给戏份的规矩；提拔了、有情分、找上他的照常写（任务三，R-221）" 120 env PLAY="$ROOT/web/play.html" node fictbench.js
  run "大人物照真官：隋唐尚书令照例不授、不起虚构的；三品以上查不到真人就空着待查、后台再查；小吏照旧起名；旧存档清掉大位子上的虚构名字；一方之主能破例除授、小官保举不了" 120 env PLAY="$ROOT/web/play.html" node officials.js
  run "出征真能打：军务页出征单列邻近的城（归谁、多远、几日、胜算、守军不详不编）、点进攻当场立行军、静候军报、撤回；营数整数、总数和战报对得上；胜负折损看对面战力" 120 env PLAY="$ROOT/web/play.html" node march.js
  run "用江山时序的版图：只当数据解析不执行、照多边形认各家、没画到的照内置；测试里不自动下；玩家亲手打下丢掉的才改图" 120 env PLAY="$ROOT/web/play.html" node jsmap.js
  run "官场门道与谋升迁：仕途页摆门道和照例数目、打点上司一月一回、清廉的退礼、结同年攒人脉、求保举下月定准驳、准了改官记履历" 120 env PLAY="$ROOT/web/play.html" node shitu.js
  run "舆图放大不变花、稍放大有府州界和州名、自己的辖区朱红线圈出、局面页仕途页「在舆图上看」点得动、平民没有" 120 env PLAY="$ROOT/web/play.html" node mapdomain.js
  run "真人不标虚拟、DS 一表核真假、朝堂全表并进人事树带派系关系、立嗣落到情分名声和睦派系临门、后宅宠冷落到情分和睦（真点按钮）" 120 env PLAY="$ROOT/web/play.html" node courtfull.js
  run "皇帝管全国：地盘是全部州府、照地域分列、州名点了到图上；称臣附庸、唐中后期藩镇另列写朝廷管到哪；州名字够大、大图铺满屏幕；正统王朝土黄" 120 env PLAY="$ROOT/web/play.html" node emperor.js
  run "各种身份过日子：庙号认皇帝、行情表、土匪劫道绑票孝敬寨规围剿招安、地主收租加减租置田放债抗租、佃户短工、主母查账女红、后妃晋位、女子不应考、身份卡（真点按钮）" 120 env PLAY="$ROOT/web/play.html" node life.js
  run "起义流寇：李自成黄巢太平军照史书转战上图、义军逼近百姓官员各有应对、小兵立功升级逃投、首领裹挟开仓号令；皇帝起义宗室不应考、唐代门荫入幕流外；人事树不写待查；招贤本地名人照性子来；进士搜不到照史书列（真点按钮）" 120 env PLAY="$ROOT/web/play.html" node rebel.js
  run "各身份的日子：官军军阶照朝代（绿营卫所营兵禁军府兵部曲）、功劳到头要保题、饷欠饷讨饷吃空饷被参；商人会馆远货赊账伙计关卡；私下的日子名目照身份（皇帝后妃女子寨主僧人知县）、花钱照行情、过节、会病要请郎中（真点按钮）" 120 env PLAY="$ROOT/web/play.html" node life2.js
  run "自己不进自己的家谱（宗室子弟的兄弟里没有他自己）、史书往后一直接着修（没有博查也修、存进存档、离尽头不到六年再修）、天下消息照身份传到、国丧禁宴乐、各州府长官一表补齐（虚构的标虚拟、待查不收）" 120 env PLAY="$ROOT/web/play.html" node hist2.js
  run "大官上网一个个核、核不上的换问法再搜换人；日后显达的人此刻在下位照真人贴进树里（不标虚拟）；新制的阻力落账、只写当面反对的、强推缓行罢议真点有后果；账里的怪数取整（真点按钮）" 120 env PLAY="$ROOT/web/play.html" node real3.js
  run "官员系统·一：位子分甲乙丙三等，名字只从一个口子进（低来源不盖高来源、死人小孩不收、一人一个实职、玩家任命的不动）、丙等只写员额（真点朝局页）" 120 env PLAY="$ROOT/web/play.html" node seat.js
  run "人才年表进档案、名臣谱只写此刻不剧透、没碰过的照史书调、靠山没了转本局、招揽拜访（真点按钮）" 120 env PLAY="$ROOT/web/play.html" node tl.js
  run "宣战名分（讨逆复仇收复吊民伐罪开疆）、不宣而战的后果、做官的奏请与擅启边衅、议和；国计民生每月收支照户口农业灾情赋税算、政策工程有后果；地名不串年代（真点按钮）" 120 env PLAY="$ROOT/web/play.html" node warfisc.js
  run "周边各族也画也能玩、君主自己划分政区（改名改隶分置定都筑城）、州府看得到户口（照地理志推、写依据）" 120 env PLAY="$ROOT/web/play.html" node frontier.js
  run "每个时期都分政权画：五代十国长安一带不空、各国和中原王朝不同色、DeepSeek 并成一家也照内置史料分开、各时期要紧城池归对政权" 120 env PLAY="$ROOT/web/play.html" node realms.js
  run "人物页身边和远处分开（远处写信遣使）、不摆出处引文、真人主角不添虚构下人、中古的虚构名字像那时的士人" 120 env PLAY="$ROOT/web/play.html" node circle.js
  run "势力页天下各家全列、自家不列成别人、不留空白；人的本事只写品第不写数" 120 env PLAY="$ROOT/web/play.html" node power.js
  run "舆图缩放跟人走、兵牌军情卡、胜算照别国守军算、天时与军中突发之事、一个字的州认得出" 120 env PLAY="$ROOT/web/play.html" node warmap.js
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
# 全部通过就记下源码指纹；提交时 scripts/check.sh 核对（需求台账 R-132）
[ $FAIL -eq 0 ] && [ "$(bash "$ROOT/scripts/fingerprint.sh")" = "$FP0" ] && echo "$FP0" > "$ROOT/.qa-pass"   # 指纹在开头构建完就记下；测试跑着时源码又改了的，不算通过
exit $FAIL
