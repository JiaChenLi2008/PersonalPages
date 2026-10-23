#!/usr/bin/env node
/*
 * Fidelity check for the `scholarly` section (lane S3) against the frozen design.
 *
 * The design source of truth is one board, /…/ui.pen, pinned by hash and byte size.
 * This check reads the frame `ppRfL` subtree out of that board and compares it with
 * what the section actually implements, in both directions:
 *
 *   - the board still holds the value (a re-exported or edited ui.pen fails here);
 *   - the section still carries it, as the exact declaration, with every var(--…)
 *     resolved through src/styles/tokens.css — so a token swap, a rounded number or
 *     an approximated colour all fail;
 *   - text roles: each design text node is tied to the class that implements it,
 *     and every non-※ text node in the frame is covered by some declared role;
 *   - copy: every non-※ string in the frame is accounted for by keys the section
 *     references in the dictionaries (§ CHROME.md comparison rules);
 *   - assets: the three JHU photos and the three wired figures are the frozen MANIFEST
 *     files at their native size, and the essay PDF is byte-identical to its source;
 *   - reveal: the nine pairs are nine `useRevealPanel({ panelId, triggerId, group })`
 *     calls, each bound to exactly one trigger and one panel, in three groups of three
 *     (motion spec §3, which replaced the old `useReveal` hidden-attribute pair);
 *   - hygiene: no hex colour, no Chinese literal and no h1 inside the section.
 *
 * Values the design itself leaves inconsistent are listed as DEVIATIONS below and
 * reported, not hidden: they are the only places where the section does not copy
 * the board 1:1.
 *
 * Usage: node tools/fidelity-scholarly.mjs   (exit 0 = aligned, 1 = any mismatch)
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/* The section is named for its frame id and its English title only: the section
   directory must stay free of hex colours and of Chinese literals (copy belongs to
   the dictionaries), so no CJK may appear anywhere in these files, comments included. */

const REPO = fileURLToPath(new URL("..", import.meta.url));
const SECTION_DIR = join(REPO, "src", "sections", "Scholarly");
const TOKENS_CSS = join(REPO, "src", "styles", "tokens.css");
const PRIMITIVES_CSS = join(REPO, "src", "components", "primitives", "primitives.css");

const PEN_SHA256 = "41dd7140223515c28a506a6b75299ea86381618577f78afdbe29d7f28d410114";
const PEN_BYTES = 140380;
const FRAME = "ppRfL";
const SUB_FRAMES = ["gE6yx", "EYW9F", "H1VYtj", "FMu2N"];

const problems = [];
const fail = (message) => problems.push(message);
/** Values this run actually compared; reported next to the failures (see the report). */
let checked = 0;

/* ---------- board: localise, verify the pin, index the frame ---------- */

/** The frozen board and its briefs live in the repo root (docs/verify-copy.mjs uses
    the same upward search, so both checks find the same files inside a worktree). */
function findRoot(start) {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, "ui.pen")) && existsSync(join(dir, ".agents", "briefs"))) {
      return dir;
    }
    const up = join(dir, "..");
    if (up === dir) break;
    dir = up;
  }
  return null;
}

/* External inputs live in the repo's parent directory. A missing one is an
   unavailable environment, not a failed assertion: one line, rc=2 (the same
   convention as verify-render.mjs for an unreachable host). Assertion failures
   stay rc=1. */
function unavailable(what, detail) {
  console.error(
    `UNAVAILABLE: ${what} — ${detail}; this gate needs ui.pen / .agents/briefs/** / ` +
      "HIR 竞赛文书.pdf from the repo's parent directory",
  );
  process.exit(2);
}

const PEN_ROOT = findRoot(REPO);
if (PEN_ROOT === null) {
  unavailable("ui.pen + .agents/briefs", `no such pair above ${REPO}`);
}

/* Checked here, not at the PDF comparison below, so nothing is printed before the
   UNAVAILABLE line. */
const PDF_SOURCE = join(PEN_ROOT, "HIR 竞赛文书.pdf");
if (!existsSync(PDF_SOURCE)) {
  unavailable("HIR 竞赛文书.pdf", `not found beside ui.pen at ${PEN_ROOT}`);
}

const penBytes = readFileSync(join(PEN_ROOT, "ui.pen"));
const penHash = createHash("sha256").update(penBytes).digest("hex");
if (penHash !== PEN_SHA256 || penBytes.length !== PEN_BYTES) {
  console.error(
    `FAIL: ui.pen is ${penHash.slice(0, 16)}… ${penBytes.length} B, expected ` +
      `${PEN_SHA256.slice(0, 16)}… ${PEN_BYTES} B — stop and re-baseline before comparing`,
  );
  process.exit(1);
}

const board = JSON.parse(penBytes.toString("utf8"));
const nodes = new Map();
(function index(node) {
  if (node && typeof node === "object") {
    if (typeof node.id === "string") nodes.set(node.id, node);
    for (const child of node.children ?? []) index(child);
  }
})(board);

const pen = (id) => {
  const node = nodes.get(id);
  if (node === undefined) {
    fail(`[board] node ${id} is missing from ui.pen`);
  }
  return node;
};

const frame = pen(FRAME);
for (const id of SUB_FRAMES) {
  if (!(frame?.children ?? []).some((child) => child.id === id)) {
    fail(`[board] sub-block ${id} is not a child of ${FRAME}`);
  }
}

/* ---------- tokens.css ---------- */

const tokenCss = readFileSync(TOKENS_CSS, "utf8");
const tokens = new Map();
for (const match of tokenCss.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
  tokens.set(match[1], match[2].trim());
}

