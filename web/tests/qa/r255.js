// AI 调度省钱第一阶段（R-255）：要紧的一步只认真大事（贵型号、深想只给它）；块名长的也切得开、裁得到；
// 每次调用照 DeepSeek 返回的用量记花费账，设置页（真点）看得到每回花在哪一步
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof costNote === 'function' && typeof heavyStep === 'function');
  const out = await p.evaluate(() => {
    const bad = [];
    const s = newSave({ name: '周铁山', gender: '男', age: 21, role: '楚国牙军小卒', gregorianYear: 945, month: 5, day: 5, place: '潭州', polity: '楚' }); s.chat = [{ role: 'gm', text: '开场。' }]; s.turn = 3; s.settledAt = 0; S = s;
    // 1 要紧的一步只认真大事
    const light = ['这个月好好操练，跟同营的弟兄打好关系，留心哪位军校肯提拔人，再去城里看看有什么热闹', '找机会在都头面前露一手武艺', '守着营房，问问官兵最近有什么动静'];
    for (const x of light) if (heavyStep(s, x)) bad.push('平常的话算成了要紧的一步：' + x);
    const heavy = ['等两边都打得精疲力竭，我率本部兵马突入长沙，控制王府', '召集将领，宣布我继承楚王之位', '率本部迎战马希萼', '托媒人去柳家议亲'];
    for (const x of heavy) if (!heavyStep(s, x)) bad.push('真大事没算成要紧的一步：' + x);
    // 2 块名长的也切得开：「本地官员名册（此刻在任；……）」以前切不开，裁不到
    const long = (t, n) => Array.from({ length: n }, (_, i) => `· 第${i + 1}条 ${t}`).join('\n');
    const mat = '写戏的规矩……' + '规'.repeat(3000) + '\n【主角】周铁山\n【本地官员名册（此刻在任；写到这些职位上的人一律用这些名字，不改名、不另起一个、不写「某」；名册里没有的职位，照常理起一个合乎时代的全名）】\n' + long('长沙县主簿李浚，本官正九品，上司县令', 80) + '\n【本朝升迁之制（照史书；主角的升降调补一律照此，不合的写不成；依据：《旧五代史》《新五代史》《资治通鉴》《唐六典》）】\n' + long('牙军小卒无品', 60) + '\n【玩家这回说】去校场操练';
    const r = econTrimText(mat, { official: false, adm: false, mil: false, eco: false, geo: true });
    const seg = n => (r.split(/\n(?=【)/).find(z => z.startsWith('【' + n)) || '').length;
    if (seg('本地官员名册') > 1000) bad.push('块名长的官员名册没裁：' + seg('本地官员名册'));
    if (/本朝升迁之制/.test(r)) bad.push('白身说平常事还带着升迁之制');
    if (!/【玩家这回说】去校场操练$/.test(r)) bad.push('玩家的话被动了');
    // 3 花费账：照用量和价目算（未命中输入 1 万、命中 1 万、输出 2 千，贵型号闲时）
    costNote('', { usage: { prompt_tokens: 20000, prompt_cache_hit_tokens: 10000, completion_tokens: 2000 }, model: 'deepseek-v4-pro' }, false);
    costNote('裁定', { usage: { prompt_tokens: 8000, prompt_cache_hit_tokens: 0, completion_tokens: 1000 }, model: 'deepseek-v4-flash' }, true);
    const L = arr(S.costLog); const want = (10000 * 0.15 + 10000 * 4.5 + 2000 * 13.5) / 1e6 * (costPeak() ? 2 : 1);
    if (L.length !== 2 || L[0].cat !== '写正文' || L[0].m !== 'pro' || Math.abs(L[0].yuan - want) > 0.0002) bad.push('写正文这一笔记得不对：' + JSON.stringify(L[0]) + ' 应为 ' + want);
    if (L[1].cat !== '推演' || L[1].m !== 'flash') bad.push('推演这一笔型号或类别不对：' + JSON.stringify(L[1]));
    costNote('记账', { text: '{}' }, true); if (arr(S.costLog).length !== 2) bad.push('没有用量的也记了一笔');
    VIEW = 'game'; SIDE_FOLD = false; TAB = 'board'; render0();
    return bad;
  });
  // 真点设置页：看得到每回花了多少、写正文那一行
  await p.click('[data-tab="set"]').catch(() => errs.push('设置页签点不到'));
  await p.waitForTimeout(400);
  const t = await p.evaluate(() => document.body.innerText);
  if (!/每回花了多少/.test(t) || !/写正文/.test(t) || !/上一回（第3回）/.test(t)) errs.push('设置页看不到花费账：' + ((t.match(/每回花了多少[\s\S]{0,200}/) || [''])[0]));
  console.log('ERRS', JSON.stringify([...errs, ...out]));
  await b.close(); process.exit(errs.length || out.length ? 1 : 0);
})();
