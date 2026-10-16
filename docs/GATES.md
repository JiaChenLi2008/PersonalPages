# 门禁强度登记（GATES）

冻版基线：`ui.pen` 137536 B、sha256 `8816b923b24c00e4…`（同 `docs/CHROME.md`）。

本文件登记每条校验脚本**能证什么 / 不能证什么 / 跑在哪**，以及已知盲区与假绿历史。
凡标「未实测」「未审」处，即本轮没有取到证据，不得读作「已证明」；本文件不登记待办（与 `docs/DESIGN-GAPS.md` 分工不同）。

P12 轮（本轮）只动两处判据，均属收紧：`tools/fidelity-index-method-values-footer.mjs` 的 Values
逐卡配对从 `--card-label-ink` 扩到 `--card-fill` / `--card-title-ink`（P9 已建的逐卡模式），
`tools/verify-responsive.mjs` 的档位值改按「承接该 token 的选择器」断言。设计稿与 `src/**` 未动。

P14 轮只改两条 fidelity 的**输入解析**（`nav-hero-photoband` / `elder-music-sport` 去掉硬编码绝对路径兜底，改与另两条一致的向上查找）：缺 `ui.pen` 一律以 rc=2 单行 `UNAVAILABLE:` 退出，不再静默改成别的副本；判据、阈值与成功路径输出逐字未动，设计稿与 `src/**` 未动。

T3b 轮落地**默认英文 + 单语纯度**（裁决：`.agents/briefs/lang-purity-ruling.md`；BLUEPRINT §6.4 已就地改写并标注旧模型作废）：`DEFAULT_LANG="en"`、`index.html` 的 `<html lang="en">` 与英文 head；字典两侧各持本语言文本（134 → 140 键，新增 6 个图位 alt 键）；`fallback`/`pending` 字段废弃。新增 `tools/verify-lang-purity.mjs`，并把两条既有判据**同强度换向**：`verify-ssr-dom` 的「`lang` 双值」→「单语言（无 CJK、`lang` 只有 `en`）+ h2 文本逐字取 `copy-en.json`」，`verify-lang-toggle` 的默认模式 zh-Hans → en（13 对键的「自身一侧在场 + 另一语言文本不在场」）。`docs/verify-copy.mjs` 的溯源断言按「材料侧逐字 / 译文侧同槽位且互异」重写，断言条数 214 不变（126 原文逐字 + 74 译文侧 + 14 材料混排改写）。本轮实测：四条 fidelity 因 `ui.pen` 与冻版哈希不符（`41dd7140…`/140380 B vs `8816b923…`/137536 B）直接拒绝比对，rc=1，与本轮改动无关（本轮未动 `ui.pen`、`src/styles/**`、`src/sections/**`）。

P15 轮把三条自足门禁接进 CI（`tools/verify-motion.mjs`、`tools/verify-lang-purity.mjs`、`tools/verify-assets.py`），
只动 `.github/workflows/deploy.yml`、本文件与 `README.md` 的登记；另一处改动是 `hir-fig-2688` 一对派生图按全幅宽白名单上限（≤320 KB）以更高画质重编，`tools/verify-assets.py` 因此多一条白名单判据。判据强度未放宽：白名单只增两条分支，其余图位仍判 250 KB。

M1 轮修一处**已实测**的高影响缺陷并补其门禁判据：`.motion-clip`（`src/styles/motion.css`）初态
`clip-path: inset(0 100% 0 0)` 把槽位面积归零，而 `Reveal` 用 `useInView` 观察**它自己**——归零的裁剪使 IO 恒读
`intersectionRatio:0`（滚到视口正中亦然），默认阈值 15% 永不达成，全站 10 个槽（photo-band 主图 + scholarly 6 图 +
elder/music/sport 三图）永久 `is-in=false`，其中 10 张 `loading="lazy"` 图因无可见面积**从不被请求**。修法：
`useInView` 新增 `observeUnclippedAncestor`（沿 `parentElement` 上溯至第一个不带 `.motion-clip` 的祖先作为
`observer.observe` 目标，`once`/`rootMargin`/`threshold`/SSR 与 reduced-motion 短路、返回值签名均未动），
`Reveal` 在 `className` 含 `motion-clip` 时自动启用，调用点未动；冻版设计值与 `src/sections/**` 未动。
`tools/verify-render.mjs` 新增第 6/7 条断言（判据见 §1），汇总行末追加
`clips_checked/clips_closed/images_checked/images_unloaded` 四键，既有键名未动。

