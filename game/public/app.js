'use strict';
/* 枢 · 前端：开始页、开场三拍、回合（局势 / 案头 / 问人 / 拿主意 / 结算）、史事面板 */

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let V = null;          // 当前局的视图
let lastConsult = null;

async function api(path, body) {
  const busy = setTimeout(() => $('#busy').classList.remove('hidden'), 250);
  try {
    const r = await fetch(path, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {});
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    return j;
  } finally {
    clearTimeout(busy);
    $('#busy').classList.add('hidden');
  }
}
async function act(action) {
  try {
    const j = await api('/api/act', { id: V.id, action });
    V = j.view;
    render();
    return j;
  } catch (e) { alert(e.message); }
}

// ———————————— 开始页 ————————————
async function showHome() {
  document.body.classList.add('at-home');
  $('#home').classList.remove('hidden');
  $('#play').classList.add('hidden');
  $('#status').innerHTML = '';
  $('#statbar').innerHTML = '';
  $('#scnName').textContent = '历史模拟';
  const [{ scenarios, llm }, { saves }] = await Promise.all([api('/api/scenarios'), api('/api/saves')]);
  $('#scenarios').innerHTML = scenarios.map(s => `
    <div class="scn">
      <h2>${esc(s.title)}</h2>
      <div class="span">${esc(s.span)}</div>
      <p>${esc(s.blurb)}</p>
      <div class="idgrid">
        ${s.identities.map(i => `
          <button class="idcard" data-scn="${esc(s.id)}" data-idn="${esc(i.id)}">
            <b>${esc(i.name)}</b><span class="tag">${esc({ emperor: '皇帝', commoner: '平民', official: '官员' }[i.idm] || i.idm)}</span><br>
            ${esc(i.title)}<br>
            <span class="muted small">${esc(i.place)} · ${i.age}岁 · 一回合＝${esc({ xun: '一旬', month: '一月', season: '一季' }[i.unit])}</span>
          </button>`).join('')}
      </div>
      ${llm ? '' : '<p class="muted small">没有接大模型：全部用本局写好的内容。到「设置」里填上接口，问人、润色、来报会更丰富。</p>'}
    </div>`).join('');
  $$('.idcard').forEach(b => b.onclick = async () => {
    const j = await api('/api/new', { scenario: b.dataset.scn, identity: b.dataset.idn });
    V = j.view; enterPlay();
  });
  $('#saves').innerHTML = saves.length ? saves.map(s => `
    <div class="saverow">
      <span class="grow">${esc(s.identity === 'zhou' ? '周三娘' : s.identity === 'shenzong' ? '赵顼' : s.identity)} · ${esc(s.last)} · 第${s.turn}回合</span>
      <button data-load="${s.id}">继续</button>
      <button data-del="${s.id}" class="ghost">删除</button>
    </div>`).join('') : '<div class="muted">还没有存档。</div>';
  $$('[data-load]').forEach(b => b.onclick = async () => { V = (await api('/api/load', { id: b.dataset.load })).view; enterPlay(); });
  $$('[data-del]').forEach(b => b.onclick = async () => { if (confirm('删除这个存档？')) { await api('/api/delete', { id: b.dataset.del }); showHome(); } });
}

function enterPlay() {
  document.body.classList.remove('at-home');
  $('#home').classList.add('hidden');
  $('#play').classList.remove('hidden');
  lastConsult = null;
  render();
  window.scrollTo(0, 0);
}

// ———————————— 渲染 ————————————
function render() {
  if (!V) return;
  $('#scnName').textContent = V.scenario;
  // 状态栏：随醒来逐步点亮
  const st = V.status;
  $('#status').innerHTML = [esc(st.date), st.place && esc(st.place), st.name && `<b>${esc(st.name)}</b>`].filter(Boolean).join('<span class="sep">·</span>');
  renderStats();
  renderLeft();
  renderStory();
  renderBeat();
  renderResult();
  renderDocket();
  renderPeople();
  renderNotebook();
}

function delta(d) { return d > 0 ? `<span class="d-up">↑${d}</span>` : d < 0 ? `<span class="d-dn">↓${-d}</span>` : ''; }

