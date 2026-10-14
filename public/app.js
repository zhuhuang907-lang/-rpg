/* 枢引擎控制台：不含任何游戏规则，规则全在 rulepacks/ 里 */

/* $ 找不到元素就老老实实返回 null。
   绑定一律走 on()：元素缺失时在控制台报出 id，而不是静默吞掉——
   之前用 Proxy 占位对象把缺失盖住，结果版本差永远查不出来。 */
const $ = s => document.querySelector(s);
const on = (sel, ev, fn) => {
  const el = $(sel);
  if (!el) { console.warn('[ui] 找不到元素 ' + sel + '，未绑定 ' + ev); return null; }
  el.addEventListener(ev, fn);
  return el;
};
const escapeHtml = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ================= 网络层：所有失败都变成异常 =================
   后端约定：业务失败回 HTTP 200 + { ok:false, why }；少数旧接口回 { error }。
   这里统一拦下来抛 ApiError，调用方只需要 try/catch，不必记住每个接口的报错字段。
   个别接口用 ok:false 表示「没有数据」而非出错（如快照修复建议），传 { soft:true } 拿原始结果。 */
class ApiError extends Error {
  constructor(msg, data) { super(msg); this.name = 'ApiError'; this.data = data || null; }
}
async function api(method, u, b, opts = {}) {
  let res;
  try {
    res = await fetch(u, method === 'GET' ? undefined
      : { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });
  } catch (e) {
    throw new ApiError('连不上服务（' + (e && e.message || e) + '）。服务是不是没启动？');
  }
  const text = await res.text();
  let j = null;
  try { j = text ? JSON.parse(text) : null; } catch { throw new ApiError(`服务返回了非 JSON（HTTP ${res.status}）`); }
  if (!res.ok) throw new ApiError((j && (j.why || j.error)) || `HTTP ${res.status}`, j);
  if (opts.soft) return j;
  if (j && j.ok === false) throw new ApiError(j.why || j.error || '操作被拒绝', j);
  if (j && typeof j.error === 'string' && j.error) throw new ApiError(j.error, j);
  return j;
}
const post = (u, b, opts) => api('POST', u, b, opts);
const get = (u, opts) => api('GET', u, null, opts);
const errMsg = e => String((e && e.message) || e || '未知错误');

/* ================= 提示：toast / 通知框 / 确认框 / 输入框 =================
   不用浏览器原生 alert/confirm/prompt：内嵌浏览器里会被静默屏蔽，表现就是「点了没反应」。 */
function toast(msg, kind = 'info', ms = 4200) {
  let host = $('#toastHost');
  if (!host) { host = document.createElement('div'); host.id = 'toastHost'; document.body.appendChild(host); }
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.textContent = String(msg);
  host.appendChild(el);
  setTimeout(() => el.classList.add('out'), ms - 300);
  setTimeout(() => el.remove(), ms);
}
/* 通用小对话框（独立于主弹窗，可以叠在主弹窗上面） */
function askDialog({ title, text = '', input = null, okLabel = '确定', cancelLabel = '取消', danger = false }) {
  return new Promise(resolve => {
    const dlg = $('#dlg');
    if (!dlg) { resolve(input ? null : window.confirm(text)); return; }
    $('#dlgTitle').textContent = title || '';
    $('#dlgText').textContent = text;
    const inp = $('#dlgInput');
    inp.classList.toggle('hidden', !input);
    inp.value = ''; inp.placeholder = (input && input.placeholder) || '';
    const ok = $('#dlgOk'), cancel = $('#dlgCancel');
    ok.textContent = okLabel; cancel.textContent = cancelLabel;
    ok.classList.toggle('danger', !!danger);
    cancel.classList.toggle('hidden', cancelLabel === null);
    let done = false;
    const finish = v => {
      if (done) return; done = true;
      dlg.classList.add('hidden');
      ok.onclick = cancel.onclick = null; inp.onkeydown = null; dlg.onkeydown = null;
      resolve(v);
    };
    ok.onclick = () => finish(input ? inp.value.trim() : true);
    cancel.onclick = () => finish(input ? null : false);
    dlg.onkeydown = e => { if (e.key === 'Escape') finish(input ? null : false); };
    inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); ok.click(); } };
    dlg.classList.remove('hidden');
    (input ? inp : ok).focus();
  });
}
const askConfirm = (text, okLabel = '确定') => askDialog({ title: '确认', text, okLabel, danger: true });
const askText = (title, text, placeholder) => askDialog({ title, text, input: { placeholder }, okLabel: '好' });
const notice = (title, text) => askDialog({ title, text, okLabel: '知道了', cancelLabel: null });

/* 按钮级「处理中」：置灰 + 换文案 + 防重复点击 + 出错 toast。
   所有会打网络的按钮都应该套这一层，否则等待期间再点一次就会重复提交。 */
async function busy(btn, label, fn) {
  const el = typeof btn === 'string' ? $(btn) : btn;
  if (el && el.disabled) return undefined;
  const old = el ? el.textContent : '';
  if (el) { el.disabled = true; if (label) el.textContent = label; }
  try { return await fn(); }
  catch (e) { console.error(e); toast(errMsg(e), 'err'); return undefined; }
  finally { if (el) { el.disabled = false; el.textContent = old; } }
}

let STATE = null, ADAPTERS = [], CONFIGS = {}, LAST = null, SEARCH = null, VERIFY_LOG = [], PACK = null, SEL = 'deepseek';

async function loadCfgs() {
  const c = await get('/api/adapter-config');
  CONFIGS = c.configs || {};
  if (c.selected) SEL = c.selected;
}
async function saveCfgs(selected) { await post('/api/adapter-config', { selected, configs: CONFIGS }); }

/* ================= 顶栏：存档 / 状态条 ================= */
async function reloadSaves() {
  const list = await get('/api/saves');
  const sel = $('#saveSel');
  sel.innerHTML = '<option value="">— 已有存档 —</option>';
  list.forEach(s => sel.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(s.id)}">${escapeHtml(s.title)}（第${s.turn}轮）</option>`));
  if (STATE && list.some(x => x.id === STATE.meta.id)) sel.value = STATE.meta.id;
  // 存档管理列表（每条自带删除键，避免只靠顶部按钮误删/删不掉）
  const box = $('#saveListBox');
  if (box) {
    box.innerHTML = list.length ? list.map(s => `<div class="saveitem">
        <div class="si-main"><b>${escapeHtml(s.title)}</b><span class="muted"> · 第${s.turn}轮 · ${escapeHtml(s.id)}</span></div>
        <button class="minibtn del" data-del="${escapeHtml(s.id)}" data-title="${escapeHtml(s.title)}">删除</button>
      </div>`).join('')
      : '<div class="muted">还没有存档。</div>';
    box.querySelectorAll('button[data-del]').forEach(b => b.onclick = () => doDeleteSave(b.dataset.del, b.dataset.title));
  }
}

async function doDeleteSave(id, title) {
  const yes = await askConfirm(`删掉「${title}」？不可恢复。`, '删掉');
  if (!yes) return false;
  try { await post('/api/save/delete', { saveId: id }); }
  catch (e) { toast('删除失败：' + errMsg(e), 'err'); return false; }
  if (STATE && STATE.meta.id === id) STATE = null;
  await reloadSaves(); renderState();
  toast(`已删除「${title}」`);
  return true;
}

/* 存档管理：点顶部「存档管理」立刻弹出，列出全部存档，每条一个删除键。
   （旧版把它埋在隐藏的「档案」页里，所以你觉得删不掉 —— 已改） */
// 测试残留存档的前缀（仅这些可被「一键清空」删除；真实存档 liangmo-/custom- 永不动）
const TEST_SAVE_PREFIXES = ['selftest-', 'plot-e2e-', 'plot-', 'xjlong-', 'yanjun-', 'yezhiwei-', 'mxs-', 't-', 'vlock-', 'archtest', 'apitest-', 'tmp-', 'zzz-'];
const PROTECTED_SAVE_PREFIXES = ['liangmo-', 'custom-'];
// 精确夹具：被测试当模板读取的存档（如 yezhiwei-1068-autumn），即使前缀像测试也绝不删
const EXACT_FIXTURE_IDS = ['yezhiwei-1068-autumn'];
function isTestSave(id) {
  if (!id) return false;
  if (EXACT_FIXTURE_IDS.includes(id)) return false;
  if (PROTECTED_SAVE_PREFIXES.some(p => id.startsWith(p))) return false;
  return TEST_SAVE_PREFIXES.some(p => id.startsWith(p));
}

on('#btnSaves', 'click', () => busy('#btnSaves', '读取中…', async () => {
  const list = await get('/api/saves');
  const rows = list.length
    ? list.map(s => `<div class="saveitem">
        <div class="si-main"><b>${escapeHtml(s.title)}</b>
          <span class="muted"> · 第${s.turn}轮</span>
          <div class="muted" style="font-size:11px">${escapeHtml(s.id)}</div></div>
        <div class="btnrow" style="flex:none">
          <button class="minibtn" data-open="${escapeHtml(s.id)}">打开</button>
          <button class="minibtn del" data-del="${escapeHtml(s.id)}" data-title="${escapeHtml(s.title)}">删除</button>
        </div></div>`).join('')
    : '<div class="muted">还没有任何存档。</div>';
  const testCount = list.filter(s => isTestSave(s.id)).length;
  const head = `<div class="secnote">共 <span id="saveCount">${list.length}</span> 个存档。点「打开」切换，点「删除」永久删掉。` +
    (testCount ? `<button id="btnClearTest" class="minibtn" style="margin-left:8px">一键清空 ${testCount} 个测试存档</button>` : '') +
    `</div>`;

  openModal('存档管理', `${head}<div class="list">${rows}</div>`, null);
  // 行内删除：删完直接移除该行并刷新计数，不再关掉整个弹窗重开（更顺滑）
  $('#modalContent').querySelectorAll('button[data-del]').forEach(b => b.onclick = async () => {
    if (await doDeleteSave(b.dataset.del, b.dataset.title)) {
      const item = b.closest('.saveitem'); if (item) item.remove();
      const remaining = $('#modalContent').querySelectorAll('.saveitem').length;
      const cnt = $('#saveCount'); if (cnt) cnt.textContent = remaining;
      if (remaining === 0) { const list2 = $('#modalContent').querySelector('.list'); if (list2) list2.innerHTML = '<div class="muted">还没有任何存档。</div>'; }
      const ctBtn = $('#btnClearTest'); if (ctBtn) ctBtn.remove();
    }
  });
  $('#modalContent').querySelectorAll('button[data-open]').forEach(b => b.onclick = () => busy(b, '打开中…', async () => {
    STATE = await post('/api/state', { saveId: b.dataset.open });
    closeModal(); await reloadSaves(); renderState();
  }));
  // 一键清空测试存档：只删测试残留，真实存档（梁朝末年等）不受影响
  const clearBtn = $('#btnClearTest');
  if (clearBtn) clearBtn.onclick = async () => {
    const yes = await askConfirm(`确定清空全部「测试残留」存档（共 ${testCount} 个）？真实存档（梁朝末年等）不受影响。`, '清空');
    if (!yes) return;
    await busy(clearBtn, '清空中…', async () => {
      const all = await get('/api/saves');
      let done = 0, failed = 0;
      for (const s of all.filter(s => isTestSave(s.id))) {
        try { await post('/api/save/delete', { saveId: s.id }); done++; } catch { failed++; }
      }
      if (STATE && !all.some(x => x.id === STATE.meta.id)) STATE = null;
      await reloadSaves(); renderState();
      toast(`已清空 ${done} 个测试存档${failed ? `，${failed} 个失败` : ''}`);
    });
    $('#btnSaves').click(); // 刷新列表
  };
}));

on('#saveSel', 'change', async e => {
  if (!e.target.value) return;
  try {
    STATE = await post('/api/state', { saveId: e.target.value });
    renderState();
  } catch (err) { toast('读取存档失败：' + errMsg(err), 'err'); e.target.value = STATE ? STATE.meta.id : ''; }
});

function renderStatusBar() {
  const bar = $('#statusBar');
  if (!STATE) { bar.innerHTML = '还没开局 —— 选一个现成的，或点「＋ 新开局」'; return; }
  const s = STATE;
  bar.innerHTML = `<b>${escapeHtml(s.title)}</b> · ${escapeHtml(s.clock.yearLabel)}（${s.clock.gregorianYear < 0 ? '前' + -s.clock.gregorianYear : s.clock.gregorianYear}年）${s.clock.month}月${s.clock.day}日 · ${escapeHtml(s.location.full)} · 你是 ${escapeHtml(s.protagonist.name)}${s.protagonist.gender ? '（' + escapeHtml(s.protagonist.gender) + '）' : ''}，${s.protagonist.age}岁`;
}

/* ================= 新开局（任意朝代 / 身份 / 地点） ================= */
const IDENTITIES = [
  { id: 'emperor', name: '皇帝 / 最高统治者', desc: '朝局是多方博弈，奏报会瞒报夸大延迟；调兵要看派系和粮饷。' },
  { id: 'noble', name: '宗室 / 贵族', desc: '爵位食邑与升降、与皇权的恩宠猜忌、联姻网络、庄园收支。' },
  { id: 'official', name: '官员', desc: '考课与座师同年决定升迁，越级奏事有风险，忠君与良心之间拉扯。' },
  { id: 'warlord', name: '军阀 / 独立领主', desc: '兵、地盘、粮饷自给；与中央是平等博弈；亲信忠诚高于官职。' },
  { id: 'commoner', name: '平民百姓', desc: '赋役地租是第一约束；看不到朝堂机密，只能靠告示和行商传闻。' },
];

/* 身份 → 默认职衔（新开局不填时自动带出，确保「皇帝就是皇帝」明确显示） */
const IDM_ROLE_DEFAULT = {
  emperor: (era) => `${era.polity && era.polity !== '（未核实）' ? era.polity : '本朝'}皇帝`,
  noble: () => '宗室 / 世家贵族',
  official: () => '朝廷命官',
  warlord: () => '一方军阀',
  commoner: () => '平民',
};

