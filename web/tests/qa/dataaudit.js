// 930 数据底层取证：同点重名、无主州、人物重复/年岁不合、拟名未标
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof newSave === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: 930, month: 7, day: 3, place: '福州', polity: '闽' });
    S.idm = 'emperor'; S.protagonist.role = '闽王'; S.turn = 5;
    const M = mapUnits(S), R = realmsAt(930, 7);
    const names = new Set(R.list.map(x => x.name));
    // 1) 同点异名（0.04 度内两个不同州名）
    const pts = M.L2.filter(u => u.lat).map(u => ({ n: u.n, lon: +u.lon, lat: +u.lat }));
    const same = [];
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const a = pts[i], c = pts[j]; if (a.n === c.n) continue;
      if (Math.hypot((a.lon - c.lon) * Math.cos(a.lat * Math.PI / 180), a.lat - c.lat) < 0.04) same.push(a.n + ' @' + a.lon.toFixed(2) + ',' + a.lat.toFixed(2) + ' ≈ ' + c.n);
    }
    // 2) 州无主 / 归属名不在当年政权表
    const noReg = [], badReg = [];
    for (const u of M.L2) { if (!u.lat) continue; const g = M.reg(u); if (!g) noReg.push(u.n); else if (g.name && !names.has(g.name) && !/残破|叛/.test(g.name)) badReg.push(u.n + '→' + g.name); }
    // 3) 家室重复 / 年岁
    const H = arr(S.household), dupH = [], ages = [];
    const seen = new Set(); for (const m of H) { if (seen.has(m.name)) dupH.push(m.name); seen.add(m.name); }
    for (const m of H) if (m.age != null) ages.push(m.relation + ':' + m.name + '=' + m.age + (m.dead ? '(故)' : ''));
    // 4) 名臣谱重复 / 年岁
    let figs = []; try { figs = figRoster(S); } catch (_) {}
    const figN = figs.map(x => x.name), dupF = figN.filter((n, i) => figN.indexOf(n) !== i);
    // 5) 中枢差遣里拟名（src 拟）没标
    let ct = []; try { ct = (COUNCIL ? Object.keys(COUNCIL).map(k => ({ k, ...(seatHolder(S, k) || {}) })) : []); } catch (_) {}
    const fake = ct.filter(x => x.who && x.src === '拟').map(x => x.k + ':' + x.who);
    // 6) 天下名录年岁
    const roster = []; try { for (const g of (S.roster && S.roster.groups) || []) for (const x of arr(g.people)) if (x.born) roster.push(g.name + '/' + x.name + '=' + (930 - x.born + 1)); } catch (_) {}
    return { l2: M.L2.length, realms: R.list.map(x => x.name), same: same.slice(0, 20), noReg: noReg.slice(0, 20), noRegN: noReg.length, badReg: badReg.slice(0, 20), dupH, ages, dupF: [...new Set(dupF)].slice(0, 10), fake, roster: roster.slice(0, 10) };
  });
  console.log(JSON.stringify({ r, errs }, null, 1));
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
