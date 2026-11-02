// 出征真能打（CLAUDE.md「舆图」出征与战斗数值）：军务页每支兵马有出征单——邻近的城照远近列出归谁、多远、几日、胜算（守军不详就写不详）；
// 点「进攻」当场立行军、写进下一步；「静候军报」把这一回时长调够；「撤回」作罢；营数是整数、缺额另写、总数和战报对得上；
// 胜负折损看对面战力：兵力相当胜算在五成上下，兵多的平地野战折得少；败的一方追击里多折
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1400 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof resolveBattle === 'function');
  await p.evaluate(() => {
    S = newSave({ name: '王审知', gender: '男', age: 59, role: '闽王', real: true, gregorianYear: 921, month: 6, day: 1, place: '福州', polity: '闽' });
    S.idm = 'warlord'; S.territory = [{ place: '福州', troops: 3000 }, { place: '泉州', troops: 2000 }]; S.money = { cash: 500000, unit: '贯' }; S.chat = [{ role: 'gm', text: '开场。' }];
    S.unitTypes = [{ id: 'bu', name: '牙兵步卒', size: 500, atk: 55, def: 55, shock: 40, org: 60, mob: 40, pay: 1, grain: 0.5, months: 2 }, { id: 'qi', name: '马军', size: 200, atk: 60, def: 40, shock: 70, org: 55, mob: 70, pay: 2, grain: 1, months: 3 }];
    S.forces = [{ name: '威武军', leader: '王审知', owner: '你', troops: 12000, morale: 60, orgNow: 70, train: 60, grain: 40000, at: '福州', status: '驻守', units: [{ tpl: 'bu', n: 20 }, { tpl: 'qi', n: 10 }] }, { name: '吴军', leader: '刘信', owner: '吴', troops: 8000, at: '汀州', quality: '中' }];
    S.powers = [{ name: '吴', leader: '徐温' }];
    TAB = 'army'; VIEW = 'game'; SIDE_FOLD = false; render0();
  });
  const bad = [];
  const opts = await p.evaluate(() => [...document.querySelectorAll('[data-xtg="威武军"] option')].map(o => o.textContent));
  if (opts.length < 4) bad.push('出征单上的目标太少：' + opts.length);
  if (!opts.some(o => /汀州（.*?，约\d+里、\d+日，胜算约\d+%，守军约8,000人/.test(o))) bad.push('别家兵马驻的汀州没列出、或没写守军和胜算：' + opts.join(' | '));
  if (opts.some(o => /守军约1,200人/.test(o))) bad.push('户口不详的城还照默认数编守军');
  if (!opts.some(o => /守军不详/.test(o))) bad.push('户口不详的城没写「守军不详」');
  await p.selectOption('[data-xtg="威武军"]', { label: opts.find(o => /汀州/.test(o)) });
  await p.selectOption('[data-xtac="威武军"]', '包抄');
  await p.click('button[data-army="go"][data-mode="攻"]');
  const a1 = await p.evaluate(() => ({ c: arr(S.campaigns)[0], said: document.querySelector('#said').value }));
  if (!a1.c || a1.c.target !== '汀州' || a1.c.state !== '待发' || a1.c.tactic !== '包抄' || !a1.c.li) bad.push('点「进攻」没当场立行军：' + JSON.stringify(a1.c));
  if (!/威武军进攻汀州（战法：包抄），约\d+里/.test(a1.said)) bad.push('军令没写进下一步：' + a1.said);
  const a2 = await p.evaluate(() => { S.turn++; campaignTick(S, 0); TAB = 'army'; render0(); return document.querySelector('[data-xwait]') ? document.querySelector('[data-xwait]').textContent : ''; });
  if (!/静候军报/.test(a2)) bad.push('行军中没有「静候军报」');
  if (!(await p.evaluate(() => /还有约 \d+ 里、\d+ 日/.test(document.body.innerText)))) bad.push('行军中没写还有几里几日');
  await p.click('button[data-xwait]');
  const sp = await p.evaluate(() => ({ span: document.querySelector('#span').value, said: document.querySelector('#said').value }));
  if (sp.span === 'auto' || !/静候前方军报/.test(sp.said)) bad.push('「静候军报」没把时长调好、没写进下一步：' + JSON.stringify(sp));
  await p.click('button[data-army="halt"]');
  if (await p.evaluate(() => arr(S.campaigns).some(c => /待发|行军/.test(c.state)))) bad.push('「撤回」没作罢');
  // 营数整数、缺额、总数对得上
  const u = await p.evaluate(() => { const r = resolveBattle(S, { enemy: '吴军', enemyTroops: 8000, enemyQuality: '中', place: '汀州', terrain: '平原', attacker: '我', ourForces: ['威武军'], tactic: '正攻' }); applyBattle(S, r); const f = S.forces[0], st = forceStats(S, f); TAB = 'army'; render0(); return { r, units: f.units, troops: f.troops, men: st.men, txt: document.body.innerText }; });
  if (u.units.some(x => x.n !== Math.round(x.n))) bad.push('营数有小数：' + JSON.stringify(u.units));
  if (Math.abs(u.men - Number(u.troops)) > 1 || Math.abs(u.men - u.r.rounds[2].us) > 1) bad.push(`总数和战报对不上：账上${u.troops}、编成${u.men}、战报剩${u.r.rounds[2].us}`);
  if (/\d+\.\d+营/.test(u.txt)) bad.push('页面上营数有小数');
  // 战斗数值
  const M = await p.evaluate(() => { const go = (a, bb, T, tac, att) => { S.forces[0] = { name: '威武军', leader: '王审知', owner: '你', troops: a, morale: 60, orgNow: 70, train: 60, grain: 99999, at: '福州', status: '驻守', units: [{ tpl: 'bu', men: a }] }; S.turn = 3; return resolveBattle(S, { enemy: '敌', enemyTroops: bb, enemyQuality: '中', place: '汀州', terrain: T, attacker: att || '我', ourForces: ['威武军'], tactic: tac }); };
    return { eq: go(10000, 10000, '平原', '正攻'), big: go(12000, 8000, '平原', '正攻'), mtn: go(12000, 8000, '山地', '正攻'), huge: go(30000, 5000, '平原', '包抄'), city: go(12000, 8000, '城池', '正攻') }; });
  if (M.eq.odds < 40 || M.eq.odds > 62) bad.push('兵力相当的平地野战胜算不在五成上下：' + M.eq.odds);
  if (!(M.big.odds > M.eq.odds && M.big.odds > M.mtn.odds && M.mtn.odds > M.city.odds)) bad.push(`胜算不合常理：平地${M.big.odds} 山地${M.mtn.odds} 攻城${M.city.odds}`);
  if (/胜/.test(M.big.outcome) && !(M.big.deadUs < M.big.deadThem)) bad.push('打赢了反倒折得比敌人多：' + M.big.deadUs + '/' + M.big.deadThem);
  if (M.huge.deadUs > M.huge.deadThem / 3) bad.push('三万打五千大胜还折了那么多：' + M.huge.deadUs + '/' + M.huge.deadThem);
  for (const [k, r] of Object.entries(M)) { if (/败/.test(r.outcome) && r.deadUs / r.deadThem > 5) bad.push(k + ' 败仗折损比悬殊得离谱：' + r.deadUs + '/' + r.deadThem); if (r.deadUs > r.ours * 0.6) bad.push(k + ' 一仗折了六成以上'); }
  for (const x of bad) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
