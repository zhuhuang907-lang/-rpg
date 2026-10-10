'use strict';
/**
 * 把"现成剧本"（data/scenarios/）和"开局检索生成的世界"（存档里的 s.world）统一成同一种形状，
 * 并合并上游戏途中续查到的史事（s.ext）。引擎其余部分只认这个形状：
 *   { kind, title, eras, mainline, deps, guard, identity, daily, weather, facts, horizon }
 */
const scenario = require('./scenario');
const guard = require('./guard');

function get(s) {
  const ext = s.ext || { mainline: [], guard: { terms: [], banned: [] }, eras: [], sources: [] };
  if (s.world) {
    const w = s.world;
    return {
      kind: 'dynamic', title: w.title, dynasty: w.dynasty,
      eras: [...(w.eras || []), ...(ext.eras || [])].sort((a, b) => a.start - b.start),
      mainline: [...w.mainline, ...ext.mainline], deps: w.deps || {},
      guard: guard.merge(w.guard, ext.guard), identity: w.identity, hook: w.hook,
      daily: null, weather: null, facts: w.facts || [], sources: [...(w.sources || []), ...(ext.sources || [])],
      horizon: ext.horizon || w.horizon, searched: w.searched,
    };
  }
  const base = scenario.load(s.scenario);
  return {
    kind: 'static', title: base.title, dynasty: base.dynasty,
    eras: [...base.eras, ...(ext.eras || [])].sort((a, b) => a.start - b.start),
    mainline: [...base.mainline, ...ext.mainline], deps: base.deps,
    guard: guard.merge(base.guard, ext.guard), identity: base.identities[s.identity],
    daily: base.daily, weather: base.weather, facts: base.facts || [], sources: ext.sources || [],
    horizon: ext.horizon || base.horizon, searched: true,
  };
}

module.exports = { get };