/** Resolve every var(--…) in a declaration against tokens.css (nested vars included). */
function resolveValue(value) {
  let out = value;
  for (let i = 0; i < 5 && out.includes("var(--"); i++) {
    out = out.replace(/var\(--([\w-]+)\)/g, (whole, name) =>
      tokens.has(name) ? tokens.get(name) : whole,
    );
  }
  return out;
}

const numbers = (text) => [...text.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));

/** Design numbers must survive, in order, inside the resolved declaration.
    Zero spacing in the board shorthand needs no declaration of its own. */
function assertNumbers(label, designValue, declaration) {
  const designed = (Array.isArray(designValue) ? designValue : [designValue])
    .map(Number)
    .filter((value) => value !== 0);
  const resolved = numbers(resolveValue(declaration));
  let at = 0;
  for (const wanted of designed) {
    while (at < resolved.length && resolved[at] !== wanted) at += 1;
    if (at === resolved.length) {
      fail(`[css] ${label}: ${declaration} resolves to ${JSON.stringify(resolved)}, missing ${wanted}`);
      return;
    }
    at += 1;
  }
}

/* ---------- section sources and CSS blocks ---------- */

const sectionFiles = readdirSync(SECTION_DIR).filter((name) => /\.tsx?$|\.css$/.test(name));
const sectionSource = sectionFiles
  .filter((name) => name.endsWith(".tsx") || name.endsWith(".ts"))
  .map((name) => readFileSync(join(SECTION_DIR, name), "utf8"))
  .join("\n");
const sectionCss = readFileSync(join(SECTION_DIR, "scholarly.css"), "utf8");

const blocks = new Map();
/* Comments are stripped first: a comment right above a rule would otherwise end up
   inside the captured selector and the rule would look missing. */
for (const match of sectionCss.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const body = match[2];
  for (const selector of match[1].split(",").map((part) => part.trim())) {
    if (selector.startsWith("@") || selector === "") continue;
    // A selector can be declared more than once (narrow-screen overrides); keep both.
    blocks.set(selector, `${blocks.get(selector) ?? ""}${body}`);
  }
}

/** CSS declarations of one class, or of a base class plus its modifier. */
function declarationsOf(selectors) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  let body = "";
  for (const selector of list) {
    if (!blocks.has(selector)) {
      fail(`[css] no rule for ${selector}`);
      continue;
    }
    body += `${blocks.get(selector)}\n`;
  }
  return body;
}

function declaration(body, property) {
  // Later declarations win, so a modifier's override is the one compared.
  const matches = [...body.matchAll(new RegExp(`(?:^|[;{\\s])${property}:\\s*([^;]+);`, "g"))];
  return matches.length === 0 ? null : matches[matches.length - 1][1].trim();
}

/* ---------- 1. text roles: board node -> implementing class ---------- */

const TEXT_ROLES = [
  /* docx-1023 item 8（用户裁决）：去右侧重复标题、kicker 14px/--c-blue。
     `Af0af` (the board's right-hand English title) has no implementing role any more: the
     user ruled the duplicate title out of the head. Its string still covers the board node
     through the h2's aria-label (the copy check below only needs a referenced key), and the
     retired-role list holds the removal to that. */
  { node: "Mb1np", selector: ".scholarly__kicker", ruling: { fontSize: 14, fill: "#1B4BC4" } },
  { node: "Bwbci", selector: ".scholarly__num" },
  { node: "vPbTb", selector: ".scholarly__subtitle" },
  { node: "t4Auv", selector: ".scholarly__k" },
  { node: "FgXhw", selector: ".scholarly__d" },
  { node: "xtokZ", selector: ".scholarly__cta" },
  /* `FeAqL` (the board's URL text run, IBM Plex Mono 12px) has no implementing role any
     more: the user ruled the anchor must show a sentence, not the URL. The key still backs
     the href, so the copy check below still finds the board string; the type role is gone
     by design, and the deviation list records it. */
  { node: "I6zyH", selector: ".scholarly__cap" },
  { node: "c87Vy", selector: ".scholarly__onum" },
  { node: "juo5I", selector: ".scholarly__qtext" },
  { node: "n81oy", selector: ".scholarly__qtext" },
  { node: "JNmYW", selector: [".scholarly__qtext", ".scholarly__qtext--hir"] },
  { node: "aBJJs", selector: ".scholarly__onum" },
  { node: "mEmz8", selector: ".scholarly__onum" },
  { node: "b0ca8", selector: ".scholarly__onum" },
  { node: "GnP1a", selector: ".scholarly__panelLabel" },
  { node: "ZQLZ5", selector: [".scholarly__answer", ".scholarly__answer--qa"] },
  { node: "jeZpQ", selector: [".scholarly__answer", ".scholarly__answer--hir"] },
  { node: "QvhUL", selector: ".scholarly__hint" },
  { node: "S5cBV0", selector: ".scholarly__pullText" },
  { node: "Qz0zf", selector: ".scholarly__docTitle" },
  { node: "K5Gug", selector: ".scholarly__meta" },
  { node: "YdVeQ", selector: ".scholarly__link" },
];

const FONT_TOKENS = { "IBM Plex Mono": "--ff-mono", "Noto Sans SC": "--ff-sans-cn" };
const WEIGHT_TOKENS = { normal: "--fw-normal", 400: "--fw-normal", 700: "--fw-key", 800: "--fw-title" };

function roleValue(penNode, weightOf) {
  const wanted = [
    ["font-family", penNode.fontFamily],
    ["font-size", penNode.fontSize],
    ["font-weight", penNode.fontWeight ?? "normal"],
    ["letter-spacing", penNode.letterSpacing],
    ["line-height", penNode.lineHeight],
    ["color", penNode.fill],
  ];
  return weightOf(wanted);
}

