'use strict';
/**
 * 真人姓名登记：虚构人物不得与史载真人同名（玩家原话：「虚构的人物别跟其他真人撞上」）。
 *
 * 真人名单来自：本局已登记的真实人物、本地人物档案、当朝君主、引擎内置的历代名人表；
 * 联网时再查一次维基条目（连不上就跳过，不拖慢回合）。
 * 撞了名的虚构人物：换一个不撞的名字，正文里一并替换，并在「存疑」里记一笔。
 */
const fs = require('fs');
const path = require('path');

// 历代常见名人（帝王、宰辅、名将、文士）：虚构人物起名的禁区。不求全，只挡最容易撞的。
const FAMOUS = `
嬴政 扶苏 胡亥 李斯 赵高 蒙恬 蒙毅 王翦 王贲 章邯 陈胜 吴广 项羽 项梁 刘邦 萧何 张良 韩信 陈平 樊哙 曹参 周勃 吕雉 英布 彭越 范增
刘彻 卫青 霍去病 霍光 董仲舒 司马迁 张骞 苏武 李广 李陵 桑弘羊 汲黯 主父偃 刘秀 邓禹 马援 班超 班固 王莽 窦宪 梁冀 蔡伦 张衡 何进 董卓 袁绍 袁术
曹操 曹丕 曹植 刘备 关羽 张飞 赵云 诸葛亮 孙权 孙策 周瑜 鲁肃 吕蒙 陆逊 司马懿 司马昭 司马炎 荀彧 郭嘉 吕布 貂蝉 姜维 邓艾 钟会 魏延 马超 黄忠
王导 谢安 谢玄 桓温 王羲之 陶渊明 苻坚 王猛 刘裕 拓跋珪 拓跋焘 元宏 萧衍 萧统 萧纲 萧绎 萧纪 侯景 陈霸先 高欢 宇文泰 杨坚 杨广 独孤信
李渊 李世民 李建成 李元吉 魏征 房玄龄 杜如晦 长孙无忌 尉迟恭 秦琼 程咬金 李靖 李勣 武则天 狄仁杰 上官婉儿 李隆基 杨玉环 杨国忠 李林甫 安禄山 史思明 郭子仪 李光弼 颜真卿 李白 杜甫 王维 白居易 韩愈 柳宗元 黄巢 朱温 李克用
赵匡胤 赵光义 赵普 寇准 范仲淹 欧阳修 包拯 王安石 司马光 苏轼 苏辙 苏洵 赵顼 赵佶 蔡京 童贯 高俅 岳飞 秦桧 韩世忠 宗泽 李纲 辛弃疾 陆游 朱熹 文天祥 陆秀夫 贾似道
铁木真 成吉思汗 忽必烈 窝阔台 蒙哥 耶律楚材 脱脱 朱元璋 朱棣 朱允炆 徐达 常遇春 刘基 李善长 胡惟庸 蓝玉 于谦 王守仁 严嵩 海瑞 张居正 戚继光 朱翊钧 魏忠贤 袁崇焕 朱由检 李自成 张献忠 吴三桂 史可法 郑成功
努尔哈赤 皇太极 多尔衮 福临 玄烨 胤禛 弘历 和珅 纪昀 曾国藩 李鸿章 左宗棠 林则徐 洪秀全 慈禧 光绪 袁世凯 康有为 梁启超 孙文
`.split(/\s+/).filter(Boolean);
const FAMOUS_SET = new Set(FAMOUS);

/** 本地人物档案里的真人；给了年份就只取那时在世（或生卒不详）的，免得把别的朝代的人列成「本局真人」 */
function localFigureNames(year) {
  const out = [];
  const Y = Number(year) || 0;
  const alive = f => !Y || !f || ((f.born == null || f.born <= Y) && (f.died == null || f.died >= Y));
  let FIG = {};
  try { FIG = require('./figure-data').FIGURES || {}; } catch (_) { FIG = {}; }
  for (const [n, f] of Object.entries(FIG)) if (alive(f)) out.push(n);
  try {
    const dir = path.join(__dirname, '..', 'data', 'figures');
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith('.json') || f.startsWith('_')) continue;
      const n = f.replace(/\.json$/, '');
      if (out.includes(n)) continue;
      let fig = FIG[n];
      if (!fig) { try { const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); fig = j.figure || j; } catch (_) { fig = null; } }
      if (!Y || (fig && alive(fig))) out.push(n);
    }
  } catch (_) { /* 无 */ }
  return out;
}

