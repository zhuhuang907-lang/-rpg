# core/：旧版服务端引擎（大部分已不用）

现在的游戏全部逻辑在 `web/game.src.html`（浏览器里跑），`server.js` 只做本机中转：转发 DeepSeek、博查，下载 CHGIS 地图，存档，档案馆。

这个目录里只有下面几个还被 `server.js` 用到：`net`、`boot`、`desk`、`archive`、`lunar`、`verify`、`quickstart`、`profile`、`capability`、`gmCard`、`eraVocab`、`events`、`battle`、`engine`（后三个只给旧的 `/api/turn` 接口用，现在的页面不调这个接口）。

其余文件（offices、orders、economy、snapshot、divergence、npcAgency……）是早期版本的服务端回合引擎，现在的游戏**不调用**，留着只为旧的自测 `test_runner.js`。改功能请改 `web/game.src.html`，不要以为这里的东西在起作用。