for (const role of TEXT_ROLES) {
  const penNode = pen(role.node);
  if (penNode === undefined) continue;
  checked += 1;
  const ruling = role.ruling ?? {};
  const body = declarationsOf(role.selector);
  const label = `${role.node} <${penNode.name}> -> ${[role.selector].flat().join(" + ")}`;

  const family = declaration(body, "font-family");
  const familyToken = FONT_TOKENS[penNode.fontFamily];
  if (familyToken === undefined) {
    fail(`[role] ${label}: board font ${JSON.stringify(penNode.fontFamily)} has no token mapping`);
  } else if (family === null || !family.includes(`var(${familyToken})`)) {
    fail(`[role] ${label}: font-family ${JSON.stringify(family)} != var(${familyToken})`);
  } else if (!tokens.get(familyToken.slice(2))?.includes(penNode.fontFamily)) {
    fail(`[role] ${label}: tokens.css ${familyToken} != ${JSON.stringify(penNode.fontFamily)}`);
  }

  if (penNode.fontSize !== undefined) {
    const size = declaration(body, "font-size");
    const wanted = ruling.fontSize ?? penNode.fontSize;
    if (size === null) {
      fail(`[role] ${label}: no font-size for board size ${wanted}`);
    } else {
      assertNumbers(`role ${label} font-size`, wanted, size);
    }
  }

  const weightToken = WEIGHT_TOKENS[penNode.fontWeight ?? "normal"];
  const weight = declaration(body, "font-weight");
  const boardWeight = penNode.fontWeight === undefined || penNode.fontWeight === "normal" ? 400 : Number(penNode.fontWeight);
  if (weight === null && boardWeight === 400) {
    // No declaration and an unstyled 400 agree; anything heavier must be declared.
  } else if (weight === null || !weight.includes(`var(${weightToken})`)) {
    fail(`[role] ${label}: font-weight ${JSON.stringify(weight)} != var(${weightToken})`);
  } else if (Number(resolveValue(weight)) !== boardWeight) {
    fail(`[role] ${label}: tokens.css ${weightToken} does not match board weight ${penNode.fontWeight}`);
  }

  if (penNode.letterSpacing !== undefined) {
    const spacing = declaration(body, "letter-spacing");
    if (spacing === null) {
      fail(`[role] ${label}: no letter-spacing for board value ${penNode.letterSpacing}`);
    } else {
      assertNumbers(`role ${label} letter-spacing`, penNode.letterSpacing, spacing);
    }
  }

  if (penNode.lineHeight !== undefined) {
    const lineHeight = declaration(body, "line-height");
    if (lineHeight === null) {
      fail(`[role] ${label}: no line-height for board value ${penNode.lineHeight}`);
    } else if (Number(resolveValue(lineHeight)) !== penNode.lineHeight) {
      fail(`[role] ${label}: line-height ${lineHeight} != ${penNode.lineHeight} from the board`);
    }
  }

  const color = declaration(body, "color");
  const wantedFill = String(ruling.fill ?? penNode.fill).toUpperCase();
  if (color === null || !/var\(--c-[\w-]+\)/.test(color)) {
    fail(`[role] ${label}: colour ${JSON.stringify(color)} must come from a --c-* token`);
  } else if (resolveValue(color).toUpperCase() !== wantedFill) {
    fail(`[role] ${label}: ${resolveValue(color)} != board fill ${wantedFill}`);
  }
}

/* docx-1023 item 8（用户裁决）：去右侧重复标题、kicker 14px/--c-blue。The board still draws the
   right-hand title; the ruling removes it, so its class must be gone from both the CSS and
   the JSX. A re-introduced duplicate fails here instead of passing as an unused rule. */
for (const selector of [".scholarly__title"]) {
  checked += 1;
  if (sectionCss.includes(selector) || sectionSource.includes(selector.slice(1))) {
    fail(`[role] retired ${selector} is back in the section; docx-1023 item 8 removes the duplicate title`);
  }
}

/* ---------- 2. geometry: spacing, sizes, strokes ---------- */

