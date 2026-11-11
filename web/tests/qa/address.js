// 人称、称谓（2026-11-09 玩家：「大幅度的改正人称和称谓错误」）与 GLM 分工（R-135；玩家：「给glm的接口呢，我用glm来写故事啊，你忘记分工了吗」）
// 称谓表照身份分二十种：皇子太子后妃公主宦官武官僧道兵吏寨主义军首领、已嫁未嫁女子都叫对；女主角有丈夫子女下人的叫法；正文第二人称的规矩写进给模型的材料；
// 唐朝正文写「王爷」被挑出来；只填 GLM 也能开局、首页有 GLM 一栏；当面说、说亲这些推演交 GLM，扮演敌国之主照玩家点名交 DeepSeek
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof addrBlock === 'function');
  const bad = [];
  const CASES = [
    ['皇十三子', '男', 1712, '北京', '清', [], 'prince', /阿哥/], ['皇太子', '男', 1400, '南京', '明', [], 'crownprince', /殿下.*孤|孤/], ['答应', '女', 1757, '北京', '清', [], 'consort', /小主/], ['公主', '女', 710, '长安', '唐', [], 'princess', /贵主/],
    ['司礼监太监', '男', 1600, '北京', '明', [], 'eunuch', /公公/], ['总兵', '男', 1640, '宁远', '明', [], 'mil', /将军|总爷/], ['比丘尼', '女', 1600, '杭州', '明', [], 'clergy', /贫尼/], ['道士', '男', 1100, '开封', '宋', [], 'clergy', /贫道/],
    ['营中兵丁', '男', 1640, '西安', '明', [], 'soldier', /军爷/], ['县衙押司', '男', 1120, '郓城', '宋', [], 'clerk', /押司/], ['山寨寨主', '男', 1120, '梁山', '宋', [], 'bandit', /大王|寨主/],
    ['绣娘', '女', 1600, '苏州', '明', [{ relation: '夫', name: '叶绍袁' }], 'womanM', /丈夫称主角：娘子/], ['绣娘', '女', 1600, '苏州', '明', [], 'womanU', /姑娘/], ['盐商', '男', 1757, '扬州', '清', [], 'rich', /东家/]];
  for (const [role, g, y, pl, pol, H, kind, re] of CASES) { const r = await p.evaluate(([role, g, y, pl, pol, H]) => { S = newSave({ name: '甲乙', gender: g, age: 30, role, real: false, gregorianYear: y, month: 3, day: 1, place: pl, polity: pol }); S.household = H; return { k: statusKind(S), t: addrBlock(S) }; }, [role, g, y, pl, pol, H]);
    if (r.k !== kind) bad.push(`${y}年${role}认成了${r.k}（该是${kind}）`); if (!re.test(r.t)) bad.push(`${y}年${role}的称谓不对：` + r.t.split('\n').slice(0, 2).join(' / ')); if (!/【人称】/.test(r.t) || !/第二人称/.test(r.t)) bad.push(`${role}的材料里没有人称规矩`); if (g === '女' && !/用「她」/.test(r.t)) bad.push(`女主角${role}没写旁人用「她」`); }
  { const r = await p.evaluate(() => { S = newSave({ name: '甲乙', gender: '男', age: 30, role: '书生', real: false, gregorianYear: 700, month: 3, day: 1, place: '长安', polity: '唐' }); return anachronisms(S, '王爷请进，臣妾告退。'); }); if (!r.some(x => /王爷/.test(x))) bad.push('唐朝正文写「王爷」没被挑出来：' + JSON.stringify(r)); }
  // 网页版只填 GLM（官方接口）：智谱不许网页直连，开局按钮灰、说清要再填 DeepSeek 或用桌面版；填了转发地址就能开局（R-190）
  { const r = await p.evaluate(() => { localStorage.setItem('hrpg:glmkey', 'test-glm-key'); localStorage.removeItem('hrpg:dskey'); MODE = 'web'; glmWebRefresh(); KEY = { has: false, tail: '', model: '' }; SAMPLE = SAMPLE || (async () => ({ text: '' })); VIEW = 'home'; S = null; renderStart(); const bt = document.querySelector('#bStart'); return { dis: bt ? bt.disabled : null, glm: !!document.querySelector('#gKey'), err: /先在下面/.test(document.body.innerText) }; });
    if (r.dis !== true) bad.push('网页版只填了官方 GLM，开局按钮没灰'); if (!r.glm) bad.push('首页没有 GLM 一栏'); if (!(await p.evaluate(() => /网页版连不上 GLM/.test(document.body.innerText)))) bad.push('网页版只填 GLM 没说清连不上');
    const r2 = await p.evaluate(() => { localStorage.setItem('hrpg:glmbase', 'https://glm-proxy.example/api/paas/v4'); glmWebRefresh(); renderStart(); const bt = document.querySelector('#bStart'); return { dis: bt ? bt.disabled : null }; }); if (r2.dis !== false) bad.push('填了 GLM 转发地址还开不了局'); await p.evaluate(() => { localStorage.removeItem('hrpg:glmbase'); glmWebRefresh(); }); }
  // 分工：当面说、说亲交 GLM；扮演敌国之主交 DeepSeek
  { const r = await p.evaluate(async () => { const rec = []; MODE = 'web'; KEY = { has: true, tail: 'xxxx', model: 'deepseek-v4-pro' }; GLM = { has: true, tail: 'yyyy', model: 'glm-4.6', base: 'https://glm-proxy.example/api/paas/v4' };
      SAMPLE = async (input, o) => { rec.push(o.provider || 'ds'); return { text: JSON.stringify({ verdict: '不允', reply: '不行。', why: '不信', name: '张承业', family: '读书人家', orders: [], memorials: [] }) }; };
      S = newSave({ name: '黄巢', gender: '男', age: 30, role: '贩私盐的', real: false, gregorianYear: 874, month: 3, day: 1, place: '曹州', polity: '唐' }); S.money = { cash: 300, unit: '贯' }; S.econ = { unit: '贯', wage: 0.1, rice: 0.5 };
      partyStart(S); S.enc = { kind: '流寇', n: 5, place: '曹州', ym: 1, q: '弱' }; rec.length = 0; await encTalk(S, '兄弟们都是苦出身，不如合伙干一番事业'); const a = rec.slice();
      rec.length = 0; S.protagonist.gender = '女'; S.protagonist.age = 16; S.household = []; await marryAsk(S, ''); const m = rec.slice(); return { enc: a, marry: m, foe: typeof foePlan }; });
    if (r.enc.includes('glm') || r.marry.includes('glm')) bad.push('默认全交 DeepSeek，当面说、说亲却走了 GLM：' + JSON.stringify(r)); }   // 2026-11-11 玩家改回 DeepSeek
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
