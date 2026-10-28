# CHROME 与设计稿注解登记

冻版基线：`ui.pen` size 137536 B、sha256 `8816b923b24c00e4…`、根 frame `r4IYo` 下 11 节（Nav | Hero | PhotoBand | Index | 01 学术成果 · Section | 02 助老活动 · Section | 03 音乐时光 · Section | 04 律动时刻 · Section | Columns | Values | Footer）、全稿 311 节点。本文两张表由脚本自设计稿批处理生成，非手工誊录。

口径——设计稿上可见的文本，只可能是以下三类之一：

1. **稿件正文**：在字典中以 `src` 指向 `.agents/briefs/` 或 `ui.pen` 节点，逐字可证（`node docs/verify-copy.mjs` 规则⑤逐条断言）。
2. **chrome**：设计稿自身的界面与标注文本——序号、编号、板块 kicker、交互提示、链接文案、占位符、图注占位、出处标签、索引页眉与范围。字典中记 `chrome:true`，**不得带 `src`**，实现方照 `text` 渲染；本文件 §1 单列（规则⑦）。
3. **※ 注解**：以 `※` 开头的文本是设计过程注解，不是站点文案。**不入字典**（规则⑧断言任何 `text` 不得以 `※` 开头）、实现方不得渲染；本文件 §2 单列。

比对归一化口径：设计稿文本与字典比对时仅折叠大小写与空白。设计稿把 `Scholarly Pursuits`/`Sound & Soul` 等稿件英文名以全大写渲染（`SCHOLARLY PURSUITS`/`SOUND & SOUL`），属 text-transform 渲染样式；字典保留稿件原文大小写，不改写。

## 1. chrome 清单（23 条；空号是 docx-1027 撤除项，见本节末）

| # | 字典键 | text | lang | 设计位置 | 判定 |
|---|---|---|---|---|---|
| 1 | `nav.item1.no` | 1 | `en` | Nav · Link 1 | 导航序号 |
| 2 | `nav.item2.no` | 2 | `en` | Nav · Link 2 | 导航序号 |
| 3 | `nav.item3.no` | 3 | `en` | Nav · Link 3 | 导航序号 |
| 4 | `nav.item4.no` | 4 | `en` | Nav · Link 4 | 导航序号 |
| 7 | `index.row1.no` | 01 | `en` | Index · 行1 | 行序号 |
| 8 | `index.row2.no` | 02 | `en` | Index · 行2 | 行序号 |
| 9 | `index.row3.no` | 03 | `en` | Index · 行3 | 行序号 |
| 10 | `index.row4.no` | 04 | `en` | Index · 行4 | 行序号 |
| 11 | `scholarly.kicker` | 01 / 学术成果 | `zh-Hans` | 01 学术成果 · Section · Head | 板块 kicker |
| 12 | `scholarly-igem.no` | 01.1 | `en` | 01 学术成果 · Section · SubHead | 子板块编号 |
| 15 | `scholarly-jhu.no` | 01.2 | `en` | 01 学术成果 · Section · SubHead | 子板块编号 |
| 16 | `scholarly.revealTap` | TAP TO REVEAL | `en` | 01 学术成果 · Section · Hint | 交互提示 |
| 17 | `scholarly-immuno.no` | 01.3 | `en` | 01 学术成果 · Section · SubHead | 子板块编号 |
| 18 | `scholarly.revealSwipe` | SWIPE → REVEAL | `en` | 01 学术成果 · Section · Hint | 交互提示 |
| 18a | `scholarly.revealClick` | Click to reveal. | `en` | 01 学术成果 · Section · Hint | 交互提示（docx-2026-10 段[6]，JHU 三问各一） |
| 19 | `scholarly-hir.no` | 01.4 | `en` | 01 学术成果 · Section · SubHead | 子板块编号 |
| 21 | `scholarly.linkPdf` | READ FULL PDF ↗ | `en` | 01 学术成果 · Section · Link | 链接文案 |
| 22 | `elder.kicker` | 02 / 助老活动 | `zh-Hans` | 02 助老活动 · Section · Head | 板块 kicker |
| 23 | `music.kicker` | 03 / 音乐时光 | `zh-Hans` | 03 音乐时光 · Section · Head | 板块 kicker |
| 24 | `sport.kicker` | 04 / 律动时刻 | `zh-Hans` | 04 律动时刻 · Section · Head | 板块 kicker |
| 27 | `elder.guide.meta` | `SHANGHAI HOSPITAL GUIDE · XLSX`（zh：`上海就医指南 · Excel 表格`） | `en` | 02 助老活动 · Section · Guide · Meta | 文件出处标签（docx-1023 第 10 条的 XLSX 下载件） |
| 28 | `elder.guide.download` | `DOWNLOAD XLSX ↗`（zh：`下载 XLSX ↗`） | `en` | 02 助老活动 · Section · Guide · Link | 下载文案 |
| 33 | `photo.zoom` | `Click to view larger`（zh：`点击放大`） | `en` | 03 音乐时光 / 04 律动时刻 · Section · 照片墙按钮 | docx-1023 第 5 条：照片可点开放大，交互提示 |

