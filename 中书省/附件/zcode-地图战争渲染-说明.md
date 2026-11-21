# zcode 地图战争渲染补全（项目主人 2026-11-20「这个你先做」）

- 承办：zcode；分支：`zcode/map-war-render`（本机分支已建、已验证；本补丁为唯一改动源）
- 改的文件：`web/game.src.html`（+24/-3）及构建产物 `web/index.html`、`web/play.html`、`rpg-kernel/public/index.html`、`rpg-kernel/public/version.json`（build.py 重建，构建号 8578792）
- 改了什么：
  1. **兵牌消失的根因修掉**：军旗牌/行军箭头/粮道/战圈层全都在（R-154/R-202 已有），但驻地写法如「洛阳城西北六军大营」地名库定位不到时，`placeXY` 返回空、整个战争层静默消失。新增 `mapXY`：逐级收短再查（去括注、去方位营缀、geoStem、前 3/2 字），最后 `geoNear` 取最近地名。
  2. **行军目标同修**：campaign 的 `T = placeXY(...)` 改走 `mapXY`，箭头画得出。
  3. **战线画上地图**：原来只在战局面板列文字。现对每场交战取 `warFronts` 相邻州府对（最多四对），连红虚线（流动动画 wardash）＋中点菱形标，悬停写「对X战线：A（我兵N人）—B，约M里」；图层开关 `Ly.war` 可关。
- 验证（本机真档、李从荣第 38 回合）：
  - 真实存档兵牌 1（修复前 0）；注入假战局后 arrows 1、battlepulse 战圈 1、天下视图战线 3；零 pageerror。
  - 服务器存档回合未动（38 回合，纯前端渲染验证）。
  - 截图：work/t6build/mapshots/w1-w3（兵牌、本省战局、天下战线）。
- 门禁：`python web/build.py` ok 8578792；`node web/tests/prompt_guard.js` 292/0；`node web/tests/hist_audit.js` 0 可疑。
- **为什么走附件**：本机 Mimosa 提交检查拦的是全库旧账（GameLauncher.cs ×9、events_tangmo.py ×3 等 130 高危，均非本次改动），按「被拦即停」规矩未绕。补丁为纯文本 diff，请宰相照 patch apply 到 staging 重跑门禁；或授权后我方本地提交推分支。
- 没做到：真正的贴边前线（沿省界拓扑画线）没做——现版战线是两军相邻州府治所连线，HoI4 意思到位、拓扑版要 CHGIS 邻接表，另派再做。
