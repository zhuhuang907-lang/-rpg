// 全年代逐州体检（步长 5 年，900-980 逐年）：零州的中国政权、同点异名、无主州、归属名不在表
const { chromium } = require('playwright');
const PLAY = 'C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  await p.goto('file://' + PLAY);
  await p.waitForFunction(() => typeof newSave === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    const REMOTE = /于阗|高昌|龟兹|疏勒|莎车|楼兰|鄯善|车师|焉耆|乌孙|大宛|康居|大月氏|安息|条支|奄蔡|匈奴|鲜卑|乌桓|夫余|高句丽|三韩|新罗|百济|倭|日本|琉球|流求|林邑|占城|扶南|真腊|骠|蒲甘|吐蕃|吐谷浑|柔然|高车|夫余|薛延陀|居延诸部|突厥|回纥|回鹘|黠戛斯|渤海|契丹|奚|室韦|靺鞨|女真|蒙古|阻卜|瓦剌|鞑靼|察合台|察哈尔|喀喇汗|牂牁|土司诸部|叶尔羌|准噶尔|和硕特|喀尔喀|哈萨克|浩罕|俄罗斯|朝鲜|越南|安南|大越|大瞿越|暹罗|缅甸|大理|南诏|大义宁|大长和|高丽/;
    const years = [];
    for (let y = -221; y <= 1911; y += 5) years.push(y);
    for (let y = 900; y <= 980; y++) years.push(y);
    years.sort((a, b) => a - b);
    const zero = [], same = [], noReg = [], badReg = [], dup = [];
    for (const y of years) {
      S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: y, month: 6, day: 1, place: '洛阳', polity: '唐' });
      const R = realmsAt(y, 6), M = mapUnits(S); if (!R) continue;
      const names = new Set(R.list.map(x => x.name)), cnt = {}, pts = [];
      for (const u of M.L2) { if (!u.lat) continue; const g = M.reg(u); if (!g) { noReg.push(y + ':' + u.n); continue; } cnt[g.name] = (cnt[g.name] || 0) + 1; if (g.name && !names.has(g.name) && !/残破|叛军/.test(g.name)) badReg.push(y + ':' + u.n + '→' + g.name); pts.push({ n: u.n, lon: +u.lon, lat: +u.lat }); }
      for (const n of names) if (!cnt[n] && !REMOTE.test(n)) zero.push(y + ':' + n);
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) { const a = pts[i], c = pts[j]; if (a.n === c.n) continue; if (Math.hypot((a.lon - c.lon) * Math.cos(a.lat * Math.PI / 180), a.lat - c.lat) < 0.03) same.push(y + ':' + a.n + '≈' + c.n); }
      const root = n => realmShort(n, y), by = {};
      for (const n of names) (by[root(n)] = by[root(n)] || []).push(n);
      for (const [k, L] of Object.entries(by)) if (L.length > 1) dup.push(y + ':' + L.join('/'));
    }
    return { years: years.length, zero: [...new Set(zero)].slice(0, 120), zeroN: zero.length, same: [...new Set(same)].slice(0, 40), sameN: same.length, noReg: [...new Set(noReg)].slice(0, 40), noRegN: noReg.length, badReg: [...new Set(badReg)].slice(0, 40), badRegN: badReg.length, dup: [...new Set(dup)].slice(0, 60) };
  });
  console.log(JSON.stringify({ r, errs }, null, 1).slice(0, 8000));
  await b.close();
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
