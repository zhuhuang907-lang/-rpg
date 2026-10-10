'use strict';
/**
 * 主要游戏规则（与 设计/07_游戏规则.md 对应）：
 *   一、生老病死：过年长一岁；身体随年岁与操劳下滑；会生病；身体见底或寿终即死，局终。开局保护期内不死。
 *   二、把握：每个办法有把握（稳 / 有把握 / 五五 / 难），掷骰定成败；相关数值高，把握就大。失败照"失败"结算。
 *   三、志向：开局选一至三个长远志向，办法可推进志向；志向达成记入生涯，可选择就此收场或接着过。
 *   四、身份转变：升迁、贬谪、出嫁、出家、入狱……都改写身份与回合长度，记入生涯。
 *   五、收场：死亡、志向达成后收场、主动归隐（玩家选择）。收场后写一段生平。
 */
const cal = require('./calendar');

const ODDS = { 稳: 0.92, 有把握: 0.72, 五五: 0.5, 难: 0.28 };
const PROTECT_TURNS = 6;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** 成败判定：返回 { ok, p }；没写把握的办法一律成功 */
function roll(s, a, rand) {
  if (!a.odds || !ODDS[a.odds]) return { ok: true, p: 1 };
  let p = ODDS[a.odds];
  if (a.oddsStat && s.stats[a.oddsStat] != null) p += (s.stats[a.oddsStat] - 50) / 250;
  p = clamp(p, 0.05, 0.97);
  return { ok: rand() < p, p };
}

function oddsWord(p) {
  return p >= 0.85 ? '稳' : p >= 0.65 ? '有把握' : p >= 0.4 ? '五五' : '难';
}

/** 过年：长一岁，身体随年岁变化；返回要上案头的"人事"（生病）或收场 */
function yearTick(s, prevDate, rand) {
  const out = { events: [], ending: null };
  if (!prevDate || prevDate.y === s.date.y) return out;
  s.age += 1;
  s.career.push({ date: s.dateLabel, text: `${s.age}岁` , kind: 'age' });
  const hk = 'health';
  if (s.stats[hk] == null) return out;
  // 年岁带来的衰退
  const decline = s.age < 40 ? 0 : s.age < 55 ? 2 : s.age < 65 ? 5 : s.age < 75 ? 9 : 14;
  s.stats[hk] = clamp(s.stats[hk] - Math.round(decline * (0.6 + rand() * 0.8)), 0, 100);
  // 生病
  const pSick = clamp(0.04 + Math.max(0, s.age - 40) * 0.006 + (100 - s.stats[hk]) * 0.004, 0, 0.6);
  if (rand() < pSick) out.events.push('illness');
  // 寿终
  const pDie = s.age < 55 ? 0 : clamp((s.age - 55) * 0.012 * (1.2 - s.stats[hk] / 120), 0, 0.5);
  if (s.turn > PROTECT_TURNS && rand() < pDie) out.ending = { kind: 'death', why: `${s.age}岁，寿终` };
  return out;
}

/** 依史模式：真实人物到了史载卒年即故去；推演模式：只是更容易生病 */
function historicalDeath(s, death) {
  if (!death || !death.y) return null;
  const due = s.date.y > death.y || (s.date.y === death.y && s.date.m >= (death.m || 12));
  if (!due) return null;
  if (s.mode === 'free') { s.stats.health = Math.max(0, (s.stats.health || 50) - 10); return null; }
  return { kind: 'death', why: '依史，于此时故去' };
}

/** 每回合：身体见底即死（保护期内留一口气） */
function checkDeath(s) {
  if (s.stats.health == null) return null;
  if (s.stats.health > 0) return null;
  if (s.turn <= PROTECT_TURNS) { s.stats.health = 5; return null; }
  return { kind: 'death', why: '病重不起' };
}

/** 生病的事件卡（本地兜底；接了大模型会写得更具体） */
function illnessCard(s, w) {
  const near = (w.identity.people || []).find(p => p.present !== false) || { id: '', name: '家人' };
  return {
    title: '病了', from: near.name, form: '床前', deadline: 0, type: '人事',
    text: s.age >= 55 ? '入冬以后咳嗽一直不见好，夜里常常咳醒，身上发虚。' : '这几天发热、头疼，饭也吃不下。',
    approaches: [
      { id: 'doctor', label: '请大夫，好好养几天', kw: ['大夫', '医', '养', '药'], by: near.id ? { [near.id]: '"请个大夫来看看吧，别硬撑。"' } : {}, eff: { health: 12 }, report: '大夫开了药，躺了几日，渐渐好了。', rumor: '' },
      { id: 'endure', label: '硬撑着，照常做事', kw: ['撑', '照常'], by: {}, eff: { health: -10 }, odds: '五五', fail: { eff: { health: -20 }, report: '撑了几天，终于倒下了。' }, report: '撑过去了，只是人瘦了一圈。', rumor: '' },
    ],
    ignore: { eff: { health: -8 } },
  };
}

/** 应用办法上的规则字段：志向推进、身份转变、收场 */
function applyRuleFields(s, a, dateLabel) {
  const notes = [];
  if (a.goal && s.goals) {
    for (const [gid, d] of Object.entries(a.goal)) {
      const g = s.goals.find(x => x.id === gid);
      if (!g || g.done) continue;
      g.progress = clamp(g.progress + Number(d || 0), 0, 100);
      if (g.progress >= 100) { g.done = true; g.doneAt = dateLabel; notes.push({ kind: 'goal', text: `志向达成：${g.text}` }); s.career.push({ date: dateLabel, text: `志向达成：${g.text}`, kind: 'goal' }); }
    }
  }
  if (a.become && typeof a.become === 'object') {
    const b = a.become;
    s.persona = { ...s.persona, ...Object.fromEntries(Object.entries(b).filter(([k, v]) => ['title', 'place', 'idm', 'unit', 'name'].includes(k) && v)) };
    s.career.push({ date: dateLabel, text: `身份转变：${b.title || ''}${b.place ? '（' + b.place + '）' : ''}`, kind: 'identity' });
    notes.push({ kind: 'identity', text: `身份转变：${b.title || ''}` });
  }
  if (a.ending) notes.push({ kind: 'ending', text: String(a.ending) });
  return notes;
}

function endingText(s, w, ending) {
  const name = (s.persona && s.persona.name) || w.identity.name;
  const done = (s.goals || []).filter(g => g.done).map(g => g.text);
  const lines = [
    `${name}，${w.identity.origin || ''}人。`,
    `生于${cal.era(s.birthYear, w.eras).label}前后，${ending.kind === 'death' ? '卒' : '收场'}于${s.dateLabel}，年${s.age}。`,
    ...s.career.filter(c => c.kind !== 'age').slice(-8).map(c => `${c.date}，${c.text}。`),
    done.length ? `平生所愿，成者：${done.join('；')}。` : '平生所愿，未竟。',
  ];
  return lines.join('\n');
}

module.exports = { roll, oddsWord, yearTick, checkDeath, historicalDeath, illnessCard, applyRuleFields, endingText, ODDS, PROTECT_TURNS };
