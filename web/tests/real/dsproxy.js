// 真实 DeepSeek 压力测试用的转发：游戏 → 这里 → api.deepseek.com。Key 只从环境变量 DEEPSEEK_API_KEY 读，不写进任何文件、不打印；
// 每次调用记一行：哪类调用、型号、思考、JSON 模式、输入字数、实际 token 用量、耗时、成没成、空输出、JSON 能不能解析；原始输入输出另存
// 用法：DEEPSEEK_API_KEY=... OUT=目录 PORT=4711 NODE_USE_ENV_PROXY=1 node dsproxy.js
const http = require('http'), fs = require('fs'), path = require('path');
const KEY = process.env.DEEPSEEK_API_KEY || '', OUT = process.env.OUT || './out', PORT = +(process.env.DS_PORT || process.env.PORT || 4711), UP = process.env.DS_UPSTREAM || 'https://api.deepseek.com';
if (!KEY) { console.error('没有 DEEPSEEK_API_KEY'); process.exit(2); }
fs.mkdirSync(path.join(OUT, 'calls'), { recursive: true });
let seq = 0, PHASE = 'start';
const kindOf = p => /综合审稿/.test(p) ? (/逐条判断/.test(p) ? '审稿·查疑' : '综合审稿') : /挑剔的历史小说编辑/.test(p) ? '审读(旧)' : /还没给玩家看/.test(p) ? (/逐条判断/.test(p) ? '审校·查疑(旧)' : '审校(旧)') : /常理审查/.test(p) ? '常理审查' : /账房兼史官/.test(p) ? (/【开局】/.test(p) ? '开局记账' : '记账') : /推演人/.test(p) ? '推演' : /方略推演|推演一件方略/.test(p) ? '方略' : /你在和玩家一起写一个人在真实历史里的一生/.test(p) ? (/【开局】/.test(p) ? '开局正文' : /【你的/.test(p) ? '改稿' : '正文') : '其他';
const safeJSON = t => { try { const s = String(t || '').replace(/^```\w*\s*|```\s*$/g, ''); const a = s.indexOf('{'), b = s.lastIndexOf('}'); return a >= 0 && b > a ? (JSON.parse(s.slice(a, b + 1)), true) : false; } catch (_) { return false; } };
http.createServer(async (req, res) => {
  if (req.url === '/__phase') { let b = ''; req.on('data', c => b += c); req.on('end', () => { PHASE = b.trim() || PHASE; res.end('ok'); }); return; }
  let body = ''; req.on('data', c => body += c); await new Promise(r => req.on('end', r));
  const t0 = Date.now(), id = ++seq; let j = null; try { j = JSON.parse(body || '{}'); } catch (_) { /* 非 JSON */ }
  const prompt = j && Array.isArray(j.messages) ? j.messages.map(m => typeof m.content === 'string' ? m.content : JSON.stringify(m.content)).join('\n\n') : '';
  const kind = j ? kindOf(prompt) : '其他', stream = !!(j && j.stream);
  if (j && stream) j.stream_options = Object.assign({}, j.stream_options, { include_usage: true });   // 流式也要拿到 token 用量
  const rec = { id, phase: PHASE, kind, url: req.url, model: j && j.model, thinking: j && j.thinking ? j.thinking.type : null, json: !!(j && j.response_format), maxTokens: j && j.max_tokens, inChars: prompt.length, head: prompt.replace(/\s+/g, '').slice(0, 18), t0: new Date(t0).toISOString() };
  let up;
  try { up = await fetch(UP + req.url.replace(/^\/v1/, ''), { method: req.method, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + KEY }, body: req.method === 'GET' ? undefined : JSON.stringify(j || {}) }); }
  catch (e) { rec.err = 'fetch ' + (e.cause && e.cause.code || e.message); rec.ms = Date.now() - t0; fs.appendFileSync(path.join(OUT, 'calls.jsonl'), JSON.stringify(rec) + '\n'); res.writeHead(502); res.end(JSON.stringify({ error: { message: rec.err } })); return; }
  rec.status = up.status; res.writeHead(up.status, { 'content-type': up.headers.get('content-type') || 'application/json' });
  let raw = ''; const rd = up.body.getReader(), dec = new TextDecoder();
  for (;;) { const { done, value } = await rd.read(); if (done) break; const s = dec.decode(value, { stream: true }); raw += s; res.write(s); }
  res.end();
  let content = '', reasoning = '', usage = null, finish = null;
  if (stream) { for (const line of raw.split('\n')) { const m = line.match(/^data:\s*(\{.*\})\s*$/); if (!m) continue; try { const c = JSON.parse(m[1]); const d = c.choices && c.choices[0]; if (d && d.delta) { content += d.delta.content || ''; reasoning += d.delta.reasoning_content || ''; } if (d && d.finish_reason) finish = d.finish_reason; if (c.usage) usage = c.usage; } catch (_) { /* 半截 */ } } }
  else { try { const c = JSON.parse(raw); const d = c.choices && c.choices[0]; content = d && d.message ? d.message.content || '' : ''; reasoning = d && d.message ? d.message.reasoning_content || '' : ''; finish = d && d.finish_reason; usage = c.usage || null; } catch (_) { /* 错误页 */ } }
  Object.assign(rec, { ms: Date.now() - t0, finish, empty: up.ok && !String(content).trim(), outChars: content.length, reasonChars: reasoning.length, jsonOk: rec.json ? safeJSON(content) : null, usage: usage && { in: usage.prompt_tokens, out: usage.completion_tokens, cacheHit: usage.prompt_cache_hit_tokens, reasoning: usage.completion_tokens_details && usage.completion_tokens_details.reasoning_tokens } });
  if (!up.ok) rec.err = raw.slice(0, 300);
  fs.appendFileSync(path.join(OUT, 'calls.jsonl'), JSON.stringify(rec) + '\n');
  fs.writeFileSync(path.join(OUT, 'calls', `${String(id).padStart(4, '0')}-${kind}.json`), JSON.stringify({ ...rec, prompt, content, reasoning: reasoning.slice(0, 20000) }, null, 1));
}).listen(PORT, '127.0.0.1', () => console.log('dsproxy on', PORT));