G2 轮收口两条门禁口径，只改口径、未放宽强度：`tools/verify-motion.mjs` 的 `SECTIONS` 表 `nav` 行由
`state: "deferred", lane: "S1"` 翻为 `state: "wired", lane: ""`（该节已接线，属状态翻牌、非口径变更；`requires`
与断言的既有写法逐条未动）。`tools/verify-lang-toggle.mjs` 的 `hero.h1` 由 `kind: "dual"` 改为 `kind: "single"`
（沿用该门禁既有的单侧 pair 语义，§3 早已用在四条 nav 条目上）：期望由「两侧英文并存」改为「当页语言一侧在场 +
另一语言侧不在场」，其中标题由「markup 里出现过」收紧为「h1 元素文本**逐字等于**该模式自己的 title 键」
（`TITLE[模式]`，换行折叠按本门禁口径）—— 理由＝T3b 立下的单语纯度契约（BLUEPRINT §6.4）：hero 只有一个
h1、一个变体，旧的 dual 期望是双语并存时期的残留。门禁自身输出由 `single=4 dual=9` 变为
`pairs_checked=13 single=5 dual=8 missing=0`。「另一语言不在场」仍限 hero 节内，全页无 CJK 归
`tools/verify-lang-purity.mjs`；`nav.brand` / `nav.brand.cn` 本门禁未断言，无需更新。本轮 `src/**`、
`docs/copy-*.json`、`docs/CHROME.md` 未动。

## 1 总表

