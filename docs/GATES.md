# 门禁强度登记（GATES）

冻版基线：`ui.pen` 137536 B、sha256 `8816b923b24c00e4…`（同 `docs/CHROME.md`）。

本文件登记每条校验脚本**能证什么 / 不能证什么 / 跑在哪**，以及已知盲区与假绿历史。
凡标「未实测」「未审」处，即本轮没有取到证据，不得读作「已证明」；本文件不登记待办（与 `docs/DESIGN-GAPS.md` 分工不同）。

P12 轮（本轮）只动两处判据，均属收紧：`tools/fidelity-index-method-values-footer.mjs` 的 Values
逐卡配对从 `--card-label-ink` 扩到 `--card-fill` / `--card-title-ink`（P9 已建的逐卡模式），
`tools/verify-responsive.mjs` 的档位值改按「承接该 token 的选择器」断言。设计稿与 `src/**` 未动。

## 1 总表

| 门禁 | 能证什么 | 不能证什么 | 跑在哪 |
|---|---|---|---|
| `tools/verify-tokens.mjs` | `src/styles/tokens.css` 156 个 token 与设计简报 §9 + 实现补充表**逐字节同值** | 谁消费了哪个 token、某节档位取值、视觉结果 | CI |
| `tools/verify-deploy.mjs` | Pages 发布链静态约定 56 项（vite 相对 base、npm scripts、README 提及、workflow 步骤依赖顺序） | 运行结果、UI | CI |
| `npm run build`（`tsc --noEmit` + vite） | 类型可编译、可打包 | 视觉、设计值、布局 | CI |
| `tools/verify-copy-wiring.mjs` | 产物中的文案全部来自冻版字典（含未引用键下限） | 排版、位置、设计值 | CI（须在 build 后） |
| `tools/verify-head.mjs` | `index.html` 静态 head 与字典逐字一致 6 项 | body 任何内容 | CI |
| `tools/verify-responsive.mjs` | BLUEPRINT §3.1/§3.2 每个档位值由**该 token 自身的载体选择器**在对应 `@media (max-width: Npx)` 块内以 `var(--name)`/`var(--name-tNNNN)` 承接，属性属族且解析值含表值；§3.3 的 `` `--token` `` 锚同此 | §3.3 非 token 数字（色块/方图/`h`/gap/padding）不绑选择器（§2 B-残留）；token 表值本身由 verify-tokens 管，本门禁不比对设计稿 | CI |
| `tools/verify-ssr-dom.mjs` | 学术成果节 SSR 后的 DOM 事实：标题层级、9 个揭晓区初始折叠且 panel id 可寻、图片 lazy、`lang` 双值 | 只覆盖 scholarly 节；视觉 | CI |
| `docs/verify-copy.mjs` | 字典自身规则：键集合一致、字段类型、②规则⑤/⑦/⑧ | 渲染、版式 | 本地 |
| `tools/verify-lang-toggle.mjs` | 语言切换逐条键、不重载、同值点击持久化 | 视觉 | 本地 |
| `tools/verify-render.mjs` | 真实浏览器渲染度量（驱动器无本机浏览器，走宿主 Chrome CDP `127.0.0.1:9222`） | CI 无此环境 | 本地 |
| `tools/verify-assets.py` | 资源体积与完整性 | 版式、设计值 | 本地 |
| `tools/fidelity-scholarly.mjs`、`tools/fidelity-nav-hero-photoband.mjs`、`tools/fidelity-elder-music-sport.mjs`、`tools/fidelity-index-method-values-footer.mjs` | 各节 ui.pen 子树的设计数值/色彩/字族在对应节样式里有承接声明；索引四行三色、Values 四卡三属性另有逐节点配对 | 除已配对项外按**节级池**匹配：节点级错值可被同节别的节点顶掉（§2 A2/A3/A4）；另三条本轮**未审**（§2 C） | 本地 |
| `tools/verify-fonts.mjs` | **本轮不在树中**（另 lane 在建）——落地后须补登其能证/不能证，未补登前不得引用 | — | — |

上表 7 条 CI 门禁 = `.github/workflows/deploy.yml` 的全部步骤（verify-tokens → verify-deploy →
build → verify-copy-wiring → verify-head → verify-responsive → verify-ssr-dom）。
四条 fidelity、`docs/verify-copy.mjs`、lang-toggle、render、assets **未接入 CI**，其假绿 CI 不会拦下。

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

`tools/verify-fonts.mjs` 本轮不在树中，故其强度与盲区一并**未审**。

## 3 假绿历史

| 轮次 | 位置 | 修前反例（rc） | 修后（rc） |
|---|---|---|---|
| P8（`6f3524a`「补三门禁的覆盖盲区」：copy-wiring 引用下限、lang-toggle 逐条、deploy 依赖） | 三条 CI 门禁 | 未复现（**未实测**） | 提交内含新增断言，本轮未跑 |
| P9（`d11c497`） | Values `--card-label-ink` 由节级池 → 逐卡配对 | 互换卡3/卡4 label-ink：**rc=0**（`checked=320`，以 `d11c497^` 判据 + 当前冻版哈希复跑） | **rc=1**（`checked=324`，`missing` 指名 `J565aY`/`iaMEM`） |
| P12（本轮） | Values `--card-fill` / `--card-title-ink` 由节级池 → 逐卡配对 | 互换卡1/卡2 fill：**rc=0**（`checked=324`） | **rc=1**（`checked=332`，`missing` 指名两卡） |
| P12（本轮） | `verify-responsive` 档位值由节级池 → 载体选择器绑定 | 挪 `--pad-row-t1200` 声明到 `.index__body`：**rc=0** | **rc=1**（`values_checked=84` 不变） |
| 早期 | Index 四行 `--num-fill`/`--no-ink`/`--en-ink` 逐行配对（自 `46f0cbd` 起即在树中） | **未实测**（其修前状态不在本轮范围） | 现状 rc=0 且逐行打印 |

## 4 最小反例复现（本轮实测口径）

口径：把 worktree 的 `src/ tools/ docs/` 复制到 /tmp 并放入 `ui.pen`（或 `UI_PEN=<path>`），
按左列改一处，跑 `node tools/<门禁>`，看 rc。修前判据用 `git show HEAD:tools/…` 取（P9 那条另把
`PEN_SHA256_PREFIX` 对齐当前冻版哈希，否则会因旧冻版哈希先红）。上表每条反例均如此实跑，记录如下：

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

计数口径：`fidelity-index-method-values-footer` 的 `checked` 由 324 增至 332（+8 = 新绑定的 2 属性 × 4 卡；
P9 前为 320）。`verify-responsive` 的 `values_checked` 修前修后同为 84（`--token` 锚的数字从共用数字集合
移入各自的 token 断言，总数不变；hero 的 `--col-hero-right 304px` 只算一条，token 区间已先屏蔽）。

## 5 口径与局限

- 本文件登记**判据强度**，不登记门禁条数或覆盖率；「已修」只指本轮/上列提交的判据改动，「未修」「未审」「未实测」即字面意思。
- 四条 fidelity 门禁都依赖 `ui.pen` 冻结哈希（`PEN_SHA256_PREFIX`）与字节大小，改冻版必须同步改门禁常量，否则先红在哈希检查。
- 逐节点配对只覆盖已显式列出的属性（Index 三色、Values 三属性）；其余节点值仍是节级池，见 §2 A2/A3/A4。
- 设计稿上两处取值相同（如卡2/卡3 的 title-ink）时，互换不可判——这是信息不足，不是可修的缺口。
