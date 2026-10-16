# CHROME 与设计稿注解登记

冻版基线：`ui.pen` size 137536 B、sha256 `9f9f23f9a7291b5f…`、根 frame `r4IYo` 下 11 节（Nav | Hero | PhotoBand | Index | 01 学术成果 · Section | 02 助老活动 · Section | 03 音乐时光 · Section | 04 律动时刻 · Section | Columns | Values | Footer）、全稿 311 节点。本文两张表由脚本自设计稿批处理生成，非手工誊录。

口径——设计稿上可见的文本，只可能是以下三类之一：

1. **稿件正文**：在字典中以 `src` 指向 `.agents/briefs/` 或 `ui.pen` 节点，逐字可证（`node docs/verify-copy.mjs` 规则⑤逐条断言）。
2. **chrome**：设计稿自身的界面与标注文本——序号、编号、板块 kicker、交互提示、链接文案、占位符、图注占位、出处标签、索引页眉与范围。字典中记 `chrome:true`，**不得带 `src`**，实现方照 `text` 渲染；本文件 §1 单列（规则⑦）。
3. **※ 注解**：以 `※` 开头的文本是设计过程注解，不是站点文案。**不入字典**（规则⑧断言任何 `text` 不得以 `※` 开头）、实现方不得渲染；本文件 §2 单列。

比对归一化口径：设计稿文本与字典比对时仅折叠大小写与空白。设计稿把 `Scholarly Pursuits`/`Sound & Soul` 等稿件英文名以全大写渲染（`SCHOLARLY PURSUITS`/`SOUND & SOUL`），属 text-transform 渲染样式；字典保留稿件原文大小写，不改写。

## 1. chrome 清单（28 条）

| # | 字典键 | text | lang | 设计位置 | 判定 |
|---|---|---|---|---|---|
| 1 | `nav.item1.no` | 1 | `en` | Nav · Link 1 | 导航序号 |
| 2 | `nav.item2.no` | 2 | `en` | Nav · Link 2 | 导航序号 |
| 3 | `nav.item3.no` | 3 | `en` | Nav · Link 3 | 导航序号 |
| 4 | `nav.item4.no` | 4 | `en` | Nav · Link 4 | 导航序号 |
| 5 | `index.head.eyebrow` | INDEX / 四个一级板块 | `zh-Hans` | Index · Head | 索引页眉标注 |
| 6 | `index.head.range` | 01 — 04 · 2024—2026 | `en` | Index · Head | 索引范围标注 |
| 7 | `index.row1.no` | 01 | `en` | Index · 行1 | 行序号 |
| 8 | `index.row2.no` | 02 | `en` | Index · 行2 | 行序号 |
| 9 | `index.row3.no` | 03 | `en` | Index · 行3 | 行序号 |
| 10 | `index.row4.no` | 04 | `en` | Index · 行4 | 行序号 |
| 11 | `scholarly.kicker` | 01 / 学术成果 | `zh-Hans` | 01 学术成果 · Section · Head | 板块 kicker |
| 12 | `scholarly-igem.no` | 01.1 | `en` | 01 学术成果 · Section · SubHead | 子板块编号 |
| 13 | `scholarly.imagePending` | image pending | `en` | 01 学术成果 · Section · 图位 | 图位占位符 |
| 14 | `scholarly.figcap2` | FIG. 02 — 配图待补（docx 段[33] 标记） | `zh-Hans` | 01 学术成果 · Section · Cap | 图注占位 |
| 15 | `scholarly.figcap3` | FIG. 03 — 配图待补（docx 段[38] 标记） | `zh-Hans` | 01 学术成果 · Section · Cap | 图注占位 |
| 16 | `scholarly-jhu.no` | 01.2 | `en` | 01 学术成果 · Section · SubHead | 子板块编号 |
| 17 | `scholarly.revealTap` | TAP TO REVEAL | `en` | 01 学术成果 · Section · Hint | 交互提示 |
| 18 | `scholarly-immuno.no` | 01.3 | `en` | 01 学术成果 · Section · SubHead | 子板块编号 |
| 19 | `scholarly.revealSwipe` | SWIPE → REVEAL | `en` | 01 学术成果 · Section · Hint | 交互提示 |
| 20 | `scholarly-hir.no` | 01.4 | `en` | 01 学术成果 · Section · SubHead | 子板块编号 |
| 21 | `scholarly.meta` | HIR · Harvard International Review | `en` | 01 学术成果 · Section · Meta | 出处标签 |
| 22 | `scholarly.linkPdf` | READ FULL PDF ↗ | `en` | 01 学术成果 · Section · Link | 链接文案 |
| 23 | `elder.kicker` | 02 / 助老活动 | `zh-Hans` | 02 助老活动 · Section · Head | 板块 kicker |
| 24 | `elder.contentPending` | CONTENT PENDING | `en` | 02 助老活动 · Section · K | 板块占位符 |
| 25 | `music.kicker` | 03 / 音乐时光 | `zh-Hans` | 03 音乐时光 · Section · Head | 板块 kicker |
| 26 | `sport.kicker` | 04 / 律动时刻 | `zh-Hans` | 04 律动时刻 · Section · Head | 板块 kicker |
| 27 | `nav.lang.zh` | 中 | `zh-Hans` | Nav · Row · Lang | 语言切换件选项 |
| 28 | `nav.lang.en` | EN | `en` | Nav · Row · Lang | 语言切换件选项 |

