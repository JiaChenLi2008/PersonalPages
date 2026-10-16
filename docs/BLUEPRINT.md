# 站点蓝图 — 嘉宸个人介绍站（Style H · 瑞士网格）

源：`ui.pen`（pen.dev，version 2.21，唯一根 frame `r4IYo`）、`嘉宸网页框架-1014.docx`（90 段）、`HIR 竞赛文书.pdf`（4 页）、`docx-media/image{1,2,3}.jpeg`。
派生规格：`design-system.md`（ui.pen 全量设计语言，本文一切数值的出处）、`layout-brief.md`（栏目与交互）、`content-brief.md`（内容素材）、`hir-essay.md`（文书全文）。

**范围声明（本 lane 的硬边界）**：视觉语言一律取自 `ui.pen`，本 lane **不设计版式、不定配色**。设计稿未覆盖的区块一律记「设计稿待补」并指向 `docs/DESIGN-GAPS.md`，由设计稿先行补齐后再实现。
覆盖状态：`nav` / `hero` / `photoband` / `index`（可复用行式）/ `method` / `values` / `footer` = 设计稿已覆盖；`scholarly-jhu` / `scholarly-hir` / `elder` / `music` / `sport` = **设计稿待补**。
**设计稿基线（本文件与字典核对时的 `ui.pen` 状态）**：`63,373 B`、`mtime 2026-10-15 21:49:26 +0800`、`sha256` 前 16 位 `8dd19a8dd4e69238`。执行期内实测：设计侧在并行改写 `ui.pen`（Index 三行→四行、新增 `01 学术成果 · Section > Sub 01.1 iGEM`）。`uirpen#` 指针随设计稿移动 —— 设计稿冻版后必须重跑 `node docs/verify-copy.mjs` 复核，指针失配即报错（详 §6.6 #7）
文案一律逐字照抄材料原文（禁新增／改写／润色／翻译），逐条带 `src` 溯源，见 `docs/copy-en.json` + `docs/copy-zh.json`，门禁 `node docs/verify-copy.mjs`。

## 1. 站点区块清单

### 1.1 全站次序（单页 + 锚点；结构不得增删）

| # | 锚点 id | 区块名（中 / 英） | 结构来源 | 设计稿状态 |
|---|---|---|---|---|
| 1 | `nav` | 导航 / Nav | docx 段[3][5][7][9]（4 个编号项）+ ui.pen `Nav` | 已覆盖 |
| 2 | `hero` | 首屏 / Hero | ui.pen `Hero` 文案 + 材料事实 | 已覆盖 |
| 3 | `photoband` | 图版带 / PhotoBand | ui.pen `PhotoBand` | 已覆盖 |
| 4 | `index` | 四板块总览 / Index | docx 四板块，**四行** | 行式已覆盖；四行版 = **设计侧已实施**（§6.6 #7） |
| 5 | `scholarly` | 板块1 学术成果 / Scholarly Pursuits | docx §1.2 四个子板块，序：iGEM → JHU → Immunotherapy → HIR | 复用映射见 §2.9；子区块见下 |
| 5.1 | `scholarly-igem` | iGEM | content-brief §1.1：段[34] / 段[39] + 小节标题 + CTA 外链 + 2 处配图位 | 复用 `Columns` / `PhotoBand` 图注式（§2.8） |
| 5.2 | `scholarly-jhu` | JHU 夏校 / JHU summer school | content-brief §1.2：3 组「谜面 → 点击揭晓」+ 3 张真实照片 | **设计稿待补** → DESIGN-GAPS.md#1 |
| 5.3 | `scholarly-immuno` | 免疫治疗 / Immunotherapy Studies | content-brief §1.3：3 组问答 + docx 段[59] 三栏横滑揭晓 | 复用 `Columns` 三栏（§2.8）；状态待补 → DESIGN-GAPS.md#7 |
| 5.4 | `scholarly-hir` | HIR 竞赛 / HIR writing contest | content-brief §1.4：三问互动 + 长答案 + 作品卡外链 PDF | **设计稿待补** → DESIGN-GAPS.md#2 |
| 6 | `elder` | 板块2 助老活动 / Hands for the Elder | **无素材**：版式就位，整块标「待补」 | **设计稿待补** → DESIGN-GAPS.md#3 |
| 7 | `music` | 板块3 音乐时光 / Sound & Soul | ui.pen 文案（十年打击乐 / 马林巴） | **设计稿待补** → DESIGN-GAPS.md#4 |
| 8 | `sport` | 板块4 律动时刻 / Move & Groove | ui.pen 文案（足球 / 羽毛球） | **设计稿待补** → DESIGN-GAPS.md#5 |
| 9 | `method` | 方法 / Method | ui.pen `Columns`（观察 / 重复 / 协作） | 已覆盖 |
| 10 | `values` | 价值 / Values | ui.pen `Values`（生命 / 民生健康 / 尊严 / 智慧） | 已覆盖 |
| 11 | `footer` | 页脚 / Footer | ui.pen `Footer` | 已覆盖 |

### 1.2 已覆盖区块的分隔方式（区块间无 gap，靠各自 padding + 发丝线）

| 相接处 | 分隔方式 | 出处 |
|---|---|---|
| nav → hero | 1px `#111111` 通栏页头基线（`Rule`）+ Hero `padding-top: 56` | design-system.md §5.1 / §5.2 |
| hero → photoband | 纯留白：Hero `padding-bottom: 40`（Hero 与 PhotoBand 均无 gap） | §4.1：`[56,48,40,48]` |
| photoband → index | 图注黑条实底 `#111111`（`padding[12,48]`）紧贴图下；其后 Index `padding-top: 40` | §5.3 / §5.4 |
| index 内部 | 行间 1px `#D8D4CC` hairline；Head 之下 2px `#111111` 段基线 | §5.4 |
| index → 后续区块 | 末行之下仍有 1 条收尾 hairline，再 40 留白 | §5.4（行 958） |
| method / values / footer 之间 | method `padding[40,48]` 留白；values 四卡实底色块**直贴**（上下无留白）；footer 实底 `#111111` + `padding[36,48]` | §5.5 / §5.6 / §5.7、风险 R6 |
| 未覆盖区块（5.2 / 5.4 / 6 / 7 / 8） | 设计稿待补 → DESIGN-GAPS.md | — |

## 2. 版式映射（仅设计稿已覆盖区块）

