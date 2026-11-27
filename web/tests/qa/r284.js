// 年谱不瞎写（R-284，2026-11-27 项目主人：「年谱里面有非常多瞎写的东西」）：
// 别人的地方不凭空降灾；衙役民壮没有营中起疫、欠饷哗变；照兵制合计的大军驻守不掷大疫；逃亡一两人不进年谱、不写「约0人」；
// 同名异代的人不认（1126 年的孙翊不是三国孙翊）、开局前早死的不记；殿试查不到名录不写、编的同科不进；写戏交的人生变化至多三条、重复的不记；旧存档里的内部字样、重复条目清掉
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof armyHazards === 'function' && typeof chronTidy === 'function');
  const out = await p.evaluate(async () => {
    const bad = [];
    // 衙役、民壮：一年十二个月都不出营中之事
    S = newSave({ name: '汪辉祖', gender: '男', age: 57, role: '湖南宁远县知县', gregorianYear: 1787, month: 1, day: 1, place: '宁远县', polity: '清', real: true });
    S.forces = [{ name: '宁远县衙役', owner: '你', leader: '汪辉祖', troops: 40, morale: 10, owed: 50, at: '宁远县', status: '驻守' }, { name: '宁远县民壮', owner: '你', leader: '汪辉祖', troops: 60, morale: 10, owed: 50, at: '宁远县', status: '驻守' }];
    let all = []; for (let i = 0; i < 24; i++) { S.turn = i + 1; S.clock.m = (i % 12) + 1; all = all.concat(armyHazards(S, 1)); }
    if (all.length) bad.push('衙役、民壮出了营中之事：' + all.slice(0, 3).join('；'));
    // 照兵制合计的大军驻守不动：不掷大疫
    S.forces = [{ name: '南方各路禁军', owner: '你', leader: '某', troops: 300000, morale: 30, at: '江宁', status: '驻守' }]; all = []; for (let i = 0; i < 24; i++) { S.turn = i + 1; S.clock.m = (i % 12) + 1; all = all.concat(armyHazards(S, 1)); }
    if (all.length) bad.push('驻守的合计大军凭空出事：' + all[0]);
    // 小股兵：逃亡一两人不进年谱，也不写约0人
    S.forces = [{ name: '乡兵', owner: '你', leader: '某', troops: 30, morale: 20, at: '宁远县', status: '驻守' }]; S.chronicle = []; for (let i = 0; i < 36; i++) { S.turn = i + 1; S.clock.m = (i % 12) + 1; const o = armyHazards(S, 1); if (o.some(t => /约0人/.test(t))) bad.push('写了「约0人」'); }
    if (S.chronicle.some(x => x.who === '军中' && /约[12]人/.test(x.what))) bad.push('逃亡一两人也进了年谱');
    // 同名异代不认
    if (typeof figByName === 'function') { const f = figByName('孙翊', 1126); if (f && f.d != null && f.d < 1000) bad.push('1126 年的孙翊认成了三国孙翊'); }
    // 去重、内部字样
    S.chronicle = [{ turn: 1, when: '一', who: '李纲', what: '罢知枢密院事，出为河北、河东路宣抚使' }, { turn: 1, when: '一', who: '李纲', what: '罢知枢密院事，出为河北、河东路宣抚使' }, { turn: 2, when: '二', who: '朝廷', what: '殿试取中：（史料里查不到这一科的名录）；另有同科张三（虚构）' }, { turn: 3, when: '三', who: '王渊', what: '上言金人在河阳，请备着守江' }, { turn: 4, when: '四', who: '王渊', what: '上言金人在河阳，请备着守江。' }];
    S._chronN = null; chronTidy(S); const w = S.chronicle.map(x => x.what);
    if (w.filter(x => /罢知枢密院/.test(x)).length !== 1) bad.push('同一条记了两遍没去掉');
    if (w.some(x => /查不到|虚构/.test(x))) bad.push('年谱里还有「查不到」「虚构」字样');
    if (!chronDup(S, '王渊', '上言金人在河阳，请备着守江。行在始议守江')) bad.push('几乎一样的话又要记一遍没认出');
    // 审校改「留守司→副元帅司」：账里别处的「留守」（吴老栓留守李家庄）不能跟着成「副元帅」；前几回的年谱不回头改
    S.people = S.people || {}; S.people['冯掌柜'] = { role: '米行' };
    const sw = auditSweep({ a: '吴老栓留守李家庄，领一个青壮守庄门', b: '投留守司', c: '冯掌柜的二儿子来了，冯掌柜不在' }, [{ wrong: '留守司', right: '副元帅司' }, { wrong: '冯掌柜的二儿子', right: '冯东家的二儿子' }], S);
    if (/副元帅李家庄/.test(sw.a)) bad.push('审校改一处「留守司」，账里「留守李家庄」也成了「副元帅李家庄」');
    if (sw.b !== '投副元帅司') bad.push('审校改的整句没照改');
    if (/冯掌柜/.test(sw.c)) bad.push('改了人的称呼，账里别处没跟着改');
    // 家室：「王氏，闺名婉如」整句填进名字栏
    S.household = [{ relation: '正室', name: '王氏，闺名婉如', age: 19 }, { relation: '妾', name: '柳氏（小字素娥）', age: 22 }];
    fixShiNames(S); const hn = S.household.map(m => m.name);
    if (hn.some(n => /，|（|闺名|小字/.test(n))) bad.push('家室名字栏里还是整句：' + hn.join('、'));
    S.chronicle = [{ turn: 1, when: '一', who: '沈怀远', what: '家室补记：正室王氏，闺名婉如、妾柳氏，闺名素娥' }]; S._chronN = null; chronTidy(S);
    if (/氏，闺名/.test(S.chronicle[0].what)) bad.push('旧年谱「王氏，闺名婉如、妾柳氏」没理成括号');
    // 写戏交的人生变化至多三条（照提示词）
    const src = String(document.documentElement.innerHTML); if (!/arr\(d\.lifeEvents\)\.slice\(0, 3\)/.test(src)) bad.push('写戏交的人生变化没限到三条');
    if (/身边人的小变化/.test(src)) bad.push('提示词还让写「身边人的小变化」');
    return bad;
  });
  for (const x of out) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(errs.length ? 1 : 0);
})();
