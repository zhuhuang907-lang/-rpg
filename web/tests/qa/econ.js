// 省 token（R-238）：发给模型的材料照这一步的话题和主角的身份裁——用不上的整块不带，长的各有上限（新的留着）；
// 玩家的话、正文、主角这些一个字不动；短的不裁；不要紧的一步不另请审稿
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof econTrimText === 'function' && typeof newSave === 'function');
  const out = await p.evaluate(() => {
    const bad = [], long = (t, n) => Array.from({ length: n }, (_, i) => `· 第${i + 1}条 ${t}`).join('\n');
    const mat = ['写戏的规矩……' + '规矩'.repeat(400), '【主角】胡大彪，山寨寨主', '【本朝官制（已按本局年代核过，以此为准）】\n' + long('巡抚从二品', 80), '【主角仕途（以此为准）】\n' + long('履历', 40),
      '【本朝军制编制（兵马数目照此）】\n' + long('绿营', 60), '【不在眼前的人（外地的、断了来往的）】\n' + long('某人在外地', 120), '【定本（本局已经确立）】\n' + long('旧事', 200) + '\n· 最新的一条：寨里并无火炮',
      '【前情提要】\n' + long('前情', 150) + '\n· 上一回：二当家说粮够吃半年', '【玩家这回说】找二当家来商量：以后下山只劫过路的大户', '【这一回的正文】\n' + '你叫人去请二当家。'.repeat(300)].join('\n');
    const bandit = { official: false, adm: false, mil: false, eco: false, geo: true };
    let t = econTrimText(mat, bandit);
    if (/本朝官制|主角仕途|本朝军制编制/.test(t)) bad.push('寨主商量劫道，还带着官制、仕途、军制');
    if (!t.includes('【玩家这回说】找二当家来商量：以后下山只劫过路的大户') || !t.includes('你叫人去请二当家。'.repeat(300)) || !t.includes('【主角】胡大彪')) bad.push('玩家的话、正文、主角被动了');
    if (!t.includes('最新的一条：寨里并无火炮') || /第3条 旧事/.test(t)) bad.push('定本没留新的、去旧的');
    if (!t.includes('上一回：二当家说粮够吃半年')) bad.push('前情提要没留最近的');
    const seg = x => (t.split('\n【').find(z => z.startsWith(x)) || '').length;
    if (seg('不在眼前的人') > 520 || seg('定本') > 1520 || seg('前情提要') > 1620) bad.push('上限没管住：' + [seg('不在眼前的人'), seg('定本'), seg('前情提要')]);
    if (!(t.length < mat.length * 0.7)) bad.push('裁得不够：' + mat.length + '→' + t.length);
    // 做官的、或这一步说到公事：官制带着（有上限）；说到打仗：军制带着
    t = econTrimText(mat, { ...bandit, official: true }); if (!/本朝官制/.test(t) || !/主角仕途/.test(t)) bad.push('做官的没带官制');
    t = econTrimText(mat, { ...bandit, mil: true }); if (!/本朝军制编制/.test(t)) bad.push('说到打仗没带军制');
    // 短的不裁；不认得的块不动
    const short = '【本朝官制】巡抚\n【玩家这回说】走'; if (econTrimText(short, bandit) !== short) bad.push('短的也裁了');
    const odd = '规矩'.repeat(4000) + '\n【一个没见过的块】' + '内容'.repeat(3000); if (econTrimText(odd, bandit) !== odd) bad.push('不认得的块被动了');
    // 身份和话题照存档、照玩家的话认
    const s = newSave({ name: '胡大彪', gender: '男', age: 38, role: '曹州府菏泽县境内山寨寨主', gregorianYear: 1813, month: 9, day: 15, place: '菏泽', polity: '清' });
    const c1 = econCtx(s, '找二当家来商量'), c2 = econCtx(s, '写一道公文给知府'), c3 = econCtx(s, '带人下山设伏');
    if (c1.official || c1.adm || !c2.adm || !c3.mil) bad.push('话题、身份认错了：' + JSON.stringify([c1, c2, c3]));
    // 省钱版是唯一版本：没有开关，设置里写了 econ=false 也照样裁（2026-11-15 项目主人：「不要什么开省钱版，只要省钱版」）
    SETTINGS.econ = false; try { if (econTrim(mat, s, '找二当家').length >= mat.length) bad.push('还留着关掉省钱的开关'); } finally { delete SETTINGS.econ; }
    if (econTrim(mat, s, '找二当家').length >= mat.length) bad.push('默认没省');
    if (/省钱|省 token|econ/i.test((document.body.innerText || '') + (typeof settingsHtml === 'function' ? settingsHtml() : ''))) bad.push('界面上出现了省钱开关');
    // 第二刀：平常的一步用短记账单，大事、隔五回用全套
    s.turn = 6; s.ledgerFullAt = 5;
    const story = '你叫人请来二当家，两人在聚义厅坐下说话。二当家点头称是。'.repeat(20);
    if (!ledgerLiteOk(s, '找二当家来商量以后怎么办', story, null)) bad.push('平常的一步没用短记账单');
    const lite = ledgerInput(s, '找二当家来商量以后怎么办', story, '', 'step', null), full0 = (() => { s.turn = 6; s.ledgerFullAt = 0; return ledgerInput(s, '找二当家来商量以后怎么办', story, '', 'step', null); })();
    if (!(lite.length < full0.length * 0.6)) bad.push('短记账单不够短：' + lite.length + ' / ' + full0.length);
    for (const k of ['elapsedDays', 'ledger', 'presentNpcs', 'actResults', 'orders', 'turnSummary']) if (!lite.includes('"' + k + '"')) bad.push('短记账单缺了 ' + k);
    if (/"identity"|"household"|"forces"|"estate"/.test(lite)) bad.push('短记账单还带着大事的字段');
    if (s.ledgerFullAt !== 6) bad.push('全套记账后没记下是哪一回');
    s.turn = 7;
    if (ledgerLiteOk(s, '托媒人去柳家议亲', story, null)) bad.push('议亲还用短单');
    if (ledgerLiteOk(s, '在家歇着', story + '老母亲夜里病故了。', null)) bad.push('正文里有人死了还用短单');
    if (ledgerLiteOk(s, '走', story, { battleResult: {} })) bad.push('打了仗还用短单');
    s.ledgerFullAt = 1; if (ledgerLiteOk(s, '在家歇着', story, null)) bad.push('隔了五回还不用全套');
    s.ledgerFullAt = 6; s.turn = 1; if (ledgerLiteOk(s, '在家歇着', story, null)) bad.push('头一回就用短单');
    // 第三刀：同一回的几次调用，一字不差的材料块排在最前、次序相同；不增不减
    s.turn = 8; const A = '【此刻】' + '甲'.repeat(300), B = '【人物（以此为准）】' + '乙'.repeat(400), C = '【家业账】' + '丙'.repeat(300);
    const r1 = cacheOrder('判断的规矩' + '规'.repeat(5000) + '\n' + A + '\n' + B + '\n【玩家这回说】找二当家', s);
    const r2 = cacheOrder('记账的规矩' + '账'.repeat(5000) + '\n' + C + '\n' + B + '\n' + A + '\n【玩家这回说】找二当家\n【这一回的正文】' + '正'.repeat(300), s);
    if (!r1.startsWith(A + '\n' + B) || !r2.startsWith(A + '\n' + B)) bad.push('相同的材料没排在最前、次序不一');
    const sortc = x => x.replace(/\n/g, '').split('').sort().join('');
    if (sortc(r2) !== sortc('记账的规矩' + '账'.repeat(5000) + '\n' + C + '\n' + B + '\n' + A + '\n【玩家这回说】找二当家\n【这一回的正文】' + '正'.repeat(300) + '\n')) bad.push('换次序时字数变了');
    if (!/【玩家这回说】找二当家\n【这一回的正文】/.test(r2)) bad.push('玩家的话和正文被拆开了');
    // 跨回合：上一回见过、这一回一字没变的块排在这一回才变的块前面
    s.turn = 9; const A9 = '【此刻】' + '丁'.repeat(300);
    const r3 = cacheOrder('记账的规矩' + '账'.repeat(5000) + '\n' + A9 + '\n' + B + '\n【玩家这回说】歇着', s);
    if (!r3.startsWith(B + '\n' + A9)) bad.push('跨回合没把没变的材料排在最前');
    // 山寨、市井的平常话里带「兵」「守」「官」单字，照样用短单（真模型实测：六回短单一次没起作用）
    s.turn = 10; s.ledgerFullAt = 9;
    const daily = '你在寨门口看喽啰们操弄兵器，守寨的弟兄说官兵最近没动静，又提起山下的税。'.repeat(8);
    if (!ledgerLiteOk(s, '去寨门口转转，问问守寨的弟兄官兵最近有没有动静', daily, null)) bad.push('平常话里带兵、守、官单字就不用短单');
    // 不要紧的一步不另请审稿；要紧的照请
    if (!econSkipReview('找二当家来商量以后怎么办', null)) bad.push('不要紧的一步还请审稿');
    if (econSkipReview('带兵攻打曹县县城', null) || econSkipReview('走', { battleResult: {} }) || econSkipReview('托媒人去柳家议亲', null)) bad.push('要紧的一步没请审稿');
    // 真模型实测（2026-11-15）：一块材料后面紧跟着的规矩、输出格式，不许被上限切掉、不许被整块丢掉、不许被挪散
    { const rules = '你是这局游戏的推演人。玩家有完全的自由。\n只输出一个 JSON 对象：{"acts":[],"steps":[]}';
      const mk2 = (title) => ['规矩开头' + '。'.repeat(300), '【主角】胡大彪', `【${title}】\n` + Array.from({ length: 200 }, (_, i) => `· 第${i + 1}条 材料材料材料`).join('\n') + '\n\n' + rules, '【玩家这回说】看看寨子'].join('\n') + '填'.repeat(4000);
      for (const title of ['时间在走', '本朝官制（已核）', '定本']) { const o = econTrimText(mk2(title), { official: false, adm: false, mil: false, eco: false, geo: true });
        if (!o.includes(rules)) bad.push(`【${title}】后面的规矩和输出格式被裁掉了`); if (o.length >= mk2(title).length) bad.push(`【${title}】没裁`); }
      CACHE_SEQ = { segs: [], seen: new Map(), n: 0 }; const src = mk2('时间在走'), o2 = cacheOrder(src, { turn: 1, clock: { y: 930 } });
      if (!o2.includes(rules)) bad.push('排序把规矩弄丢了');
      if (!(o2.indexOf('【时间在走】') < o2.indexOf('规矩开头') && o2.indexOf('规矩开头') < o2.indexOf('你是这局游戏的推演人') && o2.indexOf('你是这局游戏的推演人') < o2.indexOf('【玩家这回说】'))) bad.push('排序后：材料没在最前，或规矩、输出格式、玩家的话的先后乱了'); }
    // 山寨寨主不是官
    { const s2 = newSave({ name: '胡大彪', gender: '男', age: 38, role: '曹州府菏泽县境内山寨寨主', gregorianYear: 1813, month: 9, day: 15, place: '菏泽', polity: '清' }); s2.career = { office: '山寨寨主' };
      if (identityOf(s2).tags.includes('官')) bad.push('山寨寨主被当成官'); }
    return bad;
  });
  console.log('ERRS', JSON.stringify([...errs, ...out]));
  await b.close(); process.exit(errs.length || out.length ? 1 : 0);
})();