### 2.1 颜色 token（12 值全量，design-system.md §2）

| token | 值 | 用途（本站在哪用） |
|---|---|---|
| `--c-paper` | `#F7F5F0` | 全站底纸（根 frame fill） |
| `--c-ink` | `#111111` | 正文主色、反白块底、页头 1px 线、段基线 2px、按钮实底、图注条、Footer 底 |
| `--c-ink-body` | `#333333` | 正文段 `D`（hero 摘要 / index 行 / 方法列） |
| `--c-rule` | `#D8D4CC` | hairline 1px（hero 键值区 ×4、index 行间） |
| `--c-rule-strong` | `#111111` | 页头基线 1px / index 段基线 2px |
| `--c-muted` | `#6E6E6E` | 品牌中文名 `CN`、hero 键名 `K`、index 区间 `R`、`SPORT` |
| `--c-muted-on-dark` | `#9A9A9A` | 黑底次要字（图注 `C`、Footer 版权 `R`） |
| `--c-label-on-color` | `#B9B9B9` | 深色卡上的 `VALUE` 标签（棕卡；蓝/绿卡 2026-10-16 改值 → `--c-white`，达 AA 4.5:1） |
| `--c-white` | `#FFFFFF` | 反白字（按钮、图注主句、序号、卡标题） |
| `--c-blue` | `#1B4BC4` | 品牌点、导航序号、eyebrow、`RESEARCH`、方法强调线、序号色块 01、民生健康卡底 |
| `--c-green` | `#0E7A46` | 序号色块 02 / `MUSIC`、尊严卡底 |
| `--c-sand` | `#C9B896` | 序号色块 03 / 智慧卡底 / Footer 邮箱字 |
| `--c-brown` | `#4A3C22` | 生命卡底 / 米卡上的 `VALUE` |
| （无值） | — | `cornerRadius`：全文档 0 处声明 ⇒ **全站直角**；`opacity` / 阴影 / 渐变：文档中无此值，一律不实现 |

### 2.2 Nav（`nav`）← design-system.md §5.1

| ui.pen 节点 | 本块部分 | token / 数值 |
|---|---|---|
| `Nav > Row` | 内层单行 | `--nav-h` 80px、`--gutter-x` 48px、`justify=space_between`、`align=center` |
| `Nav.Row.Brand` | 品牌段 | gap 16px（`--sp-16`）、`align=center` |
| `Brand > rectangle Mark` | 品牌点 | `--mark` 14×14px、`--c-blue` |
| `Brand > Name` | `nav.brand.name` = `LIN ZHIYUAN` | `--fs-15`、`--fw-key` 700、`--ls-label` +1px、`--c-ink` |
| `Brand > CN` | `nav.brand.cn` = `林知远` | `--fs-14`、`--fw-normal`、`--ls-none` 0、`--c-muted` |
| `Nav.Row.Links` | 导航 4 项容器 | gap 30px、`align=center` |
| `Links > {项} > N` | 序号 `1`–`4` | IBM Plex Mono `--fs-11`、`--c-blue` |
| `Links > {项} > L` | 项标签 | Noto `--fs-14`、`--c-ink`；文案改指 docx：`nav.item1..4.zh/.en` |
| `Nav.Row.Mail` | `nav.mail` | IBM Plex Mono `--fs-12`、`--c-ink` |
| `Nav > rectangle Rule` | 页头基线 | `--rule-h` 1px、`--c-rule-strong`、`w=fill` |

链接目标（冻结清单固定）：`item1#scholarly` / `item2#elder` / `item3#music` / `item4#sport`。ui.pen 原第 4 项为「理念」→ 按冻结清单改指 `sport`；`values` 无导航入口，**不得新增第 5 项**（结构不得增删）。

### 2.3 Hero（`hero`）← design-system.md §5.2

| ui.pen 节点 | 本块部分 | token / 数值 |
|---|---|---|
| `Hero` | 区块容器 | `--pad-hero` 56px 48px 40px 48px、gap 28px、`--c-paper` |
| `Hero.Grid` | 两列栅格 | gap 32px、`align-items: end`、`fill` + `--col-hero-right` 360px |
| `Grid.Left > K` | eyebrow `hero.eyebrow` | IBM Plex Mono `--fs-12`、`--ls-eyebrow` +4px、`--c-blue` |
| `Grid.Left > H1` | 英文主标 `hero.h1` | Inter `--fs-118`、`--fw-black` 900、`--lh-display` 0.92、`--ls-display` −5px、`--c-ink` |
| `Grid.Left > H1cn` | 中文主标 `hero.h1cn` | Noto `--fs-30`、`--fw-title` 800、`--lh-cn-title` 1.35、`--c-ink` |
| `Grid.Right > D` | 摘要 `hero.summary` | Noto `--fs-15`、`--fw-normal`、`--lh-body-hero` 1.95、`--c-ink-body`、`fixed-width` |
| `Grid.Right > {学科,乐器,运动} > K` | 键名 | IBM Plex Mono `--fs-11`、`--c-muted` |
| `Grid.Right > {…} > V` | 键值 | Noto `--fs-13`、`--c-ink` |
| `Grid.Right > rectangle Rule` ×4 | 键值区 hairline | `--rule-h` 1px、`--c-rule`；结构 `R-K-R-K-R-K-R`（末行下仍有收尾线） |
| `Hero.Btns > B1` | 实底按钮 `hero.btn1` | `--pad-btn` 16px 32px、底 `--c-ink`、字 `--c-white` `--fs-13` `--ls-label` |
| `Hero.Btns > B2` | 描边按钮 `hero.btn2` | `--pad-btn`、`stroke` 1px `--c-ink`、字 `--c-ink`；两按钮间距 = **实现补充 12px**（§2.11 / 风险 R3） |

出处订正：`design-system.md §5.2` 把 hero 摘要 `D` 画在 `Left` 下；`ui.pen` 实测在 `Right` 下（`Hero.Grid.Right.D`，行同层还有三组键值）。实现以 `ui.pen` 为准，文案指针即 `uirpen#Hero.Grid.Right.D`。

### 2.4 PhotoBand（`photoband`）← design-system.md §5.3

