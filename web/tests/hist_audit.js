// 史实跨表体检（R-241）：内置史料、任职年表、朝廷数据、政权总表彼此对得上。
// 用法：node web/tests/hist_audit.js [--all]（默认只报晚明以外各段；--all 把每条都列出来）
const fs = require('fs'), path = require('path');
const W = path.join(__dirname, '..'), J = f => JSON.parse(fs.readFileSync(path.join(W, f), 'utf8'));
const SKIP = new Set(['ming-late.json']);   // 晚明先放（R-241）
const DEATH_WORD = /卒|死|葬|追|谥|崩|薨|遗|殁|被杀|遇害|诛|灵|墓|祠|祭|改葬|故|戮尸|编成|成书/;
const N = v => (v == null || v === 0 || v === '') ? null : v;   // 0 是「不详」，不当年份
const out = {}; const add = (k, s) => (out[k] = out[k] || []).push(s);
const packs = fs.readdirSync(path.join(W, 'history')).filter(f => f.endsWith('.json') && f !== 'polities.json' && !SKIP.has(f)).map(f => ({ f, d: J('history/' + f) }));
// 生卒写 0：不详要写 null（写 0 游戏会当成公元 0 年生，算出几百岁；zcode 三回交来都有，2026-11-17 起体检拦）
for (const { f, d } of packs) for (const x of d.figures || []) for (const k of ['born', 'died']) if (x && x[k] === 0) add('生卒写了 0（不详写 null）', `${f}：${x.name} ${k}`);
for (const f of fs.existsSync(path.join(W, 'figures')) ? fs.readdirSync(path.join(W, 'figures')).filter(f => f.endsWith('.json')) : []) { const d = J('figures/' + f); for (const x of d.people || []) for (const k of ['born', 'died']) if (x && x[k] === 0) add('生卒写了 0（不详写 null）', `figures/${f}：${x.name} ${k}`); }
const died = {};   // 名 → [{died, range, src}]
for (const { f, d } of packs) {
  const [y0, y1] = d.range || [-9999, 9999];
  for (const p0 of d.figures || []) { const p = { ...p0, born: N(p0.born), died: N(p0.died) };
    if (p.died != null) (died[p.name] = died[p.name] || []).push({ died: p.died, range: [y0, y1], src: f });
    for (const q of p.posts || []) {
      if (p.died != null && q[0] > p.died) add('任职在卒年之后', `${f}·${p.name}（卒 ${p.died}）${q[0]} 年起任「${q[2]}」`);
      if (p.born != null && q[0] < p.born + 10 && !/皇|太子|帝|宗|王|公|侯|可汗|单于/.test(q[2])) add('任职时不满十岁', `${f}·${p.name}（生 ${p.born}）${q[0]} 年任「${q[2]}」`);
      if (q[1] != null && q[1] < q[0]) add('任期止早于起', `${f}·${p.name} ${q[0]}—${q[1]}「${q[2]}」`);
    }
    if (p.born != null && p.died != null && (p.died < p.born || (p.died - p.born > 105 && !/佛图澄/.test(p.name)))   /* 佛图澄寿百余岁，高僧传有载 */) add('生卒不合常理', `${f}·${p.name} ${p.born}—${p.died}`);
  }
  const fig = Object.fromEntries((d.figures || []).map(p => [p.name, { ...p, died: N(p.died) }]));
  for (const e of d.events || []) {
    if (e.y < y0 || e.y > y1) add('史事在本段年代外', `${f}·${e.y}「${String(e.text).slice(0, 30)}」（本段 ${y0}—${y1}）`);
    for (const w of e.who || []) { const p = fig[w]; if (p && p.died != null && e.y > p.died && !DEATH_WORD.test(e.text)) add('已死的人还在史事里出场', `${f}·${e.y}「${String(e.text).slice(0, 30)}」里的 ${w}（卒 ${p.died}）`); }
  }
  const byPol = {}; for (const r of d.rulers || []) (byPol[r.polity] = byPol[r.polity] || []).push(r);
  for (const [pol, L] of Object.entries(byPol)) { L.sort((a, b) => a.from - b.from);
    for (let i = 1; i < L.length; i++) if (L[i].from != null && L[i - 1].from != null && L[i].from < L[i - 1].to - 1 && L[i].name !== L[i - 1].name && L[i].to - L[i].from > 1 &&   /* 篡位数月的（司马伦 301）不算 */ !/并立|对立|伪|僭|共治|太上|割据/.test(String(L[i].title) + String(L[i].note || '')) && !/鲜卑|俄罗斯|安南|马腾|乌桓|匈奴|羌/.test(pol)) add('同一政权两位君主在位重叠两年以上', `${f}·${pol}：${L[i - 1].name}（${L[i - 1].from}—${L[i - 1].to}）与 ${L[i].name}（${L[i].from}—${L[i].to}）`);
    for (const r of L) for (const [era, ey] of r.reigns || []) if (!/（/.test(era) && (ey < r.from - 1 || ey > r.to)) add('年号起年不在君主在位年内', `${f}·${r.name}（${r.from}—${r.to}）年号「${era}」起 ${ey}`); }
}
// 任职年表、朝廷数据里的卒年也收进来比
for (const t of fs.readdirSync(path.join(W, 'tenure')).filter(f => f.endsWith('.json') && !/^ming/.test(f))) {
  const d = J('tenure/' + t); for (const p of d.figures || []) if (N(p.died) != null && p.name) (died[p.name] = died[p.name] || []).push({ died: p.died, range: [Math.min(...(p.posts || [[p.died]]).map(q => q[0])), p.died], src: t }); }