| 门禁 | 能证什么 | 不能证什么 | 跑在哪 |
|---|---|---|---|
| `tools/verify-tokens.mjs` | `src/styles/tokens.css` 160 个 token 与设计简报 §9 + 实现补充表**逐字节同值** | 谁消费了哪个 token、某节档位取值、视觉结果 | CI |
| `tools/verify-deploy.mjs` | Pages 发布链静态约定 57 项（vite 相对 base、npm scripts、README 提及、workflow 步骤依赖顺序） | 运行结果、UI | CI |
| `npm run build`（`tsc --noEmit` + vite） | 类型可编译、可打包 | 视觉、设计值、布局 | CI |
| `tools/verify-copy-wiring.mjs` | 产物中的文案全部来自冻版字典（含未引用键下限） | 排版、位置、设计值 | CI（须在 build 后） |
| `tools/verify-head.mjs` | `index.html` 静态 head 与字典逐字一致 6 项 | body 任何内容 | CI |
| `tools/verify-responsive.mjs` | BLUEPRINT §3.1/§3.2 每个档位值由**该 token 自身的载体选择器**在对应 `@media (max-width: Npx)` 块内以 `var(--name)`/`var(--name-tNNNN)` 承接，属性属族且解析值含表值；§3.3 的 `` `--token` `` 锚同此 | §3.3 非 token 数字（色块/方图/`h`/gap/padding）不绑选择器（§2 B-残留）；token 表值本身由 verify-tokens 管，本门禁不比对设计稿 | CI |
| `tools/verify-ssr-dom.mjs` | 学术成果节 SSR 后的 DOM 事实：标题层级、9 个揭晓区初始折叠且 panel id 可寻、图片 lazy、单语言（无 CJK、`lang` 只出现 `["en"]`） | 只覆盖 scholarly 节；视觉 | CI |
| `docs/verify-copy.mjs` | 字典自身规则：键集合一致（当前 140 键）、字段类型、材料侧 `text` 逐字溯源、译文侧「同一 `src` 槽位 + 原文侧逐字 + 两侧互异」、chrome/src 归属、※ 禁止 | 渲染、版式；译文**语义**正确性（机器无判据，由 `translation-policy.md` §验收 2 人工抽检） | 本地 |
| `tools/verify-lang-purity.mjs` | 两模式 SSR 产物纯度 3 类：EN 零 CJK（可见文本 + `title`/`alt`/`aria-label`/`placeholder`/`content` + 静态 head）、ZH 拉丁 token 逐 token 命中封闭白名单且整 token 元素带 `lang="en"`、两模式皆走同一渲染路径（`DEFAULT_LANG` 改写不生效即rc≠0） | `<noscript>`（JS-off 兜底，双语）与运行期由 JS 拼接的串（本页无）不在扫描范围；白名单本身不判语义 | CI |
| `tools/verify-lang-toggle.mjs` | 语言切换逐条键（默认 `en`）、不重载、同值点击持久化 | 视觉 | 本地 |
| `tools/verify-render.mjs` | 真实浏览器渲染度量（驱动器无本机浏览器，走宿主 Chrome CDP `127.0.0.1:9222`）：7 宽 × 2 语言逐格量横向溢出 / 11 区块高度 / 逐元素自溢 / nav 锚落点 / 占位盒离树，**加本轮两条**——滚过全页后每个 `.motion-clip` 已揭开（`is-in` 且 `getComputedStyle().clipPath` 不含 `100%`）、页内每个 `<img>` 已加载（`naturalWidth>0`，含 `loading="lazy"`）；本轮输出 `clips_checked=140 clips_closed=0 images_checked=196 images_unloaded=0`（14 格 × 10 槽 / 14 图） | CI 无此环境；不证 mask sweep 的时长与缓动（归 `verify-motion`）、不证版式；第 7 条不区分「lazy 未被调度」与「文件缺失」（两者同为 `naturalWidth=0`），也不证「仅靠滚动手势即能触发 lazy」（§2 R1） | 本地 |
| `tools/verify-assets.py` | `MANIFEST.json` 38 条目的字段/存在/字节/尺寸/格式/禁放大、清单集合==磁盘集合、总字节须少于源图、10 组图位派生图（存在 / 像素尺寸精确匹配 / webp+jpg 成对 / 非空白 / 单文件 ≤250 KB，全幅宽白名单 `hir-fig-2688`+`photoband-2880` ≤320 KB） | 版式、设计值、画面内容是否就是设计稿那张图（只判非空白） | CI（`python3` + Pillow，见 §5） |
| `tools/verify-motion.mjs` | 动效层 7 类：12 个冻结 motion token 逐字同值且被样式消费、无作废旧名（`--dur-fast` 等）、每个动效钩子（7 个 animated 加全部 `motion-*`/`reveal*` 选择器）都有 `prefers-reduced-motion: reduce` 终态、揭晓契约（`0fr→1fr`、`overflow-anchor: none`、`aria-expanded`/`aria-controls`/`aria-labelledby`/`data-state`、无内联 style）、11 节均有入场钩子、禁用项（过冲缓动、动画 `top/left/height/margin`、`transition: all`、scroll 监听）、时长预算（单条 ≤800ms、首屏链 ≤800ms）、BLUEPRINT §2.11 同名同值 | 实际观感、真机帧率、`reduced-motion` 下的渲染结果（不跑浏览器）；`motion-spec-frozen.md` 自身的措辞（仓外文件，只比三处同源物） | CI（自带 `--self-test` 自毁副本反例） |
| `tools/fidelity-scholarly.mjs`、`tools/fidelity-nav-hero-photoband.mjs`、`tools/fidelity-elder-music-sport.mjs`、`tools/fidelity-index-method-values-footer.mjs` | 各节 ui.pen 子树的设计数值/色彩/字族在对应节样式里有承接声明；索引四行三色、Values 四卡三属性另有逐节点配对 | 除已配对项外按**节级池**匹配：节点级错值可被同节别的节点顶掉（§2 A2/A3/A4）；另三条本轮**未审**（§2 C） | 本地 |
| `tools/verify-fonts.mjs` | 抽样 6 个节点的**实际选中**字体族（CDP `CSS.getPlatformFontsForNode`）：4 个声明 Inter / IBM Plex Mono 的节点确由该族绘制且 `isCustomFont=true`（自托管 woff2 已加载），2 个中文节点落在含 CJK 的系统字体上且 `isCustomFont=false` | 未抽样节点、字形覆盖度（latin 子集外的缺字回退）、字重细节、真机与其它浏览器 | 本地（需宿主 CDP `127.0.0.1:9222`，可 `CDP=` 覆盖）；端点不可达以 rc=2 单行 `UNAVAILABLE:` 退出，不进 CI |

上表 10 条 CI 门禁 = `.github/workflows/deploy.yml` 的全部步骤（verify-tokens → verify-assets → verify-deploy → verify-motion →
build → verify-copy-wiring → verify-head → verify-responsive → verify-ssr-dom → verify-lang-purity）。
四条 fidelity、`docs/verify-copy.mjs`、lang-toggle、render、fonts **未接入 CI**，其假绿 CI 不会拦下。
`tools/verify-deploy.mjs` 会检查「workflow/README 引用的每个 `node tools/*.mjs` 都在树上」与「门禁步骤全在发布步骤之前」，
但**不逐条点名**必须包含哪些新步骤：删掉 `verify-motion` 步骤它仍 rc=0（§4 D1，已记为未决项）。

