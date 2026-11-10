// 历史原文库取证（R-171）：按年代挑书、按年号/真人/制度词出检索词、桌面与网页两路都能查到原文、材料里带出处
const { chromium } = require('playwright');
const path = require('path'), http = require('http'), fs = require('fs'), zlib = require('zlib');
(async () => {
  // 本机小服务：/play.html 当桌面版（/api/histlib/cite 照本机服务的应答）、/corpus/ 当云端语料库
  const WEB = process.env.PLAY ? path.dirname(path.resolve(process.env.PLAY)) : path.resolve(__dirname, '../..'), COR = path.resolve(WEB, '..', 'corpus');   // 完整测试里脚本被拷到临时目录跑，照 PLAY 找网页（以前照脚本所在目录找，在 GitHub 上找不到网页，一直超时，害得 Windows 版打不出来）
  const REQ = [];
  const srv = http.createServer((q, r) => {
    if (/^\/api\/histlib\/cite/.test(q.url)) {
      const u = decodeURIComponent(q.url);
      REQ.push(u);
      const hit = /市舶|漕运/.test(u) ? { book: 'tongdian', name: '通典', volume: '卷85', text: '凡漕运之制焉。' } : { book: 'songshi', name: '宋史', volume: '卷14', text: '王安石上疏言：「民不加赋而国用饶。」' };
      r.setHeader('content-type', 'application/json');
      r.end(JSON.stringify({ ok: true, hits: [hit] }));
      return;
    }
    if (/^\/reqs/.test(q.url)) { r.setHeader('content-type', 'application/json'); r.end(JSON.stringify(REQ.splice(0))); return; }
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
    const b5 = histBooksFor(mk(1068, { yl: '熙宁元年' }), '主母操办丧礼');
    if (!b5.includes('tongdian')) bad.push('说丧礼该带上通典（礼制）：' + b5);
    // 2. 本局改元不影响检索词：史书年号照史料取（熙宁），本局年号也一并查
    const sM = mk(1068, { yl: '自安元年', pol: '北宋', full: '扬州府江都县' });
    const he = histEraName(sM);
    if (he !== '熙宁') bad.push('改元后史书年号该照史料取「熙宁」：' + he);
    MODE = 'local';
    const getReq = async () => (await (await fetch('/reqs')).json()).join('|');
    const s = mk(1068, { yl: '自安元年', pol: '北宋', full: '扬州府江都县', dossiers: { 王安石: { real: true, born: 1021, died: 1086 } } });
    await citeInto(s, '王安石上疏推行科举');
    const rq1 = await getReq();
    if (!rq1.includes('熙宁')) bad.push('检索词没有史书年号熙宁：' + rq1);
    if (!rq1.includes('自安')) bad.push('本局改的元也要查一查：' + rq1);
    if (!rq1.includes('songshi') || !rq1.includes('tongdian')) bad.push('说科举书单里该有宋史和通典：' + rq1);
    const cb = citeBlock(s);
    if (!cb.includes('《宋史》') || !cb.includes('照这里抄')) bad.push('材料里没带出处或引用规矩：' + cb.slice(0, 80));
    if (!cb.includes('化用') || !cb.includes('以材料里「本局」的记载为准')) bad.push('没写历史改变后的化用规矩');
    // 3. 追加检索词：推演 search 词、lookup「原文:词」、玩家口头「查 XX 的原文」都并进来；同回再调不重查基础词
    const s3 = mk(1068, { yl: '自安元年', pol: '北宋', full: '扬州府江都县' });
    await citeInto(s3, '查漕运的原文', ['两浙 漕运 熙宁三年', '原文:市舶', '中书门下 政事堂']);
    const rq3 = await getReq();
    if (!rq3.includes('漕运')) bad.push('推演 search 词没并进检索：' + rq3);
    if (!rq3.includes('市舶')) bad.push('lookup「原文:市舶」没并进检索：' + rq3);
    if (!s3.citeNow.some(h => h.book === '通典')) bad.push('追加检索的命中没挂上 citeNow：' + JSON.stringify(s3.citeNow));
    if (!FEED.some(f => String(f.t).includes('《通典》'))) bad.push('命中原文没摆到「翻到的资料」上');
    await citeInto(s3, '又一句');
    const rq4 = await getReq();
    if (rq4) bad.push('同回第二次调用不该重查基础词：' + rq4);
    // 4. 网页路：语料指到本机 corpus/（真解压、真建索引），查一句原文
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
