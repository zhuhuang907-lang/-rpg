/* 枢引擎控制台：不含任何游戏规则，规则全在 rulepacks/ 里 */

/* 元素缺失时返回惰性占位对象，绝不让 `$('#x').onclick = ...` 因 null 抛错——
   旧实现一旦命中一个不存在的元素，整段绑定从这里断掉，后面的按钮全部失灵
   （表现就是「很多功能点了没反应」）。index.html 与 app.js 存在版本差：
   设置面板、战场面板、开场向导的不少元素是运行时注入的，绑定时可能尚未生成。
   占位对象让绑定得以继续，真正缺失的控件会在打开面板时由渲染函数补齐。 */
const NULL_EL = new Proxy({}, {
  get(_t, k) {
    if (k === 'value' || k === 'textContent' || k === 'innerHTML' || k === 'className' || k === 'id' || k === 'placeholder') return '';
    if (k === 'checked' || k === 'disabled' || k === 'hidden') return false;
    if (k === 'style') return {};
    if (k === 'classList') return { add() {}, remove() {}, toggle() {}, contains() { return false; } };
    if (k === 'dataset') return {};
    if (k === 'querySelectorAll') return () => [];
    if (k === 'querySelector' || k === 'closest') return () => NULL_EL;
    if (k === 'children' || k === 'childNodes') return [];
    return () => {};
  },
  set() { return true; },
});
const $ = s => { try { return document.querySelector(s) || NULL_EL; } catch { return NULL_EL; } };
// 服务端出错统一回 {ok:false, why}；界面里很多地方只认 r.error，这里补齐，免得失败被当成成功
const normResp = r => (r && r.ok === false && r.why && !r.error ? { ...r, error: r.why } : r);
// 游戏服务连不上（被关掉了 / 直接打开了网页文件）：顶部大字提示，并每 3 秒重试，服务回来就自动消失
let SERVER_DOWN = false;
function serverDown() {
  if (location.protocol === 'file:' || SERVER_DOWN) return;
  SERVER_DOWN = true;
  const b = document.getElementById('fatalBanner');
  if (b) {
    b.classList.remove('hidden');
    b.innerHTML = '<b>游戏服务没有在运行，所以什么都保存不了。</b>多半是启动游戏的小窗口被关掉了。<br>请关掉这个页面，重新双击桌面上的<b>「历史模拟RPG」</b>（或游戏文件夹里的「启动游戏.exe」）。服务恢复后这条提示会自己消失。';
  }
  const t = setInterval(async () => {
    try { const r = await fetch('/api/health'); if (r.ok) { clearInterval(t); SERVER_DOWN = false; if (b) b.classList.add('hidden'); } } catch (_) { /* 还没回来 */ }
  }, 3000);
}
async function fetchJson(u, opt) {
  let r;
  try { r = await fetch(u, opt); }
  catch (e) { serverDown(); throw new Error('游戏服务没有在运行（' + (e.message || e) + '）：请重新双击「启动游戏」'); }
  return normResp(await r.json());
}
const post = (u, b) => fetchJson(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b || {}) });
const get = u => fetchJson(u);
const escapeHtml = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
  list.forEach(s => sel.insertAdjacentHTML('beforeend', `<option value="${escapeHtml(s.id)}">${escapeHtml(s.title)}（${s.turn ? '第' + s.turn + '轮' : '未开场'}）</option>`));
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

/* 应用内确认框：不用浏览器原生 confirm()。
   内嵌浏览器/部分环境里原生 confirm 会被静默屏蔽（永远返回 false），
   表现出来的症状就是「点了删除什么都没发生」。 */
function askConfirm(text, okLabel = '确定') {
  return new Promise(resolve => {
    let done = false;
    const finish = v => { if (done) return; done = true; resolve(v); };
    openModal('确认', `<div class="secnote" style="white-space:pre-wrap">${escapeHtml(text)}</div>`, () => { finish(true); closeModal(); }, () => finish(false));
    const ok = $('#modalOk'); ok.textContent = okLabel;
    ok.focus();
  });
}

