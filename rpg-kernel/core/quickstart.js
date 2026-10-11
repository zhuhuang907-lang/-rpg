'use strict';
/**
 * 一句话开局：把玩家的一句话（「万历年间苏州的绣娘」「1068年的宋神宗」「随便」）
 * 拆成 createCustomSave 要的开局设定，然后走原来的「建档 → 生成世界」。
 *
 * 拆法：先用规则抽出明确的公元年和朝代；其余交给当前选定的模型；模型给的年号再用 reign.resolveGregorian 复核。
 * 「随便」：从规则包的 16 个朝代预设里随机挑一个时刻，再随机挑一种身份视角。
 */
const reign = require('./reign');

const IDMS = ['emperor', 'noble', 'official', 'warlord', 'commoner'];
const ROLE_DEFAULT = {
  emperor: era => `${era.polity && era.polity !== '（未核实）' ? era.polity : '本朝'}皇帝`,
  noble: () => '宗室 / 世家贵族',
  official: () => '朝廷命官',
  warlord: () => '一方军阀',
  commoner: () => '平民',
};
// 随机开局时的身份：视角 + 一句具体身份（地点留空，由引擎按时代真实行政中心补）
const RANDOM_ROLES = [
  ['commoner', '佃农'], ['commoner', '城里小铺的掌柜'], ['commoner', '农家女'], ['commoner', '走街串巷的货郎'],
  ['commoner', '寺里的小沙弥'], ['commoner', '码头的脚夫'], ['official', '县衙里的书吏'], ['official', '新到任的知县'],
  ['official', '州里的通判'], ['official', '京中的中下级官员'], ['noble', '没落宗室子弟'], ['noble', '世家的庶子'],
  ['warlord', '边镇的裨将'], ['warlord', '一方军阀'], ['emperor', ''],
];
// 天文纪年不用：这里的公元前写负数（-200 = 公元前200年），与规则包一致
const DYN = [
  ['秦', -221, -207], ['汉', -206, 8], ['新', 9, 23], ['汉', 25, 219], ['魏', 220, 265], ['晋', 266, 419],
  ['宋', 420, 478], ['齐', 479, 501], ['梁', 502, 556], ['陈', 557, 588], ['隋', 589, 617], ['唐', 618, 906],
  ['后梁', 907, 922], ['后唐', 923, 935], ['后晋', 936, 946], ['后汉', 947, 950], ['后周', 951, 959],
  ['宋', 960, 1278], ['元', 1279, 1367], ['明', 1368, 1643], ['清', 1644, 1911],
];
function polityOf(y) { const d = DYN.find(([, a, b]) => y >= a && y <= b); return d ? d[0] : ''; }
// 年号表里不记结束年的少数短年号
const SHORT = { 二世: -207, 始皇: -210 };

const RANDOM_WORDS = /^(随便|随机|都行|无所谓|你定|来一个|随便来一个|随便来个)?[。！!.\s]*$/;

function pick(arr, r = Math.random) { return arr[Math.floor(r() * arr.length)]; }

