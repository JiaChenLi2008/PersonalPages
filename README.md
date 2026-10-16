# 嘉宸 · 个人介绍站

Vite + React + TypeScript 静态站点。构建命令 `npm run build`（= `tsc --noEmit && vite build`），产物是 `dist/`——一份纯静态的 HTML / CSS / JS，可直接托管在任意静态主机上。部署路径**只有一条：GitHub Pages**。

十一节（`nav` / `hero` / `photo-band` / `index` / `scholarly` / `elder` / `music` / `sport` / `method` / `values` / `footer`）的视觉与文案已全部实现，页面结构、设计 token、双语运行时与共享动效层均已就位：设计值由四条 `tools/fidelity-*.mjs` 对设计稿 `ui.pen` 逐条比对（本仓 `missing=0`），产物可直接部署。

## 环境

- Node 22 —— 本地、CI 与部署 workflow 统一用 22。
- npm，按本机 registry 配置安装即可。
- 部署**不需要本机装任何云 CLI**：本机没有 `gh`、`wrangler`、`docker` 也无妨，远端配置全在 GitHub 网页端点击完成。

## 本地命令

```bash
npm ci                          # 按 lockfile 安装
npm run dev                     # 本地开发
npm run build                   # 类型检查 + 构建到 dist/
npm run preview                 # 预览 dist/ 产物
npx tsc --noEmit                # 仅类型检查（src）
npm run typecheck               # src + vite.config.ts
```

## 验证套件

### CI 跑（每次部署都跑，顺序即 workflow 的顺序）

```bash
node tools/verify-tokens.mjs       # 设计 token 逐条比对设计稿数值
node tools/verify-deploy.mjs       # 部署配置门禁（GitHub Pages 单路径）
npm run build                      # 类型检查 + 产出 dist/
node tools/verify-copy-wiring.mjs  # 文案键确实进了 dist/assets/*.js（读打包产物）
node tools/verify-head.mjs         # index.html 文档头与字典 hero.* 逐字一致
node tools/verify-responsive.mjs   # 蓝图 §3 的响应式数值逐条比对
node tools/verify-ssr-dom.mjs      # SSR 结构与无障碍属性（自跑 vite SSR 构建）
```

便宜的静态门禁先跑（fail fast）。后四条都排在 `npm run build` 之后：`verify-copy-wiring.mjs` 读 `dist/assets`；`verify-head.mjs` / `verify-responsive.mjs` 只读 checkout 里的文件；`verify-ssr-dom.mjs` 用 Vite JS API 自建一份 SSR 产物到 `/tmp`（不读 `dist/`），是这批里最慢的一个，故排最后。

### 只在本地跑（CI 不跑，因为不自足）

上列七条全自足：只读 checkout、无浏览器、无仓库外输入。下面这些的输入或运行环境不在 CI 里，故留在本地：

| 命令 / 门禁 | 不进 CI 的原因 |
|---|---|
| `node docs/verify-copy.mjs` | 读仓库上级目录的 `ui.pen` 与 `.agents/briefs/**`，并按 `ui.pen` 的 sha256 + 字节数校验冻版基线；CI 的 checkout 里没有这些文件。缺输入时以 rc=2 单行报 `UNAVAILABLE:` 退出 |
| 四条 `tools/fidelity-*.mjs`（`nav-hero-photoband` / `index-method-values-footer` / `elder-music-sport` / `scholarly`） | 同上，另需仓库上级目录的 HIR 竞赛文书 PDF；缺输入时同样以 rc=2 单行报 `UNAVAILABLE:` 退出 |
| `node tools/verify-render.mjs` | 连宿主浏览器 CDP 端点（默认 `127.0.0.1:9222`，可用 `CDP=` 覆盖）；CI 容器内没有浏览器，端点不可用时以 rc=2 明确退出而非静默通过 |
| `node tools/verify-fonts.mjs` | 同上：靠 CDP `CSS.getPlatformFontsForNode` 读**实际选中**的字体族，端点不可用时以 rc=2 单行 `UNAVAILABLE:` 退出 |
| `node tools/verify-lang-toggle.mjs` | 同上：其浏览器节同样依赖宿主 CDP 端点 |

本地跑全量（CI 七条 + 上表）：

