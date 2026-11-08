// 江湖（需求台账 R-152；2026-11-08 玩家：「可以多跟骑马与砍杀抄袭一些内容，请你按照这个剧情往里面多添加点东西，目前的那种太不丰满了」）
// 全真点：置办兵甲马（三等、贵一等、本人拳脚涨）、打擂（一月一回、押注、赢了得彩头名望）、酒肆闲话（照账上的事说）、雇镖师（刀手）、
// 匪巢（每月冒出、前去剿、到了攻寨、赢了缴获乡里感激、当面说开寨归顺）、投效（只投史料里在位的真人、领饷、调令应召推托、赐田庄、劫村翻脸、辞别）、
// 被俘（大败被拿、关着别的不能办、脱逃、赎身、跟看守当面说）、头领心愿（赏钱、陪他回乡、办到了忠心涨）、差事多了讨债寻人
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof jhHtml === 'function');
  const bad = [], ev = f => p.evaluate(f), click = async (sel, what) => { const el = await p.$(sel); if (!el) { bad.push('没有「' + what + '」按钮'); return false; } await p.click(sel); await p.waitForFunction(() => !PARLEY_P, null, { timeout: 20000 }); await p.waitForTimeout(80); return true; };
  await ev(() => {
    S = newSave({ name: '黄巢', gender: '男', age: 30, role: '贩私盐的', real: false, gregorianYear: 874, month: 3, day: 1, place: '曹州', polity: '唐' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 2;
    S.money = { cash: 3000, unit: '贯' }; S.econ = { unit: '贯', rice: 0.5, wage: 0.1, caravan: 200, protect: 15, pay: 1.5, ransom: 100 }; S.popEst = { k: popKey(S), m: { 曹州: { pop: 300000 }, 濮州: { pop: 200000 } } };
    S.skills = { 武艺: { lv: 30, xp: 0 }, 谋略: { lv: 20, xp: 0 }, 骑射: { lv: 10, xp: 0 } };
    window.REPLY = null; window.callClaude = async () => ({ text: JSON.stringify(REPLY) });
    VIEW = 'game'; TAB = 'board'; SIDE_FOLD = false; render(); });
  // 没队伍也能置办、打擂、听闲话
  { const w0 = await ev(() => meWu(S)), c0 = await ev(() => S.money.cash);
    if (await click('[data-gear="兵器"]', '置办朴刀')) { const r = await ev(() => ({ g: S.gear, w: meWu(S), c: S.money.cash })); if (r.g['兵器'] !== 1 || !(r.w > w0) || !(r.c < c0)) bad.push('置办兵器没成：' + JSON.stringify(r)); }
    const c1 = await ev(() => S.money.cash); await click('[data-gear="兵器"]', '置办长枪'); const c2 = await ev(() => S.money.cash); if (!(c1 - c2 > (c0 - c1) * 2)) bad.push('二等兵器没比一等贵');
    await click('[data-gear="马"]', '置办驽马'); await click('[data-gear="甲"]', '置办皮甲'); if (!/长枪/.test(await ev(() => document.body.innerText))) bad.push('随身兵甲没显示'); }
  { const c0 = await ev(() => S.money.cash), r0 = await ev(() => num(S.renown) || 0); await p.fill('#arBet', '5');
    if (await click('[data-jh="arena"]', '上擂台')) { const r = await ev(() => ({ a: S.arena, c: S.money.cash, rn: num(S.renown) || 0, log: (S.arena || {}).log })); if (!r.a || !r.log.length || r.rn < r0 || !/打擂/.test(r.log[0].t)) bad.push('打擂没打：' + JSON.stringify(r)); }
    const l0 = await ev(() => S.arena.log.length); await click('[data-jh="arena"]', '上擂台'); if ((await ev(() => S.arena.log.length)) !== l0) bad.push('一个月打了两回擂');
    // 押注超过现钱的不让报名
    await ev(() => { S.arena.ym = null; S.money.cash = 1; render(); }); await click('[data-jh="arena"]', '上擂台'); if (!/现钱不够/.test(await ev(() => ORGMSG))) bad.push('钱不够也能打擂'); await ev(() => { S.money.cash = 3000; render(); }); }
  if (await click('[data-jh="tavern"]', '酒肆听闲话')) { const r = await ev(() => S.rumors); if (!r || !r.list.length || !/米价/.test(r.list.join())) bad.push('酒肆闲话没照行情说：' + JSON.stringify(r)); if (!/米价/.test(await ev(() => document.body.innerText))) bad.push('闲话没显示'); }
  // 拉队伍、雇镖师
  await click('[data-ptx="start"]', '拉起一队人'); await ev(() => { S.renown = 60; const f = partyF(S); f.party.tiers['乡勇'] = 40; f.troops = 40; f.grain = 500; ptSync(S, f); render(); });
  if (await click('[data-jh="merc"]', '雇镖师')) { const r = await ev(() => partyF(S).party.tiers['刀手'] || 0); if (r !== 10) bad.push('雇镖师没来十个刀手：' + r); }
  await click('[data-jh="merc"]', '雇镖师'); if ((await ev(() => partyF(S).party.tiers['刀手'])) !== 10) bad.push('同一处一个月雇了两回镖师');
  // 匪巢：每月冒出（治安差）、前去剿、到了攻寨
  await ev(() => { S.gov = S.gov || {}; S.gov.stats = { 治安: 0 }; for (let i = 0; i < 12 && arr(S.lairs).length < 2; i++) { S.lairYM = null; S.clock.m = (S.clock.m % 12) + 1; S.turn++; lairMonthly(S); } render(); });
  const L0 = await ev(() => arr(S.lairs)[0]); if (!L0) bad.push('治安差了一年也没冒出匪巢');
  else { if (!/附近的匪巢/.test(await ev(() => document.body.innerText))) bad.push('匪巢没显示');
    if (await click(`[data-lair="${L0.id}"]`, '前去剿')) { const r = await ev(() => arr(S.campaigns).some(c => samePlace(c.target, partyF(S) && arr(S.lairs)[0] ? arr(S.lairs)[0].place : "") || /去剿/.test(c.what || c.line || ""))); if (!r && !(await ev(() => S.enc))) bad.push("点了前去剿没动身：" + JSON.stringify(await ev(() => arr(S.campaigns).slice(-1)))); }
    await p.evaluate((L) => { const f = partyF(S); f.at = L.place; S.enc = null; render(); }, L0);
    if (await click(`[data-lair="${L0.id}"]`, '攻寨')) { if (!(await ev(() => S.enc && S.enc.kind === '匪巢'))) bad.push('到了寨前没摸到寨门'); }
    await ev(() => { S.enc.n = 3; render(); }); const c0 = await ev(() => S.money.cash);
    if (await click('[data-enc="fight"]', '攻寨')) { const r = await ev(() => ({ l: arr(S.lairs).length, c: S.money.cash })); if (r.l >= 2 && !(r.c > c0)) bad.push('攻下寨子没缴获、寨子还在：' + JSON.stringify(r)); }
    // 当面说开寨归顺
    const L1 = await ev(() => { S.lairs = arr(S.lairs).concat([{ id: 'Lx', name: '黑风寨', place: '曹州', men: 12, loot: 50, ym: 1 }]); partyF(S).at = '曹州'; S.enc = { kind: '匪巢', n: 12, place: '曹州', ym: 1, q: '弱', lair: 'Lx' }; REPLY = { verdict: '允', reply: '愿随哥哥。', why: '打不过' }; render(); return 1; });
    const n0 = await ev(() => ptMen(partyF(S).party)); await ev(() => { document.querySelector('[data-psay^="enc:"]').closest('details').open = true; }); await p.fill('[data-psay^="enc:"]', '寨主，你我都是苦出身，不如合伙干一番事业，钱粮一起分');
    if (await click('[data-enc="talk"]', '当面说')) { const r = await ev(() => ({ n: ptMen(partyF(S).party), l: arr(S.lairs).some(x => x.id === 'Lx') })); if (!(r.n > n0) || r.l) bad.push('说动寨子开寨归顺没成：' + JSON.stringify(r)); } }
  // 投效：只投史料里的真人
  const Ls = await ev(() => lordsNear(S)); if (!Ls.length) bad.push('874 年没有可投效的君主'); else if (Ls.some(x => /某|不详/.test(x.lord))) bad.push('投效名单里有不明的人');
  if (Ls.length && await click('[data-lord="0"]', '投效')) { const r = await ev(() => S.liege); if (!r || r.lord !== Ls[0].lord) bad.push('投效没成：' + JSON.stringify(r)); else if (!/唐/.test(r.polity) || !/李儇|僖宗/.test(r.lord + r.title)) bad.push('874 年投效的不是唐僖宗李儇：' + JSON.stringify(r)); }
  { const c0 = await ev(() => S.money.cash); await ev(() => { S.liege.since -= 8; S.liege.favor = 80; S.liege.ym = null; S.clock.m = (S.clock.m % 12) + 1; S.turn++; liegeMonthly(S); render(); });
    const r = await ev(() => ({ c: S.money.cash, f: S.liege && S.liege.fief })); if (!(r.c > c0)) bad.push('投效了一个月没领到饷'); if (!r.f) bad.push('好感八十、效力八个月没赐田庄'); }
  await ev(() => { S.liege.summon = { place: '濮州', foe: '流寇', n: 5, due: Math.floor(ymOf(S.clock)) + 2 }; render(); });
  if (await click('[data-summon="go"]', '应召')) { const r = await ev(() => ({ s: S.liege.summon, b: arr(S.battles).length })); if (r.s || !r.b) bad.push('应召没出兵：' + JSON.stringify(r)); }
  await ev(() => { S.liege.summon = { place: '濮州', foe: '流寇', n: 5, due: Math.floor(ymOf(S.clock)) + 2 }; render(); }); { const f0 = await ev(() => S.liege.favor); if (await click('[data-summon="no"]', '推托')) { if (!((await ev(() => S.liege.favor)) < f0)) bad.push('推托调令好感没掉'); } }
  { const f0 = await ev(() => S.liege.favor); await ev(() => { vilOf(S, partyF(S).at).actYM = null; render(); }); await click('[data-ptvil="劫村"]', '洗劫'); if (!((await ev(() => S.liege ? S.liege.favor : -99)) <= f0 - 30)) bad.push('投效了还去劫村，主公没翻脸'); }
  await ev(() => { if (!S.liege) S.liege = { lord: '李儇', polity: '唐', title: '', since: 1, favor: 50, fief: null, summon: null }; render(); });
  if (await click('[data-lord="leave"]', '辞别')) { if (await ev(() => !!S.liege)) bad.push('辞别了还在帐下'); }
  // 头领心愿
  await ev(() => { const f = partyF(S); f.party.heroes = [{ name: '赵大刀', from: '逃兵', wu: 7, tong: 4, mou: 3, yi: 1, temper: '贪财', wish: '攒钱置几亩地', loyal: 50 }]; f.party.wish = null; for (let i = 0; i < 30 && !f.party.wish; i++) { S.clock.m = (S.clock.m % 12) + 1; S.turn++; wishMonthly(S); } render(); });
  { const W = await ev(() => partyF(S).party.wish); if (!W || W.k !== '赏钱') bad.push('贪财的头领没开口要赏钱：' + JSON.stringify(W));
    else if (await click('[data-wish="pay"]', '给他赏钱')) { const r = await ev(() => ({ w: partyF(S).party.wish, l: partyF(S).party.heroes[0].loyal })); if (r.w || !(r.l >= 70)) bad.push('给了赏钱心愿没了结：' + JSON.stringify(r)); } }
  await ev(() => { const f = partyF(S); f.party.wish = { hero: '赵大刀', k: '回乡', due: Math.floor(ymOf(S.clock)) + 4, place: '濮州' }; render(); });
  { const c0 = await ev(() => { S.campaigns = []; return 0; }); if (await click('[data-wish="go"]', '陪他回乡')) { if (!((await ev(() => arr(S.campaigns).length)) > c0)) bad.push('点了陪他回乡没动身：' + await ev(() => ORGMSG + JSON.stringify(arr(S.campaigns).map(c => c.target + c.state)))); } }
  await ev(() => { const f = partyF(S); f.at = '濮州'; ptArrive(S, f, '濮州'); render(); }); if (await ev(() => !!partyF(S).party.wish)) bad.push('陪他到了老家心愿没了结');
  { await ev(() => { const f = partyF(S); f.party.wish = { hero: '赵大刀', k: '打仗', due: Math.floor(ymOf(S.clock)) - 1 }; wishMonthly(S); }); if (!((await ev(() => partyF(S).party.heroes[0].loyal)) < 100) || (await ev(() => partyF(S).party.wish && partyF(S).party.wish.k === '打仗'))) bad.push('心愿误了期没寒心'); }
  // 被俘
  await ev(() => { S.jail = { by: '官军', place: '曹州', ym: Math.floor(ymOf(S.clock)), ransom: 30, tries: 0 }; S.money.cash = 3000; render(); });
  if (!/被官军关在曹州/.test(await ev(() => document.body.innerText))) bad.push('被俘没显示');
  await click('[data-ptx="train"]', '操练'); if (!/关着/.test(await ev(() => ORGMSG))) bad.push('关着还能操练队伍');
  await click('[data-jh="escape"]', '设法脱逃'); { const r = await ev(() => ({ j: S.jail, t: S.jail && S.jail.tries })); if (r.j && r.t !== 1) bad.push('脱逃没试'); }
  await ev(() => { if (!S.jail) S.jail = { by: '官军', place: '曹州', ym: 1, ransom: 30, tries: 0 }; render(); });
  if (await click('[data-jh="ransom"]', '拿钱赎')) { if (await ev(() => !!S.jail)) bad.push('交了赎金还关着'); }
  await ev(() => { S.jail = { by: '流寇', place: '曹州', ym: 1, ransom: 300, tries: 0 }; REPLY = { verdict: '允', reply: '罢了。', why: '贪钱' }; render(); document.querySelector('[data-psay="jail"]').closest('details').open = true; });
  await p.fill('[data-psay="jail"]', '兄弟，放我出去，外头的弟兄自会重谢，往后有福同享');
  if (await click('[data-jh="talk"]', '跟看守当面说')) { const r = await ev(() => S.jail); if (r && !(r.ransom < 300)) bad.push('说动看守了赎金没减：' + JSON.stringify(r)); }
  // 大败会被拿住
  { const r = await ev(() => { S.jail = null; let hit = 0; for (let i = 0; i < 12; i++) { S.jail = null; S.clock.m = (S.clock.m % 12) + 1; if (jailCheck(S, { outcome: '大败', deadUs: i }, '官军', '曹州')) hit++; } S.jail = null; return hit; }); if (!r) bad.push('大败十二回一次也没被拿住'); }
  // 差事：讨债、寻人
  await ev(() => { const f = partyF(S); f.party.questYM = null; S.ptQuests = []; REPLY = { quests: [{ type: '讨债', giver: '王掌柜', target: '濮州', why: '欠了三年' }, { type: '寻人', giver: '李乡老', target: '濮州', why: '孙子被拐' }] }; render(); });
  if (await click('[data-ptx="quest"]', '打听差事')) { const r = await ev(() => arr(S.ptQuests).map(q => q.type)); if (!r.includes('讨债') || !r.includes('寻人')) bad.push('打听不到讨债、寻人的差事：' + JSON.stringify(r)); }
  if (!/去濮州讨债/.test(await ev(() => document.body.innerText))) bad.push('讨债差事没写清');
  await ev(() => { for (const q of S.ptQuests) { q.state = '在办'; q.takeYM = Math.floor(ymOf(S.clock)); } const f = partyF(S); f.at = '濮州'; S.enc = null; ptArrive(S, f, '濮州'); render(); });
  { const r = await ev(() => ({ q: S.ptQuests.map(q => q.type + q.state), e: S.enc && S.enc.quest })); if (!r.q.includes('寻人办成')) bad.push('到了濮州寻人没办成：' + JSON.stringify(r)); if (!r.q.includes('讨债办成') && !r.e) bad.push('讨债到了地方既没办成也没撞上家丁'); }
  const html = await ev(() => document.body.innerText); for (const w of ['undefined', 'NaN', '[object']) if (html.includes(w)) bad.push('页面上出现 ' + w);
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
