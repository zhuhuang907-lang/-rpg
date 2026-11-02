// 真点按钮扫一遍（CLAUDE.md「发布与仓库」按钮真点得动）：皇帝、山大王、将领、文官、百姓、商人六种身份，每一页每个按钮真点一下，不许报错；每个身份输入框上有一排能办的事、点了写进框里
const { chromium } = require('playwright'); const path = require('path');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 900 } }); const pe = []; p.on('pageerror', e => pe.push(e.message));
 p.on('dialog', d => d.dismiss());
 await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof render0 === 'function');
 const roles = [['皇帝', '大明皇帝', 1630, '顺天府', '明', { idm: 'emperor' }], ['山大王', '山寨寨主，啸聚梁山', 1120, '郓州', '宋', {}], ['将领', '登州镇总兵', 1630, '登州府', '明', { career: { office: '登州镇总兵', rank: '正二品' } }], ['文官', '潍县知县', 1747, '莱州府潍县', '清', { career: { office: '潍县知县', rank: '正七品' } }], ['百姓', '耕读人家的读书人', 1747, '扬州府江都县', '清', {}], ['商人', '扬州盐商', 1757, '扬州府江都县', '清', {}]];
 const report = {};
 for (const [k, role, y, pl, pol, extra] of roles) {
  await p.evaluate(([role, y, pl, pol, extra]) => { const s = Object.assign(newSave({ name: '甲乙丙', gender: '男', age: 30, role, gregorianYear: y, month: 5, day: 1, place: pl, polity: pol }), extra); s.chat = [{ role: 'gm', text: '开场。' }]; s.money = { cash: 5000, unit: '两', hist: [] };
   s.unitTypes = [{ id: 'bu', name: '步兵', size: 100, atk: 50, def: 50, shock: 40, org: 50, mob: 40, pay: 1, grain: 0.5, months: 2, unit: '营' }]; s.forces = role.includes('总兵') ? [{ name: '登州镇标', leader: '甲乙丙', troops: '3000', at: '登州府', status: '驻守', src: '推算' }] : [];
   if (role.includes('知县')) s.gov = { scope: 'local', keys: [], stats: { 存银: 4000, 仓粮: 2000, 民心: 50, 治安: 40, 积案: 60, 灾情: 30, 吏治: 50 }, basis: {}, hist: [] };
   S = s; VIEW = 'game'; SIDE_FOLD = false; window.__s0 = JSON.stringify(s); }, [role, y, pl, pol, extra]);
  const tabs = await p.evaluate(() => tabsFor(S).map(t => t[0])); report[k] = { tabs, dead: [], err: [] };
  for (const t of tabs) {
   await p.evaluate(t => { S = JSON.parse(window.__s0); TAB = t; ORGMSG = ''; SIDE_FOLD = false; MAPZ.inited = false; MAPC.k = ''; render0(); }, t);
   const n = await p.evaluate(() => document.querySelectorAll('.side button:not([data-tab]), .side [data-write]:not(button), .side [data-mapu]').length);
   for (let i = 0; i < Math.min(n, 30); i++) {
    const r = await p.evaluate(i => { const els = [...document.querySelectorAll('.side button:not([data-tab]), .side [data-write]:not(button), .side [data-mapu]')]; const el = els[i]; if (!el || el.disabled || el.offsetParent === null) return null; if (/删除|换一局|导出|下载|清理|退出|重写这一条/.test(el.innerText || '')) return null;
      const lab = (el.innerText || el.value || el.id || '').trim().slice(0, 16), before = document.body.innerText + '|' + ($('#said') || {}).value + '|' + ORGMSG + '|' + JSON.stringify(S).length; el.dispatchEvent(new MouseEvent('click', { bubbles: true })); return { lab, before }; }, i);
    if (!r) continue; await p.waitForTimeout(150);
    const after = await p.evaluate(() => document.body.innerText + '|' + ($('#said') || {}).value + '|' + ORGMSG + '|' + JSON.stringify(S).length);
    if (after === r.before) report[k].dead.push(`${t}:${r.lab}`);
    if (pe.length) { report[k].err.push(`${t}:${r.lab}: ${pe.splice(0).join(';')}`); }
    await p.evaluate(t => { S = JSON.parse(window.__s0); TAB = t; ORGMSG = ''; VIEW = 'game'; SIDE_FOLD = false; MAPZ.inited = false; MAPC.k = ''; render0(); }, t);
   }
  }
 }
 const errs = []; for (const [k, v] of Object.entries(report)) for (const e of v.err) errs.push(k + ' ' + e);
 // 每个身份输入框上有一排能办的事，真点一下写进框里
 for (const [k, role, y, pl, pol, extra] of roles) { const r = await p.evaluate(async ([role, y, pl, pol, extra]) => { const s = Object.assign(newSave({ name: '甲乙丙', gender: '男', age: 30, role, gregorianYear: y, month: 5, day: 1, place: pl, polity: pol }), extra); s.chat = [{ role: 'gm', text: '开场。' }]; S = s; VIEW = 'game'; TAB = 'board'; render0(); const L = roleActions(s); const bt = document.querySelector('.goalbar.acts .goal'); if (!bt) return { n: L.length, ok: false }; bt.click(); await new Promise(r => setTimeout(r, 200)); return { n: L.length, ok: !!(document.querySelector('#said') || {}).value }; }, [role, y, pl, pol, extra]);
   if (!r.n) errs.push(k + '：输入框上没有能办的事'); else if (!r.ok) errs.push(k + '：点了能办的事，没写进框里'); }
 if (pe.length) errs.push(...pe);
 console.log('ERRS', JSON.stringify(errs)); await b.close(); })();