## 2 逐条盲区

| 编号 | 位置 | 涉及的设计值 | 当前强度 | 什么情形会漏判 | 是否已修 | 本轮证据 |
|---|---|---|---|---|---|---|
| A1 | `tools/fidelity-index-method-values-footer.mjs` Values 段（`values cards:` 行） | 四卡容器 fill（`FtEg5`/`b8Pyud`/`VeSeg`/`c3C7M`）→`--card-fill`；T fill（`MfyVe`/`N4ayD3`/`C94tQ`/`uc0ih`）→`--card-title-ink`；K fill（`wJuRV`/`TXh6r`/`J565aY`/`iaMEM`）→`--card-label-ink` | **逐卡逐属性配对**（本轮修：fill/title-ink 由节级池改为逐卡；label-ink 为 P9 已配对） | 修前：某卡值写错，同节另一声明仍解析出该 hex → 绿 | 已修（本轮） | 互换卡1/卡2 `--card-fill`：修前 rc=0（checked=324），修后 rc=1（checked=332，两条 `missing` 分别指名 `FtEg5`/`b8Pyud`） |
| A1n | 同上 | 卡2/卡3 的 `--card-title-ink` 在设计稿同为 `#FFFFFF` | 逐卡配对（同上） | 二者互换后 CSS 字节相同 → 判不出 | **不可检**（无信息可判，非假绿） | 实测：卡2↔卡3 互换 `--card-title-ink` → rc=0，改动后文件字节不变 |
| A2 | 同文件 Index 段（`index rows:` 之外的通用 requirement 循环） | 四行的行 `padding` 22/0、`No` 字号 26、`T` 字号 34、色块 64/方图 148 等 | 节级池（任一 `font-size` 声明解析出该数即命中） | 交换 `No`/`T` 的 `font-size`（26↔34），两节点全错而节内两个数齐在 → 绿 | 未修 | 实测 rc=0（`checked=332 missing=0`） |
| A3 | 同文件 Method（`t0l2bz`）/ Footer（`jSRy5`）段 | Method `T` 字号 22、标题字号 64、`K` 字号 12；Footer `T` 字号 48 等 | 无逐节点绑定：`grep -n nth-child src/sections/Method/Method.css src/sections/Footer/Footer.css` **零命中**，判据是节级池 | 交换 `.method__title`(64) 与 `.method__col-title`(22) 的 `font-size` → 绿 | 未修（**绑定强度**问题，非值错） | 实测 rc=0 |
| A4 | 同文件其余色彩（Index 三色与 Values 三属性之外） | 如 Method `K` 的 `#1B4BC4`（`--c-blue`） | 节级池（任何声明解析出该 hex 即命中） | 把 Method `K` 的 `color` 改成 `--c-ink`（设计 `--c-blue`）；`.method__rule { background: var(--c-blue) }` 仍在池中 → 绿 | 未修 | 实测 rc=0 |
| B | `tools/verify-responsive.mjs` §3.1/§3.2 全线 + §3.3 的 `` `--token` `` 锚 | `--pad-row` @≤1200 的 16/0、`--gutter-x` 40、`--nav-h` 64、`--col-hero-right` 304 等 | **逐 token 载体选择器绑定**（本轮修）：档位值须落在「1440 承接该 token 的同一选择器」的 `@media` 块声明上 | 修前：把档位声明挪到同节另一选择器、原选择器留旧值 → 绿（值在节内，但没接到该元素） | 已修（本轮） | 把 `.index__row` 的 `padding: var(--pad-row-t1200)` 挪给 `.index__body`：修前 rc=0，修后 rc=1 `missing: BLUEPRINT §3.1 --pad-row @1200: 16/0px missing in src/sections/Index/Index.css`；复原 rc=0 且 `values_checked=84` 与修前一致 |
| Bn | `tools/verify-responsive.mjs` 的 `declarations()` 解析 | —（判据基础） | 本轮修：`@media` 块**整块**屏蔽（原先只屏蔽块头，块体被再次收集为 tier=null 声明） | 修前每个档位声明同时被当作 1440 声明：既让上面的选择器绑定失效，也让「同/保持」判据可被块内声明顶掉 | 已修（本轮） | 修整块屏蔽后基线仍 rc=0；选择器另去注释前缀（否则节首带注释的选择器与块内同名选择器对不上） |
| B-残留 | 同文件 §3.3 非 token 数字锚 | values @≤1200 的「`h` 216」、index 的「色块 56/方图 120」、photoband 的「**464px**」、gap、`padding` | 节内池级（不看选择器） | 把 `.values__card { height: var(--card-h-t1200) }` 挪到同块另一选择器 `.values__cell` → 卡片失去高度，而 `verify-responsive` rc=0 **且** `fidelity-index-method-values-footer` rc=0（两门禁皆漏） | 未修 | 实测双 rc=0 |
| C | `tools/fidelity-scholarly.mjs`、`tools/fidelity-nav-hero-photoband.mjs`、`tools/fidelity-elder-music-sport.mjs` | 各节全部节点值 | **未审**：本轮未读其逐节点绑定强度，也未跑反例 | 若其判据同为节级池，节点级错值可被同节顶掉——**未证明**，不得写作「已完备」 | 未审 | 无（未实测） |
| R1 | `tools/verify-render.mjs` 第 6/7 条（本轮新增） | —（`.motion-clip` 初态/终态为冻版设计值，门禁只读运行期事实） | 终态断言：快滚过全页后 1s 内轮询至「`is-in` 且 `clipPath` 无 `100%`」，未达成即指名；图片先快滚、漏网者居中重试一次后判 `naturalWidth>0` | 只读终态——不证揭开过程真的播放；`prefers-reduced-motion: reduce` 下 `.motion-clip` 初态即 `clip-path:none`，第 6 条恒真（该模式下探针不区分）；`naturalWidth=0` 不区分「lazy 未被调度」与「文件缺失/路径错」 | 已修（本轮） | §4 M1-N1/M1-N2/M1-N0 |

