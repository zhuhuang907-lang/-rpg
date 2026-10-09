'use strict';
/** 动态生成的势力（民变、叛将、割据）与军队 */
const { rel } = require('./helpers');

const REBEL_COLORS = ['#7a6a55', '#6b5d7a', '#5d7a6b', '#8a5a5a', '#5a6f8a', '#7f7a4a'];

function newArmyId(state) {
  state.counters.army = (state.counters.army || 0) + 1;
  return 'A' + state.counters.army;
}

function addArmy(state, { faction, loc, troops, general, name, training = 0.5, morale = 0.7 }) {
  const id = newArmyId(state);
  state.armies[id] = {
    id, faction, loc, troops: Math.round(troops), general: general || '偏将', name: name || ((general || '偏将') + '部'),
    training, morale, route: [], dest: null, legDone: 0, siegeMode: 'blockade', hunger: 0, createdTurn: state.turn,
  };
  const f = state.factions[faction];
  if (f && general) {
    const g = f.generals.find(x => x.name === general);
    if (g) g.busy = id;
  }
  return state.armies[id];
}

function spawnFaction(state, { id, name, leader, color, origin = 'north', regions = [], hostileTo = [], minor = true, generals = [] }) {
  if (state.factions[id]) id = id + '-' + state.turn;
  const n = Object.keys(state.factions).length;
  state.factions[id] = {
    id, name, short: name.slice(0, 2), color: color || REBEL_COLORS[n % REBEL_COLORS.length],
    leader: leader || { name: '（首领不详）', born: null, title: '' },
    capital: regions[0] || null, money: 0, grain: 0, navy: 0.1, origin,
    traits: { aggression: 0.3, caution: 0.6 }, generals: generals.map(g => ({ skill: 45, ...g, busy: false, alive: true })),
    advisors: [], court: { support: 50 }, alive: true, isPlayer: false, minor, dynamic: true,
    mods: { incomeMoneyPct: 0, incomeGrainPct: 0, upkeepPct: 0 }, tempMods: [], cooldowns: {}, fixedCost: 0,
    stats: { won: 0, lost: 0 }, intents: [],
  };
  for (const rid of regions) state.regions[rid].owner = id;
  for (const h of hostileTo) { const r = rel(state, id, h); r.war = true; r.v = -80; r.ally = false; }
  return state.factions[id];
}

module.exports = { addArmy, spawnFaction, newArmyId };
