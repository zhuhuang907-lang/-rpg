// 捣乱的假 AI（OpenAI 兼容 + 假搜索）：多数时候给像样的回复，约两成故意出各种岔子；记下每次调用的提示长度
const http = require('http'); const fs = require('fs');
let n = 0; const LOG = 'calls.log'; fs.writeFileSync(LOG, '');
const R = a => a[Math.floor(Math.random() * a.length)];
const chance = p => false;
const names = ['程立德', '周四', '汪方氏', '卢见曾', '高恒', '韩掌柜', '赵书吏', '李二'];
const PAS = [
 '程立德把账本摊在案上，用镇纸压住两角，却不先开口。你看他额上那层细汗，知道不是好事。\n「东家，」他终于说，「仪征掣验所报上来，上月那批引盐，秤下短了二百引。」\n「短了？」\n「掣验的大使说是卤耗。可小的去年也押过一回船，从没短过这么多。」他顿了顿，声音压得更低，「船户里有个叫周四的，前天在钞关那边喝醉了，说漏了嘴，说是有人在瓜洲就把盐卸了一截。」\n窗外起了风，院里那棵老槐沙沙地响。你问他，这话还有谁听见。\n「就钞关上两个巡丁。」程立德抬起眼，「东家要不要小的去把周四找来？」',
 '你到运司衙门门房时，已过了巳时。门上的书吏认得你，起身作了个揖，却说卢运使一早去了天宁寺，陪几位翰林看新刻的诗集，今日怕是不回衙了。\n「那高二爷呢？」\n书吏笑了一笑：「高二爷在后头签押房，汪老爷要见，小的去通禀一声。不过——」他把手往袖里一揣，「今儿个找高二爷的人多。」\n你会意，让跟班的韩福递过去一个小纸包。书吏掂也不掂，揣进怀里，转身进了二门。\n等了约莫一盏茶的工夫，里头出来个穿石青袍子的中年人，正是高恒手下管掣验的高二。他见了你，先拱手道喜，说听说令郎今春进了学，又问汪老太太的眼疾可好些了。寒暄了三四句，才把话头往盐上引：「汪老爷是为仪征那二百引来的吧？」',
 '一连下了半个月的雨，运河涨了两尺。东关街上的米铺把价牌改了两回，一石糙米从一两五钱涨到一两八钱，买米的人排到了街口。\n家里倒还安稳。承裕每日去梅花书院听讲，回来便关在书房里。老太太说他瘦了，叫厨房每晚给他炖一盅鸡汤。\n月半那天，程立德从仪征回来，说周四找着了，在瓜洲一个远亲家躲着。人是带回来了，可死活不肯开口，只说要见东家本人。\n「他怕什么？」\n「怕江家。」程立德说，「他说那截盐，是卸给江家的船的。」',
];
let pi = 0;
function story(talk) {
  if (talk) return '【戏外】\n乾隆二十年前后，两淮一引盐在场上收价不过一两出头，加上课银、杂费、运脚，到汉口岸上卖出去，好年景一引能有一两上下的赚头。不过这是账面，打点运司、掣验所的规费另算。';
  const t = PAS[pi++ % PAS.length];
  return t + '\n【幕后】周四其实收了江家二十两银子。';
}
function ledger(p) {
  if (/主角这回下的军令/.test(p) || /【玩家这回说】[^\n]*处置「/.test(p)) { const r = p.match(/募编(\S+?)(\d+)营/), f = p.match(/下令：给(\S+?)募编/), q = p.match(/【玩家这回说】[^\n]*处置「(.+?)」/); return JSON.stringify({ elapsedDays: 31, turnSummary: '军令', govChanges: [{ key: '民心', delta: 3, why: '赈济' }, { key: '国库', delta: -5000, why: '拨银' }], armyResults: r ? [{ force: f ? f[1] : '', act: '募编', ok: true, n: +r[2], tpl: r[1], why: '募得' }] : [], affairResults: q ? [{ title: q[1], result: '解决', why: '处置得当' }] : [] }); }
  if (/【朝局待办（主角这回/.test(p)) { const m = p.match(/任命(\S{2,4}?)为(\S+?)[（。]/); const q = p.match(/颁行「(.+?)」/); return JSON.stringify({ elapsedDays: 31, turnSummary: '下令', orgResults: m ? [{ office: m[2], person: m[1], result: '到任', why: '奉旨赴任' }] : [], policyResults: q ? [{ name: q[1], result: '颁行', why: '诏下' }] : [] }); }
  if (/【玩家这回说】[^\n]*坐船去苏州/.test(p)) return JSON.stringify({ elapsedDays: 3, nowAt: '苏州府吴县', turnSummary: '到苏州办货', presentNpcs: [{ name: '沈牙人', role: '牙行' }] });
  if (/【玩家这回说】[^\n]*回扬州家里/.test(p)) return JSON.stringify({ elapsedDays: 3, nowAt: '扬州府江都县', turnSummary: '回家' });
  if (/【玩家这回说】[^\n]*去京师/.test(p)) return JSON.stringify({ elapsedDays: 30, nowAt: '京师', turnSummary: '进京' });
  if (/【玩家这回说】[^\n]*告状/.test(p)) return JSON.stringify({ elapsedDays: 1, cases: [{ name: '周四盗盐案', kind: '盗案', role: '苦主', stage: '报案', facts: '瓜洲卸盐二百引', suspects: '江家管事', next: '县里派捕快拘周四', deadline: '十日' }], turnSummary: '告状' });
  if (/【玩家这回说】[^\n]*开铺/.test(p)) return JSON.stringify({ elapsedDays: 2, ledger: [{ item: '盘铺面', amount: -800 }], business: [{ name: '汪记盐栈', kind: '铺面', capital: 800, stock: '盐三百引', credit: '赊给镇江客商一百两', revenue: 400, cost: 150, partners: '掌柜程立德' }], turnSummary: '开铺' });
  if (/【玩家这回说】[^\n]*入漕帮/.test(p)) return JSON.stringify({ elapsedDays: 1, circles: [{ name: '扬州漕帮', kind: '帮会', leader: '翁老大', stance: '观望', tie: '递了门槛' }], turnSummary: '入帮' });
  if (/【玩家这回说】[^\n]*被抓/.test(p)) return JSON.stringify({ elapsedDays: 1, jail: { in: true, where: '江都县监', charge: '私贩官盐', cost: 30 }, cases: [{ name: '周四盗盐案', stage: '审讯', facts: '周四反咬一口' }], turnSummary: '收押' });
  if (/【玩家这回说】[^\n]*熬日子/.test(p)) return JSON.stringify({ elapsedDays: 40, turnSummary: '熬' });
  if (/【玩家这回说】[^\n]*托人保释/.test(p)) return JSON.stringify({ elapsedDays: 3, jail: { out: true }, cases: [{ name: '周四盗盐案', stage: '结案' }], turnSummary: '出监' });
  if (/【玩家这回说】[^\n]*纳/.test(p)) return JSON.stringify({ elapsedDays: 3, ledger: [{ item: '纳妾聘礼', amount: -200 }], household: [{ change: '纳妾', relation: '妾', name: '柳氏', age: 19 }], estate: { income: [{ item: '典铺利钱', amount: 150 }] }, turnSummary: '纳妾' });
  if (/【玩家这回说】[^\n]*有喜/.test(p)) return JSON.stringify({ elapsedDays: 1, household: [{ change: '有孕', relation: '妾', name: '柳氏' }], policies: [{ name: '盐引加课', since: '乾隆二十二年', what: '每引加银三钱', onYou: '三千引每年多出九百两', perMonth: -75 }], turnSummary: '有喜' });
  if (/【玩家这回说】[^\n]*过日子/.test(p)) return JSON.stringify({ elapsedDays: 95, turnSummary: '过日子' });
  if (/【玩家这回说】[^\n]*募/.test(p)) return JSON.stringify({ elapsedDays: 10, ledger: [{ item: '募勇安家银', amount: -600 }], forces: [{ name: '乡勇', leader: '汪景和', troops: 400, grain: 2000, quality: '新', at: '江都县', status: '统带' }], prices: [{ item: '米', price: 900, per: '石' }], turnSummary: '募勇' });

  const TCH = p.includes('【玩家这回说】') ? { touches: [{ event: '乾隆帝第二次南巡', lever: '盐商报效', how: '联络总商拒绝报效', weight: '重' }] } : {};
  const IDC = p.includes('【玩家这回说】去运司衙门找人') ? { identity: { role: '两淮盐运司幕僚', identityModule: 'official', why: '受卢见曾延聘入幕', meters: [{ 项: '官声', 值: '初入幕府' }, { 项: '幕中人脉', 值: '3 人' }] } } : {};
  const d = { ...TCH, ...IDC, elapsedDays: R([0, 1, 3, 10, 30, 90, 365]), yearLabel: '', ledger: [{ item: '杂费', amount: -R([5, 20, 300]) }],
    meters: [{ 项: '名声', 值: R(['尚可', '渐起', '受损']), 变: '↑', 因: '' }], groups: [{ 人群: '盐商', 值: Math.floor(Math.random() * 100) }],
    presentNpcs: [{ name: R(names), role: '账房', favor: Math.floor(Math.random() * 200) - 100, personality: '精细', goal: '攒钱置田', plan: '下月告假', knows: '东家亏空' }],
    estate: chance(0.3) ? { assets: [], income: [{ item: '盐利', amount: R([3000, 2500, '约三千两']) }], expense: [] } : undefined,
    lifeEvents: chance(0.3) ? [{ who: R(names), what: '生了一场病' }] : [], household: chance(0.1) ? [{ change: '添丁', relation: '孙', name: '汪小' + n, age: 0 }] : [],
    orders: [{ who: R(names), what: '去查账', status: R(['在办', '办妥', '办砸']), result: '' }],
    deeds: [{ what: '查盐栈' + n, effect: '众人警惕', later: '' }], deedsDone: [''], canon: chance(0.3) ? ['约定' + n] : [], canonDone: [''],
    places: [{ name: '地' + (n % 40), now: '某地', belong: '某府', from: '东五十里' }], worldEvents: chance(0.2) ? [{ y: 1757, m: 5, text: '某事', changed: true }] : [],
    powers: chance(0.2) ? [{ name: '清廷', leader: '乾隆', troops: '数十万' }] : [], career: chance(0.2) ? { office: '候选州同', titles: [''], nextSteps: [{ to: '', need: '' }] } : undefined,
    careerEvents: [], lookups: ['高恒 乾隆' + n], localFigures: chance(0.3) ? [{ name: R(names), role: '本地士绅', y: 1757 }] : [], almanac: [{ cat: R(['人物', '物价', '风俗', '乱类']), text: '某事实' + n + '：米价一石一两六钱', src: '某志' }],
    fixes: chance(0.2) ? [{ wrong: '东家', right: '东翁', why: '称谓' }] : [], gmNotes: [''], gmNotesDone: [''], hints: ['再看看', '戏外：问问行情'], goals: n % 4 === 0 ? [{ term: '眼下', text: '查清仪征那二百引盐的去向', status: '达成' }, { term: '眼下', text: '找江家对质' + n, status: '新' }, { term: '今年', text: '保住三千引窝单', status: '在做' }, { term: '长远', text: '让承裕考中举人', status: '在做' }] : [{ term: '眼下', text: '查清仪征那二百引盐的去向', status: '在做' }, { term: '今年', text: '保住三千引窝单', status: '在做' }, { term: '长远', text: '让承裕考中举人', status: '在做' }], worldShift: chance(0.15) ? '牵动盐政' : '', turnSummary: '第' + n + '回' };
  if (chance(0.05)) d.meters.push(null);
  if (chance(0.04)) d.succession = { died: R(['是', '', '汪景和']), heir: '汪承裕', heirRole: '少东', heirAge: 18 };
  let s = JSON.stringify(d);
  const f = Math.random();
  if (f < 0.05) s = s.slice(0, Math.floor(s.length * 0.6));            // 截断
  else if (f < 0.08) s = '好的，下面是账：\n```json\n' + s + '\n```';     // 包了代码块
  else if (f < 0.10) s = '抱歉，我无法完成。';                          // 不给 JSON
  else if (f < 0.12) s = s.replace('"杂费"', '"他说"好"的杂费"');        // 未转义的引号
  return s;
}
function opening() {
  return JSON.stringify({ setup: { name: '汪景和', gender: '男', age: 41, role: '扬州两淮盐商', identityModule: 'commoner', yearLabel: '乾隆二十二年', gregorianYear: Number(process.env.YEAR || 1757), month: 3, day: 6, place: '扬州府江都县', polity: '清', unit: '两', cash: 80000, household: [{ relation: '子', name: '汪承裕', age: 16 }] },
    world: { overview: '乾隆中期。', events: [], upcoming: [] }, meters: [{ 项: '家资', 值: '80000两' }], groups: [{ 人群: '盐商', 值: 50 }],
    estate: { assets: [{ name: '窝单', qty: '三千引', value: 30000 }], income: [{ item: '盐利', amount: 3000 }], expense: [{ item: '家用', amount: 300 }], projects: [] }, hints: ['去仪征'], goals: [{ term: '眼下', text: '查清仪征那二百引盐的去向', why: '不查清，年底运司对账要赔', status: '新' }, { term: '今年', text: '保住三千引窝单', why: '窝单是汪家的根本', status: '新' }, { term: '长远', text: '让承裕考中举人', why: '盐商之家要出个读书人才算站稳', status: '新' }], turnSummary: '开场' });
}
function answer(p, last, json) {
  if (p.includes('五项属性')) return JSON.stringify({ attrs: { 体魄: 5, 灵巧: 5, 智识: 7, 魅力: 6, 心志: 6 }, skills: { 经商: 55, 理财: 60, 交际: 45, 文墨: 30 }, renown: 60, traits: { 信: 1 }, basis: '三代盐商，精于算计' });
  if (p.includes('整理三样') && p.includes('门客')) { fs.appendFileSync('local.log', 'x\n'); const far = /苏州/.test(p.slice(0, 300)); return JSON.stringify({ goods: [{ item: '淮盐', unit: '引', price: far ? 9 : 4, basis: '推算：乾隆中期两淮盐价' }, { item: '绸缎', unit: '匹', price: far ? 2 : 3.5, basis: '《扬州画舫录》' }, { item: '米', unit: '石', price: 1.8, basis: '推算' }], quests: [{ giver: '程立德', giverRole: '账房', title: '追讨盐栈欠银', desc: '瓜洲盐栈欠银二百两，托你去讨', reward: '酬银二十两', months: 2, skill: '交际' }], recruits: [{ name: '沈默之', skill: '文墨', lv: 50, wage: 2, note: '落第秀才' }, { name: '某甲', skill: '武艺', lv: 40, wage: 1, note: '无名' }] }); }
  if (p.includes('整理一件真实大事的细节')) { fs.appendFileSync('detail.log', 'x\n'); return JSON.stringify({ timeline: [{ when: '三月初九', what: '卢见曾在运司衙门升堂DETAILMARK' }], people: [{ name: '卢见曾', role: '两淮盐运使', did: '主持接驾' }], numbers: '盐商报效银三十万两', orders: '谕旨：南巡沿途不得扰民', talk: '街上都在议论', reach: '扬州盐商家家出钱' }); }
  if (p.includes('挑剔的历史小说编辑')) { const bad = Math.random() < 0.5; fs.appendFileSync('critic.log', (bad ? 'bad' : 'ok') + '\n'); return JSON.stringify(bad ? { score: 5, problems: [{ item: 2, quote: '卢运使一早去了天宁寺', why: 'CRITICMARK 巧合太多', fix: '写出前因' }] } : { score: 9, problems: [] }); }
  if (p.includes('立一份档案')) return JSON.stringify({ people: [{ name: '卢见曾', real: true, born: 1690, died: 1768, native: '山东德州', identity: '两淮盐运使，好文，主持红桥修禊', state: '在世', age: 68, post: '两淮盐运使', where: '扬州府', doing: '在任', ties: '与扬州盐商、文士往来', reach: '盐商可经总商引见' }, { name: '李白', real: true, born: 701, died: 762, identity: '唐代诗人', state: '已故', where: '', doing: '' }] });
  if (p.includes('还没给玩家看') && !p.includes('逐条判断') && p.includes('卢运使一早') && !p.includes('MAJORDONE')) return JSON.stringify({ major: [{ problem: '「卢运使一早去了天宁寺」：MAJORDONE 测试', fix: '改写' }], fixes: [], doubts: [] });
  if (p.includes('还没给玩家看') && p.includes('逐条判断')) return JSON.stringify({ fixes: [{ wrong: '运司那边', right: '运使衙门那边', why: '查证' }] });
  if (p.includes('还没给玩家看')) return chance(0.1) ? 'oops' : JSON.stringify({ fixes: [{ wrong: '东家', right: '东翁', why: '称谓' }], doubts: [{ quote: '运司那边', query: '两淮运司 乾隆', why: '不确定' }] });
  if (p.includes('「本地志」')) return chance(0.1) ? '{' : JSON.stringify({ admin: '扬州府治江都、甘泉二县同城', officials: [{ post: '两淮盐运使', name: '卢见曾', note: '好文', sure: true }, null], economy: '盐业', families: '江、汪诸家', places: '东关街、天宁寺', customs: '好园林', current: '南巡余波', counties: ['江都县', '甘泉县', '无此县'] });
  if (p.includes('先把玩家的设定落到真实历史里')) { fs.appendFileSync('resolve.log', p.slice(0, 400).replace(/\n/g, ' ') + '\n'); return chance(0.1) ? 'nope' : JSON.stringify({ y: 1757, m: 3, d: 6, yearLabel: '乾隆二十二年', polity: '清', place: '江南扬州府江都县', placeShort: '扬州', name: '汪景和', real: false, gender: '男', age: 41, role: '扬州盐商', adjust: [], people: ['卢见曾'], queries: ['扬州 盐商 乾隆二十二年'] }); }
  if (p.includes('给一局极其讲究史实的历史模拟游戏补史料')) { const mm = p.match(/要补的月份：(-?\d+)年(\d+)月/), src = (p.match(/\[1\] 查「[^」]*」：([^\n]*)/) || [])[1] || ''; const nm = (src.match(/[\u4e00-\u9fff]{3}/) || ['无名氏'])[0];
    fs.appendFileSync('sync.log', JSON.stringify({ y: mm && mm[1], m: mm && mm[2], nm }) + '\n');
    return chance(0.1) ? '{"events":[' : JSON.stringify({ events: [{ y: +mm[1], m: +mm[2], d: 7, gz: '甲子', text: nm + '有一件确凿的事' + n, where: '', who: [nm], scope: '天下', tag: '政局', from: 1 }, { y: +mm[1], m: +mm[2], d: 0, gz: '乙未X', text: '凭空编的事' + n, where: '火星', who: ['张三丰'], from: 1 }] }); }
  if (p.includes('整理一段史料')) { const m = p.match(/公元 (-?\d+) 年到 (-?\d+) 年/); const a = +m[1], b = +m[2];
    if (chance(0.1)) return '{"events":[';
    return JSON.stringify({ rulers: [{ polity: '清', name: '爱新觉罗·颙琰', title: '清仁宗', reigns: [['嘉庆', 1796]], from: 1796, to: 1820 }], events: Array.from({ length: 30 }, (_, i) => ({ y: a + (i % (b - a + 1)), m: i % 13, text: '自建史事' + i + '：某地某事', who: ['某甲'], src: R(['检索', '记忆']) })).concat([{ y: a - 50, m: 1, text: '超出范围的事' }]), figures: [{ name: '某甲', born: a - 40, died: b + 5, posts: [[a, b, '某官']] }, { name: '坏人', born: 1900, died: 1800 }] }); }
  if (p.includes('这局历史模拟游戏的推演人') && p.includes('最近几回的场面')) fs.writeFileSync('shape_prompt.txt', p);
  if (p.includes('这局历史模拟游戏的推演人') && /【玩家这回说】[^\n]*守城/.test(p)) return JSON.stringify({ steps: [{ what: '上城', who: '你', ok: '能', why: '' }], risks: [], search: [], places: ['扬州府'], battle: { fight: '是', enemy: '盐枭王二', enemyTroops: 600, enemyQuality: '弱', place: '扬州府', terrain: '城池', attacker: '敌', surprise: '无', ourForces: [], ourTroops: 1500, ourSide: '守城兵民', ourQuality: '中', basis: '探报' }, realPeople: [] });
  if (p.includes('这局历史模拟游戏的推演人') && /【玩家这回说】[^\n]*带乡勇去打/.test(p)) return JSON.stringify({ steps: [{ what: '出兵', who: '你', ok: '能', why: '' }], risks: [], search: [], places: ['仪征县'], battle: { fight: '是', enemy: '盐枭王二', enemyTroops: 300, enemyQuality: '弱', place: '仪征县', terrain: '平原', attacker: '我', surprise: '有', ourForces: ['乡勇'], basis: '探报' }, realPeople: [] });
  if (p.includes('这局历史模拟游戏的推演人')) return chance(0.1) ? 'x' : JSON.stringify({ steps: [{ what: '派人去办', who: R(names), cost: '二十两', time: '三日', ok: R(['能', '难', '不能']), why: '他手里有人' }], risks: ['走漏风声'], alt: '', search: ['某人 乾隆' + n, '扬州 盐商 ' + n], places: ['苏州府', '仪征'], brief: { institutions: '运司衙门、掣验所', people: '运使卢见曾', terms: '窝单、掣验', interests: '总商要保窝本', details: '仪征掣验所的秤' }, realPeople: ['卢见曾', '李白'], scene: { where: '东关街汪宅账房，午后下雨', cast: [{ name: '程立德', want: '想把事压下去，怕被牵连' }], offstage: '江家的管事去了一趟运司', beats: ['程立德支吾', '你逼问', '他说出瓜洲'], end: '程立德等你拿主意', type: '书房' } });
  if (p.includes('深明因果')) fs.writeFileSync('world_prompt.txt', p);
  if (p.includes('深明因果')) return chance(0.15) ? '{"overview":' : JSON.stringify({ overview: '大势' + n, upcoming: [{ key: '', y: 1760, m: 3, text: '新出之事' + n, status: '新出', why: '因你' }], figures: [{ name: '傅恒', alive: chance(0.1) ? false : true, post: '首席军机大臣' }], ripples: [{ cause: '你查盐栈', effect: '运司警觉' + n, when: '一月' }], outside: [{ y: 1757, m: 4, where: '苏州府', text: '苏州织造衙门催缴丝税OUTSIDEMARK' + n }, { y: 1757, m: 4, where: '江宁府', text: '两江总督尹继善巡视江宁' + n }], npcMoves: [{ name: R(names), did: '托人打听你的底细' + n, why: '提防', plan: '再看看' }, null], factions: [{ name: '盐商公所', leader: '江春', members: '八大总商', aims: '保窝单', stance: '观望', strength: '强' }], upcoming: [{ key: '', y: 1830, m: 3, text: '新出' + n, status: '新出', why: '因你', needs: '盐价不跌' }] });
  if (p.includes('的国势账')) return JSON.stringify({ unit: '贯', realm: { treasury: 5000000, granary: 3000000, army: 800000, revenue: 60000000, outlay: 58000000, note: '财赋大半养兵' }, territory: [{ place: '开封府', pop: 260000, troops: 100000, grain: 1000000, loyalty: 60, tax: 0, ruler: '', note: '京畿' }, { place: '河间府', pop: 90000, troops: 30000, grain: 200000, loyalty: 50 }], forces: [{ name: '殿前司禁军', leader: '王宗濋', troops: 70000, grain: 500000, quality: '中', at: '开封', status: '驻守' }], privy: { cash: 300000, note: '内藏库' }, standing: '金兵南下在即' });
  if (p.includes('立主角的家底')) { fs.appendFileSync('estate.log', (p.includes('上一次的毛病') ? 'retry' : 'first') + '\n'); const poor = /流民|乞丐/.test(p.slice(0, 1400)); if (poor && !p.includes('上一次的毛病')) return JSON.stringify({ unit: '文', cash: 80000, standing: '富户', assets: [{ name: '良田', qty: '300亩', value: 900000 }], income: [], expense: [] }); return JSON.stringify(poor ? { unit: '文', cash: 37, cashNote: '贴身缝着三十几文铜钱', standing: '城外流民，无田无屋', assets: [{ name: '破棉袄', qty: '一件', value: 30, note: '补丁摞补丁' }, { name: '口粮', qty: '糠饼两个', value: 6, note: '撑两天' }], income: [{ item: '城外打短工', amount: 300, note: '有活才有' }], expense: [{ item: '口粮', amount: 450, note: '米价腾贵' }], debts: [] } : { unit: '两', cash: 80000, cashNote: '银库存银', standing: '扬州总商之一', assets: [{ name: '东关街宅院', qty: '三进', value: 12000, note: '祖宅' }, { name: '窝单', qty: '三千引', value: 60000, note: '世业' }], income: [{ item: '盐利', amount: 3000, note: '按引计' }], expense: [{ item: '家用', amount: 400, note: '' }], debts: [{ to: '运库', amount: 5000, note: '南巡垫款' }] }); }
  if (p.includes('定出此时此地各衙门在任的人')) { fs.writeFileSync('off_prompt.txt', p); return JSON.stringify({ officials: [{ post: '两淮盐运使', place: '扬州府', name: '卢见曾', since: '1753.5', until: '1762.3', src: '史料' }, { post: '扬州知府', place: '扬州府', name: '高恒', since: '1756.2', until: '1757.11', src: '推断', basis: 'OFFMARK 1756年到任，1757年冬调任' }, { post: '江都知县', place: '江都县', name: '某某', src: '拟' }, { post: '甘泉知县', place: '江都县', name: '沈廷芳', since: '1757.1', src: '拟' }] }); }
  if (p.includes('精通历代职官制度')) return JSON.stringify({ era: '清', summary: '省府县', ladder: [{ tier: '地方', posts: [{ name: '知县', rank: '正七品', duty: '一县' }] }], paths: [], fixes: [], unsure: [] });
  if (p.includes('要把它写成一部书')) { fs.appendFileSync('book.log', (p.includes('浅近文言') ? 'hist' : 'novel') + '\n'); return (p.includes('浅近文言') ? '卷一　乾隆二十二年' : '第一回　钞关前问引价　运司里说盐法') + '\n' + '汪景和至钞关问引价，书吏言今岁引价腾贵。'.repeat(20); }
  if (p.includes('你是历史地理检索员')) { fs.appendFileSync('geoalias.log', 'x\n'); return JSON.stringify(/「京师」/.test(p) ? { county: '大兴县', pref: '顺天府', modern: '北京' } : { county: '', pref: '' }); }
  if (p.includes('画这一年的政权疆域')) { fs.appendFileSync('regime.log', 'x\n'); return JSON.stringify(p.includes('公元950年') ? { split: true, regimes: [{ name: '后汉', ruler: '隐帝刘承祐', capital: '开封府', seeds: ['开封府', '河南府', '郓州', '青州', '徐州', '京兆府', '镇州', '魏州'], basis: '史载' }, { name: '南唐', ruler: '元宗李璟', capital: '江宁府', seeds: ['江宁府', '扬州', '洪州', '鄂州', '寿州', '庐州', '建州'], basis: '史载' }, { name: '吴越', ruler: '忠懿王钱俶', capital: '杭州', seeds: ['杭州', '越州', '苏州', '湖州', '明州', '福州'], basis: '史载' }, { name: '后蜀', ruler: '孟昶', capital: '成都府', seeds: ['成都府', '梓州', '兴元府', '秦州', '夔州'], basis: '史载' }, { name: '南汉', ruler: '刘晟', capital: '广州', seeds: ['广州', '韶州', '容州', '邕州'], basis: '史载' }, { name: '辽', ruler: '世宗耶律阮', capital: '上京', seeds: ['幽州', '云州', '蓟州', '涿州'], basis: '史载' }, { name: '楚', ruler: '马希广', capital: '潭州', seeds: ['潭州', '衡州', '朗州', '桂州'], basis: '史载' }, { name: '五代', seeds: ['开封府'] }] } : { split: false, regimes: [{ name: '清', ruler: '高宗弘历', capital: '顺天府', seeds: ['顺天府', '江宁府', '成都府', '广州府', '西安府', '昆明', '奉天府', '杭州府', '武昌府'], basis: '史载' }] }); }
  if (p.includes('在下一回之前把史实梳理一遍')) { fs.appendFileSync('facts.log', 'x\n'); return JSON.stringify({ facts: [{ cat: '君主', text: '乾隆二十二年，高宗弘历在位，是年第二次南巡', src: '内置史料' }], ranges: [{ item: '米', unit: '两/石', low: 1.2, high: 2.2, why: '乾隆中期江南米价' }], errors: [{ where: '户部', wrong: '从一品', right: '从一品（满汉各一）', why: '会典' }] }); }
  if (p.includes('替一局历史游戏定') && p.includes('的家底')) return JSON.stringify({ stats: Object.fromEntries(Object.entries({ 国库: 2000000, 内帑: 500000, 太仓粮: 3000000, 民心: 55, 腐败: 45, 威望: 62, 通货: 50, 边患: 40, 灾情: 30, 存银: 20000, 仓粮: 30000, 治安: 60, 积案: 30, 吏治: 50 }).map(([k, v]) => [k, k === '通货' ? { v: 50, basis: '大致如此' } : { v, basis: '据《测试实录》' + k + '条' }])), classes: [{ name: '士绅', sat: 60, size: '少', want: '少纳粮' }, { name: '佃户', sat: 35, size: '多', want: '减租' }] });
  if (p.includes('拟「时政」')) return JSON.stringify({ affairs: [{ title: '江北水灾饥民', desc: '淮扬一带大水，饥民聚集', who: '漕运总督、扬州府', stakes: '民变', months: 2, area: '民生' }, { title: '两淮盐课积欠', desc: '盐商积欠课银', who: '两淮盐政', stakes: '国库短绌', months: 3, area: '经济' }] });
  if (p.includes('召见臣下商议')) { const names = [...p.matchAll(/^\d+\. (\S+?)，/gm)].map(x => x[1]); return JSON.stringify({ replies: names.map(n => ({ name: n, say: n + '奏：臣以为当先开仓赈济，再图根本。', plan: '开仓放赈，蠲免本年钱粮', hidden: '想借此邀名' })) }); }
  if (p.includes('给几位真实官员定属性')) { const names = [...p.matchAll(/^\d+\. (\S+?)（/gm)].map(x => x[1]); return JSON.stringify({ people: names.map(n => ({ name: n, faction: '朝臣', zheng: 70, jun: 40, cai: 60, zhong: 75, lian: 65, basis: '测试' })) }); }
  if (p.includes('精通历代兵制')) { const ask = [...p.matchAll(/^\d+\. (\S+?)：/gm)].map(x => x[1]); const L = ask.length ? ask : ['绿营步兵', '绿营马兵', '八旗马甲']; return JSON.stringify({ types: L.map((n, i) => ({ name: n, desc: '测试兵种', size: 500, atk: 40 + i * 10, def: 50, shock: 30 + i * 10, org: 50, mob: 40 + i * 5, pay: 1.5 + i, grain: 0.5, months: 3, basis: i === 0 ? '据内置制度库·兵制' : '', judge: '测试' })) }); }
  if (p.includes('这样的人在这个年代不可能没有')) { fs.appendFileSync('family.log', 'x\n'); return JSON.stringify({ add: [{ relation: '正室', name: '程氏婉贞', age: 25, note: '歙县程姓大族之女', basis: '推算：徽州大族多与同乡联姻' }, { relation: '妾', name: '柳氏素娥', age: 19, note: '扬州贫家女', basis: '推算：殷实人家多纳妾' }, { relation: '嫡子', name: '汪承某', age: 6, mother: '程氏婉贞', basis: '推算' }, { relation: '管家', name: '汪福', age: 50, basis: '推算：大户有管家' }], single: false }); }
  if (p.includes('常理审查')) { fs.appendFileSync('logic.log', 'x\n'); const bad = p.match(/【程序查出的硬伤（必须给改法）】(\S+?)年岁写成(\d+)/); return JSON.stringify({ fixes: bad ? [{ target: 'people', name: bad[1], field: 'age', value: 60, why: '年岁不合常理' }] : [] }); }
  if (p.includes('整理「中枢」这一路')) { fs.appendFileSync('org.log', 'A\n'); return JSON.stringify({ nodes: [{ key: '军机处', name: '军机处', parent: 'ROOT', level: '中枢', duty: '承旨办理军国大事', posts: [{ title: '军机大臣', rank: '', quota: 6, holders: ['傅恒'] }] }, { key: '户部', name: '户部', parent: 'ROOT', level: '部', duty: '掌天下钱粮', posts: [{ title: '尚书', rank: '从一品', quota: 2, holders: [] }, { title: '侍郎', rank: '正二品', quota: 4, holders: [] }] }, { key: '江南清吏司', name: '江南清吏司', parent: '户部', level: '司', duty: '核江南钱粮', posts: [{ title: '郎中', rank: '正五品', quota: 2, holders: ['张某'] }] }] }); }
  if (p.includes('整理「地方」这一路')) { fs.appendFileSync('org.log', 'B\n'); return JSON.stringify({ nodes: [{ key: '两江总督', name: '两江总督衙门', parent: 'ROOT', level: '省', duty: '总督江南江西', path: true, posts: [{ title: '总督', rank: '正二品', quota: 1, holders: [] }] }, { key: '江苏巡抚', name: '江苏巡抚衙门', parent: '两江总督', level: '省', path: true, posts: [{ title: '巡抚', rank: '从二品', quota: 1 }] }, { key: '扬州府', name: '扬州府署', parent: '江苏巡抚', level: '府', path: true, posts: [{ title: '知府', rank: '从四品', quota: 1 }, { title: '同知', rank: '正五品', quota: 1 }] }, { key: '江都县', name: '江都县署', parent: '扬州府', level: '县', path: true, posts: [{ title: '知县', rank: '正七品', quota: 1 }, { title: '典史', rank: '未入流', quota: 1 }] }, { key: '江都县六房', name: '江都县吏房户房等六房', parent: '江都县', level: '吏役', path: true, posts: [{ title: '经制典吏', rank: '', quota: 12 }] }, { key: '保甲', name: '江都县乡里保甲', parent: '江都县', level: '乡里', path: true, posts: [{ title: '保正', rank: '', quota: 40 }] }] }); }
  if (p.includes('整理「军事」这一路')) { fs.appendFileSync('org.log', 'C\n'); return JSON.stringify({ nodes: [{ key: '江南提督', name: '江南提督', parent: 'ROOT', level: '提标', posts: [{ title: '提督', rank: '从一品', quota: 1 }] }, { key: '扬州营', name: '扬州营', parent: '江南提督', level: '营', path: true, posts: [{ title: '游击', rank: '从三品', quota: 1 }, { title: '把总', rank: '正七品', quota: 4 }] }] }); }
  if (p.includes('国策书：照这个政权')) return JSON.stringify({ policies: [{ id: 'p1', area: '经济', name: '清查盐课', desc: '清查两淮盐商积欠', cost: 3, need: [], real: '乾隆三十三年两淮盐引案', effect: '国库增收，盐商怨' }, { id: 'p2', area: '经济', name: '改行票盐', desc: '废纲盐行票盐', cost: 6, need: ['p1'], real: '道光年间陶澍', effect: '盐价降，总商失势' }] });
  if (p.includes('整理主角这一路仕途')) { fs.appendFileSync('promo.log', 'x\n'); return JSON.stringify({ office: '知县', rank: '正七品', superior: '知府', review: '三年大计', tenure: '三年俸满', next: [{ post: '同知', rank: '正五品', how: '俸满考称职，督抚题升，吏部议准' }, { post: '知州', rank: '从五品', how: '卓异保举' }], limits: ['不得本籍为官'], appoint: '吏部铨选，给文凭，限期赴任', entry: ['科举', '捐纳'], unsure: [], basis: '清会典' }); }
  if (p.includes('核实几位官员')) { fs.appendFileSync('tenure.log', 'x\n'); return JSON.stringify({ people: /1\. 傅恒：/.test(p) ? [{ name: '傅恒', still: false, why: '调任经略', successor: '来保', basis: '测试' }] : [] }); }
  if (p.includes('只管查资料')) { fs.appendFileSync('dsq.log', 'x\n'); const qs = [...p.matchAll(/^\d+\. (.+)$/gm)].map(m => m[1]); return JSON.stringify({ results: qs.map(q => ({ q, items: [{ title: q.split(' ')[0], snippet: q + '：据通行史书所载的一条事实', src: '通行史书' }] })) }); }
  if (p.includes('整理出确实写在资料里')) return JSON.stringify({ almanac: [{ cat: '物价', text: '米价一石一两六钱', src: '志' }] });
  if (p.includes('压成一段四百字以内')) return '较早的经过：查账、置产、结亲。';
  if (p.includes('账房兼史官') && p.includes('【开局】')) return opening();
  if (p.includes('账房兼史官')) return ledger(p);
  if (p.includes('【开局】')) { fs.writeFileSync('open_prompt.txt', p); } if (p.includes('【开局】')) return '乾隆二十二年三月初六，扬州。\n你叫汪景和，四十一岁，祖籍徽州歙县，在扬州行盐已是第三代。家里住在东关街北边的老宅，三进院子，前头是账房，后头住着老母亲和独子承裕。\n这一年的扬州还没从去年皇上南巡的热闹里缓过来。天宁寺的行宫刚拆了彩棚，瘦西湖边那几座为接驾赶修的亭子还新得发亮。盐商们为这趟南巡捐了不少银子，如今运司衙门正逐家催还垫款。\n早饭刚撤下去，账房程立德就抱着账本进来了。';
  if (p.includes('照规则写正文')) { fs.appendFileSync('dir.log', JSON.stringify({ seed: /这一回的历史主线/.test(p), ban: /不许再写的题材/.test(p), redo: p.includes('上一稿的毛病') }) + '\n'); if (!p.includes('上一稿的毛病') && !p.includes('戏外：') && Math.random() < 0.6) return PAS[pi++ % PAS.length] + '\n程立德躬身请示：「此事如何是好，还请老爷示下。」账房又来请示，问怎么办才好，盘账盘到半夜。'; }
  return story(/戏外|多少|几天/.test(last) && chance(0.7));
}
http.createServer((req, res) => {
  let b = ''; req.on('data', c => b += c); req.on('end', async () => {
    if (process.env.SLOW && (req.url.startsWith('/w/api.php') || req.url.startsWith('/search'))) await new Promise(r => setTimeout(r, 30000));
    if (req.url.startsWith('/w/api.php')) {
      const q = new URL('http://x' + req.url).searchParams.get('gsrsearch') || '';
      res.writeHead(200, { 'content-type': 'application/json' });
      if (chance(0.15)) return res.end(JSON.stringify({ batchcomplete: '' }));
      return res.end(JSON.stringify({ query: { pages: { '1': { title: q + '（条目）', fullurl: 'https://zh.wikipedia.org/wiki/x', extract: q + '：维基正文。'.repeat(60) } } } }));
    }
    if (req.url.startsWith('/tgaz/placename')) {
      const q = new URL('http://x' + req.url).searchParams, n = q.get('n') || '', ip = q.get('ipar') || '';
      const P = { 江苏: [['扬州府', 119.42, 32.39], ['江宁府', 118.78, 32.05], ['镇江府', 119.45, 32.2], ['常州府', 119.95, 31.78], ['苏州府', 120.6, 31.3]],
        扬州府: [['江都县', 119.43, 32.39], ['甘泉县', 119.40, 32.41], ['仪征县', 119.18, 32.27], ['高邮州', 119.45, 32.78], ['泰州', 119.9, 32.49], ['宝应县', 119.31, 33.24]],
        江宁府: [['上元县', 118.8, 32.06], ['江宁县', 118.77, 32.03], ['句容县', 119.16, 31.95]], 镇江府: [['丹徒县', 119.45, 32.19], ['丹阳县', 119.57, 32.0]],
        常州府: [['武进县', 119.95, 31.78], ['无锡县', 120.3, 31.57]], 苏州府: [['吴县', 120.6, 31.3], ['长洲县', 120.62, 31.32]] };
      const mk = (name, lon, lat, parent) => ({ sys_id: 'hvd_' + name, name, 'feature type': /县$/.test(name) ? '县' : /州$/.test(name) ? '州' : '府', 'parent name': parent, 'xy coordinates': lon + ', ' + lat, years: '1724 ~ 1911' });
      let out = [];
      if (ip && P[ip]) out = P[ip].map(([a, b, c]) => mk(a, b, c, ip));
      else if (n) for (const [par, xs] of Object.entries(P)) for (const [a, b, c] of xs) if (a === n || a.startsWith(n)) out.push(mk(a, b, c, par));
      res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ 'count of total results': out.length, placenames: out }));
    }
    if (req.url.startsWith('/search?')) {
      if (chance(0.1)) { res.writeHead(500); return res.end('err'); }
      const q = decodeURIComponent((req.url.split('q=')[1] || '').split('&')[0]);
      res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ results: [{ title: q + ' - 百度百科', url: 'https://baike.baidu.com/x', content: q + '：乾隆年间……'.repeat(8) }, { title: q + ' 小说全文阅读', url: 'http://novel/x', content: '虚构' }] }));
    }
    // 试 Key：sk-bad 开头的当成无效 Key；博查：bk-bad 开头的无效（博查无效时 HTTP 照样 200，错在 code 里）
    if (/Bearer sk-bad/.test(req.headers.authorization || '') && !req.url.startsWith('/v1/web-search')) { res.writeHead(401, { 'content-type': 'application/json' }); return res.end('{"error":{"message":"Authentication Fails"}}'); }
    if (req.url.startsWith('/v1/web-search')) { res.writeHead(200, { 'content-type': 'application/json' }); if (/Bearer bk-bad/.test(req.headers.authorization || '')) return res.end('{"code":401,"message":"Invalid API KEY"}'); fs.appendFileSync('bocha.log', (req.headers.authorization || '') + '\n'); return res.end(JSON.stringify({ code: 200, data: { webPages: { value: [{ name: '苏轼 - 博查', url: 'https://baike.baidu.com/item/苏轼', summary: '苏轼，字子瞻，北宋文学家。'.repeat(5) }] } } })); }
    if (req.url.includes('/models')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ data: [{ id: 'deepseek-v4-pro' }, { id: 'deepseek-v4-flash' }] })); }
    const body = JSON.parse(b || '{}'); const msgs = body.messages || []; if (!msgs.length) { res.writeHead(404); return res.end("{}"); }
    const p = msgs.map(m => m.content).join('\n'); n++; if (p.includes('照规则写正文')) fs.writeFileSync('last_story_prompt.txt', p);
    const kind = p.includes('挑剔的历史小说编辑') ? 'critic' : p.includes('还没给玩家看') ? 'verify' : p.includes('「本地志」') ? 'gaz' : p.includes('整理一段史料') ? 'histbuild' : p.includes('推演人') ? 'ruling' : p.includes('账房兼史官') ? 'ledger' : p.includes('深明因果') ? 'world' : p.includes('职官') ? 'inst' : p.includes('资料里') ? 'digest' : p.includes('四百字') ? 'memory' : 'story';
    fs.appendFileSync(LOG, `${n}\t${kind}\t${p.length}\t${msgs.length}\t${(msgs[0]||{}).role}	${req.url}\t${body.temperature}\t${JSON.stringify(body.thinking||null)}\t${body.model}\n`);
    // LAT=1：照真实 DeepSeek 的慢（按十分之一缩短：写正文带思考约 9 秒，其他 3–6 秒），测一回要等多久
    if (process.env.LAT) { const ms = { story: 9000, ruling: 4000, ledger: 6000, verify: 4000, critic: 3000, world: 6000 }[kind] || 3000; const t0 = Date.now(); await new Promise(r => setTimeout(r, ms * Number(process.env.LAT))); fs.appendFileSync('timeline.log', `${t0}\t${Date.now()}\t${kind}\t${String(msgs[msgs.length - 1].content).slice(0, 36).replace(/\s/g, ' ')}\n`); }
    if (kind === 'world' || kind === 'gaz') await new Promise(r => setTimeout(r, Number(process.env.WORLD_DELAY || 0)));
    if ((body.max_tokens || 9999) < 100) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ choices: [{ message: { content: '正常' }, finish_reason: 'stop' }] })); }
    if (chance(0.04)) { res.writeHead(R([500, 503, 429])); return res.end('{"error":{"message":"busy"}}'); }
    if (chance(0.02)) { await new Promise(r => setTimeout(r, 8000)); }
    const content = chance(0.02) ? '' : answer(p, msgs[msgs.length - 1].content, !!body.response_format);
    if (body.stream) {
      res.writeHead(200, { 'content-type': 'text/event-stream' });
      const parts = content.match(/[\s\S]{1,40}/g) || []; let i = 0;
      const t = setInterval(() => { if (i < parts.length) res.write('data: ' + JSON.stringify({ choices: [{ delta: { content: parts[i++] } }] }) + '\n\n'); else { res.write('data: ' + JSON.stringify({ choices: [{ delta: {}, finish_reason: chance(0.03) ? 'length' : 'stop' }] }) + '\n\n'); res.write('data: [DONE]\n\n'); res.end(); clearInterval(t); } }, 5);
      return;
    }
    res.writeHead(200, { 'content-type': 'application/json' }); res.end(JSON.stringify({ choices: [{ message: { content }, finish_reason: 'stop' }], usage: {} }));
  });
}).listen(Number(process.env.MOCK_PORT || 3418), () => console.log('good 3418'));