on('#btnNew', 'click', () => {
  const eras = PACK?.eraPresets || [];
  const eraOpts = eras.map(e => `<option value="${e.id}">${escapeHtml(e.label)}</option>`).join('');
  const idCards = IDENTITIES.map(i => `
    <div class="pick" data-idm="${i.id}"><input type="radio" name="idm">
      <div><div class="pt">${i.name}</div><div class="pd">${i.desc}</div></div></div>`).join('');

  openModal('＋ 新开局', `
    <div class="secnote">① 什么时代（选一个现成的，或自己填）</div>
    <div class="field"><label>时代</label><select id="nEra">${eraOpts}<option value="__custom">—— 我自己填 ——</option></select></div>
    <div class="grid2" id="nEraCustom" style="display:none">
      <div class="field"><label>年号 / 纪年</label><input id="nYearLabel" placeholder="如：天宝十四载"></div>
      <div class="field"><label>公元年（公元前填负数）</label><input id="nGYear" type="number" placeholder="如：755"></div>
      <div class="field"><label>政权</label><input id="nPolity" placeholder="如：唐"></div>
      <div class="field"><label>月份 / 日期</label><input id="nMD" placeholder="如：11 / 9"></div>
    </div>

    <div class="secnote">② 你是什么人</div>
    <div id="nIdent">${idCards}</div>
    <div class="field"><label><input type="checkbox" id="nReal"> 扮演<b>真实历史人物</b>（勾选后会自动核查他的生卒年、籍贯和亲属）</label></div>
    <div id="nRealBox" style="display:none">
      <div class="btnrow"><button id="nCheck">核查这个人</button><span id="nCheckOut" class="muted"></span></div>
      <div id="nCand"></div>
    </div>

    <div class="grid2">
      <div class="field"><label>姓名</label><input id="nName" placeholder="如：陆文昭"></div>
      <div class="field"><label>性别</label><select id="nGender"><option value="男">男</option><option value="女">女</option></select></div>
      <div class="field"><label>年龄（可留空）</label><input id="nAge" type="number" placeholder="可留空"></div>
      <div class="hintbox">年龄可留空：真人模式会自动搜出<b>真实年龄与出身</b>；虚构模式由引擎按身份<b>估计</b>；你也可自行填一个数字覆盖。</div>
      <div class="field"><label>身份头衔</label><input id="nRole" placeholder="如：睦州青溪县书生"></div>
      <div class="field"><label>所在地点（越具体越好）</label><input id="nPlace" placeholder="如：两浙路 睦州 青溪县"></div>
    </div>

    <div class="secnote">③ 开局处境（可留空，留空则让 GM 按史实直接开场）</div>
    <div class="field"><textarea id="nSit" placeholder="例如：你是个刚接手的县主簿，前任留下一堆烂账，乡里又在闹旱。"></textarea></div>

    <div class="secnote">④ 开局线索（一行一条，可留空）</div>
    <div class="field"><textarea id="nThreads" placeholder="前任留下的账目对不上&#10;乡里旱情无人报&#10;邻县有人来投"></textarea></div>
    <div class="hintbox">不知道填什么就只填 ①②，其余留空，GM 会按该朝代真实情况给你开场。</div>`,
    async () => {
      const eraId = $('#nEra').value;
      const custom = eraId === '__custom';
      const preset = eras.find(e => e.id === eraId) || {};
      const era = custom
        ? {
          yearLabel: $('#nYearLabel').value || '（年号待定）',
          gregorianYear: Number($('#nGYear').value) || 0,
          polity: $('#nPolity').value || '（未核实）',
          month: Number(($('#nMD').value || '1/1').split('/')[0]) || 1,
          day: Number(($('#nMD').value || '1/1').split('/')[1]) || 1,
        }
        : { ...preset };
      const idm = document.querySelector('#nIdent .pick.sel')?.dataset.idm || 'official';
      // 真人模式必须先核查并明确选定一个人，否则生卒年/籍贯锚点全是空的，和虚构模式没区别
      if ($('#nReal').checked && !(REAL && REAL.chosen)) {
        toast('勾了「扮演真实历史人物」就得先点「核查这个人」并选定一个候选，否则取消勾选。', 'warn');
        return false;
      }
      const [mm, dd] = (preset.month && preset.day) ? [preset.month, preset.day] : [era.month, era.day];
      const spec = {
        ruleset: PACK.id,
        title: `${era.yearLabel} · ${$('#nName').value || '无名'}`,
        era: { ...era, month: mm || 1, day: dd || 1, season: preset.season || '' },
        identityModule: idm,
        protagonist: {
          name: $('#nName').value, age: ($('#nAge').value != null && String($('#nAge').value).trim() !== '') ? Number($('#nAge').value) : null,
          gender: $('#nGender').value || '男',
          role: $('#nRole').value || (IDM_ROLE_DEFAULT[idm] ? IDM_ROLE_DEFAULT[idm](era) : '（身份待定）'), disposition: '',
        },
        location: { full: $('#nPlace').value, polity: era.polity, controller: '未核实' },
        situation: $('#nSit').value,
        threads: ($('#nThreads').value || '').split('\n').map(s => s.trim()).filter(Boolean),
        npcs: [], resources: {},
        mode: $('#nReal').checked ? 'real' : 'fictional',
        anchors: ($('#nReal').checked && REAL?.chosen)
          ? { ...REAL.chosen, kin: (REAL.kin || []).map(k => `${k.relation}：${k.name}`).join('　') }
          : null,
        household: ($('#nReal').checked && REAL?.kin?.length)
          ? {
            clan: '',
            members: REAL.kin.map(k => ({ name: k.name, relation: k.relation, age: null, status: '在世', role: '', attitude: '', note: '由 Wikidata 亲属关系自动填入，未逐一核实' })),
            property: {}, obligations: [],
          }
          : { clan: '', members: [], property: {}, obligations: [] },
        geography: null,
      };
      let created;
      $('#modalOk').textContent = '建档中…';
      try { created = await post('/api/save/custom', spec); }
      catch (e) { toast('开不了这个局：' + errMsg(e), 'err'); return false; }   // 留在弹窗里让人改
      STATE = created;
      $('#modalOk').textContent = '生成世界中（联网查人物与地图，约一两分钟）…';
      try {
        const w = await post('/api/world/seed', { saveId: STATE.meta.id, adapterId: SEL });
        STATE = w.state || STATE;
        if (w.histError) toast('历史人物联网拉取失败（不影响开局）：' + w.histError, 'warn', 7000);
      } catch (e) { toast('生成世界失败，可稍后点「重新生成世界」：' + errMsg(e), 'warn', 7000); }
      await reloadSaves(); renderState();
      $('#input').focus();
    });

  let REAL = null; // 真人模式核查结果

  const eraOf = () => {
    const e = eras.find(x => x.id === $('#nEra').value);
    if ($('#nEra').value === '__custom') return { yearLabel: $('#nYearLabel').value, gregorianYear: Number($('#nGYear').value) || 0 };
    return e || {};
  };

  $('#nReal').onchange = () => { $('#nRealBox').style.display = $('#nReal').checked ? 'block' : 'none'; };

  $('#nCheck').onclick = () => busy('#nCheck', '查询中…', async () => {
    const name = $('#nName').value.trim();
    if (!name) { $('#nCheckOut').textContent = '先填姓名'; return; }
    $('#nCheckOut').textContent = '查 Wikidata 中…'; $('#nCheckOut').className = 'muted'; $('#nCand').innerHTML = '';
    let r;
    try { r = await post('/api/verify/realperson', { name, era: eraOf().yearLabel, gregorianYear: eraOf().gregorianYear }); }
    catch (e) { $('#nCheckOut').textContent = '核查失败：' + errMsg(e); $('#nCheckOut').className = 'errline'; return; }
    REAL = r;   // 换了人就重置选择，不能带着上一个人的 chosen 开局
    $('#nCheckOut').textContent = r.verdict.state + '：' + r.verdict.reason;
    $('#nCheckOut').className = r.verdict.state === '信息缺口' ? 'state-gap' : 'state-warn';
    if (!r.candidates?.length) return;
    $('#nCand').innerHTML = '<div class="secnote">点「用这个」指定你要扮演哪一个（末年同名极多，必须挑；与开局年代不相容的会被标红、选不了）：</div>' +
      r.candidates.map((c, i) => {
        const fe = c.fitsEra || { ok: true };
        const bad = fe.ok === false && !fe.unknown;      // 明确不相容 → 拦
        const unknown = fe.ok === false && fe.unknown;   // 生卒不详 → 提示但不拦
        const mark = bad ? `<span class="state-warn">不相容</span> <span class="muted">${escapeHtml(fe.why || '')}</span>`
          : unknown ? '<span class="state-warn">生卒不详·待核</span>'
          : '<span class="state-pass">相容</span>';
        return `<div class="cand ${bad ? 'bad' : ''}" data-q="${escapeHtml(c.qid)}" data-label="${escapeHtml(c.label)}" data-b="${c.born ?? ''}" data-d="${c.died ?? ''}" data-bp="${escapeHtml(c.birthPlace || '')}" data-g="${escapeHtml(c.gender || '')}" data-fit="${bad ? '0' : '1'}">
          <div><div class="cn">${escapeHtml(c.label)} ${c.birthPlace ? '· ' + escapeHtml(c.birthPlace) : ''}</div>
               <div class="cy">${c.born ?? '?'} — ${c.died ?? '?'} · <a href="https://www.wikidata.org/wiki/${escapeHtml(c.qid)}" target="_blank" rel="noreferrer">${escapeHtml(c.qid)}</a> · ${mark}</div></div>
          <button class="minibtn" ${bad ? 'disabled' : ''}>用这个</button>
        </div>`;
      }).join('') +
      (r.kin?.length ? `<div class="secnote">已知亲属（会自动填进「家」）：</div><div class="railnote">${r.kin.map(k => `${escapeHtml(k.relation)}：${escapeHtml(k.name)}`).join('　')}</div>` : '');
    $('#nCand').onclick = e => {
      const c = e.target.closest('.cand'); if (!c) return;
      if (c.dataset.fit === '0') {
        notice('这个人选不了', '这个人活不到你设定的年代。' + (c.querySelector('.muted')?.textContent || '') + '\n\n请改年号/公元年，或换一个活在该时代的人。');
        return;
      }
      document.querySelectorAll('#nCand .cand').forEach(x => x.classList.remove('sel'));
      c.classList.add('sel');
      REAL.chosen = { qid: c.dataset.q, born: Number(c.dataset.b) || null, died: Number(c.dataset.d) || null, birthPlace: c.dataset.bp, gender: c.dataset.g || '' };
      // 选定真实人物后，自动回填姓名/年龄/性别/身份，免得再手填
      $('#nName').value = c.dataset.label;
      if (c.dataset.g) $('#nGender').value = c.dataset.g;
      const ey = Number(eraOf().gregorianYear) || 0;
      if (REAL.chosen.born && ey && ey >= REAL.chosen.born) {
        $('#nAge').value = ey - REAL.chosen.born + 1;   // 虚岁
      }
      if (!$('#nRole').value.trim()) {
        const idm = document.querySelector('#nIdent .pick.sel')?.dataset.idm || 'official';
        const er = eraOf();
        const base = idm === 'emperor'
          ? (er.polity && er.polity !== '（未核实）' ? er.polity : '本朝') + '皇帝'
          : (IDM_ROLE_DEFAULT[idm] ? IDM_ROLE_DEFAULT[idm](er) : '真实历史人物');
        $('#nRole').value = base + '（真实历史人物）';
      }
      $('#nCheckOut').textContent = `已选：${c.dataset.label}（姓名/年龄已自动填好）`;
      $('#nCheckOut').className = 'okline';
    };
  });

  $('#nEra').onchange = () => { $('#nEraCustom').style.display = $('#nEra').value === '__custom' ? 'grid' : 'none'; };
  document.querySelectorAll('#nIdent .pick').forEach(p => p.onclick = () => {
    document.querySelectorAll('#nIdent .pick').forEach(x => x.classList.remove('sel'));
    p.classList.add('sel'); p.querySelector('input').checked = true;
  });
  document.querySelector('#nIdent .pick').classList.add('sel');
});

/* ================= 渲染主区与档案 ================= */
function renderState() {
  renderStatusBar();
  if (!STATE) {
    $('#starterCards').classList.remove('hidden');
    $('#logBox').innerHTML = '';
    $('#draftBox').classList.add('hidden');
    return;
  }
  $('#starterCards').classList.add('hidden');
  const s = STATE;
  // 旧档记着旧默认值「short」（300 字时代），不沿用；新标准是 1200~2000 字。玩家主动选过别的才沿用
  if (s.meta && s.meta.verbosity && s.meta.verbosity !== 'short' && $('#verbosity')) $('#verbosity').value = s.meta.verbosity;

  $('#stateBox').className = 'kv';
  $('#stateBox').innerHTML = `
    <div><b>时间</b>${escapeHtml(s.clock.yearLabel)}（${s.clock.gregorianYear < 0 ? '公元前' + -s.clock.gregorianYear : s.clock.gregorianYear}）${s.clock.month}月${s.clock.day}日 ${escapeHtml(s.clock.season || '')}</div>
    <div><b>地点</b>${escapeHtml(s.location.full)}</div>
    <div><b>政权</b>${escapeHtml(s.location.polity)}</div>
    <div><b>控制者</b>${escapeHtml(s.location.controller)}</div>
    <div><b>你</b>${escapeHtml(s.protagonist.name)}，${(s.protagonist.age != null ? s.protagonist.age : '?')}岁，${escapeHtml(s.protagonist.role)}</div>
    <div><b>轮次</b>第 ${s.turn} 轮</div>
    ${s.opening ? `<div><b>开局</b>${escapeHtml(s.opening)}</div>` : ''}`;

  // 家 / 家族
  const h = s.household || {};
  $('#familyBox').className = 'kv';
  $('#familyBox').innerHTML = (h.clan || (h.members || []).length)
    ? `${h.clan ? `<div><b>宗族</b>${escapeHtml(h.clan)}</div>` : ''}`
      + (h.members || []).map(m => `<div>· ${escapeHtml(m.name)}（${m.gender ? escapeHtml(m.gender) + '，' : ''}${escapeHtml(m.relation)}${m.rank ? '·' + escapeHtml(m.rank) : ''}${m.age ? '，' + m.age + '岁' : ''}，${escapeHtml(m.status || '在世')}）${m.nativePlace ? '，籍贯：' + escapeHtml(m.nativePlace) : ''}${m.background ? '，' + escapeHtml(m.background) : ''}${m.role ? '，' + escapeHtml(m.role) : ''}${m.attitude ? '，态度：' + escapeHtml(m.attitude) : ''}</div>`).join('')
      + (h.property && Object.keys(h.property).length ? `<div><b>家产</b>${escapeHtml(Object.entries(h.property).map(([k, v]) => k + '=' + v).join('、'))}</div>` : '')
      + ((h.obligations || []).length ? `<div><b>义务</b>${escapeHtml(h.obligations.join('、'))}</div>` : '')
    : '<div class="muted">还没登记 —— 点上面的「让 AI 拟一份」，或直接在设置里手填。</div>';

  // 地理（真实检索）
  const g = s.geography || {};
  const gk = ['地形', '水系', '道路驿站', '距州治', '邻境', '物产', '常发灾异'].filter(k => g[k]);
  $('#geoBox').className = 'kv';
  $('#geoBox').innerHTML = gk.length
    ? gk.map(k => `<div><b>${k}</b>${escapeHtml(g[k])}</div>`).join('')
      + (g.source ? `<div class="muted">来源：${escapeHtml(g.source)}</div>` : '')
      + (g.note ? `<div class="muted">${escapeHtml(g.note)}</div>` : '')
    : '<div class="muted">还没登记 —— 点上面的「重新生成世界」会按真实史料检索该地地理；查不到的字段会写「不详」，不编造。</div>';

  // 史实锚点
  const a = s.anchors;
  $('#anchorBox').className = 'kv';
  $('#anchorBox').innerHTML = a
    ? `<div><b>生</b>${a.born ?? '?'}　<b>卒</b>${a.died ?? '?'}</div>`
      + (a.birthPlace ? `<div><b>籍贯</b>${escapeHtml(a.birthPlace)}</div>` : '')
      + (a.kin ? `<div><b>亲属</b>${escapeHtml(a.kin)}</div>` : '')
      + (a.qid ? `<div><b>来源</b><a href="https://www.wikidata.org/wiki/${escapeHtml(a.qid)}" target="_blank" rel="noreferrer">${escapeHtml(a.qid)}</a></div>` : '')
      + '<div class="muted">写进提示词当硬约束：不得让他早于生年行事、活过卒年、或籍贯对不上。</div>'
    : '<div class="muted">虚构人物模式。想玩真人，开新局时勾选「扮演真实历史人物」。</div>';

  $('#threadBox').innerHTML = s.threads.map(t => `
    <div class="item">
      <div class="t">${escapeHtml(t.title)}${s.turn - (t.lastTouchedTurn || 0) > 2 ? ' <span class="muted">(久未触及)</span>' : ''}</div>
      <div class="meta">状态 ${t.status}${t.note ? ' · ' + escapeHtml(t.note) : ''}</div>
      <div class="meta"><a href="#" data-th="${encodeURIComponent(t.title)}" data-act="open">恢复追查</a> ·
        <a href="#" data-th="${encodeURIComponent(t.title)}" data-act="resolved">标记已了</a> ·
        <a href="#" data-th="${encodeURIComponent(t.title)}" data-act="dropped">搁置</a></div>
    </div>`).join('') || '<div class="muted">无</div>';

  $('#npcBox').innerHTML = (() => {
    // 只有打过交道的人才谈得上态度与动机；同代未交往的人只列身份
    const hasContact = n => {
      if (!n) return false;
      if (n.contact === true) return true;
      if (['generated', 'real-kin', 'fictional', 'historical-keep'].includes(n.source)) return true;
      return !!(n.firstSeenTurn && n.firstSeenTurn > 0);
    };
    const tracksAttitude = ['warlord', 'emperor'].includes(s.identityModule);
    const card = (n, tag) => `<div class="item">
      <div class="t">${escapeHtml(n.name)} <span class="meta">${n.gender ? escapeHtml(n.gender) + ' · ' : ''}${n.age ? n.age + '岁 · ' : ''}${escapeHtml(n.role || '')}</span></div>
      <div class="meta">${tag} · 籍贯：${escapeHtml(n.nativePlace || '—')}</div>
      ${n.office ? `<div class="meta">真实职掌：${escapeHtml(n.office)}</div>` : ''}
      ${n.background ? `<div class="meta">背景：${escapeHtml(n.background)}</div>` : ''}
      ${n.tie ? `<div class="meta">关系：${escapeHtml(n.tie)}</div>` : ''}
      ${n.attitude && hasContact(n) && tracksAttitude ? `<div class="meta">对你的态度：${escapeHtml(n.attitude)}</div>` : ''}
      ${n.goal ? `<div class="meta">要：${escapeHtml(n.goal)}　惧：${escapeHtml(n.risk)}　叛：${escapeHtml(n.defectionCondition)}</div>`
        : (hasContact(n) ? '<div class="state-gap">还没登记目标/风险/背叛条件</div>' : '<div class="meta muted">尚未与你交往 —— 不编造他的态度与私心</div>')}
    </div>`;
    const met = s.npcs.filter(hasContact);
    const unmet = s.npcs.filter(n => !hasContact(n));
    const blocks = [];
    if (met.length) {
      const metHist = met.filter(n => n.source === 'historical');
      const metLocal = met.filter(n => n.source !== 'historical');
      blocks.push(`<div class="grp">${tracksAttitude ? '已结交 / 打交道的人（你需要掌握他们的忠诚与态度）' : '已结交 / 打交道的人'}</div>`);
      if (metHist.length) blocks.push(metHist.map(n => card(n, '真实人物')).join(''));
      if (metLocal.length) blocks.push(metLocal.map(n => card(n, '本地')).join(''));
    }
    if (unmet.length) {
      blocks.push(`<div class="grp">${s.identityModule === 'emperor' ? '本朝臣工 / 同代人物（尚未与你交往）' : '同代人物（尚未与你交往）'}</div>`);
      blocks.push(`<div class="railnote">这些是与你同时代的真人，你还没和他们打过交道。他们不在这里被编造态度——只有当你真的派人接洽、共事或交锋后，才会转入「已结交」。</div>`);
      blocks.push(unmet.map(n => card(n, '真实人物')).join(''));
    }
    return blocks.join('') || '<div class="muted">还没有人 —— 开新局会自动生成，或点「重新生成世界」。</div>';
  })();

  renderMap(s);
  applyPanels(s);
  renderWarPanel();   // 只有存档里有 encounter（正打着仗）时才显示
  renderCorrections();
  if (typeof updateAdvPreview === 'function') updateAdvPreview();
  // 世界与回滚两块跟着存档走：换了存档/回滚了就该是新的那份
  renderWorldPanel();
  renderSnapshots();

  // 天降之事（本局事件史）
  const elog = s.eventLog || [];
  $('#eventLogBox').innerHTML = elog.length
    ? elog.slice().reverse().slice(0, 20).map(e => `<div class="item">
        <div class="t">〔${escapeHtml(e.familyName)}〕<span class="meta">${escapeHtml(e.severity || '')} · 第${e.turn}轮</span></div>
        <div class="meta">${escapeHtml(e.text)}</div>
      </div>`).join('')
    : '<div class="muted">还没有突发事件。这类事出现率低（每回合约 8%）。</div>';

  // 战况（本局战斗记录）
  const blog = s.battleLog || [];
  $('#battleLogBox').innerHTML = blog.length
    ? blog.slice().reverse().slice(0, 10).map(b => `<div class="item">
        <div class="t">${escapeHtml(b.ourFormation || '')}${b.ourTactic ? '／' + escapeHtml(b.ourTactic) : ''} 对 ${escapeHtml(b.enemyFormation || '')}${b.enemyTactic ? '／' + escapeHtml(b.enemyTactic) : ''}</div>
        <div class="meta">${escapeHtml(b.at || '')} · ${escapeHtml(b.outcome ? b.outcome.result : '')} · 我军伤亡 ${b.outcome ? b.outcome.casualties.A : '?'}，敌军 ${b.outcome ? b.outcome.casualties.B : '?'}</div>
      </div>`).join('')
    : '<div class="muted">还没有战斗。</div>';

  // 派系 / 内斗（只给史实框架，成员由 AI 依史实指认）
  $('#factionBox').innerHTML = (s.factions || []).length
    ? s.factions.map(f => `<div class="item">
        <div class="t">${escapeHtml(f.title)}</div>
        <div class="meta">${escapeHtml(f.stake || '')}</div>
        <div class="meta">${escapeHtml(f.sideA)}${(f.membersA || []).length ? '：' + escapeHtml(f.membersA.join('、')) : ''} ／ ${escapeHtml(f.sideB)}${(f.membersB || []).length ? '：' + escapeHtml(f.membersB.join('、')) : ''}</div>
      </div>`).join('') + '<div class="railnote">这些是史实框架。谁属哪一派由 AI 依真实史实指认后写在剧情里，不在这里预先乱排。</div>'
    : '<div class="muted">本局未生成派系。点上面的「重新生成世界」可刷新。</div>';

  $('#threadSel').innerHTML = s.threads.filter(t => t.status === 'open')
    .map(t => `<option value="${encodeURIComponent(t.title)}">${escapeHtml(t.title)}</option>`).join('');

  const hasLog = (s.log || []).some(l => l.speaker === 'GM');
  $('#logBox').innerHTML = s.log.map(l => `
    <div class="entry"><div class="who">第${l.turn}轮 · ${escapeHtml(l.time)} · ${escapeHtml(l.speaker)}</div><div class="scene">${escapeHtml(l.text)}</div></div>`).join('')
    || `<div class="openingCard">
        <div class="oc-t">新局已就绪 · 还没有开场</div>
        <div class="oc-d">点下面「${escapeHtml(s.opening ? '生成开场' : '生成开场')}」，AI 会先交代清楚：<b>时间（年号+公元+季节+日子）、地点（当时的古地名，隶属谁、谁控制）、你是谁（姓名/年岁/性别/身份职衔/籍贯出身）、家世与处境、当朝天子与天下大势、眼下压到你身上的那一桩事、在场各人的姓名神情</b>，最后停在你要拿主意的坎上。</div>
        ${s.opening ? `<div class="oc-o">开局处境：${escapeHtml(s.opening)}</div>` : ''}
        <div class="btnrow"><button id="btnOpening" class="primary big">▶ 生成开场</button>
          <span class="muted">现在是${escapeHtml(s.clock.yearLabel)}（公元${s.clock.gregorianYear}年）· ${escapeHtml(s.location.full)} · 你是${escapeHtml(s.protagonist.name)}，${s.protagonist.age}岁</span></div>
      </div>`;
  if (!hasLog && $('#btnOpening')) $('#btnOpening').onclick = () => runTurnWith('', []);
  $('#draftBox').classList.add('hidden');
  syncFactMode();
}

