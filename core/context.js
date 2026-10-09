'use strict';
/** 把存档（动态）与剧本（静态：经纬度、地形、道路）拼在一起，供各模块使用。 */
const { buildGraph } = require('./geo');
const scenarios = require('../scenarios');

const graphCache = new Map();

function ctxOf(state) {
  const scn = scenarios.get(state.meta.scenarioId);
  if (!scn) throw new Error('找不到剧本：' + state.meta.scenarioId);
  let graph = graphCache.get(scn.id);
  if (!graph) { graph = buildGraph(scn); graphCache.set(scn.id, graph); }
  return {
    state, scn, graph,
    rs: id => scn.regionById[id],          // 静态地块信息
    zoneOf: id => scn.regionById[id].zone,
  };
}

module.exports = { ctxOf };
