# 嘉宸 · 个人介绍站

Vite + React + TypeScript 静态站点。当前为**工程骨架**：只有页面结构、设计 token、双语运行时与共享动效层，**不含任何页面文案与 section 视觉实现**（由后续 lane 补齐）。

## 环境

- Node 22（CI 与 Cloudflare Pages 统一用 22）
- npm，按本机 registry 配置安装即可

## 本地命令

```bash
npm ci                          # 按 lockfile 安装
npm run dev                     # 本地开发
npm run build                   # 类型检查 + 构建到 dist/
npx tsc --noEmit                # 仅类型检查（src）
npm run typecheck               # src + vite.config.ts
node tools/verify-tokens.mjs    # 设计 token 保真校验
```

## 设计 token（单一真源）

`src/styles/tokens.css` 是仓库内**唯一**允许出现字面色值（`#RRGGBB`）的文件，数值逐字取自设计简报（design-system.md §9，即 ui.pen「Style H — 瑞士网格」实测值），不得取近似值。

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
tools/verify-tokens.mjs
.github/workflows/deploy.yml
```

- 区块与 `data-section` 名一一对应：`nav` / `hero` / `photo-band` / `index` / `method` / `values` / `footer`。
- 双语文案约定：各区块自己的文案放 `src/sections/<Name>/<name>.en.ts` 与 `src/sections/<Name>/<name>.zh.ts`，由区块组件消费；`src/i18n` 内不放任何文案。
- locale 持久化用 localStorage 键 `jc-locale`，默认 `en`，切换时同步 `<html lang>`（en / zh-Hans）。

## 部署 A：GitHub Pages

1. 推送仓库到 GitHub，默认分支 `main`。
2. 仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**（不要选 “Deploy from a branch”）。
3. push 到 `main` 即触发 `.github/workflows/deploy.yml`：`npm ci` → `node tools/verify-tokens.mjs` → `npm run build` → 上传 `dist` → `actions/deploy-pages`。
   手动触发：**Actions → Deploy to GitHub Pages → Run workflow**。
4. 站点地址：
   - 项目仓库：`https://<user>.github.io/<repo>/`
   - 用户主页仓库（`<user>.github.io`）：`https://<user>.github.io/`

   两种路径都无需改配置：`vite.config.ts` 用 `base: "./"`，产物引用全部是相对路径（`./assets/…`）。
5. 自定义域：**Settings → Pages → Custom domain**。

## 部署 B：Cloudflare Pages

1. Cloudflare Dashboard → **Workers & Pages → Create → Pages → Connect to Git**，选中本仓库。
2. 构建配置：
   - Production branch：`main`
   - Framework preset：`None`（或 `Vite`，等价）
   - Build command：`npm run build`
   - Build output directory：`dist`
3. 环境变量：`NODE_VERSION=22`。不需要设 base：`base: "./"` 在根路径同样成立。
4. 保存并部署；此后 push 自动构建，非生产分支生成预览环境。
5. 本机没有 wrangler / gh 时无需本地部署工具：直接 `git push`，由平台侧拉代码构建。

## 验证清单

| 命令 | 期望 |
| --- | --- |
| `npx tsc --noEmit` | rc=0 |
| `npm run build` | rc=0，`dist/index.html` 资源为 `./assets/…` 相对路径 |
| `node tools/verify-tokens.mjs` | rc=0（当前 91 项） |

## 已知事项

- `package-lock.json` 的 `resolved` 字段统一指向公共源 `https://registry.npmjs.org/`（本机 npm 配置了镜像也无妨：`replace-registry-host=npmjs` 会在安装时自动换回镜像源）。
- 骨架页面的 `<h1>`、焦点态等无障碍细节随文案一起在后续 lane 落地；全局 `:focus-visible` 与 `prefers-reduced-motion` 已在 `global.css` / `motion.css` 就位。
