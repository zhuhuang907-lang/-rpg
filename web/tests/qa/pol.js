// 政治（需求台账 R-146 第四期，十字军之王式）：议事会挑人派差（真点）每月照本事落到国势、对你怨恨的打折；封臣契约（真点）定重了进项多他更不满、太重叛离；
// 派系势大怨深递最后通牒（答应、收买、拒绝起兵、当面说服，全真点）；律法（王权、继承法，真点）要威望、一年一回、王权强进项多派系怨气涨
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof councilSet === 'function');
  const bad = [], ev = (f, a) => p.evaluate(f, a), click = async (sel, what) => { const el = await p.$(sel); if (!el) { bad.push('没有「' + what + '」按钮'); return false; } await p.click(sel); await p.waitForFunction(() => !PARLEY_P, null, { timeout: 10000 }); await p.waitForTimeout(120); return true; };
  const setup = () => ev(() => {
    S = newSave({ name: '王审知', gender: '男', age: 59, role: '闽王', real: true, gregorianYear: 921, month: 6, day: 1, place: '福州', polity: '闽' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3; S.renown = 60;
    S.realm = { treasury: 500000 }; S.fisc = { kind: 'realm', unit: '贯', base: { tianfu: 600000, shang: 200000 }, pol: { tax: '常', yan: '照旧', coin: '足值', cp: false, yao: '常' }, works: [], kc: { due: 0, paid: 0 }, price: 100 }; S.money = { cash: 0, unit: '贯' };
    S.gov = { scope: 'realm', stats: { 民心: 50, 腐败: 40, 治安: 50, 积案: 30 }, keys: ['民心', '腐败', '治安', '积案'] };
    S.org = { nodes: [{ id: 'root', name: '闽', depth: 0, posts: [] }, { id: 'n1', name: '节度使府', depth: 1, parent: 'root', posts: [{ title: '判官', holder: '黄滔' }, { title: '都押衙', holder: '王延禀' }, { title: '掌书记', holder: '徐寅' }] }] };
    S.people = { 黄滔: { favor: 20, stats: { 理政: { v: 80 } } }, 王延禀: { favor: 0, stats: { 统兵: { v: 70 } } }, 徐寅: { favor: -50, stats: { 理政: { v: 80 } } } };
    S.factions = [{ name: '宗室派', leader: '王延禀', members: '王延禀、徐寅', grudge: 8 }, { name: '文臣派', leader: '黄滔', members: '黄滔', grudge: 0 }];
    S.forces = [{ name: '威武军', leader: '王审知', owner: '你', troops: 20000, at: '福州', status: '驻守', train: 50, morale: 60 }];
    S.powers = [{ name: '吴越', leader: '钱镠', seat: '杭州', troops: '40000', stance: '臣' }]; dipOf(S, '吴越').ties = ['臣属']; dipOf(S, '吴越').att = 20;
    window.REPLY = { verdict: '允', reply: '大王既如此说，臣等不敢再争。', why: '惧兵威' }; window.callClaude = async () => ({ text: JSON.stringify(REPLY) });
    VIEW = 'game'; TAB = 'court'; SIDE_FOLD = false; render(); });
  await setup();
  // 中枢差遣：照人事树，宰辅（节度判官黄滔）安抚民心
  await p.selectOption('[data-ctask="宰辅"]', '安抚民心');
  if (await click('[data-council="宰辅"]', '派宰辅差遣')) { const r = await ev(() => ({ c: S.council['宰辅'], h: seatHolder(S, '宰辅') })); if (!r.c || r.c.task !== '安抚民心' || r.h.who !== '黄滔') bad.push('中枢差遣没照人事树找到宰辅、或差遣没记上：' + JSON.stringify(r)); }
  { const t = await ev(() => document.querySelector('.side .pane').innerText); if (/议事会|最后通牒|封臣|国债/.test(t)) bad.push('朝局页还有不合中国制度的说法'); }
  { const r = await ev(() => { const m0 = S.gov.stats['民心']; S.clock.m++; councilMonthly(S); return { m0, m1: S.gov.stats['民心'] }; }); if (!(r.m1 > r.m0)) bad.push('宰辅黄滔（理政八十）安抚民心，民心没涨：' + JSON.stringify(r)); }
  // 对你怨恨的人办事打折：同样的本事，徐寅（怨恨）不如黄滔
  { const r = await ev(() => { S.council = { 宰辅: { who: '徐寅', task: '安抚民心' } }; const m0 = S.gov.stats['民心']; S.clock.m++; councilMonthly(S); const d1 = S.gov.stats['民心'] - m0; S.council = { 宰辅: { who: '黄滔', task: '安抚民心' } }; const m1 = S.gov.stats['民心']; S.clock.m++; councilMonthly(S); return { xu: d1, huang: S.gov.stats['民心'] - m1 }; }); if (!(r.xu < r.huang)) bad.push('对你怨恨的人办事没打折：' + JSON.stringify(r)); }
  // 封臣契约：定重 → 进项多、他不满；太重叛离
  await ev(() => render());
  { const a0 = await ev(() => dipOf(S, '吴越').att); if (await click('[data-contract="吴越"][data-k="重"]', '改重')) { const r = await ev(() => ({ c: dipOf(S, '吴越').contract, a: dipOf(S, '吴越').att })); if (r.c !== '重' || !(r.a < a0)) bad.push('封臣契约改重没生效或他没不满：' + JSON.stringify(r)); } }
  { const r = await ev(() => { dipOf(S, '吴越').att = -59; S.clock.m++; const out = contractMonthly(S); return { out, w: !!warOf(S, '吴越') }; }); if (!r.w) bad.push('重赋之下臣属不满到头没叛离：' + JSON.stringify(r.out)); }
  // 派系逼宫：答应
  await setup(); { const r = await ev(() => { S.clock.m++; return factionMonthly(S); }); if (!(await ev(() => !!S.ultimatum))) bad.push('派系势大怨深没递最后通牒：' + JSON.stringify(r)); }
  await ev(() => render()); if (await click('[data-ult="答应"]', '答应通牒')) { const r = await ev(() => ({ u: S.ultimatum, g: S.factions[0].grudge })); if (r.u || r.g) bad.push('答应了通牒还挂着或派系怨气没消：' + JSON.stringify(r)); }
  // 收买
  await setup(); await ev(() => { S.clock.m++; factionMonthly(S); render(); }); { const t0 = await ev(() => S.realm.treasury); if (await click('[data-ult="收买"]', '收买')) { const r = await ev(() => ({ u: !!S.ultimatum, t: S.realm.treasury })); if (r.u || !(r.t < t0)) bad.push('收买没收回通牒或没花钱：' + JSON.stringify(r)); } }
  // 拒绝 → 起兵
  await setup(); await ev(() => { S.clock.m++; factionMonthly(S); render(); }); if (await click('[data-ult="拒绝"]', '拒绝')) { const r = await ev(() => ({ w: arr(S.wars).map(w => w.with), f: foeArmies(S).map(g => g.name) })); if (!r.w.some(x => /叛军/.test(x)) || !r.f.length) bad.push('拒绝通牒没起兵作乱：' + JSON.stringify(r)); }
  // 当面说服
  await setup(); await ev(() => { S.clock.m++; factionMonthly(S); render(); document.querySelector('[data-psay^="faction:"]').closest('details').open = true; });
  await p.fill('[data-psay^="faction:"]', '叔父与孤同出一门，闽国基业是我王家的基业，若兵戎相见，徒令吴越、南汉渔利。'); if (await click('[data-parley="faction"]', '当面说服')) { if (await ev(() => !!S.ultimatum)) bad.push('当面说服成了，通牒还挂着'); }
  // 律法：王权加强 → 进项多、派系怨气涨；一年一回；威望不够改不了
  await setup(); { const r0 = await ev(() => ({ g: S.factions[0].grudge, ren: S.renown })); if (await click('[data-law="crown"][data-v="up"]', '王权加强')) { const r = await ev(() => ({ c: lawsOf(S).crown, g: S.factions[0].grudge, ren: S.renown })); if (r.c !== 3 || !(r.g > r0.g) || !(r.ren < r0.ren)) bad.push('王权加强没生效、派系没怨、没花威望：' + JSON.stringify(r)); } }
  await click('[data-law="succ"]', '改继承法'); if ((await ev(() => lawsOf(S).succ)) !== '嫡长') bad.push('一年里改了两回律法');
  { const r = await ev(() => { const F = S.fisc; F.ym = null; S.clock.m = 6; lawsOf(S).crown = 3; fiscalMonthly(S); const a = F.last.R['田赋']; F.ym = null; lawsOf(S).crown = 2; fiscalMonthly(S); return { strong: a, mid: F.last.R['田赋'] }; }); if (!(r.strong > r.mid)) bad.push('王权强了田赋没多：' + JSON.stringify(r)); }
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
