// 查 930 图上各家色值、几个州的归属与 SVG 填色是否一致
const { chromium } = require('playwright');
const PLAY = 'C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  await p.goto('file:///' + PLAY);
  await p.waitForFunction(() => typeof mapUnits === 'function', null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    S = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: 930, month: 6, day: 1, place: '福州', polity: '闽' });
    S.idm = 'emperor'; S.protagonist.role = '闽王'; TAB = 'map'; MAPZ.inited = true; MAPZ.mode = 'near'; MAPZ.c = { lon: 117.2, lat: 26.2 }; MAPZ.span = 4.2; MAPZ.follow = false; render();
    const M = mapUnits(S);
    const info = {};
    for (const n of ['韶州', '郴州', '岳州', '潭州', '福州', '建州', '广州', '潮州']) { const u = M.L2.find(x => x.n === n); if (!u) { info[n] = '不在L2'; continue; } const rr = M.reg(u); info[n] = { reg: rr && rr.name, col: rr && rr.col, poly: !!u.poly, polyLab: u.poly && u.poly.lab }; }
    const listCols = {}; try { const RL = realmsAt(930, 6); for (const x of RL.list) if (/吴|楚|闽|南汉|荆南|吴越/.test(x.name)) listCols[x.name] = x.col; } catch (e) { listCols.err = String(e); }
    const svg = document.querySelector('svg.smap');
    const paths = {};
    for (const n of ['韶州', '郴州', '岳州', '潭州', '建州', '福州']) { const el = svg && svg.querySelector(`path[data-mapu="${n}"]`); paths[n] = el ? el.getAttribute('fill') : null; }
    const legends = [...document.querySelectorAll('.mlegend span')].slice(0, 12).map(x => x.textContent.trim() + '=' + ((x.querySelector('i') || {}).style || {}).background);
    return { info, listCols, paths, legends };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
