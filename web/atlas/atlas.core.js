/* ============================================================================
 * atlas.core.js —— 历史地图引擎的查询核心（纯函数，不碰 DOM，不碰游戏存档 S）
 *
 * 数据来源见 web/atlas/SCHEMA.md：
 *   geo.json     行号即地点主键 P<i>（i >= geoRows 时为 terrain.json.passes 的 (i-geoRows) 条）
 *   core.json    typeMap / parent / polity / network
 *   terrain.json 高程与关隘
 *
 * 本文件在浏览器里由 build.py 内嵌，在 node 里可直接 require 做测试。
 * 它只读：调用方拿到的都是快照或新对象，没有任何接口会改游戏状态。
 * ==========================================================================*/
'use strict';

const ATLAS = (function () {
  const V = 1;
  const SENT_LO = -9999, SENT_HI = 9999;

  /* ---- 冻结的速度表（见设计定稿）。单位：里/日 ---- */
  const PACE = {
    stroll:  { name: '缓行',          maxDays: Infinity, arrive: 1.00 },
    normal:  { name: '常行',          maxDays: Infinity, arrive: 1.00 },
    forced:  { name: '疾行',          maxDays: 10,       arrive: 0.94 },
    sprint:  { name: '倍道兼行',      maxDays: 3,        arrive: 0.85 },
    express: { name: '昼夜兼程·极速', maxDays: 1,        arrive: 0.70 }
  };
  const PACE_ORDER = ['express', 'sprint', 'forced', 'normal', 'stroll'];
  const SPEED = {                       // mode → pace → 里/日（null = 该档不行）
    foot:  { stroll: 30, normal: 50,  forced: 75,  sprint: 100, express: null },
    horse: { stroll: 60, normal: 100, forced: 140, sprint: 190, express: 300 },
    wagon: { stroll: 20, normal: 30,  forced: 45,  sprint: null, express: null },
    water: { stroll: 40, normal: 60,  forced: 80,  sprint: null, express: null }
  };
  const CAP = { foot: 90, horse: 200, wagon: 45, water: 120 };
  const POST_SPEED = 400;               // 驿传专差：须官方身份，见 paceOptions
  const GRADE = { 0: 1.00, 1: 0.90, 2: 0.60, 3: 0.90 };   // 平路/经关/山路/海路（规则，非史实）
  const WEATHER = { clear: 1.0, rain: 0.8, snow: 0.55 };
  const K_NAME = ['plain', 'pass', 'mtn', 'sea', 'block'];

  /* ---- 运行时状态（load 时建立，之后只读） ---- */
  let G = null;      // { rows, types, pn, n }
  let T = null;      // terrain（含解码后的 elev）
  let C = null;      // core.json
  let NODES = null;  // 路网节点 [{row, lon, lat}]
  let NIDX = null;   // geoRow → 节点序号
  let ADJ = null;    // 邻接表
  let ERAS = null;   // 年代层：{ id → {meta, rows} }
  let snapCache = new Map();

  /* ---------------------------------------------------------------- 工具 */

  function hav(a, b) {
    const R = 6371, r = x => x * Math.PI / 180;
    const dLa = r(b.lat - a.lat), dLo = r(b.lon - a.lon);
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function havDeg(a, b) { return Math.hypot(b.lon - a.lon, b.lat - a.lat); }
  function liKmFor(y) { return y < 581 ? 0.415 : y < 960 ? 0.53 : y < 1368 ? 0.553 : 0.576; }
  function dirOf(a, b) {
    const dx = (b.lon - a.lon) * Math.cos((a.lat + b.lat) / 2 * Math.PI / 180), dy = b.lat - a.lat;
    const ang = (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
    return ['北', '东北', '东', '东南', '南', '西南', '西', '西北'][Math.round(ang / 45) % 8];
  }
  function liOf(km, y) { const k = liKmFor(y || 1600); return Math.round(km / k / 5) * 5; }

  /** 闭区间判活（R2/R3）：from=to 为单年，-9999/9999 为无界。
   *  注意 0：源数据用 0 表示「这一年没记下来」（起年或终年不详）。公元 0 年不存在，
   *  所以 0 可以安全当哨兵；但**端点不详就无法断言它曾经存在**，故直判 false。
   *  想让这类记录也画出来，用 maybeAlive（会多画，且必须标 uncertain）。 */
  function alive(f, t, y) {
    if (f === 0 || t === 0) return false;
    const a = (f === null || f === undefined) ? SENT_LO : f;
    const b = (t === null || t === undefined) ? SENT_HI : t;
    return a <= y && y <= b;
  }
  /** 宽松判活：只排除能被已知端点否证的。会误画已亡的政区，调用方必须标 uncertain。 */
  function maybeAlive(f, t, y) {
    if (f === 0 && t === 0) return true;
    if (f === 0) return y <= t;
    if (t === 0) return y >= f;
    return alive(f, t, y);
  }
  /** 0=年代齐全 / 1=起年不详 / 2=终年不详 / 3=都不详 */
  function spanUnknownOf(f, t) {
    return (f === 0 ? 1 : 0) | (t === 0 ? 2 : 0);
  }

  /* ---------------------------------------------------------------- 载入 */

  function decodeB64(s) {
    if (typeof Buffer !== 'undefined') return new Uint8Array(Buffer.from(s, 'base64'));
    const bin = atob(s), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }

  function load(opt) {
    const geo = opt.geo, terr = opt.terrain, core = opt.core;
    if (!geo || !geo.rows) throw new Error('atlas.load: 缺 geo');
    if (!terr) throw new Error('atlas.load: 缺 terrain');
    if (!core) throw new Error('atlas.load: 缺 core');
    if (core.v !== V) throw new Error('atlas.load: core 版本不符（' + core.v + ' ≠ ' + V + '）');

    G = { rows: geo.rows, types: geo.types || [], pn: geo.pn || [], n: geo.rows.length };
    T = {
      box: terr.box, nx: terr.nx, ny: terr.ny,
      g: decodeB64(terr.elev),
      passes: terr.passes || [],
      rivers: terr.rivers || [], old: terr.old || [], canal: terr.canal || [],
      coast: terr.coast || [], lakes: terr.lakes || [], ranges: terr.ranges || []
    };
    C = core;

    NODES = (core.network.nodeRows || []).map(row => ({
      row, lon: G.rows[row][5] / 1e4, lat: G.rows[row][6] / 1e4
    }));
    NIDX = new Map();
    NODES.forEach((nd, i) => NIDX.set(nd.row, i));
    ADJ = NODES.map(() => []);
    for (const e of core.network.rows) {
      ADJ[e[0]].push(e);
      ADJ[e[1]].push(e);
    }
    snapCache = new Map();
    ERAS = new Map();
    for (const doc of (opt.eras || [])) {
      if (!doc || !doc.rows) continue;
      ERAS.set(doc.id, doc);
    }
    return { version: core.dataVersion, nodes: NODES.length, edges: core.network.rows.length, eras: ERAS.size };
  }

  /* ---------------------------------------------------------------- 年代层
   * 年代层是「某一年完整的一次行政快照」，来自 CHGIS V4 的 1820 / 1911 层
   * （直接数字化自谭图第八册），带 省—府—县 三层。与 core.json 的逐条区间互补：
   * 区间表回答「某处在某年存不存在」，年代层回答「这一年全国有哪些县」。 */

  function eraList() {
    return [...ERAS.values()].map(d => ({
      id: d.id, year: d.year, dyn: d.dyn, title: d.title, source: d.source,
      count: d.count, skipped: d.skipped || 0
    }));
  }

  function era(id) { return ERAS.get(id) || null; }

  /** 年代层转成地点对象；bbox / lev1 / lev2 / type 过滤。
   *  1820、1911 这两层本身就是「县级治所」点集（省治所、府治所是另外两个文件），
   *  所以一律按县级处理；西藏、蒙古那些没有府一级的边疆点也是县级，
   *  不能因为 lev2 为空就画成府。 */
  function eraUnits(id, opt) {
    opt = opt || {};
    const d = ERAS.get(id);
    if (!d) return [];
    const out = [];
    for (const r of d.rows) {
      const o = { name: r[0], type: r[1], lev1: r[2], lev2: r[3], lon: r[4], lat: r[5], conf: r[6], level: 3 };
      if (opt.bbox && (o.lon < opt.bbox[0] || o.lon > opt.bbox[2] || o.lat < opt.bbox[1] || o.lat > opt.bbox[3])) continue;
      if (opt.lev1 && o.lev1 !== opt.lev1) continue;
      if (opt.lev2 && o.lev2 !== opt.lev2) continue;
      if (opt.types && opt.types.indexOf(o.type) < 0) continue;
      out.push(o);
    }
    return out;
  }

  /** 年代层的省—府树，供放大到某一府时列县 */
  function eraTree(id) {
    const d = ERAS.get(id);
    if (!d) return null;
    const t = {};
    for (const r of d.rows) {
      const p = r[2] || '（直属）';
      const x = r[3] || '（未详）';
      if (!t[p]) t[p] = {};
      if (!t[p][x]) t[p][x] = [];
      t[p][x].push(r[0]);
    }
    return t;
  }

  /* ---------------------------------------------------------------- 行 */

  function typeOf(i) {
    const ti = G.rows[i][1];
    return C.typeMap[ti] ? (G.types[ti] || '') : '';
  }
  function levelOf(i) { const ti = G.rows[i][1]; const m = C.typeMap[ti]; return m ? m[0] : 0; }
  function statusOf(i) { const ti = G.rows[i][1]; const m = C.typeMap[ti]; return m ? m[1] : 0; }
  function kindOf(i) { const ti = G.rows[i][1]; const m = C.typeMap[ti]; return m ? m[2] : 0; }

  /** 第 i 行 → 地点对象。place 与 admin 共用行号，见 SCHEMA 第 0 节 */
  function row(i) {
    if (i == null || i < 0) return null;
    const n = G.n;
    if (i >= n) {                       // 关隘
      const p = T.passes[i - n];
      if (!p) return null;
      return { i, id: 'P' + i, adminId: null, name: p.n, kind: 4, kindName: 'pass',
        level: 0, status: 0, type: '关', from: p.from, to: p.to,
        lon: p.lon, lat: p.lat, parent: null, why: p.why, src: p.src };
    }
    const r = G.rows[i];
    const lv = levelOf(i);
    const kd = kindOf(i);
    return {
      i, id: 'P' + i, adminId: lv > 0 ? 'A' + i : null,
      name: r[0], kind: kd, kindName: ['none', 'county_seat', 'prefecture_seat', 'province_seat', 'pass', 'port', 'ferry', 'city'][kd] || 'none',
      level: lv, status: statusOf(i), type: typeOf(i),
      from: r[3], to: r[4], lon: r[5] / 1e4, lat: r[6] / 1e4,
      spanUnknown: spanUnknownOf(r[3], r[4]),
      // 源数据里少量倒置区间（如 to=191 其实是 1911，漏了一位）。不猜、不修，只标记。
      spanDefect: (r[3] !== 0 && r[4] !== 0 && r[3] > r[4]),
      parent: C.parent[i] >= 0 ? 'A' + C.parent[i] : null,
      parentState: C.parent[i], src: 'CHGIS'
    };
  }

  function parseId(id) {
    if (typeof id === 'number') return id;
    const m = /^[PA](\d+)$/.exec(String(id || ''));
    return m ? parseInt(m[1], 10) : -1;
  }

  /* ---------------------------------------------------------------- 查询 */

  function placesIn(bbox, y, kinds) {
    const out = [];
    const x0 = bbox[0], y0 = bbox[1], x1 = bbox[2], y1 = bbox[3];
    const kset = kinds ? new Set(kinds) : null;
    for (let i = 0; i < G.n; i++) {
      const r = G.rows[i];
      const lon = r[5] / 1e4, lat = r[6] / 1e4;
      if (lon < x0 || lon > x1 || lat < y0 || lat > y1) continue;
      if (!alive(r[3], r[4], y)) continue;
      if (kset && !kset.has(kindOf(i))) continue;
      out.push(row(i));
    }
    for (let k = 0; k < T.passes.length; k++) {
      const p = T.passes[k];
      if (p.lon < x0 || p.lon > x1 || p.lat < y0 || p.lat > y1) continue;
      if (!alive(p.from, p.to, y)) continue;
      if (kset && !kset.has(4)) continue;
      out.push(row(G.n + k));
    }
    return out;
  }

  /** 给定年份的世界快照（不可变视图；调用方改了也不影响内部） */
  function snapshot(y, opt) {
    opt = opt || {};
    const key = y + '|' + (opt.kinds ? opt.kinds.join(',') : '') + '|' + (opt.bbox ? opt.bbox.join(',') : '') + '|' + (opt.includeUnknown ? 'u' : '');
    if (snapCache.has(key)) return snapCache.get(key);

    const units = [], places = [];
    for (let i = 0; i < G.n; i++) {
      const r = G.rows[i];
      let hit = alive(r[3], r[4], y), unsure = false;
      if (!hit && opt.includeUnknown && maybeAlive(r[3], r[4], y)) { hit = true; unsure = true; }
      if (!hit) continue;
      const lv = levelOf(i);
      if (opt.bbox) {
        const lon = r[5] / 1e4, lat = r[6] / 1e4;
        if (lon < opt.bbox[0] || lon > opt.bbox[2] || lat < opt.bbox[1] || lat > opt.bbox[3]) continue;
      }
      const o = row(i);
      if (unsure) o.uncertain = true;
      places.push(o);
      if (lv > 0) units.push(o);
    }
    if (!opt.noPasses) {
      for (let k = 0; k < T.passes.length; k++) {
        const p = T.passes[k];
        if (!alive(p.from, p.to, y)) continue;
        if (opt.bbox && (p.lon < opt.bbox[0] || p.lon > opt.bbox[2] || p.lat < opt.bbox[1] || p.lat > opt.bbox[3])) continue;
        places.push(row(G.n + k));
      }
    }
    const polities = C.polity.rows.filter(p => {
      const f = p[2], t = p[3];
      if (!alive(f, t, y)) return false;
      return true;
    }).map(p => ({ id: p[0], name: p[1], from: p[2], to: p[3], openEnded: !!p[4], conf: p[5], src: p[6], eras: String(p[7] || '').split('|') }));

    const snap = {
      year: y, units, places, polities,
      network: { nodes: NODES.length, edges: C.network.rows.length },
      meta: { version: C.dataVersion, axis: C.axis, degraded: false, controlAvailable: false }
    };
    if (snapCache.size > 4) snapCache.delete(snapCache.keys().next().value);
    snapCache.set(key, snap);
    return snap;
  }

  function unit(id, y) {
    const i = parseId(id);
    if (i < 0 || i >= G.n) return null;
    const r = G.rows[i];
    if (levelOf(i) === 0) return null;
    if (y != null && !alive(r[3], r[4], y)) return null;
    return row(i);
  }

  /** 政权控制：一期没有数据，如实返回 null，并在 why 里说明（不许编） */
  function control(id, y) {
    return { primary: null, all: [], basis: null, conf: 0, source: null,
      why: '一期无 control 表：仓库里没有带年份的疆域控制数据' };
  }

  /** 边界：没有 geom 就只能是示意，绝不合成多边形 */
  function boundary(id, y) {
    const i = parseId(id);
    if (i < 0) return { type: 'none' };
    if (i >= G.n) return { type: 'none', reason: '关隘是点' };
    const pg = C.parent[i] >= 0 ? 'A' + C.parent[i] : null;
    return { type: 'schematic', reason: '无边界数据源', parent: pg };
  }

  /** 名字解析：只认 geo.json 里真有这个名的；京师这类俗称由页面 GEO_ALIAS 负责 */
  function resolve(name, y, near) {
    const nm = String(name || '').trim();
    if (!nm) return null;
    let best = null, bs = 1e9;
    for (let i = 0; i < G.n; i++) {
      const r = G.rows[i];
      if (r[0] !== nm) continue;
      const d = alive(r[3], r[4], y) ? 0 : Math.min(Math.abs(r[3] - y), Math.abs(r[4] - y));
      const rank = levelOf(i) === 2 ? 0 : levelOf(i) === 1 ? 1 : levelOf(i) === 3 ? 2 : 3;
      const dist = near ? Math.hypot(r[5] / 1e4 - near.lon, r[6] / 1e4 - near.lat) : 0;
      const s = d * 100 + rank * 10 + dist;
      if (s < bs) { bs = s; best = i; }
    }
    return best >= 0 ? row(best) : null;
  }

  /* ---------------------------------------------------------------- 地形（对应 game.src.html 3277） */

  function qM(q) { return q ? ((q - 1) / 254) ** 2 * 7000 : -1; }
  function elevAt(lon, lat) {
    const [L0, L1, A0, A1, R] = T.box;
    if (lon < L0 || lon > L1 || lat < A0 || lat > A1) return null;
    const fx = (lon - L0) / R - 0.5, fy = (A1 - lat) / R - 0.5;
    const i = Math.max(0, Math.min(T.nx - 2, Math.floor(fx)));
    const j = Math.max(0, Math.min(T.ny - 2, Math.floor(fy)));
    const a = Math.min(1, Math.max(0, fx - i)), b = Math.min(1, Math.max(0, fy - j));
    const v = (x, y) => T.g[y * T.nx + x];
    const rx = Math.round(fx) < 0 ? 0 : Math.min(T.nx - 1, Math.round(fx));
    const ry = Math.round(fy) < 0 ? 0 : Math.min(T.ny - 1, Math.round(fy));
    const n = v(rx, ry);
    if (!n) return -1;
    const m = (x, y) => Math.max(0, qM(v(x, y)));
    return m(i, j) * (1 - a) * (1 - b) + m(i + 1, j) * a * (1 - b) + m(i, j + 1) * (1 - a) * b + m(i + 1, j + 1) * a * b;
  }

  function segProfile(a, b) {
    const D = havDeg(a, b), n = Math.max(4, Math.ceil(D / 0.05));
    let mx = 0, sea = 0, unk = 0;
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const e = elevAt(a.lon + (b.lon - a.lon) * t, a.lat + (b.lat - a.lat) * t);
      if (e == null) unk++; else if (e < 0) sea++; else mx = Math.max(mx, e);
    }
    const ea = elevAt(a.lon, a.lat) || 0, eb = elevAt(b.lon, b.lat) || 0;
    return { mx, sea: sea / (n - 1), unk: unk / (n - 1), ends: Math.max(0, ea, eb) };
  }

  function mtnPath(a, b) {
    const R = 0.1, pad = 0.6;
    const lo0 = Math.min(a.lon, b.lon) - pad, la0 = Math.min(a.lat, b.lat) - pad;
    const nx = Math.ceil((Math.abs(a.lon - b.lon) + 2 * pad) / R) + 1;
    const ny = Math.ceil((Math.abs(a.lat - b.lat) + 2 * pad) / R) + 1;
    if (nx * ny > 6000) return null;
    const E = new Float32Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const e = elevAt(lo0 + i * R, la0 + j * R);
      E[j * nx + i] = (e == null || e < 0) ? -1 : e;
    }
    const id = p => Math.round((p.lat - la0) / R) * nx + Math.round((p.lon - lo0) / R);
    const s0 = id(a), t0 = id(b);
    if (E[s0] < 0 || E[t0] < 0) return null;
    const dist = new Float32Array(nx * ny).fill(Infinity);
    const prev = new Int32Array(nx * ny).fill(-1);
    const done = new Uint8Array(nx * ny);
    dist[s0] = 0;
    const H = [[0, s0]];
    const push = x => { H.push(x); let i = H.length - 1; while (i) { const p = (i - 1) >> 1; if (H[p][0] <= H[i][0]) break; [H[p], H[i]] = [H[i], H[p]]; i = p; } };
    const pop = () => { const top = H[0], last = H.pop(); if (H.length) { H[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < H.length && H[l][0] < H[m][0]) m = l; if (r < H.length && H[r][0] < H[m][0]) m = r; if (m === i) break; [H[m], H[i]] = [H[i], H[m]]; i = m; } } return top; };
    while (H.length) {
      const [du, u] = pop();
      if (done[u] || du > dist[u]) continue;
      if (u === t0) break;
      done[u] = 1;
      const ui = u % nx, uj = (u / nx) | 0;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const vi = ui + di, vj = uj + dj;
        if (vi < 0 || vj < 0 || vi >= nx || vj >= ny) continue;
        const v = vj * nx + vi;
        if (done[v] || E[v] < 0) continue;
        const c = Math.hypot(di, dj) * (1 + Math.max(0, E[v] - E[u]) / 120 + E[v] / 2500);
        if (dist[u] + c < dist[v]) { dist[v] = dist[u] + c; prev[v] = u; push([dist[v], v]); }
      }
    }
    if (prev[t0] < 0) return null;
    let mx = 0, len = 0, last = -1;
    for (let v = t0; v >= 0; v = prev[v]) { mx = Math.max(mx, E[v]); if (last >= 0) len += Math.hypot(((v % nx) - (last % nx)), (((v / nx) | 0) - ((last / nx) | 0))) * R; last = v; }
    return { len, mx };
  }

  /** 两点之间怎么走：与 game.src.html 的 linkOf 同一套判定 */
  function profile(a, b, y) {
    const p = segProfile(a, b), D = havDeg(a, b);
    if (p.unk > 0.3) return null;
    if (p.sea > 0.35) return { k: 3, kName: 'sea', via: null };
    const rise = p.mx - p.ends;
    if (rise < 420) return { k: 0, kName: 'plain', via: null, rise: Math.round(rise) };
    const ps = T.passes.filter(q => alive(q.from, q.to, y == null ? 1600 : y));
    for (const q of ps) {
      const den = D * D || 1;
      const t = ((q.lon - a.lon) * (b.lon - a.lon) + (q.lat - a.lat) * (b.lat - a.lat)) / den;
      if (t < 0.05 || t > 0.95) continue;
      const off = Math.hypot(a.lon + (b.lon - a.lon) * t - q.lon, a.lat + (b.lat - a.lat) * t - q.lat);
      if (off > Math.max(0.45, D * 0.3)) continue;
      const p1 = segProfile(a, q), p2 = segProfile(q, b);
      if (p1.mx - p1.ends < 900 && p2.mx - p2.ends < 900) return { k: 1, kName: 'pass', via: q.n, rise: Math.round(rise) };
    }
    if (D < 3.5) {
      const m = mtnPath(a, b);
      if (m && m.len < D * 2.2 && m.mx - p.ends < 1600) return { k: 2, kName: 'mtn', via: null, rise: Math.round(m.mx - p.ends) };
    }
    return { k: 4, kName: 'block', via: null, rise: Math.round(rise) };
  }

  /* ---------------------------------------------------------------- 路线与行军 */

  function nearestNode(pt, maxDeg) {
    let best = -1, bd = maxDeg == null ? 0.6 : maxDeg;
    NODES.forEach((nd, i) => {
      const d = havDeg(pt, nd);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  function edgeKindByYear(e, y) {
    let k = e[2];
    if (k === 1 && e[4] >= 0) {                 // 经关：该关当年没设立则退到 kf
      const p = T.passes[e[3]];
      if (!p || !alive(p.from, p.to, y)) k = e[4];
    }
    return k;
  }

  /** 最短路（Dijkstra，按公里）。返回节点序列与各段 */
  function route(from, to, y, opt) {
    opt = opt || {};
    const pA = typeof from === 'string' ? unit(from, y) || row(parseId(from)) : from;
    const pB = typeof to === 'string' ? unit(to, y) || row(parseId(to)) : to;
    if (!pA || !pB) return { ok: false, why: '起讫点不存在' };

    const aNode = NIDX.has(pA.i) ? NIDX.get(pA.i) : -1;
    const bNode = NIDX.has(pB.i) ? NIDX.get(pB.i) : -1;
    const a = aNode >= 0 ? aNode : nearestNode(pA);
    const b = bNode >= 0 ? bNode : nearestNode(pB);
    if (a < 0 || b < 0) return { ok: false, why: '起讫点不在路网三百公里内' };

    // 两端不在路网节点上的，各接一段直连
    const pre = aNode < 0 ? [{ from: pA, to: NODES[a], k: (profile(pA, NODES[a], y) || { k: 4 }).k, km: hav(pA, NODES[a]) }] : [];
    const post = bNode < 0 ? [{ from: NODES[b], to: pB, k: (profile(NODES[b], pB, y) || { k: 4 }).k, km: hav(NODES[b], pB) }] : [];

    const n = NODES.length;
    const dist = new Float64Array(n).fill(Infinity);
    const prev = new Int32Array(n).fill(-1);
    const prevEdge = new Array(n).fill(null);
    const seen = new Uint8Array(n);
    dist[a] = 0;
    const H = [[0, a]];
    const push = x => { H.push(x); let i = H.length - 1; while (i) { const p = (i - 1) >> 1; if (H[p][0] <= H[i][0]) break; [H[p], H[i]] = [H[i], H[p]]; i = p; } };
    const pop = () => { const top = H[0], last = H.pop(); if (H.length) { H[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < H.length && H[l][0] < H[m][0]) m = l; if (r < H.length && H[r][0] < H[m][0]) m = r; if (m === i) break; [H[m], H[i]] = [H[i], H[m]]; i = m; } } return top; };
    while (H.length) {
      const [du, u] = pop();
      if (seen[u] || du > dist[u]) continue;
      if (u === b) break;
      seen[u] = 1;
      for (const e of ADJ[u]) {
        const k = edgeKindByYear(e, y);
        if (k === 4) continue;
        const v = e[0] === u ? e[1] : e[0];
        const d = hav(NODES[u], NODES[v]);
        if (dist[u] + d < dist[v]) { dist[v] = dist[u] + d; prev[v] = u; prevEdge[v] = e; push([dist[v], v]); }
      }
    }
    if (!isFinite(dist[b])) return { ok: false, why: '路网里没有通路（隔山或隔海）' };

    const chain = [];
    for (let v = b; v >= 0; v = prev[v]) { chain.push(v); if (v === a) break; }
    chain.reverse();
    const legs = [];
    for (let i = 1; i < chain.length; i++) {
      const e = prevEdge[chain[i]];
      legs.push({ a: chain[i - 1], b: chain[i], k: edgeKindByYear(e, y), km: hav(NODES[chain[i - 1]], NODES[chain[i]]) });
    }
    for (const s of pre) legs.unshift({ a: null, b: null, k: s.k, km: hav(s.from, s.to) });
    for (const s of post) legs.push({ a: null, b: null, k: s.k, km: hav(s.from, s.to) });
    const gates = legs.filter(l => l.k === 1).length;
    const totalKm = legs.reduce((s, l) => s + l.km, 0);
    return { ok: true, from: pA, to: pB, legs, km: totalKm, gates };
  }

  /** 各档步调下的耗时。返回每一档，不满足条件的带 allowed:false 与 why */
  function paceOptions(from, to, y, ctx) {
    ctx = ctx || {};
    const r = route(from, to, y, ctx);
    if (!r.ok) return [];
    const mode = ctx.mode || 'horse';
    const men = ctx.men == null ? 0 : ctx.men;
    const weather = ctx.weather || 'clear';
    const LI_KM = liKmFor(y);
    const li = r.km / LI_KM;
    const out = [];
    for (const pid of PACE_ORDER) {
      const sp = SPEED[mode] ? SPEED[mode][pid] : null;
      let allowed = true, why = '';
      if (!sp) { allowed = false; why = mode === 'wagon' ? '车营不能倍道' : mode === 'water' ? '水运没有这一档' : '这个方式没有这一档'; }
      if (allowed && pid === 'sprint' && men > 1000) { allowed = false; why = '逾一千人不能倍道'; }
      if (allowed && pid === 'express' && men > 100) { allowed = false; why = '逾百骑不能极速'; }
      if (allowed && pid === 'express' && li > 400) { allowed = false; why = '单程逾四百里：极速只用于短途突击，长途请用倍道'; }
      if (allowed && pid === 'sprint' && ctx.morale != null && ctx.morale < 60) { allowed = false; why = '士气不足六十，强行倍道会溃散'; }
      let days = allowed ? travelDays(li, mode, pid, weather, r.gates) : null;
      const range = days == null ? null : [Math.max(1, Math.floor(days * 0.85)), Math.ceil(days * 1.15)];
      out.push({
        id: pid, name: PACE[pid].name, liPerDay: sp, allowed, why,
        li: Math.round(li), days: days == null ? null : Math.ceil(days), range,
        arrivePct: PACE[pid].arrive, mode
      });
    }
    return out;
  }

  /** 按档位算天数（含「可连续」上限溢出后自动降档） */
  function travelDays(li, mode, pace, weather, gates) {
    let idx = PACE_ORDER.indexOf(pace);
    let remain = li, t = 0, guard = 0;
    while (remain > 1e-9 && idx < PACE_ORDER.length && guard++ < 8) {
      const pid = PACE_ORDER[idx];
      const base = SPEED[mode] ? SPEED[mode][pid] : null;
      idx++;
      if (!base) continue;
      const v = Math.min(base * (WEATHER[weather] || 1), pid === 'express' ? 300 : (CAP[mode] || base));
      const cap = PACE[pid].maxDays;
      const use = cap === Infinity ? remain / v : Math.min(cap, remain / v);
      t += use;
      remain -= use * v;
    }
    return t + 0.5 * (gates || 0);
  }

  /* ---------------------------------------------------------------- 对外 */

  return {
    V, PACE, SPEED, CAP, POST_SPEED, GRADE, WEATHER, K_NAME,
    load, row, unit, control, boundary, snapshot, placesIn, resolve,
    era, eraList, eraUnits, eraTree,
    elevAt, segProfile, mtnPath, profile,
    route, paceOptions, travelDays, nearestNode,
    hav, havDeg, liKmFor, liOf, dirOf, alive, maybeAlive, spanUnknownOf,
    kinds: () => ['none', 'county_seat', 'prefecture_seat', 'province_seat', 'pass', 'port', 'ferry', 'city'],
    meta: () => ({ version: C && C.dataVersion, gaps: C && C.gaps, register: C && C.register }),
    _internals: () => ({ G, T, C, NODES, ADJ })
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = ATLAS;
