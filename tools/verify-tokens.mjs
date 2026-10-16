#!/usr/bin/env node
/*
 * Design-token fidelity check.
 *
 * Every token listed below must exist in src/styles/tokens.css with a
 * byte-identical value (whitespace around ":" and ";" is normalised away).
 * The expected values are the design-system brief's measured numbers, frozen
 * here so the stylesheet cannot drift: a missing token, a changed value or an
 * undeclared extra token each fail the check.
 *
 * Groups:
 *   - "design brief": copied verbatim from design-system.md §9 (measured from ui.pen).
 *   - "implementation supplement": added by the motion layer, absent from the
 *     design brief, listed separately and labelled so the two sources stay apart.
 *     Its motion rows are the frozen set from .agents/briefs/motion-spec-frozen.md.
 *
 * Usage: node tools/verify-tokens.mjs   (exit 0 = in sync, exit 1 = drift)
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const TOKENS_FILE = "src/styles/tokens.css";
const TOKENS_PATH = fileURLToPath(new URL("../src/styles/tokens.css", import.meta.url));

const GROUPS = [
  {
    source: "design brief §9",
    tokens: {
      "--c-paper": "#F7F5F0",
      "--c-ink": "#111111",
      "--c-ink-body": "#333333",
      "--c-rule": "#D8D4CC",
      "--c-rule-strong": "#111111",
      "--c-muted": "#6E6E6E",
      "--c-muted-on-dark": "#9A9A9A",
      "--c-label-on-color": "#B9B9B9",
      "--c-white": "#FFFFFF",
      "--c-blue": "#1B4BC4",
      "--c-green": "#0E7A46",
      "--c-sand": "#C9B896",
      "--c-brown": "#4A3C22",
      "--c-blue-ink": "#1B4BC4",
      "--fs-10": "10px",
      "--fs-11": "11px",
      "--fs-12": "12px",
      "--fs-13": "13px",
      "--fs-14": "14px",
      "--fs-15": "15px",
      "--fs-22": "22px",
      "--fs-26": "26px",
      "--fs-30": "30px",
      "--fs-34": "34px",
      "--fs-42": "42px",
      "--fs-48": "48px",
      "--fs-64": "64px",
      "--fs-118": "118px",
      "--ff-sans-en": '"Inter", system-ui, sans-serif',
      "--ff-sans-cn": '"Noto Sans SC", system-ui, sans-serif',
      "--ff-mono": '"IBM Plex Mono", ui-monospace, monospace',
      "--fw-normal": "400",
      "--fw-key": "700",
      "--fw-title": "800",
      "--fw-black": "900",
      "--lh-display": "0.92",
      "--lh-display-2": "0.95",
      "--lh-cn-title": "1.35",
      "--lh-running": "1.70",
      "--lh-body": "1.90",
      "--lh-body-hero": "1.95",
      "--ls-display": "-5px",
      "--ls-display-2": "-2px",
      "--ls-none": "0",
      "--ls-label": "1px",
      "--ls-figcap": "2px",
      "--ls-caps": "3px",
      "--ls-eyebrow": "4px",
      "--sp-2": "2px",
      "--sp-8": "8px",
      "--sp-10": "10px",
      "--sp-12": "12px",
      "--sp-14": "14px",
      "--sp-16": "16px",
      "--sp-18": "18px",
      "--sp-22": "22px",
      "--sp-24": "24px",
      "--sp-28": "28px",
      "--sp-30": "30px",
      "--sp-32": "32px",
      "--sp-36": "36px",
      "--sp-40": "40px",
      "--sp-48": "48px",
      "--sp-56": "56px",
      "--page-w": "1440px",
      "--gutter-x": "48px",
      "--pad-section-y": "40px",
      "--pad-hero": "56px 48px 40px 48px",
      "--pad-footer": "36px 48px",
      "--pad-card": "28px 24px",
      "--pad-row": "22px 0",
      "--pad-btn": "16px 32px",
      "--pad-cap": "12px 48px",
      "--nav-h": "80px",
      "--col-hero-right": "360px",
      "--card-h": "260px",
      "--thumb": "148px",
      "--num-block": "64px",
      "--mark": "14px",
      "--rule-h": "1px",
      "--rule-h-strong": "2px",
      "--accent-rule": "40px 3px",
      "--hero-photo-h": "560px",
    },
  },
  {
    source: "implementation supplement (node sizes, responsive tiers, motion layer)",
    tokens: {
      /* BLUEPRINT §2.5 / §2.6: sizes the design brief states inside a shorthand. */
      /* BLUEPRINT §2.5 Index.Head padding 0 0 20px 0 */
      "--pad-index-head": "20px",
      "--accent-rule-w": "40px",
      "--accent-rule-h": "3px",
      /* ui.pen v2 Lang › Div (hpbuF) 1×12 */
      "--lang-div-h": "12px",
      /* BLUEPRINT §3.1: global tiers, derived there by ratio from the 1440 artboard. */
      "--gutter-x-t1200": "40px",
      "--gutter-x-t900": "32px",
      "--gutter-x-t600": "24px",
      "--pad-section-y-t1200": "32px",
      "--pad-section-y-t900": "24px",
      "--pad-section-y-t600": "24px",
      "--pad-hero-t1200": "48px 40px 32px 40px",
      "--pad-hero-t900": "32px 32px 24px 32px",
      "--pad-hero-t600": "32px 24px 24px 24px",
      "--pad-footer-t1200": "32px 40px",
      "--pad-footer-t900": "24px 32px",
      "--pad-footer-t600": "16px 24px",
      "--pad-card-t1200": "24px 24px",
      "--pad-card-t900": "16px 16px",
      "--pad-card-t600": "16px 16px",
      "--pad-row-t1200": "16px 0", /* BLUEPRINT §3.1 --pad-row @≤1200px */
      "--pad-row-t900": "16px 0",
      "--pad-row-t600": "8px 0",
      "--pad-cap-t1200": "12px 40px",
      "--pad-cap-t900": "8px 32px",
      "--pad-cap-t600": "8px 16px",
      "--nav-h-t1200": "64px",
      "--nav-h-t900": "48px",
      "--nav-h-t600": "40px",
      /* BLUEPRINT §3.2: font-size tiers (the ≤15px sizes do not shrink). */
      "--fs-118-t1200": "98px",
      "--fs-118-t900": "74px",
      "--fs-118-t600": "60px",
      "--fs-64-t1200": "54px",
      "--fs-64-t900": "40px",
      "--fs-64-t600": "32px",
      "--fs-48-t1200": "40px",
      "--fs-48-t900": "30px",
      "--fs-48-t600": "24px",
      "--fs-42-t1200": "36px",
      "--fs-42-t900": "26px",
      "--fs-42-t600": "22px",
      "--fs-34-t1200": "28px",
      "--fs-34-t900": "22px",
      "--fs-34-t600": "18px",
      "--fs-30-t1200": "26px",
      "--fs-30-t900": "20px",
      "--fs-30-t600": "18px",
      "--fs-26-t1200": "22px",
      "--fs-26-t900": "18px",
      "--fs-26-t600": "18px",
      "--fs-22-t1200": "18px",
      "--fs-22-t900": "16px",
      "--fs-22-t600": "16px",
      /* BLUEPRINT §3.3: block sizes at the same three tiers. */
      "--col-hero-right-t1200": "304px",
      "--band-h-t1200": "464px",
      "--band-h-t900": "352px",
      "--band-h-t600": "232px",
      "--num-block-t1200": "56px",
      "--num-block-t900": "40px",
      "--num-block-t600": "32px",
      "--thumb-t1200": "120px",
      "--thumb-t900": "96px",
      "--thumb-t600": "72px",
      "--card-h-t1200": "216px",
      "--card-h-t900": "160px",
      "--card-h-t600": "128px",
      /* Motion layer. The one naming and one value set is frozen in
         .agents/briefs/motion-spec-frozen.md; BLUEPRINT §2.11/§4 spells the same
         names, and tools/verify-motion.mjs fails on a synonym or on a value that
         drifts from these. */
      "--dur-1": "200ms",
      "--dur-2": "400ms",
      "--dur-3": "600ms",
      "--ease-out": "cubic-bezier(0.22, 0.61, 0.36, 1)",
      "--reveal-shift": "8px",
      "--reveal-delay-1": "80ms",
      "--reveal-delay-2": "160ms",
      "--reveal-delay-3": "240ms",
      "--stagger-step": "40ms",
      "--hover-shift": "4px",
      "--slide-shift": "24px",
      "--parallax-factor": "0.3",
    },
  },
];

