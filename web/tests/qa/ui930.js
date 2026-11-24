// 930 闽王界面取证：各页签宽屏/窄屏截图 + 横向溢出/错字/空页/越界元素扫描
const { chromium } = require('playwright');
const fs = require('fs');
const PLAY = 'C:/Users/DELL/.zcode/workspace/rpg17-40/web/play.html';
const OUT = 'C:/Users/DELL/.zcode/workspace/rpg17-40/_shots/ui';
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const report = { wide: {}, narrow: {}, errors: [] };
  const MODES = String(process.env.UI_MODES || 'wide,narrow').split(',');
  for (const [mode, w] of [['wide', 1500], ['narrow', 900]].filter(([m]) => MODES.includes(m))) {
    const p = await b.newPage({ viewport: { width: w, height: 1000 } });
    const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
    await p.goto('file:///' + PLAY);
    await p.waitForFunction(() => typeof newSave === 'function', null, { timeout: 30000 });
    await p.evaluate(() => {
      S = newSave({ name: '王延钧', gender: '男', age: 40, role: '闽王', real: true, gregorianYear: 930, month: 7, day: 3, place: '福州', polity: '闽' });
      S.idm = 'emperor'; S.protagonist.role = '闽王'; S.turn = 5;
      S.realm = { treasury: 118000, granary: 286000, revenue: 90000, outlay: 80000, army: 30000, capital: '福州' };
      S.territory = ['福州', '建州', '泉州', '漳州', '汀州'].map(x => ({ place: x, pop: 60000, troops: 5000, grain: 40000, loyalty: 60 }));
      S.forces = [{ name: '威武军', leader: '王延钧', at: '建州', troops: 11000, grain: 6000, morale: 62, train: 55, orgNow: 66, quality: '中', units: [], status: '驻守' }, { name: '泉州镇军', leader: '王延美', at: '泉州', troops: 4000, grain: 3000, morale: 60, train: 50, orgNow: 60, quality: '中', units: [], status: '驻守' }];
      S.prices = [{ item: '米', price: 400, per: '石' }, { item: '绢', price: 800, per: '匹' }];
      S.depots = [{ place: '建州', lv: 1, grain: 18000, ym: 11166 }];
      S.wars = [{ with: '吴', cb: '讨逆', declared: true, since: 11166, state: '交战', won: 1, lost: 0, took: ['信州'], by: 'sovereign', allies: [] }];
      S.mapOwn = { 信州: { owner: '你', turn: 5, why: '围城开城投降', st: '得' } };
      S.diplo = { 吴: { att: -80, ties: [], log: [], why: '' }, 吴越: { att: 35, ties: ['姻'], log: [{ ym: 11160, t: '两家结为姻亲' }] }, 楚: { att: 20, ties: [], log: [] }, 南汉: { att: -20, ties: [], log: [] } };
      S.gov = { scope: 'realm', stats: { 民心: 55, 腐败: 35, 治安: 55 }, keys: ['民心', '腐败', '治安'] };
      S.fin = { treasury: 118000, grain: 286000 }; S.renown = 120;
      S.chat = [{ role: 'gm', text: '长兴元年六月，福州。闽江口的海风穿过王宫的廊庑，案上摊着五州的丁口与粮饷。你把要办的事一件件吩咐下去。' }, { role: 'me', text: '遣使往吴越修好。' }, { role: 'gm', text: '使者带了土物，取道温、台往杭州去。吴越回书致意，两家结为姻亲。' }];
      VIEW = 'game'; TAB = 'board'; SIDE_FOLD = false; MAPZ.inited = false; ORGMSG = ''; ERRMSG = '';
    });
    const tabs = await p.evaluate(() => tabsFor(S).map(x => x[0]));
    for (const t of tabs) {
      await p.evaluate(t => { TAB = t; render0(); const s = document.querySelector('.side'); if (s) s.scrollTop = 0; }, t);
      await p.waitForTimeout(350);
      const d = await p.evaluate(() => {
        const side = document.querySelector('.side'); if (!side) return { err: 'no side' };
        const pane = side.querySelector('.pane') || side;
        const r = side.getBoundingClientRect();
        const over = [];
        for (const el of pane.querySelectorAll('*')) {
          const b = el.getBoundingClientRect();
          if (!b.width || !b.height) continue;
          if (b.right > r.right + 2 || b.left < r.left - 2) { const t = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30); if (t) over.push(t); }
          if (over.length >= 8) break;
        }
        const txt = pane.innerText || '';
        const bad = (txt.match(/undefined|NaN|\[object Object\]|（）|「」|某某|某人|某地/g) || []).slice(0, 6);
        const btn = pane.querySelectorAll('button').length, det = pane.querySelectorAll('details').length;
        return { len: (pane.innerHTML || '').length, btn, det, hOver: pane.scrollWidth - pane.clientWidth, over, bad, head: txt.slice(0, 60).replace(/\s+/g, ' ') };
      });
      report[mode][t] = d;
      await p.screenshot({ path: `${OUT}/${mode}-${t}.png`, fullPage: true });
    }
    report[mode]._errs = errs;
    await p.close();
  }
  fs.writeFileSync(OUT + '/audit.json', JSON.stringify(report, null, 1));
  console.log(JSON.stringify(report, null, 1).slice(0, 6000));
  await b.close();
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
