// 任务七：朝堂照五代十国朝廷数据排——真人优先、种子补人、模型不可夺位、人物页来路（真点）
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); p.on('dialog', d => d.accept());
  const GP = process.env.GAME_PORT || 8768;
  const bad = [];
  await p.goto('http://127.0.0.1:' + GP + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  const idle = async (ms = 300000) => { try { await p.waitForFunction(() => !BUSY && !BG && !document.querySelector('.thinking'), null, { timeout: ms, polling: 300 }); return true; } catch (_) { return false; } };

  // 开局：长兴元年（930）后唐的节度使
  await p.fill('#qText', '长兴元年后唐的节度使'); await p.click('#bStart');
  if (!(await idle()) || !(await p.$('#said'))) { bad.push('开局没出来'); console.log('ERRS', JSON.stringify(bad)); await b.close(); process.exit(1); }
  // 校正到 930 年后唐，重建朝堂
  await p.evaluate(async () => { ORGING = false; S.clock.y = 930; S.clock.yearLabel = '长兴元年'; S.place.polity = '后唐'; S.place.full = '洛阳'; S.org = null; try { await buildOrg(S); } catch (e) { /* ignore */ } });
  await p.waitForTimeout(1000);

  const r1 = await p.evaluate(() => ({
    pol: S.place.polity,
    dataCourt: !!(S.org || {}).dataCourt,
    treeNames: S.org ? S.org.nodes.flatMap(n => n.posts.flatMap(q => [q.holder].concat(q.others || []))).filter(Boolean) : [],
    fillN: Object.keys(S.courtFill || {}).length,
    dataPeople: (COURT_LIB.people || []).filter(p => (p.posts || []).some(x => x.polity === '后唐' && x.from <= 930 && 930 <= x.to)).map(p => p.name)
  }));
  console.log('OPEN', JSON.stringify(r1));
  if (!r1.dataCourt) bad.push('后唐朝堂没照数据排');
  // 真人在原位
  for (const n of r1.dataPeople) if (!r1.treeNames.includes(n)) bad.push('930 在任真人没上朝堂：' + n);
  if (r1.dataPeople.length < 3) bad.push('930 在任真人太少：' + r1.dataPeople.length);
  // 位子都有人（或标史阙）
  const seats = await p.evaluate(() => { const out = []; for (const n of S.org.nodes) for (const q of n.posts) if (q.dataId) out.push({ id: q.dataId, holder: q.holder || '', noFill: !!(q.dataId && !q.holder) }); return out; });
  // 模型不可夺位
  const locked = await p.evaluate(() => { const q = (() => { for (const n of S.org.nodes) for (const p of n.posts) if (p.dataLock && p.holder) return { n, p }; return null; })(); if (!q) return { same: false, why: 'no locked seat' }; const old = q.p.holder; applyOrgResults(S, { orgResults: [{ office: q.n.name + q.p.title, person: '外来试官', result: '到任', why: '模型乱改' }] }); return { old, now: q.p.holder, same: q.p.holder === old }; });
  if (!locked.same) bad.push('模型改了数据位子：' + JSON.stringify(locked));

  // 真点：推定任职的人 → 来路
  await p.click('[data-tab="people"]'); await p.waitForTimeout(600);
  const tuidName = await p.evaluate(() => { for (const [k, v] of Object.entries(S.courtFill || {})) if (v.how === '虚构') return k; return null; });
  // 冯道是推定任职（数据 how=推定）
  const provTui = await p.evaluate(() => { const c = Array.from(document.querySelectorAll('.pc')).find(c => c.innerText.includes('冯道')); return c && /照履历推定/.test(c.innerText); });
  if (!provTui) bad.push('推定任职的人物页没写「照履历推定」');
  // 虚构补的人 → 来路
  if (tuidName) {
    const provXu = await p.evaluate(n => { const c = Array.from(document.querySelectorAll('.pc')).find(c => c.innerText.includes(n)); return c && /虚构（史书未载，照该国用人惯例补）/.test(c.innerText); }, tuidName);
    if (!provXu) bad.push('虚构补的人物页没写「虚构（史书未载，照该国用人惯例补）」');
  } else bad.push('没有虚构补的人');

  // 种子确定性：同一政权+位子，两次重建，同名同籍贯
  const fillPair = await p.evaluate(() => {
    const snap1 = JSON.stringify(Object.entries(S.courtFill || {}).filter(([, v]) => v.how === '虚构').map(([k, v]) => k + '|' + (v.native || '')).sort());
    S.courtFill = {}; S.people = {}; S.org = null;
    buildOrgFromData(S, wudaiCourtFor(S));
    const snap2 = JSON.stringify(Object.entries(S.courtFill || {}).filter(([, v]) => v.how === '虚构').map(([k, v]) => k + '|' + (v.native || '')).sort());
    return { snap1, snap2, same: snap1 === snap2 };
  });
  if (!fillPair.same) bad.push('种子补人不稳定');

  // 荆南 930：小国
  await p.evaluate(async () => { S.clock.y = 930; S.place.polity = '荆南'; S.place.full = '江陵'; S.org = null; S.courtFill = {}; S.people = {}; try { await buildOrg(S); } catch (e) { /* ignore */ } });
  await p.waitForTimeout(500);
  const jn = await p.evaluate(() => { const wc = wudaiCourtFor(S); return { pol: S.place.polity, grade: wc && wc.grade, activeSeats: wc ? wc.seats.filter(s => S.clock.y >= s.from && S.clock.y <= s.to).length : 0, filled: S.org ? S.org.nodes.reduce((a, n) => a + n.posts.filter(q => q.holder).length, 0) : 0 }; });
  console.log('JINGNAN', JSON.stringify(jn));
  if (jn.pol !== '荆南') bad.push('荆南没认出');
  if (jn.grade !== '薄') bad.push('荆南厚薄没读');
  if (jn.seats > 0 && jn.filled < jn.seats) bad.push('荆南位子没填满：' + jn.filled + '/' + jn.seats);

  console.log('ERRS', JSON.stringify([...errs, ...bad]));
  await b.close(); process.exit(errs.length || bad.length ? 1 : 0);
})();