function renderStats() {
  $('#statbar').innerHTML = V.stats.map(x => `
    <span class="stat" title="${esc(x.label)}：${x.value}">
      <span class="k">${esc(x.label)}</span>
      ${x.bar != null ? `<span class="meter"><i style="width:${x.bar}%"></i></span>` : ''}
      <span class="v">${esc(x.shown)}</span>${x.note ? `<span class="note">${esc(x.note)}</span>` : ''}${delta(x.d)}
    </span>`).join('');
}

function renderLeft() {
  $('#groups').innerHTML = V.groups.length ? V.groups.map(g => `
    <div class="grp ${g.value < 30 ? 'low' : ''}">
      <div class="row"><span>${esc(g.label)}</span><span>${esc(g.word)} ${delta(g.d)}</span></div>
      <div class="bar"><i style="width:${g.value}%"></i></div>
    </div>`).join('') : '<div class="muted small">还没看清。</div>';
  $('#regions').innerHTML = V.regions.map(r => `
    <div class="region"><b>${esc(r.name)}</b>${Object.entries(r.cols).map(([k, v]) => `<span>${esc(k)}：${esc(v)}</span>`).join('')}</div>`).join('') || '<div class="muted small">—</div>';
}

function renderStory() {
  // 开场：显示全部拍子；回合中：只显示本回合的新内容（旧的进起居注）
  const items = V.phase === 'opening' ? V.story : V.story.filter(e => e.turn === V.turn && e.kind !== 'docket' || (V.turn === 1 && e.turn === 0 && e.kind === 'beat' && e.beat === V.beats - 1));
  $('#story').innerHTML = items.map(e => {
    if (e.kind === 'beat') return `<div class="beat"><div class="para">${esc(e.text)}</div></div>`;
    if (e.kind === 'player') return `<div class="player">${esc(e.text)}</div>`;
    if (e.kind === 'bridge') return `<div class="para bridge">${esc(e.text)}</div>`;
    if (e.kind === 'consult' && V.phase === 'turn') return '';
    return '';
  }).join('');
}

function renderBeat() {
  const box = $('#beatBox');
  if (V.phase !== 'opening' || !V.beatActions.length) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  box.innerHTML = V.beatActions.map((a, i) => `<button data-beat="${i}">${esc(a)}</button>`).join('') +
    (V.llm ? `<div class="free"><input id="beatFree" placeholder="或者自己写你要做什么……"><button id="beatGo">做</button></div>` : '');
  $$('[data-beat]').forEach(b => b.onclick = () => act({ type: 'beat', index: Number(b.dataset.beat) }));
  if ($('#beatGo')) $('#beatGo').onclick = () => { const t = $('#beatFree').value.trim(); if (t) act({ type: 'beat', text: t }); };
}

