// 真实 DeepSeek 压力测试：土匪首领、商人、清代总兵各连玩十回。每回存行动前后完整状态、回执、审稿结果、用时；第十回后刷新，查状态能不能完整恢复
// 用法见 run.sh。不改游戏代码；不用假 AI。
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const OUT = process.env.OUT, GAME = 'http://127.0.0.1:' + process.env.GAME_PORT + '/', PROXY = 'http://127.0.0.1:' + process.env.DS_PORT;
const only = process.argv[2];
// 带 ★ 的是故意放的历史或逻辑毛病（越权、时代不对、凭空的资源），看审稿和推演挡不挡得住；不告诉审稿哪里有错
const P = {
  bandit: { form: ['嘉庆十八年', '山东曹州府', '山寨寨主', '胡大彪'], steps: [
    '我先看看寨子里现在有多少弟兄、多少粮食、多少银子，各头目都是谁',
    '问问管粮的头目，寨里的粮还够吃几个月',
    '找二当家来商量：以后下山只劫过路的大户，不碰本地百姓',
    '★把弟兄分成三队轮流守寨、巡山，账目每旬报一次；再写一道令给曹州知府，叫他三日内给寨里送三千石粮来',
    '派人下山去附近村子招募肯入伙的流民，愿来的管饭',
    '★清点一下招来了多少人、寨里现在多少人多少粮；顺便把寨里那两门红衣大炮拉出来擦一擦',
    '派人去联络邻近的梁家寨，提议两寨互不侵犯、遇官兵互相通风报信',
    '★官兵风声紧，把寨子搬到更深的山里去，用电报通知梁家寨',
    '把寨里头目、弟兄的关系，和梁家寨的往来说给我听',
    '这段日子先守着新寨子休养，过一个月再看情形'] },
  merchant: { form: ['乾隆二十二年', '扬州', '盐商', '汪景和'], steps: [
    '看看我手头有多少现银、有哪些产业',
    '我现在的营生都有哪些，每月进出怎样',
    '在扬州城里开一家自己的盐号，字号叫汪大有，先拿出五千两做本钱',
    '看看汪大有盐号现在的情形：本钱、伙计、存货',
    '★去拜访同行的江春，商量合伙承运今年的纲盐；顺便请两江总督下令把今年两淮的盐引都批给我一家',
    '★从仪征盐栈买进一千引盐，装上火车运到汉口去卖',
    '★核一核买盐之后我的现银和盐号本钱各剩多少——我记得账上应该还有十万两',
    '把盐号的账、货和往来记录给我看看',
    '这三个月照常经营，过一季再看',
    '盘点这一季下来的盈亏，和盐号往后的打算'] },
  zongbing: { form: ['乾隆二十年', '江苏通州', '狼山镇总兵', '马世勋'], steps: [
    '我现在是什么身份，官职品级如何',
    '狼山镇标下有多少兵、分几营、驻在哪里',
    '我能直接调动哪些兵，哪些人归我管',
    '我手下的副将、参将、游击都是谁；撤换一个不得力的游击，换我的旗牌官上去',
    '★调阅苏州府这一年的钱粮账册',
    '★下令把江宁府知府撤职，换我的人',
    '★传令两江各营都听我调遣',
    '给两江总督写禀帖，报告江面海防的情形，请拨修船的银子；信里提一提英国人的铁甲舰',
    '这两个月照常操练，过两个月再看',
    '看看我现在的官职、兵马和权限有没有变'] }
};
const phase = t => fetch(PROXY + '/__phase', { method: 'POST', body: t }).catch(() => {});
(async () => {
  const b = await chromium.launch();
  for (const [key, cfg] of Object.entries(P)) {
    if (only && only !== key) continue;
    const dir = path.join(OUT, key); fs.mkdirSync(dir, { recursive: true });
    const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    const idle = async (ms = 1500000) => { try { await p.waitForFunction(() => !BUSY && document.querySelector('#said'), null, { timeout: ms, polling: 500 }); return true; } catch (_) { return false; } };
    const snap = () => p.evaluate(() => S ? JSON.parse(JSON.stringify(S)) : null);
    const view = () => p.evaluate(() => { if (!S) return { err: ERRMSG }; const d = identityOf(S), g = S.chat[S.chat.length - 1] || {};
      return { turn: S.turn, when: timeText(S.clock), place: S.place.full, role: S.protagonist.role, name: S.protagonist.name, idm: S.idm, identity: { tags: d.tags, power: d.power, admin: d.admin, command: d.command, ruler: d.ruler, troops: d.military.troops, orgs: d.orgs }, roleKind: roleKind(S), govScope: govScope(S), tabs: tabsFor(S).map(t => t[0]), cash: (S.money || {}).cash,
        forces: arr(S.forces).map(f => [f.name, f.leader, f.troops, f.at, f.src]), orgs: arr(S.orgs).map(o => ({ id: o.id, name: o.name, kind: o.kind, head: o.head, n: orgCount(S, o), seat: o.seat, cash: o.cash, grain: o.grain, ties: o.ties, gone: !!o.gone, members: o.members })), business: arr(S.business).map(x => [x.name, x.capital, x.revenue, x.cost]),
        people: Object.keys(S.people || {}).length, household: arr(S.household).length, acts: arr(S.acts).slice(-6).map(a => [a.id, a.type, a.what, a.state]), unbooked: arr(S.unbooked).slice(-6), review: arr(S.reviewLog).slice(-1)[0] || null, perf: arr(S.perf).slice(-1)[0] || null,
        receipt: (document.querySelector('.receipt') || {}).innerText || '', text: String(g.text || '').slice(0, 4000), audit: g.audit || null, extra: g.extra ? Object.keys(g.extra) : [] }; });
    await p.goto(GAME); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
    await phase(key + ':开局');
    await p.evaluate(() => { const d = document.querySelector('#dCustom'); if (d) d.open = true; });
    await p.fill('#cYear', cfg.form[0]); await p.fill('#cPlace', cfg.form[1]); await p.fill('#cRole', cfg.form[2]); await p.fill('#cName', cfg.form[3]); await p.selectOption('#cReal', '虚');
    const t0 = Date.now(); await p.click('#bCustomStart'); const okOpen = await idle();
    fs.writeFileSync(path.join(dir, '00-opening.json'), JSON.stringify({ ok: okOpen, ms: Date.now() - t0, view: await view(), state: await snap(), errs }, null, 1));
    if (!okOpen || !(await p.evaluate(() => !!S))) { console.log(key, '开局失败'); await p.close(); continue; }
    for (let i = 0; i < Math.min(cfg.steps.length, +(process.env.STEPS || 10)); i++) {
      const said = cfg.steps[i].replace(/^★/, ''), trap = cfg.steps[i].startsWith('★');
      await phase(`${key}:第${i + 1}回`);
      const before = await snap(), t1 = Date.now();
      await p.fill('#said', said); await p.click('#bSend'); const ok = await idle();
      const v = await view(), after = await snap();
      fs.writeFileSync(path.join(dir, `${String(i + 1).padStart(2, '0')}.json`), JSON.stringify({ i: i + 1, said, trap, ok, ms: Date.now() - t1, view: v, before, after, errs: errs.slice() }, null, 1));
      console.log(key, i + 1, ok ? 'ok' : '卡住', Math.round((Date.now() - t1) / 1000) + 's', said.slice(0, 20));
      if (!ok) break;
    }
    // 第十回后刷新：状态能不能完整恢复
    const pre = await snap(); await p.reload(); await p.waitForTimeout(4000); await idle(120000);
    const post = await p.evaluate(() => S ? JSON.parse(JSON.stringify(S)) : null);
    const same = k => JSON.stringify((pre || {})[k]) === JSON.stringify((post || {})[k]);
    fs.writeFileSync(path.join(dir, '99-reload.json'), JSON.stringify({ turnPre: pre && pre.turn, turnPost: post && post.turn, same: Object.fromEntries(['protagonist', 'career', 'money', 'forces', 'orgs', 'business', 'people', 'household', 'acts', 'territory', 'clock', 'place'].map(k => [k, same(k)])) }, null, 1));
    await p.close();
  }
  await b.close();
})();
