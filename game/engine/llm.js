'use strict';
/**
 * 大模型适配：可选。没有配置或调用失败时，引擎全部走本地写好的内容。
 * 支持 OpenAI 兼容接口（DeepSeek、通义等）和 Anthropic Messages 接口。
 * 配置文件：data/config.json  { "llm": { "provider": "openai"|"anthropic", "baseUrl": "...", "apiKey": "...", "model": "..." } }
 */
const fs = require('fs');
const path = require('path');

const CONFIG = process.env.SHU_CONFIG || path.join(__dirname, '..', 'data', 'config.json');

function config() {
  try { return JSON.parse(fs.readFileSync(CONFIG, 'utf8')); } catch { return {}; }
}
function saveConfig(c) {
  fs.writeFileSync(CONFIG, JSON.stringify(c, null, 2));
}
function enabled() {
  const c = config().llm;
  return !!(c && c.apiKey && c.model);
}

async function chat(system, user, { json = false, maxTokens = 2000, timeoutMs = 60000 } = {}) {
  const c = config().llm;
  if (!c || !c.apiKey) throw new Error('未配置大模型');
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    let text;
    if (c.provider === 'anthropic') {
      const r = await fetch((c.baseUrl || 'https://api.anthropic.com') + '/v1/messages', {
        method: 'POST', signal: ctl.signal,
        headers: { 'content-type': 'application/json', 'x-api-key': c.apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: c.model, max_tokens: maxTokens, system, messages: [{ role: 'user', content: user }] }),
      });
      if (!r.ok) throw new Error('大模型返回 ' + r.status);
      const j = await r.json();
      text = (j.content || []).map(b => b.text || '').join('');
    } else {
      const r = await fetch((c.baseUrl || 'https://api.deepseek.com') + '/chat/completions', {
        method: 'POST', signal: ctl.signal,
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + c.apiKey },
        body: JSON.stringify({
          model: c.model, max_tokens: maxTokens,
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          ...(json ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
      if (!r.ok) throw new Error('大模型返回 ' + r.status);
      const j = await r.json();
      text = j.choices?.[0]?.message?.content || '';
    }
    if (!json) return text.trim();
    const m = text.match(/\{[\s\S]*\}/);
    return JSON.parse(m ? m[0] : text);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { chat, enabled, config, saveConfig };
