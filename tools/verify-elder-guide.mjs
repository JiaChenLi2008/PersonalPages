#!/usr/bin/env node
/*
 * DOM check for the hospital guide docx-1023 §10 adds to the end of Elder (02).
 *
 * The block is 12 rows × 4 columns of dictionary text under a download card, so the only
 * thing that can go wrong quietly is the wiring: a cell reading its neighbour's key, a row
 * lost, a header renamed, a link pointing at a file that is not there. The dictionary
 * gates (verify-copy-wiring) see keys, not cells, so this check renders Elder through the
 * same in-repo SSR path the sibling DOM gates use (Vite JS API, virtual entry, `vite
 * build --ssr`) and asserts what only markup shows:
 *
 *   1. `.elder__guide` sits after `.elder__body` — the block closes the section;
 *   2. the four `<th scope="col">` carry `elder.guide.head.*`, in the dictionary's order;
 *   3. the body is exactly 12 rows of 4 cells, and every cell is its own dictionary entry
 *      (`elder.guide.rNN.name` / `.checkin` / `.tests` / `.tips`), under that entry's lang;
 *   4. the download card's link ends at `media/shanghai-hospitals.xlsx`, opens a new tab
 *      (`target="_blank"`) and keeps `noopener` in its rel;
 *   5. the table sits in a keyboard-reachable region: `role="region"`, `tabindex="0"`,
 *      `aria-labelledby` naming an element that exists;
 *   6. the same render in zh-Hans puts the twelve Chinese hospital names in the first
 *      column. The language is a module constant resolved at import time, so the second
 *      mode arrives through a build-time rewrite of `DEFAULT_LANG` (the technique
 *      tools/verify-lang-purity.mjs uses); a rewrite that misses fails the run instead of
 *      checking the en markup twice.
 *
 * Usage: node tools/verify-elder-guide.mjs   (exit 0 = pass, 1 = any failed assertion)
 *
 * Temporary output: /tmp/elder-guide-ssr-out-{en,zh-Hans} (rebuilt each run) +
 * /tmp/elder-guide-ssr-{en,zh-Hans}.html.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "vite";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const OUT_PREFIX = "/tmp/elder-guide-ssr-out";
const ELDER = join(REPO, "src", "sections", "Elder", "Elder.tsx");
const LANG_MODULE = join(REPO, "src", "i18n", "lang.ts");

/** The contract's table shape: four columns, twelve hospitals, keys literal per cell. */
const COLUMNS = ["name", "checkin", "tests", "tips"];
const HEADS = ["hospital", "checkin", "tests", "tips"];
const ROW_IDS = Array.from({ length: 12 }, (_, index) => `r${String(index + 1).padStart(2, "0")}`);
const ROW_KEYS = ROW_IDS.flatMap((row) => COLUMNS.map((column) => `elder.guide.${row}.${column}`));
const HEAD_KEYS = HEADS.map((head) => `elder.guide.head.${head}`);
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

/** Elder's markup in one page language; `mode` is a Lang, as <html lang> spells it. */
async function render(mode) {
  const entryId = `\0virtual:elder-guide-${mode}`;
  const outDir = `${OUT_PREFIX}-${mode}`;
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
        name: "elder-guide-entry",
        resolveId: (id) => (id === entryId ? entryId : null),
        load: (id) => (id === entryId ? entrySource : null),
        transform(code, id) {
          if (mode !== "zh-Hans" || id !== LANG_MODULE) {
            return null;
          }
          const patched = code.replace(/(DEFAULT_LANG\s*:?\s*(?:Lang)?\s*=\s*)"en"/, '$1"zh-Hans"');
          if (patched === code) {
            throw new Error(`elder-guide: DEFAULT_LANG patch did not apply to ${id}`);
          }
          return patched;
        },
      },
    ],
  });
  /* The shared i18n module writes the page language onto document.documentElement at
     import time; the renderer provides that one property, as the sibling gates do. */
  globalThis.document = { documentElement: {} };
  const module = await import(pathToFileURL(join(outDir, "entry.js")).href);
  return module.html;
}

const en = JSON.parse(readFileSync(join(REPO, "docs", "copy-en.json"), "utf8"));
const zh = JSON.parse(readFileSync(join(REPO, "docs", "copy-zh.json"), "utf8"));

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

/** Attributes of one `attrs` string, as plain objects. */
function attrsIn(source) {
  const attrs = {};
  for (const match of source.matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
    attrs[match[1]] = decode(match[2]);
  }
  return attrs;
}

