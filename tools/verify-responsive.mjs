#!/usr/bin/env node
/*
 * Responsive-fidelity check against BLUEPRINT §3.1-§3.3.
 *
 * ui.pen holds a single 1440 artboard, so §3 of the blueprint derives the narrow
 * tiers by ratio and lists them as the implementation supplement. This check
 * reads those tables and asserts, for every number they state, that the section
 * CSS actually carries it at the tier the table names:
 *
 *   §3.1 / §3.2 — token rows. The family (--gutter-x, --fs-64, …) fixes the
 *                 properties allowed to carry the value (padding, font-size, …);
 *                 a tier value must appear in one of the section stylesheets that
 *                 consume that token, as a declaration of one of those properties
 *                 inside a `@media (max-width: Npx)` block. A token no stylesheet
 *                 consumes fails: the row would otherwise never be checked.
 *   §3.3       — per-block rows. The numbers are anchored to the wording the
 *                 table uses (色块 / 方图 / `h`= / ≥ / gap / padding N/0, plus
 *                 `--token` and `Npx`) and must appear in that block's own CSS at
 *                 that tier.
 *
 * Variable references are resolved through src/styles/tokens.css, so a value
 * carried by a token (var(--band-h-t900)) counts as the value it resolves to.
 *
 * Tiers are matched as `@media (max-width: Npx)` blocks, the form §3 and the
 * section stylesheets both use.
 *
 * Output: breakpoints=<n> values_checked=<n> missing=<n>
 *   followed by one line per missing expectation: section / tier / value / files.
 * A §3 table the parser cannot read in full is an error: numbers left unread
 * inside a parsed table are reported and fail, so the gate never passes on a
 * partially understood table.
 *
 * Usage: node tools/verify-responsive.mjs   (exit 0 = every listed value wired)
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const BLUEPRINT = join(ROOT, "docs", "BLUEPRINT.md");
const TOKENS_FILE = join(ROOT, "src", "styles", "tokens.css");
const SECTIONS_DIR = join(ROOT, "src", "sections");

/** The tier columns of every §3 table, as their breakpoint widths. */
const TIERS = [1200, 900, 600];

/** §3.3 block name -> section directory. */
const BLOCK_DIRS = {
  nav: "Nav",
  hero: "Hero",
  photoband: "PhotoBand",
  index: "Index",
  method: "Method",
  values: "Values",
  footer: "Footer",
};

/** §3.1 / §3.2 token family -> the properties allowed to carry its value. */
const FAMILY_PROPS = {
  "--gutter-x": ["padding", "padding-inline", "padding-left", "padding-right"],
  "--pad-section-y": ["padding"],
  "--pad-hero": ["padding"],
  "--pad-footer": ["padding"],
  "--pad-card": ["padding"],
  "--pad-row": ["padding"],
  "--pad-cap": ["padding"],
  "--nav-h": ["height", "min-height"],
  "--fs-": ["font-size"],
  "--col-hero-right": ["width", "flex", "flex-basis"],
  "--band-h": ["height"],
  "--num-block": ["width", "height", "line-height"],
  "--thumb": ["width", "height"],
  "--card-h": ["height"],
};

function familyProps(token) {
  const family = Object.keys(FAMILY_PROPS).find((name) =>
    name.endsWith("-") ? token.startsWith(name) : token === name,
  );
  return family === undefined ? null : { family, props: FAMILY_PROPS[family] };
}

/* ------------------------------------------------------------ stylesheets --- */

/** name -> value for every custom property declared in tokens.css. */
function tokenValues() {
  const tokens = new Map();
  const css = readFileSync(TOKENS_FILE, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const match of css.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens.set(match[1], match[2].trim().replace(/\s+/g, " "));
  }
  return tokens;
}

const TOKENS = tokenValues();

/** Expands var(--x) against tokens.css, then returns the numbers it carries. */
function numbersOf(value) {
  let resolved = value;
  for (let round = 0; round < 8; round += 1) {
    const next = resolved.replace(/var\(\s*(--[\w-]+)\s*([^)]*)\)/g, (whole, name, rest) => {
      if (TOKENS.has(name)) return TOKENS.get(name);
      const fallback = rest.replace(/^\s*,\s*/, "").trim();
      return rest.includes(",") && fallback !== "" ? fallback : whole;
    });
    if (next === resolved) break;
    resolved = next;
  }
  return [...resolved.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
}

const SECTIONS = dirNames().map((name) => {
  const dir = join(SECTIONS_DIR, name);
  const files = readdirSync(dir).filter((file) => file.endsWith(".css"));
  return { name, dir, files };
});

