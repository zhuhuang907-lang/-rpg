'use strict';
/**
 * 地理：两地距离按经纬度大圆距离 × 道路曲折系数计算，行军日数按路况折算。
 * 依据：唐《公式令》「马日七十里，步及驴五十里，车三十里」；
 *       辎重随行的大军通常按「日行三十里」计（《汉书·晁错传》等常见说法）。
 * 一里按各朝里制折算（汉约 415 米，唐宋约 540~560 米），换算在剧本里给出。
 */

const ROUTE_TYPES = {
  road: { label: '官道', kmPerDay: 15, bend: 1.25, haul: 15, desc: '平原大道，辎重车可行' },
  river: { label: '水路', kmPerDay: 28, bend: 1.15, haul: 60, desc: '舟船运兵运粮，顺流更快，运耗最省' },
  ford: { label: '渡口', kmPerDay: 13, bend: 1.25, haul: 18, crossing: '河', desc: '须渡大河，半渡可击' },
  jiang: { label: '渡江', kmPerDay: 18, bend: 1.2, haul: 40, crossing: '江', needsNavy: true, desc: '横渡长江，无水军难以强渡' },
  pass: { label: '关隘', kmPerDay: 10, bend: 1.4, haul: 10, desc: '险关要道，守易攻难' },
  mountain: { label: '山道', kmPerDay: 7, bend: 1.6, haul: 7, desc: '栈道或山径，运粮极难' },
  steppe: { label: '草原', kmPerDay: 22, bend: 1.15, haul: 12, desc: '骑兵便于驰骋，但无城可依' },
};

function haversineKm(a, b) {
  const R = 6371;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** 由剧本的 regions + routes 建图；每条边带 公里、日数、运耗系数 */
function buildGraph(scn) {
  const byId = Object.fromEntries(scn.regions.map(r => [r.id, r]));
  const adj = {};
  for (const r of scn.regions) adj[r.id] = [];
  for (const [a, b, type = 'road', note = ''] of scn.routes) {
    if (!byId[a] || !byId[b]) throw new Error(`剧本 ${scn.id} 的道路引用了不存在的地点：${a} - ${b}`);
    const t = ROUTE_TYPES[type];
    if (!t) throw new Error(`未知路况 ${type}`);
    const km = Math.round(haversineKm(byId[a], byId[b]) * t.bend);
    const days = Math.max(1, Math.round(km / t.kmPerDay));
    const edge = { type, km, days, note };
    adj[a].push({ to: b, ...edge });
    adj[b].push({ to: a, ...edge });
  }
  return adj;
}

/**
 * 最短行军路线（按日数）。
 * passable(id) 决定中途能否穿过某地（自己或盟友的地盘才能借道），终点不受限。
 */
function shortestPath(adj, from, to, passable = () => true) {
  if (from === to) return { path: [from], days: 0, legs: [] };
  const dist = { [from]: 0 };
  const prev = {};
  const done = new Set();
  const q = [[0, from]];
  while (q.length) {
    q.sort((x, y) => x[0] - y[0]);
    const [d, u] = q.shift();
    if (done.has(u)) continue;
    done.add(u);
    if (u === to) break;
    if (u !== from && !passable(u)) continue; // 不能穿过此地，只能停在这里
    for (const e of adj[u] || []) {
      const nd = d + e.days;
      if (dist[e.to] == null || nd < dist[e.to]) {
        dist[e.to] = nd;
        prev[e.to] = { from: u, edge: e };
        q.push([nd, e.to]);
      }
    }
  }
  if (dist[to] == null) return null;
  const legs = [];
  let cur = to;
  while (cur !== from) {
    const p = prev[cur];
    legs.unshift({ from: p.from, to: cur, ...p.edge });
    cur = p.from;
  }
  return { path: [from, ...legs.map(l => l.to)], days: dist[to], legs };
}

function edgeBetween(adj, a, b) {
  return (adj[a] || []).find(e => e.to === b) || null;
}

module.exports = { ROUTE_TYPES, haversineKm, buildGraph, shortestPath, edgeBetween };
