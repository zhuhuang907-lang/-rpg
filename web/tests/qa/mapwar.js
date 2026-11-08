// 地图和打仗连在一起（需求台账 R-154；2026-11-08 玩家：「你这个地图真的可以进行战争模拟吗？地图和战争模拟需要高度的」）
// 行军照舆图路网走（过关、渡河、山路慢）；图上兵马沿路一天天挪、画出走过和没走的路线；关上有敌军先在关下打（关隘地形），打不下停在关前；
// 交战地形照高程（秦岭是山地、华北是平原）；敌军也照路网走、在图上挪；军务页真点「移驻」下令
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof warRoute === 'function');
  const bad = [], ev = f => p.evaluate(f);
  const setup = () => ev(() => { S = newSave({ name: '李世民', gender: '男', age: 30, role: '皇帝', real: true, gregorianYear: 630, month: 6, day: 1, place: '长安', polity: '唐' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3;
    S.forces = [{ name: '左卫军', owner: '你', leader: '李靖', troops: 3000, quality: '中', at: '长安', status: '驻扎', morale: 70 }]; S.campaigns = []; VIEW = 'game'; TAB = 'map'; SIDE_FOLD = false; MAPZ.inited = false; render(); });
  // 路线照路网：长安到洛阳过潼关；长安到成都过剑门关、有山路，比平路慢得多
  { await setup(); const r = await ev(() => { const a = warRoute(S, '长安', '洛阳'), c = warRoute(S, '长安', '成都'); return { a: a && { g: a.gates, li: a.li, eff: a.eff, n: a.pts.map(x => x.n) }, c: c && { g: c.gates, li: c.li, eff: c.eff, k: c.legs.map(l => l.k) }, st: campLi(S, '长安', '洛阳') }; });
    if (!r.a || !r.a.g.includes('潼关')) bad.push('长安到洛阳的路线没过潼关：' + JSON.stringify(r.a));
    if (r.a && r.a.n.some(n => /郡$|路$|尹$|翊$/.test(n))) bad.push('沿路地名串了别的朝代：' + r.a.n.join('→'));
    if (!r.c || !r.c.g.includes('剑门关') || !r.c.k.includes(2) || !(r.c.eff > r.c.li * 1.3)) bad.push('长安到成都没走蜀道（剑门关、山路慢）：' + JSON.stringify(r.c)); }
  // 地形照高程
  { const t = await ev(() => [terrainAt({ lon: 107.5, lat: 33.8 }), terrainAt({ lon: 116, lat: 37 })]); if (t[0] !== '山地' || t[1] !== '平原') bad.push('地形没照高程：秦岭' + t[0] + '、华北' + t[1]); }
  // 军务页真点「移驻」下令 → 开拔照路线走，图上画路线，兵马沿路挪
  { await setup(); await ev(() => { TAB = 'army'; render(); });
    const sel = await ev(() => { const bt = [...document.querySelectorAll('[data-army="go"][data-mode="守"]')].find(x => x.dataset.f === '左卫军'); return !!bt; });
    if (!sel) bad.push('军务页没有左卫军的「移驻」按钮');
    else { await ev(() => { const i = document.querySelector(`[data-xtg="左卫军"]`); if (i) { if (i.tagName === "SELECT" && ![...i.options].some(o => o.value === "洛阳")) i.add(new Option("洛阳", "洛阳")); i.value = "洛阳"; } });
      await p.click('[data-army="go"][data-mode="守"][data-f="左卫军"]'); await p.waitForTimeout(150); }
    let c = await ev(() => arr(S.campaigns).find(c => c.force === '左卫军'));
    if (!c) { await ev(() => armyAct(S, 'march', { force: '左卫军', target: '洛阳', mode: '守' })); c = await ev(() => arr(S.campaigns).find(c => c.force === '左卫军')); }
    if (!c) bad.push('下了移驻的令没有行军');
    else { const r = await ev(() => { S.turn++; const n = campaignTick(S, 0), c = S.campaigns.find(c => c.force === '左卫军'); return { n, st: c.state, route: !!c.route, li: c.li }; });
      if (r.st !== '行军' || !r.route) bad.push('开拔没照路线：' + JSON.stringify(r)); if (!/潼关/.test(r.n.join())) bad.push('开拔的军报没写过潼关：' + r.n.join('；'));
      const m = await ev(() => { campaignTick(S, 6); const c = S.campaigns.find(c => c.force === '左卫军'), f = S.forces[0]; TAB = 'map'; MAPZ.mode = 'near'; MAPZ.c = { lon: 110, lat: 34.5 }; MAPZ.span = 3; MAPC.k = ''; render(); const sv = document.querySelector('.smap'); return { pos: c.pos, at: f.at, done: c.done, wr: sv ? sv.querySelectorAll('polyline.wroute').length : 0 }; });
      if (!m.pos || m.at === '长安') bad.push('走了六天兵马还在长安：' + JSON.stringify(m)); if (m.wr < 2) bad.push('图上没画行军路线（走过的实线、没走的虚线）'); } }
  // 关上有敌军：先在关下打（关隘地形），打不下停在关前
  { await setup(); const r = await ev(() => { S.forces.push({ name: '郑军', owner: '郑', leader: '', troops: 40000, quality: '精', at: '潼关', status: '驻守', foe: true }); armyAct(S, 'march', { force: '左卫军', target: '洛阳', mode: '守' }); S.turn++; campaignTick(S, 0);
      let n = []; for (let i = 0; i < 8; i++) { n = n.concat(campaignTick(S, 3)); const c = S.campaigns.find(c => c.force === '左卫军'); if (c.state !== '行军') break; }
      const c = S.campaigns.find(c => c.force === '左卫军'), bt = arr(S.battles).slice(-1)[0] || {}; return { st: c.state, at: S.forces[0].at, n: n.join('；'), terr: (S.lastCampBattle || {}).terrain || bt.terrain }; });
    if (!/潼关/.test(r.n) || !/关下/.test(r.n)) bad.push('关上有敌军，没在关下打：' + r.n.slice(0, 300));
    if (r.st !== '受阻' || /洛/.test(r.at)) bad.push('三千人攻四万人把守的潼关，没被挡在关前：' + JSON.stringify({ st: r.st, at: r.at }));
    if (r.terr && r.terr !== '关隘') bad.push('关下这一仗地形不是关隘：' + r.terr); }
  // 敌军也照路网走，图上挪
  { await setup(); const r = await ev(() => { S.wars = [{ with: '郑', state: '交战', since: 1, won: 0, lost: 0, took: [] }]; S.forces.push({ name: '郑军', owner: '郑', leader: '', troops: 5000, quality: '中', at: '洛阳', status: '行军', foe: true, march: { from: '洛阳', to: '长安', li: 800, done: 0, pace: 35 } });
      foeMarchTick(S, 5); const g = S.forces.find(x => x.name === '郑军'); return { route: !!(g.march && g.march.route), pos: g.wrPos, gates: g.march && g.march.route ? g.march.route.gates : [] }; });
    if (!r.route || !r.pos) bad.push('敌军没照路网走：' + JSON.stringify(r)); if (!r.gates.includes('潼关')) bad.push('敌军从洛阳打长安没过潼关：' + JSON.stringify(r.gates)); }
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
