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
let CFG = { llm: false, search: false };
async function showHome() {
  document.body.classList.add('at-home');
  $('#home').classList.remove('hidden');
  $('#play').classList.add('hidden');
  $('#status').innerHTML = '';
  $('#statbar').innerHTML = '';
  $('#scnName').textContent = '历史模拟';
  const [sc, { saves }] = await Promise.all([api('/api/scenarios'), api('/api/saves')]);
  CFG = { llm: sc.llm, search: sc.search };
  $('#cDyn').innerHTML = '<option value="">（按年份自动）</option>' + sc.dynasties.map(d => `<option value="${esc(d.name)}">${esc(d.name)}（${d.from < 0 ? '前' + -d.from : d.from}—${d.to < 0 ? '前' + -d.to : d.to}）</option>`).join('');
  $('#keyBox').classList.toggle('hidden', sc.llm);
  $('#needCfg').textContent = sc.llm ? `查史：${sc.searchName}${sc.bocha ? '' : '（想查得更全，可以在右上「设置」里填博查 Key）'}` : '';
  $('#qGo').disabled = !sc.llm;
  $('#btnRandom').disabled = !sc.llm;
  $('#btnCustom').disabled = !sc.llm;
  if (sc.llm) setTimeout(() => $('#qText').focus(), 50); else setTimeout(() => $('#kDs').focus(), 50);

  $('#scenarios').innerHTML = sc.scenarios.map(s => `
    <div>
      <h3>${esc(s.title)} <span class="muted small">${esc(s.span)}</span></h3>
      <p class="small">${esc(s.blurb)}</p>
      <div class="idgrid">
        ${s.identities.map(i => `
          <button class="idcard" data-scn="${esc(s.id)}" data-idn="${esc(i.id)}">
            <b>${esc(i.name)}</b><span class="tag">${esc({ emperor: '皇帝', commoner: '平民', official: '官员' }[i.idm] || i.idm)}</span><br>
            ${esc(i.title)}<br>
            <span class="muted small">${esc(i.place)} · ${i.age}岁</span>
          </button>`).join('')}
      </div>
    </div>`).join('');
  $$('.idcard').forEach(b => b.onclick = async () => {
    try {
      const j = await api('/api/new', { scenario: b.dataset.scn, identity: b.dataset.idn, mode: $('#cMode').value });
      V = j.view; enterPlay();
    } catch (e) { alert(e.message); }
  });
  $('#savesBox').classList.toggle('hidden', !saves.length);
  $('#saves').innerHTML = saves.map(s => `
    <div class="saverow">
      <span class="grow"><b>${esc(s.name)}</b> · ${esc(s.title || '')} · ${esc(s.last)} · 第${s.turn}回合${s.phase === 'ended' ? ' · 已收场' : ''}</span>
      <button data-load="${s.id}">${s.phase === 'ended' ? '看看' : '继续'}</button>
      <button data-del="${s.id}" class="ghost">删除</button>
    </div>`).join('');
  $$('[data-load]').forEach(b => b.onclick = async () => { V = (await api('/api/load', { id: b.dataset.load })).view; enterPlay(); });
  $$('[data-del]').forEach(b => b.onclick = async () => { if (confirm('删除这个存档？')) { await api('/api/delete', { id: b.dataset.del }); showHome(); } });
}

$('#kSave').onclick = async () => {
  const k = $('#kDs').value.trim();
  if (!k) return alert('先把 Key 粘贴进来');
  $('#kSave').disabled = true;
  try {
    const r = await api('/api/quick-setup', { deepseekKey: k, bochaKey: $('#kBc').value.trim(), test: true });
    if (!r.ok) alert(r.error);
  } catch (e) { alert(e.message); }
  $('#kSave').disabled = false;
  showHome();
};
$('#kDs').addEventListener('keydown', e => { if (e.key === 'Enter') $('#kSave').click(); });

