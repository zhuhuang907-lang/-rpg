// 端口被占（CLAUDE.md「发布与仓库」端口）：别的程序占着就往后挪、记进 data/port.json；本游戏已经开着就直说、不另开一个、守护进程不重启
const { spawn, execSync } = require('child_process'); const fs = require('fs'), path = require('path'), net = require('net'), os = require('os');
(async () => {
  const errs = [], tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pf-')), rk = path.join(__dirname, '..', '..', 'rpg-kernel');
  execSync(`tar --exclude=./data --exclude=./node_modules -C "${rk}" -cf - . | tar -C "${tmp}" -xf -`); fs.mkdirSync(path.join(tmp, 'data'), { recursive: true });
  const P = 8960 + Math.floor(Math.random() * 20), blocker = net.createServer().listen(P, '127.0.0.1');
  const run = (port) => new Promise(res => { const c = spawn(process.execPath, ['server.js'], { cwd: tmp, env: { ...process.env, PORT: String(port), RPG_NO_UPDATE: '1', RPG_OFFLINE: '1', SHU_NO_BROWSER: '1' } }); let out = ''; c.stdout.on('data', d => { out += d; }); c.stderr.on('data', d => { out += d; }); setTimeout(() => res({ c, out: () => out }), 4000); });
  const a = await run(P); const pj = JSON.parse(fs.readFileSync(path.join(tmp, 'data', 'port.json'), 'utf8') || '{}');
  if (pj.port !== P + 1 || !/改用/.test(a.out())) errs.push('别的程序占着端口没往后挪：' + a.out().slice(-200));
  const b = await run(P + 1); if (!/已经开着/.test(b.out())) errs.push('游戏已经开着还另开一个：' + b.out().slice(-200)); if (/一秒后重启/.test(b.out())) errs.push('已经开着退出后守护进程还在重启');
  try { a.c.kill(); b.c.kill(); } catch (_) {} blocker.close();
  console.log('ERRS', JSON.stringify(errs)); process.exit(0);
})();
