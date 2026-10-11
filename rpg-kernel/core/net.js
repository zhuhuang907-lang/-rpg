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
/* 连不上的站点记 3 分钟：在国内维基常常直接连不上，每个请求都要等到超时，
   开一局要查几十次，就成了「生成半天啥都没有」。记住后同一站点立即失败，走兜底。
   只记「连接层」失败（域名、拒绝、重置、证书、代理、连接超时）；
   读响应超时（模型写长文写得慢）不记，免得把 DeepSeek 误判成连不上。 */
const DOWN = new Map();
const CONNECT_FAIL = /ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|EPIPE|CERT|SELF_SIGNED|UNABLE_TO_VERIFY|UNABLE_TO_GET_ISSUER|ERR_TLS|UND_ERR_CONNECT_TIMEOUT|EACCES|EPERM|cancel|tunnel|proxy/i;
/** fetch 包一层：网络层失败时给出中文原因 */
async function fetchX(url, opts, { noFastFail = false } = {}) {
  let host = ''; try { host = new URL(url).host; } catch (_) { /* 忽略 */ }
  const d = DOWN.get(host);
  if (!noFastFail && d && d.until > Date.now()) { const err = new Error(d.msg + '（几分钟内不再重试）'); err.netError = true; err.fastFail = true; throw err; }
  try { const r = await fetch(url, opts); DOWN.delete(host); return r; }
  catch (e) {
    const err = explain(e, host);
    if (host && CONNECT_FAIL.test(causeCode(e))) DOWN.set(host, { until: Date.now() + 3 * 60 * 1000, msg: err.message });
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