/* 读档时把存档里的史实宽容度带回选择框（之前是每秒轮询一次，现在在渲染时同步） */
let FACT_SYNCED_FOR = null;
function syncFactMode() {
  if (!STATE || !STATE.meta || STATE.meta.id === FACT_SYNCED_FOR) return;
  FACT_SYNCED_FOR = STATE.meta.id;
  if (STATE.meta.factMode && $('#factMode')) $('#factMode').value = STATE.meta.factMode;
}

function suggestFirstAction(s) {
  return (s.threads || [])[0] ? `我要查${s.threads[0].title}` : '先看看眼前是什么情况';
}

/* ================= 身份：显示 + 面板按身份增减 ================= */
const IDM_NAME = { emperor: '皇帝', noble: '宗室 / 贵族', official: '官员', warlord: '军阀 / 独立领主', commoner: '平民' };

/* 面板随身份增删：
   - 派系 / 内斗：只有 皇帝 与 割据（军阀）才需要盯着党争与忠诚
   - 地盘 / 势力：有地盘才显示（军阀、皇帝，或已占下多地）
   - 史实锚点：真人模式才有
   - 家族：皇帝/贵族/官员看内宅嫡庶，平民看几口人几亩田（标题随之变） */
function applyPanels(s) {
  const idm = s.identityModule || 'official';
  const show = (el, on) => { if (el) el.style.display = on ? '' : 'none'; };

  // 身份卡
  const hist = s.identityHistory || [];
  const chain = hist.length
    ? [IDM_NAME[hist[0].from] || hist[0].from, ...hist.map(h => IDM_NAME[h.to] || h.to)].join(' → ')
    : '';
  $('#identityBox').innerHTML = `当前身份：<b>${escapeHtml(IDM_NAME[idm] || idm)}</b>　职衔：${escapeHtml(s.protagonist.role || '—')}`
    + (chain ? `<br>身份沿革：${escapeHtml(chain)}` : '')
    + (hist.length ? `<br><span class="muted">转变记录见正文日志（标「身份转变」的条目）。</span>` : '');

  // 派系 / 内斗：皇帝 与 军阀才有
  show($('#factionSec'), (idm === 'emperor' || idm === 'warlord') && (s.factions || []).length > 0);
  if ($('#hFaction')) $('#hFaction').textContent = idm === 'emperor' ? '派系 / 内斗（朝局）' : '派系 / 内斗（部众亲信）';

  // 地盘 / 势力：有地盘才显示
  const hasTerritory = (s.territory || []).length > 1 || idm === 'warlord' || idm === 'emperor';
  show($('#territorySec'), hasTerritory);

  // 史实锚点：真人模式才有
  show($('#anchorSec'), !!s.anchors);

  // 家：身份不同，看的重点不同
  if ($('#hFamily')) $('#hFamily').firstChild.textContent =
    idm === 'emperor' ? '宫禁 / 宗室 ' : idm === 'warlord' ? '部众 / 亲眷 ' : idm === 'commoner' ? '家（几口人、几亩田） ' : '家 / 家族 ';

  // 人物标题
  if ($('#hNpc')) $('#hNpc').textContent = (idm === 'emperor' || idm === 'warlord') ? '人物（结交 / 同代）' : '人物（打过交道的 / 同代的）';
}

on('#btnIdentity', 'click', () => {
  if (!needSave('身份转变')) return;
  const cur = STATE.identityModule || 'official';
  const opts = ['commoner', 'official', 'noble', 'warlord', 'emperor'];
  openModal('身份转变', `
    <div class="secnote">当前身份：<b>${escapeHtml(IDM_NAME[cur] || cur)}</b>。下面的转变会换掉叙事视角，并记进「身份沿革」。</div>
    <div class="field"><label>转为</label><select id="idNew">
      ${opts.map(o => `<option value="${o}" ${o === cur ? 'selected' : ''}>${escapeHtml(IDM_NAME[o])}</option>`).join('')}
    </select></div>
    <div class="field"><label>新职衔（可留空）</label><input id="idRole" placeholder="如：折冲府校尉、魏王、大丞相"></div>
    <div class="field"><label>缘由（可留空）</label><input id="idReason" placeholder="如：投军积功、据州自立、为部众所推"></div>
    <div class="hintbox">提示：身份转变通常应由剧情自然发生（也可让 AI 用 IDENTITY 指令自动记）。这里是你手动修正/补记。</div>`,
    async () => {
      const to = $('#idNew').value;
      STATE = await post('/api/identity', {
        saveId: STATE.meta.id, identityModule: to, role: $('#idRole').value, reason: $('#idReason').value,
      });
      renderState();
      toast('身份已转为 ' + (IDM_NAME[to] || to));
    });
});

/* ================= 地图（真实历史图片 · 按最近时期） ================= */
function renderMap(s) {
  const box = $('#mapBox'), detail = $('#mapDetail');
  const map = s.map || {};
  const imgs = map.images || [];
  const atlas = map.atlas || {};
  const gY = s.clock ? s.clock.gregorianYear : null;

  if (!imgs.length) {
    box.innerHTML = '<div class="muted">' + escapeHtml(map.note || '还没地图。开新局会自动检索该年代的真实历史地图。') + '</div>';
  } else {
    box.innerHTML = (atlas.volume
      ? `<div class="railnote">本局年代对应谭其骧《中国历史地图集》<b>${escapeHtml(atlas.volume)}·${escapeHtml(atlas.period)}</b>；下列图片按年代贴近度排序。</div>`
      : '')
      + imgs.map(m => {
        const distTxt = (m.yearDist != null && gY) ? `距本局 ${m.yearDist} 年` : (m.year || '年代不详');
        const near = (m.yearDist != null && m.yearDist <= 60) ? ' <span class="state-pass">最近</span>' : '';
        return `
      <figure class="mapfig">
        <a href="${escapeHtml(m.page || m.url)}" target="_blank" rel="noreferrer"><img src="${escapeHtml(m.url)}" alt="${escapeHtml(m.title)}" loading="lazy"></a>
        <figcaption>${escapeHtml(m.title)} · ${escapeHtml(distTxt)}${near}${m.license ? ' · ' + escapeHtml(m.license) : ''}${m.author ? ' · ' + escapeHtml(m.author) : ''}</figcaption>
      </figure>`;
      }).join('');
  }
  detail.textContent = map.note || '';

  // 其他真实地图站点入口（含史图馆——无公开接口，只给检索页）
  const srcs = map.sources || [];
  $('#mapSources').innerHTML = srcs.length
    ? '<div class="railnote">自己查证（引擎无法直接抓图，但给你入口）：</div>' + srcs.map(x => `<div>· <a href="${escapeHtml(x.url)}" target="_blank" rel="noreferrer">${escapeHtml(x.name)}</a></div>`).join('')
    : '';

  // 地盘 / 势力
  const t = s.territory || [];
  $('#territoryBox').innerHTML = t.length
    ? t.map(x => `<div>· <b>${escapeHtml(x.name)}</b> — 现由「${escapeHtml(x.controlledBy || '不详')}」控制${x.note ? '（' + escapeHtml(x.note) + '）' : ''}</div>`).join('')
    : '<div class="muted">还没登记。战事中某地易主时，GM 会登记进来。</div>';
}

async function reseedWorld() {
  if (!needSave('重新生成世界')) return;
  await busy('#btnReseed', '重新检索中…', async () => {
    const w = await post('/api/world/seed', { saveId: STATE.meta.id, adapterId: SEL });
    STATE = w.state || STATE; renderState();
    const mapN = (STATE.map && STATE.map.images || []).length;
    notice('世界已重新生成', `· 同代真人 ${w.histCount} 位（联网失败则为 0，可重试）\n· 真实历史地图 ${mapN} 张\n· 地点：${STATE.location.full}${STATE.location.placeFrom === 'era-default' ? '（引擎按该时代默认给出，可在新开局里改）' : ''}\n· 地理与地盘已按检索刷新${w.histError ? '\n（本次历史人物联网失败：' + w.histError + '）' : ''}`);
  });
}
on('#btnReseed', 'click', reseedWorld);

on('#threadBox', 'click', async e => {
  const el = e.target.closest('a[data-th]');
  if (!el || !STATE) return;
  e.preventDefault();
  try {
    STATE = await post('/api/thread', { saveId: STATE.meta.id, title: decodeURIComponent(el.dataset.th), action: el.dataset.act });
    renderState();
  } catch (err) { toast('线索更新失败：' + errMsg(err), 'err'); }
});

/* ================= 回合 ================= */
let TURN_RUNNING = false;   // 开战 / 重来 / 推进 三处都会进来，同一时刻只许跑一轮
async function runTurnWith(input, confirmedThreads) {
  if (!needSave('推进回合')) return;
  if (TURN_RUNNING) { toast('上一轮还在生成，等它回来再点。', 'warn'); return; }
  TURN_RUNNING = true;
  const btns = ['#btnRun', '#btnRetry', '#btnAccept', '#wpFight', '#wpFlee', '#btnOpening'].map(s => $(s)).filter(Boolean);
  const oldText = $('#btnRun').textContent;
  btns.forEach(b => { b.disabled = true; });
  $('#btnRun').textContent = '调用 AI 中…';
  try {
    const r = await post('/api/turn', {
      saveId: STATE.meta.id,
      input,
      adapterId: SEL,
      adapterConfig: {},
      confirmedThreads,
      verbosity: $('#verbosity').value || 'long',
      factMode: ($('#factMode') && $('#factMode').value) || 'standard',
      autoVerifyNpcs: $('#autoVerify').checked,
      autoFactCheck: $('#autoFactCheck').checked,
      autoRepair: $('#autoFactCheck').checked,
      planFirst: $('#planFirst') ? $('#planFirst').checked : true,
      battle: BATTLE || null,
    });
    LAST = { ...r, confirmedThreads, input };
    // 战阵用完即清（一场仗一次布阵），避免误带到下一轮
    if (BATTLE && r.battle) { BATTLE = null; renderBattleHint(); }
    renderLast();
    if (r.placeholder) toast('这一轮是占位正文：模型适配器不可用。去「设置」检查 API Key。', 'warn', 7000);
    // 简洁模式下不跳到审计面板，留在「局势」
    switchRail(document.body.classList.contains('simple') ? 'world' : 'check');
  } catch (e) {
    console.error(e);
    toast('调用失败：' + errMsg(e), 'err', 7000);
  } finally {
    TURN_RUNNING = false;
    btns.forEach(b => { b.disabled = false; });
    $('#btnRun').textContent = oldText;
  }
}

on('#btnRun', 'click', () => runTurnWith(
  $('#input').value,
  [...$('#threadSel').selectedOptions].map(o => decodeURIComponent(o.value)),
));

// Ctrl/Cmd + Enter 直接推进，省得去点按钮
on('#input', 'keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); $('#btnRun').click(); }
});

function renderLast() {
  const d = LAST.draft || {};
  $('#draftScene').textContent = d.scene || '（AI 没返回正文，通常是 Key 没生效或返回被截断）';
  // 后端明确说了这是占位骨架：把原因放在草稿最上面，而不是让人盯着一段模板正文猜
  const ph = $('#draftPlaceholder');
  if (ph) {
    ph.classList.toggle('hidden', !LAST.placeholder);
    ph.textContent = LAST.placeholder ? '⚠ ' + (LAST.why || '当前未接入模型，这不是真正的剧情。') : '';
  }
  // GM 规范第六章的固定栏目：【当前情况】在正文前，其余在正文后
  const g = d.gmPanels;
  const box = (id, before) => {
    let el = document.getElementById(id);
    if (!el) { el = document.createElement('div'); el.id = id; el.className = 'gmpanel'; const sc = $('#draftScene'); sc.parentNode.insertBefore(el, before ? sc : sc.nextSibling); }
    return el;
  };
  if (g) {
    box('gmHead', true).textContent = '【当前情况】\n' + g.当前情况.join('\n');
    const tail = ['【世界大事】\n' + g.世界大事];
    if ((g.人物表 || []).length) tail.push('【人物表·本回合新增】\n' + g.人物表.join('\n'));
    if ((g.存疑 || []).length) tail.push('【存疑】\n' + g.存疑.map(x => '· ' + x).join('\n'));
    tail.push('【本回合查证】搜索：' + (g.本回合查证 || []).join('；'));
    box('gmTail', false).textContent = tail.join('\n\n');
  } else {
    ['gmHead', 'gmTail'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ''; });
  }
  $('#draftMeta').textContent = ` · 适配器 ${LAST.adapterId}${LAST.parseFailed ? ' · 返回不是标准 JSON，已按纯文本处理' : ''}`;

  // 回显：你写的指令 / AI 说它听懂了什么 / 本轮它去检索了什么 —— 让「听岔、替你做主」一眼可见
  const echo = [];
  if (LAST.input && LAST.input.trim()) echo.push(`<div class="echo-line"><b>你的指令</b>：${escapeHtml(LAST.input)}</div>`);
  else echo.push('<div class="echo-line muted">你本回合没写指令（世界自行演了此刻的活场景）。</div>');
  if (d.understood && String(d.understood).trim()) echo.push(`<div class="echo-line"><b>AI 的理解</b>：${escapeHtml(d.understood)}</div>`);
  if ((LAST.searches || []).length) echo.push(`<div class="echo-line"><b>本轮实时检索</b>：${LAST.searches.map(s => `${escapeHtml(s.query)}（${s.count} 条）`).join('、')}</div>`);
  // 先想后写：把模型自己定的构思摊开给你看，它是不是照着写的，一眼可查
  const PL = LAST.plan;
  if (PL) {
    const seg = [];
    if (PL['世界自行推进']) seg.push(`世界自行推进：${escapeHtml(String(PL['世界自行推进']))}`);
    (PL['玩家指令的直接结果'] || []).forEach(x => seg.push(`结果：${escapeHtml(String(x))}`));
    (PL['NPC反应'] || []).forEach(n => seg.push(`${escapeHtml(String(n['人'] || '?'))}：他知道${escapeHtml(String(n['他知道什么'] || '—'))}，要${escapeHtml(String(n['他想要什么'] || '—'))}，怕${escapeHtml(String(n['他害怕什么'] || '—'))}，于是${escapeHtml(String(n['他会怎么做'] || '—'))}`));
    (PL['状态变化'] || []).forEach(c => seg.push(`${escapeHtml(String(c['项'] || '?'))} ${escapeHtml(String(c['前'] || ''))} → ${escapeHtml(String(c['后'] || ''))}（来源：${escapeHtml(String(c['来源'] || '未写'))}）`));
    (PL['信息传播'] || []).forEach(c => seg.push(`信息「${escapeHtml(String(c['信息'] || ''))}」→ ${escapeHtml(String(c['新增知情人'] || ''))}（${escapeHtml(String(c['怎么知道的'] || ''))}）`));
    if (PL['停在哪里']) seg.push(`停在：${escapeHtml(String(PL['停在哪里']))}`);
    if (seg.length) echo.push(`<div class="echo-line"><b>本轮构思（先想后写）</b><br>${seg.map(s => '· ' + s).join('<br>')}</div>`);
  }
  $('#draftEcho').innerHTML = echo.join('');

  // 天降之事（本轮掷出的话，醒目提示）
  const eb = $('#eventBanner');
  if (LAST.event) {
    eb.classList.remove('hidden');
    eb.innerHTML = `<b>天降之事 · ${escapeHtml(LAST.event.severityLabel)}</b>〔${escapeHtml(LAST.event.familyName)}〕${escapeHtml(LAST.event.text)}<br><span class="muted">可能后果：${escapeHtml((LAST.event.effects || []).join('；'))}</span>`;
  } else { eb.classList.add('hidden'); eb.innerHTML = ''; }

  // 战况推演（本轮打了仗的话）
  if (LAST.battle && LAST.battle.outcome) {
    const o = LAST.battle.outcome;
    echo.push(`<div class="echo-line"><b>战阵推演</b>：${escapeHtml(LAST.battle.ourFormation || '')}${LAST.battle.ourTactic ? '／' + escapeHtml(LAST.battle.ourTactic) : ''} 对 ${escapeHtml(LAST.battle.enemyFormation || '')}${LAST.battle.enemyTactic ? '／' + escapeHtml(LAST.battle.enemyTactic) : ''} —— ${escapeHtml(o.result)}，我军伤亡 ${o.casualties.A}，敌军 ${o.casualties.B}</div>`);
    $('#draftEcho').innerHTML = echo.join('');
  }

  // 必过项不过 → 整轮作废，顶部醒目警示
  const fb = $('#failBanner');
  if (LAST.report && LAST.report.failed) {
    fb.classList.remove('hidden');
    fb.innerHTML = `<b>⛔ 本轮不合格（必过项未通过）</b><br>`
      + (LAST.report.blockingFailed || []).map(x => `· <b>${escapeHtml(x.name)}</b>：${escapeHtml(x.detail)}`).join('<br>')
      + `<br><span class="muted">按规则，本轮应作废：点「这段不行，重来」重跑，或改掉问题后仍选择采纳。</span>`;
  } else { fb.classList.add('hidden'); fb.innerHTML = ''; }

  // 引擎自动核查报告（写前预检索 + 写后逐条校验 + 自动订正）
  const fc = LAST.factCheck;
  if (fc) {
    const lines = [];
    if ((fc.searched || []).length) lines.push(`<div class="echo-line"><b>引擎自动检索</b>：${fc.searched.map(s => `${escapeHtml(s.query)}（${s.count} 条）`).join('、')}</div>`);
    if (fc.repaired) lines.push('<div class="echo-line okline"><b>✓ 已自动订正</b>：发现与史料冲突之处，已按检索证据改过。</div>');
    if ((fc.contradictions || []).length) {
      lines.push(`<div class="echo-line errline"><b>与史料冲突 ${fc.contradictions.length} 处</b>：` + fc.contradictions.map(c => `${escapeHtml(c.claim)} —— ${escapeHtml(c.why)}${c.fix ? '（应作：' + escapeHtml(c.fix) + '）' : ''}`).join('；') + '</div>');
    }
    if ((fc.uncertain || []).length) {
      lines.push(`<div class="echo-line"><b>无法核实 ${fc.uncertain.length} 处</b>：` + fc.uncertain.map(c => escapeHtml(c.claim)).join('、') + ' <span class="muted">（史料不足，不是错，但请留意）</span></div>');
    }
    if ((fc.rows || []).length) {
      const ok = fc.rows.filter(r => /确认/.test(r.verdict)).length;
      lines.push(`<div class="echo-line"><b>逐条核验</b>：${ok} 项确认 / ${fc.contradictions.length} 项矛盾 / ${fc.uncertain.length} 项无法核实（共 ${fc.rows.length} 项）</div>`);
    }
    if (fc.error) lines.push(`<div class="echo-line muted">自动核查未能完成：${escapeHtml(fc.error)}</div>`);
    if (lines.length) echo.push(...lines);
    $('#draftEcho').innerHTML = echo.join('');
  }

  $('#draftBox').classList.remove('hidden');

  const rows = LAST.report?.rows || [];
  const bad = rows.filter(r => r.state !== '通过' && r.tier !== 'human');
  // 三层分组显示
  const TIER_LABEL = { machine: '① 机械可查（软件自动扫）', table: '② 对照表比对（存表逐轮核对）', human: '③ 只能人判断（请你打勾）' };
  const groups = ['machine', 'table', 'human'].map(t => {
    const list = rows.filter(r => r.tier === t);
    if (!list.length) return '';
    // 机械/对照层：只列有问题的；人判断层：全部列出供打勾
    const shown = t === 'human' ? list : list.filter(r => r.state !== '通过');
    const body = shown.length
      ? shown.map(r => rowHtml(r, t)).join('')
      : '<div class="muted" style="padding:4px 0">本层全部通过。</div>';
    return `<div class="tiergrp"><div class="tierhead">${TIER_LABEL[t]}</div>${body}</div>`;
  }).join('');

  const passCount = rows.filter(r => r.tier === 'machine' && r.state === '通过').length;
  $('#auditBox').innerHTML = groups
    + `<div class="meta" style="padding:6px 0">机械层通过 ${passCount} 项；对照层与机械层「只列有问题的」；人判断层需你逐项打勾。历史事实对不对，软件无法自动判定，最终要你或检索结果核对。</div>`;

  $('#newNpcBox').innerHTML = '<span class="muted">新登人物（点掉即不入档，「核名」走检索核对）：</span>'
    + ((d.newNpcs || []).length
      ? (d.newNpcs || []).map(n => `<span class="chip on" data-drop="${escapeHtml(n.name)}">${escapeHtml(n.name)}</span> <button class="vbtn" data-vname="${escapeHtml(n.name)}">核名</button>`).join(' ')
      : '<span class="muted">无</span>');
  const touched = [...new Set([...(d.touchedThreads || []), ...(LAST.confirmedThreads || [])])];
  $('#threadChips').innerHTML = '<span class="muted">线索处置（点击循环：保持→了结→搁置）：</span>'
    + (touched.length ? touched.map(t => `<span class="chip" data-thread="${escapeHtml(t)}">${escapeHtml(t)}</span>`).join('') : '<span class="muted">本轮没碰到线索</span>');
  $('#draftBox').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  renderNano();
}

