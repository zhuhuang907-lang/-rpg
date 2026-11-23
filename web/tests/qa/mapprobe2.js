// 按地名库全部州府逐一判归属，列出荆南/楚/闽/南汉/吴/南唐名下所有州（找错的）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file://' + path.resolve(path.join(__dirname, '../../play.html')));
  await p.waitForFunction(() => typeof realmsAt === 'function', null, { timeout: 20000 });
  const dump = async (y) => p.evaluate((y) => {
    const G = geoData().filter(x => x.from <= y && x.to >= y && x.lat && x.type && /州|府|军|郡/.test(x.type));
    const R = realmsAt(y, 6); const out = {};
    for (const x of G) { const r = R ? R.of(x.lon, x.lat) : null; const k = r ? r.name : '（无主）'; (out[k] = out[k] || []).push(x.name); }
    return out;
  }, y);
  for (const y of [930]) {
    const o = await dump(y);
    for (const k of ['荆南', '楚', '闽', '南汉', '吴', '南唐', '吴越']) {
      const L = o[k] || [];
      console.log(y, k, L.length, '州:', L.join('、'));
    }
    // 荆南附近常错的州：看它们归谁
    const probe = ['夔州', '万州', '忠州', '施州', '黔州', '辰州', '溪州', '澧州', '郴州', '永州', '道州', '全州', '昭州', '贺州', '梧州', '柳州', '宜州', '融州', '容州', '廉州', '钦州', '雷州', '琼州', '南剑州', '剑州', '镛州', '建州', '泉州', '漳州', '汀州'];
    const R = await p.evaluate((y) => { const R = realmsAt(y, 6); const o = {}; for (const [k, v] of Object.entries(window.__P)) { const r = R ? R.of(v[0], v[1]) : null; o[k] = r ? r.name : '（无主）'; } return o; }, y);
  }
  await b.close();
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
