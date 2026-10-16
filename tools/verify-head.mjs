#!/usr/bin/env node
/*
 * Document-head gate: index.html's static head must carry the frozen copy, not a
 * paraphrase of it.
 *
 * The head is the one place that is not rendered from the dictionary, so it drifts
 * silently — a reworded <title> still looks fine in a browser. Asserted:
 *
 *   1. <title>          = hero.h1, newlines normalised to spaces (docs/CHROME.md, BLUEPRINT §5)
 *   2. og:title         = the same string
 *   3. description      = hero.summary, verbatim
 *   4. og:description   = the same string
 *   5. theme-color      = --c-paper from src/styles/tokens.css (the page's base colour)
 *   6. <html lang>      = zh-Hans, the mode the frozen design is written in (lang.ts DEFAULT_LANG)
 *
 * Whitespace is folded (runs → one space, ends trimmed) before comparison, so the
 * dictionary's `LIFE,\nIN FOCUS.` may be written on one line here.
 *
 * Usage: node tools/verify-head.mjs   (exit 0 = in sync, 1 = drift)
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const REPO = fileURLToPath(new URL("..", import.meta.url));
const INDEX_PATH = REPO + "index.html";
const ZH_DICTIONARY = REPO + "docs/copy-zh.json";
const TOKENS_PATH = REPO + "src/styles/tokens.css";

/** docs/CHROME.md comparison rule: only case and whitespace are folded. */
const fold = (text) => text.replace(/\s+/g, " ").trim();

const html = readFileSync(INDEX_PATH, "utf8");
const dictionary = JSON.parse(readFileSync(ZH_DICTIONARY, "utf8"));
const tokens = readFileSync(TOKENS_PATH, "utf8");

const attr = (pattern) => (html.match(pattern) || [])[1];
const meta = (name) => attr(new RegExp(`<meta[^>]*(?:name|property)="${name}"[^>]*content="([^"]*)"`));

const title = fold(dictionary["hero.h1"].text);
const summary = fold(dictionary["hero.summary"].text);
const paper = fold((tokens.match(/--c-paper:\s*([^;]+);/) || [])[1] || "");

const checks = [
  ["<title>", fold(attr(/<title>([\s\S]*?)<\/title>/) ?? ""), title],
  ["og:title", fold(meta("og:title") ?? ""), title],
  ["description", fold(meta("description") ?? ""), summary],
  ["og:description", fold(meta("og:description") ?? ""), summary],
  ["theme-color", fold(meta("theme-color") ?? "").toUpperCase(), paper.toUpperCase()],
  ["<html lang>", attr(/<html[^>]*\slang="([^"]*)"/) ?? "", "zh-Hans"],
];

const mismatches = checks.filter(([, got, want]) => got !== want);
console.log(`checked=${checks.length} mismatches=${mismatches.length}`);
for (const [what, got, want] of mismatches) {
  console.log(` - ${what}: got ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
}
process.exit(mismatches.length ? 1 : 0);
