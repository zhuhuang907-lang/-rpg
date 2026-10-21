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
  if (p.includes('这局历史模拟游戏的推演人')) return chance(0.1) ? 'x' : JSON.stringify({ steps: [{ what: '派人去办', who: R(names), cost: '二十两', time: '三日', ok: R(['能', '难', '不能']), why: '他手里有人' }], risks: ['走漏风声'], alt: '', search: ['某人 乾隆' + n, '扬州 盐商 ' + n], places: ['苏州府', '仪征'], brief: { institutions: '运司衙门、掣验所', people: '运使卢见曾', terms: '窝单、掣验', interests: '总商要保窝本', details: '仪征掣验所的秤' }, realPeople: ['卢见曾', '李白'], scene: { where: '东关街汪宅账房，午后下雨', cast: [{ name: '程立德', want: '想把事压下去，怕被牵连' }], offstage: '江家的管事去了一趟运司', beats: ['程立德支吾', '你逼问', '他说出瓜洲'], end: '程立德等你拿主意', type: '书房' } });
  if (p.includes('深明因果')) fs.writeFileSync('world_prompt.txt', p);
  if (p.includes('深明因果')) return chance(0.15) ? '{"overview":' : JSON.stringify({ overview: '大势' + n, upcoming: [{ key: '', y: 1760, m: 3, text: '新出之事' + n, status: '新出', why: '因你' }], figures: [{ name: '傅恒', alive: chance(0.1) ? false : true, post: '首席军机大臣' }], ripples: [{ cause: '你查盐栈', effect: '运司警觉' + n, when: '一月' }], outside: [{ y: 1757, m: 4, where: '苏州府', text: '苏州织造衙门催缴丝税OUTSIDEMARK' + n }, { y: 1757, m: 4, where: '江宁府', text: '两江总督尹继善巡视江宁' + n }], npcMoves: [{ name: R(names), did: '托人打听你的底细' + n, why: '提防', plan: '再看看' }, null], factions: [{ name: '盐商公所', leader: '江春', members: '八大总商', aims: '保窝单', stance: '观望', strength: '强' }], upcoming: [{ key: '', y: 1830, m: 3, text: '新出' + n, status: '新出', why: '因你', needs: '盐价不跌' }] });
  if (p.includes('立主角的家底')) { fs.appendFileSync('estate.log', (p.includes('上一次的毛病') ? 'retry' : 'first') + '\n'); const poor = /流民|乞丐/.test(p.slice(0, 400)); if (poor && !p.includes('上一次的毛病')) return JSON.stringify({ unit: '文', cash: 80000, standing: '富户', assets: [{ name: '良田', qty: '300亩', value: 900000 }], income: [], expense: [] }); return JSON.stringify(poor ? { unit: '文', cash: 37, cashNote: '贴身缝着三十几文铜钱', standing: '城外流民，无田无屋', assets: [{ name: '破棉袄', qty: '一件', value: 30, note: '补丁摞补丁' }, { name: '口粮', qty: '糠饼两个', value: 6, note: '撑两天' }], income: [{ item: '城外打短工', amount: 300, note: '有活才有' }], expense: [{ item: '口粮', amount: 450, note: '米价腾贵' }], debts: [] } : { unit: '两', cash: 80000, cashNote: '银库存银', standing: '扬州总商之一', assets: [{ name: '东关街宅院', qty: '三进', value: 12000, note: '祖宅' }, { name: '窝单', qty: '三千引', value: 60000, note: '世业' }], income: [{ item: '盐利', amount: 3000, note: '按引计' }], expense: [{ item: '家用', amount: 400, note: '' }], debts: [{ to: '运库', amount: 5000, note: '南巡垫款' }] }); }
  if (p.includes('定出此时此地各衙门在任的人')) { fs.writeFileSync('off_prompt.txt', p); return JSON.stringify({ officials: [{ post: '两淮盐运使', place: '扬州府', name: '卢见曾', since: '1753.5', until: '1762.3', src: '史料' }, { post: '扬州知府', place: '扬州府', name: '高恒', since: '1756.2', until: '1757.11', src: '推断', basis: 'OFFMARK 1756年到任，1757年冬调任' }, { post: '江都知县', place: '江都县', name: '某某', src: '拟' }, { post: '甘泉知县', place: '江都县', name: '沈廷芳', since: '1757.1', src: '拟' }] }); }
  if (p.includes('精通历代职官制度')) return JSON.stringify({ era: '清', summary: '省府县', ladder: [{ tier: '地方', posts: [{ name: '知县', rank: '正七品', duty: '一县' }] }], paths: [], fixes: [], unsure: [] });
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
    if (req.url.includes('/models')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ data: [{ id: 'deepseek-v4-pro' }, { id: 'deepseek-v4-flash' }] })); }
    const body = JSON.parse(b || '{}'); const msgs = body.messages || []; if (!msgs.length) { res.writeHead(404); return res.end("{}"); }
    const p = msgs.map(m => m.content).join('\n'); n++; if (p.includes('照规则写正文')) fs.writeFileSync('last_story_prompt.txt', p);
    const kind = p.includes('挑剔的历史小说编辑') ? 'critic' : p.includes('还没给玩家看') ? 'verify' : p.includes('「本地志」') ? 'gaz' : p.includes('整理一段史料') ? 'histbuild' : p.includes('推演人') ? 'ruling' : p.includes('账房兼史官') ? 'ledger' : p.includes('深明因果') ? 'world' : p.includes('职官') ? 'inst' : p.includes('资料里') ? 'digest' : p.includes('四百字') ? 'memory' : 'story';
    fs.appendFileSync(LOG, `${n}\t${kind}\t${p.length}\t${msgs.length}\t${(msgs[0]||{}).role}	${req.url}\t${body.temperature}\t${JSON.stringify(body.thinking||null)}\t${body.model}\n`);
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
