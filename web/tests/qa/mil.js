// 军政系统（CLAUDE.md「舆图·兵马」军令由程序当场办、兵数有来历、科技照年代、AI 查账）：募编、分兵、合兵、换将、拨粮、改编、裁撤当场照账办；钱不够、人不在、兵不在一处的当场说明；
// 记账改不了主角的兵数；科技照年代开放、成了真改战力；推演列 lookup，程序把账上的兵马、人物、地图、往事原样给写正文和记账的人
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof milDo === 'function' && typeof ledgerLookup === 'function');
  const out = await p.evaluate(() => {
    const bad = [];
    const mk = () => { const s = newSave({ name: '张九四', gender: '男', age: 45, role: '自立为吴王，割据平江', gregorianYear: 1365, month: 3, day: 1, place: '平江府', polity: '吴' }); s.realm = { capital: '平江府' }; s.money = { cash: 100000, unit: '两', hist: [] };
      s.unitTypes = [{ id: 'bu', name: '步卒', size: 500, atk: 50, def: 55, shock: 40, org: 60, mob: 40, pay: 1, grain: 0.5, months: 3, unit: '营' }, { id: 'qi', name: '骑兵', size: 300, atk: 60, def: 45, shock: 70, org: 60, mob: 70, pay: 3, grain: 1, months: 4, unit: '营' }];
      s.people = { 吕珍: { role: '部将', favor: 40, seen: 1 }, 李伯升: { role: '部将', favor: 30, seen: 1 } }; return s; };
    let s = mk(); if (!isRuler(s)) bad.push('测试设定不是一方之主');
    // 募编：当场成军、扣钱、人数照编制、写成办成
    ORGMSG = ''; let line = armyAct(s, 'raise', { tpl: 'bu', n: 2 }); const f = arr(s.forces)[0];
    if (!line || !f || forceStats(s, f).men !== 1000 || s.money.cash !== 100000 - 2000) bad.push('募编没当场办：' + JSON.stringify({ line, f, cash: s.money.cash, msg: ORGMSG }));
    if (!f || f.src !== '程序结算' || !f.why) bad.push('募来的兵没写来历');
    if (!arr(s.acts).some(x => x.state === '办成' && /募编/.test(x.what))) bad.push('募编没记成办成的行动单');
    // 钱不够当场说
    s.money.cash = 10; ORGMSG = ''; if (armyAct(s, 'raise', { force: f.name, tpl: 'qi', n: 5 }) || !/钱不够/.test(ORGMSG)) bad.push('钱不够也募成了：' + ORGMSG); s.money.cash = 100000;
    // 一个月募不了太多
    ORGMSG = ''; if (armyAct(s, 'raise', { force: f.name, tpl: 'bu', n: 200 }) || !/募不到/.test(ORGMSG)) bad.push('一个月募十万人也成了');
    // 换将：账上没有的人换不了；有的换上
    ORGMSG = ''; if (armyAct(s, 'appoint', { force: f.name, leader: '王某甲乙' })) bad.push('账上没有的人也换上了将');
    armyAct(s, 'appoint', { force: f.name, leader: '吕珍' }); if (f.leader !== '吕珍') bad.push('换将没办');
    // 分兵另立、合兵
    armyAct(s, 'split', { force: f.name, n: 500, leader: '李伯升', name: '李部' }); const g = s.forces.find(x => x.name === '李部');
    if (!g || forceStats(s, g).men !== 500 || forceStats(s, f).men !== 500 || g.leader !== '李伯升') bad.push('分兵没照数分：' + JSON.stringify(s.forces.map(x => [x.name, forceStats(s, x).men, x.leader])));
    g.at = '常州府'; ORGMSG = ''; if (armyAct(s, 'merge', { force: g.name, target: f.name }) || !/不在一处/.test(ORGMSG)) bad.push('不在一处也合了兵');
    g.at = f.at; armyAct(s, 'merge', { force: g.name, target: f.name }); if (s.forces.length !== 1 || forceStats(s, f).men !== 1000) bad.push('合兵没合上：' + s.forces.length);
    // 拨粮：没有太仓、不知道粮价的买不了；有太仓的照拨
    ORGMSG = ''; if (armyAct(s, 'supply', { force: f.name, n: 300 }) || !/粮价/.test(ORGMSG)) bad.push('不知道粮价也买成了粮');
    s.realm.granary = 1000; armyAct(s, 'supply', { force: f.name, n: 300 }); if (N0(f.grain) !== 300 || s.realm.granary !== 700) bad.push('拨粮没从太仓拨：' + JSON.stringify([f.grain, s.realm.granary]));
    // 改编：步卒一营改练骑兵
    armyAct(s, 'retrain', { force: f.name, tpl: 'bu', to: 'qi', n: 1 }); if (!f.units.some(x => x.tpl === 'qi') || (num(f.train) ?? 99) > 30) bad.push('改编没办：' + JSON.stringify(f.units));
    // 记账改不了主角的兵数
    const m0 = forceStats(s, f).men, d = { forces: [{ name: f.name, troops: 50000 }] }; S = s; ledgerGuard(s, d, null);
    if (N0(d.forces[0].troops) !== m0) bad.push('记账把主角的兵数改成了五万');
    // 科技：照年代开放；成了真改战力
    s = mk(); const ids = techAvail(s).map(t => t.id);
    if (!ids.includes('huoyao') || ids.includes('niaochong') || ids.includes('hongyi')) bad.push('1365 年能研究的科技不对：' + ids);
    const s2 = newSave({ name: '甲乙', gender: '男', age: 40, role: '平民', gregorianYear: 200, month: 3, day: 1, place: '许县', polity: '汉' }); if (techAvail(s2).some(t => t.id === 'huoyao')) bad.push('东汉也能研究火药兵器');
    armyAct(s, 'raise', { tpl: 'bu', n: 2 }); const f2 = s.forces[0], a0 = forceStats(s, f2).atk;
    techStart(s, 'huoyao'); const mo = s.tech.cur.months; techMonthly(s, mo);
    if (!arr(s.tech.done).includes('huoyao') || !(forceStats(s, f2).atk > a0)) bad.push('研究成了火药兵器，攻没长：' + JSON.stringify([s.tech, a0, forceStats(s, f2).atk]));
    // 查账：兵马的人数、人物、地图、往事照账原样给
    s.people['吕珍'].status = '驻守湖州'; const L = ledgerLookup(s, ['兵马', '人物:吕珍', '人物:王某甲乙', '地图:平江府', '往事:盐引'], '');
    if (!L.includes(f2.name) || !L.includes(fmtN(forceStats(s, f2).men, '人'))) bad.push('查账没给兵马人数');
    if (!/驻守湖州/.test(L)) bad.push('查账没给吕珍的近况'); if (!/账上没有这个人/.test(L)) bad.push('账上没有的人没说没有');
    if (!/平江/.test(L)) bad.push('查账没给地方'); if (!/没有记过这件事/.test(L)) bad.push('账上没有的往事没说没有');
    // 话里提到人、说到打仗，自动查
    const L2 = ledgerLookup(s, [], '叫吕珍带兵去打常州'); if (!/吕珍/.test(L2) || !/兵马/.test(L2)) bad.push('话里提到人、打仗，没自动查账');
    // 推演要列 lookup；写正文、记账的材料里有查到的账
    const ri = rulingInput(s, '叫吕珍带兵去打常州'); if (!/"lookup"/.test(ri)) bad.push('推演没让列要查的账');
    const si = JSON.stringify(storyInput(s, '叫吕珍带兵去打常州', '', '', '', { steps: [], lookTxt: L2 })); if (!si.includes('账上查到的')) bad.push('写正文的材料里没有查到的账');
    if (!ledgerInput(s, '叫吕珍带兵去打常州', '正文', '', '', { steps: [], lookTxt: L2 }).includes('账上查到的')) bad.push('记账的材料里没有查到的账');
    // 军务页：新军令、科技都摆出来
    { const h = armyTab(s); for (const w of ['分兵另立', '换将', '拨粮', '并入', '科技', 'data-tech="', 'bTechInv']) if (!h.includes(w) && !(w === '并入' && s.forces.length < 2)) bad.push('军务页没有「' + w + '」'); }
    // 分立年代写戏的政权照内置史料
    const s3 = newSave({ name: '冯道', gender: '男', age: 53, role: '后唐宰相', real: true, gregorianYear: 934, month: 6, day: 1, place: '洛阳', polity: '后唐' }); const rb = regimeBlock(s3); if (!/吴越/.test(rb) || !/后蜀/.test(rb)) bad.push('写戏材料里五代十国的政权不全：' + rb.slice(0, 200));
    return bad;
  });
  for (const x of out) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
