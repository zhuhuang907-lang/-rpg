// 草根线（需求台账 R-147；2026-11-07 玩家：「骑马与砍杀的一分系统……山大王、流民帅、普通百姓……从草根崛起」）
// 全真点：拉起一队人、招人（看户口人缘、带人上限）、操练（一月一回）、升兵种（阅历够才行、骑兵要马）、买粮、每月发饷吃粮欠了就逃；
// 路上遇事（行军中照治安恶名遇流寇官军商队乡勇难民、遇事时停步）：打（缴获俘虏）、跑、放过/收留、当面说（假 AI 判）；俘虏收编卖放；
// 村里帮工勒索洗劫（人缘恶名）；酒肆寻好汉（假 AI 出人）、请入伙、忠心掉光就走；打听差事（假 AI）、接下、到了地方送信办成、剿匪打赢办成；山大王当面说招安
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof partyStart === 'function');
  const bad = [], ev = f => p.evaluate(f), click = async (sel, what) => { const el = await p.$(sel); if (!el) { bad.push('没有「' + what + '」按钮'); return false; } await p.click(sel); await p.waitForFunction(() => !PARLEY_P, null, { timeout: 10000 }); await p.waitForTimeout(120); return true; };
  await ev(() => {
    S = newSave({ name: '黄巢', gender: '男', age: 30, role: '贩私盐的', real: false, gregorianYear: 874, month: 3, day: 1, place: '曹州', polity: '唐' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 2;
    S.money = { cash: 300, unit: '贯' }; S.econ = { unit: '贯', rice: 0.5, wage: 0.1, caravan: 200, protect: 15, pay: 1.5, ransom: 100 }; S.popEst = { k: popKey(S), m: { 曹州: { pop: 300000 }, 濮州: { pop: 200000 } } };
    window.REPLY = null; window.callClaude = async () => ({ text: JSON.stringify(REPLY) });
    VIEW = 'game'; TAB = 'board'; SIDE_FOLD = false; render(); });
  if (!(await ev(() => canParty(S)))) bad.push('贩私盐的平民不能拉队伍');
  // 拉起一队人
  if (await click('[data-ptx="start"]', '拉起一队人')) { const r = await ev(() => { const f = partyF(S); return f && { t: f.party.tiers, cash: S.money.cash }; }); if (!r || r.t['乡勇'] !== 10 || !(r.cash < 300)) bad.push('拉起一队人没成或没花钱：' + JSON.stringify(r)); }
  // 招人
  await p.fill('#ptN', '20'); if (await click('[data-ptx="recruit"]', '招人')) { const r = await ev(() => partyF(S).party.tiers['乡勇']); if (r !== 30) bad.push('招了二十人，乡勇不是三十：' + r); }
  await p.fill('#ptN', '200'); await click('[data-ptx="recruit"]', '招人'); { const r = await ev(() => ({ n: ptMen(partyF(S).party), cap: ptCap(S, partyF(S).party), msg: ORGMSG })); if (r.n > r.cap) bad.push('招人超过了带人上限：' + JSON.stringify(r)); }
  // 操练、升兵种
  if (await click('[data-ptx="train"]', '操练')) { const r = await ev(() => partyF(S).party.xp['乡勇']); if (r !== 25) bad.push('操练了阅历没涨：' + r); }
  await click('[data-ptx="train"]', '操练'); if ((await ev(() => partyF(S).party.xp['乡勇'])) !== 25) bad.push('一个月操练了两回');
  await ev(() => { partyF(S).party.xp['乡勇'] = 40; render(); }); await p.fill('#ptUpN', '5'); await click('[data-ptup="乡勇"][data-to="刀手"]', '乡勇升刀手'); if ((await ev(() => partyF(S).party.tiers['刀手'] || 0))) bad.push('阅历不够也升了兵种');
  await ev(() => { partyF(S).party.xp['乡勇'] = 70; render(); }); await p.fill('#ptUpN', '5'); await click('[data-ptup="乡勇"][data-to="刀手"]', '乡勇升刀手'); { const r = await ev(() => partyF(S).party.tiers); if (r['刀手'] !== 5) bad.push('阅历够了升刀手没成：' + JSON.stringify(r)); }
  // 买粮
  await p.fill('#ptFoodN', '50'); if (await click('[data-ptx="food"]', '买粮')) { const r = await ev(() => partyF(S).grain); if (!(r >= 50)) bad.push('买粮没进粮：' + r); }
  // 遇事：打（缴获、俘虏）、俘虏收编
  await ev(() => { S.enc = { kind: '流寇', n: 8, place: '曹州', ym: 1, q: '弱' }; render(); });
  if (await click('[data-enc="fight"]', '打')) { const r = await ev(() => ({ e: S.enc, pris: partyF(S).party.pris, b: arr(S.battles).length, cash: S.money.cash })); if (r.e || !r.b) bad.push('遇流寇点了打没打：' + JSON.stringify(r)); }
  await ev(() => { partyF(S).party.pris = 6; render(); }); { const n0 = await ev(() => ptMen(partyF(S).party)); if (await click('[data-ptpris="收编"]', '收编俘虏')) { const n1 = await ev(() => ({ n: ptMen(partyF(S).party), p: partyF(S).party.pris })); if (n1.p || !(n1.n > n0)) bad.push('收编俘虏没进队伍：' + JSON.stringify(n1)); } }
  await ev(() => { partyF(S).party.pris = 4; render(); }); { const c0 = await ev(() => S.money.cash); if (await click('[data-ptpris="卖"]', '卖俘虏')) { if (!((await ev(() => S.money.cash)) > c0)) bad.push('卖俘虏没进钱'); } }
  // 难民收留、跑、当面说
  await ev(() => { S.renown = 40; S.enc = { kind: '难民', n: 6, place: '曹州', ym: 1, q: '弱' }; render(); });   // 名望涨了才带得动更多人 { const n0 = await ev(() => ptMen(partyF(S).party)); if (await click('[data-enc="let"]', '收留难民')) { if (!((await ev(() => ptMen(partyF(S).party))) > n0)) bad.push('收留难民没进人'); } }
  await ev(() => { S.enc = { kind: '官军', n: 300, place: '曹州', ym: 1, q: '中' }; render(); }); if (await click('[data-enc="flee"]', '跑')) { if (await ev(() => !!S.enc)) bad.push('点了跑，遇事还挂着'); }
  await ev(() => { S.enc = { kind: '流寇', n: 5, place: '曹州', ym: 1, q: '弱' }; REPLY = { verdict: '允', reply: '久闻大名，愿随哥哥。', why: '投靠' }; render(); });
  { const n0 = await ev(() => ptMen(partyF(S).party)); await ev(() => { document.querySelector('[data-psay^="enc:"]').closest('details').open = true; }); await p.fill('[data-psay^="enc:"]', '我等皆是被官府逼得没活路的人，不如合兵一处，同闯天下。'); if (await click('[data-enc="talk"]', '当面说')) { const r = await ev(() => ({ n: ptMen(partyF(S).party), e: S.enc })); if (r.e || !(r.n > n0)) bad.push('当面说动流寇入伙没成：' + JSON.stringify(r)); } }
  // 村里：帮工、勒索、洗劫
  if (await click('[data-ptvil="帮工"]', '帮工')) { if (!((await ev(() => vilOf(S, '曹州').rel)) > 0)) bad.push('帮村里干活人缘没涨'); }
  await ev(() => { vilOf(S, '曹州').actYM = null; render(); }); { const h0 = await ev(() => num(bandOf(S).heat) || 0); if (await click('[data-ptvil="劫村"]', '洗劫')) { const r = await ev(() => ({ rel: vilOf(S, '曹州').rel, h: bandOf(S).heat })); if (!(r.rel < 0) || !(r.h > h0)) bad.push('洗劫村子人缘没坏、恶名没涨：' + JSON.stringify(r)); } }
  // 寻好汉、请入伙
  await ev(() => { REPLY = { heroes: [{ name: '尚让', from: '曹州盐贩', wu: 7, tong: 6, mou: 4, yi: 1, temper: '豪爽', wish: '出人头地' }] }; S.money.cash = 500; render(); });
  if (await click('[data-ptx="seek"]', '去酒肆寻好汉')) { if (!(await ev(() => arr(partyF(S).party.cands).length))) bad.push('寻好汉没打听到人'); }
  if (await click('[data-pthire="尚让"]', '请入伙')) { const r = await ev(() => ({ h: arr(partyF(S).party.heroes).map(h => h.name), cap: ptCap(S, partyF(S).party) })); if (!r.h.includes('尚让')) bad.push('请好汉入伙没成：' + JSON.stringify(r)); }
  // 差事：打听、接下、送信到了办成
  await ev(() => { REPLY = { quests: [{ type: '送信', giver: '王乡老', target: '濮州', why: '儿子在濮州做工，家里有急事' }] }; render(); });
  if (await click('[data-ptx="quest"]', '打听差事')) { if (!(await ev(() => arr(S.ptQuests).length))) bad.push('打听差事没打听到'); }
  { const id = await ev(() => (arr(S.ptQuests)[0] || {}).id); if (id && await click(`[data-ptq="${id}"]`, '接下差事')) { const r = await ev(() => { const f = partyF(S); const c0 = S.money.cash; const out = ptArrive(S, f, '濮州'); return { out, st: S.ptQuests[0].state, got: S.money.cash > c0 }; }); if (r.st !== '办成' || !r.got) bad.push('送信到了地方差事没办成：' + JSON.stringify(r)); } }
  // 行军路上遇事、停步
  { const r = await ev(() => { const f = partyF(S); S.enc = null; S.campaigns = [{ force: f.name, mode: '守', target: '汴州', from: '曹州', li: 2000, pace: 30, state: '行军', done: 0, turn: S.turn - 1 }]; let got = false; for (let i = 0; i < 12 && !got; i++) { campaignTick(S, 10); got = !!S.enc; } const d1 = S.campaigns[0].done; campaignTick(S, 10); return { got, paused: S.campaigns[0].done === d1 }; });
    if (!r.got) bad.push('走了一百二十天路一回事都没遇上'); else if (!r.paused) bad.push('路上遇事没了结，队伍照走'); }
  // 每月：发不出饷就逃；头领忠心掉光就走
  { const r = await ev(() => { const f = partyF(S); S.enc = null; S.money.cash = 0; f.party.heroes[0].loyal = 5; const n0 = ptMen(f.party); S.clock.m = (S.clock.m % 12) + 1; const out = partyMonthly(S); return { n0, n1: ptMen(f.party), h: f.party.heroes.length, out }; });
    if (!(r.n1 < r.n0)) bad.push('发不出饷没人跑：' + JSON.stringify(r)); if (r.h) bad.push('头领忠心掉光了还没走'); }
  // 占山立寨、修寨、每月出息；恶名到了官府派兵追，走到了真打
  await ev(() => { const f = partyF(S); f.party.tiers['乡勇'] = 60; f.troops = ptMen(f.party); S.renown = 60; S.money.cash = 5000; S.enc = null; S.campaigns = []; f.at = '曹州'; render(); });
  if (await click('[data-base="found"]', '占山立寨')) { const r = await ev(() => ({ b: S.base, org: orgsLive(S).some(o => /山寨/.test(o.kind)) })); if (!r.b || !r.org) bad.push('占山立寨没立成：' + JSON.stringify(r)); }
  { const c0 = await ev(() => S.money.cash); if (await click('[data-base="粮仓"]', '修粮仓')) { const r = await ev(() => ({ lv: S.base.lv['粮仓'], c: S.money.cash })); if (r.lv !== 1 || !(r.c < c0)) bad.push('修粮仓没修成或没花钱：' + JSON.stringify(r)); } }
  { const r = await ev(() => { const f = partyF(S), g0 = N0(f.grain) || 0; S.clock.m = (S.clock.m % 12) + 1; baseMonthly(S); return { g0, g1: f.grain }; }); if (!(r.g1 > r.g0)) bad.push('有粮仓，每月没囤粮：' + JSON.stringify(r)); }
  { const r = await ev(() => { bandOf(S).heat = 25; S.huntYM = null; const out = huntMonthly(S); const H = S.forces.find(g => g.hunt); const b0 = arr(S.battles).length; for (let i = 0; i < 8 && arr(S.battles).length === b0; i++) campaignTick(S, 10); return { out, H: !!H, b: arr(S.battles).length - b0 }; });
    if (!r.H) bad.push('恶名到了二十五，官府没派兵追：' + JSON.stringify(r.out)); else if (!r.b) bad.push('追剿的官军走到了没打'); }
  // 扯旗称王：有山寨、打下县城、人到一千
  await ev(() => { const f = partyF(S); f.party.tiers['乡勇'] = 1200; f.troops = ptMen(f.party); S.territory = [{ place: '濮州', troops: 100 }]; S.forces = S.forces.filter(g => !g.hunt); S.enc = null; render(); });
  await p.fill('#crownName', '齐'); if (await click('[data-crown]', '扯旗称王')) { const r = await ev(() => ({ ruler: isRuler(S), pol: S.place.polity, role: S.protagonist.role, war: arr(S.wars).map(w => w.with) })); if (!r.ruler || r.pol !== '齐' || !r.war.includes('唐')) bad.push('扯旗称王没成一方之主、或原朝廷没开战：' + JSON.stringify(r)); }
  // 山大王：当面说招安
  await ev(() => { S.protagonist.role = '山大王'; S.place.polity = '唐'; S.idm = ''; S.wars = []; S.base = null; S.forces = [{ name: '山寨弟兄', leader: S.protagonist.name, owner: '你', troops: 300, at: '曹州', status: '驻守' }]; REPLY = { verdict: '允', reply: '朝廷念你等本是良民，许以自新。', why: '剿之费力' }; render(); });
  { const has = await ev(() => !!document.querySelector('[data-psay="amnesty:官府"]')); if (!has) bad.push('山大王没有「托人向官府说招安」的框（身份：' + (await ev(() => myDomain(S).kind)) + '）'); else {
    await ev(() => { document.querySelector('[data-psay="amnesty:官府"]').closest('details').open = true; }); await p.fill('[data-psay="amnesty:官府"]', '我等聚啸山林，实因饥寒所迫，若蒙朝廷开恩，愿为国家守土。'); await click('[data-parley="amnesty"]', '说招安'); if (!(await ev(() => !!bandOf(S).offer))) bad.push('说动官府招安，没有招安的回话'); } }
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
