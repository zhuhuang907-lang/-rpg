'use strict';
/** 测试环境：存档、配置、检索缓存都放进临时目录，不在仓库里留下痕迹 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'shu-test-'));
process.env.SHU_SAVES = path.join(root, 'saves');
process.env.SHU_CONFIG = path.join(root, 'config.json');
process.env.SHU_CACHE = path.join(root, 'cache');
process.on('exit', () => { try { fs.rmSync(root, { recursive: true, force: true }); } catch { /* ignore */ } });
module.exports = { root, config: c => fs.writeFileSync(process.env.SHU_CONFIG, JSON.stringify(c)) };
