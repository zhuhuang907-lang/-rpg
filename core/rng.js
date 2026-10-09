'use strict';
/**
 * 确定性随机数：同一存档、同一回合、同一事由，掷出的结果永远一样。
 * 这样「推演」给出的胜算和实际结算口径一致，读档重放也不会变。
 */
function hashStr(s) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 返回 [0,1) 的确定性随机数：由存档种子 + 回合 + 事由决定 */
function roll(state, tag) {
  const seed = hashStr(`${state.meta.seed}|${state.turn}|${tag}`);
  return mulberry32(seed)();
}

module.exports = { hashStr, mulberry32, roll };
