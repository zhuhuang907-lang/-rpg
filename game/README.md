# 历史模拟（可玩版）

## 下载就玩（Windows）

1. 打开 https://github.com/zhuhuang907-lang/-rpg/releases/tag/latest ，下载 **HistoryRPG-windows.zip**。
2. **全部解压**（右键 →「全部解压缩」），进文件夹双击 **HistoryRPG.exe**。电脑上不用另装任何东西，Node 已经打包在里面。
3. 第一次在首页粘贴一个 DeepSeek 的 Key，点「保存」。
4. 输入框里写一句话，比如「万历年间苏州的绣娘」，回车；或者点「随便来一个」。

关掉游戏窗口就退出游戏。每次往仓库推送 `game/` 的改动，GitHub 都会自动重新打包（`.github/workflows/package.yml`）。

## 从源码运行（Mac / Linux / 开发）

```bash
cd game
node server.js        # 需要 Node.js 20 以上，会自动打开浏览器 http://127.0.0.1:3168
npm test              # 测试（用假的大模型和假的博查走完整条路，不留任何文件）
```

## 三样东西，分工不同

| | 作用 | 不接会怎样 |
|---|---|---|
| **大模型**（OpenAI 兼容接口，如 DeepSeek；或 Anthropic） | 写：世界底本、每回合的来报、问人、润色、续查、小传 | 只能玩现成剧本 |
| **博查**（Bocha Web Search API，可选） | 查：开局查史、自动续查、游戏里"查一下"，每条史事都带出处 | 自动改用免费的**维基百科**查史；博查报错或查不到时也退回维基 |
| 现成剧本 | 离线可玩的示范局（熙宁变法：平民周三娘、皇帝赵顼） | — |

Key 都在界面右上「设置」里填，存在 `data/config.json`（已加入 .gitignore，不会提交）。

### 博查接口

本项目调用的是：

```
POST https://api.bochaai.com/v1/web-search
Authorization: Bearer <你的 Key>
{ "query": "...", "freshness": "noLimit", "summary": true, "count": 8 }
→ data.webPages.value[]：name / url / snippet / summary / siteName / datePublished
```

实现在 `engine/search.js`。接口地址可以在设置里改；每局最多检索次数默认 300；结果按查询词缓存在 `data/cache/search/`，同一个词不重复计费。
**注意**：这个请求格式是照第三方文档写的，测试只用了仿造的博查服务。第一次填上真 Key 后，请开一局，看「史事」面板里有没有资料卡；如果报错，把错误信息发我。

完整规则见仓库根目录 `设计/07_游戏规则.md`。

## 一局怎么玩

1. **醒来**（开场三拍）：先是身体和声音，有人叫你，吃饭时听到两三件事，然后才有人找上门。状态栏随之一点点亮起来。
2. **回合**（平民一旬、皇帝一季）：
   - **看局势**：顶上一排数值，左边人群满意度和地方一览；
   - **案头**：三到五份来报（奏状、札子、口信、传闻……），来报可能说谎；
   - **问人**：每回合找一两个人，他们各有立场、私心和记忆，给的主意不同，可以「采纳」；
   - **拿主意**：大白话写，或采纳别人的主意；「润色」改成合身份的文书；指定谁去办；
   - **结算**：执行人的回报（可能失真）＋真实账目＋风声。后果延迟一到三回合回来。
3. **史事**面板：主线史事表（已核/二手/存疑＋出处）和每回合的核对记录。

## 目录

| 路径 | 内容 |
|---|---|
| `server.js` | 路由与静态服务 |
| `engine/game.js` | 开场、回合、问人、结算 |
| `engine/history.js` | 每回合的史事核对：史事何时、以什么形式、到不到这个身份手里 |
| `engine/research.js` | 游戏内查史：开局检索→写底本→按出处评级；自动续查；查一下 |
| `engine/search.js` | 检索：博查，没 Key 或查不到时用维基百科（取自原 rpg-kernel） |
| `launcher/` | Windows 启动器（沿用原 rpg-kernel 的 GameLauncher.cs）与压缩包里的说明 |
| `engine/rules.js` | 生老病死、把握、志向、身份转变、收场 |
| `engine/world.js` | 现成剧本与生成世界统一成同一种形状 |
| `engine/guard.js` | 时代把关：时代错置、禁用词、正文里的考证腔 |
| `engine/calendar.js` | 农历：秦到清（`tools/calc_calendar.py` 天文推算）；年号由剧本或检索给出，查不到用干支 |
| `engine/llm.js` `engine/prompts.js` | 可选的大模型接入与提示词 |
| `data/scenarios/xining/mainline.js` | 主线史事表（熙宁变法，1067–1076） |
| `data/scenarios/xining/guard.js` | 本剧本的时代把关词表 |
| `data/scenarios/xining/identities/` | 身份：`zhou.js`（平民周三娘）、`shenzong.js`（皇帝赵顼） |
| `data/scenarios/xining/daily.js` `weather.js` `deps.js` | 节令与家常、小尺度天时、史事因果 |
| `tests/` | 测试：历法、时代把关、现成剧本整局、自定义身份整局（假大模型＋假博查）、服务端任务 |

## 主线怎么保证不出错

- 每条史事都有**评级**（已核／二手／存疑）、**精度**（月／季／年）和**出处**。存疑的不发给玩家；正文只写到精度那一级。
- 史事按**身份**传递：同一件事，皇帝当回合在廷议里拍板，地方官两个月后看邸报，平民几个月后听里正说、可能走样。
- 皇帝身份里，朝廷决策变成待决的来报；你否决了，后续史事（`deps.js`）就不发生，历史在此分岔。其他身份里朝廷依史行事。
- 大灾只来自史事表；随机天时只到"一乡一村"量级，不在史书没记的年份编造大灾。
- 每回合的核对结果写进「史事」面板，包括：哪些到了你手里、哪些你这个身份听不到、哪些因你的决定没发生、把关拦下了什么。
- `npm test` 检查：每段本地正文在它最早出现的时间点都能过把关；每条史事有出处；历法锚点对得上；整局模拟里史事不早到。

## 加新剧本、新身份

1. 新建 `data/scenarios/<id>/`，照 `xining` 写 `mainline.js`（先在仓库根的 `史实核查/` 登记来源）、`guard.js`、`deps.js`、`daily.js`、`weather.js`。
2. 在 `identities/` 下加身份文件：数值、人群、地方一览、人物卡（立场、性格、私心、会出卖你的条件）、三拍开场、事件卡。
3. 在 `engine/scenario.js` 的 `META` 里登记剧本。
4. 跑 `npm test`。
