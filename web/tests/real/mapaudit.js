// 舆图逐年代普查（任务六十二，R-282）：公元前 770 到 1911，每二十年一年（外加朝代更替前后），
// 一国之君 / 割据武人 / 平民 三种身份，各画天下图和放大到都城一带的图；
// 程序自动查：同一名字写两遍、国名镇名城名互相压着、名字里带「·」「/」并成一家、分立年代还写上一代的道/路名、
// 同一色给了两家、兵牌压着名字、已亡的国还在图上；截图存 $EXAM_ROOT/mapaudit，清单写同目录 findings.json + 清单.md。
// 跑法：node web/tests/real/mapaudit.js   可加 ONLY_YEAR=910 STEP=20 MAXYEARS=20 EXAM_ROOT=...
'use strict';
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const WEB = path.resolve(__dirname, '../..');                 // web/
const BASE = path.resolve(process.env.EXAM_ROOT || path.join(os.tmpdir(), 'rpg-exam'));
const OUT = BASE + path.sep + 'mapaudit';                      // 只在这个根下面写
const JSDIR = OUT + path.sep + 'jsmap';
const SHOTS = OUT + path.sep + 'shots';
const PLAY = path.resolve(process.env.PLAY || path.join(WEB, 'play.html'));
if (!PLAY.endsWith('.html') || !fs.existsSync(PLAY)) throw new Error('页面路径不对：' + PLAY);
if (!OUT.startsWith(BASE + path.sep)) throw new Error('输出目录不在根下：' + OUT);
/** 只允许根下、只允许安全文件名（防路径穿越；Mimosa 也认这个校验） */
const safeFile = (root, name) => {
  const n = String(name);
  if (!/^[-0-9A-Za-z_.\u4e00-\u9fff]+$/.test(n) || n.includes('..') || n.includes('/') || n.includes('\\')) throw new Error('文件名不合法：' + n);
  const t = path.resolve(root, n);
  if (!t.startsWith(path.resolve(root) + path.sep)) throw new Error('越出目录：' + n);
  return t;
};
const VER = '0842fac0aa3b0e655ce54f312be29673131ba32d';
const CDN = f => `https://cdn.jsdelivr.net/gh/DeanChensj/jiangshan-map@${VER}/js/${f}.js`;
const STEP = +process.env.STEP || 20;
const ONLY = process.env.ONLY_YEAR ? [ +process.env.ONLY_YEAR ] : null;
const MAXY = +process.env.MAXYEARS || 0;

const TRANS = [-221, -206, 9, 25, 220, 265, 280, 316, 420, 479, 502, 535, 550, 557, 581, 618, 690, 755, 875, 907, 923, 936, 960, 979, 1038, 1125, 1127, 1271, 1276, 1368, 1399, 1421, 1449, 1521, 1572, 1616, 1644, 1661, 1722, 1735, 1796, 1839, 1851, 1894, 1911];

function years() {
  const S = new Set(); for (let y = -770; y <= 1910; y += STEP) S.add(y);
  for (const y of TRANS) { S.add(y - 1); S.add(y); S.add(y + 1); }
  let L = [...S].sort((a, b) => a - b).filter(y => y >= -770 && y <= 1911);
  if (ONLY) L = L.filter(y => ONLY.includes(y));
  if (MAXY) L = L.slice(0, MAXY);
  return L;
}

