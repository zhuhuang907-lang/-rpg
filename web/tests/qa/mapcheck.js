const { chromium } = require('playwright');
const PLAY = 'file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1500, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  await p.goto(PLAY);
  await p.waitForFunction(() => typeof mapUnits === 'function', null, { timeout: 60000 });
  const out = {};
  for (const y of [190, 220, 234, 420, 500, 575, 589, 700, 756, 820, 930, 1000, 1100, 1400, 1600, 1800, 1900]) {
    out[y] = await p.evaluate((y) => {
      S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: y, month: 6, day: 1, place: '洛阳', polity: '唐' });
      VIEW = 'game'; TAB = 'map'; MAPZ.inited = true; MAPZ.mode = 'near'; MAPZ.c = { lon: 113, lat: 33 }; MAPZ.span = 7; MAPZ.big = false; render();
      const M = mapUnits(S), R = realmsAt(y, 6), L = R ? R.list : [];
      const names = new Set(L.map(x => x.name));
      const groups = L.filter(x => x.kind), vass = L.filter(x => x.vassal);
      const missParent = groups.filter(x => x.parent && !names.has(x.parent)).map(x => x.name);
      const noKindParent = groups.filter(x => !x.parent).map(x => x.name);
      const cnt = {}; for (const u of M.L2) { if (!u.lat) continue; const g = M.reg(u); if (g) cnt[g.name] = (cnt[g.name] || 0) + 1; }
      const zeroG = groups.filter(x => !cnt[x.name]).map(x => x.name);
      const eqParent = groups.filter(x => { const p = L.find(z => z.name === x.parent); return p && p.col === x.col; }).map(x => x.name);
      const svg = document.querySelector('svg.smap');
      const texts = svg ? [...svg.querySelectorAll('text')].map(t => t.textContent) : [];
      const shown = groups.filter(x => texts.some(t => t.includes(x.name))).length;
      const legend = document.querySelector('.mlegend');
      return { nL2: M.L2.length, realms: L.length, groups: groups.length, vass: vass.length, missParent: missParent.slice(0, 6), noKindParent: noKindParent.slice(0, 6), zeroG: zeroG.slice(0, 8), eqParent: eqParent.slice(0, 6), legendSpans: legend ? legend.querySelectorAll('span').length : 0, legendText: legend ? legend.innerText.slice(0, 180) : '', groupShown: shown, svg: !!svg, patterns: svg ? svg.querySelectorAll('pattern').length : 0 };
    }, y);
  }
  console.log(JSON.stringify({ out, errs }, null, 1));
  await b.close();
})();
