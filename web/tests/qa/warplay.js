// 打仗全程实玩（需求台账 R-144；2026-11-07 玩家：「战争系统根本运行不了，打仗如同儿戏」；查实：潮州不在天下各方表上，大军开到就当无主「占领」，一仗没打、城也不归你）：
// 闽王对南汉潮州宣战出兵，连发几回静候军报：要开拔、兵临城下、探报、真打一仗（战报逐日）、拿下城、地盘和地图记上、战争进度加分
const { chromium } = require('playwright');
(async () => {
  const OUT = process.env.AUD || '.', fs = require('fs'), log = [];
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8771) + '/'); await p.waitForTimeout(1500);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForFunction(() => typeof newSave === 'function' && typeof MODE !== 'undefined' && MODE === 'local', null, { timeout: 30000 });
  await p.evaluate(async () => {
    S = newSave({ name: '王审知', gender: '男', age: 59, role: '闽王', real: true, gregorianYear: 921, month: 6, day: 1, place: '福州', polity: '闽' });
    S.chat = [{ role: 'gm', text: '开场。王审知在福州。', when: timeText(S.clock), turn: 0 }]; S.money = { cash: 300000, unit: '贯' }; S.realm = { treasury: 800000, granary: 500000 };
    S.forces = [{ name: '威武军', leader: '王审知', owner: '你', troops: 15000, morale: 65, orgNow: 70, train: 60, grain: 120000, at: '福州', status: '驻守' }];
    VIEW = 'game'; TAB = 'army'; SIDE_FOLD = false; await store.save(S); render0();
  });
  const snap = async tag => { const d = await p.evaluate(() => ({ turn: S.turn, clock: timeText(S.clock), forces: arr(S.forces).map(f => `${f.name}@${f.at}:${f.troops}:${f.status}`), camp: arr(S.campaigns).map(c => `${c.force}→${c.target}:${c.state}:${c.li || ''}里:${c.left != null ? c.left : ''}`), wars: arr(S.wars).map(w => `${w.with}:${w.state}:${w.won || 0}/${w.lost || 0}`), battles: arr(S.battles).map(x => `${x.place}:${x.outcome}:${x.deadUs}/${x.deadThem}`), terr: arr(S.territory).map(t => t.place), mapOwn: Object.keys(S.mapOwn || {}), said: (document.querySelector('#said') || {}).value || '', msg: ORGMSG || '', err: ERRMSG || '', lastGm: (arr(S.chat).filter(c => c.role === 'gm').slice(-1)[0] || {}).text || '' })); log.push({ tag, ...d, lastGm: d.lastGm.slice(0, 300) }); await p.screenshot({ path: `${OUT}/${tag}.png`, fullPage: false }); };
  await snap('00-start');
  // 选潮州、进攻
  const opts = await p.evaluate(() => [...document.querySelectorAll('[data-xtg="威武军"] option')].map(o => o.textContent));
  log.push({ opts: opts.slice(0, 8) });
  const o = opts.find(x => /潮州/.test(x)) || opts.find(x => /南汉|吴越|吴/.test(x));
  if (o) await p.selectOption('[data-xtg="威武军"]', { label: o });
  await p.click('button[data-army="go"][data-mode="攻"]').catch(e => log.push({ clickErr: e.message }));
  await p.waitForTimeout(500); await snap('01-after-attack-click');
  // 名分卡：宣战
  const dec = await p.$('[data-war="declare"]'); if (dec) { await dec.click(); await p.waitForTimeout(500); } else log.push({ noDeclare: true });
  await snap('02-after-declare');
  // 连发几回
  for (let i = 0; i < 8; i++) {
    if (i >= 5 && await p.evaluate(() => arr(S.battles).length > 0 || arr(S.campaigns).some(c => /得手|败回/.test(c.state)))) break;   // 机器慢时探报、围城晚一两回，最多再等三回
    if (await p.$('button[data-xwait]')) await p.click('button[data-xwait]', { timeout: 5000 }).catch(e => log.push({ waitErr: e.message.slice(0, 80) }));
    const v = await p.evaluate(() => (document.querySelector('#said') || {}).value || ''); if (!v.trim()) await p.fill('#said', '按兵不动，静候前方军报。');
    if (await p.evaluate(() => ($('#span') || {}).value) === 'auto') await p.selectOption('#span', 'month').catch(() => {});   // 静候军报：一回过一个月
    await p.click('#bSend').catch(e => log.push({ sendErr: e.message }));
    await p.waitForFunction(() => !BUSY, null, { timeout: 240000 }).catch(() => log.push({ busyTimeout: i }));
    await p.waitForTimeout(800); await p.evaluate(() => { TAB = 'army'; render0(); }); await snap(`1${i}-turn`);
    { if (await p.$('[data-siege="强攻"]')) { await p.click('[data-siege="强攻"]', { timeout: 5000 }).catch(e => log.push({ assaultErr: e.message.slice(0, 80) })); await p.waitForTimeout(400); await snap(`1${i}-assault`); } }   // 围城了就强攻（R-139：攻城改成围城，可强攻）
  }
  fs.writeFileSync(`${OUT}/warplay.json`, JSON.stringify({ log, errs }, null, 1));
  const fin = await p.evaluate(() => ({ sg: arr(S.chronicle).filter(c => /围潮州\d+日/.test(c.what || '')).map(c => c.what), b: arr(S.battles), terr: arr(S.territory).map(t => t.place), own: Object.keys(S.mapOwn || {}), w: arr(S.wars)[0] || {}, camp: arr(S.campaigns)[0] || {} })), bad = [];
  if (!log.some(x => /兵临城下|行军/.test((x.forces || []).join(' ')))) bad.push('兵马没开拔');
  if (!fin.sg.length && !fin.b.length) console.log('LOG', JSON.stringify(log.filter(x => x.forces).map(x => [x.tag, x.clock, x.forces && x.forces[0], x.camp && x.camp[0], x.msg]).slice(-12)));
  if (!fin.sg.length && (!fin.b.length || !(fin.b[0].rounds || []).length || !/第1日/.test((fin.b[0].rounds[0] || {}).nm || ''))) bad.push('到了潮州没真打一仗、或战报不是逐日：' + JSON.stringify(fin.b).slice(0, 200));
  if ((fin.sg.length || (fin.b.length && /胜/.test(fin.b[0].outcome))) && (!fin.terr.some(x => /潮州/.test(x)) || !fin.own.some(x => /潮/.test(x)))) bad.push('打赢了潮州没归你、地图没记上：' + JSON.stringify([fin.terr, fin.own]));
  if ((fin.b.length || fin.sg.length) && !((fin.w.won || 0) + (fin.w.lost || 0) + (fin.w.took || []).length)) bad.push('打完一仗战争进度没记上：' + JSON.stringify(fin.w));
  console.log('ERRS', JSON.stringify(bad.concat(errs.slice(0, 10)))); await b.close(); process.exit(bad.length || errs.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
