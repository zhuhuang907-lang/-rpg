const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  await p.goto('file:///C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html');
  await p.waitForFunction(() => typeof mapUnits === 'function', null, { timeout: 60000 });
  const r = await p.evaluate(() => {
    const B = { 关中: [105, 33, 111, 36], 河南: [110, 32, 118, 36], 河北: [113, 36, 120, 41], 河东: [110, 35, 114, 41], 山东: [116, 34, 123, 38], 江淮: [116, 29, 122, 34], 荆湖: [108, 25, 116, 32], 四川: [102, 27, 110, 34], 岭南: [106, 20, 118, 26], 河西: [92, 35, 104, 43], 西域: [74, 35, 96, 46], 辽东: [119, 38, 128, 45], 云南: [97, 21, 106, 29], 蒙古: [90, 42, 122, 52], 青藏: [78, 25, 104, 40] };
    const years = [-221, -200, -150, -100, -50, 0, 50, 100, 150, 200, 250, 280, 300, 320, 350, 383, 400, 420, 450, 479, 500, 530, 550, 580, 600, 618, 640, 660, 700, 742, 755, 756, 763, 780, 800, 820, 840, 860, 880, 900, 907, 923, 930, 950, 960, 980, 1000, 1050, 1100, 1127, 1150, 1200, 1250, 1271, 1300, 1350, 1368, 1400, 1450, 1500, 1550, 1600, 1644, 1680, 1700, 1750, 1800, 1850, 1900, 1911];
    const out = {}, bad = [];
    for (const y of years) {
      S = newSave({ name: '甲', gender: '男', age: 30, role: '布衣', real: false, gregorianYear: y, month: 6, day: 1, place: '洛阳', polity: '唐' });
      const M = mapUnits(S), R = realmsAt(y, 6); if (!R) continue;
      const cnt = {}, subs = R.list.filter(x => x.kind), vass = R.list.filter(x => x.vassal), zero = [];
      const box = {};
      for (const [bn, q] of Object.entries(B)) box[bn] = 0;
      for (const u of M.L2) { if (!u.lat) continue; const g = M.reg(u); if (g) cnt[g.name] = (cnt[g.name] || 0) + 1; for (const [bn, q] of Object.entries(B)) if (u.lon >= q[0] && u.lon <= q[2] && u.lat >= q[1] && u.lat <= q[3]) box[bn]++; }
      for (const n of R.list.map(x => x.name)) if (!cnt[n] && !/于阗|高昌|龟兹|疏勒|莎车|楼兰|鄯善|车师|焉耆|乌孙|大宛|康居|大月氏|安息|条支|奄蔡|匈奴|鲜卑|乌桓|夫余|高句丽|三韩|新罗|百济|倭|日本|琉球|流求|林邑|占城|扶南|真腊|骠|蒲甘|吐蕃|吐谷浑|柔然|高车|突厥|回纥|回鹘|黠戛斯|渤海|契丹|奚|室韦|靺鞨|女真|蒙古|阻卜|瓦剌|鞑靼|察合台|叶尔羌|准噶尔|和硕特|喀尔喀|哈萨克|浩罕|俄罗斯|朝鲜|越南|安南|大越|大瞿越|暹罗|缅甸|大理|南诏|大义宁|大长和|高丽|喀喇汗|察哈尔|牂牁|土司诸部/.test(n)) zero.push(n);
      const empty = Object.entries(box).filter(([n, v]) => v === 0).map(([n]) => n);
      out[y] = { n: M.L2.length, realms: R.list.length, subs: subs.length, vass: vass.length, zero, empty };
      if (zero.length || (empty.length && y >= -221 && y <= 1911)) bad.push(y + ' zero=' + zero.join(',') + ' empty=' + empty.join(','));
    }
    return { out, bad };
  });
  console.log(JSON.stringify(r, null, 1));
  await b.close();
})();