/** Reads the :root declarations of tokens.css into a name -> value map. */
function readDeclaredTokens(css) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rootBlock = withoutComments.match(/:root\s*\{([\s\S]*?)\}/);
  if (rootBlock === null) {
    throw new Error(`no :root block found in ${TOKENS_FILE}`);
  }

  const tokens = new Map();
  for (const [, name, value] of rootBlock[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens.set(name, value.trim().replace(/\s+/g, " "));
  }
  return tokens;
}

const declared = readDeclaredTokens(readFileSync(TOKENS_PATH, "utf8"));
const sourceByToken = new Map();
const problems = [];
let expectedCount = 0;

for (const group of GROUPS) {
  for (const [name, expected] of Object.entries(group.tokens)) {
    expectedCount += 1;
    sourceByToken.set(name, group.source);

    const actual = declared.get(name);
    if (actual === undefined) {
      problems.push(`[MISSING]    ${name}: expected ${expected}, actual not declared (${group.source})`);
    } else if (actual !== expected) {
      problems.push(`[MISMATCH]   ${name}: expected ${expected}, actual ${actual} (${group.source})`);
    }
  }
}

for (const [name, value] of declared) {
  if (!sourceByToken.has(name)) {
    problems.push(`[UNEXPECTED] ${name}: actual ${value}, not listed in any expected group`);
  }
}

if (problems.length > 0) {
  console.error(`${TOKENS_FILE}: ${problems.length} token problem(s) against ${expectedCount} expected tokens`);
  console.error(problems.join("\n"));
  process.exit(1);
}

const summary = GROUPS.map((group) => `${Object.keys(group.tokens).length} ${group.source}`).join(" + ");
console.log(`PASS: ${expectedCount}/${expectedCount} tokens match in ${TOKENS_FILE} (${summary})`);
