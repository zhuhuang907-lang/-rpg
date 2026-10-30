const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  const done = async (ms = 300000) => { try { await p.waitForFunction(() => !BUSY && document.querySelector('#said'), null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
  await p.goto('http://127.0.0.1:' + process.env.GAME_PORT + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.fill('#qText', process.argv[2]); await p.click('#bStart'); await done();
  await p.fill('#said', '在家看看'); await p.click('#bSend'); await done(); await p.waitForTimeout(15000);
  await p.evaluate(() => { TAB = 'map'; render(); }); await p.waitForTimeout(4000);
  for (const [lv, f] of [['天下', process.argv[3]], ['本省', process.argv[3].replace('.png', '-prov.png')]]) { const a = await p.$(`text=${lv}`); if (a) { await a.click(); await p.waitForTimeout(4000); } const el = await p.$('.mapwrap, #mapBox, .map'); if (el) await el.screenshot({ path: f }); else await p.screenshot({ path: f }); }
  const info = await p.evaluate(() => ({ y: S.clock.y, pol: S.place.polity, powers: arr(S.powers).map(x => [x.name, x.seat]), terr: arr(S.territory).map(t => t.place), admin: S.admin ? { split: S.admin.split, regimes: arr(S.admin.regimes).map(r => [r.name, r.col, arr(r.units || r.provs).length]) } : null, geo: S.geo ? { units: arr(S.geo.units).length, here: S.geo.here && S.geo.here.name } : null, txt: (document.querySelector('#mapNote, .mapnote') || {}).innerText || '', fills: document.querySelectorAll('svg path[fill]:not([fill="none"])').length, legend: [...document.querySelectorAll('.legend, .mlegend')].map(e => e.innerText).join('|').slice(0, 300) }));
  console.log('INFO', JSON.stringify(info)); console.log('ERRS', JSON.stringify(errs)); await b.close(); })();