`tools/verify-fonts.mjs`（在树 12614 B；P14 登记）：**能证**——上表抽样的 6 个节点实际选中族与声明族一致，拉丁两族的 `isCustomFont=true`（自托管 woff2 确已加载），中文节点为含 CJK 的系统字体；**不能证**——未抽样节点、字形覆盖度（latin 子集外的缺字回退）、字重细节、真机/其它浏览器；跑在本地（需宿主 CDP），不进 CI，端点不可达 rc=2。

## 3 假绿历史

| 轮次 | 位置 | 修前反例（rc） | 修后（rc） |
|---|---|---|---|
| P8（`6f3524a`「补三门禁的覆盖盲区」：copy-wiring 引用下限、lang-toggle 逐条、deploy 依赖） | 三条 CI 门禁 | 未复现（修前状态**未实测**，P13 只跑了修后反例） | **已复现 rc=1**（P13 复验：F1-A/B/C 各一次，见其终树 `753f352` 报告；本 lane 未重跑） |
| P9（`d11c497`） | Values `--card-label-ink` 由节级池 → 逐卡配对 | 互换卡3/卡4 label-ink：**rc=0**（`checked=320`，以 `d11c497^` 判据 + 当前冻版哈希复跑） | **rc=1**（`checked=324`，`missing` 指名 `J565aY`/`iaMEM`） |
| P12（本轮） | Values `--card-fill` / `--card-title-ink` 由节级池 → 逐卡配对 | 互换卡1/卡2 fill：**rc=0**（`checked=324`） | **rc=1**（`checked=332`，`missing` 指名两卡） |
| P12（本轮） | `verify-responsive` 档位值由节级池 → 载体选择器绑定 | 挪 `--pad-row-t1200` 声明到 `.index__body`：**rc=0** | **rc=1**（`values_checked=84` 不变） |
| 早期 | Index 四行 `--num-fill`/`--no-ink`/`--en-ink` 逐行配对（自 `46f0cbd` 起即在树中） | **未实测**（其修前状态不在本轮范围） | 现状 rc=0 且逐行打印；互换 `--num-fill` **已复现 rc=1**（P13 复验，见其终树 `753f352` 报告；本 lane 未重跑） |
| M1 | `verify-render` 此前无「`.motion-clip` 揭开 / 图片加载」判据 | 旧判据（`HEAD~1` 的 `verify-render.mjs` 在 /tmp 旧树实跑）：全站 10 槽永隐、10 张 lazy 图零请求，**rc=0** | **rc=1**（同一旧树 + 新判据：98 条 clip 未揭 ＋ 84 条图未载，逐条指名元素/文件） |

