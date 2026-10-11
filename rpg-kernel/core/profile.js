'use strict';
/**
 * 个人面板：把「我是谁、有什么、能做什么」一页摆清楚。
 *   基本 / 名位（称号、职位、爵位、品级）/ 职权（能做与不能做）/ 钱财家产 / 兵马地盘 / 家人 / 人际 / 近来变化
 * 只摆存档里真有的东西；引擎估算的数字标明「估算」，查不到的写「未载」，不编。
 *
 * 回合里的变化：模型在 statusChanges 里申报（钱、粮、田、官职、爵位、健康……），采纳时由 applyStatusChanges 记账。
 */
const offices = require('./offices');

const TITLE_KEYS = ['职官', '差遣', '本官', '散官', '阶', '品级', '爵位', '封号', '勋', '加衔', '兵权', '尊号', '帝号'];
const WEALTH_KEYS = ['钱', '粮', '田', '宅', '仆从', '奴婢', '马', '俸禄', '债务', '其他产业'];

function kvList(obj) {
  return Object.entries(obj || {}).filter(([, v]) => v != null && String(v).trim() !== '' && typeof v !== 'object')
    .map(([k, v]) => ({ k, v: String(v) }));
}

/** 从「熙宁元年」拆出年号和在位第几年 */
function reignOf(yearLabel) {
  const m = String(yearLabel || '').match(/^(.+?)(元|[一二三四五六七八九十廿卅]+)[年载]$/);
  if (!m) return null;
  const CN = { 元: 1, 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
  let n = 0; const t = m[2];
  if (t === '元') n = 1;
  else if (t.length === 1) n = CN[t] || 0;
  else if (t[0] === '十') n = 10 + (CN[t[1]] || 0);
  else n = (CN[t[0]] || 0) * 10 + (t[1] === '十' ? (CN[t[2]] || 0) : (CN[t[1]] || 0));
  return { era: m[1], n };
}

function buildProfile(state) {
  const s = state || {};
  const p = s.protagonist || {};
  const c = s.clock || {};
  const idm = s.identityModule || 'commoner';
  const Y = Number(c.gregorianYear) || 0;
  let cap = null;
  try { cap = require('./capability').capabilityOf(s); } catch (_) { cap = null; }
  let fig = null;
  try { fig = require('./figure-data').FIGURES[p.name] || null; } catch (_) { fig = null; }

  // —— 基本 ——
  let age = cap && cap.age != null ? cap.age : p.age;
  if ((age == null || age === '') && fig && fig.born && Y) age = Y - fig.born + 1;
  const basic = [
    { k: '姓名', v: p.name || '未载' },
    fig && fig.courtesy ? { k: '字', v: fig.courtesy } : null,
    { k: '性别', v: p.gender || '未载' },
    { k: '年岁', v: p.ageUnknown && (age == null || age === '') ? '史无明载' : age != null && age !== '' ? `${age} 岁（虚岁）${p.birthYear || p.born || (fig && fig.born) ? `，生于公元 ${p.birthYear || p.born || fig.born} 年` : ''}` : '未载' },
    { k: '籍贯', v: p.nativePlace || (s.dossier && s.dossier.nativePlace) || '未载' },
    { k: '出身', v: s.mode === 'real' ? (fig && fig.knowledgeOnly ? '史载真人（档案由 AI 据正史推断，未联网核对）' : fig && fig.generated ? '史载真人（档案据检索资料整理）' : fig ? '史载真人（人工核验档案）' : '史载真人（尚未建档）') : '虚构人物' },
    fig && fig.father ? { k: '父', v: fig.father } : null,
    { k: '健康', v: p.health || (p.status === '已故' ? '已故' : '无恙') },
    p.fame ? { k: '名望', v: p.fame } : null,
    { k: '所在', v: (s.location && s.location.full) || '未载' },
    { k: '时间', v: `${c.yearLabel || ''}（公元 ${Y < 0 ? '前' + -Y : Y} 年）${require('./lunar').label(Number(c.month) || 1, Number(c.day) || 1, c.leap)}` },
  ].filter(Boolean);

  // —— 名位：称号与职位 ——
  const titles = [];
  const role = (cap && cap.role) || p.role || '';
  if (idm === 'emperor') {
    const rg = reignOf(c.yearLabel);
    titles.push({ k: '名位', v: `${(s.location && s.location.polity) || '本朝'}皇帝` });
    if (rg) titles.push({ k: '年号', v: `${rg.era}（今为${rg.era}${rg.n === 1 ? '元' : rg.n}年）` });
    titles.push({ k: '宫中称呼', v: Y >= 960 && Y < 1279 ? '官家' : (Y >= 618 && Y < 960 ? '圣人、大家' : '陛下、至尊') });
    titles.push({ k: '庙号 / 谥号', v: '身后才定，在世时不用' });
  }
  // 史载真人：按本年的官历列出爵位与职事（有史载的就不再重复列存档里的职衔）
  const figPosts = (fig && Array.isArray(fig.posts)) ? fig.posts.filter(ps => ps.from <= Y && (ps.to == null || ps.to >= Y)) : [];
  for (const ps of figPosts) if (!(idm === 'emperor' && /^皇帝$/.test(ps.title))) titles.push({ k: ps.kind === '爵' ? '爵位' : '官职', v: ps.title + (ps.note ? `（${ps.note}）` : ''), src: ps.src });
  if (idm !== 'emperor' && role && !figPosts.some(ps => ps.title === role)) titles.unshift({ k: idm === 'commoner' ? '身份 / 生业' : '职位', v: role });
  // 存档里写在「资源」下的官衔类条目（本官阶、官职……）归到名位里
  const TITLE_LIKE = /官|阶|职|爵|衔|品/;
  for (const { k, v } of kvList(s.resources)) {
    if (!TITLE_LIKE.test(k) || WEALTH_KEYS.includes(k)) continue;
    const dup = titles.findIndex(t => v.startsWith(t.v) || t.v.startsWith(v));
    if (dup >= 0) { if (v.length > titles[dup].v.length) titles[dup] = { k: titles[dup].k, v }; continue; }   // 同一职位只列一次，留说得更全的
    titles.push({ k, v });
  }
  for (const k of TITLE_KEYS) {
    const v = p.titles && p.titles[k];
    if (v) titles.push({ k, v: String(v) });
  }
  if (p.office && p.office !== role) titles.push({ k: '官职', v: p.office });

  // —— 职权 ——
  let powers = offices.powersOf(figPosts.map(x => x.title).join('、') || role, idm);
  if (powers.length > 3) powers = powers.filter(x => !/^没有实职时/.test(x));   // 有实职的宗室，不列「无实职」那条
  // 引擎的行为闸门：未成年时最要紧（能做/不能做）；成年人只列「不能做」的硬限制，皇帝不列
  const allowed = cap && cap.isMinor ? (cap.allowed || []) : [];
  const denied = idm === 'emperor' ? [] : ((cap && cap.denied) || []);

  // —— 钱财家产 ——
  const wealth = [];
  for (const k of WEALTH_KEYS) {
    const v = (p.wealth && p.wealth[k]) || (s.resources && s.resources[k]);
    if (v) wealth.push({ k, v: String(v) });
  }
  for (const { k, v } of kvList(s.resources)) if (!WEALTH_KEYS.includes(k) && !TITLE_LIKE.test(k)) wealth.push({ k, v });
  // 开局生成的家产：与已登记的同类项冲突时以已登记的为准，不重复列
  const hp = (s.household && s.household.property) || {};
  const have = new Set(wealth.map(w => w.k));
  const SAME = { 赀财: '钱', 奴婢: '仆从' };
  // 开局时 AI 已按身份给过家底的，就不再列引擎粗估的家产（两套数对不上，看着像假的）
  const hasOwn = WEALTH_KEYS.some(k => s.resources && s.resources[k]);
  if (!hasOwn) for (const { k, v } of kvList(hp)) if (!have.has(k) && !have.has(SAME[k])) wealth.push({ k: '家产·' + k + '（开局估）', v });

  // —— 兵马与地盘（引擎估算，标明） ——
  const force = [];
  const e = s.economy;
  if (e && ['warlord', 'official', 'emperor', 'noble'].includes(idm)) {
    const m = e.military || e.army || null;
    const total = m && (m.total ?? m.troops);
    if (total) force.push({ k: '可调兵马', v: `${total} 人（引擎按辖区量级估算）` });
    const gr = e.treasury || null;
    if (gr && (gr.grainShi || gr.cashGuan)) force.push({ k: '官仓 / 公帑', v: `${gr.grainShi ? '粮 ' + gr.grainShi + ' 石' : ''}${gr.cashGuan ? '，钱 ' + gr.cashGuan + ' 贯' : ''}（公家之物，不是你的私产；引擎按辖区估算）` });
  }
  for (const t of (s.territory || [])) if (t && t.place) force.push({ k: '地盘', v: `${t.place}（${t.controller || '未核实'}）` });

  // —— 家人 ——
  const family = ((s.household && s.household.members) || []).map(m => ({
    k: m.relation || '家人', v: `${m.name || '未载'}${m.age != null ? '，' + m.age + '岁' : ''}${m.status && m.status !== '在世' ? '，' + m.status : ''}`,
  }));

  // —— 人际（与你打过交道、有关系变化的人） ——
  const rel = (s.longline && s.longline.relations) || {};
  const people = Object.entries(rel).map(([name, r]) => {
    const v = r.value || 0;
    const word = v >= 4 ? '倚重' : v >= 2 ? '亲近' : v >= 1 ? '友善' : v <= -4 ? '仇怨' : v <= -2 ? '嫌隙' : v <= -1 ? '冷淡' : '平常';
    const last = (r.history || []).slice(-1)[0];
    return { k: name, v: `${word}（${v > 0 ? '+' : ''}${v}）${last ? '：' + last.reason : ''}` };
  });

  return {
    ok: true, identity: idm,
    sections: [
      { title: '基本', rows: basic },
      { title: idm === 'emperor' ? '名位与称号' : '名位 · 官职 · 爵位', rows: titles.length ? titles : [{ k: '名位', v: '无官无爵' }] },
      { title: '职权', rows: powers.map(x => ({ k: '·', v: x })).concat(allowed.slice(0, 4).map(x => ({ k: '可以', v: x }))).concat(denied.slice(0, 4).map(x => ({ k: '不能', v: x }))) },
      { title: '钱财与家产', rows: wealth.length ? wealth : [{ k: '钱财', v: '未登记（随剧情记账）' }] },
      force.length ? { title: '兵马与地盘', rows: force } : null,
      family.length ? { title: '家人', rows: family } : null,
      people.length ? { title: '人际', rows: people } : null,
      (s.statusLog || []).length ? { title: '近来变化', rows: s.statusLog.slice(-10).reverse().map(x => ({ k: `第${x.turn}轮`, v: `${x.item}：${x.from ? x.from + ' → ' : ''}${x.to}${x.why ? '（' + x.why + '）' : ''}` })) } : null,
    ].filter(Boolean),
  };
}

/** 采纳时：把模型申报的状态变化记进存档（钱财、名位、健康、名望） */
function applyStatusChanges(state, draft) {
  const list = Array.isArray(draft && draft.statusChanges) ? draft.statusChanges.slice(0, 8) : [];
  if (!list.length) return [];
  const p = state.protagonist = state.protagonist || {};
  const Y = Number(state.clock && state.clock.gregorianYear) || 0;
  const done = [];
  for (const ch of list) {
    const item = String((ch && (ch.项 || ch.item)) || '').trim();
    let to = String((ch && (ch.后 || ch.to)) || '').trim();
    const why = String((ch && (ch.原因 || ch.reason)) || '').trim();
    if (!item || !to || !why) continue;   // 没原因的不入账
    let from = '';
    if (TITLE_KEYS.includes(item) || /官|职|爵|号|阶|品|勋/.test(item)) {
      to = offices.fixTitle(to, Y).text;
      p.titles = p.titles || {};
      const key = TITLE_KEYS.includes(item) ? item : '职官';
      from = p.titles[key] || '';
      p.titles[key] = to;
      if (key === '职官' || key === '差遣') p.role = to;
    } else if (item === '健康') { from = p.health || ''; p.health = to; }
    else if (item === '名望') { from = p.fame || ''; p.fame = to; }
    else {
      state.resources = state.resources || {};
      from = state.resources[item] != null ? String(state.resources[item]) : '';
      state.resources[item] = to;
    }
    done.push({ turn: state.turn || 0, item, from, to, why: why.slice(0, 60) });
  }
  state.statusLog = (state.statusLog || []).concat(done).slice(-60);
  return done;
}

/** 提示词：主角眼下的名位、职权与家底（写他时以此为准） */
function renderProfileBlock(state) {
  const pf = buildProfile(state);
  const pick = t => (pf.sections.find(x => x.title.startsWith(t)) || { rows: [] }).rows;
  const names = pick('名位').map(r => `${r.k}：${r.v}`).join('；');
  const money = pick('钱财').map(r => `${r.k}：${r.v}`).join('；');
  const pw = pick('职权').map(r => r.v).slice(0, 6).join('；');
  return `=== 主角名位与家底（以此为准；有变化在 statusChanges 里申报） ===\n名位：${names || '无'}\n职权：${pw || '无'}\n钱财：${money || '未登记'}`;
}

module.exports = { buildProfile, applyStatusChanges, renderProfileBlock, TITLE_KEYS, WEALTH_KEYS };
