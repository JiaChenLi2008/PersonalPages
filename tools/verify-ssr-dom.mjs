#!/usr/bin/env node
/*
 * SSR DOM check for the `scholarly` section (lane S3).
 *
 * Builds an in-repo SSR entry with `vite build --ssr` (through Vite's JS API so the
 * entry can stay virtual and `vite` keeps owning module resolution from the project
 * root), renders the section with react-dom/server, writes the markup to
 * /tmp/scholarly-ssr.html, and asserts what only rendered markup can prove:
 *
 *   1. no h1 and exactly one h2 (the page's single h1 is Hero's, BLUEPRINT §6.1);
 *      h3 = the four sub-blocks, h4 = the two iGEM sections
 *   2. all nine reveal triggers are <button aria-expanded="false" aria-controls="…">,
 *      each aria-controls names an existing panel id, that panel is a role="region"
 *      in the DOM, hidden, labelled by its trigger, and never aria-hidden
 *   3. the iGEM CTA is a real link to the project site, opened in a new tab with
 *      rel="noopener noreferrer"
 *   4. the HIR card links to the copied essay PDF
 *   5. the default product is the en page: the section carries its own language only —
 *      no CJK character, and every lang mark is "en" (BLUEPRINT §6.4: one language per
 *      page, element-level lang only for text in another language) — while the three real
 *      photos carry their answer text as alt plus loading/decoding/width/height (§6.3)
 *   6. no ※ design annotation and no hex colour reaches the markup
 *   7. every aria-label whose text is a dictionary entry declares that entry's own
 *      language: a screen reader must not read the English JHU riddles as Chinese
 *      (BLUEPRINT §6.4)
 *
 * Usage: node tools/verify-ssr-dom.mjs   (exit 0 = pass, 1 = any failed assertion)
 *
 * Temporary output: /tmp/scholarly-ssr-out (rebuilt each run) + /tmp/scholarly-ssr.html.
 * The shared i18n module writes document.documentElement.lang at import time, so the
 * renderer provides that one property — it is not an implementation hook.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { build } from "vite";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const OUT_DIR = "/tmp/scholarly-ssr-out";
const HTML_OUT = "/tmp/scholarly-ssr.html";
const ENTRY_ID = "\0virtual:scholarly-ssr-entry";
const SECTION = join(REPO, "src", "sections", "Scholarly", "Scholarly.tsx");
const I18N = join(REPO, "src", "i18n", "index.tsx");

const failures = [];
const fail = (message) => failures.push(message);

/* The shared i18n module writes the page language onto document.documentElement at import
   time, so the renderer provides that one property and keeps the object it writes to —
   it is not an implementation hook, and assertion 7 reads the language from it. */
const documentElement = {};

/* ---------- build + render ---------- */

const entrySource = `
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Scholarly } from ${JSON.stringify(SECTION)};
import { LocaleProvider } from ${JSON.stringify(I18N)};

export function renderScholarly() {
  return renderToStaticMarkup(createElement(LocaleProvider, null, createElement(Scholarly)));
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
      name: "scholarly-ssr-entry",
      resolveId: (id) => (id === ENTRY_ID ? ENTRY_ID : null),
      load: (id) => (id === ENTRY_ID ? entrySource : null),
    },
  ],
});

globalThis.document = { documentElement };
const { renderScholarly } = await import(pathToFileURL(join(OUT_DIR, "entry.js")).href);
const html = renderScholarly();
writeFileSync(HTML_OUT, html);

/* ---------- markup helpers ---------- */

/** Attributes of every `<tag …>` in the markup, as plain objects. */
function tagsOf(name) {
  const attributes = [];
  for (const match of html.matchAll(new RegExp(`<${name}\\b([^>]*)>`, "g"))) {
    const attrs = {};
    for (const attr of match[1].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
      attrs[attr[1]] = attr[2];
    }
    attributes.push(attrs);
  }
  return attributes;
}

const count = (name) => [...html.matchAll(new RegExp(`<${name}\\b`, "g"))].length;

const en = JSON.parse(readFileSync(join(REPO, "docs", "copy-en.json"), "utf8"));
const zh = JSON.parse(readFileSync(join(REPO, "docs", "copy-zh.json"), "utf8"));

/* ---------- 1. heading ladder ---------- */

if (count("h1") !== 0) {
  fail(`h1 count ${count("h1")} != 0: the page's only h1 belongs to Hero (BLUEPRINT §6.1)`);
}
if (count("h2") !== 1) {
  fail(`h2 count ${count("h2")} != 1: the section heading is the only h2`);
}
if (count("h3") !== 4) {
  fail(`h3 count ${count("h3")} != 4: one per sub-block (01.1–01.4)`);
}
if (count("h4") !== 2) {
  fail(`h4 count ${count("h4")} != 2: Lab contribution / Paris Conference`);
}
const h2 = tagsOf("h2")[0] ?? {};
if (h2.id !== "scholarly-title") {
  fail(`h2 id ${JSON.stringify(h2.id)} != "scholarly-title" (aria-labelledby target)`);
}
if (h2.lang !== "en") {
  fail(`h2 lang ${JSON.stringify(h2.lang)} != "en" (the section title is written in the page's language)`);
}
const h2Text = en["scholarly.title.en"].text;
if (!html.includes(`>${h2Text}</h2>`)) {
  fail(`the h2 does not render scholarly.title.en verbatim (${JSON.stringify(h2Text)})`);
}