/* ================= 纳米级剧情审计（P0–P9 十遍扫描） ================= */
const SEV_CLS = { 致命: 'state-warn', 须改: 'state-warn', 存疑: 'state-gap', 通过: 'state-pass' };
const SEV_BADGE = { S0: 'sev-s0', S1: 'sev-s1', S2: 'sev-s2', S3: 'sev-s3' };

function tbl(headers, rows) {
  if (!rows || !rows.length) return '<div class="muted">本遍无可显示数据。</div>';
  const h = headers.map(x => `<th>${escapeHtml(x.label)}</th>`).join('');
  const b = rows.map(r => '<tr>' + headers.map(x => `<td>${escapeHtml(String(r[x.key] == null ? '' : r[x.key]))}</td>`).join('') + '</tr>').join('');
  return `<table class="nanotbl"><thead><tr>${h}</tr></thead><tbody>${b}</tbody></table>`;
}

function nanoTable(passId, t) {
  if (!t) return '<div class="muted">无数据。</div>';
  switch (passId) {
    case 'P0': return '<div class="muted">见下方「输入对账（P0）」。</div>';
    case 'P1':
      return tbl([{ key: 'i', label: '#' }, { key: '句', label: '原句' }, { key: '类', label: '类' }, { key: '词', label: '命中' }, { key: '判定', label: '判定' }, { key: '依据', label: '依据' }], t.rows)
        + `<div class="muted">授权台账：${escapeHtml(t.authorization && t.authorization.note || '')}</div>`;
    case 'P2':
      return tbl([{ key: '断言', label: '断言' }, { key: '档案', label: '档案值' }, { key: '判定', label: '判定' }, { key: '证据', label: '证据' }], t.rows)
        + tbl([{ key: 'k', label: '状态卡项' }, { key: 'v', label: '值' }], (t.facts || []).map(f => ({ k: f.k, v: f.v })));
    case 'P3':
      return `<div class="muted">时钟：${escapeHtml((t.clock && t.clock.年号 || ''))} ${escapeHtml(String(t.clock && t.clock.月 || ''))}月${escapeHtml(String(t.clock && t.clock.日 || ''))}日</div>`
        + tbl([{ key: 'i', label: '#' }, { key: '时间词', label: '时间词' }, { key: '序', label: '次序' }, { key: '判定', label: '判定' }], t.rows);
    case 'P4':
      return tbl([{ key: '人物', label: '人物' }, { key: '有入场', label: '入场' }, { key: '有发言', label: '发言' }, { key: '发言', label: '说了什么' }, { key: '判定', label: '判定' }],
        (t.rows || []).map(r => ({ ...r, 发言: (r.发言 || []).join(' / ') })));
    case 'P5':
      return tbl([{ key: '账', label: '账本' }, { key: '笔数', label: '笔数' }, { key: '本轮变动', label: '本轮变动' }], t.rows);
    case 'P6':
      return tbl([{ key: '片段', label: '片段' }, { key: '有出处', label: '出处' }, { key: '证据', label: '证据' }], t.rows);
    case 'P7':
      return tbl([{ key: 'i', label: '#' }, { key: '说话人', label: '说话人' }, { key: '身份', label: '身份' }, { key: '内容', label: '内容' }, { key: '语域', label: '语域' }, { key: '备注', label: '备注' }], t.rows);
    case 'P8':
      return tbl([{ key: '节拍', label: '节拍' }, { key: '有', label: '有无' }], t.rows);
    case 'P9':
      return '<table class="nanotbl"><tbody>' + Object.entries(t.card || {}).map(([k, v]) => `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(String(v))}</td></tr>`).join('') + '</tbody></table>'
        + ((t.regressions || []).length ? `<div class="railnote">复发（已修又犯）：${escapeHtml(t.regressions.join('、'))}</div>` : '');
    default: return '<div class="muted">无数据。</div>';
  }
}

function renderNano() {
  const pr = LAST && LAST.report && LAST.report.passes;
  if (!pr) return;
  const s = pr.summary || {};
  const stateCard = (pr.passes.find(p => p.id === 'P9') || {}).table || {};
  $('#nanoSummary').innerHTML =
    `<div class="row"><b>十遍扫描结果</b> <span class="${pr.blocking ? 'state-warn' : 'state-pass'}">${pr.blocking ? '有致命问题（整轮作废）' : '无致命问题'}</span></div>`
    + `<div class="meta">致命 S0 <b>${s.S0 || 0}</b>　严重 S1 <b>${s.S1 || 0}</b>　一般 S2 <b>${s.S2 || 0}</b>　提示 S3 <b>${s.S3 || 0}</b></div>`
    + `<div class="meta">状态卡：${Object.entries(stateCard.card || {}).map(([k, v]) => `${escapeHtml(k)}=${escapeHtml(String(v))}`).join('；')}</div>`;

  $('#nanoBox').innerHTML = pr.passes.map(p =>
    `<details class="nanopass"><summary><b>${p.id} ${escapeHtml(p.name)}</b> <span class="${SEV_CLS[p.state] || ''}">${p.state}</span>
     <span class="muted">${escapeHtml(p.desc)}</span>
     <span class="sevline">${['S0', 'S1', 'S2', 'S3'].filter(k => p.counts[k]).map(k => `<i class="${SEV_BADGE[k]}">${k}×${p.counts[k]}</i>`).join('') || '<i>无</i>'}</span></summary>
     <div class="nanobody">${nanoTable(p.id, p.table)}</div></details>`).join('');

  // P0 输入对账表
  const p0 = pr.p0 || {};
  $('#p0Box').innerHTML =
    tbl([{ key: 'i', label: '序号' }, { key: 'frag', label: '原话片段' }, { key: 'type', label: '类型' }, { key: '明确', label: '明确的约束' }, { key: 'unclear', label: '未明确的部分' }, { key: '必须兑现', label: '本轮必须兑现' }, { key: '禁止越界', label: '禁止越界' }],
      (p0.table || []).map(r => ({ ...r, unclear: (r.未明确 || []).join('/') || '—' })))
    + ((p0.fuzzy || []).length
      ? '<div class="railnote">模糊指令：' + p0.fuzzy.map(f => `「${escapeHtml(f.frag)}」→ 可能指：${escapeHtml((f.解释 || []).join('、'))}；默认：${escapeHtml(f.默认处理)}`).join('；') + '</div>'
      : '')
    + `<div class="railnote">优先级：${escapeHtml((p0.priority || []).map(p => `${p.类型}`).join(' > ') || '')}</div>`
    + `<div class="railnote">${escapeHtml((p0.authorization && p0.authorization.note) || '')}</div>`;

  // 问题清单
  const issues = (pr.issues || []).slice().sort((a, b) => a.sev.localeCompare(b.sev));
  $('#nanoIssueBox').innerHTML = issues.length
    ? issues.map(i => `<div class="item nanoissue ${SEV_BADGE[i.sev]}">
        <div class="t"><code>${escapeHtml(i.code)}</code> <span class="${SEV_BADGE[i.sev]}">${escapeHtml(i.sev)} ${escapeHtml(i.sevLabel)}</span> ${escapeHtml(i.title)}</div>
        <div class="meta">${escapeHtml(i.detail)}</div>
        ${i.at ? `<div class="meta">原文：${escapeHtml(i.at)}</div>` : ''}
        ${i.fix ? `<div class="meta">改法：${escapeHtml(i.fix)}</div>` : ''}
        <div class="meta muted">证据等级 ${escapeHtml(i.evidence)} ${escapeHtml(i.evidenceLabel)}</div></div>`).join('')
    : '<div class="muted">十遍扫描没有发现问题。</div>';

  renderWorldScan();
}

/* ================= 世界扫描 P10–P15 ================= */
function renderWorldScan() {
  const pr = LAST && LAST.report && LAST.report.passes2;
  const summary = $('#worldScanSummary'), box = $('#worldScanBox'), ibox = $('#worldScanIssueBox');
  if (!summary || !box || !ibox) return;
  if (!pr) {
    summary.innerHTML = ''; box.innerHTML = '<div class="muted">还没跑过回合。</div>'; ibox.innerHTML = '';
    return;
  }
  const s = pr.summary || pr.counts || {};
  summary.innerHTML =
    `<div class="row"><b>世界扫描结果</b> <span class="${pr.blocking ? 'state-warn' : 'state-pass'}">${pr.blocking ? '有致命问题（整轮作废）' : '无致命问题'}</span></div>`
    + `<div class="meta">致命 S0 <b>${s.S0 || 0}</b>　严重 S1 <b>${s.S1 || 0}</b>　一般 S2 <b>${s.S2 || 0}</b>　提示 S3 <b>${s.S3 || 0}</b></div>`;

  box.innerHTML = (pr.passes || []).map(p =>
    `<details class="nanopass"><summary><b>${p.id} ${escapeHtml(p.name)}</b> <span class="${SEV_CLS[p.state] || ''}">${p.state}</span>
     <span class="muted">${escapeHtml(p.ask || '')}</span>
     <span class="sevline">${['S0', 'S1', 'S2', 'S3'].filter(k => p.counts && p.counts[k]).map(k => `<i class="${SEV_BADGE[k]}">${k}×${p.counts[k]}</i>`).join('') || '<i>无</i>'}</span></summary>
     <div class="nanobody"><div class="muted">这一遍问的是：${escapeHtml(p.ask || '')}</div>
     ${(p.issues || []).map(i => `<div class="meta">· <code>${escapeHtml(i.code)}</code> ${escapeHtml(i.title)}${i.at ? `（${escapeHtml(i.at)}）` : ''}</div>`).join('')}</div></details>`).join('')
    || '<div class="muted">六遍世界扫描都没发现问题。</div>';

  const issues = (pr.all || pr.issues || []).slice().sort((a, b) => String(a.sev).localeCompare(String(b.sev)));
  ibox.innerHTML = issues.length
    ? issues.map(i => `<div class="item nanoissue ${SEV_BADGE[i.sev] || ''}">
        <div class="t"><code>${escapeHtml(i.code)}</code> <span class="${SEV_BADGE[i.sev] || ''}">${escapeHtml(i.sev || '')}</span> ${escapeHtml(i.title)}</div>
        <div class="meta">${escapeHtml(i.detail)}</div>
        ${i.at ? `<div class="meta">原文：${escapeHtml(i.at)}</div>` : ''}
        ${i.fix ? `<div class="meta">改法：${escapeHtml(i.fix)}</div>` : ''}</div>`).join('')
    : '<div class="muted">世界扫描没有发现问题。</div>';
}

/* ================= 世界面板 ================= */
function kvLines(text) {
  return String(text || '').split('\n').map(l => `<div class="meta">${escapeHtml(l)}</div>`).join('')
    || '<div class="muted">（无）</div>';
}

/* 旧档体检：开局若还是「随机模板池」年代的产物，提示按历史底盘重算 */
let replotPrompted = false;
async function offerReplot() {
  if (!STATE || replotPrompted) return;
  replotPrompted = true;
  let box = document.getElementById('replotBanner');
  if (!box) {
    box = document.createElement('div');
    box.id = 'replotBanner';
    box.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:99;background:#fff8c5;' +
      'border:1px solid #d4a72c;border-radius:8px;padding:10px 14px;box-shadow:0 2px 10px rgba(0,0,0,.12);' +
      'font-size:13px;display:flex;gap:12px;align-items:center;justify-content:space-between';
    document.body.appendChild(box);
  }
  box.innerHTML = '<div>检测到本档的开局剧情是旧版随机模板生成的（与本年真实史事无关）。是否按历史底盘重算？</div>';
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;gap:6px;flex:none';
  const btn = document.createElement('button');
  btn.textContent = '按史实重算'; btn.className = 'minibtn';
  btn.onclick = async () => {
    btn.disabled = true; btn.textContent = '重算中…';
    try {
      const r = await post('/api/world/replot', { saveId: STATE.meta.id });
      box.innerHTML = '<div>已重算：' + escapeHtml((r.diff && r.diff.after.opening) || '完成') + '</div>';
      setTimeout(() => box.remove(), 6000);
      await renderWorldPanel();
    } catch (e) { box.innerHTML = '<div>重算失败：' + escapeHtml(String(e.message || e)) + '</div>'; }
  };
  const close = document.createElement('button');
  close.textContent = '暂不'; close.className = 'minibtn';
  close.onclick = () => box.remove();
  wrap.appendChild(btn); wrap.appendChild(close); box.appendChild(wrap);
}

