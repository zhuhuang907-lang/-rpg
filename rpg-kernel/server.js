'use strict';
/** 零依赖 HTTP 服务：静态托管 + JSON API。Node 22+。 */
// 先自检联网环境（系统证书、系统代理），需要的话带上开关重启自己
if (require.main === module && require('./core/boot').relaunchIfNeeded()) return;
const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const engine = require('./core/engine');
const adapters = require('./adapters/index');
const search = require('./adapters/search');
const verify = require('./core/verify');
const battle = require('./core/battle');
const events = require('./core/events');
const eraVocab = require('./core/eraVocab');

const ROOT = __dirname;
// 兜底：哪里漏接了一个错误（联网半路断了、某个回调里抛了异常），记下来照常运行，不让整个游戏服务退出
// 启动器关掉了、输出管道断了：写日志会一直报 EPIPE，不能让它在兜底里自己绕圈把 CPU 吃满
for (const st of [process.stdout, process.stderr]) st.on('error', () => {});
const ERR_RING = [];   // 最近出过的错，问题报告里带上（Key 打码）
const logErr = (...a) => { try { ERR_RING.push({ at: new Date().toISOString(), msg: a.map(x => String(x && x.stack || x)).join(' ').replace(/sk-[A-Za-z0-9]{6,}/g, 'sk-***').slice(0, 800) }); if (ERR_RING.length > 60) ERR_RING.shift(); } catch (_) { /* 忽略 */ } try { console.error(...a); } catch (_) { /* 管道断了就不写 */ } };
process.on('uncaughtException', e => { if (e && (e.code === 'EPIPE' || e.code === 'ERR_STREAM_DESTROYED')) return; logErr('[兜底] 未接住的错误：', e && (e.stack || e.message || e)); });
process.on('unhandledRejection', e => { logErr('[兜底] 未接住的异步错误：', e && (e.stack || e.message || e)); });
const PUBLIC = path.join(ROOT, 'public');
/** 改名（存档落盘的最后一步）：Windows 上杀毒软件、索引服务会短暂占着文件，等一下再试，别让存档失败 */
function renameRetry(a, b) {
  for (let i = 0; ; i++) {
    try { return fs.renameSync(a, b); } catch (e) {
      if (i >= 6 || !/EPERM|EBUSY|EACCES/.test(e.code || '')) { if (i >= 6) { fs.copyFileSync(a, b); try { fs.unlinkSync(a); } catch (_) { /* 忽略 */ } return; } throw e; }
      const t = Date.now() + 60 * (i + 1); while (Date.now() < t) { /* 等一下 */ }
    }
  }
}
// 接口版本：游戏页面要用到新的服务端接口时加一；自动更新只换页面，页面要求的接口比这里新就提示重新安装
const API_VER = 3;   // 3：联网改了服务端（代理坏了自动直连），只换页面不够，旧装的要提示重装
let SELFTEST_RUN = null;   // 自检一次只跑一个：连点几下就等同一次的结果
/* —— 自动更新：游戏的全部玩法都在 index.html 里。启动时去 GitHub 看有没有新版，有就下载到 data/update，下次打开直接用新版，不用重新安装 —— */
const UPDATE_DIR = path.join(ROOT, 'data', 'update');
const UPDATE = { checked: false, local: null, remote: null, using: 'bundled', needReinstall: false, why: '' };
function readVer(dir) { try { return JSON.parse(fs.readFileSync(path.join(dir, 'version.json'), 'utf8')); } catch { return null; } }
function updatedPage() {
  const b = readVer(PUBLIC), u = readVer(UPDATE_DIR);
  if (u && (!b || String(u.build) > String(b.build)) && Number(u.api || 0) <= API_VER && fs.existsSync(path.join(UPDATE_DIR, 'index.html'))) return path.join(UPDATE_DIR, 'index.html');
  return null;
}
/** 更新的来源：GitHub 原站在国内常连不上，同时试几个镜像，哪个快、哪个版本新就用哪个 */
const UPD_REPO = 'zhuhuang907-lang/-rpg', UPD_BRANCH = 'claude/gallant-davinci-l8pni0', UPD_PATH = 'rpg-kernel/public';
async function updateSources() {
  const raw = `https://raw.githubusercontent.com/${UPD_REPO}/${UPD_BRANCH}/${UPD_PATH}`;
  const L = [{ name: 'GitHub', base: process.env.RPG_UPDATE_BASE || raw }];
  if (process.env.RPG_UPDATE_BASE) return L;
  L.push({ name: '镜像 ghfast', base: 'https://ghfast.top/' + raw }, { name: '镜像 gh-proxy', base: 'https://gh-proxy.com/' + raw });
  // jsDelivr 要提交号：先问 GitHub 接口这条分支最新的提交（接口站在国内一般比 raw 好连）
  try {
    const r = await require('./core/net').fetchX(`https://api.github.com/repos/${UPD_REPO}/commits/${encodeURIComponent(UPD_BRANCH)}`, { headers: { accept: 'application/vnd.github.sha' }, signal: AbortSignal.timeout(10000) });
    const sha = r.ok ? (await r.text()).trim() : '';
    if (/^[0-9a-f]{40}$/.test(sha)) L.push({ name: 'jsDelivr', base: `https://cdn.jsdelivr.net/gh/${UPD_REPO}@${sha}/${UPD_PATH}` }, { name: 'jsDelivr 备用', base: `https://fastly.jsdelivr.net/gh/${UPD_REPO}@${sha}/${UPD_PATH}` });
  } catch (_) { /* 问不到就只用上面几个 */ }
  return L;
}
let UPDATING = null;
function checkUpdate(force) { if (!UPDATING || force) UPDATING = doCheckUpdate().finally(() => { UPDATING = null; }); return UPDATING; }
async function doCheckUpdate() {
  if (process.env.RPG_OFFLINE || process.env.RPG_NO_UPDATE) return;
  const net = require('./core/net');
  try {
    const srcs = await updateSources();
    const vs = (await Promise.all(srcs.map(async x => {
      try { const r = await net.fetchX(x.base + '/version.json?t=' + Date.now(), { signal: AbortSignal.timeout(15000) }); if (!r.ok) return null; const v = await r.json(); return v && v.build ? { ...x, v } : null; } catch (_) { return null; }
    }))).filter(Boolean);
    if (!vs.length) throw new Error('GitHub 和几个镜像都连不上（' + srcs.map(x => x.name).join('、') + '）');
    const best = vs.sort((a, b) => String(b.v.build).localeCompare(String(a.v.build)))[0], v = best.v, b = readVer(PUBLIC), cur = readVer(UPDATE_DIR);
    UPDATE.local = b && b.build; UPDATE.remote = v.build; UPDATE.source = best.name; UPDATE.why = '';
    const newest = [b, cur].filter(Boolean).map(x => String(x.build)).sort().pop() || '';
    if (String(v.build) <= newest) { UPDATE.checked = true; UPDATE.using = updatedPage() ? 'updated' : 'bundled'; return; }
    if (Number(v.api || 0) > API_VER) { UPDATE.needReinstall = true; UPDATE.checked = true; return; }
    let html = '', lastErr = '';
    for (const x of vs.filter(x => String(x.v.build) === String(v.build))) {
      try {
        const r2 = await net.fetchX(x.base + '/index.html?t=' + Date.now(), { signal: AbortSignal.timeout(180000) });
        if (!r2.ok) throw new Error('HTTP ' + r2.status);
        const t = await r2.text();
        if (t.length < 100000 || !t.includes(String(v.build))) throw new Error('下载的页面不完整');
        html = t; UPDATE.source = x.name; break;
      } catch (e) { lastErr = x.name + '：' + String(e && e.message || e).slice(0, 80); }
    }
    if (!html) throw new Error(lastErr || '下载失败');
    fs.mkdirSync(UPDATE_DIR, { recursive: true });
    fs.writeFileSync(path.join(UPDATE_DIR, 'index.html.tmp'), html); renameRetry(path.join(UPDATE_DIR, 'index.html.tmp'), path.join(UPDATE_DIR, 'index.html'));
    fs.writeFileSync(path.join(UPDATE_DIR, 'version.json'), JSON.stringify(v));
    UPDATE.checked = true; UPDATE.using = 'updated'; UPDATE.fresh = true;
    logErr('[update] 已下载新版', v.build, '来自', UPDATE.source);
  } catch (e) { UPDATE.checked = true; UPDATE.why = String(e && e.message || e).slice(0, 200); }
}
// 开着游戏也每两小时看一次有没有新版
setInterval(() => { checkUpdate().catch(() => {}); }, 2 * 3600e3).unref();
const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

function send(res, code, obj, isJson = true) {
  res.writeHead(code, { 'content-type': isJson ? 'application/json; charset=utf-8' : MIME['.html'] });
  res.end(isJson ? JSON.stringify(obj) : String(obj));
}

