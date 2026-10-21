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

F1 轮（本轮）按独立审查收口四条**可空跑/过宽**的判据并修两处实现，均属收紧（未放宽任何判据）：
① `docs/verify-copy.mjs` 的 ⑥' 混排槽位下限由「任一侧含 8 字连续原文片段」改为**覆盖率**——原文区间与两侧 `text` 各自折叠（全角标点→ASCII、标点周围空白去掉、换行写法统一）后，每侧左到右贪心取能在区间里命中的最长片段（长度须 ≥ `TRACE_RUN`=8），累计命中字符数 ÷ 该侧字符数，两侧之和须 ≥ `COVERAGE_MIN`=0.75 且最长单片段 ≥8 字；七个登记槽位读数 `figcap=1.448 altnote=1.054 igem.title=1.000 jhu.q1=1.000 jhu.q2=1.000 hir.title=1.244 footer.legal=1.015`，仍全部通过。
② `tools/fidelity-scholarly.mjs` 的第一豁免（标点折叠）由**全局键池**改为**逐 board 节点对应键**（`PUNCTUATION_FOLDED_BY_NODE`：`vPbTb`→`scholarly-igem.title` / `juo5I`→`scholarly-jhu.q1` / `kk4C1`→`scholarly-jhu.q2`，取消跨键 `includes` 兜底，跨键命中在失败信息里指名），第二豁免（混排标题 `scholarly-hir.title`）命中前先要求该键已被 `text()` 接线，未接线即判负并指名。
③ `tools/verify-ssr-dom.mjs` 的 JHU 谜题图 alt 判据由**计数**恢复为**集合相等**（三张图的 alt 多重集 == 三条答案文本集合）并加逐 `src` 对应（image1→a1 / image2→a2 / image3→a3）。
④ `tools/verify-render.mjs` 在既有矩阵流程里先断言**预期规模**（每格 `.motion-clip` == `EXPECTED_CLIPS`=10、`<img>` ≥ `MIN_IMAGES_PER_CELL`=14、槽名 ≥1 `.photo-band__media` ＋ ≥6 `.scholarly__clip`），探针空跑不再零报错。
七条负例逐条 rc=1（§4），同一条改动在修前判据下 rc=0（§3）。实现两处：`src/sections/Nav/langSwap.ts` 增 `registerFlipCapture`/`takeFlipCapture`，`src/sections/Index/Index.tsx` 的 FLIP 优先取点击前的暂存测量（`swapLanguage` 对外签名与 `Nav.tsx` 调用点未动）；Index 四行缩略图改 `<picture><source type="image/webp">` ＋ jpg `src` 回退（尺寸/alt/loading 属性未动）。`docs/verify-copy.mjs` 的 125 原文逐字 / 73 译文侧 / 14 材料混排改写计数与修前一致，`verify-responsive` 的 `values_checked=84` 未变。

T1/docx-2026-10 轮（本轮）把《网站图片补充》的素材落成门禁认可的地基：只动素材、字典与登记，`src/**` 与 `ui.pen` 一个字节未动。
① `public/media/` 重做 8 组既有图位的图（Index 行 1/3/4、iGEM fig1/2、Elder 右图、Music 右图，沿用旧文件名）＋新增 13 组照片墙（`music-wall-1..9`、`sport-wall-1..4`，统一 360 宽等比、不裁不放大，受 `image32.jpeg` 仅 371px 宽的死约束），每组 webp+jpg 成对；`MANIFEST.json` 38 → **64 条目**、`_sources` 增 19 条 `docx-<原名>`（源图隔离前缀），`bytes`/`w`/`h`/`format` 全为落盘实测回填（禁估算）。
② `docs/verify-copy.mjs` 的 `locate()` 增加 `docx-2026-10-brief.md#段[N]` 分支（与 `content-brief.md` 同一 `paraBlocks` 语义，只多一个文件名，强度未变）；字典 138 → **188 键**（新增 50 键、替换 5 键），实测 `原文逐字 213 条 / 译文侧 79 条 / 身份 10 条 / 材料混排 10 条`——混排由 14 降为 10 只因 `scholarly-hir.title` 现为纯英文原文＋中文译文（不再走覆盖率路径），该键在 `MIXED_MATERIAL` 的登记保留（无副作用，不构成放宽）。
③ 已知盲区：新增的 13 组墙图**不在** `tools/verify-assets.py` 的 ⑧ 派生图判据内（⑧ 只遍历硬编码的 `DERIVED` 十组 ui.pen 图位，墙图尚无 nodeId），故墙图的「成对 / 尺寸 / 单文件 ≤250 KB」本由 ①②③④⑤ 与人工核对覆盖——`tools/verify-assets.py` 本轮未改（不在本 lane 可改路径内），把墙图纳入 ⑧ 需要给每组墙图定 nodeId 与目标像素，属接线 lane。
④ `tools/fidelity-scholarly.mjs` rc=1：冻版 `ui.pen` 的 HIR 标题节点仍写旧句 `HIR writing contest-哈佛国际评论学术写作竞赛`，而字典已按用户裁决换成 `Healthy Aging Individual Project——HIR prize winning report`；`ui.pen` 本 lane 禁改，接线 lane 更新设计稿后应自行转绿。这是**设计稿与文案的预期不同步**，不是判据放宽，也不进本轮的六项验收。
T2/docx-2026-10 接线轮（Index + JHU）的判据变更与新增，逐条：

