// 身份转换照账接上（需求台账 R-153；2026-11-08 玩家：「其他的身份呢，身份的转换呢，我不知道为什么以前内容要反复的去做」）
// 连着真点：佃农→拉队伍→占山立寨→受招安做官（队伍编成官军营、山寨散、恶名清、草根和江湖的按钮收起、身份卡是官）→罢官（又能把旧部拉成队伍）；
// 佃农→投军（不能拉队伍）→逃散成流民（能拉队伍）；寨主→扯旗称王（队伍编成军、山寨并进地盘、主公了结、军务页开）；布商→捐监生（不是官）→捐实官（是官）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof idSync === 'function');
  const bad = [], ev = f => p.evaluate(f), txt = () => ev(() => document.body.innerText), has = s => p.$(s).then(Boolean), click = async (sel, what) => { const el = await p.$(sel); if (!el) { bad.push('没有「' + what + '」按钮'); return false; } await p.click(sel); await p.waitForTimeout(120); return true; };
  const mk = role => ev(r => { S = newSave({ name: '李过', gender: '男', age: 25, role: r, real: false, gregorianYear: 1640, month: 3, day: 1, place: '米脂', polity: '明' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 2;
    S.money = { cash: 3000, unit: '两' }; S.econ = { unit: '两', rice: 1, wage: 0.1, caravan: 200, protect: 15, pay: 1.5, ransom: 100, juan: 100 }; S.popEst = { k: popKey(S), m: { 米脂: { pop: 200000 } } }; VIEW = 'game'; TAB = 'board'; SIDE_FOLD = false; render(); }, role);
  // 一：佃农→落草→招安→罢官→再起
  await mk('佃农');
  await click('[data-ptx="start"]', '拉起一队人'); await ev(() => { const f = partyF(S); f.party.tiers['乡勇'] = 120; f.troops = 120; ptSync(S, f); render(); });
  await click('[data-base="found"]', '占山立寨'); if (!(await ev(() => !!S.base && isBandit(S)))) bad.push('占山立寨后不是山大王');
  await ev(() => { bandOf(S).offer = { title: '守备', ym: Math.floor(ymOf(S.clock)) }; bandOf(S).heat = 25; render(); });
  if (await click('[data-band="accept"]', '接受招安')) { const r = await ev(() => ({ role: S.protagonist.role, off: (S.career || {}).office, party: !!partyF(S), base: !!S.base, heat: (S.band || {}).heat || 0, f: arr(S.forces).filter(f => myForce(S, f)).map(f => [f.name, f.troops]), tags: identityOf(S).tags }));
    if (!/守备/.test(r.off || '')) bad.push('受了招安没做官：' + JSON.stringify(r)); if (r.party) bad.push('受了招安还挂着草根队伍'); if (r.base) bad.push('受了招安山寨还在'); if (r.heat) bad.push('受了招安恶名没清');
    if (!r.f.some(([n]) => /营$/.test(n))) bad.push('队伍没编成官军营：' + JSON.stringify(r.f)); if (!r.tags.includes('官')) bad.push('受了招安身份卡不是官：' + JSON.stringify(r.tags));
    if (await has('[data-ptx="recruit"]') || await has('[data-ptvil="劫村"]')) bad.push('做了官还有拉队伍、劫村的按钮'); if (await has('[data-jh="arena"]') || await has('[data-lord="0"]')) bad.push('做了官还有打擂、投效的按钮'); }
  { const r = await ev(() => { S.impeach = { ym: Math.floor(ymOf(S.clock)) - 3, by: '御史', why: '纵兵扰民' }; S.off = S.off || {}; try { offMonthly(S); } catch (e) { return 'ERR ' + e.message; } render0(); return { off: (S.career || {}).office, role: S.protagonist.role, can: canParty(S), dom: myDomain(S).kind, k: S.idSyncK, orgs: orgsLive(S).map(o => o.kind + o.state), sol: !!soldierOf(S) }; });
    if (typeof r === 'string') bad.push('罢官月结出错：' + r); else { if (r.off) bad.push('被参罢官还在任：' + JSON.stringify(r)); if (!r.can) bad.push('罢了官不能再拉队伍：' + JSON.stringify(r)); } }
  { const r = await ev(() => arr(S.forces).filter(f => myForce(S, f) && N0(f.troops) > 0).length); if (r) bad.push('罢了官还统着官兵'); }
  if (await click('[data-ptx="start"]', '罢官后重新拉队伍')) { if (!(await ev(() => !!partyF(S)))) bad.push('罢官后拉不起队伍'); }
  // 二：投军→逃兵→流民→拉队伍
  await mk('佃农');
  if (await click('[data-hh="enlist"]', '投军')) { if (await ev(() => canParty(S))) bad.push('当了兵还能拉队伍'); if (await has('[data-ptx="start"]')) bad.push('当了兵页上还有拉队伍的按钮'); }
  if (await click('[data-soldier="desert"]', '逃散')) { const r = await ev(() => ({ role: S.protagonist.role, can: canParty(S), rank: S.rank })); if (!/流民/.test(r.role) || !r.can || r.rank) bad.push('逃散后不是能拉队伍的流民：' + JSON.stringify(r)); }
  if (await click('[data-ptx="start"]', '流民拉队伍')) { if (!(await ev(() => !!partyF(S)))) bad.push('流民拉不起队伍'); }
  // 三：寨主→称王
  await mk('佃农');
  await click('[data-ptx="start"]', '拉起一队人'); await ev(() => { const f = partyF(S); f.party.tiers['乡勇'] = 1200; f.troops = 1200; ptSync(S, f); S.base = { place: '米脂', lv: { 寨墙: 0, 粮仓: 0, 校场: 0, 马厩: 0 }, ym: 1 }; S.territory = [{ place: '米脂县' }]; S.liege = { lord: '朱由检', polity: '明', title: '', since: 1, favor: 40 }; render(); });
  await p.fill('#crownName', '顺').catch(() => bad.push('没有填国号的地方'));
  if (await click('[data-crown="1"]', '扯旗称王')) { const r = await ev(() => ({ ruler: isRuler(S), party: !!partyF(S), base: !!S.base, liege: !!S.liege, f: arr(S.forces).filter(f => myForce(S, f)).map(f => f.name), tabs: tabsFor(S).map(x => x[0]) }));
    if (!r.ruler) bad.push('扯旗称王后不是一方之主'); if (r.party) bad.push('称王了还挂着草根队伍'); if (r.base) bad.push('称王了山寨还单列'); if (r.liege) bad.push('称王了还在别人帐下');
    if (!r.f.some(n => /军$/.test(n))) bad.push('称王后队伍没编成军：' + JSON.stringify(r.f)); if (!r.tabs.includes('army')) bad.push('称王后没有军务页');
    if (await has('[data-ptvil="帮工"]') || await has('[data-jh="arena"]')) bad.push('称王了页上还有帮村里干活、打擂的按钮'); }
  // 四：布商→捐监生→捐实官
  await mk('布商');
  if (await click('[data-hh="juan"]', '捐个出身')) { const r = await ev(() => ({ off: (S.career || {}).office, t: arr((S.career || {}).titles) })); if (r.off) bad.push('捐了监生就成了官：' + JSON.stringify(r)); if (!r.t.includes('监生')) bad.push('捐的出身没记成监生'); }
  await ev(() => { TAB = 'career'; render(); });
  if (await click('[data-entry="juan"]', '捐纳')) { const r = await ev(() => ({ off: (S.career || {}).office, tags: identityOf(S).tags })); if (!/候补县丞/.test(r.off || '')) bad.push('监生捐实官没授候补：' + JSON.stringify(r)); }
  { const r = await ev(() => { for (let k = 0; k < 11; k++) { S.clock = { ...S.clock, m: S.clock.m === 12 ? 1 : S.clock.m + 1, y: S.clock.m === 12 ? S.clock.y + 1 : S.clock.y }; rushiMonthly(S); } render(); return { off: (S.career || {}).office, tags: identityOf(S).tags }; }); if (!/县丞/.test(r.off || '') || /候补/.test(r.off) || !r.tags.includes('官')) bad.push('候补满了没补实缺、身份卡不是官：' + JSON.stringify(r)); }
  const html = await txt(); for (const w of ['undefined', 'NaN']) if (html.includes(w)) bad.push('页面上出现 ' + w);
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