function customSpec() {
  const y = $('#cYear').value.trim();
  return {
    year: y === '' ? null : Number(y), dynasty: $('#cDyn').value, place: $('#cPlace').value.trim(),
    identity: $('#cIdn').value.trim(), name: $('#cName').value.trim(), gender: $('#cGender').value,
    age: $('#cAge').value ? Number($('#cAge').value) : null, real: $('#cReal').checked,
  };
}
async function startCustom(body) {
  let job;
  try { job = (await api('/api/new-custom', { ...body, mode: $('#cMode').value })).job; } catch (e) { return alert(e.message); }
  const box = $('#job');
  box.classList.remove('hidden');
  const STEP = { spec: '', search: '查', found: '找到', note: '', write: '', done: '好了', 'search-error': '没查到', error: '出错' };
  for (;;) {
    await new Promise(r => setTimeout(r, 1200));
    let j;
    try { j = await (await fetch('/api/job', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id: job }) })).json(); } catch { continue; }
    $('#jobBody').innerHTML = '<p class="muted small">正在查这段历史，一般要半分钟到两分钟。</p>' + (j.progress || []).map(p => `<div class="prog ${p.step.includes('error') ? 'err' : ''}">${STEP[p.step] ? esc(STEP[p.step]) + '：' : ''}${esc(p.text || p.q || '')}${p.n != null ? `（${p.n} 条）` : ''}${p.error ? ' —— ' + esc(p.error) : ''}</div>`).join('')
      + (j.status === 'running' ? '<div class="prog muted">……</div>' : '');
    if (j.status === 'done') { box.classList.add('hidden'); V = j.view; enterPlay(); return; }
    if (j.status === 'error' || j.error) {
      $('#jobBody').innerHTML += `<div class="prog err">没成：${esc(j.error)}</div><div class="composer-row"><span class="grow"></span><button id="jobClose">关闭</button></div>`;
      $('#jobClose').onclick = () => box.classList.add('hidden');
      return;
    }
  }
}
$('#qGo').onclick = () => { const t = $('#qText').value.trim(); startCustom({ text: t || '随便' }); };
$('#qText').addEventListener('keydown', e => { if (e.key === 'Enter') $('#qGo').click(); });
$('#btnRandom').onclick = () => startCustom({ text: '随便' });
$('#btnCustom').onclick = () => {
  const spec = customSpec();
  if (!spec.identity && spec.year == null) return alert('至少写个年份或身份');
  startCustom({ spec });
};

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
  $('#status').innerHTML = [esc(st.date), st.place && esc(st.place), st.name && `<b>${esc(st.name)}</b>${V.revealed ? ' ' + V.age + '岁' : ''}`].filter(Boolean).join('<span class="sep">·</span>');
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
  if (V.phase === 'ended' && V.ending) {
    box.classList.remove('hidden');
    box.innerHTML = `<h4>收场 · ${esc(V.ending.date)} · 年${V.ending.age}</h4><div class="ending">${esc(V.ending.text)}</div>
      <div class="composer-row"><span class="grow"></span><button onclick="showHome()">回到开始页</button></div>`;
    return;
  }
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
    ${c.suggestions.map(s => `<div class="sugg"><span>【${esc(s.title)}】${esc(s.label)}${s.odds ? `<span class="odds">${esc(s.odds)}</span>` : ''}</span><button data-adopt="${esc(s.uid)}|${esc(s.approachId)}|${esc(s.person)}">采纳</button></div>`).join('')}`;
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
$('#btnSkip').onclick = async () => {
  const j = await act({ type: 'skip', n: 6 });
  if (j && j.skipped === 0) alert('案头上有要紧的事，快进不了。');
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
      ${l.extend ? `<div class="small">· ${esc(l.extend)}</div>` : ''}
      ${(l.online || []).map(o => o.error ? `<div class="small muted">· 联网检索「${esc(o.query)}」失败：${esc(o.error)}</div>` : `<div class="small">· <span class="badge 二手">联网·待核</span> <a href="${esc(o.url)}" target="_blank" rel="noopener">${esc(o.title)}</a> ${esc(o.snippet.slice(0, 60))}</div>`).join('')}
      ${l.issues.length ? l.issues.map(i => `<div class="small" style="color:var(--bad)">· 把关拦下：${esc(i.where)} —— ${i.issues.map(x => esc(x.term + '：' + x.why)).join('；')}</div>`).join('') : ''}
    </div>`).join('');
  const lookups = (h.lookups || []).map(l => `<div class="logentry"><div class="d">第${l.turn}回合 · 查「${esc(l.q)}」 <span class="badge ${esc(l.grade)}">${esc(l.grade)}</span></div><div class="small">${esc(l.answer)}</div>${l.sources.map(x => `<a class="small" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title || x.url)}</a>`).join(' · ')}</div>`).join('');
  const eras = h.eras.map(e => `${esc(e.name)}（${esc(e.start)}${e.end ? '—' + esc(e.end) : ''}）`).join('、');
  modal('史事', `
    <div class="composer-row"><input id="lkQ" placeholder="在游戏里查一下：一个人、一个词、一件事……" style="flex:1;padding:6px 10px;border:1px solid var(--line);border-radius:6px;background:var(--paper2)"><button id="lkGo" class="primary">查一下</button></div>
    <p class="muted small">${h.searchOn ? '用博查联网查，结果只进这里，不进正文。' : '没接博查：只能凭大模型记忆回答，标"未查证"。'}已查范围到 ${esc(h.horizon)}；本局检索 ${h.research ? h.research.used + '/' + h.research.max : '—'} 次。</p>
    ${lookups ? '<h3>查过的</h3>' + lookups : ''}
    <p class="muted small">年号：${eras || '（无，按干支纪年）'}</p>
    ${h.facts.length ? '<h3>背景要点</h3>' + h.facts.map(f => `<div class="small">· ${esc(f.text)} <span class="badge ${esc(f.grade)}">${esc(f.grade)}</span> ${f.source.map((u, i) => `<a href="${esc(u)}" target="_blank" rel="noopener">出处${i + 1}</a>`).join(' ')}</div>`).join('') : ''}
    <p class="muted small">主线依史事表推进：标「已核」的有可信出处，「二手」只有百科、通俗文章或研究者转述，「存疑」的不进游戏。正文只写到每条的可信精度。${esc(h.calendarNote)}</p>
    <h3>主线史事表</h3>
    <table class="tbl"><tr><th>时间</th><th>事</th><th>在本局</th></tr>${rows}</table>
    <h3>每回合核对记录</h3>${log || '<div class="muted">还没有。</div>'}
    ${h.sources.length ? '<h3>资料卡</h3>' + h.sources.map(c => `<div class="small">[${esc(c.id)}] <a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.title)}</a> <span class="muted">${esc(c.trust)}</span></div>`).join('') : ''}`);
  $('#lkGo').onclick = async () => {
    const q = $('#lkQ').value.trim();
    if (!q) return;
    $('#lkGo').disabled = true;
    try { await api('/api/act', { id: V.id, action: { type: 'lookup', question: q } }); await openHistory(); } catch (e) { alert(e.message); $('#lkGo').disabled = false; }
  };
}

