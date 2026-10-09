'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'data', 'scenarios');

const META = {
  xining: {
    id: 'xining',
    title: '熙宁变法',
    span: '熙宁元年（1068）秋 — 熙宁九年（1076）',
    blurb: '新君即位第二年，朝廷缺钱，河北遭灾。一个姓王的翰林学士刚刚越次入对。',
  },
};

const cache = {};

function load(id) {
  if (cache[id]) return cache[id];
  const dir = path.join(ROOT, id);
  if (!fs.existsSync(dir)) throw new Error('没有这个剧本：' + id);
  const mainline = require(path.join(dir, 'mainline.js'));
  const guard = require(path.join(dir, 'guard.js'));
  const identities = {};
  for (const f of fs.readdirSync(path.join(dir, 'identities'))) {
    if (!f.endsWith('.js')) continue;
    const idn = require(path.join(dir, 'identities', f));
    identities[idn.id] = idn;
  }
  const weather = fs.existsSync(path.join(dir, 'weather.js')) ? require(path.join(dir, 'weather.js')) : null;
  const daily = fs.existsSync(path.join(dir, 'daily.js')) ? require(path.join(dir, 'daily.js')) : null;
  const deps = fs.existsSync(path.join(dir, 'deps.js')) ? require(path.join(dir, 'deps.js')) : {};
  cache[id] = { ...META[id], mainline, guard, identities, weather, daily, deps };
  return cache[id];
}

function list() {
  return Object.keys(META).map(id => {
    const s = load(id);
    return {
      id, title: s.title, span: s.span, blurb: s.blurb,
      identities: Object.values(s.identities).map(i => ({
        id: i.id, name: i.name, title: i.title, idm: i.idm, place: i.place, age: i.age, unit: i.unit,
      })),
    };
  });
}

module.exports = { load, list };