async function renderWorldPanel() {
  if (!STATE) return hint('#snapBox', '还没有开档，快照面板是空的。开一个局后这里会列出每 5 轮自动存的档点。');
  try {
    const j = await post('/api/world/panel', { saveId: STATE.meta.id });
    $('#worldSectionBox').innerHTML = (j.sections || []).map(x =>
      `<div class="meta"><b>${escapeHtml(x.项)}</b>：${escapeHtml(String(x.值))}</div>`).join('') || '<div class="muted">（无）</div>';
    $('#worldEcoBox').innerHTML = kvLines(j.economyText);
    $('#worldAgencyBox').innerHTML = kvLines(j.agencyText);
    $('#worldInfoBox').innerHTML = kvLines(j.infoText);
    $('#worldDivBox').innerHTML = kvLines(j.divergenceText)
      + ((j.anchors || []).length ? '<div class="railnote">锚点：' + j.anchors.map(a => `${escapeHtml(a.text)}（${a.year}）`).join('；') + '</div>' : '')
      + ((j.chain || []).length ? '<div class="railnote">因果：' + j.chain.slice(-4).map(c =>
        `<span class="linklike" data-cf="${escapeHtml(c.id)}" title="点我做反事实推演">${escapeHtml(c.cause)} → ${escapeHtml(c.effect)}</span>`).join('；')
        + '　<span class="muted">（点一条可推演「若当初相反」）</span></div>' : '');
    const chg = [].concat(j.worldChanges || [], (j.npcActions || []).map(x => 'NPC：' + x), (j.rumors || []));
    $('#worldChangeBox').innerHTML = chg.length ? chg.map(x => `<div class="meta">· ${escapeHtml(String(x))}</div>`).join('') : '<div class="muted">本轮世界没有额外变化。</div>';
    const t = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const el = $('#worldUpdated'); if (el) el.textContent = '更新于 ' + t;
    renderFigureAudit(j);
    if (j.plot) renderPlot(j.plot);
    // 旧档体检：开局若还是「随机模板池」年代的产物，提示并按历史底盘重算
    if (j.plotStale) await offerReplot();
  } catch (e) {
    const b = $('#worldSectionBox'); if (b) b.innerHTML = '<div class="muted">载入失败：' + escapeHtml(String(e.message || e)) + '</div>';
  }
}

/* 人物身份核实：把引擎查出的身份错误摆到明面上，而不是藏在存档里。
   用户原话：「身份设定的错误很多，而且很多内容都不对」。
   这里列出每一条：谁、错在哪、该怎么改；并可随时点按钮重查。 */
function renderFigureAudit(j) {
  const box = $('#figureAuditBox');
  const lg = $('#figureLogBox');
  if (!box) return;
  const iss = j.figureIssues || [];
  let html = '';
  if (j.identityIssue) {
    const ii = j.identityIssue;
    html += `<div class="meta"><b>身份待确认</b>：${escapeHtml(ii.note || '')}（存档现为「${escapeHtml(String(ii.from))}」，建议改为「${escapeHtml(String(ii.to))}」；改不改由你定，引擎不会擅自改）</div>`;
  }
  if (j.protagonistDead) {
    html += `<div class="meta"><b>身故</b>：${escapeHtml(String(j.protagonistDead.name))}于${escapeHtml(String(j.protagonistDead.year))}年${j.protagonistDead.month ? escapeHtml(String(j.protagonistDead.month)) + '月' : ''}身故${j.protagonistDead.note ? '：' + escapeHtml(j.protagonistDead.note) : ''}。本局到此结束，可回滚到身故之前的快照，或另开新局。</div>`;
  }
  if (j.figureGen) {
    const g = j.figureGen;
    html += g.ok
      ? `<div class="meta"><b>人物档案</b>：已由模型 + 检索自动建档并通过程序校验（可信度最高为「中」，条目均标出处）。${(g.notes || []).length ? '校验时丢弃：' + escapeHtml(g.notes.slice(0, 5).join('；')) : ''}</div>`
      : `<div class="meta"><b>人物档案</b>：未能自动建档——${escapeHtml(g.why || '原因不明')}。本局按通用流程开局，人物处境与身边人物可能不够准确。</div>`;
  }
  if (iss.length) {
    html += iss.map(x =>
      `<div class="meta">· <b>${escapeHtml(String(x.who || ''))}</b>【${escapeHtml(String(x.level || 'S0'))}】${escapeHtml(String(x.text || ''))}` +
      (x.suggest ? `<br><span class="muted">　应改为：${escapeHtml(String(x.suggest))}</span>` : '') + '</div>').join('');
  } else if (!html) {
    html = '<div class="muted">本轮体检没有查出身份错误。</div>';
  }
  box.innerHTML = html;
  if (lg) {
    const log = j.figureLog || [];
    lg.innerHTML = log.length
      ? log.slice().reverse().map(c => `<div class="meta">· ${escapeHtml(String(c.year || ''))}年　${escapeHtml(String(c.text || ''))}</div>`).join('')
      : '<div class="muted">还没有跨年记录。跨年时这里会列出人物的封拜、迁转、称帝与身故。</div>';
  }
  const up = $('#figureAuditUpdated');
  if (up) up.textContent = '核实于 ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/* 剧情面板：玩家看「可观察层」，后台日志另开一处，两者不混（第十节）。
   这里刻意不显示行动者的隐藏目标——那属于内部模拟数据。 */
async function renderPlot(preloaded) {
  if (!STATE) return hint('#plotVisibleBox', '还没有开档，先开一个局。');
  try {
    const j = preloaded || await post('/api/plot/list', { saveId: STATE.meta.id });
    const s = j.summary || {};
    const sum = [];
    sum.push(`<div class="meta"><b>在册剧情</b>：${s.总数 || 0} 条；进行中 ${(s.进行中 || []).length} 条</div>`);
    for (const [k, v] of Object.entries(s.按状态 || {})) sum.push(`<div class="meta">· ${escapeHtml(k)}：${v}</div>`);
    for (const [k, v] of Object.entries(s.按依据 || {})) sum.push(`<div class="meta muted">· 依据 ${escapeHtml(k)}：${v}</div>`);
    $('#plotSummaryBox').innerHTML = sum.join('') || '<div class="muted">（无）</div>';
    const active = s.进行中 || [];
    $('#plotVisibleBox').innerHTML = active.length
      ? active.map(a => `<div class="meta"><b>${escapeHtml(a.id)}</b>　${escapeHtml(a.状态)}/${escapeHtml(a.规模)}`
        + `<br><span class="muted">　${escapeHtml(String(a.触发 || ''))}</span></div>`).join('')
      : '<div class="muted">当前没有进行中的剧情。这是正常的——没有触发条件就不生成事件。</div>';
    const up = $('#plotUpdated');
    if (up) up.textContent = '更新于 ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch (e) {
    $('#plotVisibleBox').innerHTML = '<div class="muted">载入失败：' + escapeHtml(String(e.message || e)) + '</div>';
  }
}

/* 后台日志：编号、因果链、状态变化、审计结果。内部用，不进玩家正文。 */
async function renderPlotAudit() {
  if (!STATE) return hint('#plotAuditBox', '还没有开档，先开一个局。');
  const box = $('#plotAuditBox');
  if (!box) return;
  try {
    const j = await post('/api/plot/audit', { saveId: STATE.meta.id });
    box.classList.remove('hidden');
    box.innerHTML = '<div class="muted">（以下为内部日志，不写入玩家正文）</div>'
      + String(j.log || '').split('\n').filter(Boolean)
        .map(l => `<div class="meta">${escapeHtml(l)}</div>`).join('');
  } catch (e) {
    box.classList.remove('hidden');
    box.innerHTML = '<div class="muted">载入失败：' + escapeHtml(String(e.message || e)) + '</div>';
  }
}

/* 手动重查全部人物：不是只核一次（用户原话「不断的历史核实」） */
async function reAuditFigures() {
  if (!STATE) return hint('#figureAuditBox', '还没有开档，先开一个局。');
  const btn = document.getElementById('btnFigureAudit');
  if (btn) { btn.disabled = true; btn.textContent = '核实中…'; }
  try {
    const r = await post('/api/world/figures', { saveId: STATE.meta.id });
    const box = $('#figureAuditBox');
    const iss = r.issues || [];
    let html = `<div class="meta muted">已核实 ${r.count || 0} 人（${r.year || '?'} 年）。</div>`;
    html += iss.length
      ? iss.map(x => `<div class="meta">· <b>${escapeHtml(String(x.who || ''))}</b>【${escapeHtml(String(x.level || 'S0'))}】${escapeHtml(String(x.text || ''))}` +
        (x.suggest ? `<br><span class="muted">　应改为：${escapeHtml(String(x.suggest))}</span>` : '') + '</div>').join('')
      : '<div class="muted">没有查出身份错误。</div>';
    if (box) box.innerHTML = html;
    const up = $('#figureAuditUpdated');
    if (up) up.textContent = '核实于 ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch (e) {
    const box = $('#figureAuditBox');
    if (box) box.innerHTML = '<div class="muted">核实失败：' + escapeHtml(String(e.message || e)) + '</div>';
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '重新核实全部人物'; }
  }
}

/* ================= 快照 / 回滚 / 最早错误 ================= */
async function renderSnapshots() {
  if (!STATE) return hint('#snapBox', '还没有开档，快照面板是空的。开一个局后这里会列出每 5 轮自动存的档点。');
  try {
    const [sl, rp] = await Promise.all([
      post('/api/snapshot/list', { saveId: STATE.meta.id }),
      post('/api/snapshot/repair', { saveId: STATE.meta.id }, { soft: true }),   // ok:false = 没有错误可修，不是异常
    ]);
    const rbox = $('#repairBox');
    if (!rp.ok) {
      rbox.innerHTML = '<div class="muted">' + escapeHtml(rp.why || '目前没有记录到任何错误') + '</div>';
    } else {
      const poll = (rp.被污染的状态项 || []);
      rbox.innerHTML =
        `<div class="meta"><b>最早的错误</b>：<code>${escapeHtml(rp.最早错误.code)}</code>（第 ${rp.最早错误.turn} 轮，出自${escapeHtml(rp.最早错误.kind)}）</div>`
        + (rp.建议回滚到 ? `<div class="meta"><b>干净的起点</b>：${escapeHtml(rp.建议回滚到.id)}（第 ${rp.建议回滚到.turn} 轮，${escapeHtml(rp.建议回滚到.at)}）</div>` : '<div class="meta muted">已经没有更早的快照了，只能从当前直接改。</div>')
        + (poll.length ? '<div class="meta"><b>被污染到现在的项</b>：' + poll.map(x => `${escapeHtml(x.项)}（${escapeHtml(String(x.错误前))} → ${escapeHtml(String(x.现在))}）`).join('；') + '</div>' : '')
        + ((rp.其余待修 || []).length ? '<div class="meta muted">其余待修：' + rp.其余待修.map(x => `<code>${escapeHtml(x.code)}</code>@${x.turn}`).join('、') + '</div>' : '');
      const code = $('#impactCode'); if (code && !code.value) code.value = rp.最早错误.code;
    }
    if (sl.rolledBackFrom) {
      $('#snapBox').innerHTML = '<div class="railnote">上次回滚：从第 ' + sl.rolledBackFrom.turn + ' 轮回到 ' + escapeHtml(sl.rolledBackFrom.toSnap) + '（第 ' + sl.rolledBackFrom.toTurn + ' 轮）</div>' + snapListHtml(sl.list);
    } else {
      $('#snapBox').innerHTML = snapListHtml(sl.list);
    }
  } catch (e) {
    const b = $('#snapBox'); if (b) b.innerHTML = '<div class="muted">载入失败：' + escapeHtml(String(e.message || e)) + '</div>';
  }
}

function snapListHtml(list) {
  if (!list || !list.length) return '<div class="muted">还没有快照。每 5 轮自动存一份；重大事件后强制存一份。</div>';
  return list.slice().reverse().map(s =>
    `<div class="item"><div class="t"><b>${escapeHtml(s.id)}</b> 第 ${s.turn} 轮 · ${escapeHtml(s.at)} ${s.label ? '· ' + escapeHtml(s.label) : ''}</div>
     <div class="meta">钱 ${s.facts.cash} 贯 / 粮 ${s.facts.grain} 石 / 兵 ${s.facts.troops} / 口 ${s.facts.pop}；人物 ${s.facts.npcs}；死者 ${(s.facts.dead || []).length}</div>
     <div class="row"><button class="minibtn" data-rollback="${escapeHtml(s.id)}">回到这里</button></div></div>`).join('');
}

async function doRollback(id) {
  if (!needSave('回滚')) return;
  const yes = await askConfirm(`回滚到 ${id}？当前进度（第 ${STATE.turn || 0} 轮）之后的一切都会被丢弃：人物、账目、地盘、线索全部回到那时。快照与纠正记录保留。此操作不可撤销。`, '回滚');
  if (!yes) return;
  const btn = document.querySelector(`[data-rollback="${CSS.escape(id)}"]`);
  await busy(btn, '回滚中…', async () => {
    await post('/api/snapshot/rollback', { saveId: STATE.meta.id, to: id });
    STATE = await post('/api/state', { saveId: STATE.meta.id });
    LAST = null; $('#draftBox').classList.add('hidden');
    renderState();
    await renderSnapshots();
    await renderWorldPanel();
    toast('已回滚到 ' + id);
  });
}

/* 带几个输入框的弹窗：给「加锚点 / 登记因果」用 */
function askForm(title, fields) {
  return new Promise(resolve => {
    let done = false;
    const finish = v => { if (done) return; done = true; resolve(v); };
    const html = fields.map(f => {
      const opts = f.options
        ? `<select id="f_${f.key}" class="inp">${f.options.map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('')}</select>`
        : `<input id="f_${f.key}" class="inp" placeholder="${escapeHtml(f.ph || '')}" value="${escapeHtml(f.value || '')}">`;
      return `<div class="row" style="margin:6px 0"><span style="min-width:96px">${escapeHtml(f.label)}</span>${opts}</div>`;
    }).join('');
    openModal(title, html, () => {
      const out = {};
      for (const f of fields) { const el = $('#f_' + f.key); out[f.key] = el ? el.value.trim() : ''; }
      finish(out);
    }, () => finish(null));
    const ok = $('#modalOk'); ok.textContent = '保存'; ok.focus();
  });
}

const SCALE_OPTS = ['trivial—琐碎', 'small—小事', 'noticeable—引人注意', 'serious—要紧', 'major—大事', 'catastrophic—倾覆'];
const RADIUS_OPTS = ['person—一人', 'household—一家', 'ward—一坊一里', 'town—一城一县', 'prefecture—一州一郡', 'region—一道数州', 'court—朝廷天下'];
const pickId = v => String(v || '').split('—')[0];

async function doAddAnchor() {
  if (!needSave('加史实锚点')) return;
  const v = await askForm('加一条史实锚点（硬锚点不可被剧情推翻）', [
    { key: 'year', label: '公元年', ph: '615' },
    { key: 'text', label: '史实原话', ph: '隋炀帝幸江都' },
    { key: 'mustNot', label: '不得出现的说法', ph: '皇帝已崩、隋已亡（顿号分隔）' },
    { key: 'source', label: '出处', ph: '隋书' },
  ]);
  if (!v || !v.text) return;
  await busy('#btnAddAnchor', '保存中…', async () => {
    await post('/api/history/anchor', {
      saveId: STATE.meta.id, year: v.year, text: v.text,
      mustNot: v.mustNot ? v.mustNot.split(/[、,，]/).map(x => x.trim()).filter(Boolean) : [],
      source: v.source,
    });
    await renderWorldPanel();
    toast('锚点已加');
  });
}

async function doAddCausal() {
  if (!needSave('登记因果')) return;
  const v = await askForm('登记一笔因果（因→果，须写明半径、规模与延迟）', [
    { key: 'cause', label: '因', ph: '粮吏亏空被查出' },
    { key: 'causeScale', label: '因的规模', options: SCALE_OPTS },
    { key: 'causeRadius', label: '因的半径', options: RADIUS_OPTS },
    { key: 'effect', label: '果', ph: '州衙派人来查' },
    { key: 'effectScale', label: '果的规模', options: SCALE_OPTS },
    { key: 'effectRadius', label: '果的半径', options: RADIUS_OPTS },
    { key: 'lagDays', label: '延迟几日', ph: '7' },
    { key: 'via', label: '中间经过谁/哪级', ph: '乡→县→州（可不填）' },
  ]);
  if (!v || !v.cause || !v.effect) return;
  await busy('#btnAddCausal', '保存中…', async () => {
    await post('/api/history/causal', {
      saveId: STATE.meta.id,
      cause: v.cause, causeScale: pickId(v.causeScale), causeRadius: pickId(v.causeRadius),
      effect: v.effect, effectScale: pickId(v.effectScale), effectRadius: pickId(v.effectRadius),
      lagDays: Number(v.lagDays) || 0,
      via: v.via ? v.via.split(/[、,，>→]/).map(x => x.trim()).filter(Boolean) : [],
    });
    await renderWorldPanel();
    toast('因果已登记');
  });
}

async function doImpact() {
  if (!needSave('查影响面')) return;
  const code = ($('#impactCode') && $('#impactCode').value || '').trim();
  // 没填错误码就静默返回，用户会以为按钮坏了——这里说清楚要填什么
  if (!code) { hint('#impactBox', '先在上面填一个错误码（如 P8-B01）。点「最早错误」那一行会自动填进去。'); return; }
  let r;
  try { r = await post('/api/snapshot/impact', { saveId: STATE.meta.id, code }, { soft: true }); }
  catch (e) { hint('#impactBox', '查询失败：' + escapeHtml(errMsg(e))); return; }
  const box = $('#impactBox');
  if (!r.ok) { box.innerHTML = '<div class="muted">' + escapeHtml(r.why || '查不到') + '</div>'; return; }
  box.innerHTML =
    `<div class="meta"><code>${escapeHtml(code)}</code> 最早出现在第 <b>${r.最早轮次}</b> 轮（${escapeHtml(r.出处)}），至今共出现 ${r.共出现} 次。</div>`
    + (r.干净快照 ? `<div class="meta">干净起点：${escapeHtml(r.干净快照.id)}（第 ${r.干净快照.turn} 轮，${escapeHtml(r.干净快照.at)}）</div>` : '<div class="meta muted">没有更早的快照，只能从当前改起。</div>')
    + ((r.被污染的状态项 || []).length ? '<div class="meta"><b>被污染到现在的项</b>：' + r.被污染的状态项.map(x => `${escapeHtml(x.项)}（${escapeHtml(String(x.错误前))} → ${escapeHtml(String(x.现在))}）`).join('；') + '</div>' : '<div class="meta">没有发现被污染的状态项。</div>')
    + ((r.逐轮变化 || []).length ? '<div class="meta muted">逐轮变化：' + r.逐轮变化.slice(-8).map(x => `${x.轮次}轮 ${escapeHtml(x.项)} ${escapeHtml(String(x.前))}→${escapeHtml(String(x.后))}`).join('；') + '</div>' : '');
}

