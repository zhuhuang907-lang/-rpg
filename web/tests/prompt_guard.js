// 提示词护栏：防止以后再把示范删光、把思考关掉、把格式规则弄丢（这次剧情变差就是这么来的）
// 跑法：node web/tests/prompt_guard.js（不用浏览器）
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'game.src.html'), 'utf8');
const server = fs.readFileSync(path.join(__dirname, '..', '..', 'rpg-kernel', 'server.js'), 'utf8');
const rules = (src.match(/function storyRules\(\) \{\s*return `([\s\S]*?)`;\n\}/) || [])[1] || '';
const checks = [
  ['写正文的规则还在', rules.length > 2500],
  ['笔法示范至少两段', (rules.match(/^——/gm) || []).length >= 4],
  ['整回示范两段', /整回的样子（两段示范/.test(rules) && /青苗/.test(rules) && /通州/.test(rules)],
  ['分段规则', /人物说话另起一段/.test(rules)],
  ['不替主角说话、对话路途归玩家', /主角只做玩家说的/.test(rules) && /对话和路途归玩家自己/.test(rules)],
  ['一句多动作先写第一步', /先写第一步/.test(rules)],
  ['官职写清本官差遣上司', /本官/.test(rules) && /差遣/.test(rules)],
  ['铁律卡在请求最前、结尾重述', /IRON_HEAD \+ what/.test(src) && /IRON_TAIL \+ '\\n\\n照规则写正文/.test(src)],
  ['写正文开深度思考（桌面版）', /kind === '写戏'\) extra = \{ \.\.\.extra, thinking: true \}/.test(src)],
  ['篇幅八百到一千五', /normal: '八百到一千五百字'/.test(src)],
  ['首行和当前情况由程序生成', /function curStatus/.test(src) && /curHtml\(c\.cur\)/.test(src)],
  ['程序分段兜底', /const paras = t => autoParas\(t\)/.test(src)],
  ['搜索结果剔除影视小说', /FICTION_SNIP\.test/.test(src)],
  ['推演与正文都带玩家留下的痕迹', /footprintBlock\(s\)/.test(src) && /fp \? fp \+/.test(src)],
  ['官员名册进材料', /officialsBlock\(s\)/.test(src)],
  ['传闻按路程到达', /function newsArrive/.test(src) && /newsArrive\(S\)/.test(src)],
  ['不给玩家看将来的史事', !/<span class="seal">后<\/span>将要发生/.test(src)],
  ['开局立家业（后台照开场立）', /s\.estateDue = true; s\.estateStory = /.test(src) && /buildEstate\(s0, s0\.estateStory/.test(src) && /const cashCap = /.test(src)],
  // 一回合别再一步接一步地干等：后台活最多等三秒；审读、核实、记账一起做；整段重写最多一次
  ['回合不干等', /Date\.now\(\) - t0 < 3000/.test(src) && !/Date\.now\(\) - t0 < 20000/.test(src) && /const critP = par \? critic\(\) : null/.test(src) && /function within\(/.test(src) && !/verifyText\(S, said, st\.text, rewrite\)/.test(src)],
  ['开局不派差事', /开场不安排人来给主角派差事/.test(src) && /「眼下」「今年」开局不给/.test(src) && !/可以奔的目标<\/b>/.test(src)],
  ['差事是偶尔的', /别人找上门托事、派差事是偶尔的/.test(rules)],
  ['历史主线每回都露样子', /主线也一直在走：每回都让它在此地/.test(rules)],
  ['皇帝节度使立国势账', /function buildRealm/.test(src) && /if \(isRuler\(s\)\) return buildRealm/.test(src)],
  ['填了博查 Key 就用（试搜没通也用，玩家关了才不用）', /const isBocha = await bochaOn\(\)/.test(server) && /!readStatus\(\)\.bochaOff/.test(server)],
  ['战斗由程序结算、正文照结果写', /function resolveBattle/.test(src) && /battleBlock\(ruling\.battleResult\)/.test(src) && /applyBattle\(S, ruling\.battleResult\)/.test(src)],
  ['身份切换照账册自动判断', /autoIdentity\(s, extra\)/.test(src)],
  ['军阀领主也立国势账', /领主\|诸侯/.test(src)],
  ['推演模块：通用卡每回带，专门卡按这一步挑', /modulesBlock\(said, ruling\)/.test(src) && /\$\{modulesBlock\(said\)\}/.test(src) && /战争: `/.test(src) && /人情: `/.test(src)],
  ['时代错位嗅探', /anachronisms\(s, text\)/.test(src)],
  ['先维基后博查、矛盾信博查', /维基与博查说法矛盾时以博查为准/.test(src)],
  ['存档不存地理、上一版最后才丢', /const saveJSON = /.test(src) && /> 240000 && s\.prev\) s\.prev = null/.test(src)],
];
let bad = 0; for (const [name, ok] of checks) { if (!ok) bad++; console.log((ok ? '通过  ' : '不合格  ') + name); }
console.log(`提示词护栏：${checks.length} 项，不合格 ${bad} 项`); process.exit(bad ? 1 : 0);
