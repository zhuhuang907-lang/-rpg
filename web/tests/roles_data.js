// 时代世情库数据检查（任务十二，R-231）：条条有出处、happens 不少于八条、不写「某、不详、待查」，也不写「必须、只能、不可以」这类拦人的话（库是材料，不是白名单）
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'roles'); let bad = [], n = 0;
for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
  if (!Array.isArray(d.range) || d.range.length !== 2) bad.push(f + '：没有年代范围');
  for (const w of d.ways || []) { n++; const id = f + '·' + (w.name || '无名');
    if (!w.name || !w.kind || !w.what) bad.push(id + '：缺名字、类别或说明');
    if (!w.src && !(w.become || []).some(x => x.src)) bad.push(id + '：没有出处');
    for (const x of (w.become || []).concat(w.doing || [], w.leads || [])) if (!x.src) bad.push(id + '：有一条没写出处');
    if ((w.happens || []).length < 8) bad.push(id + '：可能碰上的事不到八条');
    const all = JSON.stringify({ ...w, names: undefined });   // 称呼栏「某姓子弟」「某后」是格式（某＝姓），游戏取用时换成〔姓〕 if (/某(?![些种])|不详|待查/.test(all.replace(/某某接任/g, ''))) bad.push(id + '：写了「某、不详、待查」');
    if (/必须|只能|不可以/.test(all)) bad.push(id + '：写了拦人的话（必须、只能、不可以）'); } }
console.log(`时代世情库：${n} 条，不合格 ${bad.length} 条`); if (bad.length) console.log(bad.slice(0, 30).join('\n'));
process.exit(bad.length ? 1 : 0);
