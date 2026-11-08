// 皇子、太子、王爷、贵族（需求台账 R-157；2026-11-08 玩家：「贵族，皇族，皇子，王爷你都没写好了」）
// 全真点：清皇子问安、结交朝臣、结交外戚内侍、构陷兄弟（家谱里的真兄弟）、韬光养晦；够格立太子；太子猜忌到头被废、圈禁中别的办不了；清不之藩；
// 明初王爷之国就藩（护卫照制度）、添募护卫、猜忌重了朝廷削藩、奉诏、起兵清君侧（成军开战）；唐亲王不之藩不掌兵；晋门阀延揽门生、荐举子弟
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof royalAct === 'function');
  const bad = [], ev = f => p.evaluate(f), txt = () => ev(() => document.body.innerText), click = async (sel, what) => { const el = await p.$(sel); if (!el) { bad.push('没有「' + what + '」按钮'); return false; } await p.click(sel); await p.waitForTimeout(100); return true; };
  const mk = (y, role, pol, place, ch, H) => p.evaluate(([y, role, pol, place, ch, H]) => { S = newSave({ name: '爱新觉罗允祥', gender: '男', age: 26, role, real: false, gregorianYear: y, month: 3, day: 1, place, polity: pol }); S.chat = [{ role: 'gm', text: '开场' }]; S.turn = 2;
    S.protagonist.ident = { chushen: ch }; S.household = H; S.money = { cash: 3000, unit: '两' }; S.econ = { unit: '两', wage: 0.1, rice: 1 }; S.skills = { 交际: { lv: 40, xp: 0 }, 谋略: { lv: 60, xp: 0 }, 文墨: { lv: 40, xp: 0 } };
    VIEW = 'game'; TAB = 'board'; SIDE_FOLD = false; render(); }, [y, role, pol, place, ch, H]);
  // 清皇子
  await mk(1712, '皇十三子', '清', '北京', '宗室', [{ relation: '兄', name: '胤礽', age: 38 }, { relation: '兄', name: '胤禛', age: 34 }, { relation: '父', name: '玄烨', age: 58 }]);
  { const t = await txt(); if (!/皇子/.test(t) || !/圣眷/.test(t)) bad.push('清皇子局面页没有皇子一栏'); if (!/胤礽/.test(t) || !/胤禛/.test(t)) bad.push('争储的兄弟没照家谱列出'); }
  { const f0 = await ev(() => S.royal.favor); if (await click('[data-royal="visit"]', '入宫问安侍疾')) { if (!((await ev(() => S.royal.favor)) > f0)) bad.push('问安侍疾圣眷没涨'); } }
  { const r0 = await ev(() => ({ f: S.royal.faction, c: S.money.cash })); if (await click('[data-royal="court"]', '结交朝臣')) { const r = await ev(() => ({ f: S.royal.faction, c: S.money.cash })); if (!(r.f > r0.f) || !(r.c < r0.c)) bad.push('结交朝臣党羽没涨或没花钱'); } }
  { const s0 = await ev(() => S.royal.suspect); if (await click('[data-royal="inner"]', '结交外戚内侍')) { if (!((await ev(() => S.royal.suspect)) > s0)) bad.push('结交外戚内侍不招猜忌'); } }
  { const r0 = await ev(() => ({ f: S.royal.favor, p: Math.max(...S.royal.rivals.map(r => r.power)) })); if (await click('[data-royal="frame"]', '构陷兄弟')) { const r = await ev(() => ({ f: S.royal.favor, p: Math.max(...S.royal.rivals.map(r => r.power)) })); if (!(r.p < r0.p) && !(r.f < r0.f)) bad.push('构陷兄弟既没扳倒对头也没受罚'); } }
  { const s0 = await ev(() => S.royal.suspect); if (await click('[data-royal="humble"]', '韬光养晦')) { if (!((await ev(() => S.royal.suspect)) < s0)) bad.push('韬光养晦猜忌没降'); } }
  await click('[data-royal="visit"]', '入宫问安侍疾'); if (!/办过/.test(await ev(() => ORGMSG))) bad.push('一个月问安了两回');
  if (await p.$('[data-royal="askfief"]')) bad.push('清朝皇子能请求就藩');
  // 够格立太子
  { const r = await ev(() => { S.royal.favor = 85; S.royal.faction = 75; S.royal.rivals.forEach(x => x.power = 20); S.royal.ym = null; royalMonthly(S); render(); return { role: S.protagonist.role, k: S.royal.kind }; }); if (r.k !== '太子' || !/太子/.test(r.role)) bad.push('圣眷党羽都够了没立太子：' + JSON.stringify(r));
    if (!(await p.$('[data-royal="jianguo"]'))) bad.push('太子没有请求监国'); }
  // 太子猜忌到头被废、圈禁中办不了事
  { const r = await ev(() => { S.royal.suspect = 95; S.royal.ym = null; royalMonthly(S); render(); return { role: S.protagonist.role, lock: S.royal.lockTill }; }); if (!/废太子/.test(r.role) || r.lock == null) bad.push('太子猜忌到九十五没被废：' + JSON.stringify(r));
    await ev(() => { S.royal.done = {}; royalAct(S, 'court'); }); if (!/圈禁/.test(await ev(() => ORGMSG))) bad.push('圈禁中还能结交朝臣'); }
  // 明初王爷
  await mk(1390, '燕王', '明', '北平', '宗室', [{ relation: '父', name: '朱元璋', age: 62 }]);
  { const t = await txt(); if (!/王府/.test(t) || !/护卫/.test(t)) bad.push('明初王爷没有王府一栏'); }
  if (await click('[data-royal="gofief"]', '之国就藩')) { const r = await ev(() => S.royal); if (!r.fief || !r.fief.at || r.guard !== 9000) bad.push('明初就藩护卫不是九千：' + JSON.stringify({ f: r.fief, g: r.guard })); }
  { const r0 = await ev(() => ({ g: S.royal.guard, s: S.royal.suspect })); if (await click('[data-royal="guard"]', '添募护卫')) { const r = await ev(() => ({ g: S.royal.guard, s: S.royal.suspect })); if (!(r.g > r0.g) || !(r.s > r0.s)) bad.push('添募护卫没加人或不招猜忌'); } }
  { const r = await ev(() => { S.royal.suspect = 80; S.royal.ym = null; royalMonthly(S); render(); return S.royal.edict; }); if (!r || r.k !== '削护卫') bad.push('护卫上万、猜忌八十，朝廷没削藩：' + JSON.stringify(r)); }
  { const g0 = await ev(() => S.royal.guard); if (await click('[data-royal="obey"]', '奉诏')) { const r = await ev(() => S.royal.guard); if (!(r < g0)) bad.push('奉诏削护卫护卫没少'); } }
  { await ev(() => { S.royal.guard = 4000; S.royal.done = {}; render(); }); if (await click('[data-royal="rise"]', '起兵清君侧')) { const r = await ev(() => ({ f: S.forces.some(f => f.owner === '你' && N0(f.troops) === 4000), w: arr(S.wars).some(w => w.state === '交战'), role: S.protagonist.role })); if (!r.f || !r.w) bad.push('起兵没成军开战：' + JSON.stringify(r)); } }
  // 唐亲王：不之藩、不掌兵
  await mk(700, '相王', '唐', '长安', '宗室', []); if (await p.$('[data-royal="gofief"]') || await p.$('[data-royal="guard"]')) bad.push('唐亲王能就藩、掌兵'); if (!/十六王宅|不之藩/.test(await txt())) bad.push('唐亲王没写不之藩的制度');
  // 晋门阀
  await mk(300, '琅琊王氏子弟', '晋', '洛阳', '琅琊王氏，士族', [{ relation: '长子', name: '王悦', age: 18 }]);
  if (!/家门/.test(await txt())) bad.push('门阀子弟没有家门一栏');
  await click('[data-royal="client"]', '延揽门生故吏'); await ev(() => { S.royal.done = {}; S.royal.clients = 6; render(); });
  if (await click('[data-royal="rec"]', '荐举子弟出仕')) { const r = await ev(() => S.household[0].note || ''); if (!/出仕/.test(r)) bad.push('荐举子弟没出仕：' + r); }
  const html = await txt(); for (const w of ['undefined', 'NaN', '某']) if (html.includes(w)) bad.push('页面上出现 ' + w);
  const all = bad.concat(errs); console.log('ERRS', JSON.stringify(all)); await b.close(); process.exit(all.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
