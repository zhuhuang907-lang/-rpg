---
name: 史实数据与真人
description: 涉及真实人物、官职、年岁、地名、年号、史事、制度数据时用。保证真名真地、来源可靠、前后一致、不写模糊称呼。
---

# 史实数据与真人

## 原则

1. **来源顺序**：原文库（`corpus/`，正史、实录、通鉴、政书、兵书、地理书）→ 内置史料（`web/history`）→ 博查 → 维基。冲突以原文库为准。
2. **真名真地**：真人、真地名用真名。查不到时照任职时间线和本朝制度推，标「约」或「推」，记进存档，之后一直照存档用。
3. **禁用**：「某」「某人」「待查」「不详」、后世地名、后世官名（年代限制规则见 `rules_cases.json`）。
4. **年代关**：真人照史料生卒过关——已故超过四十年、尚未出生的不收（R-209）。
5. **玩家够不着的照原史走**；他的权和力够得着、真办了的才改。

## 怎么查原文库

原文库在仓库 `corpus/`（65 本，书目见 `corpus/books.tsv`）。本机直接查：

```bash
cd rpg-kernel && node -e "require('./core/histlib').search('检索词 可以多个',['书的id','书的id'],4).then(r=>console.log(JSON.stringify(r,null,1)))"
```

结果带书名、卷名、命中原文。常用书 id：`shiji` `hanshu` `houhanshu` `sanguozhi` `jinshu` `suishu` `jiutangshu` `xintangshu` `zizhitongjian` `songshi` `changbian` `yuanshi` `mingshi` `mingshilu` `qingshigao` `qingshilu` `tongdian` `tanghuiyao` `wenxiantongkao` `daminghuidian` `dushifangyu`。

## 改内置史料 JSON（`web/history/*.json`、`web/inst/*.json`、`web/arcs/*.json`）

- 字段规则见 `docs/知识库/接口与数据规范.md` 第五节。
- 只记到季或年的史事，`m` 写 0，不要硬填六月（R-159）。
- 每条尽量带出处（书名、卷名）。不确定的不收，宁缺勿编。
- 改完：`python3 web/build.py`，`node web/tests/prompt_guard.js`（史料完整性那段）。

## 年岁与官职

- 年岁由程序照生年算；没有生年的由推演按资历推，标「推」——不要给默认值（出过「人人三十岁」）。
- 官职照本朝官制写全称，不含糊（「某官」「朝中官员」不行）；品级、衙门照制度库。

## 检查

- [ ] 每个新增真人有生卒和出处
- [ ] 没有模糊称呼、后世词
- [ ] 同一人物在存档里只有一份，前后不矛盾
