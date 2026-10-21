#!/usr/bin/env node
/*
 * Motion gate: the shared motion layer, checked without a browser.
 *
 * The motion system is frozen in .agents/briefs/motion-spec-frozen.md, which a CI
 * checkout does not have; everything this gate needs is in the repository itself.
 * Asserted:
 *
 *   1. tokens        — the frozen motion tokens are declared in src/styles/tokens.css with
 *                      the frozen values, every one of them is consumed by a stylesheet,
 *                      and no retired synonym (--dur-fast, --ease-inout, …) survives in
 *                      src/** or docs/BLUEPRINT.md.
 *   2. hooks         — every motion hook of src/styles/motion.css is declared, and every
 *                      hook that animates has a terminal state in its
 *                      `prefers-reduced-motion: reduce` block. An undeclared
 *                      `.motion-*` / `.reveal*` selector fails, so a new hook cannot
 *                      arrive without a reduce branch.
 *   3. reveal        — the reveal contract: grid-template-rows 0fr → 1fr, the group's
 *                      `overflow-anchor: none`, visibility for the collapsed state, and a
 *                      skeleton (src/lib/useRevealPanel.ts) that carries aria-expanded /
 *                      aria-controls / aria-labelledby / data-state, runs a rAF ring, and
 *                      writes no inline style.
 *   4. sections      — every section of the page has an entrance hook, or is deferred to
 *                      the lane that owns it and has the shared hooks it will consume.
 *   5. prohibitions  — no overshooting easing, no animated top/left/height/margin (in a
 *                      transition list, a transition-property or a @keyframes body), no
 *                      `transition: all`, no scroll listener.
 *   6. budget        — no single animation over 800ms, and the first-screen entrance chain
 *                      (its own duration + the last stagger tier) under 800ms.
 *   7. blueprint     — BLUEPRINT §2.11 spells the same motion token names and values, so the
 *                      three places (tokens.css, this gate, the blueprint) cannot drift apart.
 *
 * Usage: node tools/verify-motion.mjs              (exit 0 = in sync, exit 1 = violation)
 *        node tools/verify-motion.mjs --self-test  (sabotages a copy under /tmp, runs the
 *                                                   same checks against it and exits 1 when
 *                                                   the sabotage is caught; exit 2 means the
 *                                                   gate stayed blind, which is a failure)
 */