function dirNames() {
  return readdirSync(SECTIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/**
 * Declarations of one stylesheet, tagged with the tier of the @media (max-width)
 * block they sit in (null at the top level).
 */
function declarations(css, file) {
  const found = [];
  const collect = (body, tier) => {
    for (const match of body.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
      const declarations = match[2];
      for (const decl of declarations.matchAll(/([-a-zA-Z][\w-]*)\s*:\s*([^;]+)/g)) {
        found.push({ file, tier, prop: decl[1], value: decl[2].trim() });
      }
    }
  };

  let rest = css;
  for (const tier of TIERS) {
    const pattern = new RegExp(`@media\\s*\\(max-width:\\s*${tier}px\\)\\s*\\{`, "g");
    for (const match of rest.matchAll(pattern)) {
      let depth = 1;
      let at = match.index + match[0].length;
      while (at < rest.length && depth > 0) {
        if (rest[at] === "{") depth += 1;
        if (rest[at] === "}") depth -= 1;
        at += 1;
      }
      collect(rest.slice(match.index + match[0].length, at - 1), tier);
    }
    rest = rest.replace(pattern, (match) => " ".repeat(match.length));
  }
  collect(rest, null);
  return found;
}

/* -------------------------------------------------------------- blueprint --- */

const blueprint = readFileSync(BLUEPRINT, "utf8").split("\n");

/** Lines of one "### 3.x" section of the blueprint. */
function sectionLines(heading) {
  const start = blueprint.findIndex((line) => line.startsWith(heading));
  if (start === -1) throw new Error(`BLUEPRINT.md: heading "${heading}" not found`);
  let end = start + 1;
  while (end < blueprint.length && !/^#{2,3} /.test(blueprint[end])) end += 1;
  return blueprint.slice(start + 1, end);
}

/** Cells of a markdown table; separator rows and non-rows are dropped. */
function tableRows(lines) {
  return lines
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|"))
    .map((line) =>
      line
        .slice(1, -1)
        .replace(/\\\|/g, "\u0001")
        .split("|")
        .map((cell) => cell.replace(/\u0001/g, "|").trim()),
    )
    .filter((cells) => !cells.every((cell) => /^:?-{2,}:?$/.test(cell)));
}

const unread = [];
const problems = [];
let checked = 0;
let breakpoints = 0;

/** The four values of one row, desktop first: null = "does not shrink". */
function rowValues(cells) {
  return cells.slice(1, 5).map((cell) => {
    const text = cell.replace(/`|\*/g, "").trim();
    if (text === "" || text.includes("不缩")) return null;
    const parts = text.split("/").map((part) => part.trim());
    const numbers = parts.map((part) => {
      const match = part.match(/^(\d+)(?:px)?$/);
      return match === null ? null : match[1];
    });
    return numbers.includes(null) ? null : `${numbers.join("/")}`;
  });
}

/** "56 / 48 / 40" and "56px" both become the number list [56, 48, 40]. */
function valueNumbers(value) {
  return value.split("/").map((part) => Number(part.trim().replace("px", "")));
}

function expect(label, tier, wanted, pool, props) {
  checked += 1;
  const hit = pool.some((declaration) => {
    /* A `max-width` block still matches every narrower width, so the value that
       applies at tier N may come from any block with a breakpoint >= N. */
    if (tier !== "any" && (declaration.tier === null || declaration.tier < tier)) return false;
    if (props !== null && !props.includes(declaration.prop)) return false;
    const numbers = numbersOf(declaration.value);
    return wanted.every((number) => numbers.includes(number));
  });
  if (!hit) {
    const where = [...new Set(pool.map((declaration) => relative(ROOT, declaration.file)))].join(", ");
    problems.push(`${label} @${tier}: ${wanted.join("/")}px missing in ${where}`);
  }
}

/* Each section's declarations, and the whole pool, for §3.1/§3.2 (global rows). */
const bySection = new Map();
const pool = [];
const stylesheets = [];
for (const section of SECTIONS) {
  const files = section.files.map((file) => {
    const path = join(section.dir, file);
    const css = readFileSync(path, "utf8");
    return { path, css, declarations: declarations(css, path) };
  });
  stylesheets.push(...files);
  const declarationsOfSection = files.flatMap((file) => file.declarations);
  bySection.set(section.name, declarationsOfSection);
  pool.push(...declarationsOfSection);
}

/**
 * The declarations a §3.1/§3.2 row can be checked against: a token row is global,
 * but only a stylesheet that consumes the token — `var(--name)` or one of its tier
 * forms `var(--name-tNNNN)` — can be asked to carry its value. Demanding it of
 * every section (as this check first did) is unsatisfiable for a token one section
 * consumes, such as --pad-row, and would keep the gate red forever. A token no
 * stylesheet consumes is reported as missing, never passed silently.
 */
function consumers(name) {
  const used = new RegExp(`var\\(\\s*${name}(?:-t\\d+)?\\s*[,)]`);
  return stylesheets
    .filter((stylesheet) => used.test(stylesheet.css))
    .flatMap((stylesheet) => stylesheet.declarations);
}

for (const tier of TIERS) {
  const found = pool.some((declaration) => declaration.tier === tier);
  const declared = SECTIONS.some((section) =>
    section.files.some((file) =>
      readFileSync(join(section.dir, file), "utf8").includes(`@media (max-width: ${tier}px)`),
    ),
  );
  if (!declared || !found) {
    problems.push(`@media (max-width: ${tier}px): no section stylesheet declares this tier`);
  } else {
    breakpoints += 1;
  }
}

/* §3.1 and §3.2: token rows, checked against every section (they are global). */
for (const [heading, label] of [
  ["### 3.1", "BLUEPRINT §3.1"],
  ["### 3.2", "BLUEPRINT §3.2"],
]) {
  for (const cells of tableRows(sectionLines(heading))) {
    const names = [...cells[0].matchAll(/`(--[\w-]+)`/g)].map((match) => match[1]);
    if (names.length === 0) continue;
    const values = rowValues(cells);
    if (values.every((value) => value === null)) continue;
    for (const name of names) {
      const family = familyProps(name);
      if (family === null) {
        problems.push(`${label} ${name}: no property family is known to this check`);
        continue;
      }
      const scoped = consumers(name);
      if (scoped.length === 0) {
        problems.push(
          `${label} ${name}: no section stylesheet consumes this token (var(${name})), so its tier values cannot be checked`,
        );
        continue;
      }
      for (const tier of TIERS) {
        const value = values[TIERS.indexOf(tier) + 1];
        if (value === null || value === undefined) continue;
        expect(`${label} ${name}`, tier, valueNumbers(value), scoped, family.props);
      }
    }
  }
}

/* §3.3: per-block rows, checked against that block's own stylesheet. */
const ANCHORS = [
  /`(--[\w-]+)`\s*(\d+)(?:px)?/g,
  /\*\*(\d+)px\*\*/g,
  /(?:^|[^\d.])(\d+)px/g,
  /色块\s*(\d+)/g,
  /方图\s*(\d+)/g,
  /\bh\s*=\s*(\d+)/g,
  /`h`\s*(\d+)/g,
  /每行\s*(\d+)/g,
  /≥\s*(\d+)/g,
  /\bgap\s*(\d+)/g,
  /`padding`\s*(\d+)\s*\/\s*(\d+)/g,
];

for (const cells of tableRows(sectionLines("### 3.3"))) {
  const block = cells[0]
    .replace(/`/g, "")
    .split(/[\s（]/)[0]
    .trim();
  if (block === "区块") continue;
  const dir = BLOCK_DIRS[block];
  if (dir === undefined) {
    if (cells.slice(1).some((cell) => /\d/.test(cell))) {
      problems.push(`BLUEPRINT §3.3 "${block}": no section is known to this check`);
    }
    continue;
  }
  const section = bySection.get(dir);
  if (section === undefined) {
    problems.push(`BLUEPRINT §3.3 "${block}": src/sections/${dir} is missing`);
    continue;
  }
  const files = [...new Set(section.map((declaration) => relative(ROOT, declaration.file)))].join(", ");

  for (const tier of TIERS) {
    const cell = cells[TIERS.indexOf(tier) + 2] ?? "";
    for (const clause of cell
      .split(/[；;，]/)
      .map((part) => part.trim())
      .filter((part) => part !== "")) {
      /* A statement that a size does not change ("11px 不缩") sets no tier value. */
      if (/不缩|不折|不变/.test(clause)) continue;
      const blank = [...clause];
      const wanted = new Set();
      for (const anchor of ANCHORS) {
        for (const match of clause.matchAll(anchor)) {
          for (const group of match.slice(1)) {
            if (group !== undefined && Number.isFinite(Number(group))) wanted.add(Number(group));
          }
          for (let at = match.index; at < match.index + match[0].length; at += 1) blank[at] = " ";
        }
      }
      /* "…保持" / "同 …" restates the desktop value, so any tier proves it. */
      const scope = /保持|同/.test(clause) ? "any" : tier;
      for (const number of wanted) {
        expect(`BLUEPRINT §3.3 ${block}`, scope, [number], section, null);
      }
      /* A number the anchors did not read means the table says more than the check
         understood: that is a failure, never a silent pass. Ratios (÷ 2.571) and
         names such as H1 carry no tier value. */
      const leftoverSource = blank.join("").replace(/(?:\d+(?:\.\d+)?)?\s*[÷×]\s*\d+(?:\.\d+)?/g, " ");
      const leftovers = [
        ...leftoverSource.matchAll(/(?<![A-Za-z\d.§#×÷≤<.])(\d+(?:\.\d+)?)(?![\d.#×])/g),
      ].map((match) => match[1]);
      if (leftovers.length > 0) {
        unread.push(`BLUEPRINT §3.3 ${block} @${tier}: unread numbers ${leftovers.join(", ")} in "${clause}"`);
      }
    }
  }
}

/* ---------------------------------------------------------------- report --- */

console.log(`breakpoints=${breakpoints} values_checked=${checked} missing=${problems.length}`);
for (const line of problems) {
  console.error(`missing: ${line}`);
}
for (const line of unread) {
  console.error(`unreadable: ${line}`);
}
if (!existsSync(TOKENS_FILE)) {
  console.error(`missing: ${relative(ROOT, TOKENS_FILE)}`);
  process.exit(1);
}
process.exit(problems.length + unread.length === 0 ? 0 : 1);
