// 历史原文库取证（R-171）：按年代挑书、按年号/真人/制度词出检索词、桌面与网页两路都能查到原文、材料里带出处
const { chromium } = require('playwright');
const path = require('path'), http = require('http'), fs = require('fs'), zlib = require('zlib');
(async () => {
  // 本机小服务：/play.html 当桌面版（/api/histlib/cite 照本机服务的应答）、/corpus/ 当云端语料库
  const WEB = path.resolve(__dirname, '../..'), COR = path.resolve(WEB, '..', 'corpus');
  const srv = http.createServer((q, r) => {
    if (/^\/api\/histlib\/cite/.test(q.url)) {
      const u = new URL(q.url, 'http://x');
      r.setHeader('content-type', 'application/json');
      r.end(JSON.stringify({ ok: true, hits: [{ book: 'songshi', name: '宋史', volume: '卷14', text: '王安石上疏言：「民不加赋而国用饶。」' }] }));
      return;
    }
    const f = decodeURIComponent(q.url.split('?')[0]).replace(/\/+$/, '/');
    const fp = f.startsWith('/corpus/') ? path.join(COR, f.slice(8)) : path.join(WEB, f === '/' ? 'play.html' : f.slice(1));
    if (!fp.startsWith(COR) && !fp.startsWith(WEB)) { r.writeHead(403); return r.end(); }
    try { const d = fs.readFileSync(fp); r.writeHead(200, { 'content-type': /\.gz$/.test(fp) ? 'application/gzip' : 'text/html; charset=utf-8' }); r.end(d); }
    catch { r.writeHead(404); r.end('no'); }
  }).listen(0, '127.0.0.1');
  await new Promise(res => { if (srv.address()) res(); else srv.on('listening', res); });
  const base = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto(base + '/play.html'); await p.waitForFunction(() => typeof citeInto === 'function');
  const out = await p.evaluate(async port => {
    const bad = [];
    const mk = (y, extra) => ({ protagonist: { name: '王二', age: 30, role: '佃农' }, clock: { y, m: 3, d: 5, yearLabel: extra.yl || y + '年' }, place: { polity: extra.pol || '', full: extra.full || '某县' }, people: {}, chat: [], goals: [], ...(extra || {}) });
    // 1. 按年代挑书：北宋、清初、东晋；制度词追加政书
    const b1 = histBooksFor(mk(1068, { yl: '熙宁元年', pol: '北宋' }), '');
    if (!b1.includes('songshi') || !b1.includes('changbian')) bad.push('北宋该查宋史与续资治通鉴长编：' + b1);
    const b2 = histBooksFor(mk(1650, { yl: '顺治七年', pol: '清' }), '');
    if (!b2.includes('qingshigao')) bad.push('清初该查清史稿：' + b2);
    const b3 = histBooksFor(mk(340, { yl: '建元二年', pol: '东晋' }), '');
    if (!b3.includes('jinshu')) bad.push('东晋该查晋书：' + b3);
    const b4 = histBooksFor(mk(1068, { yl: '熙宁元年' }), '我要推行科举');
    if (!b4.includes('tongdian') || !b4.includes('wenxiantongkao')) bad.push('说科举该带上通典文献通考：' + b4);
    // 2. 桌面路：api 走真 fetch，本机服务的应答上面已摆好；检索词带年号与真人，材料带出处和规矩
    const s = mk(1068, { yl: '熙宁元年', pol: '北宋', full: '扬州府江都县', dossiers: { 王安石: { real: true, born: 1021, died: 1086 } } });
    MODE = 'local';
    await citeInto(s, '王安石上疏推行科举');
    const cb = citeBlock(s);
    if (!cb.includes('《宋史》') || !cb.includes('照这里抄')) bad.push('材料里没带出处或引用规矩：' + cb.slice(0, 80));
    // 3. 网页路：语料指到本机 corpus/（真解压、真建索引），查一句原文
    MODE = 'none'; globalThis.WLIB_BASE = 'http://127.0.0.1:' + port + '/corpus/';
    const s2 = mk(1068, { yl: '熙宁元年' });
    s2.citeAt = null; s2.citeNow = null;
    try {
      const hits = await citeFetch(s2, ['sanlue'], ['天下']);
      if (!hits.length) bad.push('网页版真语料查不到原文（sanlue 天下）'); else if (!hits[0].text) bad.push('网页版命中没有正文');
    } catch (e) { bad.push('网页版语料下载失败：' + (e.message || e)); }
    return bad;
  }, srv.address().port);
  console.log('ERRS', JSON.stringify([...errs, ...out]));
  await b.close(); srv.close(); process.exit(errs.length || out.length ? 1 : 0);
})();