/** 本局的真人名单 */
function realNamesOf(state) {
  const set = new Set(FAMOUS_SET);
  // 撞名检查用全部（任何朝代的真人名都不该借给虚构人物）
  for (const n of localFigureNames()) set.add(n);
  const s = state || {};
  for (const n of (s.npcs || [])) if (n && n.name && /historical|real|真实/.test(String(n.source || ''))) set.add(n.name);
  if (s.mode === 'real' && s.protagonist && s.protagonist.name) set.add(s.protagonist.name);
  const sov = String(s.reigningSovereign || '');
  const m = sov.match(/[一-龥]{2,4}$/); if (m) set.add(m[0]);
  for (const p of ((s.archive && s.archive.persons) || [])) { const v = (p && p.value) || p; if (v && v.name) set.add(v.name); }
  return set;
}

/** 维基上有没有这个人的条目（连不上就当「查不到」，不拖慢回合） */
async function onWiki(name) {
  try {
    const u = `https://zh.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&redirects=1&format=json&titles=${encodeURIComponent(name)}`;
    const r = await require('./net').fetchX(u, { headers: { 'User-Agent': 'PivotEngine/0.1 (history-rpg)' }, signal: AbortSignal.timeout(6000) });
    if (!r.ok) return false;
    const j = await r.json();
    const pages = (j && j.query && j.query.pages) || {};
    return Object.values(pages).some(p => p && p.extract && /（[^）]*\d{1,4}年|[，,]\s*(字|号)|皇帝|大臣|将领|诗人|官员|人物/.test(p.extract.slice(0, 200)));
  } catch (_) { return false; }
}

/** 换一个不撞名的名字：保留原姓，换名 */
function renameAvoiding(name, gender, taken) {
  const { fakeName } = require('./quickstart');
  const surname = String(name || '').slice(0, /^(欧阳|司马|诸葛|上官|长孙|尉迟|独孤|宇文|慕容|皇甫|令狐|东方|夏侯|公孙)/.test(name) ? 2 : 1);
  for (let i = 0; i < 40; i++) {
    const n = surname + fakeName(gender).slice(1);
    if (!taken.has(n) && n !== name) return n;
  }
  return name + '（虚构）';
}

/**
 * 检查本回合新登场的虚构人物有没有和真人撞名；撞了就改名并替换正文。
 * 返回 [{ from, to, why }]
 */
async function fixDraftCollisions(state, draft, { online = true } = {}) {
  const fixes = [];
  if (!draft || !Array.isArray(draft.newNpcs) || !draft.newNpcs.length) return fixes;
  const real = realNamesOf(state);
  const taken = new Set([...real, ...((state.npcs || []).map(n => n && n.name).filter(Boolean))]);
  let checked = 0;
  for (const n of draft.newNpcs) {
    if (!n || !n.name || /historical|real|真实/.test(String(n.source || ''))) continue;
    let why = '';
    if (real.has(n.name)) why = '与史载真人同名';
    else if (online && checked < 3 && n.name.length >= 2) { checked++; if (await onWiki(n.name)) why = '与维基上的历史人物同名'; }
    if (!why) continue;
    const to = renameAvoiding(n.name, n.gender, taken);
    taken.add(to);
    fixes.push({ from: n.name, to, why });
  }
  for (const f of fixes) {
    const swap = v => (typeof v === 'string' ? v.split(f.from).join(f.to) : v);
    draft.scene = swap(draft.scene);
    draft.turnSummary = swap(draft.turnSummary);
    draft.pendingDecision = swap(draft.pendingDecision);
    for (const n of draft.newNpcs) if (n && n.name === f.from) n.name = f.to;
    for (const n of (draft.presentNpcs || [])) if (n && n.name === f.from) n.name = f.to;
    draft.doubts = (Array.isArray(draft.doubts) ? draft.doubts : []).concat([`虚构人物「${f.from}」${f.why}，已改名为「${f.to}」`]);
  }
  return fixes;
}

/** 提示词：本局里不得给虚构人物用的名字（只列本局相关的真人，太长没用） */
function renderRealNameRule(state) {
  // 列给模型看的只放「此时在世」的本局真人
  const Y = state && state.clock && state.clock.gregorianYear;
  const eraNames = new Set(localFigureNames(Y));
  const local = [...realNamesOf(state)].filter(n => !FAMOUS_SET.has(n) && (eraNames.has(n) || !localFigureNames().includes(n))).slice(0, 40);
  return '【虚构人物与真人】虚构人物不得与任何史载真人同名，也不得被写成真人的亲属、门生、部属、旧交（玩家指定的除外）；'
    + '虚构的小人物不会轻易见到帝王、宰执、名将，真人只出现在史载他此时所在之处。'
    + (local.length ? `本局已登记的真人：${local.join('、')}——这些名字只能指他们本人。` : '');
}

module.exports = { FAMOUS, realNamesOf, fixDraftCollisions, renderRealNameRule, renameAvoiding, onWiki };
