'use strict';
// 测试用：RPG_OFFLINE=1 时，对外联网请求立即失败（本机 127.0.0.1 照常）。
// 打包机访问维基常常几分钟不回，查史的自测会被拖到超时；断网后走「检索不可用」的降级路径，同样被测到。
const real = globalThis.fetch;
globalThis.fetch = async (url, opts) => {
  const u = String(url && url.url || url);
  if (/^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(u)) return real(url, opts);
  throw new TypeError('fetch failed (RPG_OFFLINE)');
};
