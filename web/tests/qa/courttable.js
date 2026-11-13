// 朝堂先查表、后补缺（任务三，R-221）：内置史料里这一年在任的真人先坐上位子，模型的表改不了他们的官、抢不了他们的位子；
// 玩家任命的位子不动；提示词里写明「朝廷不一定满员，宁缺不凑」
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1400 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof courtFullDS === 'function');
  const out = await p.evaluate(async () => {
    const bad = [];
    S = newSave({ name: '某甲', gender: '男', age: 40, role: '翰林院编修', gregorianYear: 1625, month: 6, day: 1, place: '北京', polity: '明' }); S.chat = [{ role: 'gm', text: '开场。' }];
    S.org = { nodes: [{ id: 'root', name: '朝廷', depth: 0, posts: [{ title: '皇帝', holder: '朱由校' }] },
      { id: 'N1', name: '内阁', depth: 1, parent: 'root', posts: [{ title: '首辅', rank: '正一品', holder: '王虚拟', src: '拟' }] },
      { id: 'N2', name: '司礼监', depth: 1, parent: 'root', posts: [{ title: '秉笔太监', rank: '正四品', holder: '' }] },
      { id: 'N3', name: '蓟辽', depth: 1, parent: 'root', posts: [{ title: '督师', rank: '', holder: '张三', byPlayer: true, src: '玩家' }] }] };
    let prompts = []; const oc = callClaude;
    callClaude = async pr => { if (/朝廷里的要紧人物列成一整张表/.test(pr)) { prompts.push(pr); if (/中枢/.test(pr.split('这一张只写：')[1] || ''))
      return { text: JSON.stringify({ people: [{ name: '顾秉谦', post: '礼部尚书', organ: '礼部', real: '真' }, { name: '叶向高', post: '内阁首辅', organ: '内阁', real: '真' }], factions: [] }) };
      return { text: JSON.stringify({ people: [], factions: [] }) }; } return { text: '{}' }; };
    try { await courtFullDS(S); } finally { callClaude = oc; }
    const q = (n, t) => (S.org.nodes.find(z => z.name === n) || { posts: [] }).posts.find(x => x.title === t) || {};
    if (q('内阁', '首辅').holder !== '顾秉谦') bad.push('首辅没照史料坐顾秉谦：' + JSON.stringify(q('内阁', '首辅')));
    if (q('司礼监', '秉笔太监').holder !== '魏忠贤') bad.push('秉笔太监没照史料坐魏忠贤');
    if (q('蓟辽', '督师').holder !== '张三') bad.push('玩家任命的督师被史料表挤掉了');
    const gu = (S.court.people || []).find(x => x.name === '顾秉谦'); if (!gu || gu.post !== '内阁首辅') bad.push('模型把顾秉谦的官改了、朝堂全表照了模型：' + JSON.stringify(gu));
    if (!(S.court.people || []).some(x => x.name === '魏忠贤')) bad.push('史料上坐了位子的魏忠贤没进朝堂全表');
    if (!prompts.length || !prompts.every(pr => /顾秉谦：内阁首辅/.test(pr))) bad.push('提示词里没把史料已定的人列给模型');
    if (!prompts.every(pr => /宁缺不凑/.test(pr))) bad.push('提示词没写朝廷可以不满员');
    return bad;
  });
  errs.push(...out);
  // 真点：朝局页摆出朝堂全表，顾秉谦是内阁首辅
  await p.evaluate(() => { VIEW = 'game'; TAB = 'court'; SIDE_FOLD = false; render0(); });
  const h = await p.evaluate(() => document.body.innerText); if (!/朝堂全表/.test(h) || !/顾秉谦/.test(h)) errs.push('朝局页没摆出照史料的朝堂全表');
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
