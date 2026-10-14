'use strict';
/** 让所选叙事框架按史实拟一份家庭 / 地理。原先整段写在 server.js 的路由表里。
 *  返回 { data, unverified:true }；模型没按 JSON 回答时抛错，由路由层统一变成 { ok:false, why }。 */

const FORMAT = {
  geography: '{"地形":"","水系":"","道路驿站":"","距州治":"","邻境":"","物产":"","常发灾异":"","note":"不确定处写「不知」，不要编造"}',
  family: '{"clan":"","members":[{"name":"","relation":"","age":0,"status":"在世","role":"","attitude":"","note":""}],"property":{"田":"","宅":"","奴婢":""},"obligations":[""]}',
};

function buildPrompt(body) {
  const what = body.what === 'geography' ? 'geography' : 'family';
  return `你要为一次历史模拟拟资料。时代：${body.era}（公元 ${body.gregorianYear} 年）。地点：${body.place}。主角：${body.name}，${body.role}。
请只用 JSON 回答，不要任何解释文字，格式：
${FORMAT[what]}
要求：所有内容必须与该朝代该地的真实情况相符；人物的家人若是真实历史人物则用真名，若是虚构则取一个该时代合理的姓名并注明。不确定的一律写「不知」。`;
}

/** 从模型回复里抠出 JSON：容忍 ```json 围栏和前后多余文字 */
function parseJsonLoose(text) {
  let t = String(text == null ? '' : text).trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('没有找到 JSON 对象');
  return JSON.parse(t.slice(a, b + 1));
}

async function fill(body, adapters) {
  const adapterId = body.adapterId || 'deepseek';
  const saved = await adapters.loadAdapterConfig();
  const { adapter, config } = await adapters.resolveAdapter(adapterId, (saved.configs || {})[adapterId] || {});
  const r = await adapter.call({ system: '你是历史资料编纂助手。只输出 JSON。', prompt: buildPrompt(body) }, config);
  let data;
  try { data = parseJsonLoose(r && r.text); }
  catch (e) { throw new Error('框架返回的不是合法 JSON（' + e.message + '）：' + String(r && r.text || '').slice(0, 200)); }
  return { data, unverified: true };
}

module.exports = { fill, buildPrompt, parseJsonLoose };
