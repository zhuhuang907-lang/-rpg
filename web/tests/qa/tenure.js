// 任职年表（任务六，R-225）：开发时从哈佛库整理的晚明任职表打进游戏；开在明朝时，朝堂照表先坐位子（户部尚书照表是谁就是谁），
// 别的政权（后金）不套明朝的表；整朝堂表以后照表坐的人进朝堂全表、朝局页看得见
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1400 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof courtFullDS === 'function');
  const out = await p.evaluate(async () => {
    const bad = [];
    if (!TENURE.some(t => t.polity === '明' && t.range[0] <= 1625 && t.range[1] >= 1625)) return ['游戏里没有晚明任职年表'];
    S = newSave({ name: '某甲', gender: '男', age: 40, role: '翰林院编修', gregorianYear: 1625, month: 6, day: 1, place: '北京', polity: '明' }); S.chat = [{ role: 'gm', text: '开场。' }];
    const n1625 = tenureFor(S, 1625).reduce((k, t) => k + arr(t.figures).filter(f => { const st = figState(S, f, 1625, 6); return st.state === 'alive' && st.post; }).length, 0);
    if (n1625 < 150) bad.push('1625 年照表在任的只有 ' + n1625 + ' 人');
    const want = (() => { for (const t of tenureFor(S, 1625)) for (const f of arr(t.figures)) { const st = figState(S, f, 1625, 6); if (st.state === 'alive' && st.post === '户部尚书') return f.name; } return ''; })();
    if (!want) return bad.concat('表上 1625 年找不到户部尚书');
    S.org = { nodes: [{ id: 'root', name: '朝廷', depth: 0, posts: [{ title: '皇帝', holder: '朱由校' }] },
      { id: 'H1', name: '户部', depth: 1, parent: 'root', posts: [{ title: '尚书', rank: '正二品', holder: '钱虚拟', src: '拟' }] }] };
    const oc = callClaude; callClaude = async pr => /朝廷里的要紧人物列成一整张表/.test(pr) ? { text: JSON.stringify({ people: [{ name: '赵虚生', post: '户部尚书', organ: '户部', real: '真' }], factions: [] }) } : { text: '{}' };
    try { await courtFullDS(S); } finally { callClaude = oc; }
    const q = S.org.nodes.find(z => z.name === '户部').posts[0];
    if (q.holder !== want) bad.push('户部尚书没照表坐' + want + '：' + JSON.stringify(q));
    if (!(S.court.people || []).some(x => x.name === want)) bad.push('照表坐的' + want + '没进朝堂全表');
    const s2 = newSave({ name: '某乙', gender: '男', age: 30, role: '牛录额真', gregorianYear: 1625, month: 6, day: 1, place: '辽阳', polity: '后金' });
    if (tenureFor(s2, 1625).length) bad.push('后金也套了明朝的任职表');
    window.__want = want; return bad;
  });
  errs.push(...out);
  await p.evaluate(() => { VIEW = 'game'; TAB = 'court'; SIDE_FOLD = false; render0(); });
  const want = await p.evaluate(() => window.__want || ''); const h = await p.evaluate(() => document.body.innerText);
  if (want && (!/朝堂全表/.test(h) || !h.includes(want))) errs.push('朝局页没摆出照表坐的' + want);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
