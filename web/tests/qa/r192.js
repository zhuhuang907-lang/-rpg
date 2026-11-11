// R-192：默认全交 DeepSeek；多用原文库——翻史书（真点）、当面说、敌国之主、大臣奏事、朝臣互谋、立真人档案都先带史书原文；同样的查询一局只查一回
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof libFind === 'function');
  const bad = [];
  await p.evaluate(() => { window.__cf = 0; citeFetch = async (s, books, qs) => { window.__cf++; return [{ book: 'songshi', name: '宋史', volume: '卷三百二十七', text: '王安石字介甫，抚州临川人。' + qs.join('、'), score: 9 }]; };
    S = newSave({ name: '某帝', gender: '男', age: 30, role: '皇帝', real: true, gregorianYear: 1070, month: 6, day: 1, place: '开封', polity: '北宋' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3;
    KEY = { ...KEY, has: true }; VIEW = 'game'; TAB = 'world'; SIDE_FOLD = false; render(); });
  { const r = await p.evaluate(() => ({ d: routeOf('写戏', true), t: routeOf('推演'), x: routeOf('研读') })); if (r.d !== 'ds' || r.t !== 'ds' || r.x !== 'ds') bad.push('默认没全交 DeepSeek：' + JSON.stringify(r)); }
  // 翻史书真点
  if (!(await p.$('#libQ'))) bad.push('史线页没有翻史书'); else { await p.fill('#libQ', '王安石 青苗'); await p.click('[data-libfind]'); await p.waitForTimeout(400);
    const t = await p.evaluate(() => document.body.innerText); if (!/《宋史》卷三百二十七/.test(t) || !/王安石字介甫/.test(t)) bad.push('点了查原文，页上没出原文：' + t.slice(0, 100)); }
  // 各处提示带原文
  const r = await p.evaluate(async () => { const got = {}; callClaude = async (q, x, o) => { got[o && o.kind || '?'] = (got[o && o.kind || '?'] || '') + q; return { text: '{}' }; };
    S.org = { nodes: [{ id: 'root', name: '朝廷', depth: 0, posts: [] }, { id: 'n1', name: '中书', depth: 1, parent: 'root', posts: [{ title: '宰相', holder: '王安石' }, { title: '参知政事', holder: '吕惠卿' }, { title: '枢密使', holder: '文彦博' }] }] };
    S.people = { 王安石: { favor: 20 }, 吕惠卿: {}, 文彦博: {} };
    try { await intrigueMonthly(S); } catch (_) {} try { await memPlan(S); } catch (_) {}
    const c0 = window.__cf; await libEvidence(S, ['熙宁', '王安石*2'], ''); await libEvidence(S, ['熙宁', '王安石*2'], ''); const again = window.__cf - c0;
    return { all: Object.values(got).join('\n'), again }; });
  if ((r.all.match(/史书原文佐证/g) || []).length < 2) bad.push('朝臣互谋、大臣奏事的提示没带史书原文');
  if (r.again > 1) bad.push('同样的查询一局查了两回：' + r.again);
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
