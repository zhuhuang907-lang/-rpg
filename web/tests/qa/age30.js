// 年岁不许人人三十（CLAUDE.md「人物」年龄不许瞎编，2026-11-05 玩家第四回骂）：记账给的岁数一概不收、交 DeepSeek 照经历推；账上三个以上同一个整十岁数又没依据的，读档、每回都挑出来重推；格式里不再要 age
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof ageSameScan === 'function');
  const r = await p.evaluate(async () => { S = newSave({ name: '杨坚', gender: '男', age: 60, role: '隋文帝', gregorianYear: 600, month: 6, day: 1, place: '大兴', polity: '隋' }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 3;
    // 1 记账报了人人三十：不收
    applyReply(S, { reply: '朝会。', mode: 'play', elapsedDays: 1, presentNpcs: [{ name: '高颎', role: '左仆射', age: 30 }, { name: '苏威', role: '纳言', age: 30 }, { name: '杨素', role: '右仆射', age: 30 }] }, '上朝');
    const a1 = ['高颎', '苏威', '杨素'].map(n => (S.people[n] || {}).age);
    // 2 旧存档里四个三十岁、没依据：挑出来重推
    S.people.牛弘 = { role: '吏部尚书', age: 30, seen: 0 }; S.people.长孙晟 = { role: '将军', age: 30, seen: 0 }; S.people.韩擒虎 = { role: '将军', age: 30, seen: 0 }; S.people.贺若弼 = { role: '将军', age: 30, seen: 0 };
    for (const n of ['牛弘', '长孙晟', '韩擒虎', '贺若弼']) S.people[n].ageV = 1;
    S.ageScanT = null; const due = ageDue(S), todo = ageTodo(S).map(x => x[0]);
    let pr = ''; const oc = callClaude; callClaude = async x => { pr = x; return { text: JSON.stringify({ people: [{ name: '牛弘', born: 545, why: '隋书本传' }, { name: '长孙晟', born: 551, why: '隋书本传' }, { name: '韩擒虎', born: 538, why: '隋书本传' }, { name: '贺若弼', born: 544, why: '隋书本传' }, { name: '高颎', born: 541, why: '隋书本传' }, { name: '苏威', born: 542, why: '隋书本传' }, { name: '杨素', born: 544, why: '隋书本传' }] }) }; };
    try { await ageInfer(S); } finally { callClaude = oc; }
    return { a1, due, todo, ages: ['牛弘', '长孙晟', '韩擒虎', '贺若弼', '高颎'].map(n => S.people[n].age), same: /都写成30岁/.test(pr) }; });
  const bad = [];
  if (r.a1.some(a => a === 30)) bad.push('记账报的三十岁照收了：' + r.a1);
  if (!r.due || !['牛弘', '长孙晟', '韩擒虎', '贺若弼'].every(n => r.todo.includes(n))) bad.push('账上一排三十岁没挑出来重推：' + JSON.stringify(r.todo));
  if (!r.same) bad.push('重推时没告诉 DeepSeek「不可能人人一样」');
  if (r.ages.some(a => a === 30) || r.ages[0] !== 56) bad.push('重推后还是三十岁：' + r.ages);
  for (const x of bad) errs.push(x);
  console.log('ERRS', JSON.stringify(errs)); await b.close();
})();
