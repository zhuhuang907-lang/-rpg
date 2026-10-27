// 测试用的假府省界压缩包（格式照 CHGIS V6 的 .shp/.dbf，西安 80 高斯-克吕格投影；界址是随手画的方块，不是谭图数据）
const { Buffer } = require('buffer');
function gkFwd(lon, lat) {
  const a = 6378140, f = 1 / 298.257, e2 = f * (2 - f), ep2 = e2 / (1 - e2), p = lat * Math.PI / 180, l = (lon - 111) * Math.PI / 180;
  const N = a / Math.sqrt(1 - e2 * Math.sin(p) ** 2), T = Math.tan(p) ** 2, C = ep2 * Math.cos(p) ** 2, A = l * Math.cos(p);
  const M = a * ((1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256) * p - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * p) + (15 * e2 * e2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * p) - (35 * e2 ** 3 / 3072) * Math.sin(6 * p));
  const x = N * (A + (1 - T + C) * A ** 3 / 6 + (5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5 / 120);
  const y = M + N * Math.tan(p) * (A * A / 2 + (5 - T + 9 * C + 4 * C * C) * A ** 4 / 24 + (61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6 / 720);
  return [x + 19500000, y];
}
function dbf(fields, rows) {
  const hl = 32 + 32 * fields.length + 1, rl = 1 + fields.reduce((s, f) => s + f[1], 0), b = Buffer.alloc(hl + rl * rows.length + 1, 0x20);
  b.fill(0, 0, hl); b[0] = 3; b.writeUInt32LE(rows.length, 4); b.writeUInt16LE(hl, 8); b.writeUInt16LE(rl, 10);
  fields.forEach(([n, l], i) => { b.write(n, 32 + 32 * i, 'latin1'); b[32 + 32 * i + 11] = 67; b[32 + 32 * i + 16] = l; });
  b[hl - 1] = 0x0d;
  rows.forEach((r, i) => { let o = hl + i * rl + 1; fields.forEach(([n, l]) => { const v = Buffer.from(String(r[n] ?? ''), 'utf8'); v.copy(b, o, 0, Math.min(l, v.length)); o += l; }); });
  b[b.length - 1] = 0x1a; return b;
}
function shp(boxes) {
  const recs = boxes.map((bx, i) => { const [a, b, c, d] = bx, R = [[a, d], [c, d], [c, b], [a, b], [a, d]].map(([lo, la]) => gkFwd(lo, la));
    const body = Buffer.alloc(44 + 4 + R.length * 16); body.writeInt32LE(5, 0); body.writeInt32LE(1, 36); body.writeInt32LE(R.length, 40); body.writeInt32LE(0, 44);
    R.forEach(([x, y], k) => { body.writeDoubleLE(x, 48 + k * 16); body.writeDoubleLE(y, 56 + k * 16); });
    const h = Buffer.alloc(8); h.writeInt32BE(i + 1, 0); h.writeInt32BE(body.length / 2, 4); return Buffer.concat([h, body]); });
  const hd = Buffer.alloc(100); hd.writeInt32BE(9994, 0); const all = Buffer.concat([hd, ...recs]); all.writeInt32BE(all.length / 2, 24); all.writeInt32LE(1000, 28); all.writeInt32LE(5, 32); return all;
}
function zip(files) {
  const loc = [], cen = []; let off = 0;
  for (const [name, data] of files) { const nb = Buffer.from(name), l = Buffer.alloc(30); l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(20, 4); l.writeUInt32LE(data.length, 18); l.writeUInt32LE(data.length, 22); l.writeUInt16LE(nb.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt32LE(data.length, 20); c.writeUInt32LE(data.length, 24); c.writeUInt16LE(nb.length, 28); c.writeUInt32LE(off, 42);
    loc.push(l, nb, data); cen.push(c, nb); off += 30 + nb.length + data.length; }
  const cd = Buffer.concat(cen), e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(files.length, 8); e.writeUInt16LE(files.length, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...loc, cd, e]);
}
const PREF = [['江宁府', '府', [118.35, 31.25, 119.25, 32.25], [118.769, 32.053]], ['扬州府', '府', [119.0, 32.25, 120.9, 33.4], [119.437, 32.391]], ['镇江府', '府', [119.25, 31.6, 119.9, 32.25], [119.45, 32.2]],
  ['常州府', '府', [119.9, 31.3, 120.5, 32.25], [119.95, 31.78]], ['苏州府', '府', [120.5, 30.8, 121.2, 32.0], [120.6, 31.3]]];
const KIND = { 2966717: 'pref', 2966689: 'pref', 2966720: 'prov', 2966688: 'prov', 2966725: 'pts', 2966691: 'pts' };
module.exports = id => {
  const k = KIND[id]; if (!k) return null;
  if (k === 'pref') return zip([['fix_pref_pgn.shp', shp(PREF.map(p => p[2]))], ['fix_pref_pgn.dbf', dbf([['NAME_CH', 35], ['TYPE_CH', 17], ['LEV1_CH', 17]], PREF.map(p => ({ NAME_CH: p[0], TYPE_CH: p[1], LEV1_CH: '江苏' })))]]);
  if (k === 'prov') return zip([['fix_prov_pgn.shp', shp([[118.35, 30.8, 121.2, 33.4]])], ['fix_prov_pgn.dbf', dbf([['NAME_CH', 35]], [{ NAME_CH: '江苏' }])]]);
  return zip([['fix_pref_pts.dbf', dbf([['NAME_CH', 20], ['LEV1_CH', 17], ['X_COORD', 19], ['Y_COORD', 19]], PREF.map(p => ({ NAME_CH: p[0], LEV1_CH: '江苏', X_COORD: p[3][0], Y_COORD: p[3][1] })))]]);
};
