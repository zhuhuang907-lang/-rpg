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
  // 页面脚本跑完、程序兜底的检查函数都在了再测（CI 上偶尔页面还没跑完就开测，报「draftFaults 未定义」）
  try { await p.waitForFunction(() => typeof draftFaults === 'function', null, { timeout: 30000 }); }
  catch (_) { console.log('页面脚本没跑起来：', JSON.stringify(errs)); await b.close(); process.exit(1); }
  const res = await p.evaluate(cases => cases.map(c => {
    const s = { protagonist: { name: '王二', age: 24, role: '流民' }, clock: { y: 1126, m: 1, d: 5, yearLabel: '靖康元年' }, place: { full: '开封府东水门外' }, people: {}, chat: [], goals: [], ...(c.state || {}) };
    let got;
    if (c.check === 'faults') { const f = draftFaults(s, c.said, c.text, c.span || 'auto'); got = c.expect.map(k => f.some(x => x.includes(k))); return { id: c.id, ok: c.bad ? got.every(Boolean) : f.length === 0, detail: f }; }
    if (c.check === 'talk') { const t = cleanTalk(c.text); return { id: c.id, ok: c.must.every(m => t.includes(m)) && c.mustNot.every(m => !t.includes(m)), detail: t }; }
    if (c.check === 'fixreq') { got = isFixRequest(c.said); return { id: c.id, ok: got === c.want, detail: got }; }
    if (c.check === 'split') { const t = splitStory(c.text).text; return { id: c.id, ok: c.mustNot.every(m => !t.includes(m)) && c.must.every(m => t.includes(m)), detail: t.slice(0, 120) }; }
    if (c.check === 'paras') { const ps = autoParas(c.text); return { id: c.id, ok: ps.length >= c.min && ps.join('') === c.text.replace(/\n/g, ''), detail: ps }; }
    if (c.check === 'battlevirtual') { s.forces = JSON.parse(JSON.stringify(c.forces || [])); s.turn = 3; const sig = JSON.stringify(s.forces); const r = resolveBattle(s, c.battle); let ok = !!r && r.virtual && r.ours === c.battle.ourTroops; if (ok) { applyBattle(s, r); ok = JSON.stringify(s.forces) === sig && arr(s.battles).length === 1; } return { id: c.id, ok, detail: r }; }
    if (c.check === 'doubts') { Object.assign(s, JSON.parse(JSON.stringify(c.state))); const d = dataDoubts(s); return { id: c.id, ok: c.want.every(k => d.some(x => x.includes(k))) && (c.want.length || d.length === 0), detail: d }; }
    if (c.check === 'battle') { s.forces = JSON.parse(JSON.stringify(c.forces)); s.turn = 3; const before = N0(s.forces[0].troops); const r = resolveBattle(s, c.battle); let ok = !!r && r.outcome.includes(c.want); if (ok && c.apply) { applyBattle(s, r); ok = N0(s.forces[0].troops) === before - r.deadUs && (!r.take || arr(s.territory).some(x => x.place === r.take)) && arr(s.battles).length === 1; } return { id: c.id, ok, detail: r }; }
    if (c.check === 'modules') { const got = pickModules(c.said, null); return { id: c.id, ok: JSON.stringify(got) === JSON.stringify(c.want), detail: got }; }
    if (c.check === 'identity') { const ex = {}; autoIdentity(s, ex); return { id: c.id, ok: s.idm === c.want && (!c.roleHas || s.protagonist.role.includes(c.roleHas)), detail: { idm: s.idm, role: s.protagonist.role, ex } }; }
    if (c.check === 'cur') { const cs = curStatus(s, { presentNpcs: c.npcs }); return { id: c.id, ok: c.must.every(m => JSON.stringify(cs).includes(m)), detail: cs }; }
    if (c.check === 'anachro') { const s2 = { ...s, clock: { ...s.clock, y: c.year } }; const got = anachronisms(s2, c.text); return { id: c.id, ok: (c.want || []).every(k => got.some(x => x.includes(k))) && (c.wantNot || []).every(k => !got.some(x => x.includes(k))), detail: got }; }
    if (c.check === 'intrigue') { if (c.state) Object.assign(s, JSON.parse(JSON.stringify(c.state))); s.people = s.people || {}; const r = applyIntrigues(s, c.acts); const blob = JSON.stringify({ r, people: s.people, npcLog: s.npcLog, chronicle: s.chronicle }); return { id: c.id, ok: (c.want || []).every(k => blob.includes(k)) && (c.wantNot || []).every(k => !blob.includes(k)), detail: blob.slice(0, 240) }; }
    if (c.check === 'memo') { if (c.state) Object.assign(s, JSON.parse(JSON.stringify(c.state))); memoAct(s, c.mid, c.v); const m = arr(s.memos).find(x => x.id === c.mid); const blob = JSON.stringify({ m, people: s.people }); return { id: c.id, ok: (c.want || []).every(k => blob.includes(k)) && (c.wantNot || []).every(k => !blob.includes(k)), detail: blob.slice(0, 240) }; }
    if (c.check === 'law') { if (c.state) Object.assign(s, JSON.parse(JSON.stringify(c.state))); lawSet(s, c.k, c.v); return { id: c.id, ok: !!(s.laws && s.laws[c.k] === c.want), detail: s.laws }; }
    if (c.check === 'claim') { if (c.state) Object.assign(s, JSON.parse(JSON.stringify(c.state))); claimAdd(s, c.who); const cb = warCBs(s, c.who); return { id: c.id, ok: arr(s.claims).some(x => x.owner === c.who) && cb.includes('法理'), detail: { claims: s.claims, cb } }; }
    if (c.check === 'memory') { if (c.state) Object.assign(s, JSON.parse(JSON.stringify(c.state))); s.chat = Array.from({ length: 35 }, (_, i) => ({ when: '第' + (i + 1) + '回', who: 'GM', text: '旧事' + i + '：答应过某人一件事。' })); shrink(s); const left = arr(s.chat).filter(x => x.text).length; return { id: c.id, ok: arr(s.memoryCore).length > 0 && left <= 30, detail: { mc: arr(s.memoryCore).length, left } }; }
    if (c.check === 'council') { if (c.state) Object.assign(s, JSON.parse(JSON.stringify(c.state))); const out = councilMonthly(s); const blob = JSON.stringify({ out, factions: s.factions, intrigueLog: s.intrigueLog }); return { id: c.id, ok: (c.want || []).every(k => blob.includes(k)) && (c.wantNot || []).every(k => !blob.includes(k)), detail: blob.slice(0, 240) }; }
    if (c.check === 'policyfx') { if (c.state) Object.assign(s, JSON.parse(JSON.stringify(c.state))); const g0 = { ...((s.gov || {}).stats || {}) }; reformMonthly(s); const G = (s.gov || {}).stats || {}, moved = Object.keys(g0).filter(k => G[k] !== g0[k]); return { id: c.id, ok: (c.want || []).every(k => moved.includes(k)), detail: { moved } }; }
    return { id: c.id, ok: false, detail: '未知检查' };
  }), CASES);
  let fail = 0;
  for (const r of res) { if (!r.ok) fail++; console.log((r.ok ? '通过' : '不合格') + '  ' + r.id + (r.ok ? '' : '  ' + JSON.stringify(r.detail).slice(0, 200))); }
  if (errs.length) { console.log('页面错误', errs); fail++; }
  console.log(`共 ${res.length} 条，不合格 ${fail} 条`);
  await b.close(); process.exit(fail ? 1 : 0);
})();
