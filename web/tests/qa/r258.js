// R-258：真人到史载卒年照史死（李倣＝李仿 936 年被杀，下狱八年还在且标虚拟）；王延彬 930 卒不再出场；玩家定的志向固定在长远目标（真点「定志向」）；军务页一打开兵种就排好（真点「军务」，不显示核定中）
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof figDeathTick === 'function');
  const r = await p.evaluate(() => {
    const s = newSave({ name: '林承海', gender: '男', age: 36, role: '团练教习', gregorianYear: 944, month: 8, day: 1, place: '泉州', polity: '闽' });
    s.people = { 李倣: { role: '皇城使（待勘）', where: '福州' }, 王仁达: { role: '楼船指挥使' }, 老吴: { role: '都头' } };
    const f = figByName('李倣'), real = realNameSet(s).has('李倣'), fic = fictionShow(s).has('李倣');
    figDeathTick(s); const dead = !!s.people['李倣'].dead, wu = !!s.people['老吴'].dead, chron = arr(s.chronicle).some(c => /李倣/.test(c.what));
    const s2 = newSave({ name: '林承海', gender: '男', age: 36, role: '团练教习', gregorianYear: 944, month: 8, day: 1, place: '泉州', polity: '闽' }); s2.people = { 李倣: { role: '囚' } }; s2.fateSaved = { 李倣: { y: 936, why: '主角救下' } }; figDeathTick(s2);
    const now = figuresNow(s).map(x => x.f.n);
    return { f: f && [f.n, f.d], real, fic, dead, wu, chron, saved: !s2.people['李倣'].dead, yanbin: now.includes('王延彬'), liu: now.includes('留从效') };
  });
  const lp = await p.evaluate(() => [landPlace('泉州港外口'), landPlace('口外锚地'), landPlace('福州西门城头与门洞'), landPlace('建州'), landPlace('闽江口江面')]);
  const dr = await p.evaluate(() => { const s = newSave({ name: '林承海', gender: '男', age: 36, role: '团练教习', gregorianYear: 944, month: 8, day: 1, place: '泉州', polity: '闽' }); s.people = { 王延彬: { role: '泉州刺史', status: '在州衙' } }; figDeathTick(s);
    applyReply(s, { elapsedDays: 1, reply: '使君在前厅见福州使臣。', presentNpcs: [{ name: '王延彬', role: '泉州刺史', status: '在前厅见福州使臣', favor: 10 }] }, '去州衙');
    const inp = storyInput(s, '去州衙', '', '', false, { acts: [], steps: [], risks: [] }); const txt = Array.isArray(inp) ? inp.map(m => m.content).join('\n') : String(inp);
    return [s.people['王延彬'].dead, s.people['王延彬'].status, /已故的真人[^\n]*王延彬/.test(txt)]; });
  const he = await p.evaluate(() => { const E = HIST.flatMap(h => arr(h.events)); const f = re => E.find(e => re.test(e.text)); return [!!f(/林仁翰率众杀连重遇/), !!f(/李仁达.*据福州/), !!f(/吴越援兵.*大破南唐军/), !E.some(e => e.y === 945 && /吴越乘闽乱取福州/.test(e.text))]; });
  const bad = [];
  if (he.some(x => !x)) bad.push('闽亡前后的史事没补对（林仁翰杀朱连、李仁达据福州、947吴越援兵破南唐、去掉945吴越取福州）：' + he.join());
  if (!dr[0] || /前厅/.test(dr[1]) || !dr[2]) bad.push('照史已死的王延彬又被写活、或写戏的不知道他已死：' + dr.join(' / '));
  if (lp.join() !== 'false,false,true,true,false') bad.push('港外锚地、江面算成了地盘（或城池不算）：' + lp.join());
  if (!r.f || r.f[0] !== '李仿' || r.f[1] !== 936) bad.push('别名李倣没认成李仿（936卒）：' + JSON.stringify(r.f));
  if (!r.real || r.fic) bad.push('李倣还标虚拟');
  if (!r.dead || r.wu || !r.chron) bad.push('944 年李倣还活着（或虚构人物被照史杀了、年谱没记）');
  if (!r.saved) bad.push('主角救下的人也照史死了');
  if (r.yanbin || !r.liu) bad.push('944 年泉州：王延彬（930卒）还出场，或留从效不在：' + JSON.stringify(r));
  // 真点：定志向、军务页
  await p.evaluate(() => { const s = newSave({ name: '林承海', gender: '男', age: 36, role: '团练教习', gregorianYear: 944, month: 8, day: 1, place: '泉州', polity: '闽' }); s.forces = [{ name: '泉州团练水陆营', leader: '林承海', troops: 87, at: '泉州' }]; s.goals = [{ term: '长远', text: '让林记在福泉海路上站稳头几家' }]; S = s; VIEW = 'game'; SIDE_FOLD = false; TAB = 'board'; render0(); });
  await p.waitForTimeout(500);
  await p.fill('[data-aimin]', '爬上节度使，整顿民政，击败南唐，称王'); await p.click('[data-aim]'); await p.waitForTimeout(300);
  const g = await p.evaluate(() => { const before = S.goals.find(x => x.term === '长远'); S.goals = [{ term: '长远', text: '让林记在福泉海路上站稳头几家' }]; aimKeep(S); return [before && before.text, S.goals.find(x => x.term === '长远').text, document.body.innerText.includes('爬上节度使')]; });
  if (g[0] !== '爬上节度使，整顿民政，击败南唐，称王' || g[1] !== g[0] || !g[2]) bad.push('志向没定住（或 AI 改目标又盖掉了）：' + g.join(' / '));
  await p.click('[data-tab=army]'); await p.waitForTimeout(500);
  const a = await p.evaluate(() => { const t = document.body.innerText; return [arr(S.unitTypes).map(x => x.name).join('、'), /正在照本朝兵制|照本朝兵制核定兵种/.test(t), t.includes('牙兵')]; });
  if (!a[0] || a[1] || !a[2]) bad.push('军务页兵种没排好或还显示核定中：' + a.join(' / '));
  if (errs.length) bad.push(...errs);
  console.log('ERRS', JSON.stringify(bad)); await b.close(); process.exit(bad.length ? 1 : 0);
})();
