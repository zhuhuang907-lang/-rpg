'use strict';
/**
 * 启动自检：让游戏在中国常见的上网环境里也连得上 DeepSeek / 博查。
 *   ① 信任 Windows 系统证书（--use-system-ca）：360、火绒等杀毒软件的「HTTPS 扫描」会换掉证书，
 *      Node 默认只认自带的证书，于是所有请求都报 fetch failed；
 *   ② 跟随系统代理（--use-env-proxy + Windows 「设置→代理」里的地址）：浏览器能上的网，游戏也能上。
 * 做法：带上这些开关把自己再启动一次（子进程），父进程只负责转发退出码；父进程没了子进程也自己退出。
 * 不管从 exe、bat 还是命令行启动，都走这一步。
 */
const { spawn, execFileSync } = require('child_process');

function windowsProxy() {
  if (process.platform !== 'win32') return '';
  try {
    const out = execFileSync('reg', ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'], { encoding: 'utf8', windowsHide: true, timeout: 3000 });
    const en = /ProxyEnable\s+REG_DWORD\s+0x(\d+)/i.exec(out);
    if (!en || Number(en[1]) === 0) return '';
    const sv = /ProxyServer\s+REG_SZ\s+(\S+)/i.exec(out);
    if (!sv) return '';
    let v = sv[1];
    // 「http=127.0.0.1:7890;https=127.0.0.1:7890」这种分协议写法，取 https 的，没有就取 http 的
    if (v.includes('=')) {
      const parts = Object.fromEntries(v.split(';').map(x => x.split('=')).filter(x => x.length === 2));
      v = parts.https || parts.http || '';
    }
    if (!v || /^socks/i.test(v)) return '';
    return /^https?:\/\//i.test(v) ? v : 'http://' + v;
  } catch (_) { return ''; }
}

/** 需要重启自己就重启，返回 true（调用方应立即 return）；否则返回 false 照常运行 */
function relaunchIfNeeded() {
  if (process.env.RPG_BOOTED === '1' || process.env.RPG_NO_RELAUNCH === '1') {
    watchParent();
    return false;
  }
  const allowed = process.allowedNodeEnvironmentFlags || new Set();
  const flags = [];
  if (allowed.has('--use-system-ca') && !process.execArgv.includes('--use-system-ca')) flags.push('--use-system-ca');
  const env = { ...process.env, RPG_BOOTED: '1', RPG_PARENT_PID: String(process.pid) };
  if (!env.HTTPS_PROXY && !env.https_proxy) {
    const p = windowsProxy();
    if (p) { env.HTTPS_PROXY = p; env.HTTP_PROXY = p; }
  }
  if (env.HTTPS_PROXY || env.https_proxy) {
    env.NO_PROXY = [env.NO_PROXY, '127.0.0.1', 'localhost', '::1'].filter(Boolean).join(',');
    if (allowed.has('--use-env-proxy')) flags.push('--use-env-proxy');
  }
  // Windows 上总是由父进程看着：游戏服务万一崩了，一秒后自己重启，玩家不用关掉重开
  if (!flags.length && process.platform !== 'win32' && process.env.RPG_SUPERVISE !== '1') return false;
  for (const st of [process.stdout, process.stderr]) st.on('error', () => {});
  let child = null, quitting = false;
  const starts = [];
  const launch = () => {
    starts.push(Date.now()); while (starts.length && Date.now() - starts[0] > 5 * 60 * 1000) starts.shift();
    child = spawn(process.execPath, [...flags, ...process.execArgv, process.argv[1], ...process.argv.slice(2)], { stdio: 'inherit', env, windowsHide: true });
    child.on('exit', code => {
      if (quitting) return process.exit(code == null ? 0 : code);
      if (code === 98) return process.exit(98);   // 端口被占：重启也没用，让启动器告诉玩家
      // 五分钟里重启了十次还在崩：多半是端口被占、文件坏了，别再无限重启
      if (starts.length >= 10) { console.error('[boot] 游戏服务反复退出，不再重启'); return process.exit(code == null ? 1 : code); }
      console.error(`[boot] 游戏服务意外退出（${code}），一秒后重启`);
      setTimeout(launch, 1000);
    });
    child.on('error', e => { console.error('[boot] 子进程启动失败：', e.message); });
  };
  launch();
  for (const sig of ['SIGINT', 'SIGTERM', 'SIGBREAK']) { try { process.on(sig, () => { quitting = true; try { child && child.kill(); } catch (_) { /* 忽略 */ } process.exit(0); }); } catch (_) { /* 平台不支持该信号 */ } }
  return true;
}

/** 子进程：父进程（启动器拉起的那个 node）被关掉后自己也退出，免得游戏服务一直占着端口 */
function watchParent() {
  const ppid = Number(process.env.RPG_PARENT_PID || 0);
  if (!ppid) return;
  const t = setInterval(() => { try { process.kill(ppid, 0); } catch (_) { process.exit(0); } }, 2000);
  t.unref();
}

module.exports = { relaunchIfNeeded, windowsProxy };
