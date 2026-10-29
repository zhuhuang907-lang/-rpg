// 照真玩家的玩法走一遍：假 AI 照真实的慢（LAT），每回读几秒就出下一步、不等后台；看每一回玩家实际看得到什么、后台的活到底做没做成
// 用法：LAT=1 bash one.sh ai.js realplay.js [回合数]
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const N = Number(process.argv[2] || 6), OUT = process.env.RP_OUT || '.';
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}); const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push('page: ' + e.message)); const bad = m => errs.push(m); const seen = { press: 0, agenda: 0 };
  const turnDone = async (ms = 600000) => { try { await p.waitForFunction(() => !BUSY && document.querySelector('#said'), null, { timeout: ms, polling: 300 }); return true; } catch (_) { return false; } };
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await p.evaluate(async () => { await api('/api/quick-key', { bochaKey: 'bk-good1234' }); await refreshKey(); });
  const t0 = Date.now();
  await p.fill('#qText', process.env.RP_START || '乾隆二十二年扬州的盐商'); await p.click('#bStart');
  if (!(await turnDone())) { console.log('OPEN FAIL', JSON.stringify(await p.evaluate(() => ({ err: ERRMSG, view: VIEW })))); await b.close(); process.exit(1); }
  console.log('OPEN', Math.round((Date.now() - t0) / 1000) + 's', JSON.stringify(await p.evaluate(() => ({ who: S.protagonist.name, real: S.protagonist.real, role: S.protagonist.role }))));
  const acts = ['去盐运司衙门打听今年的盐引', '回家看看妻儿，问问家里近来可好', '推行清丈名下田亩，查出佃户隐瞒的租子', '请账房把这个月的账拿来细看', '去拜会两淮盐政，探探他的口风', '派人去仪征打听掣验的行情'];
  const snap = async (label) => p.evaluate((label) => {
    const ym = Math.floor(ymOf(S.clock)), q = sel => document.querySelectorAll(sel).length;
    return { label, turn: S.turn, when: timeText(S.clock), bg: BG ? (BGMSG || BG_STEP || 'bg') : '',
      press: arr(S.press).filter(x => x.state === '临门').map(x => x.kind + ':' + x.title).slice(0, 8), pressAt: S.pressAt === ym, homeAt: S.homeAt === ym, prFail: S.prFail, hmFail: S.hmFail,
      agenda: S.agenda && S.agenda.ym === ym ? arr(S.agenda.items).length : 0, fam: S.famRec, hh: arr(S.household).filter(m => !m.dead).length, people: Object.keys(S.people || {}).length,
      world: S.world && S.world.tickAt ? S.world.tickAt.label : '', gaz: !!S.gazetteer, org: !!S.org, plans: arr(S.plans).map(x => x.name + '·' + x.state), home: S.home ? S.home.harmony : null,
      ui: { pressBar: q('.goalbar.press .goal'), agendaBar: q('.goalbar.agenda .goal'), planCard: q('.plan') }, perf: arr(S.perf).slice(-1)[0] || null,
      lastErr: (JSON.parse(localStorage.getItem('hrpg:errlog') || '[]').slice(-3)).map(e => (e.kind || '') + ':' + String(e.msg || '').slice(0, 60)) };
  }, label);
  console.log('SNAP', JSON.stringify(await snap('开局后')));
  for (let i = 0; i < N; i++) {
    await p.waitForTimeout(Number(process.env.RP_READ || 8000));   // 玩家读正文的工夫
    const pb = await p.$('.goalbar.press .goal');
    let said = acts[i % acts.length];
    if (pb && i % 2 === 1) { await pb.click(); await p.waitForTimeout(200); said = (await p.inputValue('#said')) + '先照规矩应下来，再看情形'; }
    await p.fill('#said', said); const ts = Date.now(); await p.click('#bSend');
    const ok = await turnDone();
    console.log('TURN', i + 1, ok ? 'ok' : 'STUCK', Math.round((Date.now() - ts) / 1000) + 's', said.slice(0, 30));
    const sn = await snap('第' + (i + 1) + '回后'); console.log('SNAP', JSON.stringify(sn));
    if (sn.ui.pressBar) seen.press++; if (sn.ui.agendaBar) seen.agenda++;
    if (!ok) { bad('第' + (i + 1) + '回卡住了'); break; }
  }
  // 后台不饿死（CLAUDE.md「发布与仓库」后台不饿死）：照真玩家的玩法，几回下来该做的都得做成
  const fin = await p.evaluate(() => ({ world: !!(S.world && S.world.tickAt), estate: !!S.estate && !S.estateDue, perf: arr(S.perf).length, turns: S.turn, fam: S.famRec }));
  console.log('FIN', JSON.stringify(fin), JSON.stringify(seen));
  if (!fin.world) bad('几回下来天下大势一次没推演');
  if (!fin.estate) bad('几回下来家底还没立');
  if (!seen.press) bad('临门的事一次没摆出来');
  if (!seen.agenda) bad('眼下的事一次没摆出来');
  if (fin.perf < Math.min(N, fin.turns - 1)) bad('每回用时没记全：' + fin.perf + ' 条');
  await p.screenshot({ path: OUT + '/realplay.png', fullPage: false });
  const side = await p.evaluate(() => (document.querySelector('.side') || document.body).innerText.slice(0, 3000));
  fs.writeFileSync(OUT + '/realplay_side.txt', side);
  for (const f of ['timeline.log', 'bocha.log']) { try { fs.copyFileSync(f, OUT + '/' + f); } catch (_) {} }
  console.log('ERRS', JSON.stringify(errs.slice(0, 10)));
  await b.close();
})();