| ui.pen 节点 | 本块部分 | token / 数值 |
|---|---|---|
| `PhotoBand > Media` | 全宽图版 | `w=fill`（1440）、`--hero-photo-h` 560px、`fill.mode=cover`、`clip=true`；实测比例 **1440/560 = 2.571**（名称写 21:9=2.333，不一致 → 按实测 2.571 落码，风险 R2） |
| `PhotoBand > Cap` | 图注条 | 实底 `--c-ink`、`--pad-cap` 12px 48px、gap 24px、`align=center` |
| `Cap > L` | `photoband.figcap` | IBM Plex Mono `--fs-11`、`--ls-figcap` +2px、`--c-white` |
| `Cap > C` | `photoband.altnote` | IBM Plex Mono `--fs-11`、`--ls-none`、`--c-muted-on-dark` |

### 2.5 Index 行式（`index`；四行版由设计侧已实施，见 §6.6 #7）← §5.4

| ui.pen 节点 | 本块部分 | token / 数值 |
|---|---|---|
| `Index` | 区块容器 | `--pad-section-y` 40px、`--gutter-x` 48px |
| `Index.Head` | 区块头 | `padding: 0 0 20px 0`、`space_between`、`align-items:end` |
| `Head > L` | `index.head.eyebrow` | IBM Plex Mono `--fs-12`、`--ls-eyebrow` +4px、`--c-ink` |
| `Head > R` | `index.head.range` | IBM Plex Mono `--fs-11`、`--c-muted` |
| `Index > rectangle Rule` | 段基线 | `--rule-h-strong` 2px、`--c-rule-strong` |
| `Index > {行}` | **可复用行式** | `h` auto、`--pad-row` 22px 0、gap 24px、`align=center` |
| `行 > Num` | 序号色块 | `--num-block` 64×64px；01 `--c-blue`、02 `--c-green`、03 `--c-sand` |
| `Num > No` | 序号字 | Inter `--fs-26`、`--fw-black`、`textAlign=center`；03 米底改用 `--c-ink`；**须补显式宽度 64px**（实现补充，风险 R4） |
| `行 > Body > Top > T` | 行标题 | Noto `--fs-34`、`--fw-title` 800、`--c-ink` |
| `行 > Body > Top > EN` | 行英文标 | Inter `--fs-13`、`--fw-key`、`--ls-caps` +3px；01 `--c-blue`、02 `--c-green`、03 `--c-muted` |
| `行 > Body > D` | 行正文 | Noto `--fs-14`、`--fw-normal`、`--lh-body` 1.9、`--c-ink-body`、`fixed-width` |
| `行 > Media` | 方图 | `--thumb` 148×148px、`mode=cover`、`clip=true`、比例 1:1 |
| 行间 | 分隔 | 每行之后 1px `--c-rule`（含末行后的收尾线） |

### 2.6 Method（`method`，ui.pen `Columns`）← §5.5

| ui.pen 节点 | 本块部分 | token / 数值 |
|---|---|---|
| `Columns` | 区块容器 | `--pad-section-y` 40px、`--gutter-x` 48px、gap 24px |
| `Columns > K` | `method.eyebrow` | IBM Plex Mono `--fs-12`、`--ls-eyebrow` +4px、`--c-blue` |
| `Columns > T` | `method.title` | Inter `--fs-64`、`--fw-black`、`--lh-display-2` 0.95、`--ls-display-2` −2px、`--c-ink` |
| `Columns > Cols` | 三列容器 | gap 32px、三列等宽 `fill` |
| `Cols > {列} > rectangle Rule` | 条目锚线 | `--accent-rule` 40×3px、`--c-blue` |
| `Cols > {列} > T` | 列标题 | Noto `--fs-22`、`--fw-title` 800、`--c-ink` |
| `Cols > {列} > D` | 列正文 | Noto `--fs-14`、`--lh-body` 1.9、`--c-ink-body`、`fixed-width` |

### 2.7 Values（`values`）← §5.6

| ui.pen 节点 | 本块部分 | token / 数值 |
|---|---|---|
| `Values` | 容器 | 四等分满宽、**无 gap**、卡高 `--card-h` 260px、上下贴边 `space_between` |
| `Values > 生命` | 卡 1 | 底 `--c-brown`；`K` `--c-label-on-color`；`T` `--c-white` |
| `Values > 民生健康` | 卡 2 | 底 `--c-blue`；`K` `--c-white`（2026-10-16 改值，AA）；`T` `--c-white` |
| `Values > 尊严` | 卡 3 | 底 `--c-green`；`K` `--c-white`（2026-10-16 改值，AA）；`T` `--c-white` |
| `Values > 智慧` | 卡 4 | 底 `--c-sand`；`K` `--c-brown`；`T` `--c-ink` |
| `卡 > K` | `values.label` = `VALUE` | IBM Plex Mono `--fs-10`、`--ls-caps` +3px |
| `卡 > T` | 卡标题 `values.card1..4` | Noto `--fs-42`、`--fw-black` 900 |
| 卡内 | padding / gap | `--pad-card` 28px 24px、gap 10px |
| 卡间 | 分隔 | **直贴，不加分隔线**（R6：文档无说明，本 lane 不新增） |

### 2.8 Footer（`footer`）← §5.7

| ui.pen 节点 | 本块部分 | token / 数值 |
|---|---|---|
| `Footer` | 容器 | 实底 `--c-ink`、`--pad-footer` 36px 48px、gap 22px |
| `Footer.Top` | 内层 | `space_between`、`align-items: end` |
| `Top.L > T` | `footer.cta` | Inter `--fs-48`、`--fw-black`、`--ls-display-2` −2px、`--c-white` |
| `Top.L > E` | `footer.mail` | IBM Plex Mono `--fs-14`、`--c-sand` |
| `Top > R` | `footer.legal`（两行） | IBM Plex Mono `--fs-11`、`--lh-running` 1.7、`textAlign=right`、`--c-muted-on-dark` |
| `Footer.Top.L` | 左列 | gap 8px |

### 2.9 复用映射（`scholarly` / `scholarly-igem` / `scholarly-immuno`：只复用既有节点，不新增数值）

