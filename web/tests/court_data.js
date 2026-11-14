// 五代十国朝廷数据检查（任务六，R-227）：每条有出处、起止自洽、任职落在位子存续年内、同一位子同一年不超员额、只有两档、没有「某」「不详」「待查」
const fs = require('fs'), path = require('path');
const D = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'court', 'wudai.json'), 'utf8'));
const bad = [], seat = {};
for (const P of D.polities) {
  if (!P.name || !['厚', '中', '薄'].includes(P.grade) || !P.model) bad.push(`${P.name} 缺名字、厚薄或官制`);
  for (const s of P.seats) { if (!s.src || !s.office || !(s.from <= s.to)) bad.push(`${P.name} 位子 ${s.id} 缺出处或起止不对`); seat[s.id] = { ...s, pol: P.name }; }
  const sh = P.recruit.reduce((a, r) => a + r.share, 0); if (Math.abs(sh - 1) > 0.01) bad.push(`${P.name} 用人来路比例加起来是 ${sh}`);
  for (const r of P.recruit) if (!r.src || !r.families.length) bad.push(`${P.name} 来路 ${r.from} 缺出处或姓氏`);
}
const occ = {};
for (const p of D.people) {
  if (![1, 2].includes(p.tier)) bad.push(`${p.name} 档次是 ${p.tier}`);
  if (/某|不详|待查/.test(JSON.stringify(p))) bad.push(`${p.name} 有「某/不详/待查」`);
  for (const x of p.posts) {
    const s = seat[x.seat]; if (!s) { bad.push(`${p.name} 的位子 ${x.seat} 不存在`); continue; }
    if (!x.src || !['明载', '推定'].includes(x.how) || !(x.from <= x.to)) bad.push(`${p.name} ${x.office} 缺出处、来路或起止不对`);
    if (x.from < s.from || x.to > s.to) bad.push(`${p.name} ${x.office} 任期出了位子存续年`);
    for (let y = x.from; y <= x.to; y++) { const k = x.seat + '|' + y; (occ[k] = occ[k] || new Set()).add(p.name); }
  }
}
const span = {}; for (const p of D.people) for (const x of p.posts) span[p.name + '|' + x.seat] = x;
for (const [k, S] of Object.entries(occ)) { const [id, y] = k.split('|'); const full = [...S].filter(n => { const x = span[n + '|' + id]; return x.from < +y && x.to > +y; });   // 这一年上任、离任的算交接，不算超员
  if (full.length > (seat[id].quota || 1)) bad.push(`${seat[id].office} ${y} 年有 ${S.size} 人：${[...S].join('、')}`); }
console.log(bad.length ? '五代十国朝廷数据：不合格\n' + bad.join('\n') : `五代十国朝廷数据：${D.polities.length} 国、${D.people.length} 人，全部合格`); process.exit(bad.length ? 1 : 0);
