#!/usr/bin/env node
/*
 * Copy-wiring check.
 *
 * A section may only show text that the frozen dictionaries carry. This check
 * collects every key written as a literal text("...") call under src/, then
 * asserts that
 *   1. the key exists in both docs/copy-en.json and docs/copy-zh.json, and
 *   2. that key's en and zh text are both present in the built bundle
 *      (dist/assets/*.js), i.e. the wiring survives bundling.
 *
 * Usage: npm run build && node tools/verify-copy-wiring.mjs
 *        (exit 0 = wired, exit 1 = a key is missing or was never bundled)
 * The script never builds for you: a missing dist/ is reported as a failure.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
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

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(path);
    }
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

function referencedKeys() {
  const keys = new Set();
  for (const file of sourceFiles(SRC_DIR)) {
    for (const match of readFileSync(file, "utf8").matchAll(TEXT_CALL)) {
      keys.add(match[1]);
    }
  }
  return [...keys].sort();
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

const keys = referencedKeys();
const en = JSON.parse(readFileSync(DICTIONARIES.en, "utf8"));
const zh = JSON.parse(readFileSync(DICTIONARIES.zh, "utf8"));

const missingKeys = keys.filter((key) => !(key in en) || !(key in zh));

const bundle = bundleText();
// esbuild may write non-ASCII as \uXXXX escapes; search the decoded text too.
const decoded = bundle.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) =>
  String.fromCharCode(parseInt(hex, 16)),
);
const packed = (text) => bundle.includes(text) || decoded.includes(text);

const wired = keys.filter((key) => key in en && key in zh);
const foundEn = wired.filter((key) => packed(en[key].text));
const foundZh = wired.filter((key) => packed(zh[key].text));

console.log(`referenced=${keys.length} found_en=${foundEn.length} found_zh=${foundZh.length}`);

for (const key of missingKeys) {
  console.error(`missing from dictionary: ${key}`);
}
for (const key of wired.filter((key) => !foundEn.includes(key))) {
  console.error(`en text not in dist/assets/*.js: ${key}`);
}
for (const key of wired.filter((key) => !foundZh.includes(key))) {
  console.error(`zh text not in dist/assets/*.js: ${key}`);
}

const failed =
  missingKeys.length > 0 || foundEn.length < wired.length || foundZh.length < wired.length;
process.exit(failed ? 1 : 0);
