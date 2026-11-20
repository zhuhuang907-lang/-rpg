// 地图五状态（得/失/叛/空/毁）QA：图例、城点样式、详情面板、游戏效果、交互热区（2026-11-20 项目主人）
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); p.on('dialog', d => d.accept());
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
  const idle = async (ms = 240000) => { try { await p.waitForFunction(() => !BUSY && !BG && !document.querySelector('.thinking'), null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
  await p.waitForTimeout(2500);
  await p.fill('#qText', '景福二年扬州的幕僚');
  try { await p.waitForFunction(() => !document.querySelector('#bStart').disabled, null, { timeout: 90000, polling: 300 }); } catch (_) {}
  await p.click('#bStart');
  if (!(await idle())) { console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(1); }
  // —— 单元自检：状态推定、placeOwner、garrisonAt ——
  await p.evaluate(() => { S.turn = S.turn || 9; S.mapOwn = {
      润州: { owner: '你', turn: S.turn, why: '打下', st: '得' },
      江州: { owner: '镇南军', turn: S.turn, why: '丢了', st: '失' },
      宣州: { owner: '宁国叛军', turn: S.turn, why: '宁国叛军据城', st: '叛' },
      苏州: { owner: '你', turn: (S.turn || 9) - 3, why: '强攻破城，城残毁', st: '毁' } }; });
  const unit = await p.evaluate(() => ({
    st: ['润州', '江州', '宣州', '苏州'].map(k => (mapStateOf(S, geoStem(k)) || {}).st).join(','),
    旧条: (mapStateOf(S, geoStem('常州')) || {}).st || '无',
    owner毁: placeOwner(S, '苏州'), owner叛: placeOwner(S, '宣州'), garrison毁: garrisonAt(S, '苏州'),
    落款: ST_NAME['毁'] === '残破被毁' }));
  await p.evaluate(() => { S.mapOwn['常州'] = { owner: '吴', turn: 2, why: '城破' }; });
  unit.旧条 = await p.evaluate(() => (mapStateOf(S, geoStem('常州')) || {}).st || '无');
  const ok1 = unit.st === '得,失,叛,毁' && unit.旧条 === '失' && unit.owner毁.st === '毁' && unit.owner毁.mine === false
    && unit.owner叛.st === '叛' && unit.garrison毁.troops === 0 && unit.落款;
  // —— 打开舆图：图例、城点状态样式 ——
  await p.evaluate(() => { TAB = 'map'; render(); });
  await p.waitForTimeout(800);
  const svg = await p.evaluate(() => (document.querySelector('svg.smap') || {}).outerHTML || '');
  const body = await p.evaluate(() => document.body.innerHTML);
  const ok2 = /◎ 这一回你攻占/.test(body) && /◎ 这一回失陷/.test(body) && /◎ 叛乱中/.test(body) && /◌ 无人占领/.test(body) && /✕ 残破被毁/.test(body);
  // —— 点残城：详情面板状态行＋修葺按钮（城池治理是君主的事，先升级） ——
  await p.evaluate(() => { S.idm = 'emperor'; S.protagonist.role = '皇帝'; });
  const panel = await p.evaluate(() => { MAPZ.sel = '苏州'; render(); return [...document.querySelectorAll('.affair')].map(e => e.innerHTML).join('|'); });
  const ok3 = /残破被毁/.test(panel) && /修葺重建/.test(panel) && /户口离散/.test(panel);
  // —— 点叛城：叛乱状态行 ——
  const panel2 = await p.evaluate(() => { MAPZ.sel = '宣州'; render(); return [...document.querySelectorAll('.affair')].map(e => e.innerHTML).join('|'); });
  const ok4 = /叛乱/.test(panel2) && /讨平或招抚/.test(panel2);
  // —— cityDo：残城开发被拦、修葺放行；月结完工 → 毁 复 得 ——
  const cd = await p.evaluate(() => {
    S.idm = 'emperor'; S.protagonist.role = '皇帝';   // 城池治理是君主的事，测试主角升级
    S.territory = (S.territory || []).concat([{ place: '苏州', pop: 100000, troops: 500, grain: 1000, loyalty: 40 }]);
    S.cities = S.cities || {};
    const r1 = cityDo(S, '苏州', 'nong', ''); const m1 = ORGMSG;
    const r2 = cityDo(S, '苏州', 'rebuild', ''); const m2 = ORGMSG;
    const mo = mapStateOf(S, geoStem('苏州')); const before = mo.st;
    if (((S.cities || {})['苏州'] || {}).pend) S.cities['苏州'].pend.forEach(x => { x.at = Math.floor(ymOf(S.clock)); });
    cityMonthly(S, 1); const after = mapStateOf(S, geoStem('苏州')).st;
    return { r1, m1, r2, m2, before, after, r2done: !!((S.cities || {})['苏州'] || {}).pend };
  });
  const ok5 = cd.r1 == null && /残破/.test(cd.m1) && (cd.r2 != null || /钱不够/.test(cd.m2)) && cd.before === '毁' && cd.after === '得';
  // —— 交互热区：非省图的城点带透明可点圈（世界图也点得中） ——
  await p.evaluate(() => { MAPZ.mode = 'world'; MAPZ.sel = ''; render(); });
  await p.waitForTimeout(500);
  let svg2 = ''; for (let i = 0; i < 8 && !svg2.includes('data-mapu'); i++) { await p.waitForTimeout(400); svg2 = await p.evaluate(() => (document.querySelector('svg.smap') || {}).outerHTML || ''); }
  const ok6 = /data-mapu/.test(svg2) && /fill="transparent"/.test(svg2);
  console.log(JSON.stringify({ ok1, ok2, ok3, ok4, ok5, ok6, unit, cd, errs: errs.slice(0, 5) }, null, 1));
  await b.close();
  process.exit(ok1 && ok2 && ok3 && ok4 && ok5 && ok6 && !errs.length ? 0 : 1);
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