async function doDeleteSave(id, title) {
  const yes = await askConfirm(`删掉「${title}」？不可恢复。`, '删掉');
  if (!yes) return false;
  const r = await post('/api/save/delete', { saveId: id });
  if (r.error || !r.ok) { alert('删除失败：' + ((r && (r.error || r.message)) || '未知原因')); return false; }
  if (STATE && STATE.meta.id === id) STATE = null;
  await reloadSaves(); renderState();
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

$('#btnSaves').onclick = async () => {
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
    `<button id="btnCleanBad" class="minibtn" style="margin-left:8px">检查并清理坏存档</button></div>`;

  openModal('存档管理', `${head}<div class="list">${rows}</div>`, null);
  // 行内删除：删完直接移除该行并刷新计数，不再关掉整个弹窗重开（更顺滑）
  // 坏存档：读不懂的、开局没成功的、AI 没接通时写进占位剧情的——列出来，确认后一次删掉，正常存档不动
  const cleanBtn = $('#btnCleanBad');
  if (cleanBtn) cleanBtn.onclick = async () => {
    const r = await get('/api/saves/bad');
    if (r.error) return alert('检查失败：' + r.error);
    if (!r.bad.length) return alert('检查完了：没有坏存档，现有存档都是好的。');
    const lines = r.bad.map(b => `· ${b.title}（${b.reasons.join('；')}）`).join('\n');
    const yes = await askConfirm(`找到 ${r.bad.length} 个坏存档，删掉它们？其余正常存档不会动。\n\n${lines}`, '删掉这些');
    if (!yes) { $('#btnSaves').click(); return; }
    const c = await post('/api/saves/cleanup', { ids: r.bad.map(b => b.id) });
    if (c.error) return alert('清理失败：' + c.error);
    if (STATE && c.removed.includes(STATE.meta.id)) STATE = null;
    await reloadSaves(); renderState();
    alert(`已删掉 ${c.removed.length} 个坏存档，保留 ${c.kept} 个正常存档。`);
    $('#btnSaves').click();
  };
  $('#modalContent').querySelectorAll('button[data-del]').forEach(b => b.onclick = async () => {
    if (await doDeleteSave(b.dataset.del, b.dataset.title)) {
      $('#btnSaves').click(); return; // 确认框关掉了存档管理，删完重新打开，列表就是最新的
      const item = b.closest('.saveitem'); if (item) item.remove();
      const remaining = $('#modalContent').querySelectorAll('.saveitem').length;
      const cnt = $('#saveCount'); if (cnt) cnt.textContent = remaining;
      if (remaining === 0) { const list2 = $('#modalContent').querySelector('.list'); if (list2) list2.innerHTML = '<div class="muted">还没有任何存档。</div>'; }
      const ctBtn = $('#btnClearTest'); if (ctBtn) ctBtn.remove();
    }
  });
  $('#modalContent').querySelectorAll('button[data-open]').forEach(b => b.onclick = async () => {
    STATE = await post('/api/state', { saveId: b.dataset.open });
    closeModal(); await reloadSaves(); renderState();
  });
  const okBtn = $('#modalOk'); okBtn.textContent = '关闭';
  // 一键清空测试存档：只删测试残留，真实存档（梁朝末年等）不受影响
  const clearBtn = $('#btnClearTest');
  if (clearBtn) clearBtn.onclick = async () => {
    const yes = await askConfirm(`确定清空全部「测试残留」存档（共 ${testCount} 个）？真实存档（梁朝末年等）不受影响。`, '清空');
    if (!yes) return;
    clearBtn.disabled = true; clearBtn.textContent = '清空中…';
    const all = await get('/api/saves');
    let done = 0;
    for (const s of all.filter(s => isTestSave(s.id))) {
      const r = await post('/api/save/delete', { saveId: s.id });
      if (r && r.ok) done++;
    }
    await reloadSaves();
    $('#btnSaves').click(); // 刷新列表
  };
};

$('#saveSel').onchange = async e => {
  if (!e.target.value) return;
  STATE = await post('/api/state', { saveId: e.target.value });
  renderState();
};

function renderStatusBar() {
  const bar = $('#statusBar');
  if (!STATE) { bar.innerHTML = '还没开局 —— 选一个现成的，或点「＋ 新开局」'; return; }
  const s = STATE;
  // 状态栏：你是谁 · 何时 · 何地（点一下打开「我的状态」）
  bar.innerHTML = `你是 <b>${escapeHtml(s.protagonist.name)}</b>${s.protagonist.gender ? '（' + escapeHtml(s.protagonist.gender) + '）' : ''}${s.protagonist.age != null ? '，' + s.protagonist.age + '岁' : ''}${s.protagonist.role ? '，' + escapeHtml(s.protagonist.role) : ''} · ${escapeHtml(s.clock.yearLabel)}（${s.clock.gregorianYear < 0 ? '前' + -s.clock.gregorianYear : s.clock.gregorianYear}年）${lunarText(s.clock)} · ${escapeHtml(s.location.full)}`;
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

$('#btnNew').onclick = async () => {
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
      STATE = await post('/api/save/custom', spec);
      if (STATE && STATE.error) {
        alert('开不了这个局：\n\n' + STATE.error);
        STATE = null;
        $('#modalOk').disabled = false; $('#modalOk').textContent = '确定';
        return;
      }
      $('#modalOk').disabled = true; $('#modalOk').textContent = '生成世界中…';
      try {
        const w = await post('/api/world/seed', { saveId: STATE.meta.id, adapterId: SEL });
        STATE = w.state;
        if (w.histError) console.warn('历史人物联网拉取失败（不影响开局）：', w.histError);
      } catch (e) { console.warn('生成世界失败，可稍后点「重新生成世界」：', e); }
      closeModal(); await reloadSaves(); renderState();
      $('#modalOk').disabled = false; $('#modalOk').textContent = '确定';
      $('#input').focus();
    });

  let REAL = null; // 真人模式核查结果

  const eraOf = () => {
    const e = eras.find(x => x.id === $('#nEra').value);
    if ($('#nEra').value === '__custom') return { yearLabel: $('#nYearLabel').value, gregorianYear: Number($('#nGYear').value) || 0 };
    return e || {};
  };

  $('#nReal').onchange = () => { $('#nRealBox').style.display = $('#nReal').checked ? 'block' : 'none'; };

  $('#nCheck').onclick = async () => {
    const name = $('#nName').value.trim();
    if (!name) { $('#nCheckOut').textContent = '先填姓名'; return; }
    $('#nCheckOut').textContent = '查 Wikidata 中…'; $('#nCheckOut').className = 'muted'; $('#nCand').innerHTML = '';
    const r = await post('/api/verify/realperson', { name, era: eraOf().yearLabel, gregorianYear: eraOf().gregorianYear });
    REAL = r;
    $('#nCheckOut').textContent = r.verdict.state + '：' + r.verdict.reason;
    $('#nCheckOut').className = r.verdict.state === '信息缺口' ? 'state-gap' : 'state-warn';
    if (!r.candidates?.length) return;
    $('#nCand').innerHTML = '<div class="secnote">指定你要扮演哪一个（末年同名极多，必须挑；与开局年代不相容的会被标红、选不了）：</div>' +
      r.candidates.map((c, i) => {
        const fe = c.fitsEra || { ok: true };
        const bad = fe.ok === false && !fe.unknown;      // 明确不相容 → 拦
        const unknown = fe.ok === false && fe.unknown;   // 生卒不详 → 提示但不拦
        const mark = bad ? `<span class="state-warn">不相容</span> <span class="muted">${escapeHtml(fe.why || '')}</span>`
          : unknown ? '<span class="state-warn">生卒不详·待核</span>'
          : '<span class="state-pass">相容</span>';
        return `<div class="cand ${i === 0 ? 'sel' : ''} ${bad ? 'bad' : ''}" data-q="${escapeHtml(c.qid)}" data-label="${escapeHtml(c.label)}" data-b="${c.born ?? ''}" data-d="${c.died ?? ''}" data-bp="${escapeHtml(c.birthPlace || '')}" data-g="${escapeHtml(c.gender || '')}" data-fit="${bad ? '0' : '1'}">
          <div><div class="cn">${escapeHtml(c.label)} ${c.birthPlace ? '· ' + escapeHtml(c.birthPlace) : ''}</div>
               <div class="cy">${c.born ?? '?'} — ${c.died ?? '?'} · <a href="https://www.wikidata.org/wiki/${escapeHtml(c.qid)}" target="_blank" rel="noreferrer">${escapeHtml(c.qid)}</a> · ${mark}</div></div>
          <button class="minibtn" ${bad ? 'disabled' : ''}>用这个</button>
        </div>`;
      }).join('') +
      (r.kin?.length ? `<div class="secnote">已知亲属（会自动填进「家」）：</div><div class="railnote">${r.kin.map(k => `${escapeHtml(k.relation)}：${escapeHtml(k.name)}`).join('　')}</div>` : '');
    $('#nCand').onclick = e => {
      const c = e.target.closest('.cand'); if (!c) return;
      if (c.dataset.fit === '0') {
        alert('这个人活不到你设定的年代，不能选。\n\n' + (c.querySelector('.muted')?.textContent || '') + '\n\n请改年号/公元年，或换一个活在该时代的人。');
        return;
      }
      document.querySelectorAll('#nCand .cand').forEach(x => x.classList.remove('sel'));
      c.style.background = 'var(--soft)';
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
  };

  $('#nEra').onchange = () => { $('#nEraCustom').style.display = $('#nEra').value === '__custom' ? 'grid' : 'none'; };
  document.querySelectorAll('#nIdent .pick').forEach(p => p.onclick = () => {
    document.querySelectorAll('#nIdent .pick').forEach(x => x.classList.remove('sel'));
    p.classList.add('sel'); p.querySelector('input').checked = true;
  });
  document.querySelector('#nIdent .pick').classList.add('sel');
};

/* ================= 渲染主区与档案 ================= */
function renderState() {
  // 记住正在玩的那一局：刷新页面、重开浏览器后直接回到这里（连同还没接上的那一段）
  try { if (STATE && STATE.meta) localStorage.setItem('lastSave', STATE.meta.id); else localStorage.removeItem('lastSave'); } catch (_) { /* 无存储就算了 */ }
  renderStatusBar();
  try { renderMeters(); renderAskPanel(); if (!STATE) renderDesk(null); } catch (_) { /* 新面板出错不挡主流程 */ }
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
    <div><b>时间</b>${escapeHtml(s.clock.yearLabel)}（${s.clock.gregorianYear < 0 ? '公元前' + -s.clock.gregorianYear : s.clock.gregorianYear}）${lunarText(s.clock)} ${escapeHtml(s.clock.season || '')}</div>
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
      + (h.members || []).map(m => `<div>· ${escapeHtml(m.name)}（${m.gender ? escapeHtml(m.gender) + '，' : ''}${escapeHtml(m.relation)}${m.rank ? '·' + escapeHtml(m.rank) : ''}${m.age ? '，' + m.age + '岁' : ''}，${escapeHtml(m.status || '在世')}）${m.nativePlace ? '，籍贯：' + escapeHtml(m.nativePlace) : ''}${m.background ? '，' + escapeHtml(String(m.background).replace(/[。，]+$/, '')) : ''}${m.role ? '，' + escapeHtml(String(m.role).replace(/^（|）$/g, '')) : ''}${m.attitude ? '，态度：' + escapeHtml(m.attitude) : ''}</div>`).join('')
      + (h.property && Object.entries(h.property).some(([, v]) => v && !/^未登记$/.test(v)) ? `<div><b>家产</b>${escapeHtml(Object.entries(h.property).filter(([, v]) => v && !/^未登记$/.test(v)).map(([k, v]) => k + '：' + v).join('，'))}</div>` : '')
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
      <div class="t">${escapeHtml(t.title)}${t.lastTouchedTurn && s.turn - t.lastTouchedTurn > 5 ? ' <span class="muted">（好几轮没提到了）</span>' : ''}</div>
      <div class="meta">${({ open: '未了', resolved: '已了结', dropped: '已搁置' })[t.status] || ''}${t.note ? ' · ' + escapeHtml(t.note) : ''}</div>
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
      <div class="t">${escapeHtml(n.name)} <span class="meta">${[n.gender, n.age ? n.age + '岁' : '', n.role].filter(Boolean).map(escapeHtml).join(' · ')}</span></div>
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
    <div class="entry"><div class="who">第${l.turn}轮${l.time ? ' · ' + escapeHtml(l.time) : ''}${l.speaker === 'GM' ? '' : ' · ' + escapeHtml(l.speaker === '玩家' ? '你' : l.speaker)}</div><div class="scene">${escapeHtml(l.text)}</div></div>`).join('')
    || `<div class="openingCard">
        <div class="oc-t">新局已就绪 · 还没有开场</div>
        <div class="oc-d">点下面「${escapeHtml(s.opening ? '生成开场' : '生成开场')}」，AI 会先交代清楚：<b>时间（年号+公元+季节+日子）、地点（当时的古地名，隶属谁、谁控制）、你是谁（姓名/年岁/性别/身份职衔/籍贯出身）、家世与处境、当朝天子与天下大势、眼下压到你身上的那一桩事、在场各人的姓名神情</b>，最后停在你要拿主意的坎上。</div>
        ${s.opening ? `<div class="oc-o">开局处境：${escapeHtml(s.opening)}</div>` : ''}
        <div class="btnrow"><button id="btnOpening" class="primary big">▶ 生成开场</button>
          <span class="muted">现在是${escapeHtml(s.clock.yearLabel)}（公元${s.clock.gregorianYear}年）· ${escapeHtml(s.location.full)} · 你是${escapeHtml(s.protagonist.name)}${s.protagonist.age != null ? "，" + s.protagonist.age + "岁" : ""}</span></div>
      </div>`;
  if (!hasLog && $('#btnOpening')) $('#btnOpening').onclick = () => runTurnWith('', []);
  $('#draftBox').classList.add('hidden');
  // 刷新页面后把上次生成、还没接上的那一段找回来
  const pd = s.pendingDraft;
  if (pd && pd.draft && (pd.draft.baseTurn == null || Number(pd.draft.baseTurn) === Number(s.turn || 0))) {
    if (!LAST || LAST.draft !== pd.draft) { LAST = { ...pd }; renderLast(); }
  } else {
    if (LAST && LAST.draft && LAST.draft.baseTurn != null && Number(LAST.draft.baseTurn) !== Number(s.turn || 0)) LAST = null;
    if (!LAST) { resumeRunningTurn(s.meta.id); renderDesk(null); const sb = document.getElementById('settleBox'); if (sb) sb.classList.add('hidden'); }
  }
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

$('#btnIdentity').onclick = () => {
  if (!STATE) return alert('先开一个局');
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
      const s2 = await post('/api/identity', {
        saveId: STATE.meta.id, identityModule: to, role: $('#idRole').value, reason: $('#idReason').value,
      });
      if (s2.error) { alert('失败：' + s2.error); return; }
      STATE = s2; closeModal(); renderState();
    });
};

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
  if (!STATE) return alert('先开一个局');
  $('#btnReseed').disabled = true; $('#btnReseed').textContent = '重新检索中…';
  try {
    const w = await post('/api/world/seed', { saveId: STATE.meta.id, adapterId: SEL });
    STATE = w.state; renderState();
    const mapN = (STATE.map && STATE.map.images || []).length;
    alert(`世界已重新生成：\n· 同代真人 ${w.histCount} 位（联网失败则为 0，可重试）\n· 真实历史地图 ${mapN} 张\n· 地点：${STATE.location.full}${STATE.location.placeFrom === 'era-default' ? '（引擎按该时代默认给出，可在新开局里改）' : ''}\n· 地理与地盘已按检索刷新${w.histError ? '\n（本次历史人物联网失败：' + w.histError + '）' : ''}`);
  } finally { $('#btnReseed').disabled = false; $('#btnReseed').textContent = '重新生成世界（人物＋地图）'; }
}
$('#btnReseed').onclick = reseedWorld;

$('#threadBox').onclick = async e => {
  const el = e.target.closest('a[data-th]');
  if (!el) return;
  e.preventDefault();
  STATE = await post('/api/thread', { saveId: STATE.meta.id, title: decodeURIComponent(el.dataset.th), action: el.dataset.act });
  renderState();
};

/* ================= 回合 ================= */
// AI 正在写的时候，所有会再发一次请求的按钮都锁住（以前连点「重新生成」「生成开场」会重复扣费）
let TURN_BUSY = false;
function setTurnBusy(on, note) {
  TURN_BUSY = on;
  ['#btnRun', '#btnRetry', '#btnEdit', '#btnOpening', '#qGo', '#qRandom'].forEach(id => { const el = document.querySelector(id); if (el) el.disabled = on; });
  const box = document.getElementById('draftBox');
  if (box) box.classList.toggle('busy', on);
  const ob = document.getElementById('btnOpening');
  if (ob) ob.textContent = on ? 'AI 正在写开场…' : '▶ 生成开场';
  let n = document.getElementById('busyNote');
  if (on) {
    if (!n) { n = document.createElement('div'); n.id = 'busyNote'; n.className = 'busynote'; const anchor = document.querySelector('.compose'); if (anchor) anchor.parentNode.insertBefore(n, anchor); }
    n.textContent = note || 'AI 正在写，一般半分钟到一两分钟，请稍等……';
  } else if (n) n.remove();
}
/* 边写边显示：服务端先开工，前端每 0.8 秒取一次已写出的正文 */
async function streamTurn(body) {
  const s = await post('/api/turn-start', body);
  if (!s || !s.job) {
    if (s && (s.error || s.ok === false)) throw new Error(s.error || s.why || '未知错误');
    return post('/api/turn', body); // 老服务没有这个接口：照旧一次取回
  }
  return pollTurnJob(s.job);
}
async function pollTurnJob(job) {
  const sc = $('#draftScene');
  let shown = false, misses = 0;
  // 旧的一段先收起，免得以为新的一段已经写好了；上一回合的案头与结算也先收起
  for (const id of ['deskBox', 'settleBox']) { const el = document.getElementById(id); if (el) el.classList.add('hidden'); }
  if (!$('#draftBox').classList.contains('hidden')) { sc.textContent = 'AI 正在写这一段……'; for (const id of ['gmHead', 'gmTail', 'gmOrders']) { const el = document.getElementById(id); if (el) el.textContent = ''; } }
  for (;;) {
    await new Promise(res => setTimeout(res, 800));
    let j;
    try { j = await post('/api/turn-job', { job }); misses = 0; }
    catch (e) { if (++misses > 5) throw e; continue; }
    if (j.status === 'done') return j.result;
    if (j.status === 'error' || j.ok === false) throw new Error(j.why || j.error || '未知错误');
    if (j.partial) {
      if (!shown) {
        shown = true;
        for (const id of ['gmHead', 'gmTail', 'gmOrders']) { const el = document.getElementById(id); if (el) el.textContent = ''; }
        $('#draftBox').classList.remove('hidden');
        sc.classList.add('streaming');
      }
      sc.textContent = j.partial;
    }
  }
}
/* 刷新页面时 AI 还在写：接着显示，写完照常出现在草稿区 */
async function resumeRunningTurn(saveId) {
  if (TURN_BUSY || !saveId) return;
  let q = null;
  try { q = await post('/api/turn-running', { saveId }); } catch (_) { return; }
  if (!q || !q.job || TURN_BUSY || !STATE || STATE.meta.id !== saveId) return;
  setTurnBusy(true, 'AI 还在写刚才那一段，正在接着显示……');
  try {
    const r = await pollTurnJob(q.job);
    if (r && r.ok !== false && !r.error && STATE && STATE.meta.id === saveId) {
      LAST = { ...r, confirmedThreads: q.threads || [], input: q.input || '' };
      renderLast();
    }
  } catch (e) { alert('刚才那一段没写成：' + String(e.message || e) + '\n\n可以再点一次「过这一回合」。'); }
  finally { setTurnBusy(false); const sc = document.getElementById('draftScene'); if (sc) sc.classList.remove('streaming'); }
}
async function runTurnWith(input, confirmedThreads, opts) {
  if (!STATE) return alert('先开一个局：点上面「＋ 新开局」或选一个现成局面');
  if (TURN_BUSY) return;
  // 有上一段没确认、而你写了下一步：先把上一段接进世界，再写新的（不再要求先点「采纳」）
  if (LAST && !(opts && opts.regenerate)) {
    $('#btnRun').disabled = true; $('#btnRun').textContent = '接上上一段…';
    const ok = await acceptLast(true);
    $('#btnRun').disabled = false; $('#btnRun').textContent = '过这一回合';
    if (!ok) return;
  }
  setTurnBusy(true, opts && opts.regenerate ? 'AI 正在重写这一段，请稍等……' : (LAST ? 'AI 正在写，请稍等……' : 'AI 正在写这一段，一般半分钟到一两分钟……'));
  $('#btnRun').textContent = 'AI 正在写…';
  try {
    const r = await streamTurn({
      saveId: STATE.meta.id,
      input,
      regenNote: (opts && opts.regenNote) || '',
      adapterId: SEL,
      adapterConfig: {},
      confirmedThreads,
      verbosity: $('#verbosity').value || 'normal',
      factMode: ($('#factMode') && $('#factMode').value) || 'standard',
      autoVerifyNpcs: $('#autoVerify').checked,
      autoFactCheck: $('#autoFactCheck').checked,
      autoRepair: $('#autoFactCheck').checked,
      planFirst: $('#planFirst') ? $('#planFirst').checked : true,
      battle: window.__BATTLE || null,
    });
    if (r.error) throw new Error(r.error);
    if (r.ok === false) throw new Error(r.why || '未知错误');
    LAST = { ...r, confirmedThreads, input };
    // 这一回合的决定已经送出去了：清空决定栏与输入框
    if (opts && opts.fromTray) { trayList().length = 0; renderTray(); $('#input').value = ''; }
    // 战阵用完即清（一场仗一次布阵），避免误带到下一轮
    if (window.__BATTLE && r.battle) { window.__BATTLE = null; renderBattleHint(); }
    renderLast();
    // 简洁模式下不跳走，侧栏停在玩家正在看的那一页
    if (!document.body.classList.contains('simple')) switchRail('check');
  } catch (e) {
    if (LAST) try { renderLast(); } catch (_) { /* 重写失败：把原来那一段放回来 */ }
    const msg = String(e.error || e.message || e);
    // AI 没接通（没填 Key / Key 失效 / 欠费）：说清楚，并直接打开设置，免得玩家对着空白页不知道发生了什么
    if (/Key|余额|401|402|403|未接|skeleton|骨架|型号|Model Not Exist|model/i.test(msg)) {
      alert('AI 没接通：' + msg + '\n\n接下来会打开「设置」，把 DeepSeek 的 Key 粘贴进去、点「测试连接」即可。');
      $('#btnSettings').click();
    } else if (/连不上|fetch failed|ENOTFOUND|ECONNREFUSED|ECONNRESET|ETIMEDOUT|timeout|aborted/i.test(msg)) {
      alert(msg + '\n\n可以在首页点「检查网络」看看卡在哪；网络恢复后再点「过这一回合」。');
    } else alert('调用失败：' + msg + '\n\n可以再点一次「过这一回合」；反复出现的话，把这段话发给我。');
  } finally { setTurnBusy(false); $('#btnRun').textContent = '过这一回合'; const sc = document.getElementById('draftScene'); if (sc) sc.classList.remove('streaming'); }
}

$('#btnRun').onclick = () => runTurnWith(
  composeDecisions(),
  [...$('#threadSel').selectedOptions].map(o => decodeURIComponent(o.value)),
  { fromTray: true },
);

// Ctrl/Cmd + Enter 直接推进，省得去点按钮
$('#input').addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); $('#btnRun').click(); }
});

function renderLast() {
  const d = LAST.draft || {};
  $('#draftScene').textContent = d.scene || '（AI 没返回正文，通常是 Key 没生效或返回被截断）';
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
  // 这一段里交代的差事与进展：一眼看到办没办
  const ords = (d.orders || []).filter(o => o && o.who && o.what);
  const ob = box('gmOrders', false);
  ob.textContent = ords.length ? '【差事】\n' + ords.map(o => `· ${o.who}：${o.what} —— ${o.status || '在办'}${o.result ? '，' + o.result : ''}`).join('\n') : '';
  $('#draftMeta').textContent = ` · 适配器 ${LAST.adapterId}${LAST.parseFailed ? ' · 返回不是标准 JSON，已按纯文本处理' : ''}`;

  // 回显：你写的指令 / AI 说它听懂了什么 / 本轮它去检索了什么 —— 让「听岔、替你做主」一眼可见
  const echo = [];
  if (LAST.input && LAST.input.trim()) echo.push(`<div class="echo-line"><b>你的指令</b>：${escapeHtml(LAST.input)}</div>`);
  else echo.push(`<div class="echo-line muted">${STATE && !STATE.turn && !(STATE.log || []).some(l => l.speaker === 'GM') ? '开场' : '你这一步没写行动，先看眼前正在发生的事'}。</div>`);
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
  const simple = document.body.classList.contains('simple');
  ['gmHead', 'gmTail'].forEach(id => { const el = document.getElementById(id); if (el) el.classList.toggle('adv', true); });

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
      + `<br><span class="muted">建议点「重新生成」重写这一段，或点「修改这段」自己改掉。</span>`;
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

  // 简洁模式：正文上方只留「你的指令」一行，引擎的构思、检索、核查清单都收起来（高级模式里仍可看）
  if (simple) $('#draftEcho').innerHTML = echo[0] || '';
  const sc0 = document.getElementById('draftScene');
  if (sc0) { sc0.setAttribute('contenteditable', 'false'); sc0.classList.remove('editing'); }
  $('#btnEdit').textContent = '修改这段';
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
  updateAdvPreview(); // 「按剧情自动」要跟着这一段的天数走
  renderSettle(d);
  renderDesk(d.reports, d.actions);
  renderMeters(); renderAskPanel();
  // 开场已经写出来了：「还没有开场」的提示卡收起
  document.querySelectorAll('.openingCard').forEach(el => el.classList.add('hidden'));
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
  btn.textContent = '按史实重算'; btn.className = 'btn-mini';
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
  close.textContent = '暂不'; close.className = 'btn-mini';
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
    // 简洁模式只列真实发生的变化；引擎推演的「NPC 自行其事」只在高级模式里看（玩家反馈：侧栏那些像假的）
    const simpleMode = document.body.classList.contains('simple');
    const chg = [].concat(j.worldChanges || [], simpleMode ? [] : (j.npcActions || []).map(x => 'NPC（推演）：' + x), simpleMode ? [] : (j.rumors || []));
    $('#worldChangeBox').innerHTML = chg.length ? chg.map(x => `<div class="meta">· ${escapeHtml(String(x))}</div>`).join('') : '<div class="muted">最近没有新的大事传到这里。</div>';
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
      post('/api/snapshot/repair', { saveId: STATE.meta.id }),
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
  const yes = await askConfirm(`回滚到 ${id}？当前进度（第 ${STATE.turn || 0} 轮）之后的一切都会被丢弃：人物、账目、地盘、线索全部回到那时。快照与纠正记录保留。此操作不可撤销。`, '回滚');
  if (!yes) return;
  const r = await post('/api/snapshot/rollback', { saveId: STATE.meta.id, to: id });
  if (!r.ok) { alert(r.why || '回滚失败'); return; }
  STATE = await post('/api/state', { saveId: STATE.meta.id });
  renderState();
  await renderSnapshots();
  await renderWorldPanel();
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
      finish(out); closeModal();
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
  await post('/api/history/anchor', {
    saveId: STATE.meta.id, year: v.year, text: v.text,
    mustNot: v.mustNot ? v.mustNot.split(/[、,，]/).map(x => x.trim()).filter(Boolean) : [],
    source: v.source,
  });
  await renderWorldPanel();
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
  await post('/api/history/causal', {
    saveId: STATE.meta.id,
    cause: v.cause, causeScale: pickId(v.causeScale), causeRadius: pickId(v.causeRadius),
    effect: v.effect, effectScale: pickId(v.effectScale), effectRadius: pickId(v.effectRadius),
    lagDays: Number(v.lagDays) || 0,
    via: v.via ? v.via.split(/[、,，>→]/).map(x => x.trim()).filter(Boolean) : [],
  });
  await renderWorldPanel();
}

async function doImpact() {
  if (!needSave('查影响面')) return;
  const code = ($('#impactCode') && $('#impactCode').value || '').trim();
  // 没填错误码就静默返回，用户会以为按钮坏了——这里说清楚要填什么
  if (!code) { hint('#impactBox', '先在上面填一个错误码（如 P8-B01）。点「最早错误」那一行会自动填进去。'); return; }
  const r = await post('/api/snapshot/impact', { saveId: STATE.meta.id, code });
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
  const msg = what ? `要用「${what}」，得先开一个局：在左侧选一个存档，或新建一个。` : '先开一个局：在左侧选一个存档，或新建一个。';
  try { alert(msg); } catch { /* alert 不可用则忽略 */ }
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
  const r = await post('/api/npc/decide', {
    saveId: STATE.meta.id, npcName: v.name,
    request: { gain: Number(v.gain) || 0.5, cost: Number(v.cost) || 0.5, risk: Number(v.risk) || 0.5 },
  });
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
  const r = await post('/api/history/counterfactual', { saveId: STATE.meta.id, chainId, replaceWith: v.replaceWith || '' });
  const box = $('#worldDivBox');
  if (!r || r.ok === false) { hint('#worldDivBox', (r && r.why) || '推演失败'); return; }
  const lines = [`<div class="meta"><b>${escapeHtml(r.cause || '')} → ${escapeHtml(r.effect || '')}</b>　若当初${escapeHtml(String(r.replaceWith || '相反'))}：</div>`];
  if (r.删除测试 != null) lines.push(`<div class="meta">删除测试：下游有 <b>${r.删除测试}</b> 笔因果依赖它（依赖多 = 影响大）</div>`);
  if (r.替换测试) lines.push(`<div class="meta muted">${escapeHtml(String(r.替换测试))}</div>`);
  box.innerHTML = lines.join('') + box.innerHTML;
}

function bindWorldUi() {
  const on = (id, fn) => { const el = $(id); if (el) el.onclick = fn; };
  on('#btnWorldRefresh', renderWorldPanel);
  on('#btnSnapRefresh', renderSnapshots);
  on('#btnAddAnchor', doAddAnchor);
  on('#btnAddCausal', doAddCausal);
  on('#btnImpact', doImpact);
  on('#btnFigureAudit', reAuditFigures);
  on('#btnPlotRefresh', renderPlot);
  on('#btnPlotAudit', renderPlotAudit);
  on('#btnNpcDecide', doNpcDecide);
  on('#btnSnapNow', async () => {
    if (!needSave('打快照')) return;
    const r = await post('/api/snapshot/now', { saveId: STATE.meta.id });
    if (r && r.ok) await renderSnapshots();
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
$('#btnCorr').onclick = async () => {
  if (!STATE) return alert('先开一个局');
  const text = ($('#corrText').value || '').trim();
  if (!text) return alert('先写清楚它错在哪');
  await post('/api/correction', { saveId: STATE.meta.id, text, key: $('#corrKey') ? $('#corrKey').value : undefined });
  $('#corrText').value = '';
  await renderCorrections();
};

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

$('#btnRetry').onclick = async () => {
  // 重新生成：同一句指令再写一次；可以顺手说一句想怎么改（比如「短一点」「别编阴谋」）——这句要求单独发给 AI，不记成你的行动
  if (!LAST) return;
  if (TURN_BUSY) return;
  const f = await askForm('重新生成这一段', [{ key: 'note', label: '想怎么改（可不写）', ph: '比如：短一点 / 多写街上的事 / 别扯到江陵' }]);
  if (!f) return;
  runTurnWith(LAST.input || '', LAST.confirmedThreads || [], { regenerate: true, regenNote: (f.note || '').trim() });
};
// 修改这段：直接在正文上改，改完点「保存修改」，接下去就按你改过的写
$('#btnEdit').onclick = async () => {
  if (!LAST) return;
  const sc = document.getElementById('draftScene');
  if (sc.getAttribute('contenteditable') === 'true') {
    sc.setAttribute('contenteditable', 'false'); sc.classList.remove('editing');
    LAST.draft = { ...(LAST.draft || {}), scene: sc.innerText };
    $('#btnEdit').textContent = '修改这段';
    const r = await post('/api/draft/save', { saveId: STATE.meta.id, scene: LAST.draft.scene });
    if (r.error) alert('修改没存上：' + r.error + '（本页面里仍按你改过的接续）');
  } else {
    sc.setAttribute('contenteditable', 'true'); sc.classList.add('editing'); sc.focus();
    $('#btnEdit').textContent = '保存修改';
  }
};

/* ================= 战阵：只有「碰上战争」才出现 =================
   引擎在 GM 宣告 BATTLE 后于存档里挂上 state.encounter；面板据此显隐。
   没在打仗时，界面上根本没有这块，也不会出现「打不开的按钮」。 */
let BATTLE_CATALOG = null;
async function loadBattleCatalog() {
  if (!BATTLE_CATALOG || !BATTLE_CATALOG.formations) BATTLE_CATALOG = await get('/api/battle/catalog');
  return BATTLE_CATALOG;
}

async function renderWarPanel() {
  const el = $('#warPanel');
  const enc = STATE && STATE.encounter;
  if (!enc) { el.classList.add('hidden'); el.innerHTML = ''; window.__BATTLE = null; return; }
  let cat;
  try { cat = await loadBattleCatalog(); } catch (e) { el.classList.remove('hidden'); el.innerHTML = '<div class="wp-t">战阵</div><div class="muted">战阵目录载入失败：' + escapeHtml(String(e.message || e)) + '</div>'; return; }

  const cur = window.__BATTLE || {};
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
  $('#wpSim').onclick = async () => {
    $('#wpOut').textContent = '推演中…';
    const r = await post('/api/battle/simulate', read());
    if (r.error) { $('#wpOut').textContent = '失败：' + r.error; return; }
    $('#wpOut').textContent = r.result;
    $('#wpPreview').textContent = `我方优势比 ${r.shareA}\n伤亡预估：我军 ${r.casualties.A}，敌军 ${r.casualties.B}\n缘由：${r.reasons.join('、')}`;
  };
  $('#wpFight').onclick = () => {
    window.__BATTLE = read();
    runTurnWith($('#input').value || '我下令开战', [...$('#threadSel').selectedOptions].map(o => decodeURIComponent(o.value)));
  };
  $('#wpFlee').onclick = () => {
    window.__BATTLE = null;
    $('#input').value = '我下令避战退兵';
    runTurnWith($('#input').value, []);
  };
}

function renderBattleHint() {
  const b = window.__BATTLE;
  const el = $('#battleHint');
  if (!b || !el) { if (el) el.textContent = ''; return; }
  el.innerHTML = `已布阵：我军 ${b.ourTroops} 人（阵形与战术已选定）。点上方「开战」提交。`;
}

// 这一段过了几天：选了「按剧情自动」就用 AI 报的天数（当场办完的事是 0 天），否则按玩家选的
function advDaysFor(last) {
  const v = $('#advDays').value;
  if (v === 'auto' || !v) {
    const d = last && last.draft && Number(last.draft.elapsedDays);
    return Number.isFinite(d) && d >= 0 ? d : 1;
  }
  return Number(v) || 1;
}
// 确认这一段（写进世界、时间往前走）。写下一步时会自动先做这一步，所以平常不用点
async function acceptLast(silent) {
  if (!LAST) return true;
  const dropNpcs = [...document.querySelectorAll('#newNpcBox .chip')].filter(c => !c.classList.contains('on')).map(c => c.dataset.drop);
  const chips = [...document.querySelectorAll('#threadChips .chip')];
  const closeThreads = chips.filter(c => c.textContent.includes('·搁置')).map(c => c.dataset.thread);
  const resolveThreads = chips.filter(c => c.textContent.includes('·了结')).map(c => c.dataset.thread);
  // 防连点：第二次采纳会在存档写到一半时去读它
  if ($('#btnAccept').disabled) return;
  $('#btnAccept').disabled = true;
  let r;
  try {
    r = await post('/api/apply', {
      saveId: STATE.meta.id, draft: LAST.draft, input: LAST.input,
      advanceDays: advDaysFor(LAST),
      edits: { dropNpcs, closeThreads, resolveThreads },
    });
  } finally { $('#btnAccept').disabled = false; }
  if (r.error || !r.state) { alert('上一段没能接上：' + (r.error || '服务没有返回新的存档') + '\n\n存档没有变。可以点「重新生成」重写上一段，再写下一步。'); return false; }
  STATE = r.state; LAST = null;
  if (!silent) $('#input').value = '';
  // 时间必须往前走：保留当前选择（不重置为 0，否则时间会永远停住）
  await renderState(); await reloadSaves();
  if (!silent) $('#input').focus();
  showTurnDelta();   // 明确告诉你「本轮变了什么」
  if (document.querySelector('.railtab.active')?.dataset.rail === 'me') renderMe();
  return true;
}
$('#btnAccept').onclick = () => acceptLast(false);

/* 时间预览：采纳后日期会变成什么，让你心里有数（时间每回合必须往前走） */
/* 农历月日：「闰四月廿三」 */
const LUNAR_M = ['', '正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '腊月'];
const LUNAR_N = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
function lunarText(c) {
  if (!c) return '';
  const d = Number(c.day) || 1, m = Number(c.month) || 1;
  const dn = d <= 10 ? '初' + LUNAR_N[d] : d < 20 ? '十' + LUNAR_N[d - 10] : d === 20 ? '二十' : d < 30 ? '廿' + LUNAR_N[d - 20] : '三十';
  return (c.leap ? '闰' : '') + (LUNAR_M[m] || m + '月') + dn;
}
async function updateAdvPreview() {
  const box = $('#advPreview');
  if (!box || !STATE || !STATE.clock) { if (box) box.textContent = ''; return; }
  const d = advDaysFor(LAST);
  if (d <= 0) { box.innerHTML = '这一段是当场的事，时间不往前走。'; return; }
  const c = STATE.clock;
  let r = null;
  try { r = await post('/api/calendar/add', { y: c.gregorianYear, m: c.month, d: c.day, leap: c.leap, n: d }); } catch (_) { r = null; }
  if (!r || !r.ok) { box.innerHTML = `写下一步时：时间前进 <b>${d} 天</b>`; return; }
  const cross = r.y !== (c.gregorianYear || 0);
  box.innerHTML = `写下一步时：时间前进 <b>${d} 天</b> → <b>${lunarText({ month: r.m, day: r.d, leap: r.leap })}</b>${cross ? '（<b>跨年</b>，人物年龄会按史实自动重算）' : ''}`;
}
$('#advDays').onchange = updateAdvPreview;

/* 本轮变化摘要：时间、线索、事件、地盘、身份 —— 保证每回合都看得见新东西 */
let PREV_SNAP = null;
function snapOf(s) {
  return {
    date: s.clock ? `${s.clock.yearLabel} ${lunarText(s.clock)}` : '',
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
const RAILS = ['ask', 'me', 'check', 'nano', 'world', 'snap', 'map', 'file', 'find', 'archive'];
function switchRail(which) {
  document.querySelectorAll('.railtab').forEach(b => b.classList.toggle('active', b.dataset.rail === which));
  RAILS.forEach(w => {
    const el = $('#rail' + w[0].toUpperCase() + w.slice(1));
    if (el) el.classList.toggle('hidden', w !== which);
  });
  if (which === 'world' && STATE) renderWorldPanel();
  if (which === 'snap' && STATE) renderSnapshots();
  if (which === 'archive' && STATE) renderArchive();
  if (which === 'me') renderMe();
  if (which === 'ask') renderAskPanel();
}
/* 个人面板：我是谁、有什么、能做什么 */
async function renderMe() {
  const box = document.getElementById('meBox');
  if (!box) return;
  if (!STATE) { box.innerHTML = '<div class="muted">先开一个局。</div>'; return; }
  box.innerHTML = '<div class="muted">载入中…</div>';
  const r = await post('/api/profile', { saveId: STATE.meta.id });
  if (r.error) { box.innerHTML = '<div class="railnote">载入失败：' + escapeHtml(r.error) + '</div>'; return; }
  const rebuild = STATE.mode === 'real'
    ? '<div class="row" style="margin:6px 0"><button id="btnMeRebuild" class="minibtn">身份不对？让 AI 重新查证建档</button><span class="muted">能联网就按检索资料，不能就据正史推断；查不到的写「史无明载」，不编</span></div>' : '';
  box.innerHTML = rebuild + r.sections.map(sec => `<div class="me-sec"><div class="me-h">${escapeHtml(sec.title)}</div>`
    + sec.rows.map(x => `<div class="me-row"><span class="me-k">${escapeHtml(x.k)}</span><span class="me-v">${escapeHtml(x.v)}${x.src ? ` <span class="muted">〔${escapeHtml(x.src)}〕</span>` : ''}</span></div>`).join('')
    + '</div>').join('');
}
document.getElementById('btnMeRefresh') && (document.getElementById('btnMeRefresh').onclick = () => renderMe());
document.addEventListener('click', async ev => {
  if (!ev.target || ev.target.id !== 'btnMeRebuild' || !STATE) return;
  const b = ev.target; b.disabled = true; b.textContent = '查证中（一两分钟）…';
  const r = await post('/api/profile/rebuild', { saveId: STATE.meta.id });
  b.disabled = false; b.textContent = '身份不对？让 AI 重新查证建档';
  if (r.error || !r.ok) { alert('没建成：' + (r.error || r.why || '未知原因')); return; }
  STATE = await post('/api/state', { saveId: STATE.meta.id });
  renderStatusBar(); renderMe();
  alert('已重新建档' + (r.knowledge ? '（据正史推断，未联网核对）' : '（据检索资料）') + (r.applied && r.applied.title ? `：${r.applied.title}，驻${r.applied.seat || '?'}` : ''));
});
// 状态栏点一下就打开个人面板
document.getElementById('statusBar') && document.getElementById('statusBar').addEventListener('click', () => { if (STATE) switchRail('me'); });
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
  try { a = await post('/api/archive', { saveId: STATE.meta.id }); }
  catch (e) { box.innerHTML = '<div class="railnote">档案馆载入失败：' + escapeHtml(String(e.message || e)) + '</div>'; return; }
  if (a && a.error) { box.innerHTML = '<div class="railnote">档案馆载入失败：' + escapeHtml(a.error) + '</div>'; return; }
  // 本局记事（只属于这个存档，删档时一起删）
  const ch = (a && a.chronicle) || null;
  const chron = [];
  if (ch) {
    const sec0 = (title, inner) => `<div class="arch-sec"><div class="arch-h">${title}</div>${inner}</div>`;
    if (ch.history.length) chron.push(sec0('本局与史书不同之处（你改写的历史）', ch.history.slice().reverse().map(h =>
      `<div class="arch-row">· <b>${escapeHtml(h.date)}</b> 史书：${escapeHtml(h.event)}<br>　本局：${escapeHtml(h.now)}<br>　<span class="muted">因：${escapeHtml(h.cause)}</span></div>`).join('')));
    if (ch.turns.length) chron.push(sec0(`大事记（共 ${ch.turns.length} 轮，每轮一条）`, ch.turns.slice().reverse().map(t =>
      `<div class="arch-row">· 第${t.turn}轮 ${escapeHtml(t.date || '')}${t.input ? `　<span class="muted">你：${escapeHtml(t.input)}</span>` : ''}<br>　${escapeHtml(t.summary)}</div>`).join('')));
    if (ch.blocks.length) chron.push(sec0('每十回合小结', ch.blocks.slice().reverse().map(b => `<div class="arch-row">· 第${b.from}–${b.to}轮：${escapeHtml(b.text)}</div>`).join('')));
    if (ch.status.length) chron.push(sec0('你的变动（钱财、官职、爵位、健康）', ch.status.slice().reverse().map(x =>
      `<div class="arch-row">· 第${x.turn}轮 ${escapeHtml(x.item)}：${escapeHtml(x.from ? x.from + ' → ' : '')}${escapeHtml(x.to)}<span class="muted">（${escapeHtml(x.why)}）</span></div>`).join('')));
    if (ch.figures.length) chron.push(sec0('史事进程（人物生死、已结算的大事）', ch.figures.slice().reverse().map(x => `<div class="arch-row">· ${escapeHtml(String(x.year || ''))} ${escapeHtml(String(x.text || x.name || ''))}</div>`).join('')));
    if (!chron.length) chron.push('<div class="muted">还没有记事：玩过几轮之后，这里会按回合记下发生过的事。</div>');
    chron.push('<div class="arch-row muted">本局档案只属于这个存档（存在游戏文件夹的 data\\archive 与「历史RPG存档」里），删除存档时一并删除，不影响别的存档。</div>');
    chron.push('<div class="arch-sec"><div class="arch-h">—— 以下是本局的历史底盘 ——</div></div>');
  }
  // 接口回的是 {ok, archive:{…}}，档案本体在 archive 里（旧代码直接读外层，于是永远是空的）
  a = a && a.archive ? a.archive : a;
  if (!a) { box.innerHTML = '<div class="muted">本局还没生成底盘（点「重新生成世界」）。</div>'; return; }
  const sec = (title, inner) => `<div class="arch-sec"><div class="arch-h">${title}</div>${inner}</div>`;
  const rows = [];
  rows.push(`<div class="kv">身份：${escapeHtml(IDM_NAME[a.identity] || a.identity || '')}｜时代：${escapeHtml(a.eraLabel || '')}（公元 ${a.gregorianYear || '?'} 年）｜政权：${escapeHtml(a.polity || '')}｜地点：${escapeHtml(a.place || '')}</div>`);
  if (a.ruler) {
    const v = a.ruler.value || {}; const age = (v.age == null) ? '' : ` ${v.age}岁`;
    rows.push(sec('当朝天子', `<div class="arch-row">${escapeHtml(v.name || '')}（${escapeHtml(v.title || '皇帝')}${age}） ${srcBadge(a.ruler)}</div>`));
  }
  if (a.eraEvents && a.eraEvents.length) {
    rows.push(sec('天下大势（按时代）', a.eraEvents.map(e => `<div class="arch-row">· ${escapeHtml(e.value || '')} ${srcBadge(e)}</div>`).join('')));
  }
  if (a.factions && a.factions.length) {
    rows.push(sec('派系 / 内斗（按时代+身份）', a.factions.map(f => { const v = f.value || {}; const name = v.name || v.label || v.title || (v.sideA && v.sideB ? v.sideA + ' 对 ' + v.sideB : '（未详）'); return `<div class="arch-row">· ${escapeHtml(name)} ${srcBadge(f)}</div>`; }).join('')));
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
  box.innerHTML = chron.join('') + rows.join('');
}
document.getElementById('btnArchiveRefresh').onclick = () => renderArchive();

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

async function verifyNpc(name) {
  pushVerify({ title: `虚构人物重名 · ${name}`, body: await post('/api/verify/npc', { name, era: STATE?.clock.yearLabel, eraWords: [STATE?.location.polity] }) });
  switchRail('find');
}
async function fillWorld(what) {
  if (!STATE) return alert('先开一个局');
  const nFam = ((STATE.household && STATE.household.members) || []).length;
  if (what === 'family' && nFam && !(await askConfirm(`现有 ${nFam} 位家人。让 AI 拟一份会把新拟的人加进来（同名的以新拟为准），确定吗？`, '拟一份'))) return;
  if (what === 'geography' && STATE.geography && !(await askConfirm('让 AI 重新拟一份地理，会覆盖现有的地理条目，确定吗？', '重新拟'))) return;
  const r = await post('/api/world/fill', {
    saveId: STATE.meta.id, what, adapterId: SEL,
    era: STATE.clock.yearLabel, gregorianYear: STATE.clock.gregorianYear,
    place: STATE.location.full, name: STATE.protagonist.name, role: STATE.protagonist.role,
  });
  if (r.error) return alert('失败：' + r.error);
  if (!r.data || (typeof r.data === 'object' && !Object.keys(r.data).length)) return alert('AI 没拟出内容，原有资料没有改动。');
  // 家人：并入，不清空（以前会把原有的六位家人整个换成 AI 拟的一位）
  const oldMembers = (STATE.household && STATE.household.members) || [];
  const fresh = (r.data?.members || []).map(m => ({ ...m, note: (m.note || '') + '（AI 拟，未核实）' }));
  const merged = [...oldMembers.filter(o => !fresh.some(n => n.name === o.name)), ...fresh];
  const geoKeys = r.data && ['地形', '水系', '道路驿站', '邻境', '物产'].some(k => r.data[k]);
  if (what === 'geography' && !geoKeys) return alert('AI 没拟出可用的地理内容，原有资料没有改动。');
  const patch = what === 'geography'
    ? { geography: { ...r.data, unverified: true } }
    : { household: { ...(r.data || {}), members: merged } };
  const s = await post('/api/world/update', { saveId: STATE.meta.id, ...patch });
  STATE = s; renderState(); switchRail('file');
  alert(what === 'geography'
    ? '地理已拟好并写入。注意标了「未核实」—— 涉及路程天数时最好自己再验一遍。'
    : '家庭成员已拟好并写入。虚构成员记得用「核名」查一下有没有撞真实历史人物。');
}
$('#btnFillGeo').onclick = () => fillWorld('geography');
$('#btnFillFamily').onclick = () => fillWorld('family');

$('#btnSearchCfg').onclick = () => $('#btnSettings').click();

$('#btnPlace').onclick = async () => {
  if (!STATE) return alert('先开一个局');
  pushVerify({ title: `地点核查 · ${STATE.location.full}`, body: await post('/api/verify/place', { place: STATE.location.full, polity: STATE.location.polity, yearLabel: STATE.clock.yearLabel }) });
};
$('#btnTerm').onclick = async () => {
  const t = prompt('输入要核的词（比如一个怀疑是后世的词，或「保命田」这类自造词）');
  if (!t) return;
  pushVerify({ title: `措辞核查 · ${t}`, body: await post('/api/verify/term', { term: t, era: STATE?.clock.yearLabel }) });
};

/* ================= 设置（AI + 检索 + 档案卡） ================= */
// 读设置里 AI 那一栏填的字段（勾选框按 on/off 记）
function readAdapterFields() {
  const cfg = {};
  document.querySelectorAll('#sAdapterFields input').forEach(i => { cfg[i.dataset.k] = i.type === 'checkbox' ? (i.checked ? 'on' : 'off') : i.value.trim(); });
  return cfg;
}
$('#btnSettings').onclick = () => {
  const a = ADAPTERS.find(x => x.id === 'deepseek') || ADAPTERS[0];
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
      const cfg = readAdapterFields();
      CONFIGS[aid] = { ...(CONFIGS[aid] || {}), ...cfg };
      SEL = aid;
      $('#modalOk').disabled = true; $('#modalOk').textContent = '保存中…';
      try {
      const r1 = await post('/api/adapter-config', { selected: aid, configs: { [aid]: cfg } });
      if (r1 && r1.error) throw new Error(r1.error);
      // 关键修复：只保存「当前选中的那个检索源」的字段，且**显式保留其它源已存的 key**
      const sid = $('#sSearch').value;
      const scfg = {};
      document.querySelectorAll('#sSearchFields input').forEach(i => { scfg[i.dataset.k] = i.value; });
      const cur = await get('/api/search/config');
      const merged = { ...(cur.providers || {}) };
      merged[sid] = { ...(merged[sid] || {}), ...scfg };
      const r2 = await post('/api/search/config', { config: { provider: sid, providers: merged } });
      if (r2 && r2.error) throw new Error(r2.error);
      await loadCfgs();
      closeModal(); await reloadSearch(); await refreshQuick();
      } catch (e) {
        alert('设置没有保存成功：' + (e.message || e));
      } finally { $('#modalOk').disabled = false; $('#modalOk').textContent = '确定'; }
    });

  const cur = get('/api/adapter-config');
  $('#sAdapter').value = SEL;
  const fillA = async () => {
    const c = (await cur).configs?.[$('#sAdapter').value] || {};
    const a2 = ADAPTERS.find(x => x.id === $('#sAdapter').value);
    const isLlm = a2 && ['deepseek', 'openai-compatible'].includes(a2.id);
    $('#sAdapterFields').innerHTML = (a2?.fields || []).map(f => f.key === 'model' && isLlm
      ? `<div class="field"><label>${escapeHtml(f.label)}</label><input data-k="model" list="sModelList" value="${escapeHtml(/^deepseek-(chat|reasoner)$/.test(c.model || '') ? 'deepseek-v4-pro' : (c.model ?? f.def ?? ''))}"><datalist id="sModelList"><option value="deepseek-v4-pro"></option><option value="deepseek-v4.1-pro"></option><option value="deepseek-flash"></option></datalist> <button type="button" id="sModels">获取型号</button></div>`
      : `<div class="field"><label>${escapeHtml(f.label)}${f.secret && c[f.key] ? `<span class="okline">（已保存，尾号 ${escapeHtml(String(c[f.key]).slice(-4))}）</span>` : ''}</label><input data-k="${f.key}" type="${f.secret ? 'password' : 'text'}" value="${escapeHtml(c[f.key] ?? f.def ?? '')}"></div>`).join('')
      + (isLlm ? `<div class="field"><label>思考模式</label><label><input data-k="thinking" type="checkbox" ${c.thinking === 'on' || c.thinking === true ? 'checked' : ''}> 打开（更慢、更贵，推理更细；默认关）</label></div>` : '');
    const mb = document.getElementById('sModels');
    if (mb) mb.onclick = async () => {
      $('#sTestOut').textContent = '查询型号中…'; $('#sTestOut').className = 'muted';
      const r = await post('/api/models', { adapterId: $('#sAdapter').value, config: readAdapterFields() });
      if (r.error) { $('#sTestOut').textContent = '查不到型号：' + String(r.error).slice(0, 160); $('#sTestOut').className = 'errline'; return; }
      document.getElementById('sModelList').innerHTML = r.models.map(m => `<option value="${escapeHtml(m)}"></option>`).join('');
      $('#sTestOut').textContent = '可用型号：' + r.models.join('、') + '（点型号框选择）'; $('#sTestOut').className = 'okline';
    };
  };
  const fillS = async () => {
    const sc = await get('/api/search/config');
    const id = $('#sSearch').value;
    $('#sSearchFields').innerHTML = (SEARCH_FIELDS[id] || []).map(f =>
      `<div class="field"><label>${escapeHtml(f.label)}${f.secret && sc.providers?.[id]?.[f.key] ? `<span class="okline">（已保存，尾号 ${escapeHtml(String(sc.providers[id][f.key]).slice(-4))}）</span>` : ''}</label><input data-k="${f.key}" type="${f.secret ? 'password' : 'text'}" value="${escapeHtml(sc.providers?.[id]?.[f.key] ?? f.def ?? '')}"></div>`).join('');
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
  $('#sTest').onclick = async () => {
    $('#sTestOut').textContent = '测试中…'; $('#sTestOut').className = 'muted';
    const r = await post('/api/adapter-test', { adapterId: $('#sAdapter').value, config: readAdapterFields() });
    if (r.error) { $('#sTestOut').textContent = '失败：' + String(r.error).slice(0, 220); $('#sTestOut').className = 'errline'; }
    else { $('#sTestOut').textContent = `成功 ${r.ms}ms${r.model ? '，型号 ' + r.model : ''}${r.switched ? '（' + r.switched + '）' : ''}（记得点「确定」保存）`; $('#sTestOut').className = 'okline'; }
  };
  // 检索测试：填完 key 直接打一次真实请求，看能不能出结果
  $('#sSearchTest').onclick = async () => {
    const out = $('#sSearchTestOut');
    out.textContent = '测试中…'; out.className = 'muted';
    const id = $('#sSearch').value;
    const scfg = {};
    document.querySelectorAll('#sSearchFields input').forEach(i => { scfg[i.dataset.k] = i.value; });
    // 先把当前填的字段存进去，再测（否则测的是旧 key）
    const cur2 = await get('/api/search/config');
    const merged = { ...(cur2.providers || {}) };
    merged[id] = { ...(merged[id] || {}), ...scfg };
    await post('/api/search/config', { config: { provider: id, providers: merged } });
    const r = await post('/api/search/test', { provider: id, query: '苏轼' });
    if (r.error) { out.textContent = '失败：' + String(r.error).slice(0, 160); out.className = 'errline'; return; }
    if (!r.count) { out.textContent = '连上了，但没返回结果（可能该源没配好或查询无结果）'; out.className = 'errline'; return; }
    out.textContent = `成功：${r.count} 条，${r.tookMs}ms`; out.className = 'okline';
    if (r.top) $('#sSearchHint').innerHTML = '示例结果：<b>' + escapeHtml(r.top.title || '') + '</b>';
  };
  $('#sCard').onclick = async () => {
    if (!STATE) return ($('#sCardOut').textContent = '先开一个局');
    const { card } = await post('/api/archive-card', { saveId: STATE.meta.id });
    $('#sCardOut').textContent = card;
  };
};

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
      $('#wzTest').onclick = async () => {
        $('#wzTestOut').textContent = '测试中…'; $('#wzTestOut').className = 'muted';
        const cfg = { apiKey: WZ.key, model: CONFIGS[WZ.ai]?.model, baseUrl: CONFIGS[WZ.ai]?.baseUrl };
        const r = await post('/api/adapter-test', { adapterId: WZ.ai, config: cfg });
        if (r.error) { $('#wzTestOut').textContent = '失败：' + String(r.error).slice(0, 130); $('#wzTestOut').className = 'errline'; }
        else {
          $('#wzTestOut').textContent = `成功 ${r.ms}ms`; $('#wzTestOut').className = 'okline'; WZ.ok = true;
          $('#wzNext').disabled = false; CONFIGS[WZ.ai] = { ...(CONFIGS[WZ.ai] || {}), ...cfg }; await saveCfgs(WZ.ai);
        }
      };
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
async function openWizard() {
  WZ.step = 0; WZ.ai = 'deepseek'; WZ.starter = PACK?.starters?.[0]?.id || null;
  WZ.key = CONFIGS[WZ.ai]?.apiKey || ''; WZ.ok = !!WZ.key;
  $('#wizard').classList.remove('hidden'); renderWizard();
}
const closeWizard = () => $('#wizard').classList.add('hidden');
$('#wzSkip').onclick = closeWizard;
$('#wzPrev').onclick = () => { if (WZ.step > 0) { WZ.step--; renderWizard(); } };
$('#wzNext').onclick = async () => {
  if (WZ.step < WZ_STEPS.length - 1) { WZ.step++; renderWizard(); return; }
  STATE = await post('/api/save', { ruleset: PACK.id, starterId: WZ.starter });
  await reloadSaves(); renderState(); closeWizard(); $('#input').focus();
};

/* ================= 点击委托 ================= */
document.addEventListener('click', e => {
  const ai = e.target.closest('#wzBody .pick[data-ai]');
  if (ai) { WZ.ai = ai.dataset.ai; WZ.key = CONFIGS[WZ.ai]?.apiKey || ''; WZ.ok = !!WZ.key; renderWizard(); return; }
  const st = e.target.closest('#wzBody .pick[data-starter]');
  if (st) { WZ.starter = st.dataset.starter; renderWizard(); return; }
  const vb = e.target.closest('.vbtn[data-vname]');
  if (vb) { verifyNpc(vb.dataset.vname); return; }
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
    const st = (PACK?.starters || []).find(x => x.id === card.dataset.newstarter);
    if (st && st.custom) {
      // 真人剧本：按设定新建并生成世界（人物档案、身边真人、分月处境），不用预置存档
      card.classList.add('busy'); card.querySelector('.cn').textContent = '正在生成世界（联网查地理与地图，约两分钟，请稍候）…';
      post('/api/save/custom', { ruleset: PACK.id, ...st.custom })
        .then(s => post('/api/world/seed', { saveId: s.meta.id }))
        .then(async r => { STATE = r.state || r; await reloadSaves(); renderState(); renderStarterCards(); $('#input').focus(); })
        .catch(err => { alert('开局失败：' + (err && err.message || err)); renderStarterCards(); });
      return;
    }
    post('/api/save', { ruleset: PACK.id, starterId: card.dataset.newstarter }).then(async s => {
      STATE = s; await reloadSaves(); renderState(); $('#input').focus();
    });
  }
});

/* ================= 模态框 ================= */
let MODAL_OK = null;
let MODAL_CANCEL = null;
function openModal(title, html, onOk, onCancel) {
  $('#modalTitle').textContent = title;
  $('#modalContent').innerHTML = html;
  MODAL_OK = onOk;
  MODAL_CANCEL = onCancel || null;
  // 没有「确定」回调的弹窗（如存档管理），把确定键变成单纯的「关闭」，免得点了没反应
  $('#modalOk').textContent = onOk ? '确定' : '关闭';
  const mc = document.getElementById('modalClose'); if (mc) mc.style.display = onOk ? '' : 'none';   // 只读弹窗只留一个「关闭」
  $('#modalOk').disabled = false;
  $('#modal').classList.remove('hidden');
}
function closeModal() {
  $('#modal').classList.add('hidden');
  const c = MODAL_CANCEL; MODAL_OK = null; MODAL_CANCEL = null;
  if (c) { try { c(); } catch (e) { /* 忽略 */ } }
}
$('#modalClose').onclick = closeModal;
$('#modalOk').onclick = () => { if (MODAL_OK) MODAL_OK(); else closeModal(); };
$('#modal').onclick = e => { if (e.target.id === 'modal') closeModal(); };

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
  await step('lastSave', async () => {
    let id = null; try { id = localStorage.getItem('lastSave'); } catch (_) { id = null; }
    if (!id) return;
    const list = await get('/api/saves');
    if (Array.isArray(list) && list.some(x => x.id === id)) {
      const st = await post('/api/state', { saveId: id });
      if (st && st.meta) { STATE = st; await reloadSaves(); }
    }
  });
  await step('bindWorldUi', async () => bindWorldUi());
  await step('starterCards', renderStarterCards);
  await step('renderState', async () => renderState());
  await step('switchRail', async () => switchRail(document.body.classList.contains('simple') ? 'ask' : 'check'));
  // 没填 Key 时不再弹三步向导，首页的一句话开局框里直接粘 Key（向导仍可从「设置」打开）
  await step('quick', refreshQuick);
})();

/* ================= 一句话开局 ================= */
async function refreshQuick() {
  let st = {};
  try { st = await get('/api/quick-status'); } catch (_) { st = {}; }
  const box = $('#qStatus');
  if (st.hasKey) {
    // Key 已经存好：首页只留一行状态，Key 框收起来；要换 Key / 型号 / 博查，去「设置」
    box.classList.remove('hidden');
    const lt = st.lastTest;
    const bad = lt && lt.ok === false;
    box.innerHTML = (bad
      ? `<span class="bad">✗ Key 已保存，但上次连 AI 没连上：${escapeHtml(String(lt.why || '').slice(0, 120))}</span>`
      : `<span class="ok">✓ AI ${lt && lt.ok ? '已接通' : '已设置'}（DeepSeek · ${escapeHtml(st.modelName || '')}）</span>`)
      + `<span>查史：${st.search === 'bocha' && st.hasBocha ? '博查 ✓' : '维基百科（免费）'}</span>`
      + `<a id="qChange">设置</a><a id="qNet2">检查网络</a>`;
    $('#qChange').onclick = () => $('#btnSettings').click();
    $('#qNet2').onclick = async () => {
      const o = document.getElementById('qNetOut') || box.appendChild(Object.assign(document.createElement('div'), { id: 'qNetOut', className: 'qkeyout' }));
      o.style.flexBasis = '100%'; o.textContent = '正在检查网络（最多十几秒）……';
      const r = await get('/api/netcheck');
      o.innerHTML = r.error ? `<span class="bad">${escapeHtml(r.error)}</span>` : r.results.map(x => x.ok
        ? `<span class="ok">✓ ${escapeHtml(x.name)}：连得上（${x.ms}ms）</span>`
        : `<span class="bad">✗ ${escapeHtml(x.name)}：${escapeHtml(x.why)}</span>`).join('\n');
    };
    $('#qKey').classList.add('hidden');
    $('#qKeyIn').placeholder = `已保存（尾号 ${st.keyTail || ''}）`;
  } else {
    box.classList.add('hidden');
    $('#qKey').classList.remove('hidden');
    fillQuickKey(st);
  }
  $('#qKeyTitle').innerHTML = st.hasKey
    ? '<b>更换设置</b>（Key 留空 = 不改原来的 Key）'
    : '<b>第一次玩，先粘贴一个 DeepSeek 的 Key</b>（只填一次，存在你自己电脑上）';
  $('#qGo').disabled = !st.hasKey; $('#qRandom').disabled = !st.hasKey;
  if (st.hasKey && $('#qKey').classList.contains('hidden')) setTimeout(() => $('#qText') && $('#qText').focus(), 50);
}
function fillQuickKey(st) {
  if (!$('#qModel').value) $('#qModel').value = (st && st.modelName) || 'deepseek-v4-pro';
}
$('#qNet').onclick = async () => {
  const out = $('#qKeyOut');
  out.innerHTML = '正在检查网络（最多十几秒）……';
  const r = await get('/api/netcheck');
  if (r.error) { out.innerHTML = `<span class="bad">${escapeHtml(r.error)}</span>`; return; }
  out.innerHTML = r.results.map(x => x.ok
    ? `<span class="ok">✓ ${escapeHtml(x.name)}：连得上（${x.ms}ms）</span>`
    : `<span class="bad">✗ ${escapeHtml(x.name)}：${escapeHtml(x.why)}</span>`).join('\n')
    + (r.proxy ? `\n（正在使用系统代理 ${escapeHtml(r.proxy)}）` : '');
};
$('#qModelFetch').onclick = async () => {
  const out = $('#qKeyOut');
  out.innerHTML = '正在向 DeepSeek 查询你能用的型号……';
  const r = await post('/api/models', { adapterId: 'deepseek', config: { apiKey: $('#qKeyIn').value.trim() } });
  if (r.error) { out.innerHTML = `<span class="bad">查不到型号：${escapeHtml(r.error)}</span>`; return; }
  $('#qModelList').innerHTML = r.models.map(m => `<option value="${escapeHtml(m)}"></option>`).join('');
  out.innerHTML = `<span class="ok">你的 Key 能用的型号：${r.models.map(escapeHtml).join('、')}</span>（在「型号」框里点一下就能选）`;
};
$('#qKeySave').onclick = async () => {
  const k = $('#qKeyIn').value.trim();
  const bk = $('#qBocha').value.trim();
  const model = $('#qModel').value.trim();
  const out = $('#qKeyOut');
  let st0 = {}; try { st0 = await get('/api/quick-status'); } catch (_) { /* 忽略 */ }
  if (!k && !st0.hasKey) { out.innerHTML = '<span class="bad">先把 DeepSeek 的 Key 粘贴进来</span>'; return; }
  if (k && !/^sk-/.test(k) && !confirm('DeepSeek 的 Key 一般以 sk- 开头，你粘贴的不像。仍然保存吗？')) return;
  $('#qKeySave').disabled = true; $('#qKeySave').textContent = '保存并试连中…';
  out.innerHTML = '保存中……';
  try {
    const r = await post('/api/quick-key', { apiKey: k, bochaKey: bk, model: model && model !== st0.modelName ? model : '' });
    if (r.error) { out.innerHTML = `<span class="bad">没有保存：${escapeHtml(r.error)}</span>`; return; }
    const lines = [];
    if (r.saved.deepseek) lines.push('<span class="ok">✓ DeepSeek Key 已保存</span>');
    if (r.saved.bocha) lines.push('<span class="ok">✓ 博查 Key 已保存，查史改用博查</span>');
    if (r.test) lines.push(r.test.ok
      ? `<span class="ok">✓ 连接成功（型号 ${escapeHtml(r.test.model || r.saved.model)}，${r.test.ms}ms）</span>`
      : `<span class="bad">✗ 连接没通：${escapeHtml(r.test.why)}</span>\nKey 已经存好了；按上面的原因处理后再点一次「保存」即可（Key 框可留空）。`);
    if (r.bocha) lines.push(r.bocha.ok ? `<span class="ok">✓ 博查可用（试查返回 ${r.bocha.count} 条）</span>` : `<span class="bad">✗ 博查没通：${escapeHtml(r.bocha.why)}</span>`);
    out.innerHTML = lines.join('\n');
    $('#qKeyIn').value = ''; $('#qBocha').value = '';
    try { await loadCfgs(); } catch (_) { /* 忽略 */ }
    const allOk = (!r.test || r.test.ok) && (!r.bocha || r.bocha.ok);
    await refreshQuick();
    // 有没连通的：Key 框留着，原因就在框里；全通了：框收起，状态行写明已保存
    if (!allOk) $('#qKey').classList.remove('hidden');
    else $('#qStatus').insertAdjacentHTML('beforeend', '<span class="ok">✓ 刚刚保存并连通</span>');
  } catch (e) {
    out.innerHTML = `<span class="bad">保存失败：${escapeHtml(e.message || e)}（游戏服务可能没在运行，请重新双击启动游戏）</span>`;
  } finally { $('#qKeySave').disabled = false; $('#qKeySave').textContent = '保存'; }
};
$('#qKeyIn').addEventListener('keydown', e => { if (e.key === 'Enter') $('#qKeySave').click(); });
async function quickStart(text) {
  const box = $('#qProg');
  box.classList.remove('hidden'); box.textContent = '开始……';
  $('#qGo').disabled = true; $('#qRandom').disabled = true;
  try {
    const r = await post('/api/quick-start', { text });
    if (!r || r.ok === false) throw new Error((r && r.why) || '开局失败');
    for (;;) {
      await new Promise(res => setTimeout(res, 1500));
      const j = await post('/api/quick-start/job', { job: r.job });
      box.textContent = (j.progress || []).join('\n') + (j.status === 'running' ? '\n……' : '');
      if (j.status === 'error' || j.ok === false) throw new Error(j.error || j.why);
      if (j.status === 'done') {
        STATE = await post('/api/state', { saveId: j.saveId });
        await reloadSaves(); renderState();
        box.classList.add('hidden');
        // 醒来：不等玩家写字，先让 GM 演出开场这一刻
        await runTurnWith('', []);
        return;
      }
    }
  } catch (e) {
    box.innerHTML = `<span class="err">没开成：${escapeHtml(String(e.message || e))}</span>`;
  } finally { $('#qGo').disabled = false; $('#qRandom').disabled = false; }
}
$('#qGo').onclick = () => quickStart($('#qText').value.trim() || '随便');
$('#qText').addEventListener('keydown', e => { if (e.key === 'Enter') $('#qGo').click(); });
$('#qRandom').onclick = () => quickStart('随便');

/* ================= 简洁模式（默认）：隐藏审计、纠错、回滚、核查等开发者面板 ================= */
(function () {
  let simple = true;
  try { simple = localStorage.getItem('uiAdvanced') !== '1'; } catch (_) { /* 无存储则默认简洁 */ }
  const apply = () => {
    document.body.classList.toggle('simple', simple);
    const b = document.getElementById('btnAdvanced');
    if (b) b.textContent = simple ? '高级面板' : '收起高级';
    const act = document.querySelector('.railtab.active');
    if (simple && (!act || act.classList.contains('adv'))) switchRail('ask');
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
async function showGmCard(which) {
  if (!STATE) return alert('先开一个局');
  const r = await post('/api/gm-cards', { saveId: STATE.meta.id });
  const text = r[which] || r.error || '（生成失败）';
  openModal(which, `<pre style="white-space:pre-wrap;max-height:60vh;overflow:auto;font-size:13px;line-height:1.7">${escapeHtml(text)}</pre>`, null);
}
['btnRecap:前情回顾', 'btnCard:档案卡', 'btnSheet:速查表', 'btnRoster:人物表'].forEach(x => {
  const [id, which] = x.split(':');
  const b = document.getElementById(id);
  if (b) b.onclick = () => showGmCard(which).catch(e => alert('生成失败：' + (e && e.message || e)));
});

/* ================= 《设计书》§7.6 玩家一键标记 + §1.3 史实宽容度 ================= */
document.querySelectorAll('.flagbtn').forEach(b => b.onclick = async () => {
  if (!STATE) return alert('先开一个局');
  // 标记的是屏幕上正在看的这一段：有新写的一段就标它，否则标最近一段
  const turnNo = LAST ? (STATE.turn || 0) + 1 : (STATE.turn || 0);
  if (!turnNo) return alert('还没有可以标记的一段');
  const flag = b.dataset.flag;
  let note = '';
  if (flag === '出戏' || flag === '错史') {
    const f = await askForm(`这一段「${flag}」在哪里？`, [{ key: 'note', label: '写一句就行', ph: '能写成「错的 → 对的」更好，例：萧纪在江陵 → 萧纪在成都' }]);
    if (!f) return;
    note = f.note || '';
  }
  try {
    const r = await post('/api/flag', { saveId: STATE.meta.id, turn: turnNo, flag, note });
    const by = (r.stats && r.stats.by) || {};
    $('#flagMsg').textContent = `已记第${turnNo}段「${flag}」。累计：` + Object.entries(by).map(([k, v]) => `${k}${v}`).join(' ');
  } catch (e) { alert('标记失败：' + (e && e.message || e)); }
});
(function syncFactMode() {
  // 读档时把存档里的史实宽容度带回选择框
  const apply = () => { if (STATE && STATE.meta && STATE.meta.factMode && $('#factMode')) $('#factMode').value = STATE.meta.factMode; };
  setInterval(() => { if (STATE && STATE.meta && STATE.meta.id !== syncFactMode._id) { syncFactMode._id = STATE.meta.id; apply(); } }, 1000);
})();

/* ================= 《设计书》§8.12 统计面板 ================= */
(function () {
  const b = document.getElementById('btnStats');
  if (!b) return;
  b.onclick = async () => {
    if (!STATE) return alert('先开一个局');
    try {
      const r = await post('/api/stats', { saveId: STATE.meta.id });
      const a = r.arcs || {};
      const extra = a.路线分 ? `\n\n篇章：已到第 ${a.章} 章\n路线分：${Object.entries(a.路线分).map(([k, v]) => k + v).join(' ')}` +
        ((a.账单 || []).length ? '\n\n章末账单：\n' + a.账单.map(x => `第${x.chapter}章「${x.goal}」（${x.turns}）：${[...x.态度变化, ...x.伏笔回收.map(y => '回收 ' + y), ...x.时钟, ...x.得失].join('；') || '无大变化'}`).join('\n') : '') +
        ((a.检查点 || []).length ? '\n\n主线进度评估：\n' + a.检查点.map(c => `第${c.turn}回合：${c.text}`).join('\n') : '') : '';
      openModal('统计', `<pre style="white-space:pre-wrap;max-height:60vh;overflow:auto;font-size:13px;line-height:1.7">${escapeHtml(r.text + extra)}</pre>`, null);
    } catch (e) { alert('统计失败：' + (e && e.message || e)); }
  };
})();


/* ================= 崇祯式回合：数值条 · 案头来报 · 决定栏 · 问人 · 建议簿 · 润色 ================= */
function trayList() { return (window.__TRAY = window.__TRAY || []); }
function addToTray(text, who) {
  const t = String(text || '').trim();
  if (!t) return;
  if (!trayList().some(x => x.text === t)) trayList().push({ text: t, who: String(who || '').trim() });
  renderTray();
}
function renderTray() {
  const box = document.getElementById('tray');
  if (!box) return;
  const L = trayList();
  box.classList.toggle('hidden', !L.length);
  box.innerHTML = L.length ? '<div class="tray-h">这一回合的决定（点 × 去掉；也可以在下面再补几句）</div>'
    + L.map((x, i) => `<div class="tray-i"><span>${escapeHtml(x.text)}${x.who ? `<span class="muted">（交${escapeHtml(x.who)}去办）</span>` : ''}</span><button class="minibtn" data-untray="${i}">×</button></div>`).join('') : '';
}
document.addEventListener('click', ev => {
  const t = ev.target;
  if (!t || !t.dataset) return;
  if (t.dataset.untray != null) { trayList().splice(Number(t.dataset.untray), 1); renderTray(); }
  if (t.dataset.opt) { try { const o = JSON.parse(decodeURIComponent(t.dataset.opt)); addToTray(o.text, o.who); t.classList.add('picked'); } catch (_) { /* 无 */ } }
  if (t.dataset.act) addToTray(decodeURIComponent(t.dataset.act), '');
  if (t.dataset.askwho) { switchRail('ask'); const sel = $('#askWho'); fillPeople(); sel.value = decodeURIComponent(t.dataset.askwho); $('#askQ').value = t.dataset.askq ? decodeURIComponent(t.dataset.askq) : ''; $('#askQ').focus(); }
  if (t.dataset.adopt) { try { const o = JSON.parse(decodeURIComponent(t.dataset.adopt)); addToTray(o.text, o.who ? '' : ''); t.textContent = '已加入'; } catch (_) { /* 无 */ } }
  if (t.dataset.keep) { try { const o = JSON.parse(decodeURIComponent(t.dataset.keep)); saveAdvice(o); t.textContent = '已收进'; t.disabled = true; } catch (_) { /* 无 */ } }
  if (t.dataset.unadvice != null) saveAdvice(null, Number(t.dataset.unadvice));
});
/** 决定栏 + 自己写的话 + 交给谁 → 送给 AI 的一段话 */
function composeDecisions() {
  const L = trayList().map(x => `· ${x.text}${x.who ? `（交${x.who}去办）` : ''}`);
  const free = String($('#input').value || '').trim();
  const who = $('#assignee') && $('#assignee').value;
  if (free) L.push((L.length ? '· ' : '') + free + (who ? `（交${who}去办）` : ''));
  else if (who && L.length) L.push(`（以上未写明的，交${who}去办）`);
  return L.join('\n');
}

/* 局面板：你是谁 + 本身份最关心的五六项数 + 各人群的态度 */
const GWORD = v => (v >= 80 ? '感戴' : v >= 60 ? '安' : v >= 40 ? '平常' : v >= 25 ? '不满' : '怨');
function renderMeters() {
  const bar = document.getElementById('meterBar');
  if (!bar) return;
  if (!STATE) { bar.classList.add('hidden'); bar.innerHTML = ''; return; }
  let M = STATE.meters || {};
  let G = STATE.groups || {};
  // 开场还没接进世界：先显示 AI 给的初值
  const dd = LAST && LAST.draft;
  if (!Object.keys(M).length && dd && (dd.meters || []).length) M = Object.fromEntries(dd.meters.filter(m => m && (m.项 || m.name)).map(m => [m.项 || m.name, { value: m.值 || m.value || '', why: m.因 || '' }]));
  if (!Object.keys(G).length && dd && (dd.groups || []).length) G = Object.fromEntries(dd.groups.filter(g => g && (g.人群 || g.name)).map(g => { const v = Number(g.值 ?? g.value) || 0; return [g.人群 || g.name, { value: v, word: GWORD(v), why: g.因 || '' }]; }));
  const s = STATE, p = s.protagonist || {}, c = s.clock || {};
  const arrow = d => (/↑|升|增|\+/.test(d || '') ? '<i class="up">▲</i>' : /↓|降|减|-/.test(d || '') ? '<i class="down">▼</i>' : '');
  const ms = Object.entries(M), gs = Object.entries(G);
  bar.classList.remove('hidden');
  bar.innerHTML = `<div class="bd-who"><div class="bd-name">${escapeHtml(p.name || '')}<span>${escapeHtml(p.role || '')}</span></div>
      <div class="bd-when">${escapeHtml(c.yearLabel || '')} · ${escapeHtml(lunarText(c))}　${escapeHtml((s.location && s.location.full) || '')}</div></div>`
    + (ms.length ? '<div class="bd-tiles">' + ms.map(([k, v]) => `<div class="tile" title="${escapeHtml(v.why || '')}"><div class="tl-k">${escapeHtml(k)}</div><div class="tl-v">${escapeHtml(v.value)}${arrow(v.delta)}</div>${v.delta && v.why ? `<div class="tl-why">${escapeHtml(v.why)}</div>` : ''}</div>`).join('') + '</div>'
      : '<div class="bd-empty">数值会在开场后出现</div>')
    + (gs.length ? '<div class="bd-groups">' + gs.map(([k, v]) => `<div class="grp" title="${escapeHtml(v.why || '')}"><span class="g-k">${escapeHtml(k)}</span><span class="gbar"><span style="width:${Math.max(3, Math.min(100, v.value))}%" class="${v.value < 25 ? 'bad' : v.value < 40 ? 'warn' : v.value >= 60 ? 'good' : ''}"></span></span><span class="g-w">${escapeHtml(v.word || GWORD(v.value))}${v.delta ? (v.delta > 0 ? '<i class="up">▲</i>' : '<i class="down">▼</i>') : ''}</span></div>`).join('') + '</div>' : '');
}

/* 结算三层：回报（可能失真）· 账目（真实）· 风声 */
function renderSettle(d) {
  const box = document.getElementById('settleBox');
  if (!box) return;
  const st = (d && d.settlement) || {};
  const rep = (st.回报 || []).filter(x => x && x.text);
  const acc = (d && d.meters || []).filter(m => { const k = m && (m.项 || m.name); const old = k && STATE && (STATE.meters || {})[k]; return old && String(old.value) !== String(m.值 || m.value || ''); });
  const rum = (st.风声 || []).filter(Boolean);
  if (!rep.length && !acc.length && !rum.length) { box.classList.add('hidden'); box.innerHTML = ''; return; }
  box.innerHTML = `<div class="sec-t">这一回合的结果</div><div class="st-grid">
    <div class="st-col"><div class="st-h">回报<span>办事的人怎么说（未必是实话）</span></div>${rep.length ? rep.map(x => `<div class="st-rep">${x.who ? `<b>${escapeHtml(x.who)}</b>` : ''}${escapeHtml(x.text)}</div>`).join('') : '<div class="muted">没人来回话</div>'}</div>
    <div class="st-col"><div class="st-h">账目<span>实际的数</span></div>${acc.length ? acc.map(m => `<div class="st-acc"><span>${escapeHtml(m.项 || m.name)}</span><span>${escapeHtml((STATE.meters[m.项 || m.name] || {}).value || '')} → <b>${escapeHtml(m.值 || m.value || '')}</b></span>${m.因 || m.why ? `<em>${escapeHtml(m.因 || m.why)}</em>` : ''}</div>`).join('') : '<div class="muted">数没有变</div>'}</div>
    <div class="st-col"><div class="st-h">风声<span>街谈巷议</span></div>${rum.length ? rum.map(x => `<div class="st-rum">${escapeHtml(x)}</div>`).join('') : '<div class="muted">没听到什么</div>'}</div>
  </div>`;
  box.classList.remove('hidden');
}

/* 事务：每件事挂着直到了结；没了结的带可点的办法，了结的写明结局 */
const nameOf = from => String(from || '').split(/[（(，,·\s]/)[0].replace(/^(县衙|府衙|州衙)/, '').trim();
const MCLOSED = /了结|办妥|办砸|作罢|告终|结案|失败|完结/;
function currentMatters() {
  const base = ((STATE && STATE.matters) || (STATE && STATE.desk) || []).map(m => ({ ...m, status: m.status || '未办' }));
  const d = LAST && LAST.draft;
  if (d) {
    for (const u of (d.matters || [])) {
      const m = base.find(x => x.title === u.title || (u.title && x.title && (x.title.includes(u.title) || u.title.includes(x.title))));
      if (m) { if (u.status) m.status = u.status; if (u.progress) m.progress = u.progress; if (u.outcome) m.outcome = u.outcome; m.justNow = true; }
    }
    for (const r of (d.reports || [])) {
      const m = base.find(x => x.title === r.title);
      if (m && !MCLOSED.test(m.status)) Object.assign(m, r, { isNew: false });
      else if (!m) base.push({ ...r, status: '未办', isNew: true });
    }
  }
  return base;
}
function renderDesk(_reports, actions) {
  const box = document.getElementById('deskBox');
  if (!box) return;
  const all = STATE ? currentMatters() : [];
  const open = all.filter(m => !MCLOSED.test(m.status));
  const closed = all.filter(m => MCLOSED.test(m.status)).slice(-8).reverse();
  const acts = (actions || (LAST && LAST.draft && LAST.draft.actions) || []).filter(Boolean);
  if (!STATE || (!all.length && !acts.length)) { box.classList.add('hidden'); box.innerHTML = ''; return; }
  box.classList.remove('hidden');
  const enc = o => encodeURIComponent(JSON.stringify(o));
  const stCls = st => (/恶化/.test(st) ? 'bad' : /在办/.test(st) ? 'doing' : /办砸|失败/.test(st) ? 'bad' : MCLOSED.test(st) ? 'done' : 'todo');
  box.innerHTML = `<div class="sec-t">要你拿主意的事<span>点办法收进「这一回合的决定」，可以选好几件</span></div>`
    + (open.length ? open.map(r => `<div class="mt-card ${r.isNew ? 'new' : ''}">
        <div class="mc-top"><span class="badge ${stCls(r.status)}">${escapeHtml(r.isNew ? '新到' : r.status)}</span><span class="mc-title">${escapeHtml(r.title || '')}</span><span class="mc-from">${escapeHtml(r.form || '')} · ${escapeHtml(r.from || '')}</span></div>
        <div class="mc-text">${escapeHtml(r.text || '')}</div>
        ${r.progress ? `<div class="mc-prog">进展：${escapeHtml(r.progress)}</div>` : ''}
        ${r.deadline ? `<div class="mc-dl">期限　${escapeHtml(r.deadline)}</div>` : ''}
        <div class="mc-opts">${(r.options || []).map(o => `<button class="optbtn" data-opt="${enc({ text: o.text, who: o.who || '' })}"><span class="ob-t">${escapeHtml(o.text)}</span><span class="ob-m">${o.risk ? `<span class="risk r-${escapeHtml(o.risk)}">${escapeHtml(o.risk)}</span>` : ''}${o.who ? `交${escapeHtml(o.who)}` : ''}${o.cost ? `<span class="ob-c">${escapeHtml(o.cost)}</span>` : ''}</span></button>`).join('')}</div>
        <div class="mc-more">${nameOf(r.from) ? `<button class="linkbtn" data-askwho="${encodeURIComponent(nameOf(r.from))}" data-askq="${encodeURIComponent('「' + (r.title || '') + '」这件事，到底是怎么回事？')}">问问${escapeHtml(nameOf(r.from))}</button>` : ''}<button class="linkbtn" data-act="${encodeURIComponent('「' + (r.title || '') + '」先放着不管')}">先放着</button></div>
      </div>`).join('') : '<div class="muted">眼下没有压着的事。</div>')
    + (acts.length ? '<div class="desk-acts"><span class="da-h">随手能做</span>' + acts.map(a => `<button class="chipbtn" data-act="${encodeURIComponent(a)}">${escapeHtml(a)}</button>`).join('') + '</div>' : '')
    + (closed.length ? `<details class="closed"><summary>已了结的事（${closed.length}）</summary>${closed.map(m => `<div class="cl-i"><span class="badge ${stCls(m.status)}">${escapeHtml(m.status)}</span><b>${escapeHtml(m.title)}</b>${m.justNow ? '<span class="justnow">本回合</span>' : ''}<div class="cl-o">${escapeHtml(m.outcome || m.progress || '（没写结局）')}</div></div>`).join('')}</details>` : '');
  // 本回合刚了结的事：结局直接摊开，不藏在折叠里
  const just = closed.filter(m => m.justNow);
  if (just.length) box.insertAdjacentHTML('afterbegin', `<div class="justclosed">${just.map(m => `<div><span class="badge ${stCls(m.status)}">${escapeHtml(m.status)}</span><b>${escapeHtml(m.title)}</b>：${escapeHtml(m.outcome || m.progress || '')}</div>`).join('')}</div>`);
}

/* 问人：身边的人 + 来报的来人 */
function peopleList() {
  const s = STATE || {};
  const out = [];
  const add = n => { n = String(n || '').trim(); if (n && n !== (s.protagonist || {}).name && !out.includes(n)) out.push(n); };
  ((s.household && s.household.members) || []).filter(m => !m.status || m.status === '在世').forEach(m => add(m.name));
  (s.npcs || []).filter(n => n && !/已故|死/.test(String(n.status || ''))).slice(-30).forEach(n => add(n.name));
  ((LAST && LAST.draft && LAST.draft.reports) || s.desk || []).forEach(r => add(nameOf(r.from)));
  return out;
}
function fillPeople() {
  const ppl = peopleList();
  for (const id of ['askWho', 'assignee']) {
    const sel = document.getElementById(id);
    if (!sel) continue;
    const cur = sel.value;
    const first = id === 'askWho' ? '<option value="">— 问谁 —</option>' : '<option value="">（按身份默认）</option>';
    sel.innerHTML = first + ppl.map(n => `<option>${escapeHtml(n)}</option>`).join('');
    if (cur && ppl.includes(cur)) sel.value = cur;
    else if (cur && id === 'askWho') { sel.insertAdjacentHTML('beforeend', `<option>${escapeHtml(cur)}</option>`); sel.value = cur; }
  }
}
function renderConsult(c, prepend) {
  const box = document.getElementById('askBox');
  if (!box || !c) return;
  const enc = o => encodeURIComponent(JSON.stringify(o));
  const html = `<div class="ask-i"><div class="ask-q">问 <b>${escapeHtml(c.who)}</b>：${escapeHtml(c.q)}</div><div class="ask-a">${escapeHtml(c.reply)}</div>`
    + (c.suggestions || []).map(x => `<div class="ask-s"><span>${escapeHtml(x.text)}${x.risk ? `<span class="risk">${escapeHtml(x.risk)}</span>` : ''}</span>
        <button class="minibtn" data-adopt="${enc({ text: x.text })}">加入决定</button><button class="minibtn" data-keep="${enc({ who: c.who, text: x.text, risk: x.risk })}">收进建议簿</button></div>`).join('') + '</div>';
  box.insertAdjacentHTML(prepend ? 'afterbegin' : 'beforeend', html);
}
function renderPeopleCards() {
  const box = document.getElementById('peopleBox');
  if (!box) return;
  if (!STATE) { box.innerHTML = ''; return; }
  const P = { ...(STATE.people || {}) };
  for (const n of ((LAST && LAST.draft && [...(LAST.draft.newNpcs || []), ...(LAST.draft.presentNpcs || [])]) || [])) if (n && n.name) P[n.name] = { ...(P[n.name] || {}), ...Object.fromEntries(Object.entries(n).filter(([, v]) => v)), seen: 1e9 };
  const fam = ((STATE.household && STATE.household.members) || []).filter(m => m && m.name);
  for (const m of fam) if (!P[m.name]) P[m.name] = { role: m.relation || '家人', tie: m.relation, status: m.status && m.status !== '在世' ? m.status : '', seen: -1 };
  const list = Object.entries(P).filter(([k]) => k !== (STATE.protagonist || {}).name).sort((a, b) => (b[1].seen || 0) - (a[1].seen || 0)).slice(0, 16);
  box.innerHTML = list.length ? list.map(([k, v]) => `<div class="pc">
      <div class="pc-top"><span class="pc-name">${escapeHtml(k)}</span>${v.attitude ? `<span class="att">${escapeHtml(v.attitude)}</span>` : ''}</div>
      <div class="pc-role">${escapeHtml(v.role || '')}${v.tie && v.tie !== v.role ? ' · ' + escapeHtml(v.tie) : ''}</div>
      ${v.want ? `<div class="pc-l"><span>想要</span>${escapeHtml(v.want)}</div>` : ''}
      ${v.status ? `<div class="pc-l"><span>近况</span>${escapeHtml(v.status)}</div>` : ''}
      <button class="linkbtn" data-askwho="${encodeURIComponent(k)}">找来问</button></div>`).join('') : '<div class="muted">开场后，出场的人会列在这里。</div>';
}
function renderAskPanel() {
  renderPeopleCards();
  fillPeople();
  const box = document.getElementById('askBox');
  if (box) { box.innerHTML = ''; ((STATE && STATE.consults) || []).slice(-6).reverse().forEach(c => renderConsult(c, false)); }
  renderAdvice((STATE && STATE.adviceBook) || []);
}
function renderAdvice(book) {
  const box = document.getElementById('adviceBox');
  if (!box) return;
  const enc = o => encodeURIComponent(JSON.stringify(o));
  box.innerHTML = book.length ? book.map((x, i) => `<div class="ask-s"><span>${x.who ? `<b>${escapeHtml(x.who)}</b>：` : ''}${escapeHtml(x.text)}${x.risk ? `<span class="risk">${escapeHtml(x.risk)}</span>` : ''}</span>
      <button class="minibtn" data-adopt="${enc({ text: x.text })}">加入决定</button><button class="minibtn" data-unadvice="${i}">删</button></div>`).join('')
    : '<div class="muted">问人得来的主意，点「收进建议簿」就记在这里。</div>';
}
async function saveAdvice(item, removeIdx) {
  if (!STATE) return;
  const r = await post('/api/advice', removeIdx != null ? { saveId: STATE.meta.id, remove: removeIdx } : { saveId: STATE.meta.id, ...item });
  if (r.ok) { STATE.adviceBook = r.advice; renderAdvice(r.advice); }
}
document.getElementById('btnAsk') && (document.getElementById('btnAsk').onclick = async () => {
  if (!STATE) return alert('先开一个局');
  const who = $('#askWho').value;
  if (!who) return alert('先选要问的人');
  const b = $('#btnAsk'); b.disabled = true; $('#askMsg').textContent = `${who}在想……`;
  try {
    const r = await post('/api/ask', { saveId: STATE.meta.id, who, question: $('#askQ').value });
    if (r.error || !r.ok) throw new Error(r.error || r.why || '没问成');
    STATE.consults = (STATE.consults || []).concat([r.consult]);
    renderConsult(r.consult, true);
    $('#askQ').value = ''; $('#askMsg').textContent = '';
  } catch (e) { $('#askMsg').textContent = '没问成：' + (e.message || e); }
  finally { b.disabled = false; }
});
document.getElementById('btnPolish') && (document.getElementById('btnPolish').onclick = async () => {
  if (!STATE) return alert('先开一个局');
  const raw = composeDecisions();
  if (!raw.trim()) return alert('先点几个办法，或在框里写下你的打算');
  const b = $('#btnPolish'); b.disabled = true; b.textContent = '润色中…';
  try {
    const r = await post('/api/polish', { saveId: STATE.meta.id, text: raw });
    if (r.error || !r.ok) throw new Error(r.error || r.why);
    trayList().length = 0; renderTray();
    $('#input').value = r.text; $('#input').rows = 5;
  } catch (e) { alert('没润色成：' + (e.message || e)); }
  finally { b.disabled = false; b.textContent = '润色成文书'; }
});


/* ================= 一键更新：有新版本就在顶上提示，点一下自动下载安装 ================= */
async function showUpdateLinks(box, why) {
  let L = [];
  try { L = ((await get('/api/update/links')).links) || []; } catch (_) { L = []; }
  box.innerHTML = `<b>自动更新没成功</b>${why ? '：' + escapeHtml(why) : ''}<br>可以手动下载新的安装程序，双击安装（存档和 Key 不会丢）：`
    + L.map(x => `<a href="${escapeHtml(x.url)}" target="_blank" rel="noopener">${escapeHtml(x.name)}</a>`).join('　') + '<button class="linkbtn" id="updClose">关闭</button>';
}
async function checkUpdate(manual) {
  const box = document.getElementById('updBanner');
  if (!box) return;
  let r;
  try { r = await get('/api/update/check'); } catch (_) { return; }
  if (!r || !r.hasUpdate) {
    if (manual) { box.classList.remove('hidden'); box.innerHTML = (r && r.ok === false ? '没查到新版本信息：' + escapeHtml(r.why || '') : r && r.dev ? '这是开发版，不检查更新。' : '已经是最新版。') + '<button class="linkbtn" id="updClose">关闭</button>'; }
    return;
  }
  box.classList.remove('hidden');
  box.innerHTML = `<b>有新版本了</b>（第 ${escapeHtml(r.latest.run)} 版${r.latest.date ? '，' + escapeHtml(r.latest.date) : ''}；你现在是第 ${escapeHtml(r.current.run)} 版）。`
    + (r.canAuto ? '<button id="updGo" class="primary">一键更新</button><span class="muted">自动下载、安装、重新打开，存档和 Key 不会丢</span>' : '')
    + '<button class="linkbtn" id="updLater">以后再说</button>';
}
document.addEventListener('click', async ev => {
  const t = ev.target;
  if (!t) return;
  const box = document.getElementById('updBanner');
  if (t.id === 'updClose' || t.id === 'updLater') box.classList.add('hidden');
  if (t.id === 'btnCheckUpd') { ev.preventDefault(); checkUpdate(true); }
  if (t.id !== 'updGo') return;
  t.disabled = true;
  await post('/api/update/start', {});
  const tick = async () => {
    let s;
    try { s = await get('/api/update/status'); } catch (_) {
      // 游戏服务被安装程序关掉了：说明正在安装
      box.innerHTML = '<b>正在安装新版本……</b> 游戏会自己关掉再打开（半分钟左右）。如果一分钟后还没打开，双击桌面上的「历史模拟RPG」。';
      return;
    }
    if (s.state === 'error') return showUpdateLinks(box, s.why);
    if (s.state === 'uptodate') { box.innerHTML = '已经是最新版。<button class="linkbtn" id="updClose">关闭</button>'; return; }
    if (s.state === 'installing') { box.innerHTML = '<b>下载好了，正在安装……</b> 游戏会自己关掉再打开（半分钟左右）。如果一分钟后还没打开，双击桌面上的「历史模拟RPG」。'; setTimeout(tick, 3000); return; }
    if (s.state === 'downloading') {
      const pct = s.total ? Math.floor(s.got / s.total * 100) : 0;
      box.innerHTML = `<b>正在下载新版本</b>（${escapeHtml(s.via)}）：${pct}%　${(s.got / 1048576).toFixed(1)} / ${(s.total / 1048576).toFixed(1)} MB${(s.log || []).length ? `<span class="muted">　已换过地址：${escapeHtml(s.log.join('；'))}</span>` : ''}`;
    } else box.innerHTML = '<b>正在查新版本……</b>';
    setTimeout(tick, 1000);
  };
  tick();
});
setTimeout(() => checkUpdate(false), 4000);
