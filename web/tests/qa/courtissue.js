// 朝局可玩性（R-212~214）：朝议摆上页面、玩家表态能定成败、待办与回音看得到、你的位子没落树也有卡、空缺数不虚高
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html')));
  await p.waitForFunction(() => typeof courtTab === 'function' && typeof issueAct === 'function' && typeof courtIssueApply === 'function');
  const out = await p.evaluate(() => {
    const bad = [];
    const mk = () => {
      const s = newSave({ name: '王二', gender: '男', age: 38, role: '知县', gregorianYear: 1757, month: 3, day: 1, place: '扬州府江都县', polity: '清' });
      s.career = { office: '江都县知县', rank: '正七品', degree: '进士' };
      s.org = { nodes: [
        { id: 'root', name: '朝廷', depth: 0, posts: [] },
        { id: 'n1', name: '江都县署', depth: 1, parent: 'root', path: true, posts: [{ title: '知县', holder: '王二', quota: 1, src: '玩家' }] }
      ], at: 1, regime: '清' };
      s.issue = null; s.orgPending = []; s.org.log = []; s.qingyi = 0; s.polPts = 5;
      return s;
    };
    // 1 朝议摆在朝局页上，没定时有表态按钮
    let s = mk();
    s.issue = { k: '盐法更张', fx: { key: '腐败', d: -1 }, ym: Math.floor(s.clock.y * 12 + 3), stances: [{ f: '清流', st: '反对', de: '不可与民争利' }, { f: '盐商', st: '赞成', de: '请减窝价' }], twist: '有人递了密札', verdict: '', why: '' };
    let html = courtTab(s);
    if (!/朝议/.test(html) || !/盐法更张/.test(html)) bad.push('朝局页上没有朝议');
    if (!/data-issue="赞成"/.test(html) || !/data-issue="反对"/.test(html)) bad.push('朝议没给玩家表态的按钮');
    if (!/不可与民争利/.test(html)) bad.push('各派的诉求没摆出来');
    // 2 玩家表态：官身一票算席位票力，能定成败；结果进朝局日志和年谱
    const line = issueAct(s, '赞成');
    if (!s.issue.verdict) bad.push('玩家表态后议题还是悬着：' + line);
    if (!/议行|流产|搁置/.test(String(line))) bad.push('表态结果没写明：' + line);
    if (!s.issue.playerStance) bad.push('没记下玩家表的是哪一头');
    if (!arr(s.intrigueLog).some(x => /朝议|议题/.test(String(x.op) + x.did))) bad.push('朝议结果没进朝局日志');
    if (!arr(s.chronicle).some(x => /朝议/.test(String(x.what)))) bad.push('朝议结果没进年谱');
    html = courtTab(s);
    if (!/议行|流产|搁置/.test(html)) bad.push('朝局页上看不到朝议结果');
    if (/data-issue="赞成"/.test(html)) bad.push('议题已定还让玩家表态');
    // 3 读书人白身：表态只算清议，定不了朝议
    const s3 = mk(); s3.career = { degree: '生员' }; s3.protagonist.role = '秀才'; s3.org = null; s3.qingyi = 0;
    s3.issue = { k: '取士之路', fx: null, ym: Math.floor(s3.clock.y * 12 + 3), stances: [{ f: '清流', st: '赞成' }], twist: '', verdict: '', why: '' };
    issueAct(s3, '反对');
    if (s3.issue.verdict) bad.push('白身读书人一表态就把朝议定了');
    if (!(s3.qingyi < 0)) bad.push('白身表态没算清议：' + s3.qingyi);
    // 4 待办与回音摆在朝局页上
    s = mk();
    s.orgPending = [{ act: 'appoint', line: '下令：任命刘统勋为户部尚书。', turn: s.turn, who: '刘统勋', done: false, res: '准', boss: '吏部', why: '资历够' }];
    s.org.log = [{ turn: s.turn, when: '乾隆二十二年三月', text: '刘统勋到任户部尚书' }];
    html = courtTab(s);
    if (!/朝局待办与回音/.test(html) || !/上头准了/.test(html) || !/刘统勋到任户部尚书/.test(html)) bad.push('朝局页看不到待办与回音');
    // 5 你的位子：人事树还没排到本衙门，也要有一张卡，不许空着
    s = mk(); s.org.nodes[1].posts[0].holder = ''; s.career = { office: '扬州府知府', rank: '正四品' };
    html = courtTab(s);
    if (!/你的位子/.test(html) || !/扬州府知府/.test(html) || !/还没排到/.test(html)) bad.push('位子没落进树时，你的位子卡也没了');
    // 6 人事空缺不虚高：照额设的丙等员额、照例不授的不算空缺（一方之主的总览卡上）
    s = mk(); s.idm = 'emperor'; s.protagonist.role = '皇帝'; s.gov = null;
    s.org.nodes[1].posts = [{ title: '知县', holder: '王二', quota: 1, src: '玩家' }, { title: '保正', holder: '', status: '照额', quota: 3 }, { title: '主簿', holder: '', quota: 1, src: '拟' }];
    html = courtTab(s);
    if (!/人事空缺<\/span><b>1<\/b>/.test(html)) bad.push('空缺数把照额员额也算了：' + (html.match(/人事空缺<\/span><b>[^<]*/) || [''])[0]);
    // 7 AI 各派站队仍照旧走（回归）：courtIssueApply 不重复算玩家那一票
    s = mk();
    s.issue = { k: '河工漕运', fx: { key: '灾情', d: -2 }, ym: 21000, stances: [], twist: '', verdict: '', why: '' };
    courtIssueApply(s, { stances: [{ faction: '清流', stance: '赞成', demand: '先修高堰' }, { faction: '盐商', stance: '反对', demand: '加捐太重' }], twist: '河督收了礼' });
    if (!s.issue.verdict) bad.push('AI 各派站队没定出结果');
    if (!/河督收了礼/.test(s.issue.twist)) bad.push('暗地里的手脚没记下');
    return bad;
  });
  console.log('ERRS', JSON.stringify([...errs, ...out]));
  await b.close(); process.exit(errs.length || out.length ? 1 : 0);
})();
