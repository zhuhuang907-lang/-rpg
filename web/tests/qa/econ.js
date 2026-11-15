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
    // 关掉就不裁
    SETTINGS.econ = false; try { if (econTrim(mat, s, '找二当家') !== mat) bad.push('关了还在裁'); } finally { delete SETTINGS.econ; }
    if (econTrim(mat, s, '找二当家').length >= mat.length) bad.push('默认没开');
    // 不要紧的一步不另请审稿；要紧的照请
    if (!econSkipReview('找二当家来商量以后怎么办', null)) bad.push('不要紧的一步还请审稿');
    if (econSkipReview('带兵攻打曹县县城', null) || econSkipReview('走', { battleResult: {} }) || econSkipReview('托媒人去柳家议亲', null)) bad.push('要紧的一步没请审稿');
    return bad;
  });
  console.log('ERRS', JSON.stringify([...errs, ...out]));
  await b.close(); process.exit(errs.length || out.length ? 1 : 0);
})();
