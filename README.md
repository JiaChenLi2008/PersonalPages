# 嘉宸 · 个人介绍站

Vite + React + TypeScript 静态站点。构建命令 `npm run build`（= `tsc --noEmit && vite build`），产物是 `dist/`——一份纯静态的 HTML / CSS / JS，可直接托管在任意静态主机上。部署路径**只有一条：GitHub Pages**。

当前仓库是**工程骨架**：只有页面结构、设计 token、双语运行时与共享动效层，**不含任何页面文案与 section 视觉实现**（由后续 lane 补齐）。

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
node tools/verify-tokens.mjs      # 设计 token 逐条比对设计稿数值
node tools/verify-deploy.mjs      # 部署配置门禁（GitHub Pages 单路径）
npm run build                     # 类型检查 + 产出 dist/
node tools/verify-copy-wiring.mjs # 文案键确实进了 dist/assets/*.js
```

便宜的静态门禁先跑（fail fast）；`verify-copy-wiring.mjs` 读打包产物，故排在 `npm run build` 之后。

### 本地跑全套（CI 不跑）

上面四条照跑，另加：

```bash
npx tsc --noEmit                  # 仅类型检查（src）
node docs/verify-copy.mjs         # 双语字典键集合与文案逐字溯源
node tools/verify-head.mjs        # index.html 文档头与字典 hero.* 逐字一致
node tools/verify-render.mjs      # 真渲染矩阵（需宿主 Chrome 开着 CDP）
for f in tools/fidelity-*.mjs; do node "$f"; done   # 逐节设计稿保真
```

这几条之所以只在本地跑：它们的输入不在仓库里。`docs/verify-copy.mjs` 与四条 `tools/fidelity-*.mjs`（`nav-hero-photoband` / `index-method-values-footer` / `elder-music-sport` / `scholarly`）要读仓库上级目录的素材——`ui.pen`、`.agents/briefs/**`、HIR 竞赛文书 PDF——并各自按 `ui.pen` 的 sha256 + 字节数校验冻版基线，CI 的 checkout 里不存在这些文件；`tools/verify-render.mjs` 则要连宿主浏览器的 CDP 端点（容器内没有浏览器），没有端点时以 rc=2 `ENV:` 退出而非静默通过。`tools/verify-head.mjs` 只读仓库内文件，但同样没有接进 workflow。所有命令都以 rc=0 为准；rc≠0 会打印具体是哪一条断言不成立。

## 部署到 GitHub Pages

站点是单页 + 锚点，没有客户端路由，因此**不需要** SPA 404 回退，也**不需要** `.nojekyll`（Actions 产物经 `upload-pages-artifact` 发布，不走 Jekyll）。

1. 把仓库推到 GitHub，默认分支 `main`。
2. 仓库网页端 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**（不要选 "Deploy from a branch"）。
3. 向 `main` 推送即触发 `.github/workflows/deploy.yml`：
   `actions/checkout` → `actions/setup-node`（Node 22 + npm 缓存）→ `npm ci` → `node tools/verify-tokens.mjs` → `node tools/verify-deploy.mjs` → `npm run build` → `node tools/verify-copy-wiring.mjs` → `actions/configure-pages` → `actions/upload-pages-artifact`（`path: ./dist`）→ `actions/deploy-pages`。
   静态门禁先跑（fail fast），要读 `dist/` 的 `verify-copy-wiring` 排在 build 之后；任一脚本 rc≠0，job 即失败，不会发布半成品。进 CI 的只有自足脚本——依赖仓库上级目录素材的 `docs/verify-copy.mjs` 与 `fidelity-*.mjs` 留在本地跑（见「验证套件」）。
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
- `implementation supplement (motion layer)`：动效层新增的时长/缓动 token（8 项，设计稿中无此值）

## 目录结构

```
src/
  styles/                tokens.css / global.css / motion.css
  i18n/index.tsx         双语运行时（Locale 类型、LocaleProvider、useLocale）
  lib/useInView.ts       IntersectionObserver 观察 + reduced-motion / SSR 降级
  components/primitives/ Section / Rule / TextRole / Reveal + primitives.css
  sections/              Nav / Hero / PhotoBand / Index / Method / Values / Footer（占位）
tools/                   verify-tokens.mjs / verify-copy-wiring.mjs / verify-deploy.mjs
docs/                    verify-copy.mjs / copy-en.json / copy-zh.json
.github/workflows/       deploy.yml（唯一的部署路径）
```

- 区块与 `data-section` 名一一对应：`nav` / `hero` / `photo-band` / `index` / `method` / `values` / `footer`。
- 双语文案约定：各区块自己的文案放 `src/sections/<Name>/<name>.en.ts` 与 `src/sections/<Name>/<name>.zh.ts`，由区块组件消费；`src/i18n` 内不放任何文案。
- locale 持久化用 localStorage 键 `jc-locale`，默认 `en`，切换时同步 `<html lang>`（en / zh-Hans）。

## 已知事项

- `package-lock.json` 的 `resolved` 字段统一指向公共源 `https://registry.npmjs.org/`（本机 npm 配置了镜像也无妨：`replace-registry-host=npmjs` 会在安装时自动换回镜像源）。
- 骨架页面的 `<h1>`、焦点态等无障碍细节随文案一起在后续 lane 落地；全局 `:focus-visible` 与 `prefers-reduced-motion` 已在 `global.css` / `motion.css` 就位。