① `tools/verify-ssr-dom.mjs` **新增**一条 JHU 提示计数判据：`class="scholarly__hint scholarly__hint--jhu"` 必须出现 **3** 次，且 `scholarly.revealClick` 的串须以 `>…</p>` 逐字出现。原因是 `tools/verify-copy-wiring.mjs` **看不见 3 处里的 1–2 处被删**：同一键仍被剩下的一两处引用，`referenced` 计数不动（实测删 1 处后 `referenced=140 via_literal_call=86` 与删前完全相同、rc 仍 0）。旧判据下这是假绿，故把「每问各一句」的**数量**交给 SSR 层断言。
② `docs/CHROME.md` 登记数字变更：新增 chrome 键 `scholarly.revealClick`（EN `Click to reveal.` / ZH `点击揭晓`，`chrome:true` 无 `src`），§1 表 26 → **27** 行、`docs/verify-copy.mjs` 实测 chrome 32 → **33** 条、字典 188 → **189** 键（src-traced 156 + chrome 33）。判据本身未放宽，只是登记数随之改。
③ `verify-copy-wiring.mjs` 的 `MIN_REFERENCED=127` / `MIN_LITERAL_CALLS=77` 两个下限**未改**：本 lane 让 `referenced` 138 → 140、`via_literal_call` 85 → 86（`index.head.title` 与 `scholarly.revealClick` 各 +1），只升不降，无放宽。
④ 本 lane 结束时 `verify-copy-wiring.mjs` 仍 rc=1，红因**全部是本 lane 之外的两段未接线键**（`scholarly-hir.lead1/2/3`＝T3，`music.resume.*` 45 键与 `sport.lead`＝T4），共 49 键且每条都带 `[NOT REGISTERED]`；本 lane 负责的 `index.head.title` 与 `scholarly.revealClick` 均不在该名单内。同口径下 T1 结束时该门为 50 键红（见 §2 T1 段），本 lane 把 50 → 49 并把两条自己名下的键转为已引用。

## 1 总表

