// 规则回归测试：程序兜底的那几道检查（替主角说话、快进、含糊官职、英文、纠错识别、正文清洗、当前情况）
// 跑法：python3 web/build.py && node web/tests/rules_regress.js   （要装 playwright；Chromium 路径可用 CHROMIUM 环境变量指定）
const path = require('path');
const { chromium } = require('playwright');
const CASES = require('./rules_cases.json');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  const res = await p.evaluate(cases => cases.map(c => {
    const s = { protagonist: { name: '王二', age: 24, role: '流民' }, clock: { y: 1126, m: 1, d: 5, yearLabel: '靖康元年' }, place: { full: '开封府东水门外' }, people: {}, chat: [], goals: [], ...(c.state || {}) };
    let got;
    if (c.check === 'faults') { const f = draftFaults(s, c.said, c.text, c.span || 'auto'); got = c.expect.map(k => f.some(x => x.includes(k))); return { id: c.id, ok: c.bad ? got.every(Boolean) : f.length === 0, detail: f }; }
    if (c.check === 'fixreq') { got = isFixRequest(c.said); return { id: c.id, ok: got === c.want, detail: got }; }
    if (c.check === 'split') { const t = splitStory(c.text).text; return { id: c.id, ok: c.mustNot.every(m => !t.includes(m)) && c.must.every(m => t.includes(m)), detail: t.slice(0, 120) }; }
    if (c.check === 'paras') { const ps = autoParas(c.text); return { id: c.id, ok: ps.length >= c.min && ps.join('') === c.text.replace(/\n/g, ''), detail: ps }; }
    if (c.check === 'battle') { s.forces = JSON.parse(JSON.stringify(c.forces)); s.turn = 3; const before = N0(s.forces[0].troops); const r = resolveBattle(s, c.battle); let ok = !!r && r.outcome.includes(c.want); if (ok && c.apply) { applyBattle(s, r); ok = N0(s.forces[0].troops) === before - r.deadUs && (!r.take || arr(s.territory).some(x => x.place === r.take)) && arr(s.battles).length === 1; } return { id: c.id, ok, detail: r }; }
    if (c.check === 'modules') { const got = pickModules(c.said, null); return { id: c.id, ok: JSON.stringify(got) === JSON.stringify(c.want), detail: got }; }
    if (c.check === 'identity') { const ex = {}; autoIdentity(s, ex); return { id: c.id, ok: s.idm === c.want, detail: { idm: s.idm, ex } }; }
    if (c.check === 'cur') { const cs = curStatus(s, { presentNpcs: c.npcs }); return { id: c.id, ok: c.must.every(m => JSON.stringify(cs).includes(m)), detail: cs }; }
    return { id: c.id, ok: false, detail: '未知检查' };
  }), CASES);
  let fail = 0;
  for (const r of res) { if (!r.ok) fail++; console.log((r.ok ? '通过' : '不合格') + '  ' + r.id + (r.ok ? '' : '  ' + JSON.stringify(r.detail).slice(0, 200))); }
  if (errs.length) { console.log('页面错误', errs); fail++; }
  console.log(`共 ${res.length} 条，不合格 ${fail} 条`);
  await b.close(); process.exit(fail ? 1 : 0);
})();