本表 23 条 = 冻版设计稿上逐节点可查的 19 条 chrome 键 + docx-2026-10 段[6] 新增的 `scholarly.revealClick` + docx-1023 第 10 条新增的 2 条指南 chrome 键（`elder.guide.meta`、`elder.guide.download`：下载件标签由站点固定给，不属底稿原文，故记 chrome）+ docx-1023 第 5 条新增的照片墙交互提示 `photo.zoom`（D2 收口撤除 `scholarly.imagePending`、`elder.contentPending` 两行：两者占位文本已无渲染者，字典条目一并删除，见 §4）。字典另有 6 条图片 alt 键（`scholarly-igem.fig1.alt`、`scholarly-igem.fig2.alt`、`scholarly-hir.fig.alt`、`elder.fig.alt`、`music.fig.alt`、`sport.fig.alt`，图片接线 lane 增补，未入本表）；`node docs/verify-copy.mjs` 实测 `chrome 29 条`，无一含 `src`（规则⑦逐条断言）。chrome 的 `text` 除 `scholarly.revealClick`（docx-2026-10 段[6]，docx 原文 + 按「中英都上」定的中文）与上表 27–28 行的 2 条指南下载件标签（docx-1023 第 10 条，中英两串由用户给定）与 33 行的 `photo.zoom`（docx-1023 第 5 条的照片墙交互提示，中英两串由本 lane 按 chrome 键流程新增）外，全部取自冻版设计稿对应节点，未改写、未翻译。

**docx-1027 收口**（第 3 条删微标、第 4 条页内表格只留 xlsx 下载卡、第 6 条撤 ZH/EN 切换器）：上表删 11 行，空号不再补 —— 5/6/13/14/20 是随微标全删撤掉的 `index.head.eyebrow`、`index.head.range`、`scholarly.figcap2`、`scholarly.figcap3`、`scholarly.meta`（页面不再有 mono 小标）；25/26 是随切换器撤掉的 `nav.lang.zh`、`nav.lang.en`（站点锁英文）；29–32 是随页内 12 行表撤掉的 `elder.guide.head.hospital/checkin/tests/tips`（表头改由 `tools/build-hospitals-xlsx.py` 持字面量；行值仍取 48 个 `elder.guide.rNN.*` 数据键，`tools/verify-hospitals-xlsx.py` 照旧逐字对照）。

对齐复核：设计稿 142 个非 ※ 文本节点去重为 105 串，与字典 `text` 集合的差集为空（101 串逐字命中、1 串由两条 CTA 首尾相接构成、3 串为稿件编号前缀被拆为独立节点的片段）；字典 138 键（en=zh），其中 src-traced 106 条、chrome 32 条（docx-2026-10 轮后 chrome 33 条，见下）。
**docx-2026-10 轮之后的现状**：字典 **189 键**（en=zh；src-traced **156** 条 + chrome **33** 条：docx-2026-10 段[6] 的 `scholarly.revealClick` 为接线 lane 按 chrome 键流程新增并登记于 §1）；冻版设计稿上 5 串已被本轮新文案整句取代（`scholarly-hir.title` 与 Index 四行小字 `index.row1.body` … `index.row4.body`），故与 `ui.pen` 的差集**不再为空**——`ui.pen` 不在本 lane 可改路径内，接线 lane 更新设计稿后重新对齐（`tools/fidelity-scholarly.mjs` 因此 rc=1，见 `docs/GATES.md` §2 docx-2026-10 轮 ④）。

