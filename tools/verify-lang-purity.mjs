#!/usr/bin/env node
/*
 * Language-purity gate (BLUEPRINT §6.4, .agents/briefs/lang-purity-ruling.md §2/§5/§6;
 * docx-1027 用户裁决 §2 — the site is locked to English).
 *
 * Renders the whole page through the same in-repo SSR path the sibling DOM gates use
 * (Vite JS API, virtual entry, `vite build --ssr`) in the one product mode, en, and
 * scans the markup:
 *
 *   EN mode carries no CJK where a reader can meet it: visible text plus the
 *   title / alt / aria-label / placeholder / content attributes. The static shell
 *   head (index.html <title> + meta) is the EN default's, so it is scanned too.
 *
 * Scope: what the page renders, plus its static head. The <noscript> block in index.html
 * is a JS-off affordance (no mode is applied without JS) and stays bilingual by design —
 * it is not part of the product and is not scanned.
 *
 * The zh-Hans half of this gate (closed Latin-token whitelist, lang="en" on whole-token
 * elements) was retired with the ZH/EN switcher: src/i18n/lang.ts still resolves `?lang=`
 * from the URL, popstate and localStorage, so a zh render stays reachable through that
 * entry, but it is no longer a product mode — the page ships no way to switch, and its
 * purity was the purity of an unreachable state. The dictionaries keep both locales for
 * the workbook generator and for that entry.
 *
 * Output: `en: CJK=<n>` (markup size and static-head surface count), then one line per
 * CJK run found, each naming the surface it was read from.
 *
 * Usage: node tools/verify-lang-purity.mjs   (exit 0 = pure, 1 = a breach)
 *
 * Temporary output: /tmp/lang-purity-ssr-out (rebuilt each run) +
 * /tmp/lang-purity-en.html.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "vite";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const APP = join(REPO, "src", "App.tsx");
const INDEX_HTML = join(REPO, "index.html");
const OUT_DIR = "/tmp/lang-purity-ssr-out";

const failures = [];
const fail = (message) => failures.push(message);

/* ---------- character classes ---------- */

/** CJK ideographs, CJK punctuation, fullwidth forms, CJK compatibility forms. */
const CJK = /[\u2e80-\u2eff\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef]/gu;

/** User-readable attributes: BLUEPRINT §6.4 / ruling §5 put them under the same rule. */
const NAMED_ATTRIBUTES = /(?:^|\s)(title|alt|aria-label|placeholder|content)="([^"]*)"/g;

/* ---------- build + render the product mode ---------- */

/** React escapes text; comparisons and token counts run on the decoded text. */
const decode = (markup) =>
  markup
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&middot;/g, "·");

async function render() {
  const entryId = "\0virtual:lang-purity";
  const entry = `
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { App } from ${JSON.stringify(APP)};

export const html = renderToStaticMarkup(createElement(App));
`;
  await build({
    root: REPO,
    logLevel: "warn",
    build: {
      ssr: true,
      outDir: OUT_DIR,
      emptyOutDir: true,
      copyPublicDir: false,
      rollupOptions: { input: entryId, output: { entryFileNames: "entry.js" } },
    },
    ssr: { noExternal: true },
    plugins: [
      {
        name: "lang-purity-entry",
        resolveId: (id) => (id === entryId ? entryId : null),
        load: (id) => (id === entryId ? entry : null),
      },
    ],
  });
  const documentElement = {};
  globalThis.document = { documentElement };
  const module = await import(pathToFileURL(join(OUT_DIR, "entry.js")).href);
  return { html: module.html, pageLang: documentElement.lang };
}

/** Visible text of the markup, tags removed and whitespace folded. */
const visibleText = (markup) => decode(markup.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

/** [name, value] for every user-readable attribute in the markup. */
function namedAttributes(markup) {
  const found = [];
  for (const match of markup.matchAll(NAMED_ATTRIBUTES)) {
    found.push([match[1], decode(match[2])]);
  }
  return found;
}

/* ---------- EN mode: no CJK ---------- */

const en = await render();
writeFileSync("/tmp/lang-purity-en.html", en.html);
if (en.pageLang !== "en") {
  fail(`EN mode: lang.ts wrote <html lang>=${JSON.stringify(en.pageLang)}, expected "en"`);
}
const shell = readFileSync(INDEX_HTML, "utf8");
const shellLang = (shell.match(/<html[^>]*\slang="([^"]*)"/) ?? [])[1];
if (shellLang !== "en") {
  fail(`index.html: <html lang>=${JSON.stringify(shellLang)}, expected "en" (pre-hydration shell)`);
}
const head = shell.slice(0, shell.indexOf("</head>"));
const shellHead = [
  ["<title>", decode((head.match(/<title>([\s\S]*?)<\/title>/) ?? [])[1] ?? "")],
  ...[...head.matchAll(NAMED_ATTRIBUTES)].map((match) => [`meta ${match[1]}`, decode(match[2])]),
];
const enSurfaces = [
  ["visible text", visibleText(en.html)],
  ...namedAttributes(en.html).map(([name, value]) => [`attr ${name}`, value]),
  ...shellHead.map(([name, value]) => [`shell ${name}`, value]),
];
const enCjk = [];
for (const [where, value] of enSurfaces) {
  for (const match of value.matchAll(CJK)) {
    const around = value.slice(Math.max(0, match.index - 20), match.index + 20);
    enCjk.push(`${where}: ${JSON.stringify(match[0])} in ${JSON.stringify(around)}`);
  }
}
for (const breach of enCjk) {
  fail(`EN mode is not pure — CJK found: ${breach}`);
}
console.log(`en: CJK=${enCjk.length} (${en.html.length} B markup, head ${shellHead.length} surface(s))`);

/* ---------- report ---------- */

if (failures.length > 0) {
  console.error(`FAIL: ${failures.length} language-purity problem(s)`);
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("PASS: en has no CJK (markup + static head)");