/* 「点了没反应」是最容易被当成功能坏掉的一类问题：
   未开档 / 参数为空时，旧代码一律 `if (!STATE) return;` 静默返回，界面毫无变化。
   这里统一给出明确反馈——要么提示，要么在面板里写明原因。 */
function needSave(what) {
  if (STATE) return true;
  toast(what ? `要用「${what}」，得先开一个局：顶部选一个存档，或点「＋ 新开局」。` : '先开一个局：顶部选一个存档，或点「＋ 新开局」。', 'warn');
  return false;
}
function hint(boxId, text) {
  const b = $(boxId);
  if (b) b.innerHTML = '<div class="muted">' + String(text) + '</div>';
}

/* 问一个 NPC 会怎么反应（/api/npc/decide）：引擎按「利益+风险+信息+关系+资源」算，
   不是剧情需要他答应他就答应——可以拒绝。 */
async function doNpcDecide() {
  if (!needSave('问 NPC')) return;
  const names = (STATE.npcs || []).map(n => n.name).filter(Boolean);
  if (!names.length) return hint('#npcDecideBox', '名籍里还没有人。先开一局、跑几轮。');
  const v = await askForm('问一个 NPC：他会怎么反应', [
    { key: 'name', label: '问谁', options: names },
    { key: 'gain', label: '这事对他多大好处（0~1）', ph: '0.5' },
    { key: 'cost', label: '他要付多大代价（0~1）', ph: '0.5' },
    { key: 'risk', label: '有多大风险（0~1）', ph: '0.5' },
  ]);
  if (!v || !v.name) return;
  let r;
  try {
    r = await post('/api/npc/decide', {
      saveId: STATE.meta.id, npcName: v.name,
      request: { gain: Number(v.gain) || 0.5, cost: Number(v.cost) || 0.5, risk: Number(v.risk) || 0.5 },
    }, { soft: true });
  } catch (e) { hint('#npcDecideBox', '没问到：' + escapeHtml(errMsg(e))); return; }
  const box = $('#npcDecideBox');
  if (!r || r.ok === false) { box.innerHTML = '<div class="muted">' + escapeHtml((r && r.why) || '没问到') + '</div>'; return; }
  const basis = r.依据 ? `（好处 ${r.依据.好处} / 代价 ${r.依据.代价} / 风险 ${r.依据.风险} / 亲疏 ${Number(r.依据.亲疏).toFixed(2)} → 得分 ${r.依据.得分}）` : '';
  box.innerHTML = `<div class="meta"><b>${escapeHtml(v.name)}</b>的反应：<b>${escapeHtml(r.label || r.reaction || '?')}</b></div>`
    + (r.理由 ? `<div class="meta muted">${escapeHtml(String(r.理由))}</div>` : '')
    + `<div class="meta muted">${escapeHtml(basis)}</div>`
    + (r.提示 ? `<div class="meta">${escapeHtml(String(r.提示))}</div>` : '');
}

/* 事件绑定（DOM 就绪后挂上；用 closest 做委托，元素重绘也不会失效） */
document.addEventListener('click', async e => {
  const rb = e.target.closest && e.target.closest('[data-rollback]');
  if (rb) { await doRollback(rb.dataset.rollback); return; }
  const cf = e.target.closest && e.target.closest('[data-cf]');
  if (cf) { await doCounterfactual(cf.dataset.cf); return; }
});

/* 反事实推演：点一条因果链，问「若当初相反，下游会怎样」 */
async function doCounterfactual(chainId) {
  if (!needSave('反事实推演')) return;
  const v = await askForm('反事实推演（只推演，不改存档）', [
    { key: 'replaceWith', label: '若当初换成……', ph: '不放粮' },
  ]);
  if (!v) return;
  let r;
  try { r = await post('/api/history/counterfactual', { saveId: STATE.meta.id, chainId, replaceWith: v.replaceWith || '' }, { soft: true }); }
  catch (e) { hint('#worldDivBox', '推演失败：' + escapeHtml(errMsg(e))); return; }
  const box = $('#worldDivBox');
  if (!r || r.ok === false) { hint('#worldDivBox', (r && r.why) || '推演失败'); return; }
  const lines = [`<div class="meta"><b>${escapeHtml(r.cause || '')} → ${escapeHtml(r.effect || '')}</b>　若当初${escapeHtml(String(r.replaceWith || '相反'))}：</div>`];
  if (r.删除测试 != null) lines.push(`<div class="meta">删除测试：下游有 <b>${r.删除测试}</b> 笔因果依赖它（依赖多 = 影响大）</div>`);
  if (r.替换测试) lines.push(`<div class="meta muted">${escapeHtml(String(r.替换测试))}</div>`);
  box.innerHTML = lines.join('') + box.innerHTML;
}

function bindWorldUi() {
  on('#btnWorldRefresh', 'click', () => busy('#btnWorldRefresh', '刷新中…', renderWorldPanel));
  on('#btnSnapRefresh', 'click', () => busy('#btnSnapRefresh', '刷新中…', renderSnapshots));
  on('#btnAddAnchor', 'click', doAddAnchor);
  on('#btnAddCausal', 'click', doAddCausal);
  on('#btnImpact', 'click', () => busy('#btnImpact', '查…', doImpact));
  on('#btnFigureAudit', 'click', reAuditFigures);
  on('#btnPlotRefresh', 'click', () => busy('#btnPlotRefresh', '刷新中…', () => renderPlot()));
  on('#btnPlotAudit', 'click', () => busy('#btnPlotAudit', '读取中…', renderPlotAudit));
  on('#btnNpcDecide', 'click', doNpcDecide);
  on('#btnSnapNow', 'click', () => {
    if (!needSave('打快照')) return;
    busy('#btnSnapNow', '存档中…', async () => {
      await post('/api/snapshot/now', { saveId: STATE.meta.id });
      await renderSnapshots();
      toast('快照已存');
    });
  });
}

/* ================= 纠正记录库（用户填，AI 每轮对照） ================= */
async function renderCorrections() {
  const box = $('#corrBox');
  if (!box || !STATE) return;
  try {
    const r = await post('/api/correction/list', { saveId: STATE.meta.id });
    const l = r.ledger || {};
    const corr = (l.corrections || []).slice().reverse();
    const hot = Object.entries(l.counts || {}).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const esc = r.escalated || [];
    box.innerHTML = (esc.length ? `<div class="failbanner" style="margin:0 0 8px">⚠ 反复出现的失误：${esc.map(e => escapeHtml(e.label) + '×' + e.count).join('；')}</div>` : '')
      + (hot.length ? `<div class="railnote">失误类型计数：${hot.map(([k, v]) => escapeHtml((l.labels || {})[k] || k) + '×' + v).join('；')}</div>` : '')
      + (corr.length
        ? corr.slice(0, 15).map(c => `<div class="item"><div class="t">第${c.turn}轮</div><div class="meta">${escapeHtml(c.text)}</div></div>`).join('')
        : '<div class="muted">还没有纠正记录。把 AI 出错的地方记下来，它下一轮必须逐条对照。</div>');
  } catch (e) { box.innerHTML = '<div class="muted">读取失败：' + escapeHtml(String(e.message || e)) + '</div>'; }
}
on('#btnCorr', 'click', () => {
  if (!needSave('纠正记录')) return;
  const text = ($('#corrText').value || '').trim();
  if (!text) { toast('先写清楚它错在哪', 'warn'); $('#corrText').focus(); return; }
  busy('#btnCorr', '记录中…', async () => {
    await post('/api/correction', { saveId: STATE.meta.id, text, key: $('#corrKey') ? $('#corrKey').value : undefined });
    $('#corrText').value = '';
    await renderCorrections();
    toast('已记下，下一轮 AI 动笔前会对照。');
  });
});

function rowHtml(r, tier) {
  const cls = r.state === '通过' ? 'state-pass' : r.state === '存疑' ? 'state-warn' : r.state === '待你判断' ? 'state-gap' : 'state-gap';
  // 人判断层：不是摆设 —— 判「有问题」会写进纠正记录库，下一轮 GM 必须对照
  if (tier === 'human' || r.tier === 'human') {
    const key = r.id.replace(/^human:/, '');
    const cur = (LAST_JUDGE && LAST_JUDGE[key]) || '';
    const cls = cur === 'bad' ? 'jbad' : cur === 'ok' ? 'jok' : '';
    return `<div class="item humanitem ${cls}" data-hkey="${escapeHtml(key)}">
      <div class="t">${escapeHtml(r.name)}
        <span class="judge">
          <button class="jbtn jok ${cur === 'ok' ? 'on' : ''}" data-judge="${escapeHtml(key)}" data-v="ok">没问题</button>
          <button class="jbtn jbad ${cur === 'bad' ? 'on' : ''}" data-judge="${escapeHtml(key)}" data-v="bad">有问题</button>
        </span></div>
      <div class="meta">${escapeHtml(r.detail)}</div>
      <div class="meta jnote" data-jnote="${escapeHtml(key)}">${cur === 'bad' ? '已记入纠正记录库，下一轮它必须对照这一条。' : cur === 'ok' ? '你判为通过（仅留痕）。' : '待你判断。'}</div></div>`;
  }
  return `<div class="item"><div class="t">${r.blocking ? '⛔ ' : ''}${escapeHtml(r.name)} <span class="${cls}">${r.state}</span></div>
    <div class="meta">${escapeHtml(r.detail)}</div>${r.evidence ? renderEvidence(r.evidence) : ''}</div>`;
}

/* 人判断：由你判定，判「有问题」写进纠正记录库（系统不自评） */
let LAST_JUDGE = {};
document.addEventListener('click', async e => {
  const b = e.target.closest && e.target.closest('[data-judge]');
  if (!b || !STATE) return;
  const key = b.dataset.judge, v = b.dataset.v;
  const turn = (LAST && LAST.draft) ? STATE.turn + 1 : STATE.turn;
  LAST_JUDGE[key] = (LAST_JUDGE[key] === v) ? '' : v;
  const send = LAST_JUDGE[key] || null;
  try {
    const r = await post('/api/human-check', { saveId: STATE.meta.id, turn, checks: { [key]: send } });
    if (r && r.addedToLedger && r.addedToLedger.length) {
      const n = document.querySelector(`[data-jnote="${key}"]`);
      if (n) n.textContent = '已记入纠正记录库：' + r.addedToLedger.join('、') + '。下一轮 GM 动笔前必须对照。';
      renderCorrections();
    }
  } catch (err) { /* 忽略 */ }
  b.closest('.humanitem').querySelectorAll('.jbtn').forEach(x => x.classList.remove('on'));
  if (LAST_JUDGE[key]) b.classList.add('on');
  const n = document.querySelector(`[data-jnote="${key}"]`);
  if (n && LAST_JUDGE[key] !== 'bad') n.textContent = LAST_JUDGE[key] === 'ok' ? '你判为通过（仅留痕）。' : '待你判断。';
});

on('#btnRetry', 'click', () => {
  // 真·重来：用同一句指令重新生成一次（旧代码只是把草稿藏起来，点了没反应 —— 已修）
  if (!LAST) return;
  runTurnWith(LAST.input || $('#input').value, LAST.confirmedThreads || []);
});

/* ================= 战阵：只有「碰上战争」才出现 =================
   引擎在 GM 宣告 BATTLE 后于存档里挂上 state.encounter；面板据此显隐。
   没在打仗时，界面上根本没有这块，也不会出现「打不开的按钮」。 */
let BATTLE_CATALOG = null;
let BATTLE = null;   // 本轮要带上的布阵（原来挂在 window.__BATTLE 上）
async function loadBattleCatalog() {
  if (!BATTLE_CATALOG || !BATTLE_CATALOG.formations) BATTLE_CATALOG = await get('/api/battle/catalog');
  return BATTLE_CATALOG;
}

async function renderWarPanel() {
  const el = $('#warPanel');
  const enc = STATE && STATE.encounter;
  if (!enc) { el.classList.add('hidden'); el.innerHTML = ''; BATTLE = null; return; }
  let cat;
  try { cat = await loadBattleCatalog(); } catch (e) { el.classList.remove('hidden'); el.innerHTML = '<div class="wp-t">战阵</div><div class="muted">战阵目录载入失败：' + escapeHtml(String(e.message || e)) + '</div>'; return; }

  const cur = BATTLE || {};
  const fOpt = (arr, sel) => arr.map(x => `<option value="${x.id}"${sel === x.id ? ' selected' : ''}>${escapeHtml(x.name)}</option>`).join('');
  const tOpt = (arr, sel) => arr.map(x => `<option value="${x.id}"${sel === x.id ? ' selected' : ''}>${escapeHtml(x.name)}</option>`).join('');
  el.classList.remove('hidden');
  el.innerHTML = `
    <div class="wp-t">⚔ 战事已起 —— 布阵、定策由你自己决定</div>
    <div class="wp-sub">敌：<b>${escapeHtml(enc.enemyName)}</b>，约 ${enc.enemyTroops} 人${enc.enemyFormation ? '，阵形约是 ' + escapeHtml(enc.enemyFormation) : ''}；地形 ${escapeHtml(enc.terrain || '未详')}。布好阵、选好战术，再点「开战」。</div>
    <div class="wp-grid">
      <label>我军兵力<input id="wpOurTroops" type="number" value="${cur.ourTroops || enc.ourTroops || 1000}"></label>
      <label>我军阵形<select id="wpOurFormation">${fOpt(cat.formations, cur.ourFormation)}</select></label>
      <label>我军战术<select id="wpOurTactic">${tOpt(cat.tactics, cur.ourTactic)}</select></label>
      <label>我军士气<input id="wpOurMorale" type="number" step="0.1" min="0" max="1" value="${cur.ourMorale ?? 0.6}"></label>
      <label>我军训练<input id="wpOurTraining" type="number" step="0.1" min="0" max="1" value="${cur.ourTraining ?? 0.5}"></label>
      <label>天候<select id="wpWeather">${['', '暴雨', '大风', '大雾', '大雪', '酷热', '严寒'].map(t => `<option value="${t}"${cur.weather === t ? ' selected' : ''}>${t || '—'}</option>`).join('')}</select></label>
    </div>
    <div class="wp-desc" id="wpDesc"></div>
    <div class="btnrow">
      <button id="wpSim">先推演</button>
      <button id="wpFight" class="primary big">▶ 开战</button>
      <button id="wpFlee">避战 / 退兵</button>
      <span id="wpOut" class="muted"></span>
    </div>
    <pre class="raw" id="wpPreview"></pre>`;

  const read = () => ({
    ourTroops: Number($('#wpOurTroops').value), enemyTroops: Number(enc.enemyTroops),
    ourFormation: $('#wpOurFormation').value, enemyFormation: enc.enemyFormation || 'yulin',
    ourTactic: $('#wpOurTactic').value, enemyTactic: 'none',
    ourMorale: Number($('#wpOurMorale').value), enemyMorale: 0.6,
    ourTraining: Number($('#wpOurTraining').value), enemyTraining: 0.5,
    terrain: enc.terrain || '平原', weather: $('#wpWeather').value,
  });
  const desc = () => {
    const f = cat.formations.find(x => x.id === $('#wpOurFormation').value) || {};
    const t = cat.tactics.find(x => x.id === $('#wpOurTactic').value) || {};
    $('#wpDesc').innerHTML = `<b>${escapeHtml(f.name || '')}</b>：${escapeHtml(f.desc || '')}<br><b>${escapeHtml(t.name || '')}</b>：${escapeHtml(t.desc || '')}（风险 ${Math.round((t.risk || 0) * 100)}%；前置：${escapeHtml(t.need || '')}）`;
  };
  $('#wpOurFormation').onchange = desc; $('#wpOurTactic').onchange = desc;
  desc();
  $('#wpSim').onclick = () => busy('#wpSim', '推演中…', async () => {
    $('#wpOut').textContent = '推演中…';
    let r;
    try { r = await post('/api/battle/simulate', read()); }
    catch (e) { $('#wpOut').textContent = '失败：' + errMsg(e); return; }
    $('#wpOut').textContent = r.result;
    $('#wpPreview').textContent = `我方优势比 ${r.shareA}\n伤亡预估：我军 ${r.casualties.A}，敌军 ${r.casualties.B}\n缘由：${(r.reasons || []).join('、')}`;
  });
  $('#wpFight').onclick = () => {
    BATTLE = read();
    runTurnWith($('#input').value || '我下令开战', [...$('#threadSel').selectedOptions].map(o => decodeURIComponent(o.value)));
  };
  $('#wpFlee').onclick = () => {
    BATTLE = null;
    $('#input').value = '我下令避战退兵';
    runTurnWith($('#input').value, []);
  };
}

function renderBattleHint() {
  const b = BATTLE;
  const el = $('#battleHint');
  if (!b || !el) { if (el) el.textContent = ''; return; }
  el.innerHTML = `已布阵：我军 ${b.ourTroops} 人（阵形与战术已选定）。点上方「开战」提交。`;
}

on('#btnAccept', 'click', () => {
  if (!LAST || !STATE) return;
  if (TURN_RUNNING) { toast('正在生成中，等它回来再采纳。', 'warn'); return; }
  busy('#btnAccept', '写入世界中…', async () => {
    const dropNpcs = [...document.querySelectorAll('#newNpcBox .chip')].filter(c => !c.classList.contains('on')).map(c => c.dataset.drop);
    const chips = [...document.querySelectorAll('#threadChips .chip')];
    const closeThreads = chips.filter(c => c.textContent.includes('·搁置')).map(c => c.dataset.thread);
    const resolveThreads = chips.filter(c => c.textContent.includes('·了结')).map(c => c.dataset.thread);
    // 被拦（过期草稿 / 剧情作弊 / 硬伤）会从这里抛出来：草稿原地保留，原因 toast 出来
    const r = await post('/api/apply', {
      saveId: STATE.meta.id, draft: LAST.draft, input: LAST.input,
      advanceDays: Number($('#advDays').value || 1),
      edits: { dropNpcs, closeThreads, resolveThreads },
    });
    if (!r || !r.state) throw new ApiError('后端没有返回新状态，草稿未写入');
    STATE = r.state; LAST = null; $('#input').value = '';
    // 时间必须往前走：保留当前选择（不重置为 0，否则时间会永远停住）
    await renderState(); await reloadSaves();
    $('#input').focus();
    showTurnDelta();   // 明确告诉你「本轮变了什么」
  });
});

