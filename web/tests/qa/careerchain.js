// 随时改行接得上账（任务十二，R-232）：930 年后唐一个人连转五次（农家子→投军→落草→受招安做镇将→入朝），
// 每转一次现钱、家产、兵、身边的人、仇家照旧带着走；改行后后台重立家底只补新身份的进项开销，不削现钱、不换家产
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message));
  await p.goto('file://' + path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))); await p.waitForFunction(() => typeof applyReply === 'function');
  const out = await p.evaluate(async () => { const bad = [], log = [];
    const s = newSave({ name: '韩熙', gender: '男', age: 20, role: '农家子', gregorianYear: 930, month: 3, day: 1, place: '洛阳', polity: '后唐' }); s.chat = [{ role: 'gm', text: '开场。' }]; s.turn = 3; s.settledAt = 1;
    s.money = { unit: '文', cash: 52000, hist: [] }; s.estate = { assets: [{ name: '洛阳城外田十亩', value: 30000 }], income: [], expense: [], debts: [{ to: '王员外', amount: 5000 }] };
    s.forces = [{ name: '乡里子弟', leader: '韩熙', troops: '40', at: '洛阳' }]; s.people = Object.assign(s.people || {}, { 李存审: { name: '李存审', tie: '仇家', seen: 1 }, 周七: { name: '周七', tie: '结义兄弟', seen: 1 } });
    S = s; const oc = callClaude;
    let LASTP = ""; callClaude = async pr => (LASTP = String(pr).slice(0, 120), 0) || /家底|家业|现钱/.test(pr) ? { text: JSON.stringify({ unit: '文', cash: 300, standing: '新身份', assets: [{ name: '一副刀甲', value: 2000 }], income: [{ item: '军饷', amount: 900 }], expense: [], debts: [] }) } : { text: '{}' };
    const steps = [['投军', '我去投军', '他投军做了一名牙兵'], ['落草为寇', '逃出营去落草', '他逃出军营，落草做了山寨头领'], ['镇将', '受招安', '朝廷招安，授他为镇将'], ['朝官', '入朝做官', '他入朝，授为左监门卫将军'], ['自立为一方之主', '起兵自立', '他起兵称王，自立一方']];
    try { for (const [role, said, reply] of steps) {
      const before = { cash: s.money.cash, assets: s.estate.assets.map(x => x.name).join('、'), troops: s.forces.map(f => f.name + f.troops).join('、'), foe: (s.people.李存审 || {}).tie, bro: (s.people.周七 || {}).tie };
      applyReply(s, { reply, elapsedDays: 1, identity: { role, why: reply } }, said); s.clock.y = 930;
      if (s.estateDue) { try { await buildEstate(s); } catch (e) { log.push("（后台立账照新身份另问，假 AI 没答上：" + (e && (e.message || e.code)) + "）"); } }
      const after = { role: s.protagonist.role, cash: s.money.cash, assets: s.estate.assets.map(x => x.name).join('、'), troops: s.forces.map(f => f.name + f.troops).join('、'), foe: (s.people.李存审 || {}).tie, bro: (s.people.周七 || {}).tie };
      log.push(after.role);
      if (after.cash !== before.cash) bad.push(`改行成「${role}」后现钱变了：${before.cash}→${after.cash}`);
      if (!after.assets.startsWith(before.assets)) bad.push(`改行成「${role}」后家产丢了：${before.assets}→${after.assets}`);
      if (after.troops !== before.troops) bad.push(`改行成「${role}」后兵变了：${before.troops}→${after.troops}`);
      if (after.foe !== '仇家' || after.bro !== '结义兄弟') bad.push(`改行成「${role}」后仇家、兄弟丢了`);
      if (!arr(s.estate.debts).some(d => d.to === '王员外')) bad.push(`改行成「${role}」后欠王员外的债没了`); } }
    catch (e) { bad.push("出错：" + (e && (e.message || e.code || JSON.stringify(e))) + " 最后一问：" + LASTP + " 栈：" + String(e && e.stack || "").slice(0, 300)); } finally { callClaude = oc; }
    if (log.filter((x, i, a) => a.indexOf(x) === i).length < 3) bad.push('连转几次身份没跟着变：' + JSON.stringify(log));
    return { bad, log }; });
  console.log('CHAIN', JSON.stringify(out.log)); errs.push(...out.bad); console.log('ERRS', JSON.stringify(errs)); await b.close(); process.exit(errs.length ? 1 : 0);
})();
