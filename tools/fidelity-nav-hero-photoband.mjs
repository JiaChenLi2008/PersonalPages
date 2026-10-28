#!/usr/bin/env node
/*
 * Fidelity check for the nav / hero / photo-band lanes.
 *
 * The frozen design file is the only layout source: this script walks the three
 * nodes those lanes own (ui.pen `NFyPa` / `ZBhBS` / `V3Yy1`), collects every
 * numeric value and colour they carry, and asserts that
 *   1. each of those values has a declaration in that section's own .tsx / .css
 *      (colours must arrive through a var(--token) from src/styles/tokens.css), and
 *   2. no declaration in those files carries a value the node never has.
 * The design file carries layout values only, so the lane's other three deliverables are
 * asserted against the sections' own sources as a second block (printed as `structure=`):
 *   3. the photoband photo slot is wired to the manifest's 2880×1120 webp (decorative
 *      `alt=""`, lazy/async, explicit dimensions, 18:7 `aspect-ratio` + `object-fit: cover`,
 *      the `.motion-clip` sweep and the `.motion-parallax` travel on their own elements, and
 *      no `image pending` placeholder left),
 *   4. the nav brand and the hero title render one side of their key pair at a time — one
 *      element, both keys reached through the page-language conditional (BLUEPRINT §6.4),
 *   5. the nav's colour and pointer feedback runs at `--dur-1` through `.motion-hover`
 *      (never the 600ms `--dur-3` this lane removed), and the entrance tiers stay 0 for the
 *      nav and 0/1/3 for the hero (motion spec §1.1/§2).
 * Exception, and the only one: the responsive tiers (BLUEPRINT §3.1-3.3) and the
 * documented implementation supplements (BLUEPRINT §2.11, motion spec §2) are listed in
 * SUPPLEMENTS with the section that justifies each value; 0 is allowed everywhere
 * as a reset.
 *
 * docx-1027 deletes slots instead of re-wording them: 第 3 条 the photo band's caption bar
 * (V3Yy1's Cap a6tTUe, keys photoband.figcap / photoband.altnote) and the hero's mono
 * eyebrow (Rkenm, the 第 7 条 blue line, key hero.eyebrow), 第 6 条 the ZH/EN switcher
 * (F2SSib, keys nav.lang.zh / nav.lang.en). The frozen artboard still draws all three
 * subtrees, so they are named in REMOVED_BY_DOCX and their design values are no longer
 * asserted; the run reports how many it withheld as `removed=`. The registration is judged
 * on every run (tools/fidelity-docx-removal.mjs): a key back in the dictionaries, or named
 * again under src/, fails this gate and prints the node to revoke, so a deletion can never
 * become a permanent exemption. The nav's motion assertion counts the links that are left
 * (device ④ still applies to them) instead of the language buttons this docx removed.
 *
 * docx-1028 条目2 deletes the hero's key-value block. Its six keys stay in both dictionaries
 * (Music and the Sport gate still read them), so its four leftover board coverages cannot
 * go through REMOVED_BY_DOCX; MOVED_OUT_OF_HERO holds them to the deleted DOM instead.
 *
 * Usage: node tools/fidelity-nav-hero-photoband.mjs
 *        (exit 0 = aligned; exit 1 = missing / out-of-range / structure problem,
 *         each printed with its file and line)
 *        ui.pen is looked up beside the repo root or in its ancestors; PEN_PATH overrides.
 */

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { judgeRemovedByDocx } from "./fidelity-docx-removal.mjs";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PEN_SHA =
  "41dd7140223515c28a506a6b75299ea86381618577f78afdbe29d7f28d410114";
/* The frozen board lives outside the repo (one shared source for the whole project),
   so it is searched for beside the repo root and in its ancestors — the same upward
   lookup as tools/fidelity-index-method-values-footer.mjs. No absolute path: a missing
   board is rc=2, never a silent read of some other checkout's copy. */
const PEN_CANDIDATES = [
  process.env.PEN_PATH,
  join(ROOT, "ui.pen"),
  join(ROOT, "..", "ui.pen"),
  join(ROOT, "..", "..", "ui.pen"),
  join(ROOT, "..", "..", "..", "ui.pen"),
].filter(Boolean);

const SECTIONS = [
  { name: "nav", dir: "src/sections/Nav", node: "NFyPa" },
  { name: "hero", dir: "src/sections/Hero", node: "ZBhBS" },
  { name: "photoband", dir: "src/sections/PhotoBand", node: "V3Yy1" },
];

