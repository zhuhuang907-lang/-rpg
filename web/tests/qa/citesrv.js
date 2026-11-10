// 历史原文库桌面端（R-171）：书目在库单里、按书检索真语料出带书名卷名的原文、不在库单的 id 拒绝
// 跑法：在仓库根目录 node web/tests/qa/citesrv.js
const h = require('../../../rpg-kernel/core/histlib');
(async () => {
  const bad = [];
  const M = await h.loadMeta();
  if (!M.books || M.books.length < 60) bad.push('书目不该只剩 ' + (M.books || []).length + ' 本');
  const names = new Set((M.books || []).map(b => b.id));
  for (const id of ['shiji', 'hanshu', 'sanguozhi', 'jinshu', 'jiutangshu', 'songshi', 'mingshi', 'qingshigao', 'zizhitongjian', 'tongdian']) if (!names.has(id)) bad.push('库里没有 ' + id);
  const hits = await h.search('韩信 将兵', ['shiji'], 3);
  if (!hits.length) bad.push('史记查「韩信 将兵」没有命中');
  else if (!hits[0].name || !hits[0].volume || !hits[0].text) bad.push('命中缺书名卷名或正文');
  if (hits.length && !hits.some(x => /韩信|将兵/.test(x.text))) bad.push('命中正文不含检索词');
  const h2 = await h.search('天下', ['sanlue'], 2);
  if (!h2.length) bad.push('三略查「天下」没有命中');
  for (const evil of ['..', 'etc passwd', 'SHIJI', 'shiji x']) {
    const got = await h.search('韩信', [evil], 2);   // 非法 id：安全跳过，不下载不出命中
    if (got.length) bad.push('非法 id 出了命中：' + evil);
  }
  console.log('ERRS', JSON.stringify(bad));
  process.exit(bad.length ? 1 : 0);
})();
