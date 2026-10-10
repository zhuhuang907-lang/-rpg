'use strict';
/**
 * 大模型适配：可选。没有配置或调用失败时，引擎全部走本地写好的内容。
 * 支持 OpenAI 兼容接口（DeepSeek、通义、Kimi、Ollama 兼容层等）和 Anthropic Messages 接口。
 * 配置文件：data/config.json
 *
 * 配置读写的两条保护（取自原 rpg-kernel 2026-10-08 的修复）：
 *   ① 文件读不懂（例如被别的程序存成带 BOM 的 UTF-8）时，先去 BOM 再读；仍读不懂就备份坏文件，绝不覆盖——里面可能有 Key。
 *   ② 保存时与磁盘上的旧配置合并，空着的 Key 不会冲掉已有的 Key。
 */
const fs = require('fs');
const path = require('path');

const CONFIG = process.env.SHU_CONFIG || path.join(__dirname, '..', 'data', 'config.json');

let broken = false;
function config() {
  let txt;
  try { txt = fs.readFileSync(CONFIG, 'utf8'); } catch { return {}; }
  try { broken = false; return JSON.parse(txt.replace(/^﻿/, '')); } catch {
    if (!broken) { try { fs.copyFileSync(CONFIG, CONFIG + `.unreadable-${Date.now()}.bak`); } catch { /* 忽略 */ } }
    broken = true;
    return {};
  }
}
function saveConfig(c) {
  if (broken) throw new Error('配置文件读不懂，已备份为 .bak；请先删掉 data/config.json 再保存');
  fs.mkdirSync(path.dirname(CONFIG), { recursive: true });
  const tmp = CONFIG + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(c, null, 2));
  fs.renameSync(tmp, CONFIG);
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
      if (!r.ok) throw new Error('大模型返回 ' + r.status + (r.status === 401 ? '（Key 不对或已失效）' : ''));
      const j = await r.json();
      text = (j.content || []).map(b => b.text || '').join('');
    } else {
      const r = await fetch((c.baseUrl || 'https://api.deepseek.com').replace(/\/$/, '') + '/chat/completions', {
        method: 'POST', signal: ctl.signal,
        headers: { 'content-type': 'application/json', authorization: 'Bearer ' + c.apiKey },
        body: JSON.stringify({
          model: c.model, max_tokens: maxTokens,
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          ...(json ? { response_format: { type: 'json_object' } } : {}),
        }),
      });
      if (!r.ok) throw new Error('大模型返回 ' + r.status + (r.status === 401 ? '（Key 不对或已失效）' : r.status === 402 ? '（账户余额不足）' : ''));
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

module.exports = { chat, enabled, config, saveConfig, CONFIG };
