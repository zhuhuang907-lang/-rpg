// 江山时序的数据（CLAUDE.md「舆图」用江山时序）：桌面版由本机服务替玩家下到 data/cache/jiangshan，不随游戏打包；只认两个文件名，下到的不是地图数据不收；下过的不再下
const { spawn, execSync } = require('child_process'); const fs = require('fs'), path = require('path'), http = require('http'), os = require('os');
(async () => {
  const errs = [], tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'js-')), rk = path.join(__dirname, '..', '..', 'rpg-kernel');
  execSync(`tar --exclude=./data --exclude=./node_modules -C "${rk}" -cf - . | tar -C "${tmp}" -xf -`); fs.mkdirSync(path.join(tmp, 'data'), { recursive: true });
  let hits = 0; const body = 'window.DYNASTY_DATA = []; // ' + 'x'.repeat(2000);
  const src = http.createServer((q, r) => { hits++; if (/map_data\.js$/.test(q.url)) { r.writeHead(200); r.end(body); } else if (/atlas_snapshots\.js$/.test(q.url)) { r.writeHead(200); r.end('<html>not found</html>'); } else { r.writeHead(404); r.end(); } }).listen(0, '127.0.0.1');
  await new Promise(r => src.on('listening', r)); const SP = src.address().port, P = 9010 + Math.floor(Math.random() * 30);
  const c = spawn(process.execPath, ['server.js'], { cwd: tmp, env: { ...process.env, PORT: String(P), RPG_NO_UPDATE: '1', RPG_OFFLINE: '1', SHU_NO_BROWSER: '1', JSMAP_BASE: `http://127.0.0.1:${SP}/js/`, NO_PROXY: '127.0.0.1' } });
  let out = ''; c.stdout.on('data', d => { out += d; }); c.stderr.on('data', d => { out += d; });
  for (let i = 0; i < 40; i++) { try { const r = await fetch(`http://127.0.0.1:${P}/api/health`); if (r.ok) break; } catch (_) { } await new Promise(r => setTimeout(r, 250)); }
  const get = async f => { const r = await fetch(`http://127.0.0.1:${P}/api/jsmap?f=${f}`); return { st: r.status, t: await r.text() }; };
  const a = await get('map_data'); if (a.st !== 200 || !a.t.startsWith('window.DYNASTY_DATA')) errs.push('本机服务没把江山时序的朝代表下下来：' + a.st + ' ' + a.t.slice(0, 80));
  const n0 = hits; const a2 = await get('map_data'); if (hits !== n0 || a2.st !== 200) errs.push('下过的又下了一遍（没缓存）');
  if (!fs.readdirSync(path.join(tmp, 'data', 'cache', 'jiangshan')).some(f => /map_data\.js$/.test(f))) errs.push('没存进 data/cache/jiangshan');
  const b = await get('atlas_snapshots'); if (b.st === 200) errs.push('下到的不是地图数据也收了');
  const e = await get('../../etc/passwd'); if (e.st === 200) errs.push('文件名不在名单里也去下了');
  try { c.kill(); } catch (_) { } src.close(); try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) { }
  console.log('ERRS', JSON.stringify(errs)); process.exit(0);
})();
