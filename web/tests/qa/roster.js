// 天下名录各家都有宗室以外的真人（CLAUDE.md 人物「天下名录照各家做表」；2026-11-05 玩家：「闽国难道搜索不到真实的除了宗室以外的吗，其他国家也是，明明有的」）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof buildRoster === 'function');
  const out = await p.evaluate(async () => {
    const bad = [], asks = [];
    S = newSave({ name: '王审知', gender: '男', age: 59, role: '闽王', real: true, gregorianYear: 921, month: 6, day: 1, place: '福州', polity: '闽' });
    callClaude = async pr => { if (/开「天下名录」/.test(pr)) { asks.push(pr); const w = pr.split('这一张只写：')[1] || '', R = [];
        if (/闽/.test(w.split('。')[0])) R.push({ realm: '闽', people: [{ name: '王审知', post: '闽王', group: '君主', source: '《新五代史·闽世家》' }, { name: '翁承赞', post: '同平章事', group: '宰辅重臣', source: '《十国春秋·翁承赞传》' }, { name: '黄滔', post: '监察御史里行、威武军节度推官', group: '文臣', source: '《十国春秋·黄滔传》' }, { name: '徐寅', post: '秘书省正字', group: '文臣', source: '《十国春秋·徐寅传》' }, { name: '编个假名', post: '枢密使', group: '宰辅重臣', source: '《十国春秋》' }, { name: '某将', post: '指挥使', source: '推测' }] });
        if (/吴(?!越)/.test(w.split('。')[0])) R.push({ realm: '吴', people: [{ name: '徐温', post: '大丞相、都督中外诸军事', group: '宰辅重臣', source: '《新五代史·吴世家》' }, { name: '严可求', post: '右仆射', group: '宰辅重臣', source: '《十国春秋·严可求传》' }] });
        if (/吴越/.test(w.split('。')[0])) R.push({ realm: '吴越', people: [{ name: '皮光业', post: '元帅府判官', group: '文臣', source: '《十国春秋·皮光业传》' }] });
        return { text: JSON.stringify({ realms: R }) }; } return { text: '{}' }; };
    // 没有博查：照 DeepSeek 的表收，宗室以外的文武都要有；没出处的、「某」不收
    BOCHA_KEY = ''; MODE = 'none'; await buildRoster(S);
    const has = n => arr(S.roster && S.roster.groups).some(g => g.people.some(x => x.name === n)), grp = n => (arr(S.roster && S.roster.groups).find(g => g.people.some(x => x.name === n)) || {}).name;
    for (const n of ['翁承赞', '黄滔', '徐寅']) if (!has(n)) bad.push('闽国宗室以外的' + n + '没列上');
    for (const n of ['徐温', '严可求', '皮光业']) if (!has(n)) bad.push('别国的' + n + '没列上');
    if (has('某将')) bad.push('「某」、没出处的也收了');
    if (grp('翁承赞') !== '闽' || grp('徐温') !== '吴') bad.push('名录没照各家分：' + grp('翁承赞') + ' ' + grp('徐温') + JSON.stringify(S.roster.groups.map(g => [g.name, g.people.map(x => x.name)])));
    if (!asks.length || asks.some(a => /军机大臣|总督|巡抚|贝勒/.test(a))) bad.push('问法还按清朝写死');
    if (!asks.some(a => /吴越/.test(a)) || !asks.some(a => /楚/.test(a))) bad.push('没把这一年并立的别家一并问上：' + asks.length);
    // 有博查：一个个按名字核，核不上的（编个假名）不收；真人核得上
    S.roster = null; BOCHA_KEY = 'bk-test'; bochaDeep = async (s, qs) => ({ text: '', bocha: true, items: qs.filter(q => !/编个假名/.test(q)).map(q => ({ q, title: q.split(' ')[0] + ' - 百度百科', snippet: q + '，五代十国人物。', url: 'https://x/' + q })) });
    await buildRoster(S);
    if (!has('翁承赞') || !has('徐温')) bad.push('有博查时真人核不上');
    if (has('编个假名')) bad.push('博查核不上的假名也收了');
    if (S.roster.v !== 3) bad.push('名录没升版本，旧存档不重查');
    TAB = 'people'; VIEW = 'game'; SIDE_FOLD = false; S.chat = [{ role: 'gm', text: '开场' }]; render0(); const txt = (document.querySelector('.roster') || {}).textContent || '';
    if (!/翁承赞/.test(txt) || !/徐温/.test(txt)) bad.push('人物页的天下名录没摆出来');
    return bad;
  });
  const all = out.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