/** Documented values the design file does not carry. */
const SUPPLEMENTS = {
  nav: {
    padding: { values: [40, 32, 24], why: "§3.1 --gutter-x tiers" },
    height: { values: [64, 48, 40], why: "§3.1 --nav-h tiers" },
    gap: { values: [24], why: "§3.3 links gap at ≤1200px" },
    color: { values: ["#F7F5F0"], why: "§2.11 sticky bar paints --c-paper" },
  },
  hero: {
    padding: { values: [32, 24], why: "§3.1 --pad-hero tiers" },
    fontSize: { values: [98, 74, 60, 26, 20, 18], why: "§3.2 --fs-118 / --fs-30 tiers" },
    gap: { values: [12, 24], why: "§2.11 button gap; §3.3 grid gap at ≤1200px" },
    width: {
      values: [304, 120],
      why: "§3.3 --col-hero-right at ≤1200px; 120px square portrait (docx-1028 条目3, brief 版式口径: 方图在左)",
    },
  },
  photoband: {
    height: { values: [464, 352, 232, 150], why: "§3.3 band height tiers; 150% is the photo's parallax overhang" },
    color: { values: ["#D8D4CC"], why: "§5 photo background while it loads" },
    width: { values: [100], why: "§5 the photo fills the slot's width; its overhang is vertical" },
  },
};

/* docx-1027 的删除登记：node 仍在冻版板上，槽位与它的键一并从站点删除。键按子树归属：一支登记
   盖住该节点及其子节点的全部设计值，因为这些值只为那块 DOM 而存在。登记由
   tools/fidelity-docx-removal.mjs 双向判据把关：键回到字典或 src/ 又指名它，本条登记即失效，
   门禁红并点名要撤销登记的那个节点。 */
const REMOVED_BY_DOCX = {
  F2SSib: { keys: ["nav.lang.zh", "nav.lang.en"], docx: "docx-1027 第 6 条" },
  Rkenm: { keys: ["hero.eyebrow"], docx: "docx-1027 第 3 / 7 条" },
  a6tTUe: { keys: ["photoband.figcap", "photoband.altnote"], docx: "docx-1027 第 3 条" },
};

/* docx-1028 条目2 deletes the hero key-value block — the three K/V rows and the four rules
   that framed them. Its six keys stay in both dictionaries: src/sections/Music/Music.tsx:150-154
   renders Music's own row from hero.key.instrument / hero.val.instrument, and
   tools/verify-music-sport-dom.mjs:650-653 reads hero.val.sport. That reuse is why the block
   cannot go through REMOVED_BY_DOCX: tools/fidelity-docx-removal.mjs holds a registration only
   while its keys are gone from both dictionaries and from src/, so this block's entry would be
   stale by construction. The four board coverages it leaves behind are registered here
   instead, each held to the deleted DOM's own absence (HERO_KV_ANCHOR): the moment Hero.tsx
   renders any of those classes again, the run fails and names the node.
   shortcut: the keys still carry `hero.*` names while their consumer is Music; renaming them
   has to travel with Music in one batch. */
const HERO_KV_ANCHOR = "no hero__kvgroup / hero__kv* / hero__rule class in Hero.tsx";
const MOVED_OUT_OF_HERO = [
  {
    nodes: ["P0JC5", "BHCh5", "Fuv92"],
    group: "fontSize",
    value: 11,
    to: "the K labels of the deleted key-value rows",
    anchor: HERO_KV_ANCHOR,
  },
  {
    nodes: ["P0JC5", "BHCh5", "Fuv92"],
    group: "color",
    value: "#6E6E6E",
    to: "the muted colour of those K labels",
    anchor: HERO_KV_ANCHOR,
  },
  {
    nodes: ["FHyYV", "cY5ig", "CmuIH", "L36e2d"],
    group: "height",
    value: 1,
    to: "the four hairline rules that framed the rows",
    anchor: HERO_KV_ANCHOR,
  },
  {
    nodes: ["FHyYV", "cY5ig", "CmuIH", "L36e2d"],
    group: "color",
    value: "#D8D4CC",
    to: "the colour of those four rules",
    anchor: HERO_KV_ANCHOR,
  },
];

/** Design field -> assertion group. */
const DESIGN_FIELDS = [
  "fontSize",
  "fontWeight",
  "letterSpacing",
  "lineHeight",
  "gap",
  "width",
  "height",
  "strokeWidth",
];

