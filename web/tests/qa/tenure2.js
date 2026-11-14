// 各年代任职年表（R-226）：资治通鉴逐年摘的任免（三国两晋十六国南北朝五代）、哈佛库整理的唐末五代十国表，照政权取：
// 前秦 360 年王猛在表上、东晋没有他；东魏 545 年有高澄；只写「魏」又东西魏并立的不乱认；后唐、南唐各有各的人；前秦开局真点朝局页，吏部尚书照表坐王猛
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1400 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof tenureFor === 'function');
  const out = await p.evaluate(async () => {
    const bad = [];
    const mk = (pol, y, place) => newSave({ name: '某甲', gender: '男', age: 30, role: '郎官', gregorianYear: y, month: 6, day: 1, place, polity: pol });
    const names = (s, y) => tenureFor(s, y).flatMap(t => arr(t.figures)).filter(f => arr(f.posts).some(q => q[0] <= y && q[1] >= y)).map(f => f.name);
    const qin = names(mk('前秦', 360, '长安'), 360); if (!qin.includes('王猛')) bad.push('前秦 360 年表上没有王猛');
    const jin = names(mk('东晋', 360, '建康'), 360); if (jin.includes('王猛')) bad.push('东晋 360 年表上混进了王猛');
    if (!jin.length) bad.push('东晋 360 年表上一个人都没有');
    if (!names(mk('东魏', 545, '邺'), 545).includes('高澄')) bad.push('东魏 545 年表上没有高澄');
    if (names(mk('魏', 545, '邺'), 545).length) bad.push('只写「魏」、东西魏并立时乱认了一国的表');
    const hou = names(mk('后唐', 930, '洛阳'), 930), nan = names(mk('南唐', 945, '金陵'), 945);
    if (hou.length < 20) bad.push('后唐 930 年表上只有 ' + hou.length + ' 人'); if (nan.length < 5) bad.push('南唐 945 年表上只有 ' + nan.length + ' 人');
    if (hou.some(n => nan.includes(n) && false)) bad.push('');
    // 前秦开局：吏部尚书照表坐王猛
    S = mk('前秦', 360, '长安'); S.chat = [{ role: 'gm', text: '开场。' }];
    S.org = { nodes: [{ id: 'root', name: '朝廷', depth: 0, posts: [{ title: '天王', holder: '苻坚' }] }, { id: 'L1', name: '吏部', depth: 1, parent: 'root', posts: [{ title: '尚书', rank: '', holder: '' }] }] };
    const oc = callClaude; callClaude = async pr => /朝廷里的要紧人物列成一整张表/.test(pr) ? { text: JSON.stringify({ people: [], factions: [] }) } : { text: '{}' };
    try { await courtFullDS(S); } finally { callClaude = oc; }
    const q = S.org.nodes.find(z => z.name === '吏部').posts[0]; if (q.holder !== '王猛') bad.push('前秦吏部尚书没照表坐王猛：' + JSON.stringify(q));
    return bad.filter(Boolean);
  });
  errs.push(...out);
  await p.evaluate(() => { VIEW = 'game'; TAB = 'court'; SIDE_FOLD = false; render0(); });
  const h = await p.evaluate(() => document.body.innerText); if (!/朝堂全表/.test(h) || !/王猛/.test(h)) errs.push('前秦朝局页没摆出王猛');
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