本表 28 条 = 字典中 `chrome:true` 条目总数，无一含 `src`（`node docs/verify-copy.mjs` 规则⑦逐条断言）。chrome 的 `text` 全部取自冻版设计稿对应节点，未新增、未改写、未翻译。

对齐复核：设计稿 142 个非 ※ 文本节点去重为 105 串，与字典 `text` 集合的差集为空（101 串逐字命中、1 串由两条 CTA 首尾相接构成、3 串为稿件编号前缀被拆为独立节点的片段）；字典 134 键（en=zh），其中 src-traced 106 条、chrome 28 条。

## 2. ※ 注解清单（7 条，不入典、不渲染）

| # | 所属节 | 设计节点 | 文本 |
|---|---|---|---|
| 1 | 01 学术成果 · Section | `Ph` | ※ image1.jpeg · 4:3 · 显示宽 ≤1600 |
| 2 | 01 学术成果 · Section | `Ph` | ※ image2.jpeg · 4:3 · 显示宽 ≤427 |
| 3 | 01 学术成果 · Section | `Ph` | ※ image3.jpeg · 4:3 · 显示宽 ≤693 |
| 4 | 01 学术成果 · Section | `Ph` | ※ image pending · docx 段[69] |
| 5 | 02 助老活动 · Section | `Note` | ※ 本板块内容待补（素材未提供） |
| 6 | 03 音乐时光 · Section | `Ph` | ※ image pending |
| 7 | 04 律动时刻 · Section | `Ph` | ※ image pending |

以上 7 条为设计稿注解：说明图版文件名与显示宽、素材缺位、段号待补。它们不是站点文案——不得进入 `docs/copy-en.json` / `docs/copy-zh.json`（规则⑧），实现方不得渲染为页面文本。

## 3. 版式口径：揭晓面板默认折叠 ⇒ 整页天然矮 ≈670px（非缺口）

设计稿把 9 个揭晓面板（`RevealPanel`：01.2 / 01.3 / 01.4 各 3 个）**画成展开态**；实现按裁决默认折叠（`hidden`，见 `useReveal.ts`）。故 1440 下文档 `scrollHeight` 天然小于稿面全高 7433（`_preview/cmp/design-at-1440.png` 1440×7433），属口径差，**非版式缺口**。P4 后实测 6764，差 −669；9 面板全开后 7455，与稿面仅差 +22。归因分解（1440 实测：逐块点开该块全部 `[aria-expanded="false"]`，取 `scrollHeight` 增量；每块自折叠态单独量，故各项独立取整）：

- 01.4 HIR 三面板（同列累加）−408
- 01.3 免疫最高列面板 −167
- 01.2 JHU 最高卡面板 −117
- 行盒与内外边距余差 +23

合计 −669 = 6764 − 7433。此前的 −741 比这多 −72，全部出自 HIR 三问题号：设计稿画成 `Onum` 独立节点（上距题干 10px），而实现的字典把 “1. ”“2. ”“3. ” 并进题干、内联渲染；P4 已按节点边界拆回独立渲染，该项归零（该节高 1060 → 1132px，整页 6692 → 6764px）。

复核方法：同 viewport 量 `document.documentElement.scrollHeight`，与稿面全高 7433 相减；面板贡献逐块点开 `[aria-expanded="false"]` 后重测增量。
