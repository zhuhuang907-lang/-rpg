// 930 闽王真玩（假 AI 照五代回）：开局、三回、查有没有乾隆/盐商/卢见曾串进来
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message.slice(0, 200)));
  p.on('dialog', d => d.dismiss());
  await p.goto('http://127.0.0.1:' + (process.env.GAME_PORT || 8793) + '/');
  await p.waitForTimeout(1200);
  await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1200);
  const idle = async (ms = 90000) => { try { await p.waitForFunction(() => !document.querySelector('.thinking') && !document.querySelector('.banner.thinking'), null, { timeout: ms }); return true; } catch (_) { return false; } };
  const leak = async () => p.evaluate(() => { const t = document.body.innerText; return ['卢见曾', '乾隆', '扬州', '盐运使', '盐商', '两淮'].filter(k => t.includes(k)); });
  await p.fill('#qText', '930年 闽王 王延钧');
  await p.click('#bStart');
  const opened = await (async () => { try { await p.waitForSelector('#said', { timeout: 180000 }); } catch (_) { return false; } return idle(120000); })();
  const st0 = await p.evaluate(() => S ? { name: S.protagonist.name, y: S.clock.y, polity: S.place.polity, role: S.protagonist.role, realm: !!S.realm, treasury: S.realm && S.realm.treasury, household: arr(S.household).map(m => m.relation + ':' + m.name).slice(0, 12), forces: arr(S.forces).map(f => f.name + '/' + f.troops), territory: arr(S.territory).map(t => t.place).slice(0, 8), prices: arr(S.prices).length } : null);
  const lk0 = await leak();
  const inputs = ['上朝听政，问各州钱粮', '遣使往吴越修好', '令威武军整训'];
  const log = [];
  for (const s of inputs) {
    await p.fill('#said', s);
    await p.click('#bSend');
    const ok = await idle(120000);
    const lk = await leak();
    const st = await p.evaluate(() => S ? { turn: S.turn, y: S.clock.y, m: S.clock.m, chat: S.chat.length, last: (S.chat.filter(c => c.text).slice(-1)[0] || {}).text || '' } : null);
    log.push({ input: s, idle: ok, leak: lk, turn: st && st.turn, y: st && st.y, m: st && st.m, last: st && String(st.last).slice(0, 80) });
  }
  console.log(JSON.stringify({ opened, st0, lk0, log, errs: [...new Set(errs)].slice(0, 8) }, null, 1));
  await b.close();
})().catch(e => { console.error('崩了：' + e.message); process.exit(1); });