for (const [n, L] of Object.entries(died)) for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
  const a = L[i], b = L[j]; const near = Math.abs(a.died - b.died) <= 30 && !(a.range && b.range && (a.range[1] < b.range[0] || b.range[1] < a.range[0]));   // 隔得太远、任职年份全不重叠的，多半是同名两人（李怀忠：后周 953 卒、宋 978 卒）
  if (near && Math.abs(a.died - b.died) > 1 && a.src !== b.src && !(out['同一人各表卒年不一'] || []).includes(`${n}：${a.src} 记卒 ${a.died}，${b.src} 记卒 ${b.died}`)) add('同一人各表卒年不一', `${n}：${a.src} 记卒 ${a.died}，${b.src} 记卒 ${b.died}`); }
// 朝廷数据：任职在卒年以后、任职在政权存续年外
const C = J('court/wudai.json'); const pols = J('history/polities.json'); const life = Object.fromEntries(pols.map(p => [p.name, [p.from, p.to]]));
for (const p of C.people || []) for (const q of p.posts || []) {
  const ds = (died[p.name] || []).filter(x => Math.abs(x.died - q.from) <= 30).map(x => x.died); const dd = ds.length ? Math.min(...ds) : null;
  if (dd != null && q.from > dd) add('朝廷数据：任职在卒年以后', `${q.polity}·${p.name} ${q.from}—${q.to}「${q.office}」，各表记卒 ${dd}`);
  else if (dd != null && q.to > dd + 1) add('朝廷数据：任期过了卒年', `${q.polity}·${p.name} ${q.from}—${q.to}「${q.office}」，各表记卒 ${dd}`);
  const L = life[q.polity]; if (L && (q.from > L[1] || q.to < L[0])) add('朝廷数据：任职在该国存续年外', `${q.polity}（${L[0]}—${L[1]}）·${p.name} ${q.from}—${q.to}`); }
for (const p of pols) for (const r of p.rulers || []) if (r.from < p.from - 1 || r.to > p.to + 1) add('政权总表：君主在位年超出国祚', `${p.name}（${p.from}—${p.to}）·${r.name} ${r.from}—${r.to}`);
// 君主：政权总表与各段史料里同一君主的在位起止对得上（差一年内算对：改元、即位跨年）
{ const nm = x => String(x || '').replace(/（.*?）|\(.*?\)/g, '').trim(); const idx = {};
  for (const { f, d } of packs) for (const r of d.rulers || []) (idx[nm(r.name)] = idx[nm(r.name)] || []).push({ ...r, src: f });
  for (const p of pols) for (const r of p.rulers || []) for (const n of nm(r.name).split(/[、，]/)) for (const h of idx[n] || []) {
    if (h.from == null || r.from == null) continue;
    if (Math.abs(h.from - r.from) > 30) continue;   // 同名两人
    if (/^(李存勖|刘守光|慕容皝|拓跋猗卢)$/.test(n)) continue;   // 称王前后两种算法都对：李存勖 908 晋王、923 后唐帝；刘守光 907 囚父、911 称燕；慕容皝 333 嗣位、337 称燕王；拓跋猗卢 310 代公、315 代王
    if (Math.abs(h.from - r.from) > 1 || Math.abs((h.to || 0) - (r.to || 0)) > 1) add('同一君主各表在位年不一', `${n}：政权总表（${p.name}）记 ${r.from}—${r.to}，${h.src}（${h.polity}）记 ${h.from}—${h.to}`); } }
const all = process.argv.includes('--all'); let n = 0;
for (const [k, L] of Object.entries(out)) { n += L.length; console.log(`【${k}】${L.length} 条`); for (const s of (all ? L : L.slice(0, 8))) console.log('  · ' + s); }
console.log(`史实跨表体检：共 ${n} 处可疑`);
process.exit(n ? 1 : 0);
