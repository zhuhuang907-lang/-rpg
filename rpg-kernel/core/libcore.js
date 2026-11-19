'use strict';
/* 原文库检索核心（R-189 起，桌面服务与网页两边同一套，一字不差；R-246~250 检索中枢）：
 *  · 检索词整词比对（不是两字一拆乱凑）：每个词照它在这本书里出现的段数算稀有度（越少见越要紧），带权重（人名、地名重，年号轻）；
 *  · 一段里同时中了几个词的加倍（年号＋人名＋事同在一段，才是要找的那段）；出现在过半段落里的词当常用字，不计分；
 *  · 同段近邻（R-247）：中了几个词的，还要在一百二十字内挤在一起才再加倍——以前整段东一个词、西一个词也算「同段」，常把不相干的段排到前头；
 *  · 卷类意图（R-248，hint：'人'/'制'/'事'）：问人优先列传、世家，问制度优先志、考、会要、典，问事优先纪、实录、本末；
 *  · 官称别称（R-246）：一个官，今称与史称对不上（知府＝太守＝郡守），检索与核人都照别称表一起查、一起认；
 *  · 摘句：在命中最密的地方截一百五十字左右、顺着句号断开，不再从段首硬截（以前截出来的常常根本不含要找的词）；命中的整段也随条带回（seg），核人要照整段判「名字与官称同段」。 */
const LIB_ZH = { beiqishu: '北齐书', beishi: '北史', cefuyuangui: '册府元龟', changbian: '续资治通鉴长编', chenshu: '陈书', daminghuidian: '大明会典', dushifangyu: '读史方舆纪要', dutongjianlun: '读通鉴论', guoyu: '国语', hanshu: '汉书', houhanshu: '后汉书', huangchaowenxiantongkao: '皇朝文献通考', jianyanjilu: '建炎以来系年要录', jinshi: '金史', jinshu: '晋书', jiutangshu: '旧唐书', jiuwudaishi: '旧五代史', jixiaoxinshu: '纪效新书', lianbingjinji: '练兵实纪', liangshu: '梁书', liaoshi: '辽史', lijibingshu: '天下郡国利病书', liutao: '六韬', mingshi: '明史', mingshilu: '明实录', mingtongjian: '明通鉴', nanqishu: '南齐书', nanshi: '南史', nianershi: '廿二史札记', qingshigao: '清史稿', qingshilu: '清实录', sanguozhi: '三国志', sanlue: '三略', shanhaijing: '山海经', shiji: '史记', shuijingzhu: '水经注', sima: '司马法', songhuiyao: '宋会要辑稿', songshi: '宋史', songshu: '宋书', suishu: '隋书', sunzibingfa: '孙子兵法', taipingyulan: '太平御览', tanghuiyao: '唐会要', tongdian: '通典', tongzhi: '通志', weiliaozi: '尉缭子', weishu: '魏书', wenxiantongkao: '文献通考', wubeizhi: '武备志', wudaihuiyao: '五代会要', wujingzongyao: '武经总要', wuyuechunqiu: '吴越春秋', wuzi: '吴子', xintangshu: '新唐书', xinwudaishi: '新五代史', xuzizhitongjian: '续资治通鉴', yuanhejunxian: '元和郡县图志', yuanshi: '元史', yuejueshu: '越绝书', yuhai: '玉海', zhanguoce: '战国策', zhoushu: '周书', zhushujinian: '竹书纪年', zizhitongjian: '资治通鉴' };
function libTerms(x) { const out = []; for (const raw of (Array.isArray(x) ? x : String(x || '').split(/[|\s]+/))) { const o = typeof raw === 'object' && raw ? raw : (() => { const m = String(raw).match(/^(.+?)\*(\d+(?:\.\d+)?)$/); return m ? { q: m[1], w: +m[2] } : { q: String(raw), w: 1 }; })(); const q = String(o.q || '').replace(/[^一-鿿]/g, ''); if (q.length >= 2 && !out.some(t => t.q === q)) out.push({ q: q.slice(0, 12), w: Math.max(0.2, Math.min(4, +o.w || 1)) }); if (out.length >= 10) break; } return out; }
function libSnip(t0, m, L) { L = L || 150; const t = String(t0 || '').replace(/__NOEDITSECTION__/g, '').replace(/\s+/g, ' ').trim(); const pos = []; for (const q of m) { let p = t.indexOf(q); while (p >= 0 && pos.length < 40) { pos.push(p); p = t.indexOf(q, p + q.length); } } pos.sort((a, b) => a - b);
  if (!pos.length) return t.slice(0, L); let best = pos[0], bc = 0; for (const p of pos) { const c = new Set(m.filter(q => { const k = t.indexOf(q, Math.max(0, p - 10)); return k >= 0 && k < p + L - 20; })).size; if (c > bc) { bc = c; best = p; } }
  let a = Math.max(0, best - 40); const pre = t.lastIndexOf('。', best); if (pre >= 0 && best - pre <= 70) a = pre + 1; let e = Math.min(t.length, a + L); const nx = t.indexOf('。', Math.max(a, e - 30)); if (nx >= 0 && nx < e + 40) e = nx + 1;
  return (a > 0 ? '……' : '') + t.slice(a, e).trim() + (e < t.length ? '……' : ''); }