async function serveStatic(req, res, urlPath) {
  let rel = urlPath === '/' ? '/index.html' : urlPath;
  if (rel === '/index.html') { const up = updatedPage(); if (up) { try { const data = await fsp.readFile(up); res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-store' }); return res.end(data); } catch { /* 坏了就用自带的 */ } } }
  const file = path.join(PUBLIC, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (!file.startsWith(PUBLIC)) return send(res, 403, { error: 'forbidden' });
  try {
    const data = await fsp.readFile(file);
    const ext = path.extname(file);
    res.writeHead(200, { 'content-type': MIME[ext] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(data);
  } catch {
    res.writeHead(404, { 'content-type': MIME['.html'] });
    res.end('404');
  }
}

async function readBody(req) {
  const chunks = []; let size = 0;
  for await (const c of req) { size += c.length; if (size > 20e6) throw new Error('请求太大'); chunks.push(c); }
  if (!chunks.length) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { return {}; }
}

// —— 一句话开局：建档 + 生成世界要一两分钟，放进后台任务，界面轮询进度 ——
const quickstart = require('./core/quickstart');
const JOBS = new Map();
function startJob(fn) {
  const id = require('crypto').randomBytes(6).toString('hex');
  const job = { id, status: 'running', progress: [], result: null, error: null, at: Date.now() };
  JOBS.set(id, job);
  fn(text => job.progress.push(text))
    .then(r => { job.status = 'done'; job.result = r; })
    .catch(e => { job.status = 'error'; job.error = String(e && e.message || e); console.error('[quick-start]', e); });
  for (const [k, j] of JOBS) if (Date.now() - j.at > 3600e3) JOBS.delete(k);
  return id;
}
// 同一个存档的采纳排队执行：两次采纳同时读写一个档，会互相覆盖
const SAVE_LOCKS = new Map();
function withSaveLock(id, fn) {
  const key = String(id || '');
  const prev = SAVE_LOCKS.get(key) || Promise.resolve();
  const run = prev.catch(() => {}).then(fn);
  SAVE_LOCKS.set(key, run);
  run.finally(() => { if (SAVE_LOCKS.get(key) === run) SAVE_LOCKS.delete(key); }).catch(() => {});
  return run;
}
// 最近一次连 AI 的结果：首页据此显示「已接通」还是「连不上」（以前只要存了 Key 就显示已接通）
const STATUS_FILE = path.join(__dirname, 'data', 'status.json');
function readStatus() { try { return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8')); } catch (_) { return {}; } }
function setStatus(patch) { try { fs.writeFileSync(STATUS_FILE, JSON.stringify({ ...readStatus(), ...patch }), 'utf8'); } catch (_) { /* 忽略 */ } }
/** 用不用博查：填了博查 Key 就用（试搜没通也照用，可能只是网络抖了一下），只有玩家点了「不用博查」才不用 */
async function bochaOn() { const c = await search.loadConfig(); return !!(c.providers && c.providers.bocha && c.providers.bocha.apiKey) && !readStatus().bochaOff; }
function friendlySearch(e, bocha) {
  const s = String(e || '').split(' :: ')[0], who = bocha ? '博查' : '维基百科搜索';
  if (bocha && /401|无效|invalid|unauthor/i.test(s)) return '博查 Key 无效（到 open.bochaai.com 核对，或在首页重新填）';
  if (bocha && /403|余额|balance|insufficient|欠费/i.test(s)) return '博查余额不足（到 open.bochaai.com 充值）';
  if (/429|频繁|rate/i.test(s)) return `搜得太频繁，${who}限流了（过一会儿自动恢复）`;
  if (/未配置|没填/.test(s)) return '还没填博查 Key（首页「联网查证」里填）';
  if (/ENOTFOUND|ECONN|fetch failed|超时|timeout|abort/i.test(s)) return `连不上${who}（网络或代理问题）`;
  return s.slice(0, 120);
}
function recordTest(ok, why) {
  try { fs.writeFileSync(STATUS_FILE, JSON.stringify({ ...readStatus(), lastTest: { ok: !!ok, why: ok ? '' : String(why || '').slice(0, 300), at: Date.now() } }), 'utf8'); } catch (_) { /* 忽略 */ }
}
async function selectedModel() {
  const saved = await adapters.loadAdapterConfig();
  const aid = saved.selected || 'deepseek';
  return adapters.resolveAdapter(aid, saved.configs?.[aid] || {});
}


// 正在写的回合：页面轮询取已写出的部分
const TURN_JOBS = new Map();
const LLM_JOBS = new Map();
let LOOKUP_STATUS = null, WIKI_DOWN_AT = 0;
/** 从还没写完的 JSON 里取出 scene 字段已写出的部分（处理转义） */
function partialScene(text) {
  const t = String(text || '');
  const m = t.match(/"scene"\s*:\s*"/);
  if (!m) return '';
  let out = '', i = m.index + m[0].length;
  for (; i < t.length; i++) {
    const c = t[i];
    if (c === '\\') { const n = t[i + 1]; if (n === undefined) break; out += n === 'n' ? '\n' : n === 't' ? '\t' : n === 'u' ? String.fromCharCode(parseInt(t.slice(i + 2, i + 6), 16) || 32) : n; i += n === 'u' ? 5 : 1; continue; }
    if (c === '"') break;
    out += c;
  }
  return out;
}
async function doTurn(body, onDelta) {
  // 允许调用方关掉自动改写：body.autoRepair = false。
  // 「自己会改」是用户反复抱怨的一点——程序替模型改正文必须可以关闭，
  // 且改过之后必须留痕（autoRepaired / autoRepairReason / originalScene）。
  let r;
  try { r = await engine.runTurn({ ...(body || {}), onDelta }); recordTest(true); }
  catch (e) { if (/连不上|Key|HTTP 4\d\d|HTTP 5\d\d|余额|型号/.test(String(e.message || e))) recordTest(false, e.message); throw e; }
  // 把这一轮的草稿记进存档：刷新页面、关掉浏览器再开，草稿还在，不用重新生成
  try {
    if (r && r.draft && String(r.draft.scene || '').trim()) {
      await withSaveLock(body.saveId, async () => {
        const st = await engine.loadState(body.saveId);
        st.pendingDraft = {
          draft: r.draft, input: body.input || '', confirmedThreads: body.confirmedThreads || [],
          adapterId: r.adapterId, plan: r.plan, factCheck: r.factCheck, searches: r.searches, at: Date.now(),
        };
        await engine.writeState(st);
      });
    }
  } catch (_) { /* 记不上不影响本轮 */ }
  // 若适配器掉到了本地骨架，正文会是占位符——必须明确告知，
  // 否则用户只看到「AI 没反馈内容」，完全查不出原因。
  const scene = String((r && r.draft && r.draft.scene) || '');
  if (/骨架输出/.test(scene)) {
    return {
      ...r,
      placeholder: true,
      why: '当前未接入叙事框架：模型适配器不可用（多半是 Key 未配置或未选定）。请到「模型设置」里选定适配器并填好 API Key，再用本回合重试。',
    };
  }
  return r;
}

const routes = {
  /* ---- 一句话开局 ---- */
  async 'POST /api/quick-start'(body) {
    const text = String((body || {}).text || '');
    const job = startJob(async progress => {
      const pack = (await engine.listRulepacks())[0];
      const full = await engine.loadPack(pack.id);
      const { adapter, config } = await selectedModel();
      if (!adapter || adapter.id === 'skeleton') throw new Error('还没接上模型：请先在首页粘贴 DeepSeek 的 Key');
      progress('读懂你的意思……');
      const callModel = async (system, prompt) => (await adapter.call({ system, prompt, temperature: 0.3, maxTokens: 1500 }, config)).text;
      const spec = await quickstart.parse(full, text, callModel);
      progress(`定下：${spec.era.yearLabel || spec.era.gregorianYear + '年'} · ${spec.location.full || spec.era.polity || ''} · ${spec.protagonist.name || spec.protagonist.role}`);
      progress('建档……');
      let state = await engine.createCustomSave(spec);
      progress('查史、生成这个世界（真实人物、地理、当年大事），一般要一两分钟……');
      try { const w = await engine.seedWorld({ saveId: state.meta.id }); state = w.state || state; }
      catch (e) { progress('生成世界时出了点问题（不影响开局，可稍后在高级面板里重新生成）：' + String(e.message || e).slice(0, 120)); }
      // 世界生成失败或没拿到当年史事时，按历史底盘就地重算一次，免得新档一进去就弹「旧版模板」提示
      try { await engine.replotSave({ saveId: state.meta.id }); } catch { /* 重算失败不挡开局 */ }
      progress('好了。');
      return { saveId: state.meta.id };
    });
    return { ok: true, job };
  },
  /* 农历推算：界面上「采纳后到哪天」的预览与引擎同一口径 */
  async 'POST /api/calendar/add'(body) {
    const b = body || {};
    const r = require('./core/lunar').addDays({ y: Number(b.y) || 0, m: Number(b.m) || 1, d: Number(b.d) || 1, leap: !!b.leap }, Math.max(0, Math.min(3650, Number(b.n) || 0)));
    return { ok: true, ...r, label: require('./core/lunar').label(r.m, r.d, r.leap) };
  },
  async 'POST /api/quick-start/job'(body) {
    const j = JOBS.get((body || {}).job);
    if (!j) return { ok: false, why: '任务不存在或已过期' };
    return { ok: true, status: j.status, progress: j.progress, error: j.error, saveId: j.result && j.result.saveId };
  },
  /* ---- 首页一步填 Key：DeepSeek（必填）+ 博查（可选），合并保存，不会冲掉已有的 Key ---- */
  async 'POST /api/quick-key'(body) {
    const b = body || {};
    // 粘贴时带进来的空格、换行一律去掉；有中文、全角字符的不是 Key（多半复制错了）
    // 全角转半角，去掉空格、换行、看不见的字符、两头的引号、「Bearer」前缀
    const clean = v => String(v || '').replace(/[\uFF01-\uFF5E]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)).replace(/[\s\u200B-\u200D\uFEFF\u3000]+/g, '').replace(/^["'“”‘’「」]+|["'“”‘’「」]+$/g, '').replace(/^Bearer/i, '').replace(/^(api[_-]?key|key)[:：=]/i, '');
    const k = clean(b.apiKey);
    const bk = clean(b.bochaKey);
    if (b.bochaOn) { setStatus({ bochaOff: false }); const r = await search.search('苏轼', { provider: 'bocha', noCache: true }); if (!r.error) await search.saveConfig({ provider: 'bocha' }); return { ok: true, bochaOff: false, bocha: r.error ? { ok: false, why: friendlySearch(r.error, true) } : { ok: true, count: (r.results || []).length } }; }
    if (b.noBocha) { setStatus({ bochaOff: true }); await search.saveConfig({ provider: 'wikipedia' }); return { ok: true, saved: { bocha: false }, bochaOff: true }; }
    if (b.bochaKey) setStatus({ bochaOff: false });
    if (k && !/^[\x21-\x7e]+$/.test(k)) return { ok: false, why: 'DeepSeek Key 里有中文或全角字符，请从 DeepSeek 网页上重新复制（以 sk- 开头的一串英文数字）' };
    if (bk && !/^[\x21-\x7e]+$/.test(bk)) return { ok: false, why: '博查 Key 里有中文或全角字符，请从博查网页上重新复制' };
    if (!k && !bk && !b.model) return { ok: false, why: '没有填任何 Key' };
    const saved = (await adapters.loadAdapterConfig()).configs?.deepseek || {};
    // 型号：玩家选了就用；没选沿用已存的；已下线的 deepseek-chat / deepseek-reasoner 换成 V4 Pro
    let model = String(b.model || saved.model || '').trim();
    if (!model || /^deepseek-(chat|reasoner)$/.test(model)) model = 'deepseek-v4-pro';
    const patch = { model, baseUrl: saved.baseUrl || 'https://api.deepseek.com' };
    if (k) patch.apiKey = k;
    if (k || b.model) await adapters.saveAdapterConfig({ selected: 'deepseek', configs: { deepseek: patch } });
    if (bk) await search.saveConfig({ providers: { bocha: { apiKey: bk, count: 8 } } });   // 先存 Key，试搜通了才改用博查：Key 不对时照旧用维基，不至于每回都搜不到
    const out = { ok: true, saved: { deepseek: !!k, model, bocha: !!bk } };
    // 试连与保存分开：试连失败也不影响已保存的 Key，只如实告诉玩家原因
    if (k || b.model) {
      const cfg = (await adapters.loadAdapterConfig()).configs.deepseek;
      try {
        const t = await adapters.testAdapter('deepseek', cfg);
        out.test = { ok: true, ms: t.ms, model: ((await adapters.loadAdapterConfig()).configs.deepseek || {}).model };
        recordTest(true);
      } catch (e) {
        let why = String(e.message || e).split(' :: ')[0].slice(0, 300);
        if (/TimeoutError|aborted due to timeout|operation was aborted|超时/i.test(why) && !/^连不上/.test(why)) why = 'DeepSeek 一分钟内没回话（多半是服务繁忙，不是 Key 的问题）。Key 已存好，可以直接开始玩；还不行就在「换 Key」的型号框里填 deepseek-v4-flash 试试';
        else if (!/^连不上/.test(why) && /fetch failed|ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|timeout|aborted/i.test(why)) why += '（连不上 api.deepseek.com：请检查网络、代理或防火墙）';
        out.test = { ok: false, why };
        recordTest(false, why);
      }
    }
    if (bk) {
      const r = await search.search('苏轼', { provider: 'bocha', noCache: true });
      if (!r.error) await search.saveConfig({ provider: 'bocha' });
      out.bocha = r.error ? { ok: false, why: friendlySearch(r.error, true) } : { ok: true, count: (r.results || []).length };
    }
    return out;
  },
  /* 浏览器直连 DeepSeek 用：本机游戏程序（node.exe）被防火墙、杀毒软件、代理拦住时，页面改由浏览器自己连 DeepSeek，要用存着的 Key。
     只答本机游戏页面（别的网站来的请求在入口就被拒了），POST + JSON 也挡住了跨站的简单请求 */
  async 'POST /api/dskey'() {
    const c = (await adapters.loadAdapterConfig()).configs?.deepseek || {};
    return c.apiKey ? { ok: true, key: c.apiKey, model: c.model || 'deepseek-v4-pro' } : { ok: false, why: '还没存 Key' };
  },
  /* 列出这个 Key 能用的模型型号（DeepSeek /models） */
  async 'POST /api/models'(body) {
    const b = body || {};
    const aid = b.adapterId || 'deepseek';
    const saved = (await adapters.loadAdapterConfig()).configs?.[aid] || {};
    const cfg = { baseUrl: aid === 'deepseek' ? 'https://api.deepseek.com' : undefined, ...saved };
    for (const [kk, vv] of Object.entries(b.config || {})) if (vv !== '' && vv != null) cfg[kk] = vv;
    if (b.config && b.config.baseUrl && !b.config.apiKey && saved.apiKey && b.config.baseUrl !== saved.baseUrl) return { ok: false, why: '换了接口地址，要连同 Key 一起填' };   // 不把存着的 Key 发到别的地址
    if (!cfg.apiKey) return { ok: false, why: '先填 Key 才能列出型号' };
    const models = await adapters.listModels(cfg);
    return { ok: true, models, current: cfg.model || '' };
  },
  async 'GET /api/quick-status'() {
    const saved = await adapters.loadAdapterConfig();
    const aid = saved.selected || 'deepseek';
    const c = (saved.configs || {})[aid] || {};
    const scfg = await search.loadConfig();
    const bochaKey = (scfg.providers && scfg.providers.bocha && scfg.providers.bocha.apiKey) || '';
    return {
      ok: true, model: aid, modelName: c.model || (aid === 'deepseek' ? 'deepseek-v4-pro' : ''),
      hasKey: !!c.apiKey || ['ollama', 'skeleton', 'mock'].includes(aid),
      keyTail: c.apiKey ? String(c.apiKey).slice(-4) : '',
      search: scfg.provider, hasBocha: !!bochaKey && !readStatus().bochaOff, bochaSaved: !!bochaKey, bochaOff: !!readStatus().bochaOff, bochaTail: bochaKey ? String(bochaKey).slice(-4) : '', bochaTestOk: scfg.provider === 'bocha', lookup: LOOKUP_STATUS,
      lastTest: readStatus().lastTest || null,
    };
  },
  'GET /api/health': async () => ({ ok: true, node: process.version }),
  /* CBDB（哈佛中国历代人物传记资料库）代查：页面直连常被跨域拦下、国内也慢；这里查一次存本机 */
  'GET /api/cbdb': async (_b, q) => {
    const name = String(q.get('name') || '').slice(0, 12); if (!name) return { ok: false, why: '没给名字' };
    const dir = path.join(ROOT, 'data', 'cache', 'cbdb'); fs.mkdirSync(dir, { recursive: true });
    const cf = path.join(dir, require('crypto').createHash('md5').update(name).digest('hex') + '.json');
    try { return { ok: true, data: JSON.parse(fs.readFileSync(cf, 'utf8')) }; } catch (_) { /* 没缓存 */ }
    try {
      const r = await require('./core/net').fetchX('https://cbdb.fas.harvard.edu/cbdbapi/person.php?o=json&name=' + encodeURIComponent(name), { signal: AbortSignal.timeout(15000) });
      if (!r.ok) return { ok: false, why: 'HTTP ' + r.status };
      const data = await r.json(); try { fs.writeFileSync(cf, JSON.stringify(data)); } catch (_) { /* 存不下就算了 */ } return { ok: true, data };
    } catch (e) { return { ok: false, why: String(e && e.message || e).slice(0, 120) }; }
  },
  /* 问题报告用：版本、更新、最近出过的错、模型与搜索的状态（不含 Key） */
  'GET /api/diag': async () => {
    const c = await adapters.loadAdapterConfig(), d = (c.configs || {})[c.selected || 'deepseek'] || {}, sc = await search.loadConfig();
    const jobs = [...LLM_JOBS.values()];
    return { ok: true, page: readVer(PUBLIC), updatePage: readVer(UPDATE_DIR), update: UPDATE, api: API_VER, node: process.version, platform: process.platform + ' ' + require('os').release(), uptimeMin: Math.round(process.uptime() / 60), memMB: Math.round(process.memoryUsage().rss / 1048576),
      model: { adapter: c.selected, model: d.model, baseUrl: d.baseUrl, thinking: d.thinking, hasKey: !!d.apiKey }, lastRequest: adapters.LAST_REQ, search: { provider: sc.provider }, lookup: LOOKUP_STATUS, lastTest: readStatus().lastTest || null,
      jobs: { running: jobs.filter(j => j.status === 'running').length, error: jobs.filter(j => j.status === 'error').slice(-8).map(j => j.error) }, errors: ERR_RING.slice(-40), proxy: !!(process.env.HTTPS_PROXY || process.env.https_proxy) };
  },
  /* 网络诊断：逐个试连 DeepSeek / 博查 / 维基，告诉玩家卡在哪 */
  'GET /api/netcheck': async () => require('./core/net').check(),
  'GET /api/update': async () => ({ ok: true, api: API_VER, ...UPDATE }),
  async 'POST /api/update/check'() { UPDATE.checked = false; await checkUpdate(true); return { ok: true, api: API_VER, ...UPDATE }; },
  'GET /api/rulepacks': async () => engine.listRulepacks(),
  'GET /api/saves': async () => engine.listSaves(),
  /* 个人面板：名位、职权、钱财、兵马、家人、人际、近来变化 */
  async 'POST /api/profile/rebuild'(body) { return engine.rebuildProtagonistDossier(body || {}); },
  async 'POST /api/profile'(body) { return require('./core/profile').buildProfile(await engine.loadState((body || {}).saveId)); },
  'GET /api/saves/bad': async () => ({ ok: true, bad: await engine.findBadSaves() }),
  async 'POST /api/saves/cleanup'(body) { return engine.cleanupBadSaves((body || {}).ids); },
  'GET /api/adapters': async () => adapters.listAdapters(),

  async 'POST /api/save'(body) {
    return engine.createSave(body);
  },
  async 'POST /api/save/custom'(body) {
    return engine.createCustomSave(body);
  },
  async 'POST /api/save/delete'(body) {
    return engine.deleteSave(body.saveId);
  },
  async 'POST /api/state'(body) {
    return engine.loadState(body.saveId);
  },
  async 'POST /api/turn'(body) { return doTurn(body || {}); },
  /* 边写边看：开一个后台任务写这一回合，页面每秒来取一次已写出的正文 */
  async 'POST /api/turn-start'(body) {
    const job = { status: 'running', partial: '', result: null, error: null, at: Date.now(), saveId: (body || {}).saveId, input: (body || {}).input || '', threads: (body || {}).confirmedThreads || [] };
    const id = 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    TURN_JOBS.set(id, job);
    doTurn(body || {}, text => { job.partial = partialScene(text); })
      .then(r => { job.status = 'done'; job.result = r; })
      .catch(e => { job.status = 'error'; job.error = String(e && e.message || e); });
    for (const [k, j] of TURN_JOBS) if (Date.now() - j.at > 3600e3) TURN_JOBS.delete(k);
    return { ok: true, job: id };
  },
  /* 刷新页面时：这一局有没有还在写的一段（有就接着看，不丢） */
  async 'POST /api/turn-running'(body) {
    const sid = (body || {}).saveId;
    for (const [k, j] of TURN_JOBS) if (j.saveId === sid && j.status === 'running') return { ok: true, job: k, input: j.input, threads: j.threads, partial: j.partial };
    return { ok: true, job: null };
  },
  async 'POST /api/turn-job'(body) {
    const j = TURN_JOBS.get((body || {}).job);
    if (!j) return { ok: false, why: '任务不存在或已过期' };
    if (j.status === 'done') { TURN_JOBS.delete(body.job); return { ok: true, status: 'done', result: j.result }; }
    if (j.status === 'error') { TURN_JOBS.delete(body.job); return { ok: false, status: 'error', why: j.error }; }
    return { ok: true, status: 'running', partial: j.partial };
  },
  /* 玩家在界面上改了草稿正文：存回记着的草稿 */
  /* ===== 聊天式玩法（public/index.html）：调 AI 与存档 ===== */
  async 'POST /api/llm-start'(body) {
    const b = body || {};
    const msgs = (Array.isArray(b.messages) ? b.messages : [{ role: 'user', content: String(b.prompt || '') }])
      .filter(m => m && (m.role === 'user' || m.role === 'assistant') && m.content).map(m => ({ role: m.role, content: String(m.content).slice(0, 200000) }));
    if (!msgs.length) return { ok: false, why: '没有要发的内容' };
    const id = 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const job = { status: 'running', text: '', error: null, at: Date.now() };
    LLM_JOBS.set(id, job);
    engine.chatCall({ messages: msgs, system: String(b.system || '').slice(0, 60000), maxTokens: Math.min(16000, Number(b.maxTokens) || 8000), json: b.json !== false, temperature: Number.isFinite(Number(b.temperature)) ? Number(b.temperature) : 0.8, thinking: b.thinking === true, fast: b.fast === true, onDelta: t => { if (job.status === 'cancelled') { const e = new Error('玩家停下了'); e.stopStream = true; throw e; } if (job.status === 'running') job.text = String(t || ''); } })
      .then(r => { if (job.status === 'running') { job.status = 'done'; job.text = r.text; job.truncated = r.truncated; recordTest(true); } })
      .catch(e => { if (job.status === 'running') { job.status = 'error'; job.error = String(e && e.message || e).slice(0, 400); recordTest(false, job.error); logErr('[llm]', job.error); } });
    for (const [k, j] of LLM_JOBS) if (Date.now() - j.at > 3600e3) LLM_JOBS.delete(k);
    return { ok: true, job: id };
  },
  /* 每回合联网查证：并行搜（最多三路同时），各取靠谱的前几条；
     去掉小说、演义、影视、游戏的结果（免得把虚构当史实），百科、正史、学术站排前面；
     博查出错时给出明白的原因（Key 无效、余额不足、太频繁），状态记下来给页面显示 */
  async 'POST /api/lookup'(body) {
    const both = !!(body || {}).both;
    const qs = (Array.isArray((body || {}).queries) ? body.queries : []).map(q => String(q || '').trim().slice(0, 60)).filter(Boolean).slice(0, 10);
    if (!qs.length) return { ok: true, results: [] };
    const cfg = await search.loadConfig();
    const isBocha = await bochaOn();
    const FICTION = /小说|演义|游戏|手游|攻略|电视剧|剧情|剧集|影视|动漫|抖音|快手|视频|bilibili|B站|起点|晋江|番茄|同人|穿越|全文阅读|章节|第[一二三四五六七八九十百\d]+章/i;
    const GOOD = /baike\.baidu|wikipedia|baike\.sogou|ctext|guoxue|gushiwen|zhonghuadiancang|shidianguji|cnki|cass|historychina|zgdsw|dpm\.org|ndlib|chinaknowledge|douban\.com\/note|zhihu/;
    // 一整批最多等 25 秒：每条最多 12 秒，到点还没回的就算没搜到，不让玩家干等
    const DEADLINE = Date.now() + 25000;
    // 混合查：先查维基，维基查得到就用；查不到（或维基连不上）再查博查。维基连不上时五分钟内直接走博查
    const race = (p, ms) => Promise.race([p.catch(e => ({ results: [], error: String(e && e.message || e) })), new Promise(r => setTimeout(() => r({ results: [], error: `超时（${Math.round(ms / 1000)} 秒没回）` }), ms))]);
    const once = async q => {
      const left = () => Math.max(1500, DEADLINE - Date.now());
      // 第一层：维基百科，查不到再查维基文库（史书原文）；第二层：博查。both（查官员、真人这种要卡准年份的）两层都查，博查放前面
      const netDown = e => /超时|ENOTFOUND|ECONN|fetch failed|timeout|abort|socket|连不上/i.test(String(e || ''));
      let w = { results: [] };
      // 有博查就和维基同时查（不再等维基超时了才查博查）：两边都有的，维基在前、博查跟上，矛盾时写的人照博查
      const bP = isBocha ? race(search.search(q, { provider: 'bocha', noFallback: true }), Math.min(12000, left())) : null;
      if (Date.now() - WIKI_DOWN_AT > 300000) {
        w = await race(search.search(q, { provider: 'wikipedia' }), Math.min(6000, left()));
        if (!(w.results || []).length && !netDown(w.error)) { const ws = await race(search.search(q, { provider: 'wikisource' }), Math.min(5000, left())); if ((ws.results || []).length) w = { ...ws, provider: 'wikisource' }; }
        if (netDown(w.error)) WIKI_DOWN_AT = Date.now();
      }
      const wOk = (w.results || []).length;
      if (!isBocha) return { query: q, ...w, provider: w.provider || 'wikipedia' };
      const b = await bP;
      if (wOk && (b.results || []).length) return { query: q, results: both ? [...b.results.slice(0, 3), ...w.results.slice(0, 2)] : [...w.results.slice(0, 2), ...b.results.slice(0, 3)], provider: 'mixed' };
      return (b.results || []).length || !wOk ? { query: q, ...b, provider: 'bocha' } : { query: q, ...w, provider: w.provider || 'wikipedia' };
    };
    // 没搜到（不是出错）：把查询改短再搜，维基这类搜索框只认简单的词（「扬州府 乾隆二十二年 知府」→「扬州府 知府」→「扬州府」）
    const one = async q => {
      let r = await once(q);
      const toks = q.split(/\s+/).filter(Boolean);
      const tries = toks.length > 2 ? [toks[0] + ' ' + toks[toks.length - 1], toks[0]] : toks.length === 2 ? [toks[0]] : [];
      for (const q2 of tries.slice(0, 1)) { if ((r.results || []).length || r.error || Date.now() > DEADLINE - 3000) break; r = await once(q2); }
      return r;
    };
    const rs = [];
    const netErr = r => !(r.results || []).length && /超时|ENOTFOUND|ECONN|fetch failed|timeout|abort|socket|network/i.test(String(r.error || ''));
    // 一起搜（最多五路同时），不再三条三条地排队
    for (let i = 0; i < qs.length; i += 5) {
      if (i > 0 && rs.length && rs.every(netErr)) { for (const q of qs.slice(i)) rs.push({ query: q, results: [], error: rs[0].error }); break; }
      if (Date.now() > DEADLINE) { for (const q of qs.slice(i)) rs.push({ query: q, results: [], error: '这一批搜索时间到了' }); break; }
      rs.push(...await Promise.all(qs.slice(i, i + 5).map(one)));
    }
    const friendly = e => friendlySearch(e, isBocha);
    let okN = 0, lastErr = '';
    const results = rs.map((r, i) => {
      const seen = new Set();
      const items = (r.results || []).filter(h => h && h.title && !FICTION.test(h.title + ' ' + (h.url || '')) && !/古装剧|电视剧|连续剧|网剧|主演|执导|執導|编剧|首播|收视/.test(String(h.snippet || '').slice(0, 120)))
        .filter(h => { const k = String(h.url || h.title).replace(/[?#].*$/, ''); if (seen.has(k)) return false; seen.add(k); return true; })
        .sort((a, b) => (GOOD.test(b.url || '') ? 1 : 0) - (GOOD.test(a.url || '') ? 1 : 0))
        .slice(0, 4).map(h => ({ title: String(h.title || '').slice(0, 60), url: String(h.url || ''), snippet: String(h.snippet || '').replace(/\s+/g, ' ').slice(0, 600) }));
      if (items.length) okN++; else if (r.error) lastErr = friendly(r.error);
      return { q: qs[i], provider: r.provider || cfg.provider, error: r.error ? friendly(r.error) : '', items };
    });
    LOOKUP_STATUS = { at: Date.now(), provider: cfg.provider, ok: okN > 0 || !lastErr, okN, total: qs.length, err: okN ? '' : lastErr };
    const used = [...new Set(results.filter(r => r.items.length).map(r => r.provider))];
    return { ok: true, provider: used.length > 1 ? 'mixed' : used[0] || cfg.provider, status: LOOKUP_STATUS, results };
  },
  async 'POST /api/llm-job'(body) {
    const j = LLM_JOBS.get((body || {}).job);
    if (!j) return { ok: false, why: '任务不存在或已过期' };
    // 写完的任务留一阵：页面刷新或网络抖一下再来取，结果还在
    return { ok: true, status: j.status, text: j.text, error: j.error, truncated: !!j.truncated };
  },
  // 启动器再开一次时先请旧服务自己退出（连同看着它的守护进程），免得守护进程一秒后又把它拉起来抢端口
  async 'POST /api/quit'() {
    setTimeout(() => { const pp = Number(process.env.RPG_PARENT_PID); if (pp && pp !== process.pid) { try { process.kill(pp); } catch (_) { /* 父进程已不在 */ } } process.exit(0); }, 200);
    return { ok: true };
  },
  async 'POST /api/llm-stop'(body) { const j = LLM_JOBS.get((body || {}).job); if (j) j.status = 'cancelled'; return { ok: true }; },
  /* 联网自检：用真实请求把写剧情、搜索、维基、历史地名库各试一遍，告诉玩家哪个通、拿到了什么 */
  'GET /api/selftest'() { if (!SELFTEST_RUN) SELFTEST_RUN = routes['GET /api/selftest0']().finally(() => { SELFTEST_RUN = null; }); return SELFTEST_RUN; },
  async 'GET /api/selftest0'() {
    const out = [];
    const time = async (name, f) => { const t0 = Date.now(); try { const r = await f(); out.push({ name, ok: !!r.ok, detail: String(r.detail || '').slice(0, 160), ms: Date.now() - t0 }); } catch (e) { out.push({ name, ok: false, detail: String(e && e.message || e).slice(0, 160), ms: Date.now() - t0 }); } };
    const cfg = await search.loadConfig();
    await Promise.all([
      time('DeepSeek 写剧情', async () => { const r = await engine.chatCall({ messages: [{ role: 'user', content: '只回答两个字：正常' }], maxTokens: 20, temperature: 0, json: false }); return { ok: /\S/.test(r.text), detail: '回答：' + r.text.trim().slice(0, 20) }; }),
      time(`搜索（${cfg.provider === 'bocha' ? '博查' : cfg.provider === 'wikipedia' ? '维基百科搜索' : cfg.provider}）`, async () => { const r = await routes['POST /api/lookup']({ queries: ['安禄山 范阳'] }); const x = (r.results || [])[0] || {}; return { ok: (x.items || []).length > 0, detail: (x.items || []).length ? `搜「安禄山 范阳」得 ${(x.items || []).length} 条：${x.items[0].title}` : (x.error || '一条都没搜到') }; }),
      time('维基百科读条目', async () => { const r = await routes['POST /api/wiki']({ queries: ['安史之乱'] }); const x = (r.results || [])[0] || {}; return { ok: !!x.text, detail: x.text ? `读到《${x.title}》${x.text.length} 字：${x.text.slice(0, 40)}…` : (x.error || '没读到') }; }),
      time('历史地名库（CHGIS）', async () => { const r = await routes['GET /api/tgaz'](null, new URLSearchParams({ n: '扬州', yr: '1757' })); return { ok: r.ok && (r.results || []).length > 0, detail: r.ok ? `查「扬州」1757年得 ${(r.results || []).length} 处${(r.results || [])[0] ? '：' + r.results[0].name + '（属' + (r.results[0].parent || '?') + '）' : ''}；来自 ${r.base || ''}` : r.why }; }),
    ]);
    return { ok: true, results: out };
  },
  /* 深读维基百科：每条查询找最相关的一篇中文条目，取正文（简体），给写戏与核实当材料；查过的存本机 */
  async 'POST /api/wiki'(body) {
    const qs = (Array.isArray((body || {}).queries) ? body.queries : []).map(q => String(q || '').trim().slice(0, 40)).filter(Boolean).slice(0, 6);
    const dir = path.join(ROOT, 'data', 'cache', 'wiki'); fs.mkdirSync(dir, { recursive: true });
    const one = async q => {
      const cf = path.join(dir, require('crypto').createHash('md5').update(q).digest('hex') + '.json');
      try { return JSON.parse(fs.readFileSync(cf, 'utf8')); } catch (_) { /* 没缓存 */ }
      const u = (process.env.WIKI_BASE || 'https://zh.wikipedia.org') + '/w/api.php?' + new URLSearchParams({ action: 'query', format: 'json', generator: 'search', gsrsearch: q, gsrlimit: '3', prop: 'extracts|info|pageprops', ppprop: 'disambiguation', inprop: 'url', explaintext: '1', exsectionformat: 'plain', exchars: '4000', variant: 'zh-cn', converttitles: '1', origin: '*' });
      try {
        const r = await require('./core/net').fetchX(u, { headers: { 'User-Agent': 'HistoryRPG/1.0 (game)' }, signal: AbortSignal.timeout(10000) });
        if (!r.ok) return { q, error: 'HTTP ' + r.status };
        const d = await r.json();
        // 取搜索排第一、又不是消歧义页的那篇（消歧义页只是一串同名条目，不是这个人这件事）
        const pg = Object.values((d.query || {}).pages || {}).sort((a, b) => (a.index || 0) - (b.index || 0)).find(p => p && p.extract && !(p.pageprops && 'disambiguation' in p.pageprops));
        if (!pg || !pg.extract) return { q, error: '没有条目' };
        const FICTION = /小说|游戏|电视剧|动画|漫画|电影/;
        if (FICTION.test(pg.title)) return { q, error: '只找到虚构作品的条目' };
        const out = { q, title: pg.title, url: pg.fullurl || ('https://zh.wikipedia.org/wiki/' + encodeURIComponent(pg.title)), text: String(pg.extract).replace(/\n{2,}/g, '\n').slice(0, 4000) };
        fs.writeFileSync(cf, JSON.stringify(out));
        return out;
      } catch (e) { return { q, error: String(e && e.message || e).slice(0, 100) }; }
    };
    const results = await Promise.all(qs.map(one));
    return { ok: true, results };
  },
  /* 中国历史地名（CHGIS 时空地名辞典 TGaz，复旦镜像优先、哈佛兜底）：按名字、年份、上级查县、州府、郡的位置与隶属；查过的存本机 */
  'GET /api/tgaz': async (_b, q) => {
    const n = String(q.get('n') || '').slice(0, 20), yr = String(q.get('yr') || '').replace(/[^\d-]/g, ''), ipar = String(q.get('ipar') || '').slice(0, 20), ftyp = String(q.get('ftyp') || '').slice(0, 10);
    if (!n && !ipar) return { ok: false, why: '没给地名' };
    const key = require('crypto').createHash('md5').update([n, yr, ipar, ftyp].join('|')).digest('hex');
    const dir = path.join(ROOT, 'data', 'cache', 'tgaz'); fs.mkdirSync(dir, { recursive: true });
    const cf = path.join(dir, key + '.json');
    try { return JSON.parse(fs.readFileSync(cf, 'utf8')); } catch (_) { /* 没缓存 */ }
    const params = new URLSearchParams({ fmt: 'json' }); if (n) params.set('n', n); if (yr) params.set('yr', yr); if (ipar) params.set('ipar', ipar); if (ftyp) params.set('ftyp', ftyp);
    const bases = (process.env.TGAZ_BASE ? [process.env.TGAZ_BASE] : []).concat(['https://tgaz.fudan.edu.cn', 'http://tgaz.fudan.edu.cn', 'https://maps.cga.harvard.edu']);
    let lastErr = '';
    for (const b of bases) {
      try {
        const r = await require('./core/net').fetchX(`${b}/tgaz/placename?${params}`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(12000) });
        if (!r.ok) { lastErr = 'HTTP ' + r.status; continue; }
        const d = await r.json();
        const yrs = s => (String(s || '').match(/-?\d+/g) || []).map(Number);
        const results = (d.placenames || []).map(x => {
          const xy = String(x['xy coordinates'] || '').split(',').map(v => parseFloat(v));
          const ys = yrs(x.years);
          return { id: x.sys_id, name: x.name, type: x['feature type'] || '', parent: x['parent name'] || '', parentId: x['parent sys_id'] || '', from: ys[0] ?? null, to: ys[1] ?? ys[0] ?? null, lon: xy[0] || null, lat: xy[1] || null };
        });
        const out = { ok: true, base: b, total: Number(d['count of total results'] || results.length), results };
        fs.writeFileSync(cf, JSON.stringify(out));
        return out;
      } catch (e) { lastErr = String(e && e.message || e).slice(0, 120); }
    }
    return { ok: false, why: '连不上复旦/哈佛的历史地名库：' + lastErr };
  },
  /* 联网自建的史料包（没有内置史料的年代，游戏边玩边查边建）：存在本机，各存档共用 */
  'GET /api/hpacks': async () => {
    const dir = path.join(ROOT, 'data', 'histpacks');
    let files = []; try { files = fs.readdirSync(dir).filter(f => /^[\w\-]+\.json$/.test(f)); } catch (_) { files = []; }
    const packs = [];
    for (const f of files) { try { packs.push(JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))); } catch (_) { /* 坏文件跳过 */ } }
    return { ok: true, packs };
  },
  async 'POST /api/hpack'(body) {
    const pk = (body || {}).pack;
    if (!pk || !/^[\w\-]+$/.test(String(pk.id || '')) || !Array.isArray(pk.range)) return { ok: false, why: '格式不对' };
    const dir = path.join(ROOT, 'data', 'histpacks'); fs.mkdirSync(dir, { recursive: true });
    const tmp = path.join(dir, pk.id + '.json.tmp');
    fs.writeFileSync(tmp, JSON.stringify(pk)); renameRetry(tmp, path.join(dir, pk.id + '.json'));
    return { ok: true };
  },
  'GET /api/wsaves': async () => {
    const dir = path.join(ROOT, 'data', 'websaves');
    let files = []; try { files = fs.readdirSync(dir).filter(f => /^[a-z0-9]+\.json$/i.test(f)); } catch (_) { files = []; }
    const list = [];
    for (const f of files) { try { const v = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); list.push({ id: v.id, title: v.title, sub: v.sub, updatedAt: v.updatedAt }); } catch (_) { /* 坏文件跳过 */ } }
    return { ok: true, saves: list };
  },
  async 'POST /api/wsave'(body) {
    const s = (body || {}).save;
    if (!s || !/^[a-z0-9]+$/i.test(String(s.id || ''))) return { ok: false, why: '存档格式不对' };
    const dir = path.join(ROOT, 'data', 'websaves'); fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, s.id + '.json');
    fs.writeFileSync(file + '.tmp', JSON.stringify(s)); renameRetry(file + '.tmp', file);   // 先写临时文件再改名：写到一半断电也不会坏档
    return { ok: true };
  },
  async 'POST /api/wload'(body) {
    const id = String((body || {}).id || '');
    if (!/^[a-z0-9]+$/i.test(id)) return { ok: false, why: '没有这个存档' };
    try { return { ok: true, save: JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'websaves', id + '.json'), 'utf8')) }; } catch (_) { return { ok: false, why: '没有这个存档' }; }
  },
  async 'POST /api/wdel'(body) {
    const id = String((body || {}).id || '');
    if (!/^[a-z0-9]+$/i.test(id)) return { ok: false, why: '没有这个存档' };
    try { fs.unlinkSync(path.join(ROOT, 'data', 'websaves', id + '.json')); } catch (_) { /* 已经没了 */ }
    return { ok: true };
  },
  /* 问人：问一个身边的人，他按立场私心回答并出主意（不过时间） */
  async 'POST /api/ask'(body) {
    const b = body || {};
    const who = String(b.who || '').trim().slice(0, 20);
    const q = String(b.question || '').trim().slice(0, 300) || '这件事你怎么看？该怎么办？';
    if (!who) return { ok: false, why: '先选一个要问的人' };
    const desk = require('./core/desk');
    const st0 = await engine.loadState(b.saveId);
    const { system, prompt } = desk.askPrompt(st0, who, q);
    const text = await engine.quickCall({ system, prompt, temperature: 0.8, maxTokens: 1500 });
    let j = engine.extractJson(text);
    if (j.parseFailed || !j.reply) j = { reply: String(text).replace(/^[\s\S]*?"reply"\s*:\s*"/, '').slice(0, 600), suggestions: [] };
    const rec = { turn: (st0.turn || 0) + 1, who, q, reply: String(j.reply).slice(0, 800), memo: String(j.memo || '').slice(0, 200),
      suggestions: (Array.isArray(j.suggestions) ? j.suggestions : []).filter(x => x && x.text).slice(0, 3).map(x => ({ text: String(x.text).slice(0, 160), risk: String(x.risk || '').slice(0, 4) })) };
    return withSaveLock(b.saveId, async () => {
      const st = await engine.loadState(b.saveId);
      st.consults = (Array.isArray(st.consults) ? st.consults : []).concat([rec]).slice(-30);
      await engine.writeState(st);
      const { memo, ...pub } = rec;   // 他心里的打算不给玩家看
      return { ok: true, consult: pub };
    });
  },
  /* 润色：大白话 → 合乎身份的文书 */
  async 'POST /api/polish'(body) {
    const b = body || {};
    const text = String(b.text || '').trim().slice(0, 1200);
    if (!text) return { ok: false, why: '先写下你的打算' };
    const st = await engine.loadState(b.saveId);
    const { system, prompt } = require('./core/desk').polishPrompt(st, text);
    const out = (await engine.quickCall({ system, prompt, temperature: 0.6, maxTokens: 1200 })).trim();
    return { ok: true, text: out, form: require('./core/desk').polishForm(st) };
  },
  /* 建议簿：收进 / 删掉一条主意 */
  async 'POST /api/advice'(body) {
    const b = body || {};
    return withSaveLock(b.saveId, async () => {
      const st = await engine.loadState(b.saveId);
      let book = Array.isArray(st.adviceBook) ? st.adviceBook : [];
      if (b.remove != null) book = book.filter((_, i) => i !== Number(b.remove));
      else if (b.text) book = book.concat([{ who: String(b.who || '').slice(0, 20), text: String(b.text).slice(0, 200), risk: String(b.risk || '').slice(0, 4), turn: (st.turn || 0) + 1 }]).slice(-30);
      st.adviceBook = book;
      await engine.writeState(st);
      return { ok: true, advice: book };
    });
  },
  async 'POST /api/draft/save'(body) {
    const b = body || {};
    return withSaveLock(b.saveId, async () => {
      const st = await engine.loadState(b.saveId);
      if (!st.pendingDraft || !st.pendingDraft.draft) return { ok: false, why: '没有待接续的草稿' };
      st.pendingDraft.draft.scene = String(b.scene || '').slice(0, 20000);
      st.pendingDraft.edited = true;
      await engine.writeState(st);
      return { ok: true };
    });
  },
  async 'POST /api/apply'(body) {
    const s = await withSaveLock((body || {}).saveId, async () => {
      const out = await engine.applyDraft(body);
      // 采纳了就清掉记着的草稿
      if (out && out.ok !== false) {
        try {
          const st = await engine.loadState(body.saveId);
          if (st.pendingDraft) { delete st.pendingDraft; await engine.writeState(st); }
          if (out.state) delete out.state.pendingDraft;
        } catch (_) { /* 忽略 */ }
      }
      return out;
    });
    // 拒绝采纳时必须原样透出。过去这里一律包成 { ok:true, state }，
    // 于是「过期草稿 / 剧情作弊 / 剧情硬伤」三道拦截在界面上全都显示「成功」——
    // 明明被拦下了，玩家却以为生效了。这是实打实的功能 bug。
    if (s && s.ok === false) return s;
    return { ok: true, state: s };
  },
  async 'POST /api/thread'(body) {
    return engine.updateThread(body);
  },
  async 'POST /api/npc'(body) {
    return engine.updateNpc(body);
  },
  async 'POST /api/identity'(body) {
    return engine.changeIdentity(body);
  },
  /* ---- 纠正记录库 ---- */
  // 任意真实人物自动建档（模型 API + 检索 + 程序校验）；已有档案直接返回
  async 'POST /api/figure/generate'(body) { return engine.generateFigure(body || {}); },
  // GM 规范第九、十章：档案卡 / 速查表 / 人物表（同时写入 历史RPG存档/<存档名>/）
  async 'POST /api/gm-cards'(body) { return engine.getGmCards((body || {}).saveId); },
  // 《设计书》§7.6：玩家一键标记（好看/出戏/错史/无聊）
  async 'POST /api/flag'(body) { return engine.flagTurn(body || {}); },
  // 《设计书》§8.12：统计面板
  async 'POST /api/stats'(body) { return engine.getStats((body || {}).saveId); },
  async 'POST /api/correction'(body) { return engine.addCorrection(body); },
  async 'POST /api/correction/list'(body) { return engine.getCorrections(body.saveId); },
  /* ---- 人判断打勾（由用户填，系统不自评） ---- */
  async 'POST /api/human-check'(body) { return engine.setHumanChecks(body); },
  /* ---- 版本化档案卡 ---- */
  async 'POST /api/cards'(body) { return engine.listCards(body.saveId); },
  async 'POST /api/archive-card'(body) {
    const s = await engine.loadState(body.saveId);
    return { card: engine.archiveCard(s) };
  },
  async 'POST /api/adapter-test'(body) {
    // 未配 Key / 认证失败 / 网络不通，都要如实告诉玩家哪一步不行，
    // 不能把 HTTP 401 的原始堆栈甩到界面上
    try {
      const t = await adapters.testAdapter(body.adapterId, body.config);
      recordTest(true);
      return t;
    } catch (e) {
      const m = String(e && e.message || e);
      recordTest(false, m);
      let hint = '';
      if (/401|Unauthorized|Authentication/i.test(m)) hint = '（API Key 未配置或已失效，请核对后重试）';
      else if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|fetch failed/i.test(m)) hint = '（网络不通，请检查代理或网络后重试）';
      return { ok: false, why: `适配器「${body.adapterId || '?'}」测试失败：${m} ${hint}`.trim() };
    }
  },
  'GET /api/adapter-config': async () => adapters.loadAdapterConfig(),
  async 'POST /api/adapter-config'(body) {
    return adapters.saveAdapterConfig(body);
  },

  /* ---- 检索与事实核查 ---- */
  'GET /api/search/providers': async () => ({
    providers: await search.listProviders(),
    current: await verify.providerStatus(),
  }),
  'GET /api/search/config': async () => search.loadConfig(),
  async 'POST /api/search/config'(body) {
    await search.saveConfig(body.config || {});
    return search.loadConfig();
  },
  async 'POST /api/search/test'(body) {
    const r = await search.search(body.query || '苏轼', { provider: body.provider, noCache: true });
    return { provider: r.provider, tookMs: r.tookMs, error: r.error, count: (r.results || []).length, top: (r.results || [])[0] || null };
  },
  async 'POST /api/verify/npc'(body) { return verify.verifyNpcName(body); },
  async 'POST /api/verify/realperson'(body) { return verify.verifyRealPersonDeep(body); },
  async 'POST /api/verify/candidates'(body) { return verify.findCandidates(body); },
  'GET /api/lore': async () => engine.listLore(),
  async 'POST /api/lore'(body) { return engine.saveLore(body); },
  async 'POST /api/world/update'(body) {
    const s = await engine.loadState(body.saveId);
    if (body.household) s.household = { ...(s.household || {}), ...body.household };
    if (body.geography) s.geography = { ...(s.geography || {}), ...body.geography };
    if (body.anchors) s.anchors = { ...(s.anchors || {}), ...body.anchors };
    await engine.writeState(s);
    return s;
  },
  /* ---- 战阵 ---- */
  'GET /api/battle/catalog': async () => ({ formations: battle.listFormations(), tactics: battle.listTactics() }),
  async 'POST /api/battle/simulate'(body) {
    const A = {
      name: body.ourName || '我军', troops: Number(body.ourTroops) || 1000,
      morale: Number(body.ourMorale), training: Number(body.ourTraining),
      formationId: body.ourFormation, tacticId: body.ourTactic || 'none',
    };
    const B = {
      name: body.enemyName || '敌军', troops: Number(body.enemyTroops) || 1000,
      morale: Number(body.enemyMorale), training: Number(body.enemyTraining),
      formationId: body.enemyFormation || 'fangyuan', tacticId: body.enemyTactic || 'none',
    };
    return battle.resolveBattle(A, B, { terrain: body.terrain, weather: body.weather, seed: body.seed || String(Date.now()) });
  },
  /* ---- 突发事件预览（引擎每轮自行掷，此处供玩家查看本局事件史） ---- */
  async 'POST /api/events/log'(body) {
    const s = await engine.loadState(body.saveId);
    return { eventLog: s.eventLog || [], current: s.currentEvent || null, variety: events.varietyEstimate() };
  },

  /* ---- 时代词汇 ---- */
  'GET /api/era-vocab': async () => ({ count: eraVocab.MAP.length, entries: eraVocab.listModern() }),
  async 'POST /api/era-vocab/translate'(body) {
    return { input: body.text || '', hits: eraVocab.scanModern(body.text || ''), block: eraVocab.renderTranslation(body.text || '') };
  },

  async 'POST /api/world/seed'(body) {
    // 开局自动生成世界：真实历史人物（免费 Wikidata）+ 真实地理检索 + 当时的真实历史地图
    return engine.seedWorld({ saveId: body.saveId, adapterId: body.adapterId });
  },
  async 'POST /api/world/fill'(body) {
    // 让所选叙事框架按史实拟一份家庭/地理，结果标 unverified，由玩家核实后才算数
    const { resolveAdapter, loadAdapterConfig } = require('./adapters/index');
    const saved = await loadAdapterConfig();
    const { adapter, config } = await resolveAdapter(body.adapterId || 'deepseek', saved.configs?.[body.adapterId || 'deepseek'] || {});
    const ask = `你要为一次历史模拟拟资料。时代：${body.era}（公元 ${body.gregorianYear} 年）。地点：${body.place}。主角：${body.name}，${body.role}。
请只用 JSON 回答，不要任何解释文字，格式：
${body.what === 'geography'
        ? '{"地形":"","水系":"","道路驿站":"","距州治":"","邻境":"","物产":"","常发灾异":"","note":"不确定处写「不知」，不要编造"}'
        : '{"clan":"","members":[{"name":"","relation":"","age":0,"status":"在世","role":"","attitude":"","note":""}],"property":{"田":"","宅":"","奴婢":""},"obligations":[""]}'}
要求：所有内容必须与该朝代该地的真实情况相符；人物的家人若是真实历史人物则用真名，若是虚构则取一个该时代合理的姓名并注明。不确定的一律写「不知」。`;
    const r = await adapter.call({ system: '你是历史资料编纂助手。只输出 JSON。', prompt: ask }, config);
    let data = null;
    try {
      let t = String(r.text).trim();
      const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/); if (fence) t = fence[1].trim();
      data = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
    } catch { return { error: '框架返回的不是合法 JSON：' + String(r.text).slice(0, 200) }; }
    return { data, unverified: true };
  },
  /* ---- 世界运行：24 项世界状态 / 经济 / 信息 / NPC 动向 / 分歧 ---- */
  async 'POST /api/world/panel'(body) { return engine.getWorld(body.saveId); },
  async 'POST /api/world/replot'(body) { return engine.replotSave(body || {}); },
  /* ---- 人物长线核实：全名籍体检（不只主角） ---- */
  async 'POST /api/world/figures'(body) { return engine.auditFigures((body || {}).saveId); },
  /* ---- 开局初始化检查（内部审计，与玩家正文分离） ---- */
  async 'POST /api/init/check'(body) { return engine.checkInit((body || {}).saveId, body || {}); },
  /* ---- 行为能力闸门：他此刻能做什么、不能做什么、政务由谁决 ---- */
  async 'POST /api/capability'(body) {
    try {
      const capability = require('./core/capability');
      const state = await engine.loadState((body || {}).saveId);
      const c = capability.capabilityOf(state);
      return { ok: true, ...c, prompt: capability.renderCapability(state) };
    } catch (e) { return { ok: false, why: String(e && e.message || e) }; }
  },
  /* ---- 剧情系统：玩家可见层 / 后台日志（两者分离，不得混） ---- */
  async 'POST /api/plot/list'(body) { return engine.getPlot((body || {}).saveId); },
  async 'POST /api/plot/audit'(body) { return engine.getPlotAudit((body || {}).saveId); },
  async 'POST /api/plot/effect'(body) { return engine.recordPlotEffect(body || {}); },
  /* ---- 档案馆：按 身份/时代/地理 差异化的、带来源/可信度的历史底盘 ----
     档案馆是本局唯一的底盘（state.archive），回合之间联通，不是每回合另起一份。 */
  async 'POST /api/archive'(body) {
    const saveId = (body || {}).saveId;
    try {
      const ctx = await engine.getArchive(saveId);
      // 本局的记事：每回合一条、每十回合一段小结、玩家改写的历史、主角的变动、史事进程——都只属于这一个存档
      const st = await engine.loadState(saveId);
      const mem = (st.memory) || {};
      const chronicle = {
        turns: (mem.turns || []).slice(-400),
        blocks: mem.blocks || [],
        history: (st.divergence && st.divergence.history) || [],
        status: st.statusLog || [],
        figures: (st.figureLog || []).slice(-100),
        files: { archive: require('./core/archive').archiveFile(saveId), cards: require('./core/gmCard').cardDirOf(st.meta) },
      };
      return { ok: true, saveId, archive: ctx, chronicle };
    } catch (e) { return { ok: false, why: String(e && e.message || e) }; }
  },
  /** 随时调阅：支持按板块取（identity/era/factions/persons/geography/numeric/vocab） */
  async 'POST /api/archive/query'(body) {
    const b = body || {};
    try {
      const ctx = await engine.getArchive(b.saveId);
      if (!ctx) return { ok: false, why: '本局尚无档案馆，请先开局（seed）' };
      if (!b.section) return { ok: true, saveId: b.saveId, sections: Object.keys(ctx), archive: ctx };
      const key = String(b.section);
      return { ok: true, saveId: b.saveId, section: key, value: ctx[key] ?? null };
    } catch (e) { return { ok: false, why: String(e && e.message || e) }; }
  },
  /** 删档连带删馆 + 清理孤儿残留 */
  async 'POST /api/archive/sweep'(body) {
    try { return { ok: true, ...(await engine.sweepArchives((body || {}).saveIds)) }; }
    catch (e) { return { ok: false, why: String(e && e.message || e) }; }
  },
  /* ---- 快照与回滚（规范第八十三至八十五章） ---- */
  async 'POST /api/snapshot/list'(body) { return engine.getSnapshots(body.saveId); },
  async 'POST /api/snapshot/now'(body) { return engine.snapshotNow(body.saveId); },
  async 'POST /api/snapshot/rollback'(body) { return engine.rollbackSave(body); },
  async 'POST /api/snapshot/repair'(body) { return engine.getRepairPlan(body.saveId); },
  async 'POST /api/snapshot/impact'(body) { return engine.getImpact(body.saveId, body.code); },
  /* ---- 历史锚点 / 因果链 / 反事实检验 ---- */
  async 'POST /api/history/anchor'(body) { return engine.addHistoryAnchor(body); },
  async 'POST /api/history/causal'(body) { return engine.addCausal(body); },
  async 'POST /api/history/counterfactual'(body) { return engine.runCounterfactual(body); },
  /* ---- NPC 决策：他到底答不答应 ---- */
  async 'POST /api/npc/decide'(body) { return engine.npcDecide(body); },
  /* ---- 档案核定：按搜索结果核定主角真实身份（修复「点错成皇帝」/ 身份不随搜索变） ---- */
  async 'POST /api/dossier/identify'(body) { return engine.identifyDossier(body); },
  async 'POST /api/dossier/apply'(body) { return engine.applyDossierToSave(body); },
  async 'POST /api/dossier/state'(body) { return engine.getDossier(body); },

  async 'POST /api/verify/person'(body) { return verify.verifyPerson(body); },
  async 'POST /api/verify/place'(body) { return verify.verifyPlace(body); },
  async 'POST /api/verify/term'(body) { return verify.verifyTerm(body); },
};

// 只认本机来的请求：别的网站（哪怕是玩家开着的网页）不能借浏览器来调这个服务、读 Key、跑命令
const LOOPBACK = /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/i;
const LOCAL_ONLY = /^(127\.0\.0\.1|localhost|::1)$/i.test(HOST);
const DEV_ONLY = new Set(['POST /api/adapter-test', 'GET /api/adapter-config', 'POST /api/adapter-config', 'GET /api/search/config', 'POST /api/search/config']);
const server = http.createServer(async (req, res) => {
  const host = String(req.headers.host || '');
  if (LOCAL_ONLY && !LOOPBACK.test(host)) { res.writeHead(403); return res.end(); }
  const origin = req.headers.origin;
  if (origin && origin !== 'null' && origin.replace(/^https?:\/\//, '') !== host) return send(res, 403, { ok: false, why: '只接受本机游戏页面的请求' });
  let url;
  try { url = new URL(req.url, `http://${host || '127.0.0.1'}`); } catch (_) { res.writeHead(400); return res.end(); }
  const key = `${req.method} ${url.pathname}`;
  if ((req.method === 'POST' || req.method === 'PUT') && routes[key] && !/json/i.test(req.headers['content-type'] || '')) return send(res, 415, { ok: false, why: '请求格式不对' });
  let body = {};
  try { if (req.method === 'POST' || req.method === 'PUT') body = await readBody(req); } catch (e) { return send(res, 413, { ok: false, why: String(e.message || e) }); }
  const handler = routes[key];
  if (!handler) return serveStatic(req, res, url.pathname);
  if (DEV_ONLY.has(key) && !process.env.RPG_DEV) {   // 高级调试接口：带 Key 明文、能起子进程，玩家用不到
    if (key === 'GET /api/adapter-config') { const c = await adapters.loadAdapterConfig(); return send(res, 200, { selected: c.selected, configs: Object.fromEntries(Object.entries(c.configs || {}).map(([k, v]) => [k, { ...v, apiKey: v && v.apiKey ? '••••' + String(v.apiKey).slice(-4) : '' }])) }); }
    if (key === 'GET /api/search/config') { const c = await search.loadConfig(); return send(res, 200, JSON.parse(JSON.stringify(c, (k, v) => /key/i.test(k) && typeof v === 'string' && v ? '••••' + v.slice(-4) : v))); }
    if (key === 'POST /api/adapter-test' && /python-subprocess|mcp-stdio/.test(String(body.adapterId || ''))) return send(res, 403, { ok: false, why: '这个适配器只在开发模式下可用' });
  }
  try {
    const out = await handler(body, url.searchParams);
    send(res, 200, out);
  } catch (e) {
    // 业务错误（参数不对、找不到、未配置 Key）统一回 {ok:false, why}，
    // 让前端能看懂原因；旧版一律 500 + 堆栈，界面上只显示 undefined。
    // 堆栈留在服务端日志里排障，不进响应。
    logErr(`[${key}]`, e && e.stack || e);
    send(res, 200, { ok: false, why: String(e && e.message || e) });
  }
});

engine.ensureDirs();
fs.mkdirSync(adapters.ADAPTER_DIR, { recursive: true });

server.on('error', e => {
  logErr(e && e.code === 'EADDRINUSE' ? `端口 ${PORT} 已被占用：游戏可能已经开着了（看看浏览器里是不是已有一个），或先关掉它再打开` : e);
  process.exit(98);   // 98：不是意外，守护进程不要再重启
});
server.listen(PORT, HOST, () => {
  console.log(`枢引擎 running: http://${HOST}:${PORT}`);
  // 启动时先探一遍外网：连不上的站点（国内常见的维基）提前记下，开局时直接走兜底，不再一个个等超时
  setTimeout(() => checkUpdate().catch(() => {}), 2000);
  if (!process.env.RPG_OFFLINE) require('./core/net').check().then(r => console.log('[net]', r.results.map(x => `${x.name}:${x.ok ? 'ok' : 'down'}`).join(' '))).catch(() => {});
});