/* 时间预览：采纳后日期会变成什么，让你心里有数（时间每回合必须往前走） */
function updateAdvPreview() {
  const box = $('#advPreview');
  if (!box || !STATE || !STATE.clock) { if (box) box.textContent = ''; return; }
  const d = Number(($('#advDays') && $('#advDays').value) || 1);
  let y = STATE.clock.gregorianYear || 0, m = STATE.clock.month || 1, dd = (STATE.clock.day || 1) + d;
  while (dd > 30) { dd -= 30; m += 1; if (m > 12) { m = 1; y += 1; } }
  const cross = y !== (STATE.clock.gregorianYear || 0);
  box.innerHTML = d > 0
    ? `采纳后：时间前进 <b>${d} 天</b> → 约 <b>${m}月${dd}日</b>${cross ? '（<b>跨年</b>，人物年龄会按史实自动重算）' : ''}`
    : `⚠ 本轮不推进时间。剧情会原地打转 —— 建议至少推进 1 天。`;
}
on('#advDays', 'change', updateAdvPreview);

/* 本轮变化摘要：时间、线索、事件、地盘、身份 —— 保证每回合都看得见新东西 */
let PREV_SNAP = null;
function snapOf(s) {
  return {
    date: s.clock ? `${s.clock.yearLabel} ${s.clock.month}月${s.clock.day}日` : '',
    turn: s.turn,
    threads: (s.threads || []).length,
    openThreads: (s.threads || []).filter(t => t.status === 'open').length,
    threadTitles: (s.threads || []).map(t => t.title),
    npcs: (s.npcs || []).length,
    events: (s.eventLog || []).length,
    lastEvent: (s.eventLog || []).length ? s.eventLog[s.eventLog.length - 1].text : '',
    battles: (s.battleLog || []).length,
    territory: (s.territory || []).length,
    identity: s.identityModule,
    age: s.protagonist ? s.protagonist.age : null,
    log: (s.log || []).length,
  };
}
function showTurnDelta() {
  const box = $('#turnDelta');
  if (!box || !STATE) return;
  const now = snapOf(STATE);
  const prev = PREV_SNAP;
  PREV_SNAP = now;
  if (!prev) { box.classList.add('hidden'); return; }
  const items = [];
  if (prev.date !== now.date) items.push(`时间：${prev.date} → <b>${now.date}</b>`);
  if (prev.age != null && now.age != null && prev.age !== now.age) items.push(`你长了一岁：${prev.age} → <b>${now.age}</b> 岁`);
  if (prev.events !== now.events) items.push(`天降之事：<b>${escapeHtml(now.lastEvent)}</b>`);
  if (prev.battles !== now.battles) items.push(`战事 +${now.battles - prev.battles}`);
  if (prev.territory !== now.territory) items.push(`地盘 +${now.territory - prev.territory}`);
  const newThreads = (now.threadTitles || []).filter(t => !(prev.threadTitles || []).includes(t));
  if (newThreads.length) items.push(`新线索：${newThreads.slice(0, 3).map(escapeHtml).join('、')}`);
  else if (prev.openThreads !== now.openThreads) items.push(`待办线索 ${prev.openThreads} → <b>${now.openThreads}</b>`);
  if (prev.npcs !== now.npcs) items.push(`新登场人物 +${now.npcs - prev.npcs}`);
  if (prev.identity !== now.identity) items.push(`身份已变：${prev.identity} → <b>${now.identity}</b>`);
  if (!items.length) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  box.innerHTML = `<b>第 ${now.turn} 轮 · 世界已向前走</b><br>` + items.map(x => '· ' + x).join('<br>');
}

/* ================= 右栏切换 ================= */
const RAILS = ['check', 'nano', 'world', 'snap', 'map', 'file', 'find', 'archive'];
function switchRail(which) {
  document.querySelectorAll('.railtab').forEach(b => b.classList.toggle('active', b.dataset.rail === which));
  RAILS.forEach(w => {
    const el = $('#rail' + w[0].toUpperCase() + w.slice(1));
    if (el) el.classList.toggle('hidden', w !== which);
  });
  if (which === 'world' && STATE) renderWorldPanel();
  if (which === 'snap' && STATE) renderSnapshots();
  if (which === 'archive' && STATE) renderArchive();
}
document.querySelectorAll('.railtab').forEach(b => b.onclick = () => switchRail(b.dataset.rail));

/* ================= 档案馆（差异化底盘 + 来源/可信度） ================= */
function srcBadge(s) {
  if (!s) return '';
  const colors = { offline: '#1a7f37', wikidata: '#0969da', rulepack: '#8250df', search: '#bf8700', generated: '#6e7781', estimate: '#cf222e' };
  const c = colors[s.source] || '#6e7781';
  const conf = { high: '高', medium: '中', low: '低' }[s.confidence] || s.confidence;
  return `<span class="badge" style="background:${c}1a;color:${c};border:1px solid ${c}55">${s.source}·${conf}</span>`;
}
async function renderArchive() {
  const box = $('#archiveBox');
  if (!box) return;
  if (!STATE) { box.innerHTML = '<div class="muted">先开一个局。</div>'; return; }
  box.innerHTML = '<div class="muted">载入中…</div>';
  let a;
  try { a = (await post('/api/archive', { saveId: STATE.meta.id })).archive; }   // 后端包了一层 { ok, saveId, archive }
  catch (e) { box.innerHTML = '<div class="railnote">档案馆载入失败：' + escapeHtml(String(e.message || e)) + '</div>'; return; }
  if (!a) { box.innerHTML = '<div class="muted">本局还没生成底盘（点「重新生成世界」）。</div>'; return; }
  const sec = (title, inner) => `<div class="arch-sec"><div class="arch-h">${title}</div>${inner}</div>`;
  const rows = [];
  rows.push(`<div class="kv">身份：${escapeHtml(a.identity || '')}｜时代：${escapeHtml(a.eraLabel || '')}（公元 ${a.gregorianYear || '?'} 年）｜政权：${escapeHtml(a.polity || '')}｜地点：${escapeHtml(a.place || '')}</div>`);
  if (a.ruler) {
    const v = a.ruler.value || {}; const age = (v.age == null) ? '' : ` ${v.age}岁`;
    rows.push(sec('当朝天子', `<div class="arch-row">${escapeHtml(v.name || '')}（${escapeHtml(v.title || '皇帝')}${age}） ${srcBadge(a.ruler)}</div>`));
  }
  if (a.eraEvents && a.eraEvents.length) {
    rows.push(sec('天下大势（按时代）', a.eraEvents.map(e => `<div class="arch-row">· ${escapeHtml(e.value || '')} ${srcBadge(e)}</div>`).join('')));
  }
  if (a.factions && a.factions.length) {
    rows.push(sec('派系 / 内斗（按时代+身份）', a.factions.map(f => { const v = f.value || {}; const name = v.name || v.label || JSON.stringify(v); return `<div class="arch-row">· ${escapeHtml(name)} ${srcBadge(f)}</div>`; }).join('')));
  }
  if (a.numericCeiling && a.numericCeiling.value) {
    const txt = String(a.numericCeiling.value).split('\n').map(x => `<div class="arch-row muted">${escapeHtml(x)}</div>`).join('');
    rows.push(sec('数字量级（按时代折算·先算再写）', txt + `<div class="arch-row">${srcBadge(a.numericCeiling)}</div>`));
  }
  if (a.eraVocab && a.eraVocab.length) {
    rows.push(sec('时代观念底线（不可出现现代观念）', a.eraVocab.map(v => `<div class="arch-row">${escapeHtml(v.modern)} → ${escapeHtml(v.ancient)}</div>`).join('')));
  }
  if (a.geography) {
    const v = a.geography.value || {};
    const keys = ['地形', '水系', '道路驿站', '距州治', '邻境', '物产', '常发灾异'];
    const parts = keys.filter(k => v[k] && v[k] !== '不详').map(k => `<div class="arch-row">${escapeHtml(k)}：${escapeHtml(v[k])}</div>`).join('');
    rows.push(sec('地理（真实检索）', (parts || '<div class="arch-row muted">详见档案地理栏</div>') + `<div class="arch-row">${srcBadge(a.geography)}</div>`));
  }
  if (a.persons && a.persons.length) {
    rows.push(sec(`同代真人（前 ${a.persons.length} 位·真实）`, a.persons.map(p => { const v = p.value || {}; const age = (v.age == null) ? '' : ` ${v.age}岁`; return `<div class="arch-row">· ${escapeHtml(v.name || '')}（${escapeHtml(v.role || '?')}${age}${v.nativePlace ? ('，' + escapeHtml(v.nativePlace)) : ''}） ${srcBadge(p)}</div>`; }).join('')));
  }
  box.innerHTML = rows.join('');
}
on('#btnArchiveRefresh', 'click', () => busy('#btnArchiveRefresh', '刷新中…', renderArchive));

/* ================= 检索与核查 ================= */
async function reloadSearch() {
  try {
    SEARCH = await get('/api/search/providers');
    const cur = (SEARCH && SEARCH.current) || {};
    $('#searchState').innerHTML = `检索后端：<b>${escapeHtml(cur.currentName || '未知')}</b>${cur.free ? '（免费）' : ''}<br>${escapeHtml(cur.note || '')}`;
  } catch (e) {
    // 检索后端读取失败不能拖垮整个界面（否则后面的初始化全不执行，按钮就"失灵"了）
    $('#searchState').innerHTML = '检索后端信息读取失败（不影响游玩）：' + escapeHtml(String(e.message || e));
  }
}

const SEARCH_FIELDS = {
  wikipedia: [{ key: 'lang', label: '语言', def: 'zh' }, { key: 'limit', label: '结果条数', def: '5' }],
  wikidata: [{ key: 'lang', label: '语言', def: 'zh' }, { key: 'limit', label: '结果条数', def: '5' }],
  searxng: [{ key: 'baseUrl', label: '实例地址', def: 'http://127.0.0.1:8080' }],
  tavily: [{ key: 'apiKey', label: 'API Key', secret: true }, { key: 'depth', label: '深度 basic/advanced', def: 'basic' }],
  serper: [{ key: 'apiKey', label: 'API Key', secret: true }, { key: 'gl', label: '地区', def: 'cn' }],
  bing: [{ key: 'apiKey', label: 'Subscription Key', secret: true }, { key: 'market', label: '市场', def: 'zh-CN' }],
  bocha: [{ key: 'apiKey', label: 'API Key（sk- 开头）', secret: true }, { key: 'count', label: '结果条数', def: '5' }],
  off: [],
};

function renderEvidence(ev) {
  if (!ev || !ev.length) return '';
  return `<details class="ev"><summary>证据来源（${ev.length} 组查询，点开看原文链接）</summary>` + ev.map(e => `
    <div class="evg">
      <div class="meta">${escapeHtml(e.label)} · ${escapeHtml(e.provider)} ${e.tookMs ? e.tookMs + 'ms' : ''}${e.cached ? ' · 缓存' : ''}${e.error ? ' · 失败：' + escapeHtml(e.error) : ''}</div>
      <div class="meta">查询：<code>${escapeHtml(e.query)}</code></div>
      ${(e.results || []).map(r => `<div class="evr"><a href="${escapeHtml(r.url)}" target="_blank" rel="noreferrer">${escapeHtml(r.title)}</a><div>${escapeHtml(r.snippet || '')}</div></div>`).join('') || '<div class="meta">无结果</div>'}
    </div>`).join('') + '</details>';
}

function pushVerify(v) {
  VERIFY_LOG.unshift(v);
  const cls = x => x === '信息缺口' ? 'state-gap' : x === '未见同名' ? 'state-pass' : 'state-warn';
  $('#verifyBox').innerHTML = VERIFY_LOG.map(v => `
    <div class="item">
      <div class="t">${escapeHtml(v.title)} <span class="${cls(v.body.verdict.state)}">${v.body.verdict.state}</span></div>
      <div class="meta">${escapeHtml(v.body.verdict.reason)}</div>
      ${(v.body.steps || []).map(s => `<div class="meta">${s.n}. ${escapeHtml(s.what)}：${escapeHtml(s.detail)}</div>`).join('')}
      ${renderEvidence(v.body.evidence)}
    </div>`).join('');
}

async function verifyNpc(name, btn) {
  await busy(btn, '核名中…', async () => {
    pushVerify({ title: `虚构人物重名 · ${name}`, body: await post('/api/verify/npc', { name, era: STATE?.clock.yearLabel, eraWords: [STATE?.location.polity] }) });
    switchRail('find');
  });
}
async function fillWorld(what, btnSel) {
  if (!needSave('让 AI 拟资料')) return;
  await busy(btnSel, '拟写中…', async () => {
    const r = await post('/api/world/fill', {
      saveId: STATE.meta.id, what, adapterId: SEL,
      era: STATE.clock.yearLabel, gregorianYear: STATE.clock.gregorianYear,
      place: STATE.location.full, name: STATE.protagonist.name, role: STATE.protagonist.role,
    });
    const patch = what === 'geography'
      ? { geography: { ...r.data, unverified: true } }
      : { household: { ...(r.data || {}), members: (r.data?.members || []).map(m => ({ ...m, note: (m.note || '') + '（AI 拟，未核实）' })) } };
    STATE = await post('/api/world/update', { saveId: STATE.meta.id, ...patch });
    renderState(); switchRail('file');
    notice('已写入', what === 'geography'
      ? '地理已拟好并写入。注意标了「未核实」—— 涉及路程天数时最好自己再验一遍。'
      : '家庭成员已拟好并写入。虚构成员记得用「核名」查一下有没有撞真实历史人物。');
  });
}
on('#btnFillGeo', 'click', () => fillWorld('geography', '#btnFillGeo'));
on('#btnFillFamily', 'click', () => fillWorld('family', '#btnFillFamily'));

on('#btnSearchCfg', 'click', () => $('#btnSettings').click());

on('#btnPlace', 'click', () => {
  if (!needSave('核查地点')) return;
  busy('#btnPlace', '核查中…', async () => {
    pushVerify({ title: `地点核查 · ${STATE.location.full}`, body: await post('/api/verify/place', { place: STATE.location.full, polity: STATE.location.polity, yearLabel: STATE.clock.yearLabel }) });
  });
});
on('#btnTerm', 'click', async () => {
  const t = await askText('核查一个词', '输入要核的词（比如一个怀疑是后世的词，或「保命田」这类自造词）', '如：保命田');
  if (!t) return;
  busy('#btnTerm', '核查中…', async () => {
    pushVerify({ title: `措辞核查 · ${t}`, body: await post('/api/verify/term', { term: t, era: STATE?.clock.yearLabel }) });
  });
});

/* ================= 设置（AI + 检索 + 档案卡） ================= */
on('#btnSettings', 'click', () => {
  openModal('设置', `
    <div class="secnote">AI 引擎</div>
    <div class="field"><label>选哪个 AI</label><select id="sAdapter">${ADAPTERS.map(x => `<option value="${x.id}">${escapeHtml(x.displayName)}</option>`).join('')}</select></div>
    <div id="sAdapterFields"></div>
    <div class="btnrow"><button id="sTest">测试连接</button><span id="sTestOut" class="muted"></span></div>

    <div class="secnote">检索后端（每轮核实史实、查重名都靠它）</div>
    <div class="field"><label>选哪个检索源</label><select id="sSearch">${(SEARCH?.providers || []).map(p => `<option value="${p.id}">${escapeHtml(p.displayName)}</option>`).join('')}</select></div>
    <div id="sSearchFields"></div>
    <div class="btnrow"><button id="sSearchTest">测试检索</button><span id="sSearchTestOut" class="muted"></span></div>
    <div class="hintbox" id="sSearchHint"></div>

    <div class="secnote">存档</div>
    <div class="btnrow"><button id="sCard">生成档案卡（可粘到别处续档）</button></div>
    <pre class="raw" id="sCardOut"></pre>`,
    async () => {
      const aid = $('#sAdapter').value;
      const cfg = {};
      document.querySelectorAll('#sAdapterFields input').forEach(i => { cfg[i.dataset.k] = i.value; });
      CONFIGS[aid] = { ...(CONFIGS[aid] || {}), ...cfg };
      SEL = aid;
      await saveCfgs(aid);
      // 关键修复：只保存「当前选中的那个检索源」的字段，且**显式保留其它源已存的 key**
      const sid = $('#sSearch').value;
      const scfg = {};
      document.querySelectorAll('#sSearchFields input').forEach(i => { scfg[i.dataset.k] = i.value; });
      const cur = await get('/api/search/config');
      const merged = { ...(cur.providers || {}) };
      merged[sid] = { ...(merged[sid] || {}), ...scfg };
      await post('/api/search/config', { config: { provider: sid, providers: merged } });
      await reloadSearch();
      toast('设置已保存');
    });

  const cur = get('/api/adapter-config').catch(e => { toast('读取模型配置失败：' + errMsg(e), 'err'); return {}; });
  $('#sAdapter').value = SEL;
  const fillA = async () => {
    const c = (await cur).configs?.[$('#sAdapter').value] || {};
    const a2 = ADAPTERS.find(x => x.id === $('#sAdapter').value);
    $('#sAdapterFields').innerHTML = (a2?.fields || []).map(f =>
      `<div class="field"><label>${escapeHtml(f.label)}</label><input data-k="${f.key}" type="${f.secret ? 'password' : 'text'}" value="${escapeHtml(c[f.key] ?? f.def ?? '')}"></div>`).join('');
  };
  const fillS = async () => {
    const sc = await get('/api/search/config');
    const id = $('#sSearch').value;
    $('#sSearchFields').innerHTML = (SEARCH_FIELDS[id] || []).map(f =>
      `<div class="field"><label>${escapeHtml(f.label)}</label><input data-k="${f.key}" type="${f.secret ? 'password' : 'text'}" value="${escapeHtml(sc.providers?.[id]?.[f.key] ?? f.def ?? '')}"></div>`).join('');
    const svc = (SEARCH?.providers || []).find(p => p.id === id);
    $('#sSearchHint').innerHTML = svc
      ? `${escapeHtml(svc.note || '')}${svc.free ? '<br>（免费，无需 key）' : '<br>（需填 API Key）'}`
      : '';
  };
  // 关键修复：打开设置时，把下拉框回填成「当前实际在用的检索源」，
  // 否则它会默认停在第一项，一点确定就把你的博查悄悄改回维基百科。
  (async () => {
    try {
      const sc = await get('/api/search/config');
      if (sc.provider) $('#sSearch').value = sc.provider;
    } catch (e) { /* 忽略 */ }
    fillA(); fillS();
  })();
  $('#sAdapter').onchange = fillA;
  $('#sSearch').onchange = fillS;
  $('#sTest').onclick = () => busy('#sTest', '测试中…', async () => {
    $('#sTestOut').textContent = '测试中…'; $('#sTestOut').className = 'muted';
    const cfg = {}; document.querySelectorAll('#sAdapterFields input').forEach(i => { cfg[i.dataset.k] = i.value; });
    try {
      const r = await post('/api/adapter-test', { adapterId: $('#sAdapter').value, config: cfg });
      $('#sTestOut').textContent = '成功' + (r && r.ms != null ? ` ${r.ms}ms` : ''); $('#sTestOut').className = 'okline';
    } catch (e) { $('#sTestOut').textContent = '失败：' + errMsg(e).slice(0, 140); $('#sTestOut').className = 'errline'; }
  });
  // 检索测试：填完 key 直接打一次真实请求，看能不能出结果
  $('#sSearchTest').onclick = () => busy('#sSearchTest', '测试中…', async () => {
    const out = $('#sSearchTestOut');
    out.textContent = '测试中…'; out.className = 'muted';
    const id = $('#sSearch').value;
    const scfg = {};
    document.querySelectorAll('#sSearchFields input').forEach(i => { scfg[i.dataset.k] = i.value; });
    try {
      // 先把当前填的字段存进去，再测（否则测的是旧 key）
      const cur2 = await get('/api/search/config');
      const merged = { ...(cur2.providers || {}) };
      merged[id] = { ...(merged[id] || {}), ...scfg };
      await post('/api/search/config', { config: { provider: id, providers: merged } });
      const r = await post('/api/search/test', { provider: id, query: '苏轼' });
      if (!r.count) { out.textContent = '连上了，但没返回结果（可能该源没配好或查询无结果）'; out.className = 'errline'; return; }
      out.textContent = `成功：${r.count} 条，${r.tookMs}ms`; out.className = 'okline';
      if (r.top) $('#sSearchHint').innerHTML = '示例结果：<b>' + escapeHtml(r.top.title || '') + '</b>';
    } catch (e) { out.textContent = '失败：' + errMsg(e).slice(0, 160); out.className = 'errline'; }
  });
  $('#sCard').onclick = () => busy('#sCard', '生成中…', async () => {
    if (!STATE) { $('#sCardOut').textContent = '先开一个局'; return; }
    const { card } = await post('/api/archive-card', { saveId: STATE.meta.id });
    $('#sCardOut').textContent = card;
  });
});