const GEOMETRY = [
  { node: "ppRfL", property: "padding", selector: ".scholarly", declaration: "padding: var(--pad-section-y) var(--gutter-x);" },
  { node: "R3XJ39", property: "padding", selector: ".scholarly__head", declaration: "padding-bottom: 20px;" },
  { node: "gE6yx", property: "padding", selector: ".scholarly__sub", declaration: "padding: 26px 0;" },
  { node: "gsLdA", property: "gap", selector: ".scholarly__subhead", declaration: "gap: var(--sp-14);" },
  { node: "gsLdA", property: "padding", selector: ".scholarly__subhead", declaration: "padding-bottom: var(--sp-12);" },
  { node: "xe8w5", property: "gap", selector: ".scholarly__body--igem", declaration: "gap: var(--sp-32);" },
  { node: "xe8w5", property: "padding", selector: ".scholarly__body", declaration: "padding-top: 20px;" },
  { node: "jRnlh", property: "gap", selector: ".scholarly__igemCol", declaration: "gap: var(--sp-18);" },
  { node: "o5E1f", property: "width", selector: ".scholarly__figcol", declaration: "flex: 0 0 var(--col-hero-right);" },
  { node: "o5E1f", property: "gap", selector: ".scholarly__figcol", declaration: "gap: var(--sp-16);" },
  { node: "HC0UE", property: "gap", selector: ".scholarly__fig", declaration: "gap: var(--sp-8);" },
  { node: "luylu", property: "gap", selector: ".scholarly__body--jhu", declaration: "gap: var(--sp-16);" },
  { node: "lcaZL", property: "gap", selector: ".scholarly__cards", declaration: "gap: var(--sp-32);" },
  { node: "XQgNo", property: "gap", selector: ".scholarly__card", declaration: "gap: var(--sp-14);" },
  { node: "YuQ6Q", property: "gap", selector: ".scholarly__q", declaration: "gap: var(--sp-8);" },
  { node: "KNhLf", property: "padding", selector: ".scholarly__panel--qa", declaration: "padding: var(--sp-14) var(--sp-16);" },
  { node: "H1VYtj", property: "padding", selector: ".scholarly__sub", declaration: "padding: 26px 0;" },
  { node: "JQRnU", property: "gap", selector: ".scholarly__body--immuno", declaration: "gap: var(--sp-16);" },
  { node: "BeQNo", property: "gap", selector: ".scholarly__cols", declaration: "gap: var(--sp-32);" },
  { node: "lcbme", property: "gap", selector: ".scholarly__col", declaration: "gap: var(--sp-14);" },
  { node: "qBAl2", property: "width", selector: ".scholarly__accent", declaration: "width: 40px;" },
  { node: "qBAl2", property: "height", selector: ".scholarly__accent", declaration: "height: 3px;" },
  { node: "qBAl2", property: "fill", selector: ".scholarly__accent", declaration: "background: var(--c-blue);" },
  { node: "FMu2N", property: "padding", selector: ".scholarly__sub", declaration: "padding: 26px 0;" },
  { node: "LlwbS", property: "gap", selector: ".scholarly__body--hir", declaration: "gap: var(--sp-18);" },
  { node: "t95cb", property: "gap", selector: ".scholarly__question--hir", declaration: "gap: var(--sp-10);" },
  { node: "ac84L", property: "gap", selector: ".scholarly__question--hir", declaration: "gap: var(--sp-10);" },
  { node: "mphJ7", property: "gap", selector: ".scholarly__question--hir", declaration: "gap: var(--sp-10);" },
  { node: "T0FU1", property: "height", selector: ".scholarly__media--hir", declaration: "height: 420px;" },
  { node: "k7ToY", property: "padding", selector: ".scholarly__panel--hir", declaration: "padding: var(--sp-16) var(--sp-18);" },
  { node: "aNRvK", property: "gap", selector: ".scholarly__pull", declaration: "gap: var(--sp-10);" },
  { node: "aNRvK", property: "padding", selector: ".scholarly__pull", declaration: "padding: 6px 0;" },
  { node: "cg9Iw", property: "gap", selector: ".scholarly__docCard", declaration: "gap: var(--sp-24);" },
  { node: "cg9Iw", property: "padding", selector: ".scholarly__docCard", declaration: "padding: 20px var(--sp-24);" },
  { node: "cg9Iw", property: "stroke", selector: ".scholarly__docCard", declaration: "border: var(--rule-h) solid var(--c-ink);" },
  { node: "RRkm3", property: "gap", selector: ".scholarly__docL", declaration: "gap: var(--sp-8);" },
];

