#!/usr/bin/env node
/*
 * Language-purity gate (BLUEPRINT §6.4, .agents/briefs/lang-purity-ruling.md §2/§5/§6).
 *
 * Renders the whole page through the same in-repo SSR path tools/verify-lang-toggle.mjs
 * uses (Vite JS API, virtual entry, `vite build --ssr`) in both modes — the default
 * (en) and, through a build-time patch of DEFAULT_LANG, zh-Hans — and scans the markup:
 *
 *   1. EN mode carries no CJK where a reader can meet it: visible text plus the
 *      title / alt / aria-label / placeholder / content attributes. The static shell
 *      head (index.html <title> + meta) is the EN default's, so it is scanned too.
 *   2. ZH mode: every Latin-letter token must be on the closed whitelist
 *      (translation-policy.md §2, plus PDF / WebP / EN / ZH as approved by the leader).
 *      The run prints the per-token table either way.
 *   3. ZH mode: an element whose whole text is one whitelisted Latin token carries
 *      lang="en", so a screen reader pronounces it as English (BLUEPRINT §6.4 #5).
 *
 * Scope: what each mode renders, plus the default mode's static head. The <noscript>
 * block in index.html is a JS-off affordance (no mode is applied without JS) and stays
 * bilingual by design — it is not part of either mode's product and is not scanned.
 *
 * The whitelist is closed: extending it needs leader approval (translation-policy.md §2).
 *
 * Output: per-mode `CJK=<n>` / `latin_tokens=<n> whitelist_hits=<n>`, then the token
 * table for the ZH mode; every breach is named with the token and where it was read.
 *
 * Usage: node tools/verify-lang-purity.mjs   (exit 0 = pure, 1 = a breach)
 *
 * Temporary output: /tmp/lang-purity-ssr-out (rebuilt each run) +
 * /tmp/lang-purity-{en,zh-Hans}.html.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "vite";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const APP = join(REPO, "src", "App.tsx");
const LANG_MODULE = join(REPO, "src", "i18n", "lang.ts");
const INDEX_HTML = join(REPO, "index.html");
const OUT_DIR = "/tmp/lang-purity-ssr-out";

const failures = [];
const fail = (message) => failures.push(message);

/* ---------- character classes and the closed whitelist ---------- */

/** CJK ideographs, CJK punctuation, fullwidth forms, CJK compatibility forms. */
const CJK = /[\u2e80-\u2eff\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef]/gu;

/** A Latin-letter token; a URL or an e-mail is one token, not a run of words. */
const LATIN_TOKEN =
  /(?:https?:\/\/|www\.)[^\s"'<>)]+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|[A-Za-z][A-Za-z0-9'’\-]*/gu;

/** translation-policy.md §2 + PDF / WebP / EN / ZH (leader-approved). */
const WHITELIST = [
  /^iGEM$/,
  /^HIR$/,
  /^JHU$/,
  /^IgG4$/,
  /^PDF$/,
  /^WebP$/,
  /^EN$/,
  /^ZH$/,
  /* docx-1023 医院指南：材料原文即含 3pm/1pm/B超/CT；XLSX/Excel 为格式专名 */
  /* LATIN_TOKEN 从字母起算，「3pm / 1pm」的数字被切掉，扫描器看到的是 pm，故按 [13]?pm 锚定。 */
  /^[13]?pm$/,
  /^B$/, // B超
  /^CT$/,
  /^XLSX$/,
  /^Excel$/,
  /^(?:https?:\/\/|www\.)[^\s"'<>)]+$/, // URL
  /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/, // e-mail address
];
const whitelisted = (token) => WHITELIST.some((pattern) => pattern.test(token));

/** User-readable attributes: BLUEPRINT §6.4 / ruling §5 put them under the same rule. */
const NAMED_ATTRIBUTES = /(?:^|\s)(title|alt|aria-label|placeholder|content)="([^"]*)"/g;

/* ---------- build + render one mode ---------- */

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

async function render(mode) {
  const entryId = `\0virtual:lang-purity-${mode}`;
  const outDir = `${OUT_DIR}-${mode}`;
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
      outDir,
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
        /* The page language is a module constant resolved at import time, so the
           non-default mode is rendered by rewriting that one literal in lang.ts. The
           patch must apply: a silent miss would scan the default mode twice. */
        transform(code, id) {
          if (mode !== "zh-Hans" || id !== LANG_MODULE) {
            return null;
          }
          const patched = code.replace(
            /(DEFAULT_LANG\s*:?\s*(?:Lang)?\s*=\s*)"en"/,
            '$1"zh-Hans"',
          );
          if (patched === code) {
            throw new Error(`lang-purity: DEFAULT_LANG patch did not apply to ${id}`);
          }
          return patched;
        },
      },
    ],
  });
  const documentElement = {};
  globalThis.document = { documentElement };
  const module = await import(pathToFileURL(join(outDir, "entry.js")).href);
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

/* ---------- 1. EN mode: no CJK ---------- */

const en = await render("en");
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

/* ---------- 2./3. ZH mode: whitelist only, and lang="en" on a whole-token element ---------- */

const zh = await render("zh-Hans");
writeFileSync("/tmp/lang-purity-zh-Hans.html", zh.html);
if (zh.pageLang !== "zh-Hans") {
  fail(`ZH mode: lang.ts wrote <html lang>=${JSON.stringify(zh.pageLang)}, expected "zh-Hans"`);
}
const zhSurfaces = [
  ["visible text", visibleText(zh.html)],
  ...namedAttributes(zh.html).map(([name, value]) => [`attr ${name}`, value]),
];
const counts = new Map();
const outside = [];
for (const [where, value] of zhSurfaces) {
  for (const token of value.match(LATIN_TOKEN) ?? []) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
    if (!whitelisted(token)) {
      outside.push(`${where}: ${JSON.stringify(token)}`);
    }
  }
}
for (const breach of outside) {
  fail(`ZH mode is not pure — Latin token outside the whitelist: ${breach}`);
}

/* An element whose whole text is one whitelisted token must carry lang="en" (ruling §4):
   a screen reader has to pronounce iGEM / an e-mail / a URL as English. */
const WHOLE_ELEMENT = /<([a-zA-Z][\w-]*)\b([^>]*)>([^<>]*)<\/\1>/g;
const unmarked = [];
for (const match of zh.html.matchAll(WHOLE_ELEMENT)) {
  const text = decode(match[3]).trim();
  if (text === "" || !whitelisted(text)) {
    continue;
  }
  if (!/\slang="en"/.test(match[2])) {
    unmarked.push(`<${match[1]}> ${JSON.stringify(text)}`);
  }
}
for (const element of unmarked) {
  fail(`ZH mode: ${element} is a whitelisted Latin token without lang="en" (BLUEPRINT §6.4 #5)`);
}

const table = [...counts].sort(([a], [b]) => a.localeCompare(b));
console.log(
  `zh-Hans: latin_tokens=${table.length} whitelist_hits=${table.filter(([token]) => whitelisted(token)).length} ` +
    `outside=${outside.length} unmarked_whole_tokens=${unmarked.length}`,
);
for (const [token, count] of table) {
  console.log(`  ${whitelisted(token) ? "ok " : "BREACH"} ${JSON.stringify(token)} ×${count}`);
}

/* ---------- report ---------- */

if (failures.length > 0) {
  console.error(`FAIL: ${failures.length} language-purity problem(s)`);
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `PASS: en has no CJK (markup + static head); zh-Hans has ${table.length} Latin token(s), ` +
    "all whitelisted, each whole-token element marked lang=\"en\"",
);