/* 官称别称表（R-246）：只收史书、实录、政书里真用过的叫法；键是游戏与今称里的官名，值是它在史料里的写法。检索先照它展开词形（连展开两层：太守＝知府，知府又写作知某府事），核人、核官也照它认 */
const POST_ALIAS = { 知府: ['太守', '郡守', '府尹', '知某府事'], 太守: ['知府', '郡守'], 郡守: ['太守', '知府'], 府尹: ['知府'], 知州: ['知某州军州事', '刺史'], 刺史: ['知州', '太守'], 县令: ['县尹', '知县'], 知县: ['县令', '县尹'], 县丞: ['丞'], 主簿: ['簿'], 通判: ['通守', '倅'], 同知: ['贰'], 推官: ['理官'], 巡抚: ['抚台', '部院'], 总督: ['制台', '制军', '督师'], 总兵: ['总戎', '镇台'], 按察使: ['臬台', '臬司'], 布政使: ['藩台', '藩司'], 提刑: ['宪司', '监司'], 转运使: ['漕司', '漕使'], 知谏院: ['谏院'], 尚书: ['冢宰', '大司马', '大宗伯', '大司寇', '大司空', '大司农'], 宰相: ['相国', '丞相', '平章政事', '同平章事', '尚书左仆射', '尚书右仆射', '中书令', '侍中', '参政', '首辅', '阁老', '大学士'], 参知政事: ['参政', '执政'], 枢密使: ['枢相', '枢密'], 枢密副使: ['枢副'], 翰林学士: ['内相', '学士'], 御史中丞: ['中丞'], 御史: ['台官', '宪台'], 节度使: ['节帅', '藩帅'], 太尉: ['司马'] };
function postAliasAll(q) { const t = String(q || '').trim(), out = [t]; for (const a of POST_ALIAS[t] || []) if (!out.includes(a)) out.push(a); for (const a of out.slice()) for (const b of POST_ALIAS[a] || []) if (!out.includes(b)) out.push(b); return out; }
/** 从「汉中知府」这类「衙门＋官职」里认出官名（认最长那个；认不出返回空） */
function postTitleOf(ctx) { const t = String(ctx || ''), ks = Object.keys(POST_ALIAS).sort((a, b) => b.length - a.length); for (const k of ks) if (t.includes(k)) return k; return ''; }
/** 同段近邻（R-247）：这些词在一百二十字内最多同现几个（2 以上才算真挤在一起；散落全段的只算各中各的） */
function libNear(t, qs, L) { L = Math.max(20, L || 120); const s = String(t || ''), P = [];
  for (const q of new Set(qs || [])) { if (!q) continue; let p = s.indexOf(q), c = 0; while (p >= 0 && c < 16) { P.push([p, q]); p = s.indexOf(q, p + q.length); c++; } }
  if (!P.length) return 0; P.sort((a, b) => a[0] - b[0]); const cnt = new Map(); let best = 0, j = 0;
  for (let i = 0; i < P.length; i++) { cnt.set(P[i][1], (cnt.get(P[i][1]) || 0) + 1); while (P[i][0] - P[j][0] > L) { const v = cnt.get(P[j][1]) - 1; if (v <= 0) cnt.delete(P[j][1]); else cnt.set(P[j][1], v); j++; } if (cnt.size > best) best = cnt.size; }
  return best; }
function libScan(texts, terms, n, hint) { const N = texts.length; if (!N || !terms.length) return []; const sc = new Map();
  for (const T of terms) { const hit = []; for (let i = 0; i < N; i++) if (texts[i].t.indexOf(T.q) >= 0) hit.push(i); const df = hit.length; if (!df || (df > N * 0.3 && N > 20)) continue; const idf = Math.log(1 + N / df) * T.w; for (const i of hit) { const o = sc.get(i) || { s: 0, m: [] }; o.s += idf; o.m.push(T.q); sc.set(i, o); } }
  const minTerms = Math.min(2, terms.length);
  const IV = { 人: /传|世家|载记/, 制: /志|考|典|会要|沿革/, 事: /纪|实录|本末/ }, ire = IV[hint];
  const out = []; for (const [i, o] of sc) { if (o.m.length < minTerms) continue; const near = o.m.length > 1 ? libNear(texts[i].t, o.m) : 1, iv = ire && ire.test(texts[i].v || '') ? 1.3 : 1; out.push({ i, s: o.s * (1 + 0.7 * (o.m.length - 1)) * (1 + 0.4 * (near - 1)) * iv, m: o.m }); }
  if (!out.length && terms.length === 1) { for (const [i, o] of sc) { out.push({ i, s: o.s, m: o.m }); } }
  out.sort((a, b) => b.s - a.s);
  return out.slice(0, n || 4).map(x => ({ volume: texts[x.i].v, text: libSnip(texts[x.i].t, x.m), seg: String(texts[x.i].t || '').slice(0, 2400), terms: x.m, score: Math.round(x.s * 100) / 100 })); }