## 4 最小反例复现（本轮实测口径）

口径：把 worktree 的 `src/ tools/ docs/` 复制到 /tmp 并放入 `ui.pen`（或 `UI_PEN=<path>`），
按左列改一处，跑 `node tools/<门禁>`，看 rc。修前判据用 `git show HEAD:tools/…` 取（P9 那条另把
`PEN_SHA256_PREFIX` 对齐当前冻版哈希，否则会因旧冻版哈希先红）。上表每条反例均如此实跑，记录如下：

P15 轮新增的三条自足门禁不与 `ui.pen` 相干，其反例在**干净克隆**（`git clone` 到 /tmp，`npm ci`）里跑，
其余口径同上（改一处 / 跑一条 / 看 rc / 复原）：

| 反例 | 改法 | 门禁 | rc |
|---|---|---|---|
| A1 | 互换 `:nth-child(1)`/`:nth-child(2)` 的 `--card-fill` 值 | fidelity-index-method-values-footer | 修前 0 → 修后 1 |
| A1 | 互换 `:nth-child(3)`/`:nth-child(4)` 的 `--card-title-ink` 值 | 同上 | 1（两条 missing） |
| A1 | `:nth-child(4)` 的 `--card-fill` 换成 `var(--c-white)` | 同上 | 1（另触发节级色彩缺失） |
| A1n | 互换 `:nth-child(2)`/`:nth-child(3)` 的 `--card-title-ink` 值 | 同上 | 0（设计稿两值相同，改后字节不变） |
| P9 | 互换 `:nth-child(3)`/`:nth-child(4)` 的 `--card-label-ink` 值 | 同上（`d11c497^` 判据 / P9 判据） | 0（`checked=320`）→ 1（`checked=324`） |
| B | Index `@media (max-width: 1200px)` 内 `padding: var(--pad-row-t1200)` 的选择器由 `.index__row` 改为 `.index__body`，顶层 `.index__row` 留 `var(--pad-row)` | verify-responsive | 修前 0 → 修后 1 |
| B | `--pad-row-t1200: 16px 0` 改 `18px 0` | verify-responsive | 修前 1 → 修后 1（改数值两版都拦得住，这条不区分新旧） |
| A2 | 互换 `.index [data-role="No"]`(26) 与 `.index [data-role="T"]`(34) 的 `font-size` | fidelity-index-method-values-footer | 0（假绿） |
| A3 | 互换 `.method__title`(64) 与 `.method__col-title`(22) 的 `font-size` | 同上 | 0（假绿） |
| A4 | Method `[data-role="K"]` 的 `color` 由 `--c-blue` 改 `--c-ink` | 同上 | 0（假绿） |
| B-残留 | Values `@media (max-width: 1200px)` 内 `height: var(--card-h-t1200)` 挪给 `.values__cell` | verify-responsive ＋ fidelity-index-method-values-footer | 0 ＋ 0（双漏） |
| P15-M1 | `node tools/verify-motion.mjs --self-test`（自毁 /tmp 副本：加一处未声明的 `.motion-*` 钩子 + 一条动画 `height` 的 transition） | verify-motion | 1（`[HOOK]` + `[PROPERTY]` 各一条；副本未被拦住则 rc=2 自报失明） |
| P15-L1 | 干净克隆里 `docs/copy-en.json` 的 `nav.brand.name.text` 追加「中文」二字 | verify-lang-purity | 1（`en: CJK=2`）；复原 0 |
| P15-A1 | 把 `public/media/hir-fig-2688.jpg` 重编成 474742 B（q85）；另把 `FULL_BLEED` 白名单加一个不存在的图位名 | verify-assets.py | 1（字节数不符 ＋ `474742 字节 > 320 KB 上限（全幅宽白名单）`）；另 1（`白名单含未知图位: ['nope-1x1']`）；两次复原均 0 |
| P15-D1 | 从 `.github/workflows/deploy.yml` 删掉 `Verify motion layer` 步骤 | verify-deploy | **0**（未覆盖，见 §5） |
| M1-N0 | 旧树旧判据（`git archive HEAD~1` 到 /tmp/m1-pre，`node_modules` 软链后实跑） | verify-render（`HEAD~1`） | **0**（10 槽永隐、10 图零请求，门禁仍绿——§3 M1 的假绿面） |
| M1-N1 | worktree 内把 `src/lib/useInView.ts` / `src/components/primitives/Reveal.tsx` 回退为 `HEAD` 前的观察自身行为（只改这两文件，门禁不动） | verify-render | **1**：`clips_checked=140 clips_closed=98`、`images_checked=196 images_unloaded=84`，逐条点名 `div.photo-band__media.motion-clip`（`is-in=false, clip-path=inset(0px 100% 0px 0px)`）与 `igem-fig1-720.webp` 等；复原 rc=0 |
| M1-N2 | 探针取读数前把 `.photo-band__img` 的 `src` 指向不存在的 `./media/m1-missing-file.webp`（改 DOM，仓内未动；临时改门禁文件、跑完即复原） | verify-render | **1**：`images_unloaded=14`，14 格各点名 `m1-missing-file.webp`，同轮 `clips_closed=0`（两组断言互不遮蔽）；复原 rc=0 |

