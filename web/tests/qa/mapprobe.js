// 五代十国地图归属探针：列出关键州府在 930/940 年归谁（内置锚点与江山时序两种情形）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file://' + path.resolve(path.join(__dirname, '../../play.html')));
  await p.waitForFunction(() => typeof realmsAt === 'function', null, { timeout: 20000 });
  const probe = async (y, js) => {
    return await p.evaluate(([y, disableJS]) => {
      if (disableJS) { window.JSMAP = null; }
      const pts = {
        江陵: [112.19, 30.35], 归州: [110.69, 31.0], 峡州: [111.29, 30.7], 潭州: [112.98, 28.2], 朗州: [111.69, 29.03],
        岳州: [113.1, 29.37], 桂州: [110.29, 25.28], 邕州: [108.31, 22.79], 洪州: [115.9, 28.67], 江州: [116.0, 29.7],
        福州: [119.3, 26.08], 建州: [118.32, 27.04], 泉州: [118.59, 24.91], 漳州: [117.65, 24.51], 汀州: [116.35, 25.83],
        广州: [113.26, 23.13], 桂阳: [112.73, 25.73], 杭州: [120.17, 30.29], 越州: [120.58, 30.0], 扬州: [119.44, 32.39],
        金陵: [118.78, 32.05], 成都: [104.07, 30.66], 兴元: [107.03, 33.07], 凤翔: [107.39, 34.52], 太原: [112.55, 37.87],
        开封: [114.35, 34.79], 洛阳: [112.45, 34.62], 魏州: [115.3, 36.34], 镇州: [114.5, 38.15], 幽州: [116.4, 39.9],
      };
      const R = realmsAt(y, 6); const out = {};
      for (const [k, v] of Object.entries(pts)) { const r = R ? R.of(v[0], v[1]) : null; out[k] = r ? r.name : '（无主）'; }
      return { js: !!(window.JSMAP), list: R ? R.list.map(x => x.name) : [], out };
    }, [y, js]);
  };
  for (const y of [930, 940]) {
    const a = await probe(y, true);
    console.log(y, '内置:', JSON.stringify(a.out));
    console.log(y, '名单:', JSON.stringify(a.list));
  }
  await b.close();
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
