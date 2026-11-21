// R-268：真人不改名——人事树上「拟」字号位子坐着史书真人、核过查无此人的真人、档案里的真人，查重名时一概不改；审稿把真人名字改成别的名字不照改；程序自己起的名字撞了名人照旧改
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof fictionClash === 'function');
  const r = await p.evaluate(async () => { const s = newSave({ name: '马希范', gender: '男', age: 27, role: '武安军节度判官', gregorianYear: 925, month: 9, day: 15, place: '长沙', polity: '楚' }); s.protagonist.real = true; S = s;
    s.org = { nodes: [{ name: '天策府', posts: [{ title: '学士', holder: '高郁', src: '拟' }, { title: '学士', holder: '拓跋恒', src: '拟' }] }] };
    s.people = { 高郁: { role: '楚国谋臣' }, 拓跋恒: { role: '天策府学士' }, 周彦: { role: '押司' } };
    s.dossiers = { 拓跋恒: { real: true, identity: '楚臣' } };
    s.personChk = { '周彦|': { real: false, at: 1 } };
    let out = []; try { out = await fictionClash(s); } catch (e) { out = ['ERR ' + e.message]; }
    const fx = applyFixes('天策府学士高郁进见，拓跋恒随后。', [{ wrong: '高郁进见', right: '廖匡图进见' }, { wrong: '随后。', right: '随后入内。' }]);
    return { out, names: Object.keys(s.people), fx: fx.text }; });
  const bad = [];
  if (r.out.length) bad.push('真人被改了名：' + r.out.join('；'));
  if (!['高郁', '拓跋恒'].every(n => r.names.includes(n))) bad.push('人物表里的真人名字没了：' + r.names.join('、'));
  if (!/高郁进见/.test(r.fx)) bad.push('审稿把真人高郁改成了别人：' + r.fx);
  if (!/随后入内/.test(r.fx)) bad.push('不涉及真人名字的改字也不照改了：' + r.fx);
  if (errs.length) bad.push(...errs);
  console.log('ERRS', JSON.stringify(bad)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