计数口径：`fidelity-index-method-values-footer` 的 `checked` 由 324 增至 332（+8 = 新绑定的 2 属性 × 4 卡；
P9 前为 320）。`verify-responsive` 的 `values_checked` 修前修后同为 84（`--token` 锚的数字从共用数字集合
移入各自的 token 断言，总数不变；hero 的 `--col-hero-right 304px` 只算一条，token 区间已先屏蔽）。

## 5 口径与局限

- 本文件登记**判据强度**，不登记门禁条数或覆盖率；「已修」只指本轮/上列提交的判据改动，「未修」「未审」「未实测」即字面意思。
- 门禁条数以门禁自身输出为准：`verify-tokens.mjs` 本轮打印 160/160（83 `design brief §9` + 77 `implementation supplement`），原记的 156（83+73）与实测不符，已在 §1 与 `README.md` 改为实测值。
- `tools/verify-assets.py` 的仓库外依赖为零，但有**运行期依赖**：`python3` + Pillow（`PIL`）。workflow 该步骤先试 `python3 -c "import PIL"`，失败才 `python3 -m pip install --quiet pillow`；本机与 GitHub `ubuntu-latest` 镜像的差异未实测（无 runner 环境），CI 首跑才算验过。
- `tools/verify-deploy.mjs` 的覆盖边界：它只断言「workflow/README 引用的 `node tools/*.mjs` 都在树上」与「门禁步骤全在发布步骤之前」，**不逐条点名**应包含哪些步骤 —— 删掉 `Verify motion layer` 仍 rc=0（§4 P15-D1）。收紧需改 `tools/verify-deploy.mjs` 本身，不在本轮可改路径内，记为未决项。
- 单语纯度：EN 模式就是 SSR 默认产物；ZH 模式由构建期改写 `DEFAULT_LANG` 一个字面量后走同一条渲染路径（改写不生效即 rc≠0，不会静默扫两遍英文）。**纯度 ≠ 语义**：译文与原文的语义一致只能由人工抽检（`translation-policy.md` §验收 2，≥10 条含 HIR 长答与 mono 短标）。
- 元素级 `lang`：中文页上的白名单拉丁 token 已带 `lang="en"`（`tools/verify-lang-purity.mjs` 第 3 项逐元素断言）；英文页上分节仍输出冗余 `lang="en"`（BLUEPRINT §6.4 #5 待分节 lane 成对锁定收口），本门禁不断言该冗余，只断言「无 CJK 且无其它语言」。
- 四条 fidelity 门禁都依赖 `ui.pen` 冻结哈希（`PEN_SHA256_PREFIX`）与字节大小，改冻版必须同步改门禁常量，否则先红在哈希检查。
- 逐节点配对只覆盖已显式列出的属性（Index 三色、Values 三属性）；其余节点值仍是节级池，见 §2 A2/A3/A4。
- `tools/verify-render.mjs` 本轮新增的第 6/7 条按矩阵逐格取读数并累加（14 格 → `clips_checked=140`、`images_checked=196`），键名追加在既有汇总行末，既有键名与既有断言口径未动；整门实测耗时约 90s（含自带 `npm run build`）。
- 设计稿上两处取值相同（如卡2/卡3 的 title-ink）时，互换不可判——这是信息不足，不是可修的缺口。