function openLog() {
  const kinds = { beat: '', bridge: '', player: '你', docket: '来报', consult: '问人', decision: '决定', result: '结算' };
  modal('起居注', V.story.map(e => `
    <div class="logentry"><div class="d">${esc(e.date)}${kinds[e.kind] ? ' · ' + kinds[e.kind] : ''}${e.who ? ' · ' + esc(e.who) : ''}${e.title ? ' · ' + esc(e.title) : ''}</div>
    <div class="para small">${esc(e.text)}</div></div>`).join('') || '<div class="muted">空。</div>');
}

function openLife() {
  const goals = V.goals || [];
  const opts = (V.goalOptions || []).filter(o => !goals.some(g => g.text === o));
  modal('生涯', `
    <p>${esc(V.status.name)} · ${V.age}岁 · ${esc(V.status.title || '')}</p>
    <h3>志向</h3>
    ${goals.map(g => `<div>${esc(g.text)}${g.done ? ' <span class="badge 已核">已成</span>' : ''}</div><div class="goalbar"><i style="width:${g.progress}%"></i></div>`).join('') || '<div class="muted">还没立志。</div>'}
    <div class="small muted">改志向（至多三个，一行一个）：</div>
    <textarea id="goalEdit" rows="3" style="width:100%;padding:6px 10px;border:1px solid var(--line);border-radius:6px;background:var(--paper2)">${esc(goals.map(g => g.text).join('\n'))}</textarea>
    ${opts.length ? `<div class="small muted">可选：${opts.map(o => `<button class="ghost" data-goalopt="${esc(o)}">${esc(o)}</button>`).join(' ')}</div>` : ''}
    <div class="composer-row"><span class="grow"></span><button id="goalSave">定下志向</button></div>
    <h3>生平</h3>
    ${(V.career || []).map(c => `<div class="small">${esc(c.date)}　${esc(c.text)}</div>`).join('')}
    ${(V.recaps || []).length ? '<h3>前情提要</h3>' + V.recaps.map(r => `<div class="small"><span class="muted">${esc(r.date)}</span>　${esc(r.text)}</div>`).join('') : ''}
    ${V.phase !== 'ended' ? `<h3>收场</h3><div class="composer-row"><span class="muted small grow">不想再过下去了，可以就此收场（写一篇生平）。</span><button id="retire" class="ghost">就此收场</button></div>` : ''}`);
  $$('[data-goalopt]').forEach(b => b.onclick = () => { $('#goalEdit').value = ($('#goalEdit').value.trim() + '\n' + b.dataset.goalopt).trim(); });
  $('#goalSave').onclick = async () => { await act({ type: 'goals', goals: $('#goalEdit').value.split('\n') }); openLife(); };
  if ($('#retire')) $('#retire').onclick = async () => { if (confirm('就此收场？')) { $('#modal').classList.add('hidden'); await act({ type: 'retire', why: '归隐收场' }); } };
}

