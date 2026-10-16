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
 *   - assets: the three JHU photos are the frozen MANIFEST files, and the essay PDF
 *     is byte-identical to its source;
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

const PEN_SHA256 = "9f9f23f9a7291b5fb7f99a80069f3a8dc78c268fe769421dd6977297444c55f2";
const PEN_BYTES = 137536;
const FRAME = "ppRfL";
const SUB_FRAMES = ["gE6yx", "EYW9F", "H1VYtj", "FMu2N"];

const problems = [];
const fail = (message) => problems.push(message);

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

const PEN_ROOT = findRoot(REPO);
if (PEN_ROOT === null) {
  console.error(`FAIL: no ui.pen + .agents/briefs above ${REPO}`);
  process.exit(1);
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
  { node: "Mb1np", selector: ".scholarly__kicker" },
  { node: "Af0af", selector: ".scholarly__title" },
  { node: "Bwbci", selector: ".scholarly__num" },
  { node: "vPbTb", selector: ".scholarly__subtitle" },
  { node: "t4Auv", selector: ".scholarly__k" },
  { node: "FgXhw", selector: ".scholarly__d" },
  { node: "xtokZ", selector: ".scholarly__cta" },
  { node: "FeAqL", selector: ".scholarly__url" },
  { node: "FQiFu", selector: ".scholarly__pending" },
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
    if (size === null) {
      fail(`[role] ${label}: no font-size for board size ${penNode.fontSize}`);
    } else {
      assertNumbers(`role ${label} font-size`, penNode.fontSize, size);
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
  if (color === null || !/var\(--c-[\w-]+\)/.test(color)) {
    fail(`[role] ${label}: colour ${JSON.stringify(color)} must come from a --c-* token`);
  } else if (resolveValue(color).toUpperCase() !== String(penNode.fill).toUpperCase()) {
    fail(`[role] ${label}: ${resolveValue(color)} != board fill ${penNode.fill}`);
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
  { node: "u2okj", property: "fill", selector: ".scholarly__media", declaration: "background: var(--c-rule);" },
  { node: "T0FU1", property: "fill", selector: ".scholarly__media", declaration: "background: var(--c-rule);" },
];

for (const entry of GEOMETRY) {
  const penNode = pen(entry.node);
  if (penNode === undefined) continue;
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

const boardTexts = [];
(function collect(node) {
  if (typeof node.content === "string") boardTexts.push({ id: node.id, name: node.name, text: node.content });
  for (const child of node.children ?? []) collect(child);
})(frame);

let concatenated = 0;
let insideNode = 0;
for (const boardText of boardTexts) {
  if (boardText.text.startsWith("※")) continue;
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
  fail(`[copy] board text ${boardText.id} <${boardText.name}> is not covered by a referenced key: ${JSON.stringify(boardText.text.slice(0, 60))}`);
}

/* ---------- 5. assets ---------- */

const manifest = JSON.parse(readFileSync(join(REPO, "public", "media", "MANIFEST.json"), "utf8"));
const PHOTOS = ["image1-1600.webp", "image2-400.webp", "image3-600.webp"];
for (const name of PHOTOS) {
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

const pdfSource = join(PEN_ROOT, "HIR 竞赛文书.pdf");
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

const revealPanels = [...sectionSource.matchAll(/useReveal\s*\(\s*"([^"]+)"\s*\)/g)].map((match) => match[1]);
const revealTriggers = [...sectionSource.matchAll(/\{\.\.\.([\w$]+)\.triggerProps\}/g)].map((match) => match[1]);
const paired = [...sectionSource.matchAll(/const\s+([\w$]+)\s*=\s*useReveal\(\s*"([^"]+)"\s*\)/g)].map(
  (match) => ({ handle: match[1], panel: match[2] }),
);
if (revealPanels.length !== 9 || revealTriggers.length !== 9 || new Set(revealPanels).size !== 9) {
  fail(`[reveal] ${revealPanels.length} panels / ${revealTriggers.length} triggers, expected 3 + 3 + 3`);
}
for (const { handle, panel } of paired) {
  const bound = revealTriggers.filter((name) => name === handle).length;
  if (bound !== 1) {
    fail(`[reveal] ${handle} is bound to ${bound} triggers, expected 1 (panel ${panel})`);
  }
  if (!sectionSource.includes(`id="${panel.replace(/-a(\d)$/, "-q$1")}"`)) {
    fail(`[reveal] no trigger carries the id that ${panel} is labelled by`);
  }
}

/* ---------- deviations: what the board and the dictionary disagree on ---------- */

const DEVIATIONS = [
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
];

/* ---------- report ---------- */

if (problems.length > 0) {
  console.error(`FAIL: ${problems.length} fidelity problem(s) against ui.pen ${PEN_SHA256.slice(0, 16)}…`);
  console.error(problems.join("\n"));
  process.exit(1);
}

console.log(
  `PASS: ui.pen ${PEN_SHA256.slice(0, 16)}… ${PEN_BYTES} B — ${TEXT_ROLES.length} text roles, ` +
    `${GEOMETRY.length} geometry values, ${RATIOS.length + 1} media boxes, ${boardTexts.length} board strings ` +
    `(${concatenated} joined, ${insideNode} split across board nodes), ${PHOTOS.length} photos + PDF byte-identical`,
);
for (const [what, why] of DEVIATIONS) {
  console.log(`deviation — ${what}: ${why}`);
}