```bash
node tools/verify-tokens.mjs && node tools/verify-deploy.mjs && npm run build && node tools/verify-copy-wiring.mjs && node tools/verify-head.mjs && node tools/verify-responsive.mjs && node tools/verify-ssr-dom.mjs && npx tsc --noEmit && node docs/verify-copy.mjs && for f in tools/fidelity-*.mjs; do node "$f"; done && node tools/verify-fonts.mjs && node tools/verify-render.mjs && node tools/verify-lang-toggle.mjs
```

所有命令都以 rc=0 为准；rc=1 打印具体是哪一条断言不成立，rc=2 表示运行环境或仓外输入不可用（单行 `UNAVAILABLE:`，见下表）。

## 部署到 GitHub Pages

站点是单页 + 锚点，没有客户端路由，因此**不需要** SPA 404 回退，也**不需要** `.nojekyll`（Actions 产物经 `upload-pages-artifact` 发布，不走 Jekyll）。

1. 把仓库推到 GitHub，默认分支 `main`。
2. 仓库网页端 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**（不要选 "Deploy from a branch"）。
3. 向 `main` 推送即触发 `.github/workflows/deploy.yml`：
   `actions/checkout` → `actions/setup-node`（Node 22 + npm 缓存）→ `npm ci` → `node tools/verify-tokens.mjs` → `node tools/verify-deploy.mjs` → `npm run build` → `node tools/verify-copy-wiring.mjs` → `node tools/verify-head.mjs` → `node tools/verify-responsive.mjs` → `node tools/verify-ssr-dom.mjs` → `actions/configure-pages` → `actions/upload-pages-artifact`（`path: ./dist`）→ `actions/deploy-pages`。
   静态门禁先跑（fail fast），靠后的四个门禁都排在 build 之后（`verify-copy-wiring` 要读 `dist/`）；任一脚本 rc≠0，job 即失败，不会发布半成品。进 CI 的只有自足脚本；依赖仓库外素材或宿主浏览器的门禁留在本地跑（见「验证套件」的 CI 边界表）。
   手动重跑：**Actions → Deploy to GitHub Pages → Run workflow**。
4. 在 **Actions** 面板看这次 run 的 `build` / `deploy` 两个 job 变绿；`deploy` 的 environment 链接即站点地址。
5. 访问 `https://<user>.github.io/<repo>/`。（用户主页仓库 `<user>.github.io` 则是 `https://<user>.github.io/`。）
   两种路径都不必改配置：`vite.config.ts` 用 `base: "./"`，产物里全是 `./assets/…` 这类相对引用。
6. 自定义域名（可选）：在同一个 Pages 页面里填 **Custom domain** 并保存（GitHub 随之在仓库根写入 `CNAME`），再到 DNS 服务商加一条指向 `<user>.github.io` 的 `CNAME` 记录；证书签发后勾上 **Enforce HTTPS**。

## 其它托管（非主路径）

产物同为纯静态，若日后要走 Cloudflare Pages：连接本仓库，构建命令 `npm run build`、产物目录 `dist`、环境变量 `NODE_VERSION=22` 即可。它只是备选，主路径仍是上面那条。

## 设计 token（单一真源）

`src/styles/tokens.css` 是仓库内**唯一**允许出现字面色值（`#RRGGBB`）的文件，数值逐字取自设计简报（design-system.md §9，即 ui.pen「Style H — 瑞士网格」实测值），不得取近似值。素材与设计稿在仓库上级目录。

`tools/verify-tokens.mjs` 把 tokens.css 与简报数值逐条比对：**缺 token、数值不符、出现未登记的多余 token** 都会以 rc≠0 退出并打印 token 名、期望值、实际值。文件内 token 分两组并标注来源：

- `design brief §9`：设计稿实测值（83 项）
- `implementation supplement`：设计稿中未单列的值（73 项）——单尺寸补齐、响应式分档（BLUEPRINT §3.1–§3.3）与动效层

## 字体

拉丁两族**自托管**：文件入仓、构建不联网、运行期不取任何 CDN。`public/fonts/` 放 `src/styles/fonts.css` 声明的 woff2 与两族各自的 OFL 许可（`OFL-Inter.txt` / `OFL-IBM-Plex-Mono.txt`，来源：npm 包 `@fontsource/inter` 与 `@fontsource/ibm-plex-mono`，即 Google Fonts 官方字体的 Fontsource 打包，5.3.0）。只取页面实际用到的字重与 latin 子集（Inter 700/900、IBM Plex Mono 400）——多一个字重就是白白多一次下载。

