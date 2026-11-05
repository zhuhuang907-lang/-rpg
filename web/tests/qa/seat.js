// 官员系统·一：位子分甲乙丙三等，名字只从 seatPut 一个口子进——来源分级低的不盖高的、死人和小孩不收、一人一个实职、玩家任命的不动、丙等只写员额（CLAUDE.md「人事与职权」位子三等、名字一个口子进）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 1400 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof seatPut === 'function');
  const r = await p.evaluate(() => { S = newSave({ name: '杨坚', gender: '男', age: 60, role: '隋文帝', gregorianYear: 600, month: 6, day: 1, place: '大兴', polity: '隋' }); S.chat = [{ role: 'gm', text: '开场' }];
    S.org = { nodes: [{ id: 'root', name: '朝廷', depth: 0, posts: [{ title: '皇帝', holder: '杨坚' }] }, { id: 'A1', name: '尚书省', depth: 1, parent: 'root', posts: [{ title: '左仆射', rank: '从二品', holder: '高颎', src: '博查核' }, { title: '右仆射', rank: '从二品', holder: '', src: '' }] }, { id: 'C1', name: '吏部', depth: 2, parent: 'A1', posts: [{ title: '考功郎中', rank: '从五品上', holder: '', src: '' }] }, { id: 'D1', name: '大兴县', depth: 3, parent: 'A1', posts: [{ title: '书吏', holder: '王二', src: '拟', quota: 12 }, { title: '县令', rank: '正六品', holder: '', src: '', byPlayer: true }] }], log: [] };
    S.dossiers = { 韩擒虎: { died: 592 }, 李世民: { born: 598 }, 苏威: { born: 542 } };
    const N = S.org.nodes, q = (i, j) => N[i].posts[j];
    const o = {};
    o.tier = [seatTier(N[1], q(1, 0)), seatTier(N[2], q(2, 0)), seatTier(N[3], q(3, 0))].join();
    o.low = seatPut(S, N[1], q(1, 0), '张三', 'DS表');            // DS 表不盖博查核过的
    o.dead = seatPut(S, N[1], q(1, 1), '韩擒虎', '史书');          // 死了的不收
    o.kid = seatPut(S, N[1], q(1, 1), '李世民', 'DS表');           // 三岁小孩不收
    o.ok = seatPut(S, N[1], q(1, 1), '苏威', 'DS表');
    o.dup = seatPut(S, N[2], q(2, 0), '苏威', 'DS表');             // 一人一个实职
    o.move = seatPut(S, N[2], q(2, 0), '苏威', '史书', { move: true, force: true }) && !q(1, 1).holder;
    o.player = seatPut(S, N[3], q(3, 1), '赵五', '博查核');        // 玩家任命的位子别的路不动
    tidyState(S); o.shuli = [q(3, 0).holder, q(3, 0).status].join('|');
    TAB = 'court'; VIEW = 'game'; SIDE_FOLD = false; render0(); o.html = /照额设12名，史不载名/.test(document.body.innerHTML);
    return o; });
  const bad = [];
  if (r.tier !== '甲,乙,丙') bad.push('位子分等不对：' + r.tier);
  if (r.low || r.dead || r.kid || !r.ok || r.dup || !r.move || r.player) bad.push('seatPut 把关不对：' + JSON.stringify(r));
  if (r.shuli !== '|照额' || !r.html) bad.push('丙等位子没改成只写员额：' + JSON.stringify(r));
  for (const x of bad) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
