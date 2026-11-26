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
      ['七月初五午时，周金宝把', '七月初五午时，周金宝把'], ['嘉靖四十年春，丝价', '嘉靖四十年春，丝价'], ['「要现银。」你说。', '「要现银。」你说。']];
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
    return bad;
  });
  const bad = out.concat(errs);
  console.log('ERRS', JSON.stringify(bad));
  await b.close();
  if (bad.length) { console.log('!! 不合格'); process.exit(1); }
  console.log('长考卷查出的毛病修好');
})();
