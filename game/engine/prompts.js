'use strict';
/**
 * 给大模型的提示词（规则来自 设计/05_GM提示词.md 与 设计/07_游戏规则.md）。
 * 大模型只负责"写"：口吻、细节、来报与办法；数值由引擎结算并夹在上下限之内，保证账目真实。
 */
const cal = require('./calendar');
const history = require('./history');

function persona(s, w) {
  return { ...w.identity, ...(s.persona || {}) };
}

function base(s, w) {
  const idn = persona(s, w);
  const g = w.guard;
  const ppl = w.identity.people.concat(s.extraPeople || []);
  return `你是一个历史世界的叙事者。主角：${idn.name}，${idn.title}，${s.age}岁，${idn.origin || ''}${idn.gender ? '，' + idn.gender : ''}。
当前：${cal.fmt(s.date, 'day', w.eras)}（${w.dynasty || ''}），${idn.place}。

写作铁律：
1. 只写主角能看见、听见、闻到、想起的东西。不替主角说话、动作、做决定。
2. 正文里绝不出现考证、存疑、解释或争论，不出戏，不出现公元纪年。拿不准的细节换一个拿得准的写，或者不写。
3. 不出现时代以后才有的人、事、地名、官名、称谓、器物、词语。本局禁用：${g.banned.slice(0, 30).map(b => b.re).join('、')}。
   以下词在指定时间前不得出现：${g.terms.slice(0, 40).map(t => `${t.re}（${t.why}）`).join('；') || '无'}。
4. 人物说话合身份与时代：上奏用文书口吻，市井人家说白话。
5. 不编造史书没记的大事（一路一州的大灾、朝廷大政、战事、改元）。大事只能用下面"已发生的史事"，日期只写到它标注的精度。
6. 数字要么来自数值表，要么不写具体数。

背景要点：
${(w.facts || []).slice(0, 15).map(f => '- ' + f.text).join('\n') || '无'}

已发生的史事（叙事者掌握；主角不知道的不要写成他知道）：
${history.knownFacts(s, w, s.date).join('\n') || '无'}

人物卡：
${ppl.map(p => `- [${p.id}] ${p.name}（${p.age || ''}，${p.role}）立场：${p.stance}；性格：${p.temper}；私心：${p.want}；会出卖主角的条件：${p.betray || '无'}；对主角的好感：${(s.people[p.id] || {}).favor ?? 50}；记得：${((s.people[p.id] || {}).memory || []).slice(-5).join('；') || '无'}`).join('\n')}

数值：${idn.stats.map(x => `${x.key}（${x.label}）=${s.stats[x.key]}${x.unit || ''}`).join('，')}
人群：${idn.groups.map(x => `g.${x.key}（${x.label}）=${s.groups[x.key]}`).join('，')}
志向：${(s.goals || []).map(g => `[${g.id}] ${g.text} ${g.progress}%${g.done ? '（已成）' : ''}`).join('；') || '无'}
前情提要：${(s.recaps || []).slice(-3).map(r => r.text).join(' ') || '刚开局'}
最近发生的：${s.story.slice(-10).map(e => (e.title ? '【' + e.title + '】' : '') + String(e.text || '').slice(0, 60)).join(' / ')}`;
}

function bridge(s, w, playerText, nextBeatText) {
  return {
    system: base(s, w),
    user: `开场阶段。主角刚才的动作是："${playerText}"。
写一小段（40–120字）衔接：写这个动作之后外界的反应（不写主角的心理和台词），自然过渡到下一拍的开头，但不重复下一拍的内容。
下一拍开头：${String(nextBeatText).slice(0, 120)}……
只输出这段文字。`,
  };
}

function consult(s, w, person, question, docket, pitches) {
  return {
    system: base(s, w),
    user: `主角找${person.name}商量。主角问："${question || '（没有具体问题，让对方说说眼下的事）'}"
案头上的事：
${docket.map(d => `【${d.title}】${d.text}`).join('\n')}
${person.name}会提的主意（必须保留意思，可以换成他的口吻扩写）：
${pitches.map(p => `- 关于【${p.title}】：${p.label}。原话大意：${p.pitch}`).join('\n') || '（对这些事没有主意，只说家常或推托）'}
用${person.name}的口吻回答，60–220字，只输出他说的话（可以带一两处他的小动作）。他有私心，说话可以只说一半。`,
  };
}

function polish(s, w, text, executor) {
  const idn = persona(s, w);
  const kind = idn.idm === 'emperor' ? `一道给${executor}的诏敕或批答（当朝文书口吻，简洁）`
    : ['official', 'military', 'noble'].includes(idn.idm) ? `一份给${executor}的札子、批示或军令（当朝口吻）`
      : `一段对${executor}说的话（口语，合身份）`;
  return {
    system: base(s, w),
    user: `把主角的大白话改写成${kind}。只改写，不增加主角没说的决定。
主角的话：${text}
只输出改写后的文字。`,
  };
}