function renderResult() {
  const r = V.lastResult;
  const box = $('#result');
  if (!r || V.phase !== 'turn') { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  box.innerHTML = `
    <h4>上一回合（${esc(r.date)}）· ${r.executor && r.executor !== '自己' ? esc(r.executor) + '回报' : '结果'}</h4>
    ${r.color ? `<p class="para">${esc(r.color)}</p>` : ''}
    ${r.reports.map(x => `<div class="rep"><b>${esc(x.title)}</b>　${esc(x.text)}</div>`).join('') || '<div class="muted">无事可报。</div>'}
    ${r.ledger.length ? `<h4 style="margin-top:8px">账目</h4><table class="ledger">${r.ledger.map(l => `<tr><td>${esc(l.label)}</td><td>${delta(l.d)}</td><td class="muted">${esc(l.why)}</td></tr>`).join('')}</table>` : ''}
    ${r.rumors.map(x => `<div class="rumor">${esc(x)}</div>`).join('')}`;
}

function renderDocket() {
  const wrap = $('#docketWrap');
  if (V.phase !== 'turn') { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');
  $('#docketNote').textContent = `${V.docket.length} 件 · 第 ${V.turn} 回合`;
  const picked = new Set(V.decision.picks.map(p => p.uid));
  $('#docket').innerHTML = V.docket.map((d, i) => `
    <div class="memo ${picked.has(d.uid) ? 'picked' : ''}">
      <div class="memo-head" data-fold="${i}">
        <span class="type ${esc(d.type)}">${esc(d.type)}</span>
        <span class="title">${esc(d.title)}</span>
        <span class="from">${esc(d.from)}${d.form ? ' · ' + esc(d.form) : ''}</span>
      </div>
      <div class="memo-body" id="memo${i}">
        <p>${esc(d.text)}</p>
        ${d.deadline > 0 ? `<div class="dl">可以缓 ${d.deadline} 回合再定</div>` : d.approachCount ? '<div class="dl">这一回合就要有个说法</div>' : ''}
      </div>
    </div>`).join('');
  $$('[data-fold]').forEach(h => h.onclick = () => $('#memo' + h.dataset.fold).classList.toggle('hidden'));

  // 拿主意
  $('#executor').innerHTML = V.executors.map(x => `<option ${x === V.decision.executor ? 'selected' : ''}>${esc(x)}</option>`).join('');
  if (document.activeElement !== $('#decision')) $('#decision').value = V.decision.text || '';
  $('#picks').innerHTML = V.decision.picks.map(p => {
    const n = V.notebook.find(x => x.uid === p.uid && x.approachId === p.approachId);
    return n ? `<span class="chip">${esc(n.title)}：${esc(n.label)}<button data-unpick="${esc(p.uid)}|${esc(p.approachId)}" title="不采纳">✕</button></span>` : '';
  }).join('');
  $$('[data-unpick]').forEach(b => b.onclick = () => { const [uid, approachId] = b.dataset.unpick.split('|'); act({ type: 'note', uid, approachId, on: false }); });
  const pol = $('#polished');
  if (V.decision.polished) { pol.classList.remove('hidden'); pol.textContent = V.decision.polished; } else pol.classList.add('hidden');
}

function renderPeople() {
  const can = V.phase === 'turn' && V.consultsLeft > 0;
  $('#consultLeft').textContent = V.phase === 'turn' ? `这一回合还能找 ${V.consultsLeft} 人` : '';
  $('#people').innerHTML = V.people.map(p => `
    <div class="person">
      <div><span class="name">${esc(p.name)}</span> <span class="role">${esc(p.role)}${p.age ? ' · ' + p.age + '岁' : ''}</span></div>
      <div class="stance">${esc(p.stance)}</div>
      <div class="muted small">${esc(p.temper)}</div>
      ${p.memory.length ? `<div class="mem">记得：${p.memory.map(esc).join('；')}</div>` : ''}
      ${can ? `<div class="ask"><input data-q="${esc(p.id)}" placeholder="想问什么（可空）"><button data-ask="${esc(p.id)}">${V.idm === 'emperor' ? '召对' : '问'}</button></div>` : ''}
    </div>`).join('') || '<div class="muted small">身边还没有人。</div>';
  $$('[data-ask]').forEach(b => b.onclick = async () => {
    const q = $(`[data-q="${b.dataset.ask}"]`).value.trim();
    const j = await act({ type: 'consult', person: b.dataset.ask, question: q });
    if (j && j.consult) { lastConsult = j.consult; renderConsult(); }
  });
  renderConsult();
}

function renderConsult() {
  const box = $('#consultBox');
  const c = lastConsult && V.consults.find(x => x.person === lastConsult.person && x.turn === V.turn) ? lastConsult : null;
  if (!c) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  box.innerHTML = `<div class="who">${esc(c.name)}${c.question ? `<span class="muted small">（你问：${esc(c.question)}）</span>` : ''}</div>
    <div class="reply">${esc(c.reply)}</div>
    ${c.suggestions.map(s => `<div class="sugg"><span>【${esc(s.title)}】${esc(s.label)}</span><button data-adopt="${esc(s.uid)}|${esc(s.approachId)}|${esc(s.person)}">采纳</button></div>`).join('')}`;
  $$('[data-adopt]').forEach(b => b.onclick = () => { const [uid, approachId, person] = b.dataset.adopt.split('|'); act({ type: 'note', uid, approachId, person }); });
}

function renderNotebook() {
  const all = V.consults.flatMap(c => c.suggestions);
  const picked = new Set(V.decision.picks.map(p => p.uid + '|' + p.approachId));
  $('#notebook').innerHTML = all.length ? all.map(s => `
    <div class="sugg"><span>【${esc(s.title)}】${esc(s.label)}<br><span class="muted">${esc(s.person)}的主意</span></span>
    ${picked.has(s.uid + '|' + s.approachId) ? '<span class="muted">已采纳</span>' : `<button data-adopt2="${esc(s.uid)}|${esc(s.approachId)}|${esc(s.person)}">采纳</button>`}</div>`).join('')
    : '<div class="muted small">问过人之后，他们的主意会列在这里。</div>';
  $$('[data-adopt2]').forEach(b => b.onclick = () => { const [uid, approachId, person] = b.dataset.adopt2.split('|'); act({ type: 'note', uid, approachId, person }); });
}

// ———————————— 拿主意 ————————————
$('#btnPolish').onclick = async () => {
  const text = $('#decision').value.trim();
  if (!text) return alert('先写下你打算怎么办。');
  await act({ type: 'polish', text, executor: $('#executor').value });
};
$('#btnEnd').onclick = async () => {
  const text = $('#decision').value.trim();
  if (!text && !V.decision.picks.length && !confirm('什么都不定，就这样过这一回合？没处理的事会按"未处理"结算。')) return;
  if (text !== (V.decision.text || '')) await act({ type: 'draft', text, executor: $('#executor').value });
  lastConsult = null;
  await act({ type: 'endTurn', executor: $('#executor').value });
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
$('#decision').addEventListener('change', () => { if (V) act({ type: 'draft', text: $('#decision').value, executor: $('#executor').value }); });

// ———————————— 弹窗 ————————————
function modal(title, html) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = html;
  $('#modal').classList.remove('hidden');
}
$('#modalClose').onclick = () => $('#modal').classList.add('hidden');
$('#modal').onclick = e => { if (e.target.id === 'modal') $('#modal').classList.add('hidden'); };
document.addEventListener('keydown', e => { if (e.key === 'Escape') $('#modal').classList.add('hidden'); });

const STATUS = { delivered: '已到你手里', followed: '已照行', rejected: '你否决了', shelved: '被搁下', blocked: '因你此前的决定未发生', offstage: '发生了，你这个身份不知道', background: '开局前已发生', doubt: '存疑，不用', asked: '待你决断', authored: '已到你手里' };

async function openHistory() {
  const h = await api('/api/history', { id: V.id });
  const rows = h.table.map(m => `
    <tr>
      <td style="white-space:nowrap">${esc(m.when)}</td>
      <td><b>${esc(m.title)}</b> <span class="badge ${esc(m.confidence)}">${esc(m.confidence)}</span><br>
        ${m.happened ? `<span class="small">${esc(m.fact)}</span>` : '<span class="muted small">尚未发生</span>'}
        ${m.source.length ? `<br>${m.source.map((u, i) => `<a class="small" href="${esc(u)}" target="_blank" rel="noopener">出处${i + 1}</a>`).join(' ')}` : ''}</td>
      <td class="small">${esc(STATUS[m.status] || (m.happened ? '' : ''))}</td>
    </tr>`).join('');
  const log = h.log.map(l => `
    <div class="logentry"><div class="d">第${l.turn}回合 · ${esc(l.date)} · 公历约 ${esc(l.julian)}</div>
      ${l.checked.length ? l.checked.map(c => `<div class="small">· ${esc(c.when)} ${esc(c.title)} <span class="badge ${esc(c.confidence)}">${esc(c.confidence)}</span> —— ${esc(c.status)}</div>`).join('') : '<div class="small muted">· 本回合时间窗里没有主线史事。</div>'}
      ${l.online.map(o => o.error ? `<div class="small muted">· 联网检索「${esc(o.query)}」失败：${esc(o.error)}</div>` : `<div class="small">· <span class="badge 二手">联网·待核</span> <a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.title)}</a> ${esc(o.snippet.slice(0, 60))}</div>`).join('')}
      ${l.issues.length ? l.issues.map(i => `<div class="small" style="color:var(--bad)">· 把关拦下：${esc(i.where)} —— ${i.issues.map(x => esc(x.term + '：' + x.why)).join('；')}</div>`).join('') : ''}
    </div>`).join('');
  modal('史事', `
    <p class="muted small">主线依史事表推进：标「已核」的有可信出处，「二手」只有百科、通俗文章或研究者转述，「存疑」的不进游戏。正文只写到每条的可信精度。${esc(h.calendarNote)}</p>
    <h3>主线史事表</h3>
    <table class="tbl"><tr><th>时间</th><th>事</th><th>在本局</th></tr>${rows}</table>
    <h3>每回合核对记录</h3>${log || '<div class="muted">还没有。</div>'}`);
}

