#!/usr/bin/env node
/*
 * Copy-wiring check.
 *
 * A section may only show text that the frozen dictionaries carry. This check
 * collects the dictionary keys the source reaches through either of two shapes:
 *
 *   1. a literal call, text("index.head.eyebrow") — the shape S1/S3/S4 use;
 *   2. a key literal stored in a table and passed on as a variable, e.g.
 *      { no: "index.row1.no" } with copy.text(row.no) — the shape S2 uses.
 *
 * Reading only shape 1 let the S2 keys pass unnoticed, so shape 2 collects every
 * key-shaped string literal under src/ and both sets are unioned. A literal that
 * looks like a key but is not in the dictionary is reported too, whichever shape
 * it arrived by, so a typo cannot drop out of the check silently.
 *
 * For every key in the union it then asserts that
 *   1. the key exists in both docs/copy-en.json and docs/copy-zh.json,
 *   2. that key's en and zh text are both present in the built bundle
 *      (dist/assets/*.js), i.e. the wiring survives bundling, and
 *   3. src/ still reaches at least MIN_REFERENCED keys, at least MIN_LITERAL_CALLS of
 *      them through a literal text("...") call, and every dictionary key src/ reaches
 *      nowhere is one of the dead keys docs/CHROME.md §4 registers.
 *
 * What 2 proves is narrower than its label suggests. src/i18n/copy.ts does
 * `import en from "../../docs/copy-en.json"`, so the whole dictionary is in the
 * bundle whether or not a component renders its text: finding a text in dist/ proves
 * the key is still reached by a literal and stays bundled, not that an element
 * renders it. Rendered elements are the business of tools/verify-ssr-dom.mjs and
 * the tools/fidelity-*.mjs suites. Nor can this check see a key assembled at run
 * time (`text("nav.item" + n + ".zh")`) or a key that src/ dropped together with
 * its call site — 3's floor is what catches the latter.
 *
 * Output: referenced=<n> found_en=<n> found_zh=<n> via_literal_call=<n> via_key_literal=<n>
 *   via_literal_call counts the keys shape 1 reaches; via_key_literal counts the
 *   keys only shape 2 reaches, i.e. the blind spot this check used to miss; the
 *   two add up to referenced.
 *   A second line `unreferenced=<n> of <total> dictionary keys ...` lists the keys no
 *   literal reaches, marking each one not registered in docs/CHROME.md §4 as
 *   [NOT REGISTERED]; a registered dead key is reported, an unregistered one fails.
 *
 * Usage: npm run build && node tools/verify-copy-wiring.mjs
 *        (exit 0 = wired, exit 1 = a key is missing, was never bundled, fell out of
 *         src/ without a docs/CHROME.md §4 entry, or a reached-key/text-call count
 *         dropped below its floor)
 * The script never builds for you: a missing dist/ is reported as a failure.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const SRC_DIR = join(ROOT, "src");
const DIST_ASSETS = join(ROOT, "dist", "assets");
const DICTIONARIES = {
  en: join(ROOT, "docs", "copy-en.json"),
  zh: join(ROOT, "docs", "copy-zh.json"),
};

/* Floor under `referenced`, i.e. the number of keys src/ reached when it was last
   raised. After a text() call is deleted the bundle still carries every dictionary
   string (see the note above), so this count is the only trace such a deletion
   leaves here. Raise it in the same commit that intentionally stops reaching keys;
   never lower it to turn a red run green. */
const MIN_REFERENCED = 127;

/* Floor under `via_literal_call`. A call replaced by null (`{text("k")}` -> `null`)
   keeps `referenced` whole whenever a sibling `langOf("k")` still spells the key, so
   the count of keys a text() call actually names is the one that moves. Same rule:
   raise it in the commit that drops a call on purpose. */
const MIN_LITERAL_CALLS = 77;

/* Dictionary keys no literal under src/ reaches. Each is dead by design and carries
   its own justification in docs/CHROME.md §4; an unreferenced key that is not on
   this list is a broken wiring, so it fails the run instead of passing silently. */
const UNREFERENCED = [
  "scholarly.title.zh",
  "elder.title.zh",
  "music.title",
  "sport.title",
  "scholarly-jhu.hint",
  "scholarly-hir.card.file",
  "elder.body",
];

/** A text("literal-key") call; the lookbehind keeps e.g. context("...") out. */
const TEXT_CALL = /(?<![\w$.])text\(\s*"([^"]+)"\s*\)/g;

/** Any double-quoted literal without escapes; both shapes are written this way. */
const STRING_LITERAL = /"([^"\\\n]*)"/g;

/** copy-en.json keys are lower-case dotted paths, e.g. index.row1.no. */
const KEY_SHAPED = /^[a-z][A-Za-z0-9_-]*(?:\.[A-Za-z_][A-Za-z0-9_-]*)+$/;

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(path);
    }
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

