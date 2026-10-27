#!/usr/bin/env node
/*
 * DOM regression check for the hospital guide card that closes Elder (02).
 *
 * docx-1027 item 4 (user ruling) removed the twelve-row table and its keyboard scroll
 * shell: the section now ends with the workbook download card only, and the twelve rows
 * live in public/media/shanghai-hospitals.xlsx. What can go wrong quietly after such a
 * removal is the card itself and the residue of the table, so this check renders Elder
 * through the same in-repo SSR path the sibling DOM gates use (Vite JS API, virtual entry,
 * `vite build --ssr`) and asserts the smallest set that would catch it:
 *
 *   1. the section head is there (`#elder-title`) — the section still names itself;
 *   2. the download card exists and links `./media/shanghai-hospitals.xlsx`, new tab,
 *      noopener kept;
 *   3. the card's title is the dictionary's `elder.guide.title`, not a hard-coded string;
 *   4. no `<table>` anywhere in the render;
 *   5. no `role="region"` element — the keyboard scroll shell went with the table;
 *   6. no `elder__guideTable` class in the markup.
 *
 * Usage: node tools/verify-elder-guide.mjs   (exit 0 = pass, 1 = any failed assertion)
 *
 * Temporary output: /tmp/elder-guide-ssr-out (rebuilt each run) +
 * /tmp/elder-guide-ssr-en.html.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "vite";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const OUT_DIR = "/tmp/elder-guide-ssr-out";
const ELDER = join(REPO, "src", "sections", "Elder", "Elder.tsx");
const DOWNLOAD = "./media/shanghai-hospitals.xlsx";

const failures = [];

/** One line per assertion: `ok` when it holds, `FAIL` with the reason when it does not. */
function check(label, problem) {
  if (problem === null) {
    console.log(`ok   ${label}`);
  } else {
    failures.push(label);
    console.error(`FAIL ${label}: ${problem}`);
  }
}

/* ---------- rendering ---------- */

const entrySource = `
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Elder } from ${JSON.stringify(ELDER)};

export const html = renderToStaticMarkup(createElement(Elder));
`;

async function render() {
  const entryId = "\0virtual:elder-guide";
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
        name: "elder-guide-entry",
        resolveId: (id) => (id === entryId ? entryId : null),
        load: (id) => (id === entryId ? entrySource : null),
      },
    ],
  });
  /* The shared i18n module writes the page language onto document.documentElement at
     import time; the renderer provides that one property, as the sibling gates do. */
  globalThis.document = { documentElement: {} };
  const module = await import(pathToFileURL(join(OUT_DIR, "entry.js")).href);
  return module.html;
}

const en = JSON.parse(readFileSync(join(REPO, "docs", "copy-en.json"), "utf8"));

/* ---------- markup helpers ---------- */

const decode = (markup) =>
  markup
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

const textOf = (markup) => decode(markup.replace(/<[^>]*>/g, "")).trim();

/** Attributes of one `<tag …>` in the render, as a plain object. */
function attrsOf(source) {
  const attrs = {};
  for (const match of source.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
    attrs[match[1]] = decode(match[2]);
  }
  return attrs;
}

/** The first `<tag>` carrying `needle` in its attributes, as { attrs, text }, or null. */
function elementOf(markup, tag, needle) {
  for (const match of markup.matchAll(new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)</${tag}>`, "g"))) {
    if (decode(match[1]).includes(needle)) {
      return { attrs: attrsOf(match[1]), text: textOf(match[2]) };
    }
  }
  return null;
}

/* ---------- the render ---------- */

const html = await render();
writeFileSync("/tmp/elder-guide-ssr-en.html", html);

/* ---------- 1. the section head ---------- */

check(
  "head: #elder-title is rendered",
  html.includes('id="elder-title"') ? null : "no element carries id=\"elder-title\"",
);

/* ---------- 2. the download card ---------- */

const links = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((match) => ({
  attrs: attrsOf(match[1]),
  text: textOf(match[2]),
}));
const link = links.find((candidate) => candidate.attrs.href === DOWNLOAD);
check(
  "download: a card link points at ./media/shanghai-hospitals.xlsx",
  link === undefined
    ? `no <a href="${DOWNLOAD}">; links found: ${JSON.stringify(links.map((a) => a.attrs.href))}`
    : null,
);
if (link !== undefined) {
  check(
    "download: opens in a new tab",
    link.attrs.target === "_blank" ? null : `target=${JSON.stringify(link.attrs.target)}, expected "_blank"`,
  );
  check(
    "download: rel keeps noopener",
    (link.attrs.rel ?? "").split(/\s+/).includes("noopener")
      ? null
      : `rel=${JSON.stringify(link.attrs.rel)}, expected it to carry noopener`,
  );
}

/* ---------- 3. the card title is the dictionary's ---------- */

const title = elementOf(html, "p", 'class="elder__docTitle"');
const titleText = en["elder.guide.title"].text;
check(
  "title: the card reads elder.guide.title",
  title === null
    ? "no <p class=\"elder__docTitle\"> in the render"
    : title.text === titleText
      ? null
      : `${JSON.stringify(title.text)} != ${JSON.stringify(titleText)}`,
);

/* ---------- 4./5./6. the table and its scroll shell are gone ---------- */

check(
  "no table: the render carries no <table>",
  /<table\b/.test(html) ? "a <table> is back in the Elder render (the rows live in the workbook)" : null,
);
check(
  "no region: the render carries no role=\"region\"",
  /<[a-zA-Z][\w-]*\b[^>]*\brole="region"/.test(html)
    ? "an element carries role=\"region\" (the scroll shell went with the table)"
    : null,
);
check(
  "no residue: no elder__guideTable class",
  html.includes("elder__guideTable") ? "the markup still carries the elder__guideTable class" : null,
);

/* ---------- report ---------- */

if (failures.length > 0) {
  console.error(`FAIL: ${failures.length} elder guide problem(s)`);
  process.exit(1);
}
console.log(`PASS: elder guide is the download card only — head, ${DOWNLOAD} (new tab, noopener), ` +
  "elder.guide.title, and no table / scroll region / guideTable residue");
