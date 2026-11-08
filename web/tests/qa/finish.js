// 各条尾项补完（需求台账 R-153、R-154、R-155、R-157、R-149；2026-11-08 玩家：「没做好的，没完善的，自己想想，全部做完了给三个版本发出来」）
// 移驻绕开敌军把守的关、敌军出来截路、对岸有敌军抢渡是水战、粮队被劫；皇子夺嫡输了的下场、世子请封袭爵（清降一等、明不降）、真人宗室照史料定处境；
// 公主和亲、下嫁、入道；女子说亲、应选入宫（接上宫中位分）、出家；官员外放内调；读书人殿试中进士授官，全真点
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof transferAct === 'function');
  const bad = [], ev = f => p.evaluate(f), txt = () => ev(() => document.body.innerText), click = async (sel, what) => { const el = await p.$(sel); if (!el) { bad.push('没有「' + what + '」按钮'); return false; } await p.click(sel); await p.waitForFunction(() => !PARLEY_P, null, { timeout: 20000 }); await p.waitForTimeout(100); return true; };
  const mk = (o) => p.evaluate(o => { S = newSave({ name: o.name, gender: o.g || '男', age: o.age || 30, role: o.role, real: !!o.real, gregorianYear: o.y, month: 3, day: 1, place: o.place, polity: o.pol }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3;
    S.money = { cash: 3000, unit: '两' }; S.econ = { unit: '两', wage: 0.1, rice: 1 }; S.household = o.H || []; window.REPLY = o.reply || null; window.callClaude = async () => ({ text: JSON.stringify(window.REPLY || {}) }); VIEW = 'game'; TAB = o.tab || 'board'; SIDE_FOLD = false; render(); }, o);
  // 一、移驻绕开把守的关；敌军出来截路
  await mk({ name: '李世民', role: '皇帝', real: true, y: 630, place: '长安', pol: '唐' });
  { const r = await ev(() => { S.forces = [{ name: '左卫军', owner: '你', troops: 3000, at: '长安', status: '驻扎', morale: 70 }, { name: '郑军', owner: '郑', troops: 40000, at: '潼关', foe: true, status: '驻守' }]; S.campaigns = []; armyAct(S, 'march', { force: '左卫军', target: '洛阳', mode: '守' }); S.turn++; const n = campaignTick(S, 0); const c = S.campaigns[0]; return { n: n.join('；'), g: c.route && c.route.gates, pts: c.route && c.route.pts.map(x => x.n).filter(Boolean) }; });
    if (/避开郑军/.test(r.n)) { if (r.g.includes('潼关')) bad.push('说绕开了，路线还过潼关：' + JSON.stringify(r)); } else if (!r.g || !r.g.includes('潼关')) bad.push('没绕也没走潼关：' + JSON.stringify(r)); }
  { const r = await ev(() => { S.forces = [{ name: '左卫军', owner: '你', troops: 3000, at: '长安', status: '驻扎', morale: 70 }]; for (const [i, at] of ['虢州', '同州', '蒲州', '商州', '华州'].entries()) S.forces.push({ name: '郑军' + i, owner: '郑', troops: 2000, at, foe: true, status: '驻守' }); S.campaigns = []; armyAct(S, 'march', { force: '左卫军', target: '洛阳', mode: '攻' }); S.turn++; campaignTick(S, 0); let n = []; for (let k = 0; k < 4; k++) n = n.concat(campaignTick(S, 2)); return { n: n.join('；'), m: S.forces.filter(g => g.march).map(g => g.name + '→' + g.march.to) }; });
    if (!/出动/.test(r.n) && !r.m.length) bad.push('路旁五支敌军一支都没出来截路：' + r.n.slice(0, 200)); }
  // 二、对岸有敌军：抢渡是一场水战
  { const r = await ev(() => { S = newSave({ name: '韩世忠', gender: '男', age: 40, role: '浙西制置使', real: false, gregorianYear: 1129, month: 3, day: 1, place: '扬州', polity: '宋' }); S.forces = [{ name: '韩家军', owner: '你', leader: '韩世忠', troops: 1000, at: '扬州', status: '驻扎', morale: 70 }, { name: '金军', owner: '金', troops: 20000, at: '润州', foe: true, status: '驻守' }]; S.campaigns = []; armyAct(S, 'march', { force: '韩家军', target: '润州', mode: '攻' }); S.turn++; campaignTick(S, 0); let n = []; for (let k = 0; k < 4; k++) n = n.concat(campaignTick(S, 1)); return { n: n.join('；'), st: S.campaigns[0].state }; });
    if (!/抢渡长江/.test(r.n)) bad.push('对岸有金军，渡江没打水战：' + r.n.slice(0, 300)); }
  // 三、粮队被劫
  { const r = await ev(() => { S = newSave({ name: '李世民', gender: '男', age: 30, role: '皇帝', real: true, gregorianYear: 630, month: 6, day: 1, place: '长安', polity: '唐' }); S.realm = { capital: '长安', granary: 9000000, treasury: 1 }; S.prices = [{ item: '米', price: 0.5, per: '石' }];
      S.forces = [{ name: '剑南军', owner: '你', troops: 8000, at: '成都', status: '驻扎', morale: 70, grain: 0 }, { name: '蜀中乱兵', owner: '乱兵', troops: 3000, at: '绵州', foe: true, status: '驻守' }]; let n = []; for (let k = 0; k < 12 && !/劫/.test(n.join()); k++) { S.clock = { ...S.clock, m: S.clock.m === 12 ? 1 : S.clock.m + 1, y: S.clock.m === 12 ? S.clock.y + 1 : S.clock.y }; delete S.forces[0].sup; n = n.concat(armyMonthly(S, 1)); } return n.join('；'); });
    if (!/粮队.*劫/.test(r)) bad.push('一年里运往成都的粮队从没被路旁敌军劫过：' + r.slice(0, 200)); }
  // 四、皇子夺嫡输了；真人宗室照史料
  await mk({ name: '允祉', role: '皇三子', y: 1712, place: '北京', pol: '清', H: [{ relation: '兄', name: '胤礽', age: 38 }] });
  { const r = await ev(() => { const R = royalOf(S); royalRivals(S); R.rivals[0].power = 95; R.faction = 10; R.suspect = 60; R.ym = null; const o = royalMonthly(S); R.ym = null; const o2 = royalMonthly(S); render(); return { o: o.concat(o2).join('；'), lost: R.lostTo, role: S.protagonist.role, lock: R.lockTill }; });
    if (r.lost !== '胤礽' || !/圈禁/.test(r.o + r.role)) bad.push('对头立了太子、猜忌六十，没落得清朝圈禁的下场：' + JSON.stringify(r)); }
  await mk({ name: '胤禛', role: '皇四子', real: true, y: 1712, place: '北京', pol: '清', reply: { favor: '中', faction: '低', suspect: '中', why: '史载其时不甚得宠' } });
  await p.waitForFunction(() => S.royal && !S.royal.histPending, null, { timeout: 10000 }).catch(() => bad.push('真人皇子没照史料定处境'));
  { const r = await ev(() => S.royal); if (r && (r.faction !== 15 || !/史载/.test(r.histWhy || ''))) bad.push('照史料定的处境没落账：' + JSON.stringify({ f: r.faction, w: r.histWhy })); }
  // 五、袭爵：清宗室降一等、明勋贵不降
  await mk({ name: '允禄', role: '庄亲王世子', y: 1740, place: '北京', pol: '清', H: [{ relation: '父', name: '博果铎', dead: true }] });
  if (await click('[data-royal="inherit"]', '请封袭爵（清）')) { const r = await ev(() => S.protagonist.role); if (r !== '庄郡王') bad.push('清宗室袭爵没降一等：' + r); }
  await mk({ name: '徐增寿', role: '定国公世子', y: 1420, place: '南京', pol: '明', H: [{ relation: '父', name: '徐达', dead: true }] });
  if (await click('[data-royal="inherit"]', '请封袭爵（明）')) { const r = await ev(() => S.protagonist.role); if (r !== '定国公') bad.push('明勋贵袭爵变了等：' + r); }
  // 六、公主和亲、下嫁、入道
  await mk({ name: '李氏', g: '女', age: 16, role: '公主', y: 710, place: '长安', pol: '唐' }); await ev(() => { S.powers = [{ name: '吐蕃', leader: '', stance: '冷' }]; S.diplo = { 吐蕃: { att: -20, ties: [] } }; render(); });
  if (await click('[data-flife="heqin"]', '奉诏和亲')) { const r = await ev(() => ({ role: S.protagonist.role, att: S.diplo.吐蕃.att })); if (!/和亲公主（嫁吐蕃）/.test(r.role) || !(r.att > 0)) bad.push('和亲没成、两国关系没好转：' + JSON.stringify(r)); }
  await mk({ name: '李氏', g: '女', age: 16, role: '公主', y: 710, place: '长安', pol: '唐' }); await ev(() => { REPLY = { name: '张承业', family: '功臣之后', why: '门第相当' }; });
  if (await click('[data-flife="royalmarry"]', '下嫁勋贵')) { const r = await ev(() => ({ role: S.protagonist.role, h: S.household.map(m => m.relation + m.name) })); if (!/下嫁张承业/.test(r.role) || !r.h.includes('夫张承业')) bad.push('下嫁没成：' + JSON.stringify(r)); }
  await mk({ name: '李氏', g: '女', age: 16, role: '公主', y: 710, place: '长安', pol: '唐' });
  if (await click('[data-flife="dao"]', '入道做女冠')) { const r = await ev(() => S.protagonist.role); if (!/女冠/.test(r)) bad.push('公主入道没成：' + r); }
  // 七、女子说亲、入宫、出家
  await mk({ name: '沈宜修', g: '女', age: 16, role: '绣娘', y: 1757, place: '苏州', pol: '清' }); await ev(() => { REPLY = { name: '叶绍袁', family: '吴江读书人家', why: '两家门第相当' }; });
  if (await click('[data-flife="marry"]', '托媒说亲')) { const r = await ev(() => ({ role: S.protagonist.role, h: S.household.map(m => m.relation + m.name) })); if (!r.h.includes('夫叶绍袁') || !/叶家媳妇/.test(r.role)) bad.push('说亲没成：' + JSON.stringify(r)); }
  await mk({ name: '沈宜修', g: '女', age: 16, role: '绣娘', y: 1757, place: '苏州', pol: '清' });
  if (await click('[data-flife="palace"]', '应选秀入宫')) { const r = await ev(() => ({ role: S.protagonist.role, c: isConsort(S) })); if (r.role !== '答应' || !r.c) bad.push('应选秀入宫没接上宫中位分：' + JSON.stringify(r)); if (!(await p.$('[data-fem="serve"]'))) bad.push('入宫后没有侍奉圣驾'); }
  await mk({ name: '沈宜修', g: '女', age: 16, role: '绣娘', y: 1757, place: '苏州', pol: '清' });
  if (await click('[data-flife="fo"]', '剃度为尼')) { const r = await ev(() => ({ role: S.protagonist.role, c: S.money.cash })); if (r.role !== '比丘尼' || !(r.c < 3000)) bad.push('出家没成：' + JSON.stringify(r)); }
  // 八、外放内调
  await mk({ name: '郑燮', role: '潍县知县', y: 1748, place: '潍县', pol: '清', tab: 'career' }); await ev(() => { S.career = { office: '潍县知县', rank: '正七品' }; offOf(S).kc = 100; render(); });
  { let ok = false; for (let k = 0; k < 6 && !ok; k++) { await click('[data-tfr="in"]', '请求内调'); ok = await ev(() => /主事|郎中|员外郎/.test(S.career.office)); if (!ok) await ev(() => { offOf(S).tfY = null; S.clock = { ...S.clock, y: S.clock.y + 1 }; render(); }); }
    if (!ok) bad.push('考成满分的知县请了六年内调都没准'); else if (!(await ev(() => arr(S.careerLog).some(x => x.what === '内调')))) bad.push('内调没记进履历'); }
  // 九、读书人殿试中进士授官
  { const r = await ev(() => { S = newSave({ name: '吴敬梓', gender: '男', age: 30, role: '贡士', real: false, gregorianYear: 1757, month: 4, day: 1, place: '北京', polity: '清' }); S.skills = { 文墨: { lv: 90, xp: 0 } }; const E = examOf(S); E.lv = '贡士'; E.pending = { name: '殿试', to: '进士', ym: Math.floor(ymOf(S.clock)), at: '京师' }; const o = examMonthly(S); return { o: o.join('；'), lv: E.lv, off: (S.career || {}).office, log: arr(S.careerLog).length }; });
    if (r.lv !== '进士' || !r.off || !r.log) bad.push('殿试中了进士没授官：' + JSON.stringify(r)); }
  const html = await txt(); for (const w of ['undefined', 'NaN']) if (html.includes(w)) bad.push('页面上出现 ' + w);
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