/* 哪个年代、哪一家查哪几部书（照朝代与政权；南北朝分南北，宋辽金元分开） */
function libBooksFor(y, pol, said) { const P = String(pol || ''), B = []; const add = (...a) => { for (const x of a) if (!B.includes(x)) B.push(x); };
  if (y < -221) add('shiji', 'zhanguoce', 'guoyu', 'zhushujinian'); else if (y < -202) add('shiji', 'zizhitongjian'); else if (y < 9) add('hanshu', 'shiji', 'zizhitongjian'); else if (y < 25) add('hanshu', 'zizhitongjian'); else if (y < 189) add('houhanshu', 'zizhitongjian');
  else if (y < 220) add('houhanshu', 'sanguozhi', 'zizhitongjian'); else if (y < 266) add('sanguozhi', 'zizhitongjian'); else if (y < 420) { add('jinshu', 'zizhitongjian'); if (y >= 386 && /魏|代|拓跋|北/.test(P)) add('weishu'); }
  else if (y < 589) { const north = /魏|齐|周|北|燕|凉|夏|柔然/.test(P) && !/南齐/.test(P); if (north) { add(y < 550 ? 'weishu' : y < 577 && /齐/.test(P) ? 'beiqishu' : 'zhoushu', 'beishi'); } else add(y < 479 ? 'songshu' : y < 502 ? 'nanqishu' : y < 557 ? 'liangshu' : 'chenshu', 'nanshi'); add('zizhitongjian'); }
  else if (y < 618) add('suishu', 'beishi', 'zizhitongjian'); else if (y < 907) add('jiutangshu', 'xintangshu', 'zizhitongjian', 'tanghuiyao');
  else if (y < 960) { if (/辽|契丹/.test(P)) add('liaoshi'); add('jiuwudaishi', 'xinwudaishi', 'zizhitongjian', 'wudaihuiyao'); }
  else if (y < 1127) { if (/辽|契丹/.test(P)) add('liaoshi'); else if (/金|女真/.test(P)) add('jinshi'); add('songshi', 'changbian', 'songhuiyao'); }
  else if (y < 1279) { if (/金|女真|齐/.test(P) && y <= 1234) add('jinshi'); else if (/蒙古|元/.test(P)) add('yuanshi'); add('songshi', y <= 1162 ? 'jianyanjilu' : 'xuzizhitongjian', 'songhuiyao'); if (y >= 1206 && !/蒙古|元/.test(P)) add('yuanshi'); }
  else if (y < 1368) add('yuanshi', 'xuzizhitongjian'); else if (y < 1644) add('mingshi', 'mingshilu', 'mingtongjian'); else add('qingshigao', 'qingshilu', 'huangchaowenxiantongkao');
  const x = String(said || ''), HY = y >= 1644 ? ['huangchaowenxiantongkao'] : y >= 1368 ? ['daminghuidian'] : y >= 960 ? ['songhuiyao'] : y >= 618 ? ['tanghuiyao'] : [];   /* 本朝会要（R-249）：问本朝的制度、赋役，补上本朝自己的政书 */
  const T = [[/科举|贡举|进士|察举|九品|铨选|官制|职官|品级|俸禄|考成|考课|磨勘|荫补|封赠/, y >= 1644 ? ['huangchaowenxiantongkao', 'tongdian'] : y >= 1368 ? ['daminghuidian', 'tongdian'] : ['tongdian', 'wenxiantongkao'].concat(HY)], [/赋税|两税|一条鞭|盐法|钱法|宝钞|铸钱|漕运|常平|义仓|徭役|丁银|摊丁|米价|荒政|赈济|饥|旱|蝗|茶马|市舶|榷/, y >= 1644 ? ['huangchaowenxiantongkao'] : y >= 1368 ? ['daminghuidian', 'wenxiantongkao'] : ['tongdian', 'wenxiantongkao'].concat(HY)], [/兵制|府兵|卫所|绿营|八旗|屯田|军器|阵法|火器|马政|练兵|战船|守城/, y >= 1550 && y < 1650 ? ['jixiaoxinshu', 'wujingzongyao'] : ['wujingzongyao', 'tongdian']], [/山川|关隘|渡口|里程|形胜|险要|城池|舆图|沿革|河工|治河|水利|河渠|堤堰/, ['dushifangyu', 'yuanhejunxian']], [/婚礼|丧礼|祭礼|冠礼|葬制|服丧|礼仪|朝仪|郊祀|宗庙/, ['tongdian', 'wenxiantongkao']], [/典故|掌故|成语|训诂|类书|故事|异闻|志怪|轶事|逸事|传说/, ['taipingyulan', 'yuhai', 'cefuyuangui']]];
  for (const [re, bs] of T) if (re.test(x)) add(...bs); return B.slice(0, 6); }
module.exports = { LIB_ZH, libTerms, libSnip, libScan, libBooksFor, POST_ALIAS, postAliasAll, postTitleOf, libNear };
