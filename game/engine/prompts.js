'use strict';
/**
 * 给大模型的提示词。规则来自 设计/05_GM提示词.md；这里按场合拼装。
 * 大模型只负责"写"：口吻、细节、额外来报；数值变化由引擎按事件卡结算，保证账目真实。
 */
const cal = require('./calendar');
const history = require('./history');

function base(s, scn) {
  const idn = scn.identities[s.identity];
  const g = scn.guard;
  return `你是一个历史世界的叙事者（GM）。玩家是${idn.name}，${idn.title}，${idn.age}岁，${idn.origin}。
当前：${cal.fmt(s.date, 'day')}，${idn.place}。

写作铁律：
1. 只写玩家能看见、听见、闻到、想起的东西。不替玩家说话、动作、做决定。
2. 正文里绝不出现考证、存疑、解释或争论（不写"据考""史载""一说""存疑"之类），不出戏。拿不准的细节，换一个拿得准的写，或者不写。
3. 不出现时代以后才有的人、事、地名、称谓、器物、词语。禁用：${g.banned.map(b => b.re).join('、')}。
   以下词在指定时间之前不得出现：${g.terms.map(t => `${t.re}（${t.why}）`).join('；')}。
4. 人物说话要合身份：皇帝称"官家"；臣下奏对用文言口吻；市井人家说白话。
5. 不编造史书没记的大事（一路、一州的大灾、朝廷大政）。只能使用下面"已发生的史事"，并且日期只写到它标注的精度。
6. 数字要么来自给定的数值表，要么不写具体数。

已发生的史事（GM 掌握，玩家不一定知道；不要把玩家这个身份听不到的事写成他知道）：
${history.knownFacts(s, scn, s.date).join('\n')}

人物卡：
${idn.people.map(p => `- ${p.name}（${p.age || ''}，${p.role}）立场：${p.stance}；性格：${p.temper}；私心：${p.want}；示例台词：${p.sample}；记忆：${(s.people[p.id]?.memory || []).slice(-6).join('；') || '无'}`).join('\n')}

数值：${idn.stats.map(x => `${x.label}=${s.stats[x.key]}${x.unit || ''}`).join('，')}`;
}

function bridge(s, scn, playerText, nextBeatText) {
  return {
    system: base(s, scn),
    user: `开场阶段。玩家刚才的动作是："${playerText}"。
请写一小段（40–120字）衔接：写出这个动作的直接结果（只写外界的反应，不写玩家的心理和台词），自然地过渡到下面这一拍的开头，但不要重复下面的内容。
下一拍开头：${nextBeatText.slice(0, 120)}……
只输出这段文字。`,
  };
}

function consult(s, scn, person, question, docket, pitches) {
  return {
    system: base(s, scn),
    user: `玩家找${person.name}商量。玩家问："${question || '（没有具体问题，让他说说眼下的事）'}"
案头上的事：
${docket.map(d => `【${d.title}】${d.text}`).join('\n')}
${person.name}会提的主意（必须保留它们的意思，可以换成他的口吻扩写）：
${pitches.map(p => `- 关于【${p.title}】：${p.label}。他的原话大意：${p.pitch}`).join('\n') || '（他对这些事没有主意，只说些家常或推托的话）'}
请用${person.name}的口吻回答，60–220字，只输出他说的话（可以带一两处他的小动作）。`,
  };
}

function polish(s, scn, text, executor) {
  const idn = scn.identities[s.identity];
  const kind = idn.idm === 'emperor' ? `一道给${executor}的诏敕或批答（北宋文书口吻，简洁）` :
    idn.idm === 'official' ? `一份给${executor}的札子或批示` : `一段对${executor}说的话（口语，合身份）`;
  return {
    system: base(s, scn),
    user: `把玩家的大白话改写成${kind}。只改写，不增加玩家没说的决定。
玩家的话：${text}
只输出改写后的文字。`,
  };
}

function resolve(s, scn, items, decision) {
  return {
    system: base(s, scn),
    user: `回合结算。玩家的决定（执行人：${decision.executor}）：
${decision.polished || decision.text || '（没有下任何决定）'}

案头各事和可选办法（id: 说明）：
${items.map(d => `【${d.uid}】${d.title}：${d.text}\n  办法：${d.approaches.map(a => `${a.id}: ${a.label}`).join('；')}`).join('\n')}

请判断玩家的决定对每件事用了哪个办法（没有处理就填 "ignore"；处理了但不属于任何办法就填 "custom"）。
对 custom 的，写一句执行回报，并给出不超过两项、每项绝对值不超过 5 的数值变化（键只能用：${scn.identities[s.identity].stats.map(x => x.key).join(',')}，人群用 g.键名：${scn.identities[s.identity].groups.map(x => x.key).join(',')}）。
输出 JSON：{"map":{"事的uid":"办法id"},"custom":{"事的uid":{"report":"…","eff":{"键":数}}},"color":"一到两句结算时的场景描写（只写外界）"}`,
  };
}

function extraDocket(s, scn, count) {
  const idn = scn.identities[s.identity];
  return {
    system: base(s, scn),
    user: `为这一回合再写 ${count} 份来报，补充案头。要求：
- 每份有具体的人、具体的事、期限；口吻随来人（${idn.idm === 'emperor' ? '奏状、札子' : '口信、传闻、上门'}）。
- 只能写日常尺度的事，或已发生史事在这个身份身边的回响；不得编造新的大事。
- 每份给 2–3 个可行办法，每个办法写出由哪个人物提出（人物 id：${idn.people.map(p => p.id + '=' + p.name).join('，')}）、他的一句原话、数值影响（每项绝对值不超过 6，键同上：${idn.stats.map(x => x.key).join(',')}，人群用 g.键名）、执行回报一句。
输出 JSON：{"items":[{"title":"","from":"","form":"","text":"","approaches":[{"id":"a","label":"","by":{"人物id":"原话"},"eff":{},"report":"","rumor":""}]}]}`,
  };
}

module.exports = { bridge, consult, polish, resolve, extraDocket };
