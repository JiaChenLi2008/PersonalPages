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
 *   1. the key exists in both docs/copy-en.json and docs/copy-zh.json, and
 *   2. that key's en and zh text are both present in the built bundle
 *      (dist/assets/*.js), i.e. the wiring survives bundling.
 *
 * Output: referenced=<n> found_en=<n> found_zh=<n> via_literal_call=<n> via_key_literal=<n>
 *   via_literal_call counts the keys shape 1 reaches; via_key_literal counts the
 *   keys only shape 2 reaches, i.e. the blind spot this check used to miss; the
 *   two add up to referenced.
 *
 * Usage: npm run build && node tools/verify-copy-wiring.mjs
 *        (exit 0 = wired, exit 1 = a key is missing or was never bundled)
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

const failed =
  missing.length > 0 || foundEn.length < wired.length || foundZh.length < wired.length;
process.exit(failed ? 1 : 0);
