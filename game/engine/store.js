'use strict';
/** 存档：一局一个 JSON 文件，放在 saves/ 下。 */
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, '..', 'saves');
fs.mkdirSync(DIR, { recursive: true });

function safeId(id) {
  if (!/^[a-f0-9]{6,32}$/.test(String(id || ''))) throw new Error('存档编号不对');
  return id;
}
function save(s) {
  fs.writeFileSync(path.join(DIR, safeId(s.id) + '.json'), JSON.stringify(s));
}
function load(id) {
  const f = path.join(DIR, safeId(id) + '.json');
  if (!fs.existsSync(f)) throw new Error('找不到这个存档');
  return JSON.parse(fs.readFileSync(f, 'utf8'));
}
function list() {
  return fs.readdirSync(DIR).filter(f => f.endsWith('.json')).map(f => {
    try {
      const s = JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8'));
      return { id: s.id, scenario: s.scenario, identity: s.identity, turn: s.turn, updated: s.updated, last: (s.story[s.story.length - 1] || {}).date || '' };
    } catch { return null; }
  }).filter(Boolean).sort((a, b) => b.updated - a.updated);
}
function remove(id) {
  const f = path.join(DIR, safeId(id) + '.json');
  if (fs.existsSync(f)) fs.unlinkSync(f);
}

module.exports = { save, load, list, remove };