**docx-1023 轮追加**：字典 **281 键**（en=zh；`node docs/verify-copy.mjs` 实测 src-traced **241** 条 + chrome **40** 条）。本轮新增 chrome 7 条已入上表 27–28 与 33 行（照片墙的 `photo.zoom` 见 33 行）；新增 src-traced 55 条（`elder.guide.title` / `.body`、`elder.guide.r01…r12` 各 4 字段共 48 条、`music.intro.p1…p3`、`music.resume.intro1/2`）溯源 `docx-1023-brief.md`；替换 3 条（`scholarly.revealSwipe` 改 `tap to reveal`、`music.body`、`sport.lead`，后两者见 §4）。

**docx-1027 轮之后的现状**：字典 **267 键**（en=zh；`node docs/verify-copy.mjs` 实测 src-traced **238** 条 + chrome **29** 条，见上）。281 − 11（chrome，§1 空号）− 7（非 chrome：`hero.eyebrow`、`method.eyebrow`、`photoband.figcap`、`photoband.altnote`、`footer.legal`、`values.label` → 改为 `values.label1…4` 四条、`elder.guide.body`）+ 4 = 267。`elder.guide.r01…r12` 的 48 个行键保留：页面不渲染它们，由 `tools/build-hospitals-xlsx.py` 写入 xlsx、`tools/verify-hospitals-xlsx.py` 对照，故 `tools/verify-copy-wiring.mjs` 按「数据源」豁免，不算死键（§4）。

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

## 4. 死键登记（6 条：字典有，src 无字面量引用）

本节供 `tools/verify-copy-wiring.mjs` 的未引用键白名单（`UNREFERENCED`）与人工复核对齐：白名单之外的未引用键是接线缺口（门禁 rc=1）；本节只登记现状，不含待办。实测口径：`node tools/verify-copy-wiring.mjs` 第二行 `unreferenced=53 of 274 dictionary keys (data_source=48)`（`referenced=221`、`via_literal_call=95`、`via_key_literal=126`）。53 个里 48 个是 docx-1027 撤掉页内表格后的 xlsx 底稿键（`elder.guide.r01…r12` 的 name/checkin/tests/tips，出处见 §1 末），门禁按 `DATA_SOURCE` 数据源豁免、不算死键；余下 5 个是下表登记的 `sport.body` 与 `hero.key.subject` / `hero.val.subject` / `hero.key.sport` / `hero.val.sport`。

D2 收口把本节清空，五个原死键逐条处置如下。