/* ---------- 2. reveal triggers and their panels ---------- */

const buttons = tagsOf("button");
const triggers = buttons.filter((attrs) => "aria-controls" in attrs);
if (triggers.length !== 9) {
  fail(`reveal trigger count ${triggers.length} != 9 (three per question block)`);
}
const panelIds = new Set(tagsOf("div").map((attrs) => attrs.id).filter(Boolean));
const triggerIds = new Set(triggers.map((attrs) => attrs.id));

for (const trigger of triggers) {
  const id = trigger.id;
  if (trigger["aria-expanded"] !== "false") {
    fail(`trigger ${id}: aria-expanded=${JSON.stringify(trigger["aria-expanded"])} != "false" initially`);
  }
  if (!panelIds.has(trigger["aria-controls"])) {
    fail(`trigger ${id}: aria-controls=${JSON.stringify(trigger["aria-controls"])} has no panel with that id`);
  }
}
if (triggers.some((trigger) => trigger["aria-expanded"] === "true")) {
  fail("a trigger renders aria-expanded=\"true\" before any interaction");
}

const panels = tagsOf("div").filter((attrs) => attrs.role === "region");
if (panels.length !== 9) {
  fail(`answer panel count ${panels.length} != 9`);
}
for (const panel of panels) {
  const id = panel.id;
  if (!("hidden" in panel)) {
    fail(`panel ${id}: answers must start hidden`);
  }
  if (panel["aria-hidden"] !== undefined) {
    fail(`panel ${id}: aria-hidden must stay off so the answer is reachable once revealed`);
  }
  if (!triggerIds.has(panel["aria-labelledby"])) {
    fail(`panel ${id}: aria-labelledby=${JSON.stringify(panel["aria-labelledby"])} is not a reveal trigger`);
  }
}
const allIds = [...html.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
if (new Set(allIds).size !== allIds.length) {
  fail("duplicate id in the section markup");
}

/* ---------- 3./4. real links ---------- */

const IGEM_URL = "https://2025.igem.wiki/subcat-shanghai/";
const links = tagsOf("a");
const cta = links.find((attrs) => attrs.href === IGEM_URL);
if (cta === undefined) {
  fail(`no <a href="${IGEM_URL}">: the iGEM CTA must be a real link`);
} else {
  if (cta.target !== "_blank") {
    fail(`iGEM CTA target=${JSON.stringify(cta.target)} != "_blank"`);
  }
  const rel = (cta.rel ?? "").split(/\s+/);
  if (!rel.includes("noopener") || !rel.includes("noreferrer")) {
    fail(`iGEM CTA rel=${JSON.stringify(cta.rel)} lacks noopener/noreferrer for target="_blank"`);
  }
}

const pdf = links.find((attrs) => (attrs.href ?? "").endsWith("media/hir-essay.pdf"));
if (pdf === undefined) {
  fail('no <a href="…/media/hir-essay.pdf">: the HIR card must link to the copied essay');
}

/* ---------- 5. language and photo attributes ---------- */

/* The default product is the en page (lang.ts DEFAULT_LANG), so the section renders one
   language: its own. Both halves of the old "both languages coexist" criterion are kept
   at the same strength — the other language must not appear at all, and the text that does
   appear must be the en dictionary's (§7 checks the accessible names the same way). */
if (documentElement.lang !== "en") {
  fail(`lang.ts wrote <html lang>=${JSON.stringify(documentElement.lang)} at import time, expected "en"`);
}
const cjk = html.match(/[\u2e80-\u2eff\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\ufe30-\ufe4f\uff00-\uffef]/gu) ?? [];
if (cjk.length > 0) {
  fail(`the en section renders ${cjk.length} CJK character(s): ${JSON.stringify([...new Set(cjk)].join(""))}`);
}
const langAttrs = [...new Set([...html.matchAll(/lang="([^"]+)"/g)].map((match) => match[1]))].sort();
if (JSON.stringify(langAttrs) !== JSON.stringify(["en"])) {
  fail(
    `lang attributes ${JSON.stringify(langAttrs)} != ["en"]: every marked string is in the page's language`,
  );
}

const photos = tagsOf("img");
if (photos.length !== 3) {
  fail(`img count ${photos.length} != 3: the JHU puzzles use the three real dissection photos`);
}
const answers = ["scholarly-jhu.a1", "scholarly-jhu.a2", "scholarly-jhu.a3"].map((key) => en[key].text);
if (JSON.stringify(photos.map((photo) => photo.alt).slice().sort()) !== JSON.stringify(answers.slice().sort())) {
  fail(`img alt texts ${JSON.stringify(photos.map((photo) => photo.alt))} != the three answer texts`);
}
for (const photo of photos) {
  if (photo.loading !== "lazy" || photo.decoding !== "async") {
    fail(`img ${JSON.stringify(photo.src)}: loading/decoding must be lazy/async`);
  }
  if (!photo.width || !photo.height) {
    fail(`img ${JSON.stringify(photo.src)}: explicit width/height required against layout shift`);
  }
}

/* ---------- 6. annotations and colours ---------- */

if (html.includes("※")) {
  fail("the ※ design annotation is rendered (BLUEPRINT §6.4 / CHROME.md §2)");
}
if (/#[0-9a-fA-F]{3,8}\b/.test(html)) {
  fail("a hex colour leaked into the markup");
}

/* ---------- 7. dictionary-sourced accessible names ---------- */

/* Every visible string the dictionaries carry, mapped to the language of its entry (the
   two dictionaries hold the same text for fallback entries, so the set can hold two). */
const langsOfText = new Map();
for (const dictionary of [en, zh]) {
  for (const entry of Object.values(dictionary)) {
    if (!langsOfText.has(entry.text)) {
      langsOfText.set(entry.text, new Set());
    }
    langsOfText.get(entry.text).add(entry.lang);
  }
}

/** Every element of the markup that carries an accessible name, with its attributes. */
const labelled = [];
for (const match of html.matchAll(/<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g)) {
  if (!match[2].includes("aria-label=")) {
    continue;
  }
  const attrs = {};
  for (const attr of match[2].matchAll(/([a-zA-Z-]+)="([^"]*)"/g)) {
    attrs[attr[1]] = attr[2];
  }
  labelled.push({ selector: attrs.id ? `#${attrs.id}` : `<${match[1]}>`, attrs });
}

/* The i18n module wrote the page language onto the stubbed documentElement at import time. */
const named = labelled.filter((element) => langsOfText.has(element.attrs["aria-label"]));
for (const element of named) {
  const expected = [...langsOfText.get(element.attrs["aria-label"])];
  const actual = element.attrs.lang ?? documentElement.lang;
  if (!expected.includes(actual)) {
    fail(
      `${element.selector}: aria-label ${JSON.stringify(element.attrs["aria-label"])} ` +
        `expects lang ${expected.join("/")}, got ${JSON.stringify(actual)}`,
    );
  }
}
for (const id of ["scholarly-jhu-q1", "scholarly-jhu-q2", "scholarly-jhu-q3"]) {
  if (!named.some((element) => element.attrs.id === id)) {
    fail(`#${id}: no dictionary-sourced aria-label to check`);
  }
}

/* ---------- chrome texts and sub-block order ---------- */

const texts = [
  "scholarly.revealTap",
  "scholarly.revealSwipe",
  "scholarly.imagePending",
  "scholarly.meta",
  "scholarly.linkPdf",
];
for (const key of texts) {
  if (!html.includes(en[key].text)) {
    fail(`chrome text missing from the markup: ${key}`);
  }
}
let cursor = -1;
for (const key of ["scholarly-igem.no", "scholarly-jhu.no", "scholarly-immuno.no", "scholarly-hir.no"]) {
  const at = html.indexOf(`>${en[key].text}</p>`);
  if (at < 0) {
    fail(`sub-block number ${en[key].text} not rendered`);
  } else if (at < cursor) {
    fail(`sub-block ${key} is out of the frozen order iGEM → JHU → Immunotherapy → HIR`);
  } else {
    cursor = at;
  }
}

/* ---------- report ---------- */

if (failures.length > 0) {
  console.error(`FAIL: ${failures.length} SSR DOM problem(s); markup in ${HTML_OUT}`);
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(
  `PASS: SSR markup (${html.length} B, ${HTML_OUT}) — h2=1 h3=4 h4=2 h1=0, ` +
    `${triggers.length} reveal triggers all collapsed with a live panel id, ` +
    `${panels.length} hidden regions, ${photos.length} lazy photos, ` +
    `en only (no CJK, lang=["en"])`,
);
console.log(
  `PASS: ${named.length} dictionary-sourced aria-label(s) carry their entry's language ` +
    `(${[...new Set(named.map((element) => element.selector))].join(", ")})`,
);