| 区块 | 复用 | 说明 |
|---|---|---|
| `scholarly`（5） | `Index` 行式（§2.5 全部数值）+ `Columns` 三列（§2.6） | 四个子板块按冻结序 iGEM → JHU → Immunotherapy → HIR 排列；行式逐条复用，**不改任何既有节点数值** |
| `scholarly-igem`（5.1） | `PhotoBand` 图注式（§2.4 的 `Cap`：`--pad-cap` 12/48、`--fs-11`、`+2px`、`--c-white`/`--c-muted-on-dark`）+ `Columns` 列式（§2.6）承载 `sub1`/`para1`、`sub2`/`para2` | 2 处配图位按 §5 占位框清单；CTA 为外链，用 `Hero.Btns > B2` 描边钮样式（§2.3） |
| `scholarly-immuno`（5.3） | `Columns > Cols` 三栏等宽 + gap 32px（§2.6） | 三组问答各占一栏；揭晓态见 §4 第 4 行（交互规格），其视觉状态设计稿待补 → DESIGN-GAPS.md#7 |
| 区块级拼装（如何把上述节点串成板块） | — | 未在 `ui.pen` 内出现 → 设计稿待补 → DESIGN-GAPS.md（各条「可复用关系」栏） |

### 2.10 文案溯源指针与门禁语义（`docs/verify-copy.mjs`）

| 指针形式 | 可定位来源 | 门禁断言 |
|---|---|---|
| `content-brief.md#段[N]`、`layout-brief.md#段[N]` | brief 中所有提到该段号的 markdown 块（空行分隔）之并集 | 字典 `text` 必须是该并集内的**逐字子串**（含字面 `\n` 写法） |
| `design-system.md#<Anchor>` | `Nav` / `Hero` / `PhotoBand` / `Index` / `Columns` / `Values` / `Footer` 小节标题至下一标题之间 | 同上 |
| `hir-essay.md#pN` | 第 N 页区间（`p0` = 文首导言区） | 同上 |
| `uirpen#<A.B.C>` | `ui.pen` 中按节点名逐段下沉（匿名 `frame` 层自动跳过） | `text` 必须等于该节点子树内某个文本节点的 `content`（逐字） |

其余硬断言：① 两字典键集合一致；② 字段/类型齐全；③ `lang ∈ {en, zh-Hans}` 且 `fallback: true` 必伴随 `lang: "en"`；④ `text` 非空且不含 TODO/FIXME/XXX；⑥ `copy-zh.json` 中 `fallback` 条目与 `copy-en.json` 同键同文。
`pending: true` 条目跳过「逐字溯源」断言（材料无原文），但其余断言照旧。

### 2.11 实现补充值（`ui.pen` 无此值，design-system.md §8 列出「文档中无此值」）

| 项 | 取值 | 理由 |
|---|---|---|
| 按钮间距（`Hero.Btns` 无 gap） | 12px | 风险 R3；文档无值，取 4 倍数组最小档 |
| `No` 居中修正 | 补显式宽度 64px | 风险 R4：`No` 绝对定位且无宽度，`textAlign:center` 不生效 |
| 中文标题行高（`T` 22/34/42/48、`No` 26 均无 `lineHeight`） | 1.05 | 风险 R5：文档无值，按展示级 1.0–1.15 取值 |
| 动效 token | `--dur-fast` 120ms、`--dur-base` 240ms、`--dur-slow` 420ms、`--ease-out` `cubic-bezier(.2,.8,.2,1)`、`--ease-inout` `cubic-bezier(.4,0,.2,1)` | §8：ui.pen 无过渡/动效值；时长取自 §4.5 的 2px 基准网格（120/240/420 皆偶数） |
| 响应式比例 | 0.833 / 0.625 / 0.5（= 断点 ÷ 1440） | §8：ui.pen 无断点/流式规则；推导见 §3 |
| 锚点滚动留白 | `scroll-margin-top: 80px` = `--nav-h` | 粘顶导航遮挡锚点标题 |
| HIR 长答案容器 | `max-height: 60vh` + 内部滚动 | content-brief 段[71] 明示「答案会很长，需预留展开/滚动空间」 |
| 语言切换件、窄屏导航折叠件、交互态（hover/focus/active） | 不实现 | ui.pen 无此件 → 设计稿待补 → DESIGN-GAPS.md#7 |

## 3. 响应式三档

推导规则（`ui.pen` 只有一个 1440 宽画板，§8「响应式断点/流式规则：文档中无此值」⇒ 下表为**按比例推导的实现补充**）：

1. 比例 `r` 逐档取 `断点 ÷ 1440`：≤1200px → **0.833**；≤900px → **0.625**；≤600px → **0.5**（0.417 会让标题与正文撞档，故手机档按 0.5 取整，理由：可读性下限）。
2. 字号：取 `2 × round(桌面值 × r ÷ 2)`（§4.5 基准网格 2px，无奇数）；`≥26px` 档下限 18px、`22px` 档下限 16px；**≤15px 一律不缩**。
3. 间距：取 `8 × round(桌面值 × r ÷ 8)`（§4.5 的 8 倍数组），下限 8px。
4. 同档内若两档缩放后相等，高位档 +2px（保持阶梯严格递减）；≤600px 档 `≥26px` 的三档收敛至 18px（比例推导的直接结果）。
5. 多列折单列、卡折行、图版比例见 3.3；未覆盖区块的窄屏行为**一律待设计稿**，本表不代拟。

### 3.1 全局（gutter / 节距 / 断点）

| token | 桌面（1440） | ≤1200px | ≤900px | ≤600px |
|---|---|---|---|---|
| `--gutter-x` | 48px | 40px | 32px | 24px |
| `--pad-section-y` | 40px | 32px | 24px | 24px |
| `--pad-hero`（上/右/下/左） | 56 / 48 / 40 / 48 | 48 / 40 / 32 / 40 | 32 / 32 / 24 / 32 | 32 / 24 / 24 / 24 |
| `--pad-footer` | 36 / 48 | 32 / 40 | 24 / 32 | 16 / 24 |
| `--pad-card` | 28 / 24 | 24 / 24 | 16 / 16 | 16 / 16 |
| `--pad-row` | 22 / 0 | 16 / 0 | 16 / 0 | 8 / 0 |
| `--pad-cap` | 12 / 48 | 12 / 40 | 8 / 32 | 8 / 16 |
| `--nav-h` | 80px | 64px | 48px | 40px |

### 3.2 字号档（§3.2 的 14 档全量）