// 虚构主角起名：常见姓 + 按性别取的字（模型没给名字时兜底，免得档案里写「未命名」）
const SURNAMES = '王李张刘陈杨赵黄周吴徐孙胡朱高林何郭马罗梁宋郑谢韩唐冯于董萧程曹袁邓许傅沈曾彭吕苏卢蒋蔡贾丁魏薛叶阎余潘杜戴夏钟汪田任姜范方石姚谭廖邹熊金陆郝孔白崔康毛邱秦江史顾侯邵孟龙万段钱汤尹黎易常武乔贺赖龚文'.split('');
const MALE = '安伯昌诚大德鼎方福刚广贵汉和宏怀继嘉金敬钧克宽立良茂明铭谦清仁荣善绍守寿顺泰廷文武贤兴秀延毅永有元正之志忠'.split('');
const FEMALE = '爱宝翠春黛凤桂寒荷蕙娟兰丽莲玲梅妙巧琴秋蓉蕊素婉霞香秀雪燕瑶怡英莹玉月云芸珍贞'.split('');
function fakeName(gender, r = Math.random) {
  const g = gender === '女' ? FEMALE : MALE;
  return pick(SURNAMES, r) + pick(g, r) + (r() < 0.6 ? pick(g, r) : '');
}
/** 把句子里的时间去掉，剩下「苏州的绣娘」→ 地点「苏州」、身份「绣娘」 */
function splitRolePlace(text) {
  let t = String(text || '')
    .replace(/(公元前?|前)?\s*\d{1,4}\s*年(间)?/g, '')
    .replace(/^[东西南北]?[秦汉魏晋隋唐宋元明清]+(朝|代|末年|初年|中期|末|初|年间|时期|时)+/, '')
    .replace(new RegExp('^(' + reign.REIGNS.map(r => r[0]).filter(n => n.length >= 2).sort((a, b) => b.length - a.length).join('|') + ')(元|[一二三四五六七八九十百廿卅\\d]+)?\\s*(年间|年|间|初|末)'), '')
    .replace(/^(的|时|时候|，|,|\s)+/, '').replace(/^(我是|我想当|我要当|当|做|一个|一名|一位)+/, '').trim();
  const m = t.match(/^(.{2,8}?)(?:的|里的|城里的|乡下的)(.{1,16})$/);
  if (m && !/[人家户]$/.test(m[1])) return { place: m[1], role: m[2] };
  return { place: '', role: t };
}

const CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
function cnNum(n) {
  if (n === 1) return '元';
  if (n < 10) return CN[n];
  if (n < 20) return '十' + CN[n - 10];
  return CN[Math.floor(n / 10)] + '十' + CN[n % 10];
}
/** 公元年 → 年号纪年（用 reign.REIGNS：取起始年不晚于该年的最近一个年号；三国等并立时期只是近似） */
function reignLabel(y) {
  let best = null;
  for (const [name, start] of reign.REIGNS) if (start <= y && (!best || start >= best[1])) best = [name, start];
  if (!best || y - best[1] > 70) return '';
  if (SHORT[best[0]] != null && y > SHORT[best[0]]) return '';
  return `${best[0]}${cnNum(y - best[1] + 1)}年`;
}
/** 句子里提到的年号：「万历十五年」直接换算；「万历年间」取这个年号中间的一年 */
function reignInText(text) {
  // 只有年号后面真跟着年数（元年、十五年）才算具体年份；「万历年间」不算
  if (/(元|[一二三四五六七八九十百廿卅\d]+)\s*[年载]/.test(text)) {
    const rg = reign.resolveGregorian(text, '');
    if (rg && rg.year && rg.fromReign !== false && rg.reign && new RegExp(rg.reign + '(元|[一二三四五六七八九十百廿卅\\d]+)\\s*[年载]').test(text)) return { year: rg.year, label: '' };
  }
  const names = reign.REIGNS.map((r, i) => [r[0], r[1], i]).filter(([n]) => n.length >= 2 && text.includes(n)).sort((a, b) => b[0].length - a[0].length);
  if (!names.length) return null;
  const [name, start, i] = names[0];
  const next = reign.REIGNS[i + 1];
  const end = next && next[1] > start ? next[1] - 1 : start + 10;
  return { year: Math.round((start + end) / 2), label: '' };
}

/** 规则抽取：公元年、「公元前」、朝代名（单字朝代必须后跟 朝/代/末/初/年间，免得「清晨」「明白」被认成朝代） */
function ruleParse(text, presets) {
  const out = {};
  const bc = text.match(/(公元前|前)\s*(\d{1,3})\s*年/);
  const ad = text.match(/(?:公元)?(\d{3,4})\s*年/);
  if (bc) out.gregorianYear = -Number(bc[2]);
  else if (ad && Number(ad[1]) > 100) out.gregorianYear = Number(ad[1]);
  const t2 = text.replace(/公元前?/g, '');
  const dyns = [...new Set(presets.map(p => p.dynasty))].sort((a, b) => b.length - a.length);
  out.dynasty = dyns.find(n => (n.length > 1 && t2.includes(n)) || new RegExp(`(^|[^公])${n[n.length - 1]}(朝|代|末|初|年间|时)`).test(t2) && n.length === 1) || '';
  if (!out.dynasty) {
    if (/汉末|东汉/.test(t2)) out.dynasty = '东汉';
    else if (/汉朝|汉代|西汉/.test(t2)) out.dynasty = '西汉';
    else if (/南宋|宋末/.test(t2)) out.dynasty = '南宋';
    else if (/宋朝|宋代|北宋/.test(t2)) out.dynasty = '北宋';
  }
  if (/[女娘妇婢姬妃嫔]|小姐|姑/.test(text)) out.gender = '女';
  return out;
}

