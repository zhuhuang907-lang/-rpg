// 端口被占（CLAUDE.md「发布与仓库」端口）：别的程序占着就往后挪、记进 data/port.json；本游戏已经开着就直说、不另开一个、守护进程不重启
const { spawn, execSync } = require('child_process'); const fs = require('fs'), path = require('path'), net = require('net'), os = require('os');
(async () => {
  const errs = [], tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-')), rk = path.join(__dirname, '..', '..', 'rpg-kernel');
  execSync(`tar --exclude=./data --exclude=./node_modules -C "${rk}" -cf - . | tar -C "${tmp}" -xf -`); fs.mkdirSync(path.join(tmp, 'data'), { recursive: true });
  const free = p => new Promise(res => { const s = net.createServer(); s.once('error', () => res(false)); s.listen(p, '127.0.0.1', () => s.close(() => res(true))); });
  let P = 0; for (let i = 0; i < 80 && !P; i++) { const c = 8960 + Math.floor(Math.random() * 40); if (await free(c) && await free(c + 1)) P = c; }
  if (!P) { console.log('ERRS', JSON.stringify(['找不到空端口'])); process.exit(0); }
  const blocker = net.createServer(); await new Promise((res, rej) => { blocker.once('error', rej); blocker.listen(P, '127.0.0.1', res); });
  const wait = async (fn, ms = 30000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (fn()) return true; await new Promise(r => setTimeout(r, 200)); } return false; };
  const run = async (port, ready) => { const c = spawn(process.execPath, ['server.js'], { cwd: tmp, env: { ...process.env, PORT: String(port), RPG_NO_UPDATE: '1', RPG_OFFLINE: '1', SHU_NO_BROWSER: '1' } }); let out = ''; c.stdout.on('data', d => { out += d; }); c.stderr.on('data', d => { out += d; }); await wait(() => (ready ? ready(out) : fs.existsSync(path.join(tmp, 'data', 'port.json'))) || c.exitCode !== null); await new Promise(r => setTimeout(r, 600)); return { c, out: () => out }; };
  const a = await run(P); const pf = path.join(tmp, 'data', 'port.json'), pj = fs.existsSync(pf) ? JSON.parse(fs.readFileSync(pf, 'utf8') || '{}') : {};
  if (pj.port !== P + 1 || !/改用/.test(a.out())) errs.push('别的程序占着端口没往后挪：' + a.out().slice(-200));
  const b = await run(P + 1, s => /已经开着|一秒后重启/.test(s)); if (!/已经开着/.test(b.out())) errs.push('游戏已经开着还另开一个：' + b.out().slice(-200)); if (/一秒后重启/.test(b.out())) errs.push('已经开着退出后守护进程还在重启');
  try { a.c.kill(); b.c.kill(); } catch (_) {} blocker.close();
  console.log('ERRS', JSON.stringify(errs)); process.exit(0);
})();