| 档 | 桌面 | ≤1200px | ≤900px | ≤600px | 用在哪 |
|---|---|---|---|---|---|
| `--fs-118` | 118px | 98px | 74px | 60px | hero `H1` |
| `--fs-64` | 64px | 54px | 40px | 32px | method `T` |
| `--fs-48` | 48px | 40px | 30px | 24px | footer `T` |
| `--fs-42` | 42px | 36px | 26px | 22px | values 卡 `T` |
| `--fs-34` | 34px | 28px | 22px | 18px | index 行 `T` |
| `--fs-30` | 30px | 26px | 20px | 18px | hero `H1cn` |
| `--fs-26` | 26px | 22px | 18px | 18px | index `No` |
| `--fs-22` | 22px | 18px | 16px | 16px | method 列 `T` |
| `--fs-15` / `--fs-14` / `--fs-13` / `--fs-12` / `--fs-11` / `--fs-10` | 15 / 14 / 13 / 12 / 11 / 10px | 不缩 | 不缩 | 不缩 | 正文段 `D`、键值 `V`、按钮 `L`、eyebrow/键名 `K`、图注/序号/版权 |

### 3.3 已覆盖区块的折行与尺寸

| 区块 | 桌面（1440） | ≤1200px | ≤900px | ≤600px |
|---|---|---|---|---|
| `nav` | 单行 `h=80`，三段 `space_between`，`Links` gap 30 | 同构，`--nav-h` 64，`--gutter-x` 40，`Links` gap 24 | `Row` 改纵向两段（Brand+Mail 一行、Links 一行），高度 `auto`（≥48） | 同 ≤900；是否引入折叠件**待设计稿**（DESIGN-GAPS.md#7） |
| `hero` | `Grid` 两列 = `1fr 360px`，`align-items:end`，gap 32 | 右列 `--col-hero-right` 304px，gap 24 | **折单列**：`Grid` → 纵向（左列在上），右列 `fill` 全宽；键值行 `space_between` 保持 | 单列保持；`H1` 60px（§3.2） |
| `hero` 按钮 | `Btns` 横排，间距 12（§2.11） | 同 | 同 | 同（不折；两个按钮 `padding` 16/32 保持） |
| `photoband` | 图 1440×560（比例 2.571），图注条 `Cap` 两句并排 gap 24 | 高 = 宽 ÷ 2.571 → **464px**；`Cap` gap 24 保持 | 高 **352px**；`Cap` 改纵向（`L` 上 `C` 下），gap 8 | 高 **232px**；`Cap` 纵向 gap 8，字 11px 不缩 |
| `index` 行式 | 三段 = 色块 64 \| 文本列 fill \| 方图 148，行 `padding` 22/0，gap 24 | 色块 56、方图 120 | 色块 40、方图 96；行 `padding` 16/0 | 色块 32、方图 72；行内改纵向堆叠顺序 色块 → 文本 → 方图，gap 16、`padding` 8/0 |
| `index` 四行 | — | — | — | 四行版由**设计侧已实施**（§6.6 #7）；窄屏折行规则同上一行 |
| `method` 三列 | `Cols` 三列等宽 gap 32 | 三列保持，gap 24 | **折单列**：三列纵向，gap 24；每列仍带 40×3 锚线 | 单列保持，gap 16 |
| `values` 四卡 | 四等分满宽，`h=260`，无 gap | `h` 216 | **2×2**：每行 2 卡，`h` 160 | **1×4 竖排**：每卡 `h` 128 |
| `footer` | `Top` 三段 `space_between`，`align-items:end`，`padding` 36/48 | `padding` 32/40 | `Top` 改纵向（`L` 上 `R` 下），`align-items:start`，gap 16 | 同 ≤900；`R` 改左对齐（`textAlign:right` 在窄屏换行后失效） |

## 4. 交互规格

动效 token（§2.11，ui.pen 无值）：`--dur-fast` 120ms、`--dur-base` 240ms、`--dur-slow` 420ms、`--ease-out`、`--ease-inout`。**降级总则**：`@media (prefers-reduced-motion: reduce)` 下所有过渡时长取 0、位移取消，仅保留状态切换。

| # | 交互 | 触发方式 | 状态变化 | 时长 / 缓动 | reduced-motion 降级 | 无障碍属性 |
|---|---|---|---|---|---|---|
| 1 | 进入视口揭示 | `IntersectionObserver`，阈值 0.15，仅一次 | `opacity` 0→1、`translateY(8px)`→0；元素**始终在 DOM 内且可读** | `--dur-base` / `--ease-out` | 直接终态（无位移、无过渡） | 不加 `aria-hidden`；不拦截焦点 |
| 2 | 导航当前段高亮 + 平滑滚动 | 点击 `nav` 项；`IntersectionObserver` 做 scroll spy（根 `main`，`rootMargin: -80px`） | 该项 `N` 序号与 `L` 标签转 `--c-blue` 并置 `aria-current="true"`；其余复位 `--c-ink` | 滚动 `--dur-slow` / `--ease-inout` | `scroll-behavior: auto`（瞬时跳转），高亮保留 | `<nav aria-label>`；当前项 `aria-current="true"`；锚点 `scroll-margin-top: 80px` |
| 3 | JHU 三谜题揭晓 | 点击谜题件（`<button>`）—— docx 段[48]/[52]/[53]「点击一个东西或者图标，会显示答案：」 | 该谜题 `aria-expanded` false→true；答案区 `hidden` 移除；谜题件视觉态**待设计稿**（DESIGN-GAPS.md#7） | `--dur-base` / `--ease-out` | 立即切换 | `button[aria-expanded][aria-controls]`；答案区 `id` + `role="region"` + `aria-labelledby`（指按钮）；焦点留在按钮 |
| 4 | Immunotherapy 三栏揭晓 | docx 段[59]：横向滑动/滚轮；键盘 `Tab` 进容器后 `←`/`→` 切栏；亦可点击栏标题 | 三栏横向 scroll-snap；激活栏答案区 `aria-hidden` false，非激活栏保持 `true`；激活判定 = 栏中心与容器中心距离最小 | `--dur-base` / `--ease-inout` | 关闭 snap 动画（瞬时对齐），答案随激活立即显示 | 容器 `role="region"` + `aria-label` = 区块标题文案；栏内问题 `button[aria-expanded][aria-controls]`；容器 `tabindex="0"` + 可见焦点 |
| 5 | HIR 三问揭晓 | 点击问题卡（`<button>`）—— docx 段[71]「一组互动＋解答形式的页面作为 hook」 | 该卡答案区展开（`max-height: 60vh` + 内部滚动，§2.11）；其余卡独立不受影响；`Answer:` 标签仅在展开后可见 | `--dur-base` / `--ease-out` | 立即展开（无高度过渡） | `button[aria-expanded][aria-controls]`；答案区 `role="region"` + `aria-labelledby`；长文可滚动区加 `tabindex="0"` 以便键盘滚动 |
| 6 | 语言切换（**页内切换，不整页重载**） | 点击语言切换件（位置/样式**待设计稿** → DESIGN-GAPS.md#7） | `<html lang>` 在 `zh-Hans` / `en` 间切换；按字典 `lang` 字段显示/隐藏对应文本，`fallback` 条目在中文页显示英文原文；选择持久化（`?lang=` + `localStorage`） | `--dur-fast` / `--ease-out` | 无过渡，瞬时切换 | `<html lang>` 同步；切换件 `button[aria-pressed]` 或在 `<nav>` 内作为链接列出；文本语言与页面语言不一致时按 §6.4 加 `lang` 属性 |

