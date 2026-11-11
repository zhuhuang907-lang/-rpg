// 原文库检索（R-189）：整词比对、同段多词加分、在命中处摘句、照朝代和政权挑书；桌面服务那一套直接查真语料
const path = require('path');
const ROOT = path.resolve(path.dirname(path.resolve(process.env.PLAY || path.join(__dirname, '../../play.html'))), '..');
const H = require(path.join(ROOT, 'rpg-kernel', 'core', 'histlib.js')), C = require(path.join(ROOT, 'rpg-kernel', 'core', 'libcore.js'));
(async () => {
  const bad = [];
  const B = (y, p, said) => C.libBooksFor(y, p, said);
  const want = [[1150, '金', 'jinshi'], [1150, '南宋', 'jianyanjilu'], [500, '北魏', 'weishu'], [520, '梁', 'liangshu'], [600, '隋', 'suishu'], [1300, '元', 'yuanshi'], [1000, '辽', 'liaoshi'], [1600, '明', 'mingshilu'], [1750, '清', 'qingshilu'], [1068, '北宋', 'changbian'], [210, '东汉', 'sanguozhi']];
  for (const [y, p, b] of want) if (!B(y, p).includes(b)) bad.push(`${y}年${p}该查${b}：` + B(y, p));
  if (!B(1600, '明', '推行一条鞭法').includes('daminghuidian')) bad.push('明朝说赋役该查大明会典');
  if (!B(1570, '明', '戚继光练兵').includes('jixiaoxinshu')) bad.push('明后期说练兵该查纪效新书');
  // 真语料：熙宁＋王安石＋青苗在同一段的排前面，摘句里有检索词
  { const t0 = Date.now(), r = await H.search('熙宁|王安石*2|青苗', ['songshi', 'changbian'], 4), ms = Date.now() - t0;
    if (!r.length) bad.push('宋史里查不到王安石青苗'); else { if (!r[0].terms.includes('王安石') || r[0].terms.length < 2) bad.push('排第一的不是同时中了几个词的段落：' + JSON.stringify(r[0].terms)); if (!/王安石|青苗|熙宁/.test(r[0].text)) bad.push('摘句里没有检索词：' + r[0].text.slice(0, 60)); if (r[0].name !== '宋史') bad.push('书名没写成简体：' + r[0].name); }
    if (ms > 20000) bad.push('查一回太慢：' + ms + 'ms'); }
  { const r = await H.search('岳飞*2|郾城', ['songshi'], 3); if (!r.length || !r.some(h => /岳飞/.test(h.text))) bad.push('宋史里查不到岳飞郾城'); }
  { const r = await H.search('之|曰', ['songshi'], 3); if (r.length) bad.push('单字常用字也算检索词'); }
  { const s = C.libSnip('甲'.repeat(500) + '。王安石行青苗法于天下。' + '乙'.repeat(500), ['王安石', '青苗']); if (!/王安石行青苗法/.test(s) || s.length > 220) bad.push('摘句没在命中处截：' + s.slice(0, 50)); }
  console.log('ERRS', JSON.stringify(bad)); process.exit(bad.length ? 1 : 0);
})().catch(e => { console.log('ERRS', JSON.stringify(['崩了：' + e.message])); process.exit(1); });