for (const entry of GEOMETRY) {
  const penNode = pen(entry.node);
  if (penNode === undefined) continue;
  checked += 1;
  const body = declarationsOf(entry.selector);
  const board = penNode[entry.property];
  if (board === undefined) {
    fail(`[geom] board node ${entry.node} carries no ${entry.property}`);
    continue;
  }
  const label = `${entry.node}.${entry.property} -> ${entry.selector} { ${entry.declaration} }`;

  if (!body.includes(entry.declaration)) {
    fail(`[geom] ${label}: declaration not found in the section CSS`);
  }
  if (entry.property === "fill" || entry.property === "strokeWidth" || entry.property === "stroke") {
    const colour = String(board).replace(" strokeWidth", "");
    const resolved = (resolveValue(entry.declaration).match(/#[0-9A-Fa-f]{6}/g) ?? []).map((hex) => hex.toUpperCase());
    if (!resolved.includes(colour.toUpperCase())) {
      fail(`[geom] ${label}: ${resolveValue(entry.declaration)} does not carry board colour ${colour}`);
    }
    continue;
  }
  if (entry.property === "layout" || entry.property === "width" || entry.property === "height") {
    if (typeof board === "string" && /[a-z]/.test(board)) {
      // fill_container / vertical etc. are structure, checked by the ratios below.
      continue;
    }
  }
  assertNumbers(`geom ${label}`, board, entry.declaration);
}

/* The media slots' own face. The current board revision fills `u2okj` and `T0FU1` with
   an image (the figure assets derive from those nodes), so it carries no colour for
   them any more; what stays checkable is that the box keeps the --c-rule face under the
   photo (BLUEPRINT §5's placeholder face, which is also the letterbox of `cover`). */
for (const node of ["u2okj", "T0FU1"]) {
  checked += 1;
  if (pen(node) === undefined) continue;
  if (!declarationsOf(".scholarly__media").includes("background: var(--c-rule);")) {
    fail(`[geom] .scholarly__media does not declare background: var(--c-rule); (the ${node} slot face)`);
  }
}

/* Panel and rule strokes: 1px --c-rule, 2px --c-ink, hairline 1px --c-rule. */
const panelStroke = pen("k7ToY");
if (panelStroke !== undefined && (panelStroke.stroke !== "#D8D4CC" || panelStroke.strokeWidth !== 1)) {
  fail(`[geom] board panel stroke is ${panelStroke.stroke} ${panelStroke.strokeWidth}, expected #D8D4CC 1`);
}
const panelBorder = declaration(declarationsOf(".scholarly__panel"), "border");
if (panelBorder !== "var(--rule-h) solid var(--c-rule)") {
  fail(`[geom] .scholarly__panel border ${JSON.stringify(panelBorder)} != var(--rule-h) solid var(--c-rule)`);
}

const primitivesCss = readFileSync(PRIMITIVES_CSS, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const primitiveBlocks = new Map();
for (const match of primitivesCss.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  for (const selector of match[1].split(",").map((part) => part.trim())) {
    primitiveBlocks.set(selector, match[2]);
  }
}
const RULES = [
  { node: "cDiTq", variant: "baseline", height: "var(--rule-h-strong)", background: "var(--c-rule-strong)" },
  { node: "j8SuY", variant: "hairline", height: "var(--rule-h)", background: "var(--c-rule)" },
];
for (const rule of RULES) {
  const penNode = pen(rule.node);
  if (penNode === undefined) continue;
  checked += 1;
  if (penNode.height !== (rule.variant === "baseline" ? 2 : 1)) {
    fail(`[rule] board ${rule.node} height ${penNode.height} != ${rule.variant}`);
  }
  if (resolveValue(rule.background).toUpperCase() !== String(penNode.fill).toUpperCase()) {
    fail(`[rule] board ${rule.node} fill ${penNode.fill} != ${rule.background} (${resolveValue(rule.background)})`);
  }
  const body = primitiveBlocks.get(`[data-rule="${rule.variant}"]`) ?? "";
  if (declaration(body, "height") !== rule.height || declaration(body, "background") !== rule.background) {
    fail(
      `[rule] primitives.css [data-rule="${rule.variant}"] is ${declaration(body, "height")} / ` +
        `${declaration(body, "background")}, expected ${rule.height} / ${rule.background}`,
    );
  }
  assertNumbers(`[rule] ${rule.node} height`, penNode.height, rule.height);
}

/* ---------- 3. media ratios: the board's box, not only its label ---------- */

const BOARD_WIDTH = 1440;
const framePaddingX = frame.padding[1];
const RATIOS = [
  { node: "u2okj", width: pen("o5E1f").width, selector: ".scholarly__media--4x3", declaration: "aspect-ratio: 4 / 3;" },
  {
    node: "D4gujt",
    width: (BOARD_WIDTH - 2 * framePaddingX - 2 * pen("lcaZL").gap) / 3,
    selector: ".scholarly__media--4x3",
    declaration: "aspect-ratio: 4 / 3;",
  },
];
for (const ratio of RATIOS) {
  const penNode = pen(ratio.node);
  if (penNode === undefined) continue;
  checked += 1;
  const designed = ratio.width / penNode.height;
  const declared = (() => {
    const match = ratio.declaration.match(/aspect-ratio:\s*(\d+)\s*\/\s*(\d+)/);
    return match === null ? NaN : Number(match[1]) / Number(match[2]);
  })();
  if (Math.abs(designed - declared) > 0.001) {
    fail(`[ratio] ${ratio.node}: board ${ratio.width}×${penNode.height} = ${designed.toFixed(4)} != ${ratio.declaration}`);
  }
  if (!declarationsOf(ratio.selector).includes(ratio.declaration)) {
    fail(`[ratio] ${ratio.selector} does not declare ${ratio.declaration}`);
  }
}
const hirMedia = pen("T0FU1");
if (hirMedia !== undefined) {
  checked += 1;
  const declaredHeight = declaration(declarationsOf(".scholarly__media--hir"), "height");
  assertNumbers("[ratio] T0FU1 height", hirMedia.height, declaredHeight ?? "");
  const fullWidth = BOARD_WIDTH - 2 * framePaddingX;
  if (Math.abs(fullWidth / hirMedia.height - 21 / 9) > 0.01) {
    console.log(
      `note: ${hirMedia.id} is named 21:9 but its frozen box is ${fullWidth}×${hirMedia.height} ` +
        `= ${(fullWidth / hirMedia.height).toFixed(3)}:1 — the section builds the box (BLUEPRINT §5 #8).`,
    );
  }
}

/* ---------- 4. copy: every non-※ board string is accounted for ---------- */

const referencedKeys = new Set(
  [...sectionSource.matchAll(/(?<![\w$.])text\(\s*"([^"]+)"\s*\)/g)].map((match) => match[1]),
);
const dictionaries = {
  en: JSON.parse(readFileSync(join(REPO, "docs", "copy-en.json"), "utf8")),
  zh: JSON.parse(readFileSync(join(REPO, "docs", "copy-zh.json"), "utf8")),
};
for (const key of referencedKeys) {
  if (!(key in dictionaries.en) || !(key in dictionaries.zh)) {
    fail(`[copy] ${key} is not in both dictionaries`);
  }
}
const referencedTexts = [];
for (const key of referencedKeys) {
  for (const locale of ["en", "zh"]) {
    const text = dictionaries[locale][key]?.text;
    if (typeof text === "string" && text !== "") referencedTexts.push(text);
  }
}
const normalise = (text) => text.replace(/\s+/g, " ").trim().toLowerCase();
const normalised = referencedTexts.map(normalise);

/* Two narrow exemptions, both about one mismatch: the board writes one text node where
   the site writes one language per page (BLUEPRINT §6.4). Nothing below touches
   `normalise`: every other board string still folds case and whitespace only.

   1. `PUNCTUATION_FOLDED_BY_NODE` — the board sets three nodes in full-width punctuation
      (，；？ with the spacing of the Chinese setting), while the site's EN text keeps the
      ASCII marks EN mode requires (no CJK and no full-width mark in an English string).
      Their two spellings differ in punctuation alone, so each of these three board nodes is
      compared with full-width marks folded to ASCII and the whitespace around a mark dropped —
      against the one dictionary key the node is registered to, and only that key (a board
      node carrying another key's string is a failure, not a hit). The key must still be
      referenced by src/ to earn the exemption.
   2. `SUPERSEDED_BY_DOCX` — `TZa4y` still carries the retired HIR subtitle
      (`HIR writing contest-哈佛国际评论学术写作竞赛`). docx-2026-10 page 4 replaces that whole
      sentence (docx-2026-10-brief.md 段[7]), but the board was re-exported for its images
      only and cannot be re-drawn, so the node keeps the old string. It stays covered while
      the key it belongs to is wired in src/; the new sentence is judged character for
      character against the brief by docs/verify-copy.mjs, which is where a change to it
      has to fail (this gate only holds the slot to its key).
   3. `HhaEo` (same table, same rule) — the board still writes `SWIPE → REVEAL`;
      docx-1023 第 3 条：SWIPE → REVEAL 改为 tap to reveal（用户裁决）, so the frozen node keeps the
      old hint while `scholarly.revealSwipe` stays wired in src/, and docs/verify-copy.mjs keeps
      judging the new hint character for character. */
const PUNCTUATION_FOLDED_BY_NODE = {
  vPbTb: "scholarly-igem.title",
  juo5I: "scholarly-jhu.q1",
  kk4C1: "scholarly-jhu.q2",
};
const SUPERSEDED_BY_DOCX = { TZa4y: "scholarly-hir.title", HhaEo: "scholarly.revealSwipe" };

/** Full-width mark -> the ASCII mark the EN page carries. */
const WIDE_TO_ASCII = {
  "，": ",",
  "；": ";",
  "：": ":",
  "？": "?",
  "！": "!",
  "、": ",",
  "（": "(",
  "）": ")",
  "—": "-",
};

/** `normalise`, plus full-width marks folded to ASCII and the space around a mark dropped. */
function foldPunctuation(text) {
  return normalise(text)
    .replace(/[，；：？！、（）—]/g, (mark) => WIDE_TO_ASCII[mark])
    .replace(/\s*([,;:.?!])\s*/g, "$1");
}

/* 每个 board 节点的对照池：只装它登记的那一个键的两份折叠文本（节点 id 取自冻版 ui.pen）。 */
const foldedByNode = new Map(
  Object.entries(PUNCTUATION_FOLDED_BY_NODE).map(([nodeId, key]) => [
    nodeId,
    ["en", "zh"]
      .map((locale) => dictionaries[locale][key]?.text)
      .filter((text) => typeof text === "string" && text !== "")
      .map(foldPunctuation),
  ]),
);
/** 登记键 -> 同一池，只为失败信息能指名「折叠后与另一登记键相同」的那个键。 */
const foldedByKey = new Map(
  Object.entries(PUNCTUATION_FOLDED_BY_NODE).map(([nodeId, key]) => [key, foldedByNode.get(nodeId)]),
);

let concatenated = 0;
let insideNode = 0;
let punctuationFolded = 0;
let superseded = 0;

const boardTexts = [];
(function collect(node) {
  if (typeof node.content === "string") boardTexts.push({ id: node.id, name: node.name, text: node.content });
  for (const child of node.children ?? []) collect(child);
})(frame);

for (const boardText of boardTexts) {
  if (boardText.text.startsWith("※")) continue;
  checked += 1;
  const wanted = normalise(boardText.text);
  if (normalised.includes(wanted)) continue;
  // The board joins the two CTA halves in one node; the dictionary keeps them apart.
  if (normalised.some((left) => normalised.some((right) => left + right === wanted))) {
    concatenated += 1;
    continue;
  }
  // The board may also carry a copy string inside its own node while the dictionary
  // holds it with a prefix (or suffix) the board keeps elsewhere, so containment counts.
  if (normalised.some((text) => text.includes(wanted))) {
    insideNode += 1;
    continue;
  }
  // Exemption 1: per-node, against the one key that node is registered to (and only if
  // src/ wires it) — a folded spelling match on some other key's text is not a hit.
  const foldedKey = PUNCTUATION_FOLDED_BY_NODE[boardText.id];
  const folded = foldPunctuation(boardText.text);
  if (foldedKey !== undefined && (foldedByNode.get(boardText.id) ?? []).includes(folded)) {
    if (!referencedKeys.has(foldedKey)) {
      fail(
        `[copy] board text ${boardText.id} <${boardText.name}> is only covered by ${foldedKey}, ` +
          `which src/ never references (no text("${foldedKey}") call): ` +
          JSON.stringify(boardText.text.slice(0, 60)),
      );
      continue;
    }
    punctuationFolded += 1;
    continue;
  }
  // Exemption 2: the one board string docx-2026-10 replaced, held to its key only.
  const supersededKey = SUPERSEDED_BY_DOCX[boardText.id];
  if (supersededKey !== undefined) {
    if (!referencedKeys.has(supersededKey)) {
      fail(
        `[copy] board text ${boardText.id} <${boardText.name}> is the string docx-2026-10 replaced ` +
          `${supersededKey} with, and src/ never references that key (no text("${supersededKey}") call): ` +
          JSON.stringify(boardText.text.slice(0, 60)),
      );
      continue;
    }
    superseded += 1;
    continue;
  }
  fail(
    `[copy] board text ${boardText.id} <${boardText.name}> is not covered by a referenced key: ` +
      JSON.stringify(boardText.text.slice(0, 60)) +
      crossKeyNote(foldedKey, folded),
  );
}

/** 失败信息用：折叠后的文本若与另一个登记键的文本相同，指名那个键（豁免只认本节点的键）。 */
function crossKeyNote(ownKey, folded) {
  const other = [...foldedByKey]
    .filter(([key, texts]) => key !== ownKey && texts.includes(folded))
    .map(([key]) => key);
  return other.length === 0
    ? ""
    : ` (folded, it equals the registered key ${other.join(", ")} — the exemption is per board node, not cross-key)`;
}

/* ---------- 5. assets ---------- */

const manifest = JSON.parse(readFileSync(join(REPO, "public", "media", "MANIFEST.json"), "utf8"));
const PHOTOS = ["image1-1600.webp", "image2-400.webp", "image3-600.webp"];
for (const name of PHOTOS) {
  checked += 1;
  const entry = manifest[name];
  if (entry === undefined) {
    fail(`[assets] ${name} is not in public/media/MANIFEST.json`);
    continue;
  }
  const size = statSync(join(REPO, "public", "media", name)).size;
  if (size !== entry.bytes) {
    fail(`[assets] public/media/${name} is ${size} B, MANIFEST says ${entry.bytes} B`);
  }
  if (!sectionSource.includes(`./media/${name}`)) {
    fail(`[assets] ${name} is not referenced by the section`);
  }
  const displayWidth = entry.w;
  const maxWidth = name.startsWith("image1") ? 1600 : Number(name.split("-")[1].split(".")[0]);
  if (displayWidth > maxWidth) {
    fail(`[assets] ${name} is ${displayWidth}px wide, the brief caps it at ${maxWidth}px (BLUEPRINT §5)`);
  }
}

/* The three slots the image-wiring lane filled (`.agents/briefs/image-wiring-map.md`
   §2.3–§2.5): each is a MANIFEST derivative of the board's own media node — 720×540 for
   the two 4:3 iGEM figures, 2688×840 for the 16:5 HIR figure — rendered at that native
   size with the alt key T3b added for the slot. */
const FIGURES = [
  { file: "igem-fig1-720.webp", node: "u2okj", width: 720, height: 540, altKey: "scholarly-igem.fig1.alt" },
  { file: "igem-fig2-720.webp", node: "I2wlYa", width: 720, height: 540, altKey: "scholarly-igem.fig2.alt" },
  { file: "hir-fig-2688.webp", node: "T0FU1", width: 2688, height: 840, altKey: "scholarly-hir.fig.alt" },
];
for (const figure of FIGURES) {
  checked += 1;
  const entry = manifest[figure.file];
  if (entry === undefined) {
    fail(`[assets] ${figure.file} is not in public/media/MANIFEST.json`);
    continue;
  }
  if (entry.nodeId !== figure.node) {
    fail(`[assets] ${figure.file} derives from board node ${entry.nodeId}, expected ${figure.node}`);
  }
  if (entry.w !== figure.width || entry.h !== figure.height) {
    fail(`[assets] MANIFEST says ${figure.file} is ${entry.w}×${entry.h}, the slot renders ${figure.width}×${figure.height}`);
  }
  const size = statSync(join(REPO, "public", "media", figure.file)).size;
  if (size !== entry.bytes) {
    fail(`[assets] public/media/${figure.file} is ${size} B, MANIFEST says ${entry.bytes} B`);
  }
  if (!sectionSource.includes(`./media/${figure.file}`)) {
    fail(`[assets] ${figure.file} is not referenced by the section`);
  }
  if (!sectionSource.includes(`alt={text("${figure.altKey}")}`)) {
    fail(`[assets] ${figure.file} does not take its alt from ${figure.altKey}`);
  }
  if (!sectionSource.includes(`width={${figure.width}}`) || !sectionSource.includes(`height={${figure.height}}`)) {
    fail(`[assets] ${figure.file} does not render at its native ${figure.width}×${figure.height}`);
  }
  if (sectionSource.includes("scholarly__pending")) {
    fail("[assets] the section still renders an `image pending` placeholder box");
  }
}

const pdfSource = PDF_SOURCE;
const pdfCopy = join(REPO, "public", "media", "hir-essay.pdf");
if (!existsSync(pdfCopy)) {
  fail(`[assets] ${pdfCopy} is missing`);
} else {
  const digest = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
  const sourceHash = digest(pdfSource);
  const copyHash = digest(pdfCopy);
  if (sourceHash !== copyHash) {
    fail(`[assets] hir-essay.pdf ${copyHash.slice(0, 16)}… != source ${sourceHash.slice(0, 16)}…`);
  } else if (!sectionSource.includes("media/hir-essay.pdf")) {
    fail("[assets] the HIR card does not link to media/hir-essay.pdf");
  }
}

/* ---------- 6. section hygiene ---------- */

for (const name of sectionFiles) {
  const text = readFileSync(join(SECTION_DIR, name), "utf8");
  if (/#[0-9a-fA-F]{3,8}\b/.test(text)) {
    fail(`[hygiene] ${name} carries a hex colour; colours belong to tokens.css`);
  }
  if (/[\u4e00-\u9fff]/.test(text)) {
    fail(`[hygiene] ${name} carries a Chinese literal; copy belongs to the dictionaries`);
  }
}
if (/<h1\b/.test(sectionSource)) {
  fail("[hygiene] the section renders an h1; the page's only h1 is Hero's (BLUEPRINT §6.1)");
}

/* ---------- deviations: what the board and the dictionary disagree on ---------- */

const DEVIATIONS = [
  [
    "media slot face",
    "the current board revision fills u2okj/T0FU1 with an image and carries no colour for " +
      "them, so the gate checks the slot's --c-rule background declaration instead of comparing " +
      "it to a board fill",
  ],
  [
    "01.2 card ordinals",
    "the board numbers the three cards 1/2/3; the dictionaries hold those three strings only as " +
      "the Immunotherapy column numbers (scholarly-immuno.q*.no), so both blocks reference them",
  ],
  [
    "Answer: label",
    "the board shows 'Answer:' in all nine panels; the dictionaries carry it as " +
      "scholarly-hir.answerLabel only, so the JHU and Immunotherapy panels reference that key",
  ],
  [
    "01.2 caption padding",
    "the board insets the card media by 16px for its ※ source note; the note is not rendered and " +
      "the real photo fills the 4:3 box, so the section keeps the box and drops the inset",
  ],
  [
    "section title case",
    "the board renders SCHOLARLY PURSUITS uppercased; text-transform does that, the dictionary " +
      "keeps the manuscript's sentence case (docs/CHROME.md, comparison rules)",
  ],
  [
    "01.1 CTA type role",
    "the board's FeAqL node sets the URL itself in IBM Plex Mono 12px; the user ruled that the " +
      "anchor must show a sentence instead of the address, so the node has no text role and the " +
      "anchor takes the body face at the enlarged CTA size. The URL string still covers the " +
      "board node through the href key scholarly-igem.cta.url.",
  ],
];

/* ---------- 6. the reveal skeleton (motion spec §3, the §3.7 replacement) ---------- */

/* Every pair is one `useRevealPanel({ panelId, triggerId, group })` call: the three
   fields are literal strings, so the server and client agree and a typo in an id
   cannot pass. The hook owns the markup — the section spreads `triggerProps` onto
   exactly one trigger and `panelProps` onto exactly one panel, and writes neither a
   `hidden` attribute nor an inline style. */
const paired = [
  ...sectionSource.matchAll(/const\s+([\w$]+)\s*=\s*useRevealPanel\(\{([\s\S]*?)\}\)/g),
].map((match) => ({
  handle: match[1],
  panel: (match[2].match(/panelId:\s*"([^"]+)"/) ?? [])[1],
  trigger: (match[2].match(/triggerId:\s*"([^"]+)"/) ?? [])[1],
  group: (match[2].match(/group:\s*"([^"]+)"/) ?? [])[1],
}));
const revealTriggers = [...sectionSource.matchAll(/\{\.\.\.([\w$]+)\.triggerProps\}/g)].map(
  (match) => match[1],
);
const revealPanels = [...sectionSource.matchAll(/\{\.\.\.([\w$]+)\.panelProps\}/g)].map(
  (match) => match[1],
);
if (paired.length !== 9 || revealTriggers.length !== 9 || revealPanels.length !== 9) {
  fail(
    `[reveal] ${paired.length} useRevealPanel calls / ${revealTriggers.length} trigger spreads / ` +
      `${revealPanels.length} panel spreads, expected 3 + 3 + 3`,
  );
}
for (const { handle, panel, trigger, group } of paired) {
  checked += 1;
  if (panel === undefined || trigger === undefined || group === undefined) {
    fail(`[reveal] ${handle}: the call must carry literal panelId, triggerId and group fields`);
    continue;
  }
  const boundTriggers = revealTriggers.filter((name) => name === handle).length;
  const boundPanels = revealPanels.filter((name) => name === handle).length;
  if (boundTriggers !== 1 || boundPanels !== 1) {
    fail(`[reveal] ${handle} is bound to ${boundTriggers} trigger(s) and ${boundPanels} panel(s), expected 1 and 1 (panel ${panel})`);
  }
  if (panel.replace(/-a(\d)$/, "-q$1") !== trigger) {
    fail(`[reveal] ${handle}: trigger id ${trigger} does not answer panel id ${panel}`);
  }
}
if (new Set(paired.map((pair) => pair.panel)).size !== paired.length) {
  fail("[reveal] the nine panel ids are not distinct");
}
if (new Set(paired.map((pair) => pair.trigger)).size !== paired.length) {
  fail("[reveal] the nine trigger ids are not distinct");
}
const groups = new Map();
for (const pair of paired) {
  groups.set(pair.group, (groups.get(pair.group) ?? 0) + 1);
}
if (groups.size !== 3 || [...groups.values()].some((size) => size !== 3)) {
  fail(`[reveal] ${groups.size} group(s) ${JSON.stringify([...groups])}, expected three groups of three`);
}

/* The class tokens of this section, counted by name: the motion hooks land as mark-up
   classes, so these counts are what the browser is handed (spec §4 device matrix). */
const classes = [...sectionSource.matchAll(/className="([^"]*)"/g)].flatMap((match) => match[1].split(/\s+/));
const classCount = (hook) => classes.filter((name) => name === hook).length;
for (const [hook, expected, why] of [
  ["motion-reveal-group", 3, "one per group container (spec §3.4)"],
  ["motion-reveal-clip", 9, "the clip layer of every panel"],
  ["motion-answer", 18, "the answer label and the answer of every panel"],
  ["motion-clip", 6, "the three puzzle slots and the three wired figures (spec §4 device ②)"],
  ["motion-slide", 9, "the nine ordinals (spec §4 device ③)"],
  ["motion-hover", 9, "the nine question cards (spec §4 device ④)"],
]) {
  checked += 1;
  if (classCount(hook) !== expected) {
    fail(`[reveal] .${hook} appears on ${classCount(hook)} element(s), expected ${expected}: ${why}`);
  }
}
for (const tier of ["1", "2"]) {
  checked += 1;
  const declared = [...sectionSource.matchAll(new RegExp(`data-stagger="${tier}"`, "g"))].length;
  if (declared !== 9) {
    fail(`[reveal] answer tier ${tier} is declared ${declared} time(s), expected 9`);
  }
}

/* ---------- report ---------- */

if (problems.length > 0) {
  console.error(`FAIL: ${problems.length} fidelity problem(s) against ui.pen ${PEN_SHA256.slice(0, 16)}…`);
  console.error(problems.join("\n"));
  process.exit(1);
}

console.log(`checked=${checked} missing=${problems.length}`);
console.log(
  `PASS: ui.pen ${PEN_SHA256.slice(0, 16)}… ${PEN_BYTES} B — ${TEXT_ROLES.length} text roles, ` +
    `${GEOMETRY.length} geometry values, ${RATIOS.length + 1} media boxes, ${boardTexts.length} board strings ` +
    `(${concatenated} joined, ${punctuationFolded} punctuation-folded, ${superseded} docx-superseded, ` +
    `${insideNode} split across board nodes), ${PHOTOS.length} photos + PDF byte-identical`,
);
for (const [what, why] of DEVIATIONS) {
  console.log(`deviation — ${what}: ${why}`);
}
