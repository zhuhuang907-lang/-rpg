# rpg-kernel · 历史政治 RPG 引擎

零依赖：Node.js 22+，原生 `http` 服务 + 原生 JS 前端，没有构建步骤，存档是 JSON 文件。

## 目录

```
server.js          路由表 + 静态文件（零框架）
public/            前端：index.html / style.css / app.js，改完刷新即生效
core/              引擎与规则（engine / verify / battle / events / eraVocab / worldFill …）
adapters/          模型适配器（deepseek / openai-compatible / anthropic / ollama / skeleton）与检索源
rulepacks/         规则包：时代预设、开局模板
data/              运行时数据（存档、adapter-config.json 里的 API Key）—— 已在 .gitignore
docs/              设计文档与打包说明
```

> 当前仓库只收录了 `server.js`、`public/`、`core/worldFill.js`。`core/engine.js`、`adapters/`、`rulepacks/` 等
> 还在本机未上传，补齐后 `npm start` 才能跑起来。

## 运行

```bash
npm start            # http://127.0.0.1:8787
PORT=9000 npm start  # 换端口
```

首次打开会弹向导：选模型 → 贴 API Key → 测试连接 → 挑一个开局。Key 只写在本机 `data/adapter-config.json`。

## 前后端约定

- 所有接口：业务失败回 HTTP 200 + `{ ok:false, why }`；参数/JSON 错回 4xx + 同样结构。
- 前端 `post()` / `get()` 遇到 `ok:false` 或 `error` 直接抛 `ApiError`，调用方只管 `try/catch`；
  个别「ok:false 表示没有数据」的接口传 `{ soft:true }` 取原始结果。
- 凡是会打网络的按钮都套 `busy(btn, label, fn)`：置灰、换文案、防重复点击、失败 toast。
- `/api` 只接受同源请求（Origin / Sec-Fetch-Site），防止别的网页向本机服务发请求。
- `GET /api/adapter-config`、`GET /api/search/config` 只回遮蔽后的 Key（`••••` + 末 4 位）；
  保存时把遮蔽值原样送回即保留旧值。