/** Line number of an offset, for the failure messages. */
function lineOf(source, offset) {
  return source.slice(0, offset).split("\n").length;
}

/**
 * Every key literal under src/, by the shape that reached it:
 *   call: a text("...") argument, whatever its spelling;
 *   shaped: any other double-quoted literal that looks like a dictionary key.
 */
function referencedLiterals() {
  const call = new Map();
  const literals = new Map();
  for (const file of sourceFiles(SRC_DIR)) {
    const source = readFileSync(file, "utf8");
    const at = (match) => `${relative(ROOT, file)}:${lineOf(source, match.index)}`;
    for (const match of source.matchAll(TEXT_CALL)) {
      call.set(match[1], at(match));
    }
    for (const match of source.matchAll(STRING_LITERAL)) {
      if (KEY_SHAPED.test(match[1])) {
        literals.set(match[1], at(match));
      }
    }
  }
  /* A key spelled inside a text("...") call is the call shape; only the rest is
     the shape that used to slip through. */
  const shaped = new Map([...literals].filter(([key]) => !call.has(key)));
  return { call, shaped };
}

function bundleText() {
  if (!existsSync(DIST_ASSETS)) {
    console.error("dist/assets/ not found: run `npm run build` first (this check does not build).");
    process.exit(1);
  }
  return readdirSync(DIST_ASSETS)
    .filter((name) => name.endsWith(".js") && statSync(join(DIST_ASSETS, name)).isFile())
    .map((name) => readFileSync(join(DIST_ASSETS, name), "utf8"))
    .join("\n");
}

const { call, shaped } = referencedLiterals();
const en = JSON.parse(readFileSync(DICTIONARIES.en, "utf8"));
const zh = JSON.parse(readFileSync(DICTIONARIES.zh, "utf8"));

const keys = [...new Set([...call.keys(), ...shaped.keys()])].sort();
const known = (key) => key in en && key in zh;
const missing = keys.filter((key) => !known(key));
const wired = keys.filter(known);
const unreferenced = Object.keys(en).filter((key) => !keys.includes(key));
const unregistered = unreferenced.filter((key) => !UNREFERENCED.includes(key));
const belowFloor = keys.length < MIN_REFERENCED;
const belowCallFloor = call.size < MIN_LITERAL_CALLS;

const bundle = bundleText();
// esbuild may write non-ASCII as \uXXXX escapes; search the decoded text too.
const decoded = bundle.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
  String.fromCharCode(parseInt(hex, 16)),
);
const packed = (text) => bundle.includes(text) || decoded.includes(text);

const foundEn = wired.filter((key) => packed(en[key].text));
const foundZh = wired.filter((key) => packed(zh[key].text));

console.log(
  `referenced=${keys.length} found_en=${foundEn.length} found_zh=${foundZh.length} ` +
    `via_literal_call=${call.size} via_key_literal=${shaped.size}`,
);
console.log(
  `unreferenced=${unreferenced.length} of ${Object.keys(en).length} dictionary keys` +
    (unreferenced.length === 0
      ? ""
      : `: ${unreferenced
          .map((key) => (UNREFERENCED.includes(key) ? key : `${key} [NOT REGISTERED]`))
          .join(", ")}`),
);

for (const key of unregistered) {
  console.error(
    `unreferenced key is not registered as dead: ${key} ` +
      "(wire it up in src/, or justify it in docs/CHROME.md §4 and add it to UNREFERENCED)",
  );
}
if (belowFloor) {
  console.error(
    `referenced=${keys.length} is below MIN_REFERENCED=${MIN_REFERENCED}: src/ reaches ` +
      "fewer dictionary keys than it did, so a wiring path was dropped (raise the floor " +
      "only for a deliberate removal)",
  );
}
if (belowCallFloor) {
  console.error(
    `via_literal_call=${call.size} is below MIN_LITERAL_CALLS=${MIN_LITERAL_CALLS} ` +
      `(referenced=${keys.length}, MIN_REFERENCED=${MIN_REFERENCED}): a text("...") call was ` +
      "removed or replaced, so a key nothing renders by name any more (raise the floor only " +
      "for a deliberate removal)",
  );
}

for (const key of missing) {
  const where = call.get(key) ?? shaped.get(key);
  console.error(`missing from dictionary: ${key} (${where})`);
}
for (const key of wired.filter((key) => !foundEn.includes(key))) {
  console.error(`en text not in dist/assets/*.js: ${key}`);
}
for (const key of wired.filter((key) => !foundZh.includes(key))) {
  console.error(`zh text not in dist/assets/*.js: ${key}`);
}

let failed =
  missing.length > 0 || foundEn.length < wired.length || foundZh.length < wired.length;
if (unregistered.length > 0 || belowFloor || belowCallFloor) {
  failed = true;
}
process.exit(failed ? 1 : 0);
