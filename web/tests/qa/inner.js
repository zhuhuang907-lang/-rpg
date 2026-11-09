// 继承法（R-164）与内廷宦官外戚（R-165），全真点：
// 继承法有四种（立嫡立长、择贤而立、兄终弟及、宗亲推举），改了真影响该谁承继、立嗣的后果、死后谁接位；中原王朝没有宗亲推举；
// 宦官外戚势按月涨落，坐大了吏治坏、国库被侵、来临门之事；抑、倚重都真点，一月一回
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof innerAct === 'function');
  const bad = [], ev = (f, a) => p.evaluate(f, a), click = async (sel, what) => { const el = await p.$(sel); if (!el) { bad.push('没有「' + what + '」按钮'); return false; } await p.click(sel); await p.waitForTimeout(150); return true; };
  const setup = (polity, role, name) => ev(([polity, role, name]) => {
    S = newSave({ name, gender: '男', age: 45, role, real: true, gregorianYear: 1230, month: 6, day: 1, place: '开封', polity }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3; S.renown = 80;
    S.realm = { treasury: 500000 }; S.fisc = { kind: 'realm', unit: '贯', base: { tianfu: 600000, shang: 200000 }, pol: { tax: '常', yan: '照旧', coin: '足值', cp: false, yao: '常' }, works: [], kc: { due: 0, paid: 0 }, price: 100 }; S.money = { cash: 0, unit: '贯' };
    S.gov = { scope: 'realm', stats: { 民心: 50, 腐败: 40, 治安: 50, 积案: 30 }, keys: ['民心', '腐败', '治安', '积案'] };
    S.household = [{ relation: '嫡长子', name: '长子甲', age: 20, favor: 10 }, { relation: '次子', name: '次子乙', age: 17, favor: 60 }, { relation: '弟', name: '御弟丙', age: 40, favor: 30 }, { relation: '妻', name: '皇后丁', age: 40, favor: 70 }];
    S.org = { nodes: [{ id: 'root', name: polity, depth: 0, posts: [] }, { id: 'n1', name: '内廷', depth: 1, parent: 'root', posts: [{ title: '掌印太监', holder: '刘瑾甲' }, { title: '中书令', holder: '耶律楚材' }] }] };
    S.factions = [{ name: '旧臣派', leader: '耶律楚材', members: '耶律楚材', grudge: 4 }];
    window.callClaude = async () => ({ text: '{}' }); VIEW = 'game'; TAB = 'court'; SIDE_FOLD = false; render(); }, [polity, role, name]);
  // 中原王朝：没有宗亲推举；改兄终弟及 → 该承继的成了御弟，嫡长子记怨
  await setup('宋', '皇帝', '赵某帝');
  if (await ev(() => !!document.querySelector('[data-law="succ"][data-v="选举"]'))) bad.push('中原王朝也能改宗室推举');
  { const r0 = await ev(() => ({ h: heirOf(S).name, f: arr(S.household).find(x => x.name === '长子甲').favor }));
    if (r0.h !== '长子甲') bad.push('立嫡立长时该承继的不是嫡长子：' + r0.h);
    if (await click('[data-law="succ"][data-v="兄终弟及"]', '改兄终弟及')) { const r = await ev(() => ({ L: lawsOf(S).succ, h: heirOf(S).name, f: arr(S.household).find(x => x.name === '长子甲').favor, t: document.querySelector('.side .pane').innerText })); if (r.L !== '兄终弟及' || r.h !== '御弟丙' || !(r.f < r0.f)) bad.push('改兄终弟及没让御弟承继、嫡长子没记怨：' + JSON.stringify({ L: r.L, h: r.h, f: r.f })); if (!/照此法该承继的：弟御弟丙/.test(r.t)) bad.push('朝局页没写照新法该谁承继'); } }
  // 主角死了，照继承法由御弟接位（不照记账写的人）
  { const r = await ev(() => { delete S.gov; const d = { reply: '帝崩于福宁殿。', mode: 'play', elapsedDays: 1, succession: { died: '是', heir: '长子甲', heirRole: '皇帝' } }; try { applyReply(S, d, '…'); } catch (e) { return 'err ' + e.message; } return S.protagonist.name; }); if (r !== '御弟丙') bad.push('兄终弟及之下主角死后接位的不是御弟：' + r); }
  // 择贤：越过嫡长子不掉名声
  await setup('宋', '皇帝', '赵某帝'); await ev(() => { lawsOf(S).succ = '择贤'; });
  { const r = await ev(() => { const r0 = S.renown; setHeir(S, '次子乙'); return { d: S.renown - r0, h: heirOf(S).name }; }); if (r.d !== 0 || r.h !== '次子乙') bad.push('择贤而立越过嫡长子还掉名声：' + JSON.stringify(r)); }
  await setup('宋', '皇帝', '赵某帝'); { const r = await ev(() => { const r0 = S.renown; setHeir(S, '次子乙'); return S.renown - r0; }); if (!(r < 0)) bad.push('立嫡立长之下越过嫡长子不掉名声'); }
  // 蒙古：宗亲推举 → 人望最高的承继
  await setup('蒙古', '大汗', '窝阔台');
  if (await click('[data-law="succ"][data-v="选举"]', '改宗室推举')) { const r = await ev(() => ({ L: lawsOf(S).succ, h: heirOf(S).name })); if (r.L !== '选举' || r.h !== '次子乙') bad.push('宗亲推举没照人望定承继：' + JSON.stringify(r)); }
  // 内廷：倚重宦官 → 派系怨气压下、宦官势涨；一月一回；抑外戚 → 势减、皇后怀恨
  await setup('宋', '皇帝', '赵某帝');
  { const r0 = await ev(() => ({ eu: innerOf(S).eu, g: S.factions[0].grudge }));
    if (!(await ev(() => /内廷：宦官与外戚/.test(document.querySelector('.side .pane').innerText)))) bad.push('朝局页没有内廷一栏');
    if (await click('[data-inner="eu"][data-how="yong"]', '倚重宦官')) { const r = await ev(() => ({ eu: innerOf(S).eu, g: S.factions[0].grudge, m: ORGMSG })); if (!(r.eu > r0.eu) || !(r.g < r0.g) || !/刘瑾甲/.test(r.m)) bad.push('倚重宦官没生效：' + JSON.stringify(r)); }
    await click('[data-inner="eu"][data-how="yi"]', '抑宦官'); if ((await ev(() => innerOf(S).eu)) !== r0.eu + 10) bad.push('一个月里处置宦官两回'); }
  { const r0 = await ev(() => ({ k: innerOf(S).kin, f: arr(S.household).find(x => x.name === '皇后丁').favor }));
    if (await click('[data-inner="kin"][data-how="yi"]', '抑外戚')) { const r = await ev(() => ({ k: innerOf(S).kin, f: arr(S.household).find(x => x.name === '皇后丁').favor })); if (!(r.k < r0.k) || !(r.f < r0.f)) bad.push('抑外戚没减势或皇后没怀恨：' + JSON.stringify(r)); } }
  // 按月：宠妃在、外戚坐大 → 国库被侵；八十以上来外戚专政的临门之事；宦官坐大 → 腐败涨
  { const r = await ev(() => { const I = innerOf(S); I.kin = 80; I.eu = 70; I.ym = null; const t0 = S.realm.treasury, c0 = S.gov.stats['腐败']; S.clock.m++; const out = innerMonthly(S); return { out, dt: S.realm.treasury - t0, dc: S.gov.stats['腐败'] - c0, pr: arr(S.press).filter(x => /外戚专政/.test(x.title)).length, again: (I.ym = null, S.clock.m++, innerMonthly(S), arr(S.press).filter(x => /外戚专政/.test(x.title)).length) }; });
    if (!(r.dt < 0) || !(r.dc > 0) || r.pr !== 1 || r.again !== 1) bad.push('内廷按月结算不对：' + JSON.stringify(r)); }
  // 法理宣称要凭据：丢给他的旧地才算旧疆；凭空的只能伪造谱牒，名声掉得多、对方记恨
  { const r = await ev(() => { S.powers = [{ name: '西夏', leader: '李元昊', seat: '兴庆府', stance: '敌' }, { name: '辽', leader: '耶律宗真', seat: '上京', stance: '和' }]; S.mapOwn = { 灵州: { from: '你', who: '西夏' } }; S.renown = 80; S.clock.y = 1040; render(); return !!document.querySelector('[data-claim="西夏"]'); });
    if (r) { await click('[data-claim="西夏"]', '登记对西夏的法理'); const a = await ev(() => ({ c: arr(S.claims).find(c => c.owner === '西夏'), r: S.renown }));
      const b0 = await ev(() => ({ r: S.renown, att: dipOf(S, '辽').att || 0 })); await click('[data-claim="辽"]', '登记对辽的法理'); const b2 = await ev(() => ({ c: arr(S.claims).find(c => c.owner === '辽'), r: S.renown, att: dipOf(S, '辽').att || 0 }));
      if (!a.c || !/旧疆/.test(a.c.basis)) bad.push('丢给西夏的灵州没算成旧疆法理：' + JSON.stringify(a));
      if (!b2.c || b2.c.basis !== '伪造谱牒' || !(b0.r - b2.r >= 8) || !(b2.att < b0.att)) bad.push('对辽凭空登记法理没当伪造谱牒处置：' + JSON.stringify({ b0, b2 }));
      if (!(await ev(() => warCBs(S, '辽').includes('法理')))) bad.push('登记了法理宣战没多「法理」名分'); }
    else bad.push('朝局页没有登记法理的按钮'); }
  // 诸子均分：主角死后家财照兄弟分
  { const r = await ev(() => { S = newSave({ name: '某汗', gender: '男', age: 60, role: '大汗', real: true, gregorianYear: 1230, month: 6, day: 1, place: '和林', polity: '蒙古' }); S.chat = [{ role: 'gm', text: '开场' }]; S.money = { cash: 9000, unit: '两' }; S.laws = { crown: 2, succ: '均分', ym: null };
      S.org = { nodes: [{ id: 'root', name: '蒙古', depth: 0, posts: [] }] }; S.household = [{ relation: '长子', name: '术赤甲', age: 30 }, { relation: '次子', name: '察合乙', age: 28 }, { relation: '三子', name: '窝阔丙', age: 25 }];
      applyReply(S, { reply: '汗崩。', mode: 'play', elapsedDays: 1, succession: { died: '是', heir: '术赤甲', heirRole: '大汗' } }, '…'); return { who: S.protagonist.name, cash: S.money.cash }; });
    if (r.who !== '术赤甲' || r.cash !== 3000) bad.push('诸子均分之下死后家财没照兄弟分：' + JSON.stringify(r)); }
  // 非君主没有内廷
  { const r = await ev(() => { S = newSave({ name: '海瑞', gender: '男', age: 50, role: '应天巡抚', real: true, gregorianYear: 1569, month: 6, day: 1, place: '苏州', polity: '明' }); return { m: innerMonthly(S), h: innerHtml(S) }; }); if (r.m.length || r.h) bad.push('不是君主也有内廷'); }
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