/** 随机一局 */
function randomSpec(pack, r = Math.random) {
  const preset = pick(pack.eraPresets, r);
  const [idm, role] = pick(RANDOM_ROLES, r);
  // 皇帝视角用预设里的真君主（引擎按年代核定），其余随机起一个虚构的名字
  const gender = /女|妇|娘/.test(role) ? '女' : '男';
  return toSpec(pack, { preset, identityModule: idm, role: role || ROLE_DEFAULT[idm](preset), mode: idm === 'emperor' ? 'real' : 'fictional',
    name: idm === 'emperor' ? '' : fakeName(gender, r), gender, age: idm === 'emperor' ? null : 18 + Math.floor(r() * 25) });
}

function toSpec(pack, p) {
  const preset = p.preset || {};
  const era = {
    id: preset.id || null,
    yearLabel: p.yearLabel != null ? p.yearLabel : (preset.yearLabel || ''),
    gregorianYear: Number.isFinite(p.gregorianYear) ? p.gregorianYear : (preset.gregorianYear || 0),
    polity: p.polity || preset.polity || '',
    month: p.month || preset.month || 1,
    day: preset.day || 1,
    season: preset.season || '',
  };
  const idm = IDMS.includes(p.identityModule) ? p.identityModule : 'commoner';
  return {
    ruleset: pack.id,
    title: `${era.yearLabel || (era.gregorianYear < 0 ? '公元前' + -era.gregorianYear : era.gregorianYear) + '年'} · ${p.name || p.role || '无名'}`,
    era,
    identityModule: idm,
    protagonist: {
      name: p.name || '', age: p.age || null, gender: p.gender || (idm === 'emperor' ? '男' : ''),
      role: p.role || ROLE_DEFAULT[idm](era), disposition: '',
    },
    location: { full: p.place || '', polity: era.polity, controller: '未核实' },
    situation: '', threads: [], npcs: [], resources: {},
    mode: p.real && p.name ? 'real' : 'fictional',
    anchors: null,
    household: { clan: '', members: [], property: {}, obligations: [] },
    geography: null,
  };
}

/**
 * 解析一句话。callModel(system, prompt) → 文本；模型不可用时传 null，只用规则。
 * 返回 createCustomSave 的 spec。
 */