中文按设计走**客户端系统 CJK 字体**（`--ff-sans-cn: "Noto Sans SC", system-ui, sans-serif`）：不下载、不入仓，实际由本机系统字体呈现（本机实测落 `Noto Sans CJK SC`）。

`@font-face` 的 `src` 在源码里写成 `/fonts/…`：Vite（`base: "./"`）会把它改写成相对产物样式表的 `../fonts/…`，GH Pages 项目页子路径下才可达；若产物里出现 `"/fonts/…` 这类根绝对路径，字体在该路径下必 404。核法：`grep -oE 'url\([^)]*fonts[^)]*\)' dist/assets/*.css`。

**声明栈 ≠ 实际选中**：CSS 里写了 `Inter` 不等于浏览器真的用它——字体没加载、字重不在子集、字形不在子集，都会静默回落到别的族。`tools/verify-fonts.mjs` 就是为此存在：用 CDP `CSS.getPlatformFontsForNode` 断言 `.hero__title-en` / `.hero__eyebrow` 等节点的实际 `familyName` 与 `isCustomFont`，并断言中文节点仍在系统 CJK 字体上。

## 目录结构

```
src/
  styles/                tokens.css / global.css / motion.css / fonts.css（自托管 @font-face）
  i18n/index.tsx         双语运行时（Locale 类型、LocaleProvider、useLocale）
  i18n/lang.ts           语言状态（Lang、默认 zh-Hans；?lang= → localStorage → 默认 的解析与 <html lang> 同步）
  i18n/copy.ts           文案访问（useCopy() → text() / langOf()，只读中心字典，不持有文案）
  lib/useInView.ts       IntersectionObserver 观察 + reduced-motion / SSR 降级
  components/primitives/ Section / Rule / TextRole / Reveal + primitives.css
  sections/              Nav / Hero / PhotoBand / Index / Elder / Music / Sport / Method / Values / Footer（各一节）
  sections/Scholarly/    Scholarly.tsx / ScholarlyIgem / ScholarlyJhu / ScholarlyImmuno / ScholarlyHir.tsx / useReveal.ts / scholarly.css
tools/                   verify-tokens / verify-deploy / verify-copy-wiring / verify-head / verify-responsive / verify-ssr-dom（进 CI），其余留在本地
docs/                    verify-copy.mjs / copy-en.json / copy-zh.json
.github/workflows/       deploy.yml（唯一的部署路径）
```

- 区块与 `data-section` 名一一对应（ui.pen 的十一节顺序）：`nav` / `hero` / `photo-band` / `index` / `scholarly` / `elder` / `music` / `sport` / `method` / `values` / `footer`。
- 双语文案约定：全站文案在中心字典 `docs/copy-en.json` / `docs/copy-zh.json`（各 134 键），由组件经 `useCopy()`（`src/i18n/copy.ts`）以 `text("key")` / `langOf("key")` 消费；`src/i18n` 内不放任何文案。
- locale 持久化用 localStorage 键 `jc-lang`（`src/i18n/lang.ts`），默认 `zh-Hans`，解析序 `?lang=` → localStorage → 默认；切换时同步 `<html lang>`（en / zh-Hans）。

## 已知事项

- `package-lock.json` 的 `resolved` 字段统一指向公共源 `https://registry.npmjs.org/`（本机 npm 配置了镜像也无妨：`replace-registry-host=npmjs` 会在安装时自动换回镜像源）。
- 页面唯一的 `<h1>` 在 Hero 节（`src/sections/Hero/Hero.tsx`，`id="hero-title"`）；全局 `:focus-visible` 与 `prefers-reduced-motion` 已在 `global.css` / `motion.css` 就位。
- **无 JS 时页面为空白**：内容全部由 React 在客户端渲染，`index.html` 里只有一段 `<noscript>` 兜底提示（中英并列）与静态 `meta`，故无 JS 环境只看得到那句提示。整页预渲染 / SSR 未做（用户裁决暂不做）。该提示文案不是设计稿文案，故不在中心字典内。
