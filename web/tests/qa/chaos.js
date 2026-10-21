// 捣乱的假 AI（OpenAI 兼容 + 假搜索）：多数时候给像样的回复，约两成故意出各种岔子；记下每次调用的提示长度
const http = require('http'); const fs = require('fs');
let n = 0; const LOG = 'calls.log'; fs.writeFileSync(LOG, '');
const R = a => a[Math.floor(Math.random() * a.length)];
const chance = p => Math.random() < p;
const names = ['程立德', '周四', '汪方氏', '卢见曾', '高恒', '韩掌柜', '赵书吏', '李二'];
function story(talk) {
  if (talk) return '【戏外】\n乾隆中期淮南一引盐成本三两上下。';
  const para = () => `${R(names)}${R(['说', '低声道', '笑道'])}：「${R(['东家，这批货', '今年的盐价', '运司那边', '府里的老爷'])}${R(['怕是不好办。', '还得再等等。', '小的已经打点了。'])}」你${R(['点了点头', '没说话', '把账本合上'])}。`;
  let t = Array.from({ length: 3 + Math.floor(Math.random() * 6) }, para).join('\n');
  if (chance(0.15)) t += '\n【幕后】' + R(names) + '私下另有打算。';
  if (chance(0.05)) t = '（按：此处有误）' + t;
  if (chance(0.03)) t = t.repeat(30);
  return t;
}
function ledger(p) {
  const d = { elapsedDays: R([0, 1, 3, 10, 30, 90, 365]), yearLabel: '', ledger: [{ item: '杂费', amount: -R([5, 20, 300]) }],
    meters: [{ 项: '名声', 值: R(['尚可', '渐起', '受损']), 变: '↑', 因: '' }], groups: [{ 人群: '盐商', 值: Math.floor(Math.random() * 100) }],
    presentNpcs: [{ name: R(names), role: '账房', favor: Math.floor(Math.random() * 200) - 100, personality: '精细', goal: '攒钱置田', plan: '下月告假', knows: '东家亏空' }],
    estate: chance(0.3) ? { assets: [], income: [{ item: '盐利', amount: R([3000, 2500, '约三千两']) }], expense: [] } : undefined,
    lifeEvents: chance(0.3) ? [{ who: R(names), what: '生了一场病' }] : [], household: chance(0.1) ? [{ change: '添丁', relation: '孙', name: '汪小' + n, age: 0 }] : [],
    orders: [{ who: R(names), what: '去查账', status: R(['在办', '办妥', '办砸']), result: '' }],
    deeds: [{ what: '查盐栈' + n, effect: '众人警惕', later: '' }], deedsDone: [''], canon: chance(0.3) ? ['约定' + n] : [], canonDone: [''],
    places: [{ name: '地' + (n % 40), now: '某地', belong: '某府', from: '东五十里' }], worldEvents: chance(0.2) ? [{ y: 1757, m: 5, text: '某事', changed: true }] : [],
    powers: chance(0.2) ? [{ name: '清廷', leader: '乾隆', troops: '数十万' }] : [], career: chance(0.2) ? { office: '候选州同', titles: [''], nextSteps: [{ to: '', need: '' }] } : undefined,
    careerEvents: [], lookups: ['高恒 乾隆' + n], localFigures: chance(0.3) ? [{ name: R(names), role: '本地士绅', y: 1757 }] : [], almanac: [{ cat: R(['人物', '物价', '风俗', '乱类']), text: '某事实' + n + '：米价一石一两六钱', src: '某志' }],
    fixes: chance(0.2) ? [{ wrong: '东家', right: '东翁', why: '称谓' }] : [], gmNotes: [''], gmNotesDone: [''], hints: ['再看看', '戏外：问问行情'], worldShift: chance(0.15) ? '牵动盐政' : '', turnSummary: '第' + n + '回' };
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
    estate: { assets: [{ name: '窝单', qty: '三千引', value: 30000 }], income: [{ item: '盐利', amount: 3000 }], expense: [{ item: '家用', amount: 300 }], projects: [] }, hints: ['去仪征'], turnSummary: '开场' });
}
function answer(p, last, json) {
  if (p.includes('还没给玩家看') && p.includes('逐条判断')) return JSON.stringify({ fixes: [{ wrong: '运司那边', right: '运使衙门那边', why: '查证' }] });
  if (p.includes('还没给玩家看')) return chance(0.1) ? 'oops' : JSON.stringify({ fixes: [{ wrong: '东家', right: '东翁', why: '称谓' }], doubts: [{ quote: '运司那边', query: '两淮运司 乾隆', why: '不确定' }] });
  if (p.includes('「本地志」')) return chance(0.1) ? '{' : JSON.stringify({ admin: '扬州府治江都、甘泉二县同城', officials: [{ post: '两淮盐运使', name: '卢见曾', note: '好文', sure: true }, null], economy: '盐业', families: '江、汪诸家', places: '东关街、天宁寺', customs: '好园林', current: '南巡余波', counties: ['江都县', '甘泉县', '无此县'] });
  if (p.includes('整理一段史料')) { const m = p.match(/公元 (-?\d+) 年到 (-?\d+) 年/); const a = +m[1], b = +m[2];
    if (chance(0.1)) return '{"events":[';
    return JSON.stringify({ rulers: [{ polity: '清', name: '爱新觉罗·颙琰', title: '清仁宗', reigns: [['嘉庆', 1796]], from: 1796, to: 1820 }], events: Array.from({ length: 30 }, (_, i) => ({ y: a + (i % (b - a + 1)), m: i % 13, text: '自建史事' + i + '：某地某事', who: ['某甲'], src: R(['检索', '记忆']) })).concat([{ y: a - 50, m: 1, text: '超出范围的事' }]), figures: [{ name: '某甲', born: a - 40, died: b + 5, posts: [[a, b, '某官']] }, { name: '坏人', born: 1900, died: 1800 }] }); }
  if (p.includes('这局历史模拟游戏的推演人')) return chance(0.1) ? 'x' : JSON.stringify({ steps: [{ what: '派人去办', who: R(names), cost: '二十两', time: '三日', ok: R(['能', '有代价', '办不到']), why: '他手里有人' }], risks: ['走漏风声'], alt: '', search: ['某人 乾隆' + n, '扬州 盐商 ' + n], places: ['苏州府', '仪征'], brief: { institutions: '运司衙门、掣验所', people: '运使卢见曾', terms: '窝单、掣验', interests: '总商要保窝本', details: '仪征掣验所的秤' } });
  if (p.includes('深明因果')) return chance(0.15) ? '{"overview":' : JSON.stringify({ overview: '大势' + n, upcoming: [{ key: '', y: 1760, m: 3, text: '新出之事' + n, status: '新出', why: '因你' }], figures: [{ name: '傅恒', alive: chance(0.1) ? false : true, post: '首席军机大臣' }], ripples: [{ cause: '你查盐栈', effect: '运司警觉' + n, when: '一月' }], npcMoves: [{ name: R(names), did: '托人打听你的底细' + n, why: '提防', plan: '再看看' }, null], factions: [{ name: '盐商公所', leader: '江春', members: '八大总商', aims: '保窝单', stance: '观望', strength: '强' }], upcoming: [{ key: '', y: 1830, m: 3, text: '新出' + n, status: '新出', why: '因你', needs: '盐价不跌' }] });
  if (p.includes('精通历代职官制度')) return JSON.stringify({ era: '清', summary: '省府县', ladder: [{ tier: '地方', posts: [{ name: '知县', rank: '正七品', duty: '一县' }] }], paths: [], fixes: [], unsure: [] });
  if (p.includes('整理出确实写在资料里')) return JSON.stringify({ almanac: [{ cat: '物价', text: '米价一石一两六钱', src: '志' }] });
  if (p.includes('压成一段四百字以内')) return '较早的经过：查账、置产、结亲。';
  if (p.includes('账房兼史官') && p.includes('【开局】')) return opening();
  if (p.includes('账房兼史官')) return ledger(p);
  if (p.includes('【开局】')) return '你叫汪景和，乾隆二十二年三月初六，扬州府江都县人，盐商。\n账房程立德抱着账本进来：「东家，掣验少了二百引。」';
  return story(/戏外|多少|几天/.test(((last.split('【玩家这回说】')[1]) || '').split('\n')[1] || '') && chance(0.7));
}
http.createServer((req, res) => {
  let b = ''; req.on('data', c => b += c); req.on('end', async () => {
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
    if (req.url.includes('/models')) { res.writeHead(200, { 'content-type': 'application/json' }); return res.end(JSON.stringify({ data: [{ id: 'deepseek-v4-pro' }] })); }
    const body = JSON.parse(b || '{}'); const msgs = body.messages || []; if (!msgs.length) { res.writeHead(404); return res.end('{}'); }
    const p = msgs.map(m => m.content).join('\n'); n++;
    const kind = p.includes('还没给玩家看') ? 'verify' : p.includes('「本地志」') ? 'gaz' : p.includes('整理一段史料') ? 'histbuild' : p.includes('推演人') ? 'ruling' : p.includes('账房兼史官') ? 'ledger' : p.includes('深明因果') ? 'world' : p.includes('职官') ? 'inst' : p.includes('资料里') ? 'digest' : p.includes('四百字') ? 'memory' : 'story';
    fs.appendFileSync(LOG, `${n}\t${kind}\t${p.length}\t${msgs.length}\t${(msgs[0]||{}).role}\t${body.temperature}\n`);
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
}).listen(Number(process.env.MOCK_PORT || 3418), () => console.log('chaos 3408'));
