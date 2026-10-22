/* ========== 捏脸（「宋韵 · 捏面」，玩家做的，原样并进游戏）：画主角与身边人的画像；可随机、可细调，存在存档的 face 里 ==========
   绘图照原作；改动：不占全局变量（FACE 一个名字）、可画到任意画布、随机可按种子（同一个人每次同一张脸）、按朝代身份挑衣冠、补了清代男子的瓜皮帽与长袍马褂 */
const FACE = (() => {
  const W = 480, H = 680;
  let ctx = null, state = null, rnd = Math.random;
  const seededRnd = seed => { let h = 2166136261; for (const c of String(seed)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };

  /* ================= 选项池 ================= */
  const BROW_F = ['远山眉', '柳叶眉', '八字眉', '一字眉', '剑眉', '倒晕眉', '拂云眉', '新月眉'];
  const BROW_M = ['剑眉', '一字眉', '卧蚕眉', '浓眉', '八字眉', '柳叶眉', '远山眉', '倒八字眉'];
  const EYE_ALL = ['杏眼', '丹凤眼', '狐狸眼', '圆眼', '细长眼', '桃花眼', '瑞凤眼', '三角眼'];
  const HAIR_F = ['同心髻', '高髻', '堕马髻', '双丫髻', '包髻', '垂鬟分肖髻', '慵妆髻', '十字髻', '盘福龙', '流苏髻'];
  const HAIR_M = ['束发', '道髻', '散发', '垂髻', '半束'];
  const BANGS_F = ['中分', '齐刘海', '八字', '无', '垂丝'];
  const BANGS_M = ['中分', '无', '散鬓', '八字'];
  const OUTFIT_F = ['褙子', '襦裙', '大袖衫', '袄裙', '半臂襦裙', '披帛衫裙', '衫裙', '直领对襟', '抹胸褙子'];
  const OUTFIT_M = ['圆领袍', '直裰', '道袍', '鹤氅', '襕衫', '深衣', '直身', '氅衣', '短褐', '半臂直裰', '长袍马褂'];
  const HEAD_F = ['无', '珠花', '步摇', '玉钗', '珍珠冠', '花冠', '冠梳', '幂篱'];
  const HEAD_M = ['无', '幞头', '东坡巾', '幅巾', '道冠', '乌纱帽', '纶巾', '逍遥巾', '瓜皮帽'];
  const EARR_F = ['无', '珍珠', '玉坠', '金铃'];
  const EARR_M = ['无'];
  const BEARDS = ['无', '短髭', '八字胡', '山羊胡', '络腮胡', '长髯', '三绺须'];
  const HUADIAN = ['无', '梅花', '水滴', '月牙', '珍珠'];
  const WAIST = ['无', '玉带', '丝绦', '革带', '玉佩', '绦环'];

  /* ================= 默认状态 ================= */
  const DEFAULT = {
    gender: 'female', skinTone: '#f4ded1',
    faceW: 46, faceH: 50, jawW: 42, chinSharp: 58, cheek: 48, bodyW: 50,
    browStyle: '远山眉', browAngle: 50, browThick: 40, browLen: 50, browY: 50, browColor: '#3a2f2a',
    eyeStyle: '杏眼', eyeSize: 48, eyeHeight: 46, eyeTilt: 56, eyeSpace: 50, pupilSize: 50, dblLid: 1,
    noseH: 50, noseW: 45, noseTip: 50,
    mouthW: 45, lipUp: 45, lipDown: 50, mouthCorner: 56, lipColor: '#b8556a',
    earSize: 50, earY: 50,
    beard: '无', beardColor: '#2b2320',
    hairStyle: '同心髻', bangs: '中分', hairVol: 50, hairColor: '#2b2320',
    huadian: '梅花', xihong: 25, blush: 42,
    outfit: '褙子', colorMain: '#a8c0b2', colorSub: '#f4ece0',
    headwear: '珠花', earring: '珍珠', waist: '无',
  };
  const GENDER_DEFAULTS = {
    female: { browStyle: '远山眉', eyeStyle: '杏眼', hairStyle: '同心髻', bangs: '中分', outfit: '褙子', headwear: '珠花', earring: '珍珠', lipColor: '#b8556a', browThick: 40, beard: '无', huadian: '梅花', xihong: 25, blush: 42, skinTone: '#f4ded1', waist: '丝绦' },
    male: { browStyle: '剑眉', eyeStyle: '丹凤眼', hairStyle: '束发', bangs: '无', outfit: '直裰', headwear: '幞头', earring: '无', lipColor: '#9c6a58', browThick: 64, beard: '短髭', huadian: '无', xihong: 0, blush: 8, skinTone: '#e8c8b0', waist: '革带' },
  };

  /* ================= 工具 ================= */
  function shade(hex, amt) {
    const n = parseInt(String(hex || '#888888').slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.max(0, Math.min(255, r + amt)); g = Math.max(0, Math.min(255, g + amt)); b = Math.max(0, Math.min(255, b + amt));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  const pick = a => a[Math.floor(rnd() * a.length)];
  const randInt = (a, b) => a + Math.floor(rnd() * (b - a + 1));

  /* ================= 度量 ================= */
  function metrics() {
    const s = state, male = s.gender === 'male', cx = W / 2;
    const rx = (male ? 57 : 56) + (s.faceW - 50) * 0.42, ry = (male ? 94 : 92) + (s.faceH - 50) * 0.36, cy = 300;
    return { cx, cy, rx, ry, top: cy - ry, bottom: cy + ry, jaw: (male ? 0.68 : 0.60) + (s.jawW - 50) * 0.0055, chin: (male ? 0.11 : 0.15) + (s.chinSharp - 50) * 0.0033, k: 1 + (s.cheek - 50) * 0.004, male };
  }
  function skinSet() { const b = state.skinTone; return { light: shade(b, 16), mid: b, dark: shade(b, -22) }; }

  /* ================= 背景 ================= */
  const noise = []; { const r0 = seededRnd('宋韵'); for (let i = 0; i < 1000; i++) noise.push([r0() * W, r0() * H, r0() * 0.035 + 0.008]); }
  function backdrop() {
    const g = ctx.createRadialGradient(W / 2, 230, 60, W / 2, 340, 470);
    g.addColorStop(0, '#fdfaf3'); g.addColorStop(0.55, '#f4ece0'); g.addColorStop(1, '#e2d6c2');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); for (const [x, y, a] of noise) { ctx.globalAlpha = a; ctx.fillStyle = '#8a7a5f'; ctx.fillRect(x, y, 1.4, 1.4); } ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.13; ctx.fillStyle = '#6f8d81'; ctx.beginPath(); ctx.moveTo(-30, 600);
    ctx.bezierCurveTo(70, 500, 140, 555, 215, 512); ctx.bezierCurveTo(295, 468, 355, 540, 510, 500); ctx.lineTo(510, 720); ctx.lineTo(-30, 720); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.08; ctx.fillStyle = '#3f5348'; ctx.beginPath(); ctx.moveTo(-30, 640);
    ctx.bezierCurveTo(110, 570, 190, 620, 260, 585); ctx.bezierCurveTo(340, 545, 400, 610, 510, 578); ctx.lineTo(510, 720); ctx.lineTo(-30, 720); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.save(); ctx.strokeStyle = 'rgba(150,128,96,0.26)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(W / 2, 300, 230, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(150,128,96,0.13)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.arc(W / 2, 300, 223, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }

  /* ================= 脸 ================= */
  function facePath(m) {
    const { cx, cy, rx, ry, jaw, chin, k } = m;
    ctx.beginPath(); ctx.moveTo(cx, cy - ry);
    ctx.bezierCurveTo(cx + rx * 0.60, cy - ry, cx + rx * 1.0 * k, cy - ry * 0.40, cx + rx * k, cy - ry * 0.04);
    ctx.bezierCurveTo(cx + rx * k, cy + ry * 0.24, cx + rx * jaw, cy + ry * 0.52, cx + rx * jaw * 0.85, cy + ry * 0.72);
    ctx.bezierCurveTo(cx + rx * jaw * 0.60, cy + ry * 0.90, cx + rx * chin * 1.15, cy + ry * 1.0, cx, cy + ry);
    ctx.bezierCurveTo(cx - rx * chin * 1.15, cy + ry * 1.0, cx - rx * jaw * 0.60, cy + ry * 0.90, cx - rx * jaw * 0.85, cy + ry * 0.72);
    ctx.bezierCurveTo(cx - rx * jaw, cy + ry * 0.52, cx - rx * k, cy + ry * 0.24, cx - rx * k, cy - ry * 0.04);
    ctx.bezierCurveTo(cx - rx * 1.0 * k, cy - ry * 0.40, cx - rx * 0.60, cy - ry, cx, cy - ry);
    ctx.closePath();
  }
  function drawFace(m) {
    const sc = skinSet();
    ctx.save(); ctx.shadowColor = 'rgba(150,105,85,0.32)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 4; facePath(m);
    const g = ctx.createLinearGradient(0, m.top, 0, m.bottom); g.addColorStop(0, sc.light); g.addColorStop(0.50, sc.mid); g.addColorStop(1, sc.dark);
    ctx.fillStyle = g; ctx.fill(); ctx.restore();
    ctx.save(); facePath(m); ctx.clip();
    const sg = ctx.createLinearGradient(m.cx - m.rx, 0, m.cx + m.rx, 0);
    sg.addColorStop(0, 'rgba(180,120,95,0.20)'); sg.addColorStop(0.18, 'rgba(180,120,95,0)'); sg.addColorStop(0.82, 'rgba(180,120,95,0)'); sg.addColorStop(1, 'rgba(180,120,95,0.20)');
    ctx.fillStyle = sg; ctx.fillRect(m.cx - m.rx * 1.3, m.top - 10, m.rx * 2.6, m.ry * 2.3); ctx.restore();
  }

  /* ================= 耳 ================= */
  function ears(m) {
    const s = state, { cx, cy, rx, ry } = m;
    const ew = 8 + (s.earSize - 50) * 0.075, eh = 18 + (s.earSize - 50) * 0.11, ey = cy + ry * 0.04 + (s.earY - 50) * 0.45, sc = skinSet();
    [-1, 1].forEach(sx => {
      const x = cx + sx * (rx * 0.93);
      ctx.beginPath(); ctx.ellipse(x, ey, ew, eh, sx * 0.14, 0, Math.PI * 2); ctx.fillStyle = sc.mid; ctx.fill(); ctx.strokeStyle = 'rgba(160,110,92,0.42)'; ctx.lineWidth = 1; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x + sx * 1.6, ey - 1, ew * 0.42, eh * 0.48, sx * 0.14, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(160,110,92,0.38)'; ctx.stroke();
    });
    return { ey, eh, x: rx * 0.93 };
  }

  /* ================= 腮红 / 斜红 / 花钿 ================= */
  function blush(m) {
    const a = state.blush / 100; if (a < 0.02) return;
    [-1, 1].forEach(sx => {
      const x = m.cx + sx * m.rx * 0.56, y = m.cy + m.ry * 0.24, g = ctx.createRadialGradient(x, y, 2, x, y, m.rx * 0.66);
      g.addColorStop(0, `rgba(214,108,108,${0.40 * a})`); g.addColorStop(0.55, `rgba(214,108,108,${0.15 * a})`); g.addColorStop(1, 'rgba(214,108,108,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, m.rx * 0.66, m.ry * 0.44, 0, 0, Math.PI * 2); ctx.fill();
    });
  }
  function xihong(m) {
    const a = state.xihong / 100; if (a < 0.02) return;
    ctx.save(); ctx.strokeStyle = `rgba(192,88,95,${0.52 * a})`; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
    [-1, 1].forEach(sx => { const x = m.cx + sx * m.rx * 0.70, y = m.cy - m.ry * 0.11; ctx.beginPath(); ctx.moveTo(x, y - 13); ctx.quadraticCurveTo(x + sx * 8, y, x, y + 13); ctx.stroke(); });
    ctx.restore();
  }
  function huadian(m) {
    const t = state.huadian; if (t === '无') return;
    const x = m.cx, y = m.cy - m.ry * 0.66, c = 'rgba(198,66,80,0.88)';
    if (t === '梅花') { ctx.fillStyle = c; for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + i * Math.PI * 2 / 5; ctx.beginPath(); ctx.arc(x + Math.cos(a) * 4.6, y + Math.sin(a) * 4.6, 2.7, 0, Math.PI * 2); ctx.fill(); } ctx.beginPath(); ctx.arc(x, y, 1.9, 0, Math.PI * 2); ctx.fill(); }
    else if (t === '水滴') { ctx.beginPath(); ctx.moveTo(x, y - 7); ctx.bezierCurveTo(x + 5.5, y - 1.5, x + 4.5, y + 6, x, y + 6); ctx.bezierCurveTo(x - 4.5, y + 6, x - 5.5, y - 1.5, x, y - 7); ctx.fillStyle = c; ctx.fill(); }
    else if (t === '月牙') { ctx.beginPath(); ctx.arc(x, y, 5.4, Math.PI * 0.16, Math.PI * 0.84, false); ctx.strokeStyle = c; ctx.lineWidth = 2.3; ctx.lineCap = 'round'; ctx.stroke(); }
    else if (t === '珍珠') { ctx.beginPath(); ctx.arc(x, y, 3.6, 0, Math.PI * 2); ctx.fillStyle = '#fdfbf3'; ctx.fill(); ctx.strokeStyle = 'rgba(180,158,118,0.75)'; ctx.lineWidth = 0.9; ctx.stroke(); ctx.beginPath(); ctx.arc(x - 1.1, y - 1.2, 1.1, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill(); }
  }

  /* ================= 眉 ================= */
  function brows(m) {
    const s = state;
    const defs = {
      '远山眉': { head: 0.10, tail: 0.24, arch: 0.60, th: 0.80 }, '柳叶眉': { head: 0.06, tail: -0.06, arch: 0.88, th: 0.72 }, '八字眉': { head: -0.30, tail: 0.46, arch: 0.14, th: 0.90 },
      '一字眉': { head: 0.04, tail: 0.04, arch: 0.10, th: 1.05 }, '剑眉': { head: 0.16, tail: -0.42, arch: 0.16, th: 1.22 }, '倒晕眉': { head: 0.26, tail: 0.18, arch: 0.42, th: 1.62 },
      '拂云眉': { head: 0.32, tail: -0.34, arch: 1.02, th: 0.66 }, '新月眉': { head: 0.20, tail: -0.02, arch: 0.98, th: 0.68 }, '卧蚕眉': { head: 0.10, tail: -0.12, arch: 1.10, th: 1.35 },
      '浓眉': { head: 0.08, tail: -0.10, arch: 0.52, th: 1.85 }, '倒八字眉': { head: -0.42, tail: -0.20, arch: 0.46, th: 0.95 },
    };
    const d = defs[s.browStyle] || defs['柳叶眉'];
    const bl = 46 + (s.browLen - 50) * 0.36, by = m.cy - m.ry * 0.44 + (s.browY - 50) * 0.5, th = (5.4 + (s.browThick - 50) * 0.14) * d.th, ang = (s.browAngle - 50) * 0.0055, bx = m.rx * 0.44 + (s.eyeSpace - 50) * 0.12;
    ctx.save(); ctx.globalAlpha = 0.90; ctx.fillStyle = s.browColor;
    [-1, 1].forEach(sx => {
      const hx = m.cx + sx * (bx - bl * 0.46), tx = m.cx + sx * (bx + bl * 0.54), hY = by + d.head * bl * 0.30 + sx * ang * bl * 0.4, tY = by + d.tail * bl * 0.30 - sx * ang * bl * 0.4, mY = Math.min(hY, tY) - d.arch * bl * 0.30, midX = (hx + tx) / 2;
      ctx.beginPath(); ctx.moveTo(hx, hY - th * 0.45); ctx.quadraticCurveTo(midX, mY - th * 0.42, tx, tY); ctx.quadraticCurveTo(midX, mY + th * 0.58, hx, hY + th * 0.45); ctx.closePath(); ctx.fill();
    });
    ctx.restore();
  }

  /* ================= 眼 ================= */
  function oneEye(ox, oy, w, h, sx, tilt, s) {
    const half = w / 2, ix = ox - sx * half, iy = oy + h * 0.30, ex = ox + sx * half, ey = oy - h * 0.24 - tilt;
    const lidPath = () => { ctx.beginPath(); ctx.moveTo(ix, iy); ctx.bezierCurveTo(ix + sx * w * 0.16, iy - h * 1.78, ex - sx * w * 0.16, ey - h * 1.72, ex, ey); ctx.bezierCurveTo(ex - sx * w * 0.18, ey + h * 1.02, ix + sx * w * 0.24, iy + h * 1.12, ix, iy); ctx.closePath(); };
    lidPath(); ctx.fillStyle = '#fdfaf6'; ctx.fill();
    ctx.save(); lidPath(); ctx.clip();
    const pr = h * 1.05 * (0.82 + s.pupilSize * 0.0038), px = ox + sx * w * 0.04, py = oy - h * 0.20, ig = ctx.createRadialGradient(px, py - pr * 0.32, pr * 0.08, px, py, pr);
    ig.addColorStop(0, '#6b4a34'); ig.addColorStop(0.58, '#48301f'); ig.addColorStop(1, '#28180f');
    ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fillStyle = ig; ctx.fill();
    ctx.beginPath(); ctx.arc(px, py, pr * 0.50, 0, Math.PI * 2); ctx.fillStyle = '#170d08'; ctx.fill();
    ctx.beginPath(); ctx.arc(px - pr * 0.34, py - pr * 0.42, pr * 0.27, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill();
    ctx.beginPath(); ctx.arc(px + pr * 0.36, py + pr * 0.30, pr * 0.13, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(ix, iy); ctx.bezierCurveTo(ix + sx * w * 0.16, iy - h * 1.78, ex - sx * w * 0.16, ey - h * 1.72, ex, ey); ctx.strokeStyle = 'rgba(48,32,26,0.88)'; ctx.lineWidth = 1.7; ctx.lineCap = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + sx * w * 0.11, ey - h * 0.30); ctx.strokeStyle = 'rgba(48,32,26,0.75)'; ctx.lineWidth = 1.4; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ix + sx * w * 0.06, iy + h * 0.05); ctx.bezierCurveTo(ix + sx * w * 0.24, iy + h * 1.05, ex - sx * w * 0.18, ey + h * 0.98, ex, ey); ctx.strokeStyle = 'rgba(122,82,66,0.34)'; ctx.lineWidth = 1; ctx.stroke();
    if (s.dblLid) { ctx.beginPath(); ctx.moveTo(ix + sx * w * 0.13, iy - h * 0.58); ctx.bezierCurveTo(ix + sx * w * 0.30, iy - h * 2.02, ex - sx * w * 0.20, ey - h * 1.98, ex + sx * w * 0.02, ey - h * 0.55); ctx.strokeStyle = 'rgba(132,86,70,0.44)'; ctx.lineWidth = 1; ctx.stroke(); }
  }
  function eyes(m) {
    const s = state;
    const defs = { '杏眼': { h: 1.00, tilt: 0.00 }, '丹凤眼': { h: 0.82, tilt: 0.62 }, '狐狸眼': { h: 0.90, tilt: 0.80 }, '圆眼': { h: 1.28, tilt: -0.12 }, '细长眼': { h: 0.66, tilt: 0.26 }, '桃花眼': { h: 1.06, tilt: 0.38 }, '瑞凤眼': { h: 0.94, tilt: 0.48 }, '三角眼': { h: 0.78, tilt: 0.20 } };
    const d = defs[s.eyeStyle] || defs['杏眼'];
    const w = 30 + (s.eyeSize - 50) * 0.30, h = (10 + (s.eyeHeight - 50) * 0.10) * d.h, ex = m.rx * 0.46 + (s.eyeSpace - 50) * 0.14, ey = m.cy - m.ry * 0.10, tk = (s.eyeTilt - 50) * 0.11 + d.tilt * 7.5;
    oneEye(m.cx - ex, ey, w, h, -1, tk, s); oneEye(m.cx + ex, ey, w, h, 1, tk, s);
  }

  /* ================= 鼻 ================= */
  function nose(m) {
    const s = state, ny = m.cy + m.ry * 0.26, nw = 8 + (s.noseW - 50) * 0.10, nh = 26 + (s.noseH - 50) * 0.22;
    ctx.save(); ctx.strokeStyle = 'rgba(172,120,100,0.20)'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    [-1, 1].forEach(sx => { ctx.beginPath(); ctx.moveTo(m.cx + sx * nw * 0.55, ny - nh); ctx.quadraticCurveTo(m.cx + sx * nw * 0.98, ny - nh * 0.40, m.cx + sx * nw * 0.90, ny - 1); ctx.stroke(); });
    ctx.restore();
    ctx.beginPath(); ctx.moveTo(m.cx - 1.6, ny - nh * 0.92); ctx.lineTo(m.cx - 2.2, ny - 4); ctx.strokeStyle = 'rgba(255,248,240,0.55)'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(m.cx, ny, nw * 0.98, nw * 0.74, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(200,142,122,0.26)'; ctx.fill();
    [-1, 1].forEach(sx => { ctx.beginPath(); ctx.ellipse(m.cx + sx * nw * 0.52, ny + nw * 0.24, nw * 0.25, nw * 0.17, sx * 0.2, 0, Math.PI * 2); ctx.fillStyle = 'rgba(108,62,52,0.55)'; ctx.fill(); });
  }

  /* ================= 唇 ================= */
  function mouth(m) {
    const s = state, my = m.cy + m.ry * 0.60, mw = 26 + (s.mouthW - 50) * 0.30, uh = 5 + (s.lipUp - 50) * 0.085, dh = 7 + (s.lipDown - 50) * 0.10, cn = (s.mouthCorner - 50) * 0.09;
    const lx = m.cx - mw / 2, rx = m.cx + mw / 2, ly = my - cn * 4, ry2 = my - cn * 4;
    ctx.beginPath(); ctx.moveTo(lx, ly);
    ctx.quadraticCurveTo(m.cx - mw * 0.27, my - uh * 2.0, m.cx - mw * 0.13, my - uh * 0.72); ctx.quadraticCurveTo(m.cx, my - uh * 0.02, m.cx + mw * 0.13, my - uh * 0.72); ctx.quadraticCurveTo(m.cx + mw * 0.27, my - uh * 2.0, rx, ry2);
    ctx.quadraticCurveTo(m.cx + mw * 0.31, my + dh * 1.55, m.cx, my + dh * 1.18); ctx.quadraticCurveTo(m.cx - mw * 0.31, my + dh * 1.55, lx, ly); ctx.closePath();
    const lg = ctx.createLinearGradient(0, my - uh * 1.8, 0, my + dh * 1.3); lg.addColorStop(0, shade(s.lipColor, -26)); lg.addColorStop(0.45, s.lipColor); lg.addColorStop(1, shade(s.lipColor, 16));
    ctx.fillStyle = lg; ctx.fill();
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.quadraticCurveTo(m.cx, my + uh * 0.22, rx, ry2); ctx.strokeStyle = 'rgba(88,38,44,0.50)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(m.cx, my + dh * 0.48, mw * 0.15, dh * 0.30, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.26)'; ctx.fill();
  }

  /* ================= 须 ================= */
  function beard(m) {
    const s = state; if (s.beard === '无' || !m.male) return;
    const my = m.cy + m.ry * 0.60, col = s.beardColor;
    ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = 'round';
    if (s.beard === '短髭') { ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(m.cx - 13, my - 6); ctx.quadraticCurveTo(m.cx, my - 9, m.cx + 13, my - 6); ctx.stroke(); }
    else if (s.beard === '八字胡') { ctx.lineWidth = 3.2; [-1, 1].forEach(sx => { ctx.beginPath(); ctx.moveTo(m.cx + sx * 5, my - 6); ctx.quadraticCurveTo(m.cx + sx * 14, my - 10, m.cx + sx * 24, my - 2); ctx.stroke(); }); }
    else if (s.beard === '山羊胡') { ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(m.cx - 11, my - 7); ctx.quadraticCurveTo(m.cx, my - 10, m.cx + 11, my - 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(m.cx, my + 10); ctx.quadraticCurveTo(m.cx, my + 24, m.cx - 3, my + 36); ctx.lineWidth = 4; ctx.stroke(); }
    else if (s.beard === '络腮胡') {
      ctx.globalAlpha = 0.92; ctx.beginPath(); ctx.moveTo(m.cx - m.rx * 0.72, m.cy + m.ry * 0.10);
      ctx.bezierCurveTo(m.cx - m.rx * 0.66, m.cy + m.ry * 0.62, m.cx - m.rx * 0.28, m.cy + m.ry * 0.90, m.cx, m.cy + m.ry * 0.94); ctx.bezierCurveTo(m.cx + m.rx * 0.28, m.cy + m.ry * 0.90, m.cx + m.rx * 0.66, m.cy + m.ry * 0.62, m.cx + m.rx * 0.72, m.cy + m.ry * 0.10);
      ctx.lineTo(m.cx + m.rx * 0.60, m.cy + m.ry * 0.26); ctx.quadraticCurveTo(m.cx, m.cy + m.ry * 0.66, m.cx - m.rx * 0.60, m.cy + m.ry * 0.26); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(m.cx - 14, my - 7); ctx.quadraticCurveTo(m.cx, my - 11, m.cx + 14, my - 7); ctx.lineWidth = 3.6; ctx.stroke();
    } else if (s.beard === '长髯') {
      ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(m.cx - 13, my - 7); ctx.quadraticCurveTo(m.cx, my - 10, m.cx + 13, my - 7); ctx.stroke();
      ctx.globalAlpha = 0.94; ctx.beginPath(); ctx.moveTo(m.cx - 16, my + 8); ctx.bezierCurveTo(m.cx - 20, my + 40, m.cx - 14, my + 74, m.cx - 4, my + 100); ctx.lineTo(m.cx, my + 102); ctx.lineTo(m.cx + 4, my + 100);
      ctx.bezierCurveTo(m.cx + 14, my + 74, m.cx + 20, my + 40, m.cx + 16, my + 8); ctx.quadraticCurveTo(m.cx, my + 16, m.cx - 16, my + 8); ctx.closePath(); ctx.fill();
    } else if (s.beard === '三绺须') {
      ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(m.cx - 12, my - 7); ctx.quadraticCurveTo(m.cx, my - 10, m.cx + 12, my - 7); ctx.stroke();
      ctx.globalAlpha = 0.94;
      ctx.beginPath(); ctx.moveTo(m.cx - 13, my + 9); ctx.bezierCurveTo(m.cx - 18, my + 40, m.cx - 12, my + 66, m.cx - 5, my + 84); ctx.lineTo(m.cx - 2, my + 86); ctx.lineTo(m.cx - 2, my + 9); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(m.cx + 13, my + 9); ctx.bezierCurveTo(m.cx + 18, my + 40, m.cx + 12, my + 66, m.cx + 5, my + 84); ctx.lineTo(m.cx + 2, my + 86); ctx.lineTo(m.cx + 2, my + 9); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(m.cx - 5, my + 10); ctx.bezierCurveTo(m.cx - 7, my + 36, m.cx - 4, my + 54, m.cx, my + 68); ctx.bezierCurveTo(m.cx + 4, my + 54, m.cx + 7, my + 36, m.cx + 5, my + 10); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  /* ================= 发 ================= */
  function hairBack(m) {
    const s = state, v = 1 + (s.hairVol - 50) * 0.0035;
    if (m.male && (s.hairStyle === '束发' || s.hairStyle === '道髻' || s.hairStyle === '半束')) { ctx.beginPath(); ctx.ellipse(m.cx, m.cy - m.ry * 0.10, m.rx * 1.05 * v, m.ry * 1.03 * v, 0, 0, Math.PI * 2); ctx.fillStyle = s.hairColor; ctx.fill(); return; }
    ctx.beginPath(); ctx.ellipse(m.cx, m.cy - m.ry * 0.10, m.rx * 1.14 * v, m.ry * 1.10 * v, 0, 0, Math.PI * 2); ctx.fillStyle = s.hairColor; ctx.fill();
    ctx.save(); ctx.globalAlpha = 0.20; ctx.strokeStyle = '#8a7a6a'; ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.ellipse(m.cx, m.cy - m.ry * 0.10, m.rx * 1.10 * v - i * 3, m.ry * 1.06 * v - i * 3, 0, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); }
    ctx.restore();
  }
  function hairFront(m) {
    const s = state;
    if (m.male) {
      const { cx, cy, rx, ry, top } = m;
      ctx.beginPath(); ctx.moveTo(cx - rx * 1.02, cy - ry * 0.24);
      ctx.bezierCurveTo(cx - rx * 1.02, top - ry * 0.18, cx + rx * 1.02, top - ry * 0.18, cx + rx * 1.02, cy - ry * 0.24); ctx.lineTo(cx + rx * 0.90, cy - ry * 0.24);
      ctx.bezierCurveTo(cx + rx * 0.84, top + ry * 0.14, cx + rx * 0.40, top + ry * 0.02, cx + rx * 0.18, top + ry * 0.12); ctx.quadraticCurveTo(cx, top + ry * 0.18, cx - rx * 0.18, top + ry * 0.12);
      ctx.bezierCurveTo(cx - rx * 0.40, top + ry * 0.02, cx - rx * 0.84, top + ry * 0.14, cx - rx * 0.90, cy - ry * 0.24); ctx.closePath(); ctx.fillStyle = s.hairColor; ctx.fill();
      if (s.bangs === '散鬓') { ctx.save(); ctx.globalAlpha = 0.88; ctx.strokeStyle = s.hairColor; ctx.lineWidth = 3; ctx.lineCap = 'round'; [-1, 1].forEach(sx => { ctx.beginPath(); ctx.moveTo(cx + sx * rx * 0.98, cy - ry * 0.14); ctx.quadraticCurveTo(cx + sx * rx * 1.12, cy + ry * 0.20, cx + sx * rx * 1.00, cy + ry * 0.56); ctx.stroke(); }); ctx.restore(); }
      return;
    }
    const { cx, cy, rx, ry, top } = m, hairY = top + ry * 0.30, side = rx * 1.14;
    const bangsDef = { '中分': { mid: -0.34, side: 0.16 }, '齐刘海': { mid: 0.52, side: 0.20 }, '八字': { mid: -0.12, side: 0.44 }, '无': { mid: -0.46, side: -0.06 }, '垂丝': { mid: -0.42, side: 0.24 } };
    const bd = bangsDef[s.bangs] || bangsDef['中分'], midY = hairY + bd.mid * ry, sideY = hairY + bd.side * ry;
    ctx.beginPath(); ctx.moveTo(cx - side, cy - ry * 0.16);
    ctx.bezierCurveTo(cx - side * 0.94, top - ry * 0.30, cx + side * 0.94, top - ry * 0.30, cx + side, cy - ry * 0.16); ctx.bezierCurveTo(cx + side * 0.88, sideY, cx + rx * 0.66, midY + ry * 0.16, cx + rx * 0.30, midY + ry * 0.12);
    ctx.quadraticCurveTo(cx, midY, cx - rx * 0.30, midY + ry * 0.12); ctx.bezierCurveTo(cx - rx * 0.66, midY + ry * 0.16, cx - side * 0.88, sideY, cx - side, cy - ry * 0.16); ctx.closePath(); ctx.fillStyle = s.hairColor; ctx.fill();
    ctx.save(); ctx.globalAlpha = 0.16; ctx.strokeStyle = '#a89a88'; ctx.lineWidth = 1.6;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(cx - rx * 0.7 + i * rx * 0.46, cy - ry * 0.28); ctx.quadraticCurveTo(cx - rx * 0.5 + i * rx * 0.34, top - ry * 0.1, cx - rx * 0.28 + i * rx * 0.2, hairY - ry * 0.02); ctx.stroke(); }
    ctx.restore();
  }
  function ell(x, y, rx, ry, rot) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); ctx.fill(); }
  function hairBun(m) {
    const s = state, { cx, top } = m, c = s.hairColor, v = 1 + (s.hairVol - 50) * 0.004;
    ctx.fillStyle = c; const bx = cx, by = top - 4;
    if (m.male) {
      if (s.headwear === '瓜皮帽') return;   // 清代剃发留辫，帽子罩住
      if (s.hairStyle === '束发') { ell(bx, by - 26 * v, 22 * v, 20 * v); ctx.beginPath(); ctx.moveTo(bx - 26, by - 22); ctx.lineTo(bx + 26, by - 30); ctx.strokeStyle = '#c9a961'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.stroke(); }
      else if (s.hairStyle === '道髻') { ell(bx, by - 28 * v, 20 * v, 19 * v); ctx.beginPath(); ctx.moveTo(bx - 24, by - 24); ctx.lineTo(bx + 24, by - 32); ctx.strokeStyle = '#9ec4b4'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke(); }
      else if (s.hairStyle === '散发') { ctx.save(); ctx.globalAlpha = 0.92; for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(cx + i * m.rx * 0.36, top + 6); ctx.quadraticCurveTo(cx + i * m.rx * 0.5, top - 20, cx + i * m.rx * 0.38, top + 14); ctx.lineTo(cx + i * m.rx * 0.30, top + 20); ctx.closePath(); ctx.fill(); } ctx.restore(); }
      else if (s.hairStyle === '垂髻') { ell(bx - 26 * v, by - 6 * v, 15 * v, 16 * v); ell(bx + 26 * v, by - 6 * v, 15 * v, 16 * v); ell(bx, by - 18 * v, 20 * v, 17 * v); }
      else if (s.hairStyle === '半束') { ell(bx, by - 22 * v, 19 * v, 18 * v); ctx.beginPath(); ctx.moveTo(bx - 22, by - 18); ctx.lineTo(bx + 22, by - 24); ctx.strokeStyle = '#c9a961'; ctx.lineWidth = 2.2; ctx.lineCap = 'round'; ctx.stroke(); }
      return;
    }
    switch (s.hairStyle) {
      case '高髻': ell(bx, by - 64 * v, 48 * v, 54 * v); ell(bx, by - 22 * v, 60 * v, 28 * v); break;
      case '同心髻': ell(bx, by - 26 * v, 58 * v, 32 * v); ell(bx, by - 64 * v, 40 * v, 30 * v); ell(bx, by - 92 * v, 24 * v, 19 * v); break;
      case '堕马髻': ell(bx + 34 * v, by - 46 * v, 46 * v, 38 * v, -0.42); ell(bx - 6 * v, by - 24 * v, 56 * v, 28 * v, 0.10); break;
      case '双丫髻': ell(bx - 64 * v, by - 34 * v, 26 * v, 25 * v); ell(bx + 64 * v, by - 34 * v, 26 * v, 25 * v); ell(bx, by - 16 * v, 52 * v, 24 * v); break;
      case '包髻': ell(bx, by - 30 * v, 56 * v, 30 * v); ell(bx, by - 60 * v, 42 * v, 34 * v, 0.06); ctx.beginPath(); ctx.ellipse(bx, by - 60 * v, 44 * v, 36 * v, 0.06, Math.PI * 0.15, Math.PI * 0.85); ctx.strokeStyle = shade(c, 40); ctx.lineWidth = 4; ctx.stroke(); break;
      case '垂鬟分肖髻': ell(bx, by - 24 * v, 54 * v, 26 * v); ell(bx - 74 * v, by - 6 * v, 22 * v, 38 * v, 0.18); ell(bx + 74 * v, by - 6 * v, 22 * v, 38 * v, -0.18); break;
      case '慵妆髻': ell(bx - 10 * v, by - 30 * v, 54 * v, 34 * v, -0.16); ell(bx + 30 * v, by - 52 * v, 34 * v, 26 * v, 0.3); break;
      case '十字髻': ell(bx, by - 30 * v, 50 * v, 26 * v); ell(bx - 40 * v, by - 34 * v, 22 * v, 22 * v); ell(bx + 40 * v, by - 34 * v, 22 * v, 22 * v); ell(bx, by - 64 * v, 28 * v, 24 * v); break;
      case '盘福龙': ell(bx, by - 40 * v, 54 * v, 36 * v); ell(bx - 20 * v, by - 72 * v, 24 * v, 20 * v); ell(bx + 22 * v, by - 70 * v, 22 * v, 18 * v); break;
      case '流苏髻':
        ell(bx, by - 34 * v, 54 * v, 30 * v); ell(bx, by - 68 * v, 32 * v, 26 * v);
        ctx.save(); ctx.globalAlpha = 0.85; ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.lineCap = 'round';
        for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(bx + i * 16, by - 20 * v); ctx.quadraticCurveTo(bx + i * 22, by + 10, bx + i * 16, by + 30); ctx.stroke(); }
        ctx.restore(); break;
    }
    ctx.save(); ctx.globalAlpha = 0.85; ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.lineCap = 'round';
    [-1, 1].forEach(sx => { ctx.beginPath(); ctx.moveTo(cx + sx * m.rx * 1.05, m.cy - m.ry * 0.18); ctx.quadraticCurveTo(cx + sx * m.rx * 1.16, m.cy + m.ry * 0.18, cx + sx * m.rx * 1.02, m.cy + m.ry * 0.52); ctx.stroke(); });
    ctx.restore();
  }

  /* ================= 头饰 / 冠帽 ================= */
  function headwear(m, t) {
    const s = state; if (s.headwear === '无') return;
    const { cx, top } = m, bx = cx, by = top - 4, tm = t / 1000;
    if (m.male) {
      if (s.headwear === '幞头') {
        ctx.fillStyle = '#241f1c'; ctx.beginPath(); ctx.moveTo(bx - 62, by - 4); ctx.bezierCurveTo(bx - 66, by - 44, bx - 30, by - 62, bx, by - 62); ctx.bezierCurveTo(bx + 30, by - 62, bx + 66, by - 44, bx + 62, by - 4); ctx.quadraticCurveTo(bx, by + 6, bx - 62, by - 4); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#241f1c'; ctx.lineWidth = 4; ctx.lineCap = 'round'; [-1, 1].forEach(sx => { ctx.beginPath(); ctx.moveTo(bx + sx * 58, by - 18); ctx.quadraticCurveTo(bx + sx * 92, by - 30, bx + sx * 116, by - 8); ctx.stroke(); });
      } else if (s.headwear === '东坡巾') {
        ctx.fillStyle = '#2c2823'; ctx.beginPath(); ctx.moveTo(bx - 48, by - 2); ctx.lineTo(bx - 40, by - 56); ctx.lineTo(bx, by - 76); ctx.lineTo(bx + 40, by - 56); ctx.lineTo(bx + 48, by - 2); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(bx - 40, by - 56); ctx.lineTo(bx + 40, by - 56); ctx.strokeStyle = '#3e362e'; ctx.lineWidth = 3; ctx.stroke();
      } else if (s.headwear === '幅巾') {
        ctx.fillStyle = '#2c2823'; ctx.beginPath(); ctx.moveTo(bx - 60, by - 6); ctx.bezierCurveTo(bx - 62, by - 56, bx - 28, by - 74, bx, by - 74); ctx.bezierCurveTo(bx + 28, by - 74, bx + 62, by - 56, bx + 60, by - 6); ctx.quadraticCurveTo(bx, by + 10, bx - 60, by - 6); ctx.closePath(); ctx.fill();
        ctx.save(); ctx.globalAlpha = .8; ctx.strokeStyle = '#3e362e'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(bx - 36, by - 58); ctx.quadraticCurveTo(bx, by - 46, bx + 36, by - 58); ctx.stroke(); ctx.restore();
      } else if (s.headwear === '道冠') {
        ctx.fillStyle = '#8a6a4e'; ctx.beginPath(); ctx.moveTo(bx - 20, by - 18); ctx.lineTo(bx - 16, by - 44); ctx.lineTo(bx + 16, by - 44); ctx.lineTo(bx + 20, by - 18); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#c9a961'; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx - 26, by - 30); ctx.lineTo(bx + 26, by - 34); ctx.stroke();
      } else if (s.headwear === '乌纱帽') {
        ctx.fillStyle = '#1d1916'; ctx.beginPath(); ctx.moveTo(bx - 54, by - 2); ctx.bezierCurveTo(bx - 58, by - 48, bx - 24, by - 64, bx, by - 64); ctx.bezierCurveTo(bx + 24, by - 64, bx + 58, by - 48, bx + 54, by - 2); ctx.quadraticCurveTo(bx, by + 6, bx - 54, by - 2); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#1d1916'; ctx.lineWidth = 3.6; ctx.lineCap = 'round'; [-1, 1].forEach(sx => { ctx.beginPath(); ctx.moveTo(bx + sx * 50, by - 26); ctx.lineTo(bx + sx * 100, by - 34); ctx.stroke(); });
      } else if (s.headwear === '纶巾') {
        ctx.fillStyle = '#3a4a52'; ctx.beginPath(); ctx.moveTo(bx - 52, by - 4); ctx.bezierCurveTo(bx - 56, by - 52, bx - 24, by - 70, bx, by - 70); ctx.bezierCurveTo(bx + 24, by - 70, bx + 56, by - 52, bx + 52, by - 4); ctx.quadraticCurveTo(bx, by + 8, bx - 52, by - 4); ctx.closePath(); ctx.fill();
        ctx.save(); ctx.globalAlpha = .7; ctx.strokeStyle = '#5a6a72'; ctx.lineWidth = 1.6; [-1, 1].forEach(sx => { ctx.beginPath(); ctx.moveTo(bx + sx * 44, by + 6); ctx.quadraticCurveTo(bx + sx * 56, by + 40, bx + sx * 44, by + 66); ctx.stroke(); }); ctx.restore();
      } else if (s.headwear === '逍遥巾') {
        ctx.fillStyle = '#3a3a44'; ctx.beginPath(); ctx.moveTo(bx - 46, by - 2); ctx.lineTo(bx - 34, by - 60); ctx.lineTo(bx, by - 78); ctx.lineTo(bx + 34, by - 60); ctx.lineTo(bx + 46, by - 2); ctx.closePath(); ctx.fill();
        ctx.save(); ctx.globalAlpha = .85; ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 5; ctx.lineCap = 'round'; [-1, 1].forEach(sx => { ctx.beginPath(); ctx.moveTo(bx + sx * 40, by - 30); ctx.quadraticCurveTo(bx + sx * 70, by - 4, bx + sx * 58, by + 30); ctx.stroke(); }); ctx.restore();
      } else if (s.headwear === '瓜皮帽') {
        // 清代男子：六瓣瓜皮小帽，顶上一颗红结
        ctx.fillStyle = '#1f1b19'; ctx.beginPath(); ctx.moveTo(bx - 60, by + 4); ctx.bezierCurveTo(bx - 62, by - 46, bx - 28, by - 60, bx, by - 60); ctx.bezierCurveTo(bx + 28, by - 60, bx + 62, by - 46, bx + 60, by + 4); ctx.quadraticCurveTo(bx, by - 4, bx - 60, by + 4); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#3a332e'; ctx.lineWidth = 1.2; for (const k of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.moveTo(bx + k * 104, by + 2); ctx.quadraticCurveTo(bx + k * 50, by - 40, bx, by - 58); ctx.stroke(); }
        ctx.fillStyle = '#2a2420'; ctx.fillRect(bx - 60, by - 4, 120, 9);
        ctx.beginPath(); ctx.arc(bx, by - 62, 6, 0, Math.PI * 2); ctx.fillStyle = '#b23a3a'; ctx.fill();
      }
      return;
    }
    if (s.headwear === '珠花') {
      [[-34, -40], [0, -72], [32, -46], [-14, -18], [16, -16]].forEach(([dx, dy]) => { const x = bx + dx, y = by + dy; ctx.beginPath(); ctx.arc(x, y, 5.4, 0, Math.PI * 2); ctx.fillStyle = '#fdf8ee'; ctx.fill(); ctx.strokeStyle = 'rgba(180,158,118,0.8)'; ctx.lineWidth = 1; ctx.stroke(); ctx.beginPath(); ctx.arc(x - 1.6, y - 1.8, 1.8, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.fill(); });
    } else if (s.headwear === '步摇') {
      const sway = Math.sin(tm * 2.2) * 5;
      ctx.beginPath(); ctx.moveTo(bx - 46, by - 26); ctx.lineTo(bx + 40, by - 68); ctx.strokeStyle = '#c9a961'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.stroke();
      const px = bx + 40, py = by - 68; ctx.strokeStyle = 'rgba(200,170,110,0.9)'; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) { const ox = px - 14 + i * 14, len = 26 + i * 7; ctx.beginPath(); ctx.moveTo(ox, py); ctx.quadraticCurveTo(ox + sway * 0.4, py + len * 0.6, ox + sway, py + len); ctx.stroke(); ctx.beginPath(); ctx.arc(ox + sway, py + len, 3.6, 0, Math.PI * 2); ctx.fillStyle = i === 1 ? '#c05b6a' : '#fdf8ee'; ctx.fill(); ctx.strokeStyle = 'rgba(180,150,100,0.7)'; ctx.stroke(); ctx.strokeStyle = 'rgba(200,170,110,0.9)'; }
      ctx.beginPath(); ctx.arc(px, py, 5, 0, Math.PI * 2); ctx.fillStyle = '#e0c07a'; ctx.fill();
    } else if (s.headwear === '玉钗') {
      ctx.beginPath(); ctx.moveTo(bx - 52, by - 18); ctx.lineTo(bx + 44, by - 62); ctx.strokeStyle = '#9ec4b4'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.arc(bx + 44, by - 62, 5.5, 0, Math.PI * 2); ctx.fillStyle = '#c5e0d4'; ctx.fill(); ctx.strokeStyle = '#7ea597'; ctx.lineWidth = 1; ctx.stroke();
    } else if (s.headwear === '珍珠冠') {
      for (let i = -3; i <= 3; i++) { const x = bx + i * 16, y = by - 46 + Math.abs(i) * 7; ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fillStyle = '#fdf9f0'; ctx.fill(); ctx.strokeStyle = 'rgba(186,166,128,0.85)'; ctx.lineWidth = 1; ctx.stroke(); ctx.beginPath(); ctx.arc(x - 1.8, y - 2, 2, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,1)'; ctx.fill(); }
    } else if (s.headwear === '花冠') {
      const cols = ['#e8b8c4', '#f4dcc0', '#cfe0d4', '#e8c8d8', '#f0e4c8'];
      for (let i = 0; i < 9; i++) { const a = -Math.PI / 2 + (i - 4) * 0.30, x = bx + Math.cos(a) * 46, y = by - 40 + Math.sin(a) * 30; ctx.beginPath(); for (let k = 0; k < 5; k++) { const ka = -Math.PI / 2 + k * Math.PI * 2 / 5; ctx.arc(x + Math.cos(ka) * 4.6, y + Math.sin(ka) * 4.6, 3.1, 0, Math.PI * 2); } ctx.fillStyle = cols[i % cols.length]; ctx.fill(); }
    } else if (s.headwear === '冠梳') {
      ctx.fillStyle = '#fdf6ea'; ctx.beginPath(); ctx.ellipse(bx, by - 44, 44, 22, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(186,166,128,0.9)'; ctx.lineWidth = 1.2; for (let i = -4; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(bx + i * 10, by - 44); ctx.lineTo(bx + i * 12, by - 78); ctx.stroke(); }
    } else if (s.headwear === '幂篱') {
      ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = '#e8e0d0'; ctx.beginPath(); ctx.ellipse(bx, by - 30, 86, 44, 0, Math.PI, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(bx, by + 30, 96, 100, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(240,232,218,0.22)'; ctx.fill(); ctx.restore();
      ctx.strokeStyle = 'rgba(180,158,118,0.6)'; ctx.lineWidth = 1; for (let i = -5; i <= 5; i++) { ctx.beginPath(); ctx.moveTo(bx + i * 17, by - 30); ctx.quadraticCurveTo(bx + i * 20, by + 30, bx + i * 19, by + 100); ctx.stroke(); }
    }
  }

  /* ================= 耳饰 ================= */
  function earrings(m, earsInfo) {
    const s = state; if (s.earring === '无') return;
    const { ey, eh, x } = earsInfo;
    [-1, 1].forEach(sx => {
      const px = m.cx + sx * x, py = ey + eh * 0.86;
      if (s.earring === '珍珠') { ctx.beginPath(); ctx.arc(px, py + 4, 4.2, 0, Math.PI * 2); ctx.fillStyle = '#fdf9f0'; ctx.fill(); ctx.strokeStyle = 'rgba(186,166,128,0.85)'; ctx.lineWidth = 1; ctx.stroke(); ctx.beginPath(); ctx.arc(px - 1.2, py + 2.6, 1.4, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); }
      else if (s.earring === '玉坠') { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + 8); ctx.strokeStyle = '#c9a961'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.beginPath(); ctx.ellipse(px, py + 15, 4.5, 7.5, 0, 0, Math.PI * 2); ctx.fillStyle = '#a8ccbb'; ctx.fill(); ctx.strokeStyle = '#7ea597'; ctx.lineWidth = 1; ctx.stroke(); }
      else if (s.earring === '金铃') { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + 7); ctx.strokeStyle = '#c9a961'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.beginPath(); ctx.arc(px, py + 13, 5, 0, Math.PI * 2); ctx.fillStyle = '#d9b96a'; ctx.fill(); ctx.strokeStyle = '#a98b45'; ctx.lineWidth = 1; ctx.stroke(); }
    });
  }

  /* ================= 颈 ================= */
  function neck(m) {
    const { cx, bottom, rx } = m, nw = rx * 0.40, y0 = bottom - 34, y1 = 480, sc = skinSet();
    ctx.beginPath(); ctx.moveTo(cx - nw, y0); ctx.lineTo(cx - nw * 1.05, y1); ctx.lineTo(cx + nw * 1.05, y1); ctx.lineTo(cx + nw, y0); ctx.closePath(); ctx.fillStyle = sc.mid; ctx.fill();
    const g = ctx.createLinearGradient(0, y0, 0, y0 + 58); g.addColorStop(0, 'rgba(140,90,70,0.45)'); g.addColorStop(1, 'rgba(140,90,70,0)'); ctx.fillStyle = g; ctx.fill();
  }

  /* ================= 身体 / 服饰 ================= */
  function bodyWidth() {
    const s = state, b = 0.86 + (s.bodyW - 50) * 0.006, out = s.outfit;
    let base = 190;
    if (out === '大袖衫' || out === '鹤氅' || out === '氅衣') base = 212; else if (out === '披帛衫裙' || out === '深衣') base = 200; else if (out === '褙子' || out === '直裰' || out === '道袍') base = 186; else if (out === '短褐') base = 176;
    return base * b;
  }
  function drawBody(m) {
    const s = state, main = s.colorMain, sub = s.colorSub, dark = shade(main, -34), out = s.outfit, cx = m.cx, wide = bodyWidth();
    ctx.beginPath(); ctx.moveTo(cx - wide, 700); ctx.bezierCurveTo(cx - wide + 8, 548, cx - 124, 470, cx - 48, 434); ctx.lineTo(cx + 48, 434); ctx.bezierCurveTo(cx + 124, 470, cx + wide - 8, 548, cx + wide, 700); ctx.closePath();
    const bg = ctx.createLinearGradient(cx - wide, 0, cx + wide, 0); bg.addColorStop(0, shade(main, -18)); bg.addColorStop(0.38, main); bg.addColorStop(0.62, shade(main, 12)); bg.addColorStop(1, shade(main, -22)); ctx.fillStyle = bg; ctx.fill();
    const duijin = ['褙子', '衫裙', '直领对襟', '半臂襦裙', '抹胸褙子', '氅衣', '半臂直裰'].includes(out), yuanling = ['圆领袍', '襕衫'].includes(out);
    if (out === '长袍马褂') {
      // 清代：长袍外罩对襟马褂，立领
      ctx.beginPath(); ctx.moveTo(cx - wide * 0.86, 640); ctx.bezierCurveTo(cx - wide * 0.8, 520, cx - 110, 470, cx - 46, 440); ctx.lineTo(cx + 46, 440); ctx.bezierCurveTo(cx + 110, 470, cx + wide * 0.8, 520, cx + wide * 0.86, 640); ctx.closePath(); ctx.fillStyle = shade(main, -46); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx, 446); ctx.lineTo(cx, 640); ctx.strokeStyle = shade(main, -70); ctx.lineWidth = 2; ctx.stroke();
      for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(cx, 470 + i * 34, 3.2, 0, Math.PI * 2); ctx.fillStyle = '#c9a961'; ctx.fill(); }
      ctx.fillStyle = sub; ctx.fillRect(cx - 28, 428, 56, 14); ctx.strokeStyle = dark; ctx.lineWidth = 2; ctx.strokeRect(cx - 28, 428, 56, 14);
    } else if (yuanling) {
      ctx.beginPath(); ctx.ellipse(cx, 442, 46, 20, 0, 0, Math.PI * 2); ctx.fillStyle = sub; ctx.fill(); ctx.strokeStyle = dark; ctx.lineWidth = 6; ctx.stroke();
      if (out === '襕衫') { ctx.beginPath(); ctx.moveTo(cx - wide * 0.78, 640); ctx.lineTo(cx + wide * 0.78, 640); ctx.strokeStyle = shade(sub, -22); ctx.lineWidth = 5; ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx - wide * 0.78, 654); ctx.lineTo(cx + wide * 0.78, 654); ctx.strokeStyle = shade(sub, -38); ctx.lineWidth = 2; ctx.stroke(); }
    } else if (duijin) {
      ctx.beginPath(); ctx.moveTo(cx - 50, 432); ctx.lineTo(cx - 14, 700); ctx.lineTo(cx + 14, 700); ctx.lineTo(cx + 50, 432); ctx.closePath(); ctx.fillStyle = sub; ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx - 50, 432); ctx.lineTo(cx - 14, 700); ctx.moveTo(cx + 50, 432); ctx.lineTo(cx + 14, 700); ctx.strokeStyle = dark; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.stroke();
      if (out === '抹胸褙子') { ctx.beginPath(); ctx.moveTo(cx - 30, 470); ctx.quadraticCurveTo(cx, 486, cx + 30, 470); ctx.lineTo(cx + 26, 560); ctx.quadraticCurveTo(cx, 576, cx - 26, 560); ctx.closePath(); ctx.fillStyle = shade(main, 40); ctx.fill(); ctx.strokeStyle = 'rgba(180,158,118,0.6)'; ctx.lineWidth = 1; ctx.stroke(); }
    } else {
      ctx.beginPath(); ctx.moveTo(cx - 56, 428); ctx.lineTo(cx + 2, 552); ctx.lineTo(cx + 58, 428); ctx.closePath(); ctx.fillStyle = sub; ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx - 56, 428); ctx.lineTo(cx + 2, 552); ctx.lineTo(cx + 58, 428); ctx.strokeStyle = dark; ctx.lineWidth = 9; ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 58, 428); ctx.quadraticCurveTo(cx + 22, 522, cx - 36, 626); ctx.strokeStyle = shade(main, -50); ctx.lineWidth = 2.6; ctx.stroke();
    }
    if (['大袖衫', '鹤氅', '氅衣', '道袍'].includes(out)) { ctx.beginPath(); ctx.moveTo(cx - wide - 6, 620); ctx.quadraticCurveTo(cx - wide - 14, 700, cx - wide + 10, 700); ctx.moveTo(cx + wide + 6, 620); ctx.quadraticCurveTo(cx + wide + 14, 700, cx + wide - 10, 700); ctx.strokeStyle = shade(main, -40); ctx.lineWidth = 1.4; ctx.stroke(); }
    ctx.save(); ctx.globalAlpha = 0.15; ctx.strokeStyle = '#4a3c2a'; ctx.lineWidth = 1.4;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(cx - 110 + i * 18, 540 + i * 24); ctx.quadraticCurveTo(cx - 60 + i * 12, 562 + i * 24, cx - 20 + i * 7, 552 + i * 26); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx + 110 - i * 18, 540 + i * 24); ctx.quadraticCurveTo(cx + 60 - i * 12, 562 + i * 24, cx + 20 - i * 7, 552 + i * 26); ctx.stroke(); }
    ctx.restore();
    drawWaist(m, wide, sub, dark);
  }
  function drawWaist(m, wide, sub) {
    const s = state; if (s.waist === '无' || s.outfit === '长袍马褂') return;
    const y = 618, cx = m.cx;
    if (s.waist === '玉带') { ctx.fillStyle = '#c8dcd0'; ctx.fillRect(cx - wide * 0.72, y, wide * 1.44, 15); for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(cx - wide * 0.56 + i * wide * 0.28, y + 7.5, 6, 0, Math.PI * 2); ctx.fillStyle = '#e8f4ec'; ctx.fill(); ctx.strokeStyle = '#8fa9a0'; ctx.lineWidth = 1; ctx.stroke(); } }
    else if (s.waist === '革带') { ctx.fillStyle = '#54453a'; ctx.fillRect(cx - wide * 0.72, y, wide * 1.44, 14); ctx.fillStyle = '#c9a961'; ctx.fillRect(cx - 13, y - 2, 26, 18); ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1; ctx.strokeRect(cx - 13, y - 2, 26, 18); }
    else if (s.waist === '丝绦') {
      ctx.strokeStyle = shade(sub, -10); ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - wide * 0.7, y); ctx.lineTo(cx + wide * 0.7, y); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, y + 2, 7, 0, Math.PI * 2); ctx.fillStyle = '#c9a961'; ctx.fill();
      ctx.strokeStyle = shade(sub, -18); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, y + 8); ctx.quadraticCurveTo(cx - 10, y + 50, cx - 2, y + 80); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx, y + 8); ctx.quadraticCurveTo(cx + 12, y + 48, cx + 6, y + 78); ctx.stroke();
    } else if (s.waist === '玉佩') {
      ctx.strokeStyle = '#c9a961'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - wide * 0.7, y); ctx.lineTo(cx + wide * 0.7, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 10, y + 2); ctx.lineTo(cx - 10, y + 20); ctx.strokeStyle = '#b8a882'; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx - 10, y + 32, 11, 14, 0, 0, Math.PI * 2); ctx.fillStyle = '#b8dccc'; ctx.fill(); ctx.strokeStyle = '#7ea597'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.beginPath(); ctx.arc(cx - 10, y + 32, 4.5, 0, Math.PI * 2); ctx.strokeStyle = '#7ea597'; ctx.stroke();
    } else if (s.waist === '绦环') { ctx.strokeStyle = '#5a4a3a'; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx - wide * 0.7, y); ctx.lineTo(cx + wide * 0.7, y); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, y, 10, 0, Math.PI * 2); ctx.strokeStyle = '#d9b96a'; ctx.lineWidth = 3.4; ctx.stroke(); }
  }

  /* ================= 主绘制 ================= */
  function draw(t) {
    backdrop();
    const m = metrics();
    hairBack(m); neck(m); drawBody(m); drawFace(m);
    const earsInfo = ears(m);
    blush(m); xihong(m); huadian(m); brows(m); eyes(m); nose(m); mouth(m); beard(m);
    hairFront(m); hairBun(m); headwear(m, t || 0); earrings(m, earsInfo);
  }

  /* ================= 气韵 ================= */
  function calcTraits(st) {
    const s = st, male = s.gender === 'male', c = v => Math.max(8, Math.min(99, Math.round(v))), t = {};
    t['清雅'] = c(50 + (56 - s.faceW) * 0.45 + (56 - s.browThick) * 0.38 + (52 - s.blush) * 0.42 + (50 - s.lipDown) * 0.28 + (s.hairStyle === '同心髻' ? 7 : 0) + (s.hairStyle === '慵妆髻' ? 5 : 0) + (s.huadian === '梅花' ? 4 : 0) + (s.outfit === '直裰' ? 6 : 0));
    t['端丽'] = c(50 + (50 - Math.abs(s.faceW - 50)) * 0.62 + (50 - Math.abs(s.jawW - 50)) * 0.38 + (50 - Math.abs(s.eyeSize - 50)) * 0.32 + (50 - Math.abs(s.lipUp - 50)) * 0.30 + (s.outfit === '大袖衫' ? 6 : 0) + (s.outfit === '深衣' ? 5 : 0));
    t['灵动'] = c(46 + (s.eyeSize - 50) * 0.58 + (s.mouthCorner - 50) * 0.46 + (s.chinSharp - 50) * 0.36 + (s.eyeStyle === '圆眼' ? 12 : 0) + (s.eyeStyle === '桃花眼' ? 9 : 0) + (s.hairStyle === '双丫髻' ? 9 : 0));
    t['英气'] = c(42 + (s.jawW - 50) * 0.55 + (s.browAngle - 50) * 0.46 + (s.eyeTilt - 50) * 0.36 + (s.browStyle === '剑眉' ? 21 : 0) + (s.browStyle === '一字眉' ? 9 : 0) + (s.browStyle === '卧蚕眉' ? 11 : 0) + (s.outfit === '圆领袍' ? 9 : 0) + (s.beard === '络腮胡' ? 7 : 0) + (s.headwear === '幞头' ? 6 : 0));
    t['妩媚'] = c(42 + (s.lipDown - 50) * 0.52 + s.blush * 0.22 + (s.eyeTilt - 50) * 0.42 + s.xihong * 0.16 + (s.eyeStyle === '狐狸眼' ? 17 : 0) + (s.eyeStyle === '桃花眼' ? 13 : 0) + (s.hairStyle === '堕马髻' ? 9 : 0) + (s.headwear === '步摇' ? 6 : 0));
    if (male) { t['英气'] = Math.min(99, t['英气'] + 9); t['端丽'] = Math.min(99, t['端丽'] + 4); t['妩媚'] = Math.max(8, t['妩媚'] - 14); t['清雅'] = Math.min(99, t['清雅'] + 3); }
    else { t['妩媚'] = Math.min(99, t['妩媚'] + 7); t['英气'] = Math.max(8, t['英气'] - 9); }
    return t;
  }

  /* ================= 面板配置 ================= */
  const GROUPS = [
    { id: 'face', name: '面', items: [{ k: 'skinTone', l: '肤色', t: 'c' }, { k: 'faceW', l: '脸宽', t: 'r' }, { k: 'faceH', l: '脸长', t: 'r' }, { k: 'jawW', l: '下颌', t: 'r' }, { k: 'chinSharp', l: '下巴', t: 'r' }, { k: 'cheek', l: '面颊', t: 'r' }, { k: 'bodyW', l: '身量', t: 'r' }] },
    { id: 'brow', name: '眉', items: [{ k: 'browStyle', l: '眉形', t: 's', o: { female: BROW_F, male: BROW_M } }, { k: 'browAngle', l: '眉势', t: 'r' }, { k: 'browThick', l: '眉浓', t: 'r' }, { k: 'browLen', l: '眉长', t: 'r' }, { k: 'browY', l: '眉位', t: 'r' }, { k: 'browColor', l: '眉色', t: 'c' }] },
    { id: 'eye', name: '目', items: [{ k: 'eyeStyle', l: '眼形', t: 's', o: EYE_ALL }, { k: 'eyeSize', l: '眼长', t: 'r' }, { k: 'eyeHeight', l: '眼高', t: 'r' }, { k: 'eyeTilt', l: '眼势', t: 'r' }, { k: 'eyeSpace', l: '眼距', t: 'r' }, { k: 'pupilSize', l: '瞳仁', t: 'r' }, { k: 'dblLid', l: '双眼皮', t: 'b' }] },
    { id: 'nose', name: '鼻', items: [{ k: 'noseH', l: '鼻梁', t: 'r' }, { k: 'noseW', l: '鼻翼', t: 'r' }, { k: 'noseTip', l: '鼻尖', t: 'r' }] },
    { id: 'mouth', name: '唇', items: [{ k: 'mouthW', l: '唇宽', t: 'r' }, { k: 'lipUp', l: '上唇', t: 'r' }, { k: 'lipDown', l: '下唇', t: 'r' }, { k: 'mouthCorner', l: '嘴角', t: 'r' }, { k: 'lipColor', l: '唇色', t: 'c' }] },
    { id: 'beard', name: '须', gender: 'male', items: [{ k: 'beard', l: '须式', t: 's', o: BEARDS }, { k: 'beardColor', l: '须色', t: 'c' }] },
    { id: 'ear', name: '耳', items: [{ k: 'earSize', l: '耳形', t: 'r' }, { k: 'earY', l: '耳位', t: 'r' }] },
    { id: 'hair', name: '发', items: [{ k: 'hairStyle', l: '髻式', t: 's', o: { female: HAIR_F, male: HAIR_M } }, { k: 'bangs', l: '鬓发', t: 's', o: { female: BANGS_F, male: BANGS_M } }, { k: 'hairVol', l: '发量', t: 'r' }, { k: 'hairColor', l: '发色', t: 'c' }] },
    { id: 'makeup', name: '妆', gender: 'female', items: [{ k: 'huadian', l: '花钿', t: 's', o: HUADIAN }, { k: 'xihong', l: '斜红', t: 'r' }, { k: 'blush', l: '胭脂', t: 'r' }] },
    { id: 'cloth', name: '服', items: [{ k: 'outfit', l: '形制', t: 's', o: { female: OUTFIT_F, male: OUTFIT_M } }, { k: 'colorMain', l: '主色', t: 'c' }, { k: 'colorSub', l: '辅色', t: 'c' }, { k: 'waist', l: '腰饰', t: 's', o: WAIST }] },
    { id: 'acc', name: '饰', items: [{ k: 'headwear', l: '冠饰', t: 's', o: { female: HEAD_F, male: HEAD_M } }, { k: 'earring', l: '耳饰', t: 's', o: { female: EARR_F, male: EARR_M } }] },
  ];
  const groupsFor = g => GROUPS.filter(x => !x.gender || x.gender === g);
  const resolveOpts = (it, g) => !it.o ? [] : Array.isArray(it.o) ? it.o : (it.o[g] || it.o.female);

  /* ================= 随机：照朝代、身份挑衣冠（宋明的样子最全，清代男子换瓜皮帽、长袍马褂） ================= */
  const HAIR_COLORS = ['#2b2320', '#3a2f28', '#241d1a', '#3d3129', '#4a3a30'];
  const CLOTH_MAIN = ['#a8c0b2', '#9db8c8', '#c9b6a4', '#b8a8c0', '#d4c0a8', '#a8b8a0', '#c8a8a8', '#b0b8c8', '#d8c8b0', '#8fa9a0', '#b8c4b0', '#c8b0a0', '#a0b0b8'];
  const CLOTH_POOR = ['#8a7d6a', '#7d7466', '#6f6a5e', '#857560', '#6b6256'];
  const CLOTH_SUB = ['#f4ece0', '#fbf6ee', '#eae0d0', '#f6f0e6', '#e8e4da', '#f0e8d8'];
  const LIP_F = ['#b8556a', '#c05b6a', '#a84a5c', '#c96a72', '#b8607a', '#a84458'], LIP_M = ['#9c6a58', '#8a5a48', '#a86a5a', '#7a5040'];
  const SKINS = ['#f4ded1', '#f0d8c8', '#e8c8b0', '#e0bca0', '#f6e4d8', '#d8b090'], SKINS_SUN = ['#d8b090', '#c9a07e', '#d0a888', '#bf9672'];
  function make(gender, seed, ctx2) {
    const g = gender === 'female' ? 'female' : 'male', c2 = ctx2 || {};
    rnd = seed != null ? seededRnd(seed) : Math.random;
    const st = Object.assign({}, DEFAULT, GENDER_DEFAULTS[g], { gender: g });
    for (const gr of groupsFor(g)) for (const it of gr.items) { if (it.t === 'r') st[it.k] = randInt(20, 80); else if (it.t === 's') st[it.k] = pick(resolveOpts(it, g)); }
    const role = String(c2.role || ''), y = Number(c2.year) || 1100, age = Number(c2.age) || 30;
    const poor = /农|佃|流民|乞|仆|婢|奴|脚夫|船户|卒|兵丁|小校|匠|渔|樵|贩|伙计|佣|丫鬟|丫头/.test(role), official = /官|知县|知府|知州|县令|刺史|尚书|侍郎|御史|学士|太守|通判|主簿|县丞|大人|宰相|使/.test(role), scholar = /士|生员|秀才|举人|书生|太学|儒|进士|塾师/.test(role), monk = /僧|和尚|尼/.test(role), taoist = /道士|道人|女冠/.test(role), royal = /皇帝|天子|王|妃|后|公主/.test(role);
    st.skinTone = pick(poor ? SKINS_SUN : SKINS); st.hairColor = pick(age >= 60 ? ['#9a958e', '#b7b2aa', '#7d7770'] : age >= 48 ? ['#5b544d', '#6a625a'] : HAIR_COLORS); st.beardColor = st.hairColor;
    st.browColor = pick(['#3a2f2a', '#2e2620', '#463a30']); st.colorMain = pick(poor ? CLOTH_POOR : CLOTH_MAIN); st.colorSub = pick(CLOTH_SUB); st.lipColor = pick(g === 'male' ? LIP_M : LIP_F); st.dblLid = rnd() < 0.6 ? 1 : 0;
    if (g === 'male') {
      if (age < 20) st.beard = '无'; else if (age >= 45 && st.beard === '无') st.beard = pick(['长髯', '三绺须', '山羊胡']);
      if (poor) { st.outfit = '短褐'; st.headwear = pick(['无', '幅巾']); st.waist = pick(['无', '革带']); }
      else if (official) { st.outfit = y >= 1368 && y < 1644 ? pick(['圆领袍', '直身']) : '圆领袍'; st.headwear = y >= 1368 && y < 1644 ? '乌纱帽' : '幞头'; st.waist = pick(['玉带', '革带']); }
      else if (scholar) { st.outfit = pick(['襕衫', '直裰', '道袍']); st.headwear = pick(y >= 960 && y < 1279 ? ['东坡巾', '幅巾', '纶巾'] : ['幅巾', '纶巾', '逍遥巾']); }
      else if (taoist) { st.outfit = '道袍'; st.headwear = '道冠'; st.hairStyle = '道髻'; }
      else if (monk) { st.outfit = '直裰'; st.headwear = '无'; st.hairStyle = '散发'; st.beard = '无'; }
      if (y < 900 && !poor && !/幞头/.test(st.headwear)) st.headwear = pick(['幞头', '幅巾']);
      if (y >= 1644) { st.headwear = royal ? '无' : '瓜皮帽'; st.outfit = poor ? '短褐' : '长袍马褂'; }
    } else {
      st.xihong = y < 960 ? randInt(10, 50) : randInt(0, 15);   // 斜红多是唐人的妆
      if (y >= 1279) st.huadian = pick(['无', '无', '珍珠']);
      if (poor) { st.outfit = pick(['袄裙', '衫裙']); st.headwear = pick(['无', '玉钗']); st.huadian = '无'; st.earring = pick(['无', '无', '珍珠']); st.blush = randInt(5, 25); }
      if (age >= 50) { st.hairStyle = pick(['包髻', '高髻']); st.headwear = pick(['无', '玉钗', '冠梳']); st.huadian = '无'; st.xihong = 0; }
      if (age < 14) st.hairStyle = '双丫髻';
    }
    rnd = Math.random;
    return st;
  }
  const norm = st => Object.assign({}, DEFAULT, GENDER_DEFAULTS[(st && st.gender) === 'male' ? 'male' : 'female'], st || {});

  /* ================= 画到画布上：full 画全身，否则只取头肩；同一张脸画过的先存起来 ================= */
  const CACHE = new Map();
  function paint(canvas, st, opts = {}) {
    const key = JSON.stringify(st) + (opts.full ? 'F' : 'H');
    let img = CACHE.get(key);
    if (!img) {
      img = document.createElement('canvas'); img.width = W * 2; img.height = H * 2;
      const c0 = ctx, s0 = state; ctx = img.getContext('2d'); state = norm(st); ctx.setTransform(2, 0, 0, 2, 0, 0);
      try { draw(0); } finally { ctx = c0; state = s0; }
      CACHE.set(key, img); if (CACHE.size > 60) CACHE.delete(CACHE.keys().next().value);
    }
    const g = canvas.getContext('2d'), cw = canvas.width, ch = canvas.height;
    g.clearRect(0, 0, cw, ch);
    if (opts.full) g.drawImage(img, 0, 0, W * 2, H * 2, 0, 0, cw, ch);
    else g.drawImage(img, 80 * 2, 110 * 2, 320 * 2, 380 * 2, 0, 0, cw, ch);   // 头肩
  }
  const toPNG = st => { const c = document.createElement('canvas'); c.width = W * 2; c.height = H * 2; paint(c, st, { full: true }); return c.toDataURL('image/png'); };
  return { make, paint, norm, toPNG, calcTraits, groupsFor, resolveOpts, W, H, DEFAULT, GENDER_DEFAULTS };
})();
