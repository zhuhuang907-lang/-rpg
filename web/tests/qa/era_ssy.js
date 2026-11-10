// 南宋、金、元新史料（R-171）：1127–1368 有内置的君主年号、史事、真人；年号照史料算；真人照任职年份出场、未出生已故不出场
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof eraLabel === 'function');
  const bad = [];
  const at = (y, pol, place) => p.evaluate(([y, pol, place]) => { S = newSave({ name: '某人', gender: '男', age: 30, role: '书生', real: false, gregorianYear: y, month: 6, day: 1, place, polity: pol }); S.chat = [{ role: 'gm', text: '开场' }];
    const F = figuresAt(S, y).filter(f => f.alive).map(f => f.name); return { inst: (instLibFor(S)[0] || {}).id || '', era: eraLabel(S, y), packs: histFor(y, S).map(h => h.id), F, block: histBlock(S) }; }, [y, pol, place]);
  { const r = await at(1140, '南宋', '临安'); if (!r.packs.includes('song-south-yuan')) bad.push('1140年没有南宋金元史料'); if (r.era !== '绍兴十年') bad.push('1140年南宋年号不对：' + r.era); if (!r.F.includes('岳飞') || !r.F.includes('秦桧')) bad.push('1140年真人里没有岳飞、秦桧：' + r.F.slice(0, 20).join('、')); if (r.F.includes('文天祥')) bad.push('1140年文天祥还没出生就出场'); if (r.inst !== 'song-south-yuan') bad.push('1140年南宋没有制度库：' + r.inst); if (!/郾城|顺昌|岳飞/.test(r.block)) bad.push('1140年的史料块没有当年的战事'); }
  { const r = await at(1140, '宋', '临安'); if (r.era !== '绍兴十年') bad.push('写作「宋」时年号不对：' + r.era); }
  { const r = await at(1275, '南宋', '临安'); if (r.era !== '德祐元年') bad.push('1275年年号不对：' + r.era); if (!r.F.includes('文天祥')) bad.push('1275年没有文天祥'); if (r.F.includes('岳飞')) bad.push('1275年岳飞已死还出场'); }
  { const r = await at(1290, '元', '大都'); if (r.era !== '至元二十七年') bad.push('1290年元年号不对：' + r.era); if (!r.F.includes('郭守敬')) bad.push('1290年没有郭守敬'); if (r.inst !== 'song-south-yuan') bad.push('1290年元没有制度库：' + r.inst); }
  { const r = await at(1360, '元', '大都'); if (r.era !== '至正二十年') bad.push('1360年元年号不对：' + r.era); }
  { const r = await at(1200, '金', '中都'); if (r.era !== '承安五年') bad.push('1200年金年号不对：' + r.era); }
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
