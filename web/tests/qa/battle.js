// 作战按天打：宽度、战术相克、组织度、追击被俘；自创战法 AI 评估、效果有上限、条件不合用不上；战报逐日（需求台账 R-141；2026-11-07 玩家：「具体作战的细节你要设计好，可以效仿钢铁雄心……更多玩家的创意战术，可以由 ai 评估」）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof battleSim === 'function');
  const bad = await p.evaluate(async () => {
    const bad = [];
    S = newSave({ name: '王审知', gender: '男', age: 59, role: '闽王', real: true, gregorianYear: 921, month: 10, day: 1, place: '福州', polity: '闽' }); S.chat = [{ role: 'gm', text: '开场' }];
    const side = (name, men, o) => btSide(S, Object.assign({ name, men }, o || {}));
    // 一、势均力敌的野战：打几天才分出来，双方伤亡都不离谱，输的一方组织度打光
    const r1 = battleSim(S, side('甲', 10000), side('乙', 10000), { terrain: '平原', seed: 7 });
    if (r1.days.length < 2) bad.push('势均力敌一天就分出胜负：' + r1.days.length);
    if (r1.A.dead / 10000 > 0.35 || r1.B.dead / 10000 > 0.5) bad.push('势均力敌伤亡离谱：' + JSON.stringify([r1.A, r1.B]));
    if (r1.end && Math.min(r1.A.org, r1.B.org) > 0) bad.push('分出胜负了输的一方组织度还没打光');
    // 二、关隘宽三千：两万攻三千守，攻方摆不开，伤亡比守方重
    const r2 = battleSim(S, side('攻', 20000), side('守', 3000), { terrain: '关隘', seed: 3 });
    if (r2.width !== 3000) bad.push('关隘战场宽度不是三千：' + r2.width);
    if (r2.A.dead <= r2.B.dead) bad.push('关隘下攻方伤亡反比守方轻：' + JSON.stringify([r2.A, r2.B]));
    // 三、兵多的打兵少的：多半赢
    let win = 0; for (let k = 1; k <= 10; k++) if (/胜/.test(battleSim(S, side('多', 15000), side('少', 6000), { terrain: '平原', seed: k }).outcome)) win++;
    if (win < 8) bad.push('一万五打六千十仗只赢' + win + '仗');
    // 四、战术相克有记录；骑兵多的追击杀得多、夹击得手能俘虏
    const cavA = side('骑', 12000, { cav: 0.6 }); cavA.mob = 75; const r4 = battleSim(S, cavA, side('步', 6000, { cav: 0 }), { terrain: '平原', seed: 5 });
    const r5 = battleSim(S, side('步甲', 12000, { cav: 0 }), side('步乙', 6000, { cav: 0 }), { terrain: '平原', seed: 5 });
    if (!(r4.pursuit && r5.pursuit && r4.pursuit.k > r5.pursuit.k)) bad.push('骑兵多的追击没多杀：' + JSON.stringify([r4.pursuit, r5.pursuit]));
    if (!r1.days.concat(r2.days, r4.days).some(d => /克住了/.test(d.note || ''))) bad.push('战报里没有战术相克');
    // 五、自创战法：AI 评估，效果有上限
    callClaude = async pr => /自创的战法/.test(pr) ? { text: JSON.stringify({ ok: true, why: '田单曾用', terrain: ['平原', '丘陵'], season: [], cav: 0, rng: 0, prepDays: 3, cost: 500, mou: '', p: 99, fx: { atk: 3, def: 1.2, orgHit: 90, moraleHit: 50, casualty: 5 }, fail: { atk: 0.1, def: 0.9 }, history: '田单火牛阵' }) } : { text: '{}' };
    S.money = { cash: 2000, unit: '贯' };
    const x = await tacEval(S, '火牛阵', '夜里牛角缚刀、尾上灌油点火，驱牛冲营');
    if (!x || x.fx.atk !== 1.4 || x.fx.orgHit !== 40 || x.fx.moraleHit !== 30 || x.fx.casualty !== 1.6 || x.p !== 85 || x.fail.atk !== 0.6) bad.push('自创战法的效果没限住上限：' + JSON.stringify(x));
    callClaude = async pr => /自创的战法/.test(pr) ? { text: JSON.stringify({ ok: false, why: '五代没有火炮' }) } : { text: '{}' };
    await tacEval(S, '红夷大炮', '架炮轰城'); if (tacBookGet(S, '红夷大炮')) bad.push('这个年代做不到的战法也记成可用');
    // 条件不合：城池里用不上（只许平原、丘陵）
    if (!tacUsable(S, x, null, '城池')) bad.push('只许平原丘陵的战法在城下也说用得上');
    // 用上了：打一仗，战报写得手或没成
    S.forces = [{ name: '亲军', leader: '王审知', owner: '你', troops: '8000', at: '福州', status: '驻守', grain: '50000' }];
    const rb = resolveBattle(S, { enemy: '吴军', enemyTroops: 6000, enemyQuality: '中', place: '汀州', terrain: '平原', attacker: '我', tactic: '自创：火牛阵', ourForces: ['亲军'] });
    if (!rb || !/火牛阵」(得手|没成)/.test(rb.tacWhy || '')) bad.push('用自创战法打的仗，战报没写得手没成：' + (rb && rb.tacWhy));
    if (!rb || !arr(rb.days).length || !/第1日/.test((rb.rounds[0] || {}).nm || '')) bad.push('战报不是逐日');
    const rc = resolveBattle(S, { enemy: '吴军', enemyTroops: 6000, enemyQuality: '中', place: '建州', terrain: '城池', attacker: '我', tactic: '自创：火牛阵', ourForces: ['亲军'] });
    if (!rc || !/用不上/.test(rc.tacWhy || '')) bad.push('城下用不上的自创战法也照用了：' + (rc && rc.tacWhy));
    applyBattle(S, rb);
    return bad;
  });
  // 六、军务页真点：战法簿、请 AI 评估、出征下拉里有自创的
  await p.evaluate(() => { TAB = 'army'; VIEW = 'game'; SIDE_FOLD = false; render0(); });
  if (!(await p.$('#bTacEval'))) bad.push('军务页没有战法簿');
  await p.evaluate(() => { callClaude = async pr => /自创的战法/.test(pr) ? { text: JSON.stringify({ ok: true, why: '可行', terrain: ['山地'], season: [], cav: 0, rng: 0, prepDays: 2, cost: 100, mou: '', p: 50, fx: { atk: 1.2, def: 1, orgHit: 10, moraleHit: 5, casualty: 1.1 }, fail: { atk: 0.9, def: 0.95 }, history: '' }) } : { text: '{}' }; });
  await p.fill('#tacName', '滚木礌石'); await p.fill('#tacDesc', '山道两侧预备滚木礌石，敌过半时推下');
  await p.click('#bTacEval'); await p.waitForFunction(() => tacBookGet(S, '滚木礌石'), null, { timeout: 8000 }).catch(() => bad.push('点「请 AI 评估」没记进战法簿'));
  const opts = await p.$$eval('select[data-xtac] option', xs => xs.map(o => o.value));
  if (!opts.includes('自创：滚木礌石') || !opts.includes('自创：火牛阵')) bad.push('出征的战法里没有自创的：' + opts.join(','));
  if (!/第1日/.test(await p.evaluate(() => document.body.innerText))) bad.push('军务页的战况没逐日摆出来');
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