未覆盖区块（5.2 / 5.4 / 6 / 7 / 8）的**视觉状态**（未揭晓态、揭晓态、空态、hover/focus/active、过渡曲线）一律待设计稿：DESIGN-GAPS.md#1/#2/#3/#4/#5/#7。

## 5. 占位框清单

规则（裁决第 6 条）：现有 3 张真实照片照用，`image2`/`image3` 显示宽度**不得超过原宽**（427px / 693px）；其余配图位与一切无图位一律用**等比占位框**并显式标注 `image pending`；占位框 `aria-hidden="true"`。

| # | 位置（锚点 › 槽位） | docx 原标记 | 目标宽高比 | 最小像素 | 标注 | 素材状态 |
|---|---|---|---|---|---|---|
| 1 | `photoband` › 全宽图版（`PhotoBand > Media`） | — | 1440 / 560 = **2.571** | 2880×1120（@2×） | `image pending` | 设计稿内为 Unsplash 占位图，需真实照片 |
| 2 | `index` › 行 01 方图 | — | **1:1** | 296×296（@2× 148） | `image pending` | 无图 |
| 3 | `index` › 行 02 方图 | — | **1:1** | 296×296 | `image pending` | 无图 |
| 4 | `index` › 行 03 方图 | — | **1:1** | 296×296 | `image pending` | 无图 |
| 5 | `scholarly-igem` › `Lab contribution` 下 | 段[33] `（此处配图-待定）` | **2.571**（复用图版带图注式） | 2880×1120 | `image pending` | 待补图 |
| 6 | `scholarly-igem` › `Paris Conference` 下 | 段[38] `（此处配图-待定）` | **2.571**（同上） | 2880×1120 | `image pending` | 待补图 |
| 7 | `scholarly-jhu` › summer school 课程/解剖现场（谜题外） | 段[46] `（此处配图-待定）` | **设计稿待补** → DESIGN-GAPS.md#1 | 见 DESIGN-GAPS.md#1 | `image pending` | 待补图 |
| 8 | `scholarly-hir` › 顶部 | 段[69] `（图片后续匹配）` | **设计稿待补** → DESIGN-GAPS.md#2 | 见 DESIGN-GAPS.md#2 | `image pending` | 待补图 |
| 9 | `elder` › 整块（含图位是否存在待定） | — | **设计稿待补** → DESIGN-GAPS.md#3 | 见 DESIGN-GAPS.md#3 | `image pending` | 无任何素材 |
| 10 | `music` / `sport` › 其余图位（如设计稿保留方图） | — | **设计稿待补** → DESIGN-GAPS.md#4/#5 | 见 DESIGN-GAPS.md#4/#5 | `image pending` | 无图 |

**照用不占位**（3 张真实照片，全部落在 `scholarly-jhu`，配对依 content-brief §1.2 顺序推断）：

| 文件 | 像素 | 对应谜题 | 显示宽度上限 |
|---|---|---|---|
| `docx-media/image1.jpeg` | 5712×4284（4:3） | 谜题 1（`scholarly-jhu.q1` / `a1`） | 不限（富余） |
| `docx-media/image2.jpeg` | 427×321（4:3） | 谜题 2（`q2` / `a2`） | **427px** |
| `docx-media/image3.jpeg` | 693×520（4:3） | 谜题 3（`q3` / `a3`） | **693px** |

## 6. 无障碍与 SEO 清单

### 6.1 语义标签与 heading 层级（全站 h1 唯一）

| 部位 | 标签 | 标题层级 |
|---|---|---|
| 页头 | `<header><nav aria-label="站点导航">`（`aria-label` 文案材料无原文 → **不写文字标签**，用 §6.5 缺口处理） | 不含标题 |
| 首屏 | `<section id="hero" aria-labelledby="hero-title">` | `<h1 id="hero-title">` = `hero.h1` + `<span lang="zh-Hans">hero.h1cn</span>`（**唯一 h1**，两段文案同属主标题） |
| 图版带 | `<figure>` + `<figcaption>` | 不设标题（无标题文案）；`figcaption` 内两行 = `photoband.figcap` / `photoband.altnote` |
| 总览 | `<section id="index" aria-labelledby="index-title">` | `<h2 id="index-title">` = `index.head.eyebrow`；`index.head.range` 为 `<p>` |
| 板块1 | `<section id="scholarly" aria-labelledby="scholarly-title">` | `<h2>` = `scholarly.title.zh`/`.en`；子板块 `<h3>`（5.1–5.4）；iGEM 小节 `<h4>`（`Lab contribution` / `Paris Conference`） |
| 板块2–4 | `<section id="elder|music|sport" aria-labelledby="…">` | `<h2>` = 对应标题文案 |
| 方法 | `<section id="method" aria-labelledby="method-title">` | `<h2 id="method-title">` = `method.title`；`method.eyebrow` 为 `<p>`；三列 `<h3>` |
| 价值 | `<section id="values">`（无标题文案，不编造 `aria-label`） | 四卡各一个 `<h2>` = `values.card1..4`（并列一级内容） |
| 页脚 | `<footer aria-labelledby="footer-title">` | `<h2 id="footer-title">` = `footer.cta` |
| 问答件 | `<button>`（谜题/问题）+ `<div role="region">`（答案） | 问答文案**不作标题**，用 `aria-labelledby` 关联按钮 |

### 6.2 状态与焦点

