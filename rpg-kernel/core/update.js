'use strict';
/**
 * 游戏内一键更新（玩家原话：「能不能让他下载的容易点」）。
 *
 * 装过一次以后，新版本不用再去网页上找：游戏里点「一键更新」就行。
 *   1. 读本机的 version.json（打包时写入）和发布页上的 version.json，比较版本号；
 *   2. 下载新的安装程序：先连 GitHub，连不上或太慢就换国内加速镜像；
 *   3. 下载完核对大小和 SHA-256（镜像是第三方的，对不上就丢掉换下一个）；
 *   4. 静默安装到当前游戏目录（存档和 Key 不在安装包里，不会被覆盖），装完安装程序会自己把游戏重新打开。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const REPO = 'zhuhuang907-lang/-rpg';
const BASE = process.env.RPG_UPDATE_BASE || `https://github.com/${REPO}/releases/download/latest/`;
// 国内常用的 GitHub 下载加速（第三方，随时可能失效；下载后都要核对 SHA-256）
const MIRRORS = process.env.RPG_UPDATE_BASE ? [''] : ['', 'https://ghfast.top/', 'https://gh-proxy.com/', 'https://ghproxy.net/'];
const APP_DIR = path.join(__dirname, '..');

function localVersion() {
  try { return JSON.parse(fs.readFileSync(path.join(APP_DIR, 'version.json'), 'utf8')); } catch (_) { return null; }
}

async function fetchWithTimeout(url, ms) {
  return require('./net').fetchX(url, { signal: AbortSignal.timeout(ms), headers: { 'User-Agent': 'HistoryRPG-updater' } }, { noFastFail: true });
}

/** 查发布页上的最新版本：哪个地址先拿到就用哪个 */
async function remoteVersion() {
  const errs = [];
  for (const m of MIRRORS) {
    const url = m + BASE + 'version.json';
    try {
      const r = await fetchWithTimeout(url + '?t=' + Date.now(), 10000);
      if (!r.ok) { errs.push(`${m || 'GitHub'}：HTTP ${r.status}`); continue; }
      const j = await r.json();
      if (j && j.run) return { ...j, via: m };
      errs.push(`${m || 'GitHub'}：内容不对`);
    } catch (e) { errs.push(`${m || 'GitHub'}：${String(e.message || e).slice(0, 60)}`); }
  }
  const err = new Error('查不到新版本信息（' + errs.join('；') + '）');
  err.tries = errs;
  throw err;
}

async function check() {
  const cur = localVersion();
  if (!cur) return { ok: true, dev: true, hasUpdate: false, why: '开发版（不是安装包装的），不检查更新' };
  if (process.env.RPG_OFFLINE === '1') return { ok: true, hasUpdate: false, current: cur, why: '离线模式' };
  try {
    const latest = await remoteVersion();
    return { ok: true, current: cur, latest, hasUpdate: Number(latest.run) > Number(cur.run), canAuto: process.platform === 'win32' };
  } catch (e) { return { ok: false, why: String(e.message || e), current: cur }; }
}

/* ===== 下载与安装（一次只跑一个） ===== */
const JOB = { state: 'idle', got: 0, total: 0, via: '', why: '', log: [] };

async function download(url, file, expect) {
  const r = await fetchWithTimeout(url, 15 * 60 * 1000);
  if (!r.ok || !r.body) throw new Error('HTTP ' + r.status);
  JOB.total = Number(r.headers.get('content-length')) || expect.size || 0;
  JOB.got = 0;
  const hash = crypto.createHash('sha256');
  const out = fs.createWriteStream(file);
  const reader = r.body.getReader();
  let last = Date.now(), lastGot = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    hash.update(value);
    if (!out.write(value)) await new Promise(res => out.once('drain', res));
    JOB.got += value.length;
    // 太慢（30 秒不到 200KB）就放弃这个地址，换下一个
    if (Date.now() - last > 30000) {
      if (JOB.got - lastGot < 200 * 1024) { reader.cancel().catch(() => {}); out.destroy(); throw new Error('太慢'); }
      last = Date.now(); lastGot = JOB.got;
    }
  }
  await new Promise((res, rej) => out.end(err => (err ? rej(err) : res())));
  const sum = hash.digest('hex');
  if (expect.size && JOB.got !== expect.size) throw new Error(`大小不对（${JOB.got} ≠ ${expect.size}）`);
  if (expect.sha256 && sum !== String(expect.sha256).toLowerCase()) throw new Error('校验不对，文件可能被改过');
}

async function runUpdate() {
  const latest = await remoteVersion();
  const cur = localVersion();
  if (!cur) throw new Error('开发版不能自动更新');
  if (!(Number(latest.run) > Number(cur.run))) { JOB.state = 'uptodate'; return; }
  if (!latest.setupSha256) throw new Error('发布页没有校验值，为安全起见不自动安装');
  const file = path.join(os.tmpdir(), `HistoryRPG-Setup-${latest.run}.exe`);
  JOB.state = 'downloading';
  let ok = false;
  for (const m of MIRRORS) {
    JOB.via = m || 'GitHub';
    try { await download(m + BASE + 'HistoryRPG-Setup.exe', file, { size: Number(latest.setupSize) || 0, sha256: latest.setupSha256 }); ok = true; break; }
    catch (e) { JOB.log.push(`${JOB.via}：${String(e.message || e).slice(0, 80)}`); try { fs.unlinkSync(file); } catch (_) { /* 无 */ } }
  }
  if (!ok) throw new Error('几个下载地址都没下成（' + JOB.log.join('；') + '）');
  if (process.platform !== 'win32') { JOB.state = 'downloaded'; JOB.file = file; return; }
  // 装到当前游戏所在的目录（免安装版也一样），存档和 Key 不受影响。
  // 用 cmd /c start 让安装程序脱离本进程：启动器关掉游戏服务时不会把安装程序一起关掉。
  const root = path.dirname(APP_DIR);
  const args = `/c start "" "${file}" /VERYSILENT /SUPPRESSMSGBOXES /NORESTART /CLOSEAPPLICATIONS /FORCECLOSEAPPLICATIONS "/DIR=${root}"`;
  spawn('cmd.exe', [args], { detached: true, stdio: 'ignore', windowsVerbatimArguments: true, windowsHide: true }).unref();
  JOB.state = 'installing';
}

function start() {
  if (JOB.state === 'downloading' || JOB.state === 'installing') return { ok: true, already: true };
  Object.assign(JOB, { state: 'checking', got: 0, total: 0, via: '', why: '', log: [] });
  runUpdate().catch(e => { JOB.state = 'error'; JOB.why = String(e.message || e); });
  return { ok: true };
}
function status() { return { ok: true, ...JOB }; }

/** 手动下载用的地址（游戏里更新不了时给玩家看） */
function links() {
  return MIRRORS.map(m => ({ name: m ? m.replace(/^https:\/\/|\/$/g, '') + ' 加速' : 'GitHub 直连', url: m + BASE + 'HistoryRPG-Setup.exe' }));
}

module.exports = { check, start, status, links, localVersion, MIRRORS, BASE };