import { appendFileSync, cpSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const TOKENS_FILE = "src/styles/tokens.css";
const MOTION_FILE = "src/styles/motion.css";
const REVEAL_HOOK_FILE = "src/lib/useRevealPanel.ts";
const BLUEPRINT_FILE = "docs/BLUEPRINT.md";
const APP_FILE = "src/App.tsx";

/** The frozen motion tokens: the single naming and value set (.agents/briefs/motion-spec-frozen.md). */
const FROZEN_TOKENS = {
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
};

/** Names the freeze retired: a synonym for a frozen token, or a name the first draft invented. */
const RETIRED_TOKENS = [
  "--dur-fast",
  "--dur-base",
  "--dur-slow",
  "--ease-inout",
  "--dur-entrance",
  "--dur-reveal",
  "--dur-pin-collapse",
  "--ease-entrance",
  "--ease-reveal",
  "--ease-collapse",
  "--shift-reveal-y",
  "--shift-para-stagger",
  "--parallax-photoband",
  "--clip-angle",
  "--hover-scale",
  "--hover-dur",
  "--focus-ring-duration",
];

/** Hooks that move something: each needs a reduce branch. */
const ANIMATED_HOOKS = [
  ".reveal",
  ".motion-slide",
  ".motion-clip",
  ".motion-parallax",
  ".motion-hover",
  ".motion-answer",
  "[data-reveal-panel]",
];

/** Structural hooks: layout only, nothing to degrade. */
const STRUCTURE_HOOKS = [".motion-reveal-group", ".motion-reveal-clip"];

/** Properties that may never be animated: transform/opacity/clip-path/grid-template-rows only. */
const BANNED_ANIMATED = new Set([
  "all",
  "top",
  "right",
  "bottom",
  "left",
  "inset",
  "width",
  "height",
  "max-height",
  "min-height",
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "font-size",
  "line-height",
  "flex",
  "flex-basis",
  "gap",
]);

/** 800ms: no single animation, and no first-screen entrance chain, may run longer. */
const BUDGET_MS = 800;

/**
 * Ambient animations: the one class of motion that is not an entrance, so the 800ms
 * ceiling does not apply. Each entry names the stylesheet, the animation name and its
 * declared duration; the check below holds every `animation-something` duration in that
 * file to the registered value, so the exemption cannot be widened silently and a second
 * long animation in the same file still fails. A registered animation must also have its
 * terminal state in the reduce block, which §2 already enforces for `.motion-*` hooks and
 * this loop checks for these by name.
 *
 * The docx asks for photographs that "依次滚动播放" (Music 页面6) and a scrolling wall
 * (Sport 页面7); a loop that restarts every 800ms would not read as a wall.
 */
const AMBIENT_ANIMATIONS = [
  {
    file: "src/components/PhotoStrip/PhotoStrip.css",
    name: "photo-strip-cycle",
    duration: "48s",
  },
];

/**
 * Entrance hooks per section. `wired` means the section tree (or the shell, for hero)
 * already consumes one; `deferred` names the lane that wires it and the shared hooks
 * that lane will use, so the deferral is explicit instead of silently missing.
 */
const SECTIONS = [
  { section: "nav", dir: "Nav", state: "wired", lane: "", requires: [".reveal", ".motion-hover"] },
  { section: "hero", dir: "Hero", app: true, state: "wired", lane: "" },
  { section: "photoband", dir: "PhotoBand", state: "wired", lane: "" },
  { section: "index", dir: "Index", state: "wired", lane: "" },
  {
    section: "scholarly",
    dir: "Scholarly",
    state: "wired",
    lane: "",
    requires: [".motion-clip", ".motion-answer", ".motion-reveal-group", ".motion-reveal-clip", "[data-reveal-panel]"],
  },
  { section: "elder", dir: "Elder", state: "wired", lane: "" },
  { section: "music", dir: "Music", state: "wired", lane: "" },
  { section: "sport", dir: "Sport", state: "wired", lane: "" },
  { section: "method", dir: "Method", state: "wired", lane: "" },
  { section: "values", dir: "Values", state: "wired", lane: "" },
  { section: "footer", dir: "Footer", state: "wired", lane: "" },
];

/** The hook a wired section must show: the reveal primitive, the observer or the reveal skeleton. */
const ENTRANCE_HOOK = /\bReveal\b|\buseInView\b|\buseRevealPanel\b/;

/* ------------------------------------------------------------------ reading --- */

const read = (root, rel) => readFileSync(join(root, rel), "utf8");

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

const normalize = (value) => value.trim().replace(/\s+/g, " ");

/** Declarations of the :root block, name -> value. */
function rootTokens(css) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const root = withoutComments.match(/:root\s*\{([\s\S]*?)\}/);
  if (root === null) {
    return new Map();
  }
  const tokens = new Map();
  for (const [, name, value] of root[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens.set(name, normalize(value));
  }
  return tokens;
}

/** Splits a declaration value on its top-level commas (function arguments stay together). */
function topLevelItems(value) {
  const items = [];
  let depth = 0;
  let current = "";
  for (const character of value) {
    if (character === "(") depth += 1;
    if (character === ")") depth -= 1;
    if (character === "," && depth === 0) {
      items.push(current);
      current = "";
      continue;
    }
    current += character;
  }
  items.push(current);
  return items.map((item) => item.trim()).filter((item) => item !== "");
}

/** The property each transition item animates; an item without one animates `all`. */
function transitionProperties(value, varValues) {
  const keywords = /^(\d+(?:\.\d+)?(?:ms|s)|linear|ease|ease-in|ease-out|ease-in-out|step-start|step-end|cubic-bezier\(|steps\()/;
  return topLevelItems(value).map((item) => {
    if (keywords.test(item)) {
      return "all";
    }
    const first = item.split(/\s+/)[0];
    const resolved = varValues.has(first) ? varValues.get(first) : first;
    return keywords.test(resolved) ? "all" : resolved;
  });
}

/** Every declaration inside an @keyframes body, as property names. */
function keyframeProperties(css) {
  const properties = [];
  for (const [, body] of css.matchAll(/@keyframes\s+[\w-]+\s*\{([\s\S]*?)\n\}/g)) {
    for (const [, property] of body.matchAll(/([\w-]+)\s*:\s*([^;}]+)[;}]/g)) {
      properties.push(property);
    }
  }
  return properties;
}

/** The declaration block of one selector at the top level of a stylesheet. */
function ruleBody(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "m").exec(css);
  return match === null ? "" : match[1];
}

