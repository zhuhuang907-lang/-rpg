// 朝政与军务：国势、阶层照史料定；时政有期限；召见大臣各照派系说话、每月至多三次、主张能写进诏书；处置了的时政结掉、国势照增减；
// 兵种照本朝兵制核定，自定兵种也核定；募编写成军令、记账回报后加营、按月扣饷扣粮；打仗照兵种攻守冲击和组织训练算，地形窄的多出来的兵用不上
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); p.on('dialog', d => d.accept());
  const bad = m => errs.push(m);
  const idle = async (ms = 300000) => { try { await p.waitForFunction(() => !BUSY && !BG && !document.querySelector('.thinking'), null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.fill('#qText', '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  if (!(await idle()) || !(await p.$('#said'))) { bad('开局没出来'); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(1); }
  if (await p.evaluate(() => !!S.gov)) bad('盐商也立了国势');
  await p.evaluate(async () => { S.idm = 'emperor'; S.protagonist.role = '皇帝'; S.dossiers = { ...(S.dossiers || {}), 傅恒: { real: true, born: 1720, died: 1770 } }; while (ORGING) await new Promise(r => setTimeout(r, 200)); S.org = null; await buildOrg(S); await buildGov(S); await buildAffairs(S); await buildOfficers(S); await buildUnitTypes(S); });
  const g = await p.evaluate(() => ({ keys: S.gov && Object.keys(S.gov.stats).length, cls: arr(S.classes).length, aff: arr(S.affairs).length, attr: courtiers(S).filter(c => c.attr).length, ut: arr(S.unitTypes).length, blk: govBlock(S).length > 0 && /威望/.test(govBlock(S)) }));
  if (g.keys < 8) bad('国势数值不全：' + JSON.stringify(g));
  // 没出处的数不编：「通货」只给了「大致如此」，记不详；有出处的照登，出处摆在界面上；兵种饷粮没出处的标估
  const src = await p.evaluate(() => ({ g0: 0, cur: S.gov.stats['通货'], cb: basisGrade(S.gov.basis['通货']), b: S.gov.basis['国库'], est: S.unitTypes.map(t => !!t.est), all: S.gov.keys.every(k => S.gov.stats[k] != null) }));
  if (!src.all) bad('国势有空着的数');
  if (src.cur == null || src.cb !== '推算') bad('推算的数没登上或没标推算：' + JSON.stringify(src));
  if (!/测试实录/.test(src.b || '')) bad('国库的出处没记下');
  if (!(src.est[0] === false && src.est[1] === true)) bad('兵种饷粮有没有出处没分开：' + JSON.stringify(src.est));
  if (!g.cls) bad('阶层没立');
  if (g.aff < 2) bad('时政没拟出来');
  if (!g.attr) bad('官员没有属性');
  if (g.ut < 3) bad('兵种没核定');
  if (!g.blk) bad('国势没进材料（推演写正文看不到威望）');
  await p.click('[data-tab="court"]'); await p.waitForTimeout(400);
  const txt = await p.evaluate(() => document.body.innerText);
  for (const w of ['国势', '国库', '内帑', '民心', '腐败', '威望', '阶层', '时政', '召见商议', '江北水灾饥民', '推算', '史载', '测试实录']) if (!txt.includes(w)) bad('朝局页上没有：' + w);
  // 召见：选两人，各照自己说话；用掉一次
  const fid = await p.evaluate(() => S.affairs[0].id), c2 = await p.evaluate(() => courtiers(S).slice(0, 2).map(c => c.name));
  await p.selectOption(`[data-aud1="${fid}"]`, c2[0]); await p.selectOption(`[data-aud2="${fid}"]`, c2[1]);
  await p.click(`[data-aud="${fid}"]`); await p.waitForFunction(() => arr(S.aud && S.aud.log).length > 0, null, { timeout: 30000 }).catch(() => bad('召见没回话'));
  await p.waitForTimeout(500); const au = await p.evaluate(() => ({ left: audLeft(S), n: S.aud.log.slice(-1)[0].replies.length, html: document.body.innerText.includes('臣以为'), tab: TAB, fold: SIDE_FOLD, tabs: tabsFor(S).map(x => x[0]).join() }));
  if (au.left !== 2 || au.n !== 2 || !au.html) bad('召见不对：' + JSON.stringify(au));
  await p.evaluate(() => { S.aud.used = 3; render(); });
  if (await p.evaluate(fid => !document.querySelector(`[data-aud="${fid}"]`).disabled, fid)) bad('一个月召见满三次还能召');
  // 照大臣的主张拟诏 → 写下一步，记账结掉时政、国势照增减
  await p.click('.reply button[data-write]'); const said = await p.inputValue('#said');
  if (!/下诏：处置「江北水灾饥民」/.test(said)) bad('照主张拟诏没写进下一步：' + said);
  const before = await p.evaluate(() => ({ ...S.gov.stats }));
  await p.click('#bSend'); if (!(await idle())) bad('下诏那一回卡住');
  const af = await p.evaluate(() => ({ st: S.affairs.find(a => a.title === '江北水灾饥民').state, mx: S.gov.stats['民心'], tr: S.gov.stats['国库'], hist: S.gov.hist.length }));
  if (af.st !== '已办') bad('处置了的时政没结掉：' + JSON.stringify(af));
  if (!(af.mx > before['民心'])) bad('国势没照记账增减：' + JSON.stringify([before['民心'], af.mx]));
  // 兵种：自定一个，照本朝兵制核定数值
  await p.click('[data-tab="army"]'); await p.waitForTimeout(300);
  await p.fill('#utName', '鸟铳营'); await p.fill('#utDesc', '鸟铳为主，佐以长枪'); await p.click('#bUtAdd');
  await p.waitForFunction(() => arr(S.unitTypes).some(t => t.name === '鸟铳营'), null, { timeout: 30000 }).catch(() => bad('自定兵种没核定'));
  const ut = await p.evaluate(() => S.unitTypes.find(t => t.name === '鸟铳营'));
  if (!ut || !(ut.size > 0 && ut.atk > 0 && ut.pay >= 0)) bad('自定兵种数值不全：' + JSON.stringify(ut));
  // 募编：写成军令，记账回报后加营、按月扣饷
  await p.evaluate(() => { S.forces = [{ name: '标营', leader: S.protagonist.name, at: '江都县', units: [], troops: 0, grain: 5000, status: '驻守' }]; S.realm = { ...(S.realm || {}), outlay: 0 }; render(); });
  await p.evaluate(() => document.querySelectorAll('details').forEach(d => { d.open = true; }));
  const tid = ut.id; await p.selectOption('[data-aut="标营"]', tid); await p.fill('[data-aun="标营"]', '4'); await p.click('[data-army="raise"][data-f="标营"]');
  if (!/下令：给标营募编鸟铳营4营/.test(await p.inputValue('#said'))) bad('募编没写进下一步：' + await p.inputValue('#said'));
  const tr0 = await p.evaluate(() => S.gov.stats['国库']);
  await p.click('#bSend'); if (!(await idle())) bad('募编那一回卡住');
  const ar = await p.evaluate(() => { const f = S.forces.find(x => x.name === '标营'); return { u: f.units, men: f.troops, tr: S.gov.stats['国库'] }; });
  if (!(ar.u.length && ar.u[0].n === 4 && ar.men === 4 * ut.size)) bad('募编回报了，编成没加上：' + JSON.stringify(ar));
  // 按月：扣饷扣粮
  const mo = await p.evaluate(() => { const f = S.forces.find(x => x.name === '标营'); const g0 = f.grain, t0 = S.gov.stats['国库']; armyMonthly(S, 1); return { g0, g1: f.grain, t0, t1: S.gov.stats['国库'], pay: forceStats(S, f).pay }; });
  if (!(mo.g1 < mo.g0)) bad('按月没扣军粮：' + JSON.stringify(mo));
  if (!(mo.t1 < mo.t0)) bad('按月没扣军饷：' + JSON.stringify(mo));
  // 打仗：同样人数，兵种强的胜算高；关隘窄，多出来的兵用不上
  const bt = await p.evaluate(() => {
    const strong = { id: 'tS', name: '强兵', size: 500, atk: 90, def: 80, shock: 85, org: 80, mob: 50, pay: 2, grain: 0.5, months: 3 }, weak = { id: 'tW', name: '弱兵', size: 500, atk: 20, def: 25, shock: 15, org: 30, mob: 50, pay: 1, grain: 0.5, months: 3 };
    S.unitTypes = S.unitTypes.concat([strong, weak]);
    const mk = id => [{ name: 'A', leader: '甲', units: [{ tpl: id, n: 10 }], troops: 5000, grain: 99999, orgNow: 80, train: 80, morale: 70, status: '驻守' }];
    S.forces = mk('tS'); const a = resolveBattle(S, { enemyTroops: 5000, enemyQuality: '中', attacker: '我', terrain: '平原', ourForces: [] });
    S.forces = mk('tW'); const c = resolveBattle(S, { enemyTroops: 5000, enemyQuality: '中', attacker: '我', terrain: '平原', ourForces: [] });
    S.forces = [{ name: 'B', leader: '甲', troops: 40000, grain: 999999, quality: '中' }]; const w1 = resolveBattle(S, { enemyTroops: 4000, enemyQuality: '中', attacker: '我', terrain: '关隘', ourForces: [] }), w2 = resolveBattle(S, { enemyTroops: 4000, enemyQuality: '中', attacker: '我', terrain: '平原', ourForces: [] });
    return { strong: a.odds, weak: c.odds, pass: w1.odds, plain: w2.odds };
  });
  if (!(bt.strong > bt.weak)) bad('兵种强弱没算进胜算：' + JSON.stringify(bt));
  if (!(bt.pass < bt.plain)) bad('关隘窄、人多用不上没算进去：' + JSON.stringify(bt));
  console.log('STATE', JSON.stringify({ g, au, af, ar, mo, bt }));
  console.log('ERRS', JSON.stringify(errs));
  await b.close(); process.exit(errs.length ? 1 : 0);
})();
