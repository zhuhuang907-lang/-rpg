// 五代十国朝廷照数据排（任务七，R-227）：开在荆南（926 年），人事树照数据搭（小国只有它实有的十几个位子），史书明载、照履历推定的人坐原位，
// 史书没留名的位子照用人来路补人：标虚构、不与真人重名、重开一局同一位子还是同一个人；朝局页看得到「照履历推定」「虚构」；别称「南平」也认
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1400 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof orgFromCourt === 'function');
  const out = await p.evaluate(async () => {
    const bad = [], mk = pol => { const s = newSave({ name: '某甲', gender: '男', age: 30, role: '推官', gregorianYear: 926, month: 6, day: 1, place: '江陵', polity: pol }); s.chat = [{ role: 'gm', text: '开场。' }]; return s; };
    if (!COURTDATA.length) return ['游戏里没有朝廷数据'];
    const oc = callClaude; let asked = 0; callClaude = async pr => { if (/国策书/.test(pr)) return { text: JSON.stringify({ policies: [{ id: 'p1', area: '军事', name: '修战舰习水战' }] }) }; asked++; return { text: '{}' }; };
    const s1 = mk('荆南'); try { await buildOrg(s1); } finally { callClaude = oc; }
    if (asked) bad.push('有朝廷数据的荆南还去问模型现编人事树');
    if (!arr(s1.polBook).some(p => p.name === '修战舰习水战')) bad.push('照数据搭了人事树，国策书却没整');
    if (!s1.org || s1.org.court !== '荆南') return bad.concat('荆南没照朝廷数据搭人事树');
    const posts = s1.org.nodes.flatMap(n => n.posts.map(q => ({ n: n.name, q })));
    if (posts.length < 10 || posts.length > 20) bad.push('荆南位子数不像小国：' + posts.length);
    const find = t => (posts.find(x => x.q.title.includes(t)) || {}).q || {};
    if (find('节度使').holder !== '高季兴') bad.push('926 年荆南节度使不是高季兴：' + JSON.stringify(find('节度使')));
    if (find('马步军都指挥使').holder !== '高从诲') bad.push('马步军都指挥使不是高从诲');
    if (s1.courtWho['高从诲'] !== '推定') bad.push('高从诲这一任是照履历推定的，没标出来');
    if (posts.some(x => !x.q.holder)) bad.push('有位子空着：' + posts.filter(x => !x.q.holder).map(x => x.q.title).join('、'));
    const fic = Object.entries(s1.courtWho).filter(([, v]) => v === '虚构').map(([k]) => k);
    if (!fic.length) bad.push('没有补人');
    const real = realNamesAll(); if (fic.some(n => real.has(n))) bad.push('补的人跟真人重名：' + fic.filter(n => real.has(n)).join('、'));
    if (fic.some(n => /某|不详/.test(n))) bad.push('补的人名字带「某」');
    const fam = new Set(COURTDATA[0].polities[0].recruit.flatMap(r => r.families)); if (fic.some(n => !fam.has(n[0]) && !fam.has(n.slice(0, 2)))) bad.push('补的人姓氏不在该国用人来路里：' + fic.join('、'));
    const s2 = mk('南平'); callClaude = async () => ({ text: '{}' }); try { await buildOrg(s2); } finally { callClaude = oc; }
    if (!s2.org || s2.org.court !== '荆南') bad.push('写「南平」没认出是荆南');
    else { const pick = s => s.org.nodes.flatMap(n => n.posts).filter(q => q.src === '拟').map(q => q.seat + ':' + q.holder).sort().join('|'); if (pick(s1) !== pick(s2)) bad.push('重开一局，同一位子补出来的人变了'); }
    // 后唐 930（大国样板）：宰相、枢密使照通鉴核过的人坐；大官位子不补虚构人；中书舍人这类中层位子照用人来路补
    const s3 = (() => { const s = newSave({ name: '某乙', gender: '男', age: 35, role: '监察御史', gregorianYear: 930, month: 6, day: 1, place: '洛阳', polity: '后唐' }); s.chat = [{ role: 'gm', text: '开场。' }]; return s; })();
    callClaude = async () => ({ text: '{}' }); try { await buildOrg(s3); } finally { callClaude = oc; }
    if (!s3.org || s3.org.court !== '后唐') bad.push('后唐没照朝廷数据搭人事树');
    else { const P3 = s3.org.nodes.flatMap(n => n.posts), all = q => [q.holder].concat(arr(q.others)).filter(Boolean);
      const xz = P3.find(q => /平章事/.test(q.title)) || {}; if (!all(xz).includes('冯道')) bad.push('930 年后唐宰相里没有冯道：' + JSON.stringify(xz));
      if (all(xz).some(n => s3.courtWho[n] === '虚构')) bad.push('宰相位子补了虚构人');
      const smz = P3.find(q => q.title === '枢密使') || {}; if (!all(smz).includes('范延光')) bad.push('930 年枢密使里没有范延光');
      const zs = P3.find(q => q.title === '中书舍人') || {}; if (!all(zs).length || !all(zs).every(n => s3.courtWho[n] === '虚构')) bad.push('中书舍人这类中层位子没照来路补人');
      if (P3.length > 30) bad.push('后唐中枢位子数不对：' + P3.length); }
    // 后周 955：中枢照通鉴核过的人，大官不补虚构
    const s4 = (() => { const s = newSave({ name: '某丙', gender: '男', age: 35, role: '监察御史', gregorianYear: 955, month: 6, day: 1, place: '开封', polity: '后周' }); s.chat = [{ role: 'gm', text: '开场。' }]; return s; })();
    callClaude = async () => ({ text: '{}' }); try { await buildOrg(s4); } finally { callClaude = oc; }
    if (!s4.org || s4.org.court !== '后周') bad.push('后周没照朝廷数据搭人事树');
    else { const P4 = s4.org.nodes.flatMap(n => n.posts), all = q => [q.holder].concat(arr(q.others)).filter(Boolean);
      const xz = P4.find(q => /平章事/.test(q.title)) || {}; if (!all(xz).some(n => ['范质', '王溥', '李谷'].includes(n))) bad.push('955 年后周宰相里没有范质、王溥、李谷：' + JSON.stringify(all(xz)));
      if (!['王溥', '李谷', '范质'].every(n => all(xz).includes(n))) bad.push('955 年后周宰相王溥、李谷、范质应同时在任（同名的唐末王溥卒年不许截后周王溥）：' + JSON.stringify(all(xz)));
      if (P4.filter(q => /平章事|枢密使|三司使|侍卫|点检/.test(q.title)).some(q => all(q).some(n => s4.courtWho[n] === '虚构'))) bad.push('后周大官位子补了虚构人');
      const smz = P4.find(q => q.title === '枢密使') || {}; if (!all(smz).includes('魏仁浦')) bad.push('955 年后周枢密使里没有魏仁浦：' + JSON.stringify(all(smz))); }
    // 逐年照数据换人：后唐 930 年开局，走到 934 年，宰相照数据换（冯道 930 在、934 年已不在原位或换了人），你自己的位子不动、补的虚构人照旧
    { const s5 = (() => { const s = newSave({ name: '某丁', gender: '男', age: 35, role: '中书舍人', gregorianYear: 930, month: 6, day: 1, place: '洛阳', polity: '后唐' }); s.chat = [{ role: 'gm', text: '开场。' }]; return s; })();
      callClaude = async () => ({ text: '{}' }); try { await buildOrg(s5); } finally { callClaude = oc; }
      const xz = s => (s.org.nodes.flatMap(n => n.posts).find(q => /平章事/.test(q.title)) || {}), all = q => [q.holder].concat(arr(q.others)).filter(Boolean);
      const fix0 = JSON.parse(JSON.stringify(s5.courtFixed || {}));
      const before = all(xz(s5)).join('、');
      s5.clock.y = 934; const msgs = histTick(s5);
      const after = all(xz(s5)).join('、');
      if (s5.org.y !== 934) bad.push('跨年后朝堂没照新一年重排');
      if (before === after) bad.push('930 到 934 年宰相一个没换：' + before);
      if (!msgs.some(m => /平章事|宰相/.test(m))) bad.push('换人没进月报：' + JSON.stringify(msgs));
      const changed = Object.keys(fix0).filter(k => (s5.courtFixed[k] || {}).name !== fix0[k].name);   // 同一位子同一个空档，补的人永远是同一个
      if (changed.length) bad.push('跨年后补的虚构人变了：' + changed.join('、')); }
    { const s6 = newSave({ name: '某戊', gender: '男', age: 30, role: '郎官', gregorianYear: 940, month: 6, day: 1, place: '成都', polity: '后蜀' }); s6.chat = [{ role: 'gm', text: '开场。' }];
      callClaude = async () => ({ text: '{}' }); try { await buildOrg(s6); } finally { callClaude = oc; }
      const xz = (s6.org && s6.org.nodes.flatMap(n => n.posts).find(q => /平章事/.test(q.title))) || {};
      if (!s6.org || s6.org.court !== '后蜀' || ![xz.holder].concat(arr(xz.others)).includes('张业')) bad.push('940 年后蜀宰相里没有张业：' + JSON.stringify(xz)); }
    // 后蜀 946：张业在相位到 948 年被杀（中间几年通鉴没提他，不许当成追述截短）；吴越 948：杜建徽丞相到 950 年卒于任上
    for (const [pol, y, pl, who] of [['后蜀', 946, '成都', '张业'], ['吴越', 948, '杭州', '杜建徽']]) {
      const sx = newSave({ name: '某辛', gender: '男', age: 30, role: '郎官', gregorianYear: y, month: 3, day: 1, place: pl, polity: pol }); sx.chat = [{ role: 'gm', text: '开场。' }];
      callClaude = async () => ({ text: '{}' }); try { await buildOrg(sx); } finally { callClaude = oc; }
      const names = sx.org ? sx.org.nodes.flatMap(n => n.posts).flatMap(q => [q.holder].concat(arr(q.others))) : [];
      if (!names.includes(who)) bad.push(y + ' 年' + pol + '朝里没有' + who + '（任期被截短）'); }
    // 南唐 953：冯延巳再度拜相（951 年复相，三上三下），孙晟同在相位
    { const s8 = newSave({ name: '某庚', gender: '男', age: 30, role: '郎官', gregorianYear: 953, month: 3, day: 1, place: '金陵', polity: '南唐' }); s8.chat = [{ role: 'gm', text: '开场。' }];
      callClaude = async () => ({ text: '{}' }); try { await buildOrg(s8); } finally { callClaude = oc; }
      const xz = s8.org ? (s8.org.nodes.flatMap(n => n.posts).find(q => /平章事/.test(q.title)) || {}) : {}, w = [xz.holder].concat(arr(xz.others));
      if (!w.includes('冯延巳') || !w.includes('孙晟')) bad.push('953 年南唐宰相里没有冯延巳、孙晟：' + JSON.stringify(w)); }
    // 闽 944：宰相王倓、杨沂丰照通鉴；拱宸都指挥使朱文进坐禁军位子；殷的潘承祐不混进闽
    { const s7 = newSave({ name: '某己', gender: '男', age: 30, role: '郎官', gregorianYear: 944, month: 3, day: 1, place: '福州', polity: '闽' }); s7.chat = [{ role: 'gm', text: '开场。' }];
      callClaude = async () => ({ text: '{}' }); try { await buildOrg(s7); } finally { callClaude = oc; }
      const P7 = s7.org ? s7.org.nodes.flatMap(n => n.posts) : [], all = q => [q.holder].concat(arr(q.others)).filter(Boolean), names = P7.flatMap(all);
      if (!s7.org || s7.org.court !== '闽') bad.push('闽没照朝廷数据搭人事树');
      else { const xz = P7.find(q => /平章事/.test(q.title)) || {}; if (!all(xz).some(n => ['王倓', '杨沂丰'].includes(n))) bad.push('944 年闽宰相里没有王倓、杨沂丰：' + JSON.stringify(all(xz)));
        if (!names.includes('朱文进')) bad.push('944 年闽朝里没有朱文进');
        if (names.includes('潘承祐')) bad.push('殷的潘承祐混进了闽朝'); } }
    S = s1; return bad;
  });
  errs.push(...out);
  await p.evaluate(() => { VIEW = 'game'; TAB = 'court'; SIDE_FOLD = false; render0(); });
  const h = await p.evaluate(() => document.body.innerText);
  if (!/照履历推定/.test(h)) errs.push('朝局页看不到「照履历推定」');
  if (!/虚构/.test(h)) errs.push('朝局页看不到补的人标「虚构」');
  if (!/高季兴/.test(h)) errs.push('朝局页没摆出高季兴');
  // 真点：点「人物」标签，补的人写明来路，照履历推定的写明推定
  await p.evaluate(() => { TAB = 'board'; render0(); });
  const tb = await p.$$('[data-tab="people"]'); if (!tb.length) errs.push('找不到人物页标签'); else { await tb[0].click(); await p.waitForTimeout(150); }
  const hp = await p.evaluate(() => document.body.innerText);
  if (!/史书未载，照该国用人惯例补/.test(hp)) errs.push('人物页上补的人没写来路');
  if (!/任职年份照履历推定/.test(hp)) errs.push('人物页上高从诲没写照履历推定');
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