/** Every `<tag …>` in a markup slice, as plain attribute objects. */
function tagsOf(markup, name) {
  return [...markup.matchAll(new RegExp(`<${name}\\b([^>]*)>`, "g"))].map((match) => attrsIn(match[1]));
}

/** The cells of every `<tr>` in a markup slice: one array of { attrs, text } per row. */
function rowsOf(markup, cell) {
  return [...markup.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((row) =>
    [...row[1].matchAll(new RegExp(`<${cell}\\b([^>]*)>([\\s\\S]*?)</${cell}>`, "g"))].map((match) => ({
      attrs: attrsIn(match[1]),
      text: textOf(match[2]),
    })),
  );
}

/** The markup between two markers, or null when either is missing. */
function between(markup, open, close) {
  const start = markup.indexOf(open);
  const end = markup.indexOf(close, start + open.length);
  return start < 0 || end < 0 ? null : markup.slice(start + open.length, end);
}

/** Visible text of the first `<tag>` whose attributes carry `needle`, or null. */
function textUnder(markup, tag, needle) {
  for (const match of markup.matchAll(new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)</${tag}>`, "g"))) {
    if (decode(match[1]).includes(needle)) {
      return textOf(match[2]);
    }
  }
  return null;
}

/* ---------- 1. the block closes the section ---------- */

const html = await render("en");
writeFileSync("/tmp/elder-guide-ssr-en.html", html);

const bodyAt = html.indexOf('class="elder__body"');
const guideAt = html.indexOf('class="elder__guide"');
check(
  "order: .elder__guide follows .elder__body and both render",
  bodyAt >= 0 && guideAt >= 0 && guideAt > bodyAt
    ? null
    : `.elder__body at ${bodyAt}, .elder__guide at ${guideAt}; the guide must be the section's last block`,
);

/* ---------- 2. the four column names ---------- */

const thead = between(html, "<thead>", "</thead>");
const heads = thead === null ? [] : tagsOf(thead, "th");
for (const [index, key] of HEAD_KEYS.entries()) {
  const head = heads[index];
  if (head === undefined) {
    check(`head ${index + 1}/4 (${key})`, "the header row has no such <th>");
  } else if (head.scope !== "col") {
    check(`head ${index + 1}/4 (${key})`, `<th> scope=${JSON.stringify(head.scope)}, expected "col"`);
  } else {
    const rendered = textOf((thead.match(/<th\b[^>]*>([\s\S]*?)<\/th>/g) ?? [])[index] ?? "");
    check(
      `head ${index + 1}/4 (${key})`,
      rendered === en[key].text ? null : `${JSON.stringify(rendered)} != ${JSON.stringify(en[key].text)}`,
    );
  }
}
check(
  "head: exactly 4 <th scope=\"col\">",
  heads.length === 4 ? null : `${heads.length} <th> in <thead>, expected ${HEADS.length}`,
);

/* ---------- 3. twelve rows of four dictionary cells ---------- */

const tbody = between(html, "<tbody>", "</tbody>");
const rows = tbody === null ? [] : rowsOf(tbody, "td");
check(
  "tbody: exactly 12 rows",
  rows.length === ROW_IDS.length ? null : `${rows.length} row(s) in <tbody>, expected ${ROW_IDS.length}`,
);

for (const [rowIndex, rowId] of ROW_IDS.entries()) {
  const row = rows[rowIndex];
  if (row === undefined) {
    check(`row ${rowId}`, "the row is missing from <tbody>");
    continue;
  }
  let wrongCells = 0;
  const problems = [];
  for (const [colIndex, column] of COLUMNS.entries()) {
    const key = `elder.guide.${rowId}.${column}`;
    const cell = row[colIndex];
    if (cell === undefined) {
      problems.push(`col ${column} (${key}) is missing`);
      wrongCells += 1;
      continue;
    }
    if (cell.text !== en[key].text) {
      problems.push(`col ${column} (${key}) = ${JSON.stringify(cell.text)} != ${JSON.stringify(en[key].text)}`);
      wrongCells += 1;
    }
    if (cell.attrs.lang !== en[key].lang) {
      problems.push(`col ${column} (${key}) lang=${JSON.stringify(cell.attrs.lang)}, expected ${JSON.stringify(en[key].lang)}`);
      wrongCells += 1;
    }
  }
  if (row.length !== COLUMNS.length) {
    problems.push(`${row.length} cell(s), expected ${COLUMNS.length}`);
    wrongCells += 1;
  }
  check(`row ${rowId}: 4 cells are elder.guide.${rowId}.* in en`, wrongCells === 0 ? null : problems.join("; "));
}

/* ---------- 4. the download card ---------- */

const links = tagsOf(html, "a");
const link = links.find((candidate) => candidate.href?.endsWith("media/shanghai-hospitals.xlsx"));
check(
  "download: an <a> points at media/shanghai-hospitals.xlsx",
  link === undefined ? `no <a> ends at ${DOWNLOAD}; found ${JSON.stringify(links.map((a) => a.href))}` : null,
);
if (link !== undefined) {
  check(
    "download: href is ./media/shanghai-hospitals.xlsx",
    link.href === DOWNLOAD ? null : `href ${JSON.stringify(link.href)} != ${JSON.stringify(DOWNLOAD)}`,
  );
  check(
    "download: opens in a new tab",
    link.target === "_blank" ? null : `target=${JSON.stringify(link.target)}, expected "_blank"`,
  );
  check(
    "download: rel keeps noopener",
    (link.rel ?? "").split(/\s+/).includes("noopener")
      ? null
      : `rel=${JSON.stringify(link.rel)}, expected it to carry noopener`,
  );
  const linkText = textUnder(html, "a", DOWNLOAD);
  check(
    "download: the label is elder.guide.download",
    linkText === en["elder.guide.download"].text
      ? null
      : `${JSON.stringify(linkText)} != ${JSON.stringify(en["elder.guide.download"].text)}`,
  );
  const metaText = textUnder(html, "p", 'class="elder__meta"');
  check(
    "download: the card carries elder.guide.meta",
    metaText === en["elder.guide.meta"].text
      ? null
      : `${JSON.stringify(metaText)} != ${JSON.stringify(en["elder.guide.meta"].text)}`,
  );
}

/* ---------- 5. the scroll region ---------- */

const scroll = tagsOf(html, "div").find((candidate) => candidate.class?.split(/\s+/).includes("elder__guideScroll"));
check(
  "region: div.elder__guideScroll exists",
  scroll === undefined ? "no <div class=\"elder__guideScroll\"> in the guide block" : null,
);
if (scroll !== undefined) {
  check(
    "region: role=\"region\"",
    scroll.role === "region" ? null : `role=${JSON.stringify(scroll.role)}, expected "region"`,
  );
  check(
    "region: tabindex=\"0\" (keyboard-reachable scroll)",
    scroll.tabindex === "0" ? null : `tabindex=${JSON.stringify(scroll.tabindex)}, expected "0"`,
  );
  const labelledBy = scroll["aria-labelledby"];
  const named = labelledBy !== undefined && html.includes(`id="${labelledBy}"`);
  check(
    "region: aria-labelledby names an element in the block",
    named ? null : `aria-labelledby=${JSON.stringify(labelledBy)} names no id in the render`,
  );
}

/* ---------- 6. the same table in zh-Hans ---------- */

const zhHtml = await render("zh-Hans");
writeFileSync("/tmp/elder-guide-ssr-zh-Hans.html", zhHtml);
const zhTbody = between(zhHtml, "<tbody>", "</tbody>");
const zhRows = zhTbody === null ? [] : rowsOf(zhTbody, "td");
check(
  "zh: exactly 12 rows",
  zhRows.length === ROW_IDS.length ? null : `${zhRows.length} row(s) in <tbody>, expected ${ROW_IDS.length}`,
);
for (const [rowIndex, rowId] of ROW_IDS.entries()) {
  const key = `elder.guide.${rowId}.name`;
  const first = zhRows[rowIndex]?.[0];
  if (first === undefined) {
    check(`zh row ${rowId} first column (${key})`, "the row is missing from the zh-Hans render");
  } else {
    check(
      `zh row ${rowId} first column (${key})`,
      first.text === zh[key].text
        ? null
        : `${JSON.stringify(first.text)} != ${JSON.stringify(zh[key].text)}`,
    );
  }
}

/* ---------- report ---------- */

const table = ROW_KEYS.length;
if (failures.length > 0) {
  console.error(`FAIL: ${failures.length} elder guide problem(s)`);
  process.exit(1);
}
console.log(
  `PASS: elder guide after the body, ${HEADS.length} header cells and ${ROW_IDS.length} rows × ` +
    `${COLUMNS.length} cells (${table} dictionary cells) match en cell by cell, zh-Hans carries the ` +
    `twelve Chinese names, download card → ${DOWNLOAD} (new tab, noopener), scroll region labelled`,
);