const ms = (value) => {
  const match = /^(\d+(?:\.\d+)?)(ms|s)$/.exec(value.trim());
  if (match === null) return Number.NaN;
  return match[2] === "s" ? Number(match[1]) * 1000 : Number(match[1]);
};

/* -------------------------------------------------------------------- checks --- */

function run(root) {
  const problems = [];
  const tokens = read(root, TOKENS_FILE);
  const declared = rootTokens(tokens);
  const motion = read(root, MOTION_FILE);
  const blueprint = read(root, BLUEPRINT_FILE);
  const hook = read(root, REVEAL_HOOK_FILE);
  const cssFiles = walk(join(root, "src")).filter((file) => file.endsWith(".css"));
  const codeFiles = walk(join(root, "src")).filter((file) => /\.(ts|tsx)$/.test(file));
  const otherCss = cssFiles.filter((file) => file !== join(root, TOKENS_FILE));
  const varValues = new Map([...declared].map(([name, value]) => [`var(${name})`, value]));

  /* 1. tokens: declared, frozen, consumed; no synonym left behind. */
  for (const [name, expected] of Object.entries(FROZEN_TOKENS)) {
    const actual = declared.get(name);
    if (actual === undefined) {
      problems.push(`[TOKEN]      ${name} is not declared in ${TOKENS_FILE} (expected ${expected})`);
    } else if (actual !== expected) {
      problems.push(`[TOKEN]      ${name} is ${actual}, frozen at ${expected} (${TOKENS_FILE})`);
    }
  }

  const consumed = new Set();
  for (const file of otherCss) {
    const css = readFileSync(file, "utf8");
    for (const [, name] of css.matchAll(/var\(\s*(--[\w-]+)/g)) {
      consumed.add(name);
    }
  }
  for (const name of Object.keys(FROZEN_TOKENS)) {
    if (!consumed.has(name)) {
      problems.push(`[UNUSED]     ${name} is declared but no stylesheet outside ${TOKENS_FILE} consumes it`);
    }
  }

  const searchable = [...cssFiles, ...codeFiles];
  for (const retired of RETIRED_TOKENS) {
    const declaredName = new RegExp(`${retired}\\s*:`);
    const consumedName = new RegExp(`var\\(\\s*${retired}\\s*[,)]`);
    for (const file of searchable) {
      const text = readFileSync(file, "utf8");
      if (declaredName.test(text) || consumedName.test(text)) {
        problems.push(`[SYNONYM]    ${retired} is retired by the freeze but is declared or used in ${relative(root, file)}`);
      }
    }
  }

  /* 2. hooks: declared, and reduce-covered when they animate. */
  const reducedIndex = motion.indexOf("@media (prefers-reduced-motion: reduce)");
  if (reducedIndex < 0) {
    problems.push(`[REDUCE]     ${MOTION_FILE} has no @media (prefers-reduced-motion: reduce) block`);
  }
  const motionBase = reducedIndex < 0 ? motion : motion.slice(0, reducedIndex);
  const motionReduce = reducedIndex < 0 ? "" : motion.slice(reducedIndex);

  for (const hookName of [...ANIMATED_HOOKS, ...STRUCTURE_HOOKS]) {
    if (!motionBase.includes(hookName)) {
      problems.push(`[HOOK]       ${hookName} is not declared in ${MOTION_FILE}`);
    }
  }
  for (const hookName of ANIMATED_HOOKS) {
    if (reducedIndex >= 0 && !motionReduce.includes(hookName)) {
      problems.push(`[REDUCE]     ${hookName} has no terminal state in the reduce block of ${MOTION_FILE}`);
    }
  }

  const known = new Set([...ANIMATED_HOOKS, ...STRUCTURE_HOOKS]);
  for (const [, selector] of motion.matchAll(/\.(reveal[\w-]*|motion-[\w-]+)/g)) {
    const name = `.${selector}`;
    if (!known.has(name)) {
      problems.push(`[HOOK]       ${name} is declared in ${MOTION_FILE} but not in this gate's hook list`);
    }
  }

  /* 3. the reveal contract: CSS driven height, no browser anchoring, no inline writes. */
  const cssContract = [
    ["[data-reveal-panel]", "the panel hook itself"],
    ["grid-template-rows: 0fr", "the collapsed row"],
    ["grid-template-rows: 1fr", "the open row"],
    ["overflow-anchor: none", "the group opts out of the browser's own scroll anchoring"],
    ["visibility: hidden", "the collapsed answer leaves the tab order and the a11y tree"],
  ];
  for (const [needle, why] of cssContract) {
    if (!motionBase.includes(needle)) {
      problems.push(`[REVEAL]     ${MOTION_FILE} has no "${needle}" (${why})`);
    }
  }

  const hookContract = [
    ['"aria-controls"', "the panel the trigger controls"],
    ['"aria-expanded"', "the state a screen reader reads"],
    ['"aria-labelledby"', "the panel's label"],
    ['"data-state"', "the terminal state the CSS keys off"],
    ['"data-reveal-panel"', "the styling hook"],
    ["requestAnimationFrame", "the bounded anchor-sync ring"],
    ["transitionend", "what ends the ring"],
    ["getBoundingClientRect", "the one read per frame"],
  ];
  for (const [needle, why] of hookContract) {
    if (!hook.includes(needle)) {
      problems.push(`[REVEAL]     ${REVEAL_HOOK_FILE} has no ${needle} (${why})`);
    }
  }
  if (/\.style\b/.test(hook)) {
    problems.push(`[REVEAL]     ${REVEAL_HOOK_FILE} writes an inline style; the terminal state must be aria-expanded + data-*`);
  }

  /* 4. sections: an entrance hook, or a deferral that names its lane and its hooks. */
  for (const entry of SECTIONS) {
    const dir = join(root, "src", "sections", entry.dir);
    let files;
    try {
      files = walk(dir).filter((file) => /\.(ts|tsx)$/.test(file));
    } catch {
      problems.push(`[SECTION]    src/sections/${entry.dir}/ is gone (${entry.section})`);
      continue;
    }
    if (entry.app === true) {
      files.push(join(root, APP_FILE));
    }
    const wired = files.some((file) => ENTRANCE_HOOK.test(readFileSync(file, "utf8")));
    if (entry.state === "wired" && !wired) {
      problems.push(`[SECTION]    ${entry.section} has no entrance hook (Reveal / useInView / useRevealPanel)`);
    }
    if (entry.state === "deferred") {
      if (wired) {
        problems.push(`[SECTION]    ${entry.section} is wired now, so this gate's deferred entry is stale: flip it to wired`);
      }
      for (const hookName of entry.requires ?? []) {
        if (!motionBase.includes(hookName)) {
          problems.push(`[SECTION]    ${entry.section} (lane ${entry.lane}) needs ${hookName}, missing from ${MOTION_FILE}`);
        }
      }
    }
  }

  /* 5. prohibitions. */
  for (const file of cssFiles) {
    const css = readFileSync(file, "utf8");
    const where = relative(root, file);
    for (const [, args] of css.matchAll(/cubic-bezier\(([^)]*)\)/g)) {
      const [, y1, , y2] = args.split(",").map((part) => Number(part.trim()));
      if (!(y1 <= 1) || !(y2 <= 1)) {
        problems.push(`[EASING]     ${where} uses cubic-bezier(${args}) — it overshoots; the freeze allows no elastic easing`);
      }
    }
    for (const [, value] of css.matchAll(/(?:^|[;{\s])transition(?:-property)?\s*:\s*([^;}]+)/g)) {
      for (const property of transitionProperties(value, varValues)) {
        if (BANNED_ANIMATED.has(property)) {
          problems.push(`[PROPERTY]   ${where} transitions "${property}" — animate transform/opacity/clip-path/grid-template-rows instead`);
        }
      }
    }
    for (const property of keyframeProperties(css)) {
      if (BANNED_ANIMATED.has(property)) {
        problems.push(`[KEYFRAMES]  ${where} animates "${property}" in a @keyframes body`);
      }
    }
  }

  for (const file of codeFiles) {
    const code = readFileSync(file, "utf8");
    if (/addEventListener\(\s*["']scroll["']/.test(code) || /\bonScroll\b/.test(code)) {
      problems.push(`[SCROLL]     ${relative(root, file)} listens to scroll; use IntersectionObserver or a scroll-driven timeline`);
    }
  }

  /* 6. performance budget. An ambient animation is exempt from the ceiling only where
     AMBIENT_ANIMATIONS registers it, at the duration registered, and only while its own
     reduce branch is present; anything else over the ceiling still fails. */
  for (const ambient of AMBIENT_ANIMATIONS) {
    const css = readFileSync(join(root, ambient.file), "utf8");
    if (!css.includes(ambient.name)) {
      problems.push(`[AMBIENT]    ${ambient.file} no longer declares ${ambient.name}; drop its AMBIENT_ANIMATIONS row`);
    }
    if (!new RegExp(`animation:\\s*${ambient.name}\\s+${ambient.duration}\\b`).test(css)) {
      problems.push(`[AMBIENT]    ${ambient.file} does not run ${ambient.name} at the registered ${ambient.duration}`);
    }
    if (!/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation:\s*none/.test(css)) {
      problems.push(`[AMBIENT]    ${ambient.file} has no reduce branch that stops ${ambient.name}`);
    }
  }
  const ambientDurations = new Map(
    AMBIENT_ANIMATIONS.map((ambient) => [join(root, ambient.file), ms(ambient.duration)]),
  );
  for (const file of cssFiles) {
    const css = readFileSync(file, "utf8");
    const exemption = ambientDurations.get(file);
    for (const [, value] of css.matchAll(/(?:transition|animation)(?:-duration)?\s*:\s*([^;}]+)/g)) {
      for (const [, number, unit] of value.matchAll(/(\d+(?:\.\d+)?)(ms|s)\b/g)) {
        const duration = ms(`${number}${unit}`);
        if (duration > BUDGET_MS && duration !== exemption) {
          problems.push(`[BUDGET]     ${relative(root, file)} runs ${number}${unit}; the single-animation ceiling is ${BUDGET_MS}ms`);
        }
      }
    }
  }

  const entranceDurations = [...ruleBody(motionBase, ".reveal").matchAll(/var\(\s*(--dur-[\w-]+)\s*\)/g)]
    .map(([, name]) => ms(declared.get(name) ?? ""))
    .filter((duration) => !Number.isNaN(duration));
  const lastDelay = ms(declared.get("--reveal-delay-3") ?? "");
  if (entranceDurations.length === 0) {
    problems.push(`[BUDGET]     the .reveal rule in ${MOTION_FILE} animates no duration token`);
  } else if (Math.max(...entranceDurations) + lastDelay > BUDGET_MS) {
    problems.push(
      `[BUDGET]     the first-screen entrance chain runs ${Math.max(...entranceDurations) + lastDelay}ms (duration + last stagger tier); the ceiling is ${BUDGET_MS}ms`,
    );
  }

  const staggerTiers = [...motion.matchAll(/\[data-stagger="(\d+)"/g)].length;
  const revealTiers = [...motion.matchAll(/\.reveal\[data-delay="/g)].length;
  if (staggerTiers > 6 || revealTiers > 3) {
    problems.push(
      `[BUDGET]     ${MOTION_FILE} declares ${staggerTiers} answer tiers and ${revealTiers} entrance tiers; more than 6 + 3 breaks the 8-animations-on-screen bound`,
    );
  }
  if (!declared.has("--stagger-step")) {
    problems.push(`[BUDGET]     --stagger-step is missing, so the answer stagger has no step`);
  }

  /* 7. the blueprint spells the same names and values as the freeze. */
  const row = /^\|\s*动效 token\s*\|([^|]*)\|/m.exec(blueprint);
  if (row === null) {
    problems.push(`[BLUEPRINT]  ${BLUEPRINT_FILE} §2.11 has no 动效 token row`);
  } else {
    const pairs = row[1]
      .split("、")
      .map((item) => /^\s*`(--[\w-]+)`\s*(.*)$/.exec(item))
      .filter((match) => match !== null)
      .map((match) => [match[1], normalize(match[2]).replace(/^`|`$/g, "")]);
    const stated = new Map(pairs);
    for (const [name, expected] of Object.entries(FROZEN_TOKENS)) {
      const actual = stated.get(name);
      if (actual === undefined) {
        problems.push(`[BLUEPRINT]  §2.11 does not list ${name}`);
      } else if (actual !== expected) {
        problems.push(`[BLUEPRINT]  §2.11 lists ${name} ${actual}, frozen at ${expected}`);
      }
    }
    for (const [name] of pairs) {
      if (!(name in FROZEN_TOKENS)) {
        problems.push(`[BLUEPRINT]  §2.11 lists ${name}, which is not part of the frozen motion set`);
      }
    }
  }

  /* §4 is the other place the motion names are spelled out: it may only use frozen ones. */
  const specifications = /##\s*4\.\s*交互规格([\s\S]*?)\n##\s*5\./.exec(blueprint);
  if (specifications === null) {
    problems.push(`[BLUEPRINT]  ${BLUEPRINT_FILE} has no §4 interaction section to read`);
  } else {
    for (const [, name] of specifications[1].matchAll(/`(--(?:dur|ease|reveal|stagger|hover|slide|parallax)[\w-]*)`/g)) {
      if (!(name in FROZEN_TOKENS)) {
        problems.push(`[BLUEPRINT]  §4 names ${name}, which is not part of the frozen motion set`);
      }
    }
  }

  return { problems };
}

/* ---------------------------------------------------------------------- main --- */

const sabotage = `
/* --self-test sabotage: a banned animated property and an undeclared motion hook. */
.motion-sabotage {
  transition: height var(--dur-2) var(--ease-out);
}
`;

if (process.argv.includes("--self-test")) {
  const scratch = join(tmpdir(), `verify-motion-selftest-${process.pid}`);
  rmSync(scratch, { recursive: true, force: true });
  mkdirSync(join(scratch, "docs"), { recursive: true });
  cpSync(join(ROOT, "src"), join(scratch, "src"), { recursive: true });
  cpSync(join(ROOT, "docs", "BLUEPRINT.md"), join(scratch, "docs", "BLUEPRINT.md"));
  appendFileSync(join(scratch, MOTION_FILE), sabotage, "utf8");

  const { problems } = run(scratch);
  rmSync(scratch, { recursive: true, force: true });

  if (problems.length === 0) {
    console.error("SELF-TEST BLIND: the sabotaged copy passed; this gate cannot fail");
    process.exit(2);
  }
  console.log(`SELF-TEST: the sabotaged copy under /tmp was caught, so this run exits 1 as expected`);
  for (const problem of problems) {
    console.log(`  ${problem}`);
  }
  process.exit(1);
}

const { problems } = run(ROOT);
if (problems.length > 0) {
  console.error(`${MOTION_FILE}: ${problems.length} motion problem(s)`);
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log(
  `PASS: motion layer in sync (${Object.keys(FROZEN_TOKENS).length} frozen tokens consumed, ` +
    `${ANIMATED_HOOKS.length} animated hooks reduce-covered, ${SECTIONS.length} sections, ` +
    `single-animation and entrance budget <= ${BUDGET_MS}ms, blueprint §2.11 matches)`,
);
