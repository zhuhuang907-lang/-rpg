// 官员名录也照任职年表、朝廷数据（Claude 自办 4，R-225/R-227）：明 1625 年，表上的户部尚书进名录（本朝那一组）；荆南 926 年，高季兴、高从诲进名录；
// 模型一个人都不给也照样有；真点人物页看得到
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1400 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof buildRoster === 'function');
  const out = await p.evaluate(async () => {
    const bad = [];
    callClaude = async () => ({ text: JSON.stringify({ realms: [] }) }); BOCHA_KEY = ''; MODE = 'none';
    const mk = (pol, y, place) => { const s = newSave({ name: '某甲', gender: '男', age: 40, role: '郎官', gregorianYear: y, month: 6, day: 1, place, polity: pol }); s.chat = [{ role: 'gm', text: '开场。' }]; return s; };
    const has = (s, n) => arr(s.roster && s.roster.groups).some(g => g.people.some(x => x.name === n));
    const s1 = mk('明', 1625, '北京'); await buildRoster(s1);
    const want = (() => { for (const t of tenureFor(s1, 1625)) for (const f of arr(t.figures)) { const st = figState(s1, f, 1625, 6); if (st.state === 'alive' && st.post === '户部尚书') return f.name; } return ''; })();
    if (!want) bad.push('表上 1625 年找不到户部尚书'); else if (!has(s1, want)) bad.push('名录里没有表上的户部尚书' + want);
    const s2 = mk('荆南', 926, '江陵'); await buildRoster(s2);
    for (const n of ['高季兴', '高从诲']) if (!has(s2, n)) bad.push('荆南名录里没有' + n);
    S = s1; window.__want = want; return bad;
  });
  errs.push(...out);
  await p.evaluate(() => { VIEW = 'game'; TAB = 'board'; SIDE_FOLD = false; render0(); });
  const tb = await p.$$('[data-tab="people"]'); if (!tb.length) errs.push('找不到人物页标签'); else { await tb[0].click(); await p.waitForTimeout(150); }
  const want = await p.evaluate(() => window.__want || ''), h = await p.evaluate(() => document.body.innerText);
  if (want && !h.includes(want)) errs.push('人物页的名录里看不到' + want);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