function openCalendar() {
  modal('历书', `<p>${esc(V.calendar.lunar)}</p><p class="muted">公历约 ${esc(V.calendar.julian)}（儒略历，天文推算，可能差一日）。</p>`);
}

async function openSettings() {
  const c = await api('/api/config');
  modal('设置', `
    <h3>大模型（负责写）</h3>
    <p class="muted small">现成剧本不接也能玩。随机时代、自定义身份必须接：开局底本、每回合的来报、问人、润色、续查都由它写；所有生成的文字都要先过时代把关。</p>
    <div class="field"><label>接口类型</label><select id="cProv"><option value="openai">OpenAI 兼容（DeepSeek、通义、Kimi 等）</option><option value="anthropic">Anthropic</option></select></div>
    <div class="field"><label>接口地址</label><input id="cBase" placeholder="https://api.deepseek.com" value="${esc(c.llm?.baseUrl || '')}"></div>
    <div class="field"><label>模型</label><input id="cModel" placeholder="deepseek-chat" value="${esc(c.llm?.model || '')}"></div>
    <div class="field"><label>Key ${c.llm?.hasKey ? '（已保存，留空不改）' : ''}</label><input id="cKey" type="password"></div>
    <h3>查史（博查，可选）</h3>
    <p class="muted small">不填博查 Key 就用免费的维基百科查史；填了用博查，中文资料更全，博查出错时也会自动退回维基。查到的每条史事都带出处网址，没出处的不发给你。</p>
    <div class="field"><label>博查 API Key ${c.search?.hasKey ? '（已保存，留空不改）' : ''}</label><input id="sKey" type="password" placeholder="sk-…"></div>
    <div class="field"><label>接口地址</label><input id="sEnd" value="${esc(c.search?.endpoint || 'https://api.bochaai.com/v1/web-search')}"></div>
    <div class="field"><label>每局最多检索次数（防止花钱太多）</label><input id="sBudget" type="number" value="${esc(c.search?.budget || 300)}"></div>
    <div class="field"><label><input type="checkbox" id="sOff" ${c.search?.off ? 'checked' : ''}> 关掉联网查史</label></div>
    <div class="field"><label><input type="checkbox" id="rUnv" ${c.research?.allowUnverified ? 'checked' : ''}> 没有出处的史事（未查证）也发给我</label></div>
    <div class="composer-row"><button id="cClear" class="ghost">清除大模型</button><button id="sClear" class="ghost">清除博查</button><span class="grow"></span><button id="cSave" class="primary">保存</button></div>`);
  if (c.llm?.provider) $('#cProv').value = c.llm.provider;
  $('#cSave').onclick = async () => {
    await api('/api/config', {
      llm: { provider: $('#cProv').value, baseUrl: $('#cBase').value.trim(), model: $('#cModel').value.trim(), apiKey: $('#cKey').value.trim() },
      search: { apiKey: $('#sKey').value.trim(), endpoint: $('#sEnd').value.trim(), budget: Number($('#sBudget').value) || 300, off: $('#sOff').checked },
      research: { allowUnverified: $('#rUnv').checked },
    });
    $('#modal').classList.add('hidden');
    if (V && !document.body.classList.contains('at-home')) { V = (await api('/api/load', { id: V.id })).view; render(); } else showHome();
  };
  $('#cClear').onclick = async () => { await api('/api/config', { llm: { clear: true } }); $('#modal').classList.add('hidden'); showHome(); };
  $('#sClear').onclick = async () => { await api('/api/config', { search: { clear: true } }); $('#modal').classList.add('hidden'); showHome(); };
}

$$('[data-open]').forEach(b => b.onclick = () => {
  const k = b.dataset.open;
  if (k === 'home') return showHome();
  if (k === 'settings') return openSettings();
  if (!V) return;
  if (k === 'history') return openHistory();
  if (k === 'log') return openLog();
  if (k === 'calendar') return openCalendar();
  if (k === 'life') return openLife();
});

// 手机：三栏切换
$$('[data-tab]').forEach(b => b.onclick = () => {
  $('#play').dataset.tab = b.dataset.tab;
  $$('[data-tab]').forEach(x => x.classList.toggle('on', x === b));
  window.scrollTo(0, 0);
});

showHome();