| 门禁 | 能证什么 | 不能证什么 | 跑在哪 |
|---|---|---|---|
| `tools/verify-tokens.mjs` | `src/styles/tokens.css` 160 个 token 与设计简报 §9 + 实现补充表**逐字节同值** | 谁消费了哪个 token、某节档位取值、视觉结果 | CI |
| `tools/verify-deploy.mjs` | Pages 发布链静态约定 57 项（vite 相对 base、npm scripts、README 提及、workflow 步骤依赖顺序） | 运行结果、UI | CI |
| `npm run build`（`tsc --noEmit` + vite） | 类型可编译、可打包 | 视觉、设计值、布局 | CI |
| `tools/verify-copy-wiring.mjs` | 产物中的文案全部来自冻版字典（含未引用键下限） | 排版、位置、设计值 | CI（须在 build 后） |
| `tools/verify-head.mjs` | `index.html` 静态 head 与字典逐字一致 6 项 | body 任何内容 | CI |
| `tools/verify-responsive.mjs` | BLUEPRINT §3.1/§3.2 每个档位值由**该 token 自身的载体选择器**在对应 `@media (max-width: Npx)` 块内以 `var(--name)`/`var(--name-tNNNN)` 承接，属性属族且解析值含表值；§3.3 的 `` `--token` `` 锚同此 | §3.3 非 token 数字（色块/方图/`h`/gap/padding）不绑选择器（§2 B-残留）；token 表值本身由 verify-tokens 管，本门禁不比对设计稿 | CI |
| `tools/verify-ssr-dom.mjs` | 学术成果节 SSR 后的 DOM 事实：标题层级、9 个揭晓区初始折叠且 panel id 可寻、图片 lazy、单语言（无 CJK、`lang` 只出现 `["en"]`）、三张 JHU 谜题图 alt **集合相等**于三条答案文本且逐 `src` 对应各自答案（F1 由计数收紧）、JHU 三问各一条 `Click to reveal.` 提示**计数 3**（T2 新增，补 wiring 看不见 2-of-3 删除的盲区） | 只覆盖 scholarly 节；视觉 | CI |
| `docs/verify-copy.mjs` | 字典自身规则：键集合一致（当前 **188 键**）、字段类型、材料侧 `text` 逐字溯源（本轮 **213 条**）、译文侧「同一 `src` 槽位 + 原文侧逐字 + 两侧互异」（**79 条**）、材料混排 7 槽位按**覆盖率**下限（两侧折叠后各自命中比例之和 ≥0.75 且最长单片段 ≥8 字，**10 条**）、chrome/src 归属、※ 禁止；`src` 可定位的 brief 现在含 `docx-2026-10-brief.md`（同一 `段[N]` 语义） | 渲染、版式；译文**语义**正确性（机器无判据，由 `translation-policy.md` §验收 2 人工抽检）；覆盖率的**分母口径**（见 §5） | 本地 |
| `tools/verify-lang-purity.mjs` | 两模式 SSR 产物纯度 3 类：EN 零 CJK（可见文本 + `title`/`alt`/`aria-label`/`placeholder`/`content` + 静态 head）、ZH 拉丁 token 逐 token 命中封闭白名单且整 token 元素带 `lang="en"`、两模式皆走同一渲染路径（`DEFAULT_LANG` 改写不生效即rc≠0） | `<noscript>`（JS-off 兜底，双语）与运行期由 JS 拼接的串（本页无）不在扫描范围；白名单本身不判语义 | CI |
| `tools/verify-lang-toggle.mjs` | 语言切换逐条键（默认 `en`）、不重载、同值点击持久化 | 视觉 | 本地 |
| `tools/verify-render.mjs` | 真实浏览器渲染度量（驱动器无本机浏览器，走宿主 Chrome CDP `127.0.0.1:9222`）：7 宽 × 2 语言逐格量横向溢出 / 11 区块高度 / 逐元素自溢 / nav 锚落点 / 占位盒离树，**加本轮两条**——滚过全页后每个 `.motion-clip` 已揭开（`is-in` 且 `getComputedStyle().clipPath` 不含 `100%`）、页内每个 `<img>` 已加载（`naturalWidth>0`，含 `loading="lazy"`）；**加 F1 四条**——每格先断言**预期规模**（`.motion-clip` == 10、`<img>` ≥ 14、槽名 ≥1 `.photo-band__media` ＋ ≥6 `.scholarly__clip`），不足即 rc=1，探针空跑不再走空循环（既有四键名与语义未动）；本轮输出 `clips_checked=140 clips_closed=0 images_checked=196 images_unloaded=0`（14 格 × 10 槽 / 14 图） | CI 无此环境；不证 mask sweep 的时长与缓动（归 `verify-motion`）、不证版式；第 7 条不区分「lazy 未被调度」与「文件缺失」（两者同为 `naturalWidth=0`），也不证「仅靠滚动手势即能触发 lazy」（§2 R1）；预期规模常量按当前 11 节结构写死，增删 `.motion-clip` 槽须同步改常量（§5） | 本地 |
| `tools/verify-assets.py` | `MANIFEST.json` **64 条目**的字段/存在/字节/尺寸/格式/禁放大、清单集合==磁盘集合、总字节须少于源图、10 组图位派生图（存在 / 像素尺寸精确匹配 / webp+jpg 成对 / 非空白 / 单文件 ≤250 KB，全幅宽白名单 `hir-fig-2688`+`photoband-2880` ≤320 KB） | 版式、设计值、画面内容是否就是设计稿那张图（只判非空白）；**⑧ 只覆盖 `DERIVED` 里硬编码的十组 ui.pen 图位**——`docx-2026-10` 新增的 13 组墙图（`music-wall-*`/`sport-wall-*`）只走 ①②③④⑤，不受 ⑧ 的成对与尺寸断言约束（§2 docx-2026-10 ③） | CI（`python3` + Pillow，见 §5） |
| `tools/verify-motion.mjs` | 动效层 7 类：12 个冻结 motion token 逐字同值且被样式消费、无作废旧名（`--dur-fast` 等）、每个动效钩子（7 个 animated 加全部 `motion-*`/`reveal*` 选择器）都有 `prefers-reduced-motion: reduce` 终态、揭晓契约（`0fr→1fr`、`overflow-anchor: none`、`aria-expanded`/`aria-controls`/`aria-labelledby`/`data-state`、无内联 style）、11 节均有入场钩子、禁用项（过冲缓动、动画 `top/left/height/margin`、`transition: all`、scroll 监听）、时长预算（单条 ≤800ms、首屏链 ≤800ms）、BLUEPRINT §2.11 同名同值 | 实际观感、真机帧率、`reduced-motion` 下的渲染结果（不跑浏览器）；`motion-spec-frozen.md` 自身的措辞（仓外文件，只比三处同源物） | CI（自带 `--self-test` 自毁副本反例） |
| `tools/fidelity-scholarly.mjs`、`tools/fidelity-nav-hero-photoband.mjs`、`tools/fidelity-elder-music-sport.mjs`、`tools/fidelity-index-method-values-footer.mjs` | 各节 ui.pen 子树的设计数值/色彩/字族在对应节样式里有承接声明；索引四行三色、Values 四卡三属性另有逐节点配对；`fidelity-scholarly` 的两处文案豁免逐条登记在门禁内（标点折叠按 board 节点逐键比对、混排标题要求 src 已接线，F1 收口） | 除已配对项外按**节级池**匹配：节点级错值可被同节别的节点顶掉（§2 A2/A3/A4）；后三条本轮**未审**（§2 C）；豁免只覆盖已登记的那四个 board 节点/键 | 本地 |
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
| F1-A | `docs/verify-copy.mjs` ⑥' 混排 7 槽位 | —（溯源下限） | 两轮改后：**覆盖率**（两侧折叠后各自命中比例之和 ≥0.75，且最长单片段 ≥8 字；每步只认 ≥8 字的命中） | 仍不判译文**语义**（只判「槽位里有多少字逐字来自原文区间」）；七槽读数 1.000–1.448，离阈值最近的是 `footer.legal=1.015`（§5 分口径） | 已修 | 负例 rc=1（覆盖率 0.129，指名键）；修前同一改动 rc=0；七槽逐条读数见汇总行 |
| F1-B | `tools/fidelity-scholarly.mjs` 第二豁免（`MIXED_TITLE`） | `TZa4y` ＝ `scholarly-hir.title` | 命中前要求 `referencedKeys.has(key)`（未接线即判负并指名键与 board 节点） | 不再只看字典；未接线时即使字典两侧齐备也不给豁免 | 已修 | 旧判据实跑 rc=0（`1 mixed-script`）→ 新判据 rc=1（指名 `scholarly-hir.title`） |
| F1-B2 | 同文件第一豁免（标点折叠） | `vPbTb`/`juo5I`/`kk4C1` 三节点 | 逐 board 节点只与本节点登记键的折叠文本比对（取消跨键 `includes` 兜底；跨键命中在失败信息里指名） | 未登记节点仍走通用规则（case＋空白折叠后的包含）；若日后换笔，节点 id 表必须同步 | 已修 | 沙盒换 pen 文本：旧判据 rc=0（`3 punctuation-folded`）→ 新判据 rc=1（指名 `juo5I` ＋ `scholarly-igem.title`） |
| F1-C | `tools/verify-ssr-dom.mjs` JHU alt | 三张谜题图 alt ＝ `scholarly-jhu.a1/a2/a3` | 集合相等 ＋ 逐 `src` 对应 | 三图同用一个答案已拦；仍不判「alt 是否确为**该图**的正确答案」（图不参与辨认） | 已修 | 负例 rc=1（集合不等 3 条）；旧判据（计数）在此改动下为假绿（未实跑，按代码 `filter(...).length !== 3` 恒真） |
| F1-D | `tools/verify-render.mjs` 第 6/7 条 | —（只读运行期事实） | 每格先断言预期规模：`.motion-clip` == 10、`<img>` ≥ 14、槽名 ≥1 `.photo-band__media` ＋ ≥6 `.scholarly__clip` | 常量按当前节结构写死（增删槽位须同步改）；不证每个槽属哪一节（只抽查两个槽名） | 已修 | 两条负例 rc=1（常量 99；探针选择器改名 → `clips_checked=0` 且 14 格逐条报数）；旧判据在「节点全缺」下为假绿（未实跑，按代码对空数组遍历零报错） |

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
| F1-A | `verify-copy.mjs` ⑥'：混排槽位由「任一侧含 8 字原文片段」→ 覆盖率 ≥0.75 | 把 `scholarly-jhu.q2` 的 en 侧换成无关句＋只留 9 字原文片段（`the heart`）：**rc=0**（`HEAD~1` 判据在 /tmp 沙盒实跑，`材料混排改写 14 条` 照旧） | **rc=1**（`copy-en.json:scholarly-jhu.q2`：覆盖率 0.129 / 要求 ≥0.75；同键另一侧一并指名） |
| F1-B | `fidelity-scholarly.mjs` 第二豁免：命中前要求该键已接线 | 注掉 `text("scholarly-hir.title")`：**rc=0**（`HEAD~1` 判据在 /tmp 沙盒实跑，`1 mixed-script` 照旧） | **rc=1**（指名 `TZa4y <T>` ＋ `scholarly-hir.title`）；复原 rc=0、`git diff` 空 |
| F1-B2 | 同文件第一豁免：全局键池 → 逐 board 节点对应键 | 把 `juo5I` 的 board 文本换成 iGEM 标题键的文本（/tmp 沙盒：改 `ui.pen` 并把副本的 `PEN_SHA256`/`PEN_BYTES` 对齐该副本）：**rc=0**（`3 punctuation-folded`） | **rc=1**（指名 `juo5I <Qtext>` ＋ 跨键 `scholarly-igem.title`） |
| F1-C | `verify-ssr-dom.mjs`：JHU alt 由计数 → 集合相等＋逐 `src` | —（**未实跑**；旧判据为 `photos.map(alt).filter(a => answers.includes(a)).length !== 3`，三图同用 a1 时恒为 3 ⇒ 过） | **rc=1**（集合不等 ＋ `image2-400.webp`/`image3-600.webp` 各一条）；复原 rc=0 |
| F1-D | `verify-render.mjs`：新增预期规模下限 | —（**未实跑**；旧判据只遍历实际命中节点，探针查不到节点时零报错、`clips_checked=0` 仍 rc=0） | **rc=1**（14 格逐条 `probe found 0 .motion-clip slots, expected 10`；常量改 99 亦 rc=1） |

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