- `aria-expanded` + `aria-controls`：JHU 三谜题（§4#3）、Immunotherapy 三栏（§4#4）、HIR 三问（§4#5）——初始 `aria-expanded="false"`，答案区初始 `hidden`；揭晓后不改焦点位置。
- 语言切换件：`button[aria-pressed]` 或 `<nav>` 内可聚焦链接；切换后 `<html lang>` 与 `document.title` 同步。
- 焦点可见：`:focus-visible { outline: 2px solid var(--c-blue); outline-offset: 2px; }`（**实现补充**：ui.pen 无焦点态）。
- 键盘可达：scroll-snap 容器 `tabindex="0"`；HIR 长答案滚动区 `tabindex="0"`；`nav` 项按 DOM 序，tab 序 = 视觉序。
- 对比度：`--c-white` on `--c-blue` ≈ 7.2:1；`--c-muted-on-dark` on `--c-ink` ≈ 5.3:1（design-system.md 风险 R9，均达 AA）。

### 6.3 图片

| 类型 | 规则 |
|---|---|
| 真实照片（3 张，`scholarly-jhu`） | `alt` = 对应谜题答案原文（`copy-*.json` 的 `scholarly-jhu.a1` / `a2` / `a3`，逐字，禁自撰描述）；`loading="lazy"`、`decoding="async"`、显式 `width`/`height` 或 `aspect-ratio` 防抖 |
| `photoband` 图版 | 同上规则，且 `object-fit: cover`；无真实图期间为占位框（`image pending`） |
| 占位框（§5 全部 10 条） | `aria-hidden="true"`；内含可见标注文字 `image pending`；容器按目标宽高比留白，不产生布局位移 |
| 装饰性图形 | `Nav Mark`（14×14 品牌点）为装饰 → `aria-hidden="true"` |

### 6.4 `lang` 属性规则（硬）

1. 页面级：`<html lang="zh-Hans">`（默认中文页）/ `<html lang="en">`（切换后）；语言切换为**页内切换**，不整页重载（裁决）。
2. 元素级：文本语言 ≠ 页面语言时，在承载该文本的元素上加 `lang="<该条 text 的真实语言>"`，取值直接来自 `copy-*.json` 的 `lang` 字段（`zh-Hans` / `en`）。
3. **回落清单（`copy-zh.json` 中 `fallback: true`，共 80 条 —— 中文页上这些元素必须加 `lang="en"`）**：

| 分组 | 条目 |
|---|---|
| `nav`（11） | `nav.brand.name`、`nav.mail`、`nav.item1.en`、`nav.item1.no`、`nav.item2.en`、`nav.item2.no`、`nav.item3.en`、`nav.item3.no`、`nav.item4.en`、`nav.item4.no`、`nav.lang.en` |
| `hero`（4） | `hero.eyebrow`、`hero.h1`、`hero.btn1`、`hero.btn2` |
| `index`（9） | `index.head.range`、`index.row1.titleEn`、`index.row1.no`、`index.row2.titleEn`、`index.row2.no`、`index.row3.titleEn`、`index.row3.no`、`index.row4.titleEn`、`index.row4.no` |
| `scholarly`（6） | `scholarly.title.en`、`scholarly.imagePending`、`scholarly.revealTap`、`scholarly.revealSwipe`、`scholarly.meta`、`scholarly.linkPdf` |
| `scholarly-igem`（8） | `scholarly-igem.title`、`scholarly-igem.no`、`scholarly-igem.sub1`、`scholarly-igem.para1`、`scholarly-igem.sub2`、`scholarly-igem.para2`、`scholarly-igem.cta.en`、`scholarly-igem.cta.url` |
| `scholarly-jhu`（8） | `scholarly-jhu.title`、`scholarly-jhu.no`、`scholarly-jhu.q1`、`scholarly-jhu.a1`、`scholarly-jhu.q2`、`scholarly-jhu.a2`、`scholarly-jhu.q3`、`scholarly-jhu.a3` |
| `scholarly-immuno`（11） | `scholarly-immuno.title`、`scholarly-immuno.no`、`scholarly-immuno.q1.no`、`scholarly-immuno.q1`、`scholarly-immuno.a1`、`scholarly-immuno.q2.no`、`scholarly-immuno.q2`、`scholarly-immuno.a2`、`scholarly-immuno.q3.no`、`scholarly-immuno.q3`、`scholarly-immuno.a3` |
| `scholarly-hir`（15） | `scholarly-hir.no`、`scholarly-hir.answerLabel`、`scholarly-hir.q1.no`、`scholarly-hir.q1`、`scholarly-hir.a1`、`scholarly-hir.bridge1`、`scholarly-hir.q2.no`、`scholarly-hir.q2`、`scholarly-hir.a2`、`scholarly-hir.bridge2`、`scholarly-hir.q3.no`、`scholarly-hir.q3`、`scholarly-hir.a3`、`scholarly-hir.closing`、`scholarly-hir.card.title` |
| `elder`（2） | `elder.title.en`、`elder.contentPending` |
| `music`（1） | `music.titleEn` |
| `sport`（1） | `sport.titleEn` |
| `method`（1） | `method.title` |
| `values`（1） | `values.label` |
| `footer`（2） | `footer.cta`、`footer.mail` |

合计 **11+4+9+6+8+8+11+15+2+1+1+1+1+2 = 80** 条（= `node -e` 过滤 `copy-zh.json` 的 `fallback === true` 的实际条数；本表 2026-10-16 按当前字典重新生成，较旧表新增 chrome 条目（`*.no`、`*.kicker`、`lang.*` 类）、Index 第四行 `index.row4.*` 与 HIR 独立题号 `scholarly-hir.q1.no/q2.no/q3.no`）。
4. **反向清单（`copy-en.json` 中 `lang: "zh-Hans"`，共 54 条）**：英文页上这些元素必须加 `lang="zh-Hans"`（材料无英文原文，**不得翻译**）：

