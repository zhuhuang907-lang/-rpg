// 交互驾驶：常驻一个页面，HTTP 收指令。POST /start body=JSON form；POST /say body=话；POST /eval body=JS；GET /view
const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs');
const GAME = 'http://127.0.0.1:' + process.env.GAME_PORT + '/', PROXY = 'http://127.0.0.1:' + process.env.DS_PORT, OUT = process.env.OUT;
let p, errs = [];
const idle = async (ms = 1800000) => { try { await p.waitForFunction(() => !BUSY && document.querySelector('#said'), null, { timeout: ms, polling: 500 }); return true; } catch (_) { return false; } };
const view = () => p.evaluate(() => { if (!S) return { err: typeof ERRMSG !== 'undefined' ? ERRMSG : 'noS' }; const d = identityOf(S), g = S.chat[S.chat.length - 1] || {};
  return { turn: S.turn, when: timeText(S.clock), place: S.place.full, role: S.protagonist.role, name: S.protagonist.name, identity: { tags: d.tags, power: d.power, admin: d.admin, command: d.command, ruler: d.ruler, troops: d.military.troops, orgs: d.orgs }, tabs: tabsFor(S).map(t => t[0]), cash: (S.money || {}).cash,
    forces: arr(S.forces).map(f => [f.name, f.leader, f.troops, f.at]), business: arr(S.business).map(x => [x.name, x.capital, x.revenue, x.cost]), territory: S.territory, career: S.career,
    acts: arr(S.acts).slice(-5).map(a => [a.type, a.what, a.state]), receipt: (document.querySelector('.receipt') || {}).innerText || '', text: String(g.text || '').slice(0, 5000) }; }).then(v => Object.assign(v, { errs: errs.slice(-5) }));
http.createServer(async (req, res) => {
  let b = ''; req.on('data', c => b += c); await new Promise(r => req.on('end', r));
  try {
    let out;
    if (req.url === '/start') { const f = JSON.parse(b); const br = await chromium.launch(); p = await br.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 }); p.on('pageerror', e => errs.push(e.message));
      await p.goto(GAME); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
      await p.evaluate(() => { const d = document.querySelector('#dCustom'); if (d) d.open = true; });
      await p.fill('#cYear', f[0]); await p.fill('#cPlace', f[1]); await p.fill('#cRole', f[2]); await p.fill('#cName', f[3]); await p.selectOption('#cReal', f[4] == null ? '虚' : f[4]);
      await p.click('#bCustomStart'); const ok = await idle(); out = { ok, v: await view() }; }
    else if (req.url === '/load') { const o = JSON.parse(require('fs').readFileSync(b, 'utf8')); const br = await chromium.launch(); p = await br.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 }); p.on('pageerror', e => errs.push(e.message));
      await p.goto(GAME); await p.evaluate(o => { localStorage.clear(); for (const k in o) localStorage.setItem(k, o[k]); }, o); await p.reload(); await p.waitForTimeout(3000); await idle(120000); out = { ok: true, v: await view() }; }
    else if (req.url === '/say') { await fetch(PROXY + '/__phase', { method: 'POST', body: 'turn' }).catch(() => {}); await p.fill('#said', b); await p.click('#bSend'); const ok = await idle(); out = { ok, v: await view() }; }
    else if (req.url === '/eval') { out = await p.evaluate(b); }
    else if (req.url === '/shot') { const [f, full] = b.split('|'); await p.screenshot({ path: f, fullPage: full === 'full' }); out = 'ok'; }
    else out = await view();
    res.end(JSON.stringify(out, null, 1));
  } catch (e) { res.end(JSON.stringify({ error: e.message })); }
}).listen(8798, '127.0.0.1', () => console.log('drive on 8798'));
