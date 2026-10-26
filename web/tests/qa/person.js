// 是不是史书上的真人：开局「人物」可选自动／史上真人／虚构；真人程序查（维基条目、维基数据、博查，DeepSeek 照查到的判），
// 选了真人却查不到就不开局、说清楚；大官贵族自动查，查无此人就从资料里另挑真人；人物页每人一个「核查是否真人」
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); const bad = m => errs.push(m);
  const idle = async (ms = 300000) => { try { await p.waitForFunction(() => !BUSY && !document.querySelector('.thinking'), null, { timeout: ms, polling: 200 }); return true; } catch (_) { return false; } };
  const base = 'http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/';
  const fresh = async () => { await p.goto(base); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200); };
  const custom = async (name, real) => { await fresh(); await p.evaluate(() => { const d = document.querySelector('#dCustom'); if (d) d.open = true; });
    await p.fill('#cYear', '乾隆二十二年'); await p.fill('#cPlace', '扬州'); await p.fill('#cRole', '盐商'); await p.fill('#cName', name); await p.selectOption('#cReal', real);
    await p.click('#bCustomStart'); return idle(); };
  // 一、选「史上真人」，名字是真人：开局，主角是真人，核查记在档里
  await custom('江春', '真');
  const a = await p.evaluate(() => S ? { name: S.protagonist.name, real: S.protagonist.real, chk: Object.keys(S.personChk || {}).join() } : { err: ERRMSG });
  if (!/江春/.test(a.chk || '')) bad('开局核查没记进存档');
  if (!a.name || a.name !== '江春' || a.real !== true) bad('选了真人、名字是真人，开局不对：' + JSON.stringify(a));
  // 二、选「史上真人」，名字查不到：不开局，说清楚
  await custom('汪无名', '真');
  const b2 = await p.evaluate(() => ({ s: !!(S && VIEW === 'game'), err: ERRMSG || document.body.innerText.match(/查不到史书上有[^。]*。/)?.[0] || '' }));
  if (b2.s || !/查不到史书上有「汪无名」/.test(b2.err)) bad('真人查不到还开了局或没说：' + JSON.stringify(b2));
  // 三、选「虚构」：主角是虚构，标虚拟
  await custom('汪景和', '虚');
  const c = await p.evaluate(() => S ? { real: S.protagonist.real, fx: fictionSet(S).has(S.protagonist.name) } : { err: ERRMSG });
  if (c.real !== false || !c.fx) bad('选了虚构，主角不是虚构：' + JSON.stringify(c));
  // 四、一句话开局，大官：AI 给的名字查无此人 → 从资料里另挑真人（卢见曾），查得到才用
  await fresh(); await p.fill('#qText', '乾隆二十二年的扬州知府'); await p.click('#bStart'); await idle();
  const d = await p.evaluate(() => S ? { name: S.protagonist.name, real: S.protagonist.real } : { err: ERRMSG });
  if (d.name === '假知府' || (d.real && d.name !== '卢见曾')) bad('大官查无此人还当真人用了：' + JSON.stringify(d));
  // 五、人物页「核查是否真人」
  await p.evaluate(() => { S.people['高恒'] = { role: '两淮盐政', favor: 0, seen: S.turn }; S.people['钱无有'] = { role: '盐商', favor: 0, seen: S.turn }; delete (S.dossiers || {})['高恒']; TAB = 'people'; SIDE_FOLD = false; ORGMSG = ''; render(); });
  for (const n of ['高恒', '钱无有']) { const bt = await p.$(`[data-pchk="${n}"]`); if (!bt) { bad('人物页没有核查按钮：' + n); continue; } await bt.click(); await p.waitForFunction(n => /已核/.test([...document.querySelectorAll('.pc')].find(x => x.innerText.includes(n))?.innerText || ''), n, { timeout: 60000 }).catch(() => bad('核查没出结果：' + n)); }
  const e = await p.evaluate(() => ({ g: chkOf(S, '高恒'), q: chkOf(S, '钱无有'), fq: fictionSet(S).has('钱无有'), fg: fictionSet(S).has('高恒'), msg: ORGMSG }));
  if (!e.g || !e.g.real || e.fg) bad('高恒应是真人：' + JSON.stringify(e).slice(0, 300));
  if (!e.q || e.q.real || !e.fq) bad('钱无有应查无此人、标虚拟：' + JSON.stringify(e).slice(0, 300));
  // 名册里只写「某氏」的女眷：当场起名，「某氏」留作称呼；起名的字库里不能有「氏」
  const sh = await p.evaluate(() => { S.household.push({ relation: '正室', name: '程氏', age: 30 }); S.people['柳氏'] = { role: '妾', seen: S.turn }; fixShiNames(S); const m = S.household.find(x => x.alias === '程氏'); const ph = nameFixes({ ...S, nameMap: {} }, '他娶了王某氏为妻'); return { m: m && m.name, p: Object.keys(S.people).find(k => S.people[k].alias === '柳氏'), left: S.household.some(x => /^.氏$/.test(x.name)) || Object.keys(S.people).some(k => /^.氏$/.test(k)), ph: ph.map(x => x.right).join() }; });
  if (!sh.m || /氏$/.test(sh.m) || !sh.p || /氏$/.test(sh.p) || sh.left || /氏$/.test(sh.ph)) bad('「某氏」没起名：' + JSON.stringify(sh));
  const vis = await p.evaluate(() => document.body.innerText); if (/NaN|undefined|\[object/.test(vis)) bad('页面有坏字');
  console.log('DBG', JSON.stringify({ a, b2, c, d, e: { g: e.g && e.g.src, q: e.q && e.q.why } }));
  console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(errs.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message.slice(0, 300)])); process.exit(1); });
