// 史料中枢（R-236~241）：检索同段近邻与卷类意图、官称别称表与认官、核人铁证（名字＋官称/年号/衙门同段才算核上，光杆名字只算线索）、
// 博查核实照别称认官、核实落档 real 只升不降、古人不许落档、书单扩充（典故类书、河工水利、清制查清政书）
const { chromium } = require('playwright');
const path = require('path'), http = require('http'), fs = require('fs');
(async () => {
  const PLAY = String(process.env.PLAY || ''), winPlay = /^\/[a-zA-Z]\//.test(PLAY) ? PLAY.slice(1, 2).toUpperCase() + ':/' + PLAY.slice(3) : PLAY;
  const WEB = winPlay ? path.resolve(path.dirname(winPlay)) : path.resolve(__dirname, '../..'), COR = path.resolve(WEB, '..', 'corpus');
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
  await p.goto(base + '/play.html'); await p.waitForFunction(() => typeof libScan === 'function' && typeof libNear === 'function' && typeof personEvidence === 'function' && typeof filePerson === 'function' && typeof postHitText === 'function' && typeof libHint === 'function');
  const out = await p.evaluate(async port => {
    const bad = [];
    // 1. 同段近邻：挤在一起才数出多个词；隔远了只算各中各的
    if (libNear('王安石，熙宁二年二月拜参知政事', ['王安石', '参知政事']) !== 2) bad.push('近邻：挤在一起没数出 2');
    const F = '初，郑獬知开封府，坐失出狱卒夺官，又岁大旱，蝗飞蔽日，诏求直言。';
    if (libNear('王安石' + F.repeat(9) + '参知政事', ['王安石', '参知政事']) !== 1) bad.push('近邻：隔远了还算同现');
    // 2. 检索近邻加成：词挤在一起的那段排前头；命中的条目带回整段
    const texts = [{ v: '本纪', t: '王安石' + F.repeat(9) + '参知政事。' }, { v: '列传', t: '王安石，熙宁二年二月拜参知政事，行新法。' }];
    const hits = libScan(texts, libTerms('王安石|参知政事'), 2);
    if (!hits.length || hits[0].volume !== '列传') bad.push('近邻加成没把挤在一起的排前头：' + JSON.stringify(hits.map(h => h.volume)));
    if (!hits[0].seg || !hits[0].seg.includes('参知政事')) bad.push('命中条目没带回整段');
    // 3. 卷类意图：问人优先列传、问制度优先志、问事优先纪（同样的词、同样的段，只换问法）
    const t3 = [{ v: '本纪第三', t: '王安石拜参知政事。' }, { v: '河渠志', t: '王安石拜参知政事。' }, { v: '列传第八十', t: '王安石拜参知政事。' }];
    const h1 = libScan(t3, libTerms('王安石'), 3, '人')[0].volume, h2 = libScan(t3, libTerms('王安石'), 3, '制')[0].volume, h3 = libScan(t3, libTerms('王安石'), 3, '事')[0].volume;
    if (h1 !== '列传第八十' || h2 !== '河渠志' || h3 !== '本纪第三') bad.push('卷类意图不对：人=' + h1 + ' 制=' + h2 + ' 事=' + h3);
    if (libHint('那年漕运改了什么章程') !== '制' || libHint('北伐打到哪了') !== '事' || libHint('王安石这人怎样') !== '人') bad.push('卷类猜问不对');
    // 4. 官称别称表与认官
    const als = postAliasAll('知府');
    for (const a of ['知府', '太守', '郡守']) if (!als.includes(a)) bad.push('别称表缺：' + a);
    if (postTitleOf('汉中太守') !== '太守' || postTitleOf('中书省参知政事') !== '参知政事' || postTitleOf('汉中府知府') !== '知府') bad.push('认官不对：' + [postTitleOf('汉中太守'), postTitleOf('中书省参知政事'), postTitleOf('汉中府知府')].join('/'));
    // 5. 官称认得（博查核实用同一把尺）：本官、史称别称都认；不相干的不认
    if (!postHitText('二年二月，拜参知政事。', '参知政事')) bad.push('官称摘句认不出本官');
    if (postHitText('以为翰林学士。', '参知政事')) bad.push('不相干的官也算认得');
    if (!postHitText('除知某府事。', '知府')) bad.push('史称别称认不出：知某府事');
    // 6. 核人铁证（真语料）：王安石在《宋史》，名字＋官称同段才算核上
    MODE = 'none'; globalThis.WLIB_BASE = 'http://127.0.0.1:' + port + '/corpus/';
    const s = S = newSave({ name: '王二', gender: '男', age: 34, role: '汉中太守', gregorianYear: 1068, month: 3, day: 1, place: '汉中', polity: '北宋' });
    const ev = await personEvidence(s, '王安石', '中书省参知政事');
    if (!ev || !ev.ok) bad.push('王安石核不上：' + JSON.stringify(ev)); else if (!ev.src.includes('名字与官称同段')) bad.push('核实出处没写同段：' + ev.src);
    const ev2 = await personEvidence(s, '冯假假', '中书省参知政事');
    if (ev2 && ev2.ok) bad.push('假名竟核上了');
    // 7. 光杆名字只算线索：只有名字的段不许算核上
    const realCF = citeFetch;
    PEV_MEMO.clear();
    citeFetch = async () => [{ name: '宋史', volume: '卷一', text: '李四者，好饮酒，善属文。', seg: '李四者，好饮酒，善属文。' }];
    const ev3 = await personEvidence(s, '李四', '汉中太守');
    if (ev3 && ev3.ok) bad.push('光杆名字竟然算核上了：' + JSON.stringify(ev3));
    // 8. 名字＋年号同段也算铁证（史载这一年他在此任）
    PEV_MEMO.clear();
    citeFetch = async () => [{ name: '宋史', volume: '卷二', text: '熙宁元年，李四为汉中太守。', seg: '熙宁元年，李四为汉中太守。' }];
    const ev4 = await personEvidence(s, '李四', '汉中太守');
    if (!ev4 || !ev4.ok) bad.push('名字＋年号同段没算核上：' + JSON.stringify(ev4));
    // 9. 名字＋别称同段也算铁证：宋史写作「知某府事」，查太守别称照样认出来
    PEV_MEMO.clear();
    citeFetch = async () => [{ name: '宋史', volume: '卷三', text: '李四，知某府事，有惠政。', seg: '李四，知某府事，有惠政。' }];
    const ev5 = await personEvidence(s, '李四', '汉中太守');
    if (!ev5 || !ev5.ok) bad.push('名字＋别称同段没算核上：' + JSON.stringify(ev5));
    citeFetch = realCF;
    // 10. 核实落档：各处核上的都写进档案，real 只升不降；古人（李白）不许落档
    const d0 = filePerson(s, '李四', { ok: true, src: '原文库·宋史卷二（名字与官称同段）', post: '太守' });
    const D0 = s.dossiers['李四'];
    if (!d0 || !D0 || D0.real !== true || D0.post !== '太守' || !String(D0.chk).includes('原文库')) bad.push('核实没落档：' + JSON.stringify(D0));
    const before = JSON.stringify(D0);
    courtChkMark(s, '李四', '博查');
    if (JSON.stringify(s.dossiers['李四']) !== before) bad.push('落档被降级/改写：' + JSON.stringify(s.dossiers['李四']));
    if (!s.courtChk['李四']) bad.push('朝堂核实徽标没记');
    const d1 = filePerson(s, '李白', { ok: true, src: '原文库·旧唐书' });
    if (d1 || s.dossiers['李白']) bad.push('古人（李白）落档了——时代门没拦住');
    // 11. 书单扩充：典故查类书、水利查地理书、清制查清政书
    if (!libBooksFor(1068, '北宋', '典故 掌故').includes('taipingyulan')) bad.push('问典故不查类书');
    if (!libBooksFor(1068, '北宋', '治河 水利').includes('dushifangyu')) bad.push('问水利不查地理书');
    if (!libBooksFor(1757, '清', '官制 铨选').includes('tongdian')) bad.push('问清制不查通典');
    return bad;
  }, srv.address().port);
  console.log('ERRS', JSON.stringify([...errs, ...out]));
  await b.close(); srv.close(); process.exit(errs.length || out.length ? 1 : 0);
})();