/** CSS property -> assertion group. */
const PROPERTY_GROUP = {
  "font-size": "fontSize",
  "font-weight": "fontWeight",
  "letter-spacing": "letterSpacing",
  "line-height": "lineHeight",
  padding: "padding",
  "padding-top": "padding",
  "padding-right": "padding",
  "padding-bottom": "padding",
  "padding-left": "padding",
  "padding-block": "padding",
  "padding-inline": "padding",
  gap: "gap",
  "row-gap": "gap",
  "column-gap": "gap",
  width: "width",
  "min-width": "width",
  height: "height",
  "min-height": "height",
  border: "strokeWidth",
  "border-width": "strokeWidth",
  "border-top": "strokeWidth",
  "border-right": "strokeWidth",
  "border-bottom": "strokeWidth",
  "border-left": "strokeWidth",
};

const COLOR_PROPERTY =
  /^(color|background|background-color|border|border-color|outline|outline-color|fill|stroke)$/;

const WEIGHT_NAMES = { normal: 400, bold: 700 };

function addValue(target, group, value) {
  if (!target[group]) target[group] = new Set();
  target[group].add(value);
}

function addDeclared(target, group, value, site) {
  if (!target[group]) target[group] = { values: new Set(), sites: new Map() };
  target[group].values.add(value);
  if (!target[group].sites.has(value)) target[group].sites.set(value, site);
}

function numbersOf(value, out) {
  if (typeof value === "number") {
    out.push(value);
  } else if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) out.push(parsed);
  } else if (Array.isArray(value)) {
    for (const item of value) numbersOf(item, out);
  }
}

/** Design values of one subtree. A registered node's subtree — and every node under it — is
    collected into `removed` instead of `design`: those values are no longer asserted, and the
    count is reported as `removed=` rather than vanishing from the gate. */
function designOf(node, design, removed, skip, pruned = false) {
  const dropped = pruned || skip.has(node.id);
  const target = dropped ? removed : design;
  for (const field of DESIGN_FIELDS) {
    const value = node[field];
    if (typeof value === "string" && field === "fontWeight" && WEIGHT_NAMES[value] !== undefined) {
      addValue(target, field, WEIGHT_NAMES[value]);
      continue;
    }
    const found = [];
    numbersOf(value, found);
    for (const number of found) addValue(target, field, number);
  }
  const padding = [];
  numbersOf(node.padding, padding);
  for (const number of padding) addValue(target, "padding", number);
  for (const field of ["fill", "stroke"]) {
    const value = node[field];
    if (typeof value === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value)) {
      addValue(target, "color", value.toUpperCase());
    }
  }
  for (const child of node.children ?? []) designOf(child, design, removed, skip, dropped);
}

function readTokens() {
  const css = readFileSync(join(ROOT, "src/styles/tokens.css"), "utf8");
  const tokens = new Map();
  for (const match of css.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    tokens.set(match[1], match[2].trim());
  }
  return tokens;
}

function resolveTokens(value, tokens, depth = 0) {
  if (depth > 8) return value;
  return value.replace(/var\((--[a-z0-9-]+)\)/g, (whole, name) => {
    const token = tokens.get(name);
    return token === undefined ? whole : resolveTokens(token, tokens, depth + 1);
  });
}