| 分组 | 条目 |
|---|---|
| `nav`（6） | `nav.brand.cn`、`nav.item1.zh`、`nav.item2.zh`、`nav.item3.zh`、`nav.item4.zh`、`nav.lang.zh` |
| `hero`（8） | `hero.h1cn`、`hero.summary`、`hero.key.subject`、`hero.val.subject`、`hero.key.instrument`、`hero.val.instrument`、`hero.key.sport`、`hero.val.sport` |
| `photoband`（2） | `photoband.figcap`、`photoband.altnote` |
| `index`（9） | `index.head.eyebrow`、`index.row1.title`、`index.row1.body`、`index.row2.title`、`index.row2.body`、`index.row3.title`、`index.row3.body`、`index.row4.title`、`index.row4.body` |
| `scholarly`（4） | `scholarly.title.zh`、`scholarly.kicker`、`scholarly.figcap2`、`scholarly.figcap3` |
| `scholarly-igem`（1） | `scholarly-igem.cta.zh` |
| `scholarly-jhu`（1） | `scholarly-jhu.hint` |
| `scholarly-hir`（2） | `scholarly-hir.title`、`scholarly-hir.card.file` |
| `elder`（3） | `elder.title.zh`、`elder.kicker`、`elder.body` |
| `music`（3） | `music.title`、`music.kicker`、`music.body` |
| `sport`（3） | `sport.title`、`sport.kicker`、`sport.body` |
| `method`（7） | `method.eyebrow`、`method.col1.title`、`method.col1.body`、`method.col2.title`、`method.col2.body`、`method.col3.title`、`method.col3.body` |
| `values`（4） | `values.card1`、`values.card2`、`values.card3`、`values.card4` |
| `footer`（1） | `footer.legal` |

合计 **6+8+2+9+4+1+1+2+3+3+3+7+4+1 = 54** 条（= `node -e` 过滤 `copy-en.json` 的 `lang === "zh-Hans"` 的实际条数；本表 2026-10-16 按当前字典重新生成）。

### 6.5 SEO

| 项 | 取值 | 出处 |
|---|---|---|
| `<title>` | `LIFE, IN FOCUS.`（`hero.h1` 原文，换行归一为空格 = 实现补充） | design-system.md §5.2 |
| `meta[name=description]` | `hero.summary` 原文（41 字） | ui.pen `Hero.Grid.Right.D` |
| `og:title` / `og:description` | 同上两条原文 | 同上 |
| `og:image` | `photoband` 图版文件（当前为占位 → 有真图前不发 `og:image`） | §5 #1 |
| `<html lang>` / `hreflang` | `lang` 随切换更新；单页 + 页内切换 ⇒ **不发 `hreflang`**（无独立 URL）；如后续改 `?lang=en`，再补 `hreflang` | 裁决：页内切换 |
| `canonical` | 站点根 URL（不含 `?lang`；切换参数用 `rel="alternate"` 时另议） | — |
| 结构化数据 | `application/ld+json`：`{"@type":"Person","name":"林知远","alternateName":"LIN ZHIYUAN","email":"lin.zhiyuan@example.com"}` —— 三字段全部逐字取自 `copy-*.json`（`nav.brand.cn` / `nav.brand.name` / `nav.mail`），**不新增描述性文案** | design-system.md §5.1 |
| `robots` | `index,follow`；`sitemap.xml` 单页条目 | — |
| `meta[name=theme-color]` | `#F7F5F0`（`--c-paper`，token 值非文案） | §2.1 |
| 性能 | 首屏 HTML 内联关键 token（§9 CSS 变量表）；真实照片 `lazy` + `WebP`；`photoband` 图版固定宽高比防 CLS | `PaperBand.Cap` 的 `C` 节点即载此约束 |

### 6.6 未决与缺口汇总

1. **`pending` 条目（1 条）**：`elder.body` = `待补` —— `elder` 整块无任何素材（裁决第 5 条：版式就位、整块标「待补」），文案缺 **正文 / 标题之外的任何文字 / 图** 三类；需材料提供方补，禁编造。
2. **文案缺口（无字典条目）**：语言切换件的显示标签（如 `EN` / `中文`）材料中无原文；`<nav aria-label>`、`<section aria-label>` 等无障碍标签文案同样无原文 —— 本 lane **不写入字典**（无字可落），实现时按 `lang` 规则处理，缺文案由材料方补。
3. **材料内数字冲突（照抄不改，需裁决）**：`index.head.eyebrow` = `INDEX / 三段工作`、`index.head.range` = `01 — 03 · 2024—2026` 均按三行写；冻结清单要求四行。字典保留原文，四行版文案由材料方给。
4. **`footer.legal` 含 `占位` 二字**（ui.pen 原文，非本 lane 标注）——照抄；上线前需材料方给正式版权行。
5. **brief 与设计稿不一致 2 处**：hero 摘要 `D` 的父节点（§2.3 出处订正）；`ui.pen` 3 张 1:1 方图为 Unsplash 占位（`study-abroad-portfolio.pen` 的 Style H「生命」卡底色为 `#111111` 而 `ui.pen` 为 `#4A3C22`，以 `ui.pen` 为准，风险 R1）。
6. **设计缺口**：见 `docs/DESIGN-GAPS.md`；其中 #6（索引三行→四行）**已由设计侧实施**、#1–#5 与 #7 仍待补（详见该文件文末变更记录）。
7. **`ui.pen` 在设计侧并行改写（本 lane 执行期内实测）**：Index 已改为四行（`01 学术成果` / `02 助老活动` / `03 音乐时光` / `04 律动时刻`），`Head` 文案改为 `INDEX / 四个板块` 与 `01 — 04 · 2024—2026`，并新增 `01 学术成果 · Section > Sub 01.1 iGEM`。据此核对：`index` 四行 = 设计侧已实施；`scholarly-jhu`、`scholarly-hir`、`elder`、`music`、`sport` 截至基线仍未出现 ⇒ 仍标「设计稿待补」。
8. **字典与设计稿的落差（本 lane 不自行改写）**：① `index.row1.body`（旧 `01 科研` 行正文 `计算生物学 · 免疫。…`）在新四行设计稿中已被删除（`grep` 命中 0 次），新版第 1 行正文改由设计侧自撰 ⇒ **该字典条目已删除**，本 lane 不自撰替代文本；② `index.head.eyebrow` / `index.head.range` 设计稿已改为 `INDEX / 四个板块` / `01 — 04 · 2024—2026`，字典仍持 frozen brief 原文（`design-system.md#Index`），是否回写待裁决。
9. **设计稿内的非材料文案（需裁决）**：设计侧在 `ui.pen` 中新增了材料中不存在的句子 —— `INDEX / 四个板块`、`内容待补（素材未提供）`、`iGEM Project · JHU summer school · Immunotherapy Studies · HIR writing`。材料中无此三句 ⇒ 与「全站文案不得出现未在材料中出现的句子」冲突；本 lane 未将其收入字典。
