// 长考卷查出的毛病（R-279，2026-11-27 项目主人：「1，先不动，你来打处理，务必做好」——宰相拿五个身份连玩长局，出戏的一条条修）：
// 写戏照抄前文标的「（第N回合，写到某时）」；底账的工钱是一个月的、被当一天用（一家五口一月吃穿要三十九两）；开局那个月就扣吃穿；
// 现钱不够记成欠一个叫「挪借」的人、一年后卖身；几钱的小债卖身；逐月结算中间各月照抄过完那年的年号；明代江南米价照荒年往前推
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof stripEcho === 'function' && typeof hhMonthly === 'function');
  const out = await p.evaluate(() => {
    const bad = [];
    // 一、写戏开头照抄的时刻标记删掉，正文里的日子不动
    const cases = [['（四月十八酉时起，写到七月十八未时）  程婉贞见你', '程婉贞见你'], ['六月三十日午时 保儿那张纸', '保儿那张纸'], ['七月初五）  七月初六辰时，你', '七月初六辰时，你'], ['（第3回合，写到四月）\n正文', '正文'],
      ['七月初五午时，周金宝把', '七月初五午时，周金宝把'], ['嘉靖四十年春，丝价', '嘉靖四十年春，丝价'], ['「要现银。」你说。', '「要现银。」你说。'], ['（乾隆五十二年二月十六酉时） 你把惊堂木搁下', '你把惊堂木搁下'], ['五月十五午时）  你叫门吏起来', '你叫门吏起来'], ['（这一回没写完）你', '（这一回没写完）你']];
    for (const [a, w] of cases) { const g = stripEcho(a); if (g !== w) bad.push('开头标记没删对：' + JSON.stringify(a) + ' → ' + JSON.stringify(g)); }
    // 二、底账的工钱是月钱：折成日钱；本来就是日钱的不动
    { const E = { unit: '两', rice: 2.882, wage: 2.62, fromPreset: ['rice', 'wage'] }; econSane(E); if (!(E.wage > 0.05 && E.wage < 0.12)) bad.push('一个月的工钱没折成一天的：' + E.wage); if (!/像是一个月的/.test(E.basis || '')) bad.push('折工钱没记进依据'); }
    { const E = { unit: '文', rice: 600, wage: 40, fromPreset: ['wage'] }; econSane(E); if (E.wage !== 40) bad.push('本来就是一天的工钱被改了：' + E.wage); }
    // 三、一家五口一个月吃穿：照米价二斗五升一口加柴盐衣着，不是三十九两
    S = newSave({ name: '陈阿大', gender: '男', age: 30, role: '机户', gregorianYear: 1560, month: 3, day: 15, place: '苏州府长洲县', polity: '明' });
    S.money = { cash: 5, unit: '两' }; S.household = [{ name: '程婉贞', relation: '妻' }, { name: '陈保儿', relation: '子' }, { name: '陈父', relation: '父' }, { name: '陈母', relation: '母' }];
    S.econ = { v: 2, unit: '两', rice: 0.8, wage: 0.03, landPrice: 8, yield: 2, rentRate: 0.5, unitChk: 1, wageChk: 1 };
    const need = hhNeed(S); if (!(need > 0.5 && need < 2.5)) bad.push('一家五口一月吃穿不合常理：' + need);
    // 四、开局那个月不扣；下个月才扣
    hhMonthly(S); if (S.money.cash !== 5) bad.push('开局那个月就扣了吃穿：' + S.money.cash);
    S.clock = { ...S.clock, m: 4 }; hhMonthly(S); if (!(Math.abs(S.money.cash - (5 - need)) < 0.01)) bad.push('下个月没照常扣吃穿：' + S.money.cash);
    // 五、程序编的债主作废；几钱的小债不卖身，半年工钱以上才卖身
    { const H = hhOf(S); H.debt = [{ from: '挪借', amt: 12, rate: 0.02, ym: 0, due: 1, pressed: true }]; S.clock = { ...S.clock, m: 5 }; hhMonthly(S); if (arr(H.debt).some(d => d.from === '挪借') || /佃仆/.test(S.protagonist.role)) bad.push('旧档里程序编的「挪借」还在逼债：' + JSON.stringify(H.debt) + S.protagonist.role); }
    { const H = hhOf(S); S.money.cash = 0; H.debt = [{ from: '周金宝', amt: 0.4, rate: 0.02, ym: 0, due: 1, pressed: true }]; S.clock = { ...S.clock, m: 6 }; const o = hhMonthly(S); if (/佃仆/.test(S.protagonist.role)) bad.push('四钱的小债就卖身了'); if (!o.some(t => /拿去抵了/.test(t))) bad.push('小债还不上没写债主拿东西抵：' + o.join('/')); }
    { const H = hhOf(S); S.money.cash = 0; H.debt = [{ from: '沈万春', amt: 30, rate: 0.02, ym: 0, due: 1, pressed: true }]; S.clock = { ...S.clock, m: 7 }; hhMonthly(S); if (!/沈万春家的佃仆/.test(S.protagonist.role)) bad.push('欠到几十两还不上没卖身：' + S.protagonist.role); }
    // 六、逐月结算中间各月照那一年的年号，不照抄过完那年的
    { const T = newSave({ name: '赵祯', gender: '男', age: 34, role: '皇帝', gregorianYear: 1043, month: 4, day: 15, place: '开封', polity: '宋' });
      T.clock = { ...T.clock, y: 1044, m: 6, yearLabel: '庆历四年' }; const seen = []; monthLoop(T, { y: 1043, m: 9, leap: false }, 6, () => { seen.push(T.clock.y + ':' + (T.clock.yearLabel || '')); return []; });
      if (seen.some(x => /^1043:庆历四年/.test(x))) bad.push('1043 年的月份写成了庆历四年：' + seen.join(' '));
      if (!seen.some(x => /^1043:庆历三年/.test(x))) bad.push('1043 年的月份没照庆历三年：' + seen.join(' ')); }
    // 七、明代江南米价不再照 1640 年荒年价往前推
    { const L = PRESETLIB.filter(R => R.range && R.range[0] === 1368).flatMap(R => arr(R.prices)).filter(x => x.region === '江南' && x.from === 1560); if (!L.length || L[0].rice > 1100) bad.push('嘉靖年间江南米价还是荒年价：' + JSON.stringify(L[0] && L[0].rice)); }
    // 八、照毛病改几处：只照「原句→改成」替换，别处一字不动；找不到、不止一处、只删一两个字的不改
    { const T = '陆敬斋摇头：「告示上没写，等县里的话。」金军游骑已过临颍，兀术在后。书吏誊了令。米一石三两五钱。';
      const r = applyEdits(T, [{ old: '米一石三两五钱。', new: '米一石七钱。' }, { old: '兀术', new: '' }, { old: '不存在的句子。', new: 'x' }, { old: '令', new: '命' }]);
      if (r.n !== 1 || r.text !== T.replace('米一石三两五钱。', '米一石七钱。')) bad.push('改几处改坏了别处：' + JSON.stringify(r));
      if (!/没写/.test(r.text) || !/兀术/.test(r.text) || !/书吏誊了令/.test(r.text)) bad.push('照抄时掉的字又掉了：' + r.text); }
    // 九、一再请示照「请示拍板」那一类数（原来数成了欠债）；亲率进驻却还在原地议事要打回
    { S.turn = 5; const said = '亲率背嵬军进驻郾城。', T = '你把话说了。王贵抱拳：「末将这就点背嵬军。」薛弼道：「宣抚，粮道三事请宣抚先定。」孙革道：「檄稿在此，请宣抚示下。」牛皋道：「末将只等宣抚一句话。」';
      const f = draftFaults(S, said, T, 'auto');
      if (!f.some(x => /一再请示/.test(x))) bad.push('下面的人一再请示没打回：' + f.join(' / '));
      if (!f.some(x => /亲自领兵、去某地/.test(x))) bad.push('亲率进驻却还在原地没打回：' + f.join(' / '));
      const f2 = draftFaults(S, said, '五更造饭，你领背嵬军渡江北上，一路行军，第九日到了郾城。城上守臣开门迎你。「宣抚来得正好。」', 'auto');
      if (f2.some(x => /亲自领兵、去某地/.test(x))) bad.push('已经动身了还说没动身：' + f2.join(' / ')); }
    // 十、春秋诸侯在位照十二诸侯年表（原来整段没有，写戏把前 635 年的宋君写成二十年后的宋昭公）
    { const T = newSave({ name: '姬重耳', gender: '男', age: 62, role: '晋国国君', gregorianYear: -635, month: 5, day: 1, place: '绛', polity: '晋' }); const rs = rulersAt(-632, T).map(r => r.title);
      for (const w of ['周襄王', '晋文公', '楚成王', '宋成公', '齐昭公', '秦穆公', '郑文公', '鲁僖公', '卫成公', '曹共公']) if (!rs.includes(w)) bad.push('前 632 年在位的没查到：' + w + ' / ' + rs.join('、'));
      if (rs.includes('宋昭公')) bad.push('前 632 年查出了宋昭公'); }
    // 十一、一国之主岁入没算出来：原有兵马照常由朝廷养，不按月欠饷逃散；国库是负数时「付」不出负数，欠饷不翻滚
    { const run = inc => { S = newSave({ name: '赵祯', gender: '男', age: 34, role: '皇帝', gregorianYear: 1043, month: 5, day: 1, place: '开封', polity: '宋' });
        S.gov = { scope: 'realm', stats: { 国库: -1000000, ...(inc ? { 岁入: 60000000 } : {}) }, keys: [] }; S.forces = [{ name: '禁军', leader: '赵祯', owner: '宋', troops: 100000, at: '开封', status: '驻守', morale: 60 }];
        for (let i = 1; i <= 12; i++) { const c = CAL.monthAt({ y: 1043, m: 5, leap: false }, i); S.clock = { ...S.clock, y: c.y, m: c.m }; armyMonthly(S, 1); } return S.forces[0]; };
      const a = run(false); if (N0(a.owed) > 0) bad.push('岁入没算出来，原有禁军还按月欠饷：' + a.owed);
      const b2 = run(true); if (!(N0(b2.owed) > 0) || N0(b2.owed) > 100000 * 2 * 12) bad.push('国库是负数时欠饷越滚越大：' + b2.owed); }
    // 十二、公家的钱不进私账：解府地丁、平粜粜价、劝捐买补都是公家的；（官库钱，非私财）不算私
    for (const w of ['解府地丁银（现银尽解） 府批限三日尽解', '平粜粜谷收钱解库 收钱四百四十两解库（官库钱，非私财）', '劝捐银动支买补仓谷 二十三家共三百二十两', '摊解协济台湾兵饷银 按亩摊捐，解赴藩库']) if (!(PUB_MONEY.test(w) && !PRIV_MONEY.test(w))) bad.push('公家的钱还当私账：' + w);
    for (const w of ['自掏腰包垫解', '养廉银', '端阳节礼 送知府']) if (PUB_MONEY.test(w) && !PRIV_MONEY.test(w)) bad.push('自己的钱被当成公家的：' + w);
    return bad;
  });
  const bad = out.concat(errs);
  console.log('ERRS', JSON.stringify(bad));
  await b.close();
  if (bad.length) { console.log('!! 不合格'); process.exit(1); }
  console.log('长考卷查出的毛病修好');
})();