/* ================= 开局向导 ================= */
const WZ = { step: 0, ai: null, key: '', starter: null, ok: false };
const WZ_STEPS = ['选 AI', '贴 Key', '开局'];
const KEY_URLS = {
  deepseek: 'https://platform.deepseek.com/api_keys',
  'openai-compatible': 'https://platform.openai.com/api-keys',
  anthropic: 'https://console.anthropic.com/settings/keys',
};
const aiOptions = () => ADAPTERS.filter(a => ['deepseek', 'openai-compatible', 'anthropic', 'ollama', 'skeleton'].includes(a.id));

function renderWizard() {
  $('#wzSteps').innerHTML = WZ_STEPS.map((s, i) => `<div class="d ${i <= WZ.step ? 'on' : ''}"></div>`).join('');
  $('#wzPrev').style.visibility = WZ.step === 0 ? 'hidden' : 'visible';
  $('#wzNext').textContent = WZ.step === WZ_STEPS.length - 1 ? '开始' : '下一步';
  $('#wzNext').disabled = WZ.step === 1 && !(WZ.ok || WZ.ai === 'skeleton');
  $('#wzTitle').textContent = ['第 1 步 · 用哪个 AI？', '第 2 步 · 把 API Key 贴进来', '第 3 步 · 从哪开始？'][WZ.step];
  const body = $('#wzBody');

  if (WZ.step === 0) {
    body.innerHTML = aiOptions().map(a => `
      <div class="pick ${WZ.ai === a.id ? 'sel' : ''}" data-ai="${a.id}"><input type="radio" name="wzai" ${WZ.ai === a.id ? 'checked' : ''}>
        <div><div class="pt">${escapeHtml(a.displayName)}</div><div class="pd">${escapeHtml(a.describe || '')}</div></div></div>`).join('')
      + '<div class="hintbox">推荐直接用第一个 <b>DeepSeek</b>：便宜、中文好、为这套规则调得动。</div>';
  }
  if (WZ.step === 1) {
    if (WZ.ai === 'skeleton') {
      body.innerHTML = '<div class="hintbox">你选的是离线骨架：不用 Key，全流程能跑通，但<b>不会生成真正的剧情</b>，只用来熟悉界面。随时可以在「设置」里换成真 AI。</div>';
    } else {
      body.innerHTML = `
        <div style="margin-bottom:10px">1. 打开 <b>${KEY_URLS[WZ.ai] || '你所用平台的密钥页面'}</b>，登录后复制 API Key（一串 sk- 开头的字符）。</div>
        <div class="field"><input id="wzKey" type="password" placeholder="sk-..." value="${escapeHtml(WZ.key)}" style="width:100%;padding:9px"></div>
        <div class="btnrow"><button id="wzTest">测试连接</button><span id="wzTestOut" class="muted"></span></div>
        <div class="hintbox">Key 只存在你自己电脑的 <code>data/adapter-config.json</code>，不会上传到任何别处。</div>`;
      $('#wzKey').oninput = e => { WZ.key = e.target.value.trim(); WZ.ok = false; $('#wzNext').disabled = true; };
      $('#wzTest').onclick = () => busy('#wzTest', '测试中…', async () => {
        $('#wzTestOut').textContent = '测试中…'; $('#wzTestOut').className = 'muted';
        const cfg = { apiKey: WZ.key, model: CONFIGS[WZ.ai]?.model, baseUrl: CONFIGS[WZ.ai]?.baseUrl };
        try {
          // 只有测试真的通过才会把 Key 存下来。之前 401 也被当成功存进去，之后每轮都是占位正文
          const r = await post('/api/adapter-test', { adapterId: WZ.ai, config: cfg });
          $('#wzTestOut').textContent = '成功' + (r && r.ms != null ? ` ${r.ms}ms` : ''); $('#wzTestOut').className = 'okline'; WZ.ok = true;
          $('#wzNext').disabled = false; CONFIGS[WZ.ai] = { ...(CONFIGS[WZ.ai] || {}), ...cfg }; await saveCfgs(WZ.ai);
        } catch (e) {
          $('#wzTestOut').textContent = '失败：' + errMsg(e).slice(0, 130); $('#wzTestOut').className = 'errline';
        }
      });
    }
  }
  if (WZ.step === 2) {
    body.innerHTML = (PACK?.starters || []).map(s => `
      <div class="pick ${WZ.starter === s.id ? 'sel' : ''}" data-starter="${s.id}"><input type="radio" name="wzs" ${WZ.starter === s.id ? 'checked' : ''}>
        <div><div class="pt">${escapeHtml(s.title)}</div><div class="pd">${escapeHtml(s.note)}</div></div></div>`).join('')
      + '<div class="hintbox">想要别的朝代？<b>先点「开始」进去，再点右上「＋ 新开局」</b>，那里有 16 个朝代可选，也可以自己填年号。</div>';
    $('#wzNext').disabled = !WZ.starter;
  }
}
/* 不需要 Key 的适配器：离线骨架、本机 ollama */
const NO_KEY_ADAPTERS = ['skeleton', 'ollama'];
const hasUsableAdapter = () => NO_KEY_ADAPTERS.includes(SEL) || !!(CONFIGS[SEL] && CONFIGS[SEL].apiKey);

async function openWizard() {
  WZ.step = 0;
  WZ.ai = aiOptions().some(a => a.id === SEL) ? SEL : 'deepseek';   // 按当前选中的适配器开，不再写死 deepseek
  WZ.starter = PACK?.starters?.[0]?.id || null;
  WZ.key = CONFIGS[WZ.ai]?.apiKey || ''; WZ.ok = !!WZ.key;
  $('#wizard').classList.remove('hidden'); renderWizard();
}
const closeWizard = () => $('#wizard').classList.add('hidden');
on('#wzSkip', 'click', closeWizard);
on('#wzPrev', 'click', () => { if (WZ.step > 0) { WZ.step--; renderWizard(); } });
on('#wzNext', 'click', () => {
  if (WZ.step < WZ_STEPS.length - 1) { WZ.step++; renderWizard(); return; }
  busy('#wzNext', '开局中…', async () => {
    STATE = await post('/api/save', { ruleset: PACK.id, starterId: WZ.starter });
    await reloadSaves(); renderState(); closeWizard(); $('#input').focus();
  });
});

/* ================= 点击委托 ================= */
document.addEventListener('click', e => {
  const ai = e.target.closest('#wzBody .pick[data-ai]');
  if (ai) { WZ.ai = ai.dataset.ai; WZ.key = CONFIGS[WZ.ai]?.apiKey || ''; WZ.ok = !!WZ.key; renderWizard(); return; }
  const st = e.target.closest('#wzBody .pick[data-starter]');
  if (st) { WZ.starter = st.dataset.starter; renderWizard(); return; }
  const vb = e.target.closest('.vbtn[data-vname]');
  if (vb) { verifyNpc(vb.dataset.vname, vb); return; }
  const npcChip = e.target.closest('#newNpcBox .chip[data-drop]');
  if (npcChip) { npcChip.classList.toggle('on'); return; }
  const thChip = e.target.closest('#threadChips .chip[data-thread]');
  if (thChip) {
    const base = thChip.dataset.thread, cur = thChip.textContent;
    thChip.textContent = !cur.includes('·') ? base + '·了结' : cur.includes('·了结') ? base + '·搁置' : base;
    return;
  }
  const card = e.target.closest('#cardList .card[data-newstarter]');
  if (card) {
    if (STARTER_BUSY) { toast('正在开局，请稍候。', 'warn'); return; }
    const st = (PACK?.starters || []).find(x => x.id === card.dataset.newstarter);
    const noteEl = card.querySelector('.cn'), oldNote = noteEl ? noteEl.textContent : '';
    STARTER_BUSY = true;
    document.querySelectorAll('#cardList .card').forEach(c => c.classList.add('busy'));
    (async () => {
      try {
        if (st && st.custom) {
          // 真人剧本：按设定新建并生成世界（人物档案、身边真人、分月处境），不用预置存档
          if (noteEl) noteEl.textContent = '正在生成世界（联网查地理与地图，约两分钟，请稍候）…';
          const s = await post('/api/save/custom', { ruleset: PACK.id, ...st.custom });
          const r = await post('/api/world/seed', { saveId: s.meta.id });
          STATE = r.state || s;
        } else {
          if (noteEl) noteEl.textContent = '开局中…';
          STATE = await post('/api/save', { ruleset: PACK.id, starterId: card.dataset.newstarter });
        }
        await reloadSaves(); renderState(); $('#input').focus();
      } catch (err) {
        toast('开局失败：' + errMsg(err), 'err', 7000);
      } finally {
        STARTER_BUSY = false;
        if (noteEl) noteEl.textContent = oldNote;
        document.querySelectorAll('#cardList .card').forEach(c => c.classList.remove('busy'));
      }
    })();
  }
});
let STARTER_BUSY = false;

/* ================= 模态框 ================= */
/* 约定：onOk 可以是 async；正常返回 → 自动关闭；返回 false → 留在弹窗里（如表单校验没过）；
   抛错 → toast 出来并留在弹窗里。之前「确定」只是调一下回调，很多弹窗点了确定不关。 */
let MODAL_OK = null;
let MODAL_CANCEL = null;
function openModal(title, html, onOk, onCancel) {
  $('#modalTitle').textContent = title;
  $('#modalContent').innerHTML = html;
  MODAL_OK = onOk || null;
  MODAL_CANCEL = onCancel || null;
  // 没有「确定」回调的弹窗（如存档管理），只留一个「关闭」键
  $('#modalOk').textContent = '确定';
  $('#modalOk').classList.toggle('hidden', !onOk);
  $('#modalOk').disabled = false;
  $('#modal').classList.remove('hidden');
}
function closeModal() {
  $('#modal').classList.add('hidden');
  const c = MODAL_CANCEL; MODAL_OK = null; MODAL_CANCEL = null;
  if (c) { try { c(); } catch (e) { /* 忽略 */ } }
}
on('#modalClose', 'click', closeModal);
on('#modalOk', 'click', async () => {
  const fn = MODAL_OK;
  if (!fn) return closeModal();
  const ok = $('#modalOk'); const oldText = ok.textContent;
  ok.disabled = true;
  try {
    const r = await fn();
    if (r !== false) { MODAL_CANCEL = null; closeModal(); }
  } catch (e) {
    console.error(e); toast(errMsg(e), 'err', 7000);
  } finally { ok.disabled = false; ok.textContent = oldText; }
});
on('#modal', 'click', e => { if (e.target.id === 'modal' && !$('#modalOk').disabled) closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('#modal').classList.contains('hidden') && $('#dlg').classList.contains('hidden') && !$('#modalOk').disabled) closeModal();
});

/* ================= 启动 ================= */
async function renderStarterCards() {
  $('#cardList').innerHTML = (PACK?.starters || []).map(s => `
    <div class="card" data-newstarter="${s.id}">
      <div class="ct">${escapeHtml(s.title)}</div>
      <div class="cn">${escapeHtml(s.note)}</div>
    </div>`).join('');
}

(async function init() {
  // 每一步都单独兜住：任何一步失败都不该让整个界面变砖（按钮全都点不动）
  const step = async (name, fn, fallback) => { try { return await fn(); } catch (e) { console.warn('init 步骤失败：' + name, e); return fallback; } };
  ADAPTERS = await step('adapters', () => get('/api/adapters'), []) || [];
  await step('adapter-config', loadCfgs);
  await step('search', reloadSearch);
  PACK = (await step('rulepacks', () => get('/api/rulepacks'), []))[0] || { id: 'history-sim-v4', starters: [], eraPresets: [] };
  await step('saves', reloadSaves);
  await step('bindWorldUi', async () => bindWorldUi());
  await step('starterCards', renderStarterCards);
  await step('renderState', async () => renderState());
  await step('switchRail', async () => switchRail(document.body.classList.contains('simple') ? 'world' : 'check'));
  try {
    // 之前只认 deepseek 的 Key：用别的模型（或本机 ollama）的人每次打开都被弹向导
    if (!hasUsableAdapter()) openWizard();
  } catch (e) { console.warn('向导打开失败', e); }
})();

/* ================= 简洁模式（默认）：隐藏审计、纠错、回滚、核查等开发者面板 ================= */
(function () {
  let simple = true;
  try { simple = localStorage.getItem('uiAdvanced') !== '1'; } catch (_) { /* 无存储则默认简洁 */ }
  const apply = () => {
    document.body.classList.toggle('simple', simple);
    const b = document.getElementById('btnAdvanced');
    if (b) b.textContent = simple ? '高级面板' : '收起高级';
    const act = document.querySelector('.railtab.active');
    if (simple && (!act || act.classList.contains('adv'))) switchRail('world');
  };
  const btn = document.getElementById('btnAdvanced');
  if (btn) btn.onclick = () => {
    simple = !simple;
    try { localStorage.setItem('uiAdvanced', simple ? '0' : '1'); } catch (_) { /* 忽略 */ }
    apply();
  };
  apply();
})();

/* ================= GM 规范第九、十章：档案卡 / 速查表 / 人物表 ================= */
async function showGmCard(which, btn) {
  if (!needSave(which)) return;
  await busy(btn, '生成中…', async () => {
    const r = await post('/api/gm-cards', { saveId: STATE.meta.id });
    const text = r[which] || '（生成失败）';
    openModal(which + (r.dir ? `（已存到 ${r.dir}）` : ''), `<pre class="cardpre">${escapeHtml(text)}</pre>`, null);
  });
}
['btnRecap:前情回顾', 'btnCard:档案卡', 'btnSheet:速查表', 'btnRoster:人物表'].forEach(x => {
  const [id, which] = x.split(':');
  on('#' + id, 'click', e => showGmCard(which, e.currentTarget));
});

/* ================= 《设计书》§7.6 玩家一键标记 + §1.3 史实宽容度 ================= */
document.querySelectorAll('.flagbtn').forEach(b => b.onclick = async () => {
  if (!needSave('打标记')) return;
  if (!(STATE.turn > 0)) { toast('还没有采纳过的回合可以标记：先推进并采纳一轮。', 'warn'); return; }
  const flag = b.dataset.flag;
  let note = '';
  if (flag === '出戏' || flag === '错史') {
    note = await askText(`「${flag}」在哪里？`, '写一句就行。若能写成「错的 → 对的」（例：萧纪在江陵 → 萧纪在成都），以后正文再写回错的会被程序自动拦下。', '错的 → 对的');
    if (note === null) return;
  }
  await busy(b, null, async () => {
    const r = await post('/api/flag', { saveId: STATE.meta.id, turn: STATE.turn, flag, note });
    const by = (r.stats && r.stats.by) || {};
    $('#flagMsg').textContent = `已记第${STATE.turn}回合「${flag}」。累计：` + Object.entries(by).map(([k, v]) => `${k}${v}`).join(' ');
  });
});

/* ================= 《设计书》§8.12 统计面板 ================= */
on('#btnStats', 'click', () => {
  if (!needSave('统计')) return;
  busy('#btnStats', '统计中…', async () => {
    const r = await post('/api/stats', { saveId: STATE.meta.id });
    const a = r.arcs || {};
    const extra = a.路线分 ? `\n\n篇章：已到第 ${a.章} 章\n路线分：${Object.entries(a.路线分).map(([k, v]) => k + v).join(' ')}` +
      ((a.账单 || []).length ? '\n\n章末账单：\n' + a.账单.map(x => `第${x.chapter}章「${x.goal}」（${x.turns}）：${[...(x.态度变化 || []), ...(x.伏笔回收 || []).map(y => '回收 ' + y), ...(x.时钟 || []), ...(x.得失 || [])].join('；') || '无大变化'}`).join('\n') : '') +
      ((a.检查点 || []).length ? '\n\n主线进度评估：\n' + a.检查点.map(c => `第${c.turn}回合：${c.text}`).join('\n') : '') : '';
    openModal('统计', `<pre class="cardpre">${escapeHtml((r.text || '') + extra)}</pre>`, null);
  });
});