| F1-A | /tmp 沙盒（新/旧两份 `verify-copy.mjs` ＋ `HEAD~1` 的 `docs/copy-*.json` 副本，改 `copy-en.json` 的 `scholarly-jhu.q2.text` 为无关句＋9 字原文片段 `the heart`） | verify-copy（`HEAD~1` 判据 / 新判据） | **0 → 1**（新判据：`覆盖率 0.129 / 要求 ≥ 0.75`，指名 `copy-en.json:scholarly-jhu.q2`） |
| F1-B | worktree 内把 `src/sections/Scholarly/ScholarlyHir.tsx` 的 `text("scholarly-hir.title")` 注掉（跑完复原） | fidelity-scholarly（`HEAD~1` 判据 / 新判据） | **0 → 1**（注掉即 1：`board text TZa4y <T> is only covered by scholarly-hir.title, which src/ never references`；复原 0、`git diff` 空） |
| F1-B2 | ① /tmp 沙盒：把 `ui.pen` 的 `juo5I` 文本换成 `scholarly-igem.title` 的文本（副本 pin 常量对齐）② worktree 内注掉 `text("scholarly-jhu.q1")`（跑完复原） | fidelity-scholarly（`HEAD~1` 判据 / 新判据） | ① **0 → 1**（新判据指名 `juo5I` ＋ 跨键 `scholarly-igem.title`）② **1**（未接线：指名 `juo5I` ＋ `scholarly-jhu.q1`），复原 0 |
| F1-C | worktree 内把 `ScholarlyJhu.tsx` 里 image2/image3 的 `alt` 改成 `text("scholarly-jhu.a1")`（跑完复原） | verify-ssr-dom | **1**：`JHU puzzle alt set [a1,a1,a1] != 三条答案文本` ＋ `img media/image2-400.webp`/`image3-600.webp` 各一条；复原 0 |
| F1-D | ① 把 `EXPECTED_CLIPS` 由 10 改 99 ② 把探针选择器 `.motion-clip` 改成不存在的 `.motion-clip-absent`（均临时改门禁、跑完复原） | verify-render | **1 ＋ 1**：① 14 格逐条 `probe found 10 .motion-clip slots, expected 99`；② `clips_checked=0` 且 14 格 `probe found 0 .motion-clip slots, expected 10` ＋ 两条槽名缺失 |
| F1-N3 | worktree 内把 `Index.tsx` 的 `before` 改回只读上一次 map（`const before = previous.current`，即本轮修前行为），1440→1100 后点切语言 | /tmp CDP 探针（一次性） | **1**：四行 `pin=(16, 183.75/223.75/263.75/303.75)` vs 实测 `before−after=(0, 52.5/52.5/39.21/39.21)`，`max |err|=264.54px`（阈值 ≤1px）；改回捕获后同一探针 `max |err|=0.01px` |

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
- `docs/verify-copy.mjs` 混排槽位（⑦ 条）的**覆盖率分母口径**：两侧 `text` 长度不同（译文通常更短），故分母取**各侧自身长度**、分子取该侧命中的字符数，再将两侧比值**相加**与 0.75 比。把分母换成「原文区间长度」不可满足（区间是整段 markdown 块，槽位文本只占其中一小截：实测量 0.07–0.5）；换成「两侧长度之和」也不可满足（七个登记槽位里 6 个 < 0.75，因为一侧是译文、本就不应含原文）；换成「较长一侧」则 `photoband.altnote`（0.672）不可满足。上述三种分母已在本轮实测过，均会把已登记槽位判负。
- 上条的另一面（**已知缺口**）：总和口径只保证「两側合起来 ≥ 0.75」，不保证「承载材料的那一侧单独 ≥ 0.75」。因此 §4 的 F1-A 负例只能改**承载材料的那一侧**（改译文侧时另一侧仍 ≥ 0.75，判据不会红）；改译文侧而不改材料侧的情形仍不能拦（材料侧本已 ≥ 0.75），这是本判据的边界，不是漏。
- `tools/verify-render.mjs` 的预期规模常量（`EXPECTED_CLIPS=10`、`MIN_IMAGES_PER_CELL=14`）是**当前节结构**的快照：增删 `.motion-clip` 槽位或 `<img>` 时门禁会先红，须同步改常量——这是故意的（宁可红也不静默放行）；`<img>` 取 ≥ 而非 ==，是为了不与「以后某节再加图」硬绑。
- `docs/GATES.md` §1 的字典键数本轮由 140 改为实测 138（`node docs/verify-copy.mjs` 首行 `keys en=138 zh=138`；T3b 轮记的 140 与现树不符，与本轮改动无关，仅就手改正）。
- 设计稿上两处取值相同（如卡2/卡3 的 title-ink）时，互换不可判——这是信息不足，不是可修的缺口。