| # | 键名 | 处置 | 判据 |
|---|---|---|---|
| 1 | `elder.title.zh`、`music.title`、`sport.title` | 保留，改由字面串到达 | 三键是 02/03/04 节标题对的**中文半**：各节 JSX 只写英文半（`elder.title.en` / `music.titleEn` / `sport.titleEn`），中文半在 `src/i18n/copy.ts` 的 `TITLE_PAIRS` 里成对登记（`satisfies Partial<Record<CopyKey, CopyKey>>`：任一半键离开字典即 `tsc` 报错），门禁按 `via_key_literal` 计入；设计稿 02/03/04 节 `Section/Head` 无独立中文标题节点，中文由 chrome kicker（`elder.kicker` 等）承载，故这半不渲染 |
| 2 | `scholarly.imagePending`（`image pending` / `配图待补`） | 删除（两字典一致） | 01 节三张图已接线（`scholarly-igem.fig1-720` / `scholarly-igem.fig2-720` / `scholarly-hir.fig-2688`，alt 走 `scholarly-igem.fig1/fig2.alt`、`scholarly-hir.fig.alt` chrome 键），图位占位文本无渲染者；§1 原第 13 行随之撤除 |
| 3 | `elder.contentPending`（`Community volunteering` / `社区志愿服务`） | 删除（两字典一致） | `src/sections/Elder/**` 不消费该键；02 节内容由 `elder.pull` / `elder.kv.*` 承担，该键与 `elder.kv.v` 同文同 src、纯重复条目，不得接成渲染文案；§1 原第 24 行随之撤除 |
| 4 | `sport.body`（`Football and badminton. …` / `足球与羽毛球。…`） | **保留键，不再渲染**（docx-2026-10 页面7 以 `sport.lead` 替换） | 用户裁决「新段替换旧句」：`sport.lead` 占据原 `sport.body` 在 pull 块的位置，旧句不上页面。键在两份字典里留着，将来改主意时一行即可恢复；`tools/verify-copy-wiring.mjs` 的 `UNREFERENCED` 已同步加入该键，否则 `unreferenced key is not registered as dead` 会 rc=1 |
| 5 | `hero.btn1`（`VIEW CV ↗` / `查看简历 ↗`） | **保留键，不再渲染**（用户裁定去掉「查看简历」按钮） | 无 CV PDF，也就没有可打开的目标：`Hero.tsx` 的 `Btns` 行现在只承载实邮箱链接（`hero.btn2`），`.hero__btn--solid` 随之退役。键在两份字典里留着，将来有 CV 时一行即可恢复；`UNREFERENCED` 与 `MIN_LITERAL_CALLS`（77 → 76）同步改在本轮 |
| 6 | `hero.key.subject`、`hero.val.subject` | **保留键，不再渲染**（docx-1028 条目2 删 Hero 自述块与三行键值） | 两键是 board 的历史 KEY/VALUE 槽位；Hero 的键值块已删，站内无渲染者。键留在两份字典里，将来恢复块时一行可取。退役条件：Sport/Music 两处若改用自有键，须整对删除，并在 `tools/fidelity-nav-hero-photoband.mjs` 的 `MOVED_OUT_OF_HERO` 表同步（该表以 Hero DOM 缺失为锚，登记失效会红） |
| 7 | `hero.key.sport`、`hero.val.sport` | **保留键，不再渲染**（docx-1028 条目2 删 Hero 键值块；Sport 行已由 docx-1023 条目9 撤除） | 同上，board 的历史 KEY/VALUE 槽位；`tools/verify-music-sport-dom.mjs:650-653` 直接读字典断言 `hero.val.sport` 的文本不得回到 `#sport`，`src/sections/Sport/Sport.css:73` 注释指名两键。退役条件同第 6 行：Sport/Music 改用自有键后整对删除，并在 `MOVED_OUT_OF_HERO` 同步 |

**docx-1023 的 board 串替换（非死键，不入上表）**：`music.body` 与 `sport.lead` 的 board 原串已被本轮整句取代——`music.body` 的 `src` 由 `uirpen#Index.03 音乐时光.Body.D` 改指 `docx-1023-brief.md#段[1]`，`sport.lead` 的由 `docx-2026-10-brief.md#段[26]` 改指 `docx-1023-brief.md#段[7]`；两键照旧渲染，故不在本节死键表内。`ui.pen` 音乐节正文仍留着 `music.body` 的旧 board 串（`ui.pen` 不在本 lane 可改路径内，接线 lane 更新设计稿后重新对齐，见 §1 差集说明）。

本 lane 只在 `UNREFERENCED` 白名单追加第 6、7 行的 4 个 Hero 键，既有条目与 `MIN_REFERENCED` / `MIN_LITERAL_CALLS` 判据未动；登记后 `node tools/verify-copy-wiring.mjs` rc=0。原白名单里 7 个旧名字仍全部落在「已由字面串到达」（`scholarly.title.zh` 走 `Scholarly.tsx` 的 `text()` 调用，另三个见上表第 1 行）或「已随字典删除」（`scholarly-jhu.hint`、`scholarly-hir.card.file`、`elder.body`，前序 lane 已删）两侧。

另有两处 board↔字典的窄豁免登记在 `tools/fidelity-scholarly.mjs`（该门的总体归一化口径不变，`normalise` 对其余键仍只折叠大小写与空白）：`scholarly-igem.title` / `scholarly-jhu.q1` / `scholarly-jhu.q2` 三键的 board 串用全角标点、站点 EN 串按「EN 模式禁 CJK」用半角，故这三键折叠标点后比对；`scholarly-hir.title` 在 board 上是单节点混排（`HIR writing contest-哈佛国际评论学术写作竞赛`），站点按语言分侧，故该键按「board 串的两半分别落在对应侧的值里」比对（docx-2026-10 轮后该键换成纯英文原文＋中文译文，board 串两半不再命中任一侧，此豁免随之失效，见 `docs/GATES.md` §2）。

页面上真实渲染的 `内容待补（素材未提供）`（`index.row2.body`，Index 行 02 的描述）不是死键渲染，不在本节登记范围。

各门禁能证什么、不能证什么、以及已知盲区与假绿历史，见 `docs/GATES.md`（门禁强度登记）。
