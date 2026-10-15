#!/usr/bin/env node
/*
 * Language-toggle check (lane W6).
 *
 * Renders the whole page in the default mode through the same in-repo SSR path
 * tools/verify-ssr-dom.mjs uses (Vite JS API, virtual entry, `vite build --ssr`), writes
 * the markup to /tmp/lang-toggle-ssr.html, and asserts what only rendered markup can prove:
 *
 *   1. the page opens in zh-Hans: lang.ts writes `<html lang>` (and the tab title taken
 *      from the dictionary) at import time, and index.html carries lang="zh-Hans"
 *   2. Nav › Row › Right holds the toggle then Mail: two focusable button[aria-pressed],
 *      labelled verbatim from `nav.lang.zh` / `nav.lang.en`, with the 1×12 hairline between
 *      them and the pressed side on zh-Hans
 *   3. the 13 frozen key pairs of the label/title layer behave as ui.pen draws them:
 *      a single-node pair has only its zh side in the default mode (the design renders one
 *      variant, so the other arrives by switching); a dual pair has both sides side by side,
 *      because the design shows both at once (element-level `lang` only, BLUEPRINT §6.4)
 *
 * Output: pairs_checked=13 single=<n> dual=<n> missing=<n>, then one line per missing pair.
 *
 * Usage: node tools/verify-lang-toggle.mjs   (exit 0 = pass, 1 = any failed assertion)
 *
 * Temporary output: /tmp/lang-toggle-ssr-out (rebuilt each run) + /tmp/lang-toggle-ssr.html.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "vite";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const OUT_DIR = "/tmp/lang-toggle-ssr-out";
const HTML_OUT = "/tmp/lang-toggle-ssr.html";
const ENTRY_ID = "\0virtual:lang-toggle-ssr-entry";
const APP = join(REPO, "src", "App.tsx");

const failures = [];
const fail = (message) => failures.push(message);

/* ---------- build + render ---------- */

const entrySource = `
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { App } from ${JSON.stringify(APP)};

export function renderPage() {
  return renderToStaticMarkup(createElement(App));
}
`;

await build({
  root: REPO,
  logLevel: "warn",
  build: {
    ssr: true,
    outDir: OUT_DIR,
    emptyOutDir: true,
    copyPublicDir: false,
    rollupOptions: { input: ENTRY_ID, output: { entryFileNames: "entry.js" } },
  },
  ssr: { noExternal: true },
  plugins: [
    {
      name: "lang-toggle-ssr-entry",
      resolveId: (id) => (id === ENTRY_ID ? ENTRY_ID : null),
      load: (id) => (id === ENTRY_ID ? entrySource : null),
    },
  ],
});

globalThis.document = { documentElement: {} };
const { renderPage } = await import(pathToFileURL(join(OUT_DIR, "entry.js")).href);
const html = renderPage();
writeFileSync(HTML_OUT, html);