const ITEM_SCHEMA = `{"title":"四到八字","from":"谁带来","form":"奏状/口信/上门/传闻……","type":"人事|回响|人群|天时|日常","text":"80–200字，当时口吻，有具体的人、数、期限","deadline":0,
 "approaches":[{"id":"a","label":"办法","by":{"人物id":"他的一句原话"},"eff":{"数值键":0,"g.人群键":0},"odds":"稳|有把握|五五|难（可省）","oddsStat":"数值键（可省）",
   "fail":{"eff":{},"report":""},"report":"执行回报一句","rumor":"风声一句（可空）","then":[{"hook":"这件事一两回合后会怎样找回来","after":2}],
   "goal":{"志向id":10},"become":{"title":"身份转变后的头衔（极少用）"},"region":{"地名":{"近况":""}}}],
 "truth":"只给叙事者看的真相（来报里谁在说谎、隐藏的后果）"}`;

function turnDocket(s, w, count, ctx) {
  const idn = persona(s, w);
  return {
    system: base(s, w),
    user: `第 ${s.turn} 回合（一回合＝${{ xun: '一旬', month: '一月', season: '一季' }[idn.unit]}）。为主角的案头写 ${count} 份来报。
${ctx.hooks.length ? `必须把这些伏笔写成"回响"来报（到期了）：\n${ctx.hooks.map(h => '- ' + h.text).join('\n')}` : ''}
${ctx.alerts.length ? `必须写一份"人群"来报，因为：${ctx.alerts.join('；')}` : ''}
${ctx.illness ? '必须写一份主角生病的来报（人事）。' : ''}
案头上已经有的（不要重复）：${ctx.existing.join('、') || '无'}
要求：
- 每份有具体的人、具体的事、期限；口吻随来人；可以说谎（真相写进 truth）。
- 只写日常尺度的事、身边人的事、已发生史事在主角身边的回响；不得编造新的大事。
- 每份 2–3 个办法；by 的键只能用人物卡里的 id（或你在 newPeople 里新加的人）；eff 每项绝对值不超过 12，键只能用：${idn.stats.map(x => x.key).join(',')}，人群用 g.${idn.groups.map(x => x.key).join(',g.')}。
- 有风险的办法写 odds 与 fail；会留下后患的写 then（after 为回合数 1–4）；能推进志向的写 goal。
- 至少一份来报跟主角的志向或主角最在意的人有关。
- 需要新的身边人物（虚构，不得与史载人物同名）就放进 newPeople。
输出 JSON：{"items":[${ITEM_SCHEMA}],"newPeople":[{"id":"英文小写","name":"","age":0,"role":"","stance":"","temper":"","sample":"","want":"","betray":""}]}`,
  };
}

function resolve(s, w, items, decision) {
  const idn = persona(s, w);
  return {
    system: base(s, w),
    user: `回合结算。主角的决定（交给：${decision.executor}）：
${decision.polished || decision.text || '（没有下任何决定）'}

案头各事和可选办法（id: 说明）：
${items.map(d => `【${d.uid}】${d.title}：${d.text}\n  办法：${d.approaches.map(a => `${a.id}: ${a.label}`).join('；')}`).join('\n')}

1. 判断主角对每件事用了哪个办法（没处理填 "ignore"；处理了但不属于任何办法填 "custom"）。
2. custom 的，写一句执行回报，给不超过两项、每项绝对值不超过 6 的数值变化。
3. 主角的决定里如果有与案头无关的自主行动（出门找人、做买卖、读书、托关系……），写进 free：回报一句、数值变化（同上限）、可能的后患 hook 与回合数。
4. 写一到两句结算时的场景（只写外界）。
数值键：${idn.stats.map(x => x.key).join(',')}；人群：g.${idn.groups.map(x => x.key).join(',g.')}
输出 JSON：{"map":{"事的uid":"办法id"},"custom":{"事的uid":{"report":"","eff":{}}},"free":[{"report":"","eff":{},"hook":"","after":2}],"color":""}`,
  };
}

function recap(s, w, entries) {
  return {
    system: '你是史官，用简洁的白话写前情提要。',
    user: `把下面这段经历压缩成 80–150 字的前情提要（谁、做了什么、留下了什么悬念），不写评论：
${entries.map(e => `${e.date}${e.title ? '【' + e.title + '】' : ''}${String(e.text || '').slice(0, 120)}`).join('\n')}`,
  };
}

function biography(s, w, ending) {
  const idn = persona(s, w);
  return {
    system: base(s, w),
    user: `主角的一生到此收场（${ending.why || ending.kind}）。用当时的史传笔法写一篇 150–300 字的小传：籍贯、生平大事、志向成败、身后。只依据生涯记录，不编造。
生涯：${s.career.filter(c => c.kind !== 'age').map(c => c.date + ' ' + c.text).join('；')}
志向：${(s.goals || []).map(g => g.text + (g.done ? '（成）' : '（未成）')).join('；')}
只输出小传正文。`,
  };
}

module.exports = { bridge, consult, polish, turnDocket, resolve, recap, biography, persona };