async function parse(pack, text, callModel) {
  text = String(text || '').trim().slice(0, 200);
  if (!text || RANDOM_WORDS.test(text)) return randomSpec(pack);
  const rp = ruleParse(text, pack.eraPresets);
  const presetsOfDyn = pack.eraPresets.filter(p => p.dynasty === rp.dynasty);
  let m = {};
  if (callModel) {
    const ask = `玩家用一句话说想在中国古代当谁："${text}"
请拆成开局设定，只输出 JSON：
{"yearLabel":"年号纪年，如 万历十五年；不知道就空","gregorianYear":公元年整数（公元前用负数）或 null,"polity":"政权名，如 明、北宋、梁","month":农历月 1-12 或 null,
 "identityModule":"emperor|noble|official|warlord|commoner 五选一（皇帝/宗室贵族/官员/军阀武将/百姓）","role":"一句话具体身份，如 苏州的绣娘、钱塘县知县","name":"真实人物写真名；虚构的就按时代、身份起一个像样的姓名","gender":"男|女|空","age":年龄或 null,"place":"当时的地名，如 苏州府长洲县；没说就空","real":是否真实历史人物 true/false}
规则：说了年号就换算成公元年；只说"某某年间"取这个年号中间的一年；只说朝代就挑这个朝代里一个有事可做的年份；范围公元前221年到1911年。地名、官名用当时的叫法。`;
    try {
      const raw = String(await callModel('你是历史顾问，只输出 JSON。', ask) || '');
      const js = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1);
      m = JSON.parse(js) || {};
    } catch (e) { m = {}; console.warn('[quick-start] 模型没给出可用的开局设定，改用规则拆句：', String(e && e.message || e).slice(0, 200)); }
  }
  // 年份：规则抽到的公元年 / 句中年号最可信；其次模型给的年号（用 reign 复核）；再次模型的公元年；最后同朝代预设
  let gy = rp.gregorianYear;
  let loose = false; // 只说了「某某年间」/朝代：年份可以让模型挑
  if (gy == null) { const ri = reignInText(text); if (ri) { gy = ri.year; loose = !/(元|[一二三四五六七八九十百廿卅\d]+)\s*[年载]/.test(text); } }
  let yl = '';
  if (m.yearLabel) {
    const rg = reign.resolveGregorian(m.yearLabel, m.polity || rp.dynasty);
    if (rg.year) {
      // 「万历年间」：模型挑的万历某年只要还在这个年号里就用它；否则年号与公元年对不上就丢掉模型的年号
      if (gy == null || (loose && rg.reign && text.includes(rg.reign))) gy = rg.year;
      if (rg.year === gy) yl = m.yearLabel;
    }
  }
  if (gy == null && Number.isFinite(Number(m.gregorianYear)) && m.gregorianYear !== null) gy = Number(m.gregorianYear);
  let preset = null;
  if (gy == null) preset = presetsOfDyn.length ? pick(presetsOfDyn) : null;
  if (gy == null && !preset) preset = pick(pack.eraPresets);
  if (gy != null && !preset) {
    // 找最近的预设借它的季节与政权（离得远就只借月份，不借政权）
    preset = pack.eraPresets.slice().sort((a, b) => Math.abs(a.gregorianYear - gy) - Math.abs(b.gregorianYear - gy))[0];
    if (Math.abs(preset.gregorianYear - gy) > 30) preset = { ...preset, yearLabel: '', polity: '', season: '', month: 1, day: 1, id: null };
    else preset = { ...preset, id: preset.gregorianYear === gy ? preset.id : null };
  }
  // 年号必须与公元年对得上：预设的年号只在年份相同时沿用，否则按年份反查
  const label = yl || (gy != null && preset && preset.gregorianYear === gy ? preset.yearLabel : (gy != null ? reignLabel(gy) : ''));
  if (gy != null && preset && preset.gregorianYear !== gy) preset = { ...preset, polity: polityOf(gy) || preset.polity };
  const sp = splitRolePlace(text);
  const gender = m.gender === '男' || m.gender === '女' ? m.gender : (rp.gender || '');
  const name = String(m.name || '').trim() || (m.real ? '' : fakeName(gender));
  return toSpec(pack, {
    preset, yearLabel: label,
    gregorianYear: gy != null ? gy : undefined, polity: m.polity || (preset && preset.polity) || rp.dynasty,
    month: Number(m.month) || undefined,
    identityModule: m.identityModule || (/皇帝|天子|君主|^.{0,6}帝$/.test(text) ? 'emperor' : /知县|知府|知州|官|吏|通判|御史|尚书|侍郎/.test(text) ? 'official' : /将|帅|军/.test(text) ? 'warlord' : /宗室|王爷|郡主|公主|世家/.test(text) ? 'noble' : 'commoner'),
    role: m.role || sp.role || text, name, gender, age: Number(m.age) || (m.real ? null : 16 + Math.floor(Math.random() * 20)),
    place: m.place || sp.place, real: !!m.real,
  });
}

module.exports = { fakeName, splitRolePlace, polityOf, parse, randomSpec, ruleParse, toSpec, reignLabel, reignInText, RANDOM_WORDS };
