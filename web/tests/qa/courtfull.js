// 真人不标虚拟、朝堂全表、立嗣和后宅有后果（CLAUDE.md「人物」真人不标虚拟、「人事与职权」朝堂全表、「剧情」立嗣后宅派系）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1400 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof courtFullDS === 'function');
  const bad = [];
  const r1 = await p.evaluate(async () => {
    const bad = [];
    S = newSave({ name: '杨坚', gender: '男', age: 60, role: '隋文帝', real: true, gregorianYear: 600, month: 6, day: 1, place: '大兴', polity: '隋' }); S.idm = 'emperor'; S.chat = [{ role: 'gm', text: '开场。' }]; S.polPts = 20;
    S.people = { 杨勇: { role: '皇太子', tie: '长子', seen: 1 }, 王小二: { role: '宫门杂役', seen: 1 }, 李虚子: { role: '门客', seen: 1, fic: true } };
    // 1 开局没核过的真人不标虚拟；标了虚构的才标
    const t = markFict(S, '杨勇入宫谒见，李虚子随侍。'); if (/杨勇（虚拟）/.test(t)) bad.push('没核过的杨勇被标了虚拟'); if (!/李虚子（虚拟）/.test(t)) bad.push('标了虚构的人没标虚拟');
    // 2 一张表核真假
    const oc = callClaude; callClaude = async pr => { if (/是不是史书上真有其人/.test(pr)) { const rows = []; pr.split('\n').forEach(l => { const m = /^(\d+)\. (.+?)（/.exec(l); if (m) rows.push({ i: +m[1], real: m[2] === '杨勇' ? '真' : m[2] === '王小二' ? '假' : '不详', who: m[2] === '杨勇' ? '隋皇太子' : '' }); }); return { text: JSON.stringify({ rows }) }; } return { text: '{}' }; };
    try { await pplChkDS(S); } finally { callClaude = oc; }
    if (S.people.杨勇.real !== true) bad.push('DS 表说是真人的没记成真人'); if (!S.people.王小二.fic) bad.push('DS 表说是编的没记成虚构'); if (fictionShow(S).has('杨勇')) bad.push('核成真人以后还标虚拟');
    // 3 朝堂全表并进人事树（这一段只测模型的表怎么并进树；照任职年表先坐位子另有测试，这里把年表挪开，免得史料上 600 年已罢官的高颎被年表改掉）
    const T0 = TENURE; TENURE = [];
    S.org = { nodes: [{ id: 'root', name: '朝廷', depth: 0, posts: [{ title: '皇帝', holder: '杨坚' }] }, { id: 'A1', name: '尚书省', depth: 1, parent: 'root', posts: [{ title: '尚书令', rank: '正二品', holder: '', noGrant: '隋尚书令照例不授', status: '照例不授' }, { title: '左仆射', rank: '从二品', holder: '' }, { title: '右仆射', rank: '从二品', holder: '王虚拟', src: '拟' }] }, { id: 'A2', name: '吏部', depth: 2, parent: 'A1', posts: [{ title: '吏部尚书', rank: '正三品', holder: '' }] }], log: [] };
    let asks = 0; callClaude = async pr => { if (/朝廷里的要紧人物列成一整张表/.test(pr)) { asks++; if (/中枢/.test(pr.split('这一张只写：')[1] || '')) return { text: JSON.stringify({ people: [{ name: '高颎', post: '尚书左仆射', organ: '尚书省', rank: '从二品', faction: '太子党', real: '真', ties: [{ to: '杨勇', rel: '姻亲' }], stance: '力保太子' }, { name: '杨素', post: '尚书右仆射', organ: '尚书省', rank: '从二品', faction: '晋王党', real: '真', ties: [{ to: '杨广', rel: '同党' }] }, { name: '牛弘', post: '吏部尚书', organ: '吏部', rank: '正三品', real: '真' }, { name: '苏威', post: '纳言', organ: '门下省', rank: '正三品', real: '真' }, { name: '尚书令', post: '尚书令', organ: '尚书省', real: '真' }, { name: '柳虚生', post: '门下录事', organ: '门下省', rank: '从七品', real: '假' }], factions: [{ name: '太子党', leader: '高颎', members: ['高颎', '杨勇'], aim: '保住东宫' }, { name: '晋王党', leader: '杨素', members: ['杨素', '杨广'], aim: '易储' }] }) };
        return { text: JSON.stringify({ people: [{ name: '独孤伽罗', post: '皇后', organ: '后宫', real: '真' }], factions: [] }) }; } return { text: '{}' }; };
    try { await courtFullDS(S); } finally { callClaude = oc; }
    if (asks !== 3) bad.push('朝堂全表没分三块一回问完：' + asks);
    const q = (n, t) => (S.org.nodes.find(z => z.name === n) || { posts: [] }).posts.find(x => x.title === t) || {};
    if (q('尚书省', '左仆射').holder !== '高颎') bad.push('左仆射没照表填上高颎：' + JSON.stringify(q('尚书省', '左仆射')));
    if (q('尚书省', '右仆射').holder !== '杨素') bad.push('原先虚构的右仆射没换成表上的真人');
    if (q('吏部', '吏部尚书').holder !== '牛弘') bad.push('吏部尚书没填');
    if (q('尚书省', '尚书令').holder) bad.push('照例不授的尚书令被表填了人');
    if (!S.org.nodes.some(z => /门下/.test(z.name) && z.posts.some(x => x.holder === '苏威'))) bad.push('树上没有的门下省没添上');
    if (!S.org.nodes.some(z => z.posts.some(x => x.holder === '柳虚生' && x.src === '拟'))) bad.push('表上虚构的小官没标虚拟：' + JSON.stringify(S.org.nodes.map(z => [z.name, z.posts.map(x => x.title + ':' + x.holder + ':' + x.src)])));
    if (!arr(S.factions).some(f => f.name === '晋王党' && /杨广/.test(f.members))) bad.push('派系没并进派系账');
    if (!S.court || !S.court.people.some(x => x.name === '高颎' && x.ties.some(t => t.to === '杨勇'))) bad.push('关系没存下');
    TENURE = T0;

    return bad;
  });
  bad.push(...r1);
  await p.evaluate(() => { TAB = 'people'; VIEW = 'game'; SIDE_FOLD = false; render0(); });
  let h = await p.evaluate(() => document.body.innerText); if (!/朝堂全表/.test(h) || !/晋王党/.test(h)) bad.push('人物页没摆朝堂全表');
  await p.evaluate(() => { TAB = 'court'; render0(); }); h = await p.evaluate(() => document.body.innerText); if (!/朝堂全表/.test(h)) bad.push('朝局页没摆朝堂全表');
  // 4 立嗣有后果（真点按钮）
  await p.evaluate(() => { S.household = [{ relation: '妻', name: '独孤伽罗', age: 56 }, { relation: '嫔', name: '云昭训', age: 30 }, { relation: '长子', name: '杨勇', age: 32, mother: '独孤伽罗' }, { relation: '次子', name: '杨广', age: 30, mother: '独孤伽罗' }, { relation: '三子', name: '杨俊', age: 28, mother: '云昭训' }]; S.people = Object.assign(S.people, { 杨广: { role: '晋王', seen: 1 }, 杨俊: { role: '秦王', seen: 1 }, 独孤伽罗: { role: '皇后', seen: 1 }, 云昭训: { role: '嫔', seen: 1 } }); S.renown = 300; S.home = { harmony: 70 }; S.press = []; TAB = 'people'; render0(); });
  const hb = await p.$('button[data-heir="杨广"]'); if (!hb) bad.push('人物页没有立嗣按钮'); else {
    await p.click('button[data-heir="杨广"]'); const st = await p.evaluate(() => ({ heir: S.heir, fy: (S.people.杨勇 || {}).favor, fg: (S.people.杨广 || {}).favor, ren: S.renown, har: S.home.harmony, press: arr(S.press).map(x => x.title), fac: arr(S.factions).map(f => f.name), chron: arr(S.chronicle).slice(-1)[0], msg: ORGMSG }));
    if (st.heir !== '杨广') bad.push('点了立嗣没立上');
    if (!(st.fy < 0) || !(st.fg > 0)) bad.push('立嗣以后被越过的、被立的情分没动：' + JSON.stringify(st));
    if (!(st.ren < 300) || !(st.har < 70)) bad.push('越过嫡长子名声、家宅和睦没掉：' + JSON.stringify(st));
    if (!st.press.some(t => /储位之争/.test(t))) bad.push('一方之主废立没来储位之争的临门之事');
    if (!st.fac.some(n => /杨勇/.test(n)) && !st.fac.some(n => /太子党/.test(n))) bad.push('被废的那一派没进派系账');
    if (!st.chron || !/立次子杨广为嗣/.test(st.chron.what)) bad.push('立嗣没进年谱');
  }
  // 5 后宅：宠、冷落落到情分和和睦，别的妻妾吃醋；一个月对同一人一回
  await p.evaluate(() => { TAB = 'people'; render0(); });
  const hm = await p.$('button[data-harem="云昭训"][data-hact="chong"]'); if (!hm) bad.push('人物页没有后宅按钮'); else {
    const f0 = await p.evaluate(() => ({ y: (S.people.云昭训 || {}).favor || 0, d: (S.people.独孤伽罗 || {}).favor || 0, h: S.home.harmony })); await p.click('button[data-harem="云昭训"][data-hact="chong"]');
    const f1 = await p.evaluate(() => ({ y: (S.people.云昭训 || {}).favor || 0, d: (S.people.独孤伽罗 || {}).favor || 0, h: S.home.harmony }));
    if (!(f1.y > f0.y) || !(f1.d < f0.d) || !(f1.h < f0.h)) bad.push('宠幸没落到情分、别的妻妾、家宅和睦上：' + JSON.stringify([f0, f1]));
    await p.evaluate(() => { TAB = 'people'; render0(); }); await p.click('button[data-harem="云昭训"][data-hact="chong"]');
    if (!/已有过处置/.test(await p.evaluate(() => ORGMSG))) bad.push('一个月里能对同一人反复宠幸');
  }
  for (const x of bad) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
