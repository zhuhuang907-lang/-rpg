# NOTICE

本仓库（`cn-history-220-979`）聚合公元 220–979 年中国中古史的书目、全文与结构化数据。不同层级的材料适用不同许可，使用时请分别遵守。

## 1. 古籍原文

本库收录的史书、编年史、政书、笔记、类书等古籍原文，其著作权已消灭，属于**公有领域**。古籍原文可自由使用、复制、翻译与改编。

## 2. Wikisource 转录

全文主要来自[中文 Wikisource](https://zh.wikisource.org/)的转录文本。Wikisource 贡献者的转录、标点、校勘与排版以 **CC BY-SA 4.0** 许可发布。

- 每个卷文件头部保留：来源页面、修订号、原始链接、抓取日期与许可说明。
- 引用时应同时注明：书名、卷次、Wikisource 页面链接与“CC BY-SA 4.0”。
- 示例：

  ```text
  《三国志》卷三十六·蜀书六·关张马黄赵传，
  Wikisource 转录（CC BY-SA 4.0），
  https://zh.wikisource.org/wiki/三國志/卷36
  ```

- Wikisource 页面可能继续被编辑；本库保存的是抓取时点的修订版本，修订号见各卷文件头。

## 3. 本项目新增内容

以下内容由本项目整理、编写或生成，以 **CC BY-SA 4.0** 发布（全文见 [`LICENSE`](LICENSE)）：

- `data/catalog/`、`data/catalog.json`、`data/catalog_stats.json`
- `data/periods.json`、`data/factions/`、`data/characters/`、`data/events/`
- `data/locations.json`、`data/glossary.json`、`data/disambiguation.json`
- `data/game/`（上述数据的合并产物）
- `schemas/`、`scripts/`、`tests/`、`docs/`、`prompts/`
- `site/` 的页面、样式与脚本
- `README.md`、`CLAUDE.md`、`AGENTS.md`、`llms.txt`、本文件

转载或改编时请：

1. 注明来源仓库与链接；
2. 说明是否修改；
3. 以相同许可（CC BY-SA 4.0 或兼容许可）发布改编成果。

## 4. 第三方组件

| 组件 | 用途 | 许可 | 位置 |
|---|---|---|---|
| OpenCC `TSCharacters.txt` | 繁体→简体检索映射 | Apache-2.0 | `data/variants/ts_characters.txt` |
| OpenCC 许可全文 | 许可文本 | Apache-2.0 | `data/variants/OPENCC-LICENSE.txt` |
| SQLite FTS5 | 全文索引 | 公有领域 | 运行时依赖，不随仓库分发 |
| `jsonschema` | 数据校验 | MIT | 开发依赖，不随仓库分发 |

## 5. 现代研究（M 级）

`data/catalog.json` 中 `type: modern` 或 `reliability: M` 的条目是**受版权保护的现代研究著作**。本库仅提供：

- 书名、作者、出版社、年份、ISBN/外链等书目元数据；
- 内容简介与游戏使用建议（本项目原创）；
- 指向出版社、图书馆或电商页面的链接。

**不包含**这些著作的正文、译文或大段摘录。引用请遵循原书版权与所在司法辖区的合理使用规则。

## 6. 小说、演义与影视（F 级）

`type: fiction` 或 `reliability: F` 的条目（如《三国演义》《隋唐演义》《残唐五代史演义》）用于人物形象、叙事母题、台词风格与氛围参考。

- 不得作为史实依据；
- 不得与 A/B/C 级史料混用而不加标注；
- 改编时注意原著仍在版权保护期内的部分（如现代整理本、注释、插图、影视剧设定）。

## 7. 数据库与工具（D 级）

`type: database` 或 `reliability: D` 的条目（如 CBDB、CTEXT、中国历代人物传记资料库）仅作为检索入口。其数据许可、访问条款与引用格式以各平台为准。

## 8. 地图与坐标

`data/locations.json` 的经纬度为现代大致坐标，用于游戏地图定位，不作为历史地理精确复原。历史政区、河道、海岸线与今制差异较大，严肃研究请参考历史地图集与考古成果。

## 9. 免责声明

- 本库为研究与创作辅助工具，不保证文本、标点、系年、地名、人物关系完全无误。
- 古籍存在版本差异、传抄讹误、作者立场与文学夸张；使用时应与多种史料对读。
- 游戏数据中的数值、关系与事件描述是**设计抽象**，不是史学定论。
- 因使用本库内容产生的任何后果，由使用者自行承担。

## 10. 版权申诉

如认为本库内容侵犯您的权利，请在本仓库提交 issue，说明：

- 具体文件路径或 URL；
- 权利依据与联系方式；
- 希望采取的措施（删除、替换、补充署名等）。

我们会在核实后尽快处理。

## 11. 引用本仓库

```text
cn-history-220-979: 公元 220–979 年中国中古史资料库,
https://github.com/zhuhuang907-lang/cn-history-220-979 (CC BY-SA 4.0).
```

如用于学术发表，建议同时引用所依据的原始史书与 Wikisource 页面。