function openLog() {
  const kinds = { beat: '', bridge: '', player: '你', docket: '来报', consult: '问人', decision: '决定', result: '结算' };
  modal('起居注', V.story.map(e => `
    <div class="logentry"><div class="d">${esc(e.date)}${kinds[e.kind] ? ' · ' + kinds[e.kind] : ''}${e.who ? ' · ' + esc(e.who) : ''}${e.title ? ' · ' + esc(e.title) : ''}</div>
    <div class="para small">${esc(e.text)}</div></div>`).join('') || '<div class="muted">空。</div>');
}

function openCalendar() {
  modal('历书', `<p>${esc(V.calendar.lunar)}</p><p class="muted">公历约 ${esc(V.calendar.julian)}（儒略历，天文推算，可能差一日）。</p>`);
}

async function openSettings() {
  const c = await api('/api/config');
  modal('设置', `
    <p class="muted small">不接大模型也能玩：全部用本局写好的内容。接上之后，问人、润色、开场自由行动和额外来报会由大模型来写；所有生成的文字都要先过时代把关，不过关就用本地内容。</p>
    <div class="field"><label>接口类型</label><select id="cProv"><option value="openai">OpenAI 兼容（DeepSeek、通义等）</option><option value="anthropic">Anthropic</option></select></div>
    <div class="field"><label>接口地址</label><input id="cBase" placeholder="https://api.deepseek.com" value="${esc(c.llm?.baseUrl || '')}"></div>
    <div class="field"><label>模型</label><input id="cModel" placeholder="deepseek-chat" value="${esc(c.llm?.model || '')}"></div>
    <div class="field"><label>Key ${c.llm?.hasKey ? '（已保存，留空不改）' : ''}</label><input id="cKey" type="password"></div>
    <div class="field"><label><input type="checkbox" id="cOnline" ${c.history?.online ? 'checked' : ''}> 每回合联网检索史事（维基百科；结果只进史事面板，标"待核"，不进正文）</label></div>
    <div class="composer-row"><button id="cClear" class="ghost">清除大模型配置</button><span class="grow"></span><button id="cSave" class="primary">保存</button></div>`);
  if (c.llm?.provider) $('#cProv').value = c.llm.provider;
  $('#cSave').onclick = async () => {
    await api('/api/config', { llm: { provider: $('#cProv').value, baseUrl: $('#cBase').value.trim(), model: $('#cModel').value.trim(), apiKey: $('#cKey').value.trim() }, history: { online: $('#cOnline').checked } });
    $('#modal').classList.add('hidden');
    if (V) { V = (await api('/api/load', { id: V.id })).view; render(); }
  };
  $('#cClear').onclick = async () => { await api('/api/config', { llm: { clear: true } }); $('#modal').classList.add('hidden'); };
}

$$('[data-open]').forEach(b => b.onclick = () => {
  const k = b.dataset.open;
  if (k === 'home') return showHome();
  if (k === 'settings') return openSettings();
  if (!V) return;
  if (k === 'history') return openHistory();
  if (k === 'log') return openLog();
  if (k === 'calendar') return openCalendar();
});

// 手机：三栏切换
$$('[data-tab]').forEach(b => b.onclick = () => {
  $('#play').dataset.tab = b.dataset.tab;
  $$('[data-tab]').forEach(x => x.classList.toggle('on', x === b));
  window.scrollTo(0, 0);
});

showHome();
