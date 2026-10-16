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
 * Exception, and the only one: the responsive tiers (BLUEPRINT §3.1-3.3) and the
 * two documented implementation supplements (BLUEPRINT §2.11) are listed in
 * SUPPLEMENTS with the section that justifies each value; 0 is allowed everywhere
 * as a reset.
 *
 * Usage: node tools/fidelity-nav-hero-photoband.mjs
 *        (exit 0 = aligned; exit 1 = missing / out-of-range / unresolved values,
 *         each printed with its file and line)
 * PEN_PATH overrides the design-file lookup when the frozen file moves.
 */

import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PEN_SHA = "9f9f23f9a7291b5f";
const PEN_CANDIDATES = [
  process.env.PEN_PATH,
  join(ROOT, "..", "ui.pen"),
  "/mnt/code/JC_Project/ui.pen",
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
    width: { values: [304], why: "§3.3 --col-hero-right at ≤1200px" },
  },
  photoband: {
    padding: { values: [40, 32, 16, 8], why: "§3.1 --pad-cap tiers" },
    height: { values: [464, 352, 232], why: "§3.3 band height tiers" },
    gap: { values: [8], why: "§3.3 stacked caption gap at ≤900px" },
    color: { values: ["#D8D4CC"], why: "§5 proportional placeholder surface" },
  },
};

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

function designOf(node, design) {
  for (const field of DESIGN_FIELDS) {
    const value = node[field];
    if (typeof value === "string" && field === "fontWeight" && WEIGHT_NAMES[value] !== undefined) {
      addValue(design, field, WEIGHT_NAMES[value]);
      continue;
    }
    const found = [];
    numbersOf(value, found);
    for (const number of found) addValue(design, field, number);
  }
  const padding = [];
  numbersOf(node.padding, padding);
  for (const number of padding) addValue(design, "padding", number);
  for (const field of ["fill", "stroke"]) {
    const value = node[field];
    if (typeof value === "string" && /^#[0-9a-fA-F]{3,8}$/.test(value)) {
      addValue(design, "color", value.toUpperCase());
    }
  }
  for (const child of node.children ?? []) designOf(child, design);
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
    `UNAVAILABLE: ui.pen — not found (looked at ${PEN_CANDIDATES.join(", ")}); ` +
      "this gate needs the frozen board in the repo's parent directory (or PEN_PATH=…)",
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
const problems = [];
let checked = 0;

console.log(`pen=${penFile} bytes=${penBytes.length} sha256=${digest.slice(0, 16)}`);

for (const section of SECTIONS) {
  const node = page.children.find((child) => child.id === section.node);
  if (node === undefined) {
    console.error(`node ${section.node} (${section.name}) is missing from ui.pen`);
    process.exit(1);
  }

  const design = {};
  designOf(node, design);
  const { declared, unresolved } = declaredOf(section.dir, tokens);

  let missing = 0;
  let outOfRange = 0;

  for (const message of unresolved) {
    problems.push(`unresolved token: ${message}`);
    missing += 1;
  }

  for (const [group, values] of Object.entries(design)) {
    for (const value of [...values].sort((a, b) => (a > b ? 1 : -1))) {
      checked += 1;
      if (!(declared[group]?.values.has(value) ?? false)) {
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
  console.log(
    `${section.name}: node=${section.node} design=${designCount} missing=${missing} out_of_range=${outOfRange}`,
  );
}

const missingTotal = problems.filter((line) => !line.startsWith("out-of-range")).length;
const outOfRangeTotal = problems.length - missingTotal;

for (const problem of problems) console.error(problem);
console.log(`checked=${checked} missing=${missingTotal} out_of_range=${outOfRangeTotal}`);

process.exit(problems.length > 0 ? 1 : 0);