(async () => {
  fs.mkdirSync(JSDIR, { recursive: true }); fs.mkdirSync(SHOTS, { recursive: true });
  // 江山时序：下到单独目录，不进仓库；跑的时候拦这个地址用本机文件，省得每页重下
  const files = ['atlas_snapshots', 'map_data'];
  for (const f of files) {
    const fp = safeFile(JSDIR, f + '.js');
    if (!fs.existsSync(fp) || fs.statSync(fp).size < 1000) {
      try {
        const r = await fetch(CDN(f), { signal: AbortSignal.timeout(180000) });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        fs.writeFileSync(fp, await r.text());
        console.log('下好', f, fs.statSync(fp).size, '字节');
      } catch (e) { console.log('江山时序没下成（照内置史料画）：', f, String(e.message || e)); }
    }
  }
  const haveJs = files.every(f => fs.existsSync(safeFile(JSDIR, f + '.js')));

  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const ctx = await b.newContext({ viewport: { width: 1440, height: 1050 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.route('**fonts.googleapis.com**', r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await p.route('**fonts.gstatic.com**', r => r.abort());
  if (haveJs) for (const f of files) { const body = fs.readFileSync(safeFile(JSDIR, f + '.js'), 'utf8'); await p.route(CDN(f), r => r.fulfill({ status: 200, contentType: 'application/javascript', body })); }
  await p.addInitScript(() => { window.JSMAP_TEST = 1; });
  await p.goto('file://' + PLAY);
  await p.waitForFunction(() => typeof stratMap === 'function' && typeof newSave === 'function' && typeof realmsAt === 'function');
  await p.evaluate(() => { try { SETTINGS.jsmap = true; window.JSMAP_FAILAT = 0; window.JSMAP_P = null; } catch (_) { /* 老页面没有设置 */ } });
  let jsok = false;
  try { await p.evaluate(() => { try { window.JSMAP_FAILAT = 0; jsmapLoad(); } catch (_) { /* 没这函数就照内置 */ } }); jsok = await p.waitForFunction(() => (typeof JSMAP !== 'undefined' && !!JSMAP) || (typeof JSMAP_ERR !== 'undefined' && !!JSMAP_ERR), null, { timeout: 120000 }).then(() => p.evaluate(() => typeof JSMAP !== 'undefined' && !!JSMAP)).catch(() => false); } catch (_) { jsok = false; }
  console.log('江山时序', jsok ? '已加载' : '没加载（照内置史料画）');

  const audit = async (id, y) => p.evaluate(([id, y]) => {
    const bad = [], info = {};
    const R = realmsAt(y, 6); info.realms = R ? R.list.length : 0;
    if (!R) return { bad: ['这一年没有疆域数据（图上空白）'], info };
    const sv = document.querySelector('.smap'); if (!sv) return { bad: ['舆图没画出来'], info };
    const T = [...sv.querySelectorAll('text')].map(e => { let bb = null; try { bb = e.getBBox(); } catch (_) { bb = null; } return { t: String(e.textContent || '').trim(), fs: +e.getAttribute('font-size') || 0, fw: e.getAttribute('font-weight') || '', prov: e.getAttribute('data-mapprov') || '', bb }; }).filter(x => x.t && x.bb);
    const names = new Set(R ? R.list.map(x => String(x.name)) : []);
    const isCountry = x => x.fw === '700' && x.fs >= 13 && !x.prov && (x.t.length > 1 || names.has(x.t)) && (names.has(x.t) || [...names].some(n => n && (x.t === n || x.t.includes(n) || n.includes(x.t)) && x.t.length <= n.length + 3));
    const C = T.filter(isCountry), P = T.filter(x => x.prov), City = T.filter(x => !x.prov && x.fw !== '700' && x.fs === 13 && (x.t.length >= 2 || names.has(x.t)) && x.t !== String(S.protagonist.name || '').slice(0, 1));
    const cnt = {}; for (const x of C) cnt[x.t] = (cnt[x.t] || 0) + 1;
    const dup = Object.entries(cnt).filter(([, n]) => n > 1); if (dup.length) bad.push('国名写了两遍：' + dup.map(d => d[0]).join('、'));
    const ov = [];
    for (let i = 0; i < C.length; i++) for (let j = i + 1; j < C.length; j++) {
      const a = C[i].bb, c = C[j].bb;
      const w = Math.min(a.x + a.width, c.x + c.width) - Math.max(a.x, c.x), h = Math.min(a.y + a.height, c.y + c.height) - Math.max(a.y, c.y);
      const ar = Math.max(0, w) * Math.max(0, h), mn = Math.min(a.width * a.height, c.width * c.height);
      if (ar > 1 && ar > mn * 0.18) ov.push(`${C[i].t}×${C[j].t}`);
    }
    if (ov.length) bad.push('国名互相压着：' + ov.slice(0, 8).join('、'));
    const mg = C.filter(x => /[·／/]/.test(x.t)).map(x => x.t);
    if (mg.length) bad.push('国名把两家并成一家：' + mg.join('、'));
    if (R && R.list.length > 1) {
      const old = P.filter(x => (y >= 907 && y < 980 && /道$/.test(x.t)) || (y >= 1279 && y < 1368 && /(路|道)$/.test(x.t))).map(x => x.t);
      if (old.length) bad.push('分立年代还写着上一代的政区名：' + [...new Set(old)].join('、'));
    }
    if (R) {
      const byc = {}; for (const x of R.list) if (/^#[0-9a-f]{6}$/i.test(x.col || '')) (byc[x.col] = byc[x.col] || []).push(x);
      const same = [];
      for (const [, L] of Object.entries(byc)) {
        if (L.length < 2) continue;
        for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
          const a = L[i], b = L[j];
          const kin = (a.parent && String(b.name).includes(String(a.parent).replace(/（.*$/, ''))) || (b.parent && String(a.name).includes(String(b.parent).replace(/（.*$/, ''))) || String(a.name).includes(String(b.name).replace(/（.*$/, '')) || String(b.name).includes(String(a.name).replace(/（.*$/, '')) || (a.kind === '长' || b.kind === '长');
          if (!kin) same.push(`${a.name}／${b.name}=${a.col}`);
        }
      }
      if (same.length) bad.push('两家同一个颜色：' + same.slice(0, 6).join('、'));
    }
    const FB = [...sv.querySelectorAll('[data-mapforce]')].map(g => { try { return { n: g.getAttribute('data-mapforce'), bb: g.getBBox() }; } catch (_) { return null; } }).filter(Boolean);
    info.forces = FB.length;
    const hit = [];
    for (const f of FB) for (const x of C.concat(City)) {
      const a = f.bb, c = x.bb; const w = Math.min(a.x + a.width, c.x + c.width) - Math.max(a.x, c.x), h = Math.min(a.y + a.height, c.y + c.height) - Math.max(a.y, c.y);
      if (w > 2 && h > 2) hit.push(`${f.n}×${x.t}`);
    }
    if (hit.length) bad.push('兵牌压着名字：' + [...new Set(hit)].slice(0, 6).join('、'));
    if (typeof POLLIST !== 'undefined' && R) {
      const dead = R.list.filter(x => { const P0 = POLLIST.find(q => q && q.name && String(q.name).replace(/（.*$/, '') === String(x.name).replace(/（.*$/, '')); return P0 && P0.to != null && y > P0.to + 2; }).map(x => x.name);
      if (dead.length) bad.push('政权总表止年早于图上（总表可能只写了一段）：' + dead.join('、'));
    }
    const cc = {}; for (const x of City) cc[x.t] = (cc[x.t] || 0) + 1;
    const cdu = Object.entries(cc).filter(([n, k]) => k > 1 && !/^(关|城|渡|驿)$/.test(n)); if (cdu.length) bad.push('城名写了两遍：' + cdu.slice(0, 6).map(d => d[0]).join('、'));
    const cross = [];
    for (const a of C) for (const b of City) {
      const w = Math.min(a.bb.x + a.bb.width, b.bb.x + b.bb.width) - Math.max(a.bb.x, b.bb.x), h = Math.min(a.bb.y + a.bb.height, b.bb.y + b.bb.height) - Math.max(a.bb.y, b.bb.y);
      if (w > 3 && h > 3) cross.push(`${a.t}×${b.t}`);
    }
    if (cross.length) bad.push('国名压着城名：' + [...new Set(cross)].slice(0, 6).join('、'));
    return { bad, info };
  }, [id, y]);

  const shot = async (page, file, bad) => {
    for (let k = 0; k < 3; k++) {
      try {
        await page.waitForTimeout(80);
        const box = await page.locator('.smap').boundingBox();
        if (!box || box.width < 50) throw new Error('图太小');
        await page.screenshot({ path: file, clip: { x: Math.max(0, box.x), y: Math.max(0, box.y), width: Math.min(box.width, 1440), height: Math.min(box.height, 1050) }, timeout: 20000 });
        return;
      } catch (e) { if (k === 2) bad.push('截图没存成：' + String(e.message || e).slice(0, 40)); await page.waitForTimeout(400); }
    }
  };
  const rows = [], Y = years();
  console.log('年份', Y.length, '个；截图在', SHOTS);
  let n = 0;
  for (const y of Y) {
    const { polity, place } = await p.evaluate(yy => {
      const P = (typeof POLLIST !== 'undefined' ? POLLIST : []);
      const ok = P.filter(x => x && x.name && x.from <= yy && x.to >= yy); ok.sort((a, b) => String(b.realm || '').length - String(a.realm || '').length);
      for (const x of ok) { const cap = (x.capital || []).find(c => c && c.from <= yy && c.to >= yy) || (x.capital || [])[0]; if (cap && cap.name) return { polity: String(x.name).replace(/（.*$/, ''), place: cap.name }; }
      const E = yy < -221 ? ['周', '洛阳'] : yy < 9 ? ['秦', '咸阳'] : yy < 25 ? ['新', '长安'] : yy < 220 ? ['东汉', '洛阳'] : yy < 280 ? ['魏', '洛阳'] : yy < 317 ? ['西晋', '洛阳'] : yy < 581 ? ['南朝', '建康'] : yy < 618 ? ['隋', '长安'] : yy < 907 ? ['唐', '长安'] : yy < 960 ? ['后梁', '开封'] : yy < 1127 ? ['北宋', '开封'] : yy < 1279 ? ['南宋', '临安'] : yy < 1368 ? ['元', '大都'] : yy < 1644 ? ['明', '北京'] : ['清', '北京'];
      return { polity: E[0], place: E[1] };
    }, y);
    for (const id of ['emperor', 'warlord', 'commoner']) {
      const st = await p.evaluate(([id, y, polity, place]) => {
        const role = id === 'emperor' ? polity + '皇帝' : id === 'warlord' ? '割据一方的军阀' : '布商';
        S = newSave({ name: id === 'emperor' ? '李从荣' : id === 'warlord' ? '王武' : '张三', gender: '男', age: id === 'emperor' ? 30 : 40, real: false, role, gregorianYear: y, month: 6, day: 1, place, polity });
        S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 2; S.money = { cash: 5000, unit: '贯' }; S.renown = 50;
        if (id !== 'commoner') { S.idm = id === 'emperor' ? 'emperor' : 'warlord'; S.realm = { treasury: 200000, revenue: 90000, outlay: 80000, army: 60000 }; S.territory = [{ place, pop: 400000, troops: 20000, loyalty: 55 }, { place: '洛阳', pop: 300000, troops: 10000, loyalty: 50 }]; S.forces = [{ name: '亲军', leader: '王武', owner: '你', troops: 20000, morale: 65, orgNow: 70, train: 60, grain: 50000, at: place, status: '驻守' }, { name: '外镇兵', leader: '李四', owner: '你', troops: 12000, morale: 60, orgNow: 65, train: 55, grain: 30000, at: '洛阳', status: '驻守' }]; }
        VIEW = 'game'; TAB = 'map'; SIDE_FOLD = true; MAPZ.inited = true; ORGMSG = ''; ERRMSG = '';
        return { polity: S.place.polity, role: S.protagonist.role };
      }, [id, y, polity, place]);
      const drawErr = await p.evaluate(() => { try { MAPZ.mode = 'world'; MAPZ.prov = ''; MAPZ.c = null; MAPC.k = ''; render0(); return ''; } catch (e) { return String(e && e.message || e).slice(0, 60); } });
      let world = { bad: drawErr ? ['画图卡死：' + drawErr] : ['没画'], info: {} };
      try { world = await audit(id, y); } catch (e) { world = { bad: ['查的时候出错：' + String(e.message || e).slice(0, 80)], info: {} }; }
      const wname = `${y}_${id}_world.png`, wf = safeFile(SHOTS, wname);
      if (!drawErr) await shot(p, wf, world.bad);
      const nearErr = await p.evaluate(([place, y]) => {
        try {
          const u = (typeof placeXY === 'function' ? placeXY(S, place, y) : null) || { lon: 112.5, lat: 34.5 };
          MAPZ.mode = 'near'; MAPZ.prov = ''; MAPZ.c = { lon: u.lon, lat: u.lat }; MAPZ.span = 1.3; MAPC.k = ''; render0(); return '';
        } catch (e) { return String(e && e.message || e).slice(0, 60); }
      }, [place, y]);
      let near = { bad: nearErr ? ['画图卡死：' + nearErr] : [], info: {} };
      try { near = await audit(id, y); } catch (e) { near = { bad: ['查的时候出错：' + String(e.message || e).slice(0, 80)], info: {} }; }
      const nname = `${y}_${id}_near.png`, nf = safeFile(SHOTS, nname);
      if (!nearErr) await shot(p, nf, near.bad);
      rows.push({ y, id, polity: st.polity, place, role: st.role, world, near, shots: [wname, nname] });
      n++;
      if (n % 20 === 0) console.log('已查', n, '组（', y, id, '）');
    }
  }

  const findings = [];
  for (const r of rows) for (const view of ['world', 'near']) for (const t of (r[view].bad || [])) findings.push({ y: r.y, id: r.id, view, text: t, shot: `${r.y}_${r.id}_${view}.png` });
  fs.writeFileSync(safeFile(OUT, 'findings.json'), JSON.stringify({ at: new Date().toISOString(), years: Y.length, rows, findings, errs }, null, 1));
  const byYear = {}; for (const f of findings) (byYear[f.y] = byYear[f.y] || []).push(f);
  let md = `# 舆图普查清单（程序初查，${new Date().toISOString().slice(0, 10)}）\n\n`;
  md += `覆盖 ${Y.length} 个年份、三种身份，每张图存两份（天下／放大），截图在 \`${SHOTS}\`。\n\n`;
  md += `程序查出 ${findings.length} 条，涉 ${Object.keys(byYear).length} 个年份。逐条核对后再按「年/身份/截图/什么错/照哪本书」整理成回报。\n\n`;
  for (const y of Object.keys(byYear).map(Number).sort((a, b) => a - b)) {
    md += `## ${y < 0 ? '前' + (-y) : y}年\n`;
    for (const f of byYear[y]) md += `- ${f.id}／${f.view === 'world' ? '天下图' : '放大图'}｜${f.text}｜${f.shot}\n`;
    md += '\n';
  }
  fs.writeFileSync(safeFile(OUT, '清单.md'), md);
  console.log('完：', findings.length, '条；findings.json、清单.md、截图在', OUT);
  console.log('页面错误', JSON.stringify(errs.slice(0, 5)));
  await b.close();
})().catch(e => { console.error('崩了', e && (e.stack || e.message)); process.exit(1); });
