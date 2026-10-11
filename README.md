# 历史模拟 RPG

## 下载就玩（Windows）

1. 打开 https://github.com/zhuhuang907-lang/-rpg/releases/tag/latest
2. 点 **HistoryRPG-Setup.exe** 下载，双击安装（Windows 提示「已保护你的电脑」就点「更多信息」→「仍要运行」）。
3. 装完双击桌面上的 **历史模拟RPG** 图标。
4. 页面上粘贴 DeepSeek 的 Key 点「保存」（博查 Key 可选），然后用一句话开局，比如「万历年间苏州的绣娘」。

不想安装：下载 HistoryRPG-windows.zip → 右键「全部解压缩」→ 双击「启动游戏.exe」。
连不上、保存不了：在页面上点「检查网络」，它会说清卡在哪。

## 目录

| 路径 | 内容 |
|---|---|
| `rpg-kernel/` | **游戏本体（枢引擎）**：一句话开局、秦到清任意年份与身份、真实农历、计划卡/伏笔/时钟/路线/NPC 自主/史实核查；DeepSeek V4 写剧情，博查或维基查史；不限回合。开发时 `cd rpg-kernel && node server.js`，再开 http://127.0.0.1:8787 |
| `设计/` | 所有存档通用的呈现与事件规范（仿崇祯模拟器），已写进引擎的写作规则：先读 `00_总纲.md` |
| `.github/workflows/package.yml` | 自动测试、打包安装程序与免安装版，发布到 Releases |

## 约定

- 规范以 `设计/00_总纲.md` 的七条铁律为准。
- 正文只写玩家能看到、听到的；不替玩家说话或动作；正文里不出现考证和争论。
- Key 只存在玩家自己电脑上（`app/data/adapter-config.json`、`app/data/search.json`），绝不提交进仓库。
