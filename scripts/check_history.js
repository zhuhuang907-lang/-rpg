// 内置史料人事年表校验（任务三，R-221）。分两级：
//   硬伤（必须改）：任期倒置、任期超过卒年、把「削籍」「下狱」这类遭遇当成官职记进 posts
//   待核（回史书核）：同一个独坐的位子同时两人（宰相、辅政这类本来多员的位子不算）、一人同时两个实职
// 跑法：node scripts/check_history.js [年代段id…]；DETAIL=1 列出明细；有硬伤时退出码 1
const fs = require('fs'), path = require('path');
const DIR = path.join(__dirname, '..', 'web', 'history');
// 兼衔、加官、散官、爵、使职差遣、宰相衔等可以和本官并存，不算「一人两个实职」
const CONCURRENT = /兼|加|领|行|判|权|知.{0,6}事|检校|同中书门下|平章事|参知政事|同平章|录尚书|开府|仪同|特进|大夫|将军|侍中$|散骑|公$|侯$|伯$|王$|爵|赠|使$|节度|观察|经略|招讨|安抚|宣抚|总管|大都督|都督|刺史|太守|学士|直|充|摄|署|试|守|赐|封|称帝|即位|太子|皇后|太后|宦官|内侍|驸马|和亲|尚.{0,2}公主|罢|致仕|贬|流|出为|入为|还/;
const realPost = t => !CONCURRENT.test(String(t || ''));
// 本来就多员同时在任的位子（宰相、辅政、校尉、主事、谋臣、各种郎……），同时两人不算错
const MULTI = /宰相|辅政|顾命|校尉|主事|谋臣|郎将|侍郎|郎中|员外郎|给事中|御史|学士|参政|参知|平章|丞相$|将军|中郎|皇帝|天子|帝$|王$|可汗|单于/;
// 遭遇、处分、身份，不是官职，不该记成 posts
const STATUS = /削籍|下狱|论死|弃市|赐死|被杀|遇害|流放|流崖|贬为庶|归里|致仕|罢归|罢职|罢相|闲住|闲居|安置|隐居|出家|起兵|叛|反正|反清|反唐|被俘|囚|(?:^|[，、；（])降(?!虏|号|随)|降[唐清金元宋魏吴蜀明后伪蒙]/;
const ROYAL = /帝|宗|祖|王|太子|可汗|单于|皇后|太后/;
function check(id) {
  const d = JSON.parse(fs.readFileSync(path.join(DIR, id + '.json'), 'utf8'));
  const bad = [];
  for (const f of d.figures || []) {
    for (const p of f.posts || []) {
      const [a, b0, title] = p; const b = b0 == null ? a : b0;
      if (a != null && b != null && a > b) bad.push({ kind: '任期倒置', who: f.name, post: title, a, b });
      if (f.born != null && a != null && a < f.born + 10 && !ROYAL.test(String(title))) bad.push({ kind: '任职早于十岁', who: f.name, post: title, a, born: f.born });
      if (STATUS.test(String(title || ''))) {
        // 去掉括注后还有官名的，是「官职里夹了经历」（格式不净，待核改）；整条只有遭遇的，才是硬伤
        const core = String(title).replace(/（.*?）|\(.*?\)/g, '');
        const hasOffice = /官|使|尉|令|守|史|丞|卿|侍|郎|尚书|将军|王|公|侯|帅|督|大夫|学士|府|州|县|尹|参|判|节度|团练|宾客|少师|少傅|少保|太师|太傅|太保|首领/.test(core.replace(STATUS, ''));
        bad.push({ kind: hasOffice ? '官职里夹了经历' : '遭遇记成了官职', who: f.name, post: title });
      }
      if (f.died != null && b != null && b > f.died) bad.push({ kind: '任期超过卒年', who: f.name, post: title, b, died: f.died });
    }
    const real = (f.posts || []).filter(p => realPost(p[2]) && p[0] != null);
    for (let i = 0; i < real.length; i++) for (let j = i + 1; j < real.length; j++) {
      const [a1, b1x] = real[i], [a2, b2x] = real[j], b1 = b1x ?? a1, b2 = b2x ?? a2;
      if (a1 < b2 && a2 < b1) bad.push({ kind: '一人同时两个实职', who: f.name, post: `${real[i][2]}（${a1}-${b1}）／${real[j][2]}（${a2}-${b2}）` });
    }
  }
  const byTitle = {};
  for (const f of d.figures || []) for (const p of f.posts || []) {
    const t = String(p[2] || '').replace(/（.*?）|\(.*?\)/g, '').trim();
    if (!t || !realPost(t) || MULTI.test(t) || STATUS.test(t) || p[0] == null) continue;
    (byTitle[t] = byTitle[t] || []).push({ who: f.name, a: p[0], b: p[1] ?? p[0] });
  }
  for (const [t, L] of Object.entries(byTitle)) for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const x = L[i], y = L[j];
    if (x.who !== y.who && x.a < y.b && y.a < x.b) bad.push({ kind: '同一位子同时两人', post: t, who: `${x.who}（${x.a}-${x.b}）／${y.who}（${y.a}-${y.b}）` });
  }
  return { id, figures: (d.figures || []).length, bad };
}
const ids = process.argv.slice(2).length ? process.argv.slice(2) : fs.readdirSync(DIR).filter(f => f.endsWith('.json')).map(f => f.replace(/\.json$/, ''));
let total = 0; const out = [];
for (const id of ids) { const r = check(id); total += r.bad.length; out.push(r); }
for (const r of out) {
  const by = {}; for (const b of r.bad) by[b.kind] = (by[b.kind] || 0) + 1;
  console.log(`${r.id}：真人 ${r.figures}，可疑 ${r.bad.length}`, JSON.stringify(by));
}
const HARD = new Set(['任期倒置', '任期超过卒年', '遭遇记成了官职']);
const hard = out.reduce((n, r) => n + r.bad.filter(b => HARD.has(b.kind)).length, 0);
if (process.env.DETAIL) for (const r of out) for (const b of r.bad) console.log(r.id, JSON.stringify(b));
console.log('合计可疑', total, '其中硬伤', hard);
process.exitCode = hard ? 1 : 0;