/** Digits of a hex colour are not measurements, so hexes never reach numbersIn. */
function numbersIn(value) {
  return [...value.replace(/#[0-9a-fA-F]{3,8}/g, " ").matchAll(/-?\d+(?:\.\d+)?/g)].map((match) =>
    Number(match[0]),
  );
}

function sourceFiles(dir) {
  const files = [];
  for (const entry of readdirSync(join(ROOT, dir), { withFileTypes: true })) {
    if (entry.isDirectory() || !/\.(tsx|css)$/.test(entry.name)) continue;
    files.push(join(dir, entry.name));
  }
  return files.sort();
}

/** Declarations in one section's own files, keyed by assertion group. */
function declaredOf(dir, tokens) {
  const declared = {};
  const unresolved = [];
  for (const file of sourceFiles(dir)) {
    const source = readFileSync(join(ROOT, file), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
    const lines = source.split("\n");
    for (const [index, line] of lines.entries()) {
      for (const match of line.matchAll(/([a-z-]+)\s*:\s*([^;{}]+)[;}]?/g)) {
        const property = match[1];
        const group = PROPERTY_GROUP[property];
        const isColor = COLOR_PROPERTY.test(property);
        if (group === undefined && !isColor) continue;
        const value = resolveTokens(match[2].trim(), tokens);
        if (value.includes("var(--")) {
          unresolved.push(`${file}:${index + 1} ${property}: ${match[2].trim()}`);
          continue;
        }
        if (group !== undefined) {
          for (const number of numbersIn(value)) {
            addDeclared(declared, group, number, `${file}:${index + 1}`);
          }
        }
        if (isColor) {
          for (const hex of value.match(/#[0-9a-fA-F]{3,8}/g) ?? []) {
            addDeclared(declared, "color", hex.toUpperCase(), `${file}:${index + 1}`);
          }
        }
      }
    }
  }
  return { declared, unresolved };
}

function supplementValues(section, group) {
  return SUPPLEMENTS[section]?.[group]?.values ?? [];
}

const penFile = PEN_CANDIDATES.find((candidate) => existsSync(candidate));
if (penFile === undefined) {
  console.error(
    "UNAVAILABLE: ui.pen — not found beside the repo root or in its ancestors; " +
      "this gate needs the frozen board there (or PEN_PATH=/path/to/ui.pen)",
  );
  process.exit(2);
}

const penBytes = readFileSync(penFile);
const digest = createHash("sha256").update(penBytes).digest("hex");
if (!digest.startsWith(PEN_SHA)) {
  console.error(`ui.pen sha256 ${digest.slice(0, 16)} != frozen ${PEN_SHA}: refusing to check`);
  process.exit(1);
}

const pen = JSON.parse(penBytes.toString("utf8"));
const page = pen.children[0];
const tokens = readTokens();

/* docx-1027 的删除登记先过一遍双向判据：只有「键已离开两份字典、src/ 也不再指名」的登记才生效；
   失效的登记直接进 problems，门禁红。 */
const { active: removedNodes, stale: staleRegistrations } = judgeRemovedByDocx(REMOVED_BY_DOCX, ROOT);

const problems = [...staleRegistrations];
let checked = 0;
let removedTotal = 0;
let movedTotal = 0;

/* The deleted key-value block's anchor: Hero.tsx must not bring any of its classes back. */
const heroKvMatch = source("src/sections/Hero/Hero.tsx").match(
  /\bhero__(?:kvgroup|kv|kv-key|kv-value|rule)\b/,
);
const heroKvBack = heroKvMatch !== null;
if (heroKvBack) {
  for (const entry of MOVED_OUT_OF_HERO) {
    problems.push(
      `moved-out-of-hero ${entry.nodes.join("/")}: ${entry.group}=${entry.value} is registered as ` +
        `deleted with the key-value block (docx-1028 条目2), but Hero.tsx carries ${heroKvMatch[0]} ` +
        `again (anchor: ${entry.anchor}); revoke the registration and restore the assertion`,
    );
  }
}
const movedOut = new Set();

console.log(`pen=${penFile} bytes=${penBytes.length} sha256=${digest.slice(0, 16)}`);

for (const section of SECTIONS) {
  const node = page.children.find((child) => child.id === section.node);
  if (node === undefined) {
    console.error(`node ${section.node} (${section.name}) is missing from ui.pen`);
    process.exit(1);
  }

  const design = {};
  const removedDesign = {};
  designOf(node, design, removedDesign, removedNodes);
  const { declared, unresolved } = declaredOf(section.dir, tokens);

  let missing = 0;
  let outOfRange = 0;
  let movedCount = 0;

  for (const message of unresolved) {
    problems.push(`unresolved token: ${message}`);
    missing += 1;
  }

  for (const [group, values] of Object.entries(design)) {
    for (const value of [...values].sort((a, b) => (a > b ? 1 : -1))) {
      checked += 1;
      if (!(declared[group]?.values.has(value) ?? false)) {
        const registration =
          section.name === "hero" && !heroKvBack
            ? MOVED_OUT_OF_HERO.find((entry) => entry.group === group && entry.value === value)
            : undefined;
        if (registration !== undefined) {
          movedOut.add(registration);
          movedCount += 1;
          continue;
        }
        missing += 1;
        problems.push(`missing ${section.name} ${group}=${value} (no declaration in ${section.dir})`);
      }
    }
  }

  for (const [group, found] of Object.entries(declared)) {
    for (const value of found.values) {
      if (value === 0 && group !== "color") continue;
      const known =
        group === "color"
          ? design.color?.has(value) || supplementValues(section.name, group).includes(value)
          : design[group]?.has(value) || supplementValues(section.name, group).includes(value);
      if (!known) {
        outOfRange += 1;
        problems.push(
          `out-of-range ${found.sites.get(value)} ${group}: ${value}` +
            ` (not in ${section.node}, not in SUPPLEMENTS.${section.name})`,
        );
      }
    }
  }

  const designCount = Object.values(design).reduce((total, values) => total + values.size, 0);
  const removedCount = Object.values(removedDesign).reduce((total, values) => total + values.size, 0);
  removedTotal += removedCount;
  movedTotal += movedCount;
  console.log(
    `${section.name}: node=${section.node} design=${designCount} removed=${removedCount} moved=${movedCount} missing=${missing} out_of_range=${outOfRange}`,
  );
}

/* A registration that withholds nothing is another way to widen the gate silently: every
   MOVED_OUT_OF_HERO entry must have matched a board value that no declaration covers. */
if (!heroKvBack) {
  for (const entry of MOVED_OUT_OF_HERO) {
    if (!movedOut.has(entry)) {
      problems.push(
        `moved-out-of-hero ${entry.nodes.join("/")}: ${entry.group}=${entry.value} is declared or absent ` +
          "from the board; the registration withholds nothing, revoke it",
      );
    }
  }
}

/* ---- the S1 wiring the design file cannot carry: photo slot, single-side text, timings ----

The board fixes layout values only, so the three deliverables of this lane are pinned here
against the sections' own sources: the photoband's photo (the manifest's own 2880×1120 asset,
wired as a decorative image), single-side rendering of the two key pairs (one element per pair,
both keys reached through the page-language conditional), and the frozen timing of the nav's
colour feedback (--dur-1 through the shared `.motion-hover` hook, never --dur-3). */

/** A section source with its comments stripped, so prose examples never match. */
function source(rel) {
  return readFileSync(join(ROOT, rel), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

/** The slice of `text` between two markers; "" when either is absent. */
function between(text, from, to) {
  const start = text.indexOf(from);
  const end = text.indexOf(to, start + 1);
  return start < 0 || end < 0 ? "" : text.slice(start, end);
}

const count = (text, needle) => text.split(needle).length - 1;
const structureProblem = (message) => problems.push(`structure: ${message}`);

const navSource = source("src/sections/Nav/Nav.tsx");
const navCss = source("src/sections/Nav/Nav.css");
const heroSource = source("src/sections/Hero/Hero.tsx");
const bandSource = source("src/sections/PhotoBand/PhotoBand.tsx");
const bandCss = source("src/sections/PhotoBand/PhotoBand.css");
const motionCss = source("src/styles/motion.css");

/* 1. Single-side rendering (BLUEPRINT §6.4): one element per pair, both keys reached through
   the page-language conditional, so the other side never reaches the DOM. */
const PAIRS = [
  {
    name: "nav brand",
    block: between(navSource, '<div className="nav__brand">', '<div className="nav__links">'),
    elements: 2,
    keys: ["nav.brand.name", "nav.brand.cn"],
  },
  {
    name: "hero title",
    block: between(heroSource, '<h1 id="hero-title"', "</h1>"),
    elements: 1,
    keys: ["hero.h1", "hero.h1cn"],
  },
];
for (const pair of PAIRS) {
  const elements = count(pair.block, "<span");
  if (elements !== pair.elements) {
    structureProblem(
      `the ${pair.name} renders ${elements} span(s); expected ${pair.elements}, one side at a time`,
    );
  }
  for (const key of pair.keys) {
    if (!pair.block.includes(`text("${key}")`)) {
      structureProblem(`the ${pair.name} does not reach ${key}`);
    }
  }
  if (!/===\s*"zh-Hans"\s*\?/.test(pair.block)) {
    structureProblem(`the ${pair.name} does not pick its key from the page language`);
  }
}

/* 2. The photoband photo slot: the manifest's own 2880×1120 webp, decorative (alt=""), fitted
   by ratio and cover, sweeping open while it parallaxes — and no placeholder left behind. */
const bandPhoto = JSON.parse(readFileSync(join(ROOT, "public/media/MANIFEST.json"), "utf8"))[
  "photoband-2880.webp"
];
if (bandPhoto?.w !== 2880 || bandPhoto?.h !== 1120) {
  structureProblem(
    `MANIFEST.json carries ${bandPhoto?.w}×${bandPhoto?.h} for photoband-2880.webp, expected 2880×1120`,
  );
}
if (!existsSync(join(ROOT, "public/media/photoband-2880.webp"))) {
  structureProblem("public/media/photoband-2880.webp is missing");
}
if (!bandSource.includes('src="./media/photoband-2880.webp"')) {
  structureProblem("the PhotoBand <img> does not point at ./media/photoband-2880.webp");
}
for (const attribute of ['alt=""', "width={2880}", "height={1120}", 'loading="lazy"', 'decoding="async"']) {
  if (!bandSource.includes(attribute)) {
    structureProblem(`the PhotoBand <img> is missing ${attribute}`);
  }
}
for (const hook of ["photo-band__img motion-parallax", "photo-band__media motion-clip"]) {
  if (!bandSource.includes(hook)) {
    structureProblem(`PhotoBand does not carry ${hook}`);
  }
}
if (!bandCss.includes("width: 100%") || !bandCss.includes("height: 150%") || !bandCss.includes("object-fit: cover")) {
  structureProblem(
    "PhotoBand.css does not fill the slot's width and overhang it by 50% in height with object-fit: cover " +
      "(the photo's 2880×1120 source geometry is asserted on the <img> elements above)",
  );
}
if (bandSource.includes("imagePending") || bandCss.includes("photo-band__pending")) {
  structureProblem("PhotoBand still renders the image-pending placeholder");
}

/* 3. Nav timing (motion spec §1.1): colour and pointer feedback run at --dur-1 through the
   shared hook; the 600ms link transition this lane removed must not come back. */
if (navCss.includes("--dur-3")) {
  structureProblem("Nav.css declares a --dur-3 transition; the nav's colour feedback is --dur-1");
}
/* docx-1027 第 6 条 removed the ZH/EN switcher, so the hook has one carrier fewer: the
   assertion now counts the link elements that are left and requires every one of them to carry
   it. A `> 0` floor would pass a nav whose links lost the hook, and the old `>= 2` was itself
   satisfied by the removed language buttons. */
const navLinksBlock = between(navSource, '<div className="nav__links">', "</div>");
const navLinks = count(navLinksBlock, "<a");
const hoveredLinks = count(navLinksBlock, 'className="nav__link motion-hover"');
if (navLinks === 0 || hoveredLinks !== navLinks) {
  structureProblem(
    `${hoveredLinks} of the nav's ${navLinks} link element(s) carry .motion-hover; every one of ` +
      "them does (spec §2 nav, device ④)",
  );
}
const hoverRule = /\.motion-hover\s*\{([^}]*)\}/.exec(motionCss)?.[1] ?? "";
if (!hoverRule.includes("color var(--dur-1)") || !hoverRule.includes("transform var(--dur-1)")) {
  structureProblem(".motion-hover does not time the nav's colour and pointer feedback at --dur-1");
}

/* 4. Entrance tiers (spec §2): nav tier 0; hero 标题 0 → 副标 1 → 键值 3. */
const navTiers = [...navSource.matchAll(/delay=\{(\d)\}/g)].map(([, tier]) => tier);
if (!navTiers.every((tier) => tier === "0")) {
  structureProblem(`the nav entrance uses tiers ${JSON.stringify(navTiers)}; the spec freezes tier 0`);
}
const heroTiers = [...heroSource.matchAll(/delay=\{(\d)\}/g)].map(([, tier]) => tier).sort();
if (heroTiers.join() !== "0,1,3") {
  structureProblem(`the hero entrance uses tiers ${JSON.stringify(heroTiers)}; the spec freezes 0, 1, 3`);
}
if (count(heroSource, "motion-hover") < 2) {
  structureProblem("the two hero buttons both carry .motion-hover (spec §2 hero, device ④)");
}

const missingTotal = problems.filter((line) => !/^(out-of-range|structure:)/.test(line)).length;
const outOfRangeTotal = problems.filter((line) => line.startsWith("out-of-range")).length;
const structureTotal = problems.filter((line) => line.startsWith("structure:")).length;

for (const problem of problems) console.error(problem);
/* `superseded` is fidelity-scholarly's table (re-worded slots); this gate has none, and prints
   the count it does not trade so all three summaries carry both numbers. */
console.log(
  `checked=${checked} missing=${missingTotal} out_of_range=${outOfRangeTotal} structure=${structureTotal} ` +
    `removed=${removedTotal} moved=${movedTotal} superseded=0`,
);

process.exit(problems.length > 0 ? 1 : 0);
