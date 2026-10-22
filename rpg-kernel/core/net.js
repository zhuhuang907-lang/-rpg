'use strict';
/**
 * 联网报错翻成人话 + 网络诊断。
 * Node 的 fetch 出错只说「fetch failed」，真正原因藏在 e.cause 里；玩家看到「fetch failed」不知道该干什么。
 */
const HINTS = [
  [/ENOTFOUND|EAI_AGAIN/, '找不到服务器地址：电脑没联网，或 DNS 有问题'],
  [/ECONNREFUSED/, '连接被拒绝：如果开着代理/加速器，可能代理没在运行；关掉代理或重开再试'],
  [/ECONNRESET|EPIPE/, '连接被中途断开：网络不稳定，或被防火墙/代理拦截'],
  [/ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|UND_ERR_HEADERS_TIMEOUT|TimeoutError|aborted due to timeout/i, '连接超时：网络太慢或被拦截'],
  [/CERT|SELF_SIGNED|UNABLE_TO_VERIFY|UNABLE_TO_GET_ISSUER|ERR_TLS/i, '证书校验失败：多半是杀毒软件（360、火绒等）的「HTTPS 扫描/网页防护」拦截了；把本游戏加入信任，或关闭该功能'],
  [/EACCES|EPERM/, '没有联网权限：防火墙或杀毒软件拦住了本游戏的 node.exe，请放行'],
];
function causeCode(e) {
  const c = e && e.cause;
  return [e && e.name, e && e.code, c && c.code, c && c.name, c && c.message, e && e.message].filter(Boolean).join(' ');
}
/** 把 fetch 抛出的错误包成带中文原因的 Error（保留原始代码便于排查） */
function explain(e, host) {
  const raw = causeCode(e);
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || '';
  let hit = HINTS.find(([re]) => re.test(raw));
  if (!hit && proxy && /cancel|tunnel|proxy/i.test(raw)) hit = [null, `经过系统代理（${proxy}）时被拒绝：代理软件不放行这个网站。可在代理软件里给它放行、换个节点，或关掉系统代理再试`];
  if (!hit && proxy) hit = [null, `网络请求失败（当前走系统代理 ${proxy}，可以关掉代理再试）`];
  const code = String((e && e.cause && e.cause.code) || (e && e.code) || '').replace(/^0$/, '');
  const msg = `连不上 ${host || '服务器'}：${hit ? hit[1] : '网络请求失败'}${code ? `（${code}）` : ''}`;
  const err = new Error(msg);
  err.cause = e; err.netError = true;
  return err;
}
/* 连不上的站点暂时记一下：在国内维基常常直接连不上，每个请求都要等到超时，
   开一局要查几十次，就成了「生成半天啥都没有」。
   但网络偶尔抖一下很常见：只有接连两次连不上才记，记 90 秒；连接中途被断（ECONNRESET）不算。
   写剧情的模型（DeepSeek）从不记——它连不上就重试，不能因为抖了一次就几分钟都不让写。 */
const DOWN = new Map();
const CONNECT_FAIL = /ENOTFOUND|EAI_AGAIN|ECONNREFUSED|CERT|SELF_SIGNED|UNABLE_TO_VERIFY|UNABLE_TO_GET_ISSUER|ERR_TLS|UND_ERR_CONNECT_TIMEOUT|EACCES|EPERM|tunnel/i;
/* 系统代理坏了时的直连通道：开了 --use-env-proxy 后全局用的是 EnvHttpProxyAgent，借它的构造器造一个「一律不走代理」的 */
const PROXY_FAIL = /ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|UND_ERR_SOCKET|UND_ERR_CONNECT_TIMEOUT|tunnel|proxy|CERT|SELF_SIGNED|UNABLE_TO_VERIFY|UNABLE_TO_GET_ISSUER|ERR_TLS|fetch failed/i;
const DIRECT_HOSTS = new Set();
let DIRECT_AGENT;
function directAgent() {
  if (DIRECT_AGENT !== undefined) return DIRECT_AGENT;
  DIRECT_AGENT = null;
  if (!(process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy)) return null;
  try { const g = globalThis[Symbol.for('undici.globalDispatcher.1')]; if (g && /ProxyAgent/.test(g.constructor.name)) DIRECT_AGENT = new g.constructor({ httpProxy: '', httpsProxy: '', noProxy: '*' }); } catch (_) { DIRECT_AGENT = null; }
  return DIRECT_AGENT;
}
/** fetch 包一层：网络层失败时给出中文原因 */
async function fetchX(url, opts, { noFastFail = false } = {}) {
  let host = ''; try { host = new URL(url).host; } catch (_) { /* 忽略 */ }
  const d = DOWN.get(host);
  if (!noFastFail && d && d.n >= 2 && d.until > Date.now()) { const err = new Error(d.msg + '（刚才接连连不上，一分钟后再试）'); err.netError = true; err.fastFail = true; throw err; }
  const direct = DIRECT_HOSTS.has(host) && directAgent();
  try { const r = await fetch(url, direct ? { ...opts, dispatcher: direct } : opts); DOWN.delete(host); return r; }
  catch (e0) {
    let e = e0;
    // 走系统代理连不上（代理软件没开、节点挂了、不放行这个网站）：绕开代理直连再试一次，通了就记住这个网站以后都直连
    const agent = !direct && !(opts && opts.signal && opts.signal.aborted) && PROXY_FAIL.test(causeCode(e0)) && directAgent();
    if (agent) {
      try { const r = await fetch(url, { ...opts, dispatcher: agent }); DIRECT_HOSTS.add(host); DOWN.delete(host); try { console.log('[net] 经代理连不上', host, '，改为直连'); } catch (_) { /* 忽略 */ } return r; }
      catch (_) { /* 直连也不通：报原来的错 */ }
    }
    const err = explain(e, host);
    if (host && !noFastFail && CONNECT_FAIL.test(causeCode(e))) { const o = DOWN.get(host); DOWN.set(host, { n: (o && o.until > Date.now() ? o.n : 0) + 1, until: Date.now() + 90 * 1000, msg: err.message }); }
    throw err;
  }
}
/** 网络诊断：逐个试连模型、博查、维基。能拿到任何 HTTP 回应（哪怕 401）就算「连得上」 */
async function check() {
  const targets = [
    ['DeepSeek（写剧情）', 'https://api.deepseek.com/models'],
    ['博查（查史，可选）', 'https://api.bochaai.com/v1/web-search'],
    ['维基百科（免费查史）', 'https://zh.wikipedia.org/w/api.php?action=query&format=json&meta=siteinfo'],
    ['Wikidata（免费查人物）', 'https://query.wikidata.org/sparql?format=json&query=ASK%7B%7D'],
  ];
  const out = [];
  await Promise.all(targets.map(async ([name, url], i) => {
    const t0 = Date.now();
    try {
      const r = await fetchX(url, { method: 'GET', signal: AbortSignal.timeout(12000) }, { noFastFail: true });
      out[i] = { name, ok: true, status: r.status, ms: Date.now() - t0 };
    } catch (e) { out[i] = { name, ok: false, why: String(e.message || e), ms: Date.now() - t0 }; }
  }));
  return {
    ok: true, results: out,
    proxy: process.env.HTTPS_PROXY || process.env.https_proxy || '',
    systemCa: process.execArgv.includes('--use-system-ca'),
  };
}
module.exports = { explain, fetchX, check };