/** Markup text comparisons run on the decoded text: React escapes `&` as `&amp;` etc. */
const decoded = html
  .replace(/&amp;/g, "&")
  .replace(/&quot;/g, '"')
  .replace(/&#x27;/g, "'")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">");

const dict = {
  zh: JSON.parse(readFileSync(join(REPO, "docs", "copy-zh.json"), "utf8")),
  en: JSON.parse(readFileSync(join(REPO, "docs", "copy-en.json"), "utf8")),
};
const text = (key) => dict.zh[key].text;

/* ---------- markup helpers ---------- */

/** Everything from `<section id="…">` to the next section start (all sections carry an id). */
function sectionOf(id) {
  const start = decoded.indexOf(`<section id="${id}"`);
  if (start < 0) {
    return "";
  }
  const next = decoded.indexOf('<section id="', start + 1);
  return decoded.slice(start, next < 0 ? decoded.length : next);
}

const header = decoded.slice(decoded.indexOf("<header id=\"nav\""), decoded.indexOf("</header>"));
const scope = {
  nav: header,
  hero: sectionOf("hero"),
  index: sectionOf("index"),
  scholarly: sectionOf("scholarly"),
  elder: sectionOf("elder"),
  music: sectionOf("music"),
  sport: sectionOf("sport"),
};

/** Attributes of every `<tag …>` in a markup fragment, as plain objects. */
function tagsOf(markup, name) {
  const attributes = [];
  for (const match of markup.matchAll(new RegExp(`<${name}\\b([^>]*)>`, "g"))) {
    const attrs = {};
    for (const attr of match[1].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
      attrs[attr[1]] = attr[2];
    }
    attributes.push(attrs);
  }
  return attributes;
}

/* ---------- 1. the page opens in zh-Hans ---------- */

if (document.documentElement.lang !== "zh-Hans") {
  fail(`<html lang> is ${JSON.stringify(document.documentElement.lang)}, not "zh-Hans"`);
}
if (document.title !== text("hero.h1cn")) {
  fail(
    `document.title is ${JSON.stringify(document.title)}, not the zh-Hans hero title ` +
      `${JSON.stringify(text("hero.h1cn"))}`,
  );
}
const shell = readFileSync(join(REPO, "index.html"), "utf8");
if (!shell.includes('<html lang="zh-Hans">')) {
  fail("index.html does not carry <html lang=\"zh-Hans\"> for the pre-hydration shell");
}

/* ---------- 2. the toggle in Nav › Row › Right ---------- */

const buttons = tagsOf(header, "button");
const toggle = buttons.filter((attrs) => "aria-pressed" in attrs);
if (toggle.length !== 2) {
  fail(`nav toggle button count ${toggle.length} != 2`);
}
const pressed = [...header.matchAll(/<button\b([^>]*)>([^<]*)<\/button>/g)]
  .filter((match) => match[1].includes("aria-pressed"))
  .map((match) => ({ attrs: match[1], label: match[2] }));
const zhOption = pressed.find((button) => button.label === text("nav.lang.zh"));
const enOption = pressed.find((button) => button.label === text("nav.lang.en"));
if (pressed.length !== 2 || zhOption === undefined || enOption === undefined) {
  fail(
    `nav toggle labels ${JSON.stringify(pressed.map((button) => button.label))} are not ` +
      `${JSON.stringify([text("nav.lang.zh"), text("nav.lang.en")])}`,
  );
} else {
  if (!zhOption.attrs.includes('aria-pressed="true"')) {
    fail("nav toggle: the zh-Hans option is not the pressed one in the default mode");
  }
  if (!enOption.attrs.includes('aria-pressed="false"')) {
    fail("nav toggle: the en option is not unpressed in the default mode");
  }
  if (!zhOption.attrs.includes(`type="button"`)) {
    fail("nav toggle: the zh-Hans option is not a button[type=button]");
  }
  /* BLUEPRINT §6.4: the EN label is not the page language, so it carries its own lang. */
  if (zhOption.attrs.includes("lang=")) {
    fail("nav toggle: the zh-Hans label carries lang although it is the page language");
  }
  if (!enOption.attrs.includes('lang="en"')) {
    fail("nav toggle: the en label does not carry lang=\"en\" on the Chinese page");
  }
  const zhAt = header.indexOf(`>${text("nav.lang.zh")}</button>`);
  const divisionAt = header.indexOf("nav__lang-div");
  const enAt = header.indexOf(`>${text("nav.lang.en")}</button>`);
  if (!(zhAt < divisionAt && divisionAt < enAt)) {
    fail("nav toggle: the hairline does not sit between 中 and EN");
  }
  const division = tagsOf(header, "span").find((attrs) => attrs.class === "nav__lang-div");
  if (division === undefined || division["aria-hidden"] !== "true") {
    fail("nav toggle: the hairline is not a decorative (aria-hidden) span");
  }
}

/* ---------- 3. the 13 key pairs of the label/title layer ---------- */

/** single = ui.pen draws one variant, so the other arrives by switching; dual = both drawn. */
const PAIRS = [
  { pair: "nav.item1", kind: "single", where: "nav", zh: "nav.item1.zh", en: "nav.item1.en" },
  { pair: "nav.item2", kind: "single", where: "nav", zh: "nav.item2.zh", en: "nav.item2.en" },
  { pair: "nav.item3", kind: "single", where: "nav", zh: "nav.item3.zh", en: "nav.item3.en" },
  { pair: "nav.item4", kind: "single", where: "nav", zh: "nav.item4.zh", en: "nav.item4.en" },
  { pair: "hero.h1", kind: "dual", where: "hero", zh: "hero.h1cn", en: "hero.h1" },
  { pair: "index.row1.title", kind: "dual", where: "index", zh: "index.row1.title", en: "index.row1.titleEn" },
  { pair: "index.row2.title", kind: "dual", where: "index", zh: "index.row2.title", en: "index.row2.titleEn" },
  { pair: "index.row3.title", kind: "dual", where: "index", zh: "index.row3.title", en: "index.row3.titleEn" },
  { pair: "scholarly.title", kind: "dual", where: "scholarly", zh: "scholarly.title.zh", en: "scholarly.title.en" },
  { pair: "elder.title", kind: "dual", where: "elder", zh: "elder.title.zh", en: "elder.title.en" },
  { pair: "music.title", kind: "dual", where: "music", zh: "music.title", en: "music.titleEn" },
  { pair: "sport.title", kind: "dual", where: "sport", zh: "sport.title", en: "sport.titleEn" },
  {
    pair: "scholarly-igem.cta",
    kind: "dual",
    where: "scholarly",
    zh: "scholarly-igem.cta.zh",
    en: "scholarly-igem.cta.en",
  },
];

let single = 0;
let dual = 0;
let missing = 0;

for (const { pair, kind, where, zh, en } of PAIRS) {
  const markup = scope[where];
  if (kind === "single") {
    single += 1;
  } else {
    dual += 1;
  }
  const hasZh = markup.includes(text(zh));
  const hasEn = markup.includes(text(en));
  if (kind === "single" ? !hasZh || hasEn : !hasZh || !hasEn) {
    missing += 1;
    fail(
      `${pair} (${kind}): ${where} markup has zh=${hasZh} en=${hasEn} — ` +
        `expected ${kind === "single" ? "only zh" : "both"} ` +
        `[${JSON.stringify(text(zh))} / ${JSON.stringify(text(en))}]`,
    );
  }
}

console.log(
  `pairs_checked=${PAIRS.length} single=${single} dual=${dual} missing=${missing}`,
);

/* ---------- report ---------- */

if (failures.length > 0) {
  console.error(`FAIL: ${failures.length} language-toggle problem(s); markup in ${HTML_OUT}`);
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `PASS: default mode zh-Hans (${html.length} B, ${HTML_OUT}) — html lang=zh-Hans, ` +
    `title=${JSON.stringify(document.title)}, ${pressed.length} toggle buttons pressed on zh-Hans ` +
    "with the 1×12 hairline between them, all 13 pairs as the design draws them",
);
