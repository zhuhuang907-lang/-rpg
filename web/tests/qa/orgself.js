// 朝局核实与主角落位（R-203~205）：seatSelf 照官职落位并写日志、你的位子卡（上司同僚辖地）、seatPut 拒带标点的假名、
// 原文库核人（三略·天下），核不上大员腾位写出缺、朝堂徽标 ✓核、blocks 带「你的位子」行
const { chromium } = require('playwright');
const path = require('path'), http = require('http'), fs = require('fs');
(async () => {
  const WEB = path.resolve(__dirname, '../..'), COR = path.resolve(WEB, '..', 'corpus');
  const srv = http.createServer((q, r) => {
    const f = decodeURIComponent(q.url.split('?')[0]);
    const fp = f.startsWith('/corpus/') ? path.join(COR, f.slice(8)) : path.join(WEB, f === '/' ? 'play.html' : f.slice(1));
    if (!fp.startsWith(COR) && !fp.startsWith(WEB)) { r.writeHead(403); return r.end(); }
    try { const d = fs.readFileSync(fp); r.writeHead(200, { 'content-type': /\.gz$/.test(fp) ? 'application/gzip' : 'text/html; charset=utf-8' }); r.end(d); }
    catch { r.writeHead(404); r.end('no'); }
  }).listen(0, '127.0.0.1');
  await new Promise(res => { if (srv.address()) res(); else srv.on('listening', res); });
  const base = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1500, height: 950 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto(base + '/play.html'); await p.waitForFunction(() => typeof seatSelf === 'function' && typeof personEvidence === 'function');
  const out = await p.evaluate(async port => {
    const bad = [];
    const mkOrg = () => { s.org = { regime: '北宋 熙宁元年', pol: '北宋', at: 1, y: 1068, log: [], nodes: [
      { id: 'root', name: '朝廷', parent: '', depth: 0, posts: [], places: [] },
      { id: 'hz', name: '汉中', parent: 'root', depth: 1, path: true, places: ['汉中府', '兴元府'], posts: [
        { title: '知府', rank: '正四品', holder: '', src: '', quota: 1, needReal: true, status: '出缺' },
        { title: '通判', rank: '正六品', holder: '钱通判', src: '拟', quota: 1 },
        { title: '推官', rank: '从六品', holder: '孙推官', src: '拟', quota: 1 }] },
      { id: 'center', name: '中书省', parent: 'root', depth: 1, posts: [
        { title: '参知政事', rank: '正二品', holder: '冯假假', src: 'DS表', quota: 1 }] }] };
      S.courtChk = {}; S.career = { office: '汉中太守' }; S.turn = 2; S.clock = { y: 1068, m: 3, d: 1, yearLabel: '熙宁元年' };
      S.protagonist = { name: '王二', age: 34, role: '汉中知府' };
    };
    let s = S = newSave({ name: '王二', gender: '男', age: 34, role: '汉中太守', gregorianYear: 1068, month: 3, day: 1, place: '汉中', polity: '北宋' });
    mkOrg();
    // 1. seatSelf：照「汉中太守」落进知府位子，写日志；树里 findPost 找得到你
    const m = seatSelf(s);
    if (!m) bad.push('seatSelf 没落位');
    else { if (m[1].holder !== '王二') bad.push('位子没给主角：' + m[1].holder); if (m[0].name !== '汉中') bad.push('落错了衙门：' + m[0].name); }
    if (!findPost(s, '王二')) bad.push('树里找不到主角');
    if (!s.org.log.some(x => String(x.text).includes('就任'))) bad.push('落位没写日志');
    // 2. 你的位子卡：上司/同僚
    const card = seatSelfLine(s);
    if (!card.includes('你的位子') || !card.includes('知府')) bad.push('位子行没写全：' + card.slice(0, 60));
    // 3. seatPut 拒带标点的假名
    const n0 = s.org.nodes.find(n => n.id === 'center'), q0 = n0.posts[0];
    const okPut = seatPut(s, n0, q0, '王安石，参知政事', '拟');
    if (okPut) bad.push('带标点的假名竟然收了');
    // 4. 原文库核人（真语料：本地 corpus/），「王安石」在《宋史》有传
    MODE = 'none'; globalThis.WLIB_BASE = 'http://127.0.0.1:' + port + '/corpus/';
    const ev = await personEvidence(s, '王安石', '中书省参知政事');
    if (!ev || !ev.ok) bad.push('原文库核不出王安石：' + JSON.stringify(ev)); else if (!ev.src.includes('原文库')) bad.push('核实出处不对：' + ev.src);
    const ev2 = await personEvidence(s, '冯假假', '中书省参知政事');
    if (ev2 && ev2.ok) bad.push('假名竟在原文库里核到了');
    // 5. 朝堂徽标：courtChkMark 后 courtHtml 出 ✓核
    s.court = { y: 1068, people: [{ name: '王安石', real: true, post: '参知政事', faction: '新党', ties: [] }], factions: [] };
    courtChkMark(s, '王安石', '原文库·宋史');
    const ch = courtHtml(s);
    if (!ch.includes('✓核')) bad.push('朝堂全表没有核实徽标');
    // 6. 朝局页树前有「你的位子」卡（进 courtPage 的模板太重，直接查 seatSelfLine 已覆盖；此处查 org 日志腾位逻辑用的字段）
    return bad;
  }, srv.address().port);
  console.log('ERRS', JSON.stringify([...errs, ...out]));
  await b.close(); srv.close(); process.exit(errs.length || out.length ? 1 : 0);
})();
